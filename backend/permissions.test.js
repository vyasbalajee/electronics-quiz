// Unit tests for the permission model (backend/permissions.js).
//
// These cover the access-control logic the whole app relies on: role presets,
// what counts as a valid permission, the privilege-escalation guard, and how
// per-user overrides combine with a preset. getEffectivePermissions talks to the
// database, so we mock the db module to test the merge logic in isolation.

// Mock the pg pool BEFORE requiring permissions.js (which requires ./db at load).
jest.mock('./db', () => ({ query: jest.fn() }));
const pool = require('./db');

const {
  presetPermissions,
  isValidPermission,
  isCodeLocked,
  getEffectivePermissions,
  ALL_PERMISSIONS,
} = require('./permissions');

describe('presetPermissions', () => {
  test('admin gets every permission', () => {
    expect(presetPermissions('admin')).toEqual(ALL_PERMISSIONS);
  });

  test('student can only take quizzes', () => {
    expect(presetPermissions('student')).toEqual(['quizzes.take]);
  });

  test('an unknown role gets no permissions', () => {
    expect(presetPermissions('nobody')).toEqual([]);
  });
});

describe('isValidPermission', () => {
  test('accepts a real permission', () => {
    expect(isValidPermission('questions.edit')).toBe(true);
  });

  test('rejects a made-up permission', () => {
    expect(isValidPermission('questions.hack')).toBe(false);
  });
});

describe('isCodeLocked (privilege-escalation guard)', () => {
  test('users.manage_permissions is code-locked', () => {
    expect(isCodeLocked('users.manage_permissions')).toBe(true);
  });

  test('an ordinary permission is not code-locked', () => {
    expect(isCodeLocked('quizzes.take')).toBe(false);
  });
});

describe('getEffectivePermissions (preset + overrides)', () => {
  afterEach(() => jest.clearAllMocks());

  test('a granted override adds a permission beyond the preset', async () => {
    pool.query.mockResolvedValue({
      rows: [{ permission: 'analytics.view', granted: true }],
    });
    const eff = await getEffectivePermissions(1, 'student');
    expect(eff.has('quizzes.take')).toBe(true);     // from the student preset
    expect(eff.has('analytics.view')).toBe(true);   // added by the override
  });

  test('a revoked override removes a preset permission', async () => {
    pool.query.mockResolvedValue({
      rows: [{ permission: 'quizzes.take', granted: false }],
    });
    const eff = await getEffectivePermissions(2, 'student');
    expect(eff.has('quizzes.take')).toBe(false);    // revoked for this user
  });
});
