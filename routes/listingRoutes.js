const express = require("express");
const router = express.Router();
const Listing = require("../models/listing");
const Review = require("../models/review");
const Wishlist = require("../models/wishlist");
const { isLoggedIn, isHost } = require("../middleware/auth");
const { validateListing, validateSearch } = require("../middleware/validation");
const { uploadListingImages, handleMulterError } = require("../middleware/upload");
const { verifyCSRF } = require("../middleware/security");

// Middleware to check if logged in
const requireLogin = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.session.returnTo = req.originalUrl;
    req.flash("error", "You must be logged in to do that!");
    return res.redirect("/login");
  }
  next();
};

// Middleware to check if owner
const isOwner = async (req, res, next) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing not found!");
    return res.redirect("/listings");
  }
  if (!listing.owner || !listing.owner.equals(req.user._id)) {
    req.flash("error", "You don't have permission to do that!");
    return res.redirect(`/listings/${id}`);
  }
  next();
};

// INDEX - show all listings with advanced search and filtering
router.get("/", validateSearch, async (req, res) => {
  try {
    const {
      category,
      search,
      minPrice,
      maxPrice,
      guests,
      sort = "newest",
      page = 1,
      limit = 12,
    } = req.query;

    let query = { isActive: true };

    // Category filter
    if (category) {
      query.category = category;
    }

    // Search filter (title, location, country)
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
        { country: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Price filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Guests filter
    if (guests) {
      query.maxGuests = { $gte: Number(guests) };
    }

    // Sorting
    let sortOptions = {};
    switch (sort) {
      case "price-low":
        sortOptions = { price: 1 };
        break;
      case "price-high":
        sortOptions = { price: -1 };
        break;
      case "rating":
        sortOptions = { averageRating: -1 };
        break;
      case "newest":
      default:
        sortOptions = { createdAt: -1 };
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    const totalListings = await Listing.countDocuments(query);
    const totalPages = Math.ceil(totalListings / Number(limit));

    const allListing = await Listing.find(query)
      .populate("owner", "username fullName avatar")
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit));

    // Get wishlist status for logged in users
    let wishlistItems = [];
    if (req.isAuthenticated()) {
      wishlistItems = await Wishlist.find({ user: req.user._id }).select("listing");
    }

    res.render("listings/index.ejs", {
      allListing,
      category,
      search,
      minPrice,
      maxPrice,
      guests,
      sort,
      currentPage: Number(page),
      totalPages,
      totalListings,
      wishlistItems,
    });
  } catch (err) {
    console.error("Error loading listings:", err);
    res.status(500).send("Error loading listings");
  }
});

// NEW - show form to create new listing
router.get("/new", requireLogin, isHost, (req, res) => {
  res.render("listings/new.ejs");
});

// CREATE - create new listing with image upload
router.post(
  "/",
  requireLogin,
  isHost,
  uploadListingImages.array("images", 5),
  handleMulterError,
  validateListing,
  verifyCSRF,
  async (req, res) => {
    try {
      const listingData = { ...req.body.listing, owner: req.user._id };

      // Handle amenities
      if (listingData.amenities) {
        if (!Array.isArray(listingData.amenities)) {
           if (typeof listingData.amenities === 'string' && listingData.amenities.includes(",")) {
               listingData.amenities = listingData.amenities.split(",").map(a => a.trim());
           } else {
               listingData.amenities = [listingData.amenities];
           }
        }
        listingData.amenities = listingData.amenities.filter(Boolean);
      } else {
        listingData.amenities = [];
      }

      // Handle uploaded images
      if (req.files && req.files.length > 0) {
        listingData.images = req.files.map((file, index) => ({
          url: `/uploads/listings/${file.filename}`,
          filename: file.filename,
          caption: req.body.imageCaptions?.[index] || "",
          isPrimary: index === 0,
        }));
        // Set the first image as the main image for backward compatibility
        listingData.image = `/uploads/listings/${req.files[0].filename}`;
      }

      const newListing = new Listing(listingData);
      await newListing.save();

      // Update user's stats
      if (req.user.stats) {
        req.user.stats.totalListings = (req.user.stats.totalListings || 0) + 1;
        await req.user.save();
      }

      req.flash("success", "New listing created successfully!");
      res.redirect(`/listings/${newListing._id}`);
    } catch (err) {
      console.error("Error creating listing:", err);
      req.flash("error", "Failed to create listing.");
      res.redirect("/listings/new");
    }
  }
);

