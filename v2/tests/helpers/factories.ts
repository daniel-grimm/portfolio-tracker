// Test data factories.
// Phase 2+ will update these to use the inferred Drizzle types from schema.ts.
// For now they return plain objects matching the expected shape.

let counter = 0
function nextId(): string {
  return `00000000-0000-0000-0000-${String(++counter).padStart(12, '0')}`
}

export function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: nextId(),
    email: `user-${counter}@example.com`,
    name: `User ${counter}`,
    ...overrides,
  }
}

export function makePortfolio(overrides: Record<string, unknown> = {}) {
  return {
    id: nextId(),
    userId: nextId(),
    name: `Portfolio ${counter}`,
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function makeAccount(overrides: Record<string, unknown> = {}) {
  return {
    id: nextId(),
    portfolioId: nextId(),
    name: `Account ${counter}`,
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function makeHolding(overrides: Record<string, unknown> = {}) {
  return {
    id: nextId(),
    accountId: nextId(),
    ticker: 'VTI',
    shares: '10.000000',
    avgCostBasis: '100.000000',
    purchaseDate: '2023-01-01',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function makeDividend(overrides: Record<string, unknown> = {}) {
  return {
    id: nextId(),
    accountId: '00000000-0000-0000-0000-000000000001',
    ticker: 'VTI',
    amountPerShare: '0.500000',
    totalAmount: '5.000000',
    payDate: '2024-01-15',
    projectedPerShare: null,
    projectedPayout: null,
    status: 'paid' as const,
    accountName: 'Test Account',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function makePriceHistory(overrides: Record<string, unknown> = {}) {
  return {
    ticker: 'VTI',
    date: new Date().toISOString().slice(0, 10),
    closePrice: '200.000000',
    fetchedAt: new Date(),
    ...overrides,
  }
}
