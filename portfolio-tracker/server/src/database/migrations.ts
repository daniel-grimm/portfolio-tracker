/**
 * Database schema migrations for the portfolio tracker.
 *
 * This file defines the SQLite database schema and handles automated migration
 * execution on server startup.
 *
 * Schema Design:
 * - 'stocks' table: Single source of truth for stock market data (one row per ticker)
 * - 'positions' table: Individual purchases/lots (many rows per ticker)
 * - Normalized design with foreign key relationships
 * - UUID strings used for position IDs
 */

import type Database from 'better-sqlite3';

/**
 * Helper function to add a column to a table if it doesn't already exist.
 * This makes migrations idempotent and safe to run multiple times.
 *
 * @param db - The better-sqlite3 database instance
 * @param table - The table name
 * @param column - The column name
 * @param definition - The column definition (e.g., "TEXT", "INTEGER NOT NULL DEFAULT 0")
 */
function addColumnIfNotExists(
  db: Database.Database,
  table: string,
  column: string,
  definition: string
): void {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  const exists = columns.some((col) => col.name === column);
  if (!exists) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`Added column ${column} to ${table}`);
  }
}

/**
 * Executes all database migrations to set up the schema.
 *
 * Drops old holdings table and creates new normalized schema.
 * Migrations are automatically executed when the database connection is initialized.
 *
 * @param db - The better-sqlite3 database instance
 */
export function runMigrations(db: Database.Database): void {
  // Drop old holdings table (data deletion approved by user)
  db.exec('DROP TABLE IF EXISTS holdings');

  // Create stocks table - single source of truth for market data
  db.exec(`
    CREATE TABLE IF NOT EXISTS stocks (
      -- Stock ticker symbol (primary key, e.g., "AAPL", "MSFT")
      ticker TEXT PRIMARY KEY,

      -- Company name (e.g., "Apple Inc.")
      name TEXT NOT NULL,

      -- Current market price in USD
      current_price REAL NOT NULL,

      -- Annual dividend payment per share in USD
      annual_dividend REAL NOT NULL DEFAULT 0,

      -- Industry sector (e.g., "Technology", "Healthcare")
      sector TEXT NOT NULL,

      -- Country of headquarters
      country TEXT NOT NULL,

      -- Market cap classification (mega/large/mid/small/micro)
      market_cap TEXT NOT NULL,

      -- Investment style (value/blend/growth)
      style TEXT NOT NULL,

      -- Whether this is a US domestic company (1 = true, 0 = false)
      is_domestic INTEGER NOT NULL DEFAULT 1,

      -- Unix timestamp in milliseconds when stock data was last updated
      last_updated INTEGER NOT NULL,

      -- Unix timestamp in seconds when stock was created
      created_at INTEGER DEFAULT (unixepoch())
    );
  `);

  // Create positions table - individual purchases/lots
  db.exec(`
    CREATE TABLE IF NOT EXISTS positions (
      -- UUID primary key for unique position identification
      id TEXT PRIMARY KEY,

      -- Foreign key to stocks table
      ticker TEXT NOT NULL,

      -- Number of shares in this position
      -- Stored as REAL to support fractional shares
      quantity REAL NOT NULL CHECK(quantity > 0),

      -- Purchase price per share for this position in USD
      cost_basis REAL NOT NULL CHECK(cost_basis >= 0),

      -- Purchase date in ISO 8601 format (YYYY-MM-DD), optional
      purchase_date TEXT,

      -- Unix timestamp in seconds when position was created
      created_at INTEGER DEFAULT (unixepoch()),

      -- Foreign key constraint
      -- ON DELETE CASCADE: if stock is deleted, all its positions are deleted
      FOREIGN KEY (ticker) REFERENCES stocks(ticker) ON DELETE CASCADE
    );
  `);

  // Add ETF support columns to stocks table (idempotent migrations)
  addColumnIfNotExists(db, 'stocks', 'sector_allocations', 'TEXT');
  addColumnIfNotExists(db, 'stocks', 'country_allocations', 'TEXT');
  addColumnIfNotExists(db, 'stocks', 'description', 'TEXT');

  // Add security_type column for stocks/ETFs/mutual funds
  addColumnIfNotExists(db, 'stocks', 'security_type', 'TEXT');

  // Add style-market cap allocation percentages for ETFs and mutual funds
  addColumnIfNotExists(db, 'stocks', 'style_market_cap_allocations', 'TEXT');

  // Migrate existing data to use security_type
  // This is safe to run multiple times - only updates rows where security_type is NULL
  db.exec(`
    UPDATE stocks
    SET security_type = CASE
      WHEN is_etf = 1 THEN 'etf'
      ELSE 'stock'
    END
    WHERE security_type IS NULL;
  `);

  // Drop deprecated is_etf column (replaced by security_type)
  // SQLite supports DROP COLUMN in version 3.35.0+ (2021-03-12)
  try {
    db.exec(`ALTER TABLE stocks DROP COLUMN IF EXISTS is_etf;`);
    console.log('Dropped deprecated is_etf column from stocks table');
  } catch (error) {
    // Silently ignore if DROP COLUMN is not supported (older SQLite versions)
    // The column will remain but is no longer used
  }

  // Create accounts table for brokerage account management
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      -- UUID primary key for unique account identification
      id TEXT PRIMARY KEY,

      -- Account name (e.g., "My Fidelity 401k", "Robinhood Trading")
      name TEXT NOT NULL,

      -- Platform/broker (Fidelity, Robinhood, Vanguard, etc.)
      platform TEXT NOT NULL,

      -- Unix timestamp in seconds when account was created
      created_at INTEGER DEFAULT (unixepoch())
    );
  `);

  // Add account_id column to positions table (idempotent migration)
  // NULL allowed for backward compatibility with existing positions
  addColumnIfNotExists(db, 'positions', 'account_id', 'TEXT');

  console.log('Database migrations completed successfully');
}
