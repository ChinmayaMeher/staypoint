const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // Profile information
    firstName: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    fullName: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    avatar: {
      type: String,
      default: "https://ui-avatars.com/api/?name=User&background=c8622a&color=fff",
    },
    phone: {
      type: String,
      trim: true,
    },
    bio: {
      type: String,
      maxlength: 500,
    },
    // Location
    city: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    // OAuth support
    googleId: { type: String, default: null },
    facebookId: { type: String, default: null },
    // Account settings
    role: {
      type: String,
      enum: ["guest", "host", "admin"],
      default: "guest",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    resetOtp: String,
    resetOtpExpires: Date,
    // Preferences
    language: {
      type: String,
      default: "en",
    },
    currency: {
      type: String,
      default: "USD",
    },
    // Host settings
    hostLicense: String,
    businessName: String,
    // Social links
    website: String,
    twitter: String,
    linkedin: String,
    // Stats (denormalized for performance)
    stats: {
      totalListings: {
        type: Number,
        default: 0,
      },
      totalBookings: {
        type: Number,
        default: 0,
      },
      totalReviews: {
        type: Number,
        default: 0,
      },
      averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      responseRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      responseTime: {
        type: Number,
        default: 0, // in hours
      },
    },
    // Account status
    isActive: {
      type: Boolean,
      default: true,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    suspensionReason: String,
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Add virtual for listings
userSchema.virtual("listings", {
  ref: "Listing",
  localField: "_id",
  foreignField: "owner",
});

// Add virtual for reviews received
userSchema.virtual("receivedReviews", {
  ref: "Review",
  localField: "_id",
  foreignField: "reviewedUser",
});

// Indexes
userSchema.index({ role: 1, isActive: 1 });

// Add passport-local-mongoose plugin
userSchema.plugin(passportLocalMongoose, {
  usernameQueryFields: ["username", "email"],
  hashField: "password",
  saltlen: 16,
  iterations: 25000,
  digestAlgorithm: "sha256",
});

// Pre-save middleware to update fullName
userSchema.pre("save", function(next) {
  if (this.firstName && this.lastName) {
    this.fullName = `${this.firstName} ${this.lastName}`.trim();
  } else if (this.firstName) {
    this.fullName = this.firstName;
  } else if (this.lastName) {
    this.fullName = this.lastName;
  }
  next();
});

// Method to get user's display name
userSchema.methods.getDisplayName = function() {
  if (this.fullName) return this.fullName;
  if (this.firstName) return this.firstName;
  return this.username;
};

// Method to check if user is a host
userSchema.methods.isHost = function() {
  return this.role === "host" || this.role === "admin";
};

module.exports = mongoose.model("User", userSchema);
