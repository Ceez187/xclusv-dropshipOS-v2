import express from 'express'
import { supabase } from '../supabase'
import { sendNotificationEmail, sendWelcomeEmail } from '../mailer'

const router = express.Router()

// Called by a Supabase Database Webhook on INSERT into public.user_usage
// (which fires once per new signup, via the existing handle_new_user
// trigger) — not by the app itself, so it's authenticated by a shared
// secret header instead of a user's Supabase session token.
router.post('/new-signup', async (req, res) => {
  const secret = req.headers['x-webhook-secret']
  if (!secret || secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const userId = req.body?.record?.user_id
    if (!userId) return res.status(400).json({ error: 'Missing user_id in payload' })

    const { data, error } = await supabase.auth.admin.getUserById(userId)
    if (error || !data.user) throw error ?? new Error('User not found')

    // Independent sends — a failure in one (e.g. the owner's inbox rejects
    // it) shouldn't stop the customer's welcome email from going out, or
    // vice versa.
    const [ownerAlert, welcome] = await Promise.allSettled([
      sendNotificationEmail(
        'New DropshipOS signup',
        `A new user just signed up:\n\nEmail: ${data.user.email}\nSigned up at: ${data.user.created_at}`
      ),
      data.user.email ? sendWelcomeEmail(data.user.email) : Promise.resolve(),
    ])
    if (ownerAlert.status === 'rejected') console.error('Owner signup alert failed', ownerAlert.reason)
    if (welcome.status === 'rejected') console.error('Welcome email failed', welcome.reason)

    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
