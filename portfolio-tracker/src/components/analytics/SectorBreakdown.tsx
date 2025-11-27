import { Paper, Typography } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { SectorAllocation } from '../../types/portfolio.types';
import { formatPercent } from '../../utils/formatters';

interface SectorBreakdownProps {
  allocation: SectorAllocation;
}

const COLORS = [
  '#1976d2',
  '#dc004e',
  '#2e7d32',
  '#ed6c02',
  '#9c27b0',
  '#00897b',
  '#d32f2f',
  '#0288d1',
  '#7b1fa2',
  '#c62828',
  '#5e35b1',
];

export function SectorBreakdown({ allocation }: SectorBreakdownProps) {
  const data = Object.entries(allocation)
    .map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2)),
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  if (data.length === 0) {
    return (
      <Paper sx={{ p: 3 }} elevation={2}>
        <Typography variant="h6" gutterBottom>
          Sector Breakdown
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          No sector data available
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }} elevation={2}>
      <Typography variant="h6" gutterBottom>
        Sector Breakdown
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }) => `${name}: ${formatPercent(value, 1)}`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatPercent(Number(value), 2)} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Paper>
  );
}
