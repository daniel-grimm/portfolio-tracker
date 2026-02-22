// Pure calculation functions — no DB, no async, no Express imports.
import type { Dividend, Holding, HoldingWithPrice } from 'shared'

export function calculateTotalDividend(amountPerShare: number, shares: number): number {
  return amountPerShare * shares
}

export function calculateYTDIncome(dividends: Dividend[]): number {
  const currentYear = new Date().getFullYear()
  return dividends
    .filter(
      (d) =>
        d.status === 'paid' && new Date(d.payDate).getFullYear() === currentYear,
    )
    .reduce((sum, d) => sum + parseFloat(d.totalAmount), 0)
}

export function calculateAllTimeIncome(dividends: Dividend[]): number {
  return dividends
    .filter((d) => d.status === 'paid')
    .reduce((sum, d) => sum + parseFloat(d.totalAmount), 0)
}

export function calculateAnnualizedIncome(dividends: Dividend[]): number {
  const now = new Date()
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
  return dividends
    .filter((d) => d.status === 'paid' && new Date(d.payDate) >= oneYearAgo)
    .reduce((sum, d) => sum + parseFloat(d.totalAmount), 0)
}

export function calculateUnrealizedGainLoss(
  shares: number,
  avgCostBasis: number,
  currentPrice: number,
): number {
  return (currentPrice - avgCostBasis) * shares
}

export function calculateReturnPercent(
  shares: number,
  avgCostBasis: number,
  currentPrice: number,
): number {
  if (shares === 0 || avgCostBasis === 0) return 0
  return ((currentPrice - avgCostBasis) / avgCostBasis) * 100
}

export function calculatePortfolioValue(holdings: HoldingWithPrice[]): number {
  return holdings.reduce((sum, h) => {
    if (h.currentPrice === null) return sum
    return sum + parseFloat(h.shares) * parseFloat(h.currentPrice)
  }, 0)
}

export function calculatePortfolioCostBasis(holdings: Holding[]): number {
  return holdings.reduce(
    (sum, h) => sum + parseFloat(h.shares) * parseFloat(h.avgCostBasis),
    0,
  )
}
