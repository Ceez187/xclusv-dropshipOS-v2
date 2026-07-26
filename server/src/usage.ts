import { supabase } from './supabase'
import type { ActionType, UsageCheckResult, UsageRow } from './types'

export const ACTION_COST: Record<string, number> = {
  listing_generator: 1,
  pricing_calculator: 1,
  ad_script_generator: 1,
  customer_analysis: 1,
  smart_sourcing: 3,
  smart_sourcing_live: 5,
  default: 1,
}

export async function checkUsage(
  userId: string,
  actionType: ActionType,
  needsRapidApi?: boolean
): Promise<UsageCheckResult> {
  const { data: usage } = await supabase.from('user_usage').select('*').eq('user_id', userId).single()
  const row = usage as UsageRow
  const cost = ACTION_COST[actionType] ?? ACTION_COST.default

  if (row.actions_used + cost > row.actions_limit) {
    return { ok: false, reason: 'LIMIT_REACHED', used: row.actions_used, limit: row.actions_limit }
  }
  if (needsRapidApi && row.rapidapi_calls_used + 1 > row.rapidapi_calls_limit) {
    return { ok: false, reason: 'RAPIDAPI_LIMIT_REACHED', degrade: true }
  }
  return { ok: true, usage: row, cost }
}

export async function burnUsage(
  userId: string,
  usage: UsageRow,
  cost: number,
  usedRapidApi: boolean
): Promise<void> {
  await supabase
    .from('user_usage')
    .update({
      actions_used: usage.actions_used + cost,
      rapidapi_calls_used: usage.rapidapi_calls_used + (usedRapidApi ? 1 : 0),
      updated_at: new Date(),
    })
    .eq('user_id', userId)
}
