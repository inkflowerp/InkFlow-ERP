-- ==============================================================================
-- PrintERP / InkFlow SaaS - Migration 056: Auth Verifications Hardening & Atomic Functions
-- Enhances public.auth_verifications with explicit purpose support ('password_reset_auth'),
-- atomic OTP and token verification stored procedures, and strict index optimization.
-- ==============================================================================

-- 1. Update purpose check constraint to support password_reset_auth and login_2fa
alter table public.auth_verifications
    drop constraint if exists auth_verifications_purpose_check;

alter table public.auth_verifications
    add constraint auth_verifications_purpose_check
    check (purpose in ('registration', 'password_reset', 'password_reset_auth', 'login_2fa'));

-- 2. Performance indexes
create index if not exists idx_auth_verifications_active_lookup
    on public.auth_verifications(email, purpose, is_used, expires_at);

create index if not exists idx_auth_verifications_token_lookup
    on public.auth_verifications(token_hash, is_used, expires_at)
    where token_hash is not null;

-- 3. Atomic OTP Verification Function
-- Guarantees atomic row-locking, attempt decrementing, and single-use invalidation
create or replace function public.verify_auth_otp_atomic(
    p_email text,
    p_otp_hash text,
    p_purpose text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_record public.auth_verifications%rowtype;
    v_now timestamptz := now();
    v_attempts_left int;
begin
    -- Lock latest active verification record for this email and purpose
    select * into v_record
    from public.auth_verifications
    where lower(email) = lower(p_email)
      and purpose = p_purpose
      and is_used = false
    order by created_at desc
    limit 1
    for update;

    if not found then
        return jsonb_build_object(
            'success', false,
            'code', 'NOT_FOUND',
            'error', 'No active verification code found. Please request a new code.'
        );
    end if;

    -- Check expiration
    if v_now > v_record.expires_at then
        return jsonb_build_object(
            'success', false,
            'code', 'EXPIRED',
            'error', 'Verification code has expired. Please request a new code.'
        );
    end if;

    -- Check attempt lockout
    if v_record.attempts >= v_record.max_attempts then
        return jsonb_build_object(
            'success', false,
            'code', 'LOCKED_OUT',
            'error', 'Too many incorrect attempts. Please request a new verification code.'
        );
    end if;

    -- Compare OTP hash
    if v_record.otp_hash is distinct from p_otp_hash then
        -- Increment attempt count
        update public.auth_verifications
        set attempts = attempts + 1,
            updated_at = v_now
        where id = v_record.id;

        v_attempts_left := v_record.max_attempts - (v_record.attempts + 1);

        if v_attempts_left <= 0 then
            return jsonb_build_object(
                'success', false,
                'code', 'LOCKED_OUT',
                'attempts_left', 0,
                'error', 'Too many incorrect attempts. Please request a new verification code.'
            );
        else
            return jsonb_build_object(
                'success', false,
                'code', 'MISMATCH',
                'attempts_left', v_attempts_left,
                'error', format('Incorrect verification code. %s attempt(s) remaining.', v_attempts_left)
            );
        end if;
    end if;

    -- OTP Match: Mark consumed atomically
    update public.auth_verifications
    set is_used = true,
        verified_at = v_now,
        updated_at = v_now
    where id = v_record.id;

    return jsonb_build_object(
        'success', true,
        'code', 'SUCCESS',
        'id', v_record.id,
        'user_id', v_record.user_id,
        'email', v_record.email,
        'purpose', v_record.purpose
    );
end;
$$;

-- 4. Atomic Token Verification Function
create or replace function public.verify_auth_token_atomic(
    p_token_hash text,
    p_purpose text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_record public.auth_verifications%rowtype;
    v_now timestamptz := now();
begin
    select * into v_record
    from public.auth_verifications
    where token_hash = p_token_hash
      and is_used = false
      and (p_purpose is null or purpose = p_purpose)
    order by created_at desc
    limit 1
    for update;

    if not found then
        return jsonb_build_object(
            'success', false,
            'code', 'NOT_FOUND',
            'error', 'This verification link is invalid or has already been used.'
        );
    end if;

    if v_now > v_record.expires_at then
        return jsonb_build_object(
            'success', false,
            'code', 'EXPIRED',
            'error', 'This verification link has expired. Please request a new one.'
        );
    end if;

    -- Mark consumed atomically
    update public.auth_verifications
    set is_used = true,
        verified_at = v_now,
        updated_at = v_now
    where id = v_record.id;

    return jsonb_build_object(
        'success', true,
        'code', 'SUCCESS',
        'id', v_record.id,
        'user_id', v_record.user_id,
        'email', v_record.email,
        'purpose', v_record.purpose
    );
end;
$$;

-- 5. Function Execution Privileges
revoke all on function public.verify_auth_otp_atomic(text, text, text) from public;
grant execute on function public.verify_auth_otp_atomic(text, text, text) to service_role;

revoke all on function public.verify_auth_token_atomic(text, text) from public;
grant execute on function public.verify_auth_token_atomic(text, text) to service_role;
