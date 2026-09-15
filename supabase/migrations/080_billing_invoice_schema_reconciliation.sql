-- ==============================================================================
-- InkFlow ERP SaaS - Migration 080: Billing Invoice Schema Reconciliation & Integrity
-- Ensures all financial columns, foreign keys, and indexes exist for seamless
-- invoice creation, traceability, search, and immediate directory visibility.
-- ==============================================================================

DO $$
BEGIN
    -- 1. Invoices Table Extended Columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'customer_email'
    ) THEN
        ALTER TABLE public.invoices ADD COLUMN customer_email TEXT DEFAULT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'quotation_id'
    ) THEN
        ALTER TABLE public.invoices ADD COLUMN quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'quotation_number'
    ) THEN
        ALTER TABLE public.invoices ADD COLUMN quotation_number TEXT DEFAULT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'job_order_id'
    ) THEN
        ALTER TABLE public.invoices ADD COLUMN job_order_id UUID DEFAULT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'job_number'
    ) THEN
        ALTER TABLE public.invoices ADD COLUMN job_number TEXT DEFAULT NULL;
    END IF;

    -- 2. Invoice Items Table Extended Columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'invoice_items' AND column_name = 'finishing'
    ) THEN
        ALTER TABLE public.invoice_items ADD COLUMN finishing TEXT DEFAULT NULL;
    END IF;
END $$;

-- 3. Dedicated Performance Indexes for Fast Invoicing & Traceability Queries
CREATE INDEX IF NOT EXISTS idx_invoices_comp_quotation ON public.invoices(company_id, quotation_id);
CREATE INDEX IF NOT EXISTS idx_invoices_comp_sales_order ON public.invoices(company_id, sales_order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_comp_created_at ON public.invoices(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
