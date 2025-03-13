import React, { useState, useEffect, useCallback } from 'react';
import axios from '../core/utils/axios-interceptors';
import {
    Box,
    Container,
    Typography,
    TextField,
    Button,
    Paper,
    Grid,
    Card,
    CardContent,
    CardMedia,
    CardActions,
    Chip,
    Avatar,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    IconButton,
    Tooltip,
    CircularProgress,
    Alert,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    ToggleButtonGroup,
    ToggleButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Divider
} from '@mui/material';
import YouTubeIcon from '@mui/icons-material/YouTube';
import SummarizeIcon from '@mui/icons-material/Summarize';
import HistoryIcon from '@mui/icons-material/History';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SortIcon from '@mui/icons-material/Sort';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CachedIcon from '@mui/icons-material/Cached';
import DeleteIcon from '@mui/icons-material/Delete';
import CancelIcon from '@mui/icons-material/Cancel';
import Link from 'next/link';
import { useRouter } from 'next/router';
import MarkdownRenderer from '../components/MarkdownRenderer';
import config from '../config';
import debounce from '../core/utils/debounce';
import clientApiTracker from '../core/utils/client-api-tracker';

// API base URL
const API_URL = '/api';

// Cache TTL (24 hours in milliseconds)
const CACHE_TTL = 24 * 60 * 60 * 1000;

// Maximum cache size
const MAX_CACHE_SIZE = 50;

// Check if cache is valid
function isCacheValid(cacheEntry) {
    return cacheEntry && 
           cacheEntry.timestamp && 
           (Date.now() - cacheEntry.timestamp < CACHE_TTL);
}

/**
 * Channels page component that allows users to search for YouTube channels
 * and view their videos with options to summarize them
 */
