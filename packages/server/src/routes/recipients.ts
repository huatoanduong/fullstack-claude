import { Router } from 'express'
import { z } from 'zod'
import { Recipient } from '../db'
import { asyncHandler } from '../middleware/asyncHandler'
import { requireAuth } from '../middleware/auth'
import { validate } from '../middleware/validate'
import type { AuthedRequest } from '../types'

const router = Router()

const CreateRecipientSchema = z.object({
  // TODO: Normalize email to lowercase (z.string().email().toLowerCase()) to match
  // client-side normalization and avoid case-sensitive duplicate conflicts.
  email: z.string().email(),
  name: z.string().min(1).max(100),
})

router.use(requireAuth)

router.get('/', asyncHandler(async (req, res) => {
  const userId = (req as AuthedRequest).user.userId
  const recipients = await Recipient.findAll({
    where: { created_by: userId },
    order: [['created_at', 'DESC']],
  })
  res.json({ data: recipients })
}))

router.post('/', validate(CreateRecipientSchema), asyncHandler(async (req, res) => {
  const userId = (req as AuthedRequest).user.userId
  const { email, name } = req.body as z.infer<typeof CreateRecipientSchema>

  const existing = await Recipient.findOne({ where: { email } })
  if (existing) {
    res.status(409).json({ error: 'Email already exists' })
    return
  }

  const recipient = await Recipient.create({ email, name, created_by: userId })
  res.status(201).json(recipient)
}))

export default router
