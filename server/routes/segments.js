// server/routes/segments.js
import express from 'express';
import { buildMongoQuery, validateQuery } from '../utils/queryBuilder.js';
import Customer from '../models/Customer.js';
import Segment from '../models/Segment.js';
import authenticate from '../middleware/authenticate.js';

const router = express.Router();

router.use(authenticate);

/**
 * Preview a segment based on query rules
 * Returns count and sample data
 */
router.post('/preview', async (req, res) => {
  try {
    const { rules } = req.body;
    
    // Validate the rules
    const validationErrors = validateQuery(rules);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query rules',
        errors: validationErrors
      });
    }
    
    // Build MongoDB query
    const mongoQuery = { ...buildMongoQuery(rules), createdBy: req.user._id };
    
    // Get count and sample customers
    const count = await Customer.countDocuments(mongoQuery);
    
    // Get a sample of matching customers (limit to 10)
    const sample = await Customer.find(mongoQuery)
      .select('name email spend visits lastOrderDate')
      .sort({ lastOrderDate: -1 })
      .limit(10);
    
    res.json({
      success: true,
      count,
      sample
    });
  } catch (err) {
    console.error('Segment preview error:', err);
    res.status(500).json({
      success: false,
      message: 'Error generating segment preview',
      error: err.message
    });
  }
});

/**
 * Save a segment
 */
router.post('/', async (req, res) => {
  try {
    const { name, rules } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Segment name is required'
      });
    }
    
    // Validate the rules
    const validationErrors = validateQuery(rules);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query rules',
        errors: validationErrors
      });
    }
    
    // Check if segment name already exists for this user
    const existingSegment = await Segment.findOne({ name: name.trim(), createdBy: req.user._id });
    if (existingSegment) {
      return res.status(400).json({
        success: false,
        message: 'A segment with this name already exists'
      });
    }
    
    // Build MongoDB query for reference (do NOT include createdBy)
    const mongoQuery = buildMongoQuery(rules);
    
    // Create new segment
    const segment = new Segment({
      name: name.trim(),
      rules,
      mongoQuery, // Store the compiled query for reference (without createdBy)
      createdBy: req.user._id,
      createdAt: new Date(),
      lastRun: null,
      customerCount: null
    });
    
    await segment.save();
    
    // Get initial count (ALWAYS include createdBy)
    const count = await Customer.countDocuments({ ...mongoQuery, createdBy: req.user._id });
    
    // Update segment with count
    segment.customerCount = count;
    segment.lastRun = new Date();
    await segment.save();
    
    res.status(201).json({
      success: true,
      message: 'Segment created successfully',
      segment: {
        id: segment._id,
        name: segment.name,
        customerCount: segment.customerCount,
        createdAt: segment.createdAt
      }
    });
  } catch (err) {
    console.error('Segment creation error:', err);
    res.status(500).json({
      success: false,
      message: 'Error creating segment',
      error: err.message
    });
  }
});

/**
 * Get all segments
 */
router.get('/', async (req, res) => {
  try {
    const segments = await Segment.find({ createdBy: req.user._id })
      .select('name customerCount createdAt lastRun rules')
      .sort({ createdAt: -1 });

    // Recalculate and update customerCount for each segment
    for (const segment of segments) {
      const mongoQuery = buildMongoQuery(segment.rules);
      const count = await Customer.countDocuments({ ...mongoQuery, createdBy: req.user._id });
      if (segment.customerCount !== count) {
        segment.customerCount = count;
        segment.lastRun = new Date();
        await segment.save();
      }
    }

    res.json({
      success: true,
      segments
    });
  } catch (err) {
    console.error('Get segments error:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching segments',
      error: err.message
    });
  }
});

/**
 * Get a single segment by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const segment = await Segment.findOne({ _id: req.params.id, createdBy: req.user._id });
    
    if (!segment) {
      return res.status(404).json({
        success: false,
        message: 'Segment not found'
      });
    }
    
    res.json({
      success: true,
      segment
    });
  } catch (err) {
    console.error('Get segment error:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching segment',
      error: err.message
    });
  }
});

/**
 * Delete a segment by ID
 */
router.delete('/:id', async (req, res) => {
  try {
    const segment = await Segment.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!segment) {
      return res.status(404).json({ success: false, message: 'Segment not found' });
    }
    res.json({ success: true, message: 'Segment deleted' });
  } catch (err) {
    console.error('Delete segment error:', err);
    res.status(500).json({ success: false, message: 'Error deleting segment', error: err.message });
  }
});

export default router;