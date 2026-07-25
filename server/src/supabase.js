const { createClient } = require('@supabase/supabase-js')

// Admin client — service key bypasses RLS, used only for usage-metering
// reads/writes and to validate the caller's session token.
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

module.exports = { supabase }
