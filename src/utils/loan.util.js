const { query } = require('../config/database');

/**
 * Check if borrower has active loans
 */
const hasActiveLoan = async (borrowerId) => {
  const result = await query(
    'SELECT COUNT(*) as count FROM loans WHERE borrower_id = ? AND status = "active"',
    [borrowerId]
  );
  return result[0].count > 0;
};

/**
 * Get borrower's active loan count
 */
const getActiveLoanCount = async (borrowerId) => {
  const result = await query(
    'SELECT COUNT(*) as count FROM loans WHERE borrower_id = ? AND status = "active"',
    [borrowerId]
  );
  return result[0].count;
};

/**
 * Get borrower's loan history
 */
const getBorrowerLoanHistory = async (borrowerId) => {
  return await query(
    `SELECT 
      l.*,
      (l.paid_amount / l.total_amount * 100) as payment_percentage
     FROM loans l
     WHERE l.borrower_id = ?
     ORDER BY l.created_at DESC`,
    [borrowerId]
  );
};

/**
 * Check if loan number exists
 */
const loanNumberExists = async (loanNumber) => {
  const result = await query(
    'SELECT COUNT(*) as count FROM loans WHERE loan_number = ?',
    [loanNumber]
  );
  return result[0].count > 0;
};

/**
 * Get overdue installments for a loan
 */
const getOverdueInstallments = async (loanId) => {
  return await query(
    `SELECT * FROM installment_schedule
     WHERE loan_id = ? 
     AND status IN ('pending', 'partial', 'overdue')
     AND due_date < CURDATE()
     ORDER BY installment_number ASC`,
    [loanId]
  );
};

/**
 * Get today's due installments for a loan
 */
const getTodaysDueInstallments = async (loanId) => {
  return await query(
    `SELECT * FROM installment_schedule
     WHERE loan_id = ? 
     AND status IN ('pending', 'partial')
     AND due_date = CURDATE()
     ORDER BY installment_number ASC`,
    [loanId]
  );
};

/**
 * Get upcoming installments
 */
const getUpcomingInstallments = async (loanId, days = 7) => {
  return await query(
    `SELECT * FROM installment_schedule
     WHERE loan_id = ? 
     AND status = 'pending'
     AND due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
     ORDER BY due_date ASC`,
    [loanId, days]
  );
};

/**
 * Get loan summary
 */
const getLoanSummary = async (loanId) => {
  const [loan] = await query(
    `SELECT 
      l.*,
      b.name as borrower_name,
      b.mobile as borrower_mobile,
      b.business_name,
      (SELECT COUNT(*) FROM installment_schedule WHERE loan_id = l.id AND status = 'paid') as paid_installments_count,
      (SELECT COUNT(*) FROM installment_schedule WHERE loan_id = l.id AND status = 'overdue') as overdue_installments_count,
      (SELECT COUNT(*) FROM installment_schedule WHERE loan_id = l.id AND status = 'pending') as pending_installments_count
     FROM loans l
     JOIN borrowers b ON l.borrower_id = b.id
     WHERE l.id = ?`,
    [loanId]
  );

  if (!loan) return null;

  // Get installment details
  const installments = await query(
    'SELECT * FROM installment_schedule WHERE loan_id = ? ORDER BY installment_number ASC',
    [loanId]
  );

  loan.installment_schedule = installments;

  return loan;
};

/**
 * Calculate loan statistics for admin
 */
const calculateLoanStats = async (adminId, period = 'all') => {
  let dateCondition = '';
  
  switch (period) {
    case 'today':
      dateCondition = 'AND DATE(l.created_at) = CURDATE()';
      break;
    case 'week':
      dateCondition = 'AND YEARWEEK(l.created_at) = YEARWEEK(NOW())';
      break;
    case 'month':
      dateCondition = 'AND YEAR(l.created_at) = YEAR(NOW()) AND MONTH(l.created_at) = MONTH(NOW())';
      break;
  }

  const stats = await query(
    `SELECT 
      COUNT(*) as total_loans,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_loans,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_loans,
      SUM(CASE WHEN status = 'defaulted' THEN 1 ELSE 0 END) as defaulted_loans,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_loans,
      SUM(principal_amount) as total_principal,
      SUM(interest_amount) as total_interest,
      SUM(total_amount) as total_loan_amount,
      SUM(paid_amount) as total_collected,
      SUM(pending_amount) as total_pending
     FROM loans l
     WHERE l.admin_id = ? ${dateCondition}`,
    [adminId]
  );

  return stats[0];
};

