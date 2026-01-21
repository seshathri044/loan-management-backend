const { query, transaction } = require('../config/database');
const ApiResponse = require('../utils/response.util');
const { sendWelcomeSMS } = require('../utils/sms.util');
const { deleteFile } = require('../middleware/upload.middleware');

/**
 * Create New Borrower
 */
const createBorrower = async (req, res) => {
  try {
    const {
      name, mobile, email, gender, age, business_name, address, lpi_address,
      location_lat, location_lng,
      guarantor_name, guarantor_mobile, guarantor_address, guarantor_age,
      reference1_name, reference1_mobile, reference1_address,
      reference2_name, reference2_mobile, reference2_address,
      collection_days, sms_enabled, notes
    } = req.body;

    const adminId = req.admin.id;

    // Check if borrower with same mobile exists for this admin
    const existing = await query(
      'SELECT id FROM borrowers WHERE admin_id = ? AND mobile = ?',
      [adminId, mobile]
    );

    if (existing.length > 0) {
      return ApiResponse.conflict(res, 'Borrower with this mobile number already exists');
    }

    // Get uploaded file paths
    const profileImage = req.uploadedFiles?.profile_image || null;
    const idProof = req.uploadedFiles?.id_proof || null;

    // Format collection days
    const collectionDaysStr = Array.isArray(collection_days) ? collection_days.join(',') : null;

    // Insert borrower
    const result = await query(
      `INSERT INTO borrowers (
        admin_id, name, mobile, email, gender, age, business_name, address, lpi_address,
        location_lat, location_lng, profile_image, id_proof,
        guarantor_name, guarantor_mobile, guarantor_address, guarantor_age,
        reference1_name, reference1_mobile, reference1_address,
        reference2_name, reference2_mobile, reference2_address,
        collection_days, sms_enabled, notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        adminId, name, mobile, email || null, gender || null, age || null,
        business_name || null, address || null, lpi_address || null,
        location_lat || null, location_lng || null, profileImage, idProof,
        guarantor_name || null, guarantor_mobile || null, guarantor_address || null, guarantor_age || null,
        reference1_name || null, reference1_mobile || null, reference1_address || null,
        reference2_name || null, reference2_mobile || null, reference2_address || null,
        collectionDaysStr, sms_enabled !== false, notes || null
      ]
    );

    const borrowerId = result.insertId;

    // Get created borrower
    const [newBorrower] = await query(
      'SELECT * FROM borrowers WHERE id = ?',
      [borrowerId]
    );

    // Send welcome SMS if enabled
    if (sms_enabled !== false) {
      await sendWelcomeSMS(newBorrower, adminId);
    }

    // Log audit
    await query(
      'INSERT INTO audit_logs (admin_id, action_type, table_name, record_id, new_values) VALUES (?, ?, ?, ?, ?)',
      [adminId, 'create', 'borrowers', borrowerId, JSON.stringify(newBorrower)]
    );

    return ApiResponse.created(res, newBorrower, 'Borrower registered successfully');

  } catch (error) {
    console.error('Create Borrower Error:', error);
    return ApiResponse.serverError(res, 'Failed to create borrower');
  }
};
// Only showing the fixed getAllBorrowers function - replace line 95-168

/**
 * Get All Borrowers with Filters
 */
// CORRECTED getAllBorrowers - Replace entire function

const getAllBorrowers = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build base query
    let baseSql = `
      FROM borrowers b
      LEFT JOIN loans l ON b.id = l.borrower_id
      WHERE b.admin_id = ?
    `;
    const baseParams = [adminId];

    // Apply filters
    if (search) {
      baseSql += ' AND (b.name LIKE ? OR b.mobile LIKE ? OR b.business_name LIKE ?)';
      const searchTerm = `%${search}%`;
      baseParams.push(searchTerm, searchTerm, searchTerm);
    }

    if (status) {
      baseSql += ' AND b.status = ?';
      baseParams.push(status);
    }

    baseSql += ' GROUP BY b.id';

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM (SELECT b.id ${baseSql}) as temp`;
    const countResult = await query(countSql, baseParams);
    const total = countResult[0]?.total || 0;

    // Build data query
    const validSortColumns = ['name', 'mobile', 'created_at', 'status'];
    const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'created_at';
    const sortDir = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const dataSql = `
      SELECT 
        b.id, b.name, b.mobile, b.email, b.gender, b.age, 
        b.business_name, b.address, b.status, b.created_at,
        b.profile_image, b.collection_days, b.sms_enabled,
        COUNT(DISTINCT l.id) as total_loans,
        SUM(CASE WHEN l.status = 'active' THEN 1 ELSE 0 END) as active_loans,
        SUM(CASE WHEN l.status = 'active' THEN l.pending_amount ELSE 0 END) as total_pending
      ${baseSql}
      ORDER BY b.${sortColumn} ${sortDir}
      LIMIT ? OFFSET ?
    `;

    // Create new params array for data query
const borrowers = await query(dataSql, [...baseParams, parseInt(limit), parseInt(offset)]);    

    return ApiResponse.paginated(
      res,
      borrowers,
      {
        page: parseInt(page),
        limit: parseInt(limit),
        total
      },
      'Borrowers retrieved successfully'
    );

  } catch (error) {
    console.error('Get Borrowers Error:', error);
    return ApiResponse.serverError(res, 'Failed to get borrowers');
  }
};
/**
 * Get Borrower by ID
 */
const getBorrowerById = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;

    // Get borrower with loan summary
    const borrowers = await query(
      `SELECT 
        b.*,
        COUNT(DISTINCT l.id) as total_loans,
        SUM(CASE WHEN l.status = 'active' THEN 1 ELSE 0 END) as active_loans,
        SUM(CASE WHEN l.status = 'completed' THEN 1 ELSE 0 END) as completed_loans,
        SUM(CASE WHEN l.status = 'defaulted' THEN 1 ELSE 0 END) as defaulted_loans,
        SUM(CASE WHEN l.status = 'active' THEN l.pending_amount ELSE 0 END) as total_pending,
        SUM(l.paid_amount) as total_paid,
        MAX(l.created_at) as last_loan_date
       FROM borrowers b
       LEFT JOIN loans l ON b.id = l.borrower_id
       WHERE b.id = ? AND b.admin_id = ?
       GROUP BY b.id`,
      [id, adminId]
    );

    if (borrowers.length === 0) {
      return ApiResponse.notFound(res, 'Borrower not found');
    }

    // Get recent loans
    const recentLoans = await query(
      `SELECT 
        id, loan_number, principal_amount, total_amount, pending_amount,
        status, start_date, end_date, created_at
       FROM loans
       WHERE borrower_id = ?
       ORDER BY created_at DESC
       LIMIT 5`,
      [id]
    );

    // Get recent collections
    const recentCollections = await query(
      `SELECT 
        id, receipt_number, amount, payment_date, payment_mode, created_at
       FROM collections
       WHERE borrower_id = ?
       ORDER BY payment_date DESC
       LIMIT 5`,
      [id]
    );

    const borrower = borrowers[0];
    borrower.recent_loans = recentLoans;
    borrower.recent_collections = recentCollections;

    return ApiResponse.success(res, borrower, 'Borrower details retrieved successfully');

  } catch (error) {
    console.error('Get Borrower Error:', error);
    return ApiResponse.serverError(res, 'Failed to get borrower details');
  }
};

