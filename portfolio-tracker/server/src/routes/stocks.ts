import { Router, type Request, type Response } from 'express';
import { stockService } from '../services/stockService.js';

export const stocksRouter = Router();

// GET /api/stocks - Get all stocks
stocksRouter.get('/', (_req: Request, res: Response) => {
  try {
    const stocks = stockService.getAll();
    res.json({ stocks });
  } catch (error) {
    console.error('Error fetching stocks:', error);
    res.status(500).json({
      error: 'Failed to fetch stocks',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/stocks/:ticker - Get a single stock
stocksRouter.get('/:ticker', (req: Request, res: Response) => {
  try {
    const { ticker } = req.params;
    const stock = stockService.getByTicker(ticker);

    if (!stock) {
      res.status(404).json({ error: 'Stock not found' });
      return;
    }

    res.json({ stock });
  } catch (error) {
    console.error('Error fetching stock:', error);
    res.status(500).json({
      error: 'Failed to fetch stock',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/stocks - Create a new stock
stocksRouter.post('/', (req: Request, res: Response) => {
  try {
    const { stock } = req.body;

    if (!stock) {
      res.status(400).json({
        error: 'Missing required fields',
        details: 'Stock data is required'
      });
      return;
    }

    if (!stock.ticker || !stock.name || stock.currentPrice === undefined) {
      res.status(400).json({
        error: 'Missing required fields',
        details: 'ticker, name, and currentPrice are required'
      });
      return;
    }

    const newStock = stockService.upsert(stock);
    res.status(201).json({ stock: newStock });
  } catch (error) {
    console.error('Error creating stock:', error);
    res.status(500).json({
      error: 'Failed to create stock',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/stocks/:ticker - Update a stock
stocksRouter.put('/:ticker', (req: Request, res: Response) => {
  try {
    const { ticker } = req.params;
    const { stock } = req.body;

    if (!stock) {
      res.status(400).json({
        error: 'Missing required fields',
        details: 'Stock data is required'
      });
      return;
    }

    const updatedStock = stockService.update(ticker, stock);

    if (!updatedStock) {
      res.status(404).json({ error: 'Stock not found' });
      return;
    }

    res.json({ stock: updatedStock });
  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({
      error: 'Failed to update stock',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/stocks/:ticker - Delete a stock
stocksRouter.delete('/:ticker', (req: Request, res: Response) => {
  try {
    const { ticker } = req.params;
    const deleted = stockService.delete(ticker);

    if (!deleted) {
      res.status(404).json({ error: 'Stock not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting stock:', error);
    res.status(500).json({
      error: 'Failed to delete stock',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
