const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logAction } = require('../auditLog');

// GET /api/questions — instructor/admin, paginated list with optional search
router.get('/', requireAuth, requireRole('admin', 'instructor'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim();

    // Build search filter — matches any option text
    let whereClause = '';
    let params = [];
    if (search) {
      whereClause = `WHERE (
        q.option_a ILIKE $1 OR q.option_b ILIKE $1 OR q.option_c ILIKE $1 
        OR q.option_d ILIKE $1 OR q.option_e ILIKE $1
      )`;
      params.push(`%${search}%`);
    }

    // Total count for pagination
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM questions q ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Paginated data
    const dataParams = [...params, limit, offset];
    const result = await pool.query(`
      SELECT q.*,
        COALESCE(
          json_agg(json_build_object('id', t.id, 'name', t.name)) 
          FILTER (WHERE t.id IS NOT NULL), '[]'
        ) as topics
      FROM questions q
      LEFT JOIN question_topics qt ON qt.question_id = q.id
      LEFT JOIN topics t ON t.id = qt.topic_id
      ${whereClause}
      GROUP BY q.id
      ORDER BY q.id ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, dataParams);

    res.json({
      questions: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// PATCH /api/questions/:id — instructor/admin, edit options, correct answer, video_url
router.patch('/:id', requireAuth, requireRole('admin', 'instructor'), async (req, res) => {
  try {
    const { id } = req.params;
    const { option_a, option_b, option_c, option_d, option_e, correct_option, video_url, time_limit_seconds } = req.body;

    if (correct_option && !['A', 'B', 'C', 'D', 'E'].includes(correct_option.toUpperCase()))
      return res.status(400).json({ error: 'correct_option must be A, B, C, D, or E' });

    const before = await pool.query('SELECT * FROM questions WHERE id = $1', [id]);

    // Normalize time limit: null/0/empty = unlimited
    let timeLimit = null;
    if (time_limit_seconds !== undefined && time_limit_seconds !== null && time_limit_seconds !== '') {
      const parsed = parseInt(time_limit_seconds, 10);
      if (!isNaN(parsed) && parsed > 0) timeLimit = parsed;
    }

    const result = await pool.query(
      `UPDATE questions SET
        option_a = COALESCE($1, option_a),
        option_b = COALESCE($2, option_b),
        option_c = COALESCE($3, option_c),
        option_d = COALESCE($4, option_d),
        option_e = COALESCE($5, option_e),
        correct_option = COALESCE($6, correct_option),
        video_url = $7,
        time_limit_seconds = $8
       WHERE id = $9
       RETURNING *`,
      [option_a, option_b, option_c, option_d, option_e, correct_option?.toUpperCase(), video_url || null, timeLimit, id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Question not found' });

    await logAction(req.user.id, 'edit_question', 'question', id, {
      before: before.rows[0] ? {
        correct_option: before.rows[0].correct_option,
        option_a: before.rows[0].option_a,
        option_b: before.rows[0].option_b,
        option_c: before.rows[0].option_c,
        option_d: before.rows[0].option_d,
        option_e: before.rows[0].option_e,
      } : null,
      after: {
        correct_option: result.rows[0].correct_option,
        option_a: result.rows[0].option_a,
        option_b: result.rows[0].option_b,
        option_c: result.rows[0].option_c,
        option_d: result.rows[0].option_d,
        option_e: result.rows[0].option_e,
      },
    });

    res.json({ question: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update question' });
  }
});

// GET /api/questions/:id/response-count — how many student responses exist for this question
router.get('/:id/response-count', requireAuth, requireRole('admin', 'instructor'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM responses WHERE question_id = $1',
      [req.params.id]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to count responses' });
  }
});

// DELETE /api/questions/:id — instructor/admin
router.delete('/:id', requireAuth, requireRole('admin', 'instructor'), async (req, res) => {
  try {
    const { id } = req.params;

    const before = await pool.query('SELECT image_filename FROM questions WHERE id = $1', [id]);

    await pool.query('DELETE FROM responses WHERE question_id = $1', [id]);
    await pool.query('DELETE FROM question_topics WHERE question_id = $1', [id]);
    await pool.query('DELETE FROM questions WHERE id = $1', [id]);

    await logAction(req.user.id, 'delete_question', 'question', id, {
      image_filename: before.rows[0]?.image_filename,
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

module.exports = router;
