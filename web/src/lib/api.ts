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

// POSTs to the Fly.io proxy with the current Supabase session token attached.
// Throws ApiError with `.reason` set to LIMIT_REACHED / RAPIDAPI_LIMIT_REACHED
// on 403 so callers can branch without parsing the response themselves.
export async function callProxy(path: string, body: ProxyRequestBody): Promise<ProxyResponse> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    throw new ApiError('Not logged in', { status: 401, reason: 'NOT_LOGGED_IN' })
  }

  const res = await fetch(`${PROXY_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  })

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
