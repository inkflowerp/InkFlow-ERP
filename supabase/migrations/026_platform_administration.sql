-- ==============================================================================
-- PrintERP SaaS - Migration 026: Platform Administration & Root Governance
-- Supports:
--   1. Platform Audit Logs (Immutable Root Audit Trail with RLS)
--   2. Tenant-Specific Feature Flag Overrides
--   3. Platform RBAC Templates (Mutable System Presets)
--   4. System Health Telemetry (Failed Jobs, Notifications, Storage, APIs, Integrations)
--   5. Strict Platform Security Definer Functions & Tenant Boundary Isolation
-- ==============================================================================

-- 1. PLATFORM AUDIT LOGS TABLE
create table if not exists public.platform_audit_logs (
    id uuid primary key default gen_random_uuid(),
    platform_admin_id uuid references public.platform_admins(id) on delete set null,
    actor_email text not null default 'system@printerp.com.bd',
    action text not null, -- 'company.activate', 'company.suspend', 'company.reactivate', 'company.change_plan', 'feature_flag.update', 'rbac_template.update', 'system.job_retry', 'system.resolve'
    entity_type text not null, -- 'company', 'plan', 'feature_flag', 'rbac_template', 'system_job', 'system_alert'
    entity_id text,
    target_company_id uuid references public.companies(id) on delete set null,
    details jsonb not null default '{}'::jsonb,
    ip_address text,
    user_agent text,
    created_at timestamptz not null default now()
);

create index if not exists idx_platform_audit_action on public.platform_audit_logs(action);
create index if not exists idx_platform_audit_target on public.platform_audit_logs(target_company_id);
create index if not exists idx_platform_audit_created on public.platform_audit_logs(created_at desc);
alter table public.platform_audit_logs enable row level security;

-- 2. TENANT-SPECIFIC FEATURE FLAG OVERRIDES TABLE
create table if not exists public.platform_tenant_feature_flags (
    id uuid primary key default gen_random_uuid(),
    flag_id uuid not null references public.platform_feature_flags(id) on delete cascade,
    company_id uuid not null references public.companies(id) on delete cascade,
    is_enabled boolean not null default false,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint unique_tenant_feature_flag unique (flag_id, company_id)
);

create index if not exists idx_tenant_flags_comp on public.platform_tenant_feature_flags(company_id);
create index if not exists idx_tenant_flags_flag on public.platform_tenant_feature_flags(flag_id);
alter table public.platform_tenant_feature_flags enable row level security;

