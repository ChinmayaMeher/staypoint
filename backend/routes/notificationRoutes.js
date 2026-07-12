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

// PATCH /notifications/:id/read - Mark single notification as read
router.patch('/:id/read', isLoggedIn, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
