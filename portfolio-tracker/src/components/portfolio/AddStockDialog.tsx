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
} from "@mui/material";
import { useState, useEffect } from "react";
import { usePortfolio } from "../../context/PortfolioContext";
import type { Stock, Sector, Style } from "../../types/stock.types";
import { fetchStockQuote, fetchCompanyProfile } from "../../services/finnhubService";
import { classifyMarketCap } from "../../services/stockDataService";
import { SECTORS, STYLES } from "../../data/constants";

interface AddStockDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AddStockDialog({ open, onClose }: AddStockDialogProps) {
  const { addStock } = usePortfolio();

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
    setTicker("");
    setSector("");
    setStyle("");
    setAnnualDividend("0");
    setCompanyName("");
    setCurrentPrice("");
    setCountry("");
    setMarketCap("");
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

      // Fetch data from Finnhub API
      const [quote, profile] = await Promise.all([
        fetchStockQuote(normalizedTicker),
        fetchCompanyProfile(normalizedTicker)
      ]);

      // Set fetched data
      setTicker(normalizedTicker);
      setCompanyName(profile.name);
      setCurrentPrice(quote.c.toFixed(2));
      setCountry(profile.country);
      setMarketCap(classifyMarketCap(profile.marketCapitalization));

      // Auto-populate sector from industry if available
      // Map Finnhub industry to our sector categories
      const industry = profile.industry || "";
      const mappedSector = mapIndustryToSector(industry);
      if (mappedSector) {
        setSector(mappedSector);
      }

      setStockFetched(true);
      setFetchError("");
    } catch (error) {
      if (error instanceof Error) {
        setFetchError(error.message);
      } else {
        setFetchError("Failed to fetch stock data. Please check the ticker symbol.");
      }
      setStockFetched(false);
    } finally {
      setLoading(false);
    }
  };

  // Map Finnhub industry to our sector categories
  const mapIndustryToSector = (industry: string): Sector | null => {
    const industryLower = industry.toLowerCase();

    if (industryLower.includes("tech") || industryLower.includes("software") || industryLower.includes("internet")) {
      return "Technology";
    } else if (industryLower.includes("health") || industryLower.includes("pharma") || industryLower.includes("bio")) {
      return "Healthcare";
    } else if (industryLower.includes("finance") || industryLower.includes("bank") || industryLower.includes("insurance")) {
      return "Financials";
    } else if (industryLower.includes("consumer") && industryLower.includes("discretionary")) {
      return "Consumer Discretionary";
    } else if (industryLower.includes("consumer") && industryLower.includes("staples")) {
      return "Consumer Staples";
    } else if (industryLower.includes("energy") || industryLower.includes("oil") || industryLower.includes("gas")) {
      return "Energy";
    } else if (industryLower.includes("utility") || industryLower.includes("utilities")) {
      return "Utilities";
    } else if (industryLower.includes("real estate") || industryLower.includes("reit")) {
      return "Real Estate";
    } else if (industryLower.includes("material") || industryLower.includes("mining") || industryLower.includes("chemical")) {
      return "Materials";
    } else if (industryLower.includes("industrial") || industryLower.includes("manufacturing")) {
      return "Industrials";
    } else if (industryLower.includes("communication") || industryLower.includes("telecom") || industryLower.includes("media")) {
      return "Communication Services";
    }

    return null; // User will need to select manually
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!stockFetched) {
      newErrors.fetch = "Please fetch stock data before submitting";
    }

    if (!sector) {
      newErrors.sector = "Please select a sector";
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

    const stock: Stock = {
      ticker: ticker.toUpperCase(),
      name: companyName,
      currentPrice: parseFloat(currentPrice),
      annualDividend: parseFloat(annualDividend) || 0,
      sector: sector as Sector,
      country,
      marketCap: marketCap as any,
      style: style as Style,
      isDomestic: country === "US",
      lastUpdated: Date.now(),
    };

    try {
      await addStock(stock);
      handleClose();
    } catch (error) {
      if (error instanceof Error) {
        setFetchError(error.message);
      } else {
        setFetchError("Failed to add stock");
      }
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add New Stock</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          {/* Ticker Input with Fetch Button */}
          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              label="Stock Ticker"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              error={!!errors.ticker}
              helperText={errors.ticker}
              required
              fullWidth
              placeholder="e.g., AAPL"
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
          {errors.fetch && (
            <Alert severity="warning">{errors.fetch}</Alert>
          )}

          {/* Fetched Stock Info Display */}
          {stockFetched && (
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

          {/* Sector Selection */}
          <FormControl required error={!!errors.sector}>
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
            {errors.sector && <FormHelperText>{errors.sector}</FormHelperText>}
          </FormControl>

          {/* Style Selection */}
          <FormControl required error={!!errors.style}>
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

          {/* Annual Dividend */}
          <TextField
            label="Annual Dividend per Share"
            type="number"
            value={annualDividend}
            onChange={(e) => setAnnualDividend(e.target.value)}
            error={!!errors.annualDividend}
            helperText={errors.annualDividend || "Enter 0 if the stock doesn't pay dividends"}
            inputProps={{ min: 0, step: 0.01 }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={24} /> : "Add Stock"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