/**
 * Update Borrower
 */
const updateBorrower = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;

    // Check if borrower exists
    const existing = await query(
      'SELECT * FROM borrowers WHERE id = ? AND admin_id = ?',
      [id, adminId]
    );

    if (existing.length === 0) {
      return ApiResponse.notFound(res, 'Borrower not found');
    }

    const oldBorrower = existing[0];

    // Get fields to update
    const {
      name, email, gender, age, business_name, address, lpi_address,
      location_lat, location_lng,
      guarantor_name, guarantor_mobile, guarantor_address, guarantor_age,
      reference1_name, reference1_mobile, reference1_address,
      reference2_name, reference2_mobile, reference2_address,
      collection_days, sms_enabled, notes, status
    } = req.body;

    // Get uploaded file paths
    const profileImage = req.uploadedFiles?.profile_image || oldBorrower.profile_image;
    const idProof = req.uploadedFiles?.id_proof || oldBorrower.id_proof;

    // Delete old files if new ones uploaded
    if (req.uploadedFiles?.profile_image && oldBorrower.profile_image) {
      deleteFile(oldBorrower.profile_image);
    }
    if (req.uploadedFiles?.id_proof && oldBorrower.id_proof) {
      deleteFile(oldBorrower.id_proof);
    }

    // Format collection days
    const collectionDaysStr = Array.isArray(collection_days) 
      ? collection_days.join(',') 
      : oldBorrower.collection_days;

    // Update borrower
    await query(
      `UPDATE borrowers SET
        name = COALESCE(?, name),
        email = COALESCE(?, email),
        gender = COALESCE(?, gender),
        age = COALESCE(?, age),
        business_name = COALESCE(?, business_name),
        address = COALESCE(?, address),
        lpi_address = COALESCE(?, lpi_address),
        location_lat = COALESCE(?, location_lat),
        location_lng = COALESCE(?, location_lng),
        profile_image = ?,
        id_proof = ?,
        guarantor_name = COALESCE(?, guarantor_name),
        guarantor_mobile = COALESCE(?, guarantor_mobile),
        guarantor_address = COALESCE(?, guarantor_address),
        guarantor_age = COALESCE(?, guarantor_age),
        reference1_name = COALESCE(?, reference1_name),
        reference1_mobile = COALESCE(?, reference1_mobile),
        reference1_address = COALESCE(?, reference1_address),
        reference2_name = COALESCE(?, reference2_name),
        reference2_mobile = COALESCE(?, reference2_mobile),
        reference2_address = COALESCE(?, reference2_address),
        collection_days = ?,
        sms_enabled = COALESCE(?, sms_enabled),
        notes = COALESCE(?, notes),
        status = COALESCE(?, status)
       WHERE id = ? AND admin_id = ?`,
      [
        name, email, gender, age, business_name, address, lpi_address,
        location_lat, location_lng, profileImage, idProof,
        guarantor_name, guarantor_mobile, guarantor_address, guarantor_age,
        reference1_name, reference1_mobile, reference1_address,
        reference2_name, reference2_mobile, reference2_address,
        collectionDaysStr, sms_enabled, notes, status,
        id, adminId
      ]
    );

    // Get updated borrower
    const [updatedBorrower] = await query(
      'SELECT * FROM borrowers WHERE id = ?',
      [id]
    );

    // Log audit
    await query(
      'INSERT INTO audit_logs (admin_id, action_type, table_name, record_id, old_values, new_values) VALUES (?, ?, ?, ?, ?, ?)',
      [adminId, 'update', 'borrowers', id, JSON.stringify(oldBorrower), JSON.stringify(updatedBorrower)]
    );

    return ApiResponse.success(res, updatedBorrower, 'Borrower updated successfully');

  } catch (error) {
    console.error('Update Borrower Error:', error);
    return ApiResponse.serverError(res, 'Failed to update borrower');
  }
};

