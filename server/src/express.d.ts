import type { User } from '@supabase/supabase-js'
import type { UsageCheckOk } from './types'

declare global {
  namespace Express {
    interface Request {
      user: User
      usageCheck: UsageCheckOk
    }
  }
}
