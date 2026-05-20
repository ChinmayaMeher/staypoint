const express = require("express");
const router = express.Router();
const User = require("../models/user");
const passport = require("passport");

// ─── GET /signup ──────────────────────────────────────────────
router.get("/signup", (req, res) => {
  res.render("users/signup.ejs");
});

// ─── POST /signup ─────────────────────────────────────────────
router.post("/signup", async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      req.flash("error", "All fields are required.");
      return res.redirect("/signup");
    }

    const newUser = new User({ username, email });
    const registeredUser = await User.register(newUser, password);

    // Auto-login right after signup
    req.login(registeredUser, function (loginErr) {
      if (loginErr) {
        req.flash("error", loginErr.message);
        return res.redirect("/signup");
      }
      req.flash("success", `Welcome to StayPoint, ${username}! 🎉`);
      return res.redirect("/listings");
    });
  } catch (err) {
    console.error("Signup Error:", err);
    req.flash("error", err.message);
    return res.redirect("/signup");
  }
});

// ─── GET /login ───────────────────────────────────────────────
router.get("/login", (req, res) => {
  res.render("users/login.ejs");
});

// ─── POST /login ──────────────────────────────────────────────
router.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true, // uses passport-local-mongoose's error message
    keepSessionInfo: true,
  }),
  (req, res) => {
    req.flash("success", `Welcome back, ${req.user.username}!`);
    // Redirect to the page they were trying to visit, or /listings
    const redirectUrl = req.session.returnTo || "/listings";
    delete req.session.returnTo;
    res.redirect(redirectUrl);
  }
);

// ─── GET /logout ──────────────────────────────────────────────
router.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.flash("success", "You've been logged out. See you soon!");
    res.redirect("/listings");
  });
});

module.exports = router;
