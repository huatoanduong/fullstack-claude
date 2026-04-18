import request from 'supertest'
import app from '../src/app'
import { createTestUser } from './helpers/createTestUser'

describe('auth', () => {
  it('register returns user and access token, sets refresh cookie', async () => {
    const email = `reg-${Date.now()}@example.com`
    const res = await request(app)
      .post('/auth/register')
      .send({ email, name: 'N', password: 'password12' })
      .expect(201)

    expect(res.body.user).toMatchObject({ email, name: 'N' })
    expect(typeof res.body.accessToken).toBe('string')
    const setCookie = (res.headers['set-cookie'] ?? []) as unknown as string[]
    expect(setCookie.some((c) => c.startsWith('refreshToken='))).toBe(true)
  })

  it('refresh with valid refresh cookie returns a new access token and rotates cookie', async () => {
    const { refreshCookie } = await createTestUser()

    const res = await request(app)
      .post('/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(200)

    expect(typeof res.body.accessToken).toBe('string')

    const setCookie = (res.headers['set-cookie'] ?? []) as unknown as string[]
    const newCookie = setCookie.find((c) => c.startsWith('refreshToken='))
    expect(typeof newCookie).toBe('string')
    expect(newCookie?.split(';')[0]).not.toBe(refreshCookie.split(';')[0])
  })

  it('refresh with revoked refresh cookie returns 401', async () => {
    const { refreshCookie } = await createTestUser()

    await request(app).post('/auth/refresh').set('Cookie', refreshCookie).expect(200)

    await request(app).post('/auth/refresh').set('Cookie', refreshCookie).expect(401)
  })
})
