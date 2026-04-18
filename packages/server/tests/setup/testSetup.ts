import { sequelize } from '../../src/db'

afterEach(async () => {
  await sequelize.query(
    'TRUNCATE TABLE campaign_recipients, refresh_tokens, campaigns, users, recipients RESTART IDENTITY CASCADE'
  )
})

afterAll(async () => {
  await sequelize.close()
})
