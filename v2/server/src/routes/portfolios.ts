import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { NotFoundError } from '../lib/errors.js'
import {
  getUserPortfolios,
  getPortfolioById,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
} from '../services/portfolios.js'
import { getPortfolioValueHistory } from '../services/portfolioValue.js'
import { db } from '../db/index.js'
import type { ValueHistoryRange } from 'shared'

const VALID_RANGES = new Set<ValueHistoryRange>(['1m', '3m', '6m', '1y', 'all'])

const router = Router()

const CreatePortfolioSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
})

const UpdatePortfolioSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
})

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const portfolios = await getUserPortfolios(db, userId)
    res.json({ data: portfolios })
  }),
)

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = CreatePortfolioSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body' })
      return
    }
    const userId = req.user!.id
    const portfolio = await createPortfolio(db, userId, parsed.data)
    res.status(201).json({ data: portfolio })
  }),
)

router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const portfolio = await getPortfolioById(db, req.params['id'] as string, userId)
    res.json({ data: portfolio })
  }),
)

router.put(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = UpdatePortfolioSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body' })
      return
    }
    const userId = req.user!.id
    const portfolio = await updatePortfolio(db, req.params['id'] as string, userId, parsed.data)
    res.json({ data: portfolio })
  }),
)

router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    await deletePortfolio(db, req.params['id'] as string, userId)
    res.json({ data: null })
  }),
)

router.get(
  '/:id/value-history',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const rawRange = req.query['range'] as string | undefined
    const range: ValueHistoryRange =
      rawRange && VALID_RANGES.has(rawRange as ValueHistoryRange)
        ? (rawRange as ValueHistoryRange)
        : 'all'

    const history = await getPortfolioValueHistory(db, req.params['id'] as string, userId, range)
    res.json({ data: history })
  }),
)

// Error handler for this router — maps NotFoundError → 404
router.use(
  (
    err: unknown,
    _req: import('express').Request,
    res: import('express').Response,
    next: import('express').NextFunction,
  ) => {
    if (err instanceof NotFoundError) {
      res.status(404).json({ error: err.message })
      return
    }
    next(err)
  },
)

export default router
