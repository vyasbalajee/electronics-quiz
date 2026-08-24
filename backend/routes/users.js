const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const multer = require('multer');
const csv = require('csv-parse/sync');
const pool = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logAction } = require('../auditLog');
const { sendInviteEmail } = require('../email');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const uploadCsv = multer({ storage: multer.memoryStorage() });

// The person's name goes in the username column, which is unique — so append
// " (2)", " (3)" ... on collision. Login is by email, so this is just a label.
async function uniqueUsername(name) {
  const base = name.trim();
  let candidate = base;
  let n = 2;
  // Cap the loop defensively
  for (let i = 0; i < 10000; i++) {
    const r = await pool.query('SELECT 1 FROM users WHERE username = $1', [candidate]);
    if (r.rows.length === 0) return candidate;
    candidate = `${base} (${n++})`;
  }
  // Extremely unlikely fallback
  return `${base} (${crypto.randomBytes(3).toString('hex')})`;
}

// Create one provisioned account (unverified, random unusable password) + invite.
// Returns { username } on success, or throws with a message.
async function provisionOne(name, email, actorId) {
  if (!name || !email) throw new Error('Name and email are required');
  if (!EMAIL_RE.test(email)) throw new Error('Invalid email address');

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) throw new Error('A user with that email already exists');

  const username = await uniqueUsername(name);
  const randomPassword = crypto.randomBytes(32).toString('hex');
  const password_hash = await bcrypt.hash(randomPassword, 12);

  await pool.query(
    `INSERT INTO users (username, email, password_hash, role, email_verified)
     VALUES ($1, $2, $3, 'student', FALSE)`,
    [username, email, password_hash]
  );

  await sendInviteEmail(email, name);
  await logAction(actorId, 'provision_user', 'user', null, { username, email });
  return { username };
}

// POST /api/users/provision — instructor/admin, create a single account
router.post('/provision', requireAuth, requireRole('admin', 'instructor'), async (req, res) => {
  try {
    const name = (req.body?.name || '').trim();
    const email = (req.body?.email || '').trim();
    const result = await provisionOne(name, email, req.user.id);
    res.status(201).json({ success: true, username: result.username, email });
  } catch (err) {
    // Known validation/dupe errors -> 400/409; anything else -> 500
    const msg = err.message || 'Failed to create account';
    const code = /already exists/.test(msg) ? 409 : /required|Invalid email/.test(msg) ? 400 : 500;
    if (code === 500) console.error(err);
    res.status(code).json({ error: msg });
  }
});

// POST /api/users/provision-bulk — instructor/admin, create many from a CSV (columns: name, email)
router.post(
  '/provision-bulk',
  requireAuth,
  requireRole('admin', 'instructor'),
  uploadCsv.single('csvFile'),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No CSV file uploaded' });

      let records;
      try {
        records = csv.parse(req.file.buffer, { columns: true, bom: true, skip_empty_lines: true, trim: true });
      } catch (e) {
        return res.status(400).json({ error: 'Could not parse the CSV file' });
      }

      const cols = Object.keys(records[0] || {});
      if (!cols.includes('name') || !cols.includes('email')) {
        return res.status(400).json({ error: "CSV must have 'name' and 'email' columns" });
      }

      const created = [];
      const errors = [];
      for (const row of records) {
        const name = (row.name || '').trim();
        const email = (row.email || '').trim();
        try {
          const { username } = await provisionOne(name, email, req.user.id);
          created.push({ name: username, email });
        } catch (err) {
          errors.push(`${email || '(no email)'}: ${err.message}`);
        }
      }

      res.json({ success: true, created: created.length, errors: errors.length ? errors : undefined });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Bulk provisioning failed' });
    }
  }
);

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
