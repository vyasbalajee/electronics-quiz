const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { logAction } = require('../auditLog');
const { isMaintenanceEnabled, clearMaintenanceCache } = require('../maintenance');

// GET /api/maintenance/status — PUBLIC, so the frontend can show the dialog to anyone
router.get('/status', async (req, res) => {
  try {
    const enabled = await isMaintenanceEnabled();
    res.json({ enabled });
  } catch (err) {
    console.error(err);
    res.json({ enabled: false });
  }
});

// POST /api/maintenance — admin only, toggle maintenance on/off
router.post('/', requireAuth, requirePermission('maintenance.manage'), async (req, res) => {
  try {
    const enabled = req.body?.enabled === true;
    await pool.query(
      `UPDATE maintenance SET enabled = $1, set_by = $2, set_at = NOW() WHERE id = 1`,
      [enabled, req.user.id]
    );
    clearMaintenanceCache();
    await logAction(req.user.id, enabled ? 'maintenance_on' : 'maintenance_off', 'system', 1, {});
    res.json({ enabled });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update maintenance mode' });
  }
});

module.exports = router;
