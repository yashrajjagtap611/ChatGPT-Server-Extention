import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import {
  Security as SecurityIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
  CloudUpload as CloudUploadIcon,
  Web as WebIcon
} from '@mui/icons-material';
import { userAPI } from '../services/api';
import { WebsitePermission, Cookie } from '../types';

const WebsitePermissions: React.FC = () => {
  const [permissions, setPermissions] = useState<WebsitePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [newWebsite, setNewWebsite] = useState('');
  const [selectedWebsite, setSelectedWebsite] = useState('');
  const [cookieFile, setCookieFile] = useState<File | null>(null);
  const [cookieData, setCookieData] = useState<Cookie[]>([]);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      const response = await userAPI.getWebsitePermissions();
      setPermissions(response.data);
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Failed to load permissions' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddWebsite = async () => {
    if (!newWebsite.trim()) {
      setMessage({ type: 'error', text: 'Website URL is required' });
      return;
    }

    try {
      await userAPI.addWebsitePermission(newWebsite.trim());
      setMessage({ type: 'success', text: 'Website added successfully' });
      setAddDialogOpen(false);
      setNewWebsite('');
      fetchPermissions();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to add website' });
    }
  };

  const handleRemoveWebsite = async (website: string) => {
    try {
      await userAPI.removeWebsitePermission(website);
      setMessage({ type: 'success', text: 'Website removed successfully' });
      fetchPermissions();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to remove website' });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCookieFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result as string;
        const cookies = JSON.parse(result);
        
        // Validate that it's an array
        if (Array.isArray(cookies)) {
          setCookieData(cookies);
          setMessage({ type: 'success', text: `Loaded ${cookies.length} cookies` });
        } else {
          throw new Error('Cookie file must contain an array');
        }
      } catch (error) {
        setMessage({ type: 'error', text: 'Invalid cookie file format. Must be valid JSON array.' });
        setCookieData([]);
      }
    };
    reader.readAsText(file);
  };

  const handleUploadCookies = async () => {
    if (!selectedWebsite || !cookieData.length) {
      setMessage({ type: 'error', text: 'Please select website and upload valid cookies' });
      return;
    }

    try {
      await userAPI.uploadWebsiteCookies(selectedWebsite, cookieData);
      setMessage({ type: 'success', text: 'Cookies uploaded successfully' });
      setUploadDialogOpen(false);
      setCookieFile(null);
      setCookieData([]);
      setSelectedWebsite('');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to upload cookies' });
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
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SecurityIcon color="primary" />
          Website Access Permissions
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Control which websites can access your cookie data and preferences
        </Typography>
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

      <Grid container spacing={3}>
        {/* Quick Actions */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setAddDialogOpen(true)}
                >
                  Add Website
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<UploadIcon />}
                  onClick={() => setUploadDialogOpen(true)}
                >
                  Upload Cookies
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Permissions Table */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ borderRadius: 3 }}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Allowed Websites ({permissions.length})
              </Typography>
              
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Website</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Last Accessed</TableCell>
                      <TableCell>Approved By</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {permissions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          <Typography color="text.secondary">
                            No website permissions found
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      permissions.map((permission, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <WebIcon color="primary" />
                              {permission.website}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={permission.hasAccess ? 'Allowed' : 'Denied'} 
                              color={permission.hasAccess ? 'success' : 'error'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {permission.lastAccessed 
                              ? new Date(permission.lastAccessed).toLocaleDateString()
                              : 'Never'
                            }
                          </TableCell>
                          <TableCell>{permission.approvedBy || 'System'}</TableCell>
                          <TableCell>
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleRemoveWebsite(permission.website)}
                              title="Remove Website"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Add Website Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Website Permission</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Website URL"
            placeholder="e.g., chatgpt.com or openai.com"
            value={newWebsite}
            onChange={(e) => setNewWebsite(e.target.value)}
            sx={{ mt: 1 }}
            helperText="Enter the domain name without http:// or https://"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddWebsite} variant="contained">
            Add Website
          </Button>
        </DialogActions>
      </Dialog>

      {/* Upload Cookies Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => {
        setUploadDialogOpen(false);
        setCookieFile(null);
        setCookieData([]);
        setSelectedWebsite('');
      }} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Cookies for Website</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              select
              fullWidth
              label="Select Website"
              value={selectedWebsite}
              onChange={(e) => setSelectedWebsite(e.target.value)}
              SelectProps={{ native: true }}
            >
              <option value="">Choose a website...</option>
              {permissions.map((permission, index) => (
                <option key={index} value={permission.website}>
                  {permission.website}
                </option>
              ))}
            </TextField>
            
            <Box>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                id="cookie-upload"
              />
              <label htmlFor="cookie-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<CloudUploadIcon />}
                  fullWidth
                >
                  {cookieFile ? cookieFile.name : 'Choose Cookie File (.json)'}
                </Button>
              </label>
            </Box>
            
            {cookieData.length > 0 && (
              <Alert severity="info">
                Found {cookieData.length} cookies in the uploaded file
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setUploadDialogOpen(false);
            setCookieFile(null);
            setCookieData([]);
            setSelectedWebsite('');
          }}>
            Cancel
          </Button>
          <Button 
            onClick={handleUploadCookies} 
            variant="contained"
            disabled={!selectedWebsite || cookieData.length === 0}
          >
            Upload Cookies
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default WebsitePermissions;