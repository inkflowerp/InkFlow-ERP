-- ==============================================================================
-- PrintERP SaaS - Migration 030: Platform Admin Complete Hardening & Telemetry
-- Supports:
--   1. Platform Incidents Management Ledger
--   2. Platform Background Jobs Telemetry & Retries
--   3. Platform Emergency Controls & Kill-Switches
--   4. Platform Active Sessions & Token Revocation
--   5. Platform Tenant Data Export Logs
--   6. Platform Historical Health & Usage Snapshots
--   7. Strict Server-Side RLS Enforcement
-- ==============================================================================

-- 1. PLATFORM INCIDENTS TABLE
create table if not exists public.platform_incidents (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    description text not null,
    service_name text not null, -- 'whatsapp_cloud_api', 'greenweb_sms', 'bkash_gateway', 'database_cluster', 's3_storage'
    severity text not null default 'minor' check (severity in ('minor', 'major', 'critical')),
    status text not null default 'investigating' check (status in ('investigating', 'identified', 'monitoring', 'resolved')),
    affected_tenants_count integer not null default 0,
    root_cause text,
    resolution_notes text,
    created_by uuid references public.platform_admins(id) on delete set null,
    resolved_by uuid references public.platform_admins(id) on delete set null,
    started_at timestamptz not null default now(),
    resolved_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_platform_incidents_status on public.platform_incidents(status);
create index if not exists idx_platform_incidents_service on public.platform_incidents(service_name);
alter table public.platform_incidents enable row level security;

-- 2. PLATFORM BACKGROUND JOBS TABLE
create table if not exists public.platform_background_jobs (
    id uuid primary key default gen_random_uuid(),
    job_type text not null, -- 'render_proof_cleanup', 'subscription_expiry_check', 'daily_vat_summary', 'sms_digest_dispatch', 'invoice_pdf_compaction'
    company_id uuid references public.companies(id) on delete set null,
    status text not null default 'queued' check (status in ('queued', 'running', 'retrying', 'failed', 'completed', 'cancelled', 'dead_letter')),
    attempts integer not null default 0,
    max_attempts integer not null default 3,
    payload jsonb default '{}'::jsonb,
    error_log text,
    last_error_details jsonb default '{}'::jsonb,
    duration_ms integer,
    scheduled_for timestamptz not null default now(),
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists idx_platform_bg_jobs_status on public.platform_background_jobs(status);
create index if not exists idx_platform_bg_jobs_type on public.platform_background_jobs(job_type);
create index if not exists idx_platform_bg_jobs_comp on public.platform_background_jobs(company_id);
alter table public.platform_background_jobs enable row level security;

-- 3. PLATFORM EMERGENCY CONTROLS TABLE
create table if not exists public.platform_emergency_controls (
    id uuid primary key default gen_random_uuid(),
    control_key text unique not null, -- 'pause_whatsapp', 'pause_sms', 'pause_payments', 'pause_new_tenants', 'maintenance_mode', 'pause_background_jobs'
    name text not null,
    description text not null,
    is_active boolean not null default false,
    reason text,
    activated_by uuid references public.platform_admins(id) on delete set null,
    activated_by_email text,
    activated_at timestamptz,
    deactivated_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.platform_emergency_controls enable row level security;

-- Seed default emergency control keys
insert into public.platform_emergency_controls (control_key, name, description, is_active) values
('pause_whatsapp', 'Pause WhatsApp Cloud API', 'Temporarily halts all outgoing WhatsApp order challans and proof previews.', false),
('pause_sms', 'Pause SMS Gateway Dispatch', 'Suspends outbound Greenweb/SSL SMS notifications across all tenants.', false),
('pause_payments', 'Pause Payment Gateway Processing', 'Puts bKash, Nagad, and SSLCommerz checkouts into maintenance queue.', false),
('pause_new_tenants', 'Pause New Tenant Registration', 'Prevents new printing press signups from registering public onboarding.', false),
('maintenance_mode', 'Global Maintenance Mode', 'Locks tenant write mutations with an advisory maintenance banner.', false),
('pause_background_jobs', 'Pause Non-Critical Background Workers', 'Freezes background render workers and media compactions to preserve database compute.', false)
on conflict (control_key) do nothing;

-- 4. PLATFORM ACTIVE SESSIONS TABLE (For remote platform session revocation)
create table if not exists public.platform_active_sessions (
    id uuid primary key default gen_random_uuid(),
    platform_admin_id uuid not null references public.platform_admins(id) on delete cascade,
    session_token_hash text not null unique,
    ip_address text,
    user_agent text,
    device_name text,
    location text, -- 'Dhaka, Bangladesh'
    is_revoked boolean not null default false,
    last_seen_at timestamptz not null default now(),
    created_at timestamptz not null default now()
);

create index if not exists idx_platform_sessions_admin on public.platform_active_sessions(platform_admin_id);
alter table public.platform_active_sessions enable row level security;

-- 5. PLATFORM TENANT EXPORTS TABLE
create table if not exists public.platform_tenant_exports (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    requested_by uuid references public.platform_admins(id) on delete set null,
    requested_by_email text not null,
    modules text[] not null default '{}',
    status text not null default 'completed' check (status in ('pending', 'processing', 'completed', 'failed')),
    file_format text not null default 'json' check (file_format in ('json', 'csv', 'zip')),
    download_token text unique,
    expires_at timestamptz not null default now() + interval '24 hours',
    download_count integer not null default 0,
    created_at timestamptz not null default now()
);

create index if not exists idx_tenant_exports_comp on public.platform_tenant_exports(company_id);
alter table public.platform_tenant_exports enable row level security;

-- 6. RLS POLICIES FOR PLATFORM GOVERNANCE
create policy "Platform owners have full control on incidents"
    on public.platform_incidents for all
    using (public.auth_is_platform_owner());

create policy "Platform owners have full control on background jobs"
    on public.platform_background_jobs for all
    using (public.auth_is_platform_owner());

create policy "Platform owners have full control on emergency controls"
    on public.platform_emergency_controls for all
    using (public.auth_is_platform_owner());

create policy "Platform owners have full control on active sessions"
    on public.platform_active_sessions for all
    using (public.auth_is_platform_owner());

create policy "Platform owners have full control on tenant exports"
    on public.platform_tenant_exports for all
    using (public.auth_is_platform_owner());
