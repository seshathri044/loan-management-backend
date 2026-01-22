const { query, transaction } = require('../config/database');
const ApiResponse = require('../utils/response.util');
const { sendLoanApprovalSMS } = require('../utils/sms.util');
const {
  calculateEMI,
  calculateEndDate,
  generateInstallmentSchedule,
  generateLoanNumber,
  validateLoanParameters
} = require('../utils/calculation.util');
const {
  hasActiveLoan,
  getLoanSummary,
  calculateLoanStats,
  getLoansDueToday,
  getOverdueLoans,
  loanNumberExists
} = require('../utils/loan.util');

/**
 * Calculate EMI (Preview without creating loan)
 */
const calculateLoanEMI = async (req, res) => {
  try {
    const { principal_amount, interest_rate, installments, installment_frequency = 'daily' } = req.body;

    // Validate parameters
    const validation = validateLoanParameters(principal_amount, interest_rate, installments);
    if (!validation.isValid) {
      return ApiResponse.badRequest(res, 'Invalid loan parameters', validation.errors);
    }

    // Calculate EMI
    const emiDetails = calculateEMI(
      parseFloat(principal_amount),
      parseFloat(interest_rate),
      parseInt(installments),
      installment_frequency
    );

    return ApiResponse.success(res, emiDetails, 'EMI calculated successfully');

  } catch (error) {
    console.error('Calculate EMI Error:', error);
    return ApiResponse.serverError(res, 'Failed to calculate EMI');
  }
};

/**
 * Create New Loan
 */
const createLoan = async (req, res) => {
  try {
    const {
      borrower_id,
      principal_amount,
      interest_rate,
      installments,
      installment_frequency = 'daily',
      disbursement_date,
      start_date,
      notes
    } = req.body;

    const adminId = req.admin.id;

    // Check if borrower exists
    const borrowers = await query(
      'SELECT * FROM borrowers WHERE id = ? AND admin_id = ?',
      [borrower_id, adminId]
    );

    if (borrowers.length === 0) {
      return ApiResponse.notFound(res, 'Borrower not found');
    }

    const borrower = borrowers[0];

    // Validate loan parameters
    const validation = validateLoanParameters(principal_amount, interest_rate, installments);
    if (!validation.isValid) {
      return ApiResponse.badRequest(res, 'Invalid loan parameters', validation.errors);
    }

    // Calculate loan details
    const emiDetails = calculateEMI(
      parseFloat(principal_amount),
      parseFloat(interest_rate),
      parseInt(installments),
      installment_frequency
    );

    const endDate = calculateEndDate(new Date(start_date), parseInt(installments), installment_frequency);

    // Generate unique loan number
    let loanNumber;
    let attempts = 0;
    do {
      loanNumber = generateLoanNumber(adminId);
      attempts++;
    } while (await loanNumberExists(loanNumber) && attempts < 10);

    if (attempts >= 10) {
      return ApiResponse.serverError(res, 'Failed to generate unique loan number');
    }

    // Create loan with installment schedule in transaction
    const result = await transaction(async (conn) => {
      // Insert loan
      const [loanResult] = await conn.execute(
        `INSERT INTO loans (
          admin_id, borrower_id, loan_number,
          principal_amount, interest_rate, interest_amount, total_amount,
          installments, installment_amount, installment_frequency,
          disbursement_date, start_date, end_date,
          pending_amount, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          adminId, borrower_id, loanNumber,
          emiDetails.principal, interest_rate, emiDetails.interest, emiDetails.totalAmount,
          emiDetails.installments, emiDetails.installmentAmount, installment_frequency,
          disbursement_date, start_date, endDate.toISOString().split('T')[0],
          emiDetails.totalAmount, 'pending', notes || null
        ]
      );

      const loanId = loanResult.insertId;

      // Generate installment schedule
      const schedule = generateInstallmentSchedule({
        ...emiDetails,
        startDate: new Date(start_date),
        frequency: installment_frequency
      });

      // Insert installment schedule
      for (const installment of schedule) {
        await conn.execute(
          `INSERT INTO installment_schedule (
            loan_id, installment_number, due_date, due_amount,
            principal_part, interest_part, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            loanId,
            installment.installment_number,
            installment.due_date,
            installment.due_amount,
            installment.principal_part,
            installment.interest_part,
            installment.status
          ]
        );
      }

      return loanId;
    });

    // Get created loan with details
    const newLoan = await getLoanSummary(result);

    // Log audit
    await query(
      'INSERT INTO audit_logs (admin_id, action_type, table_name, record_id, new_values) VALUES (?, ?, ?, ?, ?)',
      [adminId, 'create', 'loans', result, JSON.stringify(newLoan)]
    );

    return ApiResponse.created(res, newLoan, 'Loan created successfully');

  } catch (error) {
    console.error('Create Loan Error:', error);
    return ApiResponse.serverError(res, 'Failed to create loan');
  }
};
// Only showing the fixed getAllLoans function - replace line 169-247

