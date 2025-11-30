import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Alert,
  CircularProgress,
  Typography,
} from "@mui/material";
import { useState, useEffect } from "react";

interface ConfirmDeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  ticker: string;
  stockName: string;
  positionCount: number;
}

export function ConfirmDeleteDialog({
  open,
  onClose,
  onConfirm,
  ticker,
  stockName,
  positionCount,
}: ConfirmDeleteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setError("");
      setLoading(false);
    }
  }, [open]);

  const handleDelete = async () => {
    try {
      setLoading(true);
      setError("");
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete stock");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={!loading ? onClose : undefined}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ backgroundColor: "background.default" }}>
        Confirm Delete Stock
      </DialogTitle>
      <DialogContent sx={{ backgroundColor: "background.default" }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          {/* Warning Alert */}
          <Alert severity="warning">
            <strong>Warning:</strong> This action cannot be undone
          </Alert>

          {/* Stock Info */}
          <Box>
            <Typography variant="body1" gutterBottom>
              You are about to delete:
            </Typography>
            <Typography variant="body2" component="div" sx={{ ml: 2 }}>
              • <strong>Stock:</strong> {ticker} - {stockName}
            </Typography>
            <Typography variant="body2" component="div" sx={{ ml: 2 }}>
              • <strong>{positionCount}</strong> position
              {positionCount !== 1 ? "s" : ""} will be permanently deleted
            </Typography>
          </Box>

          {/* Explanation */}
          <Typography variant="body2" color="text.secondary">
            This will remove the stock and all associated purchase positions
            from your portfolio.
          </Typography>

          {/* Error Display (if any) */}
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
          onClick={handleDelete}
          variant="contained"
          color="error"
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : "Delete"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
