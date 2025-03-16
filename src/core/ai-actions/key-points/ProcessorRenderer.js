import React from 'react';
import { Box, Typography, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import LightbulbIcon from '@mui/icons-material/Lightbulb';

/**
 * Component for rendering key points results
 * @param {Object} props - Component props
 * @param {Array} props.result - The key points array
 * @returns {JSX.Element} Rendered component
 */
const ProcessorRenderer = ({ result }) => {
  if (!result || !result.text || !Array.isArray(result.text) || result.text.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body1">No key points available</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <List>
        {result.text.map((point, index) => (
          <ListItem key={index} alignItems="flex-start">
            <ListItemIcon>
              <LightbulbIcon color="primary" />
            </ListItemIcon>
            <ListItemText primary={point} />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default ProcessorRenderer;
