import { Sequelize } from 'sequelize'
import dotenv from 'dotenv'

dotenv.config()

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required')
}

export const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
})

export { User } from './models/User'
export { Campaign } from './models/Campaign'
export { Recipient } from './models/Recipient'
export { CampaignRecipient } from './models/CampaignRecipient'
export { RefreshToken } from './models/RefreshToken'

import './models/associations'
