import '../config.js';
import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { OAuth2Client } from 'google-auth-library';
import { GOOGLE_CLIENT_ID, JWT_SECRET } from '../config.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendEmail } from '../utils/emailService.js';

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// POST /api/auth/google (token-based, for SPA)
router.post('/google', async (req, res) => {
  const { tokenId } = req.body;
  try {
    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: tokenId,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    let user = await User.findOne({ googleId: payload.sub });
    if (!user) {
      // If not found by Google ID, try to find by Email
      user = await User.findOne({ email: payload.email });
      console.log('Existing user found by Email:', user ? 'Yes' : 'No');

      if (user) {
        // User exists with this email but no Google ID. Link them!
        user.googleId = payload.sub;
        if (!user.isVerified) user.isVerified = true;
        await user.save();
        console.log('Linked Google account to existing user by email');
      } else {
        // Create brand new user
        user = await User.create({
          googleId: payload.sub,
          name: payload.name,
          email: payload.email,
          role: 'user',
          isVerified: true
        });
        console.log('Created new user via Google Auth');
      }
    } else if (!user.isVerified) {
      user.isVerified = true;
      await user.save();
    }
    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(401).json({ message: 'Google auth failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  try {
    const user = await User.findOne({ email });
    if (!user || !user.password) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    if (!user.isVerified) {
      return res.status(403).json({ message: 'Email not verified. Please check your inbox.' });
    }
    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  console.log(`--- Registration (OTP/Verify) Request for: ${email} ---`);
  if (!name || !email || !password) {
    console.log('Registration error: Missing fields');
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }
  try {
    const existing = await User.findOne({ email });
    if (existing) {
      console.log('Registration error: Email already registered');
      return res.status(400).json({ message: 'Email already registered' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const user = await User.create({
      name,
      email,
      password: hashed,
      role: 'user',
      isVerified: false,
      verificationToken
    });
    // Send verification email
    const verifyUrl = `${FRONTEND_URL}/verify-email?token=${verificationToken}`;
    console.log(`Prepared verification (OTP) link: ${verifyUrl}`);
    const emailResult = await sendEmail(
      user.email,
      'Verify your Herbal CRM account',
      `Hi ${user.name},\n\nPlease verify your email by clicking the link below:\n${verifyUrl}\n\nIf you did not sign up, you can ignore this email.`
    );
    console.log('Send email result: ', emailResult);
    res.status(201).json({ message: 'Registration successful. Please check your email to verify your account.' });
  } catch (err) {
    console.error('*** Registration Error ***:', err);
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
});

// GET /api/auth/verify-email?token=...
router.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ message: 'Verification token is required' });
  try {
    const user = await User.findOne({ verificationToken: token });
    if (user && !user.isVerified) {
      user.isVerified = true;
      user.verificationToken = undefined;
      await user.save();
      console.log('User successfully verified:', user.email);
    }
    // Always return success, even if already verified or token is invalid/expired
    return res.status(200).json({ message: 'Email verified successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Verification failed', error: err.message });
  }
});

// POST /api/auth/resend-verification
router.post('/resend-verification', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ message: 'Email already verified' });
    user.verificationToken = crypto.randomBytes(32).toString('hex');
    await user.save();
    const verifyUrl = `${FRONTEND_URL}/verify-email?token=${user.verificationToken}`;
    await sendEmail(
      user.email,
      'Verify your Herbal CRM account',
      `Hi ${user.name},\n\nPlease verify your email by clicking the link below:\n${verifyUrl}\n\nIf you did not sign up, you can ignore this email.`
    );
    res.json({ message: 'Verification email resent' });
  } catch (err) {
    res.status(500).json({ message: 'Resend failed', error: err.message });
  }
});

// POST /api/auth/request-reset
router.post('/request-reset', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'User not found' });
    user.resetPasswordToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordExpires = Date.now() + 1000 * 60 * 60; // 1 hour
    await user.save();
    const resetUrl = `${FRONTEND_URL}/reset-password?token=${user.resetPasswordToken}`;
    await sendEmail(
      user.email,
      'Reset your Herbal CRM password',
      `Hi ${user.name},\n\nYou requested a password reset. Click the link below to set a new password:\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`
    );
    res.json({ message: 'Password reset email sent' });
  } catch (err) {
    res.status(500).json({ message: 'Reset request failed', error: err.message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ message: 'Token and new password are required' });
  try {
    const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ message: 'Invalid or expired reset token' });
    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ message: 'Password reset failed', error: err.message });
  }
});

export default router; 
