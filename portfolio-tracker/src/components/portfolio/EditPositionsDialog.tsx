import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  IconButton,
  Alert,
  CircularProgress,
  Typography,
  Box,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { useState, useEffect } from "react";
import { usePortfolio } from "../../context/PortfolioContext";
import type { PositionMetadata, Position } from "../../types/portfolio.types";
import { formatNumber, formatCurrency } from "../../utils/formatters";

interface EditPositionsDialogProps {
  open: boolean;
  onClose: () => void;
  positionMetadata: PositionMetadata | null;
}

interface EditingPosition {
  quantity: string;
  costBasis: string;
  purchaseDate: string;
}

export function EditPositionsDialog({
  open,
  onClose,
  positionMetadata,
}: EditPositionsDialogProps) {
  const { updatePosition, deletePosition } = usePortfolio();

  // Editing state
  const [editingPositionId, setEditingPositionId] = useState<string | null>(
    null
  );
  const [editingValues, setEditingValues] = useState<EditingPosition | null>(
    null
  );
  const [loadingPositionId, setLoadingPositionId] = useState<string | null>(
    null
  );
  const [errors, setErrors] = useState<{ [field: string]: string }>({});
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setEditingPositionId(null);
      setEditingValues(null);
      setLoadingPositionId(null);
      setErrors({});
      setSuccessMessage("");
      setErrorMessage("");
    }
  }, [open]);

  // Auto-dismiss success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleEdit = (position: Position) => {
    setEditingPositionId(position.id);
    setEditingValues({
      quantity: position.quantity.toString(),
      costBasis: position.costBasis.toString(),
      purchaseDate: position.purchaseDate || "",
    });
    setErrors({});
    setErrorMessage("");
  };

  const handleCancel = () => {
    setEditingPositionId(null);
    setEditingValues(null);
    setErrors({});
  };

  const handleFieldChange = (field: keyof EditingPosition, value: string) => {
    if (editingValues) {
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
    }
  };

  const validatePosition = (
    values: EditingPosition
  ): { [field: string]: string } => {
    const newErrors: { [field: string]: string } = {};

    // Quantity: required, > 0, numeric
    const quantity = parseFloat(values.quantity);
    if (!values.quantity || isNaN(quantity)) {
      newErrors.quantity = "Required";
    } else if (quantity <= 0) {
      newErrors.quantity = "Must be > 0";
    }

    // Cost Basis: required, >= 0, numeric (can be zero)
    const costBasis = parseFloat(values.costBasis);
    if (
      values.costBasis === "" ||
      values.costBasis === null ||
      values.costBasis === undefined
    ) {
      newErrors.costBasis = "Required";
    } else if (isNaN(costBasis)) {
      newErrors.costBasis = "Must be a number";
    } else if (costBasis < 0) {
      newErrors.costBasis = "Cannot be negative";
    }

    // Purchase Date: optional, valid date, not in future
    if (values.purchaseDate) {
      const date = new Date(values.purchaseDate);
      if (isNaN(date.getTime())) {
        newErrors.purchaseDate = "Invalid date";
      } else if (date > new Date()) {
        newErrors.purchaseDate = "Cannot be in future";
      }
    }

    return newErrors;
  };

  const handleSave = async (positionId: string) => {
    if (!editingValues) return;

    // Validate
    const validationErrors = validatePosition(editingValues);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const position = positionMetadata?.positions.find(
      (p) => p.id === positionId
    );
    if (!position) return;

    try {
      setLoadingPositionId(positionId);
      setErrorMessage("");

      const updatedPosition: Omit<Position, "id"> = {
        ticker: position.ticker,
        quantity: parseFloat(editingValues.quantity),
        costBasis: parseFloat(editingValues.costBasis),
        purchaseDate: editingValues.purchaseDate || undefined,
      };

      await updatePosition(positionId, updatedPosition);

      // Exit edit mode
      setEditingPositionId(null);
      setEditingValues(null);
      setErrors({});
      setSuccessMessage("Position updated successfully");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to update position"
      );
    } finally {
      setLoadingPositionId(null);
    }
  };

  const handleDelete = async (positionId: string) => {
    // Show browser confirmation
    if (!window.confirm("Delete this position? This cannot be undone.")) {
      return;
    }

    try {
      setLoadingPositionId(positionId);
      setErrorMessage("");
      await deletePosition(positionId);

      // If last position deleted, close dialog
      if (positionMetadata && positionMetadata.positions.length === 1) {
        onClose();
      } else {
        setSuccessMessage("Position deleted successfully");
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to delete position"
      );
    } finally {
      setLoadingPositionId(null);
    }
  };

  if (!positionMetadata) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ backgroundColor: "background.default" }}>
        <Box>
          {positionMetadata.ticker}
          <Typography variant="subtitle2" color="text.secondary">
            {positionMetadata.stock.name}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ backgroundColor: "background.default" }}>
        <Box sx={{ mt: 2 }}>
          {/* Success Message */}
          {successMessage && (
            <Alert
              severity="success"
              onClose={() => setSuccessMessage("")}
              sx={{ mb: 2 }}
            >
              {successMessage}
            </Alert>
          )}

          {/* Error Message */}
          {errorMessage && (
            <Alert
              severity="error"
              onClose={() => setErrorMessage("")}
              sx={{ mb: 2 }}
            >
              {errorMessage}
            </Alert>
          )}

          {/* Positions Table */}
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell align="right">Quantity</TableCell>
                <TableCell align="right">Cost Basis</TableCell>
                <TableCell align="right">Purchase Date</TableCell>
                <TableCell align="right">Total Cost</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {positionMetadata.positions.map((position) => {
                const isEditing = editingPositionId === position.id;
                const isLoading = loadingPositionId === position.id;
                const totalCost = position.quantity * position.costBasis;

                return (
                  <TableRow key={position.id}>
                    {/* Quantity */}
                    <TableCell align="right">
                      {isEditing && editingValues ? (
                        <TextField
                          size="small"
                          type="number"
                          value={editingValues.quantity}
                          onChange={(e) =>
                            handleFieldChange("quantity", e.target.value)
                          }
                          error={!!errors.quantity}
                          helperText={errors.quantity}
                          autoFocus
                          inputProps={{ min: 0, step: 0.001 }}
                          sx={{ minWidth: 100 }}
                        />
                      ) : (
                        formatNumber(position.quantity, 3)
                      )}
                    </TableCell>

                    {/* Cost Basis */}
                    <TableCell align="right">
                      {isEditing && editingValues ? (
                        <TextField
                          size="small"
                          type="number"
                          value={editingValues.costBasis}
                          onChange={(e) =>
                            handleFieldChange("costBasis", e.target.value)
                          }
                          error={!!errors.costBasis}
                          helperText={errors.costBasis}
                          inputProps={{ min: 0, step: 0.01 }}
                          sx={{ minWidth: 100 }}
                        />
                      ) : (
                        formatCurrency(position.costBasis)
                      )}
                    </TableCell>

                    {/* Purchase Date */}
                    <TableCell align="right">
                      {isEditing && editingValues ? (
                        <TextField
                          size="small"
                          type="date"
                          value={editingValues.purchaseDate}
                          onChange={(e) =>
                            handleFieldChange("purchaseDate", e.target.value)
                          }
                          error={!!errors.purchaseDate}
                          helperText={errors.purchaseDate}
                          InputLabelProps={{ shrink: true }}
                          sx={{ minWidth: 140 }}
                        />
                      ) : (
                        position.purchaseDate || "—"
                      )}
                    </TableCell>

                    {/* Total Cost */}
                    <TableCell align="right">
                      {formatCurrency(totalCost)}
                    </TableCell>

                    {/* Actions */}
                    <TableCell align="right">
                      {isEditing ? (
                        <>
                          <IconButton
                            onClick={() => handleSave(position.id)}
                            disabled={isLoading}
                            size="small"
                            color="success"
                          >
                            {isLoading ? (
                              <CircularProgress size={20} />
                            ) : (
                              <CheckIcon fontSize="small" />
                            )}
                          </IconButton>
                          <IconButton
                            onClick={handleCancel}
                            disabled={isLoading}
                            size="small"
                            color="error"
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </>
                      ) : (
                        <>
                          <IconButton
                            onClick={() => handleEdit(position)}
                            disabled={editingPositionId !== null}
                            size="small"
                            color="primary"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            onClick={() => handleDelete(position.id)}
                            disabled={editingPositionId !== null || isLoading}
                            size="small"
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      </DialogContent>
      <DialogActions sx={{ backgroundColor: "background.default" }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
