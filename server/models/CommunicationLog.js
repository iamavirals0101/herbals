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
  error: {
    type: String,
    default: null
  },
  sentAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Add indexes for faster queries
communicationLogSchema.index({ campaignId: 1, status: 1 });
communicationLogSchema.index({ customerId: 1 });
communicationLogSchema.index({ sentAt: -1 });

export default mongoose.model('CommunicationLog', communicationLogSchema); 