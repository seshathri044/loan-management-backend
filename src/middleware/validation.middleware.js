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
 * Registration Validation Rules
 */
const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2-100 characters'),
  
  // body('mobile')
  //   .trim()
  //   .notEmpty().withMessage('Mobile number is required')
  //   .matches(/^{10,15}$/).withMessage('Invalid mobile number format'),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    // REMOVED THE STRICT PASSWORD REGEX
  
  body('email')
    .optional()
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('business_name')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Business name too long'),
  
  body('gender')
    .optional()
    .isIn(['male', 'female', 'others']).withMessage('Invalid gender value'),
  
  handleValidationErrors
];

/**
 * Login Validation Rules
 */
const loginValidation = [
  // body('mobile')
  //   .trim()
  //   .notEmpty().withMessage('Mobile number is required')
  //   .matches(/^[+]?[0-9]{10,15}$/).withMessage('Invalid mobile number format'),
  
  body('password')
    .notEmpty().withMessage('Password is required'),
  
  handleValidationErrors
];

/**
 * Update Profile Validation
 */
const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2-100 characters'),
  
  body('email')
    .optional()
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('business_name')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Business name too long'),
  
  body('gender')
    .optional()
    .isIn(['male', 'female', 'others']).withMessage('Invalid gender value'),
  
  body('address')
    .optional()
    .trim(),
  
  handleValidationErrors
];

/**
 * Change Password Validation
 */
const changePasswordValidation = [
  body('current_password')
    .notEmpty().withMessage('Current password is required'),
  
  body('new_password')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    // REMOVED THE STRICT PASSWORD REGEX
  
  body('confirm_password')
    .notEmpty().withMessage('Confirm password is required')
    .custom((value, { req }) => value === req.body.new_password)
    .withMessage('Passwords do not match'),
  
  handleValidationErrors
];

/**
 * Refresh Token Validation
 */
const refreshTokenValidation = [
  body('refresh_token')
    .notEmpty().withMessage('Refresh token is required'),
  
  handleValidationErrors
];

/**
 * Borrower Registration Validation
 */
const borrowerRegistrationValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Borrower name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2-100 characters'),
  
  body('mobile')
    .trim()
    .notEmpty().withMessage('Mobile number is required')
    .matches(/^[+]?[0-9]{10,15}$/).withMessage('Invalid mobile number format'),
  
  body('email')
    .optional()
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('gender')
    .optional()
    .isIn(['male', 'female', 'others']).withMessage('Invalid gender value'),
  
  body('age')
    .optional()
    .isInt({ min: 18, max: 100 }).withMessage('Age must be between 18-100'),
  
  body('business_name')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Business name too long'),
  
  body('collection_days')
    .optional()
    .isArray().withMessage('Collection days must be an array'),
  
  body('guarantor_mobile')
  .optional({ nullable: true, checkFalsy: true })
  .matches(/^[+]?[0-9]{10,15}$/).withMessage('Invalid guarantor mobile format'),
  
  body('reference1_mobile')
  .optional({ nullable: true, checkFalsy: true })
  .matches(/^[+]?[0-9]{10,15}$/).withMessage('Invalid reference mobile format'),
  
  body('reference2_mobile')
  .optional({ nullable: true, checkFalsy: true })
  .matches(/^[+]?[0-9]{10,15}$/).withMessage('Invalid reference mobile format'),
  
  handleValidationErrors
];

/**
 * Borrower Update Validation
 */
const borrowerUpdateValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2-100 characters'),
  
  body('email')
    .optional()
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('gender')
    .optional()
    .isIn(['male', 'female', 'others']).withMessage('Invalid gender value'),
  
  body('age')
    .optional()
    .isInt({ min: 18, max: 100 }).withMessage('Age must be between 18-100'),
  
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'defaulter', 'blocked']).withMessage('Invalid status'),
  
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation,
  refreshTokenValidation,
  borrowerRegistrationValidation,
  borrowerUpdateValidation
};