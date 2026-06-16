require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const sessionRoutes = require('./routes/session');
const responseRoutes = require('./routes/response');
const uploadRoutes = require('./routes/upload');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const analyticsRoutes = require('./routes/analytics');
const questionsRoutes = require('./routes/questions');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use('/images', express.static(path.join(__dirname, 'images')));

app.use('/api/auth', authRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/response', responseRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/questions', questionsRoutes);

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
