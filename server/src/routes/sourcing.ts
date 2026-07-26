import express from 'express'
import { auth } from '../middleware/auth'
import { enforceUsageLimit } from '../middleware/enforceUsage'
import { checkUsage, burnUsage } from '../usage'
import { anthropic, MODEL } from '../anthropic'

const router = express.Router()

// Smart Sourcing: Claude analysis + optional RapidAPI live listings, with
// graceful degrade — a RapidAPI failure or exhausted RapidAPI quota never
// blocks the Claude analysis response, it just comes back degraded: true.
// enforceUsageLimit gates on the base 'smart_sourcing' cost before the
// Anthropic call runs at all — previously this route called Claude first
// and only checked usage afterward, so an over-limit user still got a full
// analysis back.
router.post('/', auth, enforceUsageLimit('smart_sourcing'), async (req, res) => {
  try {
    const analysis = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      messages: req.body.messages,
    })

    let liveListings: unknown = null
    let usedRapidApi = false
    const preCheck = await checkUsage(req.user.id, 'smart_sourcing_live', true)

    if (preCheck.ok) {
      try {
        const rapidRes = await fetch(
          `https://${process.env.RAPIDAPI_HOST}/search?keyword=${encodeURIComponent(req.body.keyword)}`,
          {
            headers: {
              'X-RapidAPI-Key': process.env.RAPIDAPI_KEY!,
              'X-RapidAPI-Host': process.env.RAPIDAPI_HOST!,
            },
          }
        )
        liveListings = await rapidRes.json()
        usedRapidApi = true
      } catch (e) {
        console.error('RapidAPI failed, degrading', e)
      }
    }

    // Re-check rather than reuse req.usageCheck: usedRapidApi may have
    // raised the cost from 'smart_sourcing' (3) to 'smart_sourcing_live' (5)
    // since the middleware ran, so the burn needs a fresh snapshot + cost.
    const finalCheck = await checkUsage(
      req.user.id,
      usedRapidApi ? 'smart_sourcing_live' : 'smart_sourcing',
      usedRapidApi
    )
    await burnUsage(
      req.user.id,
      finalCheck.ok ? finalCheck.usage : req.usageCheck.usage,
      finalCheck.ok ? finalCheck.cost : req.usageCheck.cost,
      finalCheck.ok && usedRapidApi
    )

    res.json({ content: analysis.content, liveListings, degraded: !usedRapidApi })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
