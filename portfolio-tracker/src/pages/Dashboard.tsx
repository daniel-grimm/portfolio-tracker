import { Box } from '@mui/material';
import { useCalculations } from '../hooks/useCalculations';
import { MetricCard } from '../components/common/MetricCard';
import { PortfolioTable } from '../components/portfolio/PortfolioTable';
import { formatCurrency, formatPercent } from '../utils/formatters';

export function Dashboard() {
  const { enrichedHoldings, portfolioMetrics } = useCalculations();

  const getGainLossColor = (value: number) => {
    if (value > 0) return 'success';
    if (value < 0) return 'error';
    return 'default';
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          gap: 3,
          mb: 4,
        }}
      >
        <MetricCard
          title="Total Portfolio Value"
          value={formatCurrency(portfolioMetrics.totalValue)}
        />
        <MetricCard
          title="Total Cost Basis"
          value={formatCurrency(portfolioMetrics.totalCost)}
        />
        <MetricCard
          title="Total Gain/Loss"
          value={formatCurrency(portfolioMetrics.totalGainLoss)}
          subtitle={formatPercent(portfolioMetrics.totalGainLossPercent)}
          color={getGainLossColor(portfolioMetrics.totalGainLoss)}
        />
        <MetricCard
          title="Annual Dividend Income"
          value={formatCurrency(portfolioMetrics.totalAnnualIncome)}
          subtitle={`Avg Yield: ${formatPercent(portfolioMetrics.averageDividendYield)}`}
        />
        <MetricCard
          title="Average Dividend Yield"
          value={formatPercent(portfolioMetrics.averageDividendYield)}
        />
        <MetricCard
          title="Average Yield on Cost"
          value={formatPercent(portfolioMetrics.averageYieldOnCost)}
        />
      </Box>
      <PortfolioTable holdings={enrichedHoldings} />
    </Box>
  );
}
