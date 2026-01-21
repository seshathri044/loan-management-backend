const { query } = require('../config/database');
const ApiResponse = require('../utils/response.util');

/**
 * Get Admin Settings
 */
const getSettings = async (req, res) => {
  try {
    const adminId = req.admin.id;

    const [settings] = await query(
      'SELECT * FROM admin_settings WHERE admin_id = ?',
      [adminId]
    );

    if (!settings) {
      // Create default settings if not exists
      await query(
        `INSERT INTO admin_settings (admin_id, default_interest_rate, default_installments, late_fee_per_day)
         VALUES (?, 10.00, 100, 50.00)`,
        [adminId]
      );

      return getSettings(req, res);
    }

    return ApiResponse.success(res, settings, 'Settings retrieved successfully');

  } catch (error) {
    console.error('Get Settings Error:', error);
    return ApiResponse.serverError(res, 'Failed to get settings');
  }
};

/**
 * Update Settings
 */
const updateSettings = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const {
      default_interest_rate,
      default_installments,
      sms_enabled,
      late_fee_per_day,
      currency,
      timezone
    } = req.body;

    // Get current settings
    const [currentSettings] = await query(
      'SELECT * FROM admin_settings WHERE admin_id = ?',
      [adminId]
    );

    if (!currentSettings) {
      return ApiResponse.notFound(res, 'Settings not found');
    }

    // Update settings
    await query(
      `UPDATE admin_settings SET
        default_interest_rate = COALESCE(?, default_interest_rate),
        default_installments = COALESCE(?, default_installments),
        sms_enabled = COALESCE(?, sms_enabled),
        late_fee_per_day = COALESCE(?, late_fee_per_day),
        currency = COALESCE(?, currency),
        timezone = COALESCE(?, timezone)
       WHERE admin_id = ?`,
      [
        default_interest_rate,
        default_installments,
        sms_enabled,
        late_fee_per_day,
        currency,
        timezone,
        adminId
      ]
    );

    // Get updated settings
    const [updatedSettings] = await query(
      'SELECT * FROM admin_settings WHERE admin_id = ?',
      [adminId]
    );

    // Log audit
    await query(
      'INSERT INTO audit_logs (admin_id, action_type, table_name, record_id, old_values, new_values) VALUES (?, ?, ?, ?, ?, ?)',
      [adminId, 'update', 'admin_settings', updatedSettings.id, JSON.stringify(currentSettings), JSON.stringify(updatedSettings)]
    );

    return ApiResponse.success(res, updatedSettings, 'Settings updated successfully');

  } catch (error) {
    console.error('Update Settings Error:', error);
    return ApiResponse.serverError(res, 'Failed to update settings');
  }
};

/**
 * Get System Statistics (for admin dashboard)
 */
const getSystemStats = async (req, res) => {
  try {
    const adminId = req.admin.id;

    // Database statistics
    const stats = await query(
      `SELECT 
        (SELECT COUNT(*) FROM borrowers WHERE admin_id = ?) as total_borrowers,
        (SELECT COUNT(*) FROM loans WHERE admin_id = ?) as total_loans,
        (SELECT COUNT(*) FROM collections WHERE admin_id = ?) as total_collections,
        (SELECT COUNT(*) FROM sms_logs WHERE admin_id = ?) as total_sms_sent,
        (SELECT SUM(amount) FROM collections WHERE admin_id = ?) as lifetime_collections,
        (SELECT SUM(principal_amount) FROM loans WHERE admin_id = ?) as lifetime_disbursed`,
      [adminId, adminId, adminId, adminId, adminId, adminId]
    );

    // Recent activity
    const recentActivity = await query(
      `SELECT 
        action_type,
        table_name,
        created_at
       FROM audit_logs
       WHERE admin_id = ?
       ORDER BY created_at DESC
       LIMIT 10`,
      [adminId]
    );

    return ApiResponse.success(res, {
      statistics: stats[0],
      recent_activity: recentActivity
    }, 'System statistics retrieved successfully');

  } catch (error) {
    console.error('Get System Stats Error:', error);
    return ApiResponse.serverError(res, 'Failed to get system statistics');
  }
};

