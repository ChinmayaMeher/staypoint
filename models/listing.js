const mongoose = require("mongoose");
const Review = require("./review.js");
const Schema = mongoose.Schema;

const listingSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    maxlength: 2000,
  },
  // Multiple images support
  images: [
    {
      url: {
        type: String,
        required: true,
      },
      filename: String,
      caption: String,
      isPrimary: {
        type: Boolean,
        default: false,
      },
    },
  ],
  // Keep image field for backward compatibility
  image: {
    type: String,
    default:
      "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200",
    set: (v) =>
      v === "" || v === undefined
        ? "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200"
        : v,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  location: {
    type: String,
    required: true,
    trim: true,
  },
  country: {
    type: String,
    required: true,
    trim: true,
  },
  reviews: [
    {
      type: Schema.Types.ObjectId,
      ref: "Review",
    },
  ],
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  category: {
    type: String,
    enum: [
      "Apartment",
      "House",
      "Villa",
      "Cabin",
      "Studio",
      "Hostel",
      "Treehouse",
      "Boat",
      "Castle",
      "Cave",
    ],
    default: "Apartment",
  },
  rooms: {
    type: Number,
    default: 1,
    min: 1,
  },
  bathrooms: {
    type: Number,
    default: 1,
    min: 1,
  },
  maxGuests: {
    type: Number,
    default: 2,
    min: 1,
  },
  amenities: [String],
  // Average rating calculation
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  // Booking settings
  minNights: {
    type: Number,
    default: 1,
  },
  maxNights: {
    type: Number,
    default: 30,
  },
  instantBook: {
    type: Boolean,
    default: false,
  },
  // Cancellation policy
  cancellationPolicy: {
    type: String,
    enum: ["flexible", "moderate", "strict"],
    default: "moderate",
  },
  // House rules
  houseRules: [String],
  // Coordinates for map
  coordinates: {
    lat: Number,
    lng: Number,
  },
  // Active status
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for getting the primary image
listingSchema.virtual("primaryImage").get(function() {
  if (this.images && this.images.length > 0) {
    const primary = this.images.find(img => img.isPrimary);
    return primary ? primary.url : this.images[0].url;
  }
  return this.image;
});

// Index for text search
listingSchema.index({ title: "text", description: "text", location: "text" });
listingSchema.index({ category: 1, price: 1 });
listingSchema.index({ "coordinates.lat": 1, "coordinates.lng": 1 });

// Delete associated reviews when a listing is deleted
listingSchema.post("findOneAndDelete", async (listing) => {
  if (listing) {
    await Review.deleteMany({ _id: { $in: listing.reviews } });
  }
});

const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;
