// Sends notification emails (e.g. new-signup / login alerts) via Resend's
// HTTPS API. Not SMTP: many hosts (including Render's free tier) block
// outbound SMTP connections entirely (ETIMEDOUT on connect, regardless of
// credentials), so a plain HTTPS POST is the reliable option. RESEND_API_KEY
// is required; GMAIL_USER is reused as the alert recipient address (not for
// sending — Resend's shared onboarding@resend.dev sender works with no
// domain verification needed).
const RESEND_API_URL = 'https://api.resend.com/emails'
const FROM_ADDRESS = 'DropshipOS Alerts <onboarding@resend.dev>'

export async function sendNotificationEmail(subject: string, text: string): Promise<void> {
  const to = process.env.GMAIL_USER
  const apiKey = process.env.RESEND_API_KEY
  if (!to) throw new Error('GMAIL_USER not configured')
  if (!apiKey) throw new Error('RESEND_API_KEY not configured')

  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to, subject, text }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Resend API error (${res.status}): ${body}`)
  }
}
