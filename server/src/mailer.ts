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

// Kept in sync by hand with web/src/modules/HowItWorks/index.tsx's STEPS —
// same workflow, just phrased for an email instead of an in-app card.
const APP_STEPS: { title: string; text: string }[] = [
  {
    title: 'Source a product',
    text: 'Paste a product URL or description — or upload a photo — in Smart Sourcing to get an AI pricing analysis, supplier notes, and ready-to-use search links for 1688, Taobao, AliExpress, and Basetao.',
  },
  {
    title: 'Find & message a supplier',
    text: 'Save suppliers in Vendors, then use the built-in Order Builder to message them on WhatsApp, WeChat, Facebook, or Email — no copy-pasting between apps.',
  },
  {
    title: 'Write your listing',
    text: 'Use Listing Generator to turn a sourced product into a platform-ready title, description, and tags.',
  },
  {
    title: 'Price it right',
    text: 'Use Pricing Calculator to work out a retail price that covers your cost, shipping, and fees at the margin you want.',
  },
  {
    title: 'Launch ads',
    text: 'Generate TikTok, Meta, and YouTube Shorts ad scripts — hook, problem, solution, proof, and CTA — in Ad Scripts.',
  },
  {
    title: 'Track every order',
    text: 'Log each order in Orders from sourcing through delivery, with profit and status at a glance.',
  },
  {
    title: 'Know your customers',
    text: 'Use Customers to spot repeat buyers and get AI suggestions for reactivation and upsells.',
  },
]

const DROPSHIPPING_PRIMER = `Dropshipping means you sell a product without holding any inventory yourself: a customer orders from you, you order that same item from a supplier (usually overseas), and the supplier ships it straight to the customer. You never touch the product — your job is picking the right item, pricing it to cover your cost plus a margin, and marketing it. Your profit is the gap between what the customer pays you and what the supplier charges you.`

// Customer-facing welcome note, sent to the new user's own address —
// explains what dropshipping is and walks through the app end to end, so a
// brand-new user has enough context to act on their first sign-in instead
// of landing on a blank dashboard.
export async function sendWelcomeEmail(to: string): Promise<void> {
  const stepsText = APP_STEPS.map((s, i) => `${i + 1}. ${s.title} — ${s.text}`).join('\n\n')

  const text = `Welcome to XCLUSV DropshipOS!

NEW TO DROPSHIPPING?
${DROPSHIPPING_PRIMER}

HOW DROPSHIPOS WORKS
${stepsText}

Every module saves straight to your account — vendors, orders, customers, and saved listings sync across devices, so you can switch from phone to desktop mid-task and pick up right where you left off.

Sign in anytime to get started. Questions or feedback? Just reply to this email.

— XCLUSV`

  const stepsHtml = APP_STEPS.map(
    (s, i) => `
      <div style="display:flex;gap:14px;padding:14px 0;border-top:1px solid #eee">
        <div style="min-width:26px;font-size:22px;font-weight:700;color:#c9a84c;line-height:1">${i + 1}</div>
        <p style="margin:0;font-size:14px;line-height:1.5;color:#333">
          <span style="font-weight:600;color:#a8823a">${s.title}.</span> ${s.text}
        </p>
      </div>`
  ).join('')

  const html = `
    <div style="font-family:-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h1 style="color:#c9a84c;font-size:20px;margin:0 0 16px">Welcome to XCLUSV DropshipOS</h1>

      <h2 style="font-size:14px;text-transform:uppercase;letter-spacing:0.04em;color:#888;margin:0 0 8px">New to dropshipping?</h2>
      <p style="color:#333;font-size:15px;line-height:1.5;margin:0 0 24px">${DROPSHIPPING_PRIMER}</p>

      <h2 style="font-size:14px;text-transform:uppercase;letter-spacing:0.04em;color:#888;margin:0 0 4px">How DropshipOS works</h2>
      <p style="color:#666;font-size:13px;margin:0 0 4px">Seven modules, one workflow — from finding a product to knowing who's buying it.</p>
      <div>${stepsHtml}</div>

      <p style="color:#666;font-size:13px;line-height:1.5;margin-top:20px">Every module saves straight to your account — vendors, orders, customers, and saved listings sync across devices, so you can switch from phone to desktop mid-task and pick up right where you left off.</p>

      <p style="color:#333;font-size:15px;line-height:1.5;margin-top:20px">Sign in anytime to get started. Questions or feedback? Just reply to this email.</p>
      <p style="color:#888;font-size:13px;margin-top:24px">— XCLUSV</p>
    </div>`

  await sendEmail(to, 'Welcome to XCLUSV DropshipOS 🎉', text, html)
}
