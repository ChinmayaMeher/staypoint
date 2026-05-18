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

const listingRoutes = require("./routes/listingRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const userRoutes = require("./routes/userRoutes");

const MONGO_URL =
  process.env.MONGO_URL || "mongodb://localhost:27017/staypoint";
const PORT = process.env.PORT || 8080;
const ejsLayouts = require("express-ejs-layouts");

app.use(ejsLayouts);
app.set("layout", "layouts/boilerplate"); // points to views/layouts/boilerplate.ejs

// Connect to DB
main()
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.log("❌ DB Error:", err));

async function main() {
  await mongoose.connect(MONGO_URL);
}

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

// Session config — must be defined BEFORE app.use(session(...))
const sessionOptions = {
  secret: process.env.SECRET || "fallbacksecret",
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  },
};

app.use(session(sessionOptions));
app.use(flash());

// Passport
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Locals — AFTER passport so req.user and req.flash() are ready
app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user || null;
  next();
});

// Locals for all views
app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  next();
});

// Routes
app.get("/", (req, res) => res.redirect("/listings"));
app.use("/listings", listingRoutes);
app.use("/listings/:id/reviews", reviewRoutes);
app.use("/", userRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).render("error.ejs", {
    message: "Page Not Found",
    error: { status: 404 },
  });
});

// Error Handler
app.use((err, req, res, next) => {
  const { status = 500, message = "Something went wrong!" } = err;
  res.status(status).render("error.ejs", { message, error: err });
});

app.listen(PORT, () => {
  console.log(`🚀 StayPoint server running on http://localhost:${PORT}`);
});
