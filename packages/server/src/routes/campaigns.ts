import { Router } from 'express'
import { z } from 'zod'
import { col, fn, Op } from 'sequelize'
import { Campaign, CampaignRecipient, Recipient } from '../db'
import { asyncHandler } from '../middleware/asyncHandler'
import { validate } from '../middleware/validate'
import { requireAuth } from '../middleware/auth'
import * as sendService from '../services/sendService'
import * as statsService from '../services/statsService'
import type { AuthedRequest } from '../types'

const router = Router()

function parseUuid(value: unknown): string | null {
  const parsed = z.string().uuid().safeParse(value)
  return parsed.success ? parsed.data : null
}

const CreateCampaignSchema = z.object({
  name: z.string().min(1).max(255),
  subject: z.string().min(1).max(255),
  body: z.string().min(1),
  recipientIds: z.array(z.string().uuid()).optional(),
})

const UpdateCampaignSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  subject: z.string().min(1).max(255).optional(),
  body: z.string().min(1).optional(),
  scheduled_at: z.string().datetime({ offset: true }).nullable().optional(),
})

const ScheduleSchema = z.object({
  scheduled_at: z.string().datetime({ offset: true }),
})

router.use(requireAuth)

router.get('/', asyncHandler(async (req, res) => {
  const userId = (req as AuthedRequest).user.userId

  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1)
  const limitRaw = parseInt(String(req.query.limit ?? '10'), 10) || 10
  const limit = Math.min(100, Math.max(1, limitRaw))
  const offset = (page - 1) * limit

  const [rows, count] = await Promise.all([
    Campaign.findAll({
      where: { created_by: userId },
      include: [{ model: CampaignRecipient, as: 'campaignRecipients', attributes: [] }],
      attributes: {
        include: [[fn('COUNT', col('campaignRecipients.campaign_id')), 'recipient_count']],
      },
      group: ['Campaign.id'],
      subQuery: false,
      limit,
      offset,
      order: [['created_at', 'DESC']],
    }),
    Campaign.count({ where: { created_by: userId } }),
  ])

  res.json({
    data: rows,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit) || 0,
    },
  })
}))

router.post('/', validate(CreateCampaignSchema), asyncHandler(async (req, res) => {
  const userId = (req as AuthedRequest).user.userId

  const body = req.body as z.infer<typeof CreateCampaignSchema>
  const { recipientIds, ...fields } = body

  if (recipientIds?.length) {
    const uniqueRecipientIds = Array.from(new Set(recipientIds))
    const ownedCount = await Recipient.count({
      where: { id: uniqueRecipientIds, created_by: userId },
    })
    if (ownedCount !== uniqueRecipientIds.length) {
      res.status(400).json({ error: 'One or more recipients are invalid' })
      return
    }
  }

  const campaign = await Campaign.create({
    ...fields,
    status: 'draft',
    created_by: userId,
  })

  if (recipientIds?.length) {
    await CampaignRecipient.bulkCreate(
      recipientIds.map((recipient_id) => ({
        campaign_id: campaign.id,
        recipient_id,
        status: 'pending' as const,
      }))
    )
  }

  res.status(201).json(campaign)
}))

router.get('/:id/stats', asyncHandler(async (req, res) => {
  const userId = (req as AuthedRequest).user.userId

  const id = parseUuid(req.params.id)
  if (!id) {
    res.status(404).json({ error: 'Campaign not found' })
    return
  }

  const campaign = await Campaign.findOne({
    where: { id, created_by: userId },
  })
  if (!campaign) {
    res.status(404).json({ error: 'Campaign not found' })
    return
  }

  const stats = await statsService.getStats(campaign.id, userId)
  res.json(stats)
}))

router.get('/:id', asyncHandler(async (req, res) => {
  const userId = (req as AuthedRequest).user.userId

  const id = parseUuid(req.params.id)
  if (!id) {
    res.status(404).json({ error: 'Campaign not found' })
    return
  }

  const campaign = await Campaign.findOne({
    where: { id, created_by: userId },
    include: [
      {
        model: Recipient,
        as: 'recipients',
        through: { attributes: ['status', 'sent_at', 'opened_at'] },
      },
    ],
  })

  if (!campaign) {
    res.status(404).json({ error: 'Campaign not found' })
    return
  }

  res.json(campaign)
}))

