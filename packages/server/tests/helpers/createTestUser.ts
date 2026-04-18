import request from 'supertest'
import app from '../../src/app'

export async function createTestUser() {
  const email = `user-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`
  const res = await request(app)
    .post('/auth/register')
    .send({ email, name: 'Test User', password: 'password12' })
    .expect(201)

  const setCookie = (res.headers['set-cookie'] ?? []) as string[]
  const refreshCookie = setCookie.find((c) => c.startsWith('refreshToken='))
  if (!refreshCookie) {
    throw new Error('Expected refreshToken cookie to be set')
  }

  return {
    accessToken: res.body.accessToken as string,
    refreshCookie: refreshCookie.split(';')[0],
    userId: res.body.user.id as string,
    email,
  }
}
