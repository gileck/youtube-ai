import React, { useState } from 'react';
import Head from 'next/head';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Divider,
  Card,
  CardContent
} from '@mui/material';
import YouTubeIcon from '@mui/icons-material/YouTube';
import SummarizeIcon from '@mui/icons-material/Summarize';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { apiService } from '../core/services/api-service';
import config from '../config';

export default function SummarizePage() {
  const [url, setUrl] = useState(config.youtube.defaultUrl || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState('');
  const [videoInfo, setVideoInfo] = useState(null);

  const handleSummarize = async () => {
    if (!url) {
      setError('Please enter a YouTube URL');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setSummary('');
    setVideoInfo(null);
    
    try {
      // This will trigger our API cost alert
      const data = await apiService.summarizeVideo(url);
      
      if (data.summary) {
        setSummary(data.summary);
        if (data.videoInfo) {
          setVideoInfo(data.videoInfo);
        }
      } else {
        throw new Error('Failed to generate summary');
      }
    } catch (err) {
      console.error('Error summarizing video:', err);
      setError(err.message || 'Failed to summarize video. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Summarize YouTube Video - YouTube to AI</title>
        <meta name="description" content="Generate AI summaries of YouTube videos" />
      </Head>
      
      <Container maxWidth="md">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <SummarizeIcon sx={{ mr: 1 }} />
            Summarize YouTube Video
          </Typography>
          
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Enter a YouTube URL to generate an AI-powered summary
          </Typography>
          
          <Paper elevation={0} variant="outlined" sx={{ p: 3, my: 4 }}>
            <Box component="form" onSubmit={(e) => { e.preventDefault(); handleSummarize(); }}>
              <TextField
                fullWidth
                label="YouTube URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                variant="outlined"
                sx={{ mb: 2 }}
              />
              
              <Button
                variant="contained"
                color="primary"
                onClick={handleSummarize}
                disabled={isLoading || !url}
                startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <SummarizeIcon />}
                type="submit"
              >
                {isLoading ? 'Summarizing...' : 'Summarize Video'}
              </Button>
            </Box>
          </Paper>
          
          {error && (
            <Alert severity="error" sx={{ my: 2 }}>
              {error}
            </Alert>
          )}
          
          {videoInfo && (
            <Card variant="outlined" sx={{ mb: 4 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  {videoInfo.thumbnails && videoInfo.thumbnails.medium && (
                    <Box sx={{ mr: 2, flexShrink: 0 }}>
                      <img 
                        src={videoInfo.thumbnails.medium.url} 
                        alt={videoInfo.title}
                        style={{ width: '120px', borderRadius: '4px' }}
                      />
                    </Box>
                  )}
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      {videoInfo.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {videoInfo.channelName}
                    </Typography>
                    <Button 
                      variant="text" 
                      color="primary"
                      startIcon={<YouTubeIcon />}
                      href={videoInfo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                      sx={{ mt: 1 }}
                    >
                      Watch on YouTube
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}
          
          {summary && (
            <Box sx={{ my: 4 }}>
              <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <SummarizeIcon sx={{ mr: 1 }} fontSize="small" />
                Summary
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Paper variant="outlined" sx={{ p: 3 }}>
                <MarkdownRenderer content={summary} />
              </Paper>
            </Box>
          )}
        </Box>
      </Container>
    </>
  );
}
