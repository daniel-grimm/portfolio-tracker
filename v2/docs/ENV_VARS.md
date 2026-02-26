# Environment Variables

## Server (`server/src/env.ts`)

Validated with Zod on startup. Missing required variables cause `process.exit(1)`.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | Neon Postgres connection string |
| `BETTER_AUTH_SECRET` | Yes | — | Secret for Better Auth session signing (min 32 chars recommended) |
| `GOOGLE_CLIENT_ID` | Yes | — | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | — | Google OAuth client secret |
| `FINNHUB_API_KEY` | Yes | — | Finnhub API key (primary price source) |
| `FINNHUB_FETCH_DELAY_MS` | No | `1100` | Delay between Finnhub requests in milliseconds. Free tier limit is 60 req/min; 1100ms keeps well under that. |
| `ALPHA_VANTAGE_API_KEY` | Yes | — | Alpha Vantage API key (fallback for mutual funds; 25 req/day free tier) |
| `BASE_URL` | Yes | — | Public URL of the server (e.g. `https://api.vibefolio.com`). Used by Better Auth for OAuth callbacks. |
| `CLIENT_ORIGIN` | No | `http://localhost:5173` | Allowed CORS origin. Set to the frontend URL in production. |
| `PORT` | No | `3000` | Port the Express server listens on. |

## Client (Vite)

Set in `client/.env` (dev) or deployment environment.

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | Yes | Base URL for all API calls (e.g. `http://localhost:3000` in dev, `https://api.vibefolio.com` in prod). Used in `client/src/lib/api.ts` and `CsvImportModal.tsx`. |

## Local Development Setup

Create `server/.env`:
```
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=your-secret-here
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
FINNHUB_API_KEY=...
ALPHA_VANTAGE_API_KEY=...
BASE_URL=http://localhost:3000
CLIENT_ORIGIN=http://localhost:5173
```

Create `client/.env`:
```
VITE_API_BASE_URL=http://localhost:3000
```