-- 3. PLATFORM RBAC ROLE TEMPLATES & PERMISSION MATRIX TABLES
create table if not exists public.platform_role_templates (
    id uuid primary key default gen_random_uuid(),
    slug text unique not null, -- 'business_owner', 'sales_manager', 'designer', 'production_manager', 'operator', 'general_staff'
    name text not null,
    name_bn text,
    description text,
    is_system boolean not null default true,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.platform_role_template_permissions (
    id uuid primary key default gen_random_uuid(),
    role_template_id uuid not null references public.platform_role_templates(id) on delete cascade,
    resource text not null,
    action text not null check (action in ('view', 'create', 'edit', 'delete', 'approve', 'full_control')),
    is_allowed boolean not null default true,
    created_at timestamptz not null default now(),
    constraint unique_role_template_resource_action unique (role_template_id, resource, action)
);

create index if not exists idx_template_perms_role on public.platform_role_template_permissions(role_template_id);
alter table public.platform_role_templates enable row level security;
alter table public.platform_role_template_permissions enable row level security;

-- 4. SYSTEM HEALTH TELEMETRY TABLE
create table if not exists public.platform_system_health_events (
    id uuid primary key default gen_random_uuid(),
    category text not null check (category in ('job', 'notification', 'storage', 'api', 'integration')),
    service_name text not null, -- 'bg_order_cleanup', 'whatsapp_cloud_api', 'greenweb_sms', 's3_storage_bucket', 'bkash_checkout', 'mushak_6_3_sync'
    severity text not null default 'warning' check (severity in ('info', 'warning', 'error', 'critical')),
    message text not null,
    error_details jsonb not null default '{}'::jsonb,
    company_id uuid references public.companies(id) on delete set null,
    resolved boolean not null default false,
    resolved_at timestamptz,
    resolved_by uuid references public.platform_admins(id) on delete set null,
    created_at timestamptz not null default now()
);

create index if not exists idx_health_events_cat on public.platform_system_health_events(category);
create index if not exists idx_health_events_resolved on public.platform_system_health_events(resolved);
create index if not exists idx_health_events_created on public.platform_system_health_events(created_at desc);
alter table public.platform_system_health_events enable row level security;

-- 5. SEED INITIAL RBAC TEMPLATES
insert into public.platform_role_templates (slug, name, name_bn, description, is_system, sort_order) values
('business_owner', 'Business Owner', 'প্রতিষ্ঠানের মালিক', 'Full organization access: P&L, accounts, reports, HR, settings, and deletion', true, 1),
('sales_manager', 'Sales Manager', 'সেলস ম্যানেজার', 'Customers, leads, price quotations, job order booking, advance collection, and delivery', true, 2),
('designer', 'Graphic Designer', 'গ্রাফিক ডিজাইনার (প্রিপ প্রেস)', 'Pre-press design queue, artwork uploads (AI/PDF), proof approval, and revision logs', true, 3),
('production_manager', 'Production Manager', 'প্রোডাকশন ম্যানেজার', 'Floor scheduling, machine allocation, materials issuance, finishing, and installation', true, 4),
('operator', 'Print Operator', 'মেশিন অপারেটর', 'Assigned jobs, printing execution, material consumption logging, and QC completion', true, 5),
('general_staff', 'General Staff', 'সাধারণ কর্মী', 'Restricted access based strictly on assigned duties and user overrides', true, 6)
on conflict (slug) do update set
    name = excluded.name,
    name_bn = excluded.name_bn,
    description = excluded.description;

-- Seed default permissions for templates
do $$
declare
    v_template_id uuid;
    res text;
    act text;
begin
    -- 1. Business owner gets all
    select id into v_template_id from public.platform_role_templates where slug = 'business_owner';
    if v_template_id is not null then
        for res in select unnest(array['customer', 'quotation', 'order', 'invoice', 'payment', 'production', 'inventory', 'purchase', 'supplier', 'delivery', 'hr', 'payroll', 'reports', 'settings']) loop
            for act in select unnest(array['view', 'create', 'edit', 'delete', 'approve', 'full_control']) loop
                insert into public.platform_role_template_permissions (role_template_id, resource, action, is_allowed)
                values (v_template_id, res, act, true)
                on conflict do nothing;
            end loop;
        end loop;
    end if;

    -- 2. Sales Manager
    select id into v_template_id from public.platform_role_templates where slug = 'sales_manager';
    if v_template_id is not null then
        for res in select unnest(array['customer', 'quotation', 'order', 'invoice', 'payment', 'delivery', 'reports']) loop
            for act in select unnest(array['view', 'create', 'edit', 'approve']) loop
                insert into public.platform_role_template_permissions (role_template_id, resource, action, is_allowed)
                values (v_template_id, res, act, true)
                on conflict do nothing;
            end loop;
        end loop;
    end if;
end $$;

-- 6. SEED INITIAL SYSTEM HEALTH TELEMETRY EVENTS
insert into public.platform_system_health_events (category, service_name, severity, message, error_details, resolved) values
('job', 'bg_order_cleanup', 'warning', 'Nightly temporary proof cache cleaner encountered 14 locked files in /tmp/render', '{"locked_files": 14, "disk_impact_mb": 420}'::jsonb, false),
('notification', 'greenweb_sms', 'error', 'Greenweb SMS Gateway balance threshold dropped below 500 SMS credits', '{"balance_credits": 210, "gateway": "greenweb_bd"}'::jsonb, false),
('notification', 'whatsapp_cloud_api', 'warning', 'Meta WhatsApp webhook delivery retry latency spiked to 4.2s for media attachments', '{"avg_latency_ms": 4200, "threshold_ms": 2000}'::jsonb, false),
('storage', 's3_storage_bucket', 'info', 'High-res artwork bucket (BD-Central) passed 68% total tier quota (680 GB / 1 TB)', '{"used_gb": 680, "total_gb": 1000}'::jsonb, false),
('api', 'bkash_checkout', 'error', 'bKash merchant token refresh timeout during midnight settlement reconciliation', '{"endpoint": "token/refresh", "http_status": 504}'::jsonb, false),
('integration', 'mushak_6_3_sync', 'warning', 'NBR e-VAT portal returned 429 Too Many Requests during end-of-month batch tax submission', '{"code": "NBR_RATE_LIMIT", "retry_after": 60}'::jsonb, false);

-- 7. DATABASE HELPER FUNCTIONS

-- Helper to check if a feature flag is enabled for a given tenant (checks tenant override first, falls back to platform default)
create or replace function public.platform_is_feature_enabled(p_key text, p_company_id uuid default null)
returns boolean as $$
declare
    v_flag_id uuid;
    v_global_enabled boolean;
    v_tenant_enabled boolean;
begin
    select id, is_enabled into v_flag_id, v_global_enabled
    from public.platform_feature_flags
    where key = p_key;

    if v_flag_id is null then
        return false;
    end if;

    if p_company_id is not null then
        select is_enabled into v_tenant_enabled
        from public.platform_tenant_feature_flags
        where flag_id = v_flag_id
          and company_id = p_company_id;

        if v_tenant_enabled is not null then
            return v_tenant_enabled;
        end if;
    end if;

    return v_global_enabled;
end;
$$ language plpgsql security definer;

-- Helper to log platform audit event
create or replace function public.log_platform_audit_event(
    p_action text,
    p_entity_type text,
    p_entity_id text default null,
    p_target_company_id uuid default null,
    p_details jsonb default '{}'::jsonb,
    p_ip_address text default null
)
returns uuid as $$
declare
    v_log_id uuid;
    v_admin_id uuid;
    v_email text;
begin
    select id, email into v_admin_id, v_email
    from public.platform_admins
    where user_id = auth.uid()
    limit 1;

    insert into public.platform_audit_logs (
        platform_admin_id,
        actor_email,
        action,
        entity_type,
        entity_id,
        target_company_id,
        details,
        ip_address
    ) values (
        v_admin_id,
        coalesce(v_email, 'system@printerp.com.bd'),
        p_action,
        p_entity_type,
        p_entity_id,
        p_target_company_id,
        p_details,
        p_ip_address
    ) returning id into v_log_id;

    return v_log_id;
end;
$$ language plpgsql security definer;

-- 8. STRICT RLS POLICIES FOR PLATFORM TABLES
-- These tables MUST NOT be queryable by standard tenant users. Only platform owners can query or mutate them.

create policy "Platform owners can view platform audit logs"
    on public.platform_audit_logs for select
    using (public.auth_is_platform_owner());

create policy "Platform owners can manage platform tenant feature flags"
    on public.platform_tenant_feature_flags for all
    using (public.auth_is_platform_owner());

create policy "Tenant users can view their own tenant feature flags"
    on public.platform_tenant_feature_flags for select
    using (public.auth_is_active_company_user(company_id));

create policy "Platform owners can manage platform role templates"
    on public.platform_role_templates for all
    using (public.auth_is_platform_owner());

create policy "Authenticated users can read platform role templates"
    on public.platform_role_templates for select
    using (auth.uid() is not null);

create policy "Platform owners can manage platform role template permissions"
    on public.platform_role_template_permissions for all
    using (public.auth_is_platform_owner());

create policy "Authenticated users can read platform role template permissions"
    on public.platform_role_template_permissions for select
    using (auth.uid() is not null);

create policy "Platform owners can view and manage system health events"
    on public.platform_system_health_events for all
    using (public.auth_is_platform_owner());
