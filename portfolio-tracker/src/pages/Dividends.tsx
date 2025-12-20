import { Box, Typography } from '@mui/material';
import { useState } from 'react';
import { useCalculations } from '../hooks/useCalculations';
import { useDividends } from '../hooks/useDividends';
import { usePortfolio } from '../context/PortfolioContext';
import { MetricCard } from '../components/common/MetricCard';
import { DividendCharts } from '../components/dividends/DividendCharts';
import { DividendGrowthMetrics } from '../components/dividends/DividendGrowthMetrics';
import { AddDividendDialog } from '../components/dividends/AddDividendDialog';
import { EditDividendDialog } from '../components/dividends/EditDividendDialog';
import { AnnounceDividendDialog } from '../components/dividends/AnnounceDividendDialog';
import { DividendHistoryTable } from '../components/dividends/DividendHistoryTable';
import { formatCurrency, formatPercent } from '../utils/formatters';
import type { Dividend } from '../types/dividend.types';

export function Dividends() {
  const { portfolioMetrics } = useCalculations();
  const { quarterlyData, yearlyData, metrics, isLoading, refresh } = useDividends();
  const { dividends } = usePortfolio();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [announceDialogOpen, setAnnounceDialogOpen] = useState(false);
  const [dividendToEdit, setDividendToEdit] = useState<Dividend | null>(null);

  const handleEdit = (dividend: Dividend) => {
    setDividendToEdit(dividend);
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setDividendToEdit(null);
  };

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
      {metrics && <DividendGrowthMetrics metrics={metrics} yearlyData={yearlyData} />}

      {/* Add Dividend Dialog */}
      <AddDividendDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={refresh}
      />

      {/* Edit Dividend Dialog */}
      <EditDividendDialog
        open={editDialogOpen}
        onClose={handleCloseEditDialog}
        dividend={dividendToEdit}
      />

      {/* Announce Dividend Dialog */}
      <AnnounceDividendDialog
        open={announceDialogOpen}
        onClose={() => setAnnounceDialogOpen(false)}
        onSuccess={refresh}
      />

      {/* Bottom Section - Dividend History Table */}
      <DividendHistoryTable
        dividends={dividends}
        onDelete={refresh}
        onEdit={handleEdit}
        onAdd={() => setDialogOpen(true)}
        onAnnounce={() => setAnnounceDialogOpen(true)}
      />
    </Box>
  );
}
