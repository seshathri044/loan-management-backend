const { query } = require('../config/database');

/**
 * Generate unique receipt number
 */
const generateReceiptNumber = (adminId, date = new Date()) => {
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `REC${dateStr}-${random}`;
};

/**
 * Check if receipt number exists
 */
const receiptNumberExists = async (receiptNumber) => {
  const result = await query(
    'SELECT COUNT(*) as count FROM collections WHERE receipt_number = ?',
    [receiptNumber]
  );
  return result[0].count > 0;
};

/**
 * Generate receipt data (for PDF/printing)
 */
const generateReceiptData = async (collectionId) => {
  const [collection] = await query(
    `SELECT 
      c.*,
      b.name as borrower_name,
      b.mobile as borrower_mobile,
      b.address as borrower_address,
      l.loan_number,
      l.total_amount as loan_total,
      l.pending_amount as loan_pending,
      a.name as admin_name,
      a.business_name,
      a.mobile as admin_mobile,
      a.address as admin_address
     FROM collections c
     JOIN borrowers b ON c.borrower_id = b.id
     JOIN loans l ON c.loan_id = l.id
     JOIN admins a ON c.admin_id = a.id
     WHERE c.id = ?`,
    [collectionId]
  );

  if (!collection) return null;

  return {
    receipt_number: collection.receipt_number,
    payment_date: collection.payment_date,
    amount: collection.amount,
    principal_part: collection.principal_part,
    interest_part: collection.interest_part,
    late_fee: collection.late_fee,
    payment_mode: collection.payment_mode,
    transaction_id: collection.transaction_id,
    installment_number: collection.installment_number,
    borrower: {
      name: collection.borrower_name,
      mobile: collection.borrower_mobile,
      address: collection.borrower_address
    },
    loan: {
      loan_number: collection.loan_number,
      total_amount: collection.loan_total,
      pending_amount: collection.loan_pending
    },
    admin: {
      name: collection.admin_name,
      business_name: collection.business_name,
      mobile: collection.admin_mobile,
      address: collection.admin_address
    },
    notes: collection.notes,
    created_at: collection.created_at
  };
};

/**
 * Format receipt for SMS
 */
const formatReceiptForSMS = (receiptData) => {
  return `Receipt: ${receiptData.receipt_number}
Amount: Rs.${receiptData.amount}
Date: ${receiptData.payment_date}
Loan: ${receiptData.loan.loan_number}
Balance: Rs.${receiptData.loan.pending_amount}
Thank you!`;
};

/**
 * Format receipt for printing (simple text format)
 */
const formatReceiptForPrint = (receiptData) => {
  return `
================================================
           PAYMENT RECEIPT
================================================

Receipt No: ${receiptData.receipt_number}
Date: ${new Date(receiptData.payment_date).toLocaleDateString()}
Time: ${new Date(receiptData.created_at).toLocaleTimeString()}

------------------------------------------------
BUSINESS DETAILS
------------------------------------------------
${receiptData.admin.business_name || receiptData.admin.name}
${receiptData.admin.address || ''}
Contact: ${receiptData.admin.mobile}

------------------------------------------------
BORROWER DETAILS
------------------------------------------------
Name: ${receiptData.borrower.name}
Mobile: ${receiptData.borrower.mobile}
Address: ${receiptData.borrower.address || 'N/A'}

------------------------------------------------
PAYMENT DETAILS
------------------------------------------------
Loan Number: ${receiptData.loan.loan_number}
Installment #: ${receiptData.installment_number}
Payment Mode: ${receiptData.payment_mode.toUpperCase()}
${receiptData.transaction_id ? `Transaction ID: ${receiptData.transaction_id}` : ''}

Amount Paid: Rs.${receiptData.amount.toFixed(2)}
  Principal: Rs.${receiptData.principal_part.toFixed(2)}
  Interest: Rs.${receiptData.interest_part.toFixed(2)}
  ${receiptData.late_fee > 0 ? `Late Fee: Rs.${receiptData.late_fee.toFixed(2)}` : ''}

------------------------------------------------
LOAN SUMMARY
------------------------------------------------
Loan Total: Rs.${receiptData.loan.total_amount.toFixed(2)}
Balance Due: Rs.${receiptData.loan.pending_amount.toFixed(2)}

${receiptData.notes ? `\nNotes: ${receiptData.notes}\n` : ''}
------------------------------------------------
Thank you for your payment!
------------------------------------------------

Signature: _____________________

================================================
  `;
};

module.exports = {
  generateReceiptNumber,
  receiptNumberExists,
  generateReceiptData,
  formatReceiptForSMS,
  formatReceiptForPrint
};