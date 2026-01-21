const express = require('express');
const router = express.Router();
const borrowerController = require('../controllers/borrower.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { handleFileUpload } = require('../middleware/upload.middleware');
const {
  borrowerRegistrationValidation,
  borrowerUpdateValidation
} = require('../middleware/validation.middleware');

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/v1/borrowers
 * @desc    Create new borrower
 * @access  Private
 */
router.post(
  '/',
  handleFileUpload,
  borrowerRegistrationValidation,
  borrowerController.createBorrower
);

/**
 * @route   GET /api/v1/borrowers
 * @desc    Get all borrowers with filters
 * @access  Private
 * @query   page, limit, search, status, sort_by, sort_order
 */
router.get('/', borrowerController.getAllBorrowers);

/**
 * @route   GET /api/v1/borrowers/stats
 * @desc    Get borrower statistics
 * @access  Private
 */
router.get('/stats', borrowerController.getBorrowerStats);

/**
 * @route   GET /api/v1/borrowers/search
 * @desc    Search borrowers
 * @access  Private
 * @query   q (search query)
 */
router.get('/search', borrowerController.searchBorrowers);

/**
 * @route   GET /api/v1/borrowers/status/:status
 * @desc    Get borrowers by status
 * @access  Private
 * @params  status (active, inactive, defaulter, blocked)
 */
router.get('/status/:status', borrowerController.getBorrowersByStatus);

/**
 * @route   GET /api/v1/borrowers/:id
 * @desc    Get borrower by ID
 * @access  Private
 */
router.get('/:id', borrowerController.getBorrowerById);

/**
 * @route   PUT /api/v1/borrowers/:id
 * @desc    Update borrower
 * @access  Private
 */
router.put(
  '/:id',
  handleFileUpload,
  borrowerUpdateValidation,
  borrowerController.updateBorrower
);

/**
 * @route   DELETE /api/v1/borrowers/:id
 * @desc    Delete borrower
 * @access  Private
 */
router.delete('/:id', borrowerController.deleteBorrower);

module.exports = router;