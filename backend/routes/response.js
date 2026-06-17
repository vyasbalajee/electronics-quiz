const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

// POST /api/response
router.post('/', requireAuth, async (req, res) => {
  try {
    const { session_id, question_id, chosen_option, time_taken_seconds } = req.body;

    if (!session_id || !question_id || !chosen_option) {
      return res.status(400).json({ error: 'session_id, question_id, and chosen_option are required' });
    }

    const validOptions = ['A', 'B', 'C', 'D', 'E'];
    if (!validOptions.includes(chosen_option)) {
      return res.status(400).json({ error: 'chosen_option must be A, B, C, D, or E' });
    }

    await pool.query(
      `INSERT INTO responses (session_id, question_id, chosen_option, time_taken_seconds)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (session_id, question_id)
       DO UPDATE SET chosen_option = $3, time_taken_seconds = $4, answered_at = NOW()`,
      [session_id, question_id, chosen_option, time_taken_seconds || null]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save response' });
  }
});

module.exports = router;
