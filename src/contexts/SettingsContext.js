import React, { createContext, useState, useContext, useEffect } from 'react';
import config from '../config';

// Create the Settings context
const SettingsContext = createContext();

// Settings provider component
export const SettingsProvider = ({ children }) => {
  // Initialize state with values from localStorage if available
  const [cacheEnabled, setCacheEnabled] = useState(true);
  const [selectedModel, setSelectedModel] = useState(config.ai.model);
  const [selectedCurrency, setSelectedCurrency] = useState(config.currency.default);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Load settings from localStorage on component mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('youtubeAiSettings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setCacheEnabled(parsedSettings.cacheEnabled !== false); // Default to true if not specified
        
        // Load model and currency settings if available
        if (parsedSettings.selectedModel) {
          setSelectedModel(parsedSettings.selectedModel);
        }
        
        if (parsedSettings.selectedCurrency) {
          setSelectedCurrency(parsedSettings.selectedCurrency);
        }
      }
    } catch (error) {
      console.error('Error loading settings from localStorage:', error);
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('youtubeAiSettings', JSON.stringify({
        cacheEnabled,
        selectedModel,
        selectedCurrency
      }));
    } catch (error) {
      console.error('Error saving settings to localStorage:', error);
    }
  }, [cacheEnabled, selectedModel, selectedCurrency]);

  // Toggle cache setting
  const toggleCache = () => {
    setCacheEnabled(prev => !prev);
  };

  // Toggle settings panel
  const toggleSettings = () => {
    setSettingsOpen(prev => !prev);
  };

  // Update model setting
  const updateModel = (model) => {
    setSelectedModel(model);
  };

  // Update currency setting
  const updateCurrency = (currency) => {
    setSelectedCurrency(currency);
  };

  // Context value
  const value = {
    // Settings values
    cacheEnabled,
    selectedModel,
    selectedCurrency,
    settingsOpen,
    
    // Settings actions
    toggleCache,
    toggleSettings,
    updateModel,
    updateCurrency
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

// Custom hook to use the settings context
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export default SettingsContext;
