import { Box, Typography, TextField, Alert } from "@mui/material";
import { MARKET_CAPS, STYLES } from "../../data/constants";

interface StyleMarketCapGridProps {
  allocations: { [key: string]: string }; // String values for form inputs
  onChange: (allocations: { [key: string]: string }) => void;
  error?: string;
}

export function StyleMarketCapGrid({
  allocations,
  onChange,
  error,
}: StyleMarketCapGridProps) {
  const handleChange = (marketCap: string, style: string, value: string) => {
    const key = `${marketCap}${style.charAt(0).toUpperCase() + style.slice(1)}`;
    onChange({ ...allocations, [key]: value });
  };

  const calculateTotal = (): number => {
    return Object.values(allocations).reduce((sum, val) => {
      const num = parseFloat(val) || 0;
      return sum + num;
    }, 0);
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
        <Typography variant="subtitle2">
          Style-Market Cap Allocations (%)
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Total: {calculateTotal().toFixed(1)}%
        </Typography>
      </Box>

      {/* Grid Layout: 4 columns (header + 3 styles) x 4 rows (header + 3 caps) */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "auto repeat(3, 1fr)",
          gap: 1,
        }}
      >
        {/* Header Row */}
        <Box /> {/* Empty corner */}
        {STYLES.map((style) => (
          <Typography
            key={style}
            variant="caption"
            align="center"
            fontWeight={600}
            sx={{ textTransform: "capitalize" }}
          >
            {style}
          </Typography>
        ))}

        {/* Data Rows */}
        {MARKET_CAPS.map((cap) => (
          <Box key={`row-${cap}`} sx={{ display: "contents" }}>
            <Typography
              key={`label-${cap}`}
              variant="caption"
              fontWeight={600}
              sx={{
                display: "flex",
                alignItems: "center",
                textTransform: "capitalize",
              }}
            >
              {cap}
            </Typography>
            {STYLES.map((style) => {
              const key = `${cap}${
                style.charAt(0).toUpperCase() + style.slice(1)
              }`;
              return (
                <TextField
                  key={key}
                  size="small"
                  type="number"
                  value={allocations[key] || ""}
                  onChange={(e) => handleChange(cap, style, e.target.value)}
                  inputProps={{ min: 0, max: 100, step: 0.1 }}
                  sx={{ "& input": { textAlign: "center" } }}
                />
              );
            })}
          </Box>
        ))}
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
}
