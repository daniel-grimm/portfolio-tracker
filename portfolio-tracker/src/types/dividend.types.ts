/**
 * Type definitions for dividend-related data structures.
 */

/**
 * Individual dividend record.
 */
export interface Dividend {
  id: string;
  date: string;
  amount: number;
  ticker: string;
  isReinvested: boolean;
  createdAt?: number;
}

/**
 * Aggregated dividend data by quarter.
 */
export interface QuarterlyDividend {
  quarter: string;
  year: number;
  quarterNum: number;
  dividends: {
    [ticker: string]: number;
  };
  total: number;
}

/**
 * Aggregated dividend data by year.
 */
export interface YearlyDividend {
  year: number;
  dividends: {
    [ticker: string]: number;
  };
  total: number;
}

/**
 * Growth comparison between two periods.
 */
export interface DividendGrowth {
  currentAmount: number;
  previousAmount: number;
  growthAmount: number;
  growthPercent: number;
}

/**
 * Complete dividend metrics including growth calculations.
 */
export interface DividendMetrics {
  quarterlyGrowth: DividendGrowth;
  yearlyGrowth: DividendGrowth;
  cagr: number;
}
