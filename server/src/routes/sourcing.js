const express = require('express')
const { auth } = require('../middleware/auth')
const { checkUsage, burnUsage } = require('../usage')
const { anthropic, MODEL } = require('../anthropic')

const router = express.Router()

// Smart Sourcing: Claude analysis + optional RapidAPI live listings, with
// graceful degrade — a RapidAPI failure or exhausted RapidAPI quota never
// blocks the Claude analysis response, it just comes back degraded: true.
router.post('/', auth, async (req, res) => {
  try {
    const analysis = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      messages: req.body.messages,
    })

    let liveListings = null
    let usedRapidApi = false
    const preCheck = await checkUsage(req.user.id, 'smart_sourcing_live', true)

    if (preCheck.ok) {
      try {
        const rapidRes = await fetch(
          `https://${process.env.RAPIDAPI_HOST}/search?keyword=${encodeURIComponent(req.body.keyword)}`,
          {
            headers: {
              'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
              'X-RapidAPI-Host': process.env.RAPIDAPI_HOST,
            },
          }
        )
        liveListings = await rapidRes.json()
        usedRapidApi = true
      } catch (e) {
        console.error('RapidAPI failed, degrading', e)
      }
    }

    const finalCheck = await checkUsage(
      req.user.id,
      usedRapidApi ? 'smart_sourcing_live' : 'smart_sourcing',
      usedRapidApi
    )
    if (finalCheck.ok) await burnUsage(req.user.id, finalCheck.usage, finalCheck.cost, usedRapidApi)

    res.json({ content: analysis.content, liveListings, degraded: !usedRapidApi })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
