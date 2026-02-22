// Pure formatting utilities.

export function formatCurrency(amount: number): string {
  const abs = Math.abs(amount)
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs)
  return amount < 0 ? `-$${formatted}` : `$${formatted}`
}
