const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

// GET /api/analytics/overview — instructor/admin
// Returns total attempts, average score, question difficulty
router.get('/overview', requireAuth, requireRole('admin', 'instructor'), async (req, res) => {
  try {
    // Total unique sessions with a user
    const sessionsResult = await pool.query(`
      SELECT COUNT(*) as total_attempts,
             COUNT(DISTINCT user_id) as unique_students
      FROM quiz_sessions
      WHERE user_id IS NOT NULL
    `);

    // Average score
    const scoreResult = await pool.query(`
      SELECT AVG(correct_count) as avg_score
      FROM (
        SELECT qs.session_id,
               COUNT(r.id) FILTER (
                 WHERE r.chosen_option = q.correct_option
               ) as correct_count
        FROM quiz_sessions qs
        JOIN responses r ON r.session_id = qs.session_id
        JOIN questions q ON q.id = r.question_id
        WHERE qs.user_id IS NOT NULL
        GROUP BY qs.session_id
      ) scores
    `);

    // Per-question difficulty (% wrong)
    const difficultyResult = await pool.query(`
      SELECT 
        q.id,
        q.image_filename,
        COUNT(r.id) as total_answers,
        COUNT(r.id) FILTER (WHERE r.chosen_option = q.correct_option) as correct_answers,
        ROUND(
          100.0 * COUNT(r.id) FILTER (WHERE r.chosen_option != q.correct_option) 
          / NULLIF(COUNT(r.id), 0)
        ) as wrong_percentage
      FROM questions q
      LEFT JOIN responses r ON r.question_id = q.id
      GROUP BY q.id, q.image_filename
      ORDER BY wrong_percentage DESC NULLS LAST
    `);

    res.json({
      total_attempts: parseInt(sessionsResult.rows[0].total_attempts),
      unique_students: parseInt(sessionsResult.rows[0].unique_students),
      avg_score: parseFloat(sessionsResult.rows[0].avg_score || 0).toFixed(1),
      question_difficulty: difficultyResult.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// GET /api/analytics/students — instructor/admin
// Returns list of all students with their attempt count and best score
router.get('/students', requireAuth, requireRole('admin', 'instructor'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.created_at,
        COUNT(qs.session_id) as total_attempts,
        MAX(correct_count) as best_score
      FROM users u
      LEFT JOIN quiz_sessions qs ON qs.user_id = u.id
      LEFT JOIN (
        SELECT qs2.session_id,
               COUNT(r.id) FILTER (
                 WHERE r.chosen_option = q.correct_option
               ) as correct_count
        FROM quiz_sessions qs2
        JOIN responses r ON r.session_id = qs2.session_id
        JOIN questions q ON q.id = r.question_id
        GROUP BY qs2.session_id
      ) scores ON scores.session_id = qs.session_id
      WHERE u.role = 'student'
      GROUP BY u.id, u.username, u.email, u.created_at
      ORDER BY u.username
    `);

    res.json({ students: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// GET /api/analytics/students/:id/history — instructor/admin
// Returns full quiz history for a specific student
router.get('/students/:id/history', requireAuth, requireRole('admin', 'instructor'), async (req, res) => {
  try {
    const { id } = req.params;

    const userResult = await pool.query(
      'SELECT id, username, email FROM users WHERE id = $1',
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const sessionsResult = await pool.query(`
      SELECT 
        qs.session_id,
        qs.created_at,
        COUNT(r.id) as questions_answered,
        COUNT(r.id) FILTER (WHERE r.chosen_option = q.correct_option) as correct_count
      FROM quiz_sessions qs
      LEFT JOIN responses r ON r.session_id = qs.session_id
      LEFT JOIN questions q ON q.id = r.question_id
      WHERE qs.user_id = $1
      GROUP BY qs.session_id, qs.created_at
      ORDER BY qs.created_at DESC
    `, [id]);

    res.json({
      student: userResult.rows[0],
      attempts: sessionsResult.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch student history' });
  }
});

module.exports = router;
