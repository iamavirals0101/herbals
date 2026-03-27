import express from 'express';
import { body, validationResult } from 'express-validator';
import Order from '../models/Order.js';
import Customer from '../models/Customer.js';
import authenticate from '../middleware/authenticate.js';

const router = express.Router();

router.use(authenticate);

// POST /api/orders
router.post(
  '/',
  [
    body('customerId').isMongoId().withMessage('Valid customerId required'),
    body('amount').isNumeric().withMessage('Amount must be a number'),
    body('items').isArray({ min: 1 }).withMessage('At least one item'),
    body('items.*.name').notEmpty(),
    body('items.*.qty').isInt({ min: 1 }),
    body('items.*.price').isNumeric(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    try {
      // Ensure customer exists
      const cust = await Customer.findOne({ _id: req.body.customerId, createdBy: req.user._id });
      if (!cust) return res.status(404).json({ error: 'Customer not found' });

      const order = new Order({ ...req.body, createdBy: req.user._id });
      await order.save();

      // Update customer stats
      cust.spend += order.amount;
      cust.visits += 1;
      cust.lastOrderDate = order.orderDate;
      await cust.save();

      res.status(201).json(order);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// GET /api/orders
router.get('/', async (req, res) => {
  const list = await Order.find({ createdBy: req.user._id }).sort('-createdAt');
  res.json(list);
});

export default router;
