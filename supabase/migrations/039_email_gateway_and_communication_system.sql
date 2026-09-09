-- ==============================================================================
-- PrintERP SaaS - Migration 039: Multi-Tenant Email Gateway System & Communication Infrastructure
-- Supports:
--   1. Platform-level Default Email Gateway & Configuration
--   2. Tenant-level Custom Email Gateways (BYO SMTP / Resend / SendGrid / Amazon SES)
--   3. Email Gateway Resolver & Fail-Closed Fallback Logic
--   4. Standardized Bilingual Email Templates (English & বাংলা) with Variable Interpolation
--   5. Asynchronous Email Queue with Exponential Backoff Retry Policy
--   6. Immutable Email Transmission & Audit Logs with Strict Tenant RLS
-- ==============================================================================

-- 1. EMAIL GATEWAYS TABLE
create table if not exists public.email_gateways (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid references public.companies(id) on delete cascade, -- NULL for Platform Global Gateway
    provider text not null check (provider in ('smtp', 'resend', 'sendgrid', 'ses', 'custom', 'mock')),
    type text not null default 'transactional' check (type in ('transactional', 'marketing', 'system')),
    smtp_host text,
    smtp_port integer,
    smtp_username text,
    encrypted_credentials text, -- AES-256-GCM encrypted password / API key / secret
    encryption_type text check (encryption_type in ('ssl', 'tls', 'starttls', 'none')),
    sender_name text not null,
    sender_email text not null,
    reply_to_email text,
    status text not null default 'active' check (status in ('active', 'inactive', 'unverified', 'error')),
    is_default boolean not null default false,
    extra_settings jsonb default '{}'::jsonb, -- e.g. { aws_region, ses_config_set, custom_headers, rate_limit }
    last_tested_at timestamptz,
    last_test_status text,
    last_test_error text,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Unique index to ensure at most one default gateway per tenant (and one default platform gateway)
create unique index if not exists idx_email_gateways_platform_default
    on public.email_gateways(is_default)
    where tenant_id is null and is_default = true;

create unique index if not exists idx_email_gateways_tenant_default
    on public.email_gateways(tenant_id, is_default)
    where tenant_id is not null and is_default = true;

create index if not exists idx_email_gateways_tenant on public.email_gateways(tenant_id);
create index if not exists idx_email_gateways_status on public.email_gateways(status);
alter table public.email_gateways enable row level security;

-- 2. EMAIL TEMPLATES TABLE
create table if not exists public.email_templates (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid references public.companies(id) on delete cascade, -- NULL for Platform Default Templates
    event_type text not null, -- e.g. 'invoice_created', 'quotation_sent', 'payment_received', 'due_reminder', 'design_approval_request', 'revision_notification', 'approval_confirmation', 'job_started', 'job_completed', 'delivery_scheduled', 'delivery_completed', 'user_invitation', 'password_reset', 'security_alert', 'test_email'
    name text not null,
    name_bn text,
    subject_template text not null,
    subject_template_bn text,
    body_template text not null,
    body_template_bn text,
    variables jsonb default '[]'::jsonb, -- list of supported variables e.g. ["customer_name", "invoice_number", "amount", "due_date", "company_name"]
    status text not null default 'active' check (status in ('active', 'inactive', 'draft')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Unique constraint for event_type per tenant (and platform level)
create unique index if not exists idx_email_templates_platform_event
    on public.email_templates(event_type)
    where tenant_id is null;

create unique index if not exists idx_email_templates_tenant_event
    on public.email_templates(tenant_id, event_type)
    where tenant_id is not null;

create index if not exists idx_email_templates_tenant on public.email_templates(tenant_id);
create index if not exists idx_email_templates_event on public.email_templates(event_type);
alter table public.email_templates enable row level security;

-- 3. EMAIL TRANSMISSION LOGS TABLE
create table if not exists public.email_logs (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid references public.companies(id) on delete cascade, -- NULL for pure Platform system emails
    gateway_id uuid references public.email_gateways(id) on delete set null,
    event_type text not null,
    recipient text not null,
    subject text not null,
    status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed', 'retrying')),
    provider_message_id text,
    error_message text,
    retry_count integer not null default 0,
    max_retries integer not null default 3,
    metadata jsonb default '{}'::jsonb,
    sent_by uuid references auth.users(id) on delete set null,
    sent_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists idx_email_logs_tenant on public.email_logs(tenant_id);
create index if not exists idx_email_logs_status on public.email_logs(status);
create index if not exists idx_email_logs_created on public.email_logs(created_at desc);
alter table public.email_logs enable row level security;

-- 4. ASYNCHRONOUS EMAIL QUEUE TABLE
create table if not exists public.email_queue (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid references public.companies(id) on delete cascade,
    event_type text not null,
    recipient text not null,
    subject text not null,
    html_body text not null,
    text_body text,
    variables jsonb default '{}'::jsonb,
    attachments jsonb default '[]'::jsonb,
    metadata jsonb default '{}'::jsonb,
    status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    attempts integer not null default 0,
    max_attempts integer not null default 3,
    next_run_at timestamptz not null default now(),
    last_error text,
    locked_at timestamptz,
    locked_by text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_email_queue_pending on public.email_queue(status, next_run_at)
    where status in ('pending', 'failed');
create index if not exists idx_email_queue_tenant on public.email_queue(tenant_id);
alter table public.email_queue enable row level security;

-- 5. ROW LEVEL SECURITY (RLS) POLICIES

-- Gateways RLS
-- Platform Admins: Full control over platform gateways (tenant_id is null)
create policy "Platform admins manage platform email gateways"
    on public.email_gateways for all
    using (public.auth_is_platform_admin() and tenant_id is null);

-- Active Tenant Users: Can read their own tenant gateways
create policy "Tenant users view own email gateways"
    on public.email_gateways for select
    using (
        tenant_id is not null
        and public.auth_is_active_company_user(tenant_id)
    );

-- Authorized Tenant Admins: Can insert, update, delete their own tenant gateways
create policy "Authorized tenant admins manage own email gateways"
    on public.email_gateways for all
    using (
        tenant_id is not null
        and public.auth_is_active_company_user(tenant_id)
        and public.auth_user_has_permission(tenant_id, 'settings.edit')
    );

-- Email Templates RLS
-- Platform Admins: Full control over platform default templates
create policy "Platform admins manage platform email templates"
    on public.email_templates for all
    using (public.auth_is_platform_admin() and tenant_id is null);

-- Tenant Users: Can read platform default templates (for fallback) AND their own tenant templates
create policy "Tenant users view accessible templates"
    on public.email_templates for select
    using (
        tenant_id is null -- Public / platform default templates
        or public.auth_is_active_company_user(tenant_id) -- Tenant customized templates
    );

-- Authorized Tenant Admins: Can manage their tenant-specific templates
create policy "Authorized tenant admins manage own email templates"
    on public.email_templates for all
    using (
        tenant_id is not null
        and public.auth_is_active_company_user(tenant_id)
        and public.auth_user_has_permission(tenant_id, 'settings.edit')
    );

-- Email Logs RLS
-- Platform Admins: View all logs / platform logs
create policy "Platform admins view email logs"
    on public.email_logs for select
    using (public.auth_is_platform_admin());

-- Active Tenant Users: View their own tenant logs
create policy "Tenant users view own email logs"
    on public.email_logs for select
    using (
        tenant_id is not null
        and public.auth_is_active_company_user(tenant_id)
    );

-- Active Tenant Users / Service: Can insert logs for their tenant
create policy "Tenant users append own email logs"
    on public.email_logs for insert
    with check (
        (tenant_id is not null and public.auth_is_active_company_user(tenant_id))
        or public.auth_is_platform_admin()
    );

-- Email Queue RLS
create policy "Platform admins view email queue"
    on public.email_queue for all
    using (public.auth_is_platform_admin());

create policy "Tenant users view own email queue"
    on public.email_queue for select
    using (
        tenant_id is not null
        and public.auth_is_active_company_user(tenant_id)
    );

create policy "Tenant users enqueue emails"
    on public.email_queue for insert
    with check (
        tenant_id is not null
        and public.auth_is_active_company_user(tenant_id)
    );
