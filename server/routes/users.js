import { Router } from 'express';
import { User } from '../models/User.js';
import { CookieBundle } from '../models/CookieBundle.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Get user statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    const cookies = await CookieBundle.find({ userId });

    const stats = {
      loginCount: user.loginCount || 0,
      lastLogin: user.lastLogin,
      cookiesInserted: cookies.length,
      websitesAccessed: new Set(cookies.map(c => c.website)).size
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user statistics' });
  }
});

// Get login history
router.get('/login-history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    res.json(user.loginHistory || []);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching login history' });
  }
});

// Update user permissions
router.put('/permissions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { website, hasAccess } = req.body;

    await User.findByIdAndUpdate(userId, {
      $set: { [`websitePermissions.${website}`]: hasAccess }
    });

    res.json({ message: 'Permissions updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating permissions' });
  }
});

export default router;
