import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { NotFoundError } from '../lib/errors.js'
import { getLatestPriceForTicker } from '../services/prices.js'
import { db } from '../db/index.js'

const router = Router()

router.get(
  '/prices/:ticker',
  requireAuth,
  asyncHandler(async (req, res) => {
    const ticker = (req.params['ticker'] as string).toUpperCase()
    const price = await getLatestPriceForTicker(db, ticker)
    if (!price) {
      res.status(404).json({ error: `No price data for ${ticker}` })
      return
    }
    res.json({ data: price })
  }),
)

export default router
