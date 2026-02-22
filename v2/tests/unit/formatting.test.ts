import { describe, it, expect } from 'vitest'
import { formatCurrency } from '../../server/src/lib/formatting.js'

describe('formatCurrency', () => {
  it('$0 → $0.00', () => {
    expect(formatCurrency(0)).toBe('$0.00')
  })

  it('whole number with 2 decimal places', () => {
    expect(formatCurrency(100)).toBe('$100.00')
  })

  it('already has cents', () => {
    expect(formatCurrency(12.34)).toBe('$12.34')
  })

  it('rounds to 2 decimal places', () => {
    expect(formatCurrency(1.005)).toBe('$1.01')
  })

  it('large number uses commas', () => {
    expect(formatCurrency(1000)).toBe('$1,000.00')
  })

  it('negative amount', () => {
    expect(formatCurrency(-50)).toBe('-$50.00')
  })
})
