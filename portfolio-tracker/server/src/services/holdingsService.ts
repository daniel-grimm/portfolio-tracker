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

export interface Holding {
  id: string;
  ticker: string;
  quantity: number;
  costBasis: number;
  purchaseDate?: string;
  stockDataSnapshot: StockData;
}

interface HoldingRow {
  id: string;
  ticker: string;
  quantity: number;
  cost_basis: number;
  purchase_date: string | null;
  stock_data_snapshot: string;
  created_at: number;
}

// Convert database row to Holding object
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

// Convert Holding object to database row format
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

export const holdingsService = {
  // Get all holdings
  getAll(): Holding[] {
    const stmt = db.prepare('SELECT * FROM holdings ORDER BY created_at DESC');
    const rows = stmt.all() as HoldingRow[];
    return rows.map(rowToHolding);
  },

  // Get a single holding by ID
  getById(id: string): Holding | null {
    const stmt = db.prepare('SELECT * FROM holdings WHERE id = ?');
    const row = stmt.get(id) as HoldingRow | undefined;
    return row ? rowToHolding(row) : null;
  },

  // Create a new holding
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

  // Update an existing holding
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

  // Delete a holding
  delete(id: string): boolean {
    const stmt = db.prepare('DELETE FROM holdings WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },
};
