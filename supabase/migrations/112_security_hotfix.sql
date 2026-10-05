-- ==============================================================================
-- PrintFlow - Migration 112: Database Security Hardening & Authorization Hotfix
-- Closes direct RPC execution holes, revokes public/anon access on sensitive RPCs,
-- hardens in-body tenant and RBAC permission checks, drops vulnerable overloads,
-- moves btree_gist to extensions schema, and fixes role_permissions RLS policies.
-- ==============================================================================

-- ==============================================================================
-- 1. Default Privilege Guard
-- ==============================================================================
-- Ensures any future function created in schema public is NOT executable by PUBLIC,
-- anon, or authenticated by default. Explicit GRANT is required.
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- ==============================================================================
-- 2. Move btree_gist Extension to extensions Schema
-- ==============================================================================
alter extension btree_gist set schema extensions;

-- ==============================================================================
-- 3. Drop Vulnerable & Superseded Legacy Function Overloads
-- ==============================================================================
-- 4-arg cancel_invoice_atomic lacks actor_user_id and in-body caller checks
drop function if exists public.cancel_invoice_atomic(uuid, uuid, text, text);

-- 14-arg record_multi_invoice_payment_atomic lacks idempotency_key and actor_user_id
drop function if exists public.record_multi_invoice_payment_atomic(uuid, uuid, text, numeric, text, date, text, text, date, text, text, text, jsonb, uuid);

-- 8-arg record_payment_atomic is superseded by record_multi_invoice_payment_atomic
drop function if exists public.record_payment_atomic(uuid, uuid, text, numeric, text, uuid, text, text);

-- ==============================================================================
-- 4. Trigger & Internal-Only Functions (Revoke from PUBLIC, anon, authenticated)
-- ==============================================================================
-- Triggers continue to fire with function owner/table owner privileges.
-- Revoking execute prevents direct execution via PostgREST /rest/v1/rpc/...

revoke execute on function public.handle_new_user() from public, anon, authenticated;
alter function public.handle_new_user() set search_path = public, pg_temp;

revoke execute on function public.handle_new_company_provisioning() from public, anon, authenticated;
alter function public.handle_new_company_provisioning() set search_path = public, pg_temp;

revoke execute on function public.enforce_subscription_audit_integrity() from public, anon, authenticated;
alter function public.enforce_subscription_audit_integrity() set search_path = public, pg_temp;

revoke execute on function public.prevent_last_platform_owner_removal() from public, anon, authenticated;
alter function public.prevent_last_platform_owner_removal() set search_path = public, pg_temp;

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
alter function public.rls_auto_enable() set search_path = pg_catalog, pg_temp;

revoke execute on function public.trg_prevent_audit_log_mutation() from public, anon, authenticated;
alter function public.trg_prevent_audit_log_mutation() set search_path = public, pg_temp;

revoke execute on function public.trg_prevent_financial_deletion() from public, anon, authenticated;
alter function public.trg_prevent_financial_deletion() set search_path = public, pg_temp;

revoke execute on function public.trg_enforce_tenant_immutability() from public, anon, authenticated;
alter function public.trg_enforce_tenant_immutability() set search_path = public, pg_temp;

revoke execute on function public.update_tenant_domains_modtime() from public, anon, authenticated;
alter function public.update_tenant_domains_modtime() set search_path = public, pg_temp;

revoke execute on function public.update_updated_at_column() from public, anon, authenticated;
alter function public.update_updated_at_column() set search_path = public, pg_temp;

-- ==============================================================================
-- 5. Service-Role Only Functions (Administrative, Internal & Limit Counters)
-- ==============================================================================
-- Revoke from PUBLIC, anon, authenticated; GRANT to service_role only.

-- 5.1 Admin Purge & Deletion Functions
revoke execute on function public.admin_purge_all_company_operational_data(uuid) from public, anon, authenticated;
grant execute on function public.admin_purge_all_company_operational_data(uuid) to service_role;
alter function public.admin_purge_all_company_operational_data(uuid) set search_path = public, pg_temp;

revoke execute on function public.admin_purge_all_company_invoices(uuid) from public, anon, authenticated;
grant execute on function public.admin_purge_all_company_invoices(uuid) to service_role;
alter function public.admin_purge_all_company_invoices(uuid) set search_path = public, pg_temp;

revoke execute on function public.admin_purge_all_company_catalog_and_orders(uuid) from public, anon, authenticated;
grant execute on function public.admin_purge_all_company_catalog_and_orders(uuid) to service_role;
alter function public.admin_purge_all_company_catalog_and_orders(uuid) set search_path = public, pg_temp;

