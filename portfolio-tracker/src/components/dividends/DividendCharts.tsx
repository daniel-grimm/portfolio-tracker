import { Box, Paper, Typography } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { QuarterlyDividend, YearlyDividend } from '../../types/dividend.types';
import { formatCurrency } from '../../utils/formatters';

interface DividendChartsProps {
  quarterlyData: QuarterlyDividend[];
  yearlyData: YearlyDividend[];
}

// Color palette for tickers (10 colors for variety)
const TICKER_COLORS = [
  '#1976d2',
  '#dc004e',
  '#2e7d32',
  '#ed6c02',
  '#9c27b0',
  '#00897b',
  '#d32f2f',
  '#0288d1',
  '#f57c00',
  '#5e35b1',
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    name: string;
    value: number;
    color: string;
    payload: {
      period: string;
      total: number;
      [key: string]: any;
    };
  }>;
  label?: string;
}

const CustomDividendTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const total = payload[0]?.payload?.total || 0;

  return (
    <Box
      sx={{
        backgroundColor: '#1a1a1a',
        border: '1px solid #444',
        borderRadius: '4px',
        padding: '8px',
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1, color: '#fff' }}>
        {label}
      </Typography>
      {payload.map((entry, index) => (
        <Typography
          key={index}
          variant="body2"
          sx={{ color: entry.color, my: 0.5 }}
        >
          {entry.name}: {formatCurrency(entry.value)}
        </Typography>
      ))}
      <Box
        sx={{
          borderTop: '1px solid #444',
          mt: 1,
          pt: 1,
        }}
      >
        <Typography
          variant="body2"
          sx={{ fontWeight: 'bold', color: '#fff' }}
        >
          Total: {formatCurrency(total)}
        </Typography>
      </Box>
    </Box>
  );
};

export function DividendCharts({ quarterlyData, yearlyData }: DividendChartsProps) {
  // Transform quarterly data for Recharts stacked bar format
  const quarterlyChartData = quarterlyData.map((q) => ({
    period: q.quarter,
    total: q.total,
    ...q.dividends,
  }));

  // Transform yearly data for Recharts stacked bar format
  const yearlyChartData = yearlyData.map((y) => ({
    period: y.year.toString(),
    total: y.total,
    ...y.dividends,
  }));

  // Get unique tickers across all data and sort alphabetically for consistent coloring
  const allTickers = new Set<string>();
  quarterlyData.forEach((q) => Object.keys(q.dividends).forEach((t) => allTickers.add(t)));
  yearlyData.forEach((y) => Object.keys(y.dividends).forEach((t) => allTickers.add(t)));
  const tickers = Array.from(allTickers).sort();

  // Empty state
  if (tickers.length === 0) {
    return (
      <Paper sx={{ p: 3, mb: 4, backgroundColor: "primary.dark" }} elevation={2}>
        <Typography variant="h6" gutterBottom>
          Dividend Charts
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          No dividend data available. Add dividends to see charts.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' },
        gap: 3,
        mb: 4,
      }}
    >
      {/* Quarterly Chart */}
      <Paper sx={{ p: 3, backgroundColor: 'primary.dark' }} elevation={2}>
        <Typography variant="h6" gutterBottom>
          Quarterly Dividends (Past 8 Quarters)
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={quarterlyChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis
              label={{
                value: 'Dividend Amount ($)',
                angle: -90,
                position: 'insideLeft',
              }}
            />
            <Tooltip content={<CustomDividendTooltip />} />
            <Legend />
            {tickers.map((ticker, index) => (
              <Bar
                key={ticker}
                dataKey={ticker}
                stackId="a"
                fill={TICKER_COLORS[index % TICKER_COLORS.length]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      {/* Yearly Chart */}
      <Paper sx={{ p: 3, backgroundColor: 'primary.dark' }} elevation={2}>
        <Typography variant="h6" gutterBottom>
          Annual Dividends (Past 5 Years)
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={yearlyChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis
              label={{
                value: 'Dividend Amount ($)',
                angle: -90,
                position: 'insideLeft',
              }}
            />
            <Tooltip content={<CustomDividendTooltip />} />
            <Legend />
            {tickers.map((ticker, index) => (
              <Bar
                key={ticker}
                dataKey={ticker}
                stackId="a"
                fill={TICKER_COLORS[index % TICKER_COLORS.length]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </Paper>
    </Box>
  );
}
