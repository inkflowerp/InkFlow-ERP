-- ==============================================================================
-- PrintERP SaaS - Migration 097: Administrative Purge of Customers, Invoice Requests & Work Orders
-- Allows secure, atomic cleanup of customers, work orders, design jobs, production jobs, and reset sequences
-- ==============================================================================

create or replace function public.admin_purge_all_company_operational_data(
    p_company_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_deleted_customers integer := 0;
    v_deleted_requests integer := 0;
    v_deleted_orders integer := 0;
    v_deleted_job_orders integer := 0;
    v_deleted_designs integer := 0;
    v_deleted_prod_jobs integer := 0;
    v_deleted_prod_tasks integer := 0;
begin
    -- 1. Delete Invoice Requests
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'invoice_requests') then
        delete from public.invoice_requests
        where company_id = p_company_id;
        get diagnostics v_deleted_requests = row_count;
    end if;

    -- 2. Delete Production Tasks & Jobs
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'production_tasks') then
        delete from public.production_tasks
        where company_id = p_company_id;
        get diagnostics v_deleted_prod_tasks = row_count;
    end if;

    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'production_reworks') then
        delete from public.production_reworks
        where production_job_id in (select id from public.production_jobs where company_id = p_company_id);
    end if;

    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'production_jobs') then
        delete from public.production_jobs
        where company_id = p_company_id;
        get diagnostics v_deleted_prod_jobs = row_count;
    end if;

    -- 3. Delete Design Versions & Jobs
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'design_versions') then
        delete from public.design_versions
        where design_job_id in (select id from public.design_jobs where company_id = p_company_id);
    end if;

    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'design_jobs') then
        delete from public.design_jobs
        where company_id = p_company_id;
        get diagnostics v_deleted_designs = row_count;
    end if;

    -- 4. Delete Delivery Challan Items & Challans
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'delivery_challan_items') then
        delete from public.delivery_challan_items
        where challan_id in (select id from public.delivery_challans where company_id = p_company_id);
    end if;

    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'delivery_challans') then
        delete from public.delivery_challans
        where company_id = p_company_id;
    end if;

    -- 5. Delete Job Orders
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'job_orders') then
        delete from public.job_orders
        where company_id = p_company_id;
        get diagnostics v_deleted_job_orders = row_count;
    end if;

    -- 6. Delete Order Timeline Events, Sales Order Items & Sales Orders (Work Orders)
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'order_timeline_events') then
        delete from public.order_timeline_events
        where order_id in (select id from public.sales_orders where company_id = p_company_id);
    end if;

    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'sales_order_items') then
        delete from public.sales_order_items
        where order_id in (select id from public.sales_orders where company_id = p_company_id);
    end if;

    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'sales_orders') then
        delete from public.sales_orders
        where company_id = p_company_id;
        get diagnostics v_deleted_orders = row_count;
    end if;

    -- 7. Delete Quotation Items & Quotations
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'quotation_items') then
        delete from public.quotation_items
        where quotation_id in (select id from public.quotations where company_id = p_company_id);
    end if;

    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'quotations') then
        delete from public.quotations
        where company_id = p_company_id;
    end if;

    -- 8. Delete Customer Rates & Customers
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'customer_rates') then
        delete from public.customer_rates
        where company_id = p_company_id;
    end if;

    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'customers') then
        delete from public.customers
        where company_id = p_company_id;
        get diagnostics v_deleted_customers = row_count;
    end if;

    -- 9. Reset all document sequence counters to 0
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'document_sequences') then
        update public.document_sequences
        set current_val = 0,
            updated_at = now()
        where company_id = p_company_id;
    end if;

    return jsonb_build_object(
        'success', true,
        'deleted_customers', v_deleted_customers,
        'deleted_requests', v_deleted_requests,
        'deleted_orders', v_deleted_orders,
        'deleted_job_orders', v_deleted_job_orders,
        'deleted_designs', v_deleted_designs,
        'deleted_prod_jobs', v_deleted_prod_jobs,
        'deleted_prod_tasks', v_deleted_prod_tasks
    );
end;
$$;

grant execute on function public.admin_purge_all_company_operational_data(uuid) to service_role, authenticated, anon;

-- Execute cleanup for Classic Printer tenant
select public.admin_purge_all_company_operational_data('2af84f1d-1ebd-48e7-9795-fd5c24c38a96');
