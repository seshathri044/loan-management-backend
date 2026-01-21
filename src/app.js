const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const ApiResponse = require('./utils/response.util');
const authRoutes = require('./routes/auth.routes');
const borrowerRoutes = require('./routes/borrower.routes');
const loanRoutes = require('./routes/loan.routes');
const collectionRoutes = require('./routes/collection.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const settingsRoutes = require('./routes/settings.routes');

const app = express();

// ============================================
// MIDDLEWARE
// ============================================

// Security headers
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logger
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Static files
app.use('/uploads', express.static('uploads'));

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/health', (req, res) => {
  ApiResponse.success(res, {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  }, 'Server is running');
});

// API version info
app.get('/api', (req, res) => {
  ApiResponse.success(res, {
    version: process.env.API_VERSION || 'v1',
    name: 'Loan Management API',
    description: 'Backend API for Loan Management System'
  });
});

// Auth routes
app.use(`/api/${process.env.API_VERSION || 'v1'}/auth`, authRoutes);

// Borrower routes
app.use(`/api/${process.env.API_VERSION || 'v1'}/borrowers`, borrowerRoutes);

// Loan routes
app.use(`/api/${process.env.API_VERSION || 'v1'}/loans`, loanRoutes);

// Collection routes
app.use(`/api/${process.env.API_VERSION || 'v1'}/collections`, collectionRoutes);

// Dashboard routes
app.use(`/api/${process.env.API_VERSION || 'v1'}/dashboard`, dashboardRoutes);

// Settings routes
app.use(`/api/${process.env.API_VERSION || 'v1'}/settings`, settingsRoutes);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  ApiResponse.notFound(res, `Route ${req.originalUrl} not found`);
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return ApiResponse.validationError(res, err.errors);
  }

  if (err.name === 'UnauthorizedError') {
    return ApiResponse.unauthorized(res, 'Invalid token');
  }

  if (err.code === 'ER_DUP_ENTRY') {
    return ApiResponse.conflict(res, 'Duplicate entry found');
  }

  // Default server error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  
  return ApiResponse.error(res, message, statusCode);
});

module.exports = app;