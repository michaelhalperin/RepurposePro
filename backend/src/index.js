import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { router as generateRouter } from './routes/generate.js'
import { router as usageRouter } from './routes/usage.js'
import { router as paddleRouter } from './routes/paddle.js'
import { router as historyRouter } from './routes/history.js'
import { router as accountRouter } from './routes/account.js'
import { router as savedRouter } from './routes/saved.js'

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  credentials: true
}))

// Raw body for Paddle webhook signature verification (must be before express.json)
app.use('/paddle/webhook', express.raw({ type: '*/*' }))

app.use(express.json())

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'repurposepro-api' }))

app.use('/generate', generateRouter)
app.use('/usage', usageRouter)
app.use('/paddle', paddleRouter)
app.use('/history', historyRouter)
app.use('/account', accountRouter)
app.use('/saved', savedRouter)

app.listen(PORT, () => {
  console.log(`RepurposePro API running on http://localhost:${PORT}`)
})
