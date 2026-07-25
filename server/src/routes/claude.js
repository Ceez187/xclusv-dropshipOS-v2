const express = require('express')
const { auth } = require('../middleware/auth')
const { checkUsage, burnUsage } = require('../usage')
const { anthropic, MODEL } = require('../anthropic')

const router = express.Router()

// General text actions: listing generator, pricing calc, ad scripts, vendor AI
router.post('/', auth, async (req, res) => {
  try {
    const check = await checkUsage(req.user.id, req.body.actionType, false)
    if (!check.ok) return res.status(403).json(check)

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: req.body.max_tokens || 2000,
      messages: req.body.messages,
    })

    await burnUsage(req.user.id, check.usage, check.cost, false)
    res.json({
      content: response.content,
      usage: { used: check.usage.actions_used + check.cost, limit: check.usage.actions_limit },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
