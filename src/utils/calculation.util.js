/**
 * Loan Calculation Utilities
 * EMI, Interest, Installment calculations
 */

/**
 * Calculate Simple Interest
 * Formula: (Principal × Rate × Time) / 100
 */
const calculateSimpleInterest = (principal, ratePercent, timeInMonths = 12) => {
  const interest = (principal * ratePercent * timeInMonths) / (100 * 12);
  return Math.round(interest * 100) / 100;
};

/**
 * Calculate Total Amount (Principal + Interest)
 */
const calculateTotalAmount = (principal, interestRate, durationMonths = 12) => {
  const interest = calculateSimpleInterest(principal, interestRate, durationMonths);
  return {
    principal: parseFloat(principal),
    interest: parseFloat(interest.toFixed(2)),
    total: parseFloat((principal + interest).toFixed(2))
  };
};

/**
 * Calculate Installment Amount
 */
const calculateInstallmentAmount = (totalAmount, numberOfInstallments) => {
  const installmentAmount = totalAmount / numberOfInstallments;
  return parseFloat(installmentAmount.toFixed(2));
};

/**
 * Calculate EMI for Loan
 */
const calculateEMI = (principal, interestRate, installments, frequency = 'daily') => {
  const amounts = calculateTotalAmount(principal, interestRate, getMonthsFromInstallments(installments, frequency));
  const installmentAmount = calculateInstallmentAmount(amounts.total, installments);
  
  return {
    principal: amounts.principal,
    interest: amounts.interest,
    totalAmount: amounts.total,
    installments: parseInt(installments),
    installmentAmount: installmentAmount,
    frequency: frequency
  };
};

/**
 * Get months from installments based on frequency
 */
const getMonthsFromInstallments = (installments, frequency) => {
  switch (frequency) {
    case 'daily':
      return Math.ceil(installments / 30);
    case 'weekly':
      return Math.ceil(installments / 4);
    case 'monthly':
      return installments;
    default:
      return installments;
  }
};

/**
 * Calculate next due date based on frequency
 */
const calculateNextDueDate = (startDate, installmentNumber, frequency) => {
  const date = new Date(startDate);
  
  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + installmentNumber);
      break;
    case 'weekly':
      date.setDate(date.getDate() + (installmentNumber * 7));
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + installmentNumber);
      break;
  }
  
  return date;
};

/**
 * Calculate end date based on installments and frequency
 */
const calculateEndDate = (startDate, installments, frequency) => {
  return calculateNextDueDate(startDate, installments - 1, frequency);
};

/**
 * Generate installment schedule
 */
const generateInstallmentSchedule = (loanDetails) => {
  const {
    totalAmount,
    installments,
    installmentAmount,
    startDate,
    frequency,
    principal,
    interest
  } = loanDetails;

  const schedule = [];
  const principalPerInstallment = principal / installments;
  const interestPerInstallment = interest / installments;

  for (let i = 1; i <= installments; i++) {
    const dueDate = calculateNextDueDate(startDate, i - 1, frequency);
    
    // Last installment adjustment for rounding differences
    let installmentPrincipal = parseFloat(principalPerInstallment.toFixed(2));
    let installmentInterest = parseFloat(interestPerInstallment.toFixed(2));
    let dueAmount = parseFloat(installmentAmount.toFixed(2));
    
    if (i === installments) {
      // Adjust last installment to match exact total
      const previousTotal = (installments - 1) * installmentAmount;
      dueAmount = parseFloat((totalAmount - previousTotal).toFixed(2));
      
      const previousPrincipal = principalPerInstallment * (installments - 1);
      installmentPrincipal = parseFloat((principal - previousPrincipal).toFixed(2));
      
      const previousInterest = interestPerInstallment * (installments - 1);
      installmentInterest = parseFloat((interest - previousInterest).toFixed(2));
    }

    schedule.push({
      installment_number: i,
      due_date: dueDate.toISOString().split('T')[0],
      due_amount: dueAmount,
      principal_part: installmentPrincipal,
      interest_part: installmentInterest,
      status: 'pending'
    });
  }

  return schedule;
};

/**
 * Calculate late fee
 */
const calculateLateFee = (daysLate, lateFeePerDay) => {
  if (daysLate <= 0) return 0;
  return parseFloat((daysLate * lateFeePerDay).toFixed(2));
};

/**
 * Calculate days between dates
 */
const calculateDaysBetween = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Calculate remaining installments
 */
const calculateRemainingInstallments = (totalInstallments, paidInstallments) => {
  return Math.max(0, totalInstallments - paidInstallments);
};

/**
 * Calculate payment breakdown (principal vs interest)
 */
const calculatePaymentBreakdown = (paymentAmount, pendingPrincipal, pendingInterest) => {
  const totalPending = pendingPrincipal + pendingInterest;
  
  if (paymentAmount >= totalPending) {
    return {
      principal: pendingPrincipal,
      interest: pendingInterest,
      excess: paymentAmount - totalPending
    };
  }

  // Pay interest first, then principal
  const interestPaid = Math.min(paymentAmount, pendingInterest);
  const principalPaid = Math.max(0, paymentAmount - interestPaid);

  return {
    principal: principalPaid,
    interest: interestPaid,
    excess: 0
  };
};

/**
 * Generate loan number
 */
const generateLoanNumber = (adminId, date = new Date()) => {
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `LOAN${dateStr}-${random}`;
};

/**
 * Validate loan parameters
 */
const validateLoanParameters = (principal, interestRate, installments) => {
  const errors = [];

  if (!principal || principal <= 0) {
    errors.push('Principal amount must be greater than 0');
  }

  if (interestRate < 0 || interestRate > 100) {
    errors.push('Interest rate must be between 0 and 100');
  }

  if (!installments || installments <= 0) {
    errors.push('Number of installments must be greater than 0');
  }

  if (installments > 1000) {
    errors.push('Number of installments cannot exceed 1000');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  calculateSimpleInterest,
  calculateTotalAmount,
  calculateInstallmentAmount,
  calculateEMI,
  calculateNextDueDate,
  calculateEndDate,
  generateInstallmentSchedule,
  calculateLateFee,
  calculateDaysBetween,
  calculateRemainingInstallments,
  calculatePaymentBreakdown,
  generateLoanNumber,
  validateLoanParameters,
  getMonthsFromInstallments
};