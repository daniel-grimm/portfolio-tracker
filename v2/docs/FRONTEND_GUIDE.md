# Frontend Guide

Tech: React + Vite, TypeScript strict, Tailwind v4, Shadcn/ui, D3, TanStack Query, React Router v6, React Hook Form

---

## Directory Structure

```
client/src/
  pages/           # Route-level components
  components/
    ui/            # Shadcn components — DO NOT edit
    charts/        # D3 chart components
  context/         # React contexts
  hooks/           # (empty — hooks inline in pages for now)
  lib/
    api.ts         # All API calls
    auth.ts        # Better Auth client (createAuthClient, useSession, signIn, signOut)
```

---

## Pages

| File | Route | Description |
|------|-------|-------------|
| `Login.tsx` | `/login` | Google OAuth sign-in button |
| `Dashboard.tsx` | `/` | Portfolio breakdown, TTM income bar chart, projected income chart, top dividend payers |
| `Portfolios.tsx` | `/portfolios` | Card grid; create/edit/delete portfolios |
| `PortfolioDetail.tsx` | `/portfolios/:id` | Accounts list, portfolio value chart, aggregated holdings by ticker |
| `AccountDetail.tsx` | `/portfolios/:id/accounts/:accountId` | Holdings table with CRUD, CSV import, dividends list for this account |
| `Dividends.tsx` | `/dividends` | Stat cards, monthly calendar, full dividend log table with CRUD |

All pages except `/login` are wrapped in `AuthGuard`.

---

## Routing

Defined in `client/src/main.tsx` (or `App.tsx`). React Router v6 with `<BrowserRouter>`.

NavBar links: **VibeFolio** → `/` (Dashboard), **Dividends** → `/dividends`

Portfolio and account detail pages are navigated to via `<Link>` in the portfolio/account lists, not via the NavBar.

---

## Authentication

`client/src/lib/auth.ts` exports a Better Auth client:
```typescript
import { createAuthClient } from 'better-auth/react'
export const { useSession, signIn, signOut } = createAuthClient(...)
```

- `useSession()` — returns `{ data: { user, session } | null, isPending }`. Source of truth for the current user.
- `signIn.social({ provider: 'google', callbackURL: window.location.origin + '/' })` — initiates Google OAuth
- `signOut()` — clears session

**`AuthGuard`** component (`client/src/components/AuthGuard.tsx`):
- Reads `useSession()`
- Shows loading spinner while `isPending`
- Redirects to `/login` if no session
- Renders `children` if authenticated

---

## Theme System

Theme (`light` | `dark`) is persisted server-side in `user_preferences` and cached in `localStorage`.

**`ThemeProvider`** (`client/src/context/ThemeContext.tsx`):
- On mount: reads `localStorage` for immediate theme application (avoids flash)
- After auth: fetches `/api/user/preferences` and syncs DB theme (DB wins)
- On toggle: updates local state + `localStorage` immediately, debounces PATCH to server by 500ms
- Applies `.dark` class to `document.documentElement`

**`ThemeToggle`** (`client/src/components/ThemeToggle.tsx`):
- Sun/Moon icon button in NavBar
- Calls `useTheme().setTheme()`

**`useTheme()`** hook — from `ThemeContext`; throws if used outside `ThemeProvider`.

---

## Data Fetching Pattern

All server state uses **TanStack Query**. All API calls go through `client/src/lib/api.ts`.

```typescript
// Standard query pattern
const { data, isPending } = useQuery({
  queryKey: ['portfolios'],
  queryFn: getPortfolios,
})

// Standard mutation pattern
const mutation = useMutation({
  mutationFn: createPortfolio,
  onSuccess: () => {
    void queryClient.invalidateQueries({ queryKey: ['portfolios'] })
  },
})
```

