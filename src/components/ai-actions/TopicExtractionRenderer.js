import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TopicIcon from '@mui/icons-material/Topic';
import MarkdownRenderer from '../MarkdownRenderer';

/**
 * Component to render topics extracted from a video
 * @param {Object} props - Component props
 * @param {Object} props.data - The topic extraction data
 * @param {Object} props.videoInfo - Information about the video
 */
const TopicExtractionRenderer = ({ data, videoInfo }) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body1" color="text.secondary">
          No topics available.
        </Typography>
      </Box>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: 2 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Topics Covered
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Main topics and subjects discussed in this video
        </Typography>
        <Divider sx={{ my: 2 }} />
      </Box>
      
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
          {data.map((topic, index) => (
            <Chip 
              key={index}
              icon={<TopicIcon />}
              label={topic.name || topic.title || `Topic ${index + 1}`}
              color="primary"
              variant="outlined"
            />
          ))}
        </Box>
        
        {data.map((topic, index) => (
          <Accordion key={index} sx={{ mb: 1 }}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls={`topic-${index}-content`}
              id={`topic-${index}-header`}
            >
              <Typography variant="subtitle1">
                {topic.name || topic.title || `Topic ${index + 1}`}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {topic.description ? (
                <MarkdownRenderer content={topic.description} />
              ) : topic.content ? (
                <MarkdownRenderer content={topic.content} />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No details available for this topic.
                </Typography>
              )}
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    </Paper>
  );
};

export default TopicExtractionRenderer;
