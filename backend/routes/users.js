const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

// GET /api/users — admin only, list all users
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ users: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PATCH /api/users/:id/role — admin only, change a user's role
router.patch('/:id/role', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['admin', 'instructor', 'student'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Prevent admin from demoting themselves
    if (parseInt(id) === req.user.id && role !== 'admin') {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, email, role',
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// DELETE /api/users/:id — admin only
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
