import express from 'express';
import { body, validationResult } from 'express-validator';
import Customer from '../models/Customer.js';
import authenticate from '../middleware/authenticate.js';
import multer from 'multer';
import { parse } from 'csv-parse/sync';

const router = express.Router();

router.use(authenticate);

// Multer setup for file upload
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/customers/import (CSV upload)
router.post('/import', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  try {
    const csvString = req.file.buffer.toString('utf-8');
    const records = parse(csvString, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    const requiredFields = ['name', 'email', 'phone', 'spend', 'visits', 'lastOrderDate'];
    const imported = [];
    const errors = [];
    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      // Validate required fields
      const missing = requiredFields.filter(f => !row[f] && row[f] !== 0);
      if (missing.length > 0) {
        errors.push({ row: i + 2, error: `Missing fields: ${missing.join(', ')}` });
        continue;
      }
      try {
        const customer = new Customer({
          name: row.name,
          email: row.email,
          phone: row.phone,
          spend: Number(row.spend),
          visits: Number(row.visits),
          lastOrderDate: new Date(row.lastOrderDate),
          createdBy: req.user._id
        });
        await customer.save();
        imported.push(customer.email);
      } catch (err) {
        errors.push({ row: i + 2, error: err.message });
      }
    }
    res.json({ success: true, importedCount: imported.length, imported, errors });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to import customers', error: err.message });
  }
});

// POST /api/customers
router.post(
  '/',
  [
    body('name').isLength({ min: 1 }).withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('spend').optional().isNumeric(),
    body('visits').optional().isInt({ min: 0 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    try {
      const cust = new Customer({ ...req.body, createdBy: req.user._id });
      await cust.save();
      res.status(201).json(cust);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// GET /api/customers (list)
router.get('/', async (req, res) => {
  const list = await Customer.find({ createdBy: req.user._id }).sort('-createdAt');
  res.json(list);
});

export default router;
