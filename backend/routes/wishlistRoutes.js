const express = require("express");
const router = express.Router();
const Wishlist = require("../models/wishlist");
const Listing = require("../models/listing");
const { isLoggedIn } = require("../middleware/auth");
const { verifyCSRF } = require("../middleware/security");

// GET all wishlist items for current user
router.get("/", isLoggedIn, async (req, res) => {
  try {
    const wishlistItems = await Wishlist.find({ user: req.user._id })
      .populate("listing")
      .sort({ createdAt: -1 });

    res.render("wishlist/index.ejs", { wishlistItems });
  } catch (err) {
    console.error("Error fetching wishlist:", err);
    req.flash("error", "Failed to load wishlist");
    res.redirect("/listings");
  }
});

// ADD item to wishlist (AJAX endpoint)
router.post("/add", isLoggedIn, verifyCSRF, async (req, res) => {
  try {
    const { listingId } = req.body;

    if (!listingId) {
      return res.status(400).json({ success: false, message: "Listing ID is required" });
    }

    // Check if listing exists
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }

    // Check if already in wishlist
    const existing = await Wishlist.findOne({
      user: req.user._id,
      listing: listingId,
    });

    if (existing) {
      return res.status(400).json({ success: false, message: "Already in wishlist" });
    }

    // Add to wishlist
    const wishlistItem = await Wishlist.create({
      user: req.user._id,
      listing: listingId,
    });

    await wishlistItem.populate("listing");

    res.json({
      success: true,
      message: "Added to wishlist",
      item: wishlistItem,
    });
  } catch (err) {
    console.error("Error adding to wishlist:", err);
    res.status(500).json({ success: false, message: "Failed to add to wishlist" });
  }
});

// REMOVE item from wishlist (AJAX endpoint)
router.post("/remove", isLoggedIn, verifyCSRF, async (req, res) => {
  try {
    const { listingId } = req.body;

    if (!listingId) {
      return res.status(400).json({ success: false, message: "Listing ID is required" });
    }

    const result = await Wishlist.deleteOne({
      user: req.user._id,
      listing: listingId,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "Item not found in wishlist" });
    }

    res.json({
      success: true,
      message: "Removed from wishlist",
    });
  } catch (err) {
    console.error("Error removing from wishlist:", err);
    res.status(500).json({ success: false, message: "Failed to remove from wishlist" });
  }
});

// TOGGLE wishlist item (AJAX endpoint)
router.post("/toggle", isLoggedIn, verifyCSRF, async (req, res) => {
  try {
    const { listingId } = req.body;

    if (!listingId) {
      return res.status(400).json({ success: false, message: "Listing ID is required" });
    }

    // Check if listing exists
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }

    // Check if already in wishlist
    const existing = await Wishlist.findOne({
      user: req.user._id,
      listing: listingId,
    });

    if (existing) {
      // Remove from wishlist
      await Wishlist.deleteOne({
        user: req.user._id,
        listing: listingId,
      });
      return res.json({
        success: true,
        message: "Removed from wishlist",
        inWishlist: false,
      });
    } else {
      // Add to wishlist
      const wishlistItem = await Wishlist.create({
        user: req.user._id,
        listing: listingId,
      });
      return res.json({
        success: true,
        message: "Added to wishlist",
        inWishlist: true,
        itemId: wishlistItem._id,
      });
    }
  } catch (err) {
    console.error("Error toggling wishlist:", err);
    res.status(500).json({ success: false, message: "Failed to toggle wishlist" });
  }
});

// CHECK if listing is in wishlist (AJAX endpoint)
router.get("/check/:listingId", isLoggedIn, async (req, res) => {
  try {
    const { listingId } = req.params;

    const wishlistItem = await Wishlist.findOne({
      user: req.user._id,
      listing: listingId,
    });

    res.json({
      success: true,
      inWishlist: !!wishlistItem,
    });
  } catch (err) {
    console.error("Error checking wishlist:", err);
    res.status(500).json({ success: false, message: "Failed to check wishlist" });
  }
});

// DELETE item from wishlist
router.delete("/:id", isLoggedIn, async (req, res) => {
  try {
    const wishlistItem = await Wishlist.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!wishlistItem) {
      req.flash("error", "Item not found in wishlist");
      return res.redirect("/wishlist");
    }

    req.flash("success", "Removed from wishlist");
    res.redirect("/wishlist");
  } catch (err) {
    console.error("Error deleting from wishlist:", err);
    req.flash("error", "Failed to remove from wishlist");
    res.redirect("/wishlist");
  }
});

module.exports = router;