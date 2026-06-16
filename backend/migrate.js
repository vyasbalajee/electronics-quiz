require('dotenv').config();
const pool = require('./db');

async function migrate() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'instructor', 'student')),
        created_at TIMESTAMP DEFAULT NOW()
      );

      ALTER TABLE quiz_sessions 
        ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);
    `);

    console.log('Migration complete.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
