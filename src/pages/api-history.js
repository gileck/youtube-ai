import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Divider,
  Chip,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Container,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoIcon from '@mui/icons-material/Info';
import CachedIcon from '@mui/icons-material/Cached';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import StorageIcon from '@mui/icons-material/Storage';
import CloudIcon from '@mui/icons-material/Cloud';
import HistoryIcon from '@mui/icons-material/History';
import Head from 'next/head';
import axios from 'axios';

/**
 * API Call History Page
 */
const ApiHistoryPage = () => {
  const [history, setHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedCall, setSelectedCall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    endpoint: '',
    status: '',
    apiType: '',
    cacheStatus: ''
  });

  // Load API call history
  useEffect(() => {
    loadHistory();
  }, []);

  // Apply filters when filter or history changes
  useEffect(() => {
    applyFilters();
  }, [filter, history]);

  // Load history from API or localStorage
  const loadHistory = async () => {
    setLoading(true);
    try {
      // Try to load from API first
      try {
        const response = await axios.get('/api/usage/history');
        if (response.data && Array.isArray(response.data)) {
          setHistory(response.data);
          return;
        }
      } catch (apiError) {
        console.warn('Could not load API history from server, falling back to localStorage');
      }
      
      // Fall back to localStorage
      const callHistory = JSON.parse(localStorage.getItem('youtube_api_call_history') || '[]');
      console.log('Loaded API call history:', callHistory.length, 'entries');
      setHistory(callHistory);
    } catch (error) {
      console.error('Error loading API call history:', error);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  // Clear all history
  const handleClearHistory = async () => {
    if (window.confirm('Are you sure you want to clear all API call history?')) {
      try {
        // Try to clear via API first
        try {
          await axios.delete('/api/usage/history/clear');
        } catch (apiError) {
          console.warn('Could not clear API history via server, falling back to localStorage');
          localStorage.removeItem('youtube_api_call_history');
        }
        
        setHistory([]);
        setFilteredHistory([]);
      } catch (error) {
        console.error('Error clearing history:', error);
      }
    }
  };

  // Show details for a specific call
  const handleShowDetails = (call) => {
    setSelectedCall(call);
    setDetailsOpen(true);
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

  // Get status color
  const getStatusColor = (status) => {
    if (status === 'success') return 'success';
    if (status === 'error') return 'error';
    if (status && status.includes('cache_hit')) return 'info';
    if (status === 'in_flight_reuse') return 'warning';
    return 'default';
  };

  // Get status icon
  const getStatusIcon = (status) => {
    if (status === 'success') return <CheckCircleIcon fontSize="small" />;
    if (status === 'error') return <ErrorIcon fontSize="small" />;
    if (status && status.includes('cache_hit')) return <CachedIcon fontSize="small" />;
    if (status === 'in_flight_reuse') return <InfoIcon fontSize="small" />;
    return null;
  };

  // Get cache status
  const getCacheStatus = (call) => {
    if (call.fromCache) return 'cached';
    if (call.status && call.status.includes('cache_hit')) return 'cached';
    if (call.status === 'in_flight_reuse') return 'reused';
    return 'network';
  };

  // Get cache status color
  const getCacheStatusColor = (cacheStatus) => {
    if (cacheStatus === 'cached') return 'success';
    if (cacheStatus === 'reused') return 'info';
    return 'default';
  };

  // Get cache status icon
  const getCacheStatusIcon = (cacheStatus) => {
    if (cacheStatus === 'cached') return <CachedIcon fontSize="small" />;
    if (cacheStatus === 'reused') return <StorageIcon fontSize="small" />;
    return <CloudIcon fontSize="small" />;
  };

  // Apply filters to history
  const applyFilters = () => {
    let filtered = [...history];
    
    if (filter.endpoint) {
      filtered = filtered.filter(call => 
        call.endpoint && call.endpoint.toLowerCase().includes(filter.endpoint.toLowerCase())
      );
    }
    
    if (filter.status) {
      filtered = filtered.filter(call => call.status === filter.status);
    }
    
    if (filter.apiType) {
      filtered = filtered.filter(call => call.apiType === filter.apiType);
    }

    if (filter.cacheStatus) {
      filtered = filtered.filter(call => getCacheStatus(call) === filter.cacheStatus);
    }
    
    setFilteredHistory(filtered);
  };

  // Handle filter change
  const handleFilterChange = (field, value) => {
    setFilter(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Get unique values for filters
  const getUniqueValues = (field) => {
    const values = [...new Set(history.map(call => call[field]))];
    return values.filter(Boolean);
  };

  return (
    <>
      <Head>
        <title>API Call History - YouTube to AI</title>
      </Head>
      
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, mb: 6 }}>
          <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <HistoryIcon sx={{ mr: 1 }} />
            API Call History
          </Typography>
          
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Detailed history of YouTube API calls and cache interactions
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Button 
              startIcon={<RefreshIcon />} 
              onClick={loadHistory} 
              variant="outlined"
            >
              Refresh Data
            </Button>
            
            <Button 
              startIcon={<DeleteIcon />} 
              onClick={handleClearHistory} 
              variant="outlined" 
              color="error"
            >
              Clear History
            </Button>
          </Box>
        </Box>
        
        <Card elevation={2} sx={{ mb: 4 }}>
          <CardHeader 
            title="Filters" 
            titleTypographyProps={{ variant: 'h6' }}
          />
          <CardContent>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <TextField
                label="Endpoint"
                value={filter.endpoint}
                onChange={(e) => handleFilterChange('endpoint', e.target.value)}
                variant="outlined"
                size="small"
                sx={{ minWidth: 200 }}
              />
              
              <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
                <InputLabel id="status-filter-label">Status</InputLabel>
                <Select
                  labelId="status-filter-label"
                  value={filter.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  label="Status"
                >
                  <MenuItem value="">All</MenuItem>
                  {getUniqueValues('status').map(status => (
                    <MenuItem key={status} value={status}>
                      {status}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
                <InputLabel id="api-type-filter-label">API Type</InputLabel>
                <Select
                  labelId="api-type-filter-label"
                  value={filter.apiType}
                  onChange={(e) => handleFilterChange('apiType', e.target.value)}
                  label="API Type"
                >
                  <MenuItem value="">All</MenuItem>
                  {getUniqueValues('apiType').map(apiType => (
                    <MenuItem key={apiType} value={apiType}>
                      {apiType}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
                <InputLabel id="cache-status-filter-label">Cache Status</InputLabel>
                <Select
                  labelId="cache-status-filter-label"
                  value={filter.cacheStatus}
                  onChange={(e) => handleFilterChange('cacheStatus', e.target.value)}
                  label="Cache Status"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="cached">Cached</MenuItem>
                  <MenuItem value="reused">Reused</MenuItem>
                  <MenuItem value="network">Network</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </CardContent>
        </Card>
        
        <Card elevation={2}>
          <CardHeader 
            title={`API Calls (${filteredHistory.length})`} 
            titleTypographyProps={{ variant: 'h6' }}
          />
          <CardContent>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : filteredHistory.length === 0 ? (
              <Typography variant="body1" sx={{ textAlign: 'center', p: 4 }}>
                No API calls found. {filter.endpoint || filter.status || filter.apiType || filter.cacheStatus ? 'Try adjusting your filters.' : ''}
              </Typography>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Time</TableCell>
                      <TableCell>Endpoint</TableCell>
                      <TableCell>API Type</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Cache</TableCell>
                      <TableCell>Duration</TableCell>
                      <TableCell>Cost</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredHistory.map((call, index) => (
                      <TableRow key={index} hover>
                        <TableCell>{formatDate(call.timestamp)}</TableCell>
                        <TableCell>
                          <Tooltip title={call.endpoint || ''}>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                              {call.endpoint || 'N/A'}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>{call.apiType || 'N/A'}</TableCell>
                        <TableCell>
                          <Chip 
                            icon={getStatusIcon(call.status)} 
                            label={call.status || 'N/A'} 
                            size="small" 
                            color={getStatusColor(call.status)}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            icon={getCacheStatusIcon(getCacheStatus(call))} 
                            label={getCacheStatus(call)} 
                            size="small" 
                            color={getCacheStatusColor(getCacheStatus(call))}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{call.duration ? `${call.duration}ms` : 'N/A'}</TableCell>
                        <TableCell>{call.cost ? `${call.cost} units` : 'N/A'}</TableCell>
                        <TableCell>
                          <IconButton 
                            size="small" 
                            onClick={() => handleShowDetails(call)}
                            aria-label="View details"
                          >
                            <InfoIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Container>
      
      {/* Call Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">API Call Details</Typography>
            <IconButton onClick={() => setDetailsOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedCall && (
            <>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom>Basic Information</Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell component="th" scope="row" width="30%">Timestamp</TableCell>
                        <TableCell>{formatDate(selectedCall.timestamp)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell component="th" scope="row">Endpoint</TableCell>
                        <TableCell>{selectedCall.endpoint || 'N/A'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell component="th" scope="row">API Type</TableCell>
                        <TableCell>{selectedCall.apiType || 'N/A'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell component="th" scope="row">Status</TableCell>
                        <TableCell>
                          <Chip 
                            icon={getStatusIcon(selectedCall.status)} 
                            label={selectedCall.status || 'N/A'} 
                            size="small" 
                            color={getStatusColor(selectedCall.status)}
                          />
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell component="th" scope="row">Cache Status</TableCell>
                        <TableCell>
                          <Chip 
                            icon={getCacheStatusIcon(getCacheStatus(selectedCall))} 
                            label={getCacheStatus(selectedCall)} 
                            size="small" 
                            color={getCacheStatusColor(getCacheStatus(selectedCall))}
                          />
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell component="th" scope="row">Duration</TableCell>
                        <TableCell>{selectedCall.duration ? `${selectedCall.duration}ms` : 'N/A'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell component="th" scope="row">Cost</TableCell>
                        <TableCell>{selectedCall.cost ? `${selectedCall.cost} units` : 'N/A'}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
              
              {selectedCall.params && (
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Request Parameters</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <pre style={{ overflow: 'auto', maxHeight: '200px' }}>
                      {JSON.stringify(selectedCall.params, null, 2)}
                    </pre>
                  </AccordionDetails>
                </Accordion>
              )}
              
              {selectedCall.response && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Response Data</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <pre style={{ overflow: 'auto', maxHeight: '300px' }}>
                      {JSON.stringify(selectedCall.response, null, 2)}
                    </pre>
                  </AccordionDetails>
                </Accordion>
              )}
              
              {selectedCall.error && (
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography color="error">Error Details</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <pre style={{ overflow: 'auto', maxHeight: '200px', color: '#d32f2f' }}>
                      {JSON.stringify(selectedCall.error, null, 2)}
                    </pre>
                  </AccordionDetails>
                </Accordion>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ApiHistoryPage;
