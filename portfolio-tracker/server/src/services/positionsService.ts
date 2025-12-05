/**
 * Positions service for managing position CRUD operations and aggregation.
 *
 * This service provides the business logic layer for interacting with the positions
 * database table. It handles:
 * - Position CRUD operations
 * - Aggregation of positions by ticker (for display)
 * - Data transformation between database format (snake_case) and API format (camelCase)
 * - JOIN queries with stocks table
 */

import { db } from '../database/db.js';
import { type Stock, stockService } from './stockService.js';

/**
 * Individual position (purchase).
 * This is the API/application format using camelCase naming.
 */
export interface Position {
  id: string;
  ticker: string;
  quantity: number;
  costBasis: number;
  purchaseDate?: string;
  accountId?: string | null; // Optional for backward compatibility
}

/**
 * Position with stock data attached (for API responses).
 */
export interface PositionWithStock extends Position {
  stock: Stock;
}

/**
 * Aggregated position (positions rolled up by ticker).
 */
export interface AggregatedPosition {
  ticker: string;
  stock: Stock;
  totalQuantity: number;
  weightedAverageCostBasis: number;
  positions: Position[];
  oldestPurchaseDate?: string;
  newestPurchaseDate?: string;
}

/**
 * Database row structure for the positions table.
 *
 * Represents the raw SQLite row format with snake_case columns.
 *
 * @internal
 */
interface PositionRow {
  id: string;
  ticker: string;
  quantity: number;
  cost_basis: number;
  purchase_date: string | null;
  account_id: string | null;
  created_at: number;
}

/**
 * Combined row from JOIN query (position + stock data).
 *
 * @internal
 */
interface PositionWithStockRow extends PositionRow {
  name: string;
  current_price: number;
  annual_dividend: number;
  sector: string;
  country: string;
  market_cap: string;
  style: string;
  is_domestic: number;
  last_updated: number;
  is_etf: number;
  security_type: string | null;
  description: string | null;
  sector_allocations: string | null;
  country_allocations: string | null;
}

/**
 * Converts a database row to a Position object.
 *
 * @param row - Raw database row from positions table
 * @returns Position object with typed properties
 */
function rowToPosition(row: PositionRow): Position {
  return {
    id: row.id,
    ticker: row.ticker,
    quantity: row.quantity,
    costBasis: row.cost_basis,
    purchaseDate: row.purchase_date || undefined,
    accountId: row.account_id || undefined,
  };
}

/**
 * Converts a combined row to a PositionWithStock object.
 *
 * @param row - Raw database row from JOIN query
 * @returns PositionWithStock object
 */
function rowToPositionWithStock(row: PositionWithStockRow): PositionWithStock {
  // Determine security type with backward compatibility fallback
  // This mirrors the logic in stockService.ts rowToStock() function
  let securityType: Stock['securityType'];
  if (row.security_type) {
    securityType = row.security_type as Stock['securityType'];
  } else {
    // Fallback for old data without security_type
    securityType = row.is_etf === 1 ? "etf" : "stock";
  }

  return {
    id: row.id,
    ticker: row.ticker,
    quantity: row.quantity,
    costBasis: row.cost_basis,
    purchaseDate: row.purchase_date || undefined,
    accountId: row.account_id || undefined,
    stock: {
      ticker: row.ticker,
      name: row.name,
      currentPrice: row.current_price,
      annualDividend: row.annual_dividend,
      sector: row.sector as Stock['sector'],
      country: row.country,
      marketCap: row.market_cap as Stock['marketCap'],
      style: row.style as Stock['style'],
      isDomestic: row.is_domestic === 1,
      lastUpdated: row.last_updated,
      securityType: securityType,
      isEtf: securityType === "etf",
      description: row.description || undefined,
      sectorAllocations: row.sector_allocations
        ? JSON.parse(row.sector_allocations)
        : undefined,
      countryAllocations: row.country_allocations
        ? JSON.parse(row.country_allocations)
        : undefined,
    },
  };
}

/**
 * Converts a Position object to database row format.
 *
 * @param position - Position object (with optional id)
 * @returns Object ready for database insertion/update
 */
