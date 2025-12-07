import { AppBar, Toolbar, Typography, Tabs, Tab, Container } from '@mui/material';

interface HeaderProps {
  currentTab: number;
  onTabChange: (tab: number) => void;
}

export function Header({ currentTab, onTabChange }: HeaderProps) {
  return (
    <AppBar position="static">
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{ flexGrow: 1, fontWeight: 700 }}
          >
            Portfolio Tracker
          </Typography>
          <Tabs
            value={currentTab}
            onChange={(_, newValue) => onTabChange(newValue)}
            textColor="inherit"
            indicatorColor="secondary"
          >
            <Tab label="Dashboard" sx={{ color: 'white' }} />
            <Tab label="Dividends" sx={{ color: 'white' }} />
            <Tab label="Analytics" sx={{ color: 'white' }} />
            <Tab label="Tickers" sx={{ color: 'white' }} />
          </Tabs>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
