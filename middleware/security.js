const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");

// Security headers with Helmet
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://cdnjs.cloudflare.com",
      ],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https://images.unsplash.com", "https://res.cloudinary.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: "same-origin" },
});

// Rate limiter for general API requests
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: {
    success: false,
    message: "Too many login attempts, please try again after 15 minutes.",
  },
  skipSuccessfulRequests: true,
});

// Rate limiter for booking creation
const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 bookings per hour
  message: {
    success: false,
    message: "Too many booking attempts, please try again later.",
  },
});

// Rate limiter for review creation
const reviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 reviews per hour
  message: {
    success: false,
    message: "Too many review submissions, please try again later.",
  },
});

// Data sanitization against NoSQL query injection
const dataSanitization = mongoSanitize({
  replaceWith: "_",
});

// Data sanitization against XSS
const xssProtection = xss({
  whiteList: {
    "*": ["style", "class"],
  },
});

// CSRF protection middleware
const csrfProtection = (req, res, next) => {
  const cookieToken = getCookie(req, "sp_csrf");
  const activeToken = req.session.csrfToken || cookieToken || generateCSRFToken();

  if (!req.session.csrfToken) {
    req.session.csrfToken = activeToken;
  }

  if (!cookieToken) {
    res.cookie("sp_csrf", activeToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
  
  // Make token available to views
  res.locals.csrfToken = activeToken;
  
  // Skip validation for GET, HEAD, OPTIONS
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }
  
  // Validate CSRF token for state-changing requests
  // Skip global validation for multipart/form-data because req.body is not parsed yet.
  // These routes MUST use the route-level verifyCSRF middleware after multer parses the body.
  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("multipart/form-data")) {
    return next();
  }

  const token = req.body._token || req.headers["x-csrf-token"];
  if (token !== activeToken) {
    return res.status(403).json({
      success: false,
      message: "Invalid CSRF token",
    });
  }
  
  next();
};

// Generate CSRF token
function generateCSRFToken() {
  const crypto = require("crypto");
  return crypto.randomBytes(32).toString("hex");
}

function getCookie(req, name) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  const cookie = cookieHeader
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${name}=`));

  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null;
}

// Verify CSRF token middleware
const verifyCSRF = (req, res, next) => {
  const token = req.body._token || req.headers["x-csrf-token"];
  const expectedToken = req.session.csrfToken || getCookie(req, "sp_csrf");
  if (!token || token !== expectedToken) {
    req.flash("error", "Invalid CSRF token. Please try again.");
    return res.redirect("back");
  }
  next();
};

module.exports = {
  securityHeaders,
  apiLimiter,
  authLimiter,
  bookingLimiter,
  reviewLimiter,
  dataSanitization,
  xssProtection,
  csrfProtection,
  verifyCSRF,
};
