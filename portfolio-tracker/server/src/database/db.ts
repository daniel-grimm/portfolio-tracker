import Database from 'better-sqlite3';
import { runMigrations } from './migrations.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get database path from environment or use default
const DATABASE_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/portfolio.db');

// Ensure the data directory exists
const dataDir = path.dirname(DATABASE_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`Created data directory: ${dataDir}`);
}

// Initialize database connection
export const db = new Database(DATABASE_PATH);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Run migrations to set up schema
runMigrations(db);

console.log(`Database connected: ${DATABASE_PATH}`);

// Graceful shutdown
process.on('exit', () => {
  db.close();
});

process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  db.close();
  process.exit(0);
});
