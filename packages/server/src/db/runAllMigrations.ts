import fs from 'fs'
import path from 'path'
import type { Sequelize } from 'sequelize'

export async function runAllMigrations(sequelize: Sequelize): Promise<void> {
  const migrationsDir = path.join(__dirname, '../../migrations')
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
    console.log(`Running migration: ${file}`)
    await sequelize.transaction(async (transaction) => {
      await sequelize.query(sql, { transaction })
    })
  }

  console.log('All migrations complete.')
}
