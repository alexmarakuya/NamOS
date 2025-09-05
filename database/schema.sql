-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create business_units table
CREATE TABLE IF NOT EXISTS business_units (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('business', 'personal')),
    color VARCHAR(7) NOT NULL DEFAULT '#171717',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    amount DECIMAL(12,2) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    category VARCHAR(100) NOT NULL,
    business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_business_unit ON transactions(business_unit_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_business_units_updated_at 
    BEFORE UPDATE ON business_units 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at 
    BEFORE UPDATE ON transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample business units
INSERT INTO business_units (name, type, color) VALUES
    ('Tech Consulting', 'business', '#3b82f6'),
    ('E-commerce Store', 'business', '#10b981'),
    ('Real Estate', 'business', '#f59e0b'),
    ('Personal', 'personal', '#ef4444')
ON CONFLICT DO NOTHING;

-- Insert sample transactions (you can modify these or remove them)
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

    -- Insert sample transactions
    INSERT INTO transactions (amount, description, type, category, business_unit_id, date) VALUES
        -- Tech Consulting
        (5000.00, 'Web Development Project', 'income', 'Consulting', tech_id, CURRENT_DATE - INTERVAL '1 day'),
        (3200.00, 'Mobile App Development', 'income', 'Development', tech_id, CURRENT_DATE - INTERVAL '3 days'),
        (450.00, 'Software Licenses', 'expense', 'Tools', tech_id, CURRENT_DATE - INTERVAL '5 days'),
        
        -- E-commerce Store
        (2800.00, 'Product Sales', 'income', 'Sales', ecom_id, CURRENT_DATE - INTERVAL '2 days'),
        (1200.00, 'Inventory Purchase', 'expense', 'Inventory', ecom_id, CURRENT_DATE - INTERVAL '4 days'),
        (350.00, 'Marketing Campaign', 'expense', 'Marketing', ecom_id, CURRENT_DATE - INTERVAL '6 days'),
        
        -- Real Estate
        (4500.00, 'Rental Income', 'income', 'Rent', real_id, CURRENT_DATE - INTERVAL '1 day'),
        (800.00, 'Property Maintenance', 'expense', 'Maintenance', real_id, CURRENT_DATE - INTERVAL '7 days'),
        
        -- Personal
        (150.00, 'Freelance Writing', 'income', 'Freelance', personal_id, CURRENT_DATE - INTERVAL '2 days'),
        (75.00, 'Groceries', 'expense', 'Food', personal_id, CURRENT_DATE - INTERVAL '1 day'),
        (120.00, 'Utilities', 'expense', 'Bills', personal_id, CURRENT_DATE - INTERVAL '3 days');
END $$;
