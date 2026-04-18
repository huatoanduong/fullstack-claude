// WARNING: This script runs unconditionally via the Dockerfile CMD.
// Gate with `if (process.env.SEED !== 'true') process.exit(0)` before production use.
import bcrypt from 'bcryptjs'
import { Campaign, CampaignRecipient, Recipient, sequelize, User } from './index'

// NOTE: All seed emails are lowercase. The server does not normalize email casing —
// add a LOWER() transform in the Zod schema or a CITEXT column to enforce consistency.
const recipientData: Array<{
  email: string
  name: string
  status: 'sent' | 'failed'
  opened: boolean
}> = [
  { email: 'alice@example.com', name: 'Alice', status: 'sent', opened: true },
  { email: 'bob@example.com', name: 'Bob', status: 'sent', opened: false },
  { email: 'carol@example.com', name: 'Carol', status: 'sent', opened: false },
  { email: 'dave@example.com', name: 'Dave', status: 'failed', opened: false },
  { email: 'eve@example.com', name: 'Eve', status: 'sent', opened: false },
]

async function seed() {
  await sequelize.authenticate()

  const [user] = await User.findOrCreate({
    where: { email: 'demo@example.com' },
    defaults: {
      email: 'demo@example.com',
      name: 'Demo User',
      password_hash: await bcrypt.hash('password', 10),
    },
  })

  await Campaign.findOrCreate({
    where: { name: 'Draft Campaign', created_by: user.id },
    defaults: {
      name: 'Draft Campaign',
      created_by: user.id,
      subject: 'Draft Subject',
      body: 'Draft body.',
      status: 'draft',
    },
  })

  await Campaign.findOrCreate({
    where: { name: 'Scheduled Campaign', created_by: user.id },
    defaults: {
      name: 'Scheduled Campaign',
      created_by: user.id,
      subject: 'Scheduled Subject',
      body: 'Scheduled body.',
      status: 'scheduled',
      scheduled_at: new Date(Date.now() + 86400000),
    },
  })

  const [sent] = await Campaign.findOrCreate({
    where: { name: 'Sent Campaign', created_by: user.id },
    defaults: {
      name: 'Sent Campaign',
      created_by: user.id,
      subject: 'Sent Subject',
      body: 'Sent body.',
      status: 'sent',
    },
  })

  const recipients = await Promise.all(
    recipientData.map((r) =>
      Recipient.findOrCreate({
        where: { email: r.email },
        defaults: { email: r.email, name: r.name, created_by: user.id },
      })
    )
  )

  await Promise.all(
    recipients.map(([r], i) => {
      const rd = recipientData[i]!
      return CampaignRecipient.findOrCreate({
        where: { campaign_id: sent.id, recipient_id: r.id },
        defaults: {
          campaign_id: sent.id,
          recipient_id: r.id,
          status: rd.status,
          sent_at: rd.status === 'sent' ? new Date() : null,
          opened_at: rd.opened ? new Date() : null,
        },
      })
    })
  )

  console.log('Seed complete.')
  await sequelize.close()
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
