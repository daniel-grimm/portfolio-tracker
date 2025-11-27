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
import type { HoldingMetadata } from "../../types/portfolio.types";
import type { StockData, Sector, Style } from "../../types/stock.types";
import { getStockData } from "../../services/stockDataService";
import { SECTORS, STYLES } from "../../data/constants";

interface AddHoldingDialogProps {
  open: boolean;
  onClose: () => void;
  editingHolding: HoldingMetadata | null;
}

export function AddHoldingDialog({
  open,
  onClose,
  editingHolding,
}: AddHoldingDialogProps) {
  const { addHolding, updateHolding } = usePortfolio();

  // Form fields
  const [ticker, setTicker] = useState("");
  const [quantity, setQuantity] = useState("");
  const [costBasis, setCostBasis] = useState("");
  const [sector, setSector] = useState<Sector | "">("");
  const [style, setStyle] = useState<Style | "">("");
  const [annualDividend, setAnnualDividend] = useState("");

  // API fetch state
  const [fetchedStockData, setFetchedStockData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

  // Form validation
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (editingHolding) {
      setTicker(editingHolding.ticker);
      setQuantity(editingHolding.quantity.toString());
      setCostBasis(editingHolding.costBasis.toString());
      setFetchedStockData(editingHolding.stockDataSnapshot);
      setSector(editingHolding.stockDataSnapshot.sector);
      setStyle(editingHolding.stockDataSnapshot.style);
      setAnnualDividend(editingHolding.stockDataSnapshot.annualDividend.toString());
    } else {
      resetForm();
    }
    setErrors({});
    setFetchError("");
  }, [editingHolding, open]);

  const resetForm = () => {
    setTicker("");
    setQuantity("");
    setCostBasis("");
    setSector("");
    setStyle("");
    setAnnualDividend("0");
    setFetchedStockData(null);
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
    setFetchedStockData(null);

    try {
      // Fetch stock data with default user classification (will be updated by user)
      const stockData = await getStockData(ticker.trim().toUpperCase(), {
        sector: sector || "Technology", // Temporary default
        style: style || "blend", // Temporary default
        annualDividend: parseFloat(annualDividend) || 0,
      });

      setFetchedStockData(stockData);
      setTicker(stockData.ticker); // Use normalized ticker from API
      setFetchError("");
    } catch (error) {
      if (error instanceof Error) {
        setFetchError(error.message);
      } else {
        setFetchError("Failed to fetch stock data. Please check the ticker symbol.");
      }
      setFetchedStockData(null);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!fetchedStockData && !editingHolding) {
      newErrors.fetch = "Please fetch stock data before submitting";
    }

    if (!sector) {
      newErrors.sector = "Please select a sector";
    }

    if (!style) {
      newErrors.style = "Please select a style";
    }

    const quantityNum = parseFloat(quantity);
    if (!quantity || isNaN(quantityNum) || quantityNum <= 0) {
      newErrors.quantity = "Quantity must be greater than 0";
    }

    const costBasisNum = parseFloat(costBasis);
    if (!costBasis || isNaN(costBasisNum) || costBasisNum <= 0) {
      newErrors.costBasis = "Cost basis must be greater than 0";
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

    // If editing, we already have the stock data snapshot
    let stockDataSnapshot = fetchedStockData;

    // If adding new holding, fetch fresh data with user's classification
    if (!editingHolding && sector && style) {
      try {
        setLoading(true);
        stockDataSnapshot = await getStockData(ticker.trim().toUpperCase(), {
          sector,
          style,
          annualDividend: parseFloat(annualDividend) || 0,
        });
      } catch (error) {
        if (error instanceof Error) {
          setFetchError(error.message);
        }
        setLoading(false);
        return;
      } finally {
        setLoading(false);
      }
    }

    if (!stockDataSnapshot) {
      setFetchError("Unable to create holding without stock data");
      return;
    }

    const holdingData = {
      ticker: stockDataSnapshot.ticker,
      quantity: parseFloat(quantity),
      costBasis: parseFloat(costBasis),
      stockDataSnapshot,
    };

    if (editingHolding) {
      updateHolding(editingHolding.id, holdingData);
    } else {
      addHolding(holdingData);
    }

    handleClose();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {editingHolding ? "Edit Holding" : "Add New Holding"}
      </DialogTitle>
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
              disabled={!!editingHolding}
              placeholder="e.g., AAPL"
            />
            {!editingHolding && (
              <Button
                variant="outlined"
                onClick={handleFetchStockData}
                disabled={loading || !ticker.trim()}
                sx={{ minWidth: "120px" }}
              >
                {loading ? <CircularProgress size={24} /> : "Fetch Data"}
              </Button>
            )}
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
          {fetchedStockData && (
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
                <strong>Company:</strong> {fetchedStockData.name}
              </Typography>
              <Typography variant="body2">
                <strong>Current Price:</strong> ${fetchedStockData.currentPrice.toFixed(2)}
              </Typography>
              <Typography variant="body2">
                <strong>Market Cap:</strong> {fetchedStockData.marketCap.toUpperCase()}
              </Typography>
              <Typography variant="body2">
                <strong>Country:</strong> {fetchedStockData.country}
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

          {/* Quantity */}
          <TextField
            label="Quantity (Shares)"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            error={!!errors.quantity}
            helperText={errors.quantity}
            required
            inputProps={{ min: 0, step: 0.001 }}
          />

          {/* Cost Basis */}
          <TextField
            label="Cost Basis (Price per Share)"
            type="number"
            value={costBasis}
            onChange={(e) => setCostBasis(e.target.value)}
            error={!!errors.costBasis}
            helperText={errors.costBasis}
            required
            inputProps={{ min: 0, step: 0.01 }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={24} /> : editingHolding ? "Update" : "Add"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
