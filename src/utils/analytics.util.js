/**
 * Analytics Utility Functions
 */

/**
 * Get Date Condition for SQL Queries
 */
const getDateCondition = (period, dateColumn) => {
  switch (period) {
    case 'today':
      return `DATE(${dateColumn}) = CURDATE()`;
    case 'week':
      return `${dateColumn} >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`;
    case 'month':
      return `${dateColumn} >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`;
    default:
      return `DATE(${dateColumn}) = CURDATE()`;
  }
};

/**
 * Calculate Growth Percentage
 */
const calculateGrowth = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return (((current - previous) / previous) * 100).toFixed(2);
};

/**
 * Get Collection Trends
 */
const getCollectionTrends = async (adminId, days) => {
  const { query } = require('../config/database');
  
  const trends = await query(
    `SELECT 
      DATE(payment_date) as date,
      COUNT(*) as count,
      SUM(amount) as amount
     FROM collections
     WHERE admin_id = ?
     AND payment_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY DATE(payment_date)
     ORDER BY date ASC`,
    [adminId, days]
  );

  return trends;
};

/**
 * Get Loan Disbursement Trends
 */
const getLoanDisbursementTrends = async (adminId, days) => {
  const { query } = require('../config/database');
  
  const trends = await query(
    `SELECT 
      DATE(disbursement_date) as date,
      COUNT(*) as count,
      SUM(principal_amount) as amount
     FROM loans
     WHERE admin_id = ?
     AND disbursement_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     AND status != 'pending'
     GROUP BY DATE(disbursement_date)
     ORDER BY date ASC`,
    [adminId, days]
  );

  return trends;
};

/**
 * Get Top Borrowers
 */
const getTopBorrowers = async (adminId, limit) => {
  const { query } = require('../config/database');
  
  const topBorrowers = await query(
    `SELECT 
      b.id,
      b.name,
      b.mobile,
      COUNT(l.id) as total_loans,
      SUM(l.total_amount) as total_borrowed,
      SUM(l.paid_amount) as total_paid
     FROM borrowers b
     JOIN loans l ON b.id = l.borrower_id
     WHERE b.admin_id = ?
     GROUP BY b.id
     ORDER BY total_paid DESC
     LIMIT ?`,
    [adminId, limit]
  );

  return topBorrowers;
};

/**
 * Get Defaulters List
 */
const getDefaultersList = async (adminId) => {
  const { query } = require('../config/database');
  
  const defaulters = await query(
    `SELECT 
      b.id,
      b.name,
      b.mobile,
      COUNT(DISTINCT l.id) as overdue_loans,
      SUM(i.due_amount - i.paid_amount) as overdue_amount,
      MIN(i.due_date) as first_overdue_date
     FROM borrowers b
     JOIN loans l ON b.id = l.borrower_id
     JOIN installment_schedule i ON l.id = i.loan_id
     WHERE b.admin_id = ?
     AND i.status = 'overdue'
     GROUP BY b.id
     ORDER BY overdue_amount DESC`,
    [adminId]
  );

  return defaulters;
};

/**
 * Get Portfolio Summary
 */
const getPortfolioSummary = async (adminId) => {
  const { query } = require('../config/database');
  
  const summary = await query(
    `SELECT 
      COUNT(DISTINCT b.id) as total_borrowers,
      COUNT(DISTINCT CASE WHEN b.status = 'active' THEN b.id END) as active_borrowers,
      COUNT(DISTINCT l.id) as total_loans,
      SUM(l.principal_amount) as total_principal_disbursed,
      SUM(l.interest_amount) as total_interest_expected,
      SUM(l.paid_amount) as total_collected,
      SUM(l.pending_amount) as total_outstanding
     FROM borrowers b
     LEFT JOIN loans l ON b.id = l.borrower_id
     WHERE b.admin_id = ?`,
    [adminId]
  );

  return summary[0] || {};
};

/**
 * Get Payment Mode Distribution
 */
const getPaymentModeDistribution = async (adminId, period) => {
  const { query } = require('../config/database');
  const dateCondition = getDateCondition(period, 'payment_date');
  
  const distribution = await query(
    `SELECT 
      payment_mode,
      COUNT(*) as count,
      SUM(amount) as total_amount
     FROM collections
     WHERE admin_id = ?
     AND ${dateCondition}
     GROUP BY payment_mode`,
    [adminId]
  );

  return distribution;
};

/**
 * Get Collection Efficiency
 */
const getCollectionEfficiency = async (adminId, period) => {
  const { query } = require('../config/database');
  const dateCondition = getDateCondition(period, 'i.due_date');
  
  const efficiency = await query(
    `SELECT 
      COUNT(*) as total_due,
      SUM(CASE WHEN i.status = 'paid' THEN 1 ELSE 0 END) as collected,
      SUM(CASE WHEN i.status = 'overdue' THEN 1 ELSE 0 END) as overdue,
      SUM(i.due_amount) as total_due_amount,
      SUM(i.paid_amount) as total_collected_amount
     FROM installment_schedule i
     JOIN loans l ON i.loan_id = l.id
     WHERE l.admin_id = ?
     AND ${dateCondition}`,
    [adminId]
  );

  const result = efficiency[0];
  const collectionRate = result.total_due > 0 
    ? ((result.collected / result.total_due) * 100).toFixed(2)
    : 0;

  return {
    ...result,
    collection_rate: parseFloat(collectionRate)
  };
};

module.exports = {
  getDateCondition,
  calculateGrowth,
  getCollectionTrends,
  getLoanDisbursementTrends,
  getTopBorrowers,
  getDefaultersList,
  getPortfolioSummary,
  getPaymentModeDistribution,
  getCollectionEfficiency
};