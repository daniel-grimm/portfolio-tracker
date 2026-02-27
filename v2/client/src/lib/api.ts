import type {
  Portfolio,
  CreatePortfolioInput,
  UpdatePortfolioInput,
  Account,
  CreateAccountInput,
  UpdateAccountInput,
  Holding,
  AggregatedHolding,
  CreateHoldingInput,
  UpdateHoldingInput,
  Dividend,
  DividendWithAccount,
  CreateDividendInput,
  UpdateDividendInput,
  PriceHistory,
  PortfolioValuePoint,
  ValueHistoryRange,
  DashboardSummary,
  CalendarDay,
  MonthlyProjection,
  ImportHoldingsResult,
  UserPreferences,
  Theme,
  TTMIncomeData,
} from 'shared'

const BASE = import.meta.env.VITE_API_BASE_URL as string

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((body as { error?: string }).error ?? res.statusText)
  }
  const body = (await res.json()) as { data: T }
  return body.data
}

// Portfolios

export function getPortfolios(): Promise<Portfolio[]> {
  return request<Portfolio[]>('/api/v1/portfolios')
}

export function getPortfolio(id: string): Promise<Portfolio> {
  return request<Portfolio>(`/api/v1/portfolios/${id}`)
}

export function createPortfolio(input: CreatePortfolioInput): Promise<Portfolio> {
  return request<Portfolio>('/api/v1/portfolios', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updatePortfolio(id: string, input: UpdatePortfolioInput): Promise<Portfolio> {
  return request<Portfolio>(`/api/v1/portfolios/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function deletePortfolio(id: string): Promise<null> {
  return request<null>(`/api/v1/portfolios/${id}`, { method: 'DELETE' })
}

// Accounts

export function getAccounts(portfolioId: string): Promise<Account[]> {
  return request<Account[]>(`/api/v1/portfolios/${portfolioId}/accounts`)
}

export function getAccount(id: string): Promise<Account> {
  return request<Account>(`/api/v1/accounts/${id}`)
}

export function createAccount(portfolioId: string, input: CreateAccountInput): Promise<Account> {
  return request<Account>(`/api/v1/portfolios/${portfolioId}/accounts`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateAccount(id: string, input: UpdateAccountInput): Promise<Account> {
  return request<Account>(`/api/v1/accounts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function deleteAccount(id: string): Promise<null> {
  return request<null>(`/api/v1/accounts/${id}`, { method: 'DELETE' })
}

// Holdings

export function getHoldings(accountId: string): Promise<Holding[]> {
  return request<Holding[]>(`/api/v1/accounts/${accountId}/holdings`)
}

export function getAllHoldings(): Promise<AggregatedHolding[]> {
  return request<AggregatedHolding[]>('/api/v1/holdings')
}

export function getHolding(id: string): Promise<Holding> {
  return request<Holding>(`/api/v1/holdings/${id}`)
}

export function createHolding(accountId: string, input: CreateHoldingInput): Promise<Holding> {
  return request<Holding>(`/api/v1/accounts/${accountId}/holdings`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateHolding(id: string, input: UpdateHoldingInput): Promise<Holding> {
  return request<Holding>(`/api/v1/holdings/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function deleteHolding(id: string): Promise<null> {
  return request<null>(`/api/v1/holdings/${id}`, { method: 'DELETE' })
}

export function importHoldings(
  accountId: string,
  lots: CreateHoldingInput[],
): Promise<ImportHoldingsResult> {
  return request<ImportHoldingsResult>(`/api/v1/accounts/${accountId}/holdings/import`, {
    method: 'POST',
    body: JSON.stringify({ holdings: lots }),
  })
}

// Dividends

export function getDividendsForAccount(accountId: string): Promise<Dividend[]> {
  return request<Dividend[]>(`/api/v1/accounts/${accountId}/dividends`)
}

export function getAllDividends(): Promise<DividendWithAccount[]> {
  return request<DividendWithAccount[]>('/api/v1/dividends')
}

export function createDividend(accountId: string, input: CreateDividendInput): Promise<Dividend> {
  return request<Dividend>(`/api/v1/accounts/${accountId}/dividends`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateDividend(id: string, input: UpdateDividendInput): Promise<Dividend> {
  return request<Dividend>(`/api/v1/dividends/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function deleteDividend(id: string): Promise<null> {
  return request<null>(`/api/v1/dividends/${id}`, { method: 'DELETE' })
}

// Prices

export async function getLatestPrice(ticker: string): Promise<PriceHistory | null> {
  try {
    return await request<PriceHistory>(`/api/v1/prices/${ticker}`)
  } catch {
    return null
  }
}

// Dashboard

export function getDashboardSummary(): Promise<DashboardSummary> {
  return request<DashboardSummary>('/api/v1/dashboard/summary')
}

export function getDashboardCalendar(year: number, month: number): Promise<CalendarDay[]> {
  return request<CalendarDay[]>(`/api/v1/dashboard/calendar?year=${year}&month=${month}`)
}

export function getProjectedIncome(): Promise<MonthlyProjection[]> {
  return request<MonthlyProjection[]>('/api/v1/dashboard/projected-income')
}

export function getTTMIncome(): Promise<TTMIncomeData> {
  return request<TTMIncomeData>('/api/v1/dashboard/ttm-income')
}

// User preferences

export function getUserPreferences(): Promise<UserPreferences> {
  return request<UserPreferences>('/api/user/preferences')
}

export function patchUserPreferences(theme: Theme): Promise<UserPreferences> {
  return request<UserPreferences>('/api/user/preferences', {
    method: 'PATCH',
    body: JSON.stringify({ theme }),
  })
}

// Portfolio value history

export function getValueHistory(
  portfolioId: string,
  range: ValueHistoryRange = 'all',
): Promise<PortfolioValuePoint[]> {
  return request<PortfolioValuePoint[]>(
    `/api/v1/portfolios/${portfolioId}/value-history?range=${range}`,
  )
}
