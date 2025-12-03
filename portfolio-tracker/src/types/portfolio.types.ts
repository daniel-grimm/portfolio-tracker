/**
 * Portfolio and position type definitions.
 *
 * These types represent the core data model for tracking stock positions,
 * calculating portfolio analytics, and displaying performance metrics.
 */

import type { StockData } from "./stock.types";

// Stock type alias (matches backend nomenclature)
export type Stock = StockData;

/**
 * Individual position (purchase).
 *
 * Represents a single purchase of a stock at a specific price and date.
 * Multiple positions can exist for the same ticker.
 */
export interface Position {
  /** Unique identifier (UUID) for this position */
  id: string;

  /** Stock ticker symbol (e.g., "AAPL", "MSFT") */
  ticker: string;

  /** Number of shares in this position (supports fractional shares) */
  quantity: number;

  /** Purchase price per share for this position in USD */
  costBasis: number;

  /** Optional purchase date in ISO 8601 format (YYYY-MM-DD) */
  purchaseDate?: string;

  /** Optional account ID (UUID) for associating position with a brokerage account */
  accountId?: string | null;
}

/**
 * Position with stock data attached.
 *
 * Used for API responses that include both position and stock information.
 */
export interface PositionWithStock extends Position {
  /** Stock market data */
  stock: Stock;
}

/**
 * Aggregated position (positions rolled up by ticker).
 *
 * Combines multiple purchases of the same ticker into a single view
 * with calculated totals and weighted averages.
 */
export interface AggregatedPosition {
  /** Stock ticker symbol */
  ticker: string;

  /** Stock market data */
  stock: Stock;

  /** Total quantity across all positions */
  totalQuantity: number;

  /** Weighted average cost basis across all positions */
  weightedAverageCostBasis: number;

  /** Individual positions for this ticker */
  positions: Position[];

  /** Oldest purchase date (if any) */
  oldestPurchaseDate?: string;

  /** Newest purchase date (if any) */
  newestPurchaseDate?: string;
}

/**
 * Portfolio container holding all aggregated positions.
 *
 * Simple collection of aggregated positions for portfolio-wide calculations.
 */
export interface Portfolio {
  /** Array of all aggregated positions in the portfolio */
  positions: AggregatedPosition[];
}

/**
 * Enriched aggregated position with calculated performance metrics.
 *
 * Used for display and analytics in the UI. Includes real-time calculations
 * for gains/losses, dividend yields, and current values based on market data.
 */
export interface PositionMetadata extends AggregatedPosition {
  /** Current market value (totalQuantity × currentPrice) */
  currentValue: number;

  /** Total purchase cost (totalQuantity × weightedAverageCostBasis) */
  totalCost: number;

  /** Dollar gain/loss (currentValue - totalCost) */
  gainLoss: number;

  /** Percentage gain/loss ((currentValue - totalCost) / totalCost × 100) */
  gainLossPercent: number;

  /** Current dividend yield percentage (annualDividend / currentPrice × 100) */
  dividendYield: number;

  /** Yield on cost (annualDividend / weightedAverageCostBasis × 100) */
  yieldOnCost: number;

  /** Annual dividend income from this position (totalQuantity × annualDividend) */
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