router.patch('/:id', validate(UpdateCampaignSchema), asyncHandler(async (req, res) => {
  const userId = (req as AuthedRequest).user.userId

  const id = parseUuid(req.params.id)
  if (!id) {
    res.status(404).json({ error: 'Campaign not found' })
    return
  }

  const campaign = await Campaign.findOne({
    where: { id, created_by: userId },
  })

  if (!campaign) {
    res.status(404).json({ error: 'Campaign not found' })
    return
  }

  const updates = req.body as z.infer<typeof UpdateCampaignSchema>

  const mutableFieldsProvided =
    updates.name !== undefined || updates.subject !== undefined || updates.body !== undefined

  if (mutableFieldsProvided && campaign.status !== 'draft') {
    res.status(409).json({ error: 'Only draft campaigns can be edited' })
    return
  }

  if (updates.scheduled_at !== undefined) {
    if (updates.scheduled_at === null) {
      await campaign.update({ status: 'draft', scheduled_at: null })
    } else {
      const when = new Date(updates.scheduled_at)
      if (when <= new Date()) {
        res.status(400).json({ error: 'scheduled_at must be a future date' })
        return
      }
      await campaign.update({ status: 'scheduled', scheduled_at: when })
    }
  }

  if (mutableFieldsProvided) {
    await campaign.update({
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.subject !== undefined ? { subject: updates.subject } : {}),
      ...(updates.body !== undefined ? { body: updates.body } : {}),
    })
  }

  res.json(campaign)
}))

router.delete('/:id', asyncHandler(async (req, res) => {
  const userId = (req as AuthedRequest).user.userId

  const id = parseUuid(req.params.id)
  if (!id) {
    res.status(404).json({ error: 'Campaign not found' })
    return
  }

  const campaign = await Campaign.findOne({
    where: { id, created_by: userId },
  })

  if (!campaign) {
    res.status(404).json({ error: 'Campaign not found' })
    return
  }

  if (campaign.status !== 'draft') {
    res.status(409).json({ error: 'Only draft campaigns can be deleted' })
    return
  }

  await CampaignRecipient.destroy({ where: { campaign_id: campaign.id } })
  await campaign.destroy()
  res.status(204).send()
}))

router.post('/:id/schedule', validate(ScheduleSchema), asyncHandler(async (req, res) => {
  const userId = (req as AuthedRequest).user.userId

  const id = parseUuid(req.params.id)
  if (!id) {
    res.status(404).json({ error: 'Campaign not found' })
    return
  }

  const campaign = await Campaign.findOne({
    where: { id, created_by: userId },
  })

  if (!campaign) {
    res.status(404).json({ error: 'Campaign not found' })
    return
  }

  if (campaign.status !== 'draft') {
    res.status(409).json({ error: 'Only draft campaigns can be scheduled' })
    return
  }

  const { scheduled_at } = req.body as z.infer<typeof ScheduleSchema>
  const when = new Date(scheduled_at)
  if (when <= new Date()) {
    res.status(400).json({ error: 'scheduled_at must be a future date' })
    return
  }

  await campaign.update({
    status: 'scheduled',
    scheduled_at: when,
  })

  res.json(campaign)
}))

router.post('/:id/send', asyncHandler(async (req, res) => {
  const userId = (req as AuthedRequest).user.userId

  const id = parseUuid(req.params.id)
  if (!id) {
    res.status(404).json({ error: 'Campaign not found' })
    return
  }

  const [updatedCount] = await Campaign.update(
    { status: 'sending' },
    { where: { id, status: { [Op.in]: ['draft', 'scheduled'] }, created_by: userId } }
  )

  if (updatedCount === 0) {
    res.status(409).json({ error: 'Campaign cannot be sent in its current state' })
    return
  }

  setImmediate(() => {
    void sendService.sendAsync(id).catch(console.error)
  })

  res.status(202).json({ message: 'Send initiated' })
}))

export default router
