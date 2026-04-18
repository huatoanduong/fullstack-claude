import request from 'supertest'
import app from '../src/app'
import { CampaignRecipient } from '../src/db'
import { createTestUser } from './helpers/createTestUser'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

describe('send simulation', () => {
  it('returns 202 and campaign moves to sending quickly', async () => {
    const { accessToken } = await createTestUser()

    const r1 = await request(app)
      .post('/recipients')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: `r-${Date.now()}@example.com`, name: 'R1' })
      .expect(201)

    const created = await request(app)
      .post('/campaigns')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'c',
        subject: 's',
        body: 'b',
        recipientIds: [r1.body.id],
      })
      .expect(201)

    await request(app)
      .post(`/campaigns/${created.body.id}/send`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(202)

    const after = await request(app)
      .get(`/campaigns/${created.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)

    expect(['sending', 'sent']).toContain(after.body.status)
  })

  it('eventually marks all recipients with sent_at and campaign as sent', async () => {
    const { accessToken } = await createTestUser()

    const r1 = await request(app)
      .post('/recipients')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: `r2-${Date.now()}@example.com`, name: 'R2' })
      .expect(201)

    const created = await request(app)
      .post('/campaigns')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'c',
        subject: 's',
        body: 'b',
        recipientIds: [r1.body.id],
      })
      .expect(201)

    await request(app)
      .post(`/campaigns/${created.body.id}/send`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(202)

    let status = ''
    for (let i = 0; i < 80; i++) {
      const res = await request(app)
        .get(`/campaigns/${created.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
      status = res.body.status
      if (status === 'sent') break
      await sleep(150)
    }

    expect(status).toBe('sent')

    const rows = await CampaignRecipient.findAll({
      where: { campaign_id: created.body.id },
    })
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(row.sent_at).not.toBeNull()
    }
  })
})
