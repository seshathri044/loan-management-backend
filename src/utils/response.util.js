/**
 * Standardized API Response Utility
 */

class ApiResponse {
  /**
   * Success Response
   */
  static success(res, data = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Error Response
   */
  static error(res, message = 'Error occurred', statusCode = 500, errors = null) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Created Response (201)
   */
  static created(res, data = null, message = 'Resource created successfully') {
    return this.success(res, data, message, 201);
  }

  /**
   * Not Found Response (404)
   */
  static notFound(res, message = 'Resource not found') {
    return this.error(res, message, 404);
  }

  /**
   * Bad Request Response (400)
   */
  static badRequest(res, message = 'Bad request', errors = null) {
    return this.error(res, message, 400, errors);
  }

  /**
   * Unauthorized Response (401)
   */
  static unauthorized(res, message = 'Unauthorized access') {
    return this.error(res, message, 401);
  }

  /**
   * Forbidden Response (403)
   */
  static forbidden(res, message = 'Access forbidden') {
    return this.error(res, message, 403);
  }

  /**
   * Conflict Response (409)
   */
  static conflict(res, message = 'Resource already exists') {
    return this.error(res, message, 409);
  }

  /**
   * Validation Error Response (422)
   */
  static validationError(res, errors) {
    return this.error(res, 'Validation failed', 422, errors);
  }

  /**
   * Internal Server Error (500)
   */
  static serverError(res, message = 'Internal server error') {
    return this.error(res, message, 500);
  }

  /**
   * Paginated Response
   */
  static paginated(res, data, pagination, message = 'Success') {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: Math.ceil(pagination.total / pagination.limit)
      },
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = ApiResponse;