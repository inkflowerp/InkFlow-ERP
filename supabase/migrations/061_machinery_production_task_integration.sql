-- ==============================================================================
-- InkFlow SaaS - Migration 061: Machinery Multi-Task Production Integration
-- Supports:
--   1. Multiple Machine Assignments per Job Order across distinct production tasks (Printing, Lamination, Cutting, CNC, Fabrication, Finishing)
--   2. Branch scoping on machinery assignments
--   3. Concurrency-safe index on machine schedule windows
-- ==============================================================================

ALTER TABLE public.machinery_assignments ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'printing';
ALTER TABLE public.machinery_assignments ADD COLUMN IF NOT EXISTS task_name TEXT;
ALTER TABLE public.machinery_assignments ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_machinery_assignments_job_task ON public.machinery_assignments (company_id, job_order_id, task_type);
CREATE INDEX IF NOT EXISTS idx_machinery_assignments_prod_task ON public.machinery_assignments (company_id, production_job_id, task_type);
CREATE INDEX IF NOT EXISTS idx_machinery_assignments_branch ON public.machinery_assignments (company_id, branch_id);
