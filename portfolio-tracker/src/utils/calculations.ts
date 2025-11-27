import type {
  Holding,
  HoldingMetadata,
  PortfolioMetrics,
  SectorAllocation,
  GeographicAllocation,
  DomesticIntlAllocation,
} from "../types/portfolio.types";

export function enrichHolding(holding: Holding): HoldingMetadata | null {
  // Use the stock data snapshot stored with the holding
  const stockData = holding.stockDataSnapshot;

  if (!stockData) {
    console.error(`Stock data snapshot not found for holding: ${holding.ticker}`);
    return null;
  }

  const currentValue = holding.quantity * stockData.currentPrice;
  const totalCost = holding.quantity * holding.costBasis;
  const gainLoss = currentValue - totalCost;
  const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;
  const dividendYield =
    stockData.currentPrice > 0
      ? (stockData.annualDividend / stockData.currentPrice) * 100
      : 0;
  const yieldOnCost =
    holding.costBasis > 0
      ? (stockData.annualDividend / holding.costBasis) * 100
      : 0;
  const annualIncome = holding.quantity * stockData.annualDividend;

  return {
    ...holding,
    stockData,
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
  enrichedHoldings: HoldingMetadata[]
): PortfolioMetrics {
  if (enrichedHoldings.length === 0) {
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

  const totalValue = enrichedHoldings.reduce(
    (sum, h) => sum + h.currentValue,
    0
  );
  const totalCost = enrichedHoldings.reduce((sum, h) => sum + h.totalCost, 0);
  const totalGainLoss = totalValue - totalCost;
  const totalGainLossPercent =
    totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
  const totalAnnualIncome = enrichedHoldings.reduce(
    (sum, h) => sum + h.annualIncome,
    0
  );

  // Weighted average dividend yield
  const averageDividendYield =
    totalValue > 0
      ? enrichedHoldings.reduce(
          (sum, h) => sum + h.dividendYield * h.currentValue,
          0
        ) / totalValue
      : 0;

  // Weighted average yield on cost
  const averageYieldOnCost =
    totalValue > 0
      ? enrichedHoldings.reduce(
          (sum, h) => sum + h.yieldOnCost * h.currentValue,
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
  enrichedHoldings: HoldingMetadata[]
): SectorAllocation {
  const totalValue = enrichedHoldings.reduce(
    (sum, h) => sum + h.currentValue,
    0
  );

  if (totalValue === 0) {
    return {};
  }

  const sectorTotals: { [sector: string]: number } = {};

  enrichedHoldings.forEach((holding) => {
    const sector = holding.stockData.sector;
    if (!sectorTotals[sector]) {
      sectorTotals[sector] = 0;
    }
    sectorTotals[sector] += holding.currentValue;
  });

  const sectorAllocation: SectorAllocation = {};
  Object.keys(sectorTotals).forEach((sector) => {
    sectorAllocation[sector] = (sectorTotals[sector] / totalValue) * 100;
  });

  return sectorAllocation;
}

export function calculateGeographicAllocation(
  enrichedHoldings: HoldingMetadata[]
): GeographicAllocation {
  const totalValue = enrichedHoldings.reduce(
    (sum, h) => sum + h.currentValue,
    0
  );

  if (totalValue === 0) {
    return {};
  }

  const countryTotals: { [country: string]: number } = {};

  enrichedHoldings.forEach((holding) => {
    const country = holding.stockData.country;
    if (!countryTotals[country]) {
      countryTotals[country] = 0;
    }
    countryTotals[country] += holding.currentValue;
  });

  const geoAllocation: GeographicAllocation = {};
  Object.keys(countryTotals).forEach((country) => {
    geoAllocation[country] = (countryTotals[country] / totalValue) * 100;
  });

  return geoAllocation;
}

export function calculateDomesticIntlAllocation(
  enrichedHoldings: HoldingMetadata[]
): DomesticIntlAllocation {
  const totalValue = enrichedHoldings.reduce(
    (sum, h) => sum + h.currentValue,
    0
  );

  if (totalValue === 0) {
    return { domestic: 0, international: 0 };
  }

  const domesticValue = enrichedHoldings
    .filter((h) => h.stockData.isDomestic)
    .reduce((sum, h) => sum + h.currentValue, 0);

  const internationalValue = totalValue - domesticValue;

  return {
    domestic: (domesticValue / totalValue) * 100,
    international: (internationalValue / totalValue) * 100,
  };
}
