const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const reviewSchema = new Schema(
  {
    listing: {
      type: Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // For host reviews (reviews about the host, not just the listing)
    reviewedUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    // Ratings breakdown
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    // Detailed ratings
    ratings: {
      cleanliness: {
        type: Number,
        min: 1,
        max: 5,
      },
      accuracy: {
        type: Number,
        min: 1,
        max: 5,
      },
      checkin: {
        type: Number,
        min: 1,
        max: 5,
      },
      communication: {
        type: Number,
        min: 1,
        max: 5,
      },
      location: {
        type: Number,
        min: 1,
        max: 5,
      },
      value: {
        type: Number,
        min: 1,
        max: 5,
      },
    },
    // Review content
    comment: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 1000,
    },
    // Photos in review
    photos: [
      {
        url: String,
        filename: String,
      },
    ],
    // Stay details
    stayDate: {
      type: Date,
    },
    // Trip type
    tripType: {
      type: String,
      enum: ["solo", "couple", "family", "friends", "business"],
    },
    // Helpfulness
    helpful: {
      type: Number,
      default: 0,
    },
    usersWhoFoundHelpful: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // Host response
    hostResponse: {
      type: String,
      maxlength: 500,
    },
    hostResponseDate: {
      type: Date,
    },
    // Status
    isApproved: {
      type: Boolean,
      default: true,
    },
    isFlagged: {
      type: Boolean,
      default: false,
    },
    flagReason: {
      type: String,
    },
    // Booking reference (to verify the guest actually stayed)
    booking: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
    },
  },
  { timestamps: true }
);

// Indexes for better query performance
reviewSchema.index({ listing: 1, createdAt: -1 });
reviewSchema.index({ author: 1 });
reviewSchema.index({ reviewedUser: 1 });
reviewSchema.index({ booking: 1 }, { unique: true, sparse: true });

// Update listing's average rating when a review is saved
reviewSchema.post("save", async function () {
  const Listing = mongoose.model("Listing");
  const stats = await this.constructor.aggregate([
    { $match: { listing: this.listing, isApproved: true } },
    {
      $group: {
        _id: null,
        avgRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await Listing.findByIdAndUpdate(this.listing, {
      averageRating: Math.round(stats[0].avgRating * 10) / 10,
    });
  }
});

// Update listing's average rating when a review is deleted
reviewSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    const Listing = mongoose.model("Listing");
    const stats = await this.model.aggregate([
      { $match: { listing: doc.listing, isApproved: true } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    const avgRating = stats.length > 0 ? Math.round(stats[0].avgRating * 10) / 10 : 0;
    await Listing.findByIdAndUpdate(doc.listing, { averageRating: avgRating });
  }
});

// Check if user has already reviewed a listing
reviewSchema.statics.hasUserReviewed = async function (listingId, userId) {
  const review = await this.findOne({
    listing: listingId,
    author: userId,
    isApproved: true,
  });
  return !!review;
};

const Review = mongoose.model("Review", reviewSchema);
module.exports = Review;