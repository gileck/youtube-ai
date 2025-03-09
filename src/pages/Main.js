import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Box,
    Container,
    Typography,
    TextField,
    Button,
    Paper,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress,
    Divider,
    Alert,
    Grid,
    Card,
    CardContent,
    Chip,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
} from '@mui/material';
import YouTubeIcon from '@mui/icons-material/YouTube';
import SummarizeIcon from '@mui/icons-material/Summarize';
import CachedIcon from '@mui/icons-material/Cached';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsIcon from '@mui/icons-material/Settings';
import RefreshIcon from '@mui/icons-material/Refresh';
import CancelIcon from '@mui/icons-material/Cancel';
import ReactMarkdown from 'react-markdown';
import config from '../config';

// API base URL
const API_URL = '/api';

// Default YouTube URL from config
const DEFAULT_YOUTUBE_URL = config.youtube.defaultUrl;

export function Main() {
    // State
    const [youtubeUrl, setYoutubeUrl] = useState(DEFAULT_YOUTUBE_URL);
    const [selectedModel, setSelectedModel] = useState(config.ai.model);
    const [selectedCurrency, setSelectedCurrency] = useState(config.currency.default);
    const [currencies, setCurrencies] = useState([]);
    const [models, setModels] = useState({ economy: [], standard: [], premium: [] });
    const [loading, setLoading] = useState(false);
    const [estimating, setEstimating] = useState(false);
    const [error, setError] = useState('');
    const [costEstimate, setCostEstimate] = useState(null);
    const [summary, setSummary] = useState('');
    const [actualCost, setActualCost] = useState(null);
    const [step, setStep] = useState('input'); // input, estimate, summary
    const [cacheStats, setCacheStats] = useState(null);
    const [clearCacheDialogOpen, setClearCacheDialogOpen] = useState(false);
    const [clearingCache, setClearingCache] = useState(false);
    const [clearAllCacheDialogOpen, setClearAllCacheDialogOpen] = useState(false);
    const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
    const [costApprovalDialogOpen, setCostApprovalDialogOpen] = useState(false);

    // Fetch available models and cache stats on component mount
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // Fetch models
                const modelsResponse = await axios.get(`${API_URL}/models`);
                setModels(modelsResponse.data);

                // Keep the default model as configured
                // Only set a different model if the configured model is not available
                const allModels = [
                    ...modelsResponse.data.economy,
                    ...modelsResponse.data.standard,
                    ...modelsResponse.data.premium
                ];

                const configuredModelExists = allModels.some(model => model.id === config.ai.model);

                if (!configuredModelExists && allModels.length > 0) {
                    // If configured model is not available, set the first economy model as default
                    if (modelsResponse.data.economy.length > 0) {
                        setSelectedModel(modelsResponse.data.economy[0].id);
                    } else if (modelsResponse.data.standard.length > 0) {
                        setSelectedModel(modelsResponse.data.standard[0].id);
                    } else if (modelsResponse.data.premium.length > 0) {
                        setSelectedModel(modelsResponse.data.premium[0].id);
                    }
                }

                // Fetch available currencies
                try {
                    const currenciesResponse = await axios.get(`${API_URL}/currencies`);
                    setCurrencies(currenciesResponse.data);
                } catch (currencyError) {
                    console.warn('Could not fetch currencies:', currencyError);
                    // Set default currencies if API fails
                    setCurrencies([
                        { code: 'USD', symbol: '$', rate: 1 },
                        { code: 'EUR', symbol: '€', rate: 0.92 },
                        { code: 'GBP', symbol: '£', rate: 0.78 },
                        { code: 'ILS', symbol: '₪', rate: 3.65 }
                    ]);
                }

                try {
                    // Fetch cache stats (don't fail if this fails)
                    const cacheResponse = await axios.get(`${API_URL}/cache/stats`);
                    setCacheStats(cacheResponse.data);
                } catch (cacheError) {
                    console.warn('Could not fetch cache stats:', cacheError);
                    // Don't set an error for this
                }
            } catch (error) {
                console.error('Error fetching initial data:', error);
                if (error.response?.data?.error) {
                    setError(error.response.data.error);
                } else if (error.message === 'Network Error') {
                    setError('Could not connect to the server. Please make sure the server is running.');
                } else {
                    setError('Failed to fetch initial data');
                }
            }
        };

        fetchInitialData();
    }, []);

    // Handle YouTube URL input change
    const handleUrlChange = (e) => {
        setYoutubeUrl(e.target.value);
        // Reset states when URL changes
        if (step !== 'input') {
            setStep('input');
            setCostEstimate(null);
            setSummary('');
            setActualCost(null);
        }
    };

    // Handle settings dialog open
    const handleOpenSettings = () => {
        setSettingsDialogOpen(true);
    };

    // Handle settings dialog close
    const handleCloseSettings = () => {
        setSettingsDialogOpen(false);
    };

    // Handle model selection change
    const handleModelChange = (e) => {
        setSelectedModel(e.target.value);
        // Reset cost estimate when model changes
        if (costEstimate) {
            setCostEstimate(null);
        }
    };

    // Handle currency selection change
    const handleCurrencyChange = (e) => {
        setSelectedCurrency(e.target.value);
        // Reset cost estimate when currency changes
        if (costEstimate) {
            setCostEstimate(null);
        }
    };

    // Start summarize process (first step: estimate cost)
    const handleStartSummarize = async (forceCacheOption = null) => {
        if (!youtubeUrl) {
            setError('Please enter a YouTube URL');
            return;
        }

        setError('');
        setEstimating(true);

        try {
            // Get the estimate with the appropriate cache option
            const skipCache = forceCacheOption === 'fresh';

            const response = await axios.post(`${API_URL}/estimate`, {
                youtubeUrl,
                model: selectedModel,
                currency: selectedCurrency,
                skipCache: skipCache
            });

            const estimateData = response.data;
            setCostEstimate({
                ...estimateData,
                skipCache
            });
            
            // Check if cost approval is needed based on the threshold
            if (estimateData.requiresApproval) {
                setCostApprovalDialogOpen(true);
            } else {
                // If approval not required, proceed directly with summary generation
                handleGenerateSummary(skipCache);
            }
        } catch (error) {
            console.error('Error estimating cost:', error);
            setError(error.response?.data?.error || 'Failed to estimate cost');
        } finally {
            setEstimating(false);
        }
    };

    // Handle cost approval dialog close (cancel)
    const handleCostApprovalCancel = () => {
        setCostApprovalDialogOpen(false);
        setCostEstimate(null);
    };

    // Handle cost approval (proceed with summary generation)
    const handleCostApproval = () => {
        setCostApprovalDialogOpen(false);
        handleGenerateSummary(costEstimate?.skipCache);
    };

    // Generate summary
    const handleGenerateSummary = async (skipCache = false) => {
        if (!youtubeUrl) {
            setError('Please enter a YouTube URL');
            return;
        }

        setError('');
        setLoading(true);
        setStep('summary');

        try {
            const response = await axios.post(`${API_URL}/summarize`, {
                youtubeUrl,
                model: selectedModel,
                currency: selectedCurrency,
                skipCache: skipCache
            });

            setSummary(response.data.summary);
            setActualCost(response.data.cost);

            // Update cache stats after generating summary
            const cacheResponse = await axios.get(`${API_URL}/cache/stats`);
            setCacheStats(cacheResponse.data);
        } catch (error) {
            console.error('Error generating summary:', error);
            setError(error.response?.data?.error || 'Failed to generate summary');
            setStep('input');
        } finally {
            setLoading(false);
        }
    };

    // Clear cache item
    const handleClearCacheItem = async (cacheKey) => {
        setClearingCache(true);

        try {
            await axios.delete(`${API_URL}/cache/${cacheKey}`);

            // Reset states
            if (costEstimate?.fromCache && costEstimate?.cacheKey === cacheKey) {
                setCostEstimate(null);
                setStep('input');
            }

            if (summary && actualCost?.fromCache && actualCost?.cacheKey === cacheKey) {
                setSummary('');
                setActualCost(null);
                setStep('input');
            }

            // Update cache stats
            const cacheResponse = await axios.get(`${API_URL}/cache/stats`);
            setCacheStats(cacheResponse.data);

            setClearCacheDialogOpen(false);
        } catch (error) {
            console.error('Error clearing cache item:', error);
            setError('Failed to clear cache item');
        } finally {
            setClearingCache(false);
        }
    };

    // Clear all cache
    const handleClearAllCache = async () => {
        setClearingCache(true);

        try {
            await axios.delete(`${API_URL}/cache/clear`);

            // Reset states if we're showing cached content
            if (costEstimate?.fromCache) {
                setCostEstimate(null);
                setStep('input');
            }

            if (summary && actualCost?.fromCache) {
                setSummary('');
                setActualCost(null);
                setStep('input');
            }

            // Update cache stats
            const cacheResponse = await axios.get(`${API_URL}/cache/stats`);
            setCacheStats(cacheResponse.data);

            setClearAllCacheDialogOpen(false);
        } catch (error) {
            console.error('Error clearing all cache:', error);
            setError('Failed to clear cache');
        } finally {
            setClearingCache(false);
        }
    };

    // Reset to start
    const handleReset = () => {
        setYoutubeUrl('');
        setCostEstimate(null);
        setSummary('');
        setActualCost(null);
        setStep('input');
        setError('');
    };

    // Render model options
    const renderModelOptions = () => {
        return (
            <>
                <InputLabel id="model-select-label">AI Model</InputLabel>
                <Select
                    labelId="model-select-label"
                    id="model-select"
                    value={selectedModel}
                    label="AI Model"
                    onChange={handleModelChange}
                    disabled={loading || estimating}
                >
                    {models.economy.length > 0 && (
                        <MenuItem disabled>
                            <Typography variant="subtitle2">Economy Models</Typography>
                        </MenuItem>
                    )}
                    {models.economy.map((model) => (
                        <MenuItem key={model.id} value={model.id}>
                            {model.name}
                        </MenuItem>
                    ))}

                    {models.standard.length > 0 && (
                        <MenuItem disabled>
                            <Typography variant="subtitle2">Standard Models</Typography>
                        </MenuItem>
                    )}
                    {models.standard.map((model) => (
                        <MenuItem key={model.id} value={model.id}>
                            {model.name}
                        </MenuItem>
                    ))}

                    {models.premium.length > 0 && (
                        <MenuItem disabled>
                            <Typography variant="subtitle2">Premium Models</Typography>
                        </MenuItem>
                    )}
                    {models.premium.map((model) => (
                        <MenuItem key={model.id} value={model.id}>
                            {model.name}
                        </MenuItem>
                    ))}
                </Select>
            </>
        );
    };

    // Render currency options
    const renderCurrencyOptions = () => {
        return (
            <>
                <InputLabel id="currency-select-label">Currency</InputLabel>
                <Select
                    labelId="currency-select-label"
                    id="currency-select"
                    value={selectedCurrency}
                    label="Currency"
                    onChange={handleCurrencyChange}
                    disabled={loading || estimating}
                >
                    {currencies.map((currency) => (
                        <MenuItem key={currency.code} value={currency.code}>
                            {currency.code} ({currency.symbol})
                        </MenuItem>
                    ))}
                </Select>
            </>
        );
    };

    // Render cost estimate
    const renderCostEstimate = () => {
        if (!costEstimate) return null;

        return (
            <Card variant="outlined" sx={{ mt: 3, mb: 3 }}>
                <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="h6" gutterBottom>
                            Estimated Cost
                        </Typography>
                        {costEstimate.fromCache && (
                            <Box display="flex" alignItems="center">
                                <Chip
                                    icon={<CachedIcon />}
                                    label="Cached"
                                    color="info"
                                    size="small"
                                    sx={{ mr: 1 }}
                                />
                                <Tooltip title="Clear this cache item">
                                    <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => setClearCacheDialogOpen(costEstimate.cacheKey)}
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        )}
                    </Box>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">
                                Model
                            </Typography>
                            <Typography variant="body1">{costEstimate.model}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">
                                Processing Strategy
                            </Typography>
                            <Typography variant="body1">{costEstimate.processingStrategy}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">
                                Input Tokens
                            </Typography>
                            <Typography variant="body1">
                                {costEstimate.inputTokens.toLocaleString()} ({costEstimate.inputCostFormatted})
                            </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">
                                Output Tokens (estimated)
                            </Typography>
                            <Typography variant="body1">
                                {costEstimate.outputTokens.toLocaleString()} ({costEstimate.outputCostFormatted})
                            </Typography>
                        </Grid>
                        <Grid item xs={12}>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="h6" color="primary">
                                Total: {costEstimate.totalCostFormatted}
                            </Typography>
                            {costEstimate.currency !== 'USD' && (
                                <Typography variant="caption" color="text.secondary">
                                    Exchange rate: 1 USD = {costEstimate.exchangeRate} {costEstimate.currency}
                                </Typography>
                            )}
                            {costEstimate.fromCache && costEstimate.cachedAt && (
                                <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                                    Cached at: {new Date(costEstimate.cachedAt).toLocaleString()}
                                </Typography>
                            )}
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>
        );
    };

    // Render actual cost
    const renderActualCost = () => {
        if (!actualCost) return null;

        return (
            <Card variant="outlined" sx={{ mt: 3, mb: 3 }}>
                <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="h6" gutterBottom>
                            Actual Cost
                        </Typography>
                        {actualCost.fromCache && (
                            <Box display="flex" alignItems="center">
                                <Chip
                                    icon={<CachedIcon />}
                                    label="Cached"
                                    color="info"
                                    size="small"
                                    sx={{ mr: 1 }}
                                />
                                <Tooltip title="Clear this cache item">
                                    <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => setClearCacheDialogOpen(actualCost.cacheKey)}
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        )}
                    </Box>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">
                                Model
                            </Typography>
                            <Typography variant="body1">{actualCost.modelName || 'Unknown model'}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">
                                Processing Time
                            </Typography>
                            <Typography variant="body1">{actualCost.processingTime || '0'} seconds</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">
                                Input Tokens
                            </Typography>
                            <Typography variant="body1">
                                {actualCost.inputTokens ? actualCost.inputTokens.toLocaleString() : '0'} ({actualCost.inputCostFormatted || '$0.00'})
                            </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">
                                Output Tokens
                            </Typography>
                            <Typography variant="body1">
                                {actualCost.outputTokens ? actualCost.outputTokens.toLocaleString() : '0'} ({actualCost.outputCostFormatted || '$0.00'})
                            </Typography>
                        </Grid>
                        <Grid item xs={12}>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="h6" color="primary">
                                Total: {actualCost.totalCostFormatted || '$0.00'}
                            </Typography>
                            {actualCost.currency && actualCost.currency !== 'USD' && actualCost.exchangeRate && (
                                <Typography variant="caption" color="text.secondary">
                                    Exchange rate: 1 USD = {actualCost.exchangeRate} {actualCost.currency}
                                </Typography>
                            )}
                            {actualCost.fromCache && actualCost.cachedAt && (
                                <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                                    Cached at: {new Date(actualCost.cachedAt).toLocaleString()}
                                </Typography>
                            )}
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>
        );
    };

    // Render cache stats
    const renderCacheStats = () => {
        if (!cacheStats) return null;

        return (
            <Box mt={4} mb={2}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2" color="text.secondary">
                        Cache: {cacheStats.count || 0} items ({cacheStats.sizeFormatted || '0 Bytes'})
                    </Typography>
                    {(cacheStats.count > 0 || cacheStats.size > 0) && (
                        <Button
                            size="small"
                            variant="contained"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => setClearAllCacheDialogOpen(true)}
                        >
                            Clear All Cache
                        </Button>
                    )}
                </Box>
            </Box>
        );
    };

    // Render cost estimate for the approval dialog
    const renderCostEstimateForApproval = () => {
        if (!costEstimate) return null;

        return (
            <Box>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                            Model
                        </Typography>
                        <Typography variant="body1">{costEstimate.model}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                            Processing Strategy
                        </Typography>
                        <Typography variant="body1">{costEstimate.processingStrategy}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                            Input Tokens
                        </Typography>
                        <Typography variant="body1">
                            {costEstimate.inputTokens.toLocaleString()} ({costEstimate.inputCostFormatted})
                        </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                            Output Tokens (estimated)
                        </Typography>
                        <Typography variant="body1">
                            {costEstimate.outputTokens.toLocaleString()} ({costEstimate.outputCostFormatted})
                        </Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="h6" color="primary">
                            Total: {costEstimate.totalCostFormatted}
                        </Typography>
                        {costEstimate.currency !== 'USD' && (
                            <Typography variant="caption" color="text.secondary">
                                Exchange rate: 1 USD = {costEstimate.exchangeRate} {costEstimate.currency}
                            </Typography>
                        )}
                        {costEstimate.fromCache && costEstimate.cachedAt && (
                            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                                Cached at: {new Date(costEstimate.cachedAt).toLocaleString()}
                            </Typography>
                        )}
                    </Grid>
                </Grid>
            </Box>
        );
    };

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
                <Box display="flex" alignItems="center" mb={3}>
                    <YouTubeIcon color="error" fontSize="large" sx={{ mr: 2 }} />
                    <Typography variant="h4" component="h1">
                        YouTube to AI
                    </Typography>
                </Box>

                <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                    Enter a YouTube URL to generate an AI summary of the video
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
                        {error}
                    </Alert>
                )}

                <TextField
                    label="YouTube URL"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={youtubeUrl}
                    onChange={handleUrlChange}
                    disabled={loading}
                    fullWidth
                    InputProps={{
                        sx: { fontSize: '1.1rem', py: 1 }
                    }}
                    sx={{ mb: 2 }}
                />

                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Box display="flex" alignItems="center">
                        <Typography variant="body2" color="text.secondary" mr={1}>
                            Model: {selectedModel.split('/')[1] || selectedModel}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Currency: {selectedCurrency}
                        </Typography>
                    </Box>
                    <Button
                        variant="outlined"
                        startIcon={<SettingsIcon />}
                        onClick={handleOpenSettings}
                        disabled={loading || estimating}
                        size="small"
                    >
                        Settings
                    </Button>
                </Box>

                {step === 'input' && (
                    <Button
                        onClick={handleStartSummarize}
                        disabled={!youtubeUrl || estimating || loading}
                        startIcon={estimating ? <CircularProgress size={20} /> : <SummarizeIcon />}
                        fullWidth
                        size="large"
                        variant="contained"
                        color="primary"
                        sx={{ mt: 2 }}
                    >
                        {estimating ? 'Estimating Cost...' : 'Summarize'}
                    </Button>
                )}

                {step === 'summary' && loading && (
                    <Box textAlign="center" py={4}>
                        <CircularProgress size={40} />
                        <Typography variant="h6" sx={{ mt: 2 }}>
                            Generating Summary...
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            This may take a minute or two depending on the video length.
                        </Typography>
                    </Box>
                )}

                {step === 'summary' && !loading && (
                    <>
                        <Box mt={4}>
                            <Typography variant="h5" gutterBottom>
                                Summary
                            </Typography>
                            <Paper variant="outlined" sx={{ p: 3, mt: 2, bgcolor: '#f9f9f9' }}>
                                <ReactMarkdown>{summary}</ReactMarkdown>
                            </Paper>
                        </Box>

                        {renderActualCost()}

                        <Button
                            onClick={handleReset}
                            variant="contained"
                            fullWidth
                            size="large"
                            sx={{ mt: 2 }}
                        >
                            Summarize Another Video
                        </Button>
                    </>
                )}

                {renderCacheStats()}
            </Paper>

            {/* Settings Dialog */}
            <Dialog
                open={settingsDialogOpen}
                onClose={handleCloseSettings}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Settings</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        Configure the AI model and currency for cost estimation and summary generation.
                    </DialogContentText>

                    <FormControl fullWidth margin="normal">
                        {renderModelOptions()}
                    </FormControl>

                    <FormControl fullWidth margin="normal">
                        {renderCurrencyOptions()}
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseSettings} color="primary">
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Cost Approval Dialog */}
            <Dialog
                open={costApprovalDialogOpen}
                onClose={handleCostApprovalCancel}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Approve Cost</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        Please review and approve the estimated cost for generating the summary:
                    </DialogContentText>

                    {renderCostEstimateForApproval()}

                    {costEstimate?.fromCache && !costEstimate?.skipCache && (
                        <Alert severity="info" sx={{ mt: 2 }}>
                            This summary is available from cache and will be delivered instantly.
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={handleCostApprovalCancel}
                        startIcon={<CancelIcon />}
                    >
                        Cancel
                    </Button>
                    {costEstimate?.fromCache && (
                        <Button
                            onClick={() => {
                                setCostApprovalDialogOpen(false);
                                handleStartSummarize('fresh');
                            }}
                            color="secondary"
                            startIcon={<RefreshIcon />}
                        >
                            Fresh Summary
                        </Button>
                    )}
                    <Button
                        onClick={handleCostApproval}
                        color="primary"
                        variant="contained"
                        startIcon={costEstimate?.fromCache ? <CachedIcon /> : <SummarizeIcon />}
                    >
                        {costEstimate?.fromCache ? "Use Cache" : "Generate Summary"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Clear Cache Dialog */}
            <Dialog
                open={Boolean(clearCacheDialogOpen)}
                onClose={() => setClearCacheDialogOpen(false)}
            >
                <DialogTitle>Clear Cache Item</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to clear this item from the cache?
                        This will require re-processing if you request the same content again.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setClearCacheDialogOpen(false)}
                        disabled={clearingCache}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={() => handleClearCacheItem(clearCacheDialogOpen)}
                        color="error"
                        disabled={clearingCache}
                        startIcon={clearingCache ? <CircularProgress size={20} /> : null}
                    >
                        {clearingCache ? 'Clearing...' : 'Clear Cache Item'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Clear All Cache Dialog */}
            <Dialog
                open={clearAllCacheDialogOpen}
                onClose={() => setClearAllCacheDialogOpen(false)}
            >
                <DialogTitle>Clear All Cache</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to clear the entire cache?
                        This will remove all cached summaries and require re-processing for future requests.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setClearAllCacheDialogOpen(false)}
                        disabled={clearingCache}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleClearAllCache}
                        color="error"
                        disabled={clearingCache}
                        startIcon={clearingCache ? <CircularProgress size={20} /> : null}
                    >
                        {clearingCache ? 'Clearing...' : 'Clear All Cache'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
