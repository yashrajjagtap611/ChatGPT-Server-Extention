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
  Box,
  CircularProgress
} from '@mui/material';
import { userAPI } from '../services/api';

interface LoginHistory {
  id: string;
  timestamp: string;
  ipAddress: string;
  browser: string;
}

const UserStats: React.FC = () => {
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLoginHistory = async () => {
      try {
        const response = await userAPI.getLoginHistory();
        setLoginHistory(response.data);
      } catch (error) {
        console.error('Error fetching login history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLoginHistory();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        User Activity
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date & Time</TableCell>
              <TableCell>IP Address</TableCell>
              <TableCell>Browser</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loginHistory.map((login) => (
              <TableRow key={login.id}>
                <TableCell>
                  {new Date(login.timestamp).toLocaleString()}
                </TableCell>
                <TableCell>{login.ipAddress}</TableCell>
                <TableCell>{login.browser}</TableCell>
              </TableRow>
            ))}
            {loginHistory.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  No login history available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default UserStats;
