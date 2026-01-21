const { body, validationResult } = require('express-validator');
const ApiResponse = require('../utils/response.util');

/**
 * Handle Validation Errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
      value: err.value
    }));
    
    return ApiResponse.validationError(res, formattedErrors);
  }
  
  next();
};

/**
 * Loan Creation Validation
 */
const loanCreationValidation = [
  body('borrower_id')
    .notEmpty().withMessage('Borrower ID is required')
    .isInt({ min: 1 }).withMessage('Invalid borrower ID'),
  
  body('principal_amount')
    .notEmpty().withMessage('Principal amount is required')
    .isFloat({ min: 1 }).withMessage('Principal amount must be greater than 0'),
  
  body('interest_rate')
    .notEmpty().withMessage('Interest rate is required')
    .isFloat({ min: 0, max: 100 }).withMessage('Interest rate must be between 0 and 100'),
  
  body('installments')
    .notEmpty().withMessage('Number of installments is required')
    .isInt({ min: 1, max: 1000 }).withMessage('Installments must be between 1 and 1000'),
  
  body('installment_frequency')
    .optional()
    .isIn(['daily', 'weekly', 'monthly']).withMessage('Invalid installment frequency'),
  
  body('disbursement_date')
    .notEmpty().withMessage('Disbursement date is required')
    .isISO8601().withMessage('Invalid date format'),
  
  body('start_date')
    .notEmpty().withMessage('Start date is required')
    .isISO8601().withMessage('Invalid date format'),
  
  handleValidationErrors
];

/**
 * Loan Update Validation
 */
const loanUpdateValidation = [
  body('status')
    .optional()
    .isIn(['pending', 'active', 'completed', 'defaulted', 'cancelled'])
    .withMessage('Invalid loan status'),
  
  body('notes')
    .optional()
    .isString().withMessage('Notes must be a string'),
  
  handleValidationErrors
];

/**
 * Loan Approval Validation
 */
const loanApprovalValidation = [
  body('disbursement_date')
    .notEmpty().withMessage('Disbursement date is required')
    .isISO8601().withMessage('Invalid date format'),
  
  body('notes')
    .optional()
    .isString().withMessage('Notes must be a string'),
  
  handleValidationErrors
];

module.exports = {
  loanCreationValidation,
  loanUpdateValidation,
  loanApprovalValidation,
  handleValidationErrors
};