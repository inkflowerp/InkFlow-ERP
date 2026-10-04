-- Migration 124: Fix Invoice Write-Off Check Constraint and Eliminate get_next_document_number Ambiguity
-- 1. Updates chk_invoice_paid_plus_due to include COALESCE(write_off_amount, 0)
-- 2. Drops obsolete 2-argument get_next_document_number overload in favor of 3-argument version with defaults

ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS chk_invoice_paid_plus_due;
ALTER TABLE public.invoices ADD CONSTRAINT chk_invoice_paid_plus_due 
    CHECK (ROUND(paid_amount + due_amount + COALESCE(write_off_amount, 0), 2) = ROUND(grand_total, 2));

DROP FUNCTION IF EXISTS public.get_next_document_number(uuid, text);
