import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  IconButton,
  Box,
  Chip,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import type { Stock } from "../../types/portfolio.types";
import { formatCurrency, formatPercent } from "../../utils/formatters";

interface StocksTableProps {
  stocks: Stock[];
  onEdit: (stock: Stock) => void;
  onDelete: (ticker: string) => void;
}

export function StocksTable({ stocks, onEdit, onDelete }: StocksTableProps) {
  const sortedStocks = [...stocks].sort((a, b) =>
    a.ticker.localeCompare(b.ticker)
  );

  const calculateDividendYield = (stock: Stock): number => {
    return stock.currentPrice > 0
      ? (stock.annualDividend / stock.currentPrice) * 100
      : 0;
  };

  if (stocks.length === 0) {
    return (
      <Paper
        sx={{
          p: 4,
          textAlign: "center",
          backgroundColor: "primary.dark",
        }}
      >
        <Typography variant="h6" color="text.secondary">
          No stocks yet
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Add your first stock to get started
        </Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper} elevation={2}>
      <Table size="small" sx={{ backgroundColor: "primary.dark" }}>
        <TableHead>
          <TableRow>
            <TableCell>Ticker</TableCell>
            <TableCell>Name</TableCell>
            <TableCell align="right">Current Price</TableCell>
            <TableCell align="right">Div Yield</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedStocks.map((stock) => (
            <TableRow key={stock.ticker}>
              <TableCell>
                <Typography variant="body1" fontWeight="bold">
                  {stock.ticker}
                </Typography>
              </TableCell>
              <TableCell>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography>{stock.name}</Typography>
                  <Chip
                    label={
                      stock.securityType === "etf"
                        ? "ETF"
                        : stock.securityType === "mutualfund"
                        ? "Mutual Fund"
                        : "Stock"
                    }
                    size="small"
                    color={
                      stock.securityType === "etf"
                        ? "secondary"
                        : stock.securityType === "mutualfund"
                        ? "success"
                        : "primary"
                    }
                  />
                </Box>
              </TableCell>
              <TableCell align="right">
                {formatCurrency(stock.currentPrice)}
              </TableCell>
              <TableCell align="right">
                {formatPercent(calculateDividendYield(stock))}
              </TableCell>
              <TableCell align="right">
                <IconButton
                  size="small"
                  onClick={() => onEdit(stock)}
                  color="primary"
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => onDelete(stock.ticker)}
                  color="error"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
