const pool = require('./db');

/**
 * Log an admin/instructor action
 * @param {number} userId - who performed the action
 * @param {string} action - short description e.g. 'edit_question', 'delete_user'
 * @param {string} targetType - 'question' | 'user' | 'topic'
 * @param {number} targetId - id of the affected record
 * @param {object} details - any extra info (before/after values etc)
 */
async function logAction(userId, action, targetType, targetId, details = {}) {
  try {
    await pool.query(
      `INSERT INTO audit_log (user_id, action, target_type, target_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, action, targetType, targetId, JSON.stringify(details)]
    );
  } catch (err) {
    // Never let audit logging break the actual request
    console.error('Audit log failed:', err);
  }
}

module.exports = { logAction };
