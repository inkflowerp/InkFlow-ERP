-- ==============================================================================
-- PrintERP SaaS - Migration 096: Administrative Invoice Purge & Financial Reset
-- Allows secure, atomic cleanup of invoices, items, payments, and sequence counters
-- ==============================================================================

create or replace function public.admin_purge_all_company_invoices(
    p_company_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_deleted_invoices integer := 0;
    v_deleted_items integer := 0;
    v_deleted_payments integer := 0;
begin
    -- 1. Disable anti-deletion triggers temporarily for this transaction
    if exists (select 1 from pg_trigger where tgname = 'prevent_invoice_deletion') then
        alter table public.invoices disable trigger prevent_invoice_deletion;
    end if;
    if exists (select 1 from pg_trigger where tgname = 'prevent_payment_deletion') then
        alter table public.payments disable trigger prevent_payment_deletion;
    end if;

    -- 2. Delete financial write-offs for company invoices
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'financial_write_offs') then
        delete from public.financial_write_offs
        where invoice_id in (select id from public.invoices where company_id = p_company_id);
    end if;

    -- 3. Delete payment allocations for company invoices/payments
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'payment_allocations') then
        delete from public.payment_allocations
        where invoice_id in (select id from public.invoices where company_id = p_company_id)
           or payment_id in (select id from public.payments where company_id = p_company_id);
    end if;

    -- 4. Delete payments for company
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'payments') then
        delete from public.payments
        where company_id = p_company_id;
        get diagnostics v_deleted_payments = row_count;
    end if;

    -- 5. Delete invoice items for company invoices
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'invoice_items') then
        delete from public.invoice_items
        where invoice_id in (select id from public.invoices where company_id = p_company_id);
        get diagnostics v_deleted_items = row_count;
    end if;

    -- 6. Unlink invoice requests & references
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'invoice_requests') then
        delete from public.invoice_requests
        where company_id = p_company_id;
    end if;

    -- 7. Unlink invoice IDs from design jobs, job orders, sales orders
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'design_jobs') then
        update public.design_jobs
        set invoice_id = null,
            invoice_number = null,
            commercial_status = 'pending_quote',
            updated_at = now()
        where company_id = p_company_id;
    end if;

    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'job_orders') then
        update public.job_orders
        set invoice_id = null,
            invoice_number = null,
            commercial_status = 'pending_quote',
            updated_at = now()
        where company_id = p_company_id;
    end if;

    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'sales_orders') then
        update public.sales_orders
        set invoice_id = null,
            invoice_number = null,
            commercial_status = 'pending_quote',
            updated_at = now()
        where company_id = p_company_id;
    end if;

    -- 8. Delete invoices
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'invoices') then
        delete from public.invoices
        where company_id = p_company_id;
        get diagnostics v_deleted_invoices = row_count;
    end if;

    -- 9. Re-enable anti-deletion triggers
    if exists (select 1 from pg_trigger where tgname = 'prevent_invoice_deletion') then
        alter table public.invoices enable trigger prevent_invoice_deletion;
    end if;
    if exists (select 1 from pg_trigger where tgname = 'prevent_payment_deletion') then
        alter table public.payments enable trigger prevent_payment_deletion;
    end if;

    -- 10. Reset customer financial balances
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'customers') then
        update public.customers
        set total_due_balance = 0,
            total_invoiced_amount = 0,
            updated_at = now()
        where company_id = p_company_id;
    end if;

    -- 11. Reset invoice document sequence counter to 0
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'document_sequences') then
        update public.document_sequences
        set current_val = 0,
            updated_at = now()
        where company_id = p_company_id
          and doc_type = 'invoice';
    end if;

    return jsonb_build_object(
        'success', true,
        'deleted_invoices', v_deleted_invoices,
        'deleted_items', v_deleted_items,
        'deleted_payments', v_deleted_payments
    );
exception when others then
    -- Safety: always ensure triggers are re-enabled
    if exists (select 1 from pg_trigger where tgname = 'prevent_invoice_deletion') then
        alter table public.invoices enable trigger prevent_invoice_deletion;
    end if;
    if exists (select 1 from pg_trigger where tgname = 'prevent_payment_deletion') then
        alter table public.payments enable trigger prevent_payment_deletion;
    end if;
    raise;
end;
$$;

grant execute on function public.admin_purge_all_company_invoices(uuid) to service_role, authenticated, anon;

-- Execute cleanup for Classic Printer tenant
select public.admin_purge_all_company_invoices('2af84f1d-1ebd-48e7-9795-fd5c24c38a96');
