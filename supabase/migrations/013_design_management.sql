-- ==============================================================================
-- PrintERP SaaS - Migration 013: Design Management & Artwork Versioning
-- Supports:
--   1. 6 Design Workflow Statuses (received, designing, customer_approval, revision, approved, rejected)
--   2. Multi-Format Artwork & Proof Versioning (v1, v2, v3)
--   3. Customer Approval & Immutability Lock (is_locked preventing accidental overwrite)
--   4. Customer Feedback & Revision Audit Trail
--   5. Strict Multi-Tenant Row Level Security
-- ==============================================================================

-- 1. DESIGN JOBS TABLE
create table if not exists public.design_jobs (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    design_number text not null,
    job_order_id uuid references public.job_orders(id) on delete set null,
    sales_order_id uuid references public.sales_orders(id) on delete set null,
    customer_id uuid references public.customers(id) on delete restrict,
    customer_name text not null,
    title text not null,
    designer_id uuid references auth.users(id) on delete set null,
    designer_name text not null,
    priority text not null default 'normal' check (priority in ('normal', 'urgent', 'very_urgent')),
    status text not null default 'received' check (
        status in ('received', 'designing', 'customer_approval', 'revision', 'approved', 'rejected')
    ),
    deadline timestamptz not null,
    instructions text,
    dimensions_spec text,
    current_version integer not null default 1,
    revision_count integer not null default 0,
    customer_feedback text,
    approved_version integer,
    approved_by text,
    approval_timestamp timestamptz,
    approval_note text,
    is_locked boolean not null default false, -- Once approved, locks against accidental file replacement
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_design_jobs_company_number unique (company_id, design_number)
);

create index if not exists idx_design_jobs_company on public.design_jobs(company_id);
create index if not exists idx_design_jobs_status on public.design_jobs(company_id, status);
create index if not exists idx_design_jobs_designer on public.design_jobs(company_id, designer_id);
create index if not exists idx_design_jobs_priority on public.design_jobs(company_id, priority);
alter table public.design_jobs enable row level security;

-- 2. DESIGN VERSIONS TABLE (Artwork proofs and production source files)
create table if not exists public.design_versions (
    id uuid primary key default gen_random_uuid(),
    design_job_id uuid not null references public.design_jobs(id) on delete cascade,
    version_number integer not null default 1,
    version_label text not null,
    proof_file_url text not null, -- Web-previewable proof: JPG, PNG, PDF, SVG
    proof_file_name text not null,
    source_file_url text, -- Raw vector/raster file: AI, PSD, CDR, ZIP
    source_file_name text,
    file_format text not null check (file_format in ('jpg', 'png', 'pdf', 'svg', 'ai', 'psd', 'cdr', 'zip')),
    file_size_bytes bigint default 0,
    change_notes text,
    uploaded_by_name text not null,
    is_approved boolean not null default false,
    created_at timestamptz not null default now(),
    constraint uk_design_job_version unique (design_job_id, version_number)
);

create index if not exists idx_design_versions_job on public.design_versions(design_job_id);
alter table public.design_versions enable row level security;

-- 3. DESIGN FEEDBACK LOGS TABLE
create table if not exists public.design_feedback_logs (
    id uuid primary key default gen_random_uuid(),
    design_job_id uuid not null references public.design_jobs(id) on delete cascade,
    version_number integer not null default 1,
    sender_type text not null check (sender_type in ('customer', 'designer', 'sales')),
    sender_name text not null,
    message text not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_design_feedback_job on public.design_feedback_logs(design_job_id);
alter table public.design_feedback_logs enable row level security;

-- 4. RLS POLICIES
create policy "Active company users can view design jobs"
    on public.design_jobs for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can insert design jobs"
    on public.design_jobs for insert
    with check (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'design.create')
            or public.auth_user_has_permission(company_id, 'order.create')
        )
    );

create policy "Authorized company users can update design jobs"
    on public.design_jobs for update
    using (
        public.auth_is_active_company_user(company_id)
        and public.auth_user_has_permission(company_id, 'design.edit')
    );

create policy "Active company users can view design versions"
    on public.design_versions for select
    using (
        exists (
            select 1 from public.design_jobs dj
            where dj.id = design_versions.design_job_id
            and public.auth_is_active_company_user(dj.company_id)
        )
    );

create policy "Authorized company users can manage design versions"
    on public.design_versions for all
    using (
        exists (
            select 1 from public.design_jobs dj
            where dj.id = design_versions.design_job_id
            and public.auth_is_active_company_user(dj.company_id)
            and (dj.is_locked = false or public.auth_user_has_permission(dj.company_id, 'design.approve'))
        )
    );

create policy "Active company users can view feedback"
    on public.design_feedback_logs for select
    using (
        exists (
            select 1 from public.design_jobs dj
            where dj.id = design_feedback_logs.design_job_id
            and public.auth_is_active_company_user(dj.company_id)
        )
    );

create policy "Active company users can insert feedback"
    on public.design_feedback_logs for insert
    with check (
        exists (
            select 1 from public.design_jobs dj
            where dj.id = design_feedback_logs.design_job_id
            and public.auth_is_active_company_user(dj.company_id)
        )
    );
