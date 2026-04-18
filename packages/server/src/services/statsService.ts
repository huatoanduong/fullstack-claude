import { QueryTypes } from 'sequelize'
import { sequelize } from '../db'

export async function getStats(campaignId: string, userId: string) {
  const [result] = await sequelize.query(
    `
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'sent')::int AS sent,
      COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
      COUNT(*) FILTER (WHERE opened_at IS NOT NULL)::int AS opened
    FROM campaign_recipients cr
    JOIN campaigns c ON c.id = cr.campaign_id
    WHERE cr.campaign_id = :campaignId AND c.created_by = :userId
  `,
    { replacements: { campaignId, userId }, type: QueryTypes.SELECT }
  )

  const row = result as {
    total: number
    sent: number
    failed: number
    opened: number
  }

  return {
    total: row.total,
    sent: row.sent,
    failed: row.failed,
    opened: row.opened,
    open_rate: row.sent > 0 ? row.opened / row.sent : 0,
    send_rate: row.total > 0 ? row.sent / row.total : 0,
  }
}
