import React, { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  Typography,
  IconButton,
  Switch,
  FormControlLabel,
  Divider,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CachedIcon from '@mui/icons-material/Cached';
import ModelIcon from '@mui/icons-material/Psychology';
import CurrencyIcon from '@mui/icons-material/AttachMoney';
import SettingsIcon from '@mui/icons-material/Settings';
import axios from 'axios';
import { useSettings } from '../../contexts/SettingsContext';

/**
 * Settings panel component that provides global application settings
 */
const SettingsPanel = () => {
  const { 
    cacheEnabled, 
    toggleCache, 
    settingsOpen, 
    toggleSettings,
    selectedModel,
    selectedCurrency,
    updateModel,
    updateCurrency
  } = useSettings();

  const [models, setModels] = useState({ economy: [], standard: [], premium: [] });
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch available models and currencies on component mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      
      try {
        // Fetch models
        const modelsResponse = await axios.get('/api/models');
        setModels(modelsResponse.data);

        // Fetch available currencies
        try {
          const currenciesResponse = await axios.get('/api/currencies');
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
      } catch (error) {
        console.error('Error fetching settings data:', error);
        setError('Failed to load settings data');
      } finally {
        setLoading(false);
      }
    };

    if (settingsOpen) {
      fetchData();
    }
  }, [settingsOpen]);

  // Handle model selection change
  const handleModelChange = (event) => {
    updateModel(event.target.value);
  };

  // Handle currency selection change
  const handleCurrencyChange = (event) => {
    updateCurrency(event.target.value);
  };

  // Render model options
  const renderModelOptions = () => {
    const allModels = [
      ...models.economy,
      ...models.standard,
      ...models.premium
    ];

    if (allModels.length === 0) {
      return (
        <FormControl fullWidth disabled={loading}>
          <InputLabel id="model-select-label">AI Model</InputLabel>
          <Select
            labelId="model-select-label"
            id="model-select"
            value={selectedModel}
            label="AI Model"
            disabled
          >
            <MenuItem value={selectedModel}>{selectedModel.split('/')[1] || selectedModel}</MenuItem>
          </Select>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            {loading ? 'Loading available models...' : 'No models available'}
          </Typography>
        </FormControl>
      );
    }

    return (
      <FormControl fullWidth disabled={loading}>
        <InputLabel id="model-select-label">AI Model</InputLabel>
        <Select
          labelId="model-select-label"
          id="model-select"
          value={selectedModel}
          label="AI Model"
          onChange={handleModelChange}
        >
          {models.economy.length > 0 && [
            <MenuItem key="economy-header" disabled>
              <Typography variant="overline">Economy Models</Typography>
            </MenuItem>,
            ...models.economy.map(model => (
              <MenuItem key={model.id} value={model.id}>
                {model.name || model.id.split('/')[1] || model.id}
              </MenuItem>
            ))
          ]}

          {models.standard.length > 0 && [
            <MenuItem key="standard-header" disabled>
              <Typography variant="overline">Standard Models</Typography>
            </MenuItem>,
            ...models.standard.map(model => (
              <MenuItem key={model.id} value={model.id}>
                {model.name || model.id.split('/')[1] || model.id}
              </MenuItem>
            ))
          ]}

          {models.premium.length > 0 && [
            <MenuItem key="premium-header" disabled>
              <Typography variant="overline">Premium Models</Typography>
            </MenuItem>,
            ...models.premium.map(model => (
              <MenuItem key={model.id} value={model.id}>
                {model.name || model.id.split('/')[1] || model.id}
              </MenuItem>
            ))
          ]}
        </Select>
      </FormControl>
    );
  };

  // Render currency options
  const renderCurrencyOptions = () => {
    if (currencies.length === 0) {
      return (
        <FormControl fullWidth disabled={loading}>
          <InputLabel id="currency-select-label">Currency</InputLabel>
          <Select
            labelId="currency-select-label"
            id="currency-select"
            value={selectedCurrency}
            label="Currency"
            disabled
          >
            <MenuItem value={selectedCurrency}>{selectedCurrency}</MenuItem>
          </Select>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            {loading ? 'Loading available currencies...' : 'No currencies available'}
          </Typography>
        </FormControl>
      );
    }

    return (
      <FormControl fullWidth disabled={loading}>
        <InputLabel id="currency-select-label">Currency</InputLabel>
        <Select
          labelId="currency-select-label"
          id="currency-select"
          value={selectedCurrency}
          label="Currency"
          onChange={handleCurrencyChange}
        >
          {currencies.map(currency => (
            <MenuItem key={currency.code} value={currency.code}>
              {currency.code} ({currency.symbol})
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  };

  return (
    <>
      {/* Settings drawer */}
      <Drawer
        anchor="right"
        open={settingsOpen}
        onClose={toggleSettings}
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
              <SettingsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Application Settings
            </Typography>
            <IconButton onClick={toggleSettings} aria-label="close settings">
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
                <ModelIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                AI Model
              </Typography>
              <Box sx={{ mb: 3 }}>
                {renderModelOptions()}
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ml: 2 }}>
                  Select the AI model used for generating summaries
                </Typography>
              </Box>

              <Divider sx={{ mb: 3 }} />

              <Typography variant="subtitle1" gutterBottom>
                <CurrencyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Currency
              </Typography>
              <Box sx={{ mb: 3 }}>
                {renderCurrencyOptions()}
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ml: 2 }}>
                  Select the currency for cost estimates
                </Typography>
              </Box>

              <Divider sx={{ mb: 3 }} />

              <Typography variant="subtitle1" gutterBottom>
                Cache Settings
              </Typography>

              <Box sx={{ mb: 3 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={cacheEnabled}
                      onChange={toggleCache}
                      color="primary"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CachedIcon sx={{ mr: 1 }} />
                      <Typography variant="body1">Enable Cache</Typography>
                    </Box>
                  }
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ml: 2 }}>
                  {cacheEnabled 
                    ? "Cache is enabled. Summaries will be retrieved from cache when available."
                    : "Cache is disabled. Fresh summaries will be generated for each request."}
                </Typography>
              </Box>
            </>
          )}

          <Divider sx={{ mb: 3 }} />

          <Typography variant="caption" color="text.secondary">
            Settings are automatically saved and will persist across sessions.
          </Typography>
        </Paper>
      </Drawer>
    </>
  );
};

export default SettingsPanel;
