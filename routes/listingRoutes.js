const express = require("express");
const router = express.Router();
const Listing = require("../models/listing.js");

// Middleware to check if user is logged in
const isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.flash("error", "You must be logged in to do that!");
    return res.redirect("/login");
  }
  next();
};

// Middleware to check listing ownership
const isOwner = async (req, res, next) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing.owner || !listing.owner.equals(req.user._id)) {
    req.flash("error", "You don't have permission to do that!");
    return res.redirect(`/listings/${id}`);
  }
  next();
};

// INDEX - show all listings
router.get("/", async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = {};
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
        { country: { $regex: search, $options: "i" } },
      ];
    }
    const allListing = await Listing.find(query).populate("owner");
    res.render("listings/index.ejs", { allListing, category, search });
  } catch (err) {
    console.log(err);
    res.status(500).send("Error loading listings");
  }
});

// NEW - show form
router.get("/new", isLoggedIn, (req, res) => {
  res.render("listings/new.ejs");
});

// SHOW - show one listing
router.get("/:id", async (req, res) => {
  try {
    let { id } = req.params;
    const listing = await Listing.findById(id)
      .populate({ path: "reviews", populate: { path: "author" } })
      .populate("owner");
    if (!listing) {
      req.flash("error", "Listing not found!");
      return res.redirect("/listings");
    }
    res.render("listings/show.ejs", { listing });
  } catch (err) {
    req.flash("error", "Listing not found!");
    res.redirect("/listings");
  }
});

// CREATE
router.post("/", isLoggedIn, async (req, res) => {
  try {
    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;
    // Handle amenities (comes as comma-separated string)
    if (req.body.listing.amenities) {
      newListing.amenities = req.body.listing.amenities
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
    }
    await newListing.save();
    req.flash("success", "New listing created successfully!");
    res.redirect("/listings");
  } catch (err) {
    console.log(err);
    req.flash("error", "Failed to create listing.");
    res.redirect("/listings/new");
  }
});

// EDIT
router.get("/:id/edit", isLoggedIn, isOwner, async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  res.render("listings/edit.ejs", { listing });
});

// UPDATE
router.put("/:id", isLoggedIn, isOwner, async (req, res) => {
  try {
    let { id } = req.params;
    const updateData = { ...req.body.listing };
    if (req.body.listing.amenities) {
      updateData.amenities = req.body.listing.amenities
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
    }
    await Listing.findByIdAndUpdate(id, updateData);
    req.flash("success", "Listing updated!");
    res.redirect(`/listings/${id}`);
  } catch (err) {
    req.flash("error", "Failed to update listing.");
    res.redirect(`/listings/${req.params.id}/edit`);
  }
});

// DELETE
router.delete("/:id", isLoggedIn, isOwner, async (req, res) => {
  let { id } = req.params;
  await Listing.findByIdAndDelete(id);
  req.flash("success", "Listing deleted!");
  res.redirect("/listings");
});

module.exports = router;
