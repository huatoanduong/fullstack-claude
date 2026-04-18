import { Campaign, CampaignRecipient } from '../db'

const BATCH_SIZE = 10
const SIMULATED_SUCCESS_RATE = 0.8
const BATCH_DELAY_MS_MIN = 100
const BATCH_DELAY_MS_RANGE = 100

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function sendAsync(campaignId: string): Promise<void> {
  await Campaign.update({ status: 'sending' }, { where: { id: campaignId } })

  const recipients = await CampaignRecipient.findAll({
    where: { campaign_id: campaignId, status: 'pending' },
  })

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE)
    await Promise.all(
      batch.map(async (r) => {
        const success = Math.random() < SIMULATED_SUCCESS_RATE
        if (success) {
          await r.update({
            status: 'sent',
            sent_at: new Date(),
          })
        } else {
          await r.update({
            status: 'failed',
          })
        }
      })
    )
    if (i + BATCH_SIZE < recipients.length) {
      await delay(BATCH_DELAY_MS_MIN + Math.random() * BATCH_DELAY_MS_RANGE)
    }
  }

  await Campaign.update({ status: 'sent' }, { where: { id: campaignId } })
}
