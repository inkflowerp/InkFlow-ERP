-- ==============================================================================
-- InkFlow SaaS - Migration 037: Security Definer Hardening & Search Path Lockdown
-- Ensures all platform security definer functions:
--   1. Have explicit, safe search_path = public, pg_temp
--   2. Enforce strict caller validation
--   3. Fail-closed on missing records or unauthenticated callers
-- ==============================================================================

-- 1. Hardened auth_is_platform_owner
create or replace function public.auth_is_platform_owner()
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_user_id uuid;
begin
    v_user_id := auth.uid();
    if v_user_id is null then
        return false;
    end if;

    return exists (
        select 1
        from public.platform_admins
        where user_id = v_user_id
          and is_active = true
    );
end;
$$;

-- 2. Hardened auth_validate_support_session
create or replace function public.auth_validate_support_session(
    p_company_id uuid,
    p_token_hash text
)
returns table (
    is_valid boolean,
    access_level text,
    admin_id uuid,
    admin_email text,
    admin_name text,
    expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    if p_company_id is null or p_token_hash is null or trim(p_token_hash) = '' then
        return;
    end if;

    return query
    select 
        (pss.status = 'active' and pss.expires_at > now()) as is_valid,
        pss.access_level,
        pa.id as admin_id,
        pa.email as admin_email,
        pa.full_name as admin_name,
        pss.expires_at
    from public.platform_support_sessions pss
    join public.platform_admins pa on pa.id = pss.platform_admin_id
    where pss.company_id = p_company_id
      and pss.session_token_hash = p_token_hash
      and pa.is_active = true
    limit 1;
end;
$$;
