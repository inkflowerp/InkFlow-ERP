-- ==============================================================================
-- PrintERP SaaS - Migration 014: Production Management & Rework Tracking
-- Supports:
--   1. 5 Production Departments (design, printing, finishing, fabrication, installation)
--   2. Adaptive departmental stages and task checklists
--   3. Shop floor execution actions (Assign, Start, Pause, Complete, Reject, Rework)
--   4. Rework, scrap, material wastage, and labor overtime tracking
--   5. Strict Multi-Tenant Row Level Security
-- ==============================================================================

-- 1. PRODUCTION JOBS TABLE
create table if not exists public.production_jobs (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    production_job_number text not null,
    job_order_id uuid references public.job_orders(id) on delete set null,
    sales_order_id uuid references public.sales_orders(id) on delete set null,
    customer_name text not null,
    product_name text not null,
    department text not null check (
        department in ('design', 'printing', 'finishing', 'fabrication', 'installation')
    ),
    stage text not null default 'queued',
    status text not null default 'queued' check (
        status in ('queued', 'in_progress', 'paused', 'quality_check', 'completed', 'rework', 'rejected')
    ),
    pause_reason text,
    priority text not null default 'normal' check (priority in ('normal', 'urgent', 'very_urgent')),
    deadline timestamptz not null,
    dimensions_spec text not null,
    quantity integer not null default 1,
    material_spec text not null,
    artwork_proof_url text,
    production_instructions text,
    assigned_workers text[] default '{}',
    finishing_tasks text[] default '{}',
    fabrication_tasks text[] default '{}',
    has_rework boolean not null default false,
    rework_count integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_production_jobs_company_number unique (company_id, production_job_number)
);

create index if not exists idx_production_jobs_company on public.production_jobs(company_id);
create index if not exists idx_production_jobs_dept on public.production_jobs(company_id, department);
create index if not exists idx_production_jobs_status on public.production_jobs(company_id, status);
create index if not exists idx_production_jobs_priority on public.production_jobs(company_id, priority);
alter table public.production_jobs enable row level security;

-- 2. PRODUCTION REWORKS TABLE (Defect, scrap, and labor impact logging)
create table if not exists public.production_reworks (
    id uuid primary key default gen_random_uuid(),
    production_job_id uuid not null references public.production_jobs(id) on delete cascade,
    rework_number text not null,
    reason text not null,
    responsible_department text not null check (
        responsible_department in ('design', 'printing', 'finishing', 'fabrication', 'installation')
    ),
    material_wastage text not null,
    extra_labor_hours numeric(5,2) not null default 0,
    additional_time_hours numeric(5,2) not null default 0,
    estimated_wastage_cost numeric(12,2) not null default 0,
    reported_by_name text not null,
    status text not null default 'pending' check (status in ('pending', 'in_rework', 'resolved')),
    created_at timestamptz not null default now()
);

create index if not exists idx_production_reworks_job on public.production_reworks(production_job_id);
alter table public.production_reworks enable row level security;

-- 3. RLS POLICIES
create policy "Active company users can view production jobs"
    on public.production_jobs for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can manage production jobs"
    on public.production_jobs for all
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'production.view')
            or public.auth_user_has_permission(company_id, 'production.edit')
            or public.auth_user_has_permission(company_id, 'production.create')
        )
    );

create policy "Active company users can view reworks"
    on public.production_reworks for select
    using (
        exists (
            select 1 from public.production_jobs pj
            where pj.id = production_reworks.production_job_id
            and public.auth_is_active_company_user(pj.company_id)
        )
    );

create policy "Authorized company users can insert reworks"
    on public.production_reworks for insert
    with check (
        exists (
            select 1 from public.production_jobs pj
            where pj.id = production_reworks.production_job_id
            and public.auth_is_active_company_user(pj.company_id)
        )
    );
