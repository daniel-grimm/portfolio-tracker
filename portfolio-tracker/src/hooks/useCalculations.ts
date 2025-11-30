import { useMemo } from "react";
import { usePortfolio } from "../context/PortfolioContext";
import type {
  PositionMetadata,
  PortfolioMetrics,
  SectorAllocation,
  GeographicAllocation,
  DomesticIntlAllocation,
  StyleBoxAllocation,
} from "../types/portfolio.types";
import {
  enrichPosition,
  calculatePortfolioMetrics,
  calculateSectorAllocation,
  calculateGeographicAllocation,
  calculateDomesticIntlAllocation,
} from "../utils/calculations";
import { calculateStyleBoxAllocation } from "../utils/styleBoxClassifier";

export function useCalculations() {
  const { aggregatedPositions } = usePortfolio();

  const enrichedPositions = useMemo<PositionMetadata[]>(() => {
    return aggregatedPositions
      .map((position) => enrichPosition(position))
      .filter((p): p is PositionMetadata => p !== null);
  }, [aggregatedPositions]);

  const portfolioMetrics = useMemo<PortfolioMetrics>(() => {
    return calculatePortfolioMetrics(enrichedPositions);
  }, [enrichedPositions]);

  const sectorAllocation = useMemo<SectorAllocation>(() => {
    return calculateSectorAllocation(enrichedPositions);
  }, [enrichedPositions]);

  const geographicAllocation = useMemo<GeographicAllocation>(() => {
    return calculateGeographicAllocation(enrichedPositions);
  }, [enrichedPositions]);

  const domesticIntlAllocation = useMemo<DomesticIntlAllocation>(() => {
    return calculateDomesticIntlAllocation(enrichedPositions);
  }, [enrichedPositions]);

  const styleBoxAllocation = useMemo<StyleBoxAllocation>(() => {
    return calculateStyleBoxAllocation(enrichedPositions);
  }, [enrichedPositions]);

  return {
    enrichedPositions,
    portfolioMetrics,
    sectorAllocation,
    geographicAllocation,
    domesticIntlAllocation,
    styleBoxAllocation,
  };
}
