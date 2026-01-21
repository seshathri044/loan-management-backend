const { query } = require('../config/database');
const ApiResponse = require('../utils/response.util');
const {
  getDateCondition,
  calculateGrowth,
  getCollectionTrends,
  getLoanDisbursementTrends,
  getTopBorrowers,
  getDefaultersList,
  getPortfolioSummary,
  getPaymentModeDistribution,
  getCollectionEfficiency
} = require('../utils/analytics.util');

/**
 * Get Dashboard Overview (Main Dashboard)
 */
const getDashboardOverview = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const { period = 'today' } = req.query;

    const dateCondition = getDateCondition(period, 'payment_date');

    // Collection Summary
    const collectionStats = await query(
      `SELECT 
        COUNT(*) as total_collections,
        SUM(amount) as total_amount,
        SUM(principal_part) as total_principal,
        SUM(interest_part) as total_interest,
        SUM(late_fee) as total_late_fees
       FROM collections
       WHERE admin_id = ? AND ${dateCondition}`,
      [adminId]
    );

    // Pending collections for the period
    const pendingStats = await query(
      `SELECT 
        COUNT(*) as pending_count,
        SUM(i.due_amount - i.paid_amount) as pending_amount
       FROM installment_schedule i
       JOIN loans l ON i.loan_id = l.id
       WHERE l.admin_id = ?
       AND ${getDateCondition(period, 'i.due_date')}
       AND i.status IN ('pending', 'partial', 'overdue')`,
      [adminId]
    );

    // Loan Statistics
    const loanStats = await query(
      `SELECT 
        COUNT(*) as total_loans,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_loans,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_loans,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_loans,
        SUM(total_amount) as total_loan_amount,
        SUM(CASE WHEN status = 'active' THEN pending_amount ELSE 0 END) as balance_due
       FROM loans
       WHERE admin_id = ?`,
      [adminId]
    );

    // Borrower Statistics
    const borrowerStats = await query(
      `SELECT 
        COUNT(*) as total_borrowers,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_borrowers,
        SUM(CASE WHEN status = 'defaulter' THEN 1 ELSE 0 END) as defaulters,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive_borrowers
       FROM borrowers
       WHERE admin_id = ?`,
      [adminId]
    );

    // Get loans with active borrowers
    const activeBorrowersWithLoans = await query(
      `SELECT COUNT(DISTINCT borrower_id) as count
       FROM loans
       WHERE admin_id = ? AND status = 'active'`,
      [adminId]
    );

    // Today's due installments
    const todayDue = await query(
      `SELECT COUNT(*) as count, SUM(i.due_amount - i.paid_amount) as amount
       FROM installment_schedule i
       JOIN loans l ON i.loan_id = l.id
       WHERE l.admin_id = ?
       AND DATE(i.due_date) = CURDATE()
       AND i.status IN ('pending', 'partial')`,
      [adminId]
    );

    // Overdue installments
    const overdue = await query(
      `SELECT COUNT(*) as count, SUM(i.due_amount - i.paid_amount) as amount
       FROM installment_schedule i
       JOIN loans l ON i.loan_id = l.id
       WHERE l.admin_id = ?
       AND i.status = 'overdue'`,
      [adminId]
    );

    // Calculate collection percentage
    const collectionPercentage = collectionStats[0].total_amount && pendingStats[0].pending_amount
      ? ((collectionStats[0].total_amount / (collectionStats[0].total_amount + pendingStats[0].pending_amount)) * 100).toFixed(2)
      : 0;

    return ApiResponse.success(res, {
      period,
      collections: {
        total_collections: collectionStats[0].total_collections || 0,
        total_amount: parseFloat(collectionStats[0].total_amount || 0),
        principal: parseFloat(collectionStats[0].total_principal || 0),
        interest: parseFloat(collectionStats[0].total_interest || 0),
        late_fees: parseFloat(collectionStats[0].total_late_fees || 0),
        pending_count: pendingStats[0].pending_count || 0,
        pending_amount: parseFloat(pendingStats[0].pending_amount || 0),
        collection_percentage: parseFloat(collectionPercentage)
      },
      loans: {
        total_loans: loanStats[0].total_loans || 0,
        active_loans: loanStats[0].active_loans || 0,
        completed_loans: loanStats[0].completed_loans || 0,
        pending_loans: loanStats[0].pending_loans || 0,
        total_amount: parseFloat(loanStats[0].total_loan_amount || 0),
        balance_due: parseFloat(loanStats[0].balance_due || 0)
      },
      borrowers: {
        total_borrowers: borrowerStats[0].total_borrowers || 0,
        active_borrowers: activeBorrowersWithLoans[0].count || 0,
        defaulters: borrowerStats[0].defaulters || 0,
        inactive_borrowers: borrowerStats[0].inactive_borrowers || 0
      },
      today_due: {
        count: todayDue[0].count || 0,
        amount: parseFloat(todayDue[0].amount || 0)
      },
      overdue: {
        count: overdue[0].count || 0,
        amount: parseFloat(overdue[0].amount || 0)
      }
    }, 'Dashboard data retrieved successfully');

  } catch (error) {
    console.error('Get Dashboard Error:', error);
    return ApiResponse.serverError(res, 'Failed to get dashboard data');
  }
};

