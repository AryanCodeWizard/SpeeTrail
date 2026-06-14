import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
})

/**
 * Sends a group invite email.
 * Contains a unique link the recipient clicks to accept.
 */
export async function sendInviteEmail({
  to,
  inviterName,
  groupName,
  inviteToken
}) {
  const inviteUrl = `${process.env.APP_URL}/invite/${inviteToken}`

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
      <h2 style="color: #0d9488; margin-bottom: 8px;">You've been invited</h2>

      <p style="color: #374151; margin-bottom: 4px;">
        <strong>${inviterName}</strong> invited you to join
        <strong>${groupName}</strong> on SplitApp.
      </p>

      <p style="color: #6b7280; font-size: 14px; margin-bottom: 32px;">
        SplitApp helps groups track shared expenses and settle debts fairly.
      </p>

      <a
        href="${inviteUrl}"
        style="
          background:#0d9488;
          color:white;
          padding:12px 24px;
          border-radius:8px;
          text-decoration:none;
          font-weight:600;
          display:inline-block;
        "
      >
        Accept invitation
      </a>

      <p style="color:#9ca3af;font-size:12px;margin-top:24px;">
        This link expires in 7 days. If you don't have an account,
        you'll be asked to register first.
      </p>

      <p style="color:#9ca3af;font-size:12px;">
        If you weren't expecting this, ignore this email.
      </p>
    </div>
  `

  await transporter.sendMail({
    from: `"SplitApp" <${process.env.GMAIL_USER}>`,
    to,
    subject: `${inviterName} invited you to ${groupName} on SplitApp`,
    html
  })
}

export default transporter