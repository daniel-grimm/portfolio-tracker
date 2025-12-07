import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  MenuItem,
  Box,
} from "@mui/material";
import { usePortfolio } from "../../context/PortfolioContext";

interface AddDividendDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddDividendDialog({
  open,
  onClose,
  onSuccess,
}: AddDividendDialogProps) {
  const { stocks, addDividend } = usePortfolio();
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0], // Today in YYYY-MM-DD
    amount: "",
    ticker: "",
    isReinvested: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!formData.date || !formData.amount || !formData.ticker) {
      setError("Please fill in all required fields");
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      setError("Amount must be a positive number");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await addDividend({
        date: formData.date,
        amount,
        ticker: formData.ticker,
        isReinvested: formData.isReinvested,
      });

      // Reset form
      setFormData({
        date: new Date().toISOString().split("T")[0],
        amount: "",
        ticker: "",
        isReinvested: false,
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add dividend");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ backgroundColor: "background.default" }}>
        Add Dividend
      </DialogTitle>
      <DialogContent sx={{ backgroundColor: "background.default" }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
          <TextField
            label="Date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            InputLabelProps={{ shrink: true }}
            fullWidth
            required
          />
          <TextField
            label="Amount"
            type="number"
            value={formData.amount}
            onChange={(e) =>
              setFormData({ ...formData, amount: e.target.value })
            }
            InputProps={{
              startAdornment: "$",
            }}
            inputProps={{
              step: "0.01",
              min: "0",
            }}
            fullWidth
            required
          />
          <TextField
            label="Ticker"
            select
            value={formData.ticker}
            onChange={(e) =>
              setFormData({ ...formData, ticker: e.target.value })
            }
            fullWidth
            required
          >
            {stocks.map((stock) => (
              <MenuItem key={stock.ticker} value={stock.ticker} sx={{backgroundColor: "background.default"}}>
                {stock.ticker} - {stock.name}
              </MenuItem>
            ))}
          </TextField>
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.isReinvested}
                onChange={(e) =>
                  setFormData({ ...formData, isReinvested: e.target.checked })
                }
              />
            }
            label="Dividend was reinvested"
          />
          {error && (
            <Box sx={{ color: "error.main", fontSize: "0.875rem" }}>
              {error}
            </Box>
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
          {isSubmitting ? "Adding..." : "Add Dividend"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
