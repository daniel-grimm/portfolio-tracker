/**
 * Stock service for managing stock data CRUD operations.
 *
 * This service provides the business logic layer for interacting with the stocks
 * database table. It handles:
 * - Stock data CRUD operations
 * - Upsert logic (create or update)
 * - Data transformation between database format (snake_case) and API format (camelCase)
 * - Staleness checking for stock data refreshes
 */

import { db } from "../database/db.js";

// Type definitions matching frontend
export type SecurityType = "stock" | "etf" | "mutualfund";
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
 * Sector allocation map for ETFs.
 * Maps sector name to percentage allocation (0-100).
 */
export interface SectorAllocationMap {
  [sector: string]: number;
}

/**
 * Country allocation map for ETFs.
 * Maps country name to percentage allocation (0-100).
 */
export interface CountryAllocationMap {
  [country: string]: number;
}

/**
 * Stock data (single record per ticker).
 * This is the API/application format using camelCase naming.
 *
 * For ETFs and mutual funds, the optional fields (description, sectorAllocations, countryAllocations)
 * enable proportional allocation across multiple sectors and countries.
 */
export interface Stock {
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
  securityType: SecurityType;
  isEtf: boolean; // Deprecated: use securityType instead, kept for backward compatibility
  description?: string;
  sectorAllocations?: SectorAllocationMap;
  countryAllocations?: CountryAllocationMap;
}

/**
 * Database row structure for the stocks table.
 *
 * Represents the raw SQLite row format with snake_case columns.
 *
 * @internal
 */
interface StockRow {
  ticker: string;
  name: string;
  current_price: number;
  annual_dividend: number;
  sector: string;
  country: string;
  market_cap: string;
  style: string;
  is_domestic: number; // SQLite stores booleans as 0/1
  last_updated: number;
  created_at: number;
  security_type: string | null;
  is_etf: number; // SQLite stores booleans as 0/1 - Deprecated, kept for backward compatibility
  description: string | null;
  sector_allocations: string | null; // JSON string
  country_allocations: string | null; // JSON string
}

/**
 * Converts a database row to a Stock object.
 *
 * Transforms snake_case column names to camelCase property names
 * and converts SQLite's 0/1 integers to booleans.
 * Parses JSON strings for sector and country allocations.
 *
 * Handles backward compatibility: if security_type is missing, falls back to is_etf.
 *
 * @param row - Raw database row from stocks table
 * @returns Stock object with typed properties
 */
function rowToStock(row: StockRow): Stock {
  // Determine security type with backward compatibility fallback
  let securityType: SecurityType;
  if (row.security_type) {
    securityType = row.security_type as SecurityType;
  } else {
    // Fallback for old data without security_type
    securityType = row.is_etf === 1 ? "etf" : "stock";
  }

  return {
    ticker: row.ticker,
    name: row.name,
    currentPrice: row.current_price,
    annualDividend: row.annual_dividend,
    sector: row.sector as Sector,
    country: row.country,
    marketCap: row.market_cap as MarketCap,
    style: row.style as Style,
    isDomestic: row.is_domestic === 1,
    lastUpdated: row.last_updated,
    securityType: securityType,
    isEtf: securityType === "etf", // Maintain backward compatibility
    description: row.description || undefined,
    sectorAllocations: row.sector_allocations
      ? JSON.parse(row.sector_allocations)
      : undefined,
    countryAllocations: row.country_allocations
      ? JSON.parse(row.country_allocations)
      : undefined,
  };
}

/**
 * Converts a Stock object to database row format.
 *
 * Transforms camelCase property names to snake_case column names
 * and converts booleans to SQLite's 0/1 integers.
 * Stringifies JSON objects for sector and country allocations.
 *
 * Maintains backward compatibility by writing both security_type and is_etf.
 *
 * @param stock - Stock object
 * @returns Object ready for database insertion/update
 */
function stockToRow(stock: Stock) {
  return {
    ticker: stock.ticker,
    name: stock.name,
    current_price: stock.currentPrice,
    annual_dividend: stock.annualDividend,
    sector: stock.sector,
    country: stock.country,
    market_cap: stock.marketCap,
    style: stock.style,
    is_domestic: stock.isDomestic ? 1 : 0,
    last_updated: stock.lastUpdated,
    security_type: stock.securityType,
    is_etf: stock.securityType === "etf" ? 1 : 0, // Maintain backward compatibility
    description: stock.description || null,
    sector_allocations: stock.sectorAllocations
      ? JSON.stringify(stock.sectorAllocations)
      : null,
    country_allocations: stock.countryAllocations
      ? JSON.stringify(stock.countryAllocations)
      : null,
  };
}