/**
 * Get Audit Logs
 */
const getAuditLogs = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const {
      page = 1,
      limit = 20,
      action_type = '',
      from_date = '',
      to_date = ''
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let sql = 'SELECT * FROM audit_logs WHERE admin_id = ?';
    const params = [adminId];

    if (action_type) {
      sql += ' AND action_type = ?';
      params.push(action_type);
    }

    if (from_date) {
      sql += ' AND DATE(created_at) >= ?';
      params.push(from_date);
    }

    if (to_date) {
      sql += ' AND DATE(created_at) <= ?';
      params.push(to_date);
    }

    // Get total count
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const [countResult] = await query(countSql, params);
    const total = countResult.total;

    // Get logs
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const logs = await query(sql, params);

    return ApiResponse.paginated(
      res,
      logs,
      {
        page: parseInt(page),
        limit: parseInt(limit),
        total
      },
      'Audit logs retrieved successfully'
    );

  } catch (error) {
    console.error('Get Audit Logs Error:', error);
    return ApiResponse.serverError(res, 'Failed to get audit logs');
  }
};

/**
 * Export Data (Generate data for export)
 */
const exportData = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const { type = 'all', from_date = '', to_date = '' } = req.query;

    let data = {};

    switch (type) {
      case 'borrowers':
        data.borrowers = await query(
          'SELECT * FROM borrowers WHERE admin_id = ? ORDER BY created_at DESC',
          [adminId]
        );
        break;

      case 'loans':
        let loanSql = 'SELECT * FROM loans WHERE admin_id = ?';
        const loanParams = [adminId];
        
        if (from_date) {
          loanSql += ' AND DATE(created_at) >= ?';
          loanParams.push(from_date);
        }
        if (to_date) {
          loanSql += ' AND DATE(created_at) <= ?';
          loanParams.push(to_date);
        }
        
        loanSql += ' ORDER BY created_at DESC';
        data.loans = await query(loanSql, loanParams);
        break;

      case 'collections':
        let collectionSql = 'SELECT * FROM collections WHERE admin_id = ?';
        const collectionParams = [adminId];
        
        if (from_date) {
          collectionSql += ' AND DATE(payment_date) >= ?';
          collectionParams.push(from_date);
        }
        if (to_date) {
          collectionSql += ' AND DATE(payment_date) <= ?';
          collectionParams.push(to_date);
        }
        
        collectionSql += ' ORDER BY payment_date DESC';
        data.collections = await query(collectionSql, collectionParams);
        break;

      case 'all':
      default:
        data.borrowers = await query(
          'SELECT * FROM borrowers WHERE admin_id = ?',
          [adminId]
        );
        data.loans = await query(
          'SELECT * FROM loans WHERE admin_id = ?',
          [adminId]
        );
        data.collections = await query(
          'SELECT * FROM collections WHERE admin_id = ?',
          [adminId]
        );
        break;
    }

    return ApiResponse.success(res, data, 'Data exported successfully');

  } catch (error) {
    console.error('Export Data Error:', error);
    return ApiResponse.serverError(res, 'Failed to export data');
  }
};

/**
 * Get SMS Statistics
 */
const getSMSStats = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const { period = 'month' } = req.query;

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
        COUNT(DISTINCT borrower_id) as unique_recipients
       FROM sms_logs
       WHERE admin_id = ? AND ${dateCondition}`,
      [adminId]
    );

    const typeBreakdown = await query(
      `SELECT 
        sms_type,
        COUNT(*) as count
       FROM sms_logs
       WHERE admin_id = ? AND ${dateCondition}
       GROUP BY sms_type`,
      [adminId]
    );

    return ApiResponse.success(res, {
      ...stats[0],
      type_breakdown: typeBreakdown
    }, 'SMS statistics retrieved successfully');

  } catch (error) {
    console.error('Get SMS Stats Error:', error);
    return ApiResponse.serverError(res, 'Failed to get SMS statistics');
  }
};

module.exports = {
  getSettings,
  updateSettings,
  getSystemStats,
  getAuditLogs,
  exportData,
  getSMSStats
};