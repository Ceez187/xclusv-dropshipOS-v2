const express = require('express')
const { auth } = require('../middleware/auth')
const { enforceUsageLimit } = require('../middleware/enforceUsage')
const { burnUsage } = require('../usage')
const { anthropic, MODEL } = require('../anthropic')

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

module.exports = router
