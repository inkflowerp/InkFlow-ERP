-- ==============================================================================
-- InkFlow SaaS - Migration 034: Production Tenant Auth & Multi-Tenant Isolation Hardening
-- Enforces PostgreSQL-level isolation, search_path protection on security definer functions,
-- active membership verification, and row-level security across all operational tables.
-- ==============================================================================

-- 1. HARDEN SECURITY DEFINER HELPER FUNCTIONS WITH EXPLICIT SEARCH_PATH

-- Check if authenticated user is an ACTIVE member of the company
create or replace function public.auth_is_active_company_user(target_company_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    if auth.uid() is null or target_company_id is null then
        return false;
    end if;

    return exists (
        select 1
        from public.company_users cu
        join public.companies c on c.id = cu.company_id
        where cu.company_id = target_company_id
          and cu.user_id = auth.uid()
          and cu.status = 'active'
          and c.is_active = true
    );
end;
$$;

-- Resolves the primary role slug of the user in the company
create or replace function public.auth_get_user_company_role(target_company_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    role_slug text;
begin
    if auth.uid() is null or target_company_id is null then
        return null;
    end if;

    select r.slug into role_slug
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    join public.company_users cu on cu.id = ur.company_user_id
    join public.companies c on c.id = cu.company_id
    where cu.company_id = target_company_id
      and cu.user_id = auth.uid()
      and cu.status = 'active'
      and c.is_active = true
    limit 1;
    
    return role_slug;
end;
$$;

-- Checks if the authenticated user has a specific permission in the company
create or replace function public.auth_user_has_permission(target_company_id uuid, required_permission text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    user_role text;
begin
    if auth.uid() is null or target_company_id is null or required_permission is null then
        return false;
    end if;

    user_role := public.auth_get_user_company_role(target_company_id);

    -- Owners & Business Owners have full organizational permissions
    if user_role in ('owner', 'business_owner', 'admin') then
        return true;
    end if;

    -- Check if user has explicit negative override
    if exists (
        select 1
        from public.user_permission_overrides upo
        join public.company_users cu on cu.id = upo.company_user_id
        join public.permissions p on p.id = upo.permission_id
        where cu.company_id = target_company_id
          and cu.user_id = auth.uid()
          and cu.status = 'active'
          and p.code = required_permission
          and upo.is_granted = false
    ) then
        return false;
    end if;

    -- Check if user has explicit positive override
    if exists (
        select 1
        from public.user_permission_overrides upo
        join public.company_users cu on cu.id = upo.company_user_id
        join public.permissions p on p.id = upo.permission_id
        where cu.company_id = target_company_id
          and cu.user_id = auth.uid()
          and cu.status = 'active'
          and p.code = required_permission
          and upo.is_granted = true
    ) then
        return true;
    end if;

    -- Check role-based permission
    return exists (
        select 1
        from public.user_roles ur
        join public.company_users cu on cu.id = ur.company_user_id
        join public.role_permissions rp on rp.role_id = ur.role_id
        join public.permissions p on p.id = rp.permission_id
        where cu.company_id = target_company_id
          and cu.user_id = auth.uid()
          and cu.status = 'active'
          and (p.code = required_permission or p.code = split_part(required_permission, '.', 1) || '.full_control')
    );
end;
$$;

-- Legacy alias helper for backwards-compatibility
create or replace function public.auth_user_has_company_access(target_company_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    return public.auth_is_active_company_user(target_company_id);
end;
$$;

-- Harden handle_new_user trigger function
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    user_name text;
    user_phone text;
    user_locale text;
begin
    user_name := coalesce(
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'name',
        split_part(new.email, '@', 1)
    );
    user_phone := coalesce(
        new.raw_user_meta_data->>'phone',
        new.phone,
        null
    );
    user_locale := coalesce(
        new.raw_user_meta_data->>'preferred_locale',
        new.raw_user_meta_data->>'locale',
        'bn'
    );

    -- 1. Upsert into public.user_profiles
    insert into public.user_profiles (
        id,
        email,
        full_name,
        phone,
        preferred_locale,
        is_active,
        created_at,
        updated_at
    )
    values (
        new.id,
        new.email,
        user_name,
        user_phone,
        user_locale,
        true,
        now(),
        now()
    )
    on conflict (id) do update set
        email = excluded.email,
        full_name = coalesce(excluded.full_name, public.user_profiles.full_name),
        phone = coalesce(excluded.phone, public.user_profiles.phone),
        preferred_locale = coalesce(excluded.preferred_locale, public.user_profiles.preferred_locale),
        updated_at = now();

    -- 2. Upsert into public.profiles for legacy compatibility
    insert into public.profiles (
        id,
        full_name,
        phone,
        preferred_locale,
        created_at,
        updated_at
    )
    values (
        new.id,
        user_name,
        user_phone,
        user_locale,
        now(),
        now()
    )
    on conflict (id) do update set
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        phone = coalesce(excluded.phone, public.profiles.phone),
        preferred_locale = coalesce(excluded.preferred_locale, public.profiles.preferred_locale),
        updated_at = now();

    return new;
end;
$$;

-- 2. RE-APPLY STRICT RLS POLICIES ACROSS ALL CORE TENANT ENTITIES

-- Companies
alter table public.companies enable row level security;
drop policy if exists "Members can view company details" on public.companies;
create policy "Members can view company details" on public.companies
    for select using (public.auth_is_active_company_user(id));

drop policy if exists "Owners and Admins can update company" on public.companies;
create policy "Owners and Admins can update company" on public.companies
    for update using (public.auth_get_user_company_role(id) in ('owner', 'business_owner', 'admin'));

drop policy if exists "Authenticated users can create companies" on public.companies;
create policy "Authenticated users can create companies" on public.companies
    for insert with check (auth.uid() is not null);

-- Company Settings
alter table public.company_settings enable row level security;
drop policy if exists "Active members can view company settings" on public.company_settings;
create policy "Active members can view company settings" on public.company_settings
    for select using (public.auth_is_active_company_user(company_id));

drop policy if exists "Admins can update company settings" on public.company_settings;
create policy "Admins can update company settings" on public.company_settings
    for update using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_get_user_company_role(company_id) in ('owner', 'business_owner', 'admin')
            or public.auth_user_has_permission(company_id, 'settings.edit')
        )
    );

-- Branches
alter table public.branches enable row level security;
drop policy if exists "Active members can view branches" on public.branches;
create policy "Active members can view branches" on public.branches
    for select using (public.auth_is_active_company_user(company_id));

drop policy if exists "Admins can manage branches" on public.branches;
create policy "Admins can manage branches" on public.branches
    for all using (
        public.auth_is_active_company_user(company_id)
        and public.auth_get_user_company_role(company_id) in ('owner', 'business_owner', 'admin')
    );

-- Company Users & Memberships
alter table public.company_users enable row level security;
drop policy if exists "Members can view company users" on public.company_users;
create policy "Members can view company users" on public.company_users
    for select using (public.auth_is_active_company_user(company_id) or auth.uid() = user_id);

drop policy if exists "Admins can manage company users" on public.company_users;
create policy "Admins can manage company users" on public.company_users
    for all using (
        public.auth_is_active_company_user(company_id)
        and public.auth_get_user_company_role(company_id) in ('owner', 'business_owner', 'admin')
    );

-- 3. ENSURE ESSENTIAL ISOLATION INDEXES
create index if not exists idx_company_users_comp_user on public.company_users(company_id, user_id);
create index if not exists idx_company_users_status on public.company_users(status);
create index if not exists idx_user_roles_comp_user on public.user_roles(company_user_id);
