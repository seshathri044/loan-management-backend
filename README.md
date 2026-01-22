# Loan Management System

A comprehensive microfinance/lending management application built with Node.js backend and Flutter frontend.

## Live Deployment

- **Backend API**: https://loan-management-backend-h2d1.onrender.com
- **Status**: Deployed and operational
- **Platform Compatibility**: Android & iOS tested

## Application Overview

Admin-only loan management system for microfinance businesses to manage borrowers, track loans, and collect payments.

### Core Features
- Admin authentication and profile management
- Borrower registration and management
- Loan creation with EMI calculation
- Payment collection tracking
- Dashboard analytics (Daily/Weekly/Monthly)
- SMS notifications for payment reminders
- Installment schedule generation

## Tech Stack

### Backend
- **Runtime**: Node.js
- **Database**: MySQL
- **Backend Hosting**: Render (Free tier)
- **Database Hosting**: Railway

### Frontend
- **Framework**: Flutter
- **Build**: APK (production-ready)

## Project Structure

### Backend
```
backend/
├── config/          # Database and app configuration
├── controllers/     # Business logic handlers
├── middleware/      # Authentication & validation
├── routes/          # API endpoints
├── utils/           # Helper functions (JWT, SMS, calculations)
└── .env            # Environment variables
```

### Frontend
```
frontend/
├── lib/
│   ├── providers/   # State management
│   ├── screens/     # UI screens
│   ├── services/    # API integration
│   └── utils/       # Theme and helpers
└── .env            # API configuration
```

## Environment Configuration

### Backend (.env)
```
NODE_ENV=development
PORT=5000
API_VERSION=v1
DATABASE_URL=mysql://user:pass@host:port/db_name
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=10
CORS_ORIGIN=*
```

### Frontend (.env)
```
API_BASE_URL=https://loan-management-backend-h2d1.onrender.com/api/v1
API_TIMEOUT=30000
```

## Authentication Flow

- JWT-based authentication
- Access token (24h) + Refresh token (7d)
- Password hashing with bcrypt
- Role-based access control (Admin/Super Admin)

## Key Modules

### Authentication
- Admin registration and login
- Profile management
- Password change
- Token refresh mechanism

### Borrower Management
- Add/Edit/Delete borrowers
- Contact and guarantor details
- Document upload support
- SMS notification preferences

### Loan Management
- Loan creation with custom terms
- EMI calculation
- Installment schedule generation
- Loan approval workflow
- Status tracking (Pending/Active/Completed/Cancelled)

### Collections
- Payment recording
- Late fee calculation
- Payment history
- Overdue loan tracking

### Dashboard
- Total collections (Pending/Paid/Interest)
- Active loans statistics
- Borrower status breakdown
- Period-wise analytics

## Known Limitations

- **Response Time**: Free-tier hosting may result in slower initial response times
- **UI**: Minor UI adjustments pending (handled by deployment team)
- **Home Icon**: App icon not configured for device home screen

## API Architecture
```
Railway (MySQL) <-> Render (Node.js API) <-> Flutter App
```

## Deployment

- Backend deployed on Render (free tier)
- Database hosted on Railway
- Flutter app compiled to APK
- Production deployment managed by Vyugam Solutions

## Company

**Vyugam Solutions**  
Website: https://vyugamsolutions.com/  
Role: Mobile Application Development - Backend

## Notes

- This project is accepted for deployment by Vyugam Solutions
- Company will host on their own servers and handle minor fixes
- Currently running on free-tier services for demonstration
- Production-ready codebase with error handling and security best practices

## Repository

Backend: https://github.com/seshathri044/loan-management-backend

---

**Status**: Deployed | Mobile Ready | Secure
