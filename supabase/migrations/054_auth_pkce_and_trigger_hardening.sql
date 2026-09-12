-- ==============================================================================
-- InkFlow SaaS - Migration 054: Auth PKCE & handle_new_user Trigger Hardening
-- Hardens auth.users trigger to prevent GoTrue 500 errors during OAuth sign-ins.
-- ==============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_name text;
    v_phone text;
    v_locale text;
    v_email text;
    v_avatar text;
begin
    -- 1. Extract and sanitize email
    v_email := coalesce(
        nullif(trim(lower(new.email)), ''),
        nullif(trim(lower(new.raw_user_meta_data->>'email')), ''),
        'user-' || new.id || '@inkflow.internal'
    );

    -- 2. Extract and sanitize full name
    v_name := coalesce(
        nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
        nullif(trim(new.raw_user_meta_data->>'name'), ''),
        nullif(trim(new.raw_user_meta_data->>'user_name'), ''),
        split_part(v_email, '@', 1),
        'User'
    );

    -- 3. Extract phone
    v_phone := coalesce(
        nullif(trim(new.raw_user_meta_data->>'phone'), ''),
        nullif(trim(new.phone), ''),
        null
    );

    -- 4. Extract preferred locale
    v_locale := coalesce(
        nullif(trim(new.raw_user_meta_data->>'preferred_locale'), ''),
        nullif(trim(new.raw_user_meta_data->>'locale'), ''),
        'bn'
    );

    -- 5. Extract avatar url
    v_avatar := coalesce(
        nullif(trim(new.raw_user_meta_data->>'avatar_url'), ''),
        nullif(trim(new.raw_user_meta_data->>'picture'), ''),
        null
    );

    -- 6. Upsert user_profiles record safely with exception handling
    begin
        insert into public.user_profiles (
            id,
            email,
            full_name,
            phone,
            avatar_url,
            preferred_locale,
            is_active,
            created_at,
            updated_at
        )
        values (
            new.id,
            v_email,
            v_name,
            v_phone,
            v_avatar,
            v_locale,
            true,
            now(),
            now()
        )
        on conflict (id) do update set
            email = excluded.email,
            full_name = coalesce(excluded.full_name, public.user_profiles.full_name),
            phone = coalesce(excluded.phone, public.user_profiles.phone),
            avatar_url = coalesce(excluded.avatar_url, public.user_profiles.avatar_url),
            preferred_locale = coalesce(excluded.preferred_locale, public.user_profiles.preferred_locale),
            updated_at = now();
    exception when others then
        -- Catch any unforeseen errors to prevent blocking auth.users insertion
        raise warning 'Error in handle_new_user user_profiles upsert: %', SQLERRM;
    end;

    -- 7. Upsert profiles record safely for backward compatibility
    begin
        insert into public.profiles (
            id,
            full_name,
            phone,
            avatar_url,
            preferred_locale,
            created_at,
            updated_at
        )
        values (
            new.id,
            v_name,
            v_phone,
            v_avatar,
            v_locale,
            now(),
            now()
        )
        on conflict (id) do update set
            full_name = coalesce(excluded.full_name, public.profiles.full_name),
            phone = coalesce(excluded.phone, public.profiles.phone),
            avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
            preferred_locale = coalesce(excluded.preferred_locale, public.profiles.preferred_locale),
            updated_at = now();
    exception when others then
        raise warning 'Error in handle_new_user profiles upsert: %', SQLERRM;
    end;

    return new;
end;
$$;

-- Ensure trigger is properly bound to auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
