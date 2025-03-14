import React, { createContext, useContext, useState } from 'react';
import { Snackbar, Alert, Box, Typography } from '@mui/material';
import CachedIcon from '@mui/icons-material/Cached';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';

// Create context
const ApiCostContext = createContext();

export function ApiCostProvider({ children }) {
  const [alert, setAlert] = useState(null);

  // Show alert with API cost information
  const showApiCostAlert = (operation, cost, fromCache) => {
    setAlert({
      open: true,
      operation,
      cost,
      fromCache
    });

    // Auto-hide after 3 seconds
    setTimeout(() => {
      setAlert(prev => prev ? { ...prev, open: false } : null);
    }, 3000);
  };

  // Alert component
  const ApiCostAlert = () => {
    if (!alert) return null;

    return (
      <Snackbar
        open={alert.open}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        autoHideDuration={3000}
      >
        <Alert 
          severity={alert.fromCache ? 'success' : 'info'}
          variant="filled"
          icon={alert.fromCache ? <CachedIcon /> : <MonetizationOnIcon />}
        >
          <Box>
            <Typography variant="subtitle2">
              {alert.operation} API Call
            </Typography>
            <Typography variant="body2">
              {alert.fromCache 
                ? 'Retrieved from cache (0 cost)' 
                : `Cost: ${alert.cost} units`}
            </Typography>
          </Box>
        </Alert>
      </Snackbar>
    );
  };

  return (
    <ApiCostContext.Provider value={{ showApiCostAlert }}>
      {children}
      <ApiCostAlert />
    </ApiCostContext.Provider>
  );
}

// Custom hook to use the API cost context
export const useApiCost = () => useContext(ApiCostContext);
