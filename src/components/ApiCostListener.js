import { useEffect } from 'react';
import { useApiCost } from '../contexts/ApiCostContext';

/**
 * Component that listens for API cost events and displays alerts
 * This is a "headless" component (no UI) that just handles the event listening
 */
const ApiCostListener = () => {
  const { showApiCostAlert } = useApiCost();
  
  useEffect(() => {
    // Handler for API cost events
    const handleApiCost = (event) => {
      const { operation, cost, fromCache } = event.detail;
      showApiCostAlert(operation, cost, fromCache);
    };
    
    // Add event listener
    window.addEventListener('api-cost', handleApiCost);
    
    // Clean up
    return () => {
      window.removeEventListener('api-cost', handleApiCost);
    };
  }, [showApiCostAlert]);
  
  // This component doesn't render anything
  return null;
};

export default ApiCostListener;
