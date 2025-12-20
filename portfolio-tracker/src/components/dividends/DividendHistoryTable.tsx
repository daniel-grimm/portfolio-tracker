import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Box,
  Button,
} from "@mui/material";
import { Delete as DeleteIcon, Edit as EditIcon, Add as AddIcon, Campaign as CampaignIcon } from "@mui/icons-material";
import type { Dividend } from "../../types/dividend.types";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { usePortfolio } from "../../context/PortfolioContext";

interface DividendHistoryTableProps {
  dividends: Dividend[];
  onDelete: () => void;
  onEdit: (dividend: Dividend) => void;
  onAdd: () => void;
  onAnnounce: () => void;
}

export function DividendHistoryTable({
  dividends,
  onDelete,
  onEdit,
  onAdd,
  onAnnounce,
}: DividendHistoryTableProps) {
  const { deleteDividend, accounts } = usePortfolio();

  const getAccountDisplay = (accountId?: string): string => {
    if (!accountId) return "";
    const account = accounts.find((a) => a.id === accountId);
    return account ? `${account.name} (${account.platform})` : "";
  };

  // Sort by date descending (most recent first)
  const sortedDividends = [...dividends].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this dividend?")) {
      try {
        await deleteDividend(id);
        onDelete();
      } catch (err) {
        console.error("Error deleting dividend:", err);
      }
    }
  };

  if (dividends.length === 0) {
    return (
      <Paper
        sx={{ p: 3, mt: 4, backgroundColor: "primary.dark" }}
        elevation={2}
      >
        <Typography variant="h6" gutterBottom>
          Dividend History
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          No dividend records found. Add your first dividend to get started.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ mt: 4 }} elevation={2}>
      <Box
        sx={{
          p: 2,
          backgroundColor: "primary.dark",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="h6">Dividend History</Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="outlined" startIcon={<CampaignIcon />} onClick={onAnnounce}>
            Announce Dividend
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>
            Add Dividend
          </Button>
        </Box>
      </Box>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow sx={{backgroundColor: "background.default"}}>
              <TableCell>Date</TableCell>
              <TableCell>Ticker</TableCell>
              <TableCell>Account</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell align="center">Reinvested</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedDividends.map((dividend) => (
              <TableRow key={dividend.id} sx={{backgroundColor: "background.default"}}>
                <TableCell>
                  {formatDate(dividend.date)}
                </TableCell>
                <TableCell>{dividend.ticker}</TableCell>
                <TableCell>
                  {getAccountDisplay(dividend.accountId)}
                </TableCell>
                <TableCell align="right">
                  {formatCurrency(dividend.amount)}
                </TableCell>
                <TableCell align="center">
                  {dividend.isReinvested ? "Yes" : "No"}
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    onClick={() => onEdit(dividend)}
                    color="primary"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(dividend.id)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
