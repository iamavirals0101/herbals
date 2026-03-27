import express from 'express';
import CommLog from '../models/CommunicationLog.js';

const router = express.Router();

// In-memory queue for batch processing
const receiptQueue = [];
const BATCH_SIZE = 10;
const BATCH_INTERVAL = 2000; // 2 seconds

// Consumer: process the queue in batches
setInterval(async () => {
  if (receiptQueue.length === 0) return;
  const batch = receiptQueue.splice(0, BATCH_SIZE);
  if (batch.length === 0) return;
  try {
    const bulkOps = batch.map(({ campaignId, customerId, status, error }) => ({
      updateOne: {
        filter: { campaignId, customerId },
        update: {
          status,
          sentAt: status === 'SENT' ? new Date() : null,
          error: status === 'SENT' ? null : error
        }
      }
    }));
    await CommLog.bulkWrite(bulkOps);
    console.log(`[Batch Consumer] Processed ${batch.length} delivery receipts at ${new Date().toLocaleTimeString()}`);
  } catch (err) {
    console.error('[Batch Consumer] Error processing batch:', err.message);
  }
}, BATCH_INTERVAL);

// Dummy vendor API: Simulate delivery
router.post('/send', async (req, res) => {
  const { campaignId, customerId, customerEmail, customerName, message } = req.body;
  // Simulate random delivery result
  const isSent = Math.random() < 0.9;
  const status = isSent ? 'SENT' : 'FAILED';
  const error = isSent ? null : 'Simulated delivery failure';

  // Simulate async delivery receipt callback
  setTimeout(async () => {
    try {
      await fetch(`${process.env.BACKEND_URL || 'http://localhost:3001'}/api/vendor/receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          customerId,
          status,
          error
        })
      });
    } catch (err) {
      console.error('Error calling delivery receipt API:', err.message);
    }
  }, 500 + Math.random() * 1000); // Simulate network delay

  res.json({ success: true, status });
});

// Delivery receipt endpoint (now queues updates)
router.post('/receipt', async (req, res) => {
  const { campaignId, customerId, status, error } = req.body;
  // Push to in-memory queue for batch processing
  receiptQueue.push({ campaignId, customerId, status, error });
  res.json({ success: true, queued: true });
});

export default router; 