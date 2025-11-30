import { Paper, Typography, Box } from "@mui/material";
import type { StyleBoxAllocation } from "../../types/portfolio.types";
import { formatPercent } from "../../utils/formatters";

interface StyleBoxGridProps {
  allocation: StyleBoxAllocation;
}

interface StyleBoxCellProps {
  label: string;
  value: number;
}

function StyleBoxCell({ label, value }: StyleBoxCellProps) {
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

  return (
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
        <StyleBoxCell label="Large Value" value={allocation.largeValue} />
        <StyleBoxCell label="Large Blend" value={allocation.largeBlend} />
        <StyleBoxCell label="Large Growth" value={allocation.largeGrowth} />

        {/* Mid Cap Row */}
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Typography variant="caption" fontWeight={600}>
            Mid
          </Typography>
        </Box>
        <StyleBoxCell label="Mid Value" value={allocation.midValue} />
        <StyleBoxCell label="Mid Blend" value={allocation.midBlend} />
        <StyleBoxCell label="Mid Growth" value={allocation.midGrowth} />

        {/* Small Cap Row */}
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Typography variant="caption" fontWeight={600}>
            Small
          </Typography>
        </Box>
        <StyleBoxCell label="Small Value" value={allocation.smallValue} />
        <StyleBoxCell label="Small Blend" value={allocation.smallBlend} />
        <StyleBoxCell label="Small Growth" value={allocation.smallGrowth} />
      </Box>
    </Paper>
  );
}
