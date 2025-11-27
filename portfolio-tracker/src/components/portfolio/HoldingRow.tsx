import { TableRow, TableCell, IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import type { EnrichedHolding } from '../../types/portfolio.types';
import { formatCurrency, formatPercent, formatNumber } from '../../utils/formatters';

interface HoldingRowProps {
  holding: EnrichedHolding;
  onEdit: (holding: EnrichedHolding) => void;
  onDelete: (id: string) => void;
}

export function HoldingRow({ holding, onEdit, onDelete }: HoldingRowProps) {
  const getGainLossColor = (value: number) => {
    if (value > 0) return 'success.main';
    if (value < 0) return 'error.main';
    return 'text.primary';
  };

  return (
    <TableRow hover>
      <TableCell>{holding.ticker}</TableCell>
      <TableCell>{holding.stockData.name}</TableCell>
      <TableCell align="right">{formatNumber(holding.quantity, 0)}</TableCell>
      <TableCell align="right">{formatCurrency(holding.costBasis)}</TableCell>
      <TableCell align="right">{formatCurrency(holding.stockData.currentPrice)}</TableCell>
      <TableCell align="right">{formatCurrency(holding.currentValue)}</TableCell>
      <TableCell align="right" sx={{ color: getGainLossColor(holding.gainLoss) }}>
        {formatCurrency(holding.gainLoss)}
      </TableCell>
      <TableCell align="right" sx={{ color: getGainLossColor(holding.gainLossPercent) }}>
        {formatPercent(holding.gainLossPercent)}
      </TableCell>
      <TableCell align="right">{formatPercent(holding.dividendYield)}</TableCell>
      <TableCell align="right">{formatPercent(holding.yieldOnCost)}</TableCell>
      <TableCell align="right">{formatCurrency(holding.annualIncome)}</TableCell>
      <TableCell align="right">
        <IconButton size="small" onClick={() => onEdit(holding)} color="primary">
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={() => onDelete(holding.id)} color="error">
          <DeleteIcon fontSize="small" />
        </IconButton>
      </TableCell>
    </TableRow>
  );
}
