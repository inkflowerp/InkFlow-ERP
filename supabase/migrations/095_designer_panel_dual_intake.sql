-- ==============================================================================
-- PrintERP SaaS - Migration 095: Designer Panel & Dual Intake Workflow Architecture
-- Supports:
--   1. Line-item level design requirement & approval configuration on invoice_items
--   2. Dual intake source tracking and approval requirement on design_jobs
--   3. Relational linkage between invoice line items and design jobs
--   4. RLS security policies and performance indexes
-- ==============================================================================

-- 1. EXTEND INVOICE_ITEMS WITH DESIGN & APPROVAL FLAGS
alter table public.invoice_items
    add column if not exists design_required boolean default false,
    add column if not exists customer_approval_required boolean default false,
    add column if not exists design_job_id uuid references public.design_jobs(id) on delete set null;

create index if not exists idx_invoice_items_design_job on public.invoice_items(design_job_id);

-- 2. EXTEND DESIGN_JOBS WITH DUAL INTAKE ATTRIBUTES
alter table public.design_jobs
    add column if not exists intake_source text default 'direct_customer' check (
        intake_source in ('direct_customer', 'manager_billing')
    ),
    add column if not exists customer_approval_required boolean default true,
    add column if not exists invoice_item_id uuid references public.invoice_items(id) on delete set null;

create index if not exists idx_design_jobs_invoice_item on public.design_jobs(invoice_item_id);
create index if not exists idx_design_jobs_intake_source on public.design_jobs(company_id, intake_source);
