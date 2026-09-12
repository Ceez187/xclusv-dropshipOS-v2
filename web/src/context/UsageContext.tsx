import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'
import type { ApiError, ProxyUsage } from '../lib/api'
import type { LimitReached, UsageRow } from '../types'

export interface UsageContextValue {
  usage: UsageRow | null
  loading: boolean
  refresh: () => Promise<void>
  applyProxyUsage: (proxyUsage: ProxyUsage | undefined) => void
  limitReached: LimitReached | null
  reportLimitReached: (err: ApiError | Error) => boolean
  clearLimitReached: () => void
}

const UsageContext = createContext<UsageContextValue | null>(null)

export function UsageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [usage, setUsage] = useState<UsageRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [limitReached, setLimitReached] = useState<LimitReached | null>(null)

  const refresh = useCallback(async () => {
    if (!user) {
      setUsage(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('user_usage')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!error) setUsage(data as UsageRow | null)
    setLoading(false)
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Merge the `usage: { used, limit }` field a proxy response includes after
  // a successful call, so the badge updates without a round-trip refetch.
  const applyProxyUsage = useCallback((proxyUsage: ProxyUsage | undefined) => {
    if (!proxyUsage) return
    setUsage((prev) =>
      prev ? { ...prev, actions_used: proxyUsage.used, actions_limit: proxyUsage.limit } : prev
    )
  }, [])

  // Call sites catch ApiError from lib/api.ts and pass it here instead of
  // rendering a raw error screen; LimitReachedModal reads this state.
  const reportLimitReached = useCallback((err: ApiError | Error) => {
    const apiErr = err as ApiError
    if (apiErr?.reason === 'LIMIT_REACHED' || apiErr?.reason === 'RAPIDAPI_LIMIT_REACHED') {
      setLimitReached({ reason: apiErr.reason, payload: apiErr.payload })
      return true
    }
    return false
  }, [])

  const clearLimitReached = useCallback(() => setLimitReached(null), [])

  const value: UsageContextValue = {
    usage,
    loading,
    refresh,
    applyProxyUsage,
    limitReached,
    reportLimitReached,
    clearLimitReached,
  }

  return <UsageContext.Provider value={value}>{children}</UsageContext.Provider>
}

export function useUsage(): UsageContextValue {
  const ctx = useContext(UsageContext)
  if (!ctx) throw new Error('useUsage must be used within UsageProvider')
  return ctx
}
