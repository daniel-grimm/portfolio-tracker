import { Router, type Request, type Response } from 'express';
import { accountService } from '../services/accountsService.js';

export const accountsRouter = Router();

// GET /api/accounts - Get all accounts
accountsRouter.get('/', (_req: Request, res: Response) => {
  try {
    const accounts = accountService.getAll();
    res.json({ accounts });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({
      error: 'Failed to fetch accounts',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/accounts/:id - Get a single account
accountsRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const account = accountService.getById(id);

    if (!account) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }

    res.json({ account });
  } catch (error) {
    console.error('Error fetching account:', error);
    res.status(500).json({
      error: 'Failed to fetch account',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/accounts - Create a new account
accountsRouter.post('/', (req: Request, res: Response) => {
  try {
    const { account } = req.body;

    if (!account) {
      res.status(400).json({
        error: 'Missing required fields',
        details: 'Account data is required'
      });
      return;
    }

    if (!account.name || !account.platform) {
      res.status(400).json({
        error: 'Missing required fields',
        details: 'name and platform are required'
      });
      return;
    }

    const newAccount = accountService.create(account);
    res.status(201).json({ account: newAccount });
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({
      error: 'Failed to create account',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/accounts/:id - Update an account
accountsRouter.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { account } = req.body;

    if (!account) {
      res.status(400).json({
        error: 'Missing required fields',
        details: 'Account data is required'
      });
      return;
    }

    if (!account.name || !account.platform) {
      res.status(400).json({
        error: 'Missing required fields',
        details: 'name and platform are required'
      });
      return;
    }

    const updatedAccount = accountService.update(id, account);

    if (!updatedAccount) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }

    res.json({ account: updatedAccount });
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({
      error: 'Failed to update account',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/accounts/:id - Delete an account
accountsRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if account has positions before allowing deletion
    if (accountService.hasPositions(id)) {
      res.status(400).json({
        error: 'Cannot delete account with positions',
        details: 'Please remove or reassign all positions from this account before deleting it'
      });
      return;
    }

    const deleted = accountService.delete(id);

    if (!deleted) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({
      error: 'Failed to delete account',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
