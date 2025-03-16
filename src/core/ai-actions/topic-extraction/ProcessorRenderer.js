import React from 'react';
import { Box, Typography, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ReactMarkdown from 'react-markdown';

/**
 * Component for rendering topic extraction results
 * @param {Object} props - Component props
 * @param {Array} props.result - The topics array
 * @returns {JSX.Element} Rendered component
 */
const ProcessorRenderer = ({ result }) => {
  if (!result || !result.text || !Array.isArray(result.text) || result.text.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body1">No topics available</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {result.text.map((topic, index) => (
        <Accordion key={index} defaultExpanded={index === 0}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls={`topic-${index}-content`}
            id={`topic-${index}-header`}
          >
            <Typography variant="h6">{topic.name}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <ReactMarkdown>{topic.description}</ReactMarkdown>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};

export default ProcessorRenderer;
