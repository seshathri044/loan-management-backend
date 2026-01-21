-- ============================================
-- LOAN MANAGEMENT SYSTEM - DATABASE SCHEMA
-- Part 1: Core Tables
-- ============================================

-- Create Database
CREATE DATABASE IF NOT EXISTS loan_management_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE loan_management_db;

-- ============================================
-- 1. ADMIN USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS admins (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    mobile VARCHAR(15) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    business_name VARCHAR(200),
    gender ENUM('male', 'female', 'others'),
    address TEXT,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    profile_image VARCHAR(255),
    role ENUM('admin', 'super_admin') DEFAULT 'admin',
    is_active BOOLEAN DEFAULT TRUE,
    last_login DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_mobile (mobile),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. ADMIN SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS admin_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    admin_id INT NOT NULL,
    default_interest_rate DECIMAL(5, 2) DEFAULT 10.00,
    default_installments INT DEFAULT 100,
    sms_enabled BOOLEAN DEFAULT FALSE,
    late_fee_per_day DECIMAL(10, 2) DEFAULT 50.00,
    currency VARCHAR(10) DEFAULT 'INR',
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
    UNIQUE KEY unique_admin_settings (admin_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. BORROWERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS borrowers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    admin_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    mobile VARCHAR(15) NOT NULL,
    email VARCHAR(100),
    gender ENUM('male', 'female', 'others'),
    age INT,
    business_name VARCHAR(200),
    address TEXT,
    lpi_address TEXT COMMENT 'Legal Permanent India Address',
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    profile_image VARCHAR(255),
    id_proof VARCHAR(255) COMMENT 'Path to ID proof document',
    
    -- Guarantor Details
    guarantor_name VARCHAR(100),
    guarantor_mobile VARCHAR(15),
    guarantor_address TEXT,
    guarantor_age INT,
    
    -- Reference 1
    reference1_name VARCHAR(100),
    reference1_mobile VARCHAR(15),
    reference1_address TEXT,
    
    -- Reference 2
    reference2_name VARCHAR(100),
    reference2_mobile VARCHAR(15),
    reference2_address TEXT,
    
    -- Collection Schedule
    collection_days SET('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'),
    
    -- SMS Preferences
    sms_enabled BOOLEAN DEFAULT TRUE,
    
    -- Status
    status ENUM('active', 'inactive', 'defaulter', 'blocked') DEFAULT 'active',
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
    INDEX idx_admin_borrower (admin_id, mobile),
    INDEX idx_status (status),
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. LOANS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS loans (
    id INT PRIMARY KEY AUTO_INCREMENT,
    admin_id INT NOT NULL,
    borrower_id INT NOT NULL,
    
    -- Loan Details
    loan_number VARCHAR(50) UNIQUE NOT NULL,
    principal_amount DECIMAL(15, 2) NOT NULL,
    interest_rate DECIMAL(5, 2) NOT NULL,
    interest_amount DECIMAL(15, 2) NOT NULL,
    total_amount DECIMAL(15, 2) NOT NULL,
    
    -- Installment Details
    installments INT NOT NULL,
    installment_amount DECIMAL(15, 2) NOT NULL,
    installment_frequency ENUM('daily', 'weekly', 'monthly') DEFAULT 'daily',
    
    -- Dates
    disbursement_date DATE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- Payment Tracking
    paid_amount DECIMAL(15, 2) DEFAULT 0.00,
    paid_installments INT DEFAULT 0,
    pending_amount DECIMAL(15, 2) NOT NULL,
    
    -- Status
    status ENUM('pending', 'active', 'completed', 'defaulted', 'cancelled') DEFAULT 'pending',
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at DATETIME,
    
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
    FOREIGN KEY (borrower_id) REFERENCES borrowers(id) ON DELETE CASCADE,
    INDEX idx_loan_number (loan_number),
    INDEX idx_admin_loan (admin_id, status),
    INDEX idx_borrower_loan (borrower_id, status),
    INDEX idx_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 5. COLLECTIONS/PAYMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS collections (
    id INT PRIMARY KEY AUTO_INCREMENT,
    admin_id INT NOT NULL,
    borrower_id INT NOT NULL,
    loan_id INT NOT NULL,
    
    -- Payment Details
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    principal_part DECIMAL(15, 2) NOT NULL,
    interest_part DECIMAL(15, 2) NOT NULL,
    late_fee DECIMAL(10, 2) DEFAULT 0.00,
    
    -- Payment Info
    payment_date DATE NOT NULL,
    payment_mode ENUM('cash', 'upi', 'bank_transfer', 'cheque', 'other') DEFAULT 'cash',
    transaction_id VARCHAR(100),
    
    -- Installment Tracking
    installment_number INT NOT NULL,
    days_late INT DEFAULT 0,
    
    -- Metadata
    notes TEXT,
    collected_by INT COMMENT 'Admin ID who collected',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
    FOREIGN KEY (borrower_id) REFERENCES borrowers(id) ON DELETE CASCADE,
    FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE,
    FOREIGN KEY (collected_by) REFERENCES admins(id),
    INDEX idx_receipt (receipt_number),
    INDEX idx_payment_date (payment_date),
    INDEX idx_loan_payment (loan_id, payment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 6. INSTALLMENT SCHEDULE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS installment_schedule (
    id INT PRIMARY KEY AUTO_INCREMENT,
    loan_id INT NOT NULL,
    
    -- Schedule Details
    installment_number INT NOT NULL,
    due_date DATE NOT NULL,
    due_amount DECIMAL(15, 2) NOT NULL,
    principal_part DECIMAL(15, 2) NOT NULL,
    interest_part DECIMAL(15, 2) NOT NULL,
    
    -- Payment Status
    paid_amount DECIMAL(15, 2) DEFAULT 0.00,
    paid_date DATE,
    status ENUM('pending', 'paid', 'partial', 'overdue') DEFAULT 'pending',
    days_overdue INT DEFAULT 0,
    late_fee DECIMAL(10, 2) DEFAULT 0.00,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE,
    INDEX idx_loan_schedule (loan_id, installment_number),
    INDEX idx_due_date (due_date, status),
    UNIQUE KEY unique_loan_installment (loan_id, installment_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 7. SMS LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sms_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    admin_id INT NOT NULL,
    borrower_id INT,
    mobile VARCHAR(15) NOT NULL,
    
    -- SMS Details
    message TEXT NOT NULL,
    sms_type ENUM('reminder', 'payment_confirmation', 'loan_approval', 'overdue_notice', 'custom') NOT NULL,
    
    -- Status
    status ENUM('pending', 'sent', 'failed', 'delivered') DEFAULT 'pending',
    provider_response TEXT,
    
    -- Metadata
    sent_at DATETIME,
    delivered_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
    FOREIGN KEY (borrower_id) REFERENCES borrowers(id) ON DELETE SET NULL,
    INDEX idx_mobile (mobile),
    INDEX idx_status (status),
    INDEX idx_sent_date (sent_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 8. AUDIT LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    admin_id INT NOT NULL,
    
    -- Action Details
    action_type ENUM('create', 'update', 'delete', 'login', 'logout', 'payment', 'loan_disbursement') NOT NULL,
    table_name VARCHAR(50),
    record_id INT,
    
    -- Change Details
    old_values JSON,
    new_values JSON,
    
    -- Request Info
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
    INDEX idx_admin_action (admin_id, action_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 9. REFRESH TOKENS TABLE (For JWT)
-- ============================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    admin_id INT NOT NULL,
    token VARCHAR(500) NOT NULL UNIQUE,
    device_info TEXT,
    ip_address VARCHAR(45),
    expires_at DATETIME NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_admin_token (admin_id, is_revoked)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 10. EXPENSES TABLE (NEW FEATURE)
-- ============================================
CREATE TABLE IF NOT EXISTS expenses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    admin_id INT NOT NULL,
    
    -- Expense Details
    category ENUM('fuel', 'food', 'travel', 'stationery', 'rent', 'salary', 'other') NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    expense_date DATE NOT NULL,
    
    -- Payment Info
    payment_mode ENUM('cash', 'upi', 'bank_transfer', 'card') DEFAULT 'cash',
    receipt_image VARCHAR(255),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
    INDEX idx_expense_date (expense_date),
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- INSERT DEFAULT ADMIN (Password: Admin@123)
-- ============================================
INSERT INTO admins (name, email, mobile, password, business_name, role) 
VALUES (
    'ADHITHYA',
    'admin@loanapp.com',
    '+919566168981',
    '$2a$10$ZxJLhQ7t5TxYZ3qP.FGxkOGh8GhN5fE0YcxYkKvLmD8nQ9pXzK0hO',
    'ADHITHYA Finance',
    'super_admin'
);

-- Insert default settings for admin
INSERT INTO admin_settings (admin_id, default_interest_rate, default_installments, late_fee_per_day)
VALUES (1, 10.00, 100, 50.00);

-- ============================================
-- USEFUL VIEWS FOR DASHBOARD
-- ============================================

-- View: Daily Collection Summary
CREATE OR REPLACE VIEW v_daily_collections AS
SELECT 
    admin_id,
    payment_date,
    COUNT(*) as total_collections,
    SUM(amount) as total_amount,
    SUM(principal_part) as total_principal,
    SUM(interest_part) as total_interest,
    SUM(late_fee) as total_late_fees
FROM collections
GROUP BY admin_id, payment_date;

-- View: Borrower Summary
CREATE OR REPLACE VIEW v_borrower_summary AS
SELECT 
    b.id as borrower_id,
    b.admin_id,
    b.name,
    b.mobile,
    b.status,
    COUNT(DISTINCT l.id) as total_loans,
    SUM(CASE WHEN l.status = 'active' THEN 1 ELSE 0 END) as active_loans,
    SUM(CASE WHEN l.status = 'completed' THEN 1 ELSE 0 END) as completed_loans,
    SUM(CASE WHEN l.status = 'active' THEN l.pending_amount ELSE 0 END) as total_pending,
    MAX(l.updated_at) as last_loan_date
FROM borrowers b
LEFT JOIN loans l ON b.id = l.borrower_id
GROUP BY b.id;

-- View: Loan Summary
CREATE OR REPLACE VIEW v_loan_summary AS
SELECT 
    l.id as loan_id,
    l.admin_id,
    l.loan_number,
    b.name as borrower_name,
    b.mobile as borrower_mobile,
    l.total_amount,
    l.paid_amount,
    l.pending_amount,
    l.installments,
    l.paid_installments,
    l.status,
    l.start_date,
    l.end_date,
    DATEDIFF(CURRENT_DATE, l.start_date) as days_active,
    (l.paid_amount / l.total_amount * 100) as payment_percentage
FROM loans l
JOIN borrowers b ON l.borrower_id = b.id;

-- ============================================
-- STORED PROCEDURES
-- ============================================

DELIMITER //

-- Procedure: Calculate Late Fees
CREATE PROCEDURE sp_calculate_late_fees(IN p_loan_id INT)
BEGIN
    DECLARE v_late_fee_rate DECIMAL(10,2);
    
    SELECT late_fee_per_day INTO v_late_fee_rate
    FROM admin_settings
    WHERE admin_id = (SELECT admin_id FROM loans WHERE id = p_loan_id)
    LIMIT 1;
    
    UPDATE installment_schedule
    SET 
        days_overdue = DATEDIFF(CURRENT_DATE, due_date),
        late_fee = GREATEST(0, DATEDIFF(CURRENT_DATE, due_date)) * v_late_fee_rate,
        status = CASE 
            WHEN CURRENT_DATE > due_date AND status = 'pending' THEN 'overdue'
            ELSE status
        END
    WHERE loan_id = p_loan_id 
    AND status IN ('pending', 'overdue');
END //

-- Procedure: Generate Loan Receipt Number
CREATE FUNCTION fn_generate_receipt_number(p_admin_id INT) 
RETURNS VARCHAR(50)
DETERMINISTIC
BEGIN
    DECLARE v_count INT;
    DECLARE v_receipt VARCHAR(50);
    
    SELECT COUNT(*) INTO v_count 
    FROM collections 
    WHERE admin_id = p_admin_id 
    AND DATE(created_at) = CURRENT_DATE;
    
    SET v_receipt = CONCAT('REC', DATE_FORMAT(NOW(), '%Y%m%d'), '-', LPAD(v_count + 1, 4, '0'));
    
    RETURN v_receipt;
END //

DELIMITER ;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
-- Additional composite indexes for common queries
CREATE INDEX idx_loan_status_date ON loans(status, start_date);
CREATE INDEX idx_collection_admin_date ON collections(admin_id, payment_date);
CREATE INDEX idx_installment_due ON installment_schedule(due_date, status);

-- ============================================
-- END OF SCHEMA
-- ============================================