// Input validation middleware using express-validator
const { body, param, query, validationResult } = require("express-validator");

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => err.msg);
    if (req.xhr || req.is("application/json") || req.get("accept")?.includes("application/json")) {
      return res.status(400).json({
        success: false,
        message: errorMessages.join(". "),
      });
    }
    req.flash("error", errorMessages.join(". "));
    return res.redirect("back");
  }
  next();
};

// Listing validations
const validateListing = [
  body("listing.title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 100 })
    .withMessage("Title must be less than 100 characters"),

  body("listing.description")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description must be less than 2000 characters"),

  body("listing.price")
    .notEmpty()
    .withMessage("Price is required")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),

  body("listing.location")
    .trim()
    .notEmpty()
    .withMessage("Location is required")
    .isLength({ max: 100 })
    .withMessage("Location must be less than 100 characters"),

  body("listing.country")
    .trim()
    .notEmpty()
    .withMessage("Country is required")
    .isLength({ max: 50 })
    .withMessage("Country must be less than 50 characters"),

  body("listing.category")
    .optional()
    .isIn([
      "Apartment",
      "House",
      "Villa",
      "Cabin",
      "Studio",
      "Hostel",
      "Treehouse",
      "Boat",
      "Castle",
      "Cave",
    ])
    .withMessage("Invalid category"),

  body("listing.rooms")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Rooms must be between 1 and 50"),

  body("listing.amenities")
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!Array.isArray(value) && typeof value !== 'string') {
        throw new Error('Amenities must be a string or an array of strings');
      }
      return true;
    }),

  handleValidationErrors,
];

// Review validations
const validateReview = [
  body("review.rating")
    .notEmpty()
    .withMessage("Rating is required")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),

  body("review.comment")
    .trim()
    .notEmpty()
    .withMessage("Comment is required")
    .isLength({ min: 10, max: 1000 })
    .withMessage("Comment must be between 10 and 1000 characters"),

  handleValidationErrors,
];

// Booking validations
const validateBooking = [
  body("checkin")
    .notEmpty()
    .withMessage("Check-in date is required")
    .isISO8601()
    .withMessage("Invalid check-in date format"),

  body("checkout")
    .notEmpty()
    .withMessage("Check-out date is required")
    .isISO8601()
    .withMessage("Invalid check-out date format")
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.checkin)) {
        throw new Error("Check-out must be after check-in");
      }
      return true;
    }),

  body("adults")
    .notEmpty()
    .withMessage("Number of adults is required")
    .isInt({ min: 1, max: 20 })
    .withMessage("Adults must be between 1 and 20"),

  body("children")
    .optional({ checkFalsy: true })
    .isInt({ min: 0, max: 20 })
    .withMessage("Children must be a positive number"),

  body("infants")
    .optional({ checkFalsy: true })
    .isInt({ min: 0, max: 10 })
    .withMessage("Infants must be a positive number"),

  body("specialRequests")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage("Special requests must be less than 500 characters"),

  handleValidationErrors,
];

// User profile validations
const validateUserProfile = [
  body("email")
    .optional({ checkFalsy: true })
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),

  body("fullName")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Full name must be between 2 and 50 characters"),

  body("phone")
    .optional({ checkFalsy: true })
    .matches(/^\+?[\d\s-()]{10,}$/)
    .withMessage("Please provide a valid phone number"),

  body("bio")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage("Bio must be less than 500 characters"),

  handleValidationErrors,
];

// Search query validations
const validateSearch = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50"),

  query("minPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Minimum price must be a positive number"),

  query("maxPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Maximum price must be a positive number"),

  query("guests")
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage("Number of guests must be between 1 and 20"),

  handleValidationErrors,
];

module.exports = {
  validateListing,
  validateReview,
  validateBooking,
  validateUserProfile,
  validateSearch,
  handleValidationErrors,
};
