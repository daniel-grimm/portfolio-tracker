import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { useState, useEffect } from "react";
import { usePortfolio } from "../../context/PortfolioContext";
import type { Dividend } from "../../types/dividend.types";

interface EditDividendDialogProps {
  open: boolean;
  onClose: () => void;
  dividend: Dividend | null;
}

interface EditingDividend {
  date: string;
  ticker: string;
  accountId: string;
  amount: string;
  isReinvested: boolean;
}

export function EditDividendDialog({
  open,
  onClose,
  dividend,
}: EditDividendDialogProps) {
  const { updateDividend, stocks, accounts } = usePortfolio();

  const [editingValues, setEditingValues] = useState<EditingDividend>({
    date: "",
    ticker: "",
    accountId: "",
    amount: "",
    isReinvested: false,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [field: string]: string }>({});
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Initialize form when dividend changes
  useEffect(() => {
    if (dividend) {
      setEditingValues({
        date: dividend.date,
        ticker: dividend.ticker,
        accountId: dividend.accountId || "",
        amount: dividend.amount.toString(),
        isReinvested: dividend.isReinvested,
      });
      setErrors({});
      setSuccessMessage("");
      setErrorMessage("");
    }
  }, [dividend]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setEditingValues({
        date: "",
        ticker: "",
        accountId: "",
        amount: "",
        isReinvested: false,
      });
      setErrors({});
      setSuccessMessage("");
      setErrorMessage("");
      setLoading(false);
    }
  }, [open]);

  const handleFieldChange = (
    field: keyof EditingDividend,
    value: string | boolean
  ) => {
    setEditingValues({
      ...editingValues,
      [field]: value,
    });
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateDividend = (
    values: EditingDividend
  ): { [field: string]: string } => {
    const newErrors: { [field: string]: string } = {};

    // Date: required, valid date
    if (!values.date) {
      newErrors.date = "Required";
    } else {
      const date = new Date(values.date);
      if (isNaN(date.getTime())) {
        newErrors.date = "Invalid date";
      }
    }

    // Ticker: required
    if (!values.ticker) {
      newErrors.ticker = "Required";
    }

    // Account: required
    if (!values.accountId) {
      newErrors.accountId = "Required";
    }

    // Amount: required, > 0, numeric
    const amount = parseFloat(values.amount);
    if (!values.amount || isNaN(amount)) {
      newErrors.amount = "Required";
    } else if (amount <= 0) {
      newErrors.amount = "Must be > 0";
    }

    return newErrors;
  };

  const handleSave = async () => {
    if (!dividend) return;

    // Validate
    const validationErrors = validateDividend(editingValues);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      const updatedDividend: Omit<Dividend, "id"> = {
        date: editingValues.date,
        ticker: editingValues.ticker,
        accountId: editingValues.accountId,
        amount: parseFloat(editingValues.amount),
        isReinvested: editingValues.isReinvested,
      };

      await updateDividend(dividend.id, updatedDividend);

      setSuccessMessage("Dividend updated successfully");
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to update dividend"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!dividend) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ backgroundColor: "background.default" }}>
        Edit Dividend
      </DialogTitle>
      <DialogContent sx={{ backgroundColor: "background.default" }}>
        {/* Success Message */}
        {successMessage && (
          <Alert
            severity="success"
            onClose={() => setSuccessMessage("")}
            sx={{ mt: 2 }}
          >
            {successMessage}
          </Alert>
        )}

        {/* Error Message */}
        {errorMessage && (
          <Alert
            severity="error"
            onClose={() => setErrorMessage("")}
            sx={{ mt: 2 }}
          >
            {errorMessage}
          </Alert>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
          {/* Date Field */}
          <TextField
            label="Date"
            type="date"
            value={editingValues.date}
            onChange={(e) => handleFieldChange("date", e.target.value)}
            error={!!errors.date}
            helperText={errors.date}
            required
            fullWidth
            InputLabelProps={{ shrink: true }}
          />

          {/* Ticker Select */}
          <FormControl required error={!!errors.ticker} fullWidth>
            <InputLabel>Ticker</InputLabel>
            <Select
              value={editingValues.ticker}
              onChange={(e) => handleFieldChange("ticker", e.target.value)}
              label="Ticker"
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
            </Select>
            {errors.ticker && (
              <FormHelperText>{errors.ticker}</FormHelperText>
            )}
          </FormControl>

          {/* Account Select */}
          <FormControl required error={!!errors.accountId} fullWidth>
            <InputLabel>Account</InputLabel>
            <Select
              value={editingValues.accountId}
              onChange={(e) => handleFieldChange("accountId", e.target.value)}
              label="Account"
            >
              {accounts.map((account) => (
                <MenuItem
                  key={account.id}
                  value={account.id}
                  sx={{ backgroundColor: "background.default" }}
                >
                  {account.name} ({account.platform})
                </MenuItem>
              ))}
            </Select>
            {errors.accountId && (
              <FormHelperText>{errors.accountId}</FormHelperText>
            )}
          </FormControl>

          {/* Amount Field */}
          <TextField
            label="Amount"
            type="number"
            value={editingValues.amount}
            onChange={(e) => handleFieldChange("amount", e.target.value)}
            error={!!errors.amount}
            helperText={errors.amount}
            required
            fullWidth
            inputProps={{ min: 0, step: 0.01 }}
            InputProps={{ startAdornment: "$" }}
          />

          {/* Reinvested Checkbox */}
          <FormControlLabel
            control={
              <Checkbox
                checked={editingValues.isReinvested}
                onChange={(e) =>
                  handleFieldChange("isReinvested", e.target.checked)
                }
              />
            }
            label="Dividend was reinvested"
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ backgroundColor: "background.default" }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={24} /> : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
