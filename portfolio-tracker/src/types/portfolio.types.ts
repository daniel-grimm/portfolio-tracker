/**
 * Portfolio and holding type definitions.
 *
 * These types represent the core data model for tracking stock positions,
 * calculating portfolio analytics, and displaying performance metrics.
 */

import type { StockData } from "./stock.types";

/**
 * A single stock holding in the user's portfolio.
 *
 * Represents both the position details (quantity, cost basis) and a snapshot
 * of the stock's market data at the time of last update. This is the core data
 * model stored in the SQLite database.
 */
export interface Holding {
  /** Unique identifier (UUID) for this holding */
  id: string;

  /** Stock ticker symbol (e.g., "AAPL", "MSFT") */
  ticker: string;

  /** Number of shares owned (supports fractional shares) */
  quantity: number;

  /** Average purchase price per share in USD */
  costBasis: number;

  /** Optional purchase date in ISO 8601 format (YYYY-MM-DD) */
  purchaseDate?: string;

  /** Snapshot of stock market data stored with this holding */
  stockDataSnapshot: StockData;
}

/**
 * Portfolio container holding all user positions.
 *
 * Simple collection of holdings that can be used to calculate
 * aggregate portfolio metrics and analytics.
 */
export interface Portfolio {
  /** Array of all stock holdings in the portfolio */
  holdings: Holding[];
}

/**
 * Extended holding information with calculated performance metrics.
 *
 * Used for display and analytics in the UI. Includes real-time calculations
 * for gains/losses, dividend yields, and current values based on live market data.
 */
export interface HoldingMetadata extends Holding {
  /** Current stock data (may be updated from Finnhub, potentially newer than snapshot) */
  stockData: StockData;

  /** Current market value (quantity × currentPrice) */
  currentValue: number;

  /** Total purchase cost (quantity × costBasis) */
  totalCost: number;

  /** Dollar gain/loss (currentValue - totalCost) */
  gainLoss: number;

  /** Percentage gain/loss ((currentValue - totalCost) / totalCost × 100) */
  gainLossPercent: number;

  /** Current dividend yield percentage (annualDividend / currentPrice × 100) */
  dividendYield: number;

  /** Yield on cost (annualDividend / costBasis × 100) */
  yieldOnCost: number;

  /** Annual dividend income from this holding (quantity × annualDividend) */
  annualIncome: number;
}

/**
 * Aggregate portfolio performance metrics.
 *
 * Calculated across all holdings to provide an overall view of
 * portfolio value, performance, and income generation.
 */
export interface PortfolioMetrics {
  /** Total current market value of all holdings */
  totalValue: number;

  /** Total cost basis of all holdings */
  totalCost: number;

  /** Total dollar gain/loss across all holdings */
  totalGainLoss: number;

  /** Total percentage gain/loss across all holdings */
  totalGainLossPercent: number;

  /** Total annual dividend income from all holdings */
  totalAnnualIncome: number;

  /** Weighted average dividend yield across all holdings */
  averageDividendYield: number;

  /** Weighted average yield on cost across all holdings */
  averageYieldOnCost: number;
}

/**
 * Portfolio allocation across the 3x3 style box grid.
 *
 * Breaks down portfolio by market cap (large/mid/small) and
 * investment style (value/blend/growth). Values represent the
 * percentage of portfolio value in each category.
 */
export interface StyleBoxAllocation {
  /** Large-cap value stocks percentage */
  largeValue: number;

  /** Large-cap blend stocks percentage */
  largeBlend: number;

  /** Large-cap growth stocks percentage */
  largeGrowth: number;

  /** Mid-cap value stocks percentage */
  midValue: number;

  /** Mid-cap blend stocks percentage */
  midBlend: number;

  /** Mid-cap growth stocks percentage */
  midGrowth: number;

  /** Small-cap value stocks percentage */
  smallValue: number;

  /** Small-cap blend stocks percentage */
  smallBlend: number;

  /** Small-cap growth stocks percentage */
  smallGrowth: number;
}

/**
 * Portfolio allocation by industry sector.
 *
 * Maps sector names to their percentage of total portfolio value.
 * Sectors follow the Global Industry Classification Standard (GICS).
 */
export interface SectorAllocation {
  /** Percentage of portfolio value in each sector */
  [sector: string]: number;
}

/**
 * Portfolio allocation by country.
 *
 * Maps country names to their percentage of total portfolio value.
 * Useful for understanding geographic diversification.
 */
export interface GeographicAllocation {
  /** Percentage of portfolio value in each country */
  [country: string]: number;
}

/**
 * Portfolio allocation between domestic and international holdings.
 *
 * Simple breakdown showing what percentage of the portfolio is in
 * US domestic companies vs. international companies.
 */
export interface DomesticIntlAllocation {
  /** Percentage of portfolio in US domestic companies */
  domestic: number;

  /** Percentage of portfolio in international companies */
  international: number;
}
