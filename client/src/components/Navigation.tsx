import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Avatar,
  Menu,
  MenuItem,
  IconButton,
  Tooltip,
  Badge,
  Chip
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Cookie as CookieIcon,
  BarChart as StatsIcon,
  Settings as SettingsIcon,
  AccountCircle as AccountIcon,
  Logout as LogoutIcon,
  AdminPanelSettings as AdminIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import { authAPI } from '../services/api';

interface NavigationProps {
  userInfo: { username: string; isAdmin: boolean } | null;
}

const Navigation: React.FC<NavigationProps> = ({ userInfo }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    authAPI.logout();
    handleMenuClose();
  };

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
    { label: 'Cookies', path: '/cookies', icon: <CookieIcon /> },
    { label: 'Permissions', path: '/permissions', icon: <SettingsIcon /> },
    { label: 'Statistics', path: '/stats', icon: <StatsIcon /> },
    { label: 'Settings', path: '/settings', icon: <SettingsIcon /> },
    ...(userInfo?.isAdmin ? [
      { label: 'Users', path: '/users', icon: <PeopleIcon /> },
      { label: 'Admin Panel', path: '/admin', icon: <AdminIcon /> }
    ] : []),
  ];

  return (
    <AppBar position="static" elevation={0} sx={{ bgcolor: 'primary.main' }}>
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        {/* Logo and Title */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            ChatGPT Manager
          </Typography>
        </Box>

        {/* Navigation Items */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          {navItems.map((item) => (
            <Button
              key={item.path}
              startIcon={item.icon}
              onClick={() => navigate(item.path)}
              sx={{
                color: 'white',
                bgcolor: isActive(item.path) ? 'rgba(255,255,255,0.1)' : 'transparent',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.2)',
                },
                borderRadius: 2,
                px: 2,
                py: 1,
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>

        {/* User Menu */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {userInfo?.isAdmin && (
            <Chip
              icon={<AdminIcon />}
              label="Admin"
              color="secondary"
              size="small"
              sx={{ color: 'white' }}
            />
          )}
          
          <Tooltip title="Account settings">
            <IconButton
              onClick={handleMenuOpen}
              sx={{ color: 'white' }}
            >
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                badgeContent={
                  <Avatar sx={{ width: 16, height: 16, fontSize: '0.75rem' }}>
                    {userInfo?.username.charAt(0).toUpperCase()}
                  </Avatar>
                }
              >
                <Avatar sx={{ bgcolor: 'secondary.main' }}>
                  <AccountIcon />
                </Avatar>
              </Badge>
            </IconButton>
          </Tooltip>
        </Box>

        {/* User Menu Dropdown */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          PaperProps={{
            sx: {
              mt: 1,
              minWidth: 200,
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            }
          }}
        >
          <MenuItem disabled>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {userInfo?.username}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {userInfo?.isAdmin ? 'Administrator' : 'User'}
              </Typography>
            </Box>
          </MenuItem>
          <MenuItem onClick={() => { navigate('/settings'); handleMenuClose(); }}>
            <SettingsIcon sx={{ mr: 2 }} />
            Settings
          </MenuItem>
          <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
            <LogoutIcon sx={{ mr: 2 }} />
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Navigation;