/**
 * Get Collection Trends (Chart Data)
 */
const getCollectionTrendsData = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const { days = 7 } = req.query;

    const trends = await getCollectionTrends(adminId, parseInt(days));

    return ApiResponse.success(res, trends, 'Collection trends retrieved successfully');

  } catch (error) {
    console.error('Get Collection Trends Error:', error);
    return ApiResponse.serverError(res, 'Failed to get collection trends');
  }
};

/**
 * Get Loan Disbursement Trends
 */
const getLoanTrendsData = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const { days = 7 } = req.query;

    const trends = await getLoanDisbursementTrends(adminId, parseInt(days));

    return ApiResponse.success(res, trends, 'Loan trends retrieved successfully');

  } catch (error) {
    console.error('Get Loan Trends Error:', error);
    return ApiResponse.serverError(res, 'Failed to get loan trends');
  }
};

/**
 * Get Top Performing Borrowers
 */
const getTopPerformingBorrowers = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const { limit = 10 } = req.query;

    const topBorrowers = await getTopBorrowers(adminId, parseInt(limit));

    return ApiResponse.success(res, topBorrowers, 'Top borrowers retrieved successfully');

  } catch (error) {
    console.error('Get Top Borrowers Error:', error);
    return ApiResponse.serverError(res, 'Failed to get top borrowers');
  }
};

/**
 * Get Defaulters Report
 */
const getDefaultersReport = async (req, res) => {
  try {
    const adminId = req.admin.id;

    const defaulters = await getDefaultersList(adminId);

    return ApiResponse.success(res, {
      defaulters,
      total_defaulters: defaulters.length,
      total_overdue_amount: defaulters.reduce((sum, d) => sum + parseFloat(d.overdue_amount), 0)
    }, 'Defaulters report retrieved successfully');

  } catch (error) {
    console.error('Get Defaulters Report Error:', error);
    return ApiResponse.serverError(res, 'Failed to get defaulters report');
  }
};

/**
 * Get Portfolio Summary
 */
const getPortfolioSummaryData = async (req, res) => {
  try {
    const adminId = req.admin.id;

    const portfolio = await getPortfolioSummary(adminId);

    // Calculate metrics
    const collectionRate = portfolio.total_principal_disbursed > 0
      ? ((portfolio.total_collected / (portfolio.total_principal_disbursed + portfolio.total_interest_expected)) * 100).toFixed(2)
      : 0;

    const activeRate = portfolio.total_borrowers > 0
      ? ((portfolio.active_borrowers / portfolio.total_borrowers) * 100).toFixed(2)
      : 0;

    return ApiResponse.success(res, {
      ...portfolio,
      collection_rate: parseFloat(collectionRate),
      active_borrower_rate: parseFloat(activeRate)
    }, 'Portfolio summary retrieved successfully');

  } catch (error) {
    console.error('Get Portfolio Summary Error:', error);
    return ApiResponse.serverError(res, 'Failed to get portfolio summary');
  }
};

/**
 * Get Payment Mode Distribution
 */
const getPaymentModeStats = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const { period = 'month' } = req.query;

    const distribution = await getPaymentModeDistribution(adminId, period);

    return ApiResponse.success(res, distribution, 'Payment mode distribution retrieved successfully');

  } catch (error) {
    console.error('Get Payment Mode Stats Error:', error);
    return ApiResponse.serverError(res, 'Failed to get payment mode statistics');
  }
};

/**
 * Get Collection Efficiency Report
 */
const getCollectionEfficiencyReport = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const { period = 'month' } = req.query;

    const efficiency = await getCollectionEfficiency(adminId, period);

    return ApiResponse.success(res, efficiency, 'Collection efficiency report retrieved successfully');

  } catch (error) {
    console.error('Get Collection Efficiency Error:', error);
    return ApiResponse.serverError(res, 'Failed to get collection efficiency');
  }
};

