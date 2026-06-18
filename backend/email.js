require('dotenv').config();
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';
const APP_NAME = 'Electronics Quiz';

async function sendOTPEmail(email, otp, type) {
  const subject = type === 'email_verification'
    ? `${APP_NAME} — Verify your email`
    : `${APP_NAME} — Password reset code`;

  const message = type === 'email_verification'
    ? `Your email verification code is: <strong>${otp}</strong><br>This code expires in 10 minutes.`
    : `Your password reset code is: <strong>${otp}</strong><br>This code expires in 10 minutes.`;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0d1117; color: #e6edf3; border-radius: 12px;">
          <h2 style="color: #00d4aa; font-family: monospace;">${APP_NAME}</h2>
          <p style="font-size: 16px; line-height: 1.6;">${message}</p>
          <div style="background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
            <span style="font-family: monospace; font-size: 32px; letter-spacing: 8px; color: #00d4aa;">${otp}</span>
          </div>
          <p style="font-size: 13px; color: #8b949e;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error('Email send failed:', err);
    return false;
  }
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = { sendOTPEmail, generateOTP };
