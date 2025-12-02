import type {
  AggregatedPosition,
  PositionMetadata,
  PortfolioMetrics,
  SectorAllocation,
  GeographicAllocation,
  DomesticIntlAllocation,
} from "../types/portfolio.types";
import { isEtfOrMutualFund } from "../types/stock.types";

export function enrichPosition(
  position: AggregatedPosition
): PositionMetadata | null {
  // Stock data is already attached to the aggregated position
  const stock = position.stock;

  if (!stock) {
    console.error(`Stock data not found for position: ${position.ticker}`);
    return null;
  }

  const currentValue = position.totalQuantity * stock.currentPrice;
  const totalCost = position.totalQuantity * position.weightedAverageCostBasis;
  const gainLoss = currentValue - totalCost;
  const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;
  const dividendYield =
    stock.currentPrice > 0
      ? (stock.annualDividend / stock.currentPrice) * 100
      : 0;
  const yieldOnCost =
    position.weightedAverageCostBasis > 0
      ? (stock.annualDividend / position.weightedAverageCostBasis) * 100
      : 0;
  const annualIncome = position.totalQuantity * stock.annualDividend;

  return {
    ...position,
    currentValue,
    totalCost,
    gainLoss,
    gainLossPercent,
    dividendYield,
    yieldOnCost,
    annualIncome,
  };
}

export function calculatePortfolioMetrics(
  enrichedPositions: PositionMetadata[]
): PortfolioMetrics {
  if (enrichedPositions.length === 0) {
    return {
      totalValue: 0,
      totalCost: 0,
      totalGainLoss: 0,
      totalGainLossPercent: 0,
      totalAnnualIncome: 0,
      averageDividendYield: 0,
      averageYieldOnCost: 0,
    };
  }

  const totalValue = enrichedPositions.reduce(
    (sum, p) => sum + p.currentValue,
    0
  );
  const totalCost = enrichedPositions.reduce((sum, p) => sum + p.totalCost, 0);
  const totalGainLoss = totalValue - totalCost;
  const totalGainLossPercent =
    totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
  const totalAnnualIncome = enrichedPositions.reduce(
    (sum, p) => sum + p.annualIncome,
    0
  );

  // Weighted average dividend yield
  const averageDividendYield =
    totalValue > 0
      ? enrichedPositions.reduce(
          (sum, p) => sum + p.dividendYield * p.currentValue,
          0
        ) / totalValue
      : 0;

  // Weighted average yield on cost
  const averageYieldOnCost =
    totalValue > 0
      ? enrichedPositions.reduce(
          (sum, p) => sum + p.yieldOnCost * p.currentValue,
          0
        ) / totalValue
      : 0;

  return {
    totalValue,
    totalCost,
    totalGainLoss,
    totalGainLossPercent,
    totalAnnualIncome,
    averageDividendYield,
    averageYieldOnCost,
  };
}

export function calculateSectorAllocation(
  enrichedPositions: PositionMetadata[]
): SectorAllocation {
  const totalValue = enrichedPositions.reduce(
    (sum, p) => sum + p.currentValue,
    0
  );

  if (totalValue === 0) {
    return {};
  }

  const sectorTotals: { [sector: string]: number } = {};

  enrichedPositions.forEach((position) => {
    const stock = position.stock;

    if (isEtfOrMutualFund(stock) && stock.sectorAllocations) {
      // ETF/Mutual Fund: distribute value across sectors proportionally
      Object.entries(stock.sectorAllocations).forEach(([sector, pct]) => {
        if (!sectorTotals[sector]) {
          sectorTotals[sector] = 0;
        }
        sectorTotals[sector] += position.currentValue * (pct / 100);
      });
    } else {
      // Stock: add full value to single sector
      const sector = stock.sector;
      if (!sectorTotals[sector]) {
        sectorTotals[sector] = 0;
      }
      sectorTotals[sector] += position.currentValue;
    }
  });

  const sectorAllocation: SectorAllocation = {};
  Object.keys(sectorTotals).forEach((sector) => {
    sectorAllocation[sector] = (sectorTotals[sector] / totalValue) * 100;
  });

  return sectorAllocation;
}

export function calculateGeographicAllocation(
  enrichedPositions: PositionMetadata[]
): GeographicAllocation {
  const totalValue = enrichedPositions.reduce(
    (sum, p) => sum + p.currentValue,
    0
  );

  if (totalValue === 0) {
    return {};
  }

  const countryTotals: { [country: string]: number } = {};

  enrichedPositions.forEach((position) => {
    const stock = position.stock;

    if (isEtfOrMutualFund(stock) && stock.countryAllocations) {
      // ETF/Mutual Fund: distribute value across countries proportionally
      Object.entries(stock.countryAllocations).forEach(([country, pct]) => {
        if (!countryTotals[country]) {
          countryTotals[country] = 0;
        }
        countryTotals[country] += position.currentValue * (pct / 100);
      });
    } else {
      // Stock: add full value to single country
      const country = stock.country;
      if (!countryTotals[country]) {
        countryTotals[country] = 0;
      }
      countryTotals[country] += position.currentValue;
    }
  });

  const geoAllocation: GeographicAllocation = {};
  Object.keys(countryTotals).forEach((country) => {
    geoAllocation[country] = (countryTotals[country] / totalValue) * 100;
  });

  return geoAllocation;
}

export function calculateDomesticIntlAllocation(
  enrichedPositions: PositionMetadata[]
): DomesticIntlAllocation {
  const totalValue = enrichedPositions.reduce(
    (sum, p) => sum + p.currentValue,
    0
  );

  if (totalValue === 0) {
    return { domestic: 0, international: 0 };
  }

  let domesticValue = 0;

  enrichedPositions.forEach((position) => {
    const stock = position.stock;

    if (isEtfOrMutualFund(stock) && stock.countryAllocations) {
      // ETF/Mutual Fund: calculate domestic portion from US allocation percentage
      const usPercentage = stock.countryAllocations["US"] || 0;
      domesticValue += position.currentValue * (usPercentage / 100);
    } else {
      // Stock: add full value if domestic
      if (stock.isDomestic) {
        domesticValue += position.currentValue;
      }
    }
  });

  const internationalValue = totalValue - domesticValue;

  return {
    domestic: (domesticValue / totalValue) * 100,
    international: (internationalValue / totalValue) * 100,
  };
}
