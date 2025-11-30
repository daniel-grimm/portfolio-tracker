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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  FormHelperText,
  Typography,
} from "@mui/material";
import { useState, useEffect } from "react";
import { usePortfolio } from "../../context/PortfolioContext";
import type { Position } from "../../types/portfolio.types";

interface AddPositionDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AddPositionDialog({ open, onClose }: AddPositionDialogProps) {
  const { addPosition, stocks } = usePortfolio();

  // Form fields
  const [ticker, setTicker] = useState("");
  const [quantity, setQuantity] = useState("");
  const [costBasis, setCostBasis] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setTicker("");
    setQuantity("");
    setCostBasis("");
    setPurchaseDate("");
    setError("");
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!ticker) {
      newErrors.ticker = "Please select a stock";
    }

    const quantityNum = parseFloat(quantity);
    if (!quantity || isNaN(quantityNum) || quantityNum <= 0) {
      newErrors.quantity = "Quantity must be greater than 0";
    }

    const costBasisNum = parseFloat(costBasis);
    if (!costBasis || isNaN(costBasisNum) || costBasisNum <= 0) {
      newErrors.costBasis = "Cost basis must be greater than 0";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    const position: Omit<Position, 'id'> = {
      ticker: ticker.toUpperCase(),
      quantity: parseFloat(quantity),
      costBasis: parseFloat(costBasis),
      purchaseDate: purchaseDate || undefined,
    };

    try {
      setLoading(true);
      setError("");
      await addPosition(position);
      handleClose();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to add position");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const selectedStock = stocks.find(s => s.ticker === ticker);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add New Position</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          {/* Stock Selection */}
          <FormControl required error={!!errors.ticker} fullWidth>
            <InputLabel>Select Stock</InputLabel>
            <Select
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              label="Select Stock"
            >
              {stocks.length === 0 ? (
                <MenuItem disabled>No stocks available. Add a stock first.</MenuItem>
              ) : (
                stocks.map((stock) => (
                  <MenuItem key={stock.ticker} value={stock.ticker}>
                    {stock.ticker} - {stock.name}
                  </MenuItem>
                ))
              )}
            </Select>
            {errors.ticker && <FormHelperText>{errors.ticker}</FormHelperText>}
          </FormControl>

          {/* Selected Stock Info */}
          {selectedStock && (
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
                <strong>Company:</strong> {selectedStock.name}
              </Typography>
              <Typography variant="body2">
                <strong>Current Price:</strong> ${selectedStock.currentPrice.toFixed(2)}
              </Typography>
              <Typography variant="body2">
                <strong>Sector:</strong> {selectedStock.sector}
              </Typography>
            </Box>
          )}

          {/* Error Display */}
          {error && (
            <Alert severity="error" onClose={() => setError("")}>
              {error}
            </Alert>
          )}

          {/* Quantity */}
          <TextField
            label="Quantity (Shares)"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            error={!!errors.quantity}
            helperText={errors.quantity || "Number of shares purchased"}
            required
            fullWidth
            inputProps={{ min: 0, step: 0.001 }}
          />

          {/* Cost Basis */}
          <TextField
            label="Cost Basis (Price per Share)"
            type="number"
            value={costBasis}
            onChange={(e) => setCostBasis(e.target.value)}
            error={!!errors.costBasis}
            helperText={errors.costBasis || "Purchase price per share"}
            required
            fullWidth
            inputProps={{ min: 0, step: 0.01 }}
          />

          {/* Purchase Date */}
          <TextField
            label="Purchase Date"
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            helperText="Optional: Date of purchase"
            fullWidth
            InputLabelProps={{
              shrink: true,
            }}
          />

          {/* Warning if no stocks */}
          {stocks.length === 0 && (
            <Alert severity="warning">
              No stocks available. Please add a stock first before creating a position.
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || stocks.length === 0}
        >
          {loading ? <CircularProgress size={24} /> : "Add Position"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
