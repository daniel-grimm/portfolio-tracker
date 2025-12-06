import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import type {
  Stock,
  Position,
  AggregatedPosition,
} from "../types/portfolio.types";
import type { Account } from "../types/account.types";
import { stocksApi } from "../services/stocksApi";
import { positionsApi } from "../services/positionsApi";
import { accountsApi } from "../services/accountsApi";

interface PortfolioContextType {
  // Aggregated positions for display (one row per ticker)
  aggregatedPositions: AggregatedPosition[];
  // All available stocks
  stocks: Stock[];
  // All available accounts
  accounts: Account[];
  isLoading: boolean;
  error: string | null;

  // Stock management
  addStock: (stock: Stock) => Promise<void>;
  updateStock: (ticker: string, stock: Partial<Stock>) => Promise<void>;
  deleteStock: (ticker: string) => Promise<void>;
  refreshStocks: () => Promise<void>;

  // Position management
  addPosition: (position: Omit<Position, "id">) => Promise<void>;
  updatePosition: (id: string, position: Omit<Position, "id">) => Promise<void>;
  deletePosition: (id: string) => Promise<void>;
  deleteAllPositionsForTicker: (ticker: string) => Promise<void>;
  refreshPositions: () => Promise<void>;

  // Account management
  addAccount: (account: Omit<Account, "id">) => Promise<void>;
  updateAccount: (id: string, account: Omit<Account, "id">) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  refreshAccounts: () => Promise<void>;

  // Refresh everything
  refresh: () => Promise<void>;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(
  undefined
);

interface PortfolioProviderProps {
  children: ReactNode;
}

export const PortfolioProvider: React.FC<PortfolioProviderProps> = ({
  children,
}) => {
  const [aggregatedPositions, setAggregatedPositions] = useState<
    AggregatedPosition[]
  >([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Refresh aggregated positions (for display)
  const refreshPositions = async () => {
    try {
      setError(null);
      const positions = await positionsApi.getAggregated();
      setAggregatedPositions(positions);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch positions"
      );
      console.error("Error fetching positions:", err);
    }
  };

  // Refresh all stocks
  const refreshStocks = async () => {
    try {
      setError(null);
      const allStocks = await stocksApi.getAll();
      setStocks(allStocks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch stocks");
      console.error("Error fetching stocks:", err);
    }
  };

  // Refresh all accounts
  const refreshAccounts = async () => {
    try {
      setError(null);
      const allAccounts = await accountsApi.getAll();
      setAccounts(allAccounts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch accounts");
      console.error("Error fetching accounts:", err);
    }
  };

  // Refresh everything
  const refresh = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await Promise.all([
        refreshStocks(),
        refreshPositions(),
        refreshAccounts(),
      ]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to refresh portfolio"
      );
      console.error("Error refreshing portfolio:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  // Stock management
  const addStock = async (stock: Stock) => {
    try {
      setError(null);
      const newStock = await stocksApi.create(stock);
      setStocks((prev) => [...prev, newStock]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add ticker");
      console.error("Error adding stock:", err);
      throw err;
    }
  };

  const updateStock = async (ticker: string, stock: Partial<Stock>) => {
    try {
      setError(null);
      const updated = await stocksApi.update(ticker, stock);
      setStocks((prev) => prev.map((s) => (s.ticker === ticker ? updated : s)));
      // Also refresh positions in case the stock data is used there
      await refreshPositions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update stock");
      console.error("Error updating stock:", err);
      throw err;
    }
  };

  const deleteStock = async (ticker: string) => {
    try {
      setError(null);
      await stocksApi.delete(ticker);
      setStocks((prev) => prev.filter((s) => s.ticker !== ticker));
      // Refresh positions as CASCADE delete may have removed positions
      await refreshPositions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete stock");
      console.error("Error deleting stock:", err);
      throw err;
    }
  };

  // Position management
  const addPosition = async (position: Omit<Position, "id">) => {
    try {
      setError(null);
      await positionsApi.create(position);
      // Refresh aggregated positions to show the new position
      await refreshPositions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add position");
      console.error("Error adding position:", err);
      throw err;
    }
  };

  const updatePosition = async (id: string, position: Omit<Position, "id">) => {
    try {
      setError(null);
      await positionsApi.update(id, position);
      // Refresh aggregated positions to reflect the update
      await refreshPositions();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update position"
      );
      console.error("Error updating position:", err);
      throw err;
    }
  };

  const deletePosition = async (id: string) => {
    try {
      setError(null);
      await positionsApi.delete(id);
      // Refresh aggregated positions to remove the deleted position
      await refreshPositions();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete position"
      );
      console.error("Error deleting position:", err);
      throw err;
    }
  };

  const deleteAllPositionsForTicker = async (ticker: string) => {
    try {
      setError(null);
      await positionsApi.deleteByTicker(ticker);
      // Refresh aggregated positions to update display
      await refreshPositions();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete positions"
      );
      console.error("Error deleting positions for ticker:", err);
      throw err;
    }
  };

  // Account management
  const addAccount = async (account: Omit<Account, "id">) => {
    try {
      setError(null);
      const newAccount = await accountsApi.create(account);
      setAccounts((prev) => [...prev, newAccount]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add account");
      console.error("Error adding account:", err);
      throw err;
    }
  };

  const updateAccount = async (id: string, account: Omit<Account, "id">) => {
    try {
      setError(null);
      const updated = await accountsApi.update(id, account);
      setAccounts((prev) => prev.map((a) => (a.id === id ? updated : a)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update account");
      console.error("Error updating account:", err);
      throw err;
    }
  };

  const deleteAccount = async (id: string) => {
    try {
      setError(null);
      await accountsApi.delete(id);
      setAccounts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account");
      console.error("Error deleting account:", err);
      throw err;
    }
  };

  const value: PortfolioContextType = {
    aggregatedPositions,
    stocks,
    accounts,
    isLoading,
    error,
    addStock,
    updateStock,
    deleteStock,
    refreshStocks,
    addPosition,
    updatePosition,
    deletePosition,
    deleteAllPositionsForTicker,
    refreshPositions,
    addAccount,
    updateAccount,
    deleteAccount,
    refreshAccounts,
    refresh,
  };

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
};

export const usePortfolio = () => {
  const context = useContext(PortfolioContext);
  if (context === undefined) {
    throw new Error("usePortfolio must be used within a PortfolioProvider");
  }
  return context;
};
