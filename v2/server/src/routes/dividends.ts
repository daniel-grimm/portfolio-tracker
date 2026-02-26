import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { NotFoundError } from '../lib/errors.js'
import {
  createDividend,
  getDividendsForAccount,
  getAllDividendsForUser,
  updateDividend,
  deleteDividend,
} from '../services/dividends.js'
import { db } from '../db/index.js'

const router = Router()

const CreateDividendSchema = z.object({
  ticker: z.string().min(1),
  amountPerShare: z.string().min(1),
  totalAmount: z.string().min(1),
  payDate: z.string().min(1),
  projectedPerShare: z.string().nullable().optional(),
  projectedPayout: z.string().nullable().optional(),
  status: z.enum(['scheduled', 'projected', 'paid']).optional(),
})

const UpdateDividendSchema = z.object({
  amountPerShare: z.string().optional(),
  totalAmount: z.string().optional(),
  payDate: z.string().optional(),
  projectedPerShare: z.string().nullable().optional(),
  projectedPayout: z.string().nullable().optional(),
  status: z.enum(['scheduled', 'projected', 'paid']).optional(),
})

router.post(
  '/accounts/:accountId/dividends',
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = CreateDividendSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body' })
      return
    }
    const userId = req.user!.id
    const dividend = await createDividend(
      db,
      req.params['accountId'] as string,
      userId,
      parsed.data,
    )
    res.status(201).json({ data: dividend })
  }),
)

router.get(
  '/accounts/:accountId/dividends',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const result = await getDividendsForAccount(db, req.params['accountId'] as string, userId)
    res.json({ data: result })
  }),
)

router.get(
  '/dividends',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const result = await getAllDividendsForUser(db, userId)
    res.json({ data: result })
  }),
)

router.put(
  '/dividends/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = UpdateDividendSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body' })
      return
    }
    const userId = req.user!.id
    const dividend = await updateDividend(db, req.params['id'] as string, userId, parsed.data)
    res.json({ data: dividend })
  }),
)

router.delete(
  '/dividends/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    await deleteDividend(db, req.params['id'] as string, userId)
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
    if (err instanceof NotFoundError) {
      res.status(404).json({ error: err.message })
      return
    }
    next(err)
  },
)

export default router
