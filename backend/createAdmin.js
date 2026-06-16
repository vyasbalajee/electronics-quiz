require('dotenv').config();
const pool = require('./db');
const bcrypt = require('bcrypt');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function createAdmin() {
  try {
    const username = process.env.ADMIN_USERNAME;
    const email = process.env.ADMIN_EMAIL;

    if (!username || !email) {
      console.error('ADMIN_USERNAME and ADMIN_EMAIL must be set in .env');
      process.exit(1);
    }

    rl.question('Enter admin password: ', async (password) => {
      rl.close();

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
    });
  } catch (err) {
    console.error('Failed to create admin:', err);
    process.exit(1);
  }
}

createAdmin();
