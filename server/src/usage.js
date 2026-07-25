const { supabase } = require('./supabase')

const ACTION_COST = {
  listing_generator: 1,
  pricing_calculator: 1,
  ad_script_generator: 1,
  vendor_ai: 1,
  smart_sourcing: 3,
  smart_sourcing_live: 5,
  default: 1,
}

async function checkUsage(userId, actionType, needsRapidApi) {
  const { data: usage } = await supabase.from('user_usage').select('*').eq('user_id', userId).single()
  const cost = ACTION_COST[actionType] || ACTION_COST.default

  if (usage.actions_used + cost > usage.actions_limit) {
    return { ok: false, reason: 'LIMIT_REACHED', used: usage.actions_used, limit: usage.actions_limit }
  }
  if (needsRapidApi && usage.rapidapi_calls_used + 1 > usage.rapidapi_calls_limit) {
    return { ok: false, reason: 'RAPIDAPI_LIMIT_REACHED', degrade: true }
  }
  return { ok: true, usage, cost }
}

async function burnUsage(userId, usage, cost, usedRapidApi) {
  await supabase
    .from('user_usage')
    .update({
      actions_used: usage.actions_used + cost,
      rapidapi_calls_used: usage.rapidapi_calls_used + (usedRapidApi ? 1 : 0),
      updated_at: new Date(),
    })
    .eq('user_id', userId)
}

module.exports = { ACTION_COST, checkUsage, burnUsage }
