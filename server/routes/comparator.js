import crypto from 'crypto';
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

const deliveryMode = () => (process.env.CAMPAIGN_DELIVERY_MODE || 'simulated').toLowerCase();
const trackingBase = () => (process.env.TRACKING_BASE_URL || process.env.BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');
const resendDelayMs = () => Number(process.env.COMPARATOR_SEND_DELAY_MS || 260);

function pickVariant(customerId, campaignId, splitRatio) {
  const key = `${customerId}:${campaignId}`;
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  const bucket = parseInt(hash.slice(0, 8), 16) % 100;
  return bucket < splitRatio ? 'A' : 'B';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');
}

function buildTrackedHtml(variantAMessage, variantBMessage, openUrl, clickUrlA, clickUrlB) {
  const escapedA = escapeHtml(variantAMessage);
  const escapedB = escapeHtml(variantBMessage);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${process.env.EMAIL_FROM_NAME || 'Herbal CRM'}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
          <h2 style="margin: 0 0 8px; color: #1d4ed8; font-size: 18px;">Variant A</h2>
          <div>${escapedA}</div>
          <div style="margin-top: 12px;">
            <a href="${clickUrlA}" style="display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 10px 16px; border-radius: 6px; font-weight: 600;">View Offer A</a>
          </div>
          <hr style="border: none; border-top: 1px solid #d1d5db; margin: 20px 0;" />
          <h2 style="margin: 0 0 8px; color: #7c3aed; font-size: 18px;">Variant B</h2>
          <div>${escapedB}</div>
          <div style="margin-top: 12px;">
            <a href="${clickUrlB}" style="display: inline-block; background: #7c3aed; color: #fff; text-decoration: none; padding: 10px 16px; border-radius: 6px; font-weight: 600;">View Offer B</a>
          </div>
        </div>
        <img src="${openUrl}" alt="" width="1" height="1" style="display:block;border:0;outline:none;" />
      </body>
    </html>
  `;
}

router.get('/campaigns', async (req, res) => {
  try {
    const campaigns = await Campaign.find({ createdBy: req.user._id, abEnabled: true })
      .select('name createdAt segmentId customerCount splitRatio winnerVariant status')
      .populate('segmentId', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, campaigns });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load comparator campaigns', error: err.message });
  }
});

router.get('/campaigns/:campaignId/stats', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const campaign = await Campaign.findOne({ _id: campaignId, createdBy: req.user._id, abEnabled: true });
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Comparator campaign not found' });
    }

    const audienceStats = await CommLog.aggregate([
      { $match: { campaignId: campaign._id } },
      {
        $group: {
          _id: '$variant',
          total: { $sum: 1 },
          sent: { $sum: { $cond: [{ $eq: ['$status', 'SENT'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] } },
          opened: { $sum: { $cond: [{ $gt: ['$openCount', 0] }, 1, 0] } },
          conversions: { $sum: { $cond: [{ $ne: ['$convertedAt', null] }, 1, 0] } }
        }
      }
    ]);

    const clickStats = await CommLog.aggregate([
      { $match: { campaignId: campaign._id, clickedVariant: { $in: ['A', 'B'] } } },
      {
        $group: {
          _id: '$clickedVariant',
          clicked: { $sum: 1 }
        }
      }
    ]);

    const clicksByVariant = { A: 0, B: 0 };
    for (const item of clickStats) {
      clicksByVariant[item._id] = item.clicked;
    }

    const byVariant = { A: null, B: null };
    for (const item of audienceStats) {
      if (!item._id) continue;
      const clicked = clicksByVariant[item._id] || 0;
      const openRate = item.sent ? Number(((item.opened / item.sent) * 100).toFixed(2)) : 0;
      const clickRate = item.sent ? Number(((clicked / item.sent) * 100).toFixed(2)) : 0;
      const conversionRate = item.sent ? Number(((item.conversions / item.sent) * 100).toFixed(2)) : 0;
      byVariant[item._id] = {
        total: item.total,
        sent: item.sent,
        failed: item.failed,
        pending: item.pending,
        opened: item.opened,
        clicked,
        conversions: item.conversions,
        openRate,
        clickRate,
        conversionRate
      };
    }

    const aClicks = clicksByVariant.A || 0;
    const bClicks = clicksByVariant.B || 0;
    let winner = null;
    if (aClicks !== bClicks) {
      winner = aClicks > bClicks ? 'A' : 'B';
    }

    res.json({
      success: true,
      campaign: {
        id: campaign._id,
        name: campaign.name,
        splitRatio: campaign.splitRatio,
        variantA: campaign.variantA,
        variantB: campaign.variantB,
        createdAt: campaign.createdAt
      },
      byVariant,
      winner,
      winnerBasis: 'clicks'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load comparator stats', error: err.message });
  }
});

router.post('/launch', async (req, res) => {
  if ((process.env.AB_TESTING_V1 || 'false').toLowerCase() !== 'true') {
    return res.status(403).json({ success: false, message: 'Campaign Comparator is disabled by feature flag' });
  }

  const { name, segmentId, variantA, variantB, splitRatio = 50, landingUrl } = req.body;
  if (!name || !segmentId || !variantA || !variantB) {
    return res.status(400).json({ success: false, message: 'name, segmentId, variantA and variantB are required' });
  }

  const ratio = Number(splitRatio);
  if (Number.isNaN(ratio) || ratio < 1 || ratio > 99) {
    return res.status(400).json({ success: false, message: 'splitRatio must be between 1 and 99' });
  }

  try {
    const segment = await Segment.findOne({ _id: segmentId, createdBy: req.user._id });
    if (!segment) {
      return res.status(404).json({ success: false, message: 'Segment not found' });
    }

    const mongoQuery = { ...buildMongoQuery(segment.rules), createdBy: req.user._id };
    const customers = await Customer.find(mongoQuery).select('email name');

    const campaign = await Campaign.create({
      name,
      message: '[Comparator] A/B experiment active',
      segmentId,
      customerCount: customers.length,
      status: 'sent',
      abEnabled: true,
      splitRatio: ratio,
      variantA,
      variantB,
      createdBy: req.user._id
    });

    const base = trackingBase();
    const safeRedirect = encodeURIComponent(landingUrl || process.env.FRONTEND_URL || 'https://example.com');

    const initialLogs = customers.map((customer) => {
      const trackingId = crypto.randomUUID();
      const variant = pickVariant(String(customer._id), String(campaign._id), ratio);
      return {
        campaignId: campaign._id,
        customerId: customer._id,
        trackingId,
        variant,
        status: 'PENDING',
        sentAt: null
      };
    });

    const insertedLogs = await CommLog.insertMany(initialLogs);

    const testRecipient = process.env.CAMPAIGN_TEST_RECIPIENT || null;
    const logsByCustomer = new Map(insertedLogs.map((log) => [String(log.customerId), log]));

    for (const customer of customers) {
      const log = logsByCustomer.get(String(customer._id));
      const openUrl = `${base}/api/track/open/${log.trackingId}`;
      const clickUrlA = `${base}/api/track/click/${log.trackingId}?variant=A&redirect=${safeRedirect}`;
      const clickUrlB = `${base}/api/track/click/${log.trackingId}?variant=B&redirect=${safeRedirect}`;

      if (deliveryMode() === 'real') {
        const result = await sendEmail(
          testRecipient || customer.email,
          `${name} [Variant A/B Demo]`,
          `Variant A:\n${variantA}\n\nVariant B:\n${variantB}`,
          { html: buildTrackedHtml(variantA, variantB, openUrl, clickUrlA, clickUrlB) }
        );

        await CommLog.updateOne(
          { _id: log._id },
          {
            $set: {
              status: result.success ? 'SENT' : 'FAILED',
              error: result.success ? null : (result.error || 'Email send failed'),
              sentAt: result.success ? new Date() : null
            }
          }
        );

        // Avoid provider throttle bursts during comparator fan-out sends.
        await new Promise((resolve) => setTimeout(resolve, resendDelayMs()));
      } else {
        const isSent = Math.random() < 0.9;
        await CommLog.updateOne(
          { _id: log._id },
          {
            $set: {
              status: isSent ? 'SENT' : 'FAILED',
              error: isSent ? null : 'Simulated delivery failure',
              sentAt: isSent ? new Date() : null
            }
          }
        );
      }
    }

    res.status(201).json({
      success: true,
      campaignId: campaign._id,
      sentTo: customers.length,
      message: 'Campaign Comparator experiment launched'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to launch comparator campaign', error: err.message });
  }
});

export default router;
