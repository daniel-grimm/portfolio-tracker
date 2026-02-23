import { env } from '../env.js'
import type { PriceQuote } from 'shared'

type AlphaVantageResponse = {
  'Global Quote': {
    '01. symbol': string
    '05. price': string
    '07. latest trading day': string
    [key: string]: string
  }
}

export async function fetchAlphaVantageQuote(ticker: string): Promise<PriceQuote | null> {
  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(ticker)}&apikey=${env.ALPHA_VANTAGE_API_KEY}`
    const res = await fetch(url)
    if (!res.ok) return null

    const data = (await res.json()) as AlphaVantageResponse
    const quote = data?.['Global Quote']
    if (!quote || !quote['05. price']) return null

    const price = parseFloat(quote['05. price'])
    if (isNaN(price) || price === 0) return null

    return {
      ticker,
      closePrice: price,
      fetchedAt: new Date(),
    }
  } catch {
    return null
  }
}
