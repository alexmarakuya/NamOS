-- Safe version of file attachments setup - handles existing objects gracefully
-- Run this in Supabase SQL Editor

-- Create attachments table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS attachments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    storage_path TEXT NOT NULL,
    upload_source VARCHAR(50) DEFAULT 'manual',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_attachments_transaction ON attachments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_attachments_created_at ON attachments(created_at);

-- Add trigger for updated_at (drop and recreate to avoid conflicts)
DROP TRIGGER IF EXISTS update_attachments_updated_at ON attachments;
CREATE TRIGGER update_attachments_updated_at 
    BEFORE UPDATE ON attachments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add primary_attachment_id column to transactions table (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'primary_attachment_id'
    ) THEN
        ALTER TABLE transactions ADD COLUMN primary_attachment_id UUID REFERENCES attachments(id);
    END IF;
END $$;

-- Create index for primary attachment (only if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_transactions_primary_attachment ON transactions(primary_attachment_id);

-- Enable RLS on attachments table
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Allow public read access to attachments" ON attachments;
DROP POLICY IF EXISTS "Allow public insert access to attachments" ON attachments;
DROP POLICY IF EXISTS "Allow public update access to attachments" ON attachments;
DROP POLICY IF EXISTS "Allow public delete access to attachments" ON attachments;

-- Create fresh policies
CREATE POLICY "Allow public read access to attachments" ON attachments
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to attachments" ON attachments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to attachments" ON attachments
    FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access to attachments" ON attachments
    FOR DELETE USING (true);

-- Drop and recreate the view to ensure it's up to date
DROP VIEW IF EXISTS transactions_with_attachments;
CREATE VIEW transactions_with_attachments AS
SELECT 
    t.*,
    COALESCE(
        json_agg(
            json_build_object(
                'id', a.id,
                'file_name', a.file_name,
                'file_type', a.file_type,
                'file_size', a.file_size,
                'storage_path', a.storage_path,
                'upload_source', a.upload_source,
                'created_at', a.created_at
            ) ORDER BY a.created_at
        ) FILTER (WHERE a.id IS NOT NULL), 
        '[]'::json
    ) as attachments,
    COUNT(a.id) as attachment_count
FROM transactions t
LEFT JOIN attachments a ON t.id = a.transaction_id
GROUP BY t.id, t.amount, t.description, t.type, t.category, t.business_unit_id, t.date, t.created_at, t.updated_at, t.primary_attachment_id;

-- Drop and recreate the function
DROP FUNCTION IF EXISTS get_transaction_with_attachments(UUID);
CREATE OR REPLACE FUNCTION get_transaction_with_attachments(transaction_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT row_to_json(twa) INTO result
    FROM transactions_with_attachments twa
    WHERE twa.id = transaction_uuid;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Success message
SELECT 'File attachments setup completed successfully!' as status;
