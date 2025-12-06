import { Paper, Typography, Box, Tooltip } from "@mui/material";
import type { StyleBoxAllocation } from "../../types/portfolio.types";
import { formatPercent } from "../../utils/formatters";

const US_TOTAL_MARKET_INDEX = {
  largeValue: 21,
  largeBlend: 37,
  largeGrowth: 18,
  midValue: 6,
  midBlend: 9,
  midGrowth: 6,
  smallValue: 1,
  smallBlend: 2,
  smallGrowth: 1,
};

interface StyleBoxGridProps {
  allocation: StyleBoxAllocation;
}

interface StyleBoxCellProps {
  label: string;
  value: number;
  indexValue?: number;
}

function StyleBoxCell({ label, value, indexValue }: StyleBoxCellProps) {
  const getBackgroundColor = (percent: number) => {
    if (percent === 0) return "#f5f5f5";
    if (percent < 5) return "#e3f2fd";
    if (percent < 15) return "#90caf9";
    if (percent < 30) return "#42a5f5";
    return "#1976d2";
  };

  const getTextColor = (percent: number) => {
    return percent >= 15 ? "#ffffff" : "#000000";
  };

  const tooltipTitle = indexValue !== undefined
    ? `US Total Market Index: ${formatPercent(indexValue, 1)}`
    : '';

  return (
    <Tooltip title={tooltipTitle} arrow placement="top">
      <Box
        sx={{
          height: 100,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          bgcolor: getBackgroundColor(value),
          color: getTextColor(value),
          border: "1px solid #ccc",
          borderRadius: 1,
          p: 1,
        }}
      >
        <Typography variant="caption" fontWeight={600}>
          {label}
        </Typography>
        <Typography variant="h6" fontWeight={700}>
          {formatPercent(value, 1)}
        </Typography>
      </Box>
    </Tooltip>
  );
}

export function StyleBoxGrid({ allocation }: StyleBoxGridProps) {
  return (
    <Paper sx={{ p: 3, backgroundColor: "primary.dark" }} elevation={2}>
      <Typography variant="h6" gutterBottom>
        Portfolio Breakdown
      </Typography>
      <Box
        sx={{
          mt: 2,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 1,
        }}
      >
        {/* Header row */}
        <Box></Box>
        <Box>
          <Typography
            variant="caption"
            align="center"
            display="block"
            fontWeight={600}
          >
            Value
          </Typography>
        </Box>
        <Box>
          <Typography
            variant="caption"
            align="center"
            display="block"
            fontWeight={600}
          >
            Blend
          </Typography>
        </Box>
        <Box>
          <Typography
            variant="caption"
            align="center"
            display="block"
            fontWeight={600}
          >
            Growth
          </Typography>
        </Box>

        {/* Large Cap Row */}
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Typography variant="caption" fontWeight={600}>
            Large
          </Typography>
        </Box>
        <StyleBoxCell label="Large Value" value={allocation.largeValue} indexValue={US_TOTAL_MARKET_INDEX.largeValue} />
        <StyleBoxCell label="Large Blend" value={allocation.largeBlend} indexValue={US_TOTAL_MARKET_INDEX.largeBlend} />
        <StyleBoxCell label="Large Growth" value={allocation.largeGrowth} indexValue={US_TOTAL_MARKET_INDEX.largeGrowth} />

        {/* Mid Cap Row */}
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Typography variant="caption" fontWeight={600}>
            Mid
          </Typography>
        </Box>
        <StyleBoxCell label="Mid Value" value={allocation.midValue} indexValue={US_TOTAL_MARKET_INDEX.midValue} />
        <StyleBoxCell label="Mid Blend" value={allocation.midBlend} indexValue={US_TOTAL_MARKET_INDEX.midBlend} />
        <StyleBoxCell label="Mid Growth" value={allocation.midGrowth} indexValue={US_TOTAL_MARKET_INDEX.midGrowth} />

        {/* Small Cap Row */}
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Typography variant="caption" fontWeight={600}>
            Small
          </Typography>
        </Box>
        <StyleBoxCell label="Small Value" value={allocation.smallValue} indexValue={US_TOTAL_MARKET_INDEX.smallValue} />
        <StyleBoxCell label="Small Blend" value={allocation.smallBlend} indexValue={US_TOTAL_MARKET_INDEX.smallBlend} />
        <StyleBoxCell label="Small Growth" value={allocation.smallGrowth} indexValue={US_TOTAL_MARKET_INDEX.smallGrowth} />
      </Box>
    </Paper>
  );
}
