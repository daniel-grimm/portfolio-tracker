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
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import { useState, useEffect } from "react";
import { usePortfolio } from "../../context/PortfolioContext";
import type { Account, Platform } from "../../types/account.types";
import { PLATFORMS } from "../../types/account.types";

interface ManageAccountsDialogProps {
  open: boolean;
  onClose: () => void;
}

interface EditingAccount {
  name: string;
  platform: Platform;
}

export function ManageAccountsDialog({
  open,
  onClose,
}: ManageAccountsDialogProps) {
  const { accounts, addAccount, updateAccount, deleteAccount } = usePortfolio();

  // New account state
  const [newAccount, setNewAccount] = useState<EditingAccount>({
    name: "",
    platform: "Fidelity",
  });
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Editing state
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<EditingAccount | null>(null);
  const [loadingAccountId, setLoadingAccountId] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ [field: string]: string }>({});
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setNewAccount({ name: "", platform: "Fidelity" });
      setIsAddingNew(false);
      setEditingAccountId(null);
      setEditingValues(null);
      setLoadingAccountId(null);
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

  const handleAddNew = async () => {
    setErrors({});
    setErrorMessage("");

    // Validate
    const newErrors: { [field: string]: string } = {};
    if (!newAccount.name.trim()) {
      newErrors.name = "Account name is required";
    }
    if (!newAccount.platform) {
      newErrors.platform = "Platform is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setIsAddingNew(true);
      await addAccount(newAccount);
      setSuccessMessage("Account added successfully");
      setNewAccount({ name: "", platform: "Fidelity" });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to add account");
    } finally {
      setIsAddingNew(false);
    }
  };

  const handleEdit = (account: Account) => {
    setEditingAccountId(account.id);
    setEditingValues({
      name: account.name,
      platform: account.platform,
    });
    setErrors({});
    setErrorMessage("");
  };

  const handleCancel = () => {
    setEditingAccountId(null);
    setEditingValues(null);
    setErrors({});
  };

  const handleFieldChange = (field: keyof EditingAccount, value: string) => {
    if (editingValues) {
      setEditingValues({
        ...editingValues,
        [field]: value,
      });
      // Clear error for this field
      if (errors[field]) {
        const newErrors = { ...errors };
        delete newErrors[field];
        setErrors(newErrors);
      }
    }
  };

  const handleSave = async (accountId: string) => {
    if (!editingValues) return;

    setErrors({});
    setErrorMessage("");

    // Validate
    const newErrors: { [field: string]: string } = {};
    if (!editingValues.name.trim()) {
      newErrors.name = "Account name is required";
    }
    if (!editingValues.platform) {
      newErrors.platform = "Platform is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setLoadingAccountId(accountId);
      await updateAccount(accountId, editingValues);
      setSuccessMessage("Account updated successfully");
      setEditingAccountId(null);
      setEditingValues(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update account");
    } finally {
      setLoadingAccountId(null);
    }
  };

  const handleDelete = async (accountId: string, accountName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${accountName}"?`)) {
      return;
    }

    try {
      setLoadingAccountId(accountId);
      setErrorMessage("");
      await deleteAccount(accountId);
      setSuccessMessage("Account deleted successfully");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to delete account"
      );
    } finally {
      setLoadingAccountId(null);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ backgroundColor: "background.default" }}>Manage Accounts</DialogTitle>
      <DialogContent sx={{ backgroundColor: "background.default" }}>
        {successMessage && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {successMessage}
          </Alert>
        )}
        {errorMessage && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMessage}
          </Alert>
        )}

        {/* Add New Account Section */}
        <Paper elevation={1} sx={{ p: 2, mb: 3, backgroundColor: "background.default" }}>
          <Typography variant="h6" gutterBottom>
            Add New Account
          </Typography>
          <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
            <TextField
              label="Account Name"
              value={newAccount.name}
              onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
              error={!!errors.name}
              helperText={errors.name}
              size="small"
              sx={{ flex: 1 }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }} error={!!errors.platform}>
              <InputLabel>Platform</InputLabel>
              <Select
                value={newAccount.platform}
                label="Platform"
                onChange={(e) =>
                  setNewAccount({ ...newAccount, platform: e.target.value as Platform })
                }
              >
                {PLATFORMS.map((platform) => (
                  <MenuItem
                    key={platform}
                    value={platform}
                    sx={{
                      backgroundColor: "background.default",
                      "&:hover": {
                        backgroundColor: "background.default",
                        color: "text.primary",
                      },
                    }}
                  >
                    {platform}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              startIcon={isAddingNew ? <CircularProgress size={20} /> : <AddIcon />}
              onClick={handleAddNew}
              disabled={isAddingNew}
            >
              Add
            </Button>
          </Box>
        </Paper>

        {/* Accounts Table */}
        {accounts.length === 0 ? (
          <Alert severity="info">
            No accounts yet. Add your first account above to get started.
          </Alert>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Account Name</TableCell>
                <TableCell>Platform</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {accounts.map((account) => {
                const isEditing = editingAccountId === account.id;
                const isLoading = loadingAccountId === account.id;

                return (
                  <TableRow key={account.id}>
                    <TableCell>
                      {isEditing ? (
                        <TextField
                          value={editingValues?.name || ""}
                          onChange={(e) => handleFieldChange("name", e.target.value)}
                          error={!!errors.name}
                          helperText={errors.name}
                          size="small"
                          fullWidth
                          disabled={isLoading}
                        />
                      ) : (
                        account.name
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <FormControl size="small" fullWidth error={!!errors.platform}>
                          <Select
                            value={editingValues?.platform || "Fidelity"}
                            onChange={(e) =>
                              handleFieldChange("platform", e.target.value)
                            }
                            disabled={isLoading}
                          >
                            {PLATFORMS.map((platform) => (
                              <MenuItem
                                key={platform}
                                value={platform}
                                sx={{
                                  backgroundColor: "background.default",
                                  "&:hover": {
                                    backgroundColor: "background.default",
                                    color: "text.primary",
                                  },
                                }}
                              >
                                {platform}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      ) : (
                        account.platform
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {isEditing ? (
                        <>
                          <IconButton
                            onClick={() => handleSave(account.id)}
                            disabled={isLoading}
                            color="primary"
                            size="small"
                          >
                            {isLoading ? (
                              <CircularProgress size={20} />
                            ) : (
                              <CheckIcon />
                            )}
                          </IconButton>
                          <IconButton
                            onClick={handleCancel}
                            disabled={isLoading}
                            color="default"
                            size="small"
                          >
                            <CloseIcon />
                          </IconButton>
                        </>
                      ) : (
                        <>
                          <IconButton
                            onClick={() => handleEdit(account)}
                            disabled={isLoading}
                            color="primary"
                            size="small"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            onClick={() => handleDelete(account.id, account.name)}
                            disabled={isLoading}
                            color="error"
                            size="small"
                          >
                            {isLoading ? (
                              <CircularProgress size={20} />
                            ) : (
                              <DeleteIcon />
                            )}
                          </IconButton>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions sx={{ backgroundColor: "background.default" }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
