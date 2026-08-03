const pool = require('./db');

// Short in-memory cache so we don't hit the DB on every request.
// The flag itself lives in the DB (survives deploys/restarts); this only caches reads.
let cache = { value: false, at: 0 };
const TTL_MS = 3000;

async function isMaintenanceEnabled() {
  if (Date.now() - cache.at < TTL_MS) return cache.value;
  try {
    const r = await pool.query('SELECT enabled FROM maintenance WHERE id = 1');
    cache = { value: r.rows[0]?.enabled === true, at: Date.now() };
  } catch (err) {
    // Fail open: if we can't read the flag, do NOT trap users out.
    console.error('Maintenance flag read failed:', err);
  }
  return cache.value;
}

// Call after an admin toggles the flag so the change takes effect immediately.
function clearMaintenanceCache() {
  cache.at = 0;
}

module.exports = { isMaintenanceEnabled, clearMaintenanceCache };
