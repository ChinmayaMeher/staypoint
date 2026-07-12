const express = require("express");
const router = express.Router();
const Booking = require("../models/booking");
const Listing = require("../models/listing");
const Notification = require("../models/notification");
const { isLoggedIn } = require("../middleware/auth");
const { validateBooking } = require("../middleware/validation");
const { verifyCSRF, bookingLimiter } = require("../middleware/security");
const QRCode = require("qrcode");
const { sendBookingConfirmation, sendBookingCancellation } = require("../utils/email");

function wantsJson(req) {
  return req.xhr || req.is("application/json") || req.get("accept")?.includes("application/json");
}

// Middleware: Check if user is the guest on the booking
const isBookingGuest = async (req, res, next) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    req.flash("error", "Booking not found");
    return res.redirect("/bookings");
  }
  if (!booking.guest.equals(req.user._id)) {
    req.flash("error", "You don't have permission to access this booking");
    return res.redirect("/bookings");
  }
  req.booking = booking;
  next();
};

// Middleware: Check if user is the host on the booking
const isBookingHost = async (req, res, next) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    req.flash("error", "Booking not found");
    return res.redirect("/bookings");
  }
  if (!booking.host.equals(req.user._id)) {
    req.flash("error", "You don't have permission to access this booking");
    return res.redirect("/bookings");
  }
  req.booking = booking;
  next();
};

// CREATE booking (from listing page)
router.post("/listings/:id/book", isLoggedIn, bookingLimiter, ...validateBooking, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).populate("owner");
    if (!listing) {
      if (wantsJson(req)) return res.status(404).json({ error: "Listing not found" });
      req.flash("error", "Listing not found");
      return res.redirect("/listings");
    }

    if (!listing.isActive) {
      if (wantsJson(req)) return res.status(400).json({ error: "This listing is no longer available" });
      req.flash("error", "This listing is no longer available");
      return res.redirect("/listings");
    }

    // Prevent booking your own listing
    if (listing.owner._id.equals(req.user._id)) {
      if (wantsJson(req)) return res.status(403).json({ error: "You cannot book your own listing" });
      req.flash("error", "You cannot book your own listing");
      return res.redirect(`/listings/${listing._id}`);
    }

    const { checkin, checkout, adults, children = 0, infants = 0, specialRequests = "" } = req.body;
    const checkinDate = new Date(checkin);
    const checkoutDate = new Date(checkout);
    const nights = Math.ceil((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24));

    // Validate minimum and maximum nights
    if (nights < listing.minNights) {
      if (wantsJson(req)) return res.status(400).json({ error: `Minimum stay is ${listing.minNights} night(s)` });
      req.flash("error", `Minimum stay is ${listing.minNights} night(s)`);
      return res.redirect(`/listings/${listing._id}`);
    }
    if (nights > listing.maxNights) {
      if (wantsJson(req)) return res.status(400).json({ error: `Maximum stay is ${listing.maxNights} night(s)` });
      req.flash("error", `Maximum stay is ${listing.maxNights} night(s)`);
      return res.redirect(`/listings/${listing._id}`);
    }

    // Check for booking conflicts
    const hasConflict = await Booking.hasConflict(listing._id, checkinDate, checkoutDate);
    if (hasConflict) {
      if (wantsJson(req)) return res.status(409).json({ error: "These dates are already booked" });
      req.flash("error", "These dates are already booked");
      return res.redirect(`/listings/${listing._id}`);
    }

    // Calculate pricing
    const basePrice = listing.price * nights;
    const cleaningFee = Math.round(basePrice * 0.1); // 10% cleaning fee
    const serviceFee = Math.round(basePrice * 0.12); // 12% service fee
    const totalPrice = basePrice + cleaningFee + serviceFee;

    // Create booking
    const booking = await Booking.create({
      listing: listing._id,
      guest: req.user._id,
      host: listing.owner._id,
      checkin: checkinDate,
      checkout: checkoutDate,
      guests: { adults, children, infants },
      nights,
      pricePerNight: listing.price,
      cleaningFee,
      serviceFee,
      totalPrice,
      specialRequests,
      status: listing.instantBook ? "confirmed" : "pending",
    });

    // Notify Host
    await Notification.create({
      recipient: listing.owner._id,
      sender: req.user._id,
      type: 'booking_new',
      message: `${req.user.username} just booked your listing: ${listing.title}`,
      link: `/bookings/host/${booking._id}`
    });

    if (wantsJson(req)) {
      // Send email asynchronously
      sendBookingConfirmation(req.user, booking, `http://${req.get("host")}/bookings/${booking._id}/ticket`);
      return res.status(201).json({
        bookingRef: booking.bookingRef,
        bookingId: booking._id,
        status: booking.status,
      });
    }

    req.flash("success", `Booking ${booking.status === "confirmed" ? "confirmed" : "submitted"}! Your booking reference is ${booking.bookingRef}`);
    
    // Send email asynchronously
    sendBookingConfirmation(req.user, booking, `http://${req.get("host")}/bookings/${booking._id}/ticket`);
    
    res.redirect(`/bookings/${booking._id}`);
  } catch (err) {
    console.error("Booking error:", err);
    if (wantsJson(req)) return res.status(500).json({ error: "Failed to create booking. Please try again." });
    req.flash("error", "Failed to create booking. Please try again.");
    res.redirect(`/listings/${req.params.id}`);
  }
});

