import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from '../context/AuthContext'

export interface UseSupabaseTableOptions {
  orderBy?: string
  ascending?: boolean
  match?: Record<string, string | number | boolean>
}

export interface UseSupabaseTableResult<T extends { id: string }> {
  rows: T[]
  loading: boolean
  error: Error | null
  refresh: () => Promise<void>
  insert: (values: Partial<T>) => Promise<T>
  update: (id: string, values: Partial<T>) => Promise<T>
  remove: (id: string) => Promise<void>
}

// Shared CRUD hook for the user-scoped tables (vendors, orders, customers,
// and saved_items filtered by `kind`). RLS already restricts rows to
// auth.uid() = user_id; this wires the standard load/insert/update/remove
// cycle plus optional extra equality filters (e.g. { kind: 'listing' }) so
// each module doesn't repeat it.
export function useSupabaseTable<T extends { id: string }>(
  table: string,
  { orderBy = 'created_at', ascending = false, match = {} }: UseSupabaseTableOptions = {}
): UseSupabaseTableResult<T> {
  const { user } = useAuth()
  const [rows, setRows] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const matchKey = JSON.stringify(match)

  const refresh = useCallback(async () => {
    if (!user) return
    setLoading(true)
    let query = supabase.from(table).select('*')
    for (const [column, value] of Object.entries(match)) {
      query = query.eq(column, value)
    }
    const { data, error: fetchError } = await query.order(orderBy, { ascending })
    if (fetchError) setError(fetchError)
    else setRows((data as T[]) ?? [])
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, orderBy, ascending, user, matchKey])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function insert(values: Partial<T>): Promise<T> {
    const { data, error: insertError } = await supabase
      .from(table)
      .insert({ ...values, ...match, user_id: user!.id } as never)
      .select()
      .single()
    if (insertError) throw insertError
    setRows((prev) => [data as T, ...prev])
    return data as T
  }

  async function update(id: string, values: Partial<T>): Promise<T> {
    const { data, error: updateError } = await supabase
      .from(table)
      .update(values as never)
      .eq('id', id)
      .select()
      .single()
    if (updateError) throw updateError
    setRows((prev) => prev.map((row) => (row.id === id ? (data as T) : row)))
    return data as T
  }

  async function remove(id: string): Promise<void> {
    const { error: deleteError } = await supabase.from(table).delete().eq('id', id)
    if (deleteError) throw deleteError
    setRows((prev) => prev.filter((row) => row.id !== id))
  }

  return { rows, loading, error, refresh, insert, update, remove }
}
