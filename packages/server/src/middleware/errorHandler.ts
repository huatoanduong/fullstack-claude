import type { Request, Response, NextFunction } from 'express'
import { UniqueConstraintError, ValidationError } from 'sequelize'

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (process.env.NODE_ENV !== 'test') {
    console.error(err)
  }

  if (err instanceof UniqueConstraintError) {
    const field = err.errors[0]?.path ?? 'field'
    res.status(409).json({ error: `${field} already exists` })
    return
  }

  if (err instanceof ValidationError) {
    res.status(400).json({ error: 'Validation error', details: err.errors.map((e) => e.message) })
    return
  }

  res.status(500).json({ error: 'Internal server error' })
}