// GET booking availability calendar (API endpoint)
router.get("/api/listing/:id/availability", async (req, res) => {
  try {
    const { year, month } = req.query;
    const listingId = req.params.id;

    if (!year || !month) {
      return res.status(400).json({ error: "Year and month are required" });
    }

    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);

    const bookings = await Booking.find({
      listing: listingId,
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

// GET all bookings for current user (as guest)
router.get("/", isLoggedIn, async (req, res) => {
  try {
    const { status = "all" } = req.query;
    let query = { guest: req.user._id };
    
    if (status !== "all") {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .populate("listing")
      .populate("host", "username fullName avatar")
      .sort({ createdAt: -1 });

    res.render("bookings/index.ejs", { bookings, currentStatus: status });
  } catch (err) {
    console.error("Error fetching bookings:", err);
    req.flash("error", "Failed to load bookings");
    res.redirect("/listings");
  }
});

// GET all bookings for user's listings (as host)
router.get("/host", isLoggedIn, async (req, res) => {
  try {
    if (!req.user.isHost()) {
      req.flash("error", "You need to be a host to view this page");
      return res.redirect("/listings");
    }

    const { status = "all" } = req.query;
    let query = { host: req.user._id };
    
    if (status !== "all") {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .populate("listing")
      .populate("guest", "username fullName avatar")
      .sort({ createdAt: -1 });

    res.render("bookings/host-bookings.ejs", { bookings, currentStatus: status });
  } catch (err) {
    console.error("Error fetching host bookings:", err);
    req.flash("error", "Failed to load bookings");
    res.redirect("/listings");
  }
});

// GET single booking
router.get("/:id", isLoggedIn, isBookingGuest, async (req, res) => {
  try {
    const booking = req.booking;
    await booking.populate("listing");
    await booking.populate("host", "username fullName avatar bio stats");
    
    res.render("bookings/show.ejs", { booking });
  } catch (err) {
    console.error("Error fetching booking:", err);
    req.flash("error", "Failed to load booking");
    res.redirect("/bookings");
  }
});

// GET booking as host
router.get("/host/:id", isLoggedIn, isBookingHost, async (req, res) => {
  try {
    const booking = req.booking;
    await booking.populate("listing");
    await booking.populate("guest", "username fullName avatar bio stats");
    
    res.render("bookings/host-show.ejs", { booking });
  } catch (err) {
    console.error("Error fetching booking:", err);
    req.flash("error", "Failed to load booking");
    res.redirect("/bookings/host");
  }
});

// UPDATE booking status (confirm/cancel)

// GET all bookings for current user (as guest)
router.get("/", isLoggedIn, async (req, res) => {
  try {
    const { status = "all" } = req.query;
    let query = { guest: req.user._id };
    
    if (status !== "all") {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .populate("listing")
      .populate("host", "username fullName avatar")
      .sort({ createdAt: -1 });

    res.render("bookings/index.ejs", { bookings, currentStatus: status });
  } catch (err) {
    console.error("Error fetching bookings:", err);
    req.flash("error", "Failed to load bookings");
    res.redirect("/listings");
  }
});

// GET all bookings for user's listings (as host)
router.get("/host", isLoggedIn, async (req, res) => {
  try {
    if (!req.user.isHost()) {
      req.flash("error", "You need to be a host to view this page");
      return res.redirect("/listings");
    }

    const { status = "all" } = req.query;
    let query = { host: req.user._id };
    
    if (status !== "all") {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .populate("listing")
      .populate("guest", "username fullName avatar")
      .sort({ createdAt: -1 });

    res.render("bookings/host-bookings.ejs", { bookings, currentStatus: status });
  } catch (err) {
    console.error("Error fetching host bookings:", err);
    req.flash("error", "Failed to load bookings");
    res.redirect("/listings");
  }
});

// GET single booking
router.get("/:id", isLoggedIn, isBookingGuest, async (req, res) => {
  try {
    const booking = req.booking;
    await booking.populate("listing");
    await booking.populate("host", "username fullName avatar bio stats");
    
    res.render("bookings/show.ejs", { booking });
  } catch (err) {
    console.error("Error fetching booking:", err);
    req.flash("error", "Failed to load booking");
    res.redirect("/bookings");
  }
});

// GET booking as host
router.get("/host/:id", isLoggedIn, isBookingHost, async (req, res) => {
  try {
    const booking = req.booking;
    await booking.populate("listing");
    await booking.populate("guest", "username fullName avatar bio stats");
    
    res.render("bookings/host-show.ejs", { booking });
  } catch (err) {
    console.error("Error fetching booking:", err);
    req.flash("error", "Failed to load booking");
    res.redirect("/bookings/host");
  }
});

// UPDATE booking status (confirm/cancel)
router.patch("/:id/status", isLoggedIn, isBookingHost, verifyCSRF, async (req, res) => {
  try {
    const { status, cancellationReason } = req.body;
    const booking = req.booking;

    if (status === "confirmed") {
      booking.status = "confirmed";
    } else if (status === "cancelled") {
      booking.status = "cancelled";
      booking.cancellationReason = cancellationReason || "";
    }

    await booking.save();
    
    if (status === "cancelled" && booking.guest) {
      // Since booking.guest might just be an ID, we need to populate it to send email
      const populatedBooking = await Booking.findById(booking._id).populate("guest");
      if (populatedBooking.guest) {
        sendBookingCancellation(populatedBooking.guest, populatedBooking);
      }
    }
    
    req.flash("success", `Booking ${status}`);
    res.redirect(`/bookings/host/${booking._id}`);
  } catch (err) {
    console.error("Error updating booking status:", err);
    req.flash("error", "Failed to update booking");
    res.redirect(`/bookings/host/${req.params.id}`);
  }
});

// CANCEL booking (by guest)
router.post("/:id/cancel", isLoggedIn, isBookingGuest, verifyCSRF, async (req, res) => {
  try {
    const booking = req.booking;
    
    // Only allow cancellation of pending or confirmed bookings
    if (!["pending", "confirmed"].includes(booking.status)) {
      req.flash("error", "This booking cannot be cancelled");
      return res.redirect(`/bookings/${booking._id}`);
    }

    booking.status = "cancelled";
    booking.cancellationReason = req.body.cancellationReason || "Guest cancelled";
    await booking.save();

    // Send cancellation email
    sendBookingCancellation(req.user, booking);

    req.flash("success", "Booking cancelled successfully");
    res.redirect("/bookings");
  } catch (err) {
    console.error("Error cancelling booking:", err);
    req.flash("error", "Failed to cancel booking");
    res.redirect(`/bookings/${req.params.id}`);
  }
});

// DELETE booking (by host or guest, only if pending)
router.delete("/:id", isLoggedIn, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      req.flash("error", "Booking not found");
      return res.redirect("/bookings");
    }

    // Check if user is guest or host
    const isGuest = booking.guest.equals(req.user._id);
    const isHost = booking.host.equals(req.user._id);

    if (!isGuest && !isHost) {
      req.flash("error", "You don't have permission to delete this booking");
      return res.redirect("/bookings");
    }

    // Only allow deletion of pending bookings
    if (booking.status !== "pending") {
      req.flash("error", "Only pending bookings can be deleted");
      return res.redirect(isHost ? `/bookings/host/${booking._id}` : `/bookings/${booking._id}`);
    }

    await Booking.findByIdAndDelete(req.params.id);
    req.flash("success", "Booking deleted");
    res.redirect(isHost ? "/bookings/host" : "/bookings");
  } catch (err) {
    console.error("Error deleting booking:", err);
    req.flash("error", "Failed to delete booking");
    res.redirect("/bookings");
  }
});

// GET ticket view
router.get("/:id/ticket", isLoggedIn, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("listing")
      .populate("guest")
      .populate("host");

    if (!booking) {
      req.flash("error", "Booking not found");
      return res.redirect("/bookings");
    }

    // Check permissions - only guest and host can view
    if (!booking.guest._id.equals(req.user._id) && !booking.host._id.equals(req.user._id)) {
      req.flash("error", "You don't have permission to view this ticket");
      return res.redirect("/bookings");
    }

    // Generate QR code with booking ref and validation link
    const validationUrl = `http://${req.get("host")}/bookings/${booking._id}`;
    const qrData = JSON.stringify({
      ref: booking.bookingRef,
      url: validationUrl,
    });
    
    const qrCode = await QRCode.toDataURL(qrData, {
      color: {
        dark: "#c8622a",
        light: "#ffffff",
      },
      width: 150,
      margin: 1
    });

    res.render("bookings/ticket.ejs", { booking, qrCode });
  } catch (err) {
    console.error("Error generating ticket:", err);
    req.flash("error", "Failed to generate ticket");
    res.redirect("/bookings");
  }
});

module.exports = router;
