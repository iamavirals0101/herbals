import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import swaggerUI from 'swagger-ui-express';
import YAML from 'yamljs';
import passport from 'passport';
import authRoutes from './routes/auth.js';

import customerRoutes from './routes/customers.js';
import orderRoutes from './routes/orders.js';
import geminiRoutes from './routes/gemini.js';
import segmentRoutes from './routes/segments.js';
import campaignRoutes from './routes/campaigns.js';
import analyticsRoutes from './routes/analytics.js';
import vendorRoutes from './routes/vendor.js';
import comparatorRoutes from './routes/comparator.js';
import trackRoutes from './routes/track.js';

dotenv.config();
const app = express();

// Middlewares
const defaultOrigins = [
  'http://localhost:5173'
];

if (process.env.FRONTEND_URL) {
  defaultOrigins.push(process.env.FRONTEND_URL);
}

const envOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Keep origin values unique so CORS checks stay deterministic across local and deployed environments.
const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());
app.use(passport.initialize());

// Swagger setup
const swaggerDoc = YAML.load('./docs/swagger.yaml');
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDoc));

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/gemini', geminiRoutes);
app.use('/api/segments', segmentRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/comparator', comparatorRoutes);
app.use('/api/track', trackRoutes);

// Health-check
app.get('/', (req, res) => res.send('Herbal CRM API is running'));

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('✔️ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
