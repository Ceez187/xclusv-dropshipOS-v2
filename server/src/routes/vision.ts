import express from 'express'
import { auth } from '../middleware/auth'
import { enforceUsageLimit } from '../middleware/enforceUsage'
import { burnUsage } from '../usage'
import { anthropic, MODEL, handleAnthropicError } from '../anthropic'

const router = express.Router()

// Vision (image upload) analysis — separate route, no fixed-duration
// function timeout to race against the way there was on Netlify Functions;
// the Anthropic client still enforces its own timeout (see anthropic.ts) so
// a stalled request fails fast instead of hanging indefinitely.
router.post('/', auth, enforceUsageLimit('smart_sourcing'), async (req, res) => {
  if (!Array.isArray(req.body.messages) || req.body.messages.length === 0) {
    return res.status(400).json({ error: 'messages must be a non-empty array' })
  }

  try {
    const { usage, cost } = req.usageCheck
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      messages: req.body.messages, // includes image content blocks
    })

    await burnUsage(req.user.id, usage, cost, false)
    res.json({ content: response.content })
  } catch (err) {
    handleAnthropicError(err, res)
  }
})

export default router
