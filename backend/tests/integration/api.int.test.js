// Integration tests: exercise the real Express app and a real PostgreSQL
// database over HTTP (supertest). These run in CI against a throwaway Postgres
// service that has been migrated with migrate.js. They do NOT mock the DB — the
// point is to catch wiring bugs the unit tests can't (routing, auth middleware,
// permission gating, SQL).
//
// External services (Cloudinary, Resend email) are never called here; we seed a
// pre-verified user directly in the DB and test the paths that don't need them.

const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../../index');   // exports the app without listening
const pool = require('../../db');

const STUDENT = {
  username: 'itest_student',
  email: 'itest_student@example.com',
  password: 'Test!2345',
  role: 'student',
};

beforeAll(async () => {
  // Clean any leftover from a previous run, then seed a verified student.
  await pool.query('DELETE FROM users WHERE email = $1', [STUDENT.email]);
  const hash = await bcrypt.hash(STUDENT.password, 10);
  await pool.query(
    `INSERT INTO users (username, email, password_hash, role, email_verified)
     VALUES ($1, $2, $3, $4, TRUE)`,
    [STUDENT.username, STUDENT.email, hash, STUDENT.role]
  );
});

afterAll(async () => {
  await pool.query('DELETE FROM users WHERE email = $1', [STUDENT.email]);
  await pool.end();
});

describe('POST /api/auth/login', () => {
  test('logs in a verified user and returns a token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: STUDENT.username, password: STUDENT.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toMatchObject({ username: STUDENT.username, role: 'student' });
  });

  test('rejects a wrong password with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: STUDENT.username, password: 'wrong-password' });
    expect(res.status).toBe(401);
  });
});

describe('authenticated + permission-gated routes', () => {
  let token;
  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: STUDENT.username, password: STUDENT.password });
    token = res.body.token;
  });

  test('GET /api/auth/me returns the current user with a valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ username: STUDENT.username });
  });

  test('a student is blocked (403) from an admin-only route', async () => {
    const res = await request(app)
      .get('/api/users')                       // requires users.view (admin only)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('a request with no token is rejected (401)', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
