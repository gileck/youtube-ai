import React, { useState, useEffect, lazy, Suspense } from 'react';
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
  Collapse,
  Tabs,
  Tab,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import YouTubeIcon from '@mui/icons-material/YouTube';
import SummarizeIcon from '@mui/icons-material/Summarize';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import TopicIcon from '@mui/icons-material/Topic';
import MarkdownRenderer from '../../components/MarkdownRenderer';
import { apiService } from '../../core/services/api-service';
import { getAllActions, getComponentName } from '../../core/ai-actions/action-metadata.js';

// Dynamically import action renderers
const SummaryRenderer = lazy(() => import('../../components/ai-actions/SummaryRenderer'));
const KeyPointsRenderer = lazy(() => import('../../components/ai-actions/KeyPointsRenderer'));
const TopicExtractionRenderer = lazy(() => import('../../components/ai-actions/TopicExtractionRenderer'));

// Map of component names to their lazy-loaded components
const componentMap = {
  SummaryRenderer,
  KeyPointsRenderer,
  TopicExtractionRenderer
};

// Map of action IDs to icons
const actionIcons = {
  summary: <SummarizeIcon />,
  keyPoints: <LightbulbIcon />,
  topicExtraction: <TopicIcon />
};

export default function VideoPage() {
  const router = useRouter();
  const { id } = router.query;
  const [videoData, setVideoData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  
  // AI Actions state
  const [availableActions, setAvailableActions] = useState([]);
  const [activeActionId, setActiveActionId] = useState(null);
  const [actionResults, setActionResults] = useState({});
  const [processingActionId, setProcessingActionId] = useState(null);
  const [actionError, setActionError] = useState('');
  
  // Action menu state
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  
  // Handle action menu open
  const handleActionMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  // Handle action menu close
  const handleActionMenuClose = () => {
    setAnchorEl(null);
  };

  useEffect(() => {
    // Load available actions
    setAvailableActions(getAllActions());
  }, []);

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
            // Store the summary in the actionResults state
            setActionResults(prev => ({
              ...prev,
              summary: {
                data: summaryResult.summary,
                videoInfo: {
                  title: summaryResult.title,
                  channelName: summaryResult.channelName,
                  publishDate: summaryResult.publishDate,
                  thumbnails: summaryResult.thumbnails,
                  url: summaryResult.videoUrl
                }
              }
            }));
            
            // Set the active action to summary
            setActiveActionId('summary');
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

  const processAction = async (actionId) => {
    if (!videoData || !id) return;
    
    // If we already have results for this action, just set it as active
    if (actionResults[actionId]) {
      setActiveActionId(actionId);
      return;
    }
    
    setProcessingActionId(actionId);
    setActionError('');
    
    try {
      // Process the selected AI action
      const data = await apiService.processAiAction(`https://www.youtube.com/watch?v=${id}`, actionId);
      
      if (data.result) {
        // Store the result in the actionResults state
        setActionResults(prev => ({
          ...prev,
          [actionId]: {
            data: data.result,
            videoInfo: {
              title: data.title,
              channelName: data.channelName,
              publishDate: data.publishDate,
              thumbnails: data.thumbnails,
              url: data.videoUrl
            }
          }
        }));
        
        // Set the active action to the processed action
        setActiveActionId(actionId);
      } else {
        throw new Error(`Failed to process ${actionId}`);
      }
    } catch (err) {
      console.error(`Error processing AI action ${actionId}:`, err);
      setActionError(err.message || `Failed to process ${actionId}. Please try again.`);
    } finally {
      setProcessingActionId(null);
      handleActionMenuClose(); // Close the menu after action is processed
    }
  };

  // Handle action tab change
  const handleActionChange = (event, newActionId) => {
    if (newActionId === activeActionId) return;
    
    // If we already have results for this action, just set it as active
    if (actionResults[newActionId]) {
      setActiveActionId(newActionId);
    } else {
      // Otherwise, process the action
      processAction(newActionId);
    }
  };
  
  // Handle action selection from menu
  const handleActionSelect = (actionId) => {
    processAction(actionId);
  };

  const toggleDescription = () => {
    setDescriptionExpanded(!descriptionExpanded);
  };
  
  // Dynamically render the appropriate component for the active action
  const renderActionResult = () => {
    if (!activeActionId || !actionResults[activeActionId]) return null;
    
    const action = availableActions.find(a => a.id === activeActionId);
    if (!action) return null;
    
    const componentName = getComponentName(action.id);
    if (!componentName || !componentMap[componentName]) {
      return (
        <Alert severity="warning" sx={{ my: 2 }}>
          No renderer found for action type: {activeActionId}
        </Alert>
      );
    }
    
    const ActionComponent = componentMap[componentName];
    const result = actionResults[activeActionId];
    
    return (
      <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>}>
        <ActionComponent data={result.data} videoInfo={result.videoInfo} />
      </Suspense>
    );
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

  // Get the active actions (ones that have results)
  const activeActions = availableActions.filter(action => actionResults[action.id]);
  
  // Get the action that's currently being processed
  const processingAction = processingActionId ? availableActions.find(a => a.id === processingActionId) : null;

  return (
    <>
      <Head>
        <title>{videoData.title || 'Video'} - YouTube to AI</title>
        <meta name="description" content={videoData.description || 'Video details and AI analysis'} />
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

            {/* AI Analysis section */}
            <Grid item xs={12} md={4}>
              <Card elevation={3}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <AnalyticsIcon sx={{ mr: 1 }} />
                      <Typography variant="h6">
                        AI Analysis
                      </Typography>
                    </Box>
                    
                    {/* Action menu button */}
                    <Tooltip title="Add AI Action">
                      <IconButton
                        onClick={handleActionMenuClick}
                        size="small"
                        disabled={processingActionId !== null}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </Tooltip>
                    
                    {/* Action selection menu */}
                    <Menu
                      anchorEl={anchorEl}
                      open={open}
                      onClose={handleActionMenuClose}
                    >
                      {availableActions
                        .filter(action => !actionResults[action.id])
                        .map((action) => (
                          <MenuItem 
                            key={action.id} 
                            onClick={() => handleActionSelect(action.id)}
                            disabled={processingActionId !== null}
                          >
                            <ListItemIcon>
                              {actionIcons[action.id] || <AnalyticsIcon />}
                            </ListItemIcon>
                            <ListItemText primary={action.name} secondary={action.description} />
                          </MenuItem>
                        ))}
                    </Menu>
                  </Box>
                  
                  {/* Action tabs */}
                  {activeActions.length > 0 ? (
                    <>
                      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                        <Tabs
                          value={activeActionId}
                          onChange={handleActionChange}
                          variant="scrollable"
                          scrollButtons="auto"
                          aria-label="AI action tabs"
                        >
                          {activeActions.map((action) => (
                            <Tab
                              key={action.id}
                              label={action.name}
                              value={action.id}
                              icon={actionIcons[action.id] || <AnalyticsIcon />}
                              iconPosition="start"
                            />
                          ))}
                        </Tabs>
                      </Box>
                      
                      {/* Action result */}
                      {renderActionResult()}
                    </>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                      {processingAction ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <CircularProgress size={40} sx={{ mb: 2 }} />
                          <Typography variant="body1">
                            Processing {processingAction.name}...
                          </Typography>
                        </Box>
                      ) : (
                        <>
                          <Typography variant="body1" sx={{ mb: 2 }}>
                            No AI analysis available for this video yet
                          </Typography>
                          <Button
                            variant="contained"
                            startIcon={<AnalyticsIcon />}
                            onClick={handleActionMenuClick}
                          >
                            Choose AI Action
                          </Button>
                        </>
                      )}
                    </Box>
                  )}
                  
                  {/* Action error */}
                  {actionError && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      {actionError}
                    </Alert>
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
