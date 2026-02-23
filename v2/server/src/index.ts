import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { toNodeHandler } from 'better-auth/node'
import { env } from './env.js'
import { startup } from './startup.js'
import { auth } from './lib/auth.js'
import portfoliosRouter from './routes/portfolios.js'
import accountsRouter from './routes/accounts.js'
import holdingsRouter from './routes/holdings.js'
import dividendsRouter from './routes/dividends.js'
import pricesRouter from './routes/prices.js'
import dashboardRouter from './routes/dashboard.js'

const app = express()

app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  }),
)

// Better Auth handles its own body parsing — mount before express.json()
app.all('/api/auth/*', toNodeHandler(auth))

app.use(express.json())

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
})
app.use('/api/', apiLimiter)

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api/v1/portfolios', portfoliosRouter)
app.use('/api/v1', accountsRouter)
app.use('/api/v1', holdingsRouter)
app.use('/api/v1', dividendsRouter)
app.use('/api/v1', pricesRouter)
app.use('/api/v1', dashboardRouter)

async function main() {
  await startup()
  app.listen(env.PORT, () => {
    console.log(`Server listening on port ${env.PORT}`)
  })
}

main().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})

export { app }
