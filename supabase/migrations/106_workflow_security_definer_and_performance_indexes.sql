-- ==============================================================================
-- PrintERP SaaS - Migration 106: Workflow Security Definer Hardening & High-Volume Foreign Key Indexes
-- 1. Security Track (Section 80): Revoke unauthorized public/anon execution grants from
--    sensitive administrative purge and reset functions; ensure explicit search_path.
-- 2. Performance Track (Section 81): Add targeted, non-duplicate composite indexes on
--    high-volume workflow foreign keys (job_order_id, production_task_id, sales_order_id,
--    delivery, material_issue, material_request, company_id, branch_id).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SECURITY TRACK: REVOKE PUBLIC / ANON PRIVILEGES ON ADMINISTRATIVE PROCEDURES
-- ------------------------------------------------------------------------------

-- Purge company catalog and orders
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on p.pronamespace = n.oid
    where n.nspname = 'public' and p.proname = 'admin_purge_all_company_catalog_and_orders'
  ) then
    revoke execute on function public.admin_purge_all_company_catalog_and_orders(uuid) from anon, public;
    grant execute on function public.admin_purge_all_company_catalog_and_orders(uuid) to service_role;
    alter function public.admin_purge_all_company_catalog_and_orders(uuid) set search_path = public, pg_temp;
  end if;
end $$;

-- Purge company invoices
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on p.pronamespace = n.oid
    where n.nspname = 'public' and p.proname = 'admin_purge_all_company_invoices'
  ) then
    revoke execute on function public.admin_purge_all_company_invoices(uuid) from anon, public;
    grant execute on function public.admin_purge_all_company_invoices(uuid) to service_role;
    alter function public.admin_purge_all_company_invoices(uuid) set search_path = public, pg_temp;
  end if;
end $$;

-- Purge company customers and works
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on p.pronamespace = n.oid
    where n.nspname = 'public' and p.proname = 'admin_purge_all_company_customers_and_works'
  ) then
    revoke execute on function public.admin_purge_all_company_customers_and_works(uuid) from anon, public;
    grant execute on function public.admin_purge_all_company_customers_and_works(uuid) to service_role;
    alter function public.admin_purge_all_company_customers_and_works(uuid) set search_path = public, pg_temp;
  end if;
end $$;

-- ------------------------------------------------------------------------------
-- 2. PERFORMANCE TRACK: HIGH-VOLUME WORKFLOW FOREIGN KEY INDEXES
-- ------------------------------------------------------------------------------

-- Production Tasks Indexes
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'production_tasks') then
    create index if not exists idx_prod_tasks_company_job_order
      on public.production_tasks (company_id, job_order_id);

    create index if not exists idx_prod_tasks_company_status
      on public.production_tasks (company_id, status);

    create index if not exists idx_prod_tasks_company_machine_status
      on public.production_tasks (company_id, assigned_machine_id, status);

    create index if not exists idx_prod_tasks_company_operator
      on public.production_tasks (company_id, assigned_operator_id);
  end if;
end $$;

-- Job Orders Indexes
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'job_orders') then
    create index if not exists idx_job_orders_company_status
      on public.job_orders (company_id, status);

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'job_orders' and column_name = 'order_id') then
      create index if not exists idx_job_orders_company_order_id
        on public.job_orders (company_id, order_id);
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'job_orders' and column_name = 'sales_order_id') then
      create index if not exists idx_job_orders_company_sales_order
        on public.job_orders (company_id, sales_order_id);
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'job_orders' and column_name = 'job_number') then
      create index if not exists idx_job_orders_company_job_num
        on public.job_orders (company_id, job_number);
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'job_orders' and column_name = 'order_number') then
      create index if not exists idx_job_orders_company_order_num
        on public.job_orders (company_id, order_number);
    end if;
  end if;
end $$;

-- Sales Orders Indexes
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'sales_orders') then
    create index if not exists idx_sales_orders_company_customer
      on public.sales_orders (company_id, customer_id);

    create index if not exists idx_sales_orders_company_status
      on public.sales_orders (company_id, status);

    create index if not exists idx_sales_orders_company_order_num
      on public.sales_orders (company_id, order_number);
  end if;
end $$;

-- Design Jobs Indexes
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'design_jobs') then
    create index if not exists idx_design_jobs_company_job_order
      on public.design_jobs (company_id, job_order_id);

    create index if not exists idx_design_jobs_company_sales_order
      on public.design_jobs (company_id, sales_order_id);

    create index if not exists idx_design_jobs_company_status
      on public.design_jobs (company_id, status);
  end if;
end $$;

-- Delivery Challans & Items Indexes
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'delivery_challans') then
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'delivery_challans' and column_name = 'sales_order_id') then
      create index if not exists idx_challans_company_sales_order
        on public.delivery_challans (company_id, sales_order_id);
    end if;

    create index if not exists idx_challans_company_customer
      on public.delivery_challans (company_id, customer_id);

    create index if not exists idx_challans_company_status
      on public.delivery_challans (company_id, status);
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'challan_items') then
    create index if not exists idx_challan_items_challan_id
      on public.challan_items (challan_id);
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'delivery_challan_items') then
    create index if not exists idx_del_challan_items_challan_id
      on public.delivery_challan_items (challan_id);
  end if;
end $$;

-- Material Requests & Issues Indexes (if tables and columns exist)
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'material_requests') then
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'material_requests' and column_name = 'job_order_id') then
      create index if not exists idx_mat_reqs_company_job_order
        on public.material_requests (company_id, job_order_id);
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'material_requests' and column_name = 'status') then
      create index if not exists idx_mat_reqs_company_status
        on public.material_requests (company_id, status);
    end if;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'material_request_items') then
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'material_request_items' and column_name = 'material_id') then
      create index if not exists idx_mat_req_items_comp_mat
        on public.material_request_items (company_id, material_id);
    end if;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'material_issues') then
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'material_issues' and column_name = 'job_order_id') then
      create index if not exists idx_mat_issues_company_job_order
        on public.material_issues (company_id, job_order_id);
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'material_issues' and column_name = 'material_id') then
      create index if not exists idx_mat_issues_company_material
        on public.material_issues (company_id, material_id);
    end if;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'material_issue_items') then
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'material_issue_items' and column_name = 'material_id') then
      create index if not exists idx_mat_issue_items_comp_mat
        on public.material_issue_items (company_id, material_id);
    end if;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'inventory_rolls') then
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'inventory_rolls' and column_name = 'company_id') then
      if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'inventory_rolls' and column_name = 'material_id') then
        create index if not exists idx_inv_rolls_company_material
          on public.inventory_rolls (company_id, material_id);
      end if;
      if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'inventory_rolls' and column_name = 'status') then
        create index if not exists idx_inv_rolls_company_status
          on public.inventory_rolls (company_id, status);
      end if;
    else
      if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'inventory_rolls' and column_name = 'material_id') then
        create index if not exists idx_inv_rolls_mat_only
          on public.inventory_rolls (material_id);
      end if;
    end if;
  end if;
end $$;