/**
 * Stock service object providing CRUD operations for stock data.
 */
export const stockService = {
  /**
   * Retrieves all stocks from the database.
   *
   * @returns Array of all stocks ordered by ticker
   */
  getAll(): Stock[] {
    const stmt = db.prepare("SELECT * FROM stocks ORDER BY ticker");
    const rows = stmt.all() as StockRow[];
    return rows.map(rowToStock);
  },

  /**
   * Retrieves a single stock by ticker.
   *
   * @param ticker - Stock ticker symbol (e.g., "AAPL")
   * @returns The stock if found, null otherwise
   */
  getByTicker(ticker: string): Stock | null {
    const stmt = db.prepare("SELECT * FROM stocks WHERE ticker = ?");
    const row = stmt.get(ticker.toUpperCase()) as StockRow | undefined;
    return row ? rowToStock(row) : null;
  },

  /**
   * Creates or updates a stock in the database (upsert).
   *
   * If the stock already exists, updates all fields.
   * If the stock doesn't exist, creates a new record.
   *
   * @param stock - Stock data to create or update
   * @returns The stock after upsert
   */
  upsert(stock: Stock): Stock {
    const rowData = stockToRow(stock);

    const stmt = db.prepare(`
      INSERT INTO stocks (
        ticker, name, current_price, annual_dividend,
        sector, country, market_cap, style, is_domestic, last_updated,
        security_type, is_etf, description, sector_allocations, country_allocations
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(ticker) DO UPDATE SET
        name = excluded.name,
        current_price = excluded.current_price,
        annual_dividend = excluded.annual_dividend,
        sector = excluded.sector,
        country = excluded.country,
        market_cap = excluded.market_cap,
        style = excluded.style,
        is_domestic = excluded.is_domestic,
        last_updated = excluded.last_updated,
        security_type = excluded.security_type,
        is_etf = excluded.is_etf,
        description = excluded.description,
        sector_allocations = excluded.sector_allocations,
        country_allocations = excluded.country_allocations
    `);

    stmt.run(
      rowData.ticker,
      rowData.name,
      rowData.current_price,
      rowData.annual_dividend,
      rowData.sector,
      rowData.country,
      rowData.market_cap,
      rowData.style,
      rowData.is_domestic,
      rowData.last_updated,
      rowData.security_type,
      rowData.is_etf,
      rowData.description,
      rowData.sector_allocations,
      rowData.country_allocations
    );

    return stock;
  },

  /**
   * Updates an existing stock in the database.
   *
   * @param ticker - Stock ticker to update
   * @param stock - Updated stock data
   * @returns The updated stock if found, null if stock doesn't exist
   */
  update(ticker: string, stock: Stock): Stock | null {
    const existing = this.getByTicker(ticker);
    if (!existing) {
      return null;
    }

    const rowData = stockToRow(stock);

    const stmt = db.prepare(`
      UPDATE stocks
      SET name = ?,
          current_price = ?,
          annual_dividend = ?,
          sector = ?,
          country = ?,
          market_cap = ?,
          style = ?,
          is_domestic = ?,
          last_updated = ?,
          security_type = ?,
          is_etf = ?,
          description = ?,
          sector_allocations = ?,
          country_allocations = ?
      WHERE ticker = ?
    `);

    stmt.run(
      rowData.name,
      rowData.current_price,
      rowData.annual_dividend,
      rowData.sector,
      rowData.country,
      rowData.market_cap,
      rowData.style,
      rowData.is_domestic,
      rowData.last_updated,
      rowData.security_type,
      rowData.is_etf,
      rowData.description,
      rowData.sector_allocations,
      rowData.country_allocations,
      ticker.toUpperCase()
    );

    return stock;
  },

  /**
   * Deletes a stock from the database.
   *
   * Note: This will cascade delete all positions for this stock due to foreign key constraint.
   *
   * @param ticker - Stock ticker to delete
   * @returns true if a stock was deleted, false if stock wasn't found
   */
  delete(ticker: string): boolean {
    const stmt = db.prepare("DELETE FROM stocks WHERE ticker = ?");
    const result = stmt.run(ticker.toUpperCase());
    return result.changes > 0;
  },

  /**
   * Checks if stock data needs refresh (older than 1 hour).
   *
   * @param ticker - Stock ticker to check
   * @returns true if stock needs refresh, false otherwise
   */
  needsRefresh(ticker: string): boolean {
    const stock = this.getByTicker(ticker);
    if (!stock) return true;

    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    return stock.lastUpdated < oneHourAgo;
  },
};
