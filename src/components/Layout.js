import React, { useState } from 'react';
import { Box, Container, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import ApiUsageStats from './ApiUsageStats';

// Create a theme instance
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

/**
 * Layout component that wraps all pages and provides common UI elements
 */
const Layout = ({ children }) => {
  const [showApiStats, setShowApiStats] = useState(true);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg">
        <Box sx={{ minHeight: '100vh', py: 4 }}>
          {children}
        </Box>
      </Container>
      
      {/* API Usage Statistics */}
      {showApiStats && (
        <ApiUsageStats onClose={() => setShowApiStats(false)} />
      )}
    </ThemeProvider>
  );
};

export default Layout;
