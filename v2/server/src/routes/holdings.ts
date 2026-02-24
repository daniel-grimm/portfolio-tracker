import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { NotFoundError, ForbiddenError } from '../lib/errors.js'
import {
  getHoldingsForAccount,
  getHoldingById,
  getAllHoldingsForUser,
  createHolding,
  updateHolding,
  deleteHolding,
  importHoldings,
} from '../services/holdings.js'
import { db } from '../db/index.js'

const router = Router()

const CSV_TEMPLATE = `Ticker,Shares,AvgCostBasis,PurchaseDate\nAAPL,10,150.00,01/14/2026\n`

const ImportHoldingsSchema = z.object({
  holdings: z.array(
    z.object({
      ticker: z.string().min(1),
      shares: z.string().min(1),
      avgCostBasis: z.string(),
      purchaseDate: z.string().min(1),
    }),
  ),
})

const CreateHoldingSchema = z.object({
  ticker: z.string().min(1),
  shares: z.string().min(1),
  avgCostBasis: z.string().min(1),
  purchaseDate: z.string().min(1),
})

const UpdateHoldingSchema = z.object({
  ticker: z.string().min(1).optional(),
  shares: z.string().optional(),
  avgCostBasis: z.string().optional(),
  purchaseDate: z.string().optional(),
})

router.get('/holdings/import/template', (_req, res) => {
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'attachment; filename="vibefolio-holdings-template.csv"')
  res.send(CSV_TEMPLATE)
})

router.post(
  '/accounts/:accountId/holdings/import',
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = ImportHoldingsSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body' })
      return
    }
    const userId = req.user!.id
    const result = await importHoldings(
      db,
      req.params['accountId'] as string,
      userId,
      parsed.data.holdings,
    )
    res.json({ data: result })
  }),
)

router.get(
  '/accounts/:accountId/holdings',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const result = await getHoldingsForAccount(db, req.params['accountId'] as string, userId)
    res.json({ data: result })
  }),
)

router.post(
  '/accounts/:accountId/holdings',
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = CreateHoldingSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body' })
      return
    }
    const userId = req.user!.id
    const holding = await createHolding(db, req.params['accountId'] as string, userId, parsed.data)
    res.status(201).json({ data: holding })
  }),
)

router.get(
  '/holdings',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const result = await getAllHoldingsForUser(db, userId)
    res.json({ data: result })
  }),
)

router.get(
  '/holdings/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const holding = await getHoldingById(db, req.params['id'] as string, userId)
    res.json({ data: holding })
  }),
)

router.put(
  '/holdings/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = UpdateHoldingSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body' })
      return
    }
    const userId = req.user!.id
    const holding = await updateHolding(db, req.params['id'] as string, userId, parsed.data)
    res.json({ data: holding })
  }),
)

router.delete(
  '/holdings/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    await deleteHolding(db, req.params['id'] as string, userId)
    res.json({ data: null })
  }),
)

router.use(
  (
    err: unknown,
    _req: import('express').Request,
    res: import('express').Response,
    next: import('express').NextFunction,
  ) => {
    if (err instanceof ForbiddenError) {
      res.status(403).json({ error: err.message })
      return
    }
    if (err instanceof NotFoundError) {
      res.status(404).json({ error: err.message })
      return
    }
    next(err)
  },
)

export default router
