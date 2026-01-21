const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/v1/dashboard/overview
 * @desc    Get dashboard overview (main dashboard data)
 * @access  Private
 * @query   period (today, week, month)
 */
router.get('/overview', dashboardController.getDashboardOverview);

/**
 * @route   GET /api/v1/dashboard/collection-trends
 * @desc    Get collection trends (chart data)
 * @access  Private
 * @query   days (default: 7)
 */
router.get('/collection-trends', dashboardController.getCollectionTrendsData);

/**
 * @route   GET /api/v1/dashboard/loan-trends
 * @desc    Get loan disbursement trends
 * @access  Private
 * @query   days (default: 7)
 */
router.get('/loan-trends', dashboardController.getLoanTrendsData);

/**
 * @route   GET /api/v1/dashboard/top-borrowers
 * @desc    Get top performing borrowers
 * @access  Private
 * @query   limit (default: 10)
 */
router.get('/top-borrowers', dashboardController.getTopPerformingBorrowers);

/**
 * @route   GET /api/v1/dashboard/defaulters
 * @desc    Get defaulters report
 * @access  Private
 */
router.get('/defaulters', dashboardController.getDefaultersReport);

/**
 * @route   GET /api/v1/dashboard/portfolio
 * @desc    Get portfolio summary
 * @access  Private
 */
router.get('/portfolio', dashboardController.getPortfolioSummaryData);

/**
 * @route   GET /api/v1/dashboard/payment-modes
 * @desc    Get payment mode distribution
 * @access  Private
 * @query   period (today, week, month)
 */
router.get('/payment-modes', dashboardController.getPaymentModeStats);

/**
 * @route   GET /api/v1/dashboard/collection-efficiency
 * @desc    Get collection efficiency report
 * @access  Private
 * @query   period (week, month)
 */
router.get('/collection-efficiency', dashboardController.getCollectionEfficiencyReport);

/**
 * @route   GET /api/v1/dashboard/monthly-comparison
 * @desc    Get monthly comparison (current vs previous month)
 * @access  Private
 */
router.get('/monthly-comparison', dashboardController.getMonthlyComparison);

/**
 * @route   GET /api/v1/dashboard/weekly-report
 * @desc    Get weekly report
 * @access  Private
 */
router.get('/weekly-report', dashboardController.getWeeklyReport);

module.exports = router;