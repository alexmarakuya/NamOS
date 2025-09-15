-- Add client status functionality to the database
-- This script adds a clients table to track client status and information

-- Create clients table
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('leads', 'onboarding', 'active', 'on-hold', 'off-boarded')),
    logo_url TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    address TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on client name for faster lookups
CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);

-- Add client_id foreign key to projects table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' AND column_name = 'client_id'
    ) THEN
        ALTER TABLE public.projects ADD COLUMN client_id UUID REFERENCES public.clients(id);
        CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects(client_id);
    END IF;
END $$;

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for clients table
DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert existing clients from projects table
INSERT INTO public.clients (name, status)
SELECT DISTINCT 
    client_name,
    'active' as status
FROM public.projects 
WHERE client_name IS NOT NULL 
    AND client_name != ''
    AND NOT EXISTS (
        SELECT 1 FROM public.clients WHERE name = projects.client_name
    );

-- Update projects table to link with clients table
UPDATE public.projects 
SET client_id = clients.id
FROM public.clients
WHERE projects.client_name = clients.name
    AND projects.client_id IS NULL;

-- Enable Row Level Security
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Create policies for clients table
CREATE POLICY "Enable read access for all users" ON public.clients
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.clients
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON public.clients
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON public.clients
    FOR DELETE USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON public.clients TO authenticated;
GRANT SELECT ON public.clients TO anon;

COMMENT ON TABLE public.clients IS 'Client information and status tracking';
COMMENT ON COLUMN public.clients.status IS 'Client status: leads, onboarding, active, on-hold, off-boarded';

