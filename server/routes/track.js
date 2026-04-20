import express from 'express';
import CommLog from '../models/CommunicationLog.js';

const router = express.Router();

const PIXEL_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
  'base64'
);

router.get('/open/:trackingId', async (req, res) => {
  try {
    const { trackingId } = req.params;
    await CommLog.updateOne(
      { trackingId },
      {
        $set: { openedAt: new Date() },
        $inc: { openCount: 1 }
      }
    );
  } catch (err) {
    console.error('Open tracking error:', err.message);
  }

  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  return res.status(200).send(PIXEL_GIF);
});

router.get('/click/:trackingId', async (req, res) => {
  const redirect = req.query.redirect || process.env.FRONTEND_URL || '/';
  const rawVariant = String(req.query.variant || '').toUpperCase();
  const clickedVariant = rawVariant === 'A' || rawVariant === 'B' ? rawVariant : null;

  try {
    const { trackingId } = req.params;
    const update = {
      $set: { clickedAt: new Date() },
      $inc: { clickCount: 1 }
    };
    if (clickedVariant) {
      update.$set.clickedVariant = clickedVariant;
    }

    await CommLog.updateOne(
      { trackingId },
      update
    );
  } catch (err) {
    console.error('Click tracking error:', err.message);
  }

  return res.redirect(302, redirect);
});

export default router;
