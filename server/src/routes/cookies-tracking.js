// Track cookie insertion
cookiesRouter.post('/track', authMiddleware, async (req, res) => {
  try {
    const { website, success } = req.body;
    if (!website || typeof success !== 'boolean') {
      return res.status(400).json({ message: 'Invalid tracking data' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.cookieInsertions.push({
      website,
      timestamp: new Date(),
      success
    });
    await user.save();

    res.json({ message: 'Cookie insertion tracked successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Insert cookies for a specific website
cookiesRouter.post('/insert', authMiddleware, async (req, res) => {
  try {
    const { website, cookies } = req.body;
    if (!website || !cookies || !Array.isArray(cookies)) {
      return res.status(400).json({ message: 'Invalid cookie data' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has permission for this website
    const permission = user.websitePermissions.find(p => p.website === website);
    if (!permission || !permission.hasAccess) {
      return res.status(403).json({ message: 'No permission for this website' });
    }

    // Update last accessed timestamp
    permission.lastAccessed = new Date();
    await user.save();

    // Create a new cookie bundle for this insertion
    const bundle = await CookieBundle.create({
      cookies,
      uploadedBy: user._id,
      uploadedAt: new Date()
    });

    res.json({ message: 'Cookies inserted successfully', bundleId: bundle._id });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});
