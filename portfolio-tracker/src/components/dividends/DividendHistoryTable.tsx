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
} from "@mui/material";
import { Delete as DeleteIcon } from "@mui/icons-material";
import type { Dividend } from "../../types/dividend.types";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { usePortfolio } from "../../context/PortfolioContext";

interface DividendHistoryTableProps {
  dividends: Dividend[];
  onDelete: () => void;
}

export function DividendHistoryTable({
  dividends,
  onDelete,
}: DividendHistoryTableProps) {
  const { deleteDividend } = usePortfolio();

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
      <Typography variant="h6" sx={{ p: 2, backgroundColor: "primary.dark" }}>
        Dividend History
      </Typography>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow sx={{backgroundColor: "background.default"}}>
              <TableCell>Date</TableCell>
              <TableCell>Ticker</TableCell>
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
                <TableCell align="right">
                  {formatCurrency(dividend.amount)}
                </TableCell>
                <TableCell align="center">
                  {dividend.isReinvested ? "Yes" : "No"}
                </TableCell>
                <TableCell align="center">
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
