-- ==============================================================================
-- PrintFlow Migration 109: Drop Abandoned Subsystem Tables
-- Description: Cleans up database tables associated with retired mobile sync,
--              cross-branch operations, and duplicate parallel tax engine.
-- ==============================================================================

-- 1. Abandoned Parallel Tax Engine Tables
DROP TABLE IF EXISTS public.tax_transaction_lines CASCADE;
DROP TABLE IF EXISTS public.tax_profiles CASCADE;

-- 2. Abandoned Mobile Sync & Client Device Tables
DROP TABLE IF EXISTS public.sync_outbox CASCADE;
DROP TABLE IF EXISTS public.client_devices CASCADE;

-- 3. Abandoned Cross-Branch Operations & Transfer Tables
DROP TABLE IF EXISTS public.branch_transfer_requests CASCADE;
DROP TABLE IF EXISTS public.inter_branch_financial_transfers CASCADE;
DROP TABLE IF EXISTS public.employee_branch_assignments CASCADE;
DROP TABLE IF EXISTS public.workflow_configurations CASCADE;
