const express = require('express');
const router = express.Router();
const collectionController = require('../controllers/collection.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const {
  collectionCreationValidation
} = require('../middleware/collection.middleware');

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/v1/collections
 * @desc    Record payment/collection
 * @access  Private
 */
router.post('/', collectionCreationValidation, collectionController.recordCollection);

/**
 * @route   GET /api/v1/collections
 * @desc    Get all collections with filters
 * @access  Private
 * @query   page, limit, loan_id, borrower_id, from_date, to_date, payment_mode
 */
router.get('/', collectionController.getAllCollections);

/**
 * @route   GET /api/v1/collections/stats
 * @desc    Get collection statistics
 * @access  Private
 * @query   period (today, week, month, all)
 */
router.get('/stats', collectionController.getCollectionStats);

/**
 * @route   GET /api/v1/collections/today
 * @desc    Get today's collections
 * @access  Private
 */
router.get('/today', collectionController.getTodaysCollections);

/**
 * @route   GET /api/v1/collections/loan/:loan_id
 * @desc    Get payment history for a loan
 * @access  Private
 */
router.get('/loan/:loan_id', collectionController.getLoanPaymentHistory);

/**
 * @route   GET /api/v1/collections/borrower/:borrower_id
 * @desc    Get payment history for a borrower
 * @access  Private
 */
router.get('/borrower/:borrower_id', collectionController.getBorrowerPaymentHistory);

/**
 * @route   GET /api/v1/collections/:id
 * @desc    Get collection by ID
 * @access  Private
 */
router.get('/:id', collectionController.getCollectionById);

/**
 * @route   GET /api/v1/collections/:id/receipt
 * @desc    Get formatted receipt
 * @access  Private
 */
router.get('/:id/receipt', collectionController.getReceipt);

module.exports = router;