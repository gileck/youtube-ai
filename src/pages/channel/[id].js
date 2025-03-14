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
  CardActionArea,
  CardMedia,
  CircularProgress,
  Alert,
  Divider,
  Grid,
  Chip,
  Paper,
  Avatar,
  Pagination,
  IconButton,
  Collapse,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Stack,
  FormHelperText
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import YouTubeIcon from '@mui/icons-material/YouTube';
import SubscriptionsIcon from '@mui/icons-material/Subscriptions';
import PersonIcon from '@mui/icons-material/Person';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SortIcon from '@mui/icons-material/Sort';
import FilterListIcon from '@mui/icons-material/FilterList';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { apiService } from '../../core/services/api-service';

export default function ChannelPage() {
  const router = useRouter();
  const { id } = router.query;
  const [channelData, setChannelData] = useState(null);
  const [channelVideos, setChannelVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const videosPerPage = 12;
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  
  // Filtering and sorting state
  const [sortBy, setSortBy] = useState('date');
  const [minDuration, setMinDuration] = useState(0);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const toggleAbout = () => {
    setAboutExpanded(!aboutExpanded);
  };

  const toggleFilters = () => {
    setFiltersExpanded(!filtersExpanded);
  };

  // Load saved filters from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedFilters = localStorage.getItem('youtube_channel_filters');
        if (savedFilters) {
          const { sortBy: savedSortBy, minDuration: savedMinDuration } = JSON.parse(savedFilters);
          if (savedSortBy) setSortBy(savedSortBy);
          if (savedMinDuration !== undefined) setMinDuration(savedMinDuration);
        }
      } catch (error) {
        console.error('Error loading saved filters:', error);
      }
    }
  }, []);

  // Save filters to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('youtube_channel_filters', JSON.stringify({ sortBy, minDuration }));
      } catch (error) {
        console.error('Error saving filters:', error);
      }
    }
  }, [sortBy, minDuration]);

  useEffect(() => {
    // Only fetch data when id is available (after hydration)
    if (!id) return;
    
    const fetchChannelData = async () => {
      setIsLoading(true);
      setError('');
      
      try {
        // Use our API service instead of direct fetch
        const data = await apiService.getChannelInfo(id);
        
        // Extract the first item from the items array
        if (data.items && data.items.length > 0) {
          setChannelData(data.items[0]);
        } else {
          throw new Error('No channel data found');
        }
        
        // Fetch channel videos
        await fetchChannelVideos(id, null, true);
      } catch (err) {
        console.error('Error fetching channel data:', err);
        setError(err.message || 'Failed to fetch channel data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchChannelData();
  }, [id]);

  // Refetch videos when filters change
  useEffect(() => {
    if (id && channelData) {
      fetchChannelVideos(id, null, true);
    }
  }, [sortBy, minDuration]);

  const fetchChannelVideos = async (channelId, pageToken = null, resetVideos = false) => {
    if (resetVideos) {
      setIsLoadingVideos(true);
      setChannelVideos([]);
    } else {
      setIsLoadingMore(true);
    }
    
    try {
      // Create params object for our API service
      const params = {
        channelId,
        sortBy,
        minDuration
      };
      
      if (pageToken) {
        params.pageToken = pageToken;
      }
      
      // Use our API service instead of direct fetch
      const data = await apiService.getChannelVideos(params);
      
      // Update videos
      if (resetVideos) {
        setChannelVideos(data.items || []);
      } else {
        setChannelVideos(prev => [...prev, ...(data.items || [])]);
      }
      
      // Update pagination
      setNextPageToken(data.nextPageToken);
      setHasMore(!!data.nextPageToken);
      
      // Reset to page 1 if we're resetting videos
      if (resetVideos) {
        setPage(1);
      }
    } catch (err) {
      console.error('Error fetching channel videos:', err);
      // We don't set the main error state here to avoid blocking the entire page
      // Just log it and continue
    } finally {
      if (resetVideos) {
        setIsLoadingVideos(false);
      } else {
        setIsLoadingMore(false);
      }
    }
  };

  // Handle load more
  const handleLoadMore = () => {
    if (nextPageToken && !isLoadingMore) {
      fetchChannelVideos(id, nextPageToken, false);
    }
  };

  // Handle filter changes
  const handleSortChange = (event) => {
    setSortBy(event.target.value);
  };

  const handleDurationChange = (event) => {
    setMinDuration(parseInt(event.target.value) || 0);
  };

  // Handle pagination
  const handlePageChange = (event, value) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Calculate pagination
  const totalPages = Math.ceil(channelVideos.length / videosPerPage);
  const displayedVideos = channelVideos.slice(
    (page - 1) * videosPerPage,
    page * videosPerPage
  );

  // Navigate to video page
  const handleVideoClick = (videoId) => {
    router.push(`/video/${videoId}`);
  };

  // Format subscriber count
  const formatSubscriberCount = (count) => {
    if (!count) return 'Unknown subscribers';
    
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M subscribers`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K subscribers`;
    } else {
      return `${count} subscribers`;
    }
  };

  // Format video duration
  const formatDuration = (duration) => {
    if (!duration) return '';
    
    // Parse ISO 8601 duration format (e.g. PT1H30M15S)
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return duration;
    
    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const seconds = match[3] ? parseInt(match[3]) : 0;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
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

  if (!channelData) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Alert severity="warning">
            Channel not found or invalid channel ID
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
        <title>{channelData.title || 'Channel'} - YouTube to AI</title>
        <meta name="description" content={channelData.description || 'Channel details and videos'} />
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

          {/* Channel header */}
          <Box sx={{ mb: 4 }}>
            {channelData.bannerUrl && (
              <Box 
                sx={{ 
                  width: '100%', 
                  height: { xs: '120px', sm: '180px' }, 
                  backgroundImage: `url(${channelData.bannerUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  borderRadius: 1,
                  mb: 3
                }}
              />
            )}

            <Grid container spacing={3} alignItems="center">
              <Grid item>
                <Avatar 
                  src={channelData.thumbnails?.medium?.url || channelData.thumbnails?.default?.url} 
                  alt={channelData.title}
                  sx={{ width: 80, height: 80 }}
                />
              </Grid>
              <Grid item xs>
                <Typography variant="h4" component="h1" gutterBottom>
                  {channelData.title}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                  {channelData.customUrl && (
                    <Chip 
                      icon={<SubscriptionsIcon />} 
                      label={channelData.customUrl} 
                      variant="outlined" 
                    />
                  )}
                  {channelData.statistics?.subscriberCount && (
                    <Chip 
                      icon={<PersonIcon />} 
                      label={formatSubscriberCount(channelData.statistics.subscriberCount)} 
                      variant="outlined" 
                    />
                  )}
                  {channelData.statistics?.videoCount && (
                    <Chip 
                      icon={<VideoLibraryIcon />} 
                      label={`${channelData.statistics.videoCount} videos`} 
                      variant="outlined" 
                    />
                  )}
                </Box>
              </Grid>
            </Grid>
          </Box>

          {/* Channel description */}
          {channelData.description && (
            <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6">
                  About
                </Typography>
                <IconButton onClick={toggleAbout} size="small">
                  {aboutExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>
              <Collapse in={aboutExpanded}>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>
                  {channelData.description}
                </Typography>
              </Collapse>
            </Paper>
          )}

          {/* Channel videos */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center' }}>
                <VideoLibraryIcon sx={{ mr: 1 }} />
                Channel Videos
              </Typography>
              
              <Button 
                startIcon={filtersExpanded ? <ExpandLessIcon /> : <FilterListIcon />}
                onClick={toggleFilters}
                variant="outlined"
                size="small"
              >
                Filters
              </Button>
            </Box>
            
            {/* Filters */}
            <Collapse in={filtersExpanded}>
              <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
                <Grid container spacing={3} alignItems="center">
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth>
                      <InputLabel id="sort-by-label">Sort By</InputLabel>
                      <Select
                        labelId="sort-by-label"
                        value={sortBy}
                        onChange={handleSortChange}
                        label="Sort By"
                      >
                        <MenuItem value="date">Date (Newest First)</MenuItem>
                        <MenuItem value="popularity">Popularity (Most Views)</MenuItem>
                      </Select>
                      <FormHelperText>Sort videos by date or popularity</FormHelperText>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth>
                      <InputLabel id="min-duration-label">Minimum Duration</InputLabel>
                      <Select
                        labelId="min-duration-label"
                        value={minDuration.toString()}
                        onChange={handleDurationChange}
                        label="Minimum Duration"
                      >
                        <MenuItem value="0">Any Length</MenuItem>
                        <MenuItem value="5">At least 5 minutes</MenuItem>
                        <MenuItem value="10">At least 10 minutes</MenuItem>
                        <MenuItem value="20">At least 20 minutes</MenuItem>
                        <MenuItem value="30">At least 30 minutes</MenuItem>
                        <MenuItem value="60">At least 1 hour</MenuItem>
                      </Select>
                      <FormHelperText>Filter by video length</FormHelperText>
                    </FormControl>
                  </Grid>
                </Grid>
              </Paper>
            </Collapse>

            {isLoadingVideos ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                <CircularProgress />
              </Box>
            ) : channelVideos.length > 0 ? (
              <>
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  {displayedVideos.map((video) => (
                    <Grid item xs={12} sm={6} md={4} key={video.id}>
                      <Card 
                        elevation={2}
                        sx={{ 
                          height: '100%',
                          transition: 'transform 0.2s, box-shadow 0.2s',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: 8
                          }
                        }}
                      >
                        <CardActionArea 
                          sx={{ height: '100%' }}
                          onClick={() => handleVideoClick(video.id)}
                        >
                          <Box sx={{ position: 'relative' }}>
                            <CardMedia
                              component="img"
                              height="140"
                              image={video.thumbnails?.medium?.url || '/placeholder-image.jpg'}
                              alt={video.title}
                            />
                            {video.duration && (
                              <Chip
                                label={formatDuration(video.duration)}
                                size="small"
                                sx={{
                                  position: 'absolute',
                                  bottom: 8,
                                  right: 8,
                                  bgcolor: 'rgba(0, 0, 0, 0.7)',
                                  color: 'white',
                                  '& .MuiChip-label': {
                                    px: 1,
                                  }
                                }}
                              />
                            )}
                          </Box>
                          <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <YouTubeIcon sx={{ color: 'red', mr: 1 }} />
                              <Typography variant="subtitle2" color="text.secondary">
                                {new Date(video.publishedAt).toLocaleDateString()}
                              </Typography>
                              {video.viewCount > 0 && (
                                <Typography variant="subtitle2" color="text.secondary" sx={{ ml: 'auto' }}>
                                  {video.viewCount.toLocaleString()} views
                                </Typography>
                              )}
                            </Box>
                            <Typography variant="h6" component="h2" gutterBottom noWrap>
                              {video.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                            }}>
                              {video.description || 'No description available'}
                            </Typography>
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <Pagination 
                      count={totalPages} 
                      page={page} 
                      onChange={handlePageChange}
                      color="primary"
                      size="large"
                    />
                  )}
                  
                  {/* Load More Button */}
                  {hasMore && (
                    <Button 
                      variant="outlined" 
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      startIcon={isLoadingMore ? <CircularProgress size={20} /> : null}
                    >
                      {isLoadingMore ? 'Loading...' : 'Load More Videos'}
                    </Button>
                  )}
                </Box>
              </>
            ) : (
              <Box sx={{ textAlign: 'center', my: 4 }}>
                <Typography variant="body1">
                  No videos found for this channel
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Container>
    </>
  );
}
