require('dotenv').config();
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { sendOTPEmail, generateOTP } = require('../email');
const { loginLimiter, registerLimiter, otpLimiter } = require('../middleware/rateLimiter');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '7d';

// POST /api/auth/register
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password)
      return res.status(400).json({ error: 'Username, email and password are required' });
    if (password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    if (username.length < 3)
      return res.status(400).json({ error: 'Username must be at least 3 characters' });

    const existing = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );
    if (existing.rows.length > 0)
      return res.status(409).json({ error: 'Username or email already taken' });

    const password_hash = await bcrypt.hash(password, 12);
    await pool.query(
      `INSERT INTO users (username, email, password_hash, role, email_verified)
       VALUES ($1, $2, $3, 'student', FALSE)`,
      [username, email, password_hash]
    );

    // Send verification OTP
    const otp = generateOTP();
    const expires_at = new Date(Date.now() + 10 * 60 * 1000);
    await pool.query(
      `INSERT INTO otps (email, otp, type, expires_at) VALUES ($1, $2, 'email_verification', $3)`,
      [email, otp, expires_at]
    );
    await sendOTPEmail(email, otp, 'email_verification');

    res.status(201).json({ message: 'Registration successful. Check your email for the verification code.', email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/verify-email
router.post('/verify-email', async (req, res) => {
  try {
    const { email, otp } = req.body;

    const result = await pool.query(
      `SELECT * FROM otps 
       WHERE email = $1 AND otp = $2 AND type = 'email_verification' 
       AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email, otp]
    );

    if (result.rows.length === 0)
      return res.status(400).json({ error: 'Invalid or expired code' });

    await pool.query('UPDATE otps SET used = TRUE WHERE id = $1', [result.rows[0].id]);
    await pool.query('UPDATE users SET email_verified = TRUE WHERE email = $1', [email]);

    const userResult = await pool.query(
      'SELECT id, username, email, role FROM users WHERE email = $1', [email]
    );
    const user = userResult.rows[0];
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// POST /api/auth/resend-verification
router.post('/resend-verification', otpLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND email_verified = FALSE', [email]
    );
    if (userResult.rows.length === 0)
      return res.status(400).json({ error: 'Email not found or already verified' });

    const otp = generateOTP();
    const expires_at = new Date(Date.now() + 10 * 60 * 1000);
    await pool.query(
      `INSERT INTO otps (email, otp, type, expires_at) VALUES ($1, $2, 'email_verification', $3)`,
      [email, otp, expires_at]
    );
    await sendOTPEmail(email, otp, 'email_verification');
    res.json({ message: 'Verification code resent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to resend code' });
  }
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'Username and password are required' });

    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0)
      return res.status(401).json({ error: 'Invalid username or password' });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ error: 'Invalid username or password' });

    if (!user.email_verified)
      return res.status(403).json({ error: 'Email not verified', email: user.email, requiresVerification: true });

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', otpLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    // Always return success to prevent email enumeration
    if (result.rows.length === 0)
      return res.json({ message: 'If that email exists, a reset code has been sent.' });

    const otp = generateOTP();
    const expires_at = new Date(Date.now() + 10 * 60 * 1000);
    await pool.query(
      `INSERT INTO otps (email, otp, type, expires_at) VALUES ($1, $2, 'password_reset', $3)`,
      [email, otp, expires_at]
    );
    await sendOTPEmail(email, otp, 'password_reset');
    res.json({ message: 'If that email exists, a reset code has been sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send reset code' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword)
      return res.status(400).json({ error: 'Email, OTP and new password are required' });
    if (newPassword.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const result = await pool.query(
      `SELECT * FROM otps 
       WHERE email = $1 AND otp = $2 AND type = 'password_reset'
       AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email, otp]
    );

    if (result.rows.length === 0)
      return res.status(400).json({ error: 'Invalid or expired code' });

    await pool.query('UPDATE otps SET used = TRUE WHERE id = $1', [result.rows[0].id]);
    const password_hash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [password_hash, email]);

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer '))
      return res.status(401).json({ error: 'No token provided' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const result = await pool.query(
      'SELECT id, username, email, role FROM users WHERE id = $1', [decoded.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'User not found' });

    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

module.exports = router;
