# Database Schema

Source of truth: `server/src/db/schema.ts`. Never edit the database directly — all changes go through Drizzle migrations.

---

## Tables

### `portfolios`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default random |
| `user_id` | text | NOT NULL |
| `name` | text | NOT NULL |
| `description` | text | nullable |
| `created_at` | timestamptz | NOT NULL, default now |
| `updated_at` | timestamptz | NOT NULL, default now |

Index: `portfolios_user_id_idx` on `user_id`

---

### `accounts`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default random |
| `portfolio_id` | uuid | NOT NULL, FK → portfolios.id (cascade delete) |
| `name` | text | NOT NULL |
| `description` | text | nullable |
| `created_at` | timestamptz | NOT NULL, default now |
| `updated_at` | timestamptz | NOT NULL, default now |

Index: `accounts_portfolio_id_idx` on `portfolio_id`

---

### `holdings`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default random |
| `account_id` | uuid | NOT NULL, FK → accounts.id (cascade delete) |
| `ticker` | text | NOT NULL |
| `shares` | numeric(18,6) | NOT NULL |
| `avg_cost_basis` | numeric(18,6) | NOT NULL |
| `purchase_date` | date | NOT NULL |
| `created_at` | timestamptz | NOT NULL, default now |
| `updated_at` | timestamptz | NOT NULL, default now |

Index: `holdings_account_id_idx` on `account_id`

Note: Multiple rows with the same ticker under the same account are allowed (individual lots).

---

### `dividends`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default random |
| `account_id` | uuid | NOT NULL, FK → accounts.id (cascade delete) |
| `ticker` | text | NOT NULL |
| `amount_per_share` | numeric(18,6) | NOT NULL |
| `total_amount` | numeric(18,6) | NOT NULL |
| `pay_date` | date | NOT NULL |
| `projected_per_share` | numeric(18,6) | nullable |
| `projected_payout` | numeric(18,6) | nullable |
| `status` | enum | NOT NULL, default `'scheduled'` |
| `created_at` | timestamptz | NOT NULL, default now |
| `updated_at` | timestamptz | NOT NULL, default now |

Enum `dividend_status`: `'scheduled'`, `'projected'`, `'paid'`

Indexes:
- `dividends_account_id_idx` on `account_id`
- `dividends_pay_date_idx` on `pay_date`

**Design notes:**
- `account_id` is the parent — dividends are scoped to an account + ticker, not to a specific holding lot
- `total_amount` is user-entered (not calculated from shares × amount_per_share)
- `projected_per_share` and `projected_payout` are populated only for `status = 'projected'` entries and show estimated future values with `~` prefix in the UI

---

### `price_history`

| Column | Type | Constraints |
|--------|------|-------------|
| `ticker` | text | PK (composite) |
| `date` | date | PK (composite) |
| `close_price` | numeric(18,6) | NOT NULL |
| `fetched_at` | timestamptz | NOT NULL, default now |

Composite PK: `(ticker, date)` — one price per ticker per day

Indexes:
- `price_history_ticker_idx` on `ticker`
- `price_history_date_idx` on `date`

Shared across all users. Prices are fetched once per ticker per day on server startup.

---

### `portfolio_value_history`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default random |
| `portfolio_id` | uuid | NOT NULL, FK → portfolios.id (cascade delete) |
| `date` | date | NOT NULL |
| `total_value` | numeric(18,6) | NOT NULL |
| `cost_basis` | numeric(18,6) | NOT NULL |
| `is_partial` | boolean | NOT NULL, default false |
| `created_at` | timestamptz | NOT NULL, default now |

Unique index: `portfolio_value_history_portfolio_date_idx` on `(portfolio_id, date)` — upserted daily

`is_partial = true` when one or more ticker prices were unavailable during snapshot creation.

---

### `dividend_cache`

| Column | Type | Constraints |
|--------|------|-------------|
| `ticker` | text | PK |
| `payload` | jsonb | NOT NULL |
| `fetched_at` | timestamptz | NOT NULL, default now |

Present in schema but currently unused in application code. Reserved for future use.

---

### Better Auth Tables

Better Auth manages its own tables (`user`, `session`, `account`, `verification`) via `npx @better-auth/cli generate` and `npx better-auth migrate`. Schema defined in `server/src/db/auth-schema.ts`.

---

## Relationships

```
portfolios (user_id → Better Auth user)
  └── accounts (portfolio_id)
        ├── holdings (account_id)
        └── dividends (account_id + ticker)

portfolios
  └── portfolio_value_history (portfolio_id)
```

---

## Migration History

| Migration | Change |
|-----------|--------|
| `0000_...` | Initial schema: portfolios, accounts, holdings, price_history, portfolio_value_history |
| `0001_...` | Added dividends table (original design with holdingId, exDate, recordDate) |
| `0002_...` | Added dividend_cache table |
| `0003_...` | (Better Auth migration — user/session tables) |
| `0004_...` | **Dividend redesign:** removed `holding_id`, `ex_date`, `record_date`; changed parent to `account_id`; added `projected_per_share`, `projected_payout`; `total_amount` became user-entered |

---

## Commands

```bash
npm run db:generate   # Generate migration after editing schema.ts
npm run db:migrate    # Apply pending migrations
npm run db:studio     # Open Drizzle Studio (visual DB browser)
```
