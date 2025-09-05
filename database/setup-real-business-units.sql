-- NamOS Real Business Units Setup
-- This script sets up the actual business units for production use

-- ============================================================================
-- CLEAR EXISTING BUSINESS UNITS
-- ============================================================================

-- Clear existing test business units
TRUNCATE TABLE business_units RESTART IDENTITY CASCADE;

-- ============================================================================
-- CREATE REAL BUSINESS UNITS
-- ============================================================================

INSERT INTO business_units (name, type, description, created_at, updated_at) VALUES
(
    'NAM Studio', 
    'business', 
    'Thai company requiring stringent document collection with standardized expense categories for tax compliance',
    NOW(), 
    NOW()
),
(
    'NAM Space', 
    'project', 
    'Project within NAM Studio seeking funding - mix of business expenses with some personal expenses',
    NOW(), 
    NOW()
),
(
    'Kin House', 
    'mixed', 
    'Personal home and office space - business expenses through NAM Studio, personal expenses (some reimbursable by landlord)',
    NOW(), 
    NOW()
),
(
    'Marakuya LLC', 
    'us_business', 
    'US LLC receiving foreign income with US tax compliance requirements and business expenses',
    NOW(), 
    NOW()
);

-- ============================================================================
-- ADD ADDITIONAL FIELDS FOR ENHANCED TRACKING
-- ============================================================================

-- Add reimbursement tracking field to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reimbursement_status VARCHAR(20) DEFAULT 'none' 
    CHECK (reimbursement_status IN ('none', 'landlord_pending', 'landlord_approved', 'landlord_paid', 'company_pending', 'company_approved', 'company_paid'));

-- Add tax category field for NAM Studio compliance
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tax_category VARCHAR(50);

-- Add notes field for additional context
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================================================
-- CREATE STANDARDIZED EXPENSE CATEGORIES FOR NAM STUDIO
-- ============================================================================

-- Create a table for standardized categories (for reference and validation)
CREATE TABLE IF NOT EXISTS expense_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL,
    business_unit_type VARCHAR(20) NOT NULL,
    tax_deductible BOOLEAN DEFAULT true,
    requires_receipt BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert standardized categories for NAM Studio (Thai tax compliance)
INSERT INTO expense_categories (category_name, business_unit_type, tax_deductible, requires_receipt, description) VALUES
-- NAM Studio Business Categories
('Office Rent & Utilities', 'business', true, true, 'Office space rent, electricity, water, internet for business operations'),
('Professional Services', 'business', true, true, 'Legal, accounting, consulting, and other professional services'),
('Software & Technology', 'business', true, true, 'Software licenses, SaaS subscriptions, technology equipment'),
('Marketing & Advertising', 'business', true, true, 'Digital marketing, advertising, promotional materials'),
('Business Travel', 'business', true, true, 'Transportation, accommodation, meals during business travel'),
('Office Supplies & Equipment', 'business', true, true, 'Stationery, equipment, furniture for business use'),
('Telecommunications', 'business', true, true, 'Phone bills, internet, communication services'),
('Training & Development', 'business', true, true, 'Courses, certifications, professional development'),
('Business Meals & Entertainment', 'business', true, true, 'Client meals, business entertainment (50% deductible)'),
('Insurance & Licenses', 'business', true, true, 'Business insurance, licenses, permits'),

-- NAM Space Project Categories  
('Project Development', 'project', true, true, 'Direct project development costs'),
('Project Marketing', 'project', true, true, 'Marketing specific to NAM Space project'),
('Project Equipment', 'project', true, true, 'Equipment and tools for NAM Space'),
('Project Consulting', 'project', true, true, 'External consulting for NAM Space project'),

