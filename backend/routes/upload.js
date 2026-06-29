require('dotenv').config();
const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parse/sync');
const pool = require('../db');
const { uploadImage } = require('../storage');
const { requireAuth, requireRole } = require('../middleware/auth');

// Use memory storage — we don't want files on disk
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/upload
router.post(
  '/',
  requireAuth,
  requireRole('admin', 'instructor'),
  upload.fields([
    { name: 'csvFile', maxCount: 1 },
    { name: 'images' },
  ]),
  async (req, res) => {
    try {
      if (!req.files?.csvFile) {
        return res.status(400).json({ error: 'No CSV file uploaded' });
      }
      if (!req.files?.images || req.files.images.length === 0) {
        return res.status(400).json({ error: 'No images uploaded' });
      }

      // Parse CSV
      const csvBuffer = req.files.csvFile[0].buffer;
      const records = csv.parse(csvBuffer, {
        columns: true,
        bom: true,
        skip_empty_lines: true,
        trim: true,
      });

      // Validate CSV columns
      const requiredColumns = [
        'image_filename',
        'option_a',
        'option_b',
        'option_c',
        'option_d',
        'option_e',
        'correct_option',
      ];
      // video_url is optional
      const csvColumns = Object.keys(records[0] || {});
      const missingColumns = requiredColumns.filter(
        (col) => !csvColumns.includes(col)
      );
      if (missingColumns.length > 0) {
        return res.status(400).json({
          error: `CSV missing columns: ${missingColumns.join(', ')}`,
        });
      }

      // Build case-insensitive map of filename -> file data
      const imageMap = {};
      for (const file of req.files.images) {
        imageMap[file.originalname.toLowerCase()] = {
          buffer: file.buffer,
          originalname: file.originalname,
        };
      }

      const results = [];
      const errors = [];

      for (const record of records) {
        const {
          image_filename,
          option_a,
          option_b,
          option_c,
          option_d,
          option_e,
          correct_option,
          video_url,
          topics,
          time_limit_seconds,
          difficulty,
        } = record;

        // Validate correct_option
        if (!['A', 'B', 'C', 'D', 'E'].includes(correct_option.toUpperCase())) {
          errors.push(`${image_filename}: invalid correct_option "${correct_option}"`);
          continue;
        }

        // Case-insensitive image lookup
        const imageData = imageMap[image_filename.toLowerCase()];
        if (!imageData) {
          errors.push(`${image_filename}: image file not found in upload`);
          continue;
        }

        // Parse time limit — blank/0/invalid means unlimited (null)
        let timeLimit = null;
        if (time_limit_seconds && time_limit_seconds.toString().trim() !== '') {
          const parsed = parseInt(time_limit_seconds, 10);
          if (!isNaN(parsed) && parsed > 0) timeLimit = parsed;
        }

        // Parse difficulty — must be 1-10, otherwise null (unset)
        let difficultyVal = null;
        if (difficulty && difficulty.toString().trim() !== '') {
          const parsed = parseInt(difficulty, 10);
          if (!isNaN(parsed) && parsed >= 1 && parsed <= 10) difficultyVal = parsed;
          else {
            errors.push(`${image_filename}: difficulty must be 1-10, got "${difficulty}" — left unset`);
          }
        }

        try {
          // Upload image to Cloudinary
          const imageUrl = await uploadImage(imageData.buffer, imageData.originalname);

          // Insert question into DB
          const insertResult = await pool.query(
            `INSERT INTO questions 
              (image_filename, option_a, option_b, option_c, option_d, option_e, correct_option, video_url, time_limit_seconds, difficulty)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING id`,
            [
              imageUrl,
              option_a,
              option_b,
              option_c,
              option_d,
              option_e,
              correct_option.toUpperCase(),
              video_url || null,
              timeLimit,
              difficultyVal,
            ]
          );

          const questionId = insertResult.rows[0].id;

          // Handle topics (semicolon-separated, auto-create)
          if (topics && topics.trim() !== '') {
            const topicNames = topics.split(';').map((t) => t.trim()).filter(Boolean);
            for (const topicName of topicNames) {
              // Find or create the topic
              let topicResult = await pool.query(
                'SELECT id FROM topics WHERE LOWER(name) = LOWER($1)',
                [topicName]
              );
              let topicId;
              if (topicResult.rows.length > 0) {
                topicId = topicResult.rows[0].id;
              } else {
                const created = await pool.query(
                  'INSERT INTO topics (name, created_by) VALUES ($1, $2) RETURNING id',
                  [topicName, req.user?.id || null]
                );
                topicId = created.rows[0].id;
              }
              // Link question to topic
              await pool.query(
                'INSERT INTO question_topics (question_id, topic_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [questionId, topicId]
              );
            }
          }

          results.push({ image_filename, status: 'success' });
        } catch (err) {
          errors.push(`${image_filename}: ${err.message}`);
        }
      }

      res.json({
        success: true,
        uploaded: results.length,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (err) {
      console.error('Upload error:', err);
      res.status(500).json({ error: 'Upload failed: ' + err.message });
    }
  }
);

module.exports = router;
