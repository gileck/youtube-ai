import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  LinearProgress, 
  Button, 
  Tooltip, 
  Divider,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Container
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import BarChartIcon from '@mui/icons-material/BarChart';
import HistoryIcon from '@mui/icons-material/History';
import RefreshIcon from '@mui/icons-material/Refresh';
import CachedIcon from '@mui/icons-material/Cached';
import YouTubeIcon from '@mui/icons-material/YouTube';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import axios from 'axios';
import config from '../config';
import Head from 'next/head';

/**
 * Usage Dashboard Page
 */
const UsagePage = () => {
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
    },
    costPerRequest: {
      search: 100,
      channelInfo: 1,
      videoInfo: 1,
      videoSearch: 100
    },
    cacheStats: {
      hits: 0,
      misses: 0,
      size: 0,
      count: 0
    }
  });
  const [loading, setLoading] = useState(true);

  // Load detailed API usage data
  useEffect(() => {
    fetchApiUsage();
    
    // Set up interval to refresh stats every 30 seconds
    const interval = setInterval(fetchApiUsage, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchApiUsage = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/usage/stats');
      if (response.data && response.data.success !== false) {
        setApiUsage({
          daily: response.data.daily || 0,
          quota: response.data.quota || 10000,
          timestamp: response.data.timestamp || new Date().toISOString(),
          cacheStats: response.data.cacheStats || {
            hits: 0,
            misses: 0,
            size: 0,
            count: 0
          },
          breakdown: response.data.breakdown || {
            search: 0,
            channelInfo: 0,
            videos: 0,
            other: 0
          },
          costPerRequest: response.data.costPerRequest || {
            search: 100,
            channelInfo: 1,
            videoInfo: 1,
            videoSearch: 100
          },
          history: response.data.history || []
        });
      } else if (response.data && response.data.success === false) {
        console.error('Error fetching API usage stats:', response.data.error || response.data.message);
      }
    } catch (error) {
      console.error('Error fetching API usage stats:', error);
    } finally {
      setLoading(false);
    }
  };

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
  const handleReset = async () => {
    try {
      await axios.post('/api/usage/reset');
      fetchApiUsage();
    } catch (error) {
      console.error('Error resetting API usage stats:', error);
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

  // Calculate cache hit rate
  const getCacheHitRate = () => {
    const { hits, misses } = apiUsage.cacheStats;
    const total = hits + misses;
    if (total === 0) return 0;
    return (hits / total) * 100;
  };

  return (
    <>
      <Head>
        <title>API Usage Dashboard - YouTube to AI</title>
      </Head>
      
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, mb: 6 }}>
          <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <BarChartIcon sx={{ mr: 1 }} />
            API Usage Dashboard
          </Typography>
          
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Monitor your YouTube API usage and cache performance
          </Typography>
          
          <Button 
            startIcon={<RefreshIcon />} 
            onClick={fetchApiUsage} 
            variant="outlined" 
            sx={{ mt: 2 }}
          >
            Refresh Data
          </Button>
        </Box>
        
        <Grid container spacing={3}>
          {/* Main Usage Card */}
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardHeader 
                title="YouTube API Usage" 
                titleTypographyProps={{ variant: 'h6' }}
                avatar={<YouTubeIcon color="error" />}
                action={
                  <Tooltip title="YouTube API has a daily quota limit. This counter helps you track usage.">
                    <IconButton size="small">
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                }
              />
              <CardContent>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">
                      {apiUsage.daily.toLocaleString()} / {apiUsage.quota.toLocaleString()} units
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
                
                <Typography variant="caption" color="text.secondary" display="block">
                  Last updated: {getLastUpdated()}
                </Typography>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="subtitle2" gutterBottom>
                  Usage Breakdown
                </Typography>
                
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Operation</TableCell>
                        <TableCell align="right">Units</TableCell>
                        <TableCell align="right">Percentage</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>Search</TableCell>
                        <TableCell align="right">{apiUsage.breakdown.search}</TableCell>
                        <TableCell align="right">
                          {apiUsage.daily > 0 ? ((apiUsage.breakdown.search / apiUsage.daily) * 100).toFixed(1) : 0}%
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Channel Info</TableCell>
                        <TableCell align="right">{apiUsage.breakdown.channelInfo}</TableCell>
                        <TableCell align="right">
                          {apiUsage.daily > 0 ? ((apiUsage.breakdown.channelInfo / apiUsage.daily) * 100).toFixed(1) : 0}%
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Videos</TableCell>
                        <TableCell align="right">{apiUsage.breakdown.videos}</TableCell>
                        <TableCell align="right">
                          {apiUsage.daily > 0 ? ((apiUsage.breakdown.videos / apiUsage.daily) * 100).toFixed(1) : 0}%
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Other</TableCell>
                        <TableCell align="right">{apiUsage.breakdown.other}</TableCell>
                        <TableCell align="right">
                          {apiUsage.daily > 0 ? ((apiUsage.breakdown.other / apiUsage.daily) * 100).toFixed(1) : 0}%
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
                
                <Button 
                  variant="outlined" 
                  color="secondary" 
                  size="small" 
                  onClick={handleReset}
                  startIcon={<RefreshIcon />}
                >
                  Reset Counter
                </Button>
              </CardContent>
            </Card>
          </Grid>
          
          {/* API Cost Card */}
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardHeader 
                title="YouTube API Cost" 
                titleTypographyProps={{ variant: 'h6' }}
                avatar={<MonetizationOnIcon color="warning" />}
                action={
                  <Tooltip title="Each YouTube API operation consumes a different amount of quota units.">
                    <IconButton size="small">
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                }
              />
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Cost Per Operation
                </Typography>
                
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Operation</TableCell>
                        <TableCell align="right">Cost (Units)</TableCell>
                        <TableCell align="right">Daily Usage</TableCell>
                        <TableCell align="right">Total Cost</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>Search</TableCell>
                        <TableCell align="right">{apiUsage.costPerRequest.search}</TableCell>
                        <TableCell align="right">{Math.ceil(apiUsage.breakdown.search / apiUsage.costPerRequest.search)}</TableCell>
                        <TableCell align="right">{apiUsage.breakdown.search}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Channel Info</TableCell>
                        <TableCell align="right">{apiUsage.costPerRequest.channelInfo}</TableCell>
                        <TableCell align="right">{Math.ceil(apiUsage.breakdown.channelInfo / apiUsage.costPerRequest.channelInfo)}</TableCell>
                        <TableCell align="right">{apiUsage.breakdown.channelInfo}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Video Info</TableCell>
                        <TableCell align="right">{apiUsage.costPerRequest.videoInfo}</TableCell>
                        <TableCell align="right">{Math.ceil(apiUsage.breakdown.videos / apiUsage.costPerRequest.videoInfo)}</TableCell>
                        <TableCell align="right">{apiUsage.breakdown.videos}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Video Search</TableCell>
                        <TableCell align="right">{apiUsage.costPerRequest.videoSearch}</TableCell>
                        <TableCell align="right">{Math.ceil(apiUsage.breakdown.other / apiUsage.costPerRequest.videoSearch)}</TableCell>
                        <TableCell align="right">{apiUsage.breakdown.other}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
                
                <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid rgba(0, 0, 0, 0.12)' }}>
                  <Typography variant="body2" gutterBottom>
                    <strong>YouTube API Quota Limit:</strong> {apiUsage.quota.toLocaleString()} units per day
                  </Typography>
                  <Typography variant="body2">
                    <strong>Current Usage:</strong> {apiUsage.daily.toLocaleString()} units ({usagePercentage.toFixed(1)}%)
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Cache Stats Card */}
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardHeader 
                title="Cache Performance" 
                titleTypographyProps={{ variant: 'h6' }}
                avatar={<CachedIcon color="primary" />}
                action={
                  <Tooltip title="Cache statistics help you understand how effectively the system is reusing previous results.">
                    <IconButton size="small">
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                }
              />
              <CardContent>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">
                      Cache Hit Rate
                    </Typography>
                    <Typography variant="body2" color="primary">
                      {getCacheHitRate().toFixed(1)}%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={getCacheHitRate()} 
                    color="primary"
                    sx={{ height: 8, borderRadius: 1 }}
                  />
                </Box>
                
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={6}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h6" color="primary">
                        {apiUsage.cacheStats.hits}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Cache Hits
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h6" color="secondary">
                        {apiUsage.cacheStats.misses}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Cache Misses
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="subtitle2" gutterBottom>
                  Cache Storage
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h6">
                        {apiUsage.cacheStats.count || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Items
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h6">
                        {formatSize(apiUsage.cacheStats.size || 0)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Size
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Recent Activity Card */}
          <Grid item xs={12}>
            <Card elevation={2}>
              <CardHeader 
                title="Recent Activity" 
                titleTypographyProps={{ variant: 'h6' }}
                avatar={<HistoryIcon />}
              />
              <CardContent>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Time</TableCell>
                        <TableCell>Action</TableCell>
                        <TableCell>Details</TableCell>
                        <TableCell align="right">Units</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {apiUsage.history && apiUsage.history.length > 0 ? (
                        apiUsage.history.slice(0, 10).map((entry, index) => (
                          <TableRow key={index}>
                            <TableCell>{formatDate(entry.date)}</TableCell>
                            <TableCell>{entry.action}</TableCell>
                            <TableCell>{entry.details || '-'}</TableCell>
                            <TableCell align="right">{entry.count}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} align="center">No activity recorded</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </>
  );
};

// Helper function to format file size
function formatSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default UsagePage;
