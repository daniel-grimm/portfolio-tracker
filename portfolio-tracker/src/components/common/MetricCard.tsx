import { Card, CardContent, Typography } from '@mui/material';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  color?: 'success' | 'error' | 'default';
}

export function MetricCard({ title, value, subtitle, color = 'default' }: MetricCardProps) {
  const getColor = () => {
    switch (color) {
      case 'success':
        return 'success.main';
      case 'error':
        return 'error.main';
      default:
        return 'text.primary';
    }
  };

  return (
    <Card elevation={2}>
      <CardContent>
        <Typography color="text.secondary" gutterBottom variant="body2">
          {title}
        </Typography>
        <Typography variant="h5" component="div" color={getColor()} fontWeight={600}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
