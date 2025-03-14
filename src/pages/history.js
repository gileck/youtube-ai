import React, { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Paper,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Divider,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    Tooltip,
    Card,
    CardContent,
    Grid
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import YouTubeIcon from '@mui/icons-material/YouTube';
import SubscriptionsIcon from '@mui/icons-material/Subscriptions';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { useSettings } from '../contexts/SettingsContext';

/**
 * History page component that displays a list of summarized videos
 * with the ability to view summaries and delete items
 */
export function History() {
    // State for history items from local storage
    const [historyItems, setHistoryItems] = useState([]);
    // State for the selected summary to view
    const [selectedSummary, setSelectedSummary] = useState(null);
    // State for dialog visibility
    const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
    // State for confirmation dialog
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    
    // Get cache settings from context
    const { cacheEnabled } = useSettings();

    // Custom components for ReactMarkdown (same as in Main.js)
    const MarkdownComponents = {
        // Add proper indentation for lists
        ul: ({node, ...props}) => (
            <ul style={{paddingLeft: '20px', margin: '8px 0'}} {...props} />
        ),
        // Style list items with proper spacing
        li: ({node, ordered, checked, index, ...props}) => {
            // Check if this is a nested list item by examining parent nodes
            const isNested = node.parent && 
                             node.parent.parent && 
                             (node.parent.parent.type === 'listItem');
            
            return (
                <li style={{
                    marginBottom: '4px',
                    paddingLeft: isNested ? '8px' : '0px',
                }} {...props} />
            );
        },
        // Improve paragraph spacing
        p: ({node, ...props}) => {
            // Check if this paragraph is inside a list item
            const isInListItem = node.parent && node.parent.type === 'listItem';
            
            return (
                <p style={{
                    margin: isInListItem ? '4px 0' : '16px 0',
                }} {...props} />
            );
        }
    };

    // Load history items from local storage on component mount
    useEffect(() => {
        loadHistoryItems();
    }, []);

    // Load history items from local storage
    const loadHistoryItems = () => {
        try {
            const storedHistory = localStorage.getItem('youtubeAiHistory');
            if (storedHistory) {
                const parsedHistory = JSON.parse(storedHistory);
                // Sort by date (newest first)
                const sortedHistory = parsedHistory.sort((a, b) => 
                    new Date(b.timestamp) - new Date(a.timestamp)
                );
                setHistoryItems(sortedHistory);
            }
        } catch (error) {
            console.error('Error loading history from local storage:', error);
        }
    };

    // Save history items to local storage
    const saveHistoryItems = (items) => {
        try {
            localStorage.setItem('youtubeAiHistory', JSON.stringify(items));
        } catch (error) {
            console.error('Error saving history to local storage:', error);
        }
    };

    // Handle viewing a summary
    const handleViewSummary = (item) => {
        setSelectedSummary(item);
        setSummaryDialogOpen(true);
    };

    // Handle deleting a history item
    const handleDeleteItem = (item) => {
        setItemToDelete(item);
        setDeleteConfirmOpen(true);
    };

    // Confirm deletion of a history item
    const confirmDeleteItem = () => {
        if (itemToDelete) {
            const updatedItems = historyItems.filter(item => 
                item.videoId !== itemToDelete.videoId
            );
            setHistoryItems(updatedItems);
            saveHistoryItems(updatedItems);
        }
        setDeleteConfirmOpen(false);
        setItemToDelete(null);
    };

    // Format date for display
    const formatDate = (dateString) => {
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    // Get video thumbnail from YouTube
    const getVideoThumbnail = (videoId) => {
        return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    };

    // Get YouTube video URL
    const getYouTubeUrl = (videoId) => {
        return `https://www.youtube.com/watch?v=${videoId}`;
    };

    // Clear all history
    const handleClearAllHistory = () => {
        setHistoryItems([]);
        saveHistoryItems([]);
    };

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
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
                        Summary History
                    </Typography>
                </Box>
                <Box>
                    {historyItems.length > 0 && (
                        <Button 
                            variant="outlined" 
                            color="error" 
                            onClick={() => setDeleteConfirmOpen(true)}
                            sx={{ mr: 2 }}
                        >
                            Clear All
                        </Button>
                    )}
                    <Link href="/Channels" passHref>
                        <Button startIcon={<SubscriptionsIcon />}>
                            Channels
                        </Button>
                    </Link>
                </Box>
            </Box>

            {historyItems.length === 0 ? (
                <Alert severity="info" sx={{ mt: 2 }}>
                    No history items found. Summarize some videos to see them here!
                </Alert>
            ) : (
                <Grid container spacing={2}>
                    {historyItems.map((item) => (
                        <Grid item xs={12} key={item.videoId}>
                            <Card variant="outlined">
                                <CardContent sx={{ p: 2 }}>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={3}>
                                            <Box 
                                                component="img"
                                                src={getVideoThumbnail(item.videoId)}
                                                alt="Video thumbnail"
                                                sx={{ 
                                                    width: '100%', 
                                                    borderRadius: 1,
                                                    cursor: 'pointer'
                                                }}
                                                onClick={() => window.open(getYouTubeUrl(item.videoId), '_blank')}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={9}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
                                                    {item.title || 'YouTube Video'}
                                                </Typography>
                                                <Box>
                                                    <Tooltip title="View Summary">
                                                        <IconButton 
                                                            onClick={() => handleViewSummary(item)}
                                                            color="primary"
                                                        >
                                                            <VisibilityIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Delete from History">
                                                        <IconButton 
                                                            onClick={() => handleDeleteItem(item)}
                                                            color="error"
                                                        >
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            </Box>
                                            {item.channelName && (
                                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                    Channel: {item.channelName}
                                                </Typography>
                                            )}
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                Summarized on {formatDate(item.timestamp)}
                                            </Typography>
                                            {item.publishDate && (
                                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                    Published on {formatDate(item.publishDate)}
                                                </Typography>
                                            )}
                                            <Typography variant="body2">
                                                Cost: {item.cost?.totalCostFormatted || '$0.00'}
                                            </Typography>
                                            <Box sx={{ mt: 1 }}>
                                                <Button
                                                    size="small"
                                                    startIcon={<YouTubeIcon />}
                                                    href={getYouTubeUrl(item.videoId)}
                                                    target="_blank"
                                                >
                                                    Watch on YouTube
                                                </Button>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Summary Dialog */}
            <Dialog
                open={summaryDialogOpen}
                onClose={() => setSummaryDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="h6">
                            Summary
                        </Typography>
                        <Button 
                            startIcon={<YouTubeIcon />}
                            href={selectedSummary ? getYouTubeUrl(selectedSummary.videoId) : '#'}
                            target="_blank"
                            size="small"
                        >
                            Watch on YouTube
                        </Button>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {selectedSummary && (
                        <>
                            <Box sx={{ mb: 2 }}>
                                {selectedSummary.channelName && (
                                    <Typography variant="body2" color="text.secondary">
                                        Channel: {selectedSummary.channelName}
                                    </Typography>
                                )}
                                <Typography variant="body2" color="text.secondary">
                                    Summarized on {formatDate(selectedSummary.timestamp)}
                                </Typography>
                                {selectedSummary.publishDate && (
                                    <Typography variant="body2" color="text.secondary">
                                        Published on {formatDate(selectedSummary.publishDate)}
                                    </Typography>
                                )}
                                <Typography variant="body2" color="text.secondary">
                                    Cost: {selectedSummary.cost?.totalCostFormatted || '$0.00'}
                                </Typography>
                            </Box>
                            <Paper variant="outlined" sx={{ p: 3, bgcolor: '#f9f9f9' }}>
                                <ReactMarkdown components={MarkdownComponents}>
                                    {selectedSummary.summary}
                                </ReactMarkdown>
                            </Paper>
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSummaryDialogOpen(false)}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
            >
                <DialogTitle>
                    {itemToDelete ? 'Delete History Item?' : 'Clear All History?'}
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        {itemToDelete 
                            ? 'Are you sure you want to delete this summary from your history? This action cannot be undone.'
                            : 'Are you sure you want to clear all your summary history? This action cannot be undone.'
                        }
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirmOpen(false)}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={itemToDelete ? confirmDeleteItem : handleClearAllHistory} 
                        color="error"
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}

export default History;