/**
 * Get loans due today for admin
 */
const getLoansDueToday = async (adminId) => {
  return await query(
    `SELECT 
      l.id,
      l.loan_number,
      b.name as borrower_name,
      b.mobile as borrower_mobile,
      i.due_amount,
      i.installment_number,
      i.status as installment_status
     FROM loans l
     JOIN borrowers b ON l.borrower_id = b.id
     JOIN installment_schedule i ON l.id = i.loan_id
     WHERE l.admin_id = ?
     AND i.due_date = CURDATE()
     AND i.status IN ('pending', 'partial')
     ORDER BY b.name ASC`,
    [adminId]
  );
};

/**
 * Get overdue loans for admin
 */
const getOverdueLoans = async (adminId) => {
  return await query(
    `SELECT DISTINCT
      l.id,
      l.loan_number,
      b.name as borrower_name,
      b.mobile as borrower_mobile,
      b.guarantor_mobile,
      COUNT(i.id) as overdue_count,
      SUM(i.due_amount) as overdue_amount,
      MAX(i.days_overdue) as max_days_overdue
     FROM loans l
     JOIN borrowers b ON l.borrower_id = b.id
     JOIN installment_schedule i ON l.id = i.loan_id
     WHERE l.admin_id = ?
     AND i.status = 'overdue'
     GROUP BY l.id
     ORDER BY max_days_overdue DESC`,
    [adminId]
  );
};

/**
 * Update loan status based on payments
 */
const updateLoanStatus = async (loanId) => {
  const [loan] = await query(
    'SELECT * FROM loans WHERE id = ?',
    [loanId]
  );

  if (!loan) return false;

  let newStatus = loan.status;

  // Check if fully paid
  if (loan.paid_amount >= loan.total_amount) {
    newStatus = 'completed';
    await query(
      'UPDATE loans SET status = ?, completed_at = NOW() WHERE id = ?',
      [newStatus, loanId]
    );
    return true;
  }

  // Check for overdue
  const overdueCount = await query(
    `SELECT COUNT(*) as count FROM installment_schedule 
     WHERE loan_id = ? AND status = 'overdue'`,
    [loanId]
  );

  if (overdueCount[0].count > 0 && loan.status === 'active') {
    // Mark as defaulted if more than 3 overdue installments
    if (overdueCount[0].count >= 3) {
      newStatus = 'defaulted';
      await query(
        'UPDATE loans SET status = ? WHERE id = ?',
        [newStatus, loanId]
      );
      
      // Update borrower status
      await query(
        'UPDATE borrowers SET status = "defaulter" WHERE id = ?',
        [loan.borrower_id]
      );
    }
  }

  return true;
};

/**
 * Get next installment due
 */
const getNextInstallmentDue = async (loanId) => {
  const [installment] = await query(
    `SELECT * FROM installment_schedule
     WHERE loan_id = ?
     AND status IN ('pending', 'partial')
     ORDER BY installment_number ASC
     LIMIT 1`,
    [loanId]
  );

  return installment || null;
};

module.exports = {
  hasActiveLoan,
  getActiveLoanCount,
  getBorrowerLoanHistory,
  loanNumberExists,
  getOverdueInstallments,
  getTodaysDueInstallments,
  getUpcomingInstallments,
  getLoanSummary,
  calculateLoanStats,
  getLoansDueToday,
  getOverdueLoans,
  updateLoanStatus,
  getNextInstallmentDue
};