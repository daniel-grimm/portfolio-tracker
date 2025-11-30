import { Router, type Request, type Response } from 'express';
import { positionsService } from '../services/positionsService.js';

export const positionsRouter = Router();

// GET /api/positions - Get all positions
positionsRouter.get('/', (_req: Request, res: Response) => {
  try {
    const positions = positionsService.getAll();
    res.json({ positions });
  } catch (error) {
    console.error('Error fetching positions:', error);
    res.status(500).json({
      error: 'Failed to fetch positions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/positions/aggregated - Get aggregated positions
positionsRouter.get('/aggregated', (_req: Request, res: Response) => {
  try {
    const positions = positionsService.getAggregatedPositions();
    res.json({ positions });
  } catch (error) {
    console.error('Error fetching aggregated positions:', error);
    res.status(500).json({
      error: 'Failed to fetch aggregated positions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/positions/ticker/:ticker - Get positions for a specific ticker
positionsRouter.get('/ticker/:ticker', (req: Request, res: Response) => {
  try {
    const { ticker } = req.params;
    const positions = positionsService.getByTicker(ticker);
    res.json({ positions });
  } catch (error) {
    console.error('Error fetching positions by ticker:', error);
    res.status(500).json({
      error: 'Failed to fetch positions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/positions/:id - Get a single position
positionsRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const position = positionsService.getById(id);

    if (!position) {
      res.status(404).json({ error: 'Position not found' });
      return;
    }

    res.json({ position });
  } catch (error) {
    console.error('Error fetching position:', error);
    res.status(500).json({
      error: 'Failed to fetch position',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/positions - Create a new position
positionsRouter.post('/', (req: Request, res: Response) => {
  try {
    const { position } = req.body;

    if (!position) {
      res.status(400).json({
        error: 'Missing required fields',
        details: 'Position data is required'
      });
      return;
    }

    if (!position.ticker || !position.quantity || !position.costBasis) {
      res.status(400).json({
        error: 'Missing required fields',
        details: 'ticker, quantity, and costBasis are required'
      });
      return;
    }

    const newPosition = positionsService.create(position);
    res.status(201).json({ position: newPosition });
  } catch (error) {
    console.error('Error creating position:', error);

    // Check if error is due to missing stock
    if (error instanceof Error && error.message.includes('does not exist')) {
      res.status(400).json({
        error: 'Stock not found',
        details: error.message
      });
      return;
    }

    res.status(500).json({
      error: 'Failed to create position',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/positions/:id - Update a position
positionsRouter.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { position } = req.body;

    if (!position) {
      res.status(400).json({
        error: 'Missing required fields',
        details: 'Position data is required'
      });
      return;
    }

    const updatedPosition = positionsService.update(id, position);

    if (!updatedPosition) {
      res.status(404).json({ error: 'Position not found' });
      return;
    }

    res.json({ position: updatedPosition });
  } catch (error) {
    console.error('Error updating position:', error);
    res.status(500).json({
      error: 'Failed to update position',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/positions/ticker/:ticker - Delete all positions for a ticker
positionsRouter.delete('/ticker/:ticker', (req: Request, res: Response) => {
  try {
    const { ticker } = req.params;
    const count = positionsService.deleteAllByTicker(ticker);

    if (count === 0) {
      res.status(404).json({ error: 'No positions found for this ticker' });
      return;
    }

    res.json({ success: true, count });
  } catch (error) {
    console.error('Error deleting positions for ticker:', error);
    res.status(500).json({
      error: 'Failed to delete positions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/positions/:id - Delete a position
positionsRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = positionsService.delete(id);

    if (!deleted) {
      res.status(404).json({ error: 'Position not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting position:', error);
    res.status(500).json({
      error: 'Failed to delete position',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