/**
 * Get All Loans with Filters
 */
// CORRECTED getAllLoans - Replace entire function

const getAllLoans = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const {
      page = 1,
      limit = 10,
      status = '',
      borrower_id = '',
      search = '',
      from_date = '',
      to_date = '',
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Validate and sanitize sort column
    const validSortColumns = {
      'loan_number': 'l.loan_number',
      'created_at': 'l.created_at',
      'total_amount': 'l.total_amount',
      'pending_amount': 'l.pending_amount',
      'start_date': 'l.start_date'
    };
    const sortColumn = validSortColumns[sort_by] || 'l.created_at';
    const sortDir = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Build WHERE conditions
    let whereConditions = ['l.admin_id = ?'];
    const params = [adminId];

    if (status) {
      whereConditions.push('l.status = ?');
      params.push(status);
    }

    if (borrower_id) {
      whereConditions.push('l.borrower_id = ?');
      params.push(borrower_id);
    }

    if (search) {
      whereConditions.push('(l.loan_number LIKE ? OR b.name LIKE ? OR b.mobile LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (from_date) {
      whereConditions.push('DATE(l.created_at) >= ?');
      params.push(from_date);
    }

    if (to_date) {
      whereConditions.push('DATE(l.created_at) <= ?');
      params.push(to_date);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countSql = `
      SELECT COUNT(*) as total
      FROM loans l
      JOIN borrowers b ON l.borrower_id = b.id
      WHERE ${whereClause}
    `;
    const countResult = await query(countSql, params);
    const total = countResult[0]?.total || 0;

    // Get data
    const dataSql = `
      SELECT 
        l.*,
        b.name as borrower_name,
        b.mobile as borrower_mobile,
        b.business_name,
        (l.paid_amount / l.total_amount * 100) as payment_percentage
      FROM loans l
      JOIN borrowers b ON l.borrower_id = b.id
      WHERE ${whereClause}
      ORDER BY ${sortColumn} ${sortDir}
      LIMIT ? OFFSET ?
    `;

    // Create NEW array, don't reuse params
// Use string interpolation for LIMIT/OFFSET (safe with parseInt)
// Use string interpolation for LIMIT/OFFSET (safe with parseInt)
    const safeLimit = parseInt(limit);
    const safeOffset = parseInt(offset);

    // Remove LIMIT ? OFFSET ? from dataSql and add this at the end:
    const finalSql = dataSql.replace('LIMIT ? OFFSET ?', `LIMIT ${safeLimit} OFFSET ${safeOffset}`);

    const loans = await query(finalSql, params); // ✅ CORRECT: Changed to 'loans'

    return ApiResponse.paginated(
      res,
      loans, // ✅ CORRECT: Changed to 'loans'
      {
        page: parseInt(page),
        limit: parseInt(limit),
        total
      },
      'Loans retrieved successfully'
    );

  } catch (error) {
    console.error('Get Loans Error:', error);
    return ApiResponse.serverError(res, 'Failed to get loans');
  }
};
/**
 * Get Loan by ID
 */
const getLoanById = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;

    // Get loan summary
    const loan = await getLoanSummary(id);

    if (!loan) {
      return ApiResponse.notFound(res, 'Loan not found');
    }

    // Verify admin ownership
    if (loan.admin_id !== adminId) {
      return ApiResponse.forbidden(res, 'Access denied');
    }

    // Get payment history
    const payments = await query(
      `SELECT * FROM collections 
       WHERE loan_id = ? 
       ORDER BY payment_date DESC`,
      [id]
    );

    loan.payment_history = payments;

    return ApiResponse.success(res, loan, 'Loan details retrieved successfully');

  } catch (error) {
    console.error('Get Loan Error:', error);
    return ApiResponse.serverError(res, 'Failed to get loan details');
  }
};

/**
 * Update Loan
 */
const updateLoan = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;
    const { status, notes } = req.body;

    // Check if loan exists
    const existing = await query(
      'SELECT * FROM loans WHERE id = ? AND admin_id = ?',
      [id, adminId]
    );

    if (existing.length === 0) {
      return ApiResponse.notFound(res, 'Loan not found');
    }

    const oldLoan = existing[0];

    // Update loan
    await query(
      `UPDATE loans SET
        status = COALESCE(?, status),
        notes = COALESCE(?, notes),
        completed_at = CASE WHEN ? = 'completed' THEN NOW() ELSE completed_at END
       WHERE id = ? AND admin_id = ?`,
      [status, notes, status, id, adminId]
    );

    // Get updated loan
    const updatedLoan = await getLoanSummary(id);

    // Log audit
    await query(
      'INSERT INTO audit_logs (admin_id, action_type, table_name, record_id, old_values, new_values) VALUES (?, ?, ?, ?, ?, ?)',
      [adminId, 'update', 'loans', id, JSON.stringify(oldLoan), JSON.stringify(updatedLoan)]
    );

    return ApiResponse.success(res, updatedLoan, 'Loan updated successfully');

  } catch (error) {
    console.error('Update Loan Error:', error);
    return ApiResponse.serverError(res, 'Failed to update loan');
  }
};

