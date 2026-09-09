-- ==============================================================================
-- PrintERP / InkFlow SaaS - Migration 033: User Account Creation & Profiles Hardening
-- Ensures auth.users signup trigger automatically syncs into public.user_profiles
-- and public.profiles with metadata, and configures non-blocking RLS policies.
-- ==============================================================================

-- 1. Ensure public.user_profiles table exists with all standard columns
create table if not exists public.user_profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text not null,
    full_name text not null,
    full_name_bn text,
    phone text,
    avatar_url text,
    preferred_locale text not null default 'bn',
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_user_profiles_email on public.user_profiles(email);
create index if not exists idx_user_profiles_phone on public.user_profiles(phone);

-- Ensure public.profiles table exists as well for backwards compatibility
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

-- 2. Enhanced handle_new_user trigger function
create or replace function public.handle_new_user()
returns trigger as $$
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

    -- 1. Insert into public.user_profiles
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

    -- 2. Insert into public.profiles for backwards compatibility
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
$$ language plpgsql security definer;

-- 3. Re-bind trigger to auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- 4. Enable RLS and verify policies on user_profiles
alter table public.user_profiles enable row level security;

drop policy if exists "Users can view own user_profile" on public.user_profiles;
create policy "Users can view own user_profile" on public.user_profiles
    for select using (auth.uid() = id);

drop policy if exists "Users can update own user_profile" on public.user_profiles;
create policy "Users can update own user_profile" on public.user_profiles
    for update using (auth.uid() = id);

drop policy if exists "Users can insert own user_profile" on public.user_profiles;
create policy "Users can insert own user_profile" on public.user_profiles
    for insert with check (auth.uid() = id);

-- Allow company members to view profiles of teammates in the same company
drop policy if exists "Members can view teammate profiles" on public.user_profiles;
create policy "Members can view teammate profiles" on public.user_profiles
    for select using (
        exists (
            select 1 from public.company_users cu1
            join public.company_users cu2 on cu1.company_id = cu2.company_id
            where cu1.user_id = auth.uid()
              and cu2.user_id = public.user_profiles.id
              and cu1.status = 'active'
        )
    );