/**
 * Delete Borrower
 */
const deleteBorrower = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;

    // Check if borrower exists
    const existing = await query(
      'SELECT * FROM borrowers WHERE id = ? AND admin_id = ?',
      [id, adminId]
    );

    if (existing.length === 0) {
      return ApiResponse.notFound(res, 'Borrower not found');
    }

    const borrower = existing[0];

    // Check if borrower has active loans
    const activeLoans = await query(
      'SELECT COUNT(*) as count FROM loans WHERE borrower_id = ? AND status = "active"',
      [id]
    );

    if (activeLoans[0].count > 0) {
      return ApiResponse.badRequest(res, 'Cannot delete borrower with active loans');
    }

    // Delete uploaded files
    if (borrower.profile_image) {
      deleteFile(borrower.profile_image);
    }
    if (borrower.id_proof) {
      deleteFile(borrower.id_proof);
    }

    // Delete borrower (CASCADE will handle related records)
    await query(
      'DELETE FROM borrowers WHERE id = ? AND admin_id = ?',
      [id, adminId]
    );

    // Log audit
    await query(
      'INSERT INTO audit_logs (admin_id, action_type, table_name, record_id, old_values) VALUES (?, ?, ?, ?, ?)',
      [adminId, 'delete', 'borrowers', id, JSON.stringify(borrower)]
    );

    return ApiResponse.success(res, null, 'Borrower deleted successfully');

  } catch (error) {
    console.error('Delete Borrower Error:', error);
    return ApiResponse.serverError(res, 'Failed to delete borrower');
  }
};

