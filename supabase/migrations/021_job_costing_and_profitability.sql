-- ==============================================================================
-- PrintERP SaaS - Migration 021: Job Costing, 9-Head Costs & Profitability Engine
-- Supports:
--   1. 9 Standard Cost Heads (Material, Ink, Printing, Finishing, Labor, Fabrication, Installation, Transport, Other)
--   2. Pre-Production Estimated vs Post-Production Actual Costing
--   3. Granular Variance Analysis (Favorable savings vs Unfavorable overruns)
--   4. 4 Labor Costing Modes (Fixed Job, Hourly, Daily Worker, Employee Contribution)
--   5. Strict Multi-Tenant Row Level Security & Role-Based Shielding
-- ==============================================================================

-- 1. JOB COSTINGS TABLE
create table if not exists public.job_costings (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    job_id uuid references public.production_jobs(id) on delete cascade,
    job_number text not null,
    customer_id uuid references public.customers(id) on delete restrict,
    customer_name text not null,
    selling_price numeric(12,2) not null,
    
    -- Pre-Production Estimated Costs
    est_material_cost numeric(12,2) not null default 0,
    est_ink_cost numeric(12,2) not null default 0,
    est_printing_cost numeric(12,2) not null default 0,
    est_finishing_cost numeric(12,2) not null default 0,
    est_labor_cost numeric(12,2) not null default 0,
    est_fabrication_cost numeric(12,2) not null default 0,
    est_installation_cost numeric(12,2) not null default 0,
    est_transport_cost numeric(12,2) not null default 0,
    est_other_cost numeric(12,2) not null default 0,
    est_total_cost numeric(12,2) not null default 0,
    est_profit numeric(12,2) not null default 0,
    est_margin_percentage numeric(5,2) not null default 0,

    -- Post-Production Actual Costs
    act_material_cost numeric(12,2) not null default 0,
    act_ink_cost numeric(12,2) not null default 0,
    act_printing_cost numeric(12,2) not null default 0,
    act_finishing_cost numeric(12,2) not null default 0,
    act_labor_cost numeric(12,2) not null default 0,
    act_fabrication_cost numeric(12,2) not null default 0,
    act_installation_cost numeric(12,2) not null default 0,
    act_transport_cost numeric(12,2) not null default 0,
    act_other_cost numeric(12,2) not null default 0,
    act_total_cost numeric(12,2) not null default 0,
    act_profit numeric(12,2) not null default 0,
    act_margin_percentage numeric(5,2) not null default 0,

    -- Variance Metrics (Actual - Estimated)
    material_variance numeric(12,2) not null default 0,
    labor_variance numeric(12,2) not null default 0,
    transport_variance numeric(12,2) not null default 0,
    total_variance numeric(12,2) not null default 0,

    labor_cost_mode text not null default 'hourly' check (
        labor_cost_mode in ('fixed_job', 'hourly', 'daily_worker', 'employee_contribution')
    ),
    status text not null default 'estimated' check (
        status in ('estimated', 'in_production', 'actualized', 'closed')
    ),
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_job_costings_company_job unique (company_id, job_number)
);

create index if not exists idx_job_costings_company on public.job_costings(company_id);
create index if not exists idx_job_costings_customer on public.job_costings(company_id, customer_id);
create index if not exists idx_job_costings_status on public.job_costings(company_id, status);
alter table public.job_costings enable row level security;

-- 2. RLS POLICIES
create policy "Active company users can view job costings"
    on public.job_costings for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can manage job costings"
    on public.job_costings for all
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'costing.view')
            or public.auth_user_has_permission(company_id, 'costing.edit')
            or public.auth_user_has_permission(company_id, 'production.edit')
        )
    );
