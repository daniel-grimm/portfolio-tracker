/**
 * SQLite database connection and configuration.
 *
 * This module initializes the SQLite database using better-sqlite3 and configures
 * performance optimizations. The database connection is exported as a singleton
 * for use throughout the application.
 *
 * Configuration:
 * - Uses WAL (Write-Ahead Logging) journal mode for better concurrency
 * - Auto-creates database file and directory if they don't exist
 * - Runs migrations on startup to ensure schema is up-to-date
 * - Gracefully closes connection on process termination
 *
 * Database Path:
 * - Configurable via DATABASE_PATH environment variable
 * - Default: server/data/portfolio.db (relative to this file)
 */

import Database from 'better-sqlite3';
import { runMigrations } from './migrations.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get database path from environment or use default
// Default: server/data/portfolio.db
const DATABASE_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/portfolio.db');

// Ensure the data directory exists
// Creates parent directories recursively if needed
const dataDir = path.dirname(DATABASE_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`Created data directory: ${dataDir}`);
}

/**
 * SQLite database instance.
 *
 * Singleton connection used throughout the application for all database operations.
 * Uses better-sqlite3 for synchronous operations and better performance compared
 * to asynchronous SQLite drivers.
 */
export const db = new Database(DATABASE_PATH);

// Enable WAL (Write-Ahead Logging) mode for better concurrency
// WAL allows simultaneous readers with one writer, improving performance
// for applications with concurrent read/write operations
db.pragma('journal_mode = WAL');

// Run migrations to set up schema
// Safe to run on every startup - migrations are idempotent
runMigrations(db);

console.log(`Database connected: ${DATABASE_PATH}`);

/**
 * Graceful shutdown handlers.
 *
 * These event handlers ensure the database connection is properly closed
 * when the application terminates, preventing database corruption and
 * ensuring all pending writes are flushed to disk.
 */

// Handle normal process exit
process.on('exit', () => {
  db.close();
});

// Handle Ctrl+C in terminal
process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});

// Handle termination signal (e.g., from Docker, systemd)
process.on('SIGTERM', () => {
  db.close();
  process.exit(0);
});
