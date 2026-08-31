import express from 'express'
import { auth } from '../middleware/auth'
import { enforceUsageLimit } from '../middleware/enforceUsage'
import { checkUsage, getUsageRow, burnUsage, ACTION_COST } from '../usage'
import { anthropic, MODEL } from '../anthropic'

const router = express.Router()

// RapidAPI marketplace endpoints wrap results differently (some return a
// bare array, most nest it under an envelope key) — unwrap the common
// shapes rather than assuming one, so an envelope we don't expect degrades
// cleanly (liveListings: null) instead of getting billed as a successful
// live-listings call the client can't actually render anything from.
function normalizeListings(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object') {
    for (const key of ['results', 'data', 'items', 'products', 'listings']) {
      const val = (raw as Record<string, unknown>)[key]
      if (Array.isArray(val)) return val
    }
  }
  return null
}

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

    let liveListings: unknown[] | null = null
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
        liveListings = normalizeListings(await rapidRes.json())
        usedRapidApi = liveListings !== null
      } catch (e) {
        console.error('RapidAPI failed, degrading', e)
      }
    }

    // Burn against a fresh row rather than req.usageCheck's pre-request
    // snapshot: usedRapidApi may have raised the actual cost from
    // 'smart_sourcing' (3) to 'smart_sourcing_live' (5) since the middleware
    // ran, and the RapidAPI call already happened by this point regardless
    // of whether a concurrent request has since put the account over its
    // limit — so this always bills what actually happened, rather than
    // silently under-billing (and under-counting rapidapi_calls_used) on
    // that race.
    const cost = ACTION_COST[usedRapidApi ? 'smart_sourcing_live' : 'smart_sourcing']
    const freshUsage = await getUsageRow(req.user.id)
    await burnUsage(req.user.id, freshUsage, cost, usedRapidApi)

    res.json({ content: analysis.content, liveListings, degraded: !usedRapidApi })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
