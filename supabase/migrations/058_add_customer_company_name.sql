-- ==============================================================================
-- Migration 058: Add company_name and expand customer categories in customers table
-- Authoritative schema update for Customer 360 module
-- ==============================================================================

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS company_name TEXT;
CREATE INDEX IF NOT EXISTS idx_customers_company_name_col ON public.customers (company_id, company_name);

-- Update customer_type check constraint to include reseller
DO $$
BEGIN
    ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_customer_type_check;
    ALTER TABLE public.customers ADD CONSTRAINT customers_customer_type_check 
        CHECK (customer_type IN ('corporate', 'agency', 'retail', 'dealer', 'government', 'regular', 'reseller'));
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;
