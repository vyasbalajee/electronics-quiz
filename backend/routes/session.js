const express = require('express');
const router = express.Router();
const pool = require('../db');
const { v4: uuidv4 } = require('uuid');

// POST /api/session
// Creates a new quiz session with 10 random questions
router.post('/', async (req, res) => {
  try {
    // Pick 10 random question IDs
    const questionResult = await pool.query(
      'SELECT id FROM questions ORDER BY RANDOM() LIMIT 10'
    );

    if (questionResult.rows.length < 10) {
      return res.status(400).json({
        error: 'Not enough questions in the database. Need at least 10.',
      });
    }

    const questionIds = questionResult.rows.map((r) => r.id);
    const sessionId = uuidv4();

    await pool.query(
      'INSERT INTO quiz_sessions (session_id, question_ids) VALUES ($1, $2)',
      [sessionId, questionIds]
    );

    res.json({ session_id: sessionId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// GET /api/session/:id
// Returns the 10 questions (image + options) for a session, in order
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const sessionResult = await pool.query(
      'SELECT question_ids FROM quiz_sessions WHERE session_id = $1',
      [id]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const questionIds = sessionResult.rows[0].question_ids;

    // Fetch questions in the exact order stored in session
    const questionsResult = await pool.query(
      'SELECT id, image_filename, option_a, option_b, option_c, option_d, option_e FROM questions WHERE id = ANY($1)',
      [questionIds]
    );

    // Preserve original order
    const questionMap = {};
    questionsResult.rows.forEach((q) => {
      questionMap[q.id] = q;
    });
    const orderedQuestions = questionIds.map((qid) => questionMap[qid]);

    res.json({ session_id: id, questions: orderedQuestions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// GET /api/session/:id/results
// Returns each question with the user's answer and whether it was correct
router.get('/:id/results', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        q.id,
        q.image_filename,
        q.option_a, q.option_b, q.option_c, q.option_d, q.option_e,
        q.correct_option,
        r.chosen_option
       FROM quiz_sessions s
       JOIN LATERAL unnest(s.question_ids) WITH ORDINALITY AS u(qid, ord) ON true
       JOIN questions q ON q.id = u.qid
       LEFT JOIN responses r ON r.session_id = s.session_id AND r.question_id = q.id
       WHERE s.session_id = $1
       ORDER BY u.ord`,
      [id]
    );

    const results = result.rows.map((row) => ({
      id: row.id,
      image_filename: row.image_filename,
      options: {
        A: row.option_a,
        B: row.option_b,
        C: row.option_c,
        D: row.option_d,
        E: row.option_e,
      },
      correct_option: row.correct_option,
      chosen_option: row.chosen_option,
      is_correct: row.chosen_option === row.correct_option,
    }));

    const score = results.filter((r) => r.is_correct).length;

    res.json({ session_id: id, score, total: results.length, results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

module.exports = router;
