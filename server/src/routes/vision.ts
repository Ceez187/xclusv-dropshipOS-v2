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
      // The sourcing response shape (prompts.ts) asks for 5-6 suppliers plus
      // quality indicators, red flags, and keyword variants — a real answer
      // for a non-trivial product routinely runs well past 2000 tokens and
      // was getting cut off mid-JSON, which the client can't parse and falls
      // back to dumping the raw (truncated) text at the user.
      max_tokens: 4096,
      messages: req.body.messages, // includes image content blocks
    })

    await burnUsage(req.user.id, usage, cost, false)
    res.json({ content: response.content, stopReason: response.stop_reason })
  } catch (err) {
    handleAnthropicError(err, res)
  }
})

export default router
