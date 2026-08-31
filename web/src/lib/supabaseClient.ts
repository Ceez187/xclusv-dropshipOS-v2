import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — copy web/.env.example to web/.env and fill them in.'
  )
}

// createClient throws synchronously on an empty URL, which would otherwise
// crash the whole module graph before React ever mounts (a blank white page
// with no on-screen explanation). Fall back to a placeholder so the app can
// still boot and show ConfigError — real requests will just fail at the
// network layer, same as any other unreachable-backend case.
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://not-configured.invalid',
  isSupabaseConfigured ? supabaseAnonKey : 'not-configured'
)