// GET listing availability (API endpoint)
router.get("/api/:id/availability", async (req, res) => {
  try {
    const { year, month } = req.query;
    const Booking = require("../models/booking");

    if (!year || !month) {
      return res.status(400).json({ error: "Year and month are required" });
    }

    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);

    const bookings = await Booking.find({
      listing: req.params.id,
      status: { $in: ["confirmed", "pending"] },
      $or: [
        {
          checkin: { $lte: endDate },
          checkout: { $gte: startDate },
        },
      ],
    }).select("checkin checkout");

    const bookedDates = [];
    bookings.forEach((booking) => {
      let current = new Date(Math.max(booking.checkin, startDate));
      const end = new Date(Math.min(booking.checkout, endDate));

      while (current <= end) {
        bookedDates.push(new Date(current).toISOString().split("T")[0]);
        current.setDate(current.getDate() + 1);
      }
    });

    res.json({ bookedDates });
  } catch (err) {
    console.error("Error fetching availability:", err);
    res.status(500).json({ error: "Failed to fetch availability" });
  }
});

// SHOW - show one listing with reviews
router.get("/:id", async (req, res) => {
  try {
    let { id } = req.params;
    const listing = await Listing.findById(id)
      .populate({ path: "reviews", populate: { path: "author", select: "username fullName avatar" } })
      .populate("owner", "username fullName avatar bio stats");

    if (!listing) {
      req.flash("error", "Listing not found!");
      return res.redirect("/listings");
    }

    // Check if user has this in wishlist
    let inWishlist = false;
    if (req.isAuthenticated()) {
      const wishlistItem = await Wishlist.findOne({
        user: req.user._id,
        listing: listing._id,
      });
      inWishlist = !!wishlistItem;
    }

    // Calculate average rating
    const averageRating = listing.averageRating || 0;

    res.render("listings/show.ejs", {
      listing,
      inWishlist,
      averageRating,
    });
  } catch (err) {
    console.error("Error loading listing:", err);
    req.flash("error", "Listing not found!");
    res.redirect("/listings");
  }
});

// EDIT - show edit form
router.get("/:id/edit", requireLogin, isOwner, async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  res.render("listings/edit.ejs", { listing });
});

// UPDATE - update listing
router.put(
  "/:id",
  requireLogin,
  isOwner,
  uploadListingImages.array("images", 5),
  handleMulterError,
  validateListing,
  verifyCSRF,
  async (req, res) => {
    try {
      let { id } = req.params;
      const updateData = { ...req.body.listing };

      // Handle amenities
      if (updateData.amenities) {
        if (!Array.isArray(updateData.amenities)) {
           if (typeof updateData.amenities === 'string' && updateData.amenities.includes(",")) {
               updateData.amenities = updateData.amenities.split(",").map(a => a.trim());
           } else {
               updateData.amenities = [updateData.amenities];
           }
        }
        updateData.amenities = updateData.amenities.filter(Boolean);
      } else {
        updateData.amenities = [];
      }

      // Handle new image uploads
      if (req.files && req.files.length > 0) {
        const newImages = req.files.map((file, index) => ({
          url: `/uploads/listings/${file.filename}`,
          filename: file.filename,
          caption: req.body.imageCaptions?.[index] || "",
          isPrimary: index === 0,
        }));

        // If there's a checkbox to keep existing images, merge them
        if (req.body.keepExistingImages) {
          const listing = await Listing.findById(id);
          updateData.images = [...newImages, ...listing.images];
        } else {
          updateData.images = newImages;
        }

        // Update main image
        updateData.image = newImages[0].url;
      }

      await Listing.findByIdAndUpdate(id, updateData);
      req.flash("success", "Listing updated!");
      res.redirect(`/listings/${id}`);
    } catch (err) {
      console.error("Error updating listing:", err);
      req.flash("error", "Failed to update listing.");
      res.redirect(`/listings/${req.params.id}/edit`);
    }
  }
);

// DELETE - delete listing
router.delete("/:id", requireLogin, isOwner, verifyCSRF, async (req, res) => {
  let { id } = req.params;
  await Listing.findByIdAndDelete(id);

  // Update user's stats
  if (req.user.stats) {
    req.user.stats.totalListings = Math.max(0, (req.user.stats.totalListings || 1) - 1);
    await req.user.save();
  }

  req.flash("success", "Listing deleted!");
  res.redirect("/listings");
});

module.exports = router;
