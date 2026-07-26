import express from 'express'
import { auth } from '../middleware/auth'
import { enforceUsageLimit } from '../middleware/enforceUsage'
import { burnUsage } from '../usage'
import { anthropic, MODEL } from '../anthropic'

const router = express.Router()

// General text actions: listing generator, pricing calc, ad scripts, vendor AI
router.post('/', auth, enforceUsageLimit((req) => req.body.actionType), async (req, res) => {
  try {
    const { usage, cost } = req.usageCheck
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: req.body.max_tokens || 2000,
      messages: req.body.messages,
    })

    await burnUsage(req.user.id, usage, cost, false)
    res.json({
      content: response.content,
      usage: { used: usage.actions_used + cost, limit: usage.actions_limit },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
