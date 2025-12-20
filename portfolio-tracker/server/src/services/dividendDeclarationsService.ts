import { db } from "../database/db.js";
import { v4 as uuidv4 } from "uuid";
import type { DividendFrequency } from "./stockService.js";

/**
 * Dividend declaration record.
 * Tracks per-share dividend announcements for calculating TTM yields.
 */
export interface DividendDeclaration {
  id: string;
  ticker: string;
  perShareAmount: number;
  declarationDate: string;
  paymentDate: string;
}

/**
 * Database row structure for the dividend_declarations table.
 */
interface DividendDeclarationRow {
  id: string;
  ticker: string;
  per_share_amount: number;
  declaration_date: string;
  payment_date: string;
  created_at: number;
}

/**
 * Converts a database row to a DividendDeclaration object.
 */
function rowToDeclaration(row: DividendDeclarationRow): DividendDeclaration {
  return {
    id: row.id,
    ticker: row.ticker,
    perShareAmount: row.per_share_amount,
    declarationDate: row.declaration_date,
    paymentDate: row.payment_date,
  };
}

export const dividendDeclarationsService = {
  /**
   * Creates a new dividend declaration.
   *
   * @param declaration - Dividend declaration data (without id)
   * @returns The created dividend declaration
   */
  create(declaration: Omit<DividendDeclaration, "id">): DividendDeclaration {
    const id = uuidv4();

    const stmt = db.prepare(`
      INSERT INTO dividend_declarations (
        id, ticker, per_share_amount, declaration_date, payment_date
      )
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      declaration.ticker.toUpperCase(),
      declaration.perShareAmount,
      declaration.declarationDate,
      declaration.paymentDate
    );

    return {
      id,
      ...declaration,
      ticker: declaration.ticker.toUpperCase(),
    };
  },

  /**
   * Gets all dividend declarations for a specific ticker.
   * Sorted by payment date descending (most recent first).
   *
   * @param ticker - Stock ticker symbol
   * @returns Array of dividend declarations
   */
  getByTicker(ticker: string): DividendDeclaration[] {
    const stmt = db.prepare(`
      SELECT * FROM dividend_declarations
      WHERE ticker = ?
      ORDER BY payment_date DESC
    `);

    const rows = stmt.all(ticker.toUpperCase()) as DividendDeclarationRow[];
    return rows.map(rowToDeclaration);
  },

  /**
   * Gets all dividend declarations.
   * Sorted by payment date descending.
   *
   * @returns Array of all dividend declarations
   */
  getAll(): DividendDeclaration[] {
    const stmt = db.prepare(`
      SELECT * FROM dividend_declarations
      ORDER BY payment_date DESC
    `);

    const rows = stmt.all() as DividendDeclarationRow[];
    return rows.map(rowToDeclaration);
  },

  /**
   * Deletes a dividend declaration.
   *
   * @param id - Declaration ID to delete
   * @returns true if deleted, false if not found
   */
  delete(id: string): boolean {
    const stmt = db.prepare("DELETE FROM dividend_declarations WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Calculates TTM (trailing twelve months) dividend per share from declarations.
   *
   * @param ticker - Stock ticker symbol
   * @param dividendFrequency - Expected dividend frequency
   * @returns TTM dividend per share, or null if insufficient payment history
   */
  getTTMDividend(ticker: string, dividendFrequency: DividendFrequency): number | null {
    const declarations = this.getByTicker(ticker);

    if (declarations.length === 0) {
      return null;
    }

    // Determine number of payments needed based on frequency
    let paymentsNeeded: number;
    switch (dividendFrequency) {
      case "annual":
        paymentsNeeded = 1;
        break;
      case "quarterly":
        paymentsNeeded = 4;
        break;
      case "monthly":
        paymentsNeeded = 12;
        break;
    }

    // Check if we have enough payment history
    if (declarations.length < paymentsNeeded) {
      return null; // Insufficient history, fallback to manual annual_dividend
    }

    // Get the most recent N payments
    const recentPayments = declarations.slice(0, paymentsNeeded);

    // Check if most recent payment is within last 18 months
    const mostRecentDate = new Date(recentPayments[0].paymentDate);
    const monthsOld =
      (Date.now() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24 * 30);

    if (monthsOld > 18) {
      return null; // Data too stale, fallback to manual
    }

    // Sum per-share amounts for TTM
    const ttmDividend = recentPayments.reduce(
      (sum, decl) => sum + decl.perShareAmount,
      0
    );

    return ttmDividend;
  },
};
