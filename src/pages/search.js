import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  CardMedia,
  CircularProgress,
  Alert,
  Pagination,
  Chip,
  IconButton,
  Tooltip,
  Divider,
  Paper
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import YouTubeIcon from '@mui/icons-material/YouTube';
import SubscriptionsIcon from '@mui/icons-material/Subscriptions';
import HistoryIcon from '@mui/icons-material/History';
import DeleteIcon from '@mui/icons-material/Delete';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import { apiService } from '../core/services/api-service';

export default function SearchPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('video');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(1);
  const [recentSearches, setRecentSearches] = useState([]);
  const resultsPerPage = 12;
  const MAX_RECENT_SEARCHES = 10;

  // Load recent searches from local storage on component mount
  useEffect(() => {
    loadRecentSearches();
  }, []);

  // Load recent searches from local storage
  const loadRecentSearches = () => {
    try {
      const storedSearches = localStorage.getItem('recentSearches');
      if (storedSearches) {
        setRecentSearches(JSON.parse(storedSearches));
      }
    } catch (error) {
      console.error('Error loading recent searches from local storage:', error);
    }
  };

  // Save recent searches to local storage
  const saveRecentSearches = (searches) => {
    try {
      localStorage.setItem('recentSearches', JSON.stringify(searches));
    } catch (error) {
      console.error('Error saving recent searches to local storage:', error);
    }
  };

  // Add a search to recent searches
  const addToRecentSearches = (query, type) => {
    if (!query.trim()) return;
    
    // Create a new search item with query, type, and timestamp
    const newSearch = {
      id: Date.now(),
      query: query.trim(),
      type,
      timestamp: new Date().toISOString()
    };
    
    // Filter out any existing searches with the same query and type
    const filteredSearches = recentSearches.filter(
      item => !(item.query === newSearch.query && item.type === newSearch.type)
    );
    
    // Add the new search to the beginning of the array and limit to MAX_RECENT_SEARCHES
    const updatedSearches = [newSearch, ...filteredSearches].slice(0, MAX_RECENT_SEARCHES);
    
    // Update state and save to local storage
    setRecentSearches(updatedSearches);
    saveRecentSearches(updatedSearches);
  };

  // Remove a search from recent searches
  const removeFromRecentSearches = (id) => {
    const updatedSearches = recentSearches.filter(item => item.id !== id);
    setRecentSearches(updatedSearches);
    saveRecentSearches(updatedSearches);
  };

  // Clear all recent searches
  const clearAllRecentSearches = () => {
    setRecentSearches([]);
    saveRecentSearches([]);
  };

  // Handle clicking on a recent search
  const handleRecentSearchClick = (search) => {
    setSearchQuery(search.query);
    setSearchType(search.type);
    performSearch(search.query, search.type);
  };

  // Perform search with given query and type
  const performSearch = async (query, type) => {
    if (!query.trim()) {
      setError('Please enter a search term');
      return;
    }

    setIsLoading(true);
    setError('');
    setResults([]);

    try {
      // Use our API service instead of direct fetch calls
      let data;
      if (type === 'video') {
        data = await apiService.searchVideos(query);
      } else {
        data = await apiService.searchChannels(query);
      }
      
      setResults(data.items || []);
      setPage(1);
      
      // Add to recent searches
      addToRecentSearches(query, type);
    } catch (error) {
      console.error('Search error:', error);
      setError(error.message || 'Failed to search. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form submission
  const handleSearch = async (e) => {
    e.preventDefault();
    performSearch(searchQuery, searchType);
  };

  // Handle pagination
  const handlePageChange = (event, value) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Calculate pagination
  const totalPages = Math.ceil(results.length / resultsPerPage);
  const displayedResults = results.slice(
    (page - 1) * resultsPerPage,
    page * resultsPerPage
  );

  // Navigate to video or channel page
  const handleResultClick = (id) => {
    router.push(`/${searchType}/${id}`);
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <Head>
        <title>Search - YouTube to AI</title>
        <meta name="description" content="Search for YouTube videos and channels" />
      </Head>

      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Search YouTube
          </Typography>

          {/* Search Form */}
          <Box component="form" onSubmit={handleSearch} sx={{ mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={7}>
                <TextField
                  fullWidth
                  label="Search"
                  variant="outlined"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter video title, channel name, or ID"
                />
              </Grid>
              <Grid item xs={12} sm={3} md={3}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel id="search-type-label">Search Type</InputLabel>
                  <Select
                    labelId="search-type-label"
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value)}
                    label="Search Type"
                  >
                    <MenuItem value="video">Videos</MenuItem>
                    <MenuItem value="channel">Channels</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3} md={2}>
                <Button
                  fullWidth
                  type="submit"
                  variant="contained"
                  startIcon={<SearchIcon />}
                  disabled={isLoading}
                  sx={{ height: '56px' }}
                >
                  {isLoading ? <CircularProgress size={24} /> : 'Search'}
                </Button>
              </Grid>
            </Grid>
          </Box>

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <Paper 
              variant="outlined" 
              sx={{ 
                p: 2, 
                mb: 4, 
                backgroundColor: 'rgba(0, 0, 0, 0.02)',
                borderRadius: 1
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <HistoryIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="subtitle1">Recent Searches</Typography>
                </Box>
                {recentSearches.length > 1 && (
                  <Tooltip title="Clear all recent searches">
                    <IconButton 
                      size="small" 
                      onClick={clearAllRecentSearches}
                      aria-label="Clear all recent searches"
                    >
                      <ClearAllIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {recentSearches.map((search) => (
                  <Chip
                    key={search.id}
                    label={search.query}
                    onClick={() => handleRecentSearchClick(search)}
                    onDelete={() => removeFromRecentSearches(search.id)}
                    deleteIcon={<DeleteIcon />}
                    variant="outlined"
                    color={search.type === 'video' ? 'primary' : 'secondary'}
                    icon={search.type === 'video' ? <YouTubeIcon /> : <SubscriptionsIcon />}
                    sx={{ mb: 1 }}
                  />
                ))}
              </Box>
            </Paper>
          )}

          {/* Error Message */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Results */}
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {results.length > 0 ? (
                <>
                  <Typography variant="h5" gutterBottom>
                    {results.length} {searchType === 'video' ? 'Videos' : 'Channels'} Found
                  </Typography>
                  
                  <Grid container spacing={3} sx={{ mb: 4 }}>
                    {displayedResults.map((item) => (
                      <Grid item xs={12} sm={6} md={4} key={item.id}>
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
                            onClick={() => handleResultClick(searchType === 'video' ? item.id : item.channelId)}
                          >
                            <CardMedia
                              component="img"
                              height="140"
                              image={item.thumbnails?.medium?.url || '/placeholder-image.jpg'}
                              alt={item.title}
                            />
                            <CardContent>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                {searchType === 'video' ? (
                                  <YouTubeIcon sx={{ color: 'red', mr: 1 }} />
                                ) : (
                                  <SubscriptionsIcon sx={{ color: 'red', mr: 1 }} />
                                )}
                                <Typography variant="subtitle2" color="text.secondary">
                                  {searchType === 'video' ? 'Video' : 'Channel'}
                                </Typography>
                              </Box>
                              <Typography variant="h6" component="h2" gutterBottom noWrap>
                                {item.title}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                              }}>
                                {item.description || 'No description available'}
                              </Typography>
                            </CardContent>
                          </CardActionArea>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                      <Pagination 
                        count={totalPages} 
                        page={page} 
                        onChange={handlePageChange}
                        color="primary"
                        size="large"
                      />
                    </Box>
                  )}
                </>
              ) : (
                searchQuery && !isLoading && (
                  <Box sx={{ textAlign: 'center', my: 8 }}>
                    <SearchIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6">
                      No {searchType === 'video' ? 'videos' : 'channels'} found for "{searchQuery}"
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      Try a different search term or search type
                    </Typography>
                  </Box>
                )
              )}
            </>
          )}
        </Box>
      </Container>
    </>
  );
}
