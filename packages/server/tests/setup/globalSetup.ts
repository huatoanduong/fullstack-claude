export default async function globalSetup(): Promise<void> {
  process.env.NODE_ENV = 'test'

  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL =
      'postgresql://test:test@127.0.0.1:5433/campaign_test'
  }

  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'test-jwt-secret'
  }

  if (!process.env.REFRESH_SECRET) {
    process.env.REFRESH_SECRET = 'test-refresh-secret'
  }

  const { sequelize } = await import('../../src/db')
  const { runAllMigrations } = await import('../../src/db/runAllMigrations')

  await sequelize.authenticate()
  await runAllMigrations(sequelize)
  await sequelize.close()
}
