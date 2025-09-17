-- Fix clients data insertion
-- Insert existing clients from projects table with correct status values

INSERT INTO public.clients (name, status)
SELECT DISTINCT 
    client_name,
    CASE 
        WHEN client_name ILIKE '%acai%' THEN 'active'
        WHEN client_name ILIKE '%amex%' OR client_name ILIKE '%gbt%' THEN 'active'
        WHEN client_name ILIKE '%acme%' THEN 'off-boarded'
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

-- Update projects table to link with clients table
UPDATE public.projects 
SET client_id = clients.id
FROM public.clients
WHERE projects.client_name = clients.name
    AND projects.client_id IS NULL;

-- Add some sample clients if no projects exist
INSERT INTO public.clients (name, status, contact_email, notes) VALUES
    ('Acai Travel', 'active', 'contact@acaitravel.com', 'Travel booking platform client'),
    ('AmexGBT', 'active', 'partnerships@amexgbt.com', 'Corporate travel solutions'),
    ('TechStart Inc', 'leads', 'hello@techstart.com', 'Startup looking for MVP development'),
    ('RetailCo', 'onboarding', 'projects@retailco.com', 'E-commerce platform modernization'),
    ('ShopLocal', 'leads', 'info@shoplocal.com', 'Local marketplace platform')
ON CONFLICT (name) DO NOTHING;
