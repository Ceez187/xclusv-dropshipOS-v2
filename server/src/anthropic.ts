import Anthropic from '@anthropic-ai/sdk'
import type { Response } from 'express'

// The SDK's own default is 10 minutes — fine for a batch script, but this
// client is called synchronously from an HTTP proxy route with a browser
// tab waiting on it, so a stalled Anthropic request would otherwise leave
// the user staring at a spinner for up to 10 minutes with no way to recover
// except reloading.
export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 45_000 })
export const MODEL = 'claude-sonnet-4-6'

// Shared by the claude/vision/sourcing routes so a timeout reads as a
// retryable 504 instead of the same generic 500 as a real server error.
export function handleAnthropicError(err: unknown, res: Response) {
  console.error(err)
  if (err instanceof Anthropic.APIConnectionTimeoutError) {
    return res.status(504).json({ error: 'The AI took too long to respond — please try again.' })
  }
  res.status(500).json({ error: 'Server error' })
}
