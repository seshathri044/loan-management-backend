const bcrypt = require('bcryptjs');
const { query, transaction } = require('../config/database');
const { generateTokens, verifyRefreshToken } = require('../utils/jwt.util');
const ApiResponse = require('../utils/response.util');

/**
 * Register New Admin
 */
const register = async (req, res) => {
  try {
    const { name, mobile, password, email, business_name, gender, address } = req.body;

    // Check if mobile already exists
    const existingAdmin = await query(
      'SELECT id FROM admins WHERE mobile = ?',
      [mobile]
    );

    if (existingAdmin.length > 0) {
      return ApiResponse.conflict(res, 'Mobile number already registered');
    }

    // Check if email exists (if provided)
    if (email) {
      const existingEmail = await query(
        'SELECT id FROM admins WHERE email = ?',
        [email]
      );

      if (existingEmail.length > 0) {
        return ApiResponse.conflict(res, 'Email already registered');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 10);

    // Use transaction to create admin and settings
    const result = await transaction(async (conn) => {
      // Insert admin
      const [adminResult] = await conn.execute(
        `INSERT INTO admins (name, mobile, password, email, business_name, gender, address, role) 
         VALUES (?, ?, ?, ?, ?, ?, ?, 'admin')`,
        [name, mobile, hashedPassword, email || null, business_name || null, gender || null, address || null]
      );

      const adminId = adminResult.insertId;

      // Insert default settings
      await conn.execute(
        `INSERT INTO admin_settings (admin_id, default_interest_rate, default_installments, late_fee_per_day) 
         VALUES (?, 10.00, 100, 50.00)`,
        [adminId]
      );

      return adminId;
    });

    // Get created admin details
    const [newAdmin] = await query(
      'SELECT id, name, mobile, email, business_name, gender, role, created_at FROM admins WHERE id = ?',
      [result]
    );

    // Generate tokens
    const tokens = generateTokens(newAdmin);

    // Save refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await query(
      'INSERT INTO refresh_tokens (admin_id, token, expires_at, ip_address) VALUES (?, ?, ?, ?)',
      [newAdmin.id, tokens.refreshToken, expiresAt, req.ip]
    );

    return ApiResponse.created(res, {
      admin: newAdmin,
      tokens
    }, 'Registration successful');

  } catch (error) {
    console.error('Register Error:', error);
    return ApiResponse.serverError(res, 'Registration failed');
  }
};

/**
 * Login Admin
 */
const login = async (req, res) => {
  try {
    const { mobile, password } = req.body;

    // Find admin
    const admins = await query(
      'SELECT * FROM admins WHERE mobile = ? AND is_active = TRUE',
      [mobile]
    );

    if (admins.length === 0) {
      return ApiResponse.unauthorized(res, 'Invalid credentials');
    }

    const admin = admins[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      return ApiResponse.unauthorized(res, 'Invalid credentials');
    }

    // Generate tokens
    const tokens = generateTokens(admin);

    // Save refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(
      'INSERT INTO refresh_tokens (admin_id, token, expires_at, ip_address, device_info) VALUES (?, ?, ?, ?, ?)',
      [admin.id, tokens.refreshToken, expiresAt, req.ip, req.headers['user-agent']]
    );

    // Update last login
    await query(
      'UPDATE admins SET last_login = NOW() WHERE id = ?',
      [admin.id]
    );

    // Log audit
    await query(
      'INSERT INTO audit_logs (admin_id, action_type, ip_address, user_agent) VALUES (?, ?, ?, ?)',
      [admin.id, 'login', req.ip, req.headers['user-agent']]
    );

    // Remove password from response
    delete admin.password;

    return ApiResponse.success(res, {
      admin,
      tokens
    }, 'Login successful');

  } catch (error) {
    console.error('Login Error:', error);
    return ApiResponse.serverError(res, 'Login failed');
  }
};

/**
 * Refresh Access Token
 */
const refreshToken = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    // Verify refresh token
    const decoded = verifyRefreshToken(refresh_token);

    // Check if refresh token exists and is not revoked
    const tokens = await query(
      'SELECT * FROM refresh_tokens WHERE token = ? AND admin_id = ? AND is_revoked = FALSE AND expires_at > NOW()',
      [refresh_token, decoded.id]
    );

    if (tokens.length === 0) {
      return ApiResponse.unauthorized(res, 'Invalid or expired refresh token');
    }

    // Get admin details
    const admins = await query(
      'SELECT id, name, mobile, email, role FROM admins WHERE id = ? AND is_active = TRUE',
      [decoded.id]
    );

    if (admins.length === 0) {
      return ApiResponse.unauthorized(res, 'Admin not found');
    }

    // Generate new tokens
    const newTokens = generateTokens(admins[0]);

    // Revoke old refresh token
    await query(
      'UPDATE refresh_tokens SET is_revoked = TRUE WHERE token = ?',
      [refresh_token]
    );

    // Save new refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(
      'INSERT INTO refresh_tokens (admin_id, token, expires_at, ip_address) VALUES (?, ?, ?, ?)',
      [admins[0].id, newTokens.refreshToken, expiresAt, req.ip]
    );

    return ApiResponse.success(res, {
      tokens: newTokens
    }, 'Token refreshed successfully');

  } catch (error) {
    console.error('Refresh Token Error:', error);
    return ApiResponse.unauthorized(res, 'Invalid refresh token');
  }
};

