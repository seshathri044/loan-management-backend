const { query } = require('../config/database');

/**
 * SMS Utility - Dummy Implementation
 * In production, integrate with SMS gateway like Twilio, MSG91, etc.
 */

/**
 * Send SMS (Dummy - just logs and saves to database)
 */
const sendSMS = async (mobile, message, adminId, borrowerId = null, smsType = 'custom') => {
  try {
    console.log('📱 [SMS Simulation]');
    console.log(`   To: ${mobile}`);
    console.log(`   Message: ${message}`);
    console.log(`   Type: ${smsType}`);
    console.log('   Status: ✅ Sent (Simulated)');

    // Save to SMS logs
    const result = await query(
      `INSERT INTO sms_logs (admin_id, borrower_id, mobile, message, sms_type, status, sent_at, delivered_at) 
       VALUES (?, ?, ?, ?, ?, 'sent', NOW(), NOW())`,
      [adminId, borrowerId, mobile, message, smsType]
    );

    return {
      success: true,
      smsId: result.insertId,
      message: 'SMS sent successfully (simulated)',
      mobile,
      sentAt: new Date()
    };
  } catch (error) {
    console.error('SMS Error:', error);
    
    // Log failed SMS
    await query(
      `INSERT INTO sms_logs (admin_id, borrower_id, mobile, message, sms_type, status, provider_response) 
       VALUES (?, ?, ?, ?, ?, 'failed', ?)`,
      [adminId, borrowerId, mobile, message, smsType, error.message]
    );

    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Send Welcome SMS to new borrower
 */
const sendWelcomeSMS = async (borrower, adminId) => {
  const message = `Welcome ${borrower.name}! You have been registered with ${borrower.business_name || 'our loan management system'}. For queries, contact us. Thank you!`;
  
  return await sendSMS(borrower.mobile, message, adminId, borrower.id, 'custom');
};

/**
 * Send Payment Reminder SMS
 */
const sendPaymentReminderSMS = async (borrower, amount, dueDate, adminId) => {
  const message = `Dear ${borrower.name}, your loan installment of Rs.${amount} is due on ${dueDate}. Please pay on time to avoid late fees. Thank you!`;
  
  return await sendSMS(borrower.mobile, message, adminId, borrower.id, 'reminder');
};

/**
 * Send Payment Confirmation SMS
 */
const sendPaymentConfirmationSMS = async (borrower, amount, balanceDue, adminId) => {
  const message = `Dear ${borrower.name}, we received your payment of Rs.${amount}. Balance due: Rs.${balanceDue}. Thank you for your payment!`;
  
  return await sendSMS(borrower.mobile, message, adminId, borrower.id, 'payment_confirmation');
};

/**
 * Send Overdue Notice SMS
 */
const sendOverdueNoticeSMS = async (borrower, daysOverdue, amount, lateFee, adminId) => {
  const message = `Dear ${borrower.name}, your payment is ${daysOverdue} days overdue. Amount: Rs.${amount}. Late fee: Rs.${lateFee}. Please pay immediately. Contact us for assistance.`;
  
  return await sendSMS(borrower.mobile, message, adminId, borrower.id, 'overdue_notice');
};

/**
 * Send Loan Approval SMS
 */
const sendLoanApprovalSMS = async (borrower, loanAmount, installments, adminId) => {
  const message = `Congratulations ${borrower.name}! Your loan of Rs.${loanAmount} has been approved. Total installments: ${installments}. Thank you for choosing us!`;
  
  return await sendSMS(borrower.mobile, message, adminId, borrower.id, 'loan_approval');
};

/**
 * Send Bulk SMS to multiple borrowers
 */
const sendBulkSMS = async (borrowers, message, adminId) => {
  const results = [];
  
  for (const borrower of borrowers) {
    const result = await sendSMS(borrower.mobile, message, adminId, borrower.id, 'custom');
    results.push({
      borrowerId: borrower.id,
      borrowerName: borrower.name,
      mobile: borrower.mobile,
      ...result
    });
  }
  
  return results;
};

/**
 * Get SMS logs for admin
 */
const getSMSLogs = async (adminId, filters = {}) => {
  let sql = `
    SELECT 
      sl.*,
      b.name as borrower_name
    FROM sms_logs sl
    LEFT JOIN borrowers b ON sl.borrower_id = b.id
    WHERE sl.admin_id = ?
  `;
  const params = [adminId];

  if (filters.status) {
    sql += ' AND sl.status = ?';
    params.push(filters.status);
  }

  if (filters.sms_type) {
    sql += ' AND sl.sms_type = ?';
    params.push(filters.sms_type);
  }

  if (filters.borrower_id) {
    sql += ' AND sl.borrower_id = ?';
    params.push(filters.borrower_id);
  }

  if (filters.from_date) {
    sql += ' AND DATE(sl.created_at) >= ?';
    params.push(filters.from_date);
  }

  if (filters.to_date) {
    sql += ' AND DATE(sl.created_at) <= ?';
    params.push(filters.to_date);
  }

  sql += ' ORDER BY sl.created_at DESC';

  if (filters.limit) {
    sql += ' LIMIT ?';
    params.push(parseInt(filters.limit));
  }

  return await query(sql, params);
};

/**
 * Get SMS statistics
 */
const getSMSStats = async (adminId, period = 'today') => {
  let dateCondition = '';
  
  switch (period) {
    case 'today':
      dateCondition = 'DATE(created_at) = CURDATE()';
      break;
    case 'week':
      dateCondition = 'YEARWEEK(created_at) = YEARWEEK(NOW())';
      break;
    case 'month':
      dateCondition = 'YEAR(created_at) = YEAR(NOW()) AND MONTH(created_at) = MONTH(NOW())';
      break;
    default:
      dateCondition = '1=1';
  }

  const stats = await query(
    `SELECT 
      COUNT(*) as total_sms,
      SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent_count,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
      SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_count,
      COUNT(DISTINCT borrower_id) as unique_borrowers
     FROM sms_logs
     WHERE admin_id = ? AND ${dateCondition}`,
    [adminId]
  );

  return stats[0];
};

module.exports = {
  sendSMS,
  sendWelcomeSMS,
  sendPaymentReminderSMS,
  sendPaymentConfirmationSMS,
  sendOverdueNoticeSMS,
  sendLoanApprovalSMS,
  sendBulkSMS,
  getSMSLogs,
  getSMSStats
};