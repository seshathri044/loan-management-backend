const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation,
  refreshTokenValidation
} = require('../middleware/validation.middleware');

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register new admin
 * @access  Public
 */
router.post('/register', registerValidation, authController.register);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login admin
 * @access  Public
 */
router.post('/login', loginValidation, authController.login);

/**
 * @route   POST /api/v1/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh-token', refreshTokenValidation, authController.refreshToken);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout admin
 * @access  Private
 */
router.post('/logout', authenticateToken, authController.logout);

/**
 * @route   GET /api/v1/auth/profile
 * @desc    Get current admin profile
 * @access  Private
 */
router.get('/profile', authenticateToken, authController.getProfile);

/**
 * @route   PUT /api/v1/auth/profile
 * @desc    Update admin profile
 * @access  Private
 */
router.put('/profile', authenticateToken, updateProfileValidation, authController.updateProfile);

/**
 * @route   PUT /api/v1/auth/change-password
 * @desc    Change admin password
 * @access  Private
 */
router.put('/change-password', authenticateToken, changePasswordValidation, authController.changePassword);

module.exports = router;