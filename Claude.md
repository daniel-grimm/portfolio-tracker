# Portfolio Tracker

A full-stack stock tracker application for monitoring and managing investment portfolios with real-time stock data and persistent storage.

# Project Architecture

The application follows a client-server architecture with clear separation of concerns:

```
portfolio-tracker/           # Frontend React application
├── src/
│   ├── components/         # Reusable React components
│   │   ├── analytics/      # Analytics visualizations
│   │   ├── portfolio/      # Portfolio management components
│   │   ├── dividends/      # Dividend tracking components
│   │   ├── stocks/         # Stock management components
│   │   ├── layout/         # Layout components (Header, etc.)
│   │   └── common/         # Shared UI components
│   ├── pages/              # Page-level components
│   │   ├── Dashboard.tsx   # Main portfolio dashboard
│   │   ├── Tickers.tsx     # Stock ticker management
│   │   ├── Dividends.tsx   # Dividend tracking and analytics
│   │   └── Analytics.tsx   # Portfolio analytics
│   ├── services/           # API integration layer
│   │   ├── ...
│   ├── context/            # React Context for state management
│   ├── hooks/              # Custom React hooks
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Utility functions
├── server/                 # Backend Express application
│   ├── src/
│   │   ├── database/           # Database layer
│   │   │   ├── db.ts          # SQLite connection & configuration
│   │   │   └── migrations.ts  # Database schema migrations
│   │   ├── routes/             # API route handlers
│   │   │   ├── ...
│   │   ├── services/           # Business logic layer
│   │   │   ├── ...
│   │   ├── middleware/         # Express middleware
│   │   │   └── errorHandler.ts
│   │   └── index.ts            # Server entry point
│   └── data/                   # SQLite database files
└── public/                 # Static assets
```

# Development

## Getting Started

### Backend Server Setup

1. Navigate to the server directory:

   ```bash
   cd portfolio-tracker/portfolio-tracker/server
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

The backend server will run on `http://localhost:3001`.

### Frontend Application Setup

1. Navigate to the frontend directory:

   ```bash
   cd portfolio-tracker
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env.local` file with your API keys:

   ```bash
   VITE_FINNHUB_API_TOKEN=your_finnhub_api_key_here
   VITE_ALPHAVANTAGE_API_TOKEN=your_alphavantage_api_key_here
   VITE_API_URL=http://localhost:3001
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Available Scripts

### Frontend (`portfolio-tracker/portfolio-tracker/`)

- `npm run dev` - Start the Vite development server
- `npm run build` - Build the application for production (TypeScript check + Vite build)
- `npm run lint` - Run ESLint to check code quality
- `npm run preview` - Preview the production build locally

### Backend (`portfolio-tracker/portfolio-tracker/server/`)

- `npm run dev` - Start the Express server with hot reload (tsx watch)
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run the production build

# Data Integration

## SQLite Database

The application uses SQLite for persistent, local data storage with the following features:

**Database Configuration**:

- **Library**: better-sqlite3
- **Location**: `portfolio-tracker/server/data/portfolio.db`
- **Journal Mode**: WAL (Write-Ahead Logging)
- **Migrations**: Automated schema management on server startup

Refer to `portfolio-tracker/server/data/schema.md` for details about the table schema.

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
- Application caches stock data in the database to minimize API calls

## AlphaVantage API Integration

The application integrates with AlphaVantage for mutual fund data:

**API Endpoints Used**:

- **Global Quote API** (`GLOBAL_QUOTE`): Current price for mutual funds and other securities not available on Finnhub

**Data Fetched**:

- Current price for mutual funds (e.g., FXAIX, VTSAX)
- Normalized to match Finnhub's quote interface for consistency

**Implementation Details**:

- Used specifically for mutual fund quotes where Finnhub doesn't provide data
- Returns normalized quote format (`{ c: price }`) matching Finnhub interface
- Error handling for invalid tickers and API failures
- TypeScript interfaces for type-safe API responses
- API key configuration via environment variables (`VITE_ALPHAVANTAGE_API_TOKEN`)

**Rate Limits**:

- AlphaVantage free tier: 25 API calls/day, 5 calls/minute
- Very limited free tier - use sparingly for mutual funds only

# Security Type Support

- **Stocks**: Individual company stocks with Finnhub integration
- **ETFs**: Exchange-traded funds with sector/country allocations
- **Mutual Funds**: Mutual funds with AlphaVantage integration

# Technical Implementation

## Frontend Architecture

- **State Management**: React Context API for portfolio state
- **Type Safety**: Full TypeScript coverage with strict mode
- **Styling**: Emotion CSS-in-JS with Material-UI theme integration
- **API Layer**: Separate service modules for Finnhub, AlphaVantage, and backend communication
- **Component Structure**: Feature-based organization (analytics, portfolio, dividends, stocks, layout)
- **Hooks**: Custom React hooks for calculations, dividends, and portfolio data

## Backend Architecture

- **RESTful API**: Express routes with proper HTTP methods and status codes
- **Error Handling**: Centralized middleware for consistent error responses
- **Database Layer**: Separation of concerns (migrations, connection, queries)
- **Business Logic**: Service layer for stocks, positions, accounts, and dividends operations
- **Environment Configuration**: dotenv for environment variables
- **Normalized Data Model**: Stocks table as single source of truth with positions, accounts, and dividends referencing it
