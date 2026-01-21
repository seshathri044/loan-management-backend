const { verifyAccessToken } = require('../utils/jwt.util');
const { query } = require('../config/database');
const ApiResponse = require('../utils/response.util');

/**
 * Verify JWT Token Middleware
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return ApiResponse.unauthorized(res, 'Access token required');
    }

    // Verify token
    const decoded = verifyAccessToken(token);

    // Check if admin exists and is active
    const admin = await query(
      'SELECT id, name, email, mobile, role, is_active FROM admins WHERE id = ? AND is_active = TRUE',
      [decoded.id]
    );

    if (admin.length === 0) {
      return ApiResponse.unauthorized(res, 'Invalid token or admin not found');
    }

    // Attach admin info to request
    req.admin = admin[0];
    next();
  } catch (error) {
    if (error.message.includes('expired')) {
      return ApiResponse.unauthorized(res, 'Token expired, please login again');
    }
    return ApiResponse.unauthorized(res, 'Invalid token');
  }
};

/**
 * Check if admin is super admin
 */
const requireSuperAdmin = (req, res, next) => {
  if (req.admin.role !== 'super_admin') {
    return ApiResponse.forbidden(res, 'Super admin access required');
  }
  next();
};

/**
 * Optional authentication (doesn't fail if no token)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = verifyAccessToken(token);
      const admin = await query(
        'SELECT id, name, email, mobile, role FROM admins WHERE id = ? AND is_active = TRUE',
        [decoded.id]
      );
      
      if (admin.length > 0) {
        req.admin = admin[0];
      }
    }
    next();
  } catch (error) {
    next(); // Continue even if token is invalid
  }
};

module.exports = {
  authenticateToken,
  requireSuperAdmin,
  optionalAuth
};