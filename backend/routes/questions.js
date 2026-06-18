const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

// GET /api/questions — instructor/admin, list all questions with topics
router.get('/', requireAuth, requireRole('admin', 'instructor'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT q.*,
        COALESCE(
          json_agg(json_build_object('id', t.id, 'name', t.name)) 
          FILTER (WHERE t.id IS NOT NULL), '[]'
        ) as topics
      FROM questions q
      LEFT JOIN question_topics qt ON qt.question_id = q.id
      LEFT JOIN topics t ON t.id = qt.topic_id
      GROUP BY q.id
      ORDER BY q.id ASC
    `);
    res.json({ questions: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// PATCH /api/questions/:id — instructor/admin, edit options, correct answer, video_url
router.patch('/:id', requireAuth, requireRole('admin', 'instructor'), async (req, res) => {
  try {
    const { id } = req.params;
    const { option_a, option_b, option_c, option_d, option_e, correct_option, video_url } = req.body;

    if (correct_option && !['A', 'B', 'C', 'D', 'E'].includes(correct_option.toUpperCase()))
      return res.status(400).json({ error: 'correct_option must be A, B, C, D, or E' });

    const result = await pool.query(
      `UPDATE questions SET
        option_a = COALESCE($1, option_a),
        option_b = COALESCE($2, option_b),
        option_c = COALESCE($3, option_c),
        option_d = COALESCE($4, option_d),
        option_e = COALESCE($5, option_e),
        correct_option = COALESCE($6, correct_option),
        video_url = $7
       WHERE id = $8
       RETURNING *`,
      [option_a, option_b, option_c, option_d, option_e, correct_option?.toUpperCase(), video_url || null, id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Question not found' });

    res.json({ question: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update question' });
  }
});

// DELETE /api/questions/:id — instructor/admin
router.delete('/:id', requireAuth, requireRole('admin', 'instructor'), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM responses WHERE question_id = $1', [id]);
    await pool.query('DELETE FROM question_topics WHERE question_id = $1', [id]);
    await pool.query('DELETE FROM questions WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

module.exports = router;
