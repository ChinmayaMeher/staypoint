const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // googleId and avatar for future Google OAuth
    googleId: { type: String, default: null },
    avatar: { type: String, default: null },
  },
  { timestamps: true }
);

// Adds: username, hash, salt + .authenticate() .register() .serializeUser() etc.
userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);
