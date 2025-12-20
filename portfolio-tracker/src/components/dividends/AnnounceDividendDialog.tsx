import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  Alert,
  CircularProgress,
} from "@mui/material";
import { usePortfolio } from "../../context/PortfolioContext";
import { dividendsApi } from "../../services/dividendsApi";

interface AnnounceDividendDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AnnounceDividendDialog({
  open,
  onClose,
  onSuccess,
}: AnnounceDividendDialogProps) {
  const { stocks } = usePortfolio();
  const [formData, setFormData] = useState({
    ticker: "",
    perShareAmount: "",
    declarationDate: new Date().toISOString().split("T")[0],
    paymentDate: new Date().toISOString().split("T")[0],
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!formData.ticker || !formData.perShareAmount || !formData.paymentDate) {
      setError("Please fill in all required fields");
      return;
    }

    const amount = parseFloat(formData.perShareAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Per-share amount must be a positive number");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      const result = await dividendsApi.announceDividend(
        formData.ticker,
        amount,
        formData.paymentDate,
        formData.declarationDate
      );

      setSuccess(result.message);

      // Reset form after brief delay
      setTimeout(() => {
        setFormData({
          ticker: "",
          perShareAmount: "",
          declarationDate: new Date().toISOString().split("T")[0],
          paymentDate: new Date().toISOString().split("T")[0],
        });
        onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to announce dividend");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setError(null);
      setSuccess(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ backgroundColor: "background.default" }}>
        Announce Dividend
      </DialogTitle>
      <DialogContent sx={{ backgroundColor: "background.default" }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
          <Alert severity="info">
            This will automatically create dividend entries for ALL accounts holding this ticker.
            The amount will be calculated as: shares × per-share amount.
          </Alert>

          {/* Ticker Selection */}
          <TextField
            label="Ticker"
            select
            value={formData.ticker}
            onChange={(e) => setFormData({ ...formData, ticker: e.target.value })}
            fullWidth
            required
          >
            {stocks.map((stock) => (
              <MenuItem
                key={stock.ticker}
                value={stock.ticker}
                sx={{ backgroundColor: "background.default" }}
              >
                {stock.ticker} - {stock.name}
              </MenuItem>
            ))}
          </TextField>

          {/* Per-Share Amount */}
          <TextField
            label="Dividend Per Share"
            type="number"
            value={formData.perShareAmount}
            onChange={(e) => setFormData({ ...formData, perShareAmount: e.target.value })}
            InputProps={{
              startAdornment: "$",
            }}
            inputProps={{
              step: "0.01",
              min: "0",
            }}
            helperText="Enter the dividend amount per share"
            fullWidth
            required
          />

          {/* Declaration Date */}
          <TextField
            label="Declaration Date"
            type="date"
            value={formData.declarationDate}
            onChange={(e) => setFormData({ ...formData, declarationDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
            helperText="When the dividend was announced (optional)"
            fullWidth
          />

          {/* Payment Date */}
          <TextField
            label="Payment Date"
            type="date"
            value={formData.paymentDate}
            onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
            helperText="When the dividend will be/was paid"
            fullWidth
            required
          />

          {/* Error Display */}
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Success Display */}
          {success && (
            <Alert severity="success">
              {success}
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ backgroundColor: "background.default" }}>
        <Button onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Creating...
            </>
          ) : (
            "Announce Dividend"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
