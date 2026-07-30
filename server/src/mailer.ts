import nodemailer from 'nodemailer'

// Sends notification emails (e.g. new-signup alerts) via the owner's own
// Gmail account using an App Password — no third-party email service
// account needed. GMAIL_USER/GMAIL_APP_PASSWORD are only used server-side.
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export async function sendNotificationEmail(subject: string, text: string): Promise<void> {
  const to = process.env.GMAIL_USER
  if (!to) throw new Error('GMAIL_USER not configured')
  await transporter.sendMail({ from: to, to, subject, text })
}
