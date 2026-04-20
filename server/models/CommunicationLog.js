import mongoose from 'mongoose';

const communicationLogSchema = new mongoose.Schema({
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'SENT', 'FAILED'],
    default: 'PENDING'
  },
  trackingId: {
    type: String,
    default: null
  },
  variant: {
    type: String,
    enum: ['A', 'B', null],
    default: null
  },
  error: {
    type: String,
    default: null
  },
  sentAt: {
    type: Date,
    default: null
  },
  openedAt: {
    type: Date,
    default: null
  },
  clickedAt: {
    type: Date,
    default: null
  },
  clickedVariant: {
    type: String,
    enum: ['A', 'B', null],
    default: null
  },
  openCount: {
    type: Number,
    default: 0
  },
  clickCount: {
    type: Number,
    default: 0
  },
  convertedAt: {
    type: Date,
    default: null
  },
  conversionValue: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Add indexes for faster queries
communicationLogSchema.index({ campaignId: 1, status: 1 });
communicationLogSchema.index({ customerId: 1 });
communicationLogSchema.index({ sentAt: -1 });
communicationLogSchema.index({ trackingId: 1 }, { unique: true, sparse: true });
communicationLogSchema.index({ campaignId: 1, variant: 1 });

export default mongoose.model('CommunicationLog', communicationLogSchema); 
