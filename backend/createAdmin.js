require('dotenv').config();
const pool = require('./db');
const bcrypt = require('bcrypt');

async function createAdmin() {
  try {
    const username = process.env.ADMIN_USERNAME;
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!username || !email || !password) {
      console.error('ADMIN_USERNAME, ADMIN_EMAIL and ADMIN_PASSWORD must be set in environment variables');
      process.exit(1);
    }

    if (password.length < 8) {
      console.error('Password must be at least 8 characters.');
      process.exit(1);
    }

    const password_hash = await bcrypt.hash(password, 12);

    await pool.query(
      `INSERT INTO users (username, email, password_hash, role)
       VALUES ($1, $2, $3, 'admin')
       ON CONFLICT (username) DO UPDATE SET password_hash = $3, role = 'admin'`,
      [username, email, password_hash]
    );

    console.log(`Admin account created: ${username} (${email})`);
    process.exit(0);
  } catch (err) {
    console.error('Failed to create admin:', err);
    process.exit(1);
  }
}

createAdmin();
