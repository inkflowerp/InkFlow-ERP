-- ==============================================================================
-- Migration 104: Add customer_id_no and customer_code to customers table
-- Authoritative schema update for Customer ID sequential numbering and search
-- ==============================================================================

-- 1. Add customer_id_no and customer_code columns
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS customer_id_no TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS customer_code TEXT;

-- 2. Indexes for high-speed multi-tenant customer lookups
CREATE INDEX IF NOT EXISTS idx_customers_customer_id_no ON public.customers (company_id, customer_id_no);
CREATE INDEX IF NOT EXISTS idx_customers_customer_code ON public.customers (company_id, customer_code);

-- 3. Document sequence for customers
ALTER TABLE public.document_sequences DROP CONSTRAINT IF EXISTS document_sequences_doc_type_check;
ALTER TABLE public.document_sequences ADD CONSTRAINT document_sequences_doc_type_check 
  CHECK ((doc_type = ANY (ARRAY['quotation'::text, 'order'::text, 'invoice'::text, 'challan'::text, 'payment'::text, 'purchase'::text, 'customer'::text])));

INSERT INTO public.document_sequences (company_id, doc_type, prefix, current_val, padding, updated_at)
SELECT 
    id as company_id, 
    'customer' as doc_type, 
    'CUST' as prefix, 
    COALESCE((SELECT COUNT(*) FROM public.customers WHERE company_id = companies.id), 0) as current_val, 
    4 as padding, 
    NOW() as updated_at
FROM public.companies
ON CONFLICT (company_id, doc_type) DO NOTHING;

-- 4. Backfill existing customers with deterministic, sequential customer_id_no (e.g. CUST-0001)
WITH numbered_customers AS (
    SELECT 
        id, 
        'CUST-' || LPAD(ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY created_at ASC)::TEXT, 4, '0') as gen_id_no
    FROM public.customers
    WHERE customer_id_no IS NULL OR customer_id_no = ''
)
UPDATE public.customers c
SET customer_id_no = nc.gen_id_no
FROM numbered_customers nc
WHERE c.id = nc.id;