/**
 * Get Borrower Statistics
 */
const getBorrowerStats = async (req, res) => {
  try {
    const adminId = req.admin.id;

    const stats = await query(
      `SELECT 
        COUNT(*) as total_borrowers,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_borrowers,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive_borrowers,
        SUM(CASE WHEN status = 'defaulter' THEN 1 ELSE 0 END) as defaulters,
        SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked_borrowers
       FROM borrowers
       WHERE admin_id = ?`,
      [adminId]
    );

    // Get borrowers with active loans
    const loanStats = await query(
      `SELECT 
        COUNT(DISTINCT b.id) as borrowers_with_loans,
        COUNT(l.id) as total_active_loans
       FROM borrowers b
       INNER JOIN loans l ON b.id = l.borrower_id
       WHERE b.admin_id = ? AND l.status = 'active'`,
      [adminId]
    );

    return ApiResponse.success(res, {
      ...stats[0],
      ...loanStats[0]
    }, 'Borrower statistics retrieved successfully');

  } catch (error) {
    console.error('Get Borrower Stats Error:', error);
    return ApiResponse.serverError(res, 'Failed to get statistics');
  }
};

/**
 * Search Borrowers
 */
const searchBorrowers = async (req, res) => {
  try {
    const { q } = req.query;
    const adminId = req.admin.id;

    if (!q || q.trim().length < 2) {
      return ApiResponse.badRequest(res, 'Search query must be at least 2 characters');
    }

    const searchTerm = `%${q}%`;

    const borrowers = await query(
      `SELECT 
        id, name, mobile, business_name, status,
        profile_image, created_at
       FROM borrowers
       WHERE admin_id = ? AND (
         name LIKE ? OR 
         mobile LIKE ? OR 
         business_name LIKE ? OR
         email LIKE ?
       )
       ORDER BY name ASC
       LIMIT 20`,
      [adminId, searchTerm, searchTerm, searchTerm, searchTerm]
    );

    return ApiResponse.success(res, borrowers, `Found ${borrowers.length} borrowers`);

  } catch (error) {
    console.error('Search Borrowers Error:', error);
    return ApiResponse.serverError(res, 'Search failed');
  }
};

/**
 * Get Borrowers by Status
 */
const getBorrowersByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const adminId = req.admin.id;

    const validStatuses = ['active', 'inactive', 'defaulter', 'blocked'];
    if (!validStatuses.includes(status)) {
      return ApiResponse.badRequest(res, 'Invalid status');
    }

    const borrowers = await query(
      `SELECT 
        b.*,
        COUNT(DISTINCT l.id) as total_loans,
        SUM(CASE WHEN l.status = 'active' THEN l.pending_amount ELSE 0 END) as total_pending
       FROM borrowers b
       LEFT JOIN loans l ON b.id = l.borrower_id
       WHERE b.admin_id = ? AND b.status = ?
       GROUP BY b.id
       ORDER BY b.name ASC`,
      [adminId, status]
    );

    return ApiResponse.success(res, borrowers, `${status.charAt(0).toUpperCase() + status.slice(1)} borrowers retrieved`);

  } catch (error) {
    console.error('Get Borrowers By Status Error:', error);
    return ApiResponse.serverError(res, 'Failed to get borrowers');
  }
};

module.exports = {
  createBorrower,
  getAllBorrowers,
  getBorrowerById,
  updateBorrower,
  deleteBorrower,
  getBorrowerStats,
  searchBorrowers,
  getBorrowersByStatus
};