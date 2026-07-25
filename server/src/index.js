require('dotenv').config()
const express = require('express')
const cors = require('cors')

const claudeRoute = require('./routes/claude')
const visionRoute = require('./routes/vision')
const sourcingRoute = require('./routes/sourcing')

const app = express()

// Restricted to the deployed frontend origin, not a bare cors() wildcard —
// this proxy holds real Anthropic/RapidAPI keys server-side.
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:5173'
app.use(cors({ origin: allowedOrigin }))
app.use(express.json({ limit: '10mb' })) // needed for vision/image calls

app.get('/health', (_req, res) => res.json({ ok: true }))

app.use('/api/claude', claudeRoute)
app.use('/api/vision', visionRoute)
app.use('/api/sourcing', sourcingRoute)

const port = process.env.PORT || 8080
app.listen(port, () => console.log(`Proxy running on :${port}`))