export function Channels() {
    const router = useRouter();
    
    // Channel search and info states
    const [channelId, setChannelId] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState('');
    const [channelInfo, setChannelInfo] = useState(null);
    const [videos, setVideos] = useState([]);
    const [nextPageToken, setNextPageToken] = useState('');
    const [summarizing, setSummarizing] = useState(null);
    const [sortBy, setSortBy] = useState('date');
    const [minDuration, setMinDuration] = useState(0);
    const [recentChannels, setRecentChannels] = useState([]);
    
    // Summary modal states
    const [summaryModalOpen, setSummaryModalOpen] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [summary, setSummary] = useState('');
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryError, setSummaryError] = useState('');
    
    // Cost approval states
    const [costApprovalDialogOpen, setCostApprovalDialogOpen] = useState(false);
    const [costEstimate, setCostEstimate] = useState(null);
    const [estimating, setEstimating] = useState(false);
    const [actualCost, setActualCost] = useState(null);
    
    // Selected model and currency
    const [selectedModel, setSelectedModel] = useState(config.ai.model);
    const [selectedCurrency, setSelectedCurrency] = useState(config.currency.default);
    
    // Client-side cache for channel data
    const [channelCache, setChannelCache] = useState({
        search: new Map(),
        info: new Map(),
        videos: new Map()
    });

    // Load recent channels and user preferences from local storage on component mount
    useEffect(() => {
        loadRecentChannels();
        loadUserPreferences();
    }, []);

    // Load recent channels from local storage
    const loadRecentChannels = () => {
        try {
            const storedChannels = localStorage.getItem('youtubeAiRecentChannels');
            if (storedChannels) {
                setRecentChannels(JSON.parse(storedChannels));
            }
        } catch (error) {
            console.error('Error loading recent channels from local storage:', error);
        }
    };

    // Load user preferences from local storage
    const loadUserPreferences = () => {
        try {
            const storedPreferences = localStorage.getItem('youtubeAiChannelPreferences');
            if (storedPreferences) {
                const preferences = JSON.parse(storedPreferences);
                if (preferences.sortBy) setSortBy(preferences.sortBy);
                if (preferences.minDuration !== undefined) setMinDuration(preferences.minDuration);
            }
        } catch (error) {
            console.error('Error loading user preferences from local storage:', error);
        }
    };

    // Save user preferences to local storage
    const saveUserPreferences = () => {
        try {
            const preferences = {
                sortBy,
                minDuration
            };
            localStorage.setItem('youtubeAiChannelPreferences', JSON.stringify(preferences));
        } catch (error) {
            console.error('Error saving user preferences to local storage:', error);
        }
    };

    // Save recent channels to local storage
    const saveRecentChannels = (channels) => {
        try {
            localStorage.setItem('youtubeAiRecentChannels', JSON.stringify(channels));
        } catch (error) {
            console.error('Error saving recent channels to local storage:', error);
        }
    };

    // Add channel to recent channels
    const addToRecentChannels = (channel) => {
        // Create a new array to avoid mutating state directly
        const updatedChannels = [...recentChannels];
        
        // Check if channel already exists
        const existingIndex = updatedChannels.findIndex(c => c.id === channel.id);
        
        // If it exists, remove it (we'll add it to the front)
        if (existingIndex !== -1) {
            updatedChannels.splice(existingIndex, 1);
        }
        
        // Add the channel to the front of the array
        updatedChannels.unshift(channel);
        
        // Keep only the 5 most recent channels
        const limitedChannels = updatedChannels.slice(0, 5);
        
        // Update state and save to local storage
        setRecentChannels(limitedChannels);
        saveRecentChannels(limitedChannels);
    };

    // Handle channel search
    const handleSearchChannel = useCallback(async () => {
        if (!channelId.trim()) {
            setError('Please enter a channel ID or handle');
            return;
        }

        setLoading(true);
        setError('');
        setChannelInfo(null);
        setVideos([]);
        setNextPageToken('');
        setSummarizing(null);

        try {
            // Check if input is a handle or username (starts with @)
            const isHandle = channelId.trim().startsWith('@');
            const isUsername = !channelId.trim().startsWith('UC') && !isHandle;
            
            let actualChannelId = channelId.trim();
            let channelData = null;
            
            // If it's a handle or username, we need to handle it differently
            if (isHandle || isUsername) {
                // Check cache first
                const cacheKey = `${isHandle ? 'handle' : 'username'}:${actualChannelId}`;
                const cachedSearch = channelCache.search.get(cacheKey);
                
                if (isCacheValid(cachedSearch)) {
                    console.log('Using cached channel search result for:', cacheKey);
                    actualChannelId = cachedSearch.data.channelId;
                    channelData = cachedSearch.data;
                } else {
                    try {
                        // For handles (@username), try to fetch from custom endpoint
                        const searchResponse = await axios.get(`${API_URL}/channel/search`, {
                            params: { 
                                q: actualChannelId,
                                type: isHandle ? 'handle' : 'username'
                            }
                        });
                        
                        // Update client-side API usage tracking
                        clientApiTracker.updateApiUsageFromResponse(searchResponse, 'search');
                        
                        if (searchResponse.data && searchResponse.data.channelId) {
                            actualChannelId = searchResponse.data.channelId;
                            // If we got basic channel info from search, store it
                            channelData = searchResponse.data;
                            
                            // Cache the search result
                            channelCache.search.set(cacheKey, {
                                data: channelData,
                                timestamp: Date.now()
                            });
                        } else {
                            throw new Error('Channel not found');
                        }
                    } catch (searchError) {
                        console.error('Error searching for channel:', searchError);
                        
                        // If it's a 404, show a specific message
                        if (searchError.response && searchError.response.status === 404) {
                            setError(`Channel not found: ${actualChannelId}. Please check the spelling and try again.`);
                        } 
                        // Handle rate limiting (429 Too Many Requests)
                        else if (searchError.response && searchError.response.status === 429) {
                            setError(
                                `YouTube API quota exceeded. The daily limit for API requests has been reached. ` +
                                `Please try again later or tomorrow when the quota resets.`
                            );
                        } else {
                            // Otherwise show a general error
                            setError(
                                `Error finding channel: ${searchError.response?.data?.error || searchError.message}. ` +
                                `Try using a channel ID starting with "UC" instead.`
                            );
                        }
                        setLoading(false);
                        return;
                    }
                }
            }

            // Check if we already have channel info in cache
            const channelInfoCacheKey = `channel:${actualChannelId}`;
            const cachedChannelInfo = channelCache.info.get(channelInfoCacheKey);
            
            // If we already have channel data from search, use it
            if (channelData && channelData.title && !isUsername) {
                // For handles, we might already have enough info from the search
                if (isCacheValid(cachedChannelInfo)) {
                    console.log('Using cached channel info for:', actualChannelId);
                    setChannelInfo(cachedChannelInfo.data);
                } else {
                    axios.get(`${API_URL}/channel/info`, {
                        params: { channelId: actualChannelId }
                    }).then(response => {
                        // Update client-side API usage tracking
                        clientApiTracker.updateApiUsageFromResponse(response, 'channelInfo');
                        
                        setChannelInfo(response.data);
                        // Cache the channel info
                        channelCache.info.set(channelInfoCacheKey, {
                            data: response.data,
                            timestamp: Date.now()
                        });
                    }).catch(error => {
                        console.error('Error fetching full channel info:', error);
                        // We already have basic info, so don't show an error
                    });
                }
            } else {
                // Check if we have cached channel info
                if (isCacheValid(cachedChannelInfo)) {
                    console.log('Using cached channel info for:', actualChannelId);
                    setChannelInfo(cachedChannelInfo.data);
                } else {
                    // Fetch channel information
                    const channelResponse = await axios.get(`${API_URL}/channel/info`, {
                        params: { channelId: actualChannelId }
                    });
                    
                    // Update client-side API usage tracking
                    clientApiTracker.updateApiUsageFromResponse(channelResponse, 'channelInfo');
                    
                    setChannelInfo(channelResponse.data);
                    
                    // Cache the channel info
                    channelCache.info.set(channelInfoCacheKey, {
                        data: channelResponse.data,
                        timestamp: Date.now()
                    });
                }
            }

            // Check if we have cached videos
            const videosCacheKey = `videos:${actualChannelId}:${sortBy}:${minDuration}`;
            const cachedVideos = channelCache.videos.get(videosCacheKey);
            
            if (isCacheValid(cachedVideos)) {
                console.log('Using cached videos for:', videosCacheKey);
                setVideos(cachedVideos.data.videos);
                setNextPageToken(cachedVideos.data.nextPageToken);
            } else {
                // Fetch channel videos
                const videosResponse = await axios.get(`${API_URL}/channel/videos`, {
                    params: { 
                        channelId: actualChannelId, 
                        sortBy,
                        minDuration
                    }
                });

                // Update client-side API usage tracking
                clientApiTracker.updateApiUsageFromResponse(videosResponse, 'videos');
                
                setVideos(videosResponse.data.videos);
                setNextPageToken(videosResponse.data.nextPageToken);
                
                // Cache the videos
                channelCache.videos.set(videosCacheKey, {
                    data: {
                        videos: videosResponse.data.videos,
                        nextPageToken: videosResponse.data.nextPageToken
                    },
                    timestamp: Date.now()
                });
            }

            // Add channel to recent channels
            addToRecentChannels({
                id: actualChannelId,
                title: channelInfo?.title || channelData?.title || actualChannelId,
                thumbnail: channelInfo?.thumbnails?.default?.url || 
                          channelData?.thumbnails?.default?.url || 
                          `https://i.ytimg.com/vi/default/default.jpg`
            });
        } catch (error) {
            console.error('Error searching channel:', error);
            
            // Handle different error types
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                const statusCode = error.response.status;
                const errorData = error.response.data;
                
                if (statusCode === 400) {
                    setError('Invalid channel ID. Please enter a valid YouTube channel ID starting with "UC".');
                } else if (statusCode === 404) {
                    setError('Channel not found. Please check the channel ID and try again.');
                } else if (statusCode === 403) {
                    setError('Access denied. This could be due to API quota limits or restrictions.');
                } else if (statusCode === 429) {
                    setError('YouTube API quota exceeded. The daily limit for API requests has been reached. Please try again later or tomorrow when the quota resets.');
                } else if (errorData && errorData.error) {
                    // Use the error message from the API if available
                    setError(`Error: ${errorData.error}`);
                    
                    // If there are more details, add them
                    if (errorData.details && errorData.details.message) {
                        setError(`${errorData.error}: ${errorData.details.message}`);
                    }
                } else {
                    setError(`Server error (${statusCode}). Please try again later.`);
                }
            } else if (error.request) {
                // The request was made but no response was received
                setError('No response from server. Please check your internet connection and try again.');
            } else if (error.message === 'Network Error') {
                setError('Network error. Please check your internet connection and try again.');
            } else {
                // Something happened in setting up the request that triggered an Error
                setError(`An unexpected error occurred: ${error.message}`);
            }
        } finally {
            setLoading(false);
        }
    }, [channelId, sortBy, minDuration]);

    // Handle selecting a recent channel
    const handleSelectRecentChannel = (channel) => {
        setChannelId(channel.id);
        // Trigger search immediately
        setTimeout(() => {
            handleSearchChannel();
        }, 0);
    };

    // Handle changing sort order
    const handleSortChange = useCallback(async (event, newSortBy) => {
        if (sortBy === newSortBy || !channelInfo) return;
        
        setSortBy(newSortBy);
        setLoading(true);
        setVideos([]);
        setNextPageToken('');
        
        try {
            // Check if we have cached videos for this sort order
            const videosCacheKey = `videos:${channelInfo.id}:${newSortBy}:${minDuration}`;
            const cachedVideos = channelCache.videos.get(videosCacheKey);
            
            if (isCacheValid(cachedVideos)) {
                console.log('Using cached videos for sort change:', videosCacheKey);
                setVideos(cachedVideos.data.videos);
                setNextPageToken(cachedVideos.data.nextPageToken);
            } else {
                // Fetch channel videos with new sort order
                const videosResponse = await axios.get(`${API_URL}/channel/videos`, {
                    params: { 
                        channelId: channelInfo.id, 
                        sortBy: newSortBy,
                        minDuration
                    }
                });

                // Update client-side API usage tracking
                clientApiTracker.updateApiUsageFromResponse(videosResponse, 'videos');
                
                setVideos(videosResponse.data.videos);
                setNextPageToken(videosResponse.data.nextPageToken);
                
                // Cache the videos
                channelCache.videos.set(videosCacheKey, {
                    data: {
                        videos: videosResponse.data.videos,
                        nextPageToken: videosResponse.data.nextPageToken
                    },
                    timestamp: Date.now()
                });
            }
            
            // Save preferences to local storage
            saveUserPreferences();
        } catch (error) {
            console.error('Error fetching videos with new sort order:', error);
            if (error.response && error.response.status === 429) {
                setError('YouTube API quota exceeded. The daily limit for API requests has been reached. Please try again later or tomorrow when the quota resets.');
            } else {
                setError('Failed to sort videos');
            }
        } finally {
            setLoading(false);
        }
    }, [channelInfo, minDuration]);

    // Handle changing minimum duration filter
    const handleDurationChange = useCallback(async (event, newMinDuration) => {
        // If null is passed, keep the current value (prevents deselecting all options)
        if (newMinDuration === null) return;
        
        if (minDuration === newMinDuration || !channelInfo) return;
        
        console.log(`Changing duration filter from ${minDuration} to ${newMinDuration} minutes`);
        
        setMinDuration(newMinDuration);
        setLoading(true);
        setVideos([]);
        setNextPageToken('');
        
        try {
            // Check if we have cached videos for this duration filter
            const videosCacheKey = `videos:${channelInfo.id}:${sortBy}:${newMinDuration}`;
            const cachedVideos = channelCache.videos.get(videosCacheKey);
            
            if (isCacheValid(cachedVideos)) {
                console.log('Using cached videos for duration change:', videosCacheKey);
                setVideos(cachedVideos.data.videos);
                setNextPageToken(cachedVideos.data.nextPageToken);
            } else {
                // Fetch channel videos with new duration filter
                const videosResponse = await axios.get(`${API_URL}/channel/videos`, {
                    params: { 
                        channelId: channelInfo.id, 
                        sortBy,
                        minDuration: newMinDuration
                    }
                });

                // Update client-side API usage tracking
                clientApiTracker.updateApiUsageFromResponse(videosResponse, 'videos');
                
                setVideos(videosResponse.data.videos);
                setNextPageToken(videosResponse.data.nextPageToken);
                
                // Cache the videos
                channelCache.videos.set(videosCacheKey, {
                    data: {
                        videos: videosResponse.data.videos,
                        nextPageToken: videosResponse.data.nextPageToken
                    },
                    timestamp: Date.now()
                });
            }
            
            // Save preferences to local storage
            saveUserPreferences();
        } catch (error) {
            console.error('Error fetching videos with new duration filter:', error);
            if (error.response && error.response.status === 429) {
                setError('YouTube API quota exceeded. The daily limit for API requests has been reached. Please try again later or tomorrow when the quota resets.');
            } else {
                setError('Failed to filter videos');
            }
        } finally {
            setLoading(false);
        }
    }, [channelInfo, sortBy]);

    // Handle loading more videos
    const handleLoadMore = useCallback(async () => {
        if (!channelInfo || !nextPageToken || loadingMore) return;
        
        setLoadingMore(true);
        
        try {
            // Fetch more videos
            const videosResponse = await axios.get(`${API_URL}/channel/videos`, {
                params: { 
                    channelId: channelInfo.id, 
                    pageToken: nextPageToken,
                    sortBy,
                    minDuration
                }
            });
            
            // Update client-side API usage tracking
            clientApiTracker.updateApiUsageFromResponse(videosResponse, 'videos');
            
            // Append new videos to existing ones
            setVideos(prev => [...prev, ...videosResponse.data.videos]);
            setNextPageToken(videosResponse.data.nextPageToken);
            
            // If we got no videos after filtering but there's a next page, automatically load more
            if (videosResponse.data.videos.length === 0 && videosResponse.data.nextPageToken) {
                // Set a small delay to avoid UI freezing
                setTimeout(() => {
                    handleLoadMore();
                }, 500);
            }
        } catch (error) {
            console.error('Error loading more videos:', error);
            
            if (error.response && error.response.status === 429) {
                setError('YouTube API quota exceeded. The daily limit for API requests has been reached. Please try again later or tomorrow when the quota resets.');
            } else {
                setError('Failed to load more videos. Please try again later.');
            }
        } finally {
            setLoadingMore(false);
        }
    }, [channelInfo, nextPageToken, sortBy, minDuration, loadingMore]);

    // Clean up cache periodically
    const cleanupCache = useCallback(() => {
        setChannelCache(prevCache => {
            const newCache = {
                search: new Map(prevCache.search),
                info: new Map(prevCache.info),
                videos: new Map(prevCache.videos)
            };
            
            // Clean up search cache
            for (const [key, entry] of newCache.search.entries()) {
                if (!isCacheValid(entry)) {
                    newCache.search.delete(key);
                }
            }
            
            // Clean up info cache
            for (const [key, entry] of newCache.info.entries()) {
                if (!isCacheValid(entry)) {
                    newCache.info.delete(key);
                }
            }
            
            // Clean up videos cache
            for (const [key, entry] of newCache.videos.entries()) {
                if (!isCacheValid(entry)) {
                    newCache.videos.delete(key);
                }
            }
            
            // If search cache is too large, remove oldest entries
            if (newCache.search.size > MAX_CACHE_SIZE) {
                const entries = Array.from(newCache.search.entries());
                entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
                
                // Remove oldest entries
                for (let i = 0; i < entries.length - MAX_CACHE_SIZE; i++) {
                    newCache.search.delete(entries[i][0]);
                }
            }
            
            // Same for info and videos caches
            if (newCache.info.size > MAX_CACHE_SIZE) {
                const entries = Array.from(newCache.info.entries());
                entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
                
                for (let i = 0; i < entries.length - MAX_CACHE_SIZE; i++) {
                    newCache.info.delete(entries[i][0]);
                }
            }
            
            if (newCache.videos.size > MAX_CACHE_SIZE) {
                const entries = Array.from(newCache.videos.entries());
                entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
                
                for (let i = 0; i < entries.length - MAX_CACHE_SIZE; i++) {
                    newCache.videos.delete(entries[i][0]);
                }
            }
            
            return newCache;
        });
    }, []);

    // Run cache cleanup periodically
    useEffect(() => {
        // Clean up cache on component mount
        cleanupCache();
        
        // Set up interval to clean cache every 10 minutes
        const interval = setInterval(cleanupCache, 10 * 60 * 1000);
        
        return () => clearInterval(interval);
    }, [cleanupCache]);

    // Handle summarizing a video
    const handleSummarizeVideo = async (video) => {
        setSummarizing(video.id);
        setSelectedVideo(video);
        setSummaryError('');
        setEstimating(true);
        
        try {
            const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;
            
            // First get a cost estimate
            const response = await axios.post(`${API_URL}/estimate`, {
                youtubeUrl: videoUrl,
                model: selectedModel,
                currency: selectedCurrency,
                skipCache: false
            });

            // Update client-side API usage tracking
            clientApiTracker.updateApiUsageFromResponse(response, 'estimate');
            
            const estimateData = response.data;
            setCostEstimate({
                ...estimateData,
                skipCache: false
            });
            
            // Check if cost approval is needed based on the threshold
            if (estimateData.requiresApproval) {
                setCostApprovalDialogOpen(true);
            } else {
                // If approval not required, proceed directly with summary generation
                generateSummary(video, false);
            }
        } catch (error) {
            console.error('Error estimating cost:', error);
            setSummaryError(error.response?.data?.error || 'Failed to estimate cost');
            setSummarizing(null);
        } finally {
            setEstimating(false);
        }
    };
    
    // Handle cost approval dialog close (cancel)
    const handleCostApprovalCancel = () => {
        setCostApprovalDialogOpen(false);
        setCostEstimate(null);
        setSummarizing(null);
    };

    // Handle cost approval (proceed with summary generation)
    const handleCostApproval = () => {
        setCostApprovalDialogOpen(false);
        generateSummary(selectedVideo, costEstimate?.skipCache);
    };
    
    // Handle fresh summary (skip cache)
    const handleFreshSummary = () => {
        setCostApprovalDialogOpen(false);
        generateSummary(selectedVideo, true);
    };
    
    // Generate summary
    const generateSummary = async (video, skipCache = false) => {
        if (!video) return;
        
        setSummaryLoading(true);
        setSummaryError('');
        
        try {
            const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;
            
            const response = await axios.post(`${API_URL}/summarize`, {
                youtubeUrl: videoUrl,
                model: selectedModel,
                currency: selectedCurrency,
                skipCache: skipCache
            });

            // Update client-side API usage tracking
            clientApiTracker.updateApiUsageFromResponse(response, 'summarize');
            
            setSummary(response.data.summary);
            setActualCost(response.data.cost);
            setSummaryModalOpen(true);
            
            // Save to history
            saveToHistory({
                videoId: response.data.videoId,
                summary: response.data.summary,
                cost: response.data.cost,
                title: response.data.title || video.title,
                channelName: response.data.channelName || channelInfo?.title,
                publishDate: response.data.publishDate || video.publishedAt,
                thumbnails: response.data.thumbnails || video.thumbnails,
                videoUrl: response.data.videoUrl || videoUrl
            });
        } catch (error) {
            console.error('Error generating summary:', error);
            setSummaryError(error.response?.data?.error || 'Failed to generate summary');
        } finally {
            setSummaryLoading(false);
            setSummarizing(null);
        }
    };
    
    // Save summary to history in local storage
    const saveToHistory = (summaryData) => {
        try {
            // Get existing history or initialize empty array
            const existingHistory = localStorage.getItem('youtubeAiHistory');
            const history = existingHistory ? JSON.parse(existingHistory) : [];
            
            // Check if this video is already in history
            const existingIndex = history.findIndex(item => item.videoId === summaryData.videoId);
            
            // Create history item
            const historyItem = {
                videoId: summaryData.videoId,
                summary: summaryData.summary,
                timestamp: new Date().toISOString(),
                cost: summaryData.cost,
                title: summaryData.title || `YouTube Video (${summaryData.videoId})`,
                channelName: summaryData.channelName || '',
                publishDate: summaryData.publishDate || null,
                thumbnails: summaryData.thumbnails || {
                    default: `https://img.youtube.com/vi/${summaryData.videoId}/default.jpg`,
                    medium: `https://img.youtube.com/vi/${summaryData.videoId}/mqdefault.jpg`,
                    high: `https://img.youtube.com/vi/${summaryData.videoId}/hqdefault.jpg`
                },
                videoUrl: summaryData.videoUrl || `https://www.youtube.com/watch?v=${summaryData.videoId}`
            };
            
            // Update or add the item
            if (existingIndex !== -1) {
                // Update existing item
                history[existingIndex] = historyItem;
            } else {
                // Add new item
                history.push(historyItem);
            }
            
            // Save back to local storage
            localStorage.setItem('youtubeAiHistory', JSON.stringify(history));
            
        } catch (error) {
            console.error('Error saving to history:', error);
        }
    };
    
    // Handle close summary modal
    const handleCloseSummaryModal = () => {
        setSummaryModalOpen(false);
        setSummary('');
        setActualCost(null);
        setSelectedVideo(null);
    };

    // Format date for display
    const formatDate = (dateString) => {
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric'
        };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    // Format view count with commas
    const formatViewCount = (count) => {
        return parseInt(count).toLocaleString();
    };

    // Format duration from ISO 8601 format
    const formatDuration = (duration) => {
        try {
            if (!duration) return "0:00";
            
            // Special case handling for common formats
            if (duration === 'PT1H') return "1:00:00";
            if (duration === 'PT1H30M') return "1:30:00";
            if (duration === 'PT2H') return "2:00:00";
            
            // Extract hours, minutes, seconds using individual regex patterns
            let hours = 0;
            let minutes = 0;
            let seconds = 0;
            
            // Extract hours
            const hoursMatch = duration.match(/(\d+)H/);
            if (hoursMatch) {
                hours = parseInt(hoursMatch[1]);
            }
            
            // Extract minutes
            const minutesMatch = duration.match(/(\d+)M/);
            if (minutesMatch) {
                minutes = parseInt(minutesMatch[1]);
            }
            
            // Extract seconds
            const secondsMatch = duration.match(/(\d+)(?:\.\d+)?S/);
            if (secondsMatch) {
                seconds = parseInt(secondsMatch[1]);
            }
            
            // Format as H:MM:SS or MM:SS
            if (hours > 0) {
                return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            } else {
                return `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
        } catch (error) {
            console.error('Error formatting duration:', error, duration);
            return "0:00";
        }
    };

    // Calculate duration in minutes from ISO 8601 format
    const calculateDurationMinutes = (duration) => {
        try {
            if (!duration) return 0;
            
            // Special case handling for common formats
            if (duration === 'PT1H') return 60;
            if (duration === 'PT1H30M') return 90;
            if (duration === 'PT2H') return 120;
            
            // Extract hours, minutes, seconds using individual regex patterns
            let hours = 0;
            let minutes = 0;
            let seconds = 0;
            
            // Extract hours
            const hoursMatch = duration.match(/(\d+)H/);
            if (hoursMatch) {
                hours = parseInt(hoursMatch[1]);
            }
            
            // Extract minutes
            const minutesMatch = duration.match(/(\d+)M/);
            if (minutesMatch) {
                minutes = parseInt(minutesMatch[1]);
            }
            
            // Extract seconds
            const secondsMatch = duration.match(/(\d+)(?:\.\d+)?S/);
            if (secondsMatch) {
                seconds = parseInt(secondsMatch[1]);
            }
            
            return hours * 60 + minutes + (seconds / 60);
        } catch (error) {
            console.error('Error calculating duration minutes:', error, duration);
            return 0;
        }
    };

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            {/* Header with navigation */}
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Link href="/" passHref>
                        <Button 
                            startIcon={<ArrowBackIcon />}
                            sx={{ mr: 2 }}
                        >
                            Back
                        </Button>
                    </Link>
                    <Typography variant="h4" component="h1">
                        YouTube Channels
                    </Typography>
                </Box>
                <Link href="/History" passHref>
                    <Button startIcon={<HistoryIcon />}>
                        History
                    </Button>
                </Link>
            </Box>

            {/* Channel search form */}
            <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
                <Typography variant="h6" gutterBottom>
                    Search for a YouTube Channel
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                    <TextField
                        label="Channel ID or Handle"
                        variant="outlined"
                        fullWidth
                        value={channelId}
                        onChange={(e) => setChannelId(e.target.value)}
                        placeholder="Enter YouTube channel ID or handle"
                        helperText="Examples: UCXuqSBlHAE6Xw-yeJA0Tunw or @LinusTechTips"
                        error={!!error}
                    />
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={debounce(handleSearchChannel, 500)}
                        disabled={loading || !channelId.trim()}
                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <YouTubeIcon />}
                        sx={{ height: 56 }}
                    >
                        Search
                    </Button>
                </Box>

                {/* Error message */}
                {error && (
                    <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {/* Recent channels */}
                {recentChannels.length > 0 && (
                    <Box sx={{ mt: 3 }}>
                        <Typography variant="subtitle1" gutterBottom>
                            Recent Channels
                        </Typography>
                        <List sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1 }}>
                            {recentChannels.map((channel) => (
                                <ListItem 
                                    key={channel.id} 
                                    button 
                                    onClick={() => handleSelectRecentChannel(channel)}
                                    sx={{ 
                                        width: 'auto', 
                                        border: '1px solid #e0e0e0', 
                                        borderRadius: 1,
                                        '&:hover': { backgroundColor: '#f5f5f5' }
                                    }}
                                >
                                    <ListItemAvatar>
                                        <Avatar src={channel.thumbnail} alt={channel.title}>
                                            <YouTubeIcon />
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText primary={channel.title} />
                                </ListItem>
                            ))}
                        </List>
                    </Box>
                )}
            </Paper>

            {/* Channel information */}
            {channelInfo && (
                <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={3} md={2}>
                            <img 
                                src={channelInfo.thumbnails.medium.url} 
                                alt={channelInfo.title}
                                style={{ 
                                    width: '100%', 
                                    borderRadius: '50%',
                                    border: '1px solid #e0e0e0'
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={9} md={10}>
                            <Typography variant="h5" gutterBottom>
                                {channelInfo.title}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                                <Chip 
                                    label={`${parseInt(channelInfo.statistics.subscriberCount).toLocaleString()} subscribers`} 
                                    variant="outlined" 
                                />
                                <Chip 
                                    label={`${parseInt(channelInfo.statistics.videoCount).toLocaleString()} videos`} 
                                    variant="outlined" 
                                />
                                <Chip 
                                    label={`${parseInt(channelInfo.statistics.viewCount).toLocaleString()} views`} 
                                    variant="outlined" 
                                />
                            </Box>
                            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                                {channelInfo.description.length > 300 
                                    ? channelInfo.description.substring(0, 300) + '...' 
                                    : channelInfo.description}
                            </Typography>
                        </Grid>
                    </Grid>
                </Paper>
            )}

            {/* Videos section */}
            {channelInfo && (
                <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h5">
                            Videos
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                            {/* Duration filter */}
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Typography variant="body2" sx={{ mr: 1 }}>
                                    <AccessTimeIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                                    Min Duration:
                                </Typography>
                                <ToggleButtonGroup
                                    value={minDuration}
                                    exclusive
                                    onChange={handleDurationChange}
                                    aria-label="minimum duration filter"
                                    size="small"
                                >
                                    <ToggleButton value={0} aria-label="all durations">
                                        All
                                    </ToggleButton>
                                    <ToggleButton value={5} aria-label="5+ minutes">
                                        5+ min
                                    </ToggleButton>
                                    <ToggleButton value={10} aria-label="10+ minutes">
                                        10+ min
                                    </ToggleButton>
                                    <ToggleButton value={30} aria-label="30+ minutes">
                                        30+ min
                                    </ToggleButton>
                                    <ToggleButton value={60} aria-label="60+ minutes">
                                        60+ min
                                    </ToggleButton>
                                </ToggleButtonGroup>
                            </Box>
                            
                            {/* Sort dropdown */}
                            <FormControl sx={{ minWidth: 150 }}>
                                <InputLabel id="sort-select-label">Sort By</InputLabel>
                                <Select
                                    labelId="sort-select-label"
                                    value={sortBy}
                                    label="Sort By"
                                    onChange={(e) => handleSortChange(e.target.value)}
                                    size="small"
                                >
                                    <MenuItem value="date">Date (Newest)</MenuItem>
                                    <MenuItem value="popularity">Popularity</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                    </Box>

                    {/* Loading indicator */}
                    {loading && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                            <CircularProgress />
                        </Box>
                    )}

                    {/* Videos grid */}
                    {!loading && videos.length > 0 && (
                        <>
                            <Grid container spacing={3}>
                                {videos.map((video) => (
                                    <Grid item xs={12} sm={6} md={4} key={video.id}>
                                        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                            <CardMedia
                                                component="img"
                                                height="140"
                                                image={video.thumbnails.medium.url}
                                                alt={video.title}
                                            />
                                            <CardContent sx={{ flexGrow: 1 }}>
                                                <Typography variant="h6" component="div" sx={{ 
                                                    mb: 1,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    lineHeight: '1.2em',
                                                    height: '2.4em'
                                                }}>
                                                    {video.title}
                                                </Typography>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                    <Typography variant="body2" color="textSecondary">
                                                        {formatDate(video.publishedAt)}
                                                    </Typography>
                                                    <Typography variant="body2" color="textSecondary" sx={{
                                                        fontWeight: calculateDurationMinutes(video.duration) >= 30 ? 'bold' : 'normal',
                                                        color: calculateDurationMinutes(video.duration) >= 60 ? 'primary.main' : 'text.secondary'
                                                    }}>
                                                        {formatDuration(video.duration)}
                                                        {calculateDurationMinutes(video.duration) >= 60 && (
                                                            <span> ({Math.floor(calculateDurationMinutes(video.duration))} min)</span>
                                                        )}
                                                    </Typography>
                                                </Box>
                                                <Typography variant="body2" color="textSecondary">
                                                    {formatViewCount(video.viewCount)} views
                                                </Typography>
                                            </CardContent>
                                            <CardActions>
                                                <Tooltip title="Watch on YouTube">
                                                    <IconButton 
                                                        color="primary"
                                                        href={`https://www.youtube.com/watch?v=${video.id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <YouTubeIcon />
                                                    </IconButton>
                                                </Tooltip>
                                                <Button
                                                    startIcon={summarizing === video.id ? <CircularProgress size={20} /> : <SummarizeIcon />}
                                                    onClick={() => handleSummarizeVideo(video)}
                                                    disabled={summarizing === video.id}
                                                    sx={{ ml: 'auto' }}
                                                >
                                                    Summarize
                                                </Button>
                                            </CardActions>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>

                            {/* Load more button */}
                            {nextPageToken && (
                                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                                    <Button
                                        variant="outlined"
                                        onClick={handleLoadMore}
                                        disabled={loadingMore}
                                        startIcon={loadingMore ? <CircularProgress size={20} /> : <MoreHorizIcon />}
                                    >
                                        Load More
                                    </Button>
                                </Box>
                            )}
                        </>
                    )}

                    {/* No videos message */}
                    {!loading && videos.length === 0 && (
                        <Alert severity="info" sx={{ mt: 2 }}>
                            {minDuration > 0 
                                ? `No videos found with duration of ${minDuration}+ minutes. Try a shorter duration filter or a different channel.` 
                                : 'No videos found for this channel.'}
                        </Alert>
                    )}
                </>
            )}
            
            {/* Cost Approval Dialog */}
            <Dialog
                open={costApprovalDialogOpen}
                onClose={handleCostApprovalCancel}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Approve Cost</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        Please review and approve the estimated cost for generating the summary:
                    </DialogContentText>

                    {costEstimate && (
                        <Box>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="textSecondary">
                                        Model
                                    </Typography>
                                    <Typography variant="body1">{costEstimate.model}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="textSecondary">
                                        Processing Strategy
                                    </Typography>
                                    <Typography variant="body1">{costEstimate.processingStrategy}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="textSecondary">
                                        Input Tokens
                                    </Typography>
                                    <Typography variant="body1">
                                        {costEstimate.inputTokens?.toLocaleString()} ({costEstimate.inputCostFormatted})
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="textSecondary">
                                        Output Tokens (estimated)
                                    </Typography>
                                    <Typography variant="body1">
                                        {costEstimate.outputTokens?.toLocaleString()} ({costEstimate.outputCostFormatted})
                                    </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Divider sx={{ my: 1 }} />
                                    <Typography variant="h6" color="primary">
                                        Total: {costEstimate.totalCostFormatted}
                                    </Typography>
                                    {costEstimate.currency !== 'USD' && costEstimate.exchangeRate && (
                                        <Typography variant="caption" color="text.secondary">
                                            Exchange rate: 1 USD = {costEstimate.exchangeRate} {costEstimate.currency}
                                        </Typography>
                                    )}
                                    {costEstimate.fromCache && costEstimate.cachedAt && (
                                        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                                            Cached at: {new Date(costEstimate.cachedAt).toLocaleString()}
                                        </Typography>
                                    )}
                                </Grid>
                            </Grid>
                        </Box>
                    )}

                    {costEstimate?.fromCache && !costEstimate?.skipCache && (
                        <Alert severity="info" sx={{ mt: 2 }}>
                            This summary is available from cache and will be delivered instantly.
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={handleCostApprovalCancel}
                        startIcon={<CancelIcon />}
                    >
                        Cancel
                    </Button>
                    {costEstimate?.fromCache && (
                        <Button
                            onClick={handleFreshSummary}
                            color="secondary"
                            startIcon={<RefreshIcon />}
                        >
                            Fresh Summary
                        </Button>
                    )}
                    <Button
                        onClick={handleCostApproval}
                        color="primary"
                        variant="contained"
                        startIcon={costEstimate?.fromCache ? <CachedIcon /> : <SummarizeIcon />}
                    >
                        {costEstimate?.fromCache ? "Use Cache" : "Generate Summary"}
                    </Button>
                </DialogActions>
            </Dialog>
            
            {/* Summary Modal */}
            <Dialog
                open={summaryModalOpen}
                onClose={handleCloseSummaryModal}
                maxWidth="md"
                fullWidth
                scroll="paper"
            >
                <DialogTitle>
                    {selectedVideo?.title || 'Video Summary'}
                </DialogTitle>
                <DialogContent dividers>
                    {summaryLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress />
                            <Typography variant="h6" sx={{ ml: 2 }}>
                                Generating Summary...
                            </Typography>
                        </Box>
                    ) : summaryError ? (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {summaryError}
                        </Alert>
                    ) : (
                        <>
                            {/* Summary content */}
                            <Paper variant="outlined" sx={{ p: 3, mb: 3, bgcolor: '#f9f9f9' }}>
                                <MarkdownRenderer content={summary} noPaper={true} />
                            </Paper>
                            
                            {/* Cost details */}
                            {actualCost && (
                                <Card variant="outlined" sx={{ mb: 2 }}>
                                    <CardContent>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                            <Typography variant="h6">Cost Details</Typography>
                                            {actualCost.fromCache && (
                                                <Chip 
                                                    icon={<CachedIcon />} 
                                                    label="From Cache" 
                                                    color="success" 
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            )}
                                        </Box>
                                        <Grid container spacing={2}>
                                            <Grid item xs={12} sm={6}>
                                                <Typography variant="body2" color="textSecondary">
                                                    Model
                                                </Typography>
                                                <Typography variant="body1">{actualCost.modelName || 'Unknown model'}</Typography>
                                            </Grid>
                                            <Grid item xs={12} sm={6}>
                                                <Typography variant="body2" color="textSecondary">
                                                    Processing Time
                                                </Typography>
                                                <Typography variant="body1">{actualCost.processingTime || '0'} seconds</Typography>
                                            </Grid>
                                            <Grid item xs={12} sm={6}>
                                                <Typography variant="body2" color="textSecondary">
                                                    Input Tokens
                                                </Typography>
                                                <Typography variant="body1">
                                                    {actualCost.inputTokens ? actualCost.inputTokens.toLocaleString() : '0'} ({actualCost.inputCostFormatted || '$0.00'})
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={12} sm={6}>
                                                <Typography variant="body2" color="textSecondary">
                                                    Output Tokens
                                                </Typography>
                                                <Typography variant="body1">
                                                    {actualCost.outputTokens ? actualCost.outputTokens.toLocaleString() : '0'} ({actualCost.outputCostFormatted || '$0.00'})
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={12}>
                                                <Divider sx={{ my: 1 }} />
                                                <Typography variant="h6" color="primary">
                                                    Total: {actualCost.totalCostFormatted || '$0.00'}
                                                </Typography>
                                                {actualCost.currency && actualCost.currency !== 'USD' && actualCost.exchangeRate && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        Exchange rate: 1 USD = {actualCost.exchangeRate} {actualCost.currency}
                                                    </Typography>
                                                )}
                                                {actualCost.fromCache && actualCost.cachedAt && (
                                                    <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                                                        Cached at: {new Date(actualCost.cachedAt).toLocaleString()}
                                                    </Typography>
                                                )}
                                            </Grid>
                                        </Grid>
                                    </CardContent>
                                </Card>
                            )}
                            
                            {/* Video details */}
                            {selectedVideo && (
                                <Box sx={{ display: 'flex', mt: 2 }}>
                                    <img 
                                        src={selectedVideo.thumbnails.medium.url} 
                                        alt={selectedVideo.title}
                                        style={{ width: 120, height: 'auto', marginRight: 16 }}
                                    />
                                    <Box>
                                        <Typography variant="subtitle1">
                                            {selectedVideo.title}
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary">
                                            {formatDate(selectedVideo.publishedAt)} • {formatViewCount(selectedVideo.viewCount)} views
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary">
                                            Duration: {formatDuration(selectedVideo.duration)}
                                        </Typography>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            startIcon={<YouTubeIcon />}
                                            href={`https://www.youtube.com/watch?v=${selectedVideo.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            sx={{ mt: 1 }}
                                        >
                                            Watch on YouTube
                                        </Button>
                                    </Box>
                                </Box>
                            )}
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseSummaryModal}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}

export default Channels;
