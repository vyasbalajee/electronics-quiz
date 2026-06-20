const express = require('express');
const router = express.Router();
const pool = require('../db');
const { v4: uuidv4 } = require('uuid');
const { requireAuth, requireRole } = require('../middleware/auth');

// POST /api/session — student/admin, create a new quiz session (or resume an in-progress one)
router.post('/', requireAuth, requireRole('admin', 'instructor', 'student'), async (req, res) => {
  try {
    // Expire abandoned in-progress sessions older than 2 hours for this user
    await pool.query(
      `UPDATE quiz_sessions SET status = 'completed'
       WHERE user_id = $1 AND status = 'in_progress' 
       AND created_at < NOW() - INTERVAL '2 hours'`,
      [req.user.id]
    );

    // Check for an existing (recent) in-progress session for this user
    const existingResult = await pool.query(
      `SELECT session_id FROM quiz_sessions 
       WHERE user_id = $1 AND status = 'in_progress' 
       ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );

    if (existingResult.rows.length > 0) {
      // Resume the existing in-progress session
      return res.json({ session_id: existingResult.rows[0].session_id, resumed: true });
    }

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
      `INSERT INTO quiz_sessions (session_id, question_ids, user_id, status) 
       VALUES ($1, $2, $3, 'in_progress')`,
      [sessionId, questionIds, req.user.id]
    );

    res.json({ session_id: sessionId, resumed: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// GET /api/session/:id — get questions for a session
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const sessionResult = await pool.query(
      'SELECT question_ids, user_id FROM quiz_sessions WHERE session_id = $1',
      [id]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Students can only access their own sessions
    const session = sessionResult.rows[0];
    if (req.user.role === 'student' && session.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const questionIds = session.question_ids;

    const questionsResult = await pool.query(
      'SELECT id, image_filename, option_a, option_b, option_c, option_d, option_e, time_limit_seconds FROM questions WHERE id = ANY($1)',
      [questionIds]
    );

    const questionMap = {};
    questionsResult.rows.forEach((q) => { questionMap[q.id] = q; });
    const orderedQuestions = questionIds.map((qid) => questionMap[qid]);

    res.json({ session_id: id, questions: orderedQuestions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// GET /api/session/:id/answers — get saved answers for resuming, does NOT mark complete
router.get('/:id/answers', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const sessionCheck = await pool.query(
      'SELECT user_id FROM quiz_sessions WHERE session_id = $1',
      [id]
    );
    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    if (req.user.role === 'student' && sessionCheck.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      'SELECT question_id, chosen_option FROM responses WHERE session_id = $1',
      [id]
    );

    const answers = {};
    result.rows.forEach((r) => { answers[r.question_id] = r.chosen_option; });

    res.json({ answers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch answers' });
  }
});

// GET /api/session/:id/results
router.get('/:id/results', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check session ownership for students
    const sessionCheck = await pool.query(
      'SELECT user_id FROM quiz_sessions WHERE session_id = $1',
      [id]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (req.user.role === 'student' && sessionCheck.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mark session as completed once results are viewed
    await pool.query(
      `UPDATE quiz_sessions SET status = 'completed' WHERE session_id = $1 AND status = 'in_progress'`,
      [id]
    );

    const result = await pool.query(
      `SELECT 
        u.qid as id,
        u.ord,
        q.image_filename,
        q.option_a, q.option_b, q.option_c, q.option_d, q.option_e,
        q.correct_option,
        q.video_url,
        r.chosen_option,
        r.time_taken_seconds
       FROM quiz_sessions s
       JOIN LATERAL unnest(s.question_ids) WITH ORDINALITY AS u(qid, ord) ON true
       LEFT JOIN questions q ON q.id = u.qid
       LEFT JOIN responses r ON r.session_id = s.session_id AND r.question_id = u.qid
       WHERE s.session_id = $1
       ORDER BY u.ord`,
      [id]
    );

    const results = result.rows.map((row) => ({
      id: row.id,
      deleted: !row.image_filename,
      image_filename: row.image_filename,
      video_url: row.video_url,
      options: row.image_filename ? {
        A: row.option_a,
        B: row.option_b,
        C: row.option_c,
        D: row.option_d,
        E: row.option_e,
      } : null,
      correct_option: row.correct_option,
      chosen_option: row.chosen_option,
      time_taken_seconds: row.time_taken_seconds,
      is_correct: row.image_filename ? row.chosen_option === row.correct_option : false,
    }));

    const score = results.filter((r) => r.is_correct).length;

    const total_time = results.reduce((sum, r) => sum + (r.time_taken_seconds || 0), 0);
    res.json({ session_id: id, score, total: results.length, total_time, results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

// GET /api/session/my/history — student's own quiz history
router.get('/my/history', requireAuth, requireRole('student', 'admin', 'instructor'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        qs.session_id,
        qs.created_at,
        COUNT(r.id) as questions_answered,
        COUNT(r.id) FILTER (WHERE r.chosen_option = q.correct_option) as correct_count,
        COALESCE(SUM(r.time_taken_seconds), 0) as total_time
      FROM quiz_sessions qs
      LEFT JOIN responses r ON r.session_id = qs.session_id
      LEFT JOIN questions q ON q.id = r.question_id
      WHERE qs.user_id = $1
      GROUP BY qs.session_id, qs.created_at
      ORDER BY qs.created_at DESC
    `, [req.user.id]);

    res.json({ history: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

module.exports = router;
