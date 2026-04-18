import { Router, type Response } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { User } from '../db'
import { asyncHandler } from '../middleware/asyncHandler'
import { validate } from '../middleware/validate'
import { requireAuth } from '../middleware/auth'
import * as authService from '../services/authService'

const router = Router()

const RegisterSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8),
})

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

function setRefreshCookie(res: Response, refreshToken: string) {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
}

router.post('/register', validate(RegisterSchema), asyncHandler(async (req, res) => {
  const { email, name, password } = req.body as z.infer<typeof RegisterSchema>

  const existing = await User.findOne({ where: { email } })
  if (existing) {
    res.status(409).json({ error: 'Email already registered' })
    return
  }

  const password_hash = await bcrypt.hash(password, 12)
  const user = await User.create({ email, name, password_hash })

  const accessToken = authService.signAccessToken(user.id)
  const refreshToken = authService.signRefreshToken(user.id)
  await authService.saveRefreshToken(user.id, refreshToken)

  setRefreshCookie(res, refreshToken)
  res.status(201).json({
    user: { id: user.id, email: user.email, name: user.name },
    accessToken,
  })
}))

router.post('/login', validate(LoginSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.body as z.infer<typeof LoginSchema>

  const user = await User.findOne({ where: { email } })
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  const ok = await bcrypt.compare(password, user.password_hash)
  if (!ok) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  const accessToken = authService.signAccessToken(user.id)
  const refreshToken = authService.signRefreshToken(user.id)
  await authService.saveRefreshToken(user.id, refreshToken)

  setRefreshCookie(res, refreshToken)
  res.json({
    user: { id: user.id, email: user.email, name: user.name },
    accessToken,
  })
}))

router.post('/refresh', asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken as string | undefined
  if (!refreshToken) {
    res.status(401).json({ error: 'Token expired or invalid' })
    return
  }

  let userId: string
  try {
    ;({ userId } = authService.verifyRefreshToken(refreshToken))
  } catch {
    res.status(401).json({ error: 'Token expired or invalid' })
    return
  }

  const valid = await authService.validateRefreshToken(refreshToken)
  if (!valid) {
    res.status(401).json({ error: 'Token expired or invalid' })
    return
  }

  const user = await User.findByPk(userId)
  if (!user) {
    res.status(401).json({ error: 'Token expired or invalid' })
    return
  }

  await authService.revokeRefreshToken(refreshToken)

  const accessToken = authService.signAccessToken(user.id)
  const newRefresh = authService.signRefreshToken(user.id)
  await authService.saveRefreshToken(user.id, newRefresh)

  setRefreshCookie(res, newRefresh)
  res.json({ accessToken })
}))

router.post('/logout', requireAuth, asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken as string | undefined
  if (refreshToken) {
    try {
      const decoded = authService.verifyRefreshToken(refreshToken)
      if (decoded.userId !== req.user?.userId) {
        res.status(403).json({ error: 'Forbidden' })
        return
      }
      await authService.revokeRefreshToken(refreshToken)
    } catch {
      // ignore invalid/expired refresh tokens on logout
    }
  }
  res.clearCookie('refreshToken', { path: '/api/auth' })
  res.status(204).send()
}))

export default router
