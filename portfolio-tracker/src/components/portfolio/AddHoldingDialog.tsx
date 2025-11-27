import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  Box,
} from '@mui/material';
import { useState, useEffect } from 'react';
import { usePortfolio } from '../../context/PortfolioContext';
import { getAllTickers, getStockData } from '../../data/mockStocks';
import type { EnrichedHolding } from '../../types/portfolio.types';

interface AddHoldingDialogProps {
  open: boolean;
  onClose: () => void;
  editingHolding: EnrichedHolding | null;
}

export function AddHoldingDialog({ open, onClose, editingHolding }: AddHoldingDialogProps) {
  const { addHolding, updateHolding } = usePortfolio();
  const [ticker, setTicker] = useState('');
  const [quantity, setQuantity] = useState('');
  const [costBasis, setCostBasis] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const allTickers = getAllTickers();

  useEffect(() => {
    if (editingHolding) {
      setTicker(editingHolding.ticker);
      setQuantity(editingHolding.quantity.toString());
      setCostBasis(editingHolding.costBasis.toString());
    } else {
      setTicker('');
      setQuantity('');
      setCostBasis('');
    }
    setErrors({});
  }, [editingHolding, open]);

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!ticker) {
      newErrors.ticker = 'Please select a ticker';
    } else if (!getStockData(ticker)) {
      newErrors.ticker = 'Invalid ticker symbol';
    }

    const quantityNum = parseFloat(quantity);
    if (!quantity || isNaN(quantityNum) || quantityNum <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }

    const costBasisNum = parseFloat(costBasis);
    if (!costBasis || isNaN(costBasisNum) || costBasisNum <= 0) {
      newErrors.costBasis = 'Cost basis must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    const holdingData = {
      ticker,
      quantity: parseFloat(quantity),
      costBasis: parseFloat(costBasis),
    };

    if (editingHolding) {
      updateHolding(editingHolding.id, holdingData);
    } else {
      addHolding(holdingData);
    }

    handleClose();
  };

  const handleClose = () => {
    setTicker('');
    setQuantity('');
    setCostBasis('');
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {editingHolding ? 'Edit Holding' : 'Add New Holding'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Autocomplete
            options={allTickers}
            value={ticker}
            onChange={(_, newValue) => setTicker(newValue || '')}
            getOptionLabel={(option) => {
              const stock = getStockData(option);
              return stock ? `${option} - ${stock.name}` : option;
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Stock Ticker"
                error={!!errors.ticker}
                helperText={errors.ticker}
                required
              />
            )}
            disabled={!!editingHolding}
          />
          <TextField
            label="Quantity (Shares)"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            error={!!errors.quantity}
            helperText={errors.quantity}
            required
            inputProps={{ min: 0, step: 0.001 }}
          />
          <TextField
            label="Cost Basis (Price per Share)"
            type="number"
            value={costBasis}
            onChange={(e) => setCostBasis(e.target.value)}
            error={!!errors.costBasis}
            helperText={errors.costBasis}
            required
            inputProps={{ min: 0, step: 0.01 }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">
          {editingHolding ? 'Update' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
