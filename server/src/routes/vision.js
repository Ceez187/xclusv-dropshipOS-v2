const express = require('express')
const { auth } = require('../middleware/auth')
const { enforceUsageLimit } = require('../middleware/enforceUsage')
const { burnUsage } = require('../usage')
const { anthropic, MODEL } = require('../anthropic')

const router = express.Router()

// Vision (image upload) analysis — separate route, no timeout limit issue
// on Fly.io the way there was on Netlify Functions.
router.post('/', auth, enforceUsageLimit('smart_sourcing'), async (req, res) => {
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
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
