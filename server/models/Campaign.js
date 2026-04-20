import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  message: { 
    type: String, 
    required: true,
    trim: true
  },
  segmentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Segment', 
    required: true 
  },
  sentAt: { 
    type: Date, 
    default: Date.now 
  },
  customerCount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'failed'],
    default: 'draft'
  },
  error: {
    type: String,
    default: null
  },
  abEnabled: {
    type: Boolean,
    default: false
  },
  splitRatio: {
    type: Number,
    min: 1,
    max: 99,
    default: 50
  },
  variantA: {
    type: String,
    default: null
  },
  variantB: {
    type: String,
    default: null
  },
  winnerVariant: {
    type: String,
    enum: ['A', 'B', null],
    default: null
  },
  comparatorNotes: {
    type: String,
    default: null
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { 
  timestamps: true 
});

// Add index for faster queries
campaignSchema.index({ segmentId: 1, sentAt: -1 });

export default mongoose.model('Campaign', campaignSchema); 
