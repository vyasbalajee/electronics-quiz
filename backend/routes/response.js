const express = require('express');
const router = express.Router();
const pool = require('../db');

// POST /api/response
// Submits a user's answer for a question in a session
router.post('/', async (req, res) => {
  try {
    const { session_id, question_id, chosen_option } = req.body;

    if (!session_id || !question_id || !chosen_option) {
      return res.status(400).json({ error: 'session_id, question_id, and chosen_option are required' });
    }

    const validOptions = ['A', 'B', 'C', 'D', 'E'];
    if (!validOptions.includes(chosen_option)) {
      return res.status(400).json({ error: 'chosen_option must be A, B, C, D, or E' });
    }

    // Upsert: if user already answered this question in this session, overwrite it
    await pool.query(
      `INSERT INTO responses (session_id, question_id, chosen_option)
       VALUES ($1, $2, $3)
       ON CONFLICT (session_id, question_id)
       DO UPDATE SET chosen_option = $3, answered_at = NOW()`,
      [session_id, question_id, chosen_option]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save response' });
  }
});

module.exports = router;
