const express = require("express");
const router = express.Router();
const User = require("../models/user");
const passport = require("passport");
const { sendPasswordResetOtp } = require("../utils/email");

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
    if (err.code === 11000) {
      if (err.keyPattern && err.keyPattern.email) {
        req.flash("error", "A user with that email is already registered.");
      } else {
        req.flash("error", "A user with that username is already registered.");
      }
    } else {
      req.flash("error", err.message);
    }
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

// ─── GET /forgot-password ─────────────────────────────────────
router.get("/forgot-password", (req, res) => {
  res.render("users/forgot-password.ejs");
});

// ─── POST /forgot-password ────────────────────────────────────
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      req.flash("error", "If that email exists, an OTP has been sent.");
      return res.redirect("/forgot-password");
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Save to user (valid for 10 minutes)
    user.resetOtp = otp;
    user.resetOtpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    // Send email
    await sendPasswordResetOtp(user, otp);

    // Save email in session to verify OTP against it later
    req.session.resetEmail = user.email;
    req.flash("success", "An OTP has been sent to your email.");
    res.redirect("/verify-otp");
  } catch (err) {
    console.error("Error in forgot-password:", err);
    req.flash("error", "Something went wrong. Please try again.");
    res.redirect("/forgot-password");
  }
});

// ─── GET /verify-otp ──────────────────────────────────────────
router.get("/verify-otp", (req, res) => {
  if (!req.session.resetEmail) {
    req.flash("error", "Session expired. Please try again.");
    return res.redirect("/forgot-password");
  }
  res.render("users/verify-otp.ejs", { email: req.session.resetEmail });
});

// ─── POST /verify-otp ─────────────────────────────────────────
router.post("/verify-otp", async (req, res) => {
  try {
    const { otp } = req.body;
    const email = req.session.resetEmail;
    
    if (!email) {
      req.flash("error", "Session expired. Please try again.");
      return res.redirect("/forgot-password");
    }

    const user = await User.findOne({ 
      email: email.toLowerCase(),
      resetOtp: otp,
      resetOtpExpires: { $gt: Date.now() }
    });

    if (!user) {
      req.flash("error", "Invalid or expired OTP.");
      return res.redirect("/verify-otp");
    }

    // OTP is valid. Set a flag for the reset password step
    req.session.canResetPassword = true;
    res.redirect("/reset-password");
  } catch (err) {
    console.error("Error in verify-otp:", err);
    req.flash("error", "Something went wrong. Please try again.");
    res.redirect("/verify-otp");
  }
});

// ─── GET /reset-password ──────────────────────────────────────
router.get("/reset-password", (req, res) => {
  if (!req.session.canResetPassword || !req.session.resetEmail) {
    req.flash("error", "Unauthorized access.");
    return res.redirect("/forgot-password");
  }
  res.render("users/reset-password.ejs");
});

// ─── POST /reset-password ─────────────────────────────────────
router.post("/reset-password", async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;
    
    if (!req.session.canResetPassword || !req.session.resetEmail) {
      req.flash("error", "Unauthorized access.");
      return res.redirect("/forgot-password");
    }

    if (password !== confirmPassword) {
      req.flash("error", "Passwords do not match.");
      return res.redirect("/reset-password");
    }

    const user = await User.findOne({ email: req.session.resetEmail });
    if (!user) {
      req.flash("error", "User not found.");
      return res.redirect("/forgot-password");
    }

    // Set new password
    await user.setPassword(password);
    
    // Clear OTP fields
    user.resetOtp = undefined;
    user.resetOtpExpires = undefined;
    await user.save();

    // Clear session variables
    delete req.session.resetEmail;
    delete req.session.canResetPassword;

    req.flash("success", "Password has been reset successfully! You can now log in.");
    res.redirect("/login");
  } catch (err) {
    console.error("Error in reset-password:", err);
    req.flash("error", "Something went wrong. Please try again.");
    res.redirect("/reset-password");
  }
});

module.exports = router;
