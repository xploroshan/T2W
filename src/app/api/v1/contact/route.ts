import { NextRequest } from "next/server";
import nodemailer from "nodemailer";
import { checkRate } from "@/lib/rate-limit";
import { apiError, apiOk } from "@/lib/api/v1/errors";
import { requireBearer } from "@/lib/api/v1/auth-guard";

/**
 * POST /api/v1/contact
 *
 * Authenticated contact form. Authenticated because the mobile app already
 * has the user's session; this also bypasses the email-enumeration concern
 * that the web form's anonymous path carries.
 */
export async function POST(req: NextRequest) {
  const auth = await requireBearer(req);
  if (!auth.ok) return apiError("UNAUTHORIZED", "Authentication required");

  const { subject, message } = (await req.json()) as { subject?: string; message?: string };
  if (!subject?.trim() || !message?.trim()) {
    return apiError("BAD_REQUEST", "Subject and message are required");
  }

  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  if (await checkRate(ip, "contact")) {
    return apiError("RATE_LIMITED", "Too many messages — please try again in an hour");
  }

  const smtpUser = (process.env.SMTP_USER || "").trim();
  const smtpPass = (process.env.SMTP_PASS || "").trim();
  const smtpFromName = (process.env.SMTP_FROM || "Tales on 2 Wheels").trim();
  if (!smtpUser || !smtpPass) {
    return apiError(
      "EMAIL_SERVICE_DOWN",
      "Email service is not configured. Please email us directly at Info@taleson2wheels.com",
    );
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: smtpUser, pass: smtpPass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    const safeSubject = subject.trim().slice(0, 200).replace(/[\r\n]/g, " ");
    await transporter.sendMail({
      from: `"${smtpFromName}" <${smtpUser}>`,
      to: "info@taleson2wheels.com",
      replyTo: auth.user.email,
      subject: `[T2W mobile] ${safeSubject}`,
      text: `From: ${auth.user.name} <${auth.user.email}>\nPhone: ${auth.user.phone ?? "—"}\n\n${message.trim()}`,
    });
    return apiOk({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[T2W][v1] contact error:", msg);
    return apiError("SERVER_ERROR", "Failed to send message. Please try again.");
  }
}
