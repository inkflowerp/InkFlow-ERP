-- ==============================================================================
-- PrintERP / InkFlow SaaS - Migration 055: Email OTP & Link Verification System
-- Provides authoritative storage for 6-digit OTPs and secure single-use URL tokens
-- for registration verification, password resets, and multi-factor security events.
-- ==============================================================================

create table if not exists public.auth_verifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade,
    email text not null,
    purpose text not null check (purpose in ('registration', 'password_reset', 'login_2fa')),
    otp_hash text,
    token_hash text,
    expires_at timestamptz not null,
    attempts integer not null default 0,
    max_attempts integer not null default 5,
    resend_available_at timestamptz not null default (now() + interval '60 seconds'),
    is_used boolean not null default false,
    verified_at timestamptz,
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Indexes for performant lookup and rate-limiting queries
create index if not exists idx_auth_verifications_email_purpose
    on public.auth_verifications(email, purpose);

create index if not exists idx_auth_verifications_token_hash
    on public.auth_verifications(token_hash)
    where token_hash is not null;

create index if not exists idx_auth_verifications_otp_hash
    on public.auth_verifications(otp_hash)
    where otp_hash is not null;

create index if not exists idx_auth_verifications_expires_at
    on public.auth_verifications(expires_at);

create index if not exists idx_auth_verifications_is_used
    on public.auth_verifications(is_used);

-- Enable Row Level Security (RLS)
alter table public.auth_verifications enable row level security;

-- Strict security policy: Only Service Role and Platform Admins can access auth_verifications
-- Client/anonymous users cannot query or tamper with verification records directly
create policy "Service role and platform admins manage auth verifications"
    on public.auth_verifications for all
    using (
        auth.role() = 'service_role'
        or public.auth_is_platform_admin()
    );
