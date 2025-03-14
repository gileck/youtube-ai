import React, { useState } from 'react';
import {
  AppBar as MuiAppBar,
  Toolbar,
  Typography,
  IconButton,
  Badge,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DataUsageIcon from '@mui/icons-material/DataUsage';
import SettingsIcon from '@mui/icons-material/Settings';
import HomeIcon from '@mui/icons-material/Home';
import HistoryIcon from '@mui/icons-material/History';
import SubscriptionsIcon from '@mui/icons-material/Subscriptions';
import BarChartIcon from '@mui/icons-material/BarChart';
import SummarizeIcon from '@mui/icons-material/Summarize'; // Import SummarizeIcon
import SearchIcon from '@mui/icons-material/Search'; // Import SearchIcon
import Link from 'next/link';
import { useSettings } from '../../contexts/SettingsContext';
import ApiUsagePanel from '../usage/ApiUsagePanel';

/**
 * App bar component with navigation menu and API usage info
 */
const AppBar = ({ apiUsageStats }) => {
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [usagePanelOpen, setUsagePanelOpen] = useState(false);
  const { toggleSettings } = useSettings();
  
  // Handle opening menu
  const handleMenuOpen = (event) => {
    setMenuAnchorEl(event.currentTarget);
  };
  
  // Handle closing menu
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  // Handle opening usage panel
  const handleOpenUsagePanel = () => {
    setUsagePanelOpen(true);
  };

  // Handle closing usage panel
  const handleCloseUsagePanel = () => {
    setUsagePanelOpen(false);
  };

  return (
    <>
      <MuiAppBar 
        position="fixed" 
        color="primary" 
        elevation={1}
        sx={{ 
          top: 0,
          backgroundColor: 'background.paper',
          color: 'text.primary',
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Toolbar>
          {/* Menu Toggle */}
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={handleMenuOpen}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          
          {/* App Title */}
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            YouTube to AI
          </Typography>
          
          {/* Settings Button */}
          <Tooltip title="Settings">
            <IconButton 
              color="inherit" 
              onClick={toggleSettings}
              sx={{ mr: 1 }}
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>
          
          {/* API Usage Button */}
          <Tooltip title="API Usage Statistics">
            <IconButton 
              color="inherit" 
              onClick={handleOpenUsagePanel}
            >
              <Badge 
                color="secondary" 
                variant="dot" 
                invisible={!apiUsageStats || !apiUsageStats.daily || apiUsageStats.daily === 0}
              >
                <DataUsageIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          
          {/* Navigation Menu */}
          <Menu
            id="app-menu"
            anchorEl={menuAnchorEl}
            keepMounted
            open={Boolean(menuAnchorEl)}
            onClose={handleMenuClose}
          >
            <Link href="/" passHref style={{ textDecoration: 'none', color: 'inherit' }}>
              <MenuItem onClick={handleMenuClose}>
                <ListItemIcon>
                  <HomeIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Home" />
              </MenuItem>
            </Link>
            
            <Divider />
            
            <Link href="/summarize" passHref style={{ textDecoration: 'none', color: 'inherit' }}>
              <MenuItem onClick={handleMenuClose}>
                <ListItemIcon>
                  <SummarizeIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Summarize Videos" />
              </MenuItem>
            </Link>
            
            <Link href="/search" passHref style={{ textDecoration: 'none', color: 'inherit' }}>
              <MenuItem onClick={handleMenuClose}>
                <ListItemIcon>
                  <SearchIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Search" />
              </MenuItem>
            </Link>
            
            <Link href="/history" passHref style={{ textDecoration: 'none', color: 'inherit' }}>
              <MenuItem onClick={handleMenuClose}>
                <ListItemIcon>
                  <HistoryIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="History" />
              </MenuItem>
            </Link>
            
            <Link href="/Channels" passHref style={{ textDecoration: 'none', color: 'inherit' }}>
              <MenuItem onClick={handleMenuClose}>
                <ListItemIcon>
                  <SubscriptionsIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Channels" />
              </MenuItem>
            </Link>
            
            <Divider />
            
            <Link href="/usage" passHref style={{ textDecoration: 'none', color: 'inherit' }}>
              <MenuItem onClick={handleMenuClose}>
                <ListItemIcon>
                  <BarChartIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Usage Dashboard" />
              </MenuItem>
            </Link>
            
            <Link href="/api-history" passHref style={{ textDecoration: 'none', color: 'inherit' }}>
              <MenuItem onClick={handleMenuClose} sx={{ pl: 4 }}>
                <ListItemIcon>
                  <HistoryIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="API Call History" />
              </MenuItem>
            </Link>
          </Menu>
        </Toolbar>
      </MuiAppBar>
      
      {/* API Usage Panel */}
      <ApiUsagePanel 
        open={usagePanelOpen} 
        onClose={handleCloseUsagePanel} 
      />
    </>
  );
};

export default AppBar;
