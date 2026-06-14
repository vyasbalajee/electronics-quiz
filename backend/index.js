const express = require('express');
const cors = require('cors');
const path = require('path');

const sessionRoutes = require('./routes/session');
const responseRoutes = require('./routes/response');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Serve images as static files from the /images directory
app.use('/images', express.static(path.join(__dirname, 'images')));

// Routes
app.use('/api/session', sessionRoutes);
app.use('/api/response', responseRoutes);

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
