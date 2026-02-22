// Shared types imported by both client and server.
// Inferred Drizzle types are re-exported here so the client never imports from drizzle-orm directly.

// ── Domain types (mirrors Drizzle inferred types) ────────────────────────────

export type Portfolio = {
  id: string
  userId: string
  name: string
  description: string | null
  createdAt: Date
  updatedAt: Date
}

export type Account = {
  id: string
  portfolioId: string
  name: string
  description: string | null
  createdAt: Date
  updatedAt: Date
}

export type DividendStatus = 'scheduled' | 'projected' | 'paid'

export type Holding = {
  id: string
  accountId: string
  ticker: string
  shares: string
  avgCostBasis: string
  purchaseDate: string
  createdAt: Date
  updatedAt: Date
}

export type Dividend = {
  id: string
  holdingId: string
  ticker: string
  amountPerShare: string
  totalAmount: string
  exDate: string
  payDate: string
  recordDate: string | null
  status: DividendStatus
  createdAt: Date
  updatedAt: Date
}

export type PriceHistory = {
  ticker: string
  date: string
  closePrice: string
  fetchedAt: Date
}

export type PortfolioValueHistory = {
  id: string
  portfolioId: string
  date: string
  totalValue: string
  costBasis: string
  isPartial: boolean
  createdAt: Date
}

// ── Composite / computed types ────────────────────────────────────────────────

export type HoldingWithPrice = Holding & {
  currentPrice: string | null
  priceDate: string | null
}

export type PortfolioValuePoint = {
  date: string
  totalValue: number
  costBasis: number
  isPartial: boolean
}

export type MonthlyProjection = {
  year: number
  month: number
  projectedIncome: number
}

export type CalendarDay = {
  date: string
  dividends: Dividend[]
}

export type PriceQuote = {
  ticker: string
  closePrice: number
  fetchedAt: Date
}
