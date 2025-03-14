import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Divider,
  Grid,
  Chip,
  Paper,
  IconButton,
  Collapse
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import YouTubeIcon from '@mui/icons-material/YouTube';
import SummarizeIcon from '@mui/icons-material/Summarize';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import MarkdownRenderer from '../../components/MarkdownRenderer';
import { apiService } from '../../core/services/api-service';

export default function VideoPage() {
  const router = useRouter();
  const { id } = router.query;
  const [videoData, setVideoData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [error, setError] = useState('');
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  useEffect(() => {
    // Only fetch data when id is available (after hydration)
    if (!id) return;

    const fetchVideoData = async () => {
      setIsLoading(true);
      setError('');

      try {
        // Use our API service instead of direct fetch
        const data = await apiService.getVideoInfo(id);

        // Extract the first item from the items array
        if (data.items && data.items.length > 0) {
          setVideoData(data.items[0]);
        } else {
          throw new Error('No video data found');
        }

        // Check if summary exists in cache
        const summaryData = await apiService.checkSummaryCache(id);

        if (summaryData.summaryInCache) {
          // If we have a summary in cache, we need to fetch it
          // This would typically be handled by the summarizeVideo function
          // but we can call it directly to get the cached summary
          const summaryResult = await apiService.summarizeVideo(`https://www.youtube.com/watch?v=${id}`);
          if (summaryResult.summary) {
            setSummary(summaryResult.summary);
          }
        }
      } catch (err) {
        console.error('Error fetching video data:', err);
        setError(err.message || 'Failed to fetch video data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideoData();
  }, [id]);

  const handleSummarize = async () => {
    if (!videoData) return;

    setIsSummarizing(true);
    setError('');

    try {
      // Use our API service instead of direct fetch
      const data = await apiService.summarizeVideo(`https://www.youtube.com/watch?v=${id}`);

      if (data.summary) {
        setSummary(data.summary);
      } else {
        throw new Error('Failed to generate summary');
      }
    } catch (err) {
      console.error('Error generating summary:', err);
      setError(err.message || 'Failed to generate summary. Please try again.');
    } finally {
      setIsSummarizing(false);
    }
  };

  const toggleDescription = () => {
    setDescriptionExpanded(!descriptionExpanded);
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/search')}
          >
            Back to Search
          </Button>
        </Box>
      </Container>
    );
  }

  if (!videoData) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Alert severity="warning">
            Video not found or invalid video ID
          </Alert>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/search')}
            sx={{ mt: 2 }}
          >
            Back to Search
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <>
      <Head>
        <title>{videoData.title || 'Video'} - YouTube to AI</title>
        <meta name="description" content={videoData.description || 'Video details and AI summary'} />
      </Head>

      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          {/* Back button */}
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/search')}
            sx={{ mb: 3 }}
          >
            Back to Search
          </Button>

          {/* Video header */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              {videoData.title}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <YouTubeIcon sx={{ color: 'red', mr: 1 }} />
              <Typography variant="subtitle1" color="text.secondary">
                {videoData.channelName}
              </Typography>
              {videoData.publishDate && (
                <>
                  <Box component="span" sx={{ mx: 1 }}>•</Box>
                  <Typography variant="subtitle1" color="text.secondary">
                    {new Date(videoData.publishDate).toLocaleDateString()}
                  </Typography>
                </>
              )}
            </Box>
          </Box>

          <Grid container spacing={4}>
            {/* Video player */}
            <Grid item xs={12} md={8}>
              <Box sx={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', mb: 3 }}>
                <iframe
                  src={`https://www.youtube.com/embed/${id}`}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                  title={videoData.title}
                />
              </Box>

              {/* Video description */}
              <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6">
                    Description
                  </Typography>
                  <IconButton onClick={toggleDescription} size="small">
                    {descriptionExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                </Box>
                <Collapse in={descriptionExpanded}>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>
                    {videoData.description || 'No description available'}
                  </Typography>
                </Collapse>
              </Paper>
            </Grid>

            {/* Summary section */}
            <Grid item xs={12} md={4}>
              <Card elevation={3}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <SummarizeIcon sx={{ mr: 1 }} />
                    <Typography variant="h6">
                      AI Summary
                    </Typography>
                  </Box>

                  {summary ? (
                    <Box>
                      <MarkdownRenderer content={summary.summary} paperProps={{ sx: { p: 2, bgcolor: 'transparent' }, variant: 'outlined' }} />

                      {summary.chapterSummaries && summary.chapterSummaries.length > 0 && (
                        <Box sx={{ mt: 3 }}>
                          <Typography variant="subtitle1" gutterBottom>
                            Chapter Summaries
                          </Typography>
                          {summary.chapterSummaries.map((chapter, index) => (
                            <Box key={index} sx={{ mb: 2 }}>
                              <Typography variant="subtitle2">
                                {chapter.title}
                              </Typography>
                              <MarkdownRenderer 
                                content={chapter.summary} 
                                paperProps={{ 
                                  sx: { p: 1, bgcolor: 'transparent' }, 
                                  variant: 'outlined' 
                                }} 
                              />
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Box>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        No summary available for this video yet
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<SummarizeIcon />}
                        onClick={handleSummarize}
                        disabled={isSummarizing}
                      >
                        {isSummarizing ? <CircularProgress size={24} /> : 'Generate Summary'}
                      </Button>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </>
  );
}
