import React, { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  Typography,
  IconButton,
  Divider,
  Paper,
  LinearProgress,
  CircularProgress,
  Button,
  Link as MuiLink
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DataUsageIcon from '@mui/icons-material/DataUsage';
import BarChartIcon from '@mui/icons-material/BarChart';
import LaunchIcon from '@mui/icons-material/Launch';
import WarningIcon from '@mui/icons-material/Warning';
import CachedIcon from '@mui/icons-material/Cached';
import HistoryIcon from '@mui/icons-material/History';
import axios from 'axios';
import Link from 'next/link';

/**
 * API Usage panel component that provides quick access to API usage statistics
 */
const ApiUsagePanel = ({ open, onClose }) => {
  const [apiUsage, setApiUsage] = useState({
    daily: 0,
    quota: 10000,
    timestamp: null,
    cacheStats: {
      hits: 0,
      misses: 0,
      count: 0,
      size: 0
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch API usage stats when panel is opened
  useEffect(() => {
    if (open) {
      fetchApiUsage();
    }
  }, [open]);

  // Fetch API usage stats
  const fetchApiUsage = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get('/api/usage/stats');
      setApiUsage(response.data);
    } catch (error) {
      console.error('Error fetching API usage stats:', error);
      setError('Failed to load API usage statistics');
    } finally {
      setLoading(false);
    }
  };

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

  // Calculate cache hit rate
  const getCacheHitRate = () => {
    const { hits, misses } = apiUsage.cacheStats;
    const total = hits + misses;
    if (total === 0) return 0;
    return (hits / total) * 100;
  };

  // Format file size
  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
    >
      <Paper
        elevation={0}
        sx={{
          width: 350,
          height: '100%',
          p: 3,
          borderRadius: 0
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h2">
            <DataUsageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            API Usage Statistics
          </Typography>
          <IconButton onClick={onClose} aria-label="close usage panel">
            <CloseIcon />
          </IconButton>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress size={40} />
          </Box>
        )}

        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        {!loading && (
          <>
            <Typography variant="subtitle1" gutterBottom>
              <BarChartIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              YouTube API Usage
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">
                    {apiUsage.daily.toLocaleString()} / {apiUsage.quota.toLocaleString()} units
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
              
              <Typography variant="caption" color="text.secondary" display="block">
                Last updated: {getLastUpdated()}
              </Typography>
              
              {usagePercentage >= 70 && (
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, p: 1, bgcolor: 'warning.light', borderRadius: 1 }}>
                  <WarningIcon color="warning" fontSize="small" sx={{ mr: 1 }} />
                  <Typography variant="body2">
                    {usagePercentage >= 90 
                      ? 'Critical: API quota almost depleted!' 
                      : 'Warning: API usage is high'}
                  </Typography>
                </Box>
              )}
            </Box>

            <Divider sx={{ mb: 3 }} />

            <Typography variant="subtitle1" gutterBottom>
              <CachedIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Cache Performance
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">
                    Hit Rate: {getCacheHitRate().toFixed(1)}%
                  </Typography>
                  <Typography variant="body2">
                    {apiUsage.cacheStats.hits} hits / {apiUsage.cacheStats.misses} misses
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={getCacheHitRate()} 
                  color="primary"
                  sx={{ height: 8, borderRadius: 1 }}
                />
              </Box>
              
              <Typography variant="body2" sx={{ mt: 1 }}>
                Cache Size: {apiUsage.cacheStats.count} items ({formatSize(apiUsage.cacheStats.size)})
              </Typography>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Typography variant="caption" color="text.secondary">
              YouTube API has a daily quota limit. This panel helps you track your usage and cache performance.
              For more details, use the main menu to access the Usage Dashboard and API History.
            </Typography>
          </>
        )}
      </Paper>
    </Drawer>
  );
};

export default ApiUsagePanel;
