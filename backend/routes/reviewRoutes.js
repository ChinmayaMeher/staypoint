const express = require("express");
const router = express.Router({ mergeParams: true });
const Listing = require("../models/listing.js");
const Review = require("../models/review.js");

const isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.flash("error", "You must be logged in to leave a review!");
    return res.redirect("/login");
  }
  next();
};

// CREATE review
router.post("/", isLoggedIn, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    const newReview = new Review(req.body.review);
    newReview.author = req.user._id;
    listing.reviews.push(newReview);
    await newReview.save();
    await listing.save();
    req.flash("success", "Review added!");
    res.redirect(`/listings/${req.params.id}`);
  } catch (err) {
    req.flash("error", "Failed to add review.");
    res.redirect(`/listings/${req.params.id}`);
  }
});

// DELETE review
router.delete("/:reviewId", isLoggedIn, async (req, res) => {
  const { id, reviewId } = req.params;
  // Verify the user is the review author
  const review = await Review.findById(reviewId);
  if (!review.author.equals(req.user._id)) {
    req.flash("error", "You can only delete your own reviews!");
    return res.redirect(`/listings/${id}`);
  }
  await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
  await Review.findByIdAndDelete(reviewId);
  req.flash("success", "Review deleted!");
  res.redirect(`/listings/${id}`);
});

module.exports = router;
