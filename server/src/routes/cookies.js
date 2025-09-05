import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { CookieBundle } from '../models/CookieBundle.js';
import { User } from '../models/User.js';

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
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get active cookies for users
cookiesRouter.get('/get', authMiddleware, async (req, res) => {
  try {
    const { website } = req.query;
    
    // If website is specified, check access permissions
    if (website) {
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: 'User not found',
          cookies: [] 
        });
      }

      // Admin users have access to all websites
      if (!user.isAdmin) {
        const permission = user.websitePermissions.find(p => p.website === website);
        if (!permission || !permission.hasAccess) {
          return res.status(403).json({ 
            success: false,
            message: 'Access denied to this website. Please request access from an administrator.',
            cookies: [] 
          });
        }
        
        // Update last accessed time
        permission.lastAccessed = new Date();
        await user.save();
      }
    }

    const bundle = await CookieBundle.findOne().sort({ uploadedAt: -1 });
    if (!bundle) {
      return res.json({ 
        success: false,
        message: 'No cookies available',
        cookies: [] 
      });
    }

    // Filter cookies by website if specified
    let cookies = bundle.cookies || [];
    if (website) {
      cookies = cookies.filter(cookie => 
        cookie.domain === website || 
        cookie.domain === `.${website}` ||
        cookie.domain.endsWith(`.${website}`)
      );
    }

    res.json({ 
      success: true,
      cookies,
      message: 'Cookies retrieved successfully' 
    });
  } catch (error) {
    console.error('Error fetching cookies:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      cookies: [] 
    });
  }
});

// Insert cookies with website access check
cookiesRouter.post('/insert', authMiddleware, async (req, res) => {
  try {
    const { website, cookies } = req.body;
    if (!website || !cookies) {
      return res.status(400).json({ message: 'Website and cookies are required' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check website access permission
    if (!user.isAdmin) {
      const permission = user.websitePermissions.find(p => p.website === website);
      if (!permission || !permission.hasAccess) {
        return res.status(403).json({ 
          message: 'Access denied to this website. Please request access from an administrator.' 
        });
      }
      
      // Update last accessed time
      permission.lastAccessed = new Date();
    }

    // Track cookie insertion
    user.cookieInsertions.push({
      website,
      timestamp: new Date(),
      success: true
    });
    await user.save();

    res.json({ message: 'Cookies inserted successfully' });
  } catch (error) {
    console.error('Insert cookies error:', error);
    
    // Track failed insertion
    try {
      const user = await User.findById(req.user.userId);
      if (user) {
        user.cookieInsertions.push({
          website: req.body.website,
          timestamp: new Date(),
          success: false
        });
        await user.save();
      }
    } catch (trackError) {
      console.error('Error tracking failed insertion:', trackError);
    }
    
    res.status(500).json({ message: 'Server error inserting cookies' });
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
    console.error('List bundles error:', error);
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
    console.error('Get bundle error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload cookies for specific website
cookiesRouter.post('/website-upload', authMiddleware, async (req, res) => {
  try {
    const { website, cookies } = req.body;
    if (!website || !cookies || !Array.isArray(cookies)) {
      return res.status(400).json({ message: 'Website and cookies are required' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has permission for this website
    const permission = user.websitePermissions.find(p => p.website === website);
    if (!permission && !user.isAdmin) {
      return res.status(403).json({ message: 'No permission for this website' });
    }

    // Create or update cookie bundle for this website
    const bundle = await CookieBundle.create({
      cookies: cookies.map(cookie => ({ ...cookie, domain: website })),
      uploadedBy: req.user.userId,
      uploadedAt: new Date(),
      website
    });

    res.json({ message: 'Cookies uploaded successfully for ' + website, bundleId: bundle._id });
  } catch (error) {
    console.error('Website cookie upload error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});



