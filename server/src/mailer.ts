// Sends emails (owner alerts, customer welcome notes) via Resend's HTTPS
// API. Not SMTP: many hosts (including Render's free tier) block outbound
// SMTP connections entirely (ETIMEDOUT on connect, regardless of
// credentials), so a plain HTTPS POST is the reliable option. RESEND_API_KEY
// is required; GMAIL_USER is the owner alert recipient (not for sending —
// Resend's shared onboarding@resend.dev sender works with no domain
// verification needed).
const RESEND_API_URL = 'https://api.resend.com/emails'
const FROM_ADDRESS = 'XCLUSV DropshipOS <onboarding@resend.dev>'

async function sendEmail(
  to: string,
  subject: string,
  text: string,
  html?: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY not configured')

  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to, subject, text, ...(html && { html }) }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Resend API error (${res.status}): ${body}`)
  }
}

// Owner-facing alerts (new signup, login) — sent to GMAIL_USER.
export async function sendNotificationEmail(subject: string, text: string): Promise<void> {
  const to = process.env.GMAIL_USER
  if (!to) throw new Error('GMAIL_USER not configured')
  await sendEmail(to, subject, text)
}

// Customer-facing welcome note, sent to the new user's own address.
export async function sendWelcomeEmail(to: string): Promise<void> {
  const text = `Welcome to XCLUSV DropshipOS!

Your account is ready. Sign in anytime to start sourcing products, generating listings, building ad scripts, and tracking orders — all in one place.

Questions or feedback? Just reply to this email.

— XCLUSV`

  const html = `
    <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h1 style="color:#c9a84c;font-size:20px;margin:0 0 16px">Welcome to XCLUSV DropshipOS</h1>
      <p style="color:#333;font-size:15px;line-height:1.5">Your account is ready. Sign in anytime to start sourcing products, generating listings, building ad scripts, and tracking orders — all in one place.</p>
      <p style="color:#333;font-size:15px;line-height:1.5">Questions or feedback? Just reply to this email.</p>
      <p style="color:#888;font-size:13px;margin-top:24px">— XCLUSV</p>
    </div>`

  await sendEmail(to, 'Welcome to XCLUSV DropshipOS 🎉', text, html)
}
