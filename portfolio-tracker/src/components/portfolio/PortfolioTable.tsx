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
import { useState } from "react";
import type { PositionMetadata } from "../../types/portfolio.types";
import { PositionRow } from "./PositionRow";
import { AddStockDialog } from "./AddStockDialog";
import { AddPositionDialog } from "./AddPositionDialog";

interface PortfolioTableProps {
  positions: PositionMetadata[];
}

export function PortfolioTable({ positions }: PortfolioTableProps) {
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [positionDialogOpen, setPositionDialogOpen] = useState(false);

  const handleEdit = (position: PositionMetadata) => {
    // Editing not yet implemented - would need to show list of individual positions
    console.warn("Edit position not yet implemented", position);
  };

  const handleDelete = (ticker: string) => {
    if (
      window.confirm(
        "Are you sure you want to delete all positions for this ticker?"
      )
    ) {
      // TODO: This will need to be updated to delete individual positions
      // For now, this is a placeholder
      console.warn("Delete position not yet implemented", ticker);
    }
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
    </>
  );
}
