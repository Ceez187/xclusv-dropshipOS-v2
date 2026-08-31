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

const port = process.env.PORT || 8080
app.listen(port, () => console.log(`Proxy running on :${port}`))
