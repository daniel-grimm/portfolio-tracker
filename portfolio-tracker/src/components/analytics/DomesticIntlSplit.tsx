import { Paper, Typography } from "@mui/material";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import type { DomesticIntlAllocation } from "../../types/portfolio.types";
import { formatPercent } from "../../utils/formatters";

interface DomesticIntlSplitProps {
  allocation: DomesticIntlAllocation;
}

const COLORS = ["#1976d2", "#dc004e"];

export function DomesticIntlSplit({ allocation }: DomesticIntlSplitProps) {
  const data = [
    {
      name: "Domestic (US)",
      value: parseFloat(allocation.domestic.toFixed(2)),
    },
    {
      name: "International",
      value: parseFloat(allocation.international.toFixed(2)),
    },
  ].filter((item) => item.value > 0);

  if (data.length === 0) {
    return (
      <Paper sx={{ p: 3 }} elevation={2}>
        <Typography variant="h6" gutterBottom>
          Domestic vs International
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          No allocation data available
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, backgroundColor: "primary.dark" }} elevation={2}>
      <Typography variant="h6" gutterBottom>
        Domestic vs International
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }) => `${name}: ${formatPercent(value, 1)}`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatPercent(Number(value), 2)} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Paper>
  );
}