/**
 * Get Monthly Comparison Report
 */
const getMonthlyComparison = async (req, res) => {
  try {
    const adminId = req.admin.id;

    // Current month
    const currentMonth = await query(
      `SELECT 
        COUNT(DISTINCT c.id) as collections_count,
        SUM(c.amount) as collections_amount,
        COUNT(DISTINCT l.id) as loans_count,
        SUM(l.principal_amount) as loans_amount
       FROM collections c
       LEFT JOIN loans l ON l.admin_id = ? AND YEAR(l.created_at) = YEAR(CURDATE()) AND MONTH(l.created_at) = MONTH(CURDATE())
       WHERE c.admin_id = ?
       AND YEAR(c.payment_date) = YEAR(CURDATE())
       AND MONTH(c.payment_date) = MONTH(CURDATE())`,
      [adminId, adminId]
    );

    // Previous month
    const previousMonth = await query(
      `SELECT 
        COUNT(DISTINCT c.id) as collections_count,
        SUM(c.amount) as collections_amount,
        COUNT(DISTINCT l.id) as loans_count,
        SUM(l.principal_amount) as loans_amount
       FROM collections c
       LEFT JOIN loans l ON l.admin_id = ? AND YEAR(l.created_at) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND MONTH(l.created_at) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
       WHERE c.admin_id = ?
       AND YEAR(c.payment_date) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
       AND MONTH(c.payment_date) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))`,
      [adminId, adminId]
    );

    const current = currentMonth[0];
    const previous = previousMonth[0];

    return ApiResponse.success(res, {
      current_month: {
        collections_count: current.collections_count || 0,
        collections_amount: parseFloat(current.collections_amount || 0),
        loans_count: current.loans_count || 0,
        loans_amount: parseFloat(current.loans_amount || 0)
      },
      previous_month: {
        collections_count: previous.collections_count || 0,
        collections_amount: parseFloat(previous.collections_amount || 0),
        loans_count: previous.loans_count || 0,
        loans_amount: parseFloat(previous.loans_amount || 0)
      },
      growth: {
        collections_count: calculateGrowth(current.collections_count || 0, previous.collections_count || 0),
        collections_amount: calculateGrowth(current.collections_amount || 0, previous.collections_amount || 0),
        loans_count: calculateGrowth(current.loans_count || 0, previous.loans_count || 0),
        loans_amount: calculateGrowth(current.loans_amount || 0, previous.loans_amount || 0)
      }
    }, 'Monthly comparison retrieved successfully');

  } catch (error) {
    console.error('Get Monthly Comparison Error:', error);
    return ApiResponse.serverError(res, 'Failed to get monthly comparison');
  }
};

/**
 * Get Weekly Report
 */
const getWeeklyReport = async (req, res) => {
  try {
    const adminId = req.admin.id;

    // This week
    const thisWeek = await query(
      `SELECT 
        DATE(payment_date) as date,
        DAYNAME(payment_date) as day_name,
        COUNT(*) as collections_count,
        SUM(amount) as collections_amount
       FROM collections
       WHERE admin_id = ?
       AND YEARWEEK(payment_date, 1) = YEARWEEK(CURDATE(), 1)
       GROUP BY DATE(payment_date)
       ORDER BY date ASC`,
      [adminId]
    );

    // Week summary
    const weekSummary = await query(
      `SELECT 
        COUNT(*) as total_collections,
        SUM(amount) as total_amount,
        AVG(amount) as average_amount
       FROM collections
       WHERE admin_id = ?
       AND YEARWEEK(payment_date, 1) = YEARWEEK(CURDATE(), 1)`,
      [adminId]
    );

    return ApiResponse.success(res, {
      daily_breakdown: thisWeek,
      summary: weekSummary[0]
    }, 'Weekly report retrieved successfully');

  } catch (error) {
    console.error('Get Weekly Report Error:', error);
    return ApiResponse.serverError(res, 'Failed to get weekly report');
  }
};

module.exports = {
  getDashboardOverview,
  getCollectionTrendsData,
  getLoanTrendsData,
  getTopPerformingBorrowers,
  getDefaultersReport,
  getPortfolioSummaryData,
  getPaymentModeStats,
  getCollectionEfficiencyReport,
  getMonthlyComparison,
  getWeeklyReport
};