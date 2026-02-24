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
  accountId: string
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

// ── Input types ───────────────────────────────────────────────────────────────

export type CreatePortfolioInput = {
  name: string
  description?: string | null
}

export type UpdatePortfolioInput = {
  name?: string
  description?: string | null
}

export type CreateAccountInput = {
  name: string
  description?: string | null
}

export type UpdateAccountInput = {
  name?: string
  description?: string | null
}

export type CreateHoldingInput = {
  ticker: string
  shares: string
  avgCostBasis: string
  purchaseDate: string
}

export type UpdateHoldingInput = {
  ticker?: string
  shares?: string
  avgCostBasis?: string
  purchaseDate?: string
}

export type AggregatedHolding = {
  ticker: string
  totalShares: string
  weightedAvgCostBasis: string
  holdings: Holding[]
}

export type CreateDividendInput = {
  ticker: string
  amountPerShare: string
  exDate: string
  payDate: string
  recordDate?: string | null
  status?: DividendStatus
}

export type UpdateDividendInput = {
  amountPerShare?: string
  exDate?: string
  payDate?: string
  recordDate?: string | null
  status?: DividendStatus
}

export type ValueHistoryRange = '1m' | '3m' | '6m' | '1y' | 'all'

export type ImportHoldingsResult = {
  imported: number
  skipped: number
}

export type Theme = 'light' | 'dark'

export type UserPreferences = {
  theme: Theme
}

export type PortfolioBreakdown = {
  id: string
  name: string
  totalValue: number
  costBasis: number
  gainLoss: number
}

export type DashboardSummary = {
  ytdIncome: number
  allTimeIncome: number
  projectedAnnual: number
  portfolioBreakdown: PortfolioBreakdown[]
}
