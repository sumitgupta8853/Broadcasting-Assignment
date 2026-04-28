require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth.routes');
const contentRoutes = require('./routes/content.routes');
const userRoutes = require('./routes/user.routes');
const { errorResponse } = require('./utils/response');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const publicLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 60,
  message: { success: false, message: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 20,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
});

// ─────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Content Broadcasting System is running.',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

app.use('/auth', authLimiter, authRoutes);
app.use('/content', contentRoutes);
app.use('/users', userRoutes);

// Apply rate limiting specifically to the live/public endpoint
app.use('/content/live', publicLimiter);

// ─────────────────────────────────────────────
// 404 Handler
// ─────────────────────────────────────────────
app.use((req, res) => {
  return errorResponse(res, `Route ${req.method} ${req.path} not found.`, 404);
});

// ─────────────────────────────────────────────
// Global Error Handler
// ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Global Error]', err);
  return errorResponse(res, err.message || 'Internal server error.', err.statusCode || 500);
});

// ─────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Content Broadcasting System`);
  console.log(`   Listening on: http://localhost:${PORT}`);
  console.log(`   Environment:  ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Health check: http://localhost:${PORT}/health\n`);
});

module.exports = app;
