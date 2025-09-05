import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Box,
  Alert,
  Snackbar
} from '@mui/material';
import { cookiesAPI } from '../services/api';
import type { CookieBundle, Cookie } from '../types';

const SUPPORTED_WEBSITES = ['chatgpt.com', 'bard.google.com', 'claude.ai'];

const CookieManager: React.FC = () => {
  const [cookieBundles, setCookieBundles] = useState<CookieBundle[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedWebsite, setSelectedWebsite] = useState('');
  const [cookieData, setCookieData] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCookieBundles();
  }, []);

  const fetchCookieBundles = async () => {
    try {
      const response = await cookiesAPI.listBundles();
      setCookieBundles(response.data);
    } catch (error) {
      console.error('Error fetching cookie bundles:', error);
      setError('Failed to fetch cookie bundles');
    }
  };

  const handleAddCookie = async () => {
    try {
      // Parse the cookieData string into Cookie objects
      let cookies: Cookie[];
      try {
        cookies = JSON.parse(cookieData);
        if (!Array.isArray(cookies)) {
          throw new Error('Cookie data must be an array');
        }
      } catch (e) {
        setError('Invalid cookie data format. Must be a JSON array of cookies.');
        return;
      }

      // Insert the cookies and track the insertion
      await cookiesAPI.insertCookies(selectedWebsite, cookies);
      await cookiesAPI.trackInsertion(selectedWebsite, true);
      
      setOpen(false);
      setSelectedWebsite('');
      setCookieData('');
      fetchCookieBundles();
    } catch (error) {
      console.error('Error adding cookies:', error);
      setError('Failed to add cookies');
      // Track failed insertion
      try {
        await cookiesAPI.trackInsertion(selectedWebsite, false);
      } catch (e) {
        console.error('Failed to track cookie insertion:', e);
      }
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Cookie Manager</Typography>
        <Button variant="contained" color="primary" onClick={() => setOpen(true)}>
          Add New Cookies
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Upload Date</TableCell>
              <TableCell>Cookie Count</TableCell>
              <TableCell>Uploaded By</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cookieBundles.map((bundle) => (
              <TableRow key={bundle.id}>
                <TableCell>
                  {new Date(bundle.uploadedAt).toLocaleString()}
                </TableCell>
                <TableCell>{bundle.cookies.length}</TableCell>
                <TableCell>{bundle.uploadedBy}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add New Cookies</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            label="Website"
            value={selectedWebsite}
            onChange={(e) => setSelectedWebsite(e.target.value)}
            margin="normal"
          >
            {SUPPORTED_WEBSITES.map((website) => (
              <MenuItem key={website} value={website}>
                {website}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            label="Cookie Data (JSON Array)"
            multiline
            rows={8}
            value={cookieData}
            onChange={(e) => setCookieData(e.target.value)}
            margin="normal"
            helperText="Enter a JSON array of cookie objects with properties: name, value, domain, path, secure, httpOnly, sameSite, expirationDate"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleAddCookie} variant="contained" color="primary">
            Add Cookies
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setError(null)} severity="error">
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default CookieManager;
