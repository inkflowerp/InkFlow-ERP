-- ==============================================================================
-- PrintERP SaaS - Migration 100: Administrative Purge of Products, Invoices, Quotations & Works
-- Allows secure, atomic cleanup of products, catalog, invoices, quotations, work orders,
-- job orders, design jobs, production jobs/tasks, and resets sequence counters.
-- ==============================================================================

create or replace function public.admin_purge_all_company_catalog_and_orders(
    p_company_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_deleted_products integer := 0;
    v_deleted_invoices integer := 0;
    v_deleted_quotations integer := 0;
    v_deleted_orders integer := 0;
    v_deleted_designs integer := 0;
    v_deleted_prod_jobs integer := 0;
    v_deleted_prod_tasks integer := 0;
begin
    -- 1. Disable anti-deletion triggers temporarily for this transaction
    if exists (select 1 from pg_trigger where tgname = 'prevent_invoice_deletion') then
        alter table public.invoices disable trigger prevent_invoice_deletion;
    end if;
    if exists (select 1 from pg_trigger where tgname = 'prevent_payment_deletion') then
        alter table public.payments disable trigger prevent_payment_deletion;
    end if;

    -- 2. Delete Invoice Requests
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'invoice_requests') then
        delete from public.invoice_requests
        where company_id = p_company_id;
    end if;

    -- 3. Delete Delivery Challan Items & Challans
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'delivery_challan_items') then
        delete from public.delivery_challan_items
        where challan_id in (select id from public.delivery_challans where company_id = p_company_id);
    end if;

    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'delivery_challans') then
        delete from public.delivery_challans
        where company_id = p_company_id;
    end if;

    -- 4. Delete Production Tasks, Reworks & Jobs
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

    -- 5. Delete Design Versions & Jobs
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'design_versions') then
        delete from public.design_versions
        where design_job_id in (select id from public.design_jobs where company_id = p_company_id);
    end if;

    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'design_jobs') then
        delete from public.design_jobs
        where company_id = p_company_id;
        get diagnostics v_deleted_designs = row_count;
    end if;

    -- 6. Delete Job Orders
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'job_orders') then
        delete from public.job_orders
        where company_id = p_company_id;
    end if;

    -- 7. Delete Order Timeline Events, Sales Order Items & Sales Orders (Works)
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

    -- 8. Delete Financial Write-Offs, Allocations, Payments, Invoice Items & Invoices
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'financial_write_offs') then
        delete from public.financial_write_offs
        where invoice_id in (select id from public.invoices where company_id = p_company_id);
    end if;

    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'payment_allocations') then
        delete from public.payment_allocations
        where invoice_id in (select id from public.invoices where company_id = p_company_id)
           or payment_id in (select id from public.payments where company_id = p_company_id);
    end if;

    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'payments') then
        delete from public.payments
        where company_id = p_company_id;
    end if;

    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'invoice_items') then
        delete from public.invoice_items
        where invoice_id in (select id from public.invoices where company_id = p_company_id);
    end if;

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

    -- 10. Delete Quotation Items & Quotations
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'quotation_items') then
        delete from public.quotation_items
        where quotation_id in (select id from public.quotations where company_id = p_company_id);
    end if;

    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'quotations') then
        delete from public.quotations
        where company_id = p_company_id;
        get diagnostics v_deleted_quotations = row_count;
    end if;

    -- 11. Delete Inventory, Stock & Wastages linked to materials / products
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'stock_ledger') then
        delete from public.stock_ledger
        where company_id = p_company_id;
    end if;

    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'inventory_rolls') then
        delete from public.inventory_rolls
        where company_id = p_company_id;
    end if;

    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'material_wastages') then
        delete from public.material_wastages
        where company_id = p_company_id;
    end if;

    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'product_price_history') then
        delete from public.product_price_history
        where company_id = p_company_id;
    end if;

    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'supplier_material_prices') then
        delete from public.supplier_material_prices
        where company_id = p_company_id;
    end if;

    -- 12. Delete Materials, Products & Product Categories
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'materials') then
        delete from public.materials
        where company_id = p_company_id;
    end if;

    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'products') then
        delete from public.products
        where company_id = p_company_id;
        get diagnostics v_deleted_products = row_count;
    end if;

    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'product_categories') then
        delete from public.product_categories
        where company_id = p_company_id;
    end if;

    -- 13. Delete Printing Methods, Finishing Options, Additional Options & Installation Options
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'printing_methods') then
        delete from public.printing_methods
        where company_id = p_company_id;
    end if;

    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'finishing_options') then
        delete from public.finishing_options
        where company_id = p_company_id;
    end if;

    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'additional_options') then
        delete from public.additional_options
        where company_id = p_company_id;
    end if;

    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'installation_options') then
        delete from public.installation_options
        where company_id = p_company_id;
    end if;

    -- 14. Reset customer financial balances
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'customers') then
        update public.customers
        set total_due_balance = 0,
            total_invoiced_amount = 0,
            updated_at = now()
        where company_id = p_company_id;
    end if;

    -- 14. Reset document sequence counters to 0
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'document_sequences') then
        update public.document_sequences
        set current_val = 0,
            updated_at = now()
        where company_id = p_company_id
          and doc_type in ('invoice', 'quotation', 'order', 'job_order', 'design', 'production', 'challan');
    end if;

    return jsonb_build_object(
        'success', true,
        'deleted_products', v_deleted_products,
        'deleted_invoices', v_deleted_invoices,
        'deleted_quotations', v_deleted_quotations,
        'deleted_orders', v_deleted_orders,
        'deleted_designs', v_deleted_designs,
        'deleted_prod_jobs', v_deleted_prod_jobs,
        'deleted_prod_tasks', v_deleted_prod_tasks
    );
exception when others then
    -- Safety: always ensure triggers are re-enabled on exception
    if exists (select 1 from pg_trigger where tgname = 'prevent_invoice_deletion') then
        alter table public.invoices enable trigger prevent_invoice_deletion;
    end if;
    if exists (select 1 from pg_trigger where tgname = 'prevent_payment_deletion') then
        alter table public.payments enable trigger prevent_payment_deletion;
    end if;
    raise;
end;
$$;

grant execute on function public.admin_purge_all_company_catalog_and_orders(uuid) to service_role, authenticated, anon;
