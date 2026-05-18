const mongoose = require("mongoose");
const Review = require("./review.js");
const Schema = mongoose.Schema;

const listingSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
  image: {
    type: String,
    default:
      "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200",
    set: (v) =>
      v === "" || v === undefined
        ? "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200"
        : v,
  },
  price: Number,
  location: String,
  country: String,
  reviews: [
    {
      type: Schema.Types.ObjectId,
      ref: "Review",
    },
  ],
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  category: {
    type: String,
    enum: ["Apartment", "House", "Villa", "Cabin", "Studio", "Hostel"],
    default: "Apartment",
  },
  rooms: {
    type: Number,
    default: 1,
  },
  amenities: [String],
});

// Delete associated reviews when a listing is deleted
listingSchema.post("findOneAndDelete", async (listing) => {
  if (listing) {
    await Review.deleteMany({ _id: { $in: listing.reviews } });
  }
});

const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;
