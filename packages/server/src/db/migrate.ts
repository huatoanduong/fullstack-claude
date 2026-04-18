import { sequelize } from './index'
import { runAllMigrations } from './runAllMigrations'

async function migrate() {
  await sequelize.authenticate()
  await runAllMigrations(sequelize)
  await sequelize.close()
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
