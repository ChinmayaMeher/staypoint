const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
  recipient: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null // Can be null for system notifications
  },
  type: {
    type: String,
    enum: ['booking_new', 'booking_cancelled', 'booking_status', 'review_new', 'system'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  link: {
    type: String,
    default: '' // e.g. /bookings/123 or /listings/456
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Notification', notificationSchema);
