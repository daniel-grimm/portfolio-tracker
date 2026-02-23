import { env } from '../env.js'
import type { PriceQuote } from 'shared'

type FinnhubQuoteResponse = {
  c: number  // current price
  d: number  // change
  dp: number // percent change
  h: number  // high
  l: number  // low
  o: number  // open
  pc: number // previous close
  t: number  // timestamp
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchFinnhubQuote(ticker: string): Promise<PriceQuote | null> {
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${env.FINNHUB_API_KEY}`
    const res = await fetch(url)
    if (!res.ok) return null

    const data = (await res.json()) as FinnhubQuoteResponse
    // Finnhub returns c=0 for unknown tickers
    if (!data || data.c === 0) return null

    return {
      ticker,
      closePrice: data.c,
      fetchedAt: new Date(),
    }
  } catch {
    return null
  }
}

export async function fetchFinnhubQuotesBatched(
  tickers: string[],
  options: { delayMs: number } = { delayMs: env.FINNHUB_FETCH_DELAY_MS },
): Promise<Map<string, PriceQuote | null>> {
  const result = new Map<string, PriceQuote | null>()

  for (let i = 0; i < tickers.length; i++) {
    if (i > 0) await delay(options.delayMs)
    const quote = await fetchFinnhubQuote(tickers[i])
    result.set(tickers[i], quote)
  }

  return result
}
