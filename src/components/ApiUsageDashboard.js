import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  LinearProgress, 
  Button, 
  Tooltip, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Divider,
  Grid,
  Card,
  CardContent,
  CardHeader
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import HistoryIcon from '@mui/icons-material/History';
import config from '../config';
import ApiCallHistory from './ApiCallHistory';

/**
 * Detailed dashboard for YouTube API usage statistics
 */
const ApiUsageDashboard = ({ open, onClose }) => {
  const [apiUsage, setApiUsage] = useState({
    daily: 0,
    timestamp: null,
    quota: config.youtube.api.quotaLimit || 10000,
    history: [],
    breakdown: {
      search: 0,
      channelInfo: 0,
      videos: 0,
      other: 0
    }
  });
  const [historyOpen, setHistoryOpen] = useState(false);

  // Load detailed API usage data
  useEffect(() => {
    if (!open) return;
    
    try {
      // Load overall usage
      const savedCount = localStorage.getItem('youtube_api_call_count');
      if (savedCount) {
        const parsed = JSON.parse(savedCount);
        
        // Load usage breakdown if available
        const savedBreakdown = localStorage.getItem('youtube_api_usage_breakdown');
        const breakdown = savedBreakdown ? JSON.parse(savedBreakdown) : {
          search: 0,
          channelInfo: 0,
          videos: 0,
          other: 0
        };
        
        // Load usage history if available
        const savedHistory = localStorage.getItem('youtube_api_usage_history');
        const history = savedHistory ? JSON.parse(savedHistory) : [];
        
        // Update state with all data
        setApiUsage(prev => ({
          ...prev,
          daily: parsed.daily,
          timestamp: parsed.timestamp,
          history,
          breakdown
        }));
      }
    } catch (e) {
      console.error('Error loading API usage stats:', e);
    }
  }, [open]);

  // Calculate usage percentage
  const usagePercentage = Math.min(100, (apiUsage.daily / apiUsage.quota) * 100);
  
  // Determine status color
  const getStatusColor = (percentage) => {
    if (percentage >= 90) return 'error';
    if (percentage >= 70) return 'warning';
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
      // Reset main counter
      localStorage.setItem('youtube_api_call_count', JSON.stringify({
        daily: 0,
        timestamp: Date.now()
      }));
      
      // Reset breakdown
      localStorage.setItem('youtube_api_usage_breakdown', JSON.stringify({
        search: 0,
        channelInfo: 0,
        videos: 0,
        other: 0
      }));
      
      // Add reset entry to history
      const history = apiUsage.history || [];
      const newHistory = [
        ...history,
        {
          date: new Date().toISOString(),
          action: 'reset',
          count: 0,
          previous: apiUsage.daily
        }
      ].slice(-50); // Keep last 50 entries
      
      localStorage.setItem('youtube_api_usage_history', JSON.stringify(newHistory));
      
      // Update state
      setApiUsage(prev => ({
        ...prev,
        daily: 0,
        timestamp: Date.now(),
        breakdown: {
          search: 0,
          channelInfo: 0,
          videos: 0,
          other: 0
        },
        history: newHistory
      }));
    } catch (e) {
      console.error('Error resetting API usage stats:', e);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (e) {
      return dateString;
    }
  };

  // Open API call history dialog
  const handleOpenHistory = () => {
    setHistoryOpen(true);
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        aria-labelledby="api-usage-dashboard-title"
      >
        <DialogTitle id="api-usage-dashboard-title">
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BarChartIcon />
              YouTube API Usage Dashboard
            </Typography>
            <IconButton aria-label="close" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers>
          <Grid container spacing={3}>
            {/* Main Usage Card */}
            <Grid item xs={12} md={6}>
              <Card elevation={2}>
                <CardHeader 
                  title="Current Usage" 
                  titleTypographyProps={{ variant: 'h6' }}
                  action={
                    <Tooltip title="YouTube API has a daily quota limit. This counter helps you track usage.">
                      <IconButton size="small">
                        <InfoIcon />
                      </IconButton>
                    </Tooltip>
                  }
                />
                <CardContent>
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body1" fontWeight="medium">
                        {apiUsage.daily} / {apiUsage.quota} units
                      </Typography>
                      <Typography variant="body2" color={getStatusColor(usagePercentage)}>
                        {usagePercentage.toFixed(1)}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={usagePercentage} 
                      color={getStatusColor(usagePercentage)}
                      sx={{ height: 8, borderRadius: 1 }}
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Last updated: {getLastUpdated()}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button 
                      variant="outlined" 
                      size="small" 
                      onClick={handleReset}
                      startIcon={<SettingsIcon />}
                    >
                      Reset Counter
                    </Button>
                    <Button 
                      variant="outlined" 
                      size="small" 
                      onClick={handleOpenHistory}
                      startIcon={<HistoryIcon />}
                    >
                      View API History
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            {/* Usage Breakdown Card */}
            <Grid item xs={12} md={6}>
              <Card elevation={2}>
                <CardHeader 
                  title="Usage Breakdown" 
                  titleTypographyProps={{ variant: 'h6' }}
                />
                <CardContent>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>API Type</TableCell>
                          <TableCell align="right">Units</TableCell>
                          <TableCell align="right">Percentage</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow>
                          <TableCell>Search</TableCell>
                          <TableCell align="right">{apiUsage.breakdown.search}</TableCell>
                          <TableCell align="right">
                            {apiUsage.daily > 0 
                              ? ((apiUsage.breakdown.search / apiUsage.daily) * 100).toFixed(1) 
                              : 0}%
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Channel Info</TableCell>
                          <TableCell align="right">{apiUsage.breakdown.channelInfo}</TableCell>
                          <TableCell align="right">
                            {apiUsage.daily > 0 
                              ? ((apiUsage.breakdown.channelInfo / apiUsage.daily) * 100).toFixed(1) 
                              : 0}%
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Videos</TableCell>
                          <TableCell align="right">{apiUsage.breakdown.videos}</TableCell>
                          <TableCell align="right">
                            {apiUsage.daily > 0 
                              ? ((apiUsage.breakdown.videos / apiUsage.daily) * 100).toFixed(1) 
                              : 0}%
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Other</TableCell>
                          <TableCell align="right">{apiUsage.breakdown.other}</TableCell>
                          <TableCell align="right">
                            {apiUsage.daily > 0 
                              ? ((apiUsage.breakdown.other / apiUsage.daily) * 100).toFixed(1) 
                              : 0}%
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
            
            {/* Recent Activity Card */}
            <Grid item xs={12}>
              <Card elevation={2}>
                <CardHeader 
                  title="Recent Activity" 
                  titleTypographyProps={{ variant: 'h6' }}
                />
                <CardContent>
                  <TableContainer sx={{ maxHeight: 200 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Action</TableCell>
                          <TableCell align="right">Count</TableCell>
                          <TableCell>Details</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {apiUsage.history && apiUsage.history.length > 0 ? (
                          apiUsage.history.slice().reverse().map((entry, index) => (
                            <TableRow key={index}>
                              <TableCell>{formatDate(entry.date)}</TableCell>
                              <TableCell>{entry.action}</TableCell>
                              <TableCell align="right">{entry.count}</TableCell>
                              <TableCell>{entry.details || entry.type || ''}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} align="center">No recent activity</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
      
      {/* API Call History Dialog */}
      <ApiCallHistory 
        open={historyOpen} 
        onClose={() => setHistoryOpen(false)} 
      />
    </>
  );
};

export default ApiUsageDashboard;
