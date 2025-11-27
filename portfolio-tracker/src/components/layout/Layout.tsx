import { Container, Box } from '@mui/material';
import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {children}
      </Container>
    </Box>
  );
}
