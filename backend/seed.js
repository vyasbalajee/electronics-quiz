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

      // --- Real questions from Slide4-10 ---
      {
        image_filename: 'Slide4.JPG',
        option_a: '0.5 mA',
        option_b: '1 mA',        // I = V/R = 5V / 5kΩ = 1mA
        option_c: '2 mA',
        option_d: '5 mA',
        option_e: '10 mA',
        correct_option: 'B',
      },
      {
        image_filename: 'Slide5.JPG',
        option_a: '500 Ω',
        option_b: '1 kΩ',
        option_c: '2 kΩ',        // R = V/I = 10V / 5mA = 2kΩ
        option_d: '5 kΩ',
        option_e: '10 kΩ',
        correct_option: 'C',
      },
      {
        image_filename: 'Slide6.JPG',
        option_a: '3 V',
        option_b: '6 V',
        option_c: '8 V',
        option_d: '12 V',        // V = I×R = 2mA × 6kΩ = 12V
        option_e: '24 V',
        correct_option: 'D',
      },
      {
        image_filename: 'Slide7.JPG',
        option_a: '1 µA',
        option_b: '2 µA',
        option_c: '2.5 µA',      // I = V/R = 5V / 2MΩ = 2.5µA
        option_d: '5 µA',
        option_e: '10 µA',
        correct_option: 'C',
      },
      {
        image_filename: 'Slide8.JPG',
        option_a: '500 kΩ',
        option_b: '1 MΩ',
        option_c: '2 MΩ',        // R = V/I = 6V / 3µA = 2MΩ
        option_d: '3 MΩ',
        option_e: '6 MΩ',
        correct_option: 'C',
      },
      {
        image_filename: 'Slide9.JPG',
        option_a: '6 V',
        option_b: '15 V',
        option_c: '24 V',
        option_d: '30 V',        // V = I×R = 6µA × 5MΩ = 30V
        option_e: '60 V',
        correct_option: 'D',
      },
      {
        image_filename: 'Slide10.JPG',
        option_a: '3 V',
        option_b: '120 V',
        option_c: '1,200 V',
        option_d: '12,000 V',    // V = I×R = 6mA × 2MΩ = 12,000V
        option_e: '120,000 V',
        correct_option: 'D',
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
