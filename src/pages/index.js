import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  CardMedia,
  Button,
  Paper,
  Divider
} from '@mui/material';
import SummarizeIcon from '@mui/icons-material/Summarize';
import HistoryIcon from '@mui/icons-material/History';
import SubscriptionsIcon from '@mui/icons-material/Subscriptions';
import BarChartIcon from '@mui/icons-material/BarChart';
import DataUsageIcon from '@mui/icons-material/DataUsage';
import YouTubeIcon from '@mui/icons-material/YouTube';
import SettingsIcon from '@mui/icons-material/Settings';
import SearchIcon from '@mui/icons-material/Search';
import { useSettings } from '../contexts/SettingsContext';

/**
 * Home page with big links to all main features
 */
export default function Home() {
  const { toggleSettings } = useSettings();
  
  // Feature cards data
  const features = [
    {
      title: 'Summarize Videos',
      description: 'Generate AI summaries of YouTube videos',
      icon: <SummarizeIcon sx={{ fontSize: 60 }} />,
      color: '#1976d2',
      link: '/summarize',
      primary: true
    },
    {
      title: 'Search',
      description: 'Search for YouTube videos and channels',
      icon: <SearchIcon sx={{ fontSize: 60 }} />,
      color: '#2196f3',
      link: '/search'
    },
    {
      title: 'Video History',
      description: 'View your previously summarized videos',
      icon: <HistoryIcon sx={{ fontSize: 60 }} />,
      color: '#9c27b0',
      link: '/history'
    },
    {
      title: 'Channels',
      description: 'Manage your favorite YouTube channels',
      icon: <SubscriptionsIcon sx={{ fontSize: 60 }} />,
      color: '#e91e63',
      link: '/Channels'
    },
    {
      title: 'Usage Dashboard',
      description: 'Monitor your YouTube API usage',
      icon: <BarChartIcon sx={{ fontSize: 60 }} />,
      color: '#ff9800',
      link: '/usage'
    },
    {
      title: 'API History',
      description: 'View detailed API call history',
      icon: <DataUsageIcon sx={{ fontSize: 60 }} />,
      color: '#4caf50',
      link: '/api-history'
    },
    {
      title: 'Settings',
      description: 'Configure application settings',
      icon: <SettingsIcon sx={{ fontSize: 60 }} />,
      color: '#607d8b',
      action: toggleSettings
    }
  ];

  return (
    <>
      <Head>
        <title>YouTube to AI - Home</title>
        <meta name="description" content="Generate AI summaries of YouTube videos" />
      </Head>

      <Container maxWidth="lg">
        <Box sx={{ my: 6, textAlign: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
            <YouTubeIcon sx={{ fontSize: 60, color: 'red', mr: 2 }} />
            <Typography variant="h2" component="h1" gutterBottom>
              YouTube to AI
            </Typography>
          </Box>
          <Typography variant="h5" color="text.secondary" paragraph>
            Transform YouTube videos into comprehensive AI-generated summaries
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph sx={{ maxWidth: 700, mx: 'auto' }}>
            Quickly extract key insights from any YouTube video using advanced AI models.
            Save time and get the essential information without watching the entire video.
          </Typography>
          
          <Box sx={{ mt: 4, mb: 8 }}>
            <Link href="/summarize" passHref>
              <Button 
                variant="contained" 
                size="large" 
                startIcon={<SummarizeIcon />}
                sx={{ px: 4, py: 1.5, fontSize: '1.2rem' }}
              >
                Start Summarizing
              </Button>
            </Link>
          </Box>
        </Box>

        <Divider sx={{ mb: 8 }} />

        <Typography variant="h4" component="h2" gutterBottom sx={{ mb: 4 }}>
          Features
        </Typography>

        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              {feature.link ? (
                <Link href={feature.link} passHref style={{ textDecoration: 'none' }}>
                  <Card 
                    elevation={feature.primary ? 6 : 2} 
                    sx={{ 
                      height: '100%',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 8
                      }
                    }}
                  >
                    <CardActionArea sx={{ height: '100%' }}>
                      <Box 
                        sx={{ 
                          p: 3, 
                          display: 'flex', 
                          flexDirection: 'column',
                          alignItems: 'center',
                          textAlign: 'center',
                          height: '100%'
                        }}
                      >
                        <Box 
                          sx={{ 
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 100,
                            height: 100,
                            borderRadius: '50%',
                            backgroundColor: `${feature.color}20`,
                            color: feature.color,
                            mb: 2
                          }}
                        >
                          {feature.icon}
                        </Box>
                        <Typography variant="h5" component="h3" gutterBottom>
                          {feature.title}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                          {feature.description}
                        </Typography>
                      </Box>
                    </CardActionArea>
                  </Card>
                </Link>
              ) : (
                <Card 
                  elevation={2}
                  sx={{ 
                    height: '100%',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 8
                    },
                    cursor: 'pointer'
                  }}
                  onClick={feature.action}
                >
                  <CardActionArea sx={{ height: '100%' }}>
                    <Box 
                      sx={{ 
                        p: 3, 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        height: '100%'
                      }}
                    >
                      <Box 
                        sx={{ 
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 100,
                          height: 100,
                          borderRadius: '50%',
                          backgroundColor: `${feature.color}20`,
                          color: feature.color,
                          mb: 2
                        }}
                      >
                        {feature.icon}
                      </Box>
                      <Typography variant="h5" component="h3" gutterBottom>
                        {feature.title}
                      </Typography>
                      <Typography variant="body1" color="text.secondary">
                        {feature.description}
                      </Typography>
                    </Box>
                  </CardActionArea>
                </Card>
              )}
            </Grid>
          ))}
        </Grid>

        <Box sx={{ mt: 8, mb: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Using default model: google/gemini-1.5-flash • Default currency: ILS
          </Typography>
        </Box>
      </Container>
    </>
  );
}
