import { useMemo } from "react";
import { usePortfolio } from "../context/PortfolioContext";
import type {
  HoldingMetadata,
  PortfolioMetrics,
  SectorAllocation,
  GeographicAllocation,
  DomesticIntlAllocation,
  StyleBoxAllocation,
} from "../types/portfolio.types";
import {
  enrichHolding,
  calculatePortfolioMetrics,
  calculateSectorAllocation,
  calculateGeographicAllocation,
  calculateDomesticIntlAllocation,
} from "../utils/calculations";
import { calculateStyleBoxAllocation } from "../utils/styleBoxClassifier";

export function useCalculations() {
  const { holdings } = usePortfolio();

  const enrichedHoldings = useMemo<HoldingMetadata[]>(() => {
    return holdings
      .map((holding) => enrichHolding(holding))
      .filter((h): h is HoldingMetadata => h !== null);
  }, [holdings]);

  const portfolioMetrics = useMemo<PortfolioMetrics>(() => {
    return calculatePortfolioMetrics(enrichedHoldings);
  }, [enrichedHoldings]);

  const sectorAllocation = useMemo<SectorAllocation>(() => {
    return calculateSectorAllocation(enrichedHoldings);
  }, [enrichedHoldings]);

  const geographicAllocation = useMemo<GeographicAllocation>(() => {
    return calculateGeographicAllocation(enrichedHoldings);
  }, [enrichedHoldings]);

  const domesticIntlAllocation = useMemo<DomesticIntlAllocation>(() => {
    return calculateDomesticIntlAllocation(enrichedHoldings);
  }, [enrichedHoldings]);

  const styleBoxAllocation = useMemo<StyleBoxAllocation>(() => {
    return calculateStyleBoxAllocation(enrichedHoldings);
  }, [enrichedHoldings]);

  return {
    enrichedHoldings,
    portfolioMetrics,
    sectorAllocation,
    geographicAllocation,
    domesticIntlAllocation,
    styleBoxAllocation,
  };
}
