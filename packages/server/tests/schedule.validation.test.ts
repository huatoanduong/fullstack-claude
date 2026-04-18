import request from 'supertest'
import app from '../src/app'
import { createTestUser } from './helpers/createTestUser'

describe('schedule validation', () => {
  it('returns 400 when scheduled_at is in the past', async () => {
    const { accessToken } = await createTestUser()
    const created = await request(app)
      .post('/campaigns')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'c', subject: 's', body: 'b' })
      .expect(201)

    const past = new Date(Date.now() - 60_000).toISOString()

    const res = await request(app)
      .post(`/campaigns/${created.body.id}/schedule`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ scheduled_at: past })
      .expect(400)

    expect(res.body.error).toMatch(/future/i)
  })

  it('returns 200 when scheduled_at is in the future', async () => {
    const { accessToken } = await createTestUser()
    const created = await request(app)
      .post('/campaigns')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'c', subject: 's', body: 'b' })
      .expect(201)

    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString()

    await request(app)
      .post(`/campaigns/${created.body.id}/schedule`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ scheduled_at: future })
      .expect(200)
  })
})
