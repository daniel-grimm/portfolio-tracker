# Portfolio Tracker

A full-stack stock tracker application for monitoring and managing investment portfolios with real-time stock data and persistent storage.

# Project Architecture

The application follows a client-server architecture with clear separation of concerns:

```
portfolio-tracker/
├── portfolio-tracker/           # Frontend React application
│   ├── src/
│   │   ├── components/         # Reusable React components
│   │   │   ├── analytics/      # Analytics visualizations
│   │   │   ├── portfolio/      # Portfolio management components
│   │   │   ├── layout/         # Layout components (Header, etc.)
│   │   │   └── common/         # Shared UI components
│   │   ├── pages/              # Page-level components
│   │   ├── services/           # API integration layer
│   │   │   ├── finnhubService.ts    # Finnhub API client
│   │   │   ├── stockDataService.ts  # Stock data aggregation
│   │   │   └── holdingsApi.ts       # Backend API client
│   │   ├── context/            # React Context for state management
│   │   ├── hooks/              # Custom React hooks
│   │   ├── types/              # TypeScript type definitions
│   │   └── utils/              # Utility functions
│   └── public/                 # Static assets
│
└── server/                     # Backend Express application
    ├── src/
    │   ├── database/           # Database layer
    │   │   ├── db.ts          # SQLite connection & configuration
    │   │   └── migrations.ts  # Database schema migrations
    │   ├── routes/             # API route handlers
    │   │   └── holdings.ts    # Holdings CRUD endpoints
    │   ├── services/           # Business logic layer
    │   │   └── holdingsService.ts
    │   ├── middleware/         # Express middleware
    │   │   └── errorHandler.ts
    │   └── index.ts            # Server entry point
    └── data/                   # SQLite database files
```

# Development

## Getting Started

### Backend Server Setup

1. Navigate to the server directory:

   ```bash
   cd portfolio-tracker/server
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file with required environment variables:

   ```bash
   PORT=3001
   DATABASE_PATH=./data/portfolio.db
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

The backend server will run on `http://localhost:3001` with the following endpoints:

- `GET /health` - Health check endpoint
- `GET /api/holdings` - Fetch all holdings
- `POST /api/holdings` - Create a new holding
- `PUT /api/holdings/:id` - Update a holding
- `DELETE /api/holdings/:id` - Delete a holding

### Frontend Application Setup

1. Navigate to the frontend directory:

   ```bash
   cd portfolio-tracker
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env.local` file with your Finnhub API key:

   ```bash
   VITE_FINNHUB_API_TOKEN=your_api_key_here
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Available Scripts

### Frontend (`portfolio-tracker/`)

- `npm run dev` - Start the Vite development server
- `npm run build` - Build the application for production (TypeScript check + Vite build)
- `npm run lint` - Run ESLint to check code quality
- `npm run preview` - Preview the production build locally

### Backend (`portfolio-tracker/server/`)

- `npm run dev` - Start the Express server with hot reload (tsx watch)
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run the production build

# Data Integration

## SQLite Database

The application uses SQLite for persistent, local data storage with the following features:

**Database Configuration**:

- **Library**: better-sqlite3
- **Location**: `server/data/portfolio.db`
- **Journal Mode**: WAL (Write-Ahead Logging)
- **Migrations**: Automated schema management on server startup

**Schema**:

```sql
CREATE TABLE holdings (
  id TEXT PRIMARY KEY,
  ticker TEXT NOT NULL,
  quantity REAL NOT NULL,
  cost_basis REAL NOT NULL,
  purchase_date TEXT,
  stock_data_snapshot TEXT NOT NULL,  -- JSON snapshot of stock data
  created_at INTEGER DEFAULT (unixepoch())
);
```

## Finnhub API Integration

The application integrates with Finnhub for real-time market data:

**API Endpoints Used**:

- **Quote API** (`/quote`): Real-time stock prices and daily statistics
- **Company Profile** (`/stock/profile2`): Company information and market cap
- **Symbol Search** (`/search`): Ticker validation and lookup

**Data Fetched**:

- Current price (c), High (h), Low (l), Open (o), Previous Close (pc)
- Company name, country, industry, and IPO date
- Market capitalization for automatic size classification
- Company logo and ticker symbol

**Implementation Details**:

- Parallel API requests for quote and profile data
- Error handling for invalid tickers and API failures
- TypeScript interfaces for type-safe API responses
- API key configuration via environment variables
- Combines Finnhub data with user-provided classifications (sector, style, dividends)

**Rate Limits**:

- Finnhub free tier: 60 API calls/minute
- Application caches stock data snapshots in the database to minimize API calls

# Technical Implementation

## Frontend Architecture

- **State Management**: React Context API for portfolio state
- **Type Safety**: Full TypeScript coverage with strict mode
- **Styling**: Emotion CSS-in-JS with Material-UI theme integration
- **API Layer**: Separate service modules for Finnhub and backend communication
- **Component Structure**: Feature-based organization (analytics, portfolio, layout)

## Backend Architecture

- **RESTful API**: Express routes with proper HTTP methods and status codes
- **Error Handling**: Centralized middleware for consistent error responses
- **Database Layer**: Separation of concerns (migrations, connection, queries)
- **Business Logic**: Service layer for holdings operations
- **Environment Configuration**: dotenv for environment variables
