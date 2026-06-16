const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

// GET /api/questions — instructor/admin, list all questions
router.get('/', requireAuth, requireRole('admin', 'instructor'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM questions ORDER BY id ASC'
    );
    res.json({ questions: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// PATCH /api/questions/:id — instructor/admin, edit a question's options and correct answer
router.patch('/:id', requireAuth, requireRole('admin', 'instructor'), async (req, res) => {
  try {
    const { id } = req.params;
    const { option_a, option_b, option_c, option_d, option_e, correct_option } = req.body;

    if (correct_option && !['A', 'B', 'C', 'D', 'E'].includes(correct_option.toUpperCase())) {
      return res.status(400).json({ error: 'correct_option must be A, B, C, D, or E' });
    }

    const result = await pool.query(
      `UPDATE questions SET
        option_a = COALESCE($1, option_a),
        option_b = COALESCE($2, option_b),
        option_c = COALESCE($3, option_c),
        option_d = COALESCE($4, option_d),
        option_e = COALESCE($5, option_e),
        correct_option = COALESCE($6, correct_option)
       WHERE id = $7
       RETURNING *`,
      [option_a, option_b, option_c, option_d, option_e, correct_option?.toUpperCase(), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

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

    // Delete related responses first
    await pool.query('DELETE FROM responses WHERE question_id = $1', [id]);
    await pool.query('DELETE FROM questions WHERE id = $1', [id]);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

module.exports = router;
