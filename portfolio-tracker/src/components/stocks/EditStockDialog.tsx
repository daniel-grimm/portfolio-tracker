import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Alert,
  CircularProgress,
  Typography,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  FormHelperText,
  IconButton,
  Chip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { useState, useEffect } from "react";
import { usePortfolio } from "../../context/PortfolioContext";
import type { Stock } from "../../types/portfolio.types";
import type {
  Sector,
  Style,
  MarketCap,
  SectorAllocationMap,
  CountryAllocationMap,
} from "../../types/stock.types";
import { SECTORS, STYLES, MARKET_CAPS } from "../../data/constants";

interface EditStockDialogProps {
  open: boolean;
  onClose: () => void;
  stock: Stock | null;
}

// Helper type for allocation rows
interface AllocationRow {
  id: string;
  name: string;
  percentage: string;
}

export function EditStockDialog({ open, onClose, stock }: EditStockDialogProps) {
  const { updateStock } = usePortfolio();

  // Form fields
  const [companyName, setCompanyName] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");
  const [annualDividend, setAnnualDividend] = useState("");
  const [sector, setSector] = useState<Sector | "">("");
  const [marketCap, setMarketCap] = useState<MarketCap | "">("");
  const [style, setStyle] = useState<Style | "">("");
  const [description, setDescription] = useState("");

  // ETF-specific fields
  const [sectorRows, setSectorRows] = useState<AllocationRow[]>([]);
  const [countryRows, setCountryRows] = useState<AllocationRow[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Populate form when stock changes
  useEffect(() => {
    if (stock && open) {
      setCompanyName(stock.name);
      setCurrentPrice(stock.currentPrice.toString());
      setAnnualDividend(stock.annualDividend.toString());
      setSector(stock.sector);
      setMarketCap(stock.marketCap);
      setStyle(stock.style);
      setDescription(stock.description || "");

      // Convert allocation maps to rows for ETFs
      if (stock.isEtf) {
        if (stock.sectorAllocations) {
          const rows = Object.entries(stock.sectorAllocations).map(
            ([name, percentage]: [string, number], index) => ({
              id: `sector-${index}`,
              name,
              percentage: percentage.toString(),
            })
          );
          setSectorRows(rows);
        } else {
          setSectorRows([]);
        }

        if (stock.countryAllocations) {
          const rows = Object.entries(stock.countryAllocations).map(
            ([name, percentage]: [string, number], index) => ({
              id: `country-${index}`,
              name,
              percentage: percentage.toString(),
            })
          );
          setCountryRows(rows);
        } else {
          setCountryRows([]);
        }
      }
    }
  }, [stock, open]);

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setCompanyName("");
    setCurrentPrice("");
    setAnnualDividend("");
    setSector("");
    setMarketCap("");
    setStyle("");
    setDescription("");
    setSectorRows([]);
    setCountryRows([]);
    setError("");
    setErrors({});
  };

  // Helper functions for managing allocation rows
  const addSectorRow = () => {
    setSectorRows([
      ...sectorRows,
      { id: Date.now().toString(), name: "", percentage: "" },
    ]);
  };

  const removeSectorRow = (id: string) => {
    setSectorRows(sectorRows.filter((row) => row.id !== id));
  };

  const updateSectorRow = (
    id: string,
    field: "name" | "percentage",
    value: string
  ) => {
    setSectorRows(
      sectorRows.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      )
    );
  };

  const addCountryRow = () => {
    setCountryRows([
      ...countryRows,
      { id: Date.now().toString(), name: "", percentage: "" },
    ]);
  };

  const removeCountryRow = (id: string) => {
    setCountryRows(countryRows.filter((row) => row.id !== id));
  };

  const updateCountryRow = (
    id: string,
    field: "name" | "percentage",
    value: string
  ) => {
    setCountryRows(
      countryRows.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      )
    );
  };

  // Calculate total allocation percentages
  const calculateTotalPercentage = (rows: AllocationRow[]): number => {
    return rows.reduce((sum, row) => {
      const pct = parseFloat(row.percentage) || 0;
      return sum + pct;
    }, 0);
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!stock) {
      newErrors.general = "No stock selected";
      setErrors(newErrors);
      return false;
    }

    if (!companyName.trim()) {
      newErrors.name = `Please enter ${stock.isEtf ? "ETF" : "company"} name`;
    }

    const priceNum = parseFloat(currentPrice);
    if (!currentPrice || isNaN(priceNum) || priceNum <= 0) {
      newErrors.currentPrice = "Current price must be greater than 0";
    }

    const dividendNum = parseFloat(annualDividend);
    if (annualDividend && (isNaN(dividendNum) || dividendNum < 0)) {
      newErrors.annualDividend = "Annual dividend must be 0 or greater";
    }

    if (stock.isEtf) {
      // ETF-specific validation
      if (!marketCap) {
        newErrors.marketCap = "Please select market cap";
      }

      // Validation warnings for allocation percentages
      const sectorTotal = calculateTotalPercentage(sectorRows);
      if (sectorRows.length > 0 && Math.abs(sectorTotal - 100) > 5) {
        newErrors.sectorAllocation = `Sector allocations total ${sectorTotal.toFixed(
          1
        )}% (should be ~100%)`;
      }

      const countryTotal = calculateTotalPercentage(countryRows);
      if (countryRows.length > 0 && Math.abs(countryTotal - 100) > 5) {
        newErrors.countryAllocation = `Country allocations total ${countryTotal.toFixed(
          1
        )}% (should be ~100%)`;
      }
    } else {
      // Stock-specific validation
      if (!sector) {
        newErrors.sector = "Please select a sector";
      }
    }

    if (!style) {
      newErrors.style = "Please select a style";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!stock || !validateForm()) {
      return;
    }

    // Build allocation maps from rows
    const sectorAllocations: SectorAllocationMap | undefined =
      sectorRows.length > 0
        ? sectorRows.reduce((acc, row) => {
            if (row.name && row.percentage) {
              acc[row.name] = parseFloat(row.percentage);
            }
            return acc;
          }, {} as SectorAllocationMap)
        : undefined;

    const countryAllocations: CountryAllocationMap | undefined =
      countryRows.length > 0
        ? countryRows.reduce((acc, row) => {
            if (row.name && row.percentage) {
              acc[row.name] = parseFloat(row.percentage);
            }
            return acc;
          }, {} as CountryAllocationMap)
        : undefined;

    // Determine dominant sector and country for ETFs
    const dominantSector = stock.isEtf && sectorRows.length > 0
      ? (sectorRows[0].name as Sector)
      : (sector as Sector);

    const dominantCountry = stock.isEtf && countryRows.length > 0
      ? countryRows[0].name
      : stock.country;

    const updatedStock: Stock = {
      ticker: stock.ticker,
      name: companyName,
      currentPrice: parseFloat(currentPrice),
      annualDividend: parseFloat(annualDividend) || 0,
      sector: dominantSector,
      country: dominantCountry,
      marketCap: marketCap as MarketCap,
      style: style as Style,
      isDomestic: dominantCountry === "US",
      lastUpdated: Date.now(),
      isEtf: stock.isEtf,
      description: description || undefined,
      sectorAllocations,
      countryAllocations,
    };

    try {
      setLoading(true);
      setError("");
      await updateStock(stock.ticker, updatedStock);
      onClose();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to update stock");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!stock) {
    return null;
  }

  return (
    <Dialog open={open} onClose={!loading ? onClose : undefined} maxWidth="md" fullWidth>
      <DialogTitle sx={{ backgroundColor: "background.default" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          Edit {stock.isEtf ? "ETF" : "Stock"}
          <Chip
            label={stock.isEtf ? "ETF" : "Stock"}
            size="small"
            color={stock.isEtf ? "secondary" : "primary"}
          />
        </Box>
      </DialogTitle>
      <DialogContent sx={{ backgroundColor: "background.default" }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          {/* Ticker (Read-only) */}
          <TextField
            label="Ticker"
            value={stock.ticker}
            disabled
            fullWidth
            helperText="Ticker cannot be changed"
          />

          {/* Name */}
          <TextField
            label={stock.isEtf ? "ETF Name" : "Company Name"}
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            error={!!errors.name}
            helperText={errors.name}
            required
            fullWidth
          />

          {/* Current Price */}
          <TextField
            label="Current Price"
            type="number"
            value={currentPrice}
            onChange={(e) => setCurrentPrice(e.target.value)}
            error={!!errors.currentPrice}
            helperText={errors.currentPrice}
            required
            fullWidth
            inputProps={{ min: 0, step: 0.01 }}
          />

          {/* Annual Dividend */}
          <TextField
            label="Annual Dividend"
            type="number"
            value={annualDividend}
            onChange={(e) => setAnnualDividend(e.target.value)}
            error={!!errors.annualDividend}
            helperText={errors.annualDividend || "Dividend per share (USD)"}
            fullWidth
            inputProps={{ min: 0, step: 0.01 }}
          />

          {/* Stock-Specific Fields */}
          {!stock.isEtf && (
            <>
              {/* Sector */}
              <FormControl required error={!!errors.sector} fullWidth>
                <InputLabel>Sector</InputLabel>
                <Select
                  value={sector}
                  onChange={(e) => setSector(e.target.value as Sector)}
                  label="Sector"
                >
                  {SECTORS.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
                {errors.sector && (
                  <FormHelperText>{errors.sector}</FormHelperText>
                )}
              </FormControl>

              {/* Market Cap */}
              <FormControl fullWidth>
                <InputLabel>Market Cap</InputLabel>
                <Select
                  value={marketCap}
                  onChange={(e) => setMarketCap(e.target.value as MarketCap)}
                  label="Market Cap"
                >
                  {MARKET_CAPS.map((cap) => (
                    <MenuItem key={cap} value={cap}>
                      {cap.charAt(0).toUpperCase() + cap.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          )}

          {/* ETF-Specific Fields */}
          {stock.isEtf && (
            <>
              {/* Description */}
              <TextField
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                multiline
                rows={3}
                fullWidth
                helperText="Optional description of the ETF"
              />

              {/* Market Cap */}
              <FormControl required error={!!errors.marketCap} fullWidth>
                <InputLabel>Market Cap</InputLabel>
                <Select
                  value={marketCap}
                  onChange={(e) => setMarketCap(e.target.value as MarketCap)}
                  label="Market Cap"
                >
                  {MARKET_CAPS.map((cap) => (
                    <MenuItem key={cap} value={cap}>
                      {cap.charAt(0).toUpperCase() + cap.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
                {errors.marketCap && (
                  <FormHelperText>{errors.marketCap}</FormHelperText>
                )}
              </FormControl>

              {/* Sector Allocations */}
              <Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography variant="subtitle2">
                    Sector Allocations (%)
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={addSectorRow}
                  >
                    Add Sector
                  </Button>
                </Box>
                {sectorRows.map((row) => (
                  <Box key={row.id} sx={{ display: "flex", gap: 1, mb: 1 }}>
                    <FormControl sx={{ flex: 2 }}>
                      <InputLabel size="small">Sector</InputLabel>
                      <Select
                        size="small"
                        value={row.name}
                        onChange={(e) =>
                          updateSectorRow(row.id, "name", e.target.value)
                        }
                        label="Sector"
                      >
                        {SECTORS.map((s) => (
                          <MenuItem key={s} value={s}>
                            {s}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      sx={{ flex: 1 }}
                      size="small"
                      label="%"
                      type="number"
                      value={row.percentage}
                      onChange={(e) =>
                        updateSectorRow(row.id, "percentage", e.target.value)
                      }
                      inputProps={{ min: 0, max: 100, step: 0.1 }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => removeSectorRow(row.id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                ))}
                {sectorRows.length > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    Total: {calculateTotalPercentage(sectorRows).toFixed(1)}%
                  </Typography>
                )}
                {errors.sectorAllocation && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    {errors.sectorAllocation}
                  </Alert>
                )}
              </Box>

              {/* Country Allocations */}
              <Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography variant="subtitle2">
                    Country Allocations (%)
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={addCountryRow}
                  >
                    Add Country
                  </Button>
                </Box>
                {countryRows.map((row) => (
                  <Box key={row.id} sx={{ display: "flex", gap: 1, mb: 1 }}>
                    <TextField
                      sx={{ flex: 2 }}
                      size="small"
                      label="Country"
                      value={row.name}
                      onChange={(e) =>
                        updateCountryRow(row.id, "name", e.target.value)
                      }
                    />
                    <TextField
                      sx={{ flex: 1 }}
                      size="small"
                      label="%"
                      type="number"
                      value={row.percentage}
                      onChange={(e) =>
                        updateCountryRow(row.id, "percentage", e.target.value)
                      }
                      inputProps={{ min: 0, max: 100, step: 0.1 }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => removeCountryRow(row.id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                ))}
                {countryRows.length > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    Total: {calculateTotalPercentage(countryRows).toFixed(1)}%
                  </Typography>
                )}
                {errors.countryAllocation && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    {errors.countryAllocation}
                  </Alert>
                )}
              </Box>
            </>
          )}

          {/* Style (common for both) */}
          <FormControl required error={!!errors.style} fullWidth>
            <InputLabel>Style</InputLabel>
            <Select
              value={style}
              onChange={(e) => setStyle(e.target.value as Style)}
              label="Style"
            >
              {STYLES.map((s) => (
                <MenuItem key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </MenuItem>
              ))}
            </Select>
            {errors.style && <FormHelperText>{errors.style}</FormHelperText>}
          </FormControl>

          {/* Error Display */}
          {error && (
            <Alert severity="error" onClose={() => setError("")}>
              {error}
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ backgroundColor: "background.default" }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : "Update Stock"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
