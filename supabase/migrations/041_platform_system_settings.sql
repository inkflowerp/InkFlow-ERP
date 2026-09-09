-- ==============================================================================
-- Migration 041: Platform System Settings & Disaster Recovery Telemetry
-- ==============================================================================

-- 1. Create table for cluster-wide platform system settings
create table if not exists public.platform_system_settings (
    id text primary key default 'default',
    session_timeout_minutes integer not null default 120,
    mfa_required_for_admins boolean not null default false,
    rate_limit_requests_per_minute integer not null default 120,
    max_export_records integer not null default 10000,
    default_trial_days integer not null default 14,
    default_currency text not null default 'BDT',
    default_vat_rate_pct numeric(5,2) not null default 15.00,
    maintenance_mode_enabled boolean not null default false,
    maintenance_message text not null default 'InkFlow is currently undergoing scheduled platform upgrades.',
    incident_alert_webhook text,
    backup_retention_days integer not null default 90,
    auto_backup_enabled boolean not null default true,
    last_backup_at timestamp with time zone not null default now(),
    last_restore_test_at timestamp with time zone not null default now(),
    last_restore_status text not null default 'passed',
    updated_at timestamp with time zone not null default now(),
    updated_by uuid references public.platform_admins(id)
);

-- 2. Enable Row Level Security (RLS)
alter table public.platform_system_settings enable row level security;

-- 3. RLS Policies
drop policy if exists "Platform admins can read platform system settings" on public.platform_system_settings;
create policy "Platform admins can read platform system settings"
    on public.platform_system_settings for select
    using (public.auth_is_platform_admin());

drop policy if exists "Platform owners can modify platform system settings" on public.platform_system_settings;
create policy "Platform owners can modify platform system settings"
    on public.platform_system_settings for all
    using (public.auth_is_platform_owner());

-- 4. Seed default singleton record
insert into public.platform_system_settings (
    id,
    session_timeout_minutes,
    mfa_required_for_admins,
    rate_limit_requests_per_minute,
    max_export_records,
    default_trial_days,
    default_currency,
    default_vat_rate_pct,
    maintenance_mode_enabled,
    maintenance_message,
    backup_retention_days,
    auto_backup_enabled
) values (
    'default',
    120,
    false,
    120,
    10000,
    14,
    'BDT',
    15.00,
    false,
    'InkFlow is currently undergoing scheduled platform upgrades.',
    90,
    true
)
on conflict (id) do nothing;
