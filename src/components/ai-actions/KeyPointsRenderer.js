import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import MarkdownRenderer from '../MarkdownRenderer';

/**
 * Component to render key points extracted from a video
 * @param {Object} props - Component props
 * @param {Object} props.data - The key points data
 * @param {Object} props.videoInfo - Information about the video
 */
const KeyPointsRenderer = ({ data, videoInfo }) => {
  if (!data || !Array.isArray(data)) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body1" color="text.secondary">
          No key points available.
        </Typography>
      </Box>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: 2 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Key Points
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Main insights and important points from this video
        </Typography>
        <Divider sx={{ my: 2 }} />
      </Box>
      
      <List sx={{ width: '100%' }}>
        {data.map((point, index) => (
          <ListItem key={index} alignItems="flex-start" sx={{ py: 1 }}>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <LightbulbOutlinedIcon color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary={
                <Box sx={{ mt: -0.5 }}>
                  <MarkdownRenderer content={point} />
                </Box>
              } 
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

export default KeyPointsRenderer;
