import { Box, Button, Typography } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useState } from 'react';
import { useCalculations } from '../hooks/useCalculations';
import { useDividends } from '../hooks/useDividends';
import { usePortfolio } from '../context/PortfolioContext';
import { MetricCard } from '../components/common/MetricCard';
import { DividendCharts } from '../components/dividends/DividendCharts';
import { DividendGrowthMetrics } from '../components/dividends/DividendGrowthMetrics';
import { AddDividendDialog } from '../components/dividends/AddDividendDialog';
import { DividendHistoryTable } from '../components/dividends/DividendHistoryTable';
import { formatCurrency, formatPercent } from '../utils/formatters';

export function Dividends() {
  const { portfolioMetrics } = useCalculations();
  const { quarterlyData, yearlyData, metrics, isLoading, refresh } = useDividends();
  const { dividends } = usePortfolio();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography>Loading dividend data...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Top Section - Three Metric Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          gap: 3,
          mb: 4,
        }}
      >
        <MetricCard
          title="Annual Dividend Income"
          value={formatCurrency(portfolioMetrics.totalAnnualIncome)}
          subtitle={`Per Month: ${formatCurrency(portfolioMetrics.totalAnnualIncome / 12)}`}
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

      {/* Middle Section - Two Stacked Bar Charts */}
      <DividendCharts quarterlyData={quarterlyData} yearlyData={yearlyData} />

      {/* Growth Metrics Cards */}
      {metrics && <DividendGrowthMetrics metrics={metrics} />}

      {/* Add Dividend Button */}
      <Box sx={{ mt: 4, mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Add Dividend
        </Button>
      </Box>

      {/* Add Dividend Dialog */}
      <AddDividendDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={refresh}
      />

      {/* Bottom Section - Dividend History Table */}
      <DividendHistoryTable dividends={dividends} onDelete={refresh} />
    </Box>
  );
}
