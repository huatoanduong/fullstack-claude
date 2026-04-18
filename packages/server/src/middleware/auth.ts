import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import type { AuthPayload } from '../types'

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid token' })
    return
  }

  const token = header.slice('Bearer '.length).trim()
  if (!token) {
    res.status(401).json({ error: 'Missing or invalid token' })
    return
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as AuthPayload
    req.user = payload
    next()
  } catch {
    res.status(401).json({ error: 'Token expired or invalid' })
  }
}
