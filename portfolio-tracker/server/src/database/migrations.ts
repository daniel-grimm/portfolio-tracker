import type Database from 'better-sqlite3';

export function runMigrations(db: Database.Database): void {
  // Create holdings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS holdings (
      id TEXT PRIMARY KEY,
      ticker TEXT NOT NULL,
      quantity REAL NOT NULL,
      cost_basis REAL NOT NULL,
      purchase_date TEXT,
      stock_data_snapshot TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch())
    );
  `);

  console.log('Database migrations completed successfully');
}
