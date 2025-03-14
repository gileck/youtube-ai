import React, { useState, useEffect } from 'react';
import { Box, Container, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import AppBar from './layout/AppBar';
import SettingsPanel from './settings/SettingsPanel';
import { SettingsProvider } from '../contexts/SettingsContext';
import { ApiCostProvider } from '../contexts/ApiCostContext';
import ApiCostListener from './ApiCostListener';
import axios from 'axios';

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
  const [apiUsageStats, setApiUsageStats] = useState(null);
  
  // Fetch API usage stats
  useEffect(() => {
    const fetchApiUsage = async () => {
      try {
        const response = await axios.get('/api/usage/stats');
        if (response.data) {
          setApiUsageStats(response.data);
        }
      } catch (error) {
        // Just log the error but don't display it to the user
        console.error('Error fetching API usage stats:', error);
        // Initialize with empty stats to prevent errors
        setApiUsageStats({
          daily: 0,
          quota: 10000,
          timestamp: new Date().toISOString(),
          cacheStats: { hits: 0, misses: 0 }
        });
      }
    };
    
    fetchApiUsage();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchApiUsage, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <SettingsProvider>
      <ApiCostProvider>
        <ApiCostListener />
        <ThemeProvider theme={theme}>
          <CssBaseline />
          
          {/* App Bar with Navigation */}
          <AppBar apiUsageStats={apiUsageStats} />
          
          <Container maxWidth="lg">
            <Box sx={{ 
              minHeight: '100vh', 
              py: 4, 
              mt: 8, // Add margin top to account for the AppBar
            }}>
              {children}
            </Box>
          </Container>
          
          {/* Global Settings Panel */}
          <SettingsPanel />
        </ThemeProvider>
      </ApiCostProvider>
    </SettingsProvider>
  );
};

export default Layout;
