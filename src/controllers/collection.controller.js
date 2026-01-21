const { query, transaction } = require('../config/database');
const ApiResponse = require('../utils/response.util');
const { sendPaymentConfirmationSMS } = require('../utils/sms.util');
const {
  generateReceiptNumber,
  receiptNumberExists,
  generateReceiptData,
  formatReceiptForPrint
} = require('../utils/receipt.util');
const {
  calculateLateFee,
  calculateDaysBetween,
  calculatePaymentBreakdown
} = require('../utils/calculation.util');
const { updateLoanStatus } = require('../utils/loan.util');

/**
 * Record Payment/Collection
 */
const recordCollection = async (req, res) => {
  try {
    const {
      loan_id,
      amount,
      payment_date,
      payment_mode,
      transaction_id,
      installment_number,
      notes
    } = req.body;

    const adminId = req.admin.id;

    // Get loan details
    const loans = await query(
      `SELECT l.*, b.name as borrower_name, b.mobile as borrower_mobile, b.sms_enabled
       FROM loans l
       JOIN borrowers b ON l.borrower_id = b.id
       WHERE l.id = ? AND l.admin_id = ?`,
      [loan_id, adminId]
    );

    if (loans.length === 0) {
      return ApiResponse.notFound(res, 'Loan not found');
    }

    const loan = loans[0];

    // Check loan status
    if (loan.status === 'completed') {
      return ApiResponse.badRequest(res, 'Loan is already fully paid');
    }

    if (loan.status === 'cancelled') {
      return ApiResponse.badRequest(res, 'Cannot collect payment for cancelled loan');
    }

    // Check if payment amount exceeds pending amount
    if (parseFloat(amount) > loan.pending_amount) {
      return ApiResponse.badRequest(res, `Payment amount exceeds pending amount (Rs.${loan.pending_amount})`);
    }

    // Get admin settings for late fee
    const [settings] = await query(
      'SELECT late_fee_per_day FROM admin_settings WHERE admin_id = ?',
      [adminId]
    );
    const lateFeePerDay = settings?.late_fee_per_day || 50;

    // Get next pending installment or specific installment
    let installment;
    if (installment_number) {
      [installment] = await query(
        'SELECT * FROM installment_schedule WHERE loan_id = ? AND installment_number = ?',
        [loan_id, installment_number]
      );
    } else {
      [installment] = await query(
        `SELECT * FROM installment_schedule 
         WHERE loan_id = ? AND status IN ('pending', 'partial', 'overdue')
         ORDER BY installment_number ASC LIMIT 1`,
        [loan_id]
      );
    }

    if (!installment) {
      return ApiResponse.notFound(res, 'No pending installment found');
    }

    // Calculate late fee if overdue
    const today = new Date(payment_date);
    const dueDate = new Date(installment.due_date);
    const daysLate = Math.max(0, Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)));
    const lateFee = calculateLateFee(daysLate, lateFeePerDay);

    // Calculate payment breakdown
    const pendingAmount = installment.due_amount - installment.paid_amount;
    const breakdown = calculatePaymentBreakdown(
      parseFloat(amount),
      installment.principal_part * (1 - installment.paid_amount / installment.due_amount),
      installment.interest_part * (1 - installment.paid_amount / installment.due_amount)
    );

    // Generate unique receipt number
    let receiptNumber;
    let attempts = 0;
    do {
      receiptNumber = generateReceiptNumber(adminId);
      attempts++;
    } while (await receiptNumberExists(receiptNumber) && attempts < 10);

    if (attempts >= 10) {
      return ApiResponse.serverError(res, 'Failed to generate receipt number');
    }

    // Record collection in transaction
    const result = await transaction(async (conn) => {
      // Insert collection record
      const [collectionResult] = await conn.execute(
        `INSERT INTO collections (
          admin_id, borrower_id, loan_id, receipt_number,
          amount, principal_part, interest_part, late_fee,
          payment_date, payment_mode, transaction_id,
          installment_number, days_late, notes, collected_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          adminId,
          loan.borrower_id,
          loan_id,
          receiptNumber,
          amount,
          breakdown.principal,
          breakdown.interest,
          lateFee,
          payment_date,
          payment_mode,
          transaction_id || null,
          installment.installment_number,
          daysLate,
          notes || null,
          adminId
        ]
      );
      const collectionId = collectionResult.insertId;

      // Update installment
      const newPaidAmount = parseFloat(installment.paid_amount) + parseFloat(amount);
      let installmentStatus = 'partial';
      
      if (newPaidAmount >= installment.due_amount) {
        installmentStatus = 'paid';
      }

      await conn.execute(
        `UPDATE installment_schedule SET
          paid_amount = ?,
          paid_date = ?,
          status = ?,
          days_overdue = ?,
          late_fee = ?
         WHERE id = ?`,
        [newPaidAmount, payment_date, installmentStatus, daysLate, lateFee, installment.id]
      );

      // Update loan totals
      // Update loan totals
const newLoanPaidAmount = parseFloat(loan.paid_amount || 0) + parseFloat(amount);
const newLoanPendingAmount = parseFloat(loan.total_amount || 0) - newLoanPaidAmount;

// Count paid installments
const [paidCount] = await conn.execute(
  'SELECT COUNT(*) as count FROM installment_schedule WHERE loan_id = ? AND status = "paid"',
  [loan_id]
);

await conn.execute(
  `UPDATE loans SET
    paid_amount = ?,
    pending_amount = ?,
    paid_installments = ?
   WHERE id = ?`,
  [
    newLoanPaidAmount.toFixed(2),
    Math.max(0, newLoanPendingAmount).toFixed(2),
    paidCount[0].count,
    loan_id
  ]
);

      return collectionId;
    });

    // Update loan status (check if completed or defaulted)
    await updateLoanStatus(loan_id);

    // Get created collection
    const collection = await generateReceiptData(result);

    // Send SMS confirmation
    if (loan.sms_enabled) {
      await sendPaymentConfirmationSMS(
        { name: loan.borrower_name, mobile: loan.borrower_mobile },
        amount,
        collection.loan.pending_amount,
        adminId
      );
    }

    // Log audit
    await query(
      'INSERT INTO audit_logs (admin_id, action_type, table_name, record_id, new_values) VALUES (?, ?, ?, ?, ?)',
      [adminId, 'payment', 'collections', result, JSON.stringify(collection)]
    );

    return ApiResponse.created(res, collection, 'Payment recorded successfully');

  } catch (error) {
    console.error('Record Collection Error:', error);
    return ApiResponse.serverError(res, 'Failed to record payment');
  }
};
// Only showing the fixed getAllCollections function - replace line 211-280

/**
 * Get All Collections with Filters
 */
// CORRECTED getAllCollections - Replace entire function

const getAllCollections = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const {
      page = 1,
      limit = 10,
      loan_id = '',
      borrower_id = '',
      from_date = '',
      to_date = '',
      payment_mode = '',
      sort_by = 'payment_date',
      sort_order = 'DESC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Validate and sanitize sort column
    const validSortColumns = {
      'payment_date': 'c.payment_date',
      'amount': 'c.amount',
      'created_at': 'c.created_at'
    };
    const sortColumn = validSortColumns[sort_by] || 'c.payment_date';
    const sortDir = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Build WHERE conditions
    let whereConditions = ['c.admin_id = ?'];
    const params = [adminId];

    if (loan_id) {
      whereConditions.push('c.loan_id = ?');
      params.push(loan_id);
    }

    if (borrower_id) {
      whereConditions.push('c.borrower_id = ?');
      params.push(borrower_id);
    }

    if (payment_mode) {
      whereConditions.push('c.payment_mode = ?');
      params.push(payment_mode);
    }

    if (from_date) {
      whereConditions.push('DATE(c.payment_date) >= ?');
      params.push(from_date);
    }

    if (to_date) {
      whereConditions.push('DATE(c.payment_date) <= ?');
      params.push(to_date);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countSql = `
      SELECT COUNT(*) as total
      FROM collections c
      JOIN borrowers b ON c.borrower_id = b.id
      JOIN loans l ON c.loan_id = l.id
      WHERE ${whereClause}
    `;
    const countResult = await query(countSql, params);
    const total = countResult[0]?.total || 0;

    // Get data
    const dataSql = `
      SELECT 
        c.*,
        b.name as borrower_name,
        b.mobile as borrower_mobile,
        l.loan_number
      FROM collections c
      JOIN borrowers b ON c.borrower_id = b.id
      JOIN loans l ON c.loan_id = l.id
      WHERE ${whereClause}
      ORDER BY ${sortColumn} ${sortDir}
      LIMIT ? OFFSET ?
    `;

// Use string interpolation for LIMIT/OFFSET (safe with parseInt)
const safeLimit = parseInt(limit);
const safeOffset = parseInt(offset);

// Remove LIMIT ? OFFSET ? from dataSql and add this at the end:
const finalSql = dataSql.replace('LIMIT ? OFFSET ?', `LIMIT ${safeLimit} OFFSET ${safeOffset}`);

// Don't add limit/offset to params
const borrowers = await query(finalSql, params);

    return ApiResponse.paginated(
      res,
      collections,
      {
        page: parseInt(page),
        limit: parseInt(limit),
        total
      },
      'Collections retrieved successfully'
    );

  } catch (error) {
    console.error('Get Collections Error:', error);
    return ApiResponse.serverError(res, 'Failed to get collections');
  }
};
/**
 * Get Collection by ID
 */
const getCollectionById = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;

    // Get collection details
    const collection = await generateReceiptData(id);

    if (!collection) {
      return ApiResponse.notFound(res, 'Collection record not found');
    }

    // Verify admin ownership
    const [record] = await query(
      'SELECT admin_id FROM collections WHERE id = ?',
      [id]
    );

    if (record.admin_id !== adminId) {
      return ApiResponse.forbidden(res, 'Access denied');
    }

    return ApiResponse.success(res, collection, 'Collection details retrieved successfully');

  } catch (error) {
    console.error('Get Collection Error:', error);
    return ApiResponse.serverError(res, 'Failed to get collection details');
  }
};

/**
 * Get Receipt (Formatted for printing)
 */
const getReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;

    // Get collection
    const [record] = await query(
      'SELECT admin_id FROM collections WHERE id = ?',
      [id]
    );

    if (!record) {
      return ApiResponse.notFound(res, 'Receipt not found');
    }

    if (record.admin_id !== adminId) {
      return ApiResponse.forbidden(res, 'Access denied');
    }

    // Generate receipt data
    const receiptData = await generateReceiptData(id);
    const formattedReceipt = formatReceiptForPrint(receiptData);

    return ApiResponse.success(res, {
      receipt_data: receiptData,
      formatted_receipt: formattedReceipt
    }, 'Receipt generated successfully');

  } catch (error) {
    console.error('Get Receipt Error:', error);
    return ApiResponse.serverError(res, 'Failed to generate receipt');
  }
};

/**
 * Get Collection Statistics
 */
const getCollectionStats = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const { period = 'today' } = req.query;

    let dateCondition = '';
    
    switch (period) {
      case 'today':
        dateCondition = 'DATE(payment_date) = CURDATE()';
        break;
      case 'week':
        dateCondition = 'YEARWEEK(payment_date) = YEARWEEK(NOW())';
        break;
      case 'month':
        dateCondition = 'YEAR(payment_date) = YEAR(NOW()) AND MONTH(payment_date) = MONTH(NOW())';
        break;
      default:
        dateCondition = '1=1';
    }

    const stats = await query(
      `SELECT 
        COUNT(*) as total_collections,
        SUM(amount) as total_amount,
        SUM(principal_part) as total_principal,
        SUM(interest_part) as total_interest,
        SUM(late_fee) as total_late_fees,
        AVG(amount) as average_payment,
        COUNT(DISTINCT borrower_id) as unique_borrowers,
        COUNT(DISTINCT loan_id) as loans_with_payments
       FROM collections
       WHERE admin_id = ? AND ${dateCondition}`,
      [adminId]
    );

    // Get payment mode breakdown
    const modeBreakdown = await query(
      `SELECT 
        payment_mode,
        COUNT(*) as count,
        SUM(amount) as total
       FROM collections
       WHERE admin_id = ? AND ${dateCondition}
       GROUP BY payment_mode`,
      [adminId]
    );

    return ApiResponse.success(res, {
      ...stats[0],
      payment_mode_breakdown: modeBreakdown
    }, 'Collection statistics retrieved successfully');

  } catch (error) {
    console.error('Get Collection Stats Error:', error);
    return ApiResponse.serverError(res, 'Failed to get statistics');
  }
};

/**
 * Get Today's Collections
 */
const getTodaysCollections = async (req, res) => {
  try {
    const adminId = req.admin.id;

    const collections = await query(
      `SELECT 
        c.*,
        b.name as borrower_name,
        b.mobile as borrower_mobile,
        l.loan_number
       FROM collections c
       JOIN borrowers b ON c.borrower_id = b.id
       JOIN loans l ON c.loan_id = l.id
       WHERE c.admin_id = ?
       AND DATE(c.payment_date) = CURDATE()
       ORDER BY c.created_at DESC`,
      [adminId]
    );

    const totalAmount = collections.reduce((sum, c) => sum + parseFloat(c.amount), 0);

    return ApiResponse.success(res, {
      collections,
      total_count: collections.length,
      total_amount: totalAmount
    }, `${collections.length} collections today`);

  } catch (error) {
    console.error('Get Todays Collections Error:', error);
    return ApiResponse.serverError(res, 'Failed to get today\'s collections');
  }
};

/**
 * Get Payment History for Loan
 */
const getLoanPaymentHistory = async (req, res) => {
  try {
    const { loan_id } = req.params;
    const adminId = req.admin.id;

    // Verify loan ownership
    const loans = await query(
      'SELECT * FROM loans WHERE id = ? AND admin_id = ?',
      [loan_id, adminId]
    );

    if (loans.length === 0) {
      return ApiResponse.notFound(res, 'Loan not found');
    }

    // Get payment history
    const payments = await query(
      `SELECT * FROM collections 
       WHERE loan_id = ? 
       ORDER BY payment_date DESC, created_at DESC`,
      [loan_id]
    );

    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

    return ApiResponse.success(res, {
      payments,
      total_payments: payments.length,
      total_amount_paid: totalPaid
    }, 'Payment history retrieved successfully');

  } catch (error) {
    console.error('Get Payment History Error:', error);
    return ApiResponse.serverError(res, 'Failed to get payment history');
  }
};

/**
 * Get Payment History for Borrower
 */
const getBorrowerPaymentHistory = async (req, res) => {
  try {
    const { borrower_id } = req.params;
    const adminId = req.admin.id;

    // Verify borrower ownership
    const borrowers = await query(
      'SELECT * FROM borrowers WHERE id = ? AND admin_id = ?',
      [borrower_id, adminId]
    );

    if (borrowers.length === 0) {
      return ApiResponse.notFound(res, 'Borrower not found');
    }

    // Get payment history
    const payments = await query(
      `SELECT 
        c.*,
        l.loan_number
       FROM collections c
       JOIN loans l ON c.loan_id = l.id
       WHERE c.borrower_id = ?
       ORDER BY c.payment_date DESC, c.created_at DESC`,
      [borrower_id]
    );

    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

    return ApiResponse.success(res, {
      payments,
      total_payments: payments.length,
      total_amount_paid: totalPaid
    }, 'Payment history retrieved successfully');

  } catch (error) {
    console.error('Get Borrower Payment History Error:', error);
    return ApiResponse.serverError(res, 'Failed to get payment history');
  }
};

module.exports = {
  recordCollection,
  getAllCollections,
  getCollectionById,
  getReceipt,
  getCollectionStats,
  getTodaysCollections,
  getLoanPaymentHistory,
  getBorrowerPaymentHistory
};