import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, LinearProgress, Button, Tooltip, IconButton } from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import BarChartIcon from '@mui/icons-material/BarChart';
import MinimizeIcon from '@mui/icons-material/Minimize';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import ApiUsageDashboard from './ApiUsageDashboard';
import config from '../config';

/**
 * Component to display YouTube API usage statistics
 */
const ApiUsageStats = ({ onClose }) => {
  const [apiUsage, setApiUsage] = useState({
    daily: 0,
    timestamp: null,
    quota: config.youtube.api.quotaLimit || 10000, // Get quota from config
    cacheStats: null
  });
  const [expanded, setExpanded] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);

  useEffect(() => {
    // Fetch API usage stats from the server
    const fetchApiUsage = async () => {
      try {
        const response = await fetch('/api/usage/stats');
        const data = await response.json();
        
        if (response.ok && data.success !== false) {
          setApiUsage({
            daily: data.daily || 0,
            quota: data.quota || 10000,
            timestamp: data.timestamp || new Date().toISOString(),
            cacheStats: data.cacheStats || null
          });
        } else if (data.success === false) {
          console.error('Error loading API usage stats:', data.error || data.message);
        }
      } catch (e) {
        console.error('Error loading API usage stats:', e);
      }
    };

    // Initial fetch
    fetchApiUsage();

    // Set up interval to refresh stats every 30 seconds
    const interval = setInterval(fetchApiUsage, 30000);

    return () => clearInterval(interval);
  }, []);

  // Calculate usage percentage
  const usagePercentage = Math.min(100, (apiUsage.daily / apiUsage.quota) * 100);
  
  // Determine status color
  const getStatusColor = () => {
    if (usagePercentage >= 90) return 'error';
    if (usagePercentage >= 70) return 'warning';
    return 'success';
  };

  // Format last updated time
  const getLastUpdated = () => {
    if (!apiUsage.timestamp) return 'Never';
    return new Date(apiUsage.timestamp).toLocaleTimeString();
  };

  // Reset usage stats (for testing)
  const handleReset = () => {
    try {
      localStorage.setItem('youtube_api_call_count', JSON.stringify({
        daily: 0,
        timestamp: Date.now()
      }));
      setApiUsage(prev => ({
        ...prev,
        daily: 0,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.error('Error resetting API usage stats:', e);
    }
  };

  // Open detailed dashboard
  const handleOpenDashboard = () => {
    setDashboardOpen(true);
  };

  // Toggle expanded/minimized state
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  if (usagePercentage < 50 && !expanded) {
    // Show minimal version if usage is low and not expanded
    return (
      <>
        <Tooltip title="YouTube API Usage Statistics">
          <Box 
            sx={{ 
              position: 'fixed', 
              bottom: 56, 
              right: 16, 
              zIndex: 1000
            }}
          >
            <Paper 
              elevation={3} 
              sx={{ 
                p: 1, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                bgcolor: 'background.paper',
                borderRadius: 2
              }}
            >
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  cursor: 'pointer'
                }}
                onClick={toggleExpanded}
              >
                <InfoIcon color={getStatusColor()} />
                <Typography variant="body2">
                  API: {usagePercentage.toFixed(1)}%
                </Typography>
              </Box>
              <Tooltip title="Expand">
                <IconButton 
                  size="small" 
                  onClick={toggleExpanded}
                  sx={{ ml: 0.5 }}
                >
                  <OpenInFullIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Paper>
          </Box>
        </Tooltip>
        
        {/* Detailed Dashboard Dialog */}
        {dashboardOpen && (
          <ApiUsageDashboard 
            open={dashboardOpen} 
            onClose={() => setDashboardOpen(false)} 
          />
        )}
      </>
    );
  }

  return (
    <>
      <Paper
        elevation={3}
        sx={{
          position: 'fixed',
          bottom: 56, // Position above the app bar
          right: 16,
          width: expanded ? 300 : 180,
          zIndex: 1000,
          overflow: 'hidden',
          transition: 'width 0.3s ease',
          p: 2
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.9rem' }}>
            {usagePercentage >= 70 && <WarningIcon color="warning" fontSize="small" />}
            YouTube API Usage
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Tooltip title="Minimize">
              <IconButton 
                size="small" 
                onClick={toggleExpanded}
                sx={{ mr: 1 }}
              >
                <MinimizeIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {onClose && (
              <Button 
                size="small" 
                onClick={onClose}
                variant="text"
              >
                Close
              </Button>
            )}
          </Box>
        </Box>
        
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2">
              {apiUsage.daily} / {apiUsage.quota} units
            </Typography>
            <Typography variant="body2" color={getStatusColor()}>
              {usagePercentage.toFixed(1)}%
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={usagePercentage} 
            color={getStatusColor()}
            sx={{ height: 8, borderRadius: 1 }}
          />
        </Box>
        
        <Typography variant="body2" color="text.secondary">
          Last updated: {getLastUpdated()}
        </Typography>
        
        {apiUsage.cacheStats && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Cache: {apiUsage.cacheStats.hits || 0} hits / {apiUsage.cacheStats.misses || 0} misses
            </Typography>
          </Box>
        )}
        
        {usagePercentage >= 70 && (
          <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
            {usagePercentage >= 90 
              ? 'Warning: API quota almost depleted! Some features may be unavailable.' 
              : 'Warning: Approaching API quota limit.'}
          </Typography>
        )}
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
          <Button 
            size="small" 
            variant="outlined" 
            onClick={handleReset}
          >
            Reset Counter
          </Button>
          
          <Button 
            size="small" 
            variant="outlined" 
            onClick={handleOpenDashboard}
            startIcon={<BarChartIcon />}
          >
            Details
          </Button>
        </Box>
      </Paper>
      
      {dashboardOpen && (
        <ApiUsageDashboard 
          open={dashboardOpen} 
          onClose={() => setDashboardOpen(false)} 
        />
      )}
    </>
  );
};

export default ApiUsageStats;