-- Kin House Mixed Categories
('Home Office Utilities', 'mixed', true, true, 'Utilities for home office portion (business deductible)'),
('Home Office Rent', 'mixed', true, true, 'Rent allocation for office space (business deductible)'),
('Home Maintenance', 'mixed', false, true, 'General home maintenance (potentially landlord reimbursable)'),
('Personal Living Expenses', 'mixed', false, false, 'Personal expenses not business related'),
('Shared Utilities', 'mixed', false, true, 'Utilities that may be landlord reimbursable'),
('Home Improvements', 'mixed', false, true, 'Improvements that may be landlord reimbursable'),

-- Marakuya LLC US Business Categories
('Foreign Income Received', 'us_business', false, true, 'Foreign income received (not deductible, but tracked for tax reporting)'),
('US Business Travel', 'us_business', true, true, 'US domestic and international business travel'),
('US Professional Services', 'us_business', true, true, 'Legal, accounting, consulting services in the US'),
('US Software & Technology', 'us_business', true, true, 'Software licenses, SaaS, technology for US operations'),
('US Marketing & Advertising', 'us_business', true, true, 'Marketing and advertising for US market'),
('US Office & Equipment', 'us_business', true, true, 'Office supplies, equipment for US operations'),
('US Banking & Finance', 'us_business', true, true, 'Banking fees, financial services, currency exchange'),
('US Telecommunications', 'us_business', true, true, 'Phone, internet, communication services'),
('US Training & Education', 'us_business', true, true, 'Professional development, courses, certifications'),
('US Business Insurance', 'us_business', true, true, 'Business insurance, liability, professional coverage'),
('US Tax & Compliance', 'us_business', true, true, 'Tax preparation, compliance, legal fees'),
('Foreign Exchange Loss', 'us_business', true, false, 'Currency conversion losses (may be deductible)'),
('Foreign Exchange Gain', 'us_business', false, false, 'Currency conversion gains (taxable income)');

-- ============================================================================
-- UPDATE TRIGGERS FOR TIMESTAMP MANAGEMENT
-- ============================================================================

-- Update trigger for business_units
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_business_units_updated_at 
    BEFORE UPDATE ON business_units 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expense_categories_updated_at 
    BEFORE UPDATE ON expense_categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- CREATE VIEWS FOR EASY REPORTING
-- ============================================================================

-- View for NAM Studio tax-deductible expenses
CREATE OR REPLACE VIEW nam_studio_tax_expenses AS
SELECT 
    t.*,
    bu.name as business_unit_name,
    ec.tax_deductible,
    ec.requires_receipt
FROM transactions t
JOIN business_units bu ON t.business_unit_id = bu.id
LEFT JOIN expense_categories ec ON t.category = ec.category_name
WHERE bu.name = 'NAM Studio' 
    AND (ec.tax_deductible = true OR ec.tax_deductible IS NULL);

-- View for reimbursable expenses
CREATE OR REPLACE VIEW reimbursable_expenses AS
SELECT 
    t.*,
    bu.name as business_unit_name,
    CASE 
        WHEN t.reimbursement_status LIKE 'landlord_%' THEN 'Landlord'
        WHEN t.reimbursement_status LIKE 'company_%' THEN 'Company'
        ELSE 'None'
    END as reimbursement_type
FROM transactions t
JOIN business_units bu ON t.business_unit_id = bu.id
WHERE t.reimbursement_status != 'none';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check the setup
DO $$
DECLARE
    business_unit_count INTEGER;
    category_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO business_unit_count FROM business_units;
    SELECT COUNT(*) INTO category_count FROM expense_categories;
    
    RAISE NOTICE 'Setup Results:';
    RAISE NOTICE '  Business Units: % created', business_unit_count;
    RAISE NOTICE '  Expense Categories: % created', category_count;
    
    RAISE NOTICE 'Business Units:';
    FOR rec IN SELECT name, type, description FROM business_units ORDER BY name LOOP
        RAISE NOTICE '  - %: % (%)', rec.name, rec.description, rec.type;
    END LOOP;
    
    RAISE NOTICE '✅ Real business units setup completed successfully!';
END $$;
