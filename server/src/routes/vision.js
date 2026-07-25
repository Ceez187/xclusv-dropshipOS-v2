const express = require('express')
const { auth } = require('../middleware/auth')
const { checkUsage, burnUsage } = require('../usage')
const { anthropic, MODEL } = require('../anthropic')

const router = express.Router()

// Vision (image upload) analysis — separate route, no timeout limit issue
// on Fly.io the way there was on Netlify Functions.
router.post('/', auth, async (req, res) => {
  try {
    const check = await checkUsage(req.user.id, 'smart_sourcing', false)
    if (!check.ok) return res.status(403).json(check)

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      messages: req.body.messages, // includes image content blocks
    })

    await burnUsage(req.user.id, check.usage, check.cost, false)
    res.json({ content: response.content })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
