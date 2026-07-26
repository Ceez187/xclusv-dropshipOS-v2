import type { Request, Response, NextFunction } from 'express'
import { supabase } from '../supabase'

export function auth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Not logged in' })

  supabase.auth.getUser(token).then(({ data, error }) => {
    if (error || !data.user) return res.status(401).json({ error: 'Invalid session' })
    req.user = data.user
    next()
  })
}
