const express = require('express');
const router = express.Router();
const Notification = require('../models/notification');

// Middleware to check if user is logged in
const isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.flash('error', 'You must be signed in first!');
    return res.redirect('/login');
  }
  next();
};

// GET /notifications - List all notifications for the current user
router.get('/', isLoggedIn, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .populate('sender', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(50); // Get latest 50
      
    res.render('users/notifications', { notifications });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    req.flash('error', 'Failed to load notifications.');
    res.redirect('/');
  }
});

module.exports = router;
