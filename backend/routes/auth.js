require('dotenv').config();
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '7d';

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    // Check if username or email already exists
    const existing = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Username or email already taken' });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, role)
       VALUES ($1, $2, $3, 'student')
       RETURNING id, username, email, role`,
      [username, email, password_hash]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me — verify token and return current user
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const jwt_module = require('jsonwebtoken');
    const decoded = jwt_module.verify(token, JWT_SECRET);

    const result = await pool.query(
      'SELECT id, username, email, role FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

module.exports = router;
