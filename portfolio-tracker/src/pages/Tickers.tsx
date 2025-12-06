import { Box, Button, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useState } from "react";
import type { Stock } from "../types/portfolio.types";
import { usePortfolio } from "../context/PortfolioContext";
import { StocksTable } from "../components/stocks/StocksTable";
import { AddStockDialog } from "../components/portfolio/AddStockDialog";
import { EditStockDialog } from "../components/stocks/EditStockDialog";
import { ConfirmDeleteDialog } from "../components/portfolio/ConfirmDeleteDialog";
import { fetchStockQuote } from "../services/finnhubService";
import { fetchMutualFundQuote } from "../services/alphaVantageService";

export function Tickers() {
  const { stocks, aggregatedPositions, deleteStock, updateStock } =
    usePortfolio();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [stockToEdit, setStockToEdit] = useState<Stock | null>(null);
  const [tickerToDelete, setTickerToDelete] = useState<string | null>(null);
  const [refreshingTicker, setRefreshingTicker] = useState<string | null>(null);

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

  const handleRefresh = async (ticker: string) => {
    const stock = stocks.find((s) => s.ticker === ticker);
    if (!stock) return;

    try {
      setRefreshingTicker(ticker);

      // Fetch new price based on security type
      let newPrice: number;
      if (stock.securityType === "mutualfund") {
        const quote = await fetchMutualFundQuote(ticker);
        newPrice = quote.c;
      } else {
        // stocks and ETFs both use Finnhub
        const quote = await fetchStockQuote(ticker);
        newPrice = quote.c;
      }

      // Update stock with new price and timestamp
      await updateStock(ticker, {
        currentPrice: newPrice,
        lastUpdated: Date.now(),
      });
    } catch (error) {
      console.error(`Failed to refresh price for ${ticker}:`, error);
      // Could show a toast/snackbar here in the future
    } finally {
      setRefreshingTicker(null);
    }
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
          Add Ticker
        </Button>
      </Box>

      <StocksTable
        stocks={stocks}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRefresh={handleRefresh}
        refreshing={refreshingTicker}
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
        stockName={stocks.find((s) => s.ticker === tickerToDelete)?.name || ""}
        positionCount={positionCount}
      />
    </Box>
  );
}
