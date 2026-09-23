import nodemailer from 'nodemailer'

const mailHost = process.env.MAIL_HOST
const mailPort = Number(process.env.MAIL_PORT || 587)
const mailPassword = process.env.MAIL_PASSWORD

if (!mailHost) {
  throw new Error('MAIL_HOST is not configured')
}

if (!mailPassword) {
  throw new Error('MAIL_PASSWORD is not configured')
}

const createTransporter = () =>
  nodemailer.createTransport({
    host: mailHost,
    port: mailPort,
    secure: false,
    auth: {
      user: 'apikey',
      pass: mailPassword,
    },
  })

const FROM = `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`

// ── OTP Verification ─────────────────────────────────────────────────────────
export const sendOtpEmail = async (email: string, otp: string) => {
  await createTransporter().sendMail({
    from: FROM,
    to: email,
    subject: 'Verify Your Email – Anchor into Presence',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f9f9f9;border-radius:8px;">
        <h2 style="color:#2d3748;margin-bottom:8px;">Verify your email address</h2>
        <p style="color:#4a5568;line-height:1.6;">
          Welcome to <strong>Anchor into Presence</strong>! Please use the OTP code below to verify
          your email address and complete your registration.
        </p>

        <div style="text-align:center;margin:32px 0;">
          <span style="display:inline-block;padding:16px 40px;font-size:32px;font-weight:bold;letter-spacing:8px;color:#ffffff;background:#38a169;border-radius:8px;">
            ${otp}
          </span>
        </div>

        <p style="color:#4a5568;line-height:1.6;">
          This code is valid for <strong>10 minutes</strong>. If you did not create a
          Anchor into Presence account, you can safely ignore this email.
        </p>

        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
        <p style="font-size:12px;color:#a0aec0;text-align:center;">
          © ${new Date().getFullYear()} Anchor into Presence. All rights reserved.
        </p>
      </div>
    `,
  })
}

// ── Forgot Password ───────────────────────────────────────────────────────────
export const sendForgotPasswordEmail = async (email: string, otp: string) => {
  await createTransporter().sendMail({
    from: FROM,
    to: email,
    subject: 'Reset Your Password – Anchor into Presence',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f9f9f9;border-radius:8px;">
        <h2 style="color:#2d3748;margin-bottom:8px;">Forgot your password?</h2>
        <p style="color:#4a5568;line-height:1.6;">
          We received a request to reset the password for your <strong>Anchor into Presence</strong> account.
          Use the OTP code below to complete the process.
        </p>

        <div style="text-align:center;margin:32px 0;">
          <span style="display:inline-block;padding:16px 40px;font-size:32px;font-weight:bold;letter-spacing:8px;color:#ffffff;background:#5a67d8;border-radius:8px;">
            ${otp}
          </span>
        </div>

        <p style="color:#4a5568;line-height:1.6;">
          This code is valid for <strong>10 minutes</strong>. If you did not request a password reset,
          you can safely ignore this email — your password will remain unchanged.
        </p>

        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
        <p style="font-size:12px;color:#a0aec0;text-align:center;">
          © ${new Date().getFullYear()} Anchor into Presence. All rights reserved.
        </p>
      </div>
    `,
  })
}

// ── Support Request ──────────────────────────────────────────────────────────
export const sendSupportEmail = async ({
  email,
  name,
  title,
  description,
}: {
  email: string
  name?: string
  title: string
  description: string
}) => {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.MAIL_FROM_ADDRESS || 'tina@tinamoore.com'
  await createTransporter().sendMail({
    from: FROM,
    to: adminEmail,
    replyTo: email,
    subject: `Support Request from ${email}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9f9f9;border-radius:8px;">
        <h2 style="color:#2d3748;margin-bottom:16px;">Support Request</h2>
        <p style="color:#4a5568;"><strong>User:</strong> ${name ? `${name} (${email})` : email}</p>
        <p style="color:#4a5568;"><strong>Title:</strong> ${title}</p>
        <div style="margin-top:16px;padding:16px;background:#ffffff;border-radius:6px;border:1px solid #e2e8f0;">
          <p style="color:#2d3748;white-space:pre-wrap;margin:0;">${description}</p>
        </div>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
        <p style="font-size:12px;color:#a0aec0;text-align:center;">
          © ${new Date().getFullYear()} Anchor into Presence. All rights reserved.
        </p>
      </div>
    `,
  })
}