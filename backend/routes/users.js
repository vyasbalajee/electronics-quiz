const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logAction } = require('../auditLog');

// GET /api/users — admin only, list all users
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, role, email_verified, is_test_account, created_at FROM users ORDER BY created_at DESC'
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

    if (parseInt(id) === req.user.id && role !== 'admin') {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    const before = await pool.query('SELECT role FROM users WHERE id = $1', [id]);

    // Safeguard: prevent demoting the last admin
    if (before.rows[0]?.role === 'admin' && role !== 'admin') {
      const adminCount = await pool.query(
        "SELECT COUNT(*) as count FROM users WHERE role = 'admin'"
      );
      if (parseInt(adminCount.rows[0].count) <= 1) {
        return res.status(400).json({ error: 'Cannot demote the last admin. Promote another user to admin first.' });
      }
    }

    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, email, role',
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await logAction(req.user.id, 'change_role', 'user', id, {
      from: before.rows[0]?.role,
      to: role,
      username: result.rows[0].username,
    });

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// PATCH /api/users/:id/test-flag — admin only, toggle test account status
router.patch('/:id/test-flag', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { is_test_account } = req.body;

    const result = await pool.query(
      'UPDATE users SET is_test_account = $1 WHERE id = $2 RETURNING id, username, is_test_account',
      [!!is_test_account, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await logAction(req.user.id, 'toggle_test_account', 'user', id, {
      is_test_account: !!is_test_account,
      username: result.rows[0].username,
    });

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update test account flag' });
  }
});

// DELETE /api/users/:id — admin only
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const userResult = await pool.query('SELECT username, role FROM users WHERE id = $1', [id]);

    // Safeguard: prevent deleting the last admin
    if (userResult.rows[0]?.role === 'admin') {
      const adminCount = await pool.query(
        "SELECT COUNT(*) as count FROM users WHERE role = 'admin'"
      );
      if (parseInt(adminCount.rows[0].count) <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last admin. Promote another user to admin first.' });
      }
    }

    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    await logAction(req.user.id, 'delete_user', 'user', id, {
      username: userResult.rows[0]?.username,
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
