// server/models/Segment.js
import mongoose from 'mongoose';

const SegmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  // Store the original query rules structure
  rules: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  // Store the compiled MongoDB query for reference
  mongoQuery: {
    type: mongoose.Schema.Types.Mixed
  },
  // Stats and metadata
  customerCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastRun: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Add compound unique index for user and name
SegmentSchema.index({ createdBy: 1, name: 1 }, { unique: true });

// Pre-save hook to update the updatedAt field
SegmentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to update customer count
SegmentSchema.methods.refreshCount = async function() {
  const Customer = mongoose.model('Customer');
  this.customerCount = await Customer.countDocuments(this.mongoQuery);
  this.lastRun = new Date();
  return this.save();
};

// Static method to refresh all segment counts
SegmentSchema.statics.refreshAllCounts = async function() {
  const segments = await this.find({ isActive: true });
  const Customer = mongoose.model('Customer');
  
  const refreshPromises = segments.map(async segment => {
    segment.customerCount = await Customer.countDocuments(segment.mongoQuery);
    segment.lastRun = new Date();
    return segment.save();
  });
  
  return Promise.all(refreshPromises);
};

const Segment = mongoose.model('Segment', SegmentSchema);

export default Segment;