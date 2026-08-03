require('dotenv').config();
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { isMaintenanceEnabled } = require('../maintenance');

const JWT_SECRET = process.env.JWT_SECRET;

// Reachable by everyone during maintenance:
// - login (so admins/test accounts can sign in; the login route re-checks exemption)
// - me (so existing clients can detect maintenance and log out gracefully)
// - status (so logged-out visitors can be shown the maintenance dialog)
const PUBLIC_ALLOWLIST = new Set([
  '/api/auth/login',
  '/api/auth/me',
  '/api/maintenance/status',
]);

function decodeUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
  } catch {
    return null;
  }
}

// Lets an IN-PROGRESS quiz be finished during maintenance, but not a new one started.
// POST /api/session (new quiz) is intentionally NOT matched here → blocked.
function isQuizContinuation(req) {
  if (req.method === 'POST' && req.path === '/api/response') return true;
  if (req.method === 'GET' && /^\/api\/session\/[^/]+/.test(req.path)) return true;
  return false;
}

async function maintenanceGate(req, res, next) {
  try {
    const enabled = await isMaintenanceEnabled();
    if (!enabled) return next();

    // Exempt: admins (from token role) and test accounts (DB lookup, only while ON)
    const decoded = decodeUser(req);
    if (decoded) {
      if (decoded.role === 'admin') return next();
      try {
        const r = await pool.query('SELECT is_test_account FROM users WHERE id = $1', [decoded.id]);
        if (r.rows[0]?.is_test_account === true) return next();
      } catch (err) {
        console.error('Maintenance test-account check failed:', err);
      }
    }

    // Non-exempt: allow status/login/me and let an in-progress quiz finish
    if (PUBLIC_ALLOWLIST.has(req.path)) return next();
    if (isQuizContinuation(req)) return next();

    return res.status(503).json({
      error: 'The site is under maintenance. Please try again later.',
      maintenance: true,
    });
  } catch (err) {
    console.error('Maintenance gate error:', err);
    next(); // fail open so a gate error never locks everyone out
  }
}

module.exports = maintenanceGate;
