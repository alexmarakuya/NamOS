-- Clear old data and set up new areas
TRUNCATE TABLE attachments RESTART IDENTITY CASCADE;
TRUNCATE TABLE transactions RESTART IDENTITY CASCADE;
TRUNCATE TABLE business_units RESTART IDENTITY CASCADE;

-- Insert new areas
INSERT INTO business_units (name, type, description, created_at, updated_at) VALUES
('NAM Studio', 'business', 'Thai company requiring stringent document collection with standardized expense categories for tax compliance', NOW(), NOW()),
('NAM Space', 'project', 'Project within NAM Studio seeking funding - mix of business expenses with some personal expenses', NOW(), NOW()),
('Kin House', 'mixed', 'Personal home and office space - business expenses through NAM Studio, personal expenses (some reimbursable by landlord)', NOW(), NOW()),
('Marakuya LLC', 'us_business', 'US LLC receiving foreign income with US tax compliance requirements and business expenses', NOW(), NOW());

-- Reset sequences
ALTER SEQUENCE IF EXISTS transactions_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS attachments_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS business_units_id_seq RESTART WITH 1;

-- Verify
SELECT name, type, description FROM business_units ORDER BY name;
