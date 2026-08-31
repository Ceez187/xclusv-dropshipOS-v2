import type { Request, Response, NextFunction } from 'express'
import { supabase } from '../supabase'

export async function auth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Not logged in' })

  try {
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) return res.status(401).json({ error: 'Invalid session' })
    req.user = data.user
    next()
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
}
