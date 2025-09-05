-- Fix storage access for transaction attachments
-- Run this in Supabase SQL Editor

-- Create the storage bucket if it doesn't exist (this might need to be done via dashboard)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('transaction-attachments', 'transaction-attachments', true)
-- ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects if not already enabled
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policies for storage.objects to allow public access to our bucket
DROP POLICY IF EXISTS "Public Access to transaction-attachments" ON storage.objects;
CREATE POLICY "Public Access to transaction-attachments" ON storage.objects
  FOR ALL USING (bucket_id = 'transaction-attachments');

-- Allow public access to upload files to transaction-attachments bucket
DROP POLICY IF EXISTS "Public Upload to transaction-attachments" ON storage.objects;
CREATE POLICY "Public Upload to transaction-attachments" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'transaction-attachments');

-- Allow public access to read files from transaction-attachments bucket
DROP POLICY IF EXISTS "Public Read from transaction-attachments" ON storage.objects;
CREATE POLICY "Public Read from transaction-attachments" ON storage.objects
  FOR SELECT USING (bucket_id = 'transaction-attachments');

-- Allow public access to update files in transaction-attachments bucket
DROP POLICY IF EXISTS "Public Update in transaction-attachments" ON storage.objects;
CREATE POLICY "Public Update in transaction-attachments" ON storage.objects
  FOR UPDATE USING (bucket_id = 'transaction-attachments');

-- Allow public access to delete files from transaction-attachments bucket
DROP POLICY IF EXISTS "Public Delete from transaction-attachments" ON storage.objects;
CREATE POLICY "Public Delete from transaction-attachments" ON storage.objects
  FOR DELETE USING (bucket_id = 'transaction-attachments');

-- Enable RLS on storage.buckets if not already enabled
-- ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- Create policy to allow listing buckets (this might be needed)
DROP POLICY IF EXISTS "Public bucket access" ON storage.buckets;
CREATE POLICY "Public bucket access" ON storage.buckets
  FOR SELECT USING (true);

SELECT 'Storage policies created successfully!' as status;
