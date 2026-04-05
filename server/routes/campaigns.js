import express from 'express';
import Campaign from '../models/Campaign.js';
import Customer from '../models/Customer.js';
import Segment from '../models/Segment.js';
import CommLog from '../models/CommunicationLog.js';
import { buildMongoQuery } from '../utils/queryBuilder.js';
import authenticate from '../middleware/authenticate.js';
import { sendEmail } from '../utils/emailService.js';

const router = express.Router();

router.use(authenticate);

// Get all campaigns
router.get('/', async (req, res) => {
  try {
    const campaigns = await Campaign.find({ createdBy: req.user._id })
      .populate('segmentId', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, campaigns });
  } catch (err) {
    console.error('Failed to fetch campaigns:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch campaigns', error: err.message });
  }
});

// Create and send a campaign
router.post('/', async (req, res) => {
  const { name, message, segmentId } = req.body;

  if (!name || !message || !segmentId) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  try {
    const segment = await Segment.findOne({ _id: segmentId, createdBy: req.user._id });
    if (!segment) {
      return res.status(404).json({ success: false, message: 'Segment not found' });
    }

    const mongoQuery = { ...buildMongoQuery(segment.rules), createdBy: req.user._id };
    const customers = await Customer.find(mongoQuery).select('email name');

    const campaign = new Campaign({
      name,
      message,
      segmentId,
      customerCount: customers.length,
      status: 'sent',
      createdBy: req.user._id
    });

    await campaign.save();

    // Create initial communication logs with PENDING status
    const commLogs = customers.map(customer => ({
      campaignId: campaign._id,
      customerId: customer._id,
      status: 'PENDING',
      sentAt: null
    }));

    await CommLog.insertMany(commLogs);

    const deliveryMode = (process.env.CAMPAIGN_DELIVERY_MODE || 'simulated').toLowerCase();
    const testRecipient = process.env.CAMPAIGN_TEST_RECIPIENT || 'aviral.sh02@gmail.com';

    if (deliveryMode === 'real') {
      // Send real emails in background and update delivery logs from SMTP results.
      customers.forEach(async (customer) => {
        try {
          const to = testRecipient || customer.email;
          const emailResult = await sendEmail(to, campaign.name, campaign.message);
          await CommLog.updateOne(
            { campaignId: campaign._id, customerId: customer._id },
            {
              $set: {
                status: emailResult.success ? 'SENT' : 'FAILED',
                sentAt: emailResult.success ? new Date() : null,
                error: emailResult.success ? null : (emailResult.error || 'Email send failed')
              }
            }
          );
        } catch (err) {
          await CommLog.updateOne(
            { campaignId: campaign._id, customerId: customer._id },
            {
              $set: {
                status: 'FAILED',
                sentAt: null,
                error: err.message || 'Email send failed'
              }
            }
          );
        }
      });
    } else {
      // Simulate sending via dummy vendor API for each customer
      customers.forEach(async (customer) => {
        try {
          await fetch(`${process.env.BACKEND_URL || 'http://localhost:3001'}/api/vendor/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              campaignId: campaign._id,
              customerId: customer._id,
              customerEmail: customer.email,
              customerName: customer.name,
              message
            })
          });
        } catch (err) {
          console.error('Dummy vendor API error:', err.message);
        }
      });
    }

    res.status(201).json({
      success: true,
      campaign,
      sentTo: customers.length,
      message: deliveryMode === 'real'
        ? `Campaign created and real email delivery started (test recipient: ${testRecipient})`
        : 'Campaign created and delivery is being simulated in the background'
    });
  } catch (err) {
    console.error('Campaign error:', err);
    res.status(500).json({ success: false, message: 'Failed to create campaign', error: err.message });
  }
});

export default router; 
