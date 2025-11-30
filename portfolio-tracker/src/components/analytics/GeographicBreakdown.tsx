import { Paper, Typography } from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { GeographicAllocation } from "../../types/portfolio.types";
import { formatPercent } from "../../utils/formatters";

interface GeographicBreakdownProps {
  allocation: GeographicAllocation;
}

const COLORS = [
  "#1976d2",
  "#dc004e",
  "#2e7d32",
  "#ed6c02",
  "#9c27b0",
  "#00897b",
  "#d32f2f",
  "#0288d1",
];

export function GeographicBreakdown({ allocation }: GeographicBreakdownProps) {
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
          Geographic Breakdown
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          No geographic data available
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, backgroundColor: "primary.dark" }} elevation={2}>
      <Typography variant="h6" gutterBottom>
        Geographic Breakdown
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
          <YAxis
            label={{
              value: "Allocation (%)",
              angle: -90,
              position: "insideLeft",
            }}
          />
          <Tooltip formatter={(value) => formatPercent(Number(value), 2)} />
          <Bar dataKey="value" fill="#1976d2">
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
}
