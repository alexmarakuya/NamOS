-- ============================================================================
-- Setup Clients Table and Populate with Data
-- ============================================================================
-- Run this script in your Supabase SQL Editor to create the clients table
-- and populate it with existing client data from projects
-- ============================================================================

-- Step 1: Create the clients table
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

-- Step 2: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);

-- Step 3: Add client_id foreign key to projects table (if not exists)
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

-- Step 4: Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 5: Create trigger for clients table
DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 6: Insert existing clients from projects table
INSERT INTO public.clients (name, status)
SELECT DISTINCT 
    client_name,
    CASE 
        WHEN client_name ILIKE '%acai%' THEN 'active'
        WHEN client_name ILIKE '%amex%' OR client_name ILIKE '%gbt%' THEN 'active'
        WHEN client_name ILIKE '%acme%' THEN 'completed'
        WHEN client_name ILIKE '%retail%' THEN 'onboarding'
        WHEN client_name ILIKE '%shop%' THEN 'leads'
        ELSE 'active'
    END as status
FROM public.projects 
WHERE client_name IS NOT NULL 
    AND client_name != ''
    AND NOT EXISTS (
        SELECT 1 FROM public.clients WHERE name = projects.client_name
    );

-- Step 7: Update projects table to link with clients table
UPDATE public.projects 
SET client_id = clients.id
FROM public.clients
WHERE projects.client_name = clients.name
    AND projects.client_id IS NULL;

-- Step 8: Add some sample clients if no projects exist
INSERT INTO public.clients (name, status, contact_email, notes) VALUES
    ('Acai Travel', 'active', 'contact@acaitravel.com', 'Travel booking platform client'),
    ('AmexGBT', 'active', 'partnerships@amexgbt.com', 'Corporate travel solutions'),
    ('TechStart Inc', 'leads', 'hello@techstart.com', 'Startup looking for MVP development'),
    ('RetailCo', 'onboarding', 'projects@retailco.com', 'E-commerce platform modernization'),
    ('ShopLocal', 'leads', 'info@shoplocal.com', 'Local marketplace platform')
ON CONFLICT (name) DO NOTHING;

-- Step 9: Enable Row Level Security
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Step 10: Create policies for clients table
DROP POLICY IF EXISTS "Enable read access for all users" ON public.clients;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.clients;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.clients;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.clients;

CREATE POLICY "Enable read access for all users" ON public.clients
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.clients
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON public.clients
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON public.clients
    FOR DELETE USING (auth.role() = 'authenticated');

-- Step 11: Grant permissions
GRANT ALL ON public.clients TO authenticated;
GRANT SELECT ON public.clients TO anon;

-- Step 12: Add table and column comments
COMMENT ON TABLE public.clients IS 'Client information and status tracking';
COMMENT ON COLUMN public.clients.status IS 'Client status: leads, onboarding, active, on-hold, off-boarded';

-- Step 13: Verify the setup
DO $$
DECLARE
    client_count INTEGER;
    project_count INTEGER;
    linked_projects INTEGER;
BEGIN
    SELECT COUNT(*) INTO client_count FROM public.clients;
    SELECT COUNT(*) INTO project_count FROM public.projects WHERE client_name IS NOT NULL;
    SELECT COUNT(*) INTO linked_projects FROM public.projects WHERE client_id IS NOT NULL;
    
    RAISE NOTICE '✅ Clients table setup complete!';
    RAISE NOTICE '📊 Summary:';
    RAISE NOTICE '   Total clients: %', client_count;
    RAISE NOTICE '   Projects with client names: %', project_count;
    RAISE NOTICE '   Projects linked to clients: %', linked_projects;
    
    IF client_count = 0 THEN
        RAISE NOTICE '⚠️  No clients found. You may need to create some projects first or add clients manually.';
    END IF;
END $$;

-- Step 14: Show the created clients
SELECT 
    name,
    status,
    contact_email,
    created_at
FROM public.clients 
ORDER BY name;
