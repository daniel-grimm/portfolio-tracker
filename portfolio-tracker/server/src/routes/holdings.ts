import { Router, type Request, type Response } from 'express';
import { holdingsService, type Holding } from '../services/holdingsService.js';

export const holdingsRouter = Router();

// GET /api/holdings - Get all holdings
holdingsRouter.get('/', (_req: Request, res: Response) => {
  try {
    const holdings = holdingsService.getAll();
    res.json({ holdings });
  } catch (error) {
    console.error('Error fetching holdings:', error);
    res.status(500).json({
      error: 'Failed to fetch holdings',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/holdings/:id - Get a single holding by ID
holdingsRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const holding = holdingsService.getById(id);

    if (!holding) {
      res.status(404).json({ error: 'Holding not found' });
      return;
    }

    res.json({ holding });
  } catch (error) {
    console.error('Error fetching holding:', error);
    res.status(500).json({
      error: 'Failed to fetch holding',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/holdings - Create a new holding
holdingsRouter.post('/', (req: Request, res: Response) => {
  try {
    const holdingData: Omit<Holding, 'id'> = req.body;

    // Basic validation
    if (!holdingData.ticker || !holdingData.quantity || !holdingData.costBasis || !holdingData.stockDataSnapshot) {
      res.status(400).json({
        error: 'Missing required fields',
        details: 'ticker, quantity, costBasis, and stockDataSnapshot are required'
      });
      return;
    }

    const newHolding = holdingsService.create(holdingData);
    res.status(201).json({ holding: newHolding });
  } catch (error) {
    console.error('Error creating holding:', error);
    res.status(500).json({
      error: 'Failed to create holding',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/holdings/:id - Update an existing holding
holdingsRouter.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const holdingData: Omit<Holding, 'id'> = req.body;

    // Basic validation
    if (!holdingData.ticker || !holdingData.quantity || !holdingData.costBasis || !holdingData.stockDataSnapshot) {
      res.status(400).json({
        error: 'Missing required fields',
        details: 'ticker, quantity, costBasis, and stockDataSnapshot are required'
      });
      return;
    }

    const updatedHolding = holdingsService.update(id, holdingData);

    if (!updatedHolding) {
      res.status(404).json({ error: 'Holding not found' });
      return;
    }

    res.json({ holding: updatedHolding });
  } catch (error) {
    console.error('Error updating holding:', error);
    res.status(500).json({
      error: 'Failed to update holding',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/holdings/:id - Delete a holding
holdingsRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = holdingsService.delete(id);

    if (!deleted) {
      res.status(404).json({ error: 'Holding not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting holding:', error);
    res.status(500).json({
      error: 'Failed to delete holding',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
