// Central permission model.
//
// Leaf permissions are the ONLY things enforced. Categories are just for grouping
// in the admin UI. Presets (role -> leaves) are fixed here in code. Per-user
// deviations live in the user_permission_overrides table and are applied on top
// of the preset at check time.

const pool = require('./db');

// Categories -> leaf permissions (categories are display-only)
const CATEGORIES = {
  Users: ['users.view', 'users.provision', 'users.change_role', 'users.delete', 'users.manage_permissions'],
  Questions: ['questions.upload', 'questions.edit', 'questions.delete'],
  Topics: ['topics.create', 'topics.edit', 'topics.delete'],
  Analytics: ['analytics.view', 'students.view'],
  Site: ['maintenance.manage', 'audit.view'],
  Quizzes: ['quizzes.take'],
};

// Flat set of every valid permission
const ALL_PERMISSIONS = Object.values(CATEGORIES).flat();

// Permissions that can NEVER be granted or revoked via the API/UI — only in code.
// This is the privilege-escalation guard: no UI action can mint a permissions-admin.
const CODE_LOCKED = ['users.manage_permissions'];

// Fixed presets. Admin = full master control.
const PRESETS = {
  admin: [...ALL_PERMISSIONS],
  instructor: [
    'users.provision',
    'questions.upload', 'questions.edit', 'questions.delete',
    'topics.create', 'topics.edit', 'topics.delete',
    'analytics.view', 'students.view',
    'quizzes.take',
  ],
  student: ['quizzes.take'],
};

function presetPermissions(role) {
  return PRESETS[role] || [];
}

function isValidPermission(p) {
  return ALL_PERMISSIONS.includes(p);
}

function isCodeLocked(p) {
  return CODE_LOCKED.includes(p);
}

// Effective permissions for a user = their preset, plus per-user grants,
// minus per-user revokes. Returns a Set of permission strings.
async function getEffectivePermissions(userId, role) {
  const effective = new Set(presetPermissions(role));
  const { rows } = await pool.query(
    'SELECT permission, granted FROM user_permission_overrides WHERE user_id = $1',
    [userId]
  );
  for (const r of rows) {
    if (r.granted) effective.add(r.permission);
    else effective.delete(r.permission);
  }
  return effective;
}

module.exports = {
  CATEGORIES,
  ALL_PERMISSIONS,
  CODE_LOCKED,
  PRESETS,
  presetPermissions,
  isValidPermission,
  isCodeLocked,
  getEffectivePermissions,
};
