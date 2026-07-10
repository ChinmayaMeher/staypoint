// Authentication middleware

// Check if user is logged in
const isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.session.returnTo = req.originalUrl;
    req.flash("error", "You must be logged in to access this page!");
    return res.redirect("/login");
  }
  next();
};

// Check if user is logged out (for login/signup pages)
const isLoggedOut = (req, res, next) => {
  if (req.isAuthenticated()) {
    req.flash("error", "You are already logged in!");
    return res.redirect("/listings");
  }
  next();
};

// Check if user is a host
const isHost = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.flash("error", "You must be logged in to access this page!");
    return res.redirect("/login");
  }
  if (!req.user.isHost()) {
    req.flash("error", "You need to be a host to access this page!");
    return res.redirect("/listings");
  }
  next();
};

// Check if user is an admin
const isAdmin = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.flash("error", "You must be logged in to access this page!");
    return res.redirect("/login");
  }
  if (req.user.role !== "admin") {
    req.flash("error", "You don't have permission to access this page!");
    return res.redirect("/listings");
  }
  next();
};

// Check if user is verified
const isVerified = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.flash("error", "You must be logged in to access this page!");
    return res.redirect("/login");
  }
  if (!req.user.isVerified && req.user.role === "host") {
    req.flash("error", "Please verify your account to access this page!");
    return res.redirect("/profile/verify");
  }
  next();
};

module.exports = {
  isLoggedIn,
  isLoggedOut,
  isHost,
  isAdmin,
  isVerified,
};