Query key conventions used in the app:
- `['portfolios']` — all portfolios
- `['portfolio', id]` — single portfolio
- `['accounts', 'portfolio', portfolioId]` — accounts for a portfolio
- `['holdings', accountId]` — holdings for an account
- `['dividends', 'all']` — all dividends (DividendWithAccount[])
- `['dividends', 'account', accountId]` — dividends for an account
- `['dashboardSummary']` — DashboardSummary
- `['dashboardCalendar', year, month]` — CalendarDay[] for month
- `['projectedIncome']` — MonthlyProjection[]
- `['user', 'preferences']` — UserPreferences

---

## Forms

Forms use **React Hook Form** with native RHF validation (no `@hookform/resolvers` — Zod v4 incompatibility).

```typescript
const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
  defaultValues: { name: '' }
})

// Validation inline in register()
<Input {...register('name', { required: 'Name is required' })} />
{errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
```

Server-side validation uses Zod schemas in route handlers. The API returns `{ error: 'Invalid request body' }` on 400.

**Select fields** from Shadcn can't use `register()` directly — use `watch()` + `setValue()`:
```typescript
<Select value={watch('status')} onValueChange={(v) => setValue('status', v as DividendStatus)}>
```

---

## CSV Import

`CsvImportModal` (`client/src/components/CsvImportModal.tsx`) is a 3-step dialog:

1. **Upload** — download template link + file input
2. **Preview** — shows aggregated summary (ticker, total shares, weighted avg cost, lot count) before committing
3. **Result** — shows imported count

CSV format expected: `Ticker,Shares,AvgCostBasis,PurchaseDate` with dates as MM/DD/YYYY. The modal handles parsing and converts dates to YYYY-MM-DD before calling `importHoldings(accountId, lots)`.

Used in `AccountDetail.tsx`. Template download is from `/api/v1/holdings/import/template`.

---

## Charts

All charts are D3 components using `useRef` + `useEffect`. Located in `client/src/components/charts/`.

| Component | Data type | Used in |
|-----------|-----------|---------|
| `PortfolioValueChart` | `PortfolioValuePoint[]` | `PortfolioDetail` |
| `IncomeBarChart` | `DividendWithAccount[]` + `ChartMonth[]` | `Dashboard` |
| `ProjectedIncomeChart` | `MonthlyProjection[]` | `Dashboard` |

`IncomeBarChart` takes a `months` prop (array of `{ year, month, label }`) to define which months to display. On Dashboard this is the trailing 12 months (TTM).

---

## Shadcn/ui Components in Use

`Button`, `Card`/`CardContent`/`CardHeader`/`CardTitle`, `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`/`DialogFooter`, `AlertDialog` (and sub-components), `Input`, `Label`, `Select`/`SelectContent`/`SelectItem`/`SelectTrigger`/`SelectValue`, `Table`/`TableBody`/`TableCell`/`TableHead`/`TableHeader`/`TableRow`, `Skeleton`, `Popover`/`PopoverContent`/`PopoverTrigger`, `Avatar`/`AvatarFallback`/`AvatarImage`, `DropdownMenu` (and sub-components), `Sonner` (toast)

Add new Shadcn components via: `npx shadcn@latest add <component>`

---

## NavBar

`client/src/components/NavBar.tsx`:
- Left: "VibeFolio" logo link + "Dividends" nav link
- Right: `ThemeToggle` + user avatar dropdown (shows name, logout)
- Uses `useSession()` for user info and `signOut()` for logout

---

## ErrorBoundary

`client/src/components/ErrorBoundary.tsx` — class component catching render errors. Wraps the app in `main.tsx`.

---

## Numeric Values

Drizzle returns `numeric` PostgreSQL columns as strings. The shared types use `string` for these fields (`shares`, `avgCostBasis`, `amountPerShare`, `totalAmount`, `closePrice`, etc.). Always parse with `parseFloat()` or `Number()` before arithmetic or display formatting.

```typescript
// Display pattern
`$${Number(d.totalAmount).toFixed(2)}`
// or
`$${parseFloat(d.amountPerShare).toFixed(4)}/sh`
```

---

## Environment Variables (client)

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Base URL for API calls (e.g. `http://localhost:3000` in dev) |
