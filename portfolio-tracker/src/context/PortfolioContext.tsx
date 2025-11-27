import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { Holding } from '../types/portfolio.types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { STORAGE_KEY } from '../data/constants';

interface PortfolioContextType {
  holdings: Holding[];
  addHolding: (holding: Omit<Holding, 'id'>) => void;
  updateHolding: (id: string, holding: Omit<Holding, 'id'>) => void;
  deleteHolding: (id: string) => void;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

interface PortfolioProviderProps {
  children: ReactNode;
}

export const PortfolioProvider: React.FC<PortfolioProviderProps> = ({ children }) => {
  const [holdings, setHoldings] = useLocalStorage<Holding[]>(STORAGE_KEY, []);

  const addHolding = (holding: Omit<Holding, 'id'>) => {
    const newHolding: Holding = {
      ...holding,
      id: crypto.randomUUID(),
    };
    setHoldings([...holdings, newHolding]);
  };

  const updateHolding = (id: string, updatedHolding: Omit<Holding, 'id'>) => {
    setHoldings(
      holdings.map((holding) =>
        holding.id === id ? { ...updatedHolding, id } : holding
      )
    );
  };

  const deleteHolding = (id: string) => {
    setHoldings(holdings.filter((holding) => holding.id !== id));
  };

  const value: PortfolioContextType = {
    holdings,
    addHolding,
    updateHolding,
    deleteHolding,
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
