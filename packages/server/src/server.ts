import app from './app'
import { Op } from 'sequelize'
import { Campaign, sequelize } from './db'
import * as sendService from './services/sendService'

const PORT = process.env.PORT ?? 3000

// NOTE: single-node in-process scheduler — replace with pg-boss or BullMQ for production
setInterval(async () => {
  const due = await Campaign.findAll({
    where: { status: 'scheduled', scheduled_at: { [Op.lte]: new Date() } },
  })

  for (const campaign of due) {
    const [updated] = await Campaign.update(
      { status: 'sending' },
      { where: { id: campaign.id, status: 'scheduled' } }
    )
    if (updated > 0) {
      void sendService.sendAsync(campaign.id).catch(console.error)
    }
  }
}, 60_000)

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

const shutdown = () => {
  server.close(() => {
    void sequelize.close().then(() => process.exit(0))
  })
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
