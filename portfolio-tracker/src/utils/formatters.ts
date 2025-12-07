export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format an ISO date string (YYYY-MM-DD) without timezone conversion.
 * This prevents the date from shifting due to timezone differences.
 *
 * @param dateStr - ISO 8601 date string in YYYY-MM-DD format
 * @returns Formatted date string in local format
 */
export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  // Create date using local timezone by passing year, month, day separately
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return date.toLocaleDateString();
}
