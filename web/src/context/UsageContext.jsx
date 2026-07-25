import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'

const UsageContext = createContext(null)

export function UsageProvider({ children }) {
  const { user } = useAuth()
  const [usage, setUsage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [limitReached, setLimitReached] = useState(null) // { reason, payload } | null

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
      .single()
    if (!error) setUsage(data)
    setLoading(false)
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Merge the `usage: { used, limit }` field a proxy response includes after
  // a successful call, so the badge updates without a round-trip refetch.
  const applyProxyUsage = useCallback((proxyUsage) => {
    if (!proxyUsage) return
    setUsage((prev) =>
      prev ? { ...prev, actions_used: proxyUsage.used, actions_limit: proxyUsage.limit } : prev
    )
  }, [])

  // Call sites catch ApiError from lib/api.js and pass it here instead of
  // rendering a raw error screen; LimitReachedModal reads this state.
  const reportLimitReached = useCallback((err) => {
    if (err?.reason === 'LIMIT_REACHED' || err?.reason === 'RAPIDAPI_LIMIT_REACHED') {
      setLimitReached({ reason: err.reason, payload: err.payload })
      return true
    }
    return false
  }, [])

  const clearLimitReached = useCallback(() => setLimitReached(null), [])

  const value = {
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

export function useUsage() {
  const ctx = useContext(UsageContext)
  if (!ctx) throw new Error('useUsage must be used within UsageProvider')
  return ctx
}
