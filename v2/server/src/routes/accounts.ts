import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { NotFoundError } from '../lib/errors.js'
import {
  getAccountsForPortfolio,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
} from '../services/accounts.js'
import { db } from '../db/index.js'

const router = Router()

const CreateAccountSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
})

const UpdateAccountSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
})

router.get(
  '/portfolios/:portfolioId/accounts',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const result = await getAccountsForPortfolio(db, req.params['portfolioId'] as string, userId)
    res.json({ data: result })
  }),
)

router.post(
  '/portfolios/:portfolioId/accounts',
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = CreateAccountSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body' })
      return
    }
    const userId = req.user!.id
    const account = await createAccount(
      db,
      req.params['portfolioId'] as string,
      userId,
      parsed.data,
    )
    res.status(201).json({ data: account })
  }),
)

router.get(
  '/accounts/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const account = await getAccountById(db, req.params['id'] as string, userId)
    res.json({ data: account })
  }),
)

router.put(
  '/accounts/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = UpdateAccountSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body' })
      return
    }
    const userId = req.user!.id
    const account = await updateAccount(db, req.params['id'] as string, userId, parsed.data)
    res.json({ data: account })
  }),
)

router.delete(
  '/accounts/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    await deleteAccount(db, req.params['id'] as string, userId)
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
