import { TableRow, TableCell, IconButton } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import type { PositionMetadata } from "../../types/portfolio.types";
import {
  formatCurrency,
  formatPercent,
  formatNumber,
} from "../../utils/formatters";

interface PositionRowProps {
  position: PositionMetadata;
  onEdit: (position: PositionMetadata) => void;
  onDelete: (ticker: string) => void;
}

export function PositionRow({ position, onEdit, onDelete }: PositionRowProps) {
  const getGainLossColor = (value: number) => {
    if (value > 0) return "success.main";
    if (value < 0) return "error.main";
    return "text.primary";
  };

  return (
    <TableRow hover>
      <TableCell>{position.ticker}</TableCell>
      <TableCell>{position.stock.name}</TableCell>
      <TableCell align="right">{formatNumber(position.totalQuantity, 0)}</TableCell>
      <TableCell align="right">{formatCurrency(position.weightedAverageCostBasis)}</TableCell>
      <TableCell align="right">
        {formatCurrency(position.stock.currentPrice)}
      </TableCell>
      <TableCell align="right">
        {formatCurrency(position.currentValue)}
      </TableCell>
      <TableCell
        align="right"
        sx={{ color: getGainLossColor(position.gainLoss) }}
      >
        {formatCurrency(position.gainLoss)}
      </TableCell>
      <TableCell
        align="right"
        sx={{ color: getGainLossColor(position.gainLossPercent) }}
      >
        {formatPercent(position.gainLossPercent)}
      </TableCell>
      <TableCell align="right">
        {formatPercent(position.dividendYield)}
      </TableCell>
      <TableCell align="right">{formatPercent(position.yieldOnCost)}</TableCell>
      <TableCell align="right">
        {formatCurrency(position.annualIncome)}
      </TableCell>
      <TableCell align="right">
        <IconButton
          size="small"
          onClick={() => onEdit(position)}
          color="primary"
        >
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => onDelete(position.ticker)}
          color="error"
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </TableCell>
    </TableRow>
  );
}
