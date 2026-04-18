import bcrypt from 'bcryptjs'
import { createHash, randomUUID } from 'crypto'
import jwt from 'jsonwebtoken'
import { Op } from 'sequelize'
import { RefreshToken } from '../db'
import type { AuthPayload } from '../types'

function fingerprintToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function signAccessToken(userId: string): string {
  return jwt.sign({ userId } satisfies AuthPayload, process.env.JWT_SECRET as string, { expiresIn: '1h' })
}

export function verifyAccessToken(token: string): AuthPayload {
  return jwt.verify(token, process.env.JWT_SECRET as string) as AuthPayload
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ userId, jti: randomUUID() }, process.env.REFRESH_SECRET as string, { expiresIn: '7d' })
}

export function verifyRefreshToken(token: string): { userId: string } {
  return jwt.verify(token, process.env.REFRESH_SECRET as string) as { userId: string }
}

export async function saveRefreshToken(userId: string, token: string): Promise<void> {
  const fingerprint = fingerprintToken(token)
  const tokenHash = await bcrypt.hash(fingerprint, 8)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  await RefreshToken.create({
    user_id: userId,
    token_hash: tokenHash,
    token_fingerprint: fingerprint,
    expires_at: expiresAt,
  })
}

export async function revokeRefreshToken(token: string): Promise<void> {
  try {
    verifyRefreshToken(token)
  } catch {
    return
  }
  const fingerprint = fingerprintToken(token)
  await RefreshToken.destroy({
    where: { token_fingerprint: fingerprint, expires_at: { [Op.gt]: new Date() } },
  })
}

export async function validateRefreshToken(token: string): Promise<boolean> {
  try {
    verifyRefreshToken(token)
  } catch {
    return false
  }
  const fingerprint = fingerprintToken(token)
  const row = await RefreshToken.findOne({
    where: { token_fingerprint: fingerprint, expires_at: { [Op.gt]: new Date() } },
  })
  return row !== null
}
