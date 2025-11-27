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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useState } from 'react';
import type { EnrichedHolding } from '../../types/portfolio.types';
import { HoldingRow } from './HoldingRow';
import { AddHoldingDialog } from './AddHoldingDialog';
import { usePortfolio } from '../../context/PortfolioContext';

interface PortfolioTableProps {
  holdings: EnrichedHolding[];
}

export function PortfolioTable({ holdings }: PortfolioTableProps) {
  const { deleteHolding } = usePortfolio();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<EnrichedHolding | null>(null);

  const handleEdit = (holding: EnrichedHolding) => {
    setEditingHolding(holding);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this holding?')) {
      deleteHolding(id);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingHolding(null);
  };

  if (holdings.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Holdings Yet
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Start by adding your first stock holding
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          Add Holding
        </Button>
        <AddHoldingDialog
          open={dialogOpen}
          onClose={handleCloseDialog}
          editingHolding={null}
        />
      </Paper>
    );
  }

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Portfolio Holdings</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          Add Holding
        </Button>
      </Box>
      <TableContainer component={Paper} elevation={2}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Ticker</TableCell>
              <TableCell>Name</TableCell>
              <TableCell align="right">Shares</TableCell>
              <TableCell align="right">Cost Basis</TableCell>
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
            {holdings.map((holding) => (
              <HoldingRow
                key={holding.id}
                holding={holding}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <AddHoldingDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        editingHolding={editingHolding}
      />
    </>
  );
}
