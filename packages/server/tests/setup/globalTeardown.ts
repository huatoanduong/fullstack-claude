import { Sequelize } from 'sequelize'

export default async function globalTeardown(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    return
  }

  const sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    logging: false,
  })

  try {
    await sequelize.authenticate()
    await sequelize.query(
      'TRUNCATE TABLE campaign_recipients, refresh_tokens, campaigns, users, recipients RESTART IDENTITY CASCADE'
    )
  } finally {
    await sequelize.close()
  }
}
