require('dotenv').config();
const app = require('./src/app');
const { testConnection } = require('./src/config/database');

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('❌ Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Start listening
    app.listen(PORT, () => {
      console.log('');
      console.log('='.repeat(50));
      console.log('🚀 Loan Management API Server');
      console.log('='.repeat(50));
      console.log(`📍 Environment: ${NODE_ENV}`);
      console.log(`🌐 Server running on: http://localhost:${PORT}`);
      console.log(`📡 API Base URL: http://localhost:${PORT}/api/v1`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
      console.log('='.repeat(50));
      console.log('');
      console.log('📚 Available Endpoints:');
      console.log('   POST   /api/v1/auth/register');
      console.log('   POST   /api/v1/auth/login');
      console.log('   POST   /api/v1/auth/refresh-token');
      console.log('   POST   /api/v1/auth/logout');
      console.log('   GET    /api/v1/auth/profile');
      console.log('   PUT    /api/v1/auth/profile');
      console.log('   PUT    /api/v1/auth/change-password');
      console.log('='.repeat(50));
      console.log('');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT signal received: closing HTTP server');
  process.exit(0);
});

// Start the server
startServer();