/**
 * Account service for managing brokerage account CRUD operations.
 *
 * This service provides the business logic layer for interacting with the accounts
 * database table. It handles:
 * - Account data CRUD operations
 * - Data transformation between database format (snake_case) and API format (camelCase)
 * - Dependency checking (positions associated with accounts)
 */

import { db } from "../database/db.js";
import { randomUUID } from "crypto";

/**
 * Account data (single record per account).
 * This is the API/application format using camelCase naming.
 */
export interface Account {
  id: string;
  name: string;
  platform: string;
}

/**
 * Database row structure for the accounts table.
 *
 * Represents the raw SQLite row format with snake_case columns.
 *
 * @internal
 */
interface AccountRow {
  id: string;
  name: string;
  platform: string;
  created_at: number;
}

/**
 * Converts a database row to an Account object.
 *
 * Transforms snake_case column names to camelCase property names.
 *
 * @param row - Raw database row from accounts table
 * @returns Account object with typed properties
 */
function rowToAccount(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    platform: row.platform,
  };
}

/**
 * Account service object providing CRUD operations for account data.
 */
export const accountService = {
  /**
   * Retrieves all accounts from the database.
   *
   * @returns Array of all accounts ordered by platform, then name
   */
  getAll(): Account[] {
    const stmt = db.prepare("SELECT * FROM accounts ORDER BY platform, name");
    const rows = stmt.all() as AccountRow[];
    return rows.map(rowToAccount);
  },

  /**
   * Retrieves a single account by ID.
   *
   * @param id - Account ID (UUID)
   * @returns The account if found, null otherwise
   */
  getById(id: string): Account | null {
    const stmt = db.prepare("SELECT * FROM accounts WHERE id = ?");
    const row = stmt.get(id) as AccountRow | undefined;
    return row ? rowToAccount(row) : null;
  },

  /**
   * Creates a new account in the database.
   *
   * Generates a UUID for the account ID.
   *
   * @param account - Account data to create (without ID)
   * @returns The created account with generated ID
   */
  create(account: Omit<Account, "id">): Account {
    const id = randomUUID();

    const stmt = db.prepare(`
      INSERT INTO accounts (id, name, platform)
      VALUES (?, ?, ?)
    `);

    stmt.run(id, account.name, account.platform);

    return {
      id,
      name: account.name,
      platform: account.platform,
    };
  },

  /**
   * Updates an existing account in the database.
   *
   * @param id - Account ID to update
   * @param account - Updated account data
   * @returns The updated account if found, null if account doesn't exist
   */
  update(id: string, account: Omit<Account, "id">): Account | null {
    const existing = this.getById(id);
    if (!existing) {
      return null;
    }

    const stmt = db.prepare(`
      UPDATE accounts
      SET name = ?,
          platform = ?
      WHERE id = ?
    `);

    stmt.run(account.name, account.platform, id);

    return {
      id,
      name: account.name,
      platform: account.platform,
    };
  },

  /**
   * Deletes an account from the database.
   *
   * Note: This will NOT cascade delete positions. The caller should check
   * hasPositions() first and prevent deletion if positions exist.
   *
   * @param id - Account ID to delete
   * @returns true if an account was deleted, false if account wasn't found
   */
  delete(id: string): boolean {
    const stmt = db.prepare("DELETE FROM accounts WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Checks if an account has any associated positions.
   *
   * @param accountId - Account ID to check
   * @returns true if the account has positions, false otherwise
   */
  hasPositions(accountId: string): boolean {
    const stmt = db.prepare(
      "SELECT COUNT(*) as count FROM positions WHERE account_id = ?"
    );
    const result = stmt.get(accountId) as { count: number };
    return result.count > 0;
  },
};