function positionToRow(position: Omit<Position, 'id'> & { id?: string }) {
  return {
    id: position.id,
    ticker: position.ticker,
    quantity: position.quantity,
    cost_basis: position.costBasis,
    purchase_date: position.purchaseDate || null,
    account_id: position.accountId || null,
  };
}

/**
 * Positions service object providing CRUD operations and aggregation.
 */
export const positionsService = {
  /**
   * Retrieves all positions from the database with stock data.
   *
   * @returns Array of all positions with stock data, ordered by creation date (newest first)
   */
  getAll(): PositionWithStock[] {
    const stmt = db.prepare(`
      SELECT
        p.id, p.ticker, p.quantity, p.cost_basis, p.purchase_date, p.account_id, p.created_at,
        s.name, s.current_price, s.annual_dividend, s.sector,
        s.country, s.market_cap, s.style, s.is_domestic, s.last_updated,
        s.is_etf, s.security_type, s.description, s.sector_allocations, s.country_allocations
      FROM positions p
      JOIN stocks s ON p.ticker = s.ticker
      ORDER BY p.created_at DESC
    `);

    const rows = stmt.all() as PositionWithStockRow[];
    return rows.map(rowToPositionWithStock);
  },

  /**
   * Retrieves positions for a specific ticker.
   *
   * @param ticker - Stock ticker symbol
   * @returns Array of positions for this ticker with stock data
   */
  getByTicker(ticker: string): PositionWithStock[] {
    const stmt = db.prepare(`
      SELECT
        p.id, p.ticker, p.quantity, p.cost_basis, p.purchase_date, p.account_id, p.created_at,
        s.name, s.current_price, s.annual_dividend, s.sector,
        s.country, s.market_cap, s.style, s.is_domestic, s.last_updated,
        s.is_etf, s.security_type, s.description, s.sector_allocations, s.country_allocations
      FROM positions p
      JOIN stocks s ON p.ticker = s.ticker
      WHERE p.ticker = ?
      ORDER BY p.purchase_date ASC, p.created_at ASC
    `);

    const rows = stmt.all(ticker.toUpperCase()) as PositionWithStockRow[];
    return rows.map(rowToPositionWithStock);
  },

  /**
   * Retrieves a single position by ID.
   *
   * @param id - UUID of the position
   * @returns The position with stock data if found, null otherwise
   */
  getById(id: string): PositionWithStock | null {
    const stmt = db.prepare(`
      SELECT
        p.id, p.ticker, p.quantity, p.cost_basis, p.purchase_date, p.account_id, p.created_at,
        s.name, s.current_price, s.annual_dividend, s.sector,
        s.country, s.market_cap, s.style, s.is_domestic, s.last_updated,
        s.is_etf, s.security_type, s.description, s.sector_allocations, s.country_allocations
      FROM positions p
      JOIN stocks s ON p.ticker = s.ticker
      WHERE p.id = ?
    `);

    const row = stmt.get(id) as PositionWithStockRow | undefined;
    return row ? rowToPositionWithStock(row) : null;
  },

  /**
   * Creates a new position in the database.
   *
   * Stock must already exist in the stocks table.
   * Generates a UUID for the position.
   *
   * @param position - Position data without id (id will be auto-generated)
   * @returns The created position with stock data
   * @throws Error if stock doesn't exist
   */
  create(position: Omit<Position, 'id'>): PositionWithStock {
    // Verify stock exists
    const stock = stockService.getByTicker(position.ticker);
    if (!stock) {
      throw new Error(`Stock ${position.ticker} does not exist. Please create the stock first.`);
    }

    const id = crypto.randomUUID();
    const rowData = positionToRow({ ...position, id });

    const stmt = db.prepare(`
      INSERT INTO positions (id, ticker, quantity, cost_basis, purchase_date, account_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      rowData.id,
      rowData.ticker.toUpperCase(),
      rowData.quantity,
      rowData.cost_basis,
      rowData.purchase_date,
      rowData.account_id
    );

    return {
      id,
      ...position,
      ticker: position.ticker.toUpperCase(),
      stock,
    };
  },

  /**
   * Updates an existing position in the database.
   *
   * @param id - UUID of the position to update
   * @param position - Updated position data (without id)
   * @returns The updated position with stock data if found, null if position doesn't exist
   */
  update(id: string, position: Omit<Position, 'id'>): PositionWithStock | null {
    const existing = this.getById(id);
    if (!existing) {
      return null;
    }

    const rowData = positionToRow(position);

    const stmt = db.prepare(`
      UPDATE positions
      SET quantity = ?,
          cost_basis = ?,
          purchase_date = ?,
          account_id = ?
      WHERE id = ?
    `);

    stmt.run(
      rowData.quantity,
      rowData.cost_basis,
      rowData.purchase_date,
      rowData.account_id,
      id
    );

    // Fetch updated position
    return this.getById(id);
  },

  /**
   * Deletes a position from the database.
   *
   * @param id - UUID of the position to delete
   * @returns true if a position was deleted, false if position wasn't found
   */
  delete(id: string): boolean {
    const stmt = db.prepare('DELETE FROM positions WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Deletes all positions for a specific ticker.
   *
   * @param ticker - Stock ticker symbol
   * @returns Number of positions deleted
   */
  deleteAllByTicker(ticker: string): number {
    const stmt = db.prepare('DELETE FROM positions WHERE ticker = ?');
    const result = stmt.run(ticker.toUpperCase());
    return result.changes;
  },

  /**
   * Gets aggregated positions (positions rolled up by ticker).
   *
   * Groups all positions by ticker and calculates:
   * - Total quantity
   * - Weighted average cost basis
   * - Date range (oldest and newest purchase dates)
   *
   * Only returns stocks that have positions.
   *
   * @returns Array of aggregated positions
   */
  getAggregatedPositions(): AggregatedPosition[] {
    const allPositions = this.getAll();

    // Group positions by ticker
    const grouped = new Map<string, PositionWithStock[]>();
    allPositions.forEach(position => {
      if (!grouped.has(position.ticker)) {
        grouped.set(position.ticker, []);
      }
      grouped.get(position.ticker)!.push(position);
    });

    // Aggregate each ticker
    const aggregated: AggregatedPosition[] = [];
    grouped.forEach((positions, ticker) => {
      const stock = positions[0].stock;  // All positions have same stock data

      let totalQuantity = 0;
      let totalCost = 0;
      const purchaseDates: string[] = [];

      positions.forEach(position => {
        totalQuantity += position.quantity;
        totalCost += position.quantity * position.costBasis;
        if (position.purchaseDate) {
          purchaseDates.push(position.purchaseDate);
        }
      });

      const weightedAverageCostBasis = totalQuantity > 0
        ? totalCost / totalQuantity
        : 0;

      purchaseDates.sort();

      aggregated.push({
        ticker,
        stock,
        totalQuantity,
        weightedAverageCostBasis,
        positions: positions.map(p => ({
          id: p.id,
          ticker: p.ticker,
          quantity: p.quantity,
          costBasis: p.costBasis,
          purchaseDate: p.purchaseDate,
          accountId: p.accountId,
        })),
        oldestPurchaseDate: purchaseDates[0],
        newestPurchaseDate: purchaseDates[purchaseDates.length - 1],
      });
    });

    return aggregated;
  },

  /**
   * Retrieves all positions for a specific account.
   *
   * @param accountId - Account ID (UUID)
   * @returns Array of positions for this account with stock data
   */
  getByAccountId(accountId: string): PositionWithStock[] {
    const stmt = db.prepare(`
      SELECT
        p.id, p.ticker, p.quantity, p.cost_basis, p.purchase_date, p.account_id, p.created_at,
        s.name, s.current_price, s.annual_dividend, s.sector,
        s.country, s.market_cap, s.style, s.is_domestic, s.last_updated,
        s.is_etf, s.security_type, s.description, s.sector_allocations, s.country_allocations
      FROM positions p
      JOIN stocks s ON p.ticker = s.ticker
      WHERE p.account_id = ?
      ORDER BY p.created_at DESC
    `);

    const rows = stmt.all(accountId) as PositionWithStockRow[];
    return rows.map(rowToPositionWithStock);
  },
};
