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
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
  IconButton,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { useState, useEffect } from "react";
import { usePortfolio } from "../../context/PortfolioContext";
import type {
  StockData,
  Sector,
  Style,
  MarketCap,
  SectorAllocationMap,
  CountryAllocationMap,
} from "../../types/stock.types";
import {
  fetchStockQuote,
  fetchCompanyProfile,
} from "../../services/finnhubService";
import { classifyMarketCap } from "../../services/stockDataService";
import { SECTORS, STYLES } from "../../data/constants";

interface AddStockDialogProps {
  open: boolean;
  onClose: () => void;
}

// Helper type for allocation rows
interface AllocationRow {
  id: string;
  name: string;
  percentage: string;
}

export function AddStockDialog({ open, onClose }: AddStockDialogProps) {
  const { addStock } = usePortfolio();

  // Security type selection
  const [securityType, setSecurityType] = useState<"stock" | "etf">("stock");

  // Form fields
  const [ticker, setTicker] = useState("");
  const [sector, setSector] = useState<Sector | "">("");
  const [style, setStyle] = useState<Style | "">("");
  const [annualDividend, setAnnualDividend] = useState("");

  // Fetched data
  const [companyName, setCompanyName] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");
  const [country, setCountry] = useState("");
  const [marketCap, setMarketCap] = useState("");

  // ETF-specific fields
  const [description, setDescription] = useState("");
  const [sectorRows, setSectorRows] = useState<AllocationRow[]>([]);
  const [countryRows, setCountryRows] = useState<AllocationRow[]>([]);

  // API fetch state
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [stockFetched, setStockFetched] = useState(false);

  // Form validation
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setSecurityType("stock");
    setTicker("");
    setSector("");
    setStyle("");
    setAnnualDividend("0");
    setCompanyName("");
    setCurrentPrice("");
    setCountry("");
    setMarketCap("");
    setDescription("");
    setSectorRows([]);
    setCountryRows([]);
    setStockFetched(false);
    setFetchError("");
    setErrors({});
  };

  const handleFetchStockData = async () => {
    if (!ticker.trim()) {
      setFetchError("Please enter a ticker symbol");
      return;
    }

    setLoading(true);
    setFetchError("");
    setStockFetched(false);

    try {
      const normalizedTicker = ticker.trim().toUpperCase();

      if (securityType === "stock") {
        // For stocks: Fetch both quote and profile
        const [quote, profile] = await Promise.all([
          fetchStockQuote(normalizedTicker),
          fetchCompanyProfile(normalizedTicker),
        ]);

        // Set fetched data
        setTicker(normalizedTicker);
        setCompanyName(profile.name);
        setCurrentPrice(quote.c.toFixed(2));
        setCountry(profile.country);
        setMarketCap(classifyMarketCap(profile.marketCapitalization));

        // Auto-populate sector from industry if available
        const industry = profile.industry || "";
        const mappedSector = mapIndustryToSector(industry);
        if (mappedSector) {
          setSector(mappedSector);
        }
      } else {
        // For ETFs: Only fetch quote (price)
        const quote = await fetchStockQuote(normalizedTicker);

        // Set fetched data
        setTicker(normalizedTicker);
        setCurrentPrice(quote.c.toFixed(2));
        // ETF name/description must be entered manually
        // Market cap, sector, country allocations will be manual
      }

      setStockFetched(true);
      setFetchError("");
    } catch (error) {
      if (error instanceof Error) {
        setFetchError(error.message);
      } else {
        setFetchError(
          `Failed to fetch ${securityType} data. Please check the ticker symbol.`
        );
      }
      setStockFetched(false);
    } finally {
      setLoading(false);
    }
  };

  // Map Finnhub industry to our sector categories
  const mapIndustryToSector = (industry: string): Sector | null => {
    const industryLower = industry.toLowerCase();

    if (
      industryLower.includes("tech") ||
      industryLower.includes("software") ||
      industryLower.includes("internet")
    ) {
      return "Technology";
    } else if (
      industryLower.includes("health") ||
      industryLower.includes("pharma") ||
      industryLower.includes("bio")
    ) {
      return "Healthcare";
    } else if (
      industryLower.includes("finance") ||
      industryLower.includes("bank") ||
      industryLower.includes("insurance")
    ) {
      return "Financials";
    } else if (
      industryLower.includes("consumer") &&
      industryLower.includes("discretionary")
    ) {
      return "Consumer Discretionary";
    } else if (
      industryLower.includes("consumer") &&
      industryLower.includes("staples")
    ) {
      return "Consumer Staples";
    } else if (
      industryLower.includes("energy") ||
      industryLower.includes("oil") ||
      industryLower.includes("gas")
    ) {
      return "Energy";
    } else if (
      industryLower.includes("utility") ||
      industryLower.includes("utilities")
    ) {
      return "Utilities";
    } else if (
      industryLower.includes("real estate") ||
      industryLower.includes("reit")
    ) {
      return "Real Estate";
    } else if (
      industryLower.includes("material") ||
      industryLower.includes("mining") ||
      industryLower.includes("chemical")
    ) {
      return "Materials";
    } else if (
      industryLower.includes("industrial") ||
      industryLower.includes("manufacturing")
    ) {
      return "Industrials";
    } else if (
      industryLower.includes("communication") ||
      industryLower.includes("telecom") ||
      industryLower.includes("media")
    ) {
      return "Communication Services";
    }

    return null; // User will need to select manually
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

    if (!stockFetched) {
      newErrors.fetch = `Please fetch ${securityType} data before submitting`;
    }

    if (securityType === "etf") {
      // ETF-specific validation
      if (!companyName.trim()) {
        newErrors.name = "Please enter ETF name";
      }

      if (!marketCap) {
        newErrors.marketCap = "Please select market cap";
      }

      // Validation warnings for allocation percentages (not errors, just warnings)
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

    const dividendNum = parseFloat(annualDividend);
    if (annualDividend && (isNaN(dividendNum) || dividendNum < 0)) {
      newErrors.annualDividend = "Annual dividend must be 0 or greater";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
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

    // Determine sector and country for ETFs (use first allocation or default)
    const dominantSector =
      securityType === "etf" && sectorRows.length > 0
        ? (sectorRows[0].name as Sector)
        : (sector as Sector);
    const dominantCountry =
      securityType === "etf" && countryRows.length > 0
        ? countryRows[0].name
        : country || "US";

    const stock: StockData = {
      ticker: ticker.toUpperCase(),
      name: companyName,
      currentPrice: parseFloat(currentPrice),
      annualDividend: parseFloat(annualDividend) || 0,
      sector: dominantSector,
      country: dominantCountry,
      marketCap: marketCap as MarketCap,
      style: style as Style,
      isDomestic: dominantCountry === "US",
      lastUpdated: Date.now(),
      isEtf: securityType === "etf",
      description: description || undefined,
      sectorAllocations,
      countryAllocations,
    };

    try {
      await addStock(stock);
      handleClose();
    } catch (error) {
      if (error instanceof Error) {
        setFetchError(error.message);
      } else {
        setFetchError(`Failed to add ${securityType}`);
      }
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ backgroundColor: "background.default" }}>
        Add New Stock or ETF
      </DialogTitle>
      <DialogContent sx={{ backgroundColor: "background.default" }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          {/* Stock/ETF Selection */}
          <FormControl component="fieldset">
            <FormLabel component="legend">Security Type</FormLabel>
            <RadioGroup
              row
              value={securityType}
              onChange={(e) =>
                setSecurityType(e.target.value as "stock" | "etf")
              }
            >
              <FormControlLabel
                value="stock"
                control={<Radio />}
                label="Stock"
              />
              <FormControlLabel value="etf" control={<Radio />} label="ETF" />
            </RadioGroup>
          </FormControl>

          {/* Ticker Input with Fetch Button */}
          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              label={`${
                securityType.length === 3
                  ? securityType.toUpperCase()
                  : securityType.charAt(0).toUpperCase() + securityType.slice(1)
              } Ticker`}
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              error={!!errors.ticker}
              helperText={errors.ticker}
              required
              fullWidth
              placeholder={
                securityType === "stock" ? "e.g., AAPL" : "e.g., VOO"
              }
            />
            <Button
              variant="outlined"
              onClick={handleFetchStockData}
              disabled={loading || !ticker.trim()}
              sx={{ minWidth: "120px" }}
            >
              {loading ? <CircularProgress size={24} /> : "Fetch Data"}
            </Button>
          </Box>

          {/* Error Display */}
          {fetchError && (
            <Alert severity="error" onClose={() => setFetchError("")}>
              {fetchError}
            </Alert>
          )}

          {/* Validation Error for Fetch */}
          {errors.fetch && <Alert severity="warning">{errors.fetch}</Alert>}

          {/* Fetched Info Display */}
          {stockFetched && securityType === "stock" && (
            <Box
              sx={{
                p: 2,
                bgcolor: "action.hover",
                borderRadius: 1,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography variant="subtitle2" gutterBottom>
                Stock Information
              </Typography>
              <Typography variant="body2">
                <strong>Company:</strong> {companyName}
              </Typography>
              <Typography variant="body2">
                <strong>Current Price:</strong> ${currentPrice}
              </Typography>
              <Typography variant="body2">
                <strong>Market Cap:</strong> {marketCap.toUpperCase()}
              </Typography>
              <Typography variant="body2">
                <strong>Country:</strong> {country}
              </Typography>
            </Box>
          )}

          {/* ETF Manual Input Fields */}
          {securityType === "etf" && stockFetched && (
            <Box
              sx={{
                p: 2,
                bgcolor: "action.hover",
                borderRadius: 1,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography variant="subtitle2" gutterBottom>
                ETF Information
              </Typography>
              <Typography variant="body2">
                <strong>Current Price:</strong> ${currentPrice}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Please enter ETF details manually below
              </Typography>
            </Box>
          )}

          {/* ETF Name and Description */}
          {securityType === "etf" && stockFetched && (
            <>
              <TextField
                label="ETF Name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                error={!!errors.name}
                helperText={errors.name}
                required
                fullWidth
                placeholder="e.g., Vanguard S&P 500 ETF"
              />
              <TextField
                label="Description (Optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
                multiline
                rows={2}
                placeholder="Brief description of the ETF's strategy"
              />
              <FormControl required error={!!errors.marketCap}>
                <InputLabel>Market Cap</InputLabel>
                <Select
                  value={marketCap}
                  onChange={(e) => setMarketCap(e.target.value)}
                  label="Market Cap"
                >
                  <MenuItem
                    value="mega"
                    sx={{
                      backgroundColor: "background.default",
                      "&:hover": {
                        backgroundColor: "background.default",
                        color: "text.primary",
                      },
                    }}
                  >
                    Mega Cap
                  </MenuItem>
                  <MenuItem
                    value="large"
                    sx={{
                      backgroundColor: "background.default",
                      "&:hover": {
                        backgroundColor: "background.default",
                        color: "text.primary",
                      },
                    }}
                  >
                    Large Cap
                  </MenuItem>
                  <MenuItem
                    value="mid"
                    sx={{
                      backgroundColor: "background.default",
                      "&:hover": {
                        backgroundColor: "background.default",
                        color: "text.primary",
                      },
                    }}
                  >
                    Mid Cap
                  </MenuItem>
                  <MenuItem
                    value="small"
                    sx={{
                      backgroundColor: "background.default",
                      "&:hover": {
                        backgroundColor: "background.default",
                        color: "text.primary",
                      },
                    }}
                  >
                    Small Cap
                  </MenuItem>
                  <MenuItem
                    value="micro"
                    sx={{
                      backgroundColor: "background.default",
                      "&:hover": {
                        backgroundColor: "background.default",
                        color: "text.primary",
                      },
                    }}
                  >
                    Micro Cap
                  </MenuItem>
                </Select>
                {errors.marketCap && (
                  <FormHelperText>{errors.marketCap}</FormHelperText>
                )}
              </FormControl>
            </>
          )}

          {/* Sector Selection (Stocks only) */}
          {securityType === "stock" && (
            <FormControl required error={!!errors.sector}>
              <InputLabel>Sector</InputLabel>
              <Select
                value={sector}
                onChange={(e) => setSector(e.target.value as Sector)}
                label="Sector"
              >
                {SECTORS.map((s) => (
                  <MenuItem
                    key={s}
                    value={s}
                    sx={{
                      backgroundColor: "background.default",
                      "&:hover": {
                        backgroundColor: "background.default",
                        color: "text.primary",
                      },
                    }}
                  >
                    {s}
                  </MenuItem>
                ))}
              </Select>
              {errors.sector && (
                <FormHelperText>{errors.sector}</FormHelperText>
              )}
            </FormControl>
          )}

          {/* ETF Sector Allocations */}
          {securityType === "etf" && stockFetched && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Sector Allocations (Optional)
              </Typography>
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
                        <MenuItem
                          key={s}
                          value={s}
                          sx={{
                            backgroundColor: "background.default",
                            "&:hover": {
                              backgroundColor: "background.default",
                              color: "text.primary",
                            },
                          }}
                        >
                          {s}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    label="Percentage"
                    size="small"
                    type="number"
                    value={row.percentage}
                    onChange={(e) =>
                      updateSectorRow(row.id, "percentage", e.target.value)
                    }
                    inputProps={{ min: 0, max: 100, step: 0.1 }}
                    sx={{ flex: 1 }}
                  />
                  <IconButton
                    color="error"
                    onClick={() => removeSectorRow(row.id)}
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
              <Button
                startIcon={<AddIcon />}
                onClick={addSectorRow}
                variant="outlined"
                size="small"
              >
                Add Sector
              </Button>
              {errors.sectorAllocation && (
                <FormHelperText error>{errors.sectorAllocation}</FormHelperText>
              )}
            </Box>
          )}

          {/* ETF Country Allocations */}
          {securityType === "etf" && stockFetched && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Country Allocations (Optional)
              </Typography>
              {countryRows.map((row) => (
                <Box key={row.id} sx={{ display: "flex", gap: 1, mb: 1 }}>
                  <TextField
                    label="Country"
                    size="small"
                    value={row.name}
                    onChange={(e) =>
                      updateCountryRow(row.id, "name", e.target.value)
                    }
                    sx={{ flex: 2 }}
                    placeholder="e.g., US, China, UK"
                  />
                  <TextField
                    label="Percentage"
                    size="small"
                    type="number"
                    value={row.percentage}
                    onChange={(e) =>
                      updateCountryRow(row.id, "percentage", e.target.value)
                    }
                    inputProps={{ min: 0, max: 100, step: 0.1 }}
                    sx={{ flex: 1 }}
                  />
                  <IconButton
                    color="error"
                    onClick={() => removeCountryRow(row.id)}
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
              <Button
                startIcon={<AddIcon />}
                onClick={addCountryRow}
                variant="outlined"
                size="small"
              >
                Add Country
              </Button>
              {errors.countryAllocation && (
                <FormHelperText error>
                  {errors.countryAllocation}
                </FormHelperText>
              )}
            </Box>
          )}

          {/* Style Selection */}
          <FormControl required error={!!errors.style}>
            <InputLabel>Style</InputLabel>
            <Select
              value={style}
              onChange={(e) => setStyle(e.target.value as Style)}
              label="Style"
            >
              {STYLES.map((s) => (
                <MenuItem
                  key={s}
                  value={s}
                  sx={{
                    backgroundColor: "background.default",
                    "&:hover": {
                      backgroundColor: "background.default",
                      color: "text.primary",
                    },
                  }}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </MenuItem>
              ))}
            </Select>
            {errors.style && <FormHelperText>{errors.style}</FormHelperText>}
          </FormControl>

          {/* Annual Dividend */}
          <TextField
            label="Annual Dividend per Share"
            type="number"
            value={annualDividend}
            onChange={(e) => setAnnualDividend(e.target.value)}
            error={!!errors.annualDividend}
            helperText={
              errors.annualDividend ||
              "Enter 0 if the stock doesn't pay dividends"
            }
            inputProps={{ min: 0, step: 0.01 }}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ backgroundColor: "background.default" }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? (
            <CircularProgress size={24} />
          ) : (
            `Add ${securityType === "stock" ? "Stock" : "ETF"}`
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
