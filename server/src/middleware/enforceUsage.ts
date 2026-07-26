import type { Request, Response, NextFunction } from 'express'
import { checkUsage } from '../usage'
import type { ActionType } from '../types'

// Gates a route on the caller's user_usage row before the handler runs a
// paid action. Reuses checkUsage's cost-aware comparison (actions_used +
// cost > actions_limit, from ACTION_COST in usage.js) rather than a flat
// actions_used >= actions_limit check, so a higher-cost action (e.g.
// smart_sourcing at 3) can't slip through on the last couple of remaining
// actions. Does NOT burn usage itself — the handler calls burnUsage after
// its Anthropic/RapidAPI call succeeds, so a downstream failure never costs
// the user an action. actionType may be a string or a (req) => string, for
// routes where the type depends on the request body (e.g. /api/claude).
export function enforceUsageLimit(
  actionType: ActionType | ((req: Request) => ActionType),
  { needsRapidApi = false }: { needsRapidApi?: boolean } = {}
) {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      const type = typeof actionType === 'function' ? actionType(req) : actionType
      const check = await checkUsage(req.user.id, type, needsRapidApi)
      if (!check.ok) return res.status(403).json(check)
      req.usageCheck = check
      next()
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Server error' })
    }
  }
}
