import express from 'express'
import { auth } from '../middleware/auth'
import { sendNotificationEmail } from '../mailer'

const router = express.Router()

// Called by the frontend right after a successful sign-in (not on every
// silent token refresh — see AuthPage.tsx, which only calls this from the
// explicit sign-in form submit). Reuses the same GMAIL_USER/
// GMAIL_APP_PASSWORD alerting as the new-signup webhook. A failure here
// must never block the user's sign-in, so this always responds 200 —
// errors are logged, not surfaced to the client.
router.post('/login', auth, async (req, res) => {
  try {
    await sendNotificationEmail(
      'DropshipOS login',
      `A user just signed in:\n\nEmail: ${req.user.email}\nSigned in at: ${new Date().toISOString()}`
    )
  } catch (err) {
    console.error('Login alert email failed', err)
  }
  res.json({ ok: true })
})

export default router
