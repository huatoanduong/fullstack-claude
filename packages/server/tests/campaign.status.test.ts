import request from 'supertest'
import app from '../src/app'
import { Campaign } from '../src/db'
import { createTestUser } from './helpers/createTestUser'

describe('campaign status transitions', () => {
  it('returns 409 when PATCH on scheduled campaign', async () => {
    const { accessToken } = await createTestUser()
    const created = await request(app)
      .post('/campaigns')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'c', subject: 's', body: 'b' })
      .expect(201)

    await Campaign.update({ status: 'scheduled' }, { where: { id: created.body.id } })

    await request(app)
      .patch(`/campaigns/${created.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'updated' })
      .expect(409)
  })

  it('returns 409 when DELETE on sending campaign', async () => {
    const { accessToken } = await createTestUser()
    const created = await request(app)
      .post('/campaigns')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'c', subject: 's', body: 'b' })
      .expect(201)

    await Campaign.update({ status: 'sending' }, { where: { id: created.body.id } })

    await request(app)
      .delete(`/campaigns/${created.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(409)
  })

  it('returns 200 when PATCH on draft campaign', async () => {
    const { accessToken } = await createTestUser()
    const created = await request(app)
      .post('/campaigns')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'c', subject: 's', body: 'b' })
      .expect(201)

    await request(app)
      .patch(`/campaigns/${created.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'updated' })
      .expect(200)
  })
})
