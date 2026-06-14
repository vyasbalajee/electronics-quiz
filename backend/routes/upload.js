require('dotenv').config();
const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parse/sync');
const pool = require('../db');
const { uploadImage } = require('../storage');

// Use memory storage — we don't want files on disk
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/upload
router.post(
  '/',
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

        try {
          // Upload image to Cloudinary
          const imageUrl = await uploadImage(imageData.buffer, imageData.originalname);

          // Insert question into DB
          await pool.query(
            `INSERT INTO questions 
              (image_filename, option_a, option_b, option_c, option_d, option_e, correct_option)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              imageUrl,
              option_a,
              option_b,
              option_c,
              option_d,
              option_e,
              correct_option.toUpperCase(),
            ]
          );

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
