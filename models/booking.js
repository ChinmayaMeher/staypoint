const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const bookingSchema = new Schema(
  {
    listing: {
      type: Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
    },
    guest: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    host: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    checkin: {
      type: Date,
      required: true,
    },
    checkout: {
      type: Date,
      required: true,
    },
    guests: {
      adults: {
        type: Number,
        min: 1,
        default: 1,
      },
      children: {
        type: Number,
        min: 0,
        default: 0,
      },
      infants: {
        type: Number,
        min: 0,
        default: 0,
      },
    },
    nights: {
      type: Number,
      required: true,
    },
    pricePerNight: {
      type: Number,
      required: true,
    },
    cleaningFee: {
      type: Number,
      default: 0,
    },
    serviceFee: {
      type: Number,
      default: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "pending",
    },
    bookingRef: {
      type: String,
      unique: true,
      required: true,
    },
    specialRequests: {
      type: String,
      default: "",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refunded", "failed"],
      default: "pending",
    },
    cancellationReason: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Generate booking reference before saving
bookingSchema.pre("save", function (next) {
  if (!this.bookingRef) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.bookingRef = `SP-${timestamp}-${random}`;
  }
  next();
});

// Check for booking conflicts
bookingSchema.statics.hasConflict = async function (listingId, checkin, checkout, excludeBookingId = null) {
  const query = {
    listing: listingId,
    status: { $in: ["confirmed", "pending"] },
    $or: [
      {
        checkin: { $lt: new Date(checkout) },
        checkout: { $gt: new Date(checkin) },
      },
    ],
  };
  
  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }
  
  const conflictingBooking = await this.findOne(query);
  return !!conflictingBooking;
};

// Indexes for better query performance
bookingSchema.index({ listing: 1, status: 1 });
bookingSchema.index({ guest: 1, status: 1 });
bookingSchema.index({ host: 1, status: 1 });
bookingSchema.index({ checkin: 1, checkout: 1 });

const Booking = mongoose.model("Booking", bookingSchema);
module.exports = Booking;