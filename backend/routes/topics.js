const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth, requirePermission } = require('../middleware/auth');

// GET /api/topics/quiz-ready — topics that have at least one question at every difficulty 1-10
router.get('/quiz-ready', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.id, t.name
      FROM topics t
      JOIN question_topics qt ON qt.topic_id = t.id
      JOIN questions q ON q.id = qt.question_id
      WHERE q.difficulty BETWEEN 1 AND 10
      GROUP BY t.id, t.name
      HAVING COUNT(DISTINCT q.difficulty) = 10
      ORDER BY t.name ASC
    `);
    res.json({ topics: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch quiz-ready topics' });
  }
});

// GET /api/topics — all users, list all topics
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, created_at FROM topics ORDER BY name ASC'
    );
    res.json({ topics: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch topics' });
  }
});

// POST /api/topics — admin only, create a topic
router.post('/', requireAuth, requirePermission('topics.create'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Topic name is required' });

    const result = await pool.query(
      'INSERT INTO topics (name, created_by) VALUES ($1, $2) RETURNING *',
      [name.trim(), req.user.id]
    );
    res.status(201).json({ topic: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Topic already exists' });
    console.error(err);
    res.status(500).json({ error: 'Failed to create topic' });
  }
});

// DELETE /api/topics/:id — admin only
router.delete('/:id', requireAuth, requirePermission('topics.delete'), async (req, res) => {
  try {
    await pool.query('DELETE FROM topics WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete topic' });
  }
});

// GET /api/topics/question/:questionId — get topics for a question
router.get('/question/:questionId', requireAuth, requirePermission('topics.edit'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.id, t.name FROM topics t
       JOIN question_topics qt ON qt.topic_id = t.id
       WHERE qt.question_id = $1`,
      [req.params.questionId]
    );
    res.json({ topics: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch question topics' });
  }
});

// PUT /api/topics/question/:questionId — instructor/admin, set topics for a question
router.put('/question/:questionId', requireAuth, requirePermission('topics.edit'), async (req, res) => {
  try {
    const { topicIds } = req.body; // array of topic IDs
    const { questionId } = req.params;

    // Replace all topics for this question
    await pool.query('DELETE FROM question_topics WHERE question_id = $1', [questionId]);

    if (topicIds && topicIds.length > 0) {
      for (const topicId of topicIds) {
        await pool.query(
          'INSERT INTO question_topics (question_id, topic_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [questionId, topicId]
        );
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update question topics' });
  }
});

module.exports = router;
