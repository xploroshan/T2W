import emailjs from "@emailjs/browser";

// EmailJS configuration – set these in your .env file
// Sign up at https://www.emailjs.com (free: 200 emails/month)
const SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "";
const TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || "";
const PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || "";

let initialized = false;

function ensureInit() {
  if (!initialized && PUBLIC_KEY) {
    emailjs.init(PUBLIC_KEY);
    initialized = true;
  }
}

/**
 * Send a password-reset OTP to the given email address.
 * Returns true if sent successfully, false if EmailJS is not configured.
 */
export async function sendPasswordResetEmail(
  toEmail: string,
  toName: string,
  otpCode: string
): Promise<boolean> {
  ensureInit();

  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
    // EmailJS not configured – fall back to console log (dev mode)
    console.info(
      `[T2W] EmailJS not configured. OTP for ${toEmail}: ${otpCode}`
    );
    return false;
  }

  await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
    to_email: toEmail,
    to_name: toName || "Rider",
    otp_code: otpCode,
    expiry_minutes: "10",
  });

  return true;
}
