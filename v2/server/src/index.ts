import express from 'express'
import cors from 'cors'
import { toNodeHandler } from 'better-auth/node'
import { env } from './env.js'
import { startup } from './startup.js'
import { auth } from './lib/auth.js'

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

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

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
