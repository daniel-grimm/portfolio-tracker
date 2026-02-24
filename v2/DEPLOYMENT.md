# Deployment Guide

## Architecture

| Component | Platform |
|---|---|
| Frontend | Azure Static Web Apps |
| Backend | Docker container (Azure Container Apps, Railway, Render, etc.) |
| Database | Neon (Postgres) |
| Auth | Better Auth — Google OAuth |

---

## Prerequisites

- Neon project created and `DATABASE_URL` connection string available
- Google Cloud OAuth 2.0 credentials (Client ID + Secret)
- Finnhub API key (free tier)
- Alpha Vantage API key (free tier)

---

## 1. Database setup (first deploy only)

Migrations run automatically when the server starts. No manual step needed.

If you need to run migrations manually:
```bash
cd server
npx tsx migrate.ts
npx @better-auth/cli generate  # generates auth tables in Neon
```

---

## 2. Backend — Docker

### Build

```bash
# From repo root
docker build -f server/Dockerfile -t vibefolio-server .
```

### Environment variables (required)

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon connection string |
| `BETTER_AUTH_SECRET` | Long random string (openssl rand -hex 32) |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |
| `FINNHUB_API_KEY` | Finnhub API key |
| `FINNHUB_FETCH_DELAY_MS` | Delay between Finnhub requests (default: 1100) |
| `ALPHA_VANTAGE_API_KEY` | Alpha Vantage API key |
| `BASE_URL` | Public URL of the backend (e.g. https://api.vibefolio.example.com) |
| `PORT` | Port to listen on (default: 3000) |

### Run

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="..." \
  -e BETTER_AUTH_SECRET="..." \
  -e GOOGLE_CLIENT_ID="..." \
  -e GOOGLE_CLIENT_SECRET="..." \
  -e FINNHUB_API_KEY="..." \
  -e ALPHA_VANTAGE_API_KEY="..." \
  -e BASE_URL="https://api.vibefolio.example.com" \
  vibefolio-server
```

---

## 3. Frontend — Azure Static Web Apps

### Build

```bash
cd client
npm run build
# Output: client/dist/
```

### Deploy

Upload `client/dist/` to Azure Static Web Apps. The `staticwebapp.config.json`
at the root of the build directory handles SPA routing (all paths → `index.html`).

### Environment variables (build-time)

Set in your CI/CD or Azure Static Web Apps build configuration:

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend URL (e.g. https://api.vibefolio.example.com) |

---

## 4. Google OAuth — redirect URIs

In Google Cloud Console → APIs & Services → Credentials, add these **Authorized redirect URIs**:

```
https://api.vibefolio.example.com/api/auth/callback/google
```

Replace `api.vibefolio.example.com` with your actual backend domain.

---

## 5. Smoke test checklist

After deploying:

- [ ] `GET https://api.vibefolio.example.com/health` → `{ "ok": true }`
- [ ] Navigate to the frontend URL → redirected to `/login`
- [ ] Click "Continue with Google" → OAuth completes → lands on `/`
- [ ] Create a portfolio
- [ ] Add an account
- [ ] Add a holding (e.g. VTI)
- [ ] Wait for next server startup or redeploy → verify portfolio value chart appears
- [ ] Navigate to Calendar → current month grid renders
- [ ] Navigate to Dashboard → stat cards show YTD income (may be $0 if no dividends yet)

---

## 6. CORS

The backend CORS origin is currently hardcoded to `http://localhost:5173` in `server/src/index.ts`.

For production, update it to your frontend domain:

```typescript
cors({
  origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  credentials: true,
})
```

Add `CLIENT_ORIGIN` to your production environment variables.
