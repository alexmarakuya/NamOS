e

-- Policy to allow inserting attachments (adjust based on your auth requirements)
CREATE POLICY "Allow public insert access to attachments" ON attachments
    FOR INSERT WITH CHECK (true);

-- Policy to allow updating attachments (adjust based on your auth requirements)
CREATE POLICY "Allow public update access to attachments" ON attachments
    FOR UPDATE USING (true);

-- Policy to allow deleting attachments (adjust based on your auth requirements)
CREATE POLICY "Allow public delete access to attachments" ON attachments
    FOR DELETE USING (true);

-- View to get transactions with their attachments
CREATE OR REPLACE VIEW transactions_with_attachments AS
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

-- Function to get transaction with attachments
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
