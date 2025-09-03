import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { CookieBundle } from '../models/CookieBundle.js';

export const cookiesRouter = express.Router();

// Admin: Upload cookies
cookiesRouter.post('/upload', authMiddleware, async (req, res) => {
  try {
    const { isAdmin } = req.user;
    if (!isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { cookies } = req.body;
    if (!cookies || !Array.isArray(cookies)) {
      return res.status(400).json({ message: 'Invalid cookies data' });
    }

    const bundle = await CookieBundle.create({
      cookies,
      uploadedBy: req.user.userId,
      uploadedAt: new Date()
    });

    res.json({ message: 'Cookies uploaded successfully', bundleId: bundle._id });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get active cookies for users
cookiesRouter.get('/get', authMiddleware, async (req, res) => {
  try {
    const bundle = await CookieBundle.findOne().sort({ uploadedAt: -1 });
    if (!bundle) {
      return res.status(404).json({ message: 'No cookies available' });
    }

    res.json(bundle.cookies);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// List bundles (admin only)
cookiesRouter.get('/', authMiddleware, async (req, res) => {
  try {
    const { isAdmin } = req.user;
    if (!isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const bundles = await CookieBundle.find()
      .sort({ uploadedAt: -1 })
      .select('cookies uploadedAt');
      
    res.json(bundles);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get specific bundle (admin only)
cookiesRouter.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { isAdmin } = req.user;
    if (!isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const bundle = await CookieBundle.findById(req.params.id);
    if (!bundle) {
      return res.status(404).json({ message: 'Bundle not found' });
    }

    res.json(bundle);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});



