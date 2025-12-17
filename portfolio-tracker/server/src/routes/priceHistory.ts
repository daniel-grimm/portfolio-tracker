import { Router, type Request, type Response } from "express";
import { priceHistoryService } from "../services/priceHistoryService.js";
import { positionsService } from "../services/positionsService.js";

export const priceHistoryRouter = Router();

/**
 * GET /api/price-history/portfolio-value?days=30
 * Calculate portfolio value over time using current positions and historical prices
 */
priceHistoryRouter.get("/portfolio-value", (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const endTime = Date.now();
    const startTime = endTime - days * 24 * 60 * 60 * 1000;

    // Get current positions (aggregated)
    const positions = positionsService.getAll();

    if (positions.length === 0) {
      res.json({ portfolioValues: [] });
      return;
    }

    // Get daily aggregated price history for the time range
    const dailyPrices = priceHistoryService.getDailyAggregated(
      startTime,
      endTime
    );

    // Group prices by date
    const pricesByDate = new Map<string, Map<string, number>>();
    dailyPrices.forEach(({ ticker, date, price }) => {
      if (!pricesByDate.has(date)) {
        pricesByDate.set(date, new Map());
      }
      pricesByDate.get(date)!.set(ticker, price);
    });

    // Calculate portfolio value for each date
    const portfolioValues = Array.from(pricesByDate.entries())
      .map(([date, prices]) => {
        let totalValue = 0;
        let hasAllPrices = true;

        // For each position, multiply quantity by historical price
        for (const position of positions) {
          const historicalPrice = prices.get(position.ticker);
          if (historicalPrice !== undefined) {
            totalValue += position.totalQuantity * historicalPrice;
          } else {
            // If we don't have price data for this ticker on this date, skip this date
            hasAllPrices = false;
            break;
          }
        }

        return hasAllPrices ? { date, value: totalValue } : null;
      })
      .filter(
        (entry): entry is { date: string; value: number } => entry !== null
      )
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({ portfolioValues });
  } catch (error) {
    console.error("Error calculating portfolio value:", error);
    res.status(500).json({
      error: "Failed to calculate portfolio value",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/price-history/:ticker?days=30
 * Get price history for a specific ticker
 */
priceHistoryRouter.get("/:ticker", (req: Request, res: Response) => {
  try {
    const { ticker } = req.params;
    const days = parseInt(req.query.days as string) || 30;
    const endTime = Date.now();
    const startTime = endTime - days * 24 * 60 * 60 * 1000;

    const priceHistory = priceHistoryService.getByTicker(
      ticker,
      startTime,
      endTime
    );

    res.json({ priceHistory });
  } catch (error) {
    console.error("Error fetching price history:", error);
    res.status(500).json({
      error: "Failed to fetch price history",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
