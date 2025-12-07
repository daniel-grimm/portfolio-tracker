import { Box } from '@mui/material';
import { MetricCard } from '../common/MetricCard';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import type { DividendMetrics } from '../../types/dividend.types';

interface DividendGrowthMetricsProps {
  metrics: DividendMetrics;
}

export function DividendGrowthMetrics({ metrics }: DividendGrowthMetricsProps) {
  const getGrowthColor = (percent: number) => {
    if (percent > 0) return 'success';
    if (percent < 0) return 'error';
    return 'default';
  };

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
        gap: 3,
        mb: 4,
      }}
    >
      <MetricCard
        title="Quarter over Quarter Growth"
        value={formatCurrency(metrics.quarterlyGrowth.growthAmount)}
        subtitle={formatPercent(metrics.quarterlyGrowth.growthPercent)}
        color={getGrowthColor(metrics.quarterlyGrowth.growthPercent)}
      />
      <MetricCard
        title="Year over Year Growth"
        value={formatCurrency(metrics.yearlyGrowth.growthAmount)}
        subtitle={formatPercent(metrics.yearlyGrowth.growthPercent)}
        color={getGrowthColor(metrics.yearlyGrowth.growthPercent)}
      />
      <MetricCard
        title="Dividend CAGR"
        value={formatPercent(metrics.cagr)}
        color={getGrowthColor(metrics.cagr)}
      />
    </Box>
  );
}
