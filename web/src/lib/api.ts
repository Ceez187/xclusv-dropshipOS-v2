import { supabase } from './supabaseClient'
import type { ContentBlock } from './parseClaudeJson'
import type { LimitReason } from '../types'

const PROXY_URL = import.meta.env.VITE_PROXY_URL

export interface ApiErrorOptions {
  status?: number
  reason?: LimitReason | 'NOT_LOGGED_IN' | string
  payload?: unknown
}

export class ApiError extends Error {
  status?: number
  reason?: string
  payload?: unknown

  constructor(message: string, { status, reason, payload }: ApiErrorOptions = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.reason = reason
    this.payload = payload
  }
}

export interface ProxyUsage {
  used: number
  limit: number
}

export interface ProxyResponse {
  content: ContentBlock[]
  usage?: ProxyUsage
  liveListings?: unknown
  degraded?: boolean
  // Anthropic's stop_reason — 'max_tokens' means the response was cut off
  // before the model finished, which callers asking for structured JSON
  // (see SmartSourcing) need to distinguish from a genuine parse failure.
  stopReason?: string
}

export type ClaudeMessageContent =
  | string
  | Array<
      | { type: 'text'; text: string }
      | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
    >

export interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: ClaudeMessageContent
}

export interface ProxyRequestBody {
  messages: ClaudeMessage[]
  actionType?: string
  keyword?: string
  max_tokens?: number
}

// Slightly longer than the server's own 45s Anthropic timeout (see
// server/src/anthropic.ts), so a slow-but-real Anthropic response has room
// to come back with the server's own "took too long" message before this
// abort fires and produces a blunter, unexplained network error instead.
const PROXY_TIMEOUT_MS = 50_000

// POSTs to the Render proxy with the current Supabase session token
// attached. Throws ApiError with `.reason` set to LIMIT_REACHED /
// RAPIDAPI_LIMIT_REACHED on 403 so callers can branch without parsing the
// response themselves.
export async function callProxy(path: string, body: ProxyRequestBody): Promise<ProxyResponse> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    throw new ApiError('Not logged in', { status: 401, reason: 'NOT_LOGGED_IN' })
  }

  let res: Response
  try {
    res = await fetch(`${PROXY_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      throw new ApiError('The AI took too long to respond — please try again.', { status: 504 })
    }
    throw new ApiError('Could not reach the server — check your connection and try again.', { status: 0 })
  }

  let json: Record<string, unknown> | null = null
  try {
    json = await res.json()
  } catch {
    // non-JSON error body (e.g. proxy down) — fall through with json = null
  }

  if (!res.ok) {
    throw new ApiError((json?.error as string) || `Request failed (${res.status})`, {
      status: res.status,
      reason: json?.reason as string | undefined,
      payload: json,
    })
  }

  return json as unknown as ProxyResponse
}

export const callClaude = (body: ProxyRequestBody) => callProxy('/api/claude', body)
export const callVision = (body: ProxyRequestBody) => callProxy('/api/vision', body)
export const callSourcing = (body: ProxyRequestBody) => callProxy('/api/sourcing', body)

// Fire-and-forget ping so the account owner gets an email when someone
// signs in — see AuthPage.tsx's sign-in handler, which only calls this on
// an explicit sign-in submit (not on silent token refreshes). Never throws:
// a failed alert must not block or error out the user's sign-in.
export async function notifyLogin(accessToken: string): Promise<void> {
  try {
    await fetch(`${PROXY_URL}/api/auth-events/login`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  } catch {
    // best-effort only
  }
}
