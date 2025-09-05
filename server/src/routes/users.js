import express from 'express';
import bcrypt from 'bcryptjs';
import { authMiddleware } from '../middleware/auth.js';
import { User } from '../models/User.js';

export const usersRouter = express.Router();

// Get user statistics
usersRouter.get('/stats', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const stats = {
      loginCount: user.loginCount || 0,
      lastLogin: user.lastLogin,
      totalCookieInsertions: user.cookieInsertions ? user.cookieInsertions.length : 0,
      successfulInsertions: user.cookieInsertions ? user.cookieInsertions.filter(i => i.success).length : 0
    };

    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get login history
usersRouter.get('/login-history', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user.loginHistory || []);
  } catch (error) {
    console.error('Get login history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get cookie insertions history
usersRouter.get('/cookie-insertions', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user.cookieInsertions || []);
  } catch (error) {
    console.error('Get cookie insertions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get website permissions
usersRouter.get('/website-permissions', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user.websitePermissions || []);
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update website permissions (admin only)
usersRouter.put('/permissions', authMiddleware, async (req, res) => {
  try {
    const { permissions, targetUserId } = req.body;
    if (!permissions || !Array.isArray(permissions)) {
      return res.status(400).json({ message: 'Invalid permissions data' });
    }

    // Only admins can update permissions for other users
    const userId = targetUserId && req.user.isAdmin ? targetUserId : req.user.userId;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.websitePermissions = permissions.map(p => ({
      ...p,
      lastAccessed: p.lastAccessed || new Date(),
      approvedBy: req.user.isAdmin ? req.user.username : undefined
    }));
    await user.save();

    res.json({ message: 'Permissions updated successfully' });
  } catch (error) {
    console.error('Update permissions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check website access
usersRouter.get('/check-access/:website', authMiddleware, async (req, res) => {
  try {
    const { website } = req.params;
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Admin users have access to all websites
    if (user.isAdmin) {
      return res.json({ hasAccess: true, message: 'Admin access granted' });
    }

    const permission = user.websitePermissions.find(p => p.website === website);
    const hasAccess = permission && permission.hasAccess;

    res.json({ 
      hasAccess,
      message: hasAccess ? 'Access granted' : 'Access denied. Please request access from an administrator.'
    });
  } catch (error) {
    console.error('Check access error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Request website access
usersRouter.post('/request-access', authMiddleware, async (req, res) => {
  try {
    const { website, reason } = req.body;
    if (!website) {
      return res.status(400).json({ message: 'Website is required' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if request already exists
    const existingRequest = user.accessRequests.find(r => r.website === website && r.status === 'pending');
    if (existingRequest) {
      return res.status(400).json({ message: 'Access request already pending for this website' });
    }

    user.accessRequests.push({
      website,
      reason: reason || 'No reason provided',
      requestedAt: new Date(),
      status: 'pending'
    });
    await user.save();

    res.json({ message: 'Access request submitted successfully' });
  } catch (error) {
    console.error('Request access error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update session timeout
usersRouter.put('/session-timeout', authMiddleware, async (req, res) => {
  try {
    const { timeout } = req.body;
    if (!timeout || timeout < 5 || timeout > 480) {
      return res.status(400).json({ message: 'Timeout must be between 5 and 480 minutes' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.sessionTimeout = timeout;
    await user.save();

    res.json({ message: 'Session timeout updated successfully' });
  } catch (error) {
    console.error('Update session timeout error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Get all access requests
usersRouter.get('/access-requests', authMiddleware, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const users = await User.find(
      { 'accessRequests.0': { $exists: true } },
      { username: 1, accessRequests: 1 }
    );

    const allRequests = [];
    users.forEach(user => {
      user.accessRequests.forEach(request => {
        allRequests.push({
          ...request.toObject(),
          userId: user._id,
          username: user.username
        });
      });
    });

    // Sort by request date, newest first
    allRequests.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());

    res.json(allRequests);
  } catch (error) {
    console.error('Get access requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Review access request
usersRouter.put('/access-requests/:requestId', authMiddleware, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { requestId } = req.params;
    const { approved, note } = req.body;

    const user = await User.findOne({ 'accessRequests._id': requestId });
    if (!user) {
      return res.status(404).json({ message: 'Access request not found' });
    }

    const request = user.accessRequests.id(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Access request not found' });
    }

    // Update request status
    request.status = approved ? 'approved' : 'denied';
    request.reviewedBy = req.user.username;
    request.reviewedAt = new Date();

    // If approved, add/update website permission
    if (approved) {
      const existingPermission = user.websitePermissions.find(p => p.website === request.website);
      if (existingPermission) {
        existingPermission.hasAccess = true;
        existingPermission.approvedBy = req.user.username;
      } else {
        user.websitePermissions.push({
          website: request.website,
          hasAccess: true,
          lastAccessed: new Date(),
          approvedBy: req.user.username
        });
      }
    }

    await user.save();

    res.json({ 
      message: `Access request ${approved ? 'approved' : 'denied'} successfully`,
      request: request.toObject()
    });
  } catch (error) {
    console.error('Review access request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Get user management data
usersRouter.get('/admin/users', authMiddleware, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const users = await User.find({}, {
      username: 1,
      isAdmin: 1,
      isActive: 1,
      expiryDate: 1,
      loginCount: 1,
      lastLogin: 1,
      sessionTimeout: 1,
      websitePermissions: 1,
      accessRequests: 1,
      createdAt: 1
    }).sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Update user status
usersRouter.put('/admin/users/:userId/status', authMiddleware, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { userId } = req.params;
    const { isActive } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isActive = isActive;
    await user.save();

    res.json({ 
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user: { username: user.username, isActive: user.isActive }
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Change user password
usersRouter.put('/admin/users/:userId/password', authMiddleware, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { userId } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    user.passwordHash = passwordHash;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Set user expiry date
usersRouter.put('/admin/users/:userId/expiry', authMiddleware, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { userId } = req.params;
    const { expiryDate } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.expiryDate = expiryDate ? new Date(expiryDate) : null;
    await user.save();

    res.json({ 
      message: expiryDate ? 'Expiry date set successfully' : 'Expiry date removed successfully'
    });
  } catch (error) {
    console.error('Update expiry date error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add website permission
usersRouter.post('/website-permission', authMiddleware, async (req, res) => {
  try {
    const { website } = req.body;
    if (!website) {
      return res.status(400).json({ message: 'Website is required' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const existingPermission = user.websitePermissions.find(p => p.website === website);
    if (existingPermission) {
      return res.status(400).json({ message: 'Website permission already exists' });
    }

    user.websitePermissions.push({
      website,
      hasAccess: true,
      lastAccessed: new Date()
    });
    await user.save();

    res.json({ message: 'Website permission added successfully' });
  } catch (error) {
    console.error('Add website permission error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove website permission
usersRouter.delete('/website-permission/:website', authMiddleware, async (req, res) => {
  try {
    const { website } = req.params;
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.websitePermissions = user.websitePermissions.filter(p => p.website !== website);
    await user.save();

    res.json({ message: 'Website permission removed successfully' });
  } catch (error) {
    console.error('Remove website permission error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Update user website permissions
usersRouter.put('/admin/users/:userId/websites', authMiddleware, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { userId } = req.params;
    const { permissions } = req.body;

    if (!permissions || !Array.isArray(permissions)) {
      return res.status(400).json({ message: 'Invalid permissions data' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.websitePermissions = permissions.map(p => ({
      website: p.website,
      hasAccess: p.hasAccess,
      lastAccessed: p.lastAccessed ? new Date(p.lastAccessed) : new Date(),
      approvedBy: p.approvedBy || req.user.username
    }));
    
    await user.save();

    res.json({ message: 'Website permissions updated successfully' });
  } catch (error) {
    console.error('Update user website permissions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