/**
 * Logout Admin
 */
const logout = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    // Revoke refresh token if provided
    if (refresh_token) {
      await query(
        'UPDATE refresh_tokens SET is_revoked = TRUE WHERE token = ? AND admin_id = ?',
        [refresh_token, req.admin.id]
      );
    }

    // Log audit
    await query(
      'INSERT INTO audit_logs (admin_id, action_type, ip_address, user_agent) VALUES (?, ?, ?, ?)',
      [req.admin.id, 'logout', req.ip, req.headers['user-agent']]
    );

    return ApiResponse.success(res, null, 'Logout successful');

  } catch (error) {
    console.error('Logout Error:', error);
    return ApiResponse.serverError(res, 'Logout failed');
  }
};

/**
 * Get Current Admin Profile
 */
const getProfile = async (req, res) => {
  try {
    // Get admin with settings
    const [admin] = await query(
      `SELECT 
        a.*,
        s.default_interest_rate,
        s.default_installments,
        s.sms_enabled,
        s.late_fee_per_day,
        s.currency,
        s.timezone
       FROM admins a
       LEFT JOIN admin_settings s ON a.id = s.admin_id
       WHERE a.id = ?`,
      [req.admin.id]
    );

    if (!admin) {
      return ApiResponse.notFound(res, 'Admin not found');
    }

    // Remove password
    delete admin.password;

    return ApiResponse.success(res, admin, 'Profile retrieved successfully');

  } catch (error) {
    console.error('Get Profile Error:', error);
    return ApiResponse.serverError(res, 'Failed to get profile');
  }
};
// Only showing the fixed updateProfile function - replace line 260-304

/**
 * Update Admin Profile
 */
const updateProfile = async (req, res) => {
  try {
    const { name, email, business_name, gender, address, location_lat, location_lng } = req.body;

    // Check if email is being changed and already exists
    if (email) {
      const existingEmail = await query(
        'SELECT id FROM admins WHERE email = ? AND id != ?',
        [email, req.admin.id]
      );

      if (existingEmail.length > 0) {
        return ApiResponse.conflict(res, 'Email already in use');
      }
    }

    // Update admin - handle undefined values
    await query(
      `UPDATE admins 
       SET name = COALESCE(?, name),
           email = ?,
           business_name = ?,
           gender = ?,
           address = ?,
           location_lat = ?,
           location_lng = ?
       WHERE id = ?`,
      [
        name || null,
        email || null,
        business_name || null,
        gender || null,
        address || null,
        location_lat || null,
        location_lng || null,
        req.admin.id
      ]
    );

    // Get updated profile
    const [updatedAdmin] = await query(
      'SELECT id, name, mobile, email, business_name, gender, address, location_lat, location_lng, role FROM admins WHERE id = ?',
      [req.admin.id]
    );

    // Log audit
    await query(
      'INSERT INTO audit_logs (admin_id, action_type, table_name, record_id, new_values) VALUES (?, ?, ?, ?, ?)',
      [req.admin.id, 'update', 'admins', req.admin.id, JSON.stringify(req.body)]
    );

    return ApiResponse.success(res, updatedAdmin, 'Profile updated successfully');

  } catch (error) {
    console.error('Update Profile Error:', error);
    return ApiResponse.serverError(res, 'Failed to update profile');
  }
};
/**
 * Change Password
 */
const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    // Get current admin
    const [admin] = await query(
      'SELECT password FROM admins WHERE id = ?',
      [req.admin.id]
    );

    // Verify current password
    const isPasswordValid = await bcrypt.compare(current_password, admin.password);

    if (!isPasswordValid) {
      return ApiResponse.badRequest(res, 'Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, parseInt(process.env.BCRYPT_ROUNDS) || 10);

    // Update password
    await query(
      'UPDATE admins SET password = ? WHERE id = ?',
      [hashedPassword, req.admin.id]
    );

    // Revoke all refresh tokens for security
    await query(
      'UPDATE refresh_tokens SET is_revoked = TRUE WHERE admin_id = ?',
      [req.admin.id]
    );

    // Log audit
    await query(
      'INSERT INTO audit_logs (admin_id, action_type, table_name, record_id) VALUES (?, ?, ?, ?)',
      [req.admin.id, 'update', 'admins', req.admin.id]
    );

    return ApiResponse.success(res, null, 'Password changed successfully. Please login again.');

  } catch (error) {
    console.error('Change Password Error:', error);
    return ApiResponse.serverError(res, 'Failed to change password');
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword
};