revoke execute on function public.delete_tenant_permanently(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.delete_tenant_permanently(uuid, uuid, text) to service_role;
alter function public.delete_tenant_permanently(uuid, uuid, text) set search_path = public, pg_temp;

-- 5.2 Subscription State & SaaS Settlement
revoke execute on function public.transition_subscription_state_atomic(uuid, text, text, uuid) from public, anon, authenticated;
grant execute on function public.transition_subscription_state_atomic(uuid, text, text, uuid) to service_role;
alter function public.transition_subscription_state_atomic(uuid, text, text, uuid) set search_path = public, pg_temp;

revoke execute on function public.generate_saas_subscription_invoice_atomic(uuid, uuid, text, numeric, numeric, numeric, text) from public, anon, authenticated;
grant execute on function public.generate_saas_subscription_invoice_atomic(uuid, uuid, text, numeric, numeric, numeric, text) to service_role;
alter function public.generate_saas_subscription_invoice_atomic(uuid, uuid, text, numeric, numeric, numeric, text) set search_path = public, pg_temp;

revoke execute on function public.record_saas_payment_and_settle_atomic(text, text, text, numeric, uuid) from public, anon, authenticated;
grant execute on function public.record_saas_payment_and_settle_atomic(text, text, text, numeric, uuid) to service_role;
alter function public.record_saas_payment_and_settle_atomic(text, text, text, numeric, uuid) set search_path = public, pg_temp;

-- 5.3 Inventory Stock & Ledger Mutations
revoke execute on function public.mutate_inventory_stock_atomic(uuid, uuid, uuid, numeric, text, text, text, uuid, numeric, text, text, uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.mutate_inventory_stock_atomic(uuid, uuid, uuid, numeric, text, text, text, uuid, numeric, text, text, uuid, uuid, uuid) to service_role;
alter function public.mutate_inventory_stock_atomic(uuid, uuid, uuid, numeric, text, text, text, uuid, numeric, text, text, uuid, uuid, uuid) set search_path = public, pg_temp;

revoke execute on function public.record_inventory_stock_transaction(uuid, uuid, text, numeric, numeric, text, text, text) from public, anon, authenticated;
grant execute on function public.record_inventory_stock_transaction(uuid, uuid, text, numeric, numeric, text, text, text) to service_role;
alter function public.record_inventory_stock_transaction(uuid, uuid, text, numeric, numeric, text, text, text) set search_path = public, pg_temp;

-- 5.4 Account & Customer Atomic Balance Increments
revoke execute on function public.increment_account_balance_atomic(uuid, uuid, numeric) from public, anon, authenticated;
grant execute on function public.increment_account_balance_atomic(uuid, uuid, numeric) to service_role;
alter function public.increment_account_balance_atomic(uuid, uuid, numeric) set search_path = public, pg_temp;

revoke execute on function public.increment_customer_balance_atomic(uuid, uuid, numeric, numeric, numeric, date, numeric) from public, anon, authenticated;
grant execute on function public.increment_customer_balance_atomic(uuid, uuid, numeric, numeric, numeric, date, numeric) to service_role;
alter function public.increment_customer_balance_atomic(uuid, uuid, numeric, numeric, numeric, date, numeric) set search_path = public, pg_temp;

-- 5.5 Tenant Limit Enforcements & Quotas
revoke execute on function public.enforce_tenant_branch_addition_atomic(uuid) from public, anon, authenticated;
grant execute on function public.enforce_tenant_branch_addition_atomic(uuid) to service_role;
alter function public.enforce_tenant_branch_addition_atomic(uuid) set search_path = public, pg_temp;

revoke execute on function public.enforce_tenant_order_creation_atomic(uuid) from public, anon, authenticated;
grant execute on function public.enforce_tenant_order_creation_atomic(uuid) to service_role;
alter function public.enforce_tenant_order_creation_atomic(uuid) set search_path = public, pg_temp;

revoke execute on function public.enforce_tenant_storage_upload_atomic(uuid, bigint) from public, anon, authenticated;
grant execute on function public.enforce_tenant_storage_upload_atomic(uuid, bigint) to service_role;
alter function public.enforce_tenant_storage_upload_atomic(uuid, bigint) set search_path = public, pg_temp;

revoke execute on function public.enforce_tenant_user_addition_atomic(uuid) from public, anon, authenticated;
grant execute on function public.enforce_tenant_user_addition_atomic(uuid) to service_role;
alter function public.enforce_tenant_user_addition_atomic(uuid) set search_path = public, pg_temp;

revoke execute on function public.validate_tenant_limit_atomic(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.validate_tenant_limit_atomic(uuid, text, integer) to service_role;
alter function public.validate_tenant_limit_atomic(uuid, text, integer) set search_path = public, pg_temp;

-- 5.6 Sequence Generators & Platform Internal Queries
do $$
begin
    if exists (
        select 1 from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'get_next_document_number' and p.pronargs = 2
    ) then
        execute 'revoke execute on function public.get_next_document_number(uuid, text) from public, anon, authenticated';
        execute 'grant execute on function public.get_next_document_number(uuid, text) to service_role';
        execute 'alter function public.get_next_document_number(uuid, text) set search_path = public, pg_temp';
    end if;
    if exists (
        select 1 from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'get_next_document_number' and p.pronargs = 3
    ) then
        execute 'revoke execute on function public.get_next_document_number(uuid, text, text) from public, anon, authenticated';
        execute 'grant execute on function public.get_next_document_number(uuid, text, text) to service_role';
        execute 'alter function public.get_next_document_number(uuid, text, text) set search_path = public, pg_temp';
    end if;
end $$;

revoke execute on function public.get_next_tenant_document_number(uuid, text, text) from public, anon, authenticated;
grant execute on function public.get_next_tenant_document_number(uuid, text, text) to service_role;
alter function public.get_next_tenant_document_number(uuid, text, text) set search_path = public, pg_temp;

revoke execute on function public.get_next_support_ticket_number() from public, anon, authenticated;
grant execute on function public.get_next_support_ticket_number() to service_role;
alter function public.get_next_support_ticket_number() set search_path = public, pg_temp;

revoke execute on function public.auth_validate_support_session(uuid, text) from public, anon, authenticated;
grant execute on function public.auth_validate_support_session(uuid, text) to service_role;
alter function public.auth_validate_support_session(uuid, text) set search_path = public, pg_temp;

revoke execute on function public.get_platform_tenant_users_overview(text, uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.get_platform_tenant_users_overview(text, uuid, text, integer, integer) to service_role;
alter function public.get_platform_tenant_users_overview(text, uuid, text, integer, integer) set search_path = public, pg_temp;

revoke execute on function public.log_platform_audit_event(text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.log_platform_audit_event(text, text, text, jsonb) to service_role;
alter function public.log_platform_audit_event(text, text, text, jsonb) set search_path = public, pg_temp;

revoke execute on function public.log_platform_audit_event(text, text, text, uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.log_platform_audit_event(text, text, text, uuid, jsonb, text) to service_role;
alter function public.log_platform_audit_event(text, text, text, uuid, jsonb, text) set search_path = public, pg_temp;

revoke execute on function public.resolve_tenant_by_hostname(text) from public, anon, authenticated;
grant execute on function public.resolve_tenant_by_hostname(text) to service_role;
alter function public.resolve_tenant_by_hostname(text) set search_path = public, pg_temp;

revoke execute on function public.verify_auth_otp_atomic(text, text, text) from public, anon, authenticated;
grant execute on function public.verify_auth_otp_atomic(text, text, text) to service_role;
alter function public.verify_auth_otp_atomic(text, text, text) set search_path = public, pg_temp;

revoke execute on function public.verify_auth_token_atomic(text, text) from public, anon, authenticated;
grant execute on function public.verify_auth_token_atomic(text, text) to service_role;
alter function public.verify_auth_token_atomic(text, text) set search_path = public, pg_temp;

-- ==============================================================================
-- 6. User-Callable RPCs with Strict In-Body Authorization
-- ==============================================================================

-- 6.1 Create Invoice Atomic (43 args)
create or replace function public.create_invoice_atomic(
    p_company_id uuid,
    p_branch_id uuid default null::uuid,
    p_customer_id uuid default null::uuid,
    p_customer_name text default 'Walk-in Customer'::text,
    p_customer_phone text default ''::text,
    p_customer_email text default null::text,
    p_customer_address text default null::text,
    p_customer_bin text default null::text,
    p_customer_tin text default null::text,
    p_customer_company text default null::text,
    p_customer_type text default 'retail'::text,
    p_invoice_type text default 'sales_invoice'::text,
    p_invoice_date date default current_date,
    p_due_date date default null::date,
    p_quotation_id uuid default null::uuid,
    p_sales_order_id uuid default null::uuid,
    p_job_order_id uuid default null::uuid,
    p_order_number text default null::text,
    p_reference_no text default null::text,
    p_subtotal numeric default 0,
    p_discount_amount numeric default 0,
    p_vat_percentage numeric default 0,
    p_vat_amount numeric default 0,
    p_grand_total numeric default 0,
    p_paid_amount numeric default 0,
    p_due_amount numeric default 0,
    p_advance_percentage numeric default 0,
    p_advance_amount numeric default 0,
    p_due_on_delivery numeric default null::numeric,
    p_payment_method text default 'cash'::text,
    p_payment_method_note text default null::text,
    p_mushak_version text default null::text,
    p_language_mode text default 'bn'::text,
    p_delivery_date date default null::date,
    p_delivery_location text default null::text,
    p_delivery_method text default 'customer_pickup'::text,
    p_installation_required boolean default false,
    p_notes text default null::text,
    p_terms_and_conditions text default null::text,
    p_created_by_name text default 'Commercial Executive'::text,
    p_idempotency_key text default null::text,
    p_actor_user_id uuid default null::uuid,
    p_items jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_variable
declare
    v_auth_uid uuid;
    v_effective_actor_id uuid;
    v_actor_display_name text;
    v_existing_invoice record;
    v_invoice_num text;
    v_invoice_id uuid;
    v_item jsonb;
    v_status text;
    v_due_date date;
    v_payment_id uuid;
    v_receipt_num text;
begin
    if p_company_id is null then
        raise exception 'Company ID is required for invoice creation';
    end if;

    -- Strict Session & Permission Check
    if auth.role() = 'authenticated' or auth.uid() is not null then
        v_auth_uid := auth.uid();
        if v_auth_uid is null then
            raise exception 'Unauthorized: Authenticated session required for financial operations';
        end if;

        if not public.auth_user_has_company_access(p_company_id) then
            raise exception 'Unauthorized: User does not belong to target company context';
        end if;

        if not (
            public.auth_user_has_permission(p_company_id, 'invoice.create')
            or public.auth_user_has_permission(p_company_id, 'invoice.full_control')
        ) then
            raise exception 'Permission denied: invoice.create required for company %', p_company_id;
        end if;

        v_effective_actor_id := v_auth_uid;
    elsif auth.role() = 'anon' then
        raise exception 'Unauthorized: Anonymous callers are not permitted to invoke financial functions.';
    else
        v_effective_actor_id := coalesce(auth.uid(), p_actor_user_id);
    end if;

    -- Resolve trustworthy display name for actor
    select coalesce(full_name, p_created_by_name, 'Commercial Executive')
    into v_actor_display_name
    from public.profiles
    where id = v_effective_actor_id;

    if v_actor_display_name is null then
        v_actor_display_name := coalesce(p_created_by_name, 'Commercial Executive');
    end if;

    -- 1. Idempotency Check
    if p_idempotency_key is not null and p_idempotency_key <> '' then
        select id, invoice_number, grand_total, paid_amount, due_amount, status
        into v_existing_invoice
        from public.invoices
        where company_id = p_company_id and idempotency_key = p_idempotency_key
        limit 1;

        if v_existing_invoice.id is not null then
            return jsonb_build_object(
                'success', true,
                'is_idempotent_replay', true,
                'invoice_id', v_existing_invoice.id,
                'invoice_number', v_existing_invoice.invoice_number,
                'grand_total', v_existing_invoice.grand_total,
                'paid_amount', v_existing_invoice.paid_amount,
                'due_amount', v_existing_invoice.due_amount,
                'status', v_existing_invoice.status
            );
        end if;
    end if;

    -- 2. Determine Initial Invoice Status
    if p_paid_amount >= p_grand_total and p_grand_total > 0 then
        v_status := 'paid';
    elsif p_paid_amount > 0 then
        v_status := 'partially_paid';
    else
        v_status := 'unpaid';
    end if;

    v_due_date := coalesce(p_due_date, coalesce(p_invoice_date, current_date) + interval '30 days');

    -- 3. Atomic Sequential Number Generation
    v_invoice_num := public.get_next_document_number(p_company_id, 'invoice');

    -- 4. Insert Master Invoice Row matching live table schema
    insert into public.invoices (
        company_id,
        branch_id,
        invoice_number,
        invoice_type,
        customer_id,
        customer_name,
        customer_phone,
        customer_bin,
        customer_tin,
        customer_address,
        sales_order_id,
        order_number,
        invoice_date,
        due_date,
        status,
        subtotal,
        discount_amount,
        vat_percentage,
        vat_amount,
        grand_total,
        paid_amount,
        due_amount,
        write_off_amount,
        notes,
        terms_and_conditions,
        created_by_name,
        idempotency_key,
        customer_email,
        quotation_id,
        job_order_id,
        created_at,
        updated_at
    ) values (
        p_company_id,
        p_branch_id,
        v_invoice_num,
        p_invoice_type,
        p_customer_id,
        p_customer_name,
        p_customer_phone,
        p_customer_bin,
        p_customer_tin,
        p_customer_address,
        p_sales_order_id,
        p_order_number,
        coalesce(p_invoice_date, current_date),
        v_due_date,
        v_status,
        p_subtotal,
        p_discount_amount,
        p_vat_percentage,
        p_vat_amount,
        p_grand_total,
        p_paid_amount,
        p_due_amount,
        0,
        p_notes,
        p_terms_and_conditions,
        v_actor_display_name,
        p_idempotency_key,
        p_customer_email,
        p_quotation_id,
        p_job_order_id,
        now(),
        now()
    ) returning id into v_invoice_id;

    -- 5. Insert Invoice Line Items matching live table schema
    if p_items is not null and jsonb_array_length(p_items) > 0 then
        for v_item in select * from jsonb_array_elements(p_items)
        loop
            insert into public.invoice_items (
                invoice_id,
                item_description,
                dimensions_spec,
                quantity,
                unit,
                unit_price,
                vat_percentage,
                total_price,
                product_id,
                created_at
            ) values (
                v_invoice_id,
                coalesce(v_item->>'item_description', v_item->>'item_name', v_item->>'description', 'Printing Item'),
                v_item->>'dimensions_spec',
                coalesce((v_item->>'quantity')::numeric, 1),
                coalesce(v_item->>'unit', 'pcs'),
                coalesce((v_item->>'unit_price')::numeric, 0),
                coalesce((v_item->>'vat_percentage')::numeric, 0),
                coalesce((v_item->>'total_price')::numeric, (coalesce((v_item->>'quantity')::numeric, 1) * coalesce((v_item->>'unit_price')::numeric, 0))),
                case when (v_item->>'product_id') ~ '^[0-9a-fA-F-]{36}$' then (v_item->>'product_id')::uuid else null end,
                now()
            );
        end loop;
    end if;

    -- 6. Dual-Entry Accounting: Record Payment for Advance if paid_amount > 0
    if p_paid_amount > 0 then
        v_receipt_num := public.get_next_document_number(p_company_id, 'payment');

        insert into public.payments (
            company_id,
            branch_id,
            receipt_number,
            customer_id,
            customer_name,
            payment_date,
            payment_type,
            payment_method,
            amount,
            unallocated_amount,
            notes,
            received_by_name,
            idempotency_key,
            actor_user_id,
            created_at
        ) values (
            p_company_id,
            p_branch_id,
            v_receipt_num,
            p_customer_id,
            p_customer_name,
            coalesce(p_invoice_date, current_date),
            'advance_payment',
            coalesce(p_payment_method, 'cash'),
            p_paid_amount,
            0,
            coalesce(p_payment_method_note, 'Advance payment on invoice ' || v_invoice_num),
            v_actor_display_name,
            case when p_idempotency_key is not null then p_idempotency_key || '_pay' else null end,
            v_effective_actor_id,
            now()
        ) returning id into v_payment_id;

        insert into public.payment_allocations (
            payment_id,
            invoice_id,
            allocated_amount,
            created_at
        ) values (
            v_payment_id,
            v_invoice_id,
            p_paid_amount,
            now()
        );

        -- Update Customer Paid Metrics
        if p_customer_id is not null then
            update public.customers
            set total_paid_amount = coalesce(total_paid_amount, 0) + p_paid_amount,
                last_payment_date = coalesce(p_invoice_date, current_date),
                last_payment_amount = p_paid_amount,
                updated_at = now()
            where id = p_customer_id and company_id = p_company_id;
        end if;
    end if;

    -- 7. Update Customer Total Due & Invoiced Balance
    if p_customer_id is not null then
        update public.customers
        set total_due_balance = greatest(0, coalesce(total_due_balance, 0) + p_due_amount),
            total_invoiced_amount = coalesce(total_invoiced_amount, 0) + p_grand_total,
            updated_at = now()
        where id = p_customer_id and company_id = p_company_id;
    end if;

    return jsonb_build_object(
        'success', true,
        'invoice_id', v_invoice_id,
        'invoice_number', v_invoice_num,
        'grand_total', p_grand_total,
        'paid_amount', p_paid_amount,
        'due_amount', p_due_amount,
        'status', v_status
    );
end;
$$;

revoke execute on function public.create_invoice_atomic from public, anon;
grant execute on function public.create_invoice_atomic to authenticated, service_role;

-- 6.2 Cancel Invoice Atomic (5 args)
create or replace function public.cancel_invoice_atomic(
    p_company_id uuid,
    p_invoice_id uuid,
    p_reason text,
    p_actor_name text default null::text,
    p_actor_user_id uuid default null::uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_variable
declare
    v_inv record;
    v_released_due numeric;
    v_auth_uid uuid;
    v_effective_actor_id uuid;
begin
    if p_company_id is null or p_invoice_id is null then
        raise exception 'Company ID and Invoice ID are required';
    end if;

    -- Strict Session & Permission Check
    if auth.role() = 'authenticated' or auth.uid() is not null then
        v_auth_uid := auth.uid();
        if v_auth_uid is null then
            raise exception 'Unauthorized: Authenticated session required for financial operations';
        end if;

        if not public.auth_user_has_company_access(p_company_id) then
            raise exception 'Unauthorized: User does not belong to target company context';
        end if;

        if not (
            public.auth_user_has_permission(p_company_id, 'invoices.cancel')
            or public.auth_user_has_permission(p_company_id, 'invoice.delete')
            or public.auth_user_has_permission(p_company_id, 'invoice.full_control')
        ) then
            raise exception 'Permission denied: invoices.cancel required for company %', p_company_id;
        end if;

        v_effective_actor_id := v_auth_uid;
    elsif auth.role() = 'anon' then
        raise exception 'Unauthorized: Anonymous callers are not permitted to invoke financial functions.';
    else
        v_effective_actor_id := coalesce(auth.uid(), p_actor_user_id);
    end if;

    select id, customer_id, invoice_number, grand_total, paid_amount, due_amount, status
    into v_inv
    from public.invoices
    where id = p_invoice_id and company_id = p_company_id
    for update;

    if v_inv.id is null then
        raise exception 'Invoice not found in company context';
    end if;

    if v_inv.status = 'cancelled' then
        raise exception 'Invoice is already cancelled';
    end if;

    if v_inv.status = 'paid' then
        raise exception 'Paid invoices cannot be cancelled directly. Issue a refund or credit note first.';
    end if;

    v_released_due := coalesce(v_inv.due_amount, 0);

    -- Cancel Invoice Row
    update public.invoices
    set status = 'cancelled',
        due_amount = 0,
        notes = coalesce(notes || E'\n', '') || '[Cancelled on ' || current_date::text || ' by ' || coalesce(p_actor_name, 'Authorized User') || ']: ' || p_reason,
        updated_at = now()
    where id = p_invoice_id and company_id = p_company_id;

    -- Adjust Customer Due Balance
    if v_inv.customer_id is not null and v_released_due > 0 then
        update public.customers
        set total_due_balance = greatest(0, coalesce(total_due_balance, 0) - v_released_due),
            total_invoiced_amount = greatest(0, coalesce(total_invoiced_amount, 0) - v_inv.grand_total),
            updated_at = now()
        where id = v_inv.customer_id and company_id = p_company_id;
    end if;

    -- Log Audit Event
    perform public.log_audit_event(
        p_company_id,
        'invoice',
        'cancel',
        jsonb_build_object('id', v_inv.id, 'invoice_number', v_inv.invoice_number, 'status', v_inv.status, 'due_amount', v_inv.due_amount),
        jsonb_build_object('status', 'cancelled', 'due_amount', 0, 'reason', p_reason),
        p_invoice_id::text
    );

    return jsonb_build_object(
        'success', true,
        'invoice_id', p_invoice_id,
        'invoice_number', v_inv.invoice_number,
        'released_due', v_released_due,
        'status', 'cancelled'
    );
end;
$$;

revoke execute on function public.cancel_invoice_atomic from public, anon;
grant execute on function public.cancel_invoice_atomic to authenticated, service_role;

-- 6.3 Record Multi Invoice Payment Atomic (16 args)
create or replace function public.record_multi_invoice_payment_atomic(
    p_company_id uuid,
    p_customer_id uuid default null::uuid,
    p_customer_name text default 'Walk-in Customer'::text,
    p_amount numeric default 0,
    p_payment_method text default 'cash'::text,
    p_payment_date date default current_date,
    p_bank_name text default null::text,
    p_cheque_number text default null::text,
    p_cheque_date date default null::date,
    p_mfs_transaction_id text default null::text,
    p_notes text default null::text,
    p_received_by_name text default null::text,
    p_allocations jsonb default '[]'::jsonb,
    p_branch_id uuid default null::uuid,
    p_idempotency_key text default null::text,
    p_actor_user_id uuid default null::uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_variable
declare
    v_payment_num text;
    v_payment_id uuid;
    v_existing_payment record;
    v_alloc jsonb;
    v_inv_id uuid;
    v_alloc_amt numeric;
    v_inv record;
    v_new_paid numeric;
    v_new_due numeric;
    v_new_status text;
    v_total_allocated numeric := 0;
    v_unallocated numeric := 0;
    v_auth_uid uuid;
    v_effective_actor_id uuid;
    v_actor_display_name text;
begin
    if p_company_id is null then
        raise exception 'Company ID is required';
    end if;

    if p_amount <= 0 then
        raise exception 'Payment amount must be greater than zero';
    end if;

    -- Strict Session & Permission Check
    if auth.role() = 'authenticated' or auth.uid() is not null then
        v_auth_uid := auth.uid();
        if v_auth_uid is null then
            raise exception 'Unauthorized: Authenticated session required for financial operations';
        end if;

        if not public.auth_user_has_company_access(p_company_id) then
            raise exception 'Unauthorized: User does not belong to target company context';
        end if;

        if not (
            public.auth_user_has_permission(p_company_id, 'payment.create')
            or public.auth_user_has_permission(p_company_id, 'payment.full_control')
        ) then
            raise exception 'Permission denied: payment.create required for company %', p_company_id;
        end if;

        v_effective_actor_id := v_auth_uid;
    elsif auth.role() = 'anon' then
        raise exception 'Unauthorized: Anonymous callers are not permitted to invoke financial functions.';
    else
        v_effective_actor_id := coalesce(auth.uid(), p_actor_user_id);
    end if;

    -- Resolve trustworthy display name for actor
    select coalesce(full_name, p_received_by_name, 'Cashier')
    into v_actor_display_name
    from public.profiles
    where id = v_effective_actor_id;

    if v_actor_display_name is null then
        v_actor_display_name := coalesce(p_received_by_name, 'Cashier');
    end if;

    -- Idempotency Check
    if p_idempotency_key is not null and p_idempotency_key <> '' then
        select id, receipt_number, amount, unallocated_amount, payment_method, customer_id
        into v_existing_payment
        from public.payments
        where company_id = p_company_id and idempotency_key = p_idempotency_key
        limit 1;

        if v_existing_payment.id is not null then
            return jsonb_build_object(
                'success', true,
                'is_idempotent_replay', true,
                'payment_id', v_existing_payment.id,
                'receipt_number', v_existing_payment.receipt_number,
                'amount', v_existing_payment.amount,
                'allocated_total', (v_existing_payment.amount - coalesce(v_existing_payment.unallocated_amount, 0)),
                'unallocated_surplus', coalesce(v_existing_payment.unallocated_amount, 0),
                'payment_method', v_existing_payment.payment_method,
                'customer_id', v_existing_payment.customer_id
            );
        end if;
    end if;

    -- Sequence Number Generation
    v_payment_num := public.get_next_document_number(p_company_id, 'payment');

    -- Insert Master Payment Record
    insert into public.payments (
        company_id,
        branch_id,
        receipt_number,
        customer_id,
        customer_name,
        payment_date,
        payment_type,
        payment_method,
        amount,
        unallocated_amount,
        bank_name,
        cheque_number,
        cheque_date,
        mfs_transaction_id,
        notes,
        received_by_name,
        idempotency_key,
        actor_user_id,
        created_at
    ) values (
        p_company_id,
        p_branch_id,
        v_payment_num,
        p_customer_id,
        p_customer_name,
        coalesce(p_payment_date, current_date),
        case when jsonb_array_length(p_allocations) > 0 then 'due_payment' else 'advance_payment' end,
        p_payment_method,
        p_amount,
        0,
        p_bank_name,
        p_cheque_number,
        p_cheque_date,
        p_mfs_transaction_id,
        p_notes,
        v_actor_display_name,
        p_idempotency_key,
        v_effective_actor_id,
        now()
    ) returning id into v_payment_id;

    -- Process Invoice Allocations
    if p_allocations is not null and jsonb_array_length(p_allocations) > 0 then
        for v_alloc in select * from jsonb_array_elements(p_allocations)
        loop
            v_inv_id := (v_alloc->>'invoice_id')::uuid;
            v_alloc_amt := coalesce((v_alloc->>'amount')::numeric, (v_alloc->>'allocated_amount')::numeric, 0);

            if v_alloc_amt > 0 then
                select id, invoice_number, grand_total, paid_amount, due_amount, status
                into v_inv
                from public.invoices
                where id = v_inv_id and company_id = p_company_id
                for update;

                if v_inv.id is not null then
                    if v_inv.status = 'cancelled' then
                        raise exception 'Cannot allocate payment to cancelled invoice %', v_inv.invoice_number;
                    end if;

                    v_new_paid := coalesce(v_inv.paid_amount, 0) + v_alloc_amt;
                    v_new_due := greatest(0, coalesce(v_inv.due_amount, 0) - v_alloc_amt);

                    if v_new_due <= 0 then
                        v_new_status := 'paid';
                    else
                        v_new_status := 'partially_paid';
                    end if;

                    update public.invoices
                    set paid_amount = v_new_paid,
                        due_amount = v_new_due,
                        status = v_new_status,
                        updated_at = now()
                    where id = v_inv.id;

                    insert into public.payment_allocations (
                        payment_id,
                        invoice_id,
                        allocated_amount,
                        created_at
                    ) values (
                        v_payment_id,
                        v_inv.id,
                        v_alloc_amt,
                        now()
                    );

                    v_total_allocated := v_total_allocated + v_alloc_amt;
                end if;
            end if;
        end loop;
    end if;

    v_unallocated := greatest(0, p_amount - v_total_allocated);

    if v_unallocated > 0 then
        update public.payments
        set unallocated_amount = v_unallocated
        where id = v_payment_id;
    end if;

    -- Adjust Customer Metrics
    if p_customer_id is not null then
        update public.customers
        set total_paid_amount = coalesce(total_paid_amount, 0) + p_amount,
            total_due_balance = greatest(0, coalesce(total_due_balance, 0) - v_total_allocated),
            last_payment_date = coalesce(p_payment_date, current_date),
            last_payment_amount = p_amount,
            updated_at = now()
        where id = p_customer_id and company_id = p_company_id;
    end if;

    return jsonb_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'receipt_number', v_payment_num,
        'amount', p_amount,
        'allocated_total', v_total_allocated,
        'unallocated_surplus', v_unallocated,
        'customer_id', p_customer_id
    );
end;
$$;

revoke execute on function public.record_multi_invoice_payment_atomic from public, anon;
grant execute on function public.record_multi_invoice_payment_atomic to authenticated, service_role;

-- 6.4 Record Financial Write-Off Atomic (6 args)
create or replace function public.record_financial_write_off_atomic(
    p_company_id uuid,
    p_invoice_id uuid,
    p_amount numeric,
    p_reason text,
    p_authorized_by_name text,
    p_actor_user_id uuid default null::uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_variable
declare
    v_write_off_id uuid;
    v_inv record;
    v_new_write_off numeric;
    v_new_due numeric;
    v_new_status text;
    v_auth_uid uuid;
    v_effective_actor_id uuid;
begin
    if p_company_id is null or p_invoice_id is null then
        raise exception 'Company ID and Invoice ID are required';
    end if;

    if p_amount <= 0 then
        raise exception 'Write-off amount must be greater than zero';
    end if;

    if p_reason is null or trim(p_reason) = '' then
        raise exception 'A valid business justification is required for write-off';
    end if;

    -- Strict Session & Permission Check
    if auth.role() = 'authenticated' or auth.uid() is not null then
        v_auth_uid := auth.uid();
        if v_auth_uid is null then
            raise exception 'Unauthorized: Authenticated session required for financial operations';
        end if;

        if not public.auth_user_has_company_access(p_company_id) then
            raise exception 'Unauthorized: User does not belong to target company context';
        end if;

        if not (
            public.auth_user_has_permission(p_company_id, 'invoice.edit')
            or public.auth_user_has_permission(p_company_id, 'invoice.full_control')
        ) then
            raise exception 'Permission denied: invoice.edit required for company %', p_company_id;
        end if;

        v_effective_actor_id := v_auth_uid;
    elsif auth.role() = 'anon' then
        raise exception 'Unauthorized: Anonymous callers are not permitted to invoke financial functions.';
    else
        v_effective_actor_id := coalesce(auth.uid(), p_actor_user_id);
    end if;

    select id, customer_id, invoice_number, grand_total, paid_amount, due_amount, write_off_amount, status
    into v_inv
    from public.invoices
    where id = p_invoice_id and company_id = p_company_id
    for update;

    if v_inv.id is null then
        raise exception 'Invoice not found in company context';
    end if;

    if v_inv.status in ('cancelled', 'paid') then
        raise exception 'Cannot execute write-off on an invoice with status %', v_inv.status;
    end if;

    if p_amount > v_inv.due_amount then
        raise exception 'Write-off amount (%) exceeds remaining invoice due amount (%)', p_amount, v_inv.due_amount;
    end if;

    v_new_write_off := coalesce(v_inv.write_off_amount, 0) + p_amount;
    v_new_due := greatest(0, v_inv.due_amount - p_amount);

    if v_new_due <= 0 then
        v_new_status := 'paid';
    else
        v_new_status := v_inv.status;
    end if;

    insert into public.invoice_write_offs (
        company_id,
        invoice_id,
        amount,
        reason,
        authorized_by_name,
        created_by,
        created_at
    ) values (
        p_company_id,
        p_invoice_id,
        p_amount,
        p_reason,
        p_authorized_by_name,
        v_effective_actor_id,
        now()
    ) returning id into v_write_off_id;

    update public.invoices
    set write_off_amount = v_new_write_off,
        due_amount = v_new_due,
        status = v_new_status,
        updated_at = now()
    where id = p_invoice_id and company_id = p_company_id;

    if v_inv.customer_id is not null then
        update public.customers
        set total_due_balance = greatest(0, coalesce(total_due_balance, 0) - p_amount),
            updated_at = now()
        where id = v_inv.customer_id and company_id = p_company_id;
    end if;

    perform public.log_audit_event(
        p_company_id,
        'invoice',
        'write_off',
        jsonb_build_object('id', v_inv.id, 'invoice_number', v_inv.invoice_number, 'due_amount', v_inv.due_amount),
        jsonb_build_object('written_off', p_amount, 'new_due', v_new_due, 'reason', p_reason),
        p_invoice_id::text
    );

    return jsonb_build_object(
        'success', true,
        'write_off_id', v_write_off_id,
        'invoice_id', p_invoice_id,
        'invoice_number', v_inv.invoice_number,
        'written_off_amount', p_amount,
        'remaining_due', v_new_due,
        'status', v_new_status
    );
end;
$$;

revoke execute on function public.record_financial_write_off_atomic from public, anon;
grant execute on function public.record_financial_write_off_atomic to authenticated, service_role;

-- 6.5 Reconcile Customer Balance Atomic
create or replace function public.reconcile_customer_balance_atomic(
    p_company_id uuid,
    p_customer_id uuid default null::uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_variable
declare
    v_cust record;
    v_calc_invoiced numeric;
    v_calc_paid numeric;
    v_calc_due numeric;
    v_reconciled_count int := 0;
    v_auth_uid uuid;
begin
    if p_company_id is null then
        raise exception 'Company ID is required';
    end if;

    if auth.role() = 'authenticated' or auth.uid() is not null then
        v_auth_uid := auth.uid();
        if v_auth_uid is null then
            raise exception 'Unauthorized: Authenticated session required for balance reconciliation';
        end if;

        if not public.auth_user_has_company_access(p_company_id) then
            raise exception 'Unauthorized: User does not belong to target company context';
        end if;

        if not (
            public.auth_user_has_permission(p_company_id, 'customer.edit')
            or public.auth_user_has_permission(p_company_id, 'customer.full_control')
        ) then
            raise exception 'Permission denied: customer.edit required for company %', p_company_id;
        end if;
    elsif auth.role() = 'anon' then
        raise exception 'Unauthorized: Anonymous callers are not permitted to invoke customer balance reconciliation.';
    end if;

    for v_cust in
        select id, name, total_invoiced_amount, total_paid_amount, total_due_balance
        from public.customers
        where company_id = p_company_id and (p_customer_id is null or id = p_customer_id)
    loop
        select coalesce(sum(grand_total), 0)
        into v_calc_invoiced
        from public.invoices
        where company_id = p_company_id and customer_id = v_cust.id and status <> 'cancelled';

        select coalesce(sum(amount), 0)
        into v_calc_paid
        from public.payments
        where company_id = p_company_id and customer_id = v_cust.id;

        select coalesce(sum(due_amount), 0)
        into v_calc_due
        from public.invoices
        where company_id = p_company_id and customer_id = v_cust.id and status <> 'cancelled';

        update public.customers
        set total_invoiced_amount = v_calc_invoiced,
            total_paid_amount = v_calc_paid,
            total_due_balance = v_calc_due,
            updated_at = now()
        where id = v_cust.id;

        v_reconciled_count := v_reconciled_count + 1;
    end loop;

    return jsonb_build_object(
        'success', true,
        'reconciled_count', v_reconciled_count
    );
end;
$$;

revoke execute on function public.reconcile_customer_balance_atomic from public, anon;
grant execute on function public.reconcile_customer_balance_atomic to authenticated, service_role;

-- 6.6 Schedule Production Task Atomic
create or replace function public.schedule_production_task_atomic(
    p_task_id uuid,
    p_company_id uuid,
    p_machine_id uuid,
    p_operator_id uuid,
    p_scheduled_start timestamp with time zone,
    p_scheduled_end timestamp with time zone,
    p_duration_minutes integer,
    p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_task record;
    v_machine record;
    v_maint record;
    v_updated_task record;
    v_auth_uid uuid;
begin
    if auth.role() = 'authenticated' or auth.uid() is not null then
        v_auth_uid := auth.uid();
        if v_auth_uid is null then
            raise exception 'Unauthorized: Authenticated session required';
        end if;

        if not public.auth_user_has_company_access(p_company_id) then
            raise exception 'Unauthorized: User does not belong to target company context';
        end if;

        if not (
            public.auth_user_has_permission(p_company_id, 'production.edit')
            or public.auth_user_has_permission(p_company_id, 'production.create')
            or public.auth_user_has_permission(p_company_id, 'production.full_control')
        ) then
            raise exception 'Permission denied: production.edit required for company %', p_company_id;
        end if;
    elsif auth.role() = 'anon' then
        raise exception 'Unauthorized: Anonymous callers are not permitted to schedule production tasks.';
    end if;

    select * into v_task 
    from public.production_tasks 
    where id = p_task_id and company_id = p_company_id;

    if not found then
        raise exception 'Production task not found' using errcode = 'P0002';
    end if;

    if p_machine_id is not null then
        select * into v_machine
        from public.machineries
        where id = p_machine_id and company_id = p_company_id
        for update;

        if not found then
            raise exception 'Assigned machine not found' using errcode = 'P0002';
        end if;

        if v_machine.status = 'breakdown' then
            raise exception 'Cannot schedule task on %: Machine is currently broken down.', v_machine.name using errcode = '23P01';
        end if;
        if v_machine.status = 'maintenance' then
            raise exception 'Cannot schedule task on %: Machine is currently under maintenance.', v_machine.name using errcode = '23P01';
        end if;
        if v_machine.status in ('retired', 'offline') then
            raise exception 'Cannot schedule task on %: Machine is %.', v_machine.name, v_machine.status using errcode = '23P01';
        end if;

        select * into v_maint
        from public.machinery_maintenances
        where machine_id = p_machine_id 
          and company_id = p_company_id
          and status not in ('completed', 'cancelled')
          and scheduled_date is not null
          and (
              tstzrange(scheduled_date, scheduled_date + interval '4 hours', '[)') && 
              tstzrange(p_scheduled_start, p_scheduled_end, '[)')
          )
        limit 1;

        if found then
            raise exception 'Schedule conflict: Machine % has scheduled maintenance during this window.', v_machine.name using errcode = '23P01';
        end if;
    end if;

    update public.production_tasks
    set assigned_machine_id = p_machine_id,
        assigned_operator_id = p_operator_id,
        scheduled_start = p_scheduled_start,
        scheduled_end = p_scheduled_end,
        estimated_duration_minutes = coalesce(p_duration_minutes, estimated_duration_minutes),
        notes = coalesce(p_notes, notes),
        status = case when status = 'pending' then 'queued' else status end,
        updated_at = now()
    where id = p_task_id and company_id = p_company_id
    returning * into v_updated_task;

    return jsonb_build_object(
        'success', true,
        'task_id', v_updated_task.id,
        'status', v_updated_task.status,
        'scheduled_start', v_updated_task.scheduled_start,
        'scheduled_end', v_updated_task.scheduled_end,
        'assigned_machine_id', v_updated_task.assigned_machine_id
    );
end;
$$;

revoke execute on function public.schedule_production_task_atomic from public, anon;
grant execute on function public.schedule_production_task_atomic to authenticated, service_role;

-- 6.7 Report Production Problem Atomic
create or replace function public.report_production_problem_atomic(
    p_company_id uuid,
    p_task_id uuid,
    p_reason text,
    p_notes text default null::text,
    p_photo_url text default null::text,
    p_reported_by_name text default null::text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_problem_num text;
    v_problem_id uuid;
    v_task record;
    v_branch_id uuid;
    v_job_id uuid;
    v_auth_uid uuid;
    v_actor_name text;
begin
    if auth.role() = 'authenticated' or auth.uid() is not null then
        v_auth_uid := auth.uid();
        if v_auth_uid is null then
            raise exception 'Unauthorized: Authenticated session required';
        end if;

        if not public.auth_user_has_company_access(p_company_id) then
            raise exception 'Unauthorized: User does not belong to target company context';
        end if;

        if not (
            public.auth_user_has_permission(p_company_id, 'production.view')
            or public.auth_user_has_permission(p_company_id, 'production.edit')
            or public.auth_user_has_permission(p_company_id, 'production.full_control')
        ) then
            raise exception 'Permission denied: production.view required for company %', p_company_id;
        end if;
    elsif auth.role() = 'anon' then
        raise exception 'Unauthorized: Anonymous callers are not permitted to report production problems.';
    end if;

    select id, company_id, branch_id, production_job_id, task_name
    into v_task
    from public.production_tasks
    where id = p_task_id and company_id = p_company_id;

    if v_task.id is null then
        raise exception 'Production task not found in company context';
    end if;

    v_branch_id := v_task.branch_id;
    v_job_id := v_task.production_job_id;

    v_problem_num := public.get_next_document_number(p_company_id, 'problem');

    select coalesce(full_name, p_reported_by_name, 'Operator')
    into v_actor_name
    from public.profiles
    where id = auth.uid();

    if v_actor_name is null then
        v_actor_name := coalesce(p_reported_by_name, 'Operator');
    end if;

    insert into public.production_problem_reports (
        company_id,
        branch_id,
        problem_number,
        production_task_id,
        production_job_id,
        reason,
        notes,
        photo_url,
        reported_by,
        reported_by_name,
        status,
        created_at,
        updated_at
    ) values (
        p_company_id,
        v_branch_id,
        v_problem_num,
        p_task_id,
        v_job_id,
        p_reason,
        p_notes,
        p_photo_url,
        auth.uid(),
        v_actor_name,
        'open',
        now(),
        now()
    ) returning id into v_problem_id;

    update public.production_tasks
    set status = 'on_hold',
        notes = coalesce(notes || E'\n', '') || '[Problem ' || v_problem_num || ' reported]: ' || p_reason,
        updated_at = now()
    where id = p_task_id and company_id = p_company_id;

    return jsonb_build_object(
        'success', true,
        'problem_id', v_problem_id,
        'problem_number', v_problem_num,
        'task_id', p_task_id,
        'status', 'open'
    );
end;
$$;

revoke execute on function public.report_production_problem_atomic from public, anon;
grant execute on function public.report_production_problem_atomic to authenticated, service_role;

-- 6.8 Tenant Dashboard Metrics & Analytics Summary Functions
create or replace function public.get_tenant_dashboard_metrics(p_company_id uuid)
returns jsonb
language plpgsql
stable security definer
set search_path = public, pg_temp
as $$
declare
    v_result jsonb;
    v_auth_uid uuid;
begin
    if auth.role() = 'authenticated' or auth.uid() is not null then
        v_auth_uid := auth.uid();
        if v_auth_uid is null then
            raise exception 'Unauthorized: Authenticated session required';
        end if;

        if not public.auth_user_has_company_access(p_company_id) then
            raise exception 'Unauthorized access to company dashboard metrics';
        end if;
    elsif auth.role() = 'anon' then
        raise exception 'Unauthorized access to company dashboard metrics';
    end if;

    select jsonb_build_object(
        'today_sales', coalesce((
            select sum(final_price)
            from public.sales_orders
            where company_id = p_company_id
              and status not in ('cancelled', 'pending')
              and created_at >= current_date
        ), 0),
        'pending_orders_count', (
            select count(*)
            from public.sales_orders
            where company_id = p_company_id
              and status in ('pending', 'confirmed', 'in_production')
        ),
        'active_jobs_count', (
            select count(*)
            from public.production_jobs
            where company_id = p_company_id
              and status in ('queued', 'in_progress', 'quality_check')
        ),
        'total_receivables', coalesce((
            select sum(due_amount)
            from public.invoices
            where company_id = p_company_id
              and status in ('unpaid', 'partially_paid', 'overdue')
        ), 0),
        'low_stock_materials_count', (
            select count(*)
            from public.materials
            where company_id = p_company_id
              and current_stock <= min_stock_level
        ),
        'last_updated', now()
    ) into v_result;

    return v_result;
end;
$$;

do $$
begin
    if exists (
        select 1 from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'get_tenant_dashboard_metrics' and p.pronargs = 1
    ) then
        execute 'revoke execute on function public.get_tenant_dashboard_metrics(uuid) from public, anon';
        execute 'grant execute on function public.get_tenant_dashboard_metrics(uuid) to authenticated, service_role';
    end if;
    if exists (
        select 1 from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'get_tenant_dashboard_metrics' and p.pronargs = 2
    ) then
        execute 'revoke execute on function public.get_tenant_dashboard_metrics(uuid, uuid) from public, anon';
        execute 'grant execute on function public.get_tenant_dashboard_metrics(uuid, uuid) to authenticated, service_role';
    end if;
end $$;

revoke execute on function public.get_tenant_dashboard_metrics_v2 from public, anon;
grant execute on function public.get_tenant_dashboard_metrics_v2 to authenticated, service_role;

revoke execute on function public.get_tenant_financial_summary from public, anon;
grant execute on function public.get_tenant_financial_summary to authenticated, service_role;

revoke execute on function public.get_tenant_production_summary from public, anon;
grant execute on function public.get_tenant_production_summary to authenticated, service_role;

revoke execute on function public.get_tenant_sales_summary from public, anon;
grant execute on function public.get_tenant_sales_summary to authenticated, service_role;

-- 6.9 Operational Financial Functions (Expenses, Refunds, Transfers, Supplier Payments)
revoke execute on function public.record_expense_atomic from public, anon;
grant execute on function public.record_expense_atomic to authenticated, service_role;

revoke execute on function public.record_expense_with_journal_atomic from public, anon;
grant execute on function public.record_expense_with_journal_atomic to authenticated, service_role;

revoke execute on function public.record_financial_transfer_atomic from public, anon;
grant execute on function public.record_financial_transfer_atomic to authenticated, service_role;

revoke execute on function public.record_customer_refund_atomic from public, anon;
grant execute on function public.record_customer_refund_atomic to authenticated, service_role;

revoke execute on function public.record_supplier_payment_atomic from public, anon;
grant execute on function public.record_supplier_payment_atomic to authenticated, service_role;

revoke execute on function public.record_cheque_dishonor_atomic from public, anon;
grant execute on function public.record_cheque_dishonor_atomic to authenticated, service_role;

revoke execute on function public.log_audit_event from public, anon;
grant execute on function public.log_audit_event to authenticated, service_role;

-- 6.10 Auth & RBAC State Inspection Functions
revoke execute on function public.auth_get_user_company_role(uuid) from public, anon;
grant execute on function public.auth_get_user_company_role(uuid) to authenticated, service_role;

revoke execute on function public.auth_is_active_company_user(uuid) from public, anon;
grant execute on function public.auth_is_active_company_user(uuid) to authenticated, service_role;

revoke execute on function public.auth_user_get_role(uuid) from public, anon;
grant execute on function public.auth_user_get_role(uuid) to authenticated, service_role;
alter function public.auth_user_get_role(uuid) set search_path = public, pg_temp;

revoke execute on function public.auth_user_has_company_access(uuid) from public, anon;
grant execute on function public.auth_user_has_company_access(uuid) to authenticated, service_role;

revoke execute on function public.auth_user_has_permission(uuid, text) from public, anon;
grant execute on function public.auth_user_has_permission(uuid, text) to authenticated, service_role;

revoke execute on function public.auth_is_platform_admin() from public, anon;
grant execute on function public.auth_is_platform_admin() to authenticated, service_role;

revoke execute on function public.auth_is_platform_owner() from public, anon;
grant execute on function public.auth_is_platform_owner() to authenticated, service_role;

revoke execute on function public.platform_is_feature_enabled(text, uuid) from public, anon;
grant execute on function public.platform_is_feature_enabled(text, uuid) to authenticated, service_role;
alter function public.platform_is_feature_enabled(text, uuid) set search_path = public, pg_temp;

-- ==============================================================================
-- 7. Hardened RLS Policies on role_permissions and _printerp_migrations
-- ==============================================================================

-- 7.1 Drop insecure permissive policies on role_permissions
drop policy if exists "Admins can manage role permissions" on public.role_permissions;
drop policy if exists "Users can view role permissions" on public.role_permissions;
drop policy if exists "Users can view role_permissions" on public.role_permissions;
drop policy if exists "role_permissions_select_policy" on public.role_permissions;
drop policy if exists "role_permissions_insert_policy" on public.role_permissions;
drop policy if exists "role_permissions_update_policy" on public.role_permissions;
drop policy if exists "role_permissions_delete_policy" on public.role_permissions;

-- Enable and force RLS on role_permissions
alter table public.role_permissions enable row level security;
alter table public.role_permissions force row level security;

-- SELECT policy: authenticated users can view role permissions for global/system roles or company roles they access
create policy "role_permissions_select_policy"
on public.role_permissions
for select
to authenticated
using (
    exists (
        select 1 from public.roles r
        where r.id = role_permissions.role_id
          and (r.company_id is null or public.auth_user_has_company_access(r.company_id))
    )
);

-- INSERT policy: only users with settings/roles management permissions on the target company can insert
create policy "role_permissions_insert_policy"
on public.role_permissions
for insert
to authenticated
with check (
    exists (
        select 1 from public.roles r
        where r.id = role_permissions.role_id
          and r.company_id is not null
          and (
              public.auth_user_has_permission(r.company_id, 'settings.edit')
              or public.auth_user_has_permission(r.company_id, 'settings.full_control')
              or public.auth_user_has_permission(r.company_id, 'users.permission_manage')
          )
    )
);

-- UPDATE policy: restricted to company custom roles
create policy "role_permissions_update_policy"
on public.role_permissions
for update
to authenticated
using (
    exists (
        select 1 from public.roles r
        where r.id = role_permissions.role_id
          and r.company_id is not null
          and (
              public.auth_user_has_permission(r.company_id, 'settings.edit')
              or public.auth_user_has_permission(r.company_id, 'settings.full_control')
              or public.auth_user_has_permission(r.company_id, 'users.permission_manage')
          )
    )
)
with check (
    exists (
        select 1 from public.roles r
        where r.id = role_permissions.role_id
          and r.company_id is not null
          and (
              public.auth_user_has_permission(r.company_id, 'settings.edit')
              or public.auth_user_has_permission(r.company_id, 'settings.full_control')
              or public.auth_user_has_permission(r.company_id, 'users.permission_manage')
          )
    )
);

-- DELETE policy: restricted to company custom roles
create policy "role_permissions_delete_policy"
on public.role_permissions
for delete
to authenticated
using (
    exists (
        select 1 from public.roles r
        where r.id = role_permissions.role_id
          and r.company_id is not null
          and (
              public.auth_user_has_permission(r.company_id, 'settings.edit')
              or public.auth_user_has_permission(r.company_id, 'settings.full_control')
              or public.auth_user_has_permission(r.company_id, 'users.permission_manage')
          )
    )
);

-- 7.2 Explicit Deny-All on Migration Tracking Tables
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = '_printflow_migrations') THEN
        ALTER TABLE public._printflow_migrations ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public._printflow_migrations FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "deny_all_access" ON public._printflow_migrations;
        CREATE POLICY "deny_all_access" ON public._printflow_migrations FOR ALL TO public USING (false) WITH CHECK (false);
        DROP POLICY IF EXISTS "allow_service_role" ON public._printflow_migrations;
        CREATE POLICY "allow_service_role" ON public._printflow_migrations FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = '_printerp_migrations') THEN
        ALTER TABLE public._printerp_migrations ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public._printerp_migrations FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "deny_all_access" ON public._printerp_migrations;
        CREATE POLICY "deny_all_access" ON public._printerp_migrations FOR ALL TO public USING (false) WITH CHECK (false);
        DROP POLICY IF EXISTS "allow_service_role" ON public._printerp_migrations;
        CREATE POLICY "allow_service_role" ON public._printerp_migrations FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;
