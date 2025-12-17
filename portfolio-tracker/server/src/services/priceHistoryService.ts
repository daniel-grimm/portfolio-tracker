import { db } from "../database/db.js";
import { v4 as uuidv4 } from "uuid";

/**
 * Price history record.
 */
export interface PriceHistory {
  id: string;
  ticker: string;
  price: number;
  recordedAt: number;
}

/**
 * Database row structure for the price_history table.
 */
interface PriceHistoryRow {
  id: string;
  ticker: string;
  price: number;
  recorded_at: number;
  created_at: number;
}

/**
 * Converts a database row to a PriceHistory object.
 */
function rowToPriceHistory(row: PriceHistoryRow): PriceHistory {
  return {
    id: row.id,
    ticker: row.ticker,
    price: row.price,
    recordedAt: row.recorded_at,
  };
}

export const priceHistoryService = {
  /**
   * Records a new price for a ticker.
   * Uses INSERT OR IGNORE to prevent duplicates for same ticker at same timestamp.
   */
  recordPrice(ticker: string, price: number, recordedAt: number): PriceHistory | null {
    const id = uuidv4();

    try {
      const stmt = db.prepare(`
        INSERT INTO price_history (id, ticker, price, recorded_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(ticker, recorded_at) DO NOTHING
      `);

      const result = stmt.run(id, ticker.toUpperCase(), price, recordedAt);

      // If no rows were inserted (duplicate), return null
      if (result.changes === 0) {
        return null;
      }

      return {
        id,
        ticker: ticker.toUpperCase(),
        price,
        recordedAt,
      };
    } catch (error) {
      console.error("Error recording price history:", error);
      throw error;
    }
  },

  /**
   * Get price history for a specific ticker within a date range.
   */
  getByTicker(
    ticker: string,
    startTime?: number,
    endTime?: number
  ): PriceHistory[] {
    let query = "SELECT * FROM price_history WHERE ticker = ?";
    const params: (string | number)[] = [ticker.toUpperCase()];

    if (startTime !== undefined) {
      query += " AND recorded_at >= ?";
      params.push(startTime);
    }

    if (endTime !== undefined) {
      query += " AND recorded_at <= ?";
      params.push(endTime);
    }

    query += " ORDER BY recorded_at ASC";

    const stmt = db.prepare(query);
    const rows = stmt.all(...params) as PriceHistoryRow[];
    return rows.map(rowToPriceHistory);
  },

  /**
   * Get all price history records within a date range.
   */
  getAll(startTime?: number, endTime?: number): PriceHistory[] {
    let query = "SELECT * FROM price_history WHERE 1=1";
    const params: number[] = [];

    if (startTime !== undefined) {
      query += " AND recorded_at >= ?";
      params.push(startTime);
    }

    if (endTime !== undefined) {
      query += " AND recorded_at <= ?";
      params.push(endTime);
    }

    query += " ORDER BY recorded_at ASC";

    const stmt = db.prepare(query);
    const rows = stmt.all(...params) as PriceHistoryRow[];
    return rows.map(rowToPriceHistory);
  },

  /**
   * Get daily aggregated price history (one entry per day per ticker).
   * Uses the maximum price for each day.
   */
  getDailyAggregated(
    startTime?: number,
    endTime?: number
  ): Array<{ ticker: string; date: string; price: number }> {
    let query = `
      SELECT
        ticker,
        DATE(recorded_at / 1000, 'unixepoch') as date,
        MAX(price) as price
      FROM price_history
      WHERE 1=1
    `;
    const params: number[] = [];

    if (startTime !== undefined) {
      query += " AND recorded_at >= ?";
      params.push(startTime);
    }

    if (endTime !== undefined) {
      query += " AND recorded_at <= ?";
      params.push(endTime);
    }

    query += " GROUP BY ticker, DATE(recorded_at / 1000, 'unixepoch')";
    query += " ORDER BY date ASC, ticker ASC";

    const stmt = db.prepare(query);
    return stmt.all(...params) as Array<{ ticker: string; date: string; price: number }>;
  },
};
