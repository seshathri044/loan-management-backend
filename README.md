# Loan Management System - Backend API

![API Status](https://img.shields.io/website?url=https://loan-management-backend-h2d1.onrender.com)
![Node.js](https://img.shields.io/badge/Node.js-v18-green)
![MySQL](https://img.shields.io/badge/MySQL-8.0-blue)
![License](https://img.shields.io/badge/License-Proprietary-red)

A comprehensive RESTful API for microfinance/lending management built with Node.js and MySQL.

## 🚀 Live Demo
**API Endpoint**: https://loan-management-backend-h2d1.onrender.com

> **Note**: Demo deployment uses free-tier hosting. Production deployment will be handled by the client with proper infrastructure.

## 📋 Overview
Enterprise-grade loan management system backend designed for microfinance institutions. Handles borrower management, loan processing, EMI calculations, payment tracking, and analytics.

### Key Capabilities
- Secure JWT-based authentication with refresh tokens
- Automated EMI calculation and installment scheduling
- Role-based access control (Admin/Super Admin)
- RESTful API architecture
- Payment collection and late fee management
- Real-time dashboard analytics
- SMS notification integration

## 🛠️ Tech Stack
- **Runtime**: Node.js + Express.js
- **Database**: MySQL
- **Authentication**: JWT (jsonwebtoken)
- **Security**: bcrypt password hashing, helmet, cors
- **Validation**: express-validator
- **Environment**: dotenv

## 📁 Project Structure
```
backend/
├── config/          # Database and app configuration
├── controllers/     # Business logic handlers
├── middleware/      # Authentication & validation
├── routes/          # API route definitions
├── utils/           # Helper functions (JWT, calculations)
├── server.js        # Application entry point
└── package.json     # Dependencies
```

## 🔧 Environment Setup

### Required Environment Variables
```bash
NODE_ENV=production
PORT=5000
API_VERSION=v1

# Database Configuration
DATABASE_URL=mysql://user:password@host:port/database

# JWT Configuration
JWT_SECRET=your_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Security
BCRYPT_ROUNDS=10
CORS_ORIGIN=https://yourdomain.com
```

> ⚠️ **Security Note**: Never commit `.env` files. Use environment variable management in production.

## 🚦 Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

### Local Development
```bash
# Clone the repository
git clone https://github.com/seshathri044/loan-management-backend.git
cd loan-management-backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Run database migrations (if applicable)
npm run migrate

# Start development server
npm run dev
```

## 📡 API Documentation

### Authentication Endpoints
```
POST   /api/v1/auth/register     - Admin registration
POST   /api/v1/auth/login        - Admin login
POST   /api/v1/auth/refresh      - Refresh access token
PUT    /api/v1/auth/profile      - Update profile
PUT    /api/v1/auth/password     - Change password
```

### Borrower Management
```
GET    /api/v1/borrowers         - List all borrowers
POST   /api/v1/borrowers         - Create borrower
GET    /api/v1/borrowers/:id     - Get borrower details
PUT    /api/v1/borrowers/:id     - Update borrower
DELETE /api/v1/borrowers/:id     - Delete borrower
```

### Loan Management
```
GET    /api/v1/loans             - List all loans
POST   /api/v1/loans             - Create loan
GET    /api/v1/loans/:id         - Get loan details
PUT    /api/v1/loans/:id         - Update loan
GET    /api/v1/loans/:id/schedule - Get installment schedule
```

### Payment Collection
```
POST   /api/v1/payments          - Record payment
GET    /api/v1/payments/loan/:id - Get payment history
```

### Analytics Dashboard
```
GET    /api/v1/dashboard/stats   - Get dashboard statistics
GET    /api/v1/dashboard/analytics?period=daily - Period-wise analytics
```

## 🔐 Security Features
- JWT access & refresh token mechanism
- Bcrypt password hashing (configurable rounds)
- CORS protection
- Helmet security headers
- Input validation and sanitization
- SQL injection prevention
- Rate limiting (recommended for production)

## 🏗️ Architecture
```
Client (Flutter App)
    ↓
Express.js API Server (Render)
    ↓
MySQL Database (Railway)
```

## 📊 Database Schema
Key tables:
- `admins` - Admin user management
- `borrowers` - Borrower information
- `loans` - Loan details and status
- `installments` - EMI schedule
- `payments` - Payment transactions

## 🚀 Deployment

### Render (Current Demo)
```bash
# Build command
npm install

# Start command
npm start
```

### Production Deployment Checklist
- [ ] Set NODE_ENV=production
- [ ] Configure production database
- [ ] Set strong JWT secrets
- [ ] Configure CORS for specific domain
- [ ] Enable SSL/TLS
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy
- [ ] Implement rate limiting
- [ ] Set up CDN (if needed)

## 🧪 Testing
```bash
# Run tests (when implemented)
npm test

# Run linting
npm run lint
```

## 📦 Dependencies
```json
{
  "express": "^4.18.x",
  "mysql2": "^3.x.x",
  "jsonwebtoken": "^9.x.x",
  "bcrypt": "^5.x.x",
  "dotenv": "^16.x.x",
  "cors": "^2.x.x",
  "helmet": "^7.x.x",
  "express-validator": "^7.x.x"
}
```

## 🤝 Integration
This backend is designed to work with:
- **Frontend**: Flutter mobile application
- **Platform**: Android & iOS
- **Frontend Repository**: (Link if public)

## 📝 Development Notes
- Free-tier hosting may experience cold starts (10-30s initial response)
- Production deployment will use dedicated infrastructure
- API versioning implemented for future compatibility
- Modular architecture for easy feature additions

## 🏢 Project Status
- **Status**: Production-ready
- **Client**: Vyugam Solutions
- **Purpose**: Portfolio demonstration & client handoff
- **License**: Proprietary

## 🔗 Links
- **Live API**: https://loan-management-backend-h2d1.onrender.com
- **Company**: [Vyugam Solutions](https://vyugamsolutions.com/)
- **APK Release**: [Download v1.0.0](https://github.com/seshathri044/loan-management-backend/releases/tag/v1.0.0)

## 📧 Contact
For inquiries regarding this project, please contact through [Vyugam Solutions](https://vyugamsolutions.com/).

---

**⚠️ Disclaimer**: This is a demonstration deployment. The live API uses non-sensitive test data. Production deployment will be handled by the client with appropriate security measures and infrastructure.
