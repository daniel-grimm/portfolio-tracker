/**
 * Dividends service for managing dividend CRUD operations and aggregation.
 *
 * This service provides the business logic layer for interacting with the dividends
 * database table. It handles:
 * - Dividend CRUD operations
 * - Aggregation of dividends by quarter and year
 * - Growth calculations (Q/Q, Y/Y, CAGR)
 * - Data transformation between database format (snake_case) and API format (camelCase)
 */

import { db } from '../database/db.js';
import { randomUUID } from 'crypto';

/**
 * Individual dividend record.
 * This is the API/application format using camelCase naming.
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
 * Database row structure for the dividends table.
 *
 * Represents the raw SQLite row format with snake_case columns.
 *
 * @internal
 */
interface DividendRow {
  id: string;
  date: string;
  amount: number;
  ticker: string;
  is_reinvested: number;
  created_at: number;
}

/**
 * Converts a database row to a Dividend object.
 *
 * @param row - Raw database row from dividends table
 * @returns Dividend object with typed properties
 */
function rowToDividend(row: DividendRow): Dividend {
  return {
    id: row.id,
    date: row.date,
    amount: row.amount,
    ticker: row.ticker,
    isReinvested: row.is_reinvested === 1,
    createdAt: row.created_at,
  };
}

/**
 * Gets quarter information from a date string.
 *
 * @param dateStr - ISO 8601 date string (YYYY-MM-DD)
 * @returns Object with year and quarter (1-4)
 */
function getQuarterFromDate(dateStr: string): { year: number; quarter: number } {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1; // 1-12
  const quarter = Math.ceil(month / 3); // 1-4
  return { year: date.getFullYear(), quarter };
}

/**
 * Formats quarter label for display.
 *
 * @param year - Year number
 * @param quarter - Quarter number (1-4)
 * @returns Formatted string like "Q4 2024"
 */
function formatQuarterLabel(year: number, quarter: number): string {
  return `Q${quarter} ${year}`;
}

/**
 * Dividends service with CRUD and aggregation methods.
 */
