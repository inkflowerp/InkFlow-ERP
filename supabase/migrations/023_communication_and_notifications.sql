-- ==============================================================================
-- PrintERP SaaS - Migration 023: In-App Notifications & Communication Architecture
-- Supports:
--   1. Real-time In-App Notification Feed (Orders, Payments, Approvals, Low Stock)
--   2. WhatsApp Business API Configuration
--   3. Multi-Provider SMS Abstraction (BulkSMSBD, SSL Wireless, Alpha, MIM)
--   4. SMTP Email Configuration (Credentials Masked)
--   5. Bilingual Message Templates (English & বাংলা) with Variable Interpolation
--   6. Immutable Communication Audit Logs with RLS
-- ==============================================================================

-- 1. IN-APP NOTIFICATIONS TABLE
create table if not exists public.in_app_notifications (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    user_id uuid references auth.users(id) on delete set null,
    type text not null check (
        type in (
            'new_order', 'payment_received', 'design_revision',
            'artwork_approved', 'production_completed', 'delivery_scheduled',
            'overdue_invoice', 'low_stock', 'leave_approval'
        )
    ),
    title text not null,
    title_bn text,
    message text not null,
    message_bn text,
    action_url text,
    is_read boolean not null default false,
    created_at timestamptz not null default now()
);

create index if not exists idx_notifications_company on public.in_app_notifications(company_id);
create index if not exists idx_notifications_unread on public.in_app_notifications(company_id, is_read);
alter table public.in_app_notifications enable row level security;

-- 2. COMMUNICATION CHANNELS CONFIG TABLE
create table if not exists public.communication_channels_config (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    channel_type text not null check (channel_type in ('whatsapp', 'sms', 'email')),
    provider_name text not null, -- e.g. 'bulksmsbd', 'ssl_wireless', 'alpha', 'mim', 'meta_whatsapp', 'custom_smtp'
    is_enabled boolean not null default false,
    api_key_or_password text, -- Encrypted / masked credentials
    sender_id_or_phone text,  -- Masking sender ID or WhatsApp Phone Number ID
    account_or_user_id text,
    extra_settings jsonb default '{}'::jsonb,
    updated_at timestamptz not null default now(),
    constraint uk_company_channel unique (company_id, channel_type)
);

create index if not exists idx_channel_config_company on public.communication_channels_config(company_id);
alter table public.communication_channels_config enable row level security;

-- 3. MESSAGE TEMPLATES TABLE (Bilingual: English & বাংলা)
create table if not exists public.message_templates (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    template_key text not null, -- e.g. 'quotation_sent', 'order_confirmed', 'payment_received', 'delivery_dispatched', 'overdue_reminder'
    name text not null,
    channel text not null check (channel in ('all', 'whatsapp', 'sms', 'email')),
    body_en text not null,
    body_bn text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_company_template_key unique (company_id, template_key)
);

create index if not exists idx_message_templates_company on public.message_templates(company_id);
alter table public.message_templates enable row level security;

-- 4. COMMUNICATION LOGS TABLE (Non-destructive audit trail)
create table if not exists public.communication_logs (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    channel text not null check (channel in ('in_app', 'whatsapp', 'sms', 'email')),
    recipient_name text not null,
    recipient_destination text not null, -- Mobile number or email address
    provider_used text not null,
    message_content text not null,
    status text not null default 'sent' check (status in ('sent', 'delivered', 'failed', 'queued')),
    error_message text,
    created_at timestamptz not null default now()
);

create index if not exists idx_comm_logs_company on public.communication_logs(company_id);
create index if not exists idx_comm_logs_created on public.communication_logs(company_id, created_at);
alter table public.communication_logs enable row level security;

-- 5. RLS POLICIES
create policy "Active company users can view in-app notifications"
    on public.in_app_notifications for select
    using (public.auth_is_active_company_user(company_id));

create policy "Active company users can update their notifications"
    on public.in_app_notifications for update
    using (public.auth_is_active_company_user(company_id));

create policy "Active company users can view channel configs"
    on public.communication_channels_config for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company admins can manage channel configs"
    on public.communication_channels_config for all
    using (
        public.auth_is_active_company_user(company_id)
        and public.auth_user_has_permission(company_id, 'settings.edit')
    );

create policy "Active company users can view templates"
    on public.message_templates for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can manage templates"
    on public.message_templates for all
    using (
        public.auth_is_active_company_user(company_id)
        and public.auth_user_has_permission(company_id, 'settings.edit')
    );

create policy "Active company users can view communication logs"
    on public.communication_logs for select
    using (public.auth_is_active_company_user(company_id));

create policy "System and authorized users can append communication logs"
    on public.communication_logs for insert
    with check (public.auth_is_active_company_user(company_id));
