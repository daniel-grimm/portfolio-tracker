import {
  pgTable,
  pgEnum,
  uuid,
  text,
  numeric,
  date,
  boolean,
  timestamp,
  index,
  uniqueIndex,
  primaryKey,
  jsonb,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ── Enums ────────────────────────────────────────────────────────────────────

export const dividendStatusEnum = pgEnum('dividend_status', [
  'scheduled',
  'projected',
  'paid',
])

// ── Tables ───────────────────────────────────────────────────────────────────

export const portfolios = pgTable(
  'portfolios',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('portfolios_user_id_idx').on(t.userId)],
)

export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    portfolioId: uuid('portfolio_id')
      .notNull()
      .references(() => portfolios.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('accounts_portfolio_id_idx').on(t.portfolioId)],
)

export const holdings = pgTable(
  'holdings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    ticker: text('ticker').notNull(),
    shares: numeric('shares', { precision: 18, scale: 6 }).notNull(),
    avgCostBasis: numeric('avg_cost_basis', { precision: 18, scale: 6 }).notNull(),
    purchaseDate: date('purchase_date').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('holdings_account_id_idx').on(t.accountId)],
)

export const dividends = pgTable(
  'dividends',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    ticker: text('ticker').notNull(),
    amountPerShare: numeric('amount_per_share', { precision: 18, scale: 6 }).notNull(),
    totalAmount: numeric('total_amount', { precision: 18, scale: 6 }).notNull(),
    payDate: date('pay_date').notNull(),
    projectedPerShare: numeric('projected_per_share', { precision: 18, scale: 6 }),
    projectedPayout: numeric('projected_payout', { precision: 18, scale: 6 }),
    status: dividendStatusEnum('status').notNull().default('scheduled'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('dividends_account_id_idx').on(t.accountId),
    index('dividends_pay_date_idx').on(t.payDate),
  ],
)

export const priceHistory = pgTable(
  'price_history',
  {
    ticker: text('ticker').notNull(),
    date: date('date').notNull(),
    closePrice: numeric('close_price', { precision: 18, scale: 6 }).notNull(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.ticker, t.date] }),
    index('price_history_ticker_idx').on(t.ticker),
    index('price_history_date_idx').on(t.date),
  ],
)

export const portfolioValueHistory = pgTable(
  'portfolio_value_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    portfolioId: uuid('portfolio_id')
      .notNull()
      .references(() => portfolios.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    totalValue: numeric('total_value', { precision: 18, scale: 6 }).notNull(),
    costBasis: numeric('cost_basis', { precision: 18, scale: 6 }).notNull(),
    isPartial: boolean('is_partial').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('portfolio_value_history_portfolio_date_idx').on(t.portfolioId, t.date),
  ],
)

export const dividendCache = pgTable('dividend_cache', {
  ticker: text('ticker').primaryKey(),
  payload: jsonb('payload').notNull(),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
})

// ── Relations ─────────────────────────────────────────────────────────────────

export const portfoliosRelations = relations(portfolios, ({ many }) => ({
  accounts: many(accounts),
  valueHistory: many(portfolioValueHistory),
}))

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  portfolio: one(portfolios, {
    fields: [accounts.portfolioId],
    references: [portfolios.id],
  }),
  holdings: many(holdings),
  dividends: many(dividends),
}))

export const holdingsRelations = relations(holdings, ({ one }) => ({
  account: one(accounts, {
    fields: [holdings.accountId],
    references: [accounts.id],
  }),
}))

export const dividendsRelations = relations(dividends, ({ one }) => ({
  account: one(accounts, {
    fields: [dividends.accountId],
    references: [accounts.id],
  }),
}))

export const portfolioValueHistoryRelations = relations(portfolioValueHistory, ({ one }) => ({
  portfolio: one(portfolios, {
    fields: [portfolioValueHistory.portfolioId],
    references: [portfolios.id],
  }),
}))
