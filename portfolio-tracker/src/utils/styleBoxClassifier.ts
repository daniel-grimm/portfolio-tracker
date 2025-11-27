import type {
  HoldingMetadata,
  StyleBoxAllocation,
} from "../types/portfolio.types";
import type { MarketCap, Style } from "../types/stock.types";

export function calculateStyleBoxAllocation(
  enrichedHoldings: HoldingMetadata[]
): StyleBoxAllocation {
  const totalValue = enrichedHoldings.reduce(
    (sum, h) => sum + h.currentValue,
    0
  );

  const allocation: StyleBoxAllocation = {
    largeValue: 0,
    largeBlend: 0,
    largeGrowth: 0,
    midValue: 0,
    midBlend: 0,
    midGrowth: 0,
    smallValue: 0,
    smallBlend: 0,
    smallGrowth: 0,
  };

  if (totalValue === 0) {
    return allocation;
  }

  enrichedHoldings.forEach((holding) => {
    const { marketCap, style } = holding.stockData;
    const key = getStyleBoxKey(marketCap, style);
    allocation[key] += holding.currentValue;
  });

  // Convert to percentages
  Object.keys(allocation).forEach((key) => {
    allocation[key as keyof StyleBoxAllocation] =
      (allocation[key as keyof StyleBoxAllocation] / totalValue) * 100;
  });

  return allocation;
}

function getStyleBoxKey(
  marketCap: MarketCap,
  style: Style
): keyof StyleBoxAllocation {
  const key = `${marketCap}${capitalize(style)}`;
  return key as keyof StyleBoxAllocation;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
