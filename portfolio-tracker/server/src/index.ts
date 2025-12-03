import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { stocksRouter } from './routes/stocks.js';
import { positionsRouter } from './routes/positions.js';
import { accountsRouter } from './routes/accounts.js';
import { errorHandler } from './middleware/errorHandler.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: '*',
  credentials: false
}));
app.use(express.json());

// Routes
app.use('/api/stocks', stocksRouter);
app.use('/api/positions', positionsRouter);
app.use('/api/accounts', accountsRouter);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API endpoints available at http://localhost:${PORT}/api`);
});
