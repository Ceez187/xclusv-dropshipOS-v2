export interface UsageRow {
  user_id: string
  tier: string
  actions_used: number
  actions_limit: number
  rapidapi_calls_used: number
  rapidapi_calls_limit: number
  period_start: string
  updated_at: string
}

export type ActionType = string

export interface UsageCheckOk {
  ok: true
  usage: UsageRow
  cost: number
}

export interface UsageCheckFail {
  ok: false
  reason: 'LIMIT_REACHED' | 'RAPIDAPI_LIMIT_REACHED'
  used?: number
  limit?: number
  degrade?: boolean
}

export type UsageCheckResult = UsageCheckOk | UsageCheckFail
