import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Holding } from '../types/portfolio.types';
import { holdingsApi } from '../services/holdingsApi';

interface PortfolioContextType {
  holdings: Holding[];
  isLoading: boolean;
  error: string | null;
  addHolding: (holding: Omit<Holding, 'id'>) => Promise<void>;
  updateHolding: (id: string, holding: Omit<Holding, 'id'>) => Promise<void>;
  deleteHolding: (id: string) => Promise<void>;
  refreshHoldings: () => Promise<void>;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

interface PortfolioProviderProps {
  children: ReactNode;
}

export const PortfolioProvider: React.FC<PortfolioProviderProps> = ({ children }) => {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshHoldings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const fetchedHoldings = await holdingsApi.getAll();
      setHoldings(fetchedHoldings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch holdings');
      console.error('Error fetching holdings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshHoldings();
  }, []);

  const addHolding = async (holding: Omit<Holding, 'id'>) => {
    try {
      setError(null);
      const newHolding = await holdingsApi.create(holding);
      setHoldings((prev) => [...prev, newHolding]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add holding');
      console.error('Error adding holding:', err);
      throw err;
    }
  };

  const updateHolding = async (id: string, updatedHolding: Omit<Holding, 'id'>) => {
    try {
      setError(null);
      const updated = await holdingsApi.update(id, updatedHolding);
      setHoldings((prev) =>
        prev.map((holding) => (holding.id === id ? updated : holding))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update holding');
      console.error('Error updating holding:', err);
      throw err;
    }
  };

  const deleteHolding = async (id: string) => {
    try {
      setError(null);
      await holdingsApi.delete(id);
      setHoldings((prev) => prev.filter((holding) => holding.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete holding');
      console.error('Error deleting holding:', err);
      throw err;
    }
  };

  const value: PortfolioContextType = {
    holdings,
    isLoading,
    error,
    addHolding,
    updateHolding,
    deleteHolding,
    refreshHoldings,
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
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
};
