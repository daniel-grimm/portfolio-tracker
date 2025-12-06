import type {
  PositionMetadata,
  StyleBoxAllocation,
} from "../types/portfolio.types";
import type { MarketCap, Style } from "../types/stock.types";
import { isEtfOrMutualFund } from "../types/stock.types";

export function calculateStyleBoxAllocation(
  enrichedPositions: PositionMetadata[]
): StyleBoxAllocation {
  const totalValue = enrichedPositions.reduce(
    (sum, p) => sum + p.currentValue,
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

  enrichedPositions.forEach((position) => {
    const stock = position.stock;

    console.log(stock.styleMarketCapAllocations);

    if (isEtfOrMutualFund(stock) && stock.styleMarketCapAllocations) {
      // ETF/Mutual Fund: distribute value proportionally across style-market cap categories
      Object.entries(stock.styleMarketCapAllocations).forEach(([key, pct]) => {
        allocation[key as keyof StyleBoxAllocation] +=
          position.currentValue * (pct / 100);
      });
    } else {
      // Stock (or ETF without allocations): add full value to single category
      const { marketCap, style } = stock;
      const key = getStyleBoxKey(marketCap, style);
      allocation[key] += position.currentValue;
    }
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
