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
        email_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

      ALTER TABLE quiz_sessions 
        ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);

      ALTER TABLE responses
        ADD COLUMN IF NOT EXISTS time_taken_seconds INTEGER;

      ALTER TABLE questions
        ADD COLUMN IF NOT EXISTS video_url TEXT;

      ALTER TABLE questions
        ADD COLUMN IF NOT EXISTS time_limit_seconds INTEGER;

      ALTER TABLE questions
        ADD COLUMN IF NOT EXISTS difficulty INTEGER CHECK (difficulty IS NULL OR (difficulty >= 1 AND difficulty <= 10));

      CREATE TABLE IF NOT EXISTS topics (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS question_topics (
        question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
        topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
        PRIMARY KEY (question_id, topic_id)
      );

      CREATE TABLE IF NOT EXISTS otps (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        otp TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('email_verification', 'password_reset')),
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_test_account BOOLEAN DEFAULT FALSE;

      ALTER TABLE quiz_sessions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed'));

      ALTER TABLE quiz_sessions ADD COLUMN IF NOT EXISTS is_preview BOOLEAN DEFAULT FALSE;

      ALTER TABLE quiz_sessions ADD COLUMN IF NOT EXISTS is_preview BOOLEAN DEFAULT FALSE;

      CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id INTEGER,
        details JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Ensure timestamp columns are timezone-aware (idempotent)
      ALTER TABLE audit_log ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
      ALTER TABLE quiz_sessions ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
      ALTER TABLE responses ALTER COLUMN answered_at TYPE TIMESTAMPTZ USING answered_at AT TIME ZONE 'UTC';
      ALTER TABLE users ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
    `);

    console.log('Migration complete.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
