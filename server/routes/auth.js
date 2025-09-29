import express from 'express';
import { userDb } from '../database/db.js';
import { generateToken, authenticateToken } from '../middleware/auth.js';
import pamAuth from '../services/pamAuth.js';

const router = express.Router();

// Check auth status and PAM availability
router.get('/status', async (req, res) => {
  try {
    const pamAvailable = await pamAuth.isAvailable();
    res.json({
      needsSetup: false, // No setup needed with PAM authentication
      pamAvailable,
      isAuthenticated: false // Will be overridden by frontend if token exists
    });
  } catch (error) {
    console.error('Auth status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// Get current user (protected route)
router.get('/user', authenticateToken, (req, res) => {
  res.json({
    user: req.user
  });
});

// PAM authentication endpoint
router.post('/pam-login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Check if PAM is available
    const pamAvailable = await pamAuth.isAvailable();
    if (!pamAvailable) {
      return res.status(501).json({ error: 'PAM authentication is not available on this system' });
    }

    // Authenticate using PAM
    const isAuthenticated = await pamAuth.authenticate(username, password);

    if (!isAuthenticated) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Get user info from system
    const userInfo = await pamAuth.getUserInfo(username);

    // Create or get user from database
    let user = userDb.getUserByUsername(username);

    if (!user) {
      // Create new user in database if doesn't exist
      user = userDb.createUser(username);
    }

    // Generate token
    const token = generateToken(user);

    // Update last login
    userDb.updateLastLogin(user.id);

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        userInfo: userInfo
      },
      token
    });

  } catch (error) {
    console.error('PAM login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check PAM availability
router.get('/pam-status', async (req, res) => {
  try {
    const pamAvailable = await pamAuth.isAvailable();
    res.json({
      pamAvailable,
      message: pamAvailable ? 'PAM authentication is available' : 'PAM authentication is not available'
    });
  } catch (error) {
    console.error('PAM status check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout (client-side token removal, but this endpoint can be used for logging)
router.post('/logout', authenticateToken, (req, res) => {
  // In a simple JWT system, logout is mainly client-side
  // This endpoint exists for consistency and potential future logging
  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;