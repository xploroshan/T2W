import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createEmailOtp } from "@/lib/otp-store";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const emailLower = (email || "").toLowerCase().trim();

    if (!emailLower || !emailLower.includes("@")) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // Check if email already registered
    const existing = await prisma.user.findUnique({ where: { email: emailLower } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const code = await createEmailOtp(emailLower);

    const smtpUser = (process.env.SMTP_USER || "").trim();
    const smtpPass = (process.env.SMTP_PASS || "").trim();
    const smtpFromName = (process.env.SMTP_FROM || "Tales on 2 Wheels").trim();

    if (!smtpUser || !smtpPass) {
      console.error("[T2W] SMTP credentials not configured.");
      return NextResponse.json(
        { error: "Email service is not configured. Please contact support." },
        { status: 503 }
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

      await transporter.sendMail({
        from: `"${smtpFromName}" <${smtpUser}>`,
        to: emailLower,
        subject: "T2W Email Verification Code",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #1a1a2e; color: #ffffff; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #ff4757; margin: 0; font-size: 24px;">Tales on 2 Wheels</h1>
              <p style="color: #a0a0b0; margin-top: 8px;">Email Verification</p>
            </div>
            <p style="color: #e0e0e0;">Welcome, Rider!</p>
            <p style="color: #a0a0b0;">Use the code below to verify your email:</p>
            <div style="text-align: center; margin: 32px 0;">
              <div style="display: inline-block; background: #2a2a4a; padding: 16px 32px; border-radius: 12px; border: 1px solid #3a3a5a;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #ff4757;">${code}</span>
              </div>
            </div>
            <p style="color: #a0a0b0; font-size: 14px;">This code expires in <strong style="color: #ffffff;">10 minutes</strong>.</p>
            <hr style="border: none; border-top: 1px solid #3a3a5a; margin: 24px 0;" />
            <p style="color: #707080; font-size: 12px; text-align: center;">Tales on 2 Wheels &bull; Bangalore, India</p>
          </div>
        `,
      });

      return NextResponse.json({
        success: true,
        message: `Verification code sent to ${email}`,
      });
    } catch (emailErr) {
      const errMsg = emailErr instanceof Error ? emailErr.message : String(emailErr);
      console.error("[T2W] Email send error:", errMsg);
      return NextResponse.json(
        { error: `Failed to send verification email: ${errMsg}` },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("[T2W] Send OTP error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
