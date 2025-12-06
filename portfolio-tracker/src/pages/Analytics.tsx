import { Typography, Box } from '@mui/material';
import { useCalculations } from '../hooks/useCalculations';
import { StyleBoxGrid } from '../components/analytics/StyleBoxGrid';
import { SectorBreakdown } from '../components/analytics/SectorBreakdown';
import { GeographicBreakdown } from '../components/analytics/GeographicBreakdown';
import { DomesticIntlSplit } from '../components/analytics/DomesticIntlSplit';

export function Analytics() {
  const {
    styleBoxAllocation,
    sectorAllocation,
    geographicAllocation,
    domesticIntlAllocation,
    enrichedPositions,
  } = useCalculations();

  if (enrichedPositions.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h5" color="text.secondary" gutterBottom>
          No Portfolio Data
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Add positions to your portfolio to see analytics
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
        Portfolio Analytics
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' },
          gap: 3,
        }}
      >
        <StyleBoxGrid allocation={styleBoxAllocation} />
        <SectorBreakdown allocation={sectorAllocation} />
        <GeographicBreakdown allocation={geographicAllocation} />
        <DomesticIntlSplit allocation={domesticIntlAllocation} />
      </Box>
    </Box>
  );
}
