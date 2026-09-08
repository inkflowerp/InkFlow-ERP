-- ==============================================================================
-- PrintERP SaaS - Multi-Tenant Initial Schema Migration (001)
-- Unicode-Safe UTF-8, Multi-Tenancy Architecture
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 1. COMPANIES (TENANTS)
create table if not exists public.companies (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique,
    name text not null,
    name_bn text,
    legal_name text,
    trade_license_no text,
    bin_no text,
    tin_no text,
    business_type text not null default 'printing_signage',
    phone text,
    email text,
    website text,
    division_id integer,
    district_id integer,
    upazila_id integer,
    address text,
    address_bn text,
    currency text not null default 'BDT',
    default_locale text not null default 'bn',
    logo_url text,
    is_active boolean not null default true,
    settings jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint slug_valid check (slug ~* '^[a-z0-9-]+$')
);

create index if not exists idx_companies_slug on public.companies(slug);
create index if not exists idx_companies_is_active on public.companies(is_active);

-- 2. USER PROFILES
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text not null,
    full_name_bn text,
    phone text,
    avatar_url text,
    preferred_locale text not null default 'bn',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_phone on public.profiles(phone);

-- 3. TENANT MEMBERSHIPS & ROLES
create table if not exists public.tenant_memberships (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null check (role in ('owner', 'admin', 'manager', 'operator', 'accountant', 'designer', 'installer')),
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint unique_company_user unique (company_id, user_id)
);

create index if not exists idx_tenant_memberships_company on public.tenant_memberships(company_id);
create index if not exists idx_tenant_memberships_user on public.tenant_memberships(user_id);
create index if not exists idx_tenant_memberships_role on public.tenant_memberships(role);

-- 4. AUDIT LOGS
create table if not exists public.audit_logs (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    user_id uuid references auth.users(id) on delete set null,
    action text not null,
    entity_type text not null,
    entity_id text,
    old_values jsonb,
    new_values jsonb,
    ip_address text,
    user_agent text,
    created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_company on public.audit_logs(company_id);
create index if not exists idx_audit_logs_created on public.audit_logs(created_at desc);

-- Automatic profile creation trigger when user signs up in Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, full_name, preferred_locale)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        coalesce(new.raw_user_meta_data->>'preferred_locale', 'bn')
    )
    on conflict (id) do nothing;
    return new;
end;
$$ language plpgsql security definer;

-- Trigger execution
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- Trigger for auto-updating timestamps
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists update_companies_modtime on public.companies;
create trigger update_companies_modtime
    before update on public.companies
    for each row execute function public.update_updated_at_column();

drop trigger if exists update_profiles_modtime on public.profiles;
create trigger update_profiles_modtime
    before update on public.profiles
    for each row execute function public.update_updated_at_column();

drop trigger if exists update_memberships_modtime on public.tenant_memberships;
create trigger update_memberships_modtime
    before update on public.tenant_memberships
    for each row execute function public.update_updated_at_column();

