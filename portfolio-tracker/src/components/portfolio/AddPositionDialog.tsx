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
  const { addPosition, stocks, accounts } = usePortfolio();

  // Form fields
  const [accountId, setAccountId] = useState("");
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
    setAccountId("");
    setTicker("");
    setQuantity("");
    setCostBasis("");
    setPurchaseDate("");
    setError("");
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!accountId) {
      newErrors.accountId = "Please select an account";
    }

    if (!ticker) {
      newErrors.ticker = "Please select a ticker";
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

    const position: Omit<Position, "id"> = {
      ticker: ticker.toUpperCase(),
      quantity: parseFloat(quantity),
      costBasis: parseFloat(costBasis),
      purchaseDate: purchaseDate || undefined,
      accountId: accountId || undefined,
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

  const selectedStock = stocks.find((s) => s.ticker === ticker);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ backgroundColor: "background.default" }}>
        Add New Position
      </DialogTitle>
      <DialogContent sx={{ backgroundColor: "background.default" }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            mt: 1,
          }}
        >
          {/* Warning if no accounts */}
          {accounts.length === 0 && (
            <Alert severity="warning">
              No accounts available. Please add an account first before creating a
              position.
            </Alert>
          )}

          {/* Account Selection */}
          <FormControl required error={!!errors.accountId} fullWidth>
            <InputLabel>Select Account</InputLabel>
            <Select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              label="Select Account"
            >
              {accounts.length === 0 ? (
                <MenuItem
                  disabled
                  sx={{ backgroundColor: "background.default" }}
                >
                  No accounts available. Add an account first.
                </MenuItem>
              ) : (
                accounts.map((account) => (
                  <MenuItem
                    key={account.id}
                    value={account.id}
                    sx={{
                      backgroundColor: "background.default",
                      "&:hover": {
                        backgroundColor: "background.default",
                        color: "text.primary",
                      },
                    }}
                  >
                    {account.name} ({account.platform})
                  </MenuItem>
                ))
              )}
            </Select>
            {errors.accountId && <FormHelperText>{errors.accountId}</FormHelperText>}
          </FormControl>

          {/* Stock Selection */}
          <FormControl required error={!!errors.ticker} fullWidth>
            <InputLabel>Select Stock</InputLabel>
            <Select
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              label="Select Stock"
            >
              {stocks.length === 0 ? (
                <MenuItem
                  disabled
                  sx={{ backgroundColor: "background.default" }}
                >
                  No stocks available. Add a stock first.
                </MenuItem>
              ) : (
                stocks.map((stock) => (
                  <MenuItem
                    key={stock.ticker}
                    value={stock.ticker}
                    sx={{
                      backgroundColor: "background.default",
                      "&:hover": {
                        backgroundColor: "background.default",
                        color: "text.primary",
                      },
                    }}
                  >
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
                <strong>Current Price:</strong> $
                {selectedStock.currentPrice.toFixed(2)}
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
            label="Shares"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            error={!!errors.quantity}
            helperText={errors.quantity || ""}
            required
            fullWidth
            inputProps={{ min: 0, step: 0.001 }}
          />

          {/* Cost Basis */}
          <TextField
            label="Cost Basis"
            type="number"
            value={costBasis}
            onChange={(e) => setCostBasis(e.target.value)}
            error={!!errors.costBasis}
            helperText={errors.costBasis || ""}
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

        </Box>
      </DialogContent>
      <DialogActions sx={{ backgroundColor: "background.default" }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || stocks.length === 0 || accounts.length === 0}
        >
          {loading ? <CircularProgress size={24} /> : "Add Position"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
