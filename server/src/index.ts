import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

import claudeRoute from './routes/claude'
import visionRoute from './routes/vision'
import sourcingRoute from './routes/sourcing'
import webhooksRoute from './routes/webhooks'
import authEventsRoute from './routes/authEvents'

const app = express()

app.use(helmet())

// Restricted to the deployed frontend origin, not a bare cors() wildcard —
// this proxy holds real Anthropic/RapidAPI keys server-side.
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:5173'
app.use(cors({ origin: allowedOrigin }))
app.use(express.json({ limit: '10mb' })) // needed for vision/image calls

app.get('/health', (_req, res) => res.json({ ok: true }))

// Backstop against a single caller hammering the AI endpoints — the
// per-user monthly action quota (enforceUsageLimit) is the primary defense,
// but that's checked against the database per request; this catches rapid
// bursts (e.g. a script calling the API directly) before they even reach
// that check or Anthropic/RapidAPI.
const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api', apiLimiter)

app.use('/api/claude', claudeRoute)
app.use('/api/vision', visionRoute)
app.use('/api/sourcing', sourcingRoute)
app.use('/api/webhooks', webhooksRoute)
app.use('/api/auth-events', authEventsRoute)

// Without this, an error thrown before a route handler runs (e.g.
// express.json() rejecting an oversized body) falls through to Express's
// default handler, which returns an HTML page with a full stack trace
// (including server file paths) instead of JSON — the client's fetch-based
// API layer expects JSON and leaking internals to the browser besides.
app.use((err: { status?: number; statusCode?: number; message?: string }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err.status ?? err.statusCode ?? 500
  if (status === 413) {
    return res.status(413).json({ error: 'That upload is too large. Please use a smaller image.' })
  }
  console.error(err)
  res.status(status).json({ error: 'Server error' })
})

const port = process.env.PORT || 8080
app.listen(port, () => console.log(`Proxy running on :${port}`))
