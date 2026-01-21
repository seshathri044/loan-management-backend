const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loan.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const {
  loanCreationValidation,
  loanUpdateValidation,
  loanApprovalValidation
} = require('../middleware/loan.middleware');

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/v1/loans/calculate-emi
 * @desc    Calculate EMI without creating loan
 * @access  Private
 */
router.post('/calculate-emi', loanController.calculateLoanEMI);

/**
 * @route   POST /api/v1/loans
 * @desc    Create new loan
 * @access  Private
 */
router.post('/', loanCreationValidation, loanController.createLoan);

/**
 * @route   GET /api/v1/loans
 * @desc    Get all loans with filters
 * @access  Private
 * @query   page, limit, status, borrower_id, search, from_date, to_date
 */
router.get('/', loanController.getAllLoans);

/**
 * @route   GET /api/v1/loans/stats
 * @desc    Get loan statistics
 * @access  Private
 * @query   period (all, today, week, month)
 */
router.get('/stats', loanController.getLoanStats);

/**
 * @route   GET /api/v1/loans/due-today
 * @desc    Get loans due today
 * @access  Private
 */
router.get('/due-today', loanController.getTodaysDueLoans);

/**
 * @route   GET /api/v1/loans/overdue
 * @desc    Get overdue loans
 * @access  Private
 */
router.get('/overdue', loanController.getOverdueLoansController);

/**
 * @route   GET /api/v1/loans/:id
 * @desc    Get loan by ID with full details
 * @access  Private
 */
router.get('/:id', loanController.getLoanById);

/**
 * @route   PUT /api/v1/loans/:id
 * @desc    Update loan
 * @access  Private
 */
router.put('/:id', loanUpdateValidation, loanController.updateLoan);

/**
 * @route   POST /api/v1/loans/:id/approve
 * @desc    Approve pending loan
 * @access  Private
 */
router.post('/:id/approve', loanApprovalValidation, loanController.approveLoan);

/**
 * @route   POST /api/v1/loans/:id/cancel
 * @desc    Cancel loan
 * @access  Private
 */
router.post('/:id/cancel', loanController.cancelLoan);

module.exports = router;