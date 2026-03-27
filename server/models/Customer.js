// server/models/Customer.js
import mongoose from 'mongoose';

const CustomerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  spend: {
    type: Number,
    default: 0
  },
  visits: {
    type: Number,
    default: 0
  },
  lastOrderDate: {
    type: Date,
    required: true,
    // Allow manual input for seeding and segmentation
  },
  firstOrderDate: {
    type: Date,
    default: null
  },
  // Additional fields that might be useful for segmentation
  tags: [String],
  location: {
    city: String,
    state: String,
    country: String
  },
  deviceType: {
    type: String,
    enum: ['mobile', 'desktop', 'tablet', 'unknown'],
    default: 'unknown'
  },
  acquisitionSource: String,
  // Store customer segments for quick lookup
  segments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Segment'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
});

// Virtual for calculating days since last order
CustomerSchema.virtual('inactiveDays').get(function() {
  if (!this.lastOrderDate) return null;
  const now = new Date();
  const diffTime = Math.abs(now - this.lastOrderDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save hook to update the updatedAt field
CustomerSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index fields that will be frequently queried
CustomerSchema.index({ spend: 1 });
CustomerSchema.index({ visits: 1 });
CustomerSchema.index({ lastOrderDate: 1 });
CustomerSchema.index({ tags: 1 });
CustomerSchema.index({ 'location.country': 1, 'location.state': 1, 'location.city': 1 });
// Compound unique index for multi-tenancy: unique per user
CustomerSchema.index({ email: 1, createdBy: 1 }, { unique: true });

const Customer = mongoose.model('Customer', CustomerSchema);

export default Customer;