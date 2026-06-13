const pool = require('./db');

async function seed() {
  try {
    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id SERIAL PRIMARY KEY,
        image_filename TEXT NOT NULL,
        option_a TEXT NOT NULL,
        option_b TEXT NOT NULL,
        option_c TEXT NOT NULL,
        option_d TEXT NOT NULL,
        option_e TEXT NOT NULL,
        correct_option CHAR(1) NOT NULL CHECK (correct_option IN ('A','B','C','D','E'))
      );

      CREATE TABLE IF NOT EXISTS quiz_sessions (
        session_id UUID PRIMARY KEY,
        question_ids INTEGER[] NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS responses (
        id SERIAL PRIMARY KEY,
        session_id UUID REFERENCES quiz_sessions(session_id),
        question_id INTEGER REFERENCES questions(id),
        chosen_option CHAR(1) CHECK (chosen_option IN ('A','B','C','D','E')),
        answered_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (session_id, question_id)
      );
    `);

    console.log('Tables created.');

    // Clear existing questions to avoid duplicates on re-seed
    await pool.query('DELETE FROM responses');
    await pool.query('DELETE FROM quiz_sessions');
    await pool.query('DELETE FROM questions');
    await pool.query('ALTER SEQUENCE questions_id_seq RESTART WITH 1');

    const questions = [
      // --- Real questions from your images ---
      {
        image_filename: 'Slide1.JPG',
        option_a: '0.5 A',
        option_b: '1 A',
        option_c: '2 A',        // correct: V=IR → I = 5/5 = 1A → actually B
        option_d: '5 A',
        option_e: '25 A',
        correct_option: 'B',   // I = V/R = 5V / 5Ω = 1A
      },
      {
        image_filename: 'Slide2.JPG',
        option_a: '2 Ω',
        option_b: '4 Ω',
        option_c: '8 Ω',
        option_d: '10 Ω',       // correct: R = V/I = 20/5 = 4Ω → B
        option_e: '100 Ω',
        correct_option: 'B',   // R = V/I = 20V / 5A = 4Ω
      },
      {
        image_filename: 'Slide3.JPG',
        option_a: '2 V',
        option_b: '9 V',
        option_c: '18 V',       // correct: V = IR = 6 * 3 = 18V → C
        option_d: '24 V',
        option_e: '36 V',
        correct_option: 'C',   // V = I×R = 6A × 3Ω = 18V
      },

      // --- Placeholder questions (replace image_filename with your real images) ---
      {
        image_filename: 'placeholder_q4.jpg',
        option_a: '10 Ω',
        option_b: '20 Ω',
        option_c: '30 Ω',
        option_d: '40 Ω',
        option_e: '50 Ω',
        correct_option: 'A',
      },
      {
        image_filename: 'placeholder_q5.jpg',
        option_a: '1 V',
        option_b: '2 V',
        option_c: '3 V',
        option_d: '4 V',
        option_e: '5 V',
        correct_option: 'C',
      },
      {
        image_filename: 'placeholder_q6.jpg',
        option_a: '100 mA',
        option_b: '200 mA',
        option_c: '300 mA',
        option_d: '400 mA',
        option_e: '500 mA',
        correct_option: 'B',
      },
      {
        image_filename: 'placeholder_q7.jpg',
        option_a: '5 W',
        option_b: '10 W',
        option_c: '15 W',
        option_d: '20 W',
        option_e: '25 W',
        correct_option: 'D',
      },
      {
        image_filename: 'placeholder_q8.jpg',
        option_a: '1 kΩ',
        option_b: '2 kΩ',
        option_c: '3 kΩ',
        option_d: '4 kΩ',
        option_e: '5 kΩ',
        correct_option: 'E',
      },
      {
        image_filename: 'placeholder_q9.jpg',
        option_a: '0.1 A',
        option_b: '0.2 A',
        option_c: '0.3 A',
        option_d: '0.4 A',
        option_e: '0.5 A',
        correct_option: 'A',
      },
      {
        image_filename: 'placeholder_q10.jpg',
        option_a: '12 V',
        option_b: '24 V',
        option_c: '36 V',
        option_d: '48 V',
        option_e: '60 V',
        correct_option: 'B',
      },
    ];

    for (const q of questions) {
      await pool.query(
        `INSERT INTO questions 
          (image_filename, option_a, option_b, option_c, option_d, option_e, correct_option)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [q.image_filename, q.option_a, q.option_b, q.option_c, q.option_d, q.option_e, q.correct_option]
      );
    }

    console.log(`Seeded ${questions.length} questions.`);
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

seed();
