import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Switch,
  Alert,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import {
  People as PeopleIcon,
  Add as AddIcon,
  AdminPanelSettings as AdminIcon,
  Person as UserIcon,
  Lock as LockIcon,
  Schedule as ScheduleIcon,
  Web as WebIcon,
  MoreVert as MoreIcon
} from '@mui/icons-material';
import { userAPI } from '../services/api';
import axios from 'axios';

interface User {
  _id: string;
  username: string;
  isAdmin: boolean;
  isActive: boolean;
  expiryDate?: string;
  loginCount: number;
  lastLogin?: string;
  createdAt: string;
  websitePermissions?: Array<{
    website: string;
    hasAccess: boolean;
    lastAccessed?: string;
    approvedBy?: string;
  }>;
}

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [expiryDialogOpen, setExpiryDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({ username: '', password: '' });
  const [newPassword, setNewPassword] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [websiteDialogOpen, setWebsiteDialogOpen] = useState(false);
  const [userWebsites, setUserWebsites] = useState<string[]>([]);
  const [availableWebsites, setAvailableWebsites] = useState<string[]>([]);

  useEffect(() => {
    fetchUsers();
    fetchAvailableWebsites();
  }, []);

  const fetchAvailableWebsites = async () => {
    try {
      const response = await userAPI.getAdminUsers();
      const allWebsites = new Set<string>();
      
      response.data.forEach((user: any) => {
        if (user.websitePermissions) {
          user.websitePermissions.forEach((perm: any) => {
            allWebsites.add(perm.website);
          });
        }
      });
      
      setAvailableWebsites(Array.from(allWebsites));
    } catch (error) {
      console.error('Error fetching available websites:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await userAPI.getAdminUsers();
      setUsers(response.data);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      setMessage({ type: 'error', text: 'Failed to load users' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      await userAPI.updateUserStatus(userId, !isActive);
      setMessage({ 
        type: 'success', 
        text: `User ${!isActive ? 'activated' : 'deactivated'} successfully` 
      });
      fetchUsers();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update user status' });
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.password) {
      setMessage({ type: 'error', text: 'Username and password are required' });
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/auth/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          username: newUser.username,
          password: newUser.password
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      
      setMessage({ type: 'success', text: 'User created successfully' });
      setCreateDialogOpen(false);
      setNewUser({ username: '', password: '' });
      fetchUsers();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to create user' });
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    try {
      await userAPI.changeUserPassword(selectedUser!._id, newPassword);
      setMessage({ type: 'success', text: 'Password changed successfully' });
      setPasswordDialogOpen(false);
      setNewPassword('');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to change password' });
    }
  };

  const handleSetExpiry = async () => {
    try {
      await userAPI.setUserExpiry(selectedUser!._id, expiryDate || null);
      setMessage({ type: 'success', text: expiryDate ? 'Expiry date set successfully' : 'Expiry date removed successfully' });
      setExpiryDialogOpen(false);
      setExpiryDate('');
      fetchUsers();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to set expiry date' });
    }
  };

  const isUserExpired = (user: User) => {
    return user.expiryDate && new Date() > new Date(user.expiryDate);
  };

  const getUserStatus = (user: User) => {
    if (!user.isActive) return { label: 'Inactive', color: 'error' as const };
    if (isUserExpired(user)) return { label: 'Expired', color: 'warning' as const };
    return { label: 'Active', color: 'success' as const };
  };

  const handleManageWebsites = (user: User) => {
    setSelectedUser(user);
    // Get user's current websites
    const currentWebsites = user.websitePermissions?.filter(p => p.hasAccess).map(p => p.website) || [];
    setUserWebsites(currentWebsites);
    setWebsiteDialogOpen(true);
  };

  const handleWebsiteToggle = (website: string) => {
    setUserWebsites(prev => 
      prev.includes(website) 
        ? prev.filter(w => w !== website)
        : [...prev, website]
    );
  };

  const handleSaveWebsites = async () => {
    if (!selectedUser) return;

    try {
      const permissions = availableWebsites.map(website => ({
        website,
        hasAccess: userWebsites.includes(website),
        lastAccessed: new Date().toISOString(),
        approvedBy: 'Admin'
      }));

      await userAPI.updateUserWebsitePermissions(selectedUser._id, permissions);
      setMessage({ type: 'success', text: 'Website permissions updated successfully' });
      setWebsiteDialogOpen(false);
      fetchUsers();
      fetchAvailableWebsites();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update permissions' });
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PeopleIcon color="primary" />
            User Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage system users and their permissions
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create User
        </Button>
      </Box>

      {message && (
        <Alert 
          severity={message.type} 
          sx={{ mb: 3 }}
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      <Paper elevation={2} sx={{ borderRadius: 3 }}>
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            All Users ({users.length})
          </Typography>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Username</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Expiry Date</TableCell>
                  <TableCell>Login Count</TableCell>
                  <TableCell>Last Login</TableCell>
                  <TableCell>Websites</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="text.secondary">
                        No users found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user._id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {user.isAdmin ? <AdminIcon color="primary" /> : <UserIcon />}
                          {user.username}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={user.isAdmin ? 'Admin' : 'User'} 
                          color={user.isAdmin ? 'primary' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={getUserStatus(user).label}
                          color={getUserStatus(user).color}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {user.expiryDate 
                          ? new Date(user.expiryDate).toLocaleDateString()
                          : 'No expiry'
                        }
                      </TableCell>
                      <TableCell>{user.loginCount || 0}</TableCell>
                      <TableCell>
                        {user.lastLogin 
                          ? new Date(user.lastLogin).toLocaleDateString()
                          : 'Never'
                        }
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {user.websitePermissions?.filter(p => p.hasAccess).slice(0, 2).map((perm, idx) => (
                            <Chip key={idx} label={perm.website} size="small" variant="outlined" />
                          ))}
                          {user.websitePermissions?.filter(p => p.hasAccess).length > 2 && (
                            <Chip label={`+${user.websitePermissions.filter(p => p.hasAccess).length - 2}`} size="small" />
                          )}
                          {(!user.websitePermissions || user.websitePermissions.filter(p => p.hasAccess).length === 0) && (
                            <Chip label="None" size="small" color="error" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Switch
                            checked={user.isActive}
                            onChange={() => handleToggleUserStatus(user._id, user.isActive)}
                            color="primary"
                            size="small"
                          />
                          <IconButton 
                            size="small" 
                            onClick={() => { setSelectedUser(user); setPasswordDialogOpen(true); }}
                            title="Change Password"
                          >
                            <LockIcon />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={() => { 
                              setSelectedUser(user); 
                              setExpiryDate(user.expiryDate ? user.expiryDate.split('T')[0] : '');
                              setExpiryDialogOpen(true); 
                            }}
                            title="Set Expiry Date"
                          >
                            <ScheduleIcon />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={() => handleManageWebsites(user)}
                            title="Manage Websites"
                          >
                            <WebIcon />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Paper>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New User</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Username"
              value={newUser.username}
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
            />
            <TextField
              fullWidth
              type="password"
              label="Password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreateUser} variant="contained">
            Create User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Change Password - {selectedUser?.username}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            type="password"
            label="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleChangePassword} variant="contained">
            Change Password
          </Button>
        </DialogActions>
      </Dialog>

      {/* Set Expiry Date Dialog */}
      <Dialog open={expiryDialogOpen} onClose={() => setExpiryDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Set Expiry Date - {selectedUser?.username}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            type="date"
            label="Expiry Date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ mt: 1 }}
            helperText="Leave empty to remove expiry date"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExpiryDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSetExpiry} variant="contained">
            Set Expiry
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manage Websites Dialog */}
      <Dialog open={websiteDialogOpen} onClose={() => setWebsiteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Manage Websites - {selectedUser?.username}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select which websites this user can access:
          </Typography>
          {availableWebsites.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">
                No websites found. Users need to add websites in Settings first.
              </Typography>
            </Box>
          ) : (
            <List>
              {availableWebsites.map((website) => (
                <ListItem key={website} dense>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={userWebsites.includes(website)}
                        onChange={() => handleWebsiteToggle(website)}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2">{website}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Cookie insertion access
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWebsiteDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveWebsites} 
            variant="contained"
            disabled={availableWebsites.length === 0}
          >
            Save Permissions
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Users;