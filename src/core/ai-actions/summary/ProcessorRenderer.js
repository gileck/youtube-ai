import React from 'react';
import { Box, Typography } from '@mui/material';
import ReactMarkdown from 'react-markdown';

/**
 * Component for rendering summary results
 * @param {Object} props - Component props
 * @param {string} props.result - The summary text
 * @returns {JSX.Element} Rendered component
 */
const ProcessorRenderer = ({ result }) => {
  if (!result || !result.text) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body1">No summary available</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <ReactMarkdown>{result.text}</ReactMarkdown>
    </Box>
  );
};

export default ProcessorRenderer;
