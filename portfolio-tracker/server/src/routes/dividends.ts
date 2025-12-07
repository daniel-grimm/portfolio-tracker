import { Router, type Request, type Response } from 'express';
import { dividendsService } from '../services/dividendsService.js';

export const dividendsRouter = Router();

// GET /api/dividends - Get all dividends
dividendsRouter.get('/', (_req: Request, res: Response) => {
  try {
    const dividends = dividendsService.getAll();
    res.json({ dividends });
  } catch (error) {
    console.error('Error fetching dividends:', error);
    res.status(500).json({
      error: 'Failed to fetch dividends',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/dividends/aggregated/quarterly - Get quarterly aggregated dividends
dividendsRouter.get('/aggregated/quarterly', (req: Request, res: Response) => {
  try {
    const count = req.query.count ? parseInt(req.query.count as string, 10) : 8;
    const quarters = dividendsService.getQuarterlyAggregated(count);
    res.json({ quarters });
  } catch (error) {
    console.error('Error fetching quarterly dividends:', error);
    res.status(500).json({
      error: 'Failed to fetch quarterly dividends',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/dividends/aggregated/yearly - Get yearly aggregated dividends
dividendsRouter.get('/aggregated/yearly', (req: Request, res: Response) => {
  try {
    const count = req.query.count ? parseInt(req.query.count as string, 10) : 5;
    const years = dividendsService.getYearlyAggregated(count);
    res.json({ years });
  } catch (error) {
    console.error('Error fetching yearly dividends:', error);
    res.status(500).json({
      error: 'Failed to fetch yearly dividends',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/dividends/growth/quarterly - Get quarter-over-quarter growth
dividendsRouter.get('/growth/quarterly', (req: Request, res: Response) => {
  try {
    const year = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear();
    const quarter = req.query.quarter
      ? parseInt(req.query.quarter as string, 10)
      : Math.ceil((new Date().getMonth() + 1) / 3);

    const growth = dividendsService.getQuarterOverQuarterGrowth(year, quarter);
    res.json(growth);
  } catch (error) {
    console.error('Error fetching quarterly growth:', error);
    res.status(500).json({
      error: 'Failed to fetch quarterly growth',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/dividends/growth/yearly - Get year-over-year growth
dividendsRouter.get('/growth/yearly', (req: Request, res: Response) => {
  try {
    const year = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear();
    const growth = dividendsService.getYearOverYearGrowth(year);
    res.json(growth);
  } catch (error) {
    console.error('Error fetching yearly growth:', error);
    res.status(500).json({
      error: 'Failed to fetch yearly growth',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/dividends/metrics/cagr - Get CAGR
dividendsRouter.get('/metrics/cagr', (_req: Request, res: Response) => {
  try {
    const cagr = dividendsService.getCAGR();
    res.json({ cagr });
  } catch (error) {
    console.error('Error fetching CAGR:', error);
    res.status(500).json({
      error: 'Failed to fetch CAGR',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/dividends/ticker/:ticker - Get dividends for a specific ticker
dividendsRouter.get('/ticker/:ticker', (req: Request, res: Response) => {
  try {
    const { ticker } = req.params;
    const dividends = dividendsService.getByTicker(ticker);
    res.json({ dividends });
  } catch (error) {
    console.error('Error fetching dividends by ticker:', error);
    res.status(500).json({
      error: 'Failed to fetch dividends',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/dividends/:id - Get a single dividend
dividendsRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const dividend = dividendsService.getById(id);

    if (!dividend) {
      res.status(404).json({ error: 'Dividend not found' });
      return;
    }

    res.json({ dividend });
  } catch (error) {
    console.error('Error fetching dividend:', error);
    res.status(500).json({
      error: 'Failed to fetch dividend',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/dividends - Create a new dividend
dividendsRouter.post('/', (req: Request, res: Response) => {
  try {
    const { dividend } = req.body;

    if (!dividend) {
      res.status(400).json({
        error: 'Missing required fields',
        details: 'Dividend data is required',
      });
      return;
    }

    if (!dividend.date || !dividend.amount || !dividend.ticker) {
      res.status(400).json({
        error: 'Missing required fields',
        details: 'Date, amount, and ticker are required',
      });
      return;
    }

    const created = dividendsService.create(dividend);
    res.status(201).json({ dividend: created });
  } catch (error) {
    console.error('Error creating dividend:', error);
    res.status(500).json({
      error: 'Failed to create dividend',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// PUT /api/dividends/:id - Update a dividend
dividendsRouter.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { dividend } = req.body;

    if (!dividend) {
      res.status(400).json({
        error: 'Missing required fields',
        details: 'Dividend data is required',
      });
      return;
    }

    const updated = dividendsService.update(id, dividend);

    if (!updated) {
      res.status(404).json({ error: 'Dividend not found' });
      return;
    }

    res.json({ dividend: updated });
  } catch (error) {
    console.error('Error updating dividend:', error);
    res.status(500).json({
      error: 'Failed to update dividend',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// DELETE /api/dividends/:id - Delete a dividend
dividendsRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = dividendsService.delete(id);

    if (!success) {
      res.status(404).json({ error: 'Dividend not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting dividend:', error);
    res.status(500).json({
      error: 'Failed to delete dividend',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
