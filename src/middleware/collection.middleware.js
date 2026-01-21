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
 * Collection Creation Validation
 */
const collectionCreationValidation = [
  body('loan_id')
    .notEmpty().withMessage('Loan ID is required')
    .isInt({ min: 1 }).withMessage('Invalid loan ID'),
  
  body('amount')
    .notEmpty().withMessage('Payment amount is required')
    .isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  
  body('payment_date')
    .notEmpty().withMessage('Payment date is required')
    .isISO8601().withMessage('Invalid date format'),
  
  body('payment_mode')
    .notEmpty().withMessage('Payment mode is required')
    .isIn(['cash', 'upi', 'bank_transfer', 'cheque', 'other'])
    .withMessage('Invalid payment mode'),
  
  body('transaction_id')
  .optional({ nullable: true, checkFalsy: true })
  .isString().withMessage('Transaction ID must be a string'),
  
  body('installment_number')
    .optional()
    .isInt({ min: 1 }).withMessage('Invalid installment number'),
  
  body('notes')
  .optional({ nullable: true, checkFalsy: true })
  .isString().withMessage('Notes must be a string'),
  
  handleValidationErrors
];

/**
 * Bulk Collection Validation
 */
const bulkCollectionValidation = [
  body('collections')
    .isArray({ min: 1 }).withMessage('Collections array is required'),
  
  body('collections.*.loan_id')
    .notEmpty().withMessage('Loan ID is required for each collection')
    .isInt({ min: 1 }).withMessage('Invalid loan ID'),
  
  body('collections.*.amount')
    .notEmpty().withMessage('Amount is required for each collection')
    .isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  
  handleValidationErrors
];

module.exports = {
  collectionCreationValidation,
  bulkCollectionValidation,
  handleValidationErrors
};