export const dividendsService = {
  /**
   * Get all dividends sorted by date descending (most recent first).
   *
   * @returns Array of all dividend records
   */
  getAll(): Dividend[] {
    const stmt = db.prepare(`
      SELECT id, date, amount, ticker, is_reinvested, created_at
      FROM dividends
      ORDER BY date DESC, created_at DESC
    `);

    const rows = stmt.all() as DividendRow[];
    return rows.map(rowToDividend);
  },

  /**
   * Get a single dividend by ID.
   *
   * @param id - Dividend UUID
   * @returns Dividend object or undefined if not found
   */
  getById(id: string): Dividend | undefined {
    const stmt = db.prepare(`
      SELECT id, date, amount, ticker, is_reinvested, created_at
      FROM dividends
      WHERE id = ?
    `);

    const row = stmt.get(id) as DividendRow | undefined;
    return row ? rowToDividend(row) : undefined;
  },

  /**
   * Get all dividends for a specific ticker.
   *
   * @param ticker - Stock ticker symbol
   * @returns Array of dividends for the ticker
   */
  getByTicker(ticker: string): Dividend[] {
    const stmt = db.prepare(`
      SELECT id, date, amount, ticker, is_reinvested, created_at
      FROM dividends
      WHERE ticker = ?
      ORDER BY date DESC, created_at DESC
    `);

    const rows = stmt.all(ticker.toUpperCase()) as DividendRow[];
    return rows.map(rowToDividend);
  },

  /**
   * Create a new dividend record.
   *
   * @param dividend - Dividend data without ID
   * @returns Created dividend with generated ID
   */
  create(dividend: Omit<Dividend, 'id'>): Dividend {
    const id = randomUUID();
    const stmt = db.prepare(`
      INSERT INTO dividends (id, date, amount, ticker, is_reinvested)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      dividend.date,
      dividend.amount,
      dividend.ticker.toUpperCase(),
      dividend.isReinvested ? 1 : 0
    );

    return {
      id,
      ...dividend,
      ticker: dividend.ticker.toUpperCase(),
    };
  },

  /**
   * Update an existing dividend record.
   *
   * @param id - Dividend UUID
   * @param dividend - Partial dividend data to update
   * @returns Updated dividend or undefined if not found
   */
  update(id: string, dividend: Partial<Omit<Dividend, 'id'>>): Dividend | undefined {
    const existing = this.getById(id);
    if (!existing) {
      return undefined;
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (dividend.date !== undefined) {
      updates.push('date = ?');
      values.push(dividend.date);
    }
    if (dividend.amount !== undefined) {
      updates.push('amount = ?');
      values.push(dividend.amount);
    }
    if (dividend.ticker !== undefined) {
      updates.push('ticker = ?');
      values.push(dividend.ticker.toUpperCase());
    }
    if (dividend.isReinvested !== undefined) {
      updates.push('is_reinvested = ?');
      values.push(dividend.isReinvested ? 1 : 0);
    }

    if (updates.length === 0) {
      return existing;
    }

    values.push(id);
    const stmt = db.prepare(`
      UPDATE dividends
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);
    return this.getById(id);
  },

  /**
   * Delete a dividend record.
   *
   * @param id - Dividend UUID
   * @returns True if deleted, false if not found
   */
  delete(id: string): boolean {
    const stmt = db.prepare('DELETE FROM dividends WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Get dividends aggregated by quarter.
   *
   * @param count - Number of quarters to return (default: 8)
   * @returns Array of quarterly dividend data
   */
  getQuarterlyAggregated(count: number = 8): QuarterlyDividend[] {
    const allDividends = this.getAll();

    // Group by quarter
    const quarterMap = new Map<string, QuarterlyDividend>();

    for (const dividend of allDividends) {
      const { year, quarter } = getQuarterFromDate(dividend.date);
      const key = `${year}-Q${quarter}`;

      if (!quarterMap.has(key)) {
        quarterMap.set(key, {
          quarter: formatQuarterLabel(year, quarter),
          year,
          quarterNum: quarter,
          dividends: {},
          total: 0,
        });
      }

      const quarterData = quarterMap.get(key)!;
      quarterData.dividends[dividend.ticker] =
        (quarterData.dividends[dividend.ticker] || 0) + dividend.amount;
      quarterData.total += dividend.amount;
    }

    // Convert to array and sort by year/quarter descending
    const quarters = Array.from(quarterMap.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.quarterNum - a.quarterNum;
    });

    // Take only the requested count and reverse for chronological order
    return quarters.slice(0, count).reverse();
  },

  /**
   * Get dividends aggregated by year.
   *
   * @param count - Number of years to return (default: 5)
   * @returns Array of yearly dividend data
   */
  getYearlyAggregated(count: number = 5): YearlyDividend[] {
    const allDividends = this.getAll();

    // Group by year
    const yearMap = new Map<number, YearlyDividend>();

    for (const dividend of allDividends) {
      const year = new Date(dividend.date).getFullYear();

      if (!yearMap.has(year)) {
        yearMap.set(year, {
          year,
          dividends: {},
          total: 0,
        });
      }

      const yearData = yearMap.get(year)!;
      yearData.dividends[dividend.ticker] =
        (yearData.dividends[dividend.ticker] || 0) + dividend.amount;
      yearData.total += dividend.amount;
    }

    // Convert to array and sort by year descending
    const years = Array.from(yearMap.values()).sort((a, b) => b.year - a.year);

    // Take only the requested count and reverse for chronological order
    return years.slice(0, count).reverse();
  },

  /**
   * Get quarter total for a specific year and quarter.
   *
   * @param year - Year number
   * @param quarter - Quarter number (1-4)
   * @returns Total dividend amount for the quarter
   */
  getQuarterTotal(year: number, quarter: number): number {
    const allDividends = this.getAll();
    let total = 0;

    for (const dividend of allDividends) {
      const { year: divYear, quarter: divQuarter } = getQuarterFromDate(dividend.date);
      if (divYear === year && divQuarter === quarter) {
        total += dividend.amount;
      }
    }

    return total;
  },

  /**
   * Get year total for a specific year.
   *
   * @param year - Year number
   * @returns Total dividend amount for the year
   */
  getYearTotal(year: number): number {
    const allDividends = this.getAll();
    let total = 0;

    for (const dividend of allDividends) {
      const divYear = new Date(dividend.date).getFullYear();
      if (divYear === year) {
        total += dividend.amount;
      }
    }

    return total;
  },

  /**
   * Get quarter-over-quarter growth (current quarter vs same quarter last year).
   *
   * @param currentYear - Current year
   * @param currentQuarter - Current quarter (1-4)
   * @returns Growth comparison object
   */
  getQuarterOverQuarterGrowth(currentYear: number, currentQuarter: number): DividendGrowth {
    const currentAmount = this.getQuarterTotal(currentYear, currentQuarter);
    const previousAmount = this.getQuarterTotal(currentYear - 1, currentQuarter);

    const growthAmount = currentAmount - previousAmount;
    const growthPercent = previousAmount === 0 ? 0 : (growthAmount / previousAmount) * 100;

    return {
      currentAmount,
      previousAmount,
      growthAmount,
      growthPercent,
    };
  },

  /**
   * Get year-over-year growth.
   *
   * @param currentYear - Current year
   * @returns Growth comparison object
   */
  getYearOverYearGrowth(currentYear: number): DividendGrowth {
    const currentAmount = this.getYearTotal(currentYear);
    const previousAmount = this.getYearTotal(currentYear - 1);

    const growthAmount = currentAmount - previousAmount;
    const growthPercent = previousAmount === 0 ? 0 : (growthAmount / previousAmount) * 100;

    return {
      currentAmount,
      previousAmount,
      growthAmount,
      growthPercent,
    };
  },

  /**
   * Calculate Compound Annual Growth Rate (CAGR) for dividends.
   *
   * @returns CAGR percentage
   */
  getCAGR(): number {
    const yearlyTotals = this.getYearlyAggregated(100); // Get all years

    if (yearlyTotals.length < 2) {
      return 0;
    }

    // Filter out years with zero dividends
    const nonZeroYears = yearlyTotals.filter((y) => y.total > 0);

    if (nonZeroYears.length < 2) {
      return 0;
    }

    const firstYear = nonZeroYears[0];
    const lastYear = nonZeroYears[nonZeroYears.length - 1];
    const years = lastYear.year - firstYear.year;

    if (years === 0 || firstYear.total === 0) {
      return 0;
    }

    // CAGR = (Ending Value / Beginning Value)^(1/years) - 1
    const cagr = (Math.pow(lastYear.total / firstYear.total, 1 / years) - 1) * 100;
    return cagr;
  },
};
