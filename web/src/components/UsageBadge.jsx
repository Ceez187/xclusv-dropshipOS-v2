import { useUsage } from '../context/UsageContext'

export default function UsageBadge() {
  const { usage, loading } = useUsage()

  if (loading || !usage) return null

  const pct = usage.actions_limit > 0 ? usage.actions_used / usage.actions_limit : 0
  const tone = pct >= 1 ? 'text-red-400' : pct >= 0.8 ? 'text-amber-400' : 'text-brand-muted'

  return (
    <span className={`text-sm font-medium ${tone}`}>
      {usage.actions_used} of {usage.actions_limit} actions used this month
    </span>
  )
}
