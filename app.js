if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

// Import routes
const listingRoutes = require("./routes/listingRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const userRoutes = require("./routes/userRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const profileRoutes = require("./routes/profileRoutes");
const chatRoutes = require("./routes/chatRoutes");

// Import middleware
const {
  securityHeaders,
  apiLimiter,
  dataSanitization,
  xssProtection,
  csrfProtection,
} = require("./middleware/security");

const isProduction = process.env.NODE_ENV === "production";
const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/staypoint";
const SECRET = process.env.SECRET || (isProduction ? null : "staypoint_dev_secret");
const PORT = process.env.PORT || 8080;

if (!SECRET) {
  throw new Error("SECRET is required when NODE_ENV=production");
}

// Connect to DB
main()
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.log("❌ DB Error:", err));

async function main() {
  await mongoose.connect(MONGO_URL);
}

// ===== VIEW ENGINE =====
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("trust proxy", 1);

// ===== SECURITY MIDDLEWARE =====
app.use(securityHeaders);
app.use(dataSanitization);
app.use(xssProtection);

// ===== BASIC MIDDLEWARE =====
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.json({ limit: "10mb" }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

// Rate limiting for API routes
app.use("/api/", apiLimiter);

// ===== SESSION CONFIGURATION =====
const sessionOptions = {
  store: MongoStore.create({
    mongoUrl: MONGO_URL,
    touchAfter: 24 * 3600,
  }),
  secret: SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
  },
};
app.use(session(sessionOptions));
app.use(flash());

// ===== PASSPORT CONFIGURATION =====
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// CSRF protection needs the session to exist first.
app.use(csrfProtection);

// ===== LOCALS FOR ALL VIEWS =====
app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  res.locals.isLoggedIn = req.isAuthenticated();
  res.locals.csrfToken = req.session.csrfToken;
  next();
});

// ===== ROUTES =====
app.get("/", (req, res) => res.redirect("/listings"));

// API health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "StayPoint API is running",
    timestamp: new Date().toISOString(),
  });
});

// Main routes
app.use("/listings/:id/reviews", reviewRoutes);
app.use("/listings", listingRoutes);
app.use("/api/chat", chatRoutes);
app.use("/", userRoutes);
app.use("/bookings", bookingRoutes);
app.use("/wishlist", wishlistRoutes);
app.use("/profile", profileRoutes);

// ===== 404 HANDLER =====
app.use((req, res) => {
  res.status(404).render("error.ejs", {
    message: "Page Not Found",
    error: { status: 404 },
  });
});

// ===== ERROR HANDLER =====
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  
  // Log error in production
  if (process.env.NODE_ENV === "production") {
    console.error("Error:", err);
  }
  
  const { status = 500, message = "Something went wrong!" } = err;
  res.status(status).render("error.ejs", { message, error: err });
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`🚀 StayPoint server running on port ${PORT}`);
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
});

// ===== GRACEFUL SHUTDOWN =====
process.on("SIGINT", async () => {
  try {
    await mongoose.connection.close();
    console.log("✅ MongoDB connection closed");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error during shutdown:", err);
    process.exit(1);
  }
});

module.exports = app;
