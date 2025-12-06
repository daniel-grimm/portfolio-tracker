import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Button,
  Box,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useState, useEffect } from "react";
import type { PositionMetadata } from "../../types/portfolio.types";
import { PositionRow } from "./PositionRow";
import { AddStockDialog } from "./AddStockDialog";
import { AddPositionDialog } from "./AddPositionDialog";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";
import { EditPositionsDialog } from "./EditPositionsDialog";
import { ManageAccountsDialog } from "./ManageAccountsDialog";
import { usePortfolio } from "../../context/PortfolioContext";
import { enrichPosition } from "../../utils/calculations";

interface PortfolioTableProps {
  positions: PositionMetadata[];
}

export function PortfolioTable({ positions }: PortfolioTableProps) {
  const { deleteAllPositionsForTicker, aggregatedPositions } = usePortfolio();
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [positionDialogOpen, setPositionDialogOpen] = useState(false);
  const [accountsDialogOpen, setAccountsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tickerToDelete, setTickerToDelete] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [positionToEdit, setPositionToEdit] = useState<PositionMetadata | null>(
    null
  );

  // Sync positionToEdit with updated aggregatedPositions
  useEffect(() => {
    if (positionToEdit && editDialogOpen) {
      const updatedPosition = aggregatedPositions.find(
        (p) => p.ticker === positionToEdit.ticker
      );
      if (updatedPosition) {
        const enrichedPosition = enrichPosition(updatedPosition);
        if (enrichedPosition) {
          setPositionToEdit(enrichedPosition);
        }
      }
    }
  }, [aggregatedPositions, positionToEdit, editDialogOpen]);

  const handleEdit = (position: PositionMetadata) => {
    setPositionToEdit(position);
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setPositionToEdit(null);
  };

  const handleDelete = (ticker: string) => {
    setTickerToDelete(ticker);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!tickerToDelete) return;
    await deleteAllPositionsForTicker(tickerToDelete);
    setDeleteDialogOpen(false);
    setTickerToDelete(null);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setTickerToDelete(null);
  };

  if (positions.length === 0) {
    return (
      <>
        <Paper
          sx={{
            p: 4,
            textAlign: "center",
            backgroundColor: "primary.dark",
          }}
        >
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Positions Yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Start by adding a stock and then add positions
          </Typography>
          <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
            <Button
              variant="outlined"
              onClick={() => setAccountsDialogOpen(true)}
            >
              Manage Accounts
            </Button>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setStockDialogOpen(true)}
            >
              Add Stock
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setPositionDialogOpen(true)}
            >
              Add Position
            </Button>
          </Box>
        </Paper>
        <AddStockDialog
          open={stockDialogOpen}
          onClose={() => setStockDialogOpen(false)}
        />
        <AddPositionDialog
          open={positionDialogOpen}
          onClose={() => setPositionDialogOpen(false)}
        />
        <ConfirmDeleteDialog
          open={deleteDialogOpen}
          onClose={handleCloseDeleteDialog}
          onConfirm={handleConfirmDelete}
          ticker={tickerToDelete || ""}
          stockName={
            positions.find((p) => p.ticker === tickerToDelete)?.stock.name || ""
          }
          positionCount={
            positions.find((p) => p.ticker === tickerToDelete)?.positions
              .length || 0
          }
        />
        <EditPositionsDialog
          open={editDialogOpen}
          onClose={handleCloseEditDialog}
          positionMetadata={positionToEdit}
        />
        <ManageAccountsDialog
          open={accountsDialogOpen}
          onClose={() => setAccountsDialogOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6">Portfolio Positions</Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => setAccountsDialogOpen(true)}
          >
            Manage Accounts
          </Button>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setStockDialogOpen(true)}
          >
            Add Stock
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setPositionDialogOpen(true)}
          >
            Add Position
          </Button>
        </Box>
      </Box>
      <TableContainer component={Paper} elevation={2}>
        <Table size="small" sx={{ backgroundColor: "primary.dark" }}>
          <TableHead>
            <TableRow>
              <TableCell>Ticker</TableCell>
              <TableCell>Name</TableCell>
              <TableCell align="right">Shares</TableCell>
              <TableCell align="right">Avg Cost Basis</TableCell>
              <TableCell align="right">Current Price</TableCell>
              <TableCell align="right">Current Value</TableCell>
              <TableCell align="right">Gain/Loss ($)</TableCell>
              <TableCell align="right">Gain/Loss (%)</TableCell>
              <TableCell align="right">Div Yield</TableCell>
              <TableCell align="right">Yield on Cost</TableCell>
              <TableCell align="right">Annual Income</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {positions.map((position) => (
              <PositionRow
                key={position.ticker}
                position={position}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <AddStockDialog
        open={stockDialogOpen}
        onClose={() => setStockDialogOpen(false)}
      />
      <AddPositionDialog
        open={positionDialogOpen}
        onClose={() => setPositionDialogOpen(false)}
      />
      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleConfirmDelete}
        ticker={tickerToDelete || ""}
        stockName={
          positions.find((p) => p.ticker === tickerToDelete)?.stock.name || ""
        }
        positionCount={
          positions.find((p) => p.ticker === tickerToDelete)?.positions
            .length || 0
        }
      />
      <EditPositionsDialog
        open={editDialogOpen}
        onClose={handleCloseEditDialog}
        positionMetadata={positionToEdit}
      />
      <ManageAccountsDialog
        open={accountsDialogOpen}
        onClose={() => setAccountsDialogOpen(false)}
      />
    </>
  );
}
