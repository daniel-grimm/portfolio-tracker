import { Box, Button, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useState } from "react";
import type { Stock } from "../types/portfolio.types";
import { usePortfolio } from "../context/PortfolioContext";
import { StocksTable } from "../components/stocks/StocksTable";
import { AddStockDialog } from "../components/portfolio/AddStockDialog";
import { EditStockDialog } from "../components/stocks/EditStockDialog";
import { ConfirmDeleteDialog } from "../components/portfolio/ConfirmDeleteDialog";

export function Tickers() {
  const { stocks, aggregatedPositions, deleteStock } = usePortfolio();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [stockToEdit, setStockToEdit] = useState<Stock | null>(null);
  const [tickerToDelete, setTickerToDelete] = useState<string | null>(null);

  const handleEdit = (stock: Stock) => {
    setStockToEdit(stock);
    setEditDialogOpen(true);
  };

  const handleDelete = (ticker: string) => {
    setTickerToDelete(ticker);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!tickerToDelete) return;
    await deleteStock(tickerToDelete);
    setDeleteDialogOpen(false);
    setTickerToDelete(null);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setTickerToDelete(null);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setStockToEdit(null);
  };

  // Calculate position count for the selected ticker
  const aggregatedPosition = aggregatedPositions.find(
    (ap) => ap.ticker === tickerToDelete
  );
  const positionCount = aggregatedPosition?.positions.length || 0;

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h5">Stock Tickers</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAddDialogOpen(true)}
        >
          Add Stock
        </Button>
      </Box>

      <StocksTable
        stocks={stocks}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <AddStockDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
      />

      <EditStockDialog
        open={editDialogOpen}
        onClose={handleCloseEditDialog}
        stock={stockToEdit}
      />

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleConfirmDelete}
        ticker={tickerToDelete || ""}
        stockName={
          stocks.find((s) => s.ticker === tickerToDelete)?.name || ""
        }
        positionCount={positionCount}
      />
    </Box>
  );
}
