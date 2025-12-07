import { useState, useEffect, useCallback } from 'react';
import { dividendsApi } from '../services/dividendsApi';
import type {
  QuarterlyDividend,
  YearlyDividend,
  DividendMetrics,
} from '../types/dividend.types';

/**
 * Custom hook for fetching and managing dividend data.
 *
 * Fetches quarterly and yearly aggregated dividend data, as well as
 * growth metrics (Q/Q, Y/Y, CAGR).
 *
 * @returns Object containing dividend data, metrics, loading state, and refresh function
 */
export function useDividends() {
  const [quarterlyData, setQuarterlyData] = useState<QuarterlyDividend[]>([]);
  const [yearlyData, setYearlyData] = useState<YearlyDividend[]>([]);
  const [metrics, setMetrics] = useState<DividendMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDividendData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch quarterly and yearly data in parallel
      const [quarterly, yearly, cagr] = await Promise.all([
        dividendsApi.getQuarterlyAggregated(8),
        dividendsApi.getYearlyAggregated(5),
        dividendsApi.getCAGR(),
      ]);

      setQuarterlyData(quarterly);
      setYearlyData(yearly);

      // Calculate current quarter and year for growth metrics
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);

      // Fetch growth metrics in parallel
      const [quarterlyGrowth, yearlyGrowth] = await Promise.all([
        dividendsApi.getQuarterlyGrowth(currentYear, currentQuarter),
        dividendsApi.getYearlyGrowth(currentYear),
      ]);

      setMetrics({
        quarterlyGrowth,
        yearlyGrowth,
        cagr,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dividend data');
      console.error('Error fetching dividend data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDividendData();
  }, [fetchDividendData]);

  return {
    quarterlyData,
    yearlyData,
    metrics,
    isLoading,
    error,
    refresh: fetchDividendData,
  };
}
