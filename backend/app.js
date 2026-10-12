const express = require('express');
const cors = require('cors');
const { checkMLHealth } = require('./services/mlService');

const studentRoutes = require('./routes/studentRoutes');
const enrollmentRoutes = require('./routes/enrollmentRoutes');
const sessionRoutes = require('./routes/sessionRoutes');

const app = express();

// Middlewares
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || '*',
  credentials: true
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
  const mlStatus = await checkMLHealth();
  res.json({
    status: 'healthy',
    backend: 'online',
    timestamp: new Date().toISOString(),
    mlService: mlStatus
  });
});

// Primary Routes
app.use('/api/students', studentRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/sessions', sessionRoutes);

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Resource not found at ${req.originalUrl}`
  });
});

// Central Error Handler
app.use((err, req, res, next) => {
  console.error('Express Error:', err.stack || err.message);
  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

module.exports = app;
