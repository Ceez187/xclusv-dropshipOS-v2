import { supabase } from './supabaseClient'

const PROXY_URL = import.meta.env.VITE_PROXY_URL

export class ApiError extends Error {
  constructor(message, { status, reason, payload } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.reason = reason
    this.payload = payload
  }
}

// POSTs to the Fly.io proxy with the current Supabase session token attached.
// Throws ApiError with `.reason` set to LIMIT_REACHED / RAPIDAPI_LIMIT_REACHED
// on 403 so callers can branch without parsing the response themselves.
export async function callProxy(path, body) {
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

  let json = null
  try {
    json = await res.json()
  } catch {
    // non-JSON error body (e.g. proxy down) — fall through with json = null
  }

  if (!res.ok) {
    throw new ApiError(json?.error || `Request failed (${res.status})`, {
      status: res.status,
      reason: json?.reason,
      payload: json,
    })
  }

  return json
}

export const callClaude = (body) => callProxy('/api/claude', body)
export const callVision = (body) => callProxy('/api/vision', body)
export const callSourcing = (body) => callProxy('/api/sourcing', body)
