import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Divider 
} from '@mui/material';
import MarkdownRenderer from '../MarkdownRenderer';

/**
 * Component to render video summaries
 * @param {Object} props - Component props
 * @param {Object} props.data - The summary data
 * @param {Object} props.videoInfo - Information about the video
 */
const SummaryRenderer = ({ data, videoInfo }) => {
  if (!data) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body1" color="text.secondary">
          No summary available.
        </Typography>
      </Box>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: 2 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Video Summary
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          A concise summary of the key content from this video
        </Typography>
        <Divider sx={{ my: 2 }} />
      </Box>
      
      <Box sx={{ mb: 3 }}>
        <MarkdownRenderer content={data} />
      </Box>
    </Paper>
  );
};

export default SummaryRenderer;
