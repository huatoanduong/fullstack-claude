import cookieParser from 'cookie-parser'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { rateLimit } from 'express-rate-limit'
import helmet from 'helmet'
import { errorHandler } from './middleware/errorHandler'
import authRouter from './routes/auth'
import campaignsRouter from './routes/campaigns'
import recipientsRouter from './routes/recipients'

dotenv.config()

const requiredEnv = ['JWT_SECRET', 'REFRESH_SECRET', 'DATABASE_URL']
for (const key of requiredEnv) {
  if (!process.env[key]) throw new Error(`Missing required env var: ${key}`)
}
if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET === 'changeme') {
  throw new Error('JWT_SECRET must be changed from the default in production')
}

const app = express()

app.use(helmet())
app.use(cors({
  origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:8080',
  credentials: true,
}))
app.use(cookieParser())
app.use(express.json({ limit: '100kb' }))

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/auth', authLimiter, authRouter)
app.use('/campaigns', campaignsRouter)
app.use('/recipients', recipientsRouter)

app.use(errorHandler)

export default app
