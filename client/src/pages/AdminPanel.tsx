import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
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
  CircularProgress
} from '@mui/material';
import {
  AdminPanelSettings as AdminIcon,
  Check as ApproveIcon,
  Close as DenyIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { userAPI } from '../services/api';

interface AccessRequest {
  _id: string;
  website: string;
  reason: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'denied';
  reviewedBy?: string;
  reviewedAt?: string;
  userId: string;
  username: string;
}

const AdminPanel: React.FC = () => {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchAccessRequests();
  }, []);

  const fetchAccessRequests = async () => {
    try {
      const response = await userAPI.getAccessRequests();
      setRequests(response.data);
    } catch (error) {
      console.error('Error fetching access requests:', error);
      setMessage({ type: 'error', text: 'Failed to load access requests' });
    } finally {
      setLoading(false);
    }
  };

  const handleReviewRequest = (request: AccessRequest) => {
    setSelectedRequest(request);
    setDialogOpen(true);
    setReviewNote('');
  };

  const handleApproveRequest = async (approve: boolean) => {
    if (!selectedRequest) return;

    try {
      await userAPI.reviewAccessRequest(selectedRequest._id, approve, reviewNote);
      
      setMessage({ 
        type: 'success', 
        text: `Request ${approve ? 'approved' : 'denied'} successfully` 
      });
      
      setDialogOpen(false);
      fetchAccessRequests();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to process request' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'denied': return 'error';
      default: return 'warning';
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
          <AdminIcon color="primary" />
          Admin Panel
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage user access requests and permissions
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

      <Paper elevation={2} sx={{ borderRadius: 3 }}>
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Website Access Requests
          </Typography>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Website</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Requested</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="text.secondary">
                        No access requests found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((request) => (
                    <TableRow key={request._id}>
                      <TableCell>{request.username}</TableCell>
                      <TableCell>{request.website}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 200 }}>
                          {request.reason}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {new Date(request.requestedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={request.status} 
                          color={getStatusColor(request.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {request.status === 'pending' ? (
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton 
                              size="small" 
                              color="success"
                              onClick={() => handleReviewRequest(request)}
                            >
                              <ApproveIcon />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleReviewRequest(request)}
                            >
                              <DenyIcon />
                            </IconButton>
                          </Box>
                        ) : (
                          <IconButton 
                            size="small"
                            onClick={() => handleReviewRequest(request)}
                          >
                            <ViewIcon />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Paper>

      {/* Review Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Review Access Request
        </DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                User: {selectedRequest.username}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Website: {selectedRequest.website}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Reason: {selectedRequest.reason}
              </Typography>
              
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Review Note (Optional)"
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                sx={{ mt: 2 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          {selectedRequest?.status === 'pending' && (
            <>
              <Button 
                onClick={() => handleApproveRequest(false)} 
                color="error"
                startIcon={<DenyIcon />}
              >
                Deny
              </Button>
              <Button 
                onClick={() => handleApproveRequest(true)} 
                color="success"
                startIcon={<ApproveIcon />}
              >
                Approve
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminPanel;