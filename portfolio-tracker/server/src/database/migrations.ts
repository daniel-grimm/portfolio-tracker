/**
 * Database schema migrations for the portfolio tracker.
 *
 * This file defines the SQLite database schema and handles automated migration
 * execution on server startup. Currently uses a simple migration approach
 * suitable for single-table applications.
 *
 * Schema Design:
 * - Single table 'holdings' stores all user stock positions
 * - Stock market data is denormalized and stored as JSON for simplicity
 * - UUID strings used for primary keys (better for distributed systems)
 * - Idempotent migrations using CREATE TABLE IF NOT EXISTS
 */

import type Database from 'better-sqlite3';

/**
 * Executes all database migrations to set up the schema.
 *
 * This function is safe to run multiple times - it uses CREATE TABLE IF NOT EXISTS
 * to avoid errors when the schema already exists. Migrations are automatically
 * executed when the database connection is initialized.
 *
 * @param db - The better-sqlite3 database instance
 */
export function runMigrations(db: Database.Database): void {
  // Create holdings table
  // This table stores user stock positions with embedded market data snapshots
  db.exec(`
    CREATE TABLE IF NOT EXISTS holdings (
      -- UUID primary key for unique holding identification
      -- Stored as TEXT since SQLite doesn't have a native UUID type
      id TEXT PRIMARY KEY,

      -- Stock ticker symbol (e.g., "AAPL", "MSFT")
      ticker TEXT NOT NULL,

      -- Number of shares owned
      -- Stored as REAL (floating-point) to support fractional shares
      quantity REAL NOT NULL,

      -- Average purchase price per share in USD
      -- Stored as REAL for precise decimal values
      cost_basis REAL NOT NULL,

      -- Optional purchase date in ISO 8601 format (YYYY-MM-DD)
      -- NULL if purchase date is not tracked
      purchase_date TEXT,

      -- JSON snapshot of stock market data (StockData interface)
      -- Stored as TEXT because SQLite doesn't have a native JSON type
      -- This includes: ticker, name, currentPrice, annualDividend, sector,
      -- country, marketCap, style, isDomestic, lastUpdated
      -- Stored with holdings to reduce API calls and preserve historical data
      stock_data_snapshot TEXT NOT NULL,

      -- Unix timestamp in seconds when this holding was created
      -- Auto-populated by SQLite's unixepoch() function
      created_at INTEGER DEFAULT (unixepoch())
    );
  `);

  console.log('Database migrations completed successfully');
}