/**
 * Approve Loan (Change status from pending to active)
 */
const approveLoan = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;
    const { disbursement_date, notes } = req.body;

    // Get loan
    const loans = await query(
      'SELECT l.*, b.name as borrower_name, b.mobile as borrower_mobile, b.sms_enabled FROM loans l JOIN borrowers b ON l.borrower_id = b.id WHERE l.id = ? AND l.admin_id = ?',
      [id, adminId]
    );

    if (loans.length === 0) {
      return ApiResponse.notFound(res, 'Loan not found');
    }

    const loan = loans[0];

    if (loan.status !== 'pending') {
      return ApiResponse.badRequest(res, 'Only pending loans can be approved');
    }

    // Update loan status
    await query(
      `UPDATE loans SET
        status = 'active',
        disbursement_date = ?,
        notes = COALESCE(?, notes)
       WHERE id = ?`,
      [disbursement_date, notes, id]
    );

    // Send approval SMS
    if (loan.sms_enabled) {
      await sendLoanApprovalSMS(
        { name: loan.borrower_name, mobile: loan.borrower_mobile },
        loan.total_amount,
        loan.installments,
        adminId
      );
    }

    // Get updated loan
    const approvedLoan = await getLoanSummary(id);

    // Log audit
    await query(
      'INSERT INTO audit_logs (admin_id, action_type, table_name, record_id, new_values) VALUES (?, ?, ?, ?, ?)',
      [adminId, 'loan_disbursement', 'loans', id, JSON.stringify({ status: 'active', disbursement_date })]
    );

    return ApiResponse.success(res, approvedLoan, 'Loan approved successfully');

  } catch (error) {
    console.error('Approve Loan Error:', error);
    return ApiResponse.serverError(res, 'Failed to approve loan');
  }
};

/**
 * Cancel Loan
 */
const cancelLoan = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;

    // Get loan
    const loans = await query(
      'SELECT * FROM loans WHERE id = ? AND admin_id = ?',
      [id, adminId]
    );

    if (loans.length === 0) {
      return ApiResponse.notFound(res, 'Loan not found');
    }

    const loan = loans[0];

    // Can only cancel pending or active loans with no payments
    if (loan.status === 'completed') {
      return ApiResponse.badRequest(res, 'Cannot cancel completed loan');
    }

    if (loan.paid_amount > 0) {
      return ApiResponse.badRequest(res, 'Cannot cancel loan with payments already made');
    }

    // Update loan status
    await query(
      'UPDATE loans SET status = "cancelled" WHERE id = ?',
      [id]
    );

    // Log audit
    await query(
      'INSERT INTO audit_logs (admin_id, action_type, table_name, record_id, new_values) VALUES (?, ?, ?, ?, ?)',
      [adminId, 'update', 'loans', id, JSON.stringify({ status: 'cancelled' })]
    );

    return ApiResponse.success(res, null, 'Loan cancelled successfully');

  } catch (error) {
    console.error('Cancel Loan Error:', error);
    return ApiResponse.serverError(res, 'Failed to cancel loan');
  }
};

/**
 * Get Loan Statistics
 */
const getLoanStats = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const { period = 'all' } = req.query;

    const stats = await calculateLoanStats(adminId, period);

    return ApiResponse.success(res, stats, 'Loan statistics retrieved successfully');

  } catch (error) {
    console.error('Get Loan Stats Error:', error);
    return ApiResponse.serverError(res, 'Failed to get statistics');
  }
};

/**
 * Get Loans Due Today
 */
const getTodaysDueLoans = async (req, res) => {
  try {
    const adminId = req.admin.id;

    const dueLoans = await getLoansDueToday(adminId);

    return ApiResponse.success(res, dueLoans, `${dueLoans.length} loans due today`);

  } catch (error) {
    console.error('Get Due Loans Error:', error);
    return ApiResponse.serverError(res, 'Failed to get due loans');
  }
};

/**
 * Get Overdue Loans
 */
const getOverdueLoansController = async (req, res) => {
  try {
    const adminId = req.admin.id;

    const overdueLoans = await getOverdueLoans(adminId);

    return ApiResponse.success(res, overdueLoans, `${overdueLoans.length} overdue loans found`);

  } catch (error) {
    console.error('Get Overdue Loans Error:', error);
    return ApiResponse.serverError(res, 'Failed to get overdue loans');
  }
};

module.exports = {
  calculateLoanEMI,
  createLoan,
  getAllLoans,
  getLoanById,
  updateLoan,
  approveLoan,
  cancelLoan,
  getLoanStats,
  getTodaysDueLoans,
  getOverdueLoansController
};