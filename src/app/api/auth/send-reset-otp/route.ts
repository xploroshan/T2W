import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

export async function POST(req: NextRequest) {
  try {
    const { email, name, otpCode } = await req.json();

    if (!email || !otpCode) {
      return NextResponse.json(
        { error: "Missing email or OTP code" },
        { status: 400 }
      );
    }

    if (!SMTP_USER || !SMTP_PASS) {
      console.warn("[T2W] SMTP not configured. OTP for", email, ":", otpCode);
      return NextResponse.json({
        success: true,
        emailSent: false,
        message: "SMTP not configured. Check server logs for OTP.",
      });
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Tales on 2 Wheels" <${SMTP_FROM}>`,
      to: email,
      subject: "T2W Password Reset Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #1a1a2e; color: #ffffff; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #ff4757; margin: 0; font-size: 24px;">Tales on 2 Wheels</h1>
            <p style="color: #a0a0b0; margin-top: 8px;">Password Reset Request</p>
          </div>
          <p style="color: #e0e0e0;">Hi ${name || "Rider"},</p>
          <p style="color: #a0a0b0;">You requested a password reset. Use the code below to verify your identity:</p>
          <div style="text-align: center; margin: 32px 0;">
            <div style="display: inline-block; background: #2a2a4a; padding: 16px 32px; border-radius: 12px; border: 1px solid #3a3a5a;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #ff4757;">${otpCode}</span>
            </div>
          </div>
          <p style="color: #a0a0b0; font-size: 14px;">This code expires in <strong style="color: #ffffff;">10 minutes</strong>.</p>
          <p style="color: #a0a0b0; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #3a3a5a; margin: 24px 0;" />
          <p style="color: #707080; font-size: 12px; text-align: center;">Tales on 2 Wheels &bull; Bangalore, India</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, emailSent: true });
  } catch (error) {
    console.error("[T2W] Email send error:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
