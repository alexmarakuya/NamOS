-- Additional Sample Data for NamOS Financial Dashboard
-- Run this in Supabase SQL Editor to add more realistic data

-- Add more diverse transactions for better dashboard visualization
DO $$
DECLARE
    tech_id UUID;
    ecom_id UUID;
    real_id UUID;
    personal_id UUID;
BEGIN
    -- Get business unit IDs
    SELECT id INTO tech_id FROM business_units WHERE name = 'Tech Consulting';
    SELECT id INTO ecom_id FROM business_units WHERE name = 'E-commerce Store';
    SELECT id INTO real_id FROM business_units WHERE name = 'Real Estate';
    SELECT id INTO personal_id FROM business_units WHERE name = 'Personal';

    -- Insert more sample transactions for the past 12 months
    INSERT INTO transactions (amount, description, type, category, business_unit_id, date) VALUES
        -- Tech Consulting - More entries
        (7500.00, 'Enterprise App Development', 'income', 'Development', tech_id, CURRENT_DATE - INTERVAL '10 days'),
        (4200.00, 'UI/UX Design Project', 'income', 'Design', tech_id, CURRENT_DATE - INTERVAL '15 days'),
        (2800.00, 'API Integration Service', 'income', 'Development', tech_id, CURRENT_DATE - INTERVAL '20 days'),
        (650.00, 'Cloud Hosting Costs', 'expense', 'Infrastructure', tech_id, CURRENT_DATE - INTERVAL '12 days'),
        (1200.00, 'Professional Development Course', 'expense', 'Education', tech_id, CURRENT_DATE - INTERVAL '25 days'),
        (300.00, 'Software Subscriptions', 'expense', 'Tools', tech_id, CURRENT_DATE - INTERVAL '30 days'),
        
        -- E-commerce Store - More entries
        (5600.00, 'Holiday Season Sales', 'income', 'Sales', ecom_id, CURRENT_DATE - INTERVAL '8 days'),
        (3400.00, 'Product Launch Revenue', 'income', 'Sales', ecom_id, CURRENT_DATE - INTERVAL '18 days'),
        (2100.00, 'Affiliate Commission', 'income', 'Sales', ecom_id, CURRENT_DATE - INTERVAL '22 days'),
        (2800.00, 'New Inventory Stock', 'expense', 'Inventory', ecom_id, CURRENT_DATE - INTERVAL '14 days'),
        (450.00, 'Social Media Ads', 'expense', 'Marketing', ecom_id, CURRENT_DATE - INTERVAL '16 days'),
        (180.00, 'Packaging Supplies', 'expense', 'Operations', ecom_id, CURRENT_DATE - INTERVAL '28 days'),
        (220.00, 'Shipping Costs', 'expense', 'Operations', ecom_id, CURRENT_DATE - INTERVAL '35 days'),
        
        -- Real Estate - More entries
        (4500.00, 'Property A Rent', 'income', 'Rent', real_id, CURRENT_DATE - INTERVAL '32 days'),
        (4500.00, 'Property B Rent', 'income', 'Rent', real_id, CURRENT_DATE - INTERVAL '62 days'),
        (3200.00, 'Property C Rent', 'income', 'Rent', real_id, CURRENT_DATE - INTERVAL '92 days'),
        (1500.00, 'HVAC Repair', 'expense', 'Maintenance', real_id, CURRENT_DATE - INTERVAL '45 days'),
        (850.00, 'Property Tax', 'expense', 'Taxes', real_id, CURRENT_DATE - INTERVAL '60 days'),
        (320.00, 'Landscaping', 'expense', 'Maintenance', real_id, CURRENT_DATE - INTERVAL '40 days'),
        (680.00, 'Insurance Premium', 'expense', 'Insurance', real_id, CURRENT_DATE - INTERVAL '90 days'),
        
        -- Personal - More entries
        (800.00, 'Freelance Design Work', 'income', 'Freelance', personal_id, CURRENT_DATE - INTERVAL '11 days'),
        (250.00, 'Stock Dividends', 'income', 'Investments', personal_id, CURRENT_DATE - INTERVAL '19 days'),
        (180.00, 'Side Project Revenue', 'income', 'Freelance', personal_id, CURRENT_DATE - INTERVAL '26 days'),
        (95.00, 'Restaurant Dinner', 'expense', 'Food', personal_id, CURRENT_DATE - INTERVAL '3 days'),
        (45.00, 'Coffee & Snacks', 'expense', 'Food', personal_id, CURRENT_DATE - INTERVAL '7 days'),
        (280.00, 'Car Insurance', 'expense', 'Insurance', personal_id, CURRENT_DATE - INTERVAL '13 days'),
        (150.00, 'Gym Membership', 'expense', 'Health', personal_id, CURRENT_DATE - INTERVAL '21 days'),
        (65.00, 'Phone Bill', 'expense', 'Bills', personal_id, CURRENT_DATE - INTERVAL '29 days'),
        (420.00, 'Car Maintenance', 'expense', 'Transportation', personal_id, CURRENT_DATE - INTERVAL '33 days'),
        
        -- Historical data for better charts (past 6 months)
        -- Tech Consulting Historical
        (6200.00, 'Legacy System Migration', 'income', 'Consulting', tech_id, CURRENT_DATE - INTERVAL '65 days'),
        (3800.00, 'Database Optimization', 'income', 'Development', tech_id, CURRENT_DATE - INTERVAL '95 days'),
        (5400.00, 'Security Audit Project', 'income', 'Consulting', tech_id, CURRENT_DATE - INTERVAL '125 days'),
        (380.00, 'Conference Attendance', 'expense', 'Education', tech_id, CURRENT_DATE - INTERVAL '85 days'),
        
        -- E-commerce Historical
        (4100.00, 'Summer Sale Revenue', 'income', 'Sales', ecom_id, CURRENT_DATE - INTERVAL '75 days'),
        (2900.00, 'Back-to-School Campaign', 'income', 'Sales', ecom_id, CURRENT_DATE - INTERVAL '105 days'),
        (1800.00, 'Seasonal Inventory', 'expense', 'Inventory', ecom_id, CURRENT_DATE - INTERVAL '80 days'),
        (520.00, 'Google Ads Campaign', 'expense', 'Marketing', ecom_id, CURRENT_DATE - INTERVAL '110 days'),
        
        -- Real Estate Historical
        (4500.00, 'Property A Rent - Month 2', 'income', 'Rent', real_id, CURRENT_DATE - INTERVAL '122 days'),
        (4500.00, 'Property B Rent - Month 2', 'income', 'Rent', real_id, CURRENT_DATE - INTERVAL '152 days'),
        (950.00, 'Plumbing Repair', 'expense', 'Maintenance', real_id, CURRENT_DATE - INTERVAL '135 days'),
        
        -- Personal Historical
        (320.00, 'Consulting Side Work', 'income', 'Freelance', personal_id, CURRENT_DATE - INTERVAL '70 days'),
        (180.00, 'Investment Returns', 'income', 'Investments', personal_id, CURRENT_DATE - INTERVAL '100 days'),
        (85.00, 'Groceries', 'expense', 'Food', personal_id, CURRENT_DATE - INTERVAL '67 days'),
        (120.00, 'Utilities', 'expense', 'Bills', personal_id, CURRENT_DATE - INTERVAL '97 days');
        
END $$;

-- Verify the data was inserted
SELECT 
    bu.name as business_unit,
    COUNT(t.id) as transaction_count,
    SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) as total_income,
    SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) as total_expenses
FROM business_units bu
LEFT JOIN transactions t ON bu.id = t.business_unit_id
GROUP BY bu.id, bu.name
ORDER BY bu.name;
