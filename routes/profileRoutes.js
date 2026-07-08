const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Listing = require("../models/listing");
const Booking = require("../models/booking");
const { isLoggedIn, isHost } = require("../middleware/auth");
const { validateUserProfile } = require("../middleware/validation");
const { uploadAvatar, handleMulterError } = require("../middleware/upload");
const { verifyCSRF } = require("../middleware/security");

// GET user profile
router.get("/", isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Get user's listings
    const userLists = await Listing.find({ owner: req.user._id, isActive: true })
      .sort({ createdAt: -1 })
      .limit(6);
    
    // Get user's bookings
    const userBookings = await Booking.find({ 
      $or: [{ guest: req.user._id }, { host: req.user._id }] 
    })
      .populate("listing")
      .sort({ createdAt: -1 })
      .limit(5);

    res.render("profile/index.ejs", { 
      profile: user, 
      listings: userLists,
      bookings: userBookings 
    });
  } catch (err) {
    console.error("Error loading profile:", err);
    req.flash("error", "Failed to load profile");
    res.redirect("/listings");
  }
});

// GET edit profile page
router.get("/edit", isLoggedIn, (req, res) => {
  res.render("profile/edit.ejs", { user: req.user });
});

// UPDATE profile
router.put("/", isLoggedIn, validateUserProfile, verifyCSRF, async (req, res) => {
  try {
    const { firstName, lastName, email, phone, bio, city, country, language, currency } = req.body;
    
    const user = await User.findById(req.user._id);
    
    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email && email !== user.email) {
      // Check if email is already taken
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        req.flash("error", "Email already in use");
        return res.redirect("/profile/edit");
      }
      user.email = email.toLowerCase();
    }
    if (phone) user.phone = phone;
    if (bio) user.bio = bio;
    if (city) user.city = city;
    if (country) user.country = country;
    if (language) user.language = language;
    if (currency) user.currency = currency;
    
    await user.save();
    req.flash("success", "Profile updated successfully!");
    res.redirect("/profile");
  } catch (err) {
    console.error("Error updating profile:", err);
    req.flash("error", "Failed to update profile");
    res.redirect("/profile/edit");
  }
});

// TOGGLE role between guest and host
router.post("/switch-role", isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user.role === 'guest') {
      user.role = 'host';
      await user.save();
      req.flash("success", "Switched to Host mode. You can now list rooms!");
    } else if (user.role === 'host') {
      user.role = 'guest';
      await user.save();
      req.flash("success", "Switched to Guest mode.");
    }
    // redirect back or to listings
    res.redirect(req.get('referer') || "/listings");
  } catch (err) {
    console.error("Error switching role:", err);
    req.flash("error", "Failed to switch profile mode.");
    res.redirect("/listings");
  }
});

// UPLOAD avatar
router.post("/avatar", isLoggedIn, uploadAvatar.single("avatar"), handleMulterError, verifyCSRF, async (req, res) => {
  try {
    if (!req.file) {
      req.flash("error", "No file uploaded");
      return res.redirect("/profile/edit");
    }
    
    const user = await User.findById(req.user._id);
    user.avatar = `/uploads/avatars/${req.file.filename}`;
    await user.save();
    
    req.flash("success", "Avatar updated successfully!");
    res.redirect("/profile");
  } catch (err) {
    console.error("Error updating avatar:", err);
    req.flash("error", "Failed to update avatar");
    res.redirect("/profile/edit");
  }
});

// GET host dashboard
router.get("/host/dashboard", isLoggedIn, isHost, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Get host's listings
    const listings = await Listing.find({ owner: req.user._id })
      .sort({ createdAt: -1 });
    
    // Get bookings for host's listings
    const bookings = await Booking.find({ host: req.user._id })
      .populate("listing")
      .populate("guest", "username fullName avatar")
      .sort({ createdAt: -1 })
      .limit(10);
    
    // Calculate stats
    const totalRevenue = bookings
      .filter(b => b.status === "confirmed" || b.status === "completed")
      .reduce((sum, b) => sum + b.totalPrice, 0);
    
    const pendingBookings = bookings.filter(b => b.status === "pending").length;

    res.render("profile/host-dashboard.ejs", {
      stats: user.stats,
      listings,
      bookings,
      totalRevenue,
      pendingBookings,
    });
  } catch (err) {
    console.error("Error loading host dashboard:", err);
    req.flash("error", "Failed to load dashboard");
    res.redirect("/listings");
  }
});

// GET account settings
router.get("/settings", isLoggedIn, (req, res) => {
  res.render("profile/settings.ejs", { user: req.user });
});

// UPDATE account settings
router.put("/settings", isLoggedIn, verifyCSRF, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (currentPassword && newPassword) {
      const user = await User.findById(req.user._id);
      
      // Verify current password
      const isMatch = await user.authenticate(currentPassword);
      if (!isMatch) {
        req.flash("error", "Current password is incorrect");
        return res.redirect("/profile/settings");
      }
      
      // Set new password
      await user.setPassword(newPassword);
      await user.save();
      
      req.flash("success", "Password updated successfully!");
    }
    
    res.redirect("/profile/settings");
  } catch (err) {
    console.error("Error updating settings:", err);
    req.flash("error", "Failed to update settings");
    res.redirect("/profile/settings");
  }
});

// DELETE account
router.delete("/", isLoggedIn, verifyCSRF, async (req, res) => {
  try {
    // Check if user has active listings or bookings
    const activeListings = await Listing.countDocuments({ owner: req.user._id, isActive: true });
    const activeBookings = await Booking.countDocuments({
      $or: [{ guest: req.user._id }, { host: req.user._id }],
      status: { $in: ["pending", "confirmed"] }
    });
    
    if (activeListings > 0) {
      req.flash("error", "Please deactivate all listings before deleting your account");
      return res.redirect("/profile/settings");
    }
    
    if (activeBookings > 0) {
      req.flash("error", "Please complete or cancel all active bookings before deleting your account");
      return res.redirect("/profile/settings");
    }
    
    // Deactivate all listings
    await Listing.updateMany({ owner: req.user._id }, { isActive: false });
    
    // Delete user account
    await User.findByIdAndDelete(req.user._id);
    
    req.logout(() => {
      req.flash("success", "Account deleted successfully");
      res.redirect("/listings");
    });
  } catch (err) {
    console.error("Error deleting account:", err);
    req.flash("error", "Failed to delete account");
    res.redirect("/profile/settings");
  }
});

module.exports = router;