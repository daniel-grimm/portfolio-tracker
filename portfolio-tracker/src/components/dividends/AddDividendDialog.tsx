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
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  Alert,
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
  const { stocks, accounts, addDividend } = usePortfolio();
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0], // Today in YYYY-MM-DD
    amount: "",
    ticker: "",
    accountId: "",
    isReinvested: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!formData.date || !formData.amount || !formData.ticker || !formData.accountId) {
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
        accountId: formData.accountId,
        isReinvested: formData.isReinvested,
      });

      // Reset form
      setFormData({
        date: new Date().toISOString().split("T")[0],
        amount: "",
        ticker: "",
        accountId: "",
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
          {/* Warning if no accounts */}
          {accounts.length === 0 && (
            <Alert severity="warning">
              No accounts available. Please add an account first before adding a dividend.
            </Alert>
          )}

          {/* Account Selection */}
          <FormControl required error={!!errors.accountId} fullWidth>
            <InputLabel>Select Account</InputLabel>
            <Select
              value={formData.accountId}
              onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
              label="Select Account"
            >
              {accounts.length === 0 ? (
                <MenuItem disabled sx={{ backgroundColor: "background.default" }}>
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
            {errors.accountId && (
              <FormHelperText>{errors.accountId}</FormHelperText>
            )}
          </FormControl>

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
