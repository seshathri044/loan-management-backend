const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/v1/settings
 * @desc    Get admin settings
 * @access  Private
 */
router.get('/', settingsController.getSettings);

/**
 * @route   PUT /api/v1/settings
 * @desc    Update admin settings
 * @access  Private
 */
router.put('/', settingsController.updateSettings);

/**
 * @route   GET /api/v1/settings/system-stats
 * @desc    Get system statistics
 * @access  Private
 */
router.get('/system-stats', settingsController.getSystemStats);

/**
 * @route   GET /api/v1/settings/audit-logs
 * @desc    Get audit logs
 * @access  Private
 * @query   page, limit, action_type, from_date, to_date
 */
router.get('/audit-logs', settingsController.getAuditLogs);

/**
 * @route   GET /api/v1/settings/export
 * @desc    Export data
 * @access  Private
 * @query   type (borrowers, loans, collections, all), from_date, to_date
 */
router.get('/export', settingsController.exportData);

/**
 * @route   GET /api/v1/settings/sms-stats
 * @desc    Get SMS statistics
 * @access  Private
 * @query   period (today, week, month, all)
 */
router.get('/sms-stats', settingsController.getSMSStats);

module.exports = router;