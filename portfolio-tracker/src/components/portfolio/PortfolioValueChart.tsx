import { Box, Paper, Typography, CircularProgress } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useEffect, useState } from 'react';
import { getPortfolioValueHistory, type PortfolioValuePoint } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: PortfolioValuePoint;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <Box
      sx={{
        backgroundColor: '#1a1a1a',
        border: '1px solid #444',
        borderRadius: '4px',
        padding: '8px',
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5, color: '#fff' }}>
        {data.date}
      </Typography>
      <Typography variant="body2" sx={{ color: '#1976d2' }}>
        Portfolio Value: {formatCurrency(data.value)}
      </Typography>
    </Box>
  );
};

const calculateYAxisDomain = (data: PortfolioValuePoint[]): [number, number] => {
  if (data.length === 0) return [0, 1000];

  const values = data.map(d => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  // Use 10% padding or $100, whichever is greater
  const range = maxValue - minValue;
  const padding = Math.max(range * 0.10, 100);

  return [
    Math.max(0, minValue - padding),  // Don't go below 0
    maxValue + padding
  ];
};

export function PortfolioValueChart() {
  const [data, setData] = useState<PortfolioValuePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const portfolioValues = await getPortfolioValueHistory(30);
        setData(portfolioValues);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch portfolio value history:', err);
        setError('Failed to load portfolio value history');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Paper sx={{ p: 3, mb: 4, backgroundColor: 'primary.dark', textAlign: 'center' }} elevation={2}>
        <CircularProgress />
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 3, mb: 4, backgroundColor: 'primary.dark' }} elevation={2}>
        <Typography variant="h6" gutterBottom>
          Portfolio Value Over Time
        </Typography>
        <Typography variant="body2" color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      </Paper>
    );
  }

  if (data.length === 0) {
    return (
      <Paper sx={{ p: 3, mb: 4, backgroundColor: 'primary.dark' }} elevation={2}>
        <Typography variant="h6" gutterBottom>
          Portfolio Value Over Time
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          No historical data available yet. Refresh stock prices to start tracking portfolio value over time.
        </Typography>
      </Paper>
    );
  }

  const yAxisDomain = calculateYAxisDomain(data);

  return (
    <Paper sx={{ p: 3, mb: 4, backgroundColor: 'primary.dark' }} elevation={2}>
      <Typography variant="h6" gutterBottom>
        Portfolio Value Over Time (Last 30 Days)
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            domain={yAxisDomain}
            tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
            label={{
              value: 'Portfolio Value',
              angle: -90,
              position: 'insideLeft',
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#1976d2"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Paper>
  );
}
