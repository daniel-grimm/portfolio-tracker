/**
 * Holdings service for managing stock position CRUD operations.
 *
 * This service provides the business logic layer for interacting with the holdings
 * database table. It handles:
 * - Data transformation between database format (snake_case) and API format (camelCase)
 * - JSON serialization/deserialization of stock data snapshots
 * - UUID generation for new holdings
 * - CRUD operations with proper error handling
 *
 * Data Flow:
 * Database Row (snake_case, JSON strings)
 *   ↓ rowToHolding()
 * Holding object (camelCase, typed objects)
 *   ↓ holdingToRow()
 * Database Row (snake_case, JSON strings)
 */

import { db } from '../database/db.js';

// Type definitions matching frontend
export type MarketCap = "mega" | "large" | "mid" | "small" | "micro";
export type Style = "value" | "blend" | "growth";
export type Sector =
  | "Technology"
  | "Healthcare"
  | "Financials"
  | "Consumer Discretionary"
  | "Consumer Staples"
  | "Industrials"
  | "Energy"
  | "Materials"
  | "Real Estate"
  | "Utilities"
  | "Communication Services";

/**
 * Stock data snapshot stored with each holding.
 * Contains market data fetched from Finnhub API.
 */
export interface StockData {
  ticker: string;
  name: string;
  currentPrice: number;
  annualDividend: number;
  sector: Sector;
  country: string;
  marketCap: MarketCap;
  style: Style;
  isDomestic: boolean;
  lastUpdated: number;
}

/**
 * Holding object representing a stock position.
 * This is the API/application format using camelCase naming.
 */
export interface Holding {
  id: string;
  ticker: string;
  quantity: number;
  costBasis: number;
  purchaseDate?: string;
  stockDataSnapshot: StockData;
}

/**
 * Database row structure for the holdings table.
 *
 * Represents the raw SQLite row format with snake_case columns.
 * This is the internal database representation that gets transformed
 * to/from the Holding interface for API consumption.
 *
 * @internal
 */
interface HoldingRow {
  /** UUID primary key */
  id: string;

  /** Stock ticker symbol */
  ticker: string;

  /** Number of shares owned */
  quantity: number;

  /** Average purchase price per share (snake_case) */
  cost_basis: number;

  /** Purchase date or null if not provided (snake_case) */
  purchase_date: string | null;

  /** JSON string containing StockData snapshot (snake_case) */
  stock_data_snapshot: string;

  /** Unix timestamp when holding was created (snake_case) */
  created_at: number;
}

/**
 * Converts a database row to a Holding object.
 *
 * Performs the following transformations:
 * - snake_case column names → camelCase property names
 * - JSON string → parsed StockData object
 * - null purchase_date → undefined
 *
 * @param row - Raw database row from holdings table
 * @returns Holding object with typed properties ready for API response
 */
function rowToHolding(row: HoldingRow): Holding {
  return {
    id: row.id,
    ticker: row.ticker,
    quantity: row.quantity,
    costBasis: row.cost_basis,
    purchaseDate: row.purchase_date || undefined,
    stockDataSnapshot: JSON.parse(row.stock_data_snapshot),
  };
}

/**
 * Converts a Holding object to database row format.
 *
 * Performs the following transformations:
 * - camelCase property names → snake_case column names
 * - StockData object → JSON string
 * - undefined purchase_date → null
 *
 * @param holding - Holding object (with optional id)
 * @returns Object ready for database insertion/update with snake_case columns
 */
function holdingToRow(holding: Omit<Holding, 'id'> & { id?: string }) {
  return {
    id: holding.id,
    ticker: holding.ticker,
    quantity: holding.quantity,
    cost_basis: holding.costBasis,
    purchase_date: holding.purchaseDate || null,
    stock_data_snapshot: JSON.stringify(holding.stockDataSnapshot),
  };
}

/**
 * Holdings service object providing CRUD operations for stock positions.
 *
 * All methods use prepared statements for SQL injection protection and
 * transform data between database format (snake_case) and API format (camelCase).
 */
export const holdingsService = {
  /**
   * Retrieves all holdings from the database.
   *
   * Results are ordered by creation date (newest first) to show recent
   * positions at the top of the list.
   *
   * @returns Array of all holdings with deserialized stock data
   */
  getAll(): Holding[] {
    const stmt = db.prepare('SELECT * FROM holdings ORDER BY created_at DESC');
    const rows = stmt.all() as HoldingRow[];
    return rows.map(rowToHolding);
  },

  /**
   * Retrieves a single holding by its ID.
   *
   * @param id - UUID of the holding to retrieve
   * @returns The holding if found, null otherwise
   */
  getById(id: string): Holding | null {
    const stmt = db.prepare('SELECT * FROM holdings WHERE id = ?');
    const row = stmt.get(id) as HoldingRow | undefined;
    return row ? rowToHolding(row) : null;
  },

  /**
   * Creates a new holding in the database.
   *
   * Automatically generates a UUID for the holding and stores it with
   * the current timestamp. StockData is serialized to JSON for storage.
   *
   * @param holding - Holding data without id (id will be auto-generated)
   * @returns The created holding with its new UUID
   */
  create(holding: Omit<Holding, 'id'>): Holding {
    const id = crypto.randomUUID();
    const rowData = holdingToRow({ ...holding, id });

    const stmt = db.prepare(`
      INSERT INTO holdings (id, ticker, quantity, cost_basis, purchase_date, stock_data_snapshot)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      rowData.id,
      rowData.ticker,
      rowData.quantity,
      rowData.cost_basis,
      rowData.purchase_date,
      rowData.stock_data_snapshot
    );

    return {
      id,
      ...holding,
    };
  },

  /**
   * Updates an existing holding in the database.
   *
   * First checks if the holding exists, then updates all fields except
   * id and created_at (which are immutable).
   *
   * @param id - UUID of the holding to update
   * @param holding - Updated holding data (without id)
   * @returns The updated holding if found, null if holding doesn't exist
   */
  update(id: string, holding: Omit<Holding, 'id'>): Holding | null {
    const existing = this.getById(id);
    if (!existing) {
      return null;
    }

    const rowData = holdingToRow(holding);

    const stmt = db.prepare(`
      UPDATE holdings
      SET ticker = ?,
          quantity = ?,
          cost_basis = ?,
          purchase_date = ?,
          stock_data_snapshot = ?
      WHERE id = ?
    `);

    stmt.run(
      rowData.ticker,
      rowData.quantity,
      rowData.cost_basis,
      rowData.purchase_date,
      rowData.stock_data_snapshot,
      id
    );

    return {
      id,
      ...holding,
    };
  },

  /**
   * Deletes a holding from the database.
   *
   * @param id - UUID of the holding to delete
   * @returns true if a holding was deleted, false if holding wasn't found
   */
  delete(id: string): boolean {
    const stmt = db.prepare('DELETE FROM holdings WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },
};
