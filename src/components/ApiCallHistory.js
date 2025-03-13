import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
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
  CircularProgress
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

/**
 * Component to display YouTube API call history
 */
const ApiCallHistory = ({ open, onClose }) => {
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
    if (open) {
      loadHistory();
    }
  }, [open]);

  // Apply filters when filter or history changes
  useEffect(() => {
    applyFilters();
  }, [filter, history]);

  // Load history from localStorage
  const loadHistory = () => {
    setLoading(true);
    try {
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
  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear all API call history?')) {
      localStorage.removeItem('youtube_api_call_history');
      setHistory([]);
      setFilteredHistory([]);
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
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      aria-labelledby="api-call-history-title"
    >
      <DialogTitle id="api-call-history-title">
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" component="div">
            YouTube API Call History
          </Typography>
          <Box>
            <IconButton aria-label="refresh" onClick={loadHistory} sx={{ mr: 1 }}>
              <RefreshIcon />
            </IconButton>
            <IconButton aria-label="close" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {/* Filters */}
        <Box mb={3} p={2} bgcolor="background.paper" borderRadius={1} boxShadow={1}>
          <Typography variant="subtitle1" gutterBottom>
            Filters
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={2}>
            <TextField
              label="Endpoint"
              variant="outlined"
              size="small"
              value={filter.endpoint}
              onChange={(e) => handleFilterChange('endpoint', e.target.value)}
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
                <MenuItem value="">
                  <em>All</em>
                </MenuItem>
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
                <MenuItem value="">
                  <em>All</em>
                </MenuItem>
                {getUniqueValues('apiType').map(type => (
                  <MenuItem key={type} value={type}>
                    {type}
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
                <MenuItem value="">
                  <em>All</em>
                </MenuItem>
                <MenuItem value="cached">Cached</MenuItem>
                <MenuItem value="reused">Reused</MenuItem>
                <MenuItem value="network">Network</MenuItem>
              </Select>
            </FormControl>
            
            <Button 
              variant="outlined" 
              onClick={() => setFilter({ endpoint: '', status: '', apiType: '', cacheStatus: '' })}
              size="small"
            >
              Clear Filters
            </Button>
          </Box>
        </Box>
        
        {/* History Table */}
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Endpoint</TableCell>
                  <TableCell>API Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Cache Status</TableCell>
                  <TableCell>Quota Cost</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredHistory.length > 0 ? (
                  filteredHistory.map((call) => {
                    const cacheStatus = getCacheStatus(call);
                    return (
                      <TableRow key={call.id} hover>
                        <TableCell>{formatDate(call.date)}</TableCell>
                        <TableCell>
                          <Tooltip title={call.endpoint || 'Unknown'}>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                              {call.endpoint || 'Unknown'}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>{call.apiType || 'Unknown'}</TableCell>
                        <TableCell>
                          <Chip 
                            icon={getStatusIcon(call.status)} 
                            label={call.status || 'Unknown'} 
                            size="small" 
                            color={getStatusColor(call.status)} 
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            icon={getCacheStatusIcon(cacheStatus)} 
                            label={cacheStatus} 
                            size="small" 
                            color={getCacheStatusColor(cacheStatus)} 
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{call.quotaCost || 0}</TableCell>
                        <TableCell>{call.duration ? `${call.duration}ms` : 'N/A'}</TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => handleShowDetails(call)}>
                            <InfoIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      {history.length > 0 ? 'No API calls match the current filters' : 'No API calls found'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        
        <Box mt={2} display="flex" justifyContent="space-between">
          <Typography variant="body2" color="textSecondary">
            Showing {filteredHistory.length} of {history.length} API calls
          </Typography>
          <Button 
            variant="contained" 
            color="error" 
            startIcon={<DeleteIcon />}
            onClick={handleClearHistory}
            disabled={history.length === 0}
          >
            Clear History
          </Button>
        </Box>
      </DialogContent>
      
      {/* API Call Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">API Call Details</Typography>
            <IconButton onClick={() => setDetailsOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedCall && (
            <>
              <Box mb={3}>
                <Typography variant="subtitle1" gutterBottom>Basic Information</Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell component="th" width="30%">ID</TableCell>
                        <TableCell>{selectedCall.id}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell component="th">Date</TableCell>
                        <TableCell>{formatDate(selectedCall.date)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell component="th">Endpoint</TableCell>
                        <TableCell>{selectedCall.endpoint || 'Unknown'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell component="th">API Type</TableCell>
                        <TableCell>{selectedCall.apiType || 'Unknown'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell component="th">Status</TableCell>
                        <TableCell>
                          <Chip 
                            icon={getStatusIcon(selectedCall.status)} 
                            label={selectedCall.status || 'Unknown'} 
                            size="small" 
                            color={getStatusColor(selectedCall.status)} 
                          />
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell component="th">Cache Status</TableCell>
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
                        <TableCell component="th">Quota Cost</TableCell>
                        <TableCell>{selectedCall.quotaCost || 0}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell component="th">Duration</TableCell>
                        <TableCell>{selectedCall.duration ? `${selectedCall.duration}ms` : 'N/A'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell component="th">From Cache</TableCell>
                        <TableCell>{selectedCall.fromCache ? 'Yes' : 'No'}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
              
              {selectedCall.params && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Request Parameters</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <pre style={{ 
                      backgroundColor: '#f5f5f5', 
                      padding: '10px', 
                      borderRadius: '4px',
                      overflow: 'auto',
                      maxHeight: '200px'
                    }}>
                      {JSON.stringify(selectedCall.params, null, 2)}
                    </pre>
                  </AccordionDetails>
                </Accordion>
              )}
              
              {selectedCall.response && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Response</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" gutterBottom>
                      Status: {selectedCall.response.status || 'Unknown'} {selectedCall.response.statusText || ''}
                    </Typography>
                    {selectedCall.response.data && (
                      <pre style={{ 
                        backgroundColor: '#f5f5f5', 
                        padding: '10px', 
                        borderRadius: '4px',
                        overflow: 'auto',
                        maxHeight: '200px'
                      }}>
                        {selectedCall.response.data}
                      </pre>
                    )}
                  </AccordionDetails>
                </Accordion>
              )}
              
              {selectedCall.error && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography color="error">Error</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" color="error" gutterBottom>
                      {selectedCall.error.message || 'Unknown error'}
                    </Typography>
                    {selectedCall.error.response && (
                      <>
                        <Typography variant="body2" gutterBottom>
                          Status: {selectedCall.error.response.status || 'Unknown'} {selectedCall.error.response.statusText || ''}
                        </Typography>
                        {selectedCall.error.response.data && (
                          <pre style={{ 
                            backgroundColor: '#f5f5f5', 
                            padding: '10px', 
                            borderRadius: '4px',
                            overflow: 'auto',
                            maxHeight: '200px'
                          }}>
                            {selectedCall.error.response.data}
                          </pre>
                        )}
                      </>
                    )}
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
    </Dialog>
  );
};

export default ApiCallHistory;
