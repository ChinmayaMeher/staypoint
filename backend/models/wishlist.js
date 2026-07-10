const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const wishlistSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    listing: {
      type: Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
    },
  },
  { timestamps: true }
);

// Prevent duplicate wishlist entries
wishlistSchema.index({ user: 1, listing: 1 }, { unique: true });

const Wishlist = mongoose.model("Wishlist", wishlistSchema);
module.exports = Wishlist;