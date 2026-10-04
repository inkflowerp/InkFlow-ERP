-- Migration 117: Drop 28 exact duplicate indexes (identical definitions)
-- Reduces write amplification, index maintenance overhead, and storage bloat.

DROP INDEX IF EXISTS public.idx_att_locations_active;
DROP INDEX IF EXISTS public.idx_audit_logs_comp_created;
DROP INDEX IF EXISTS public.idx_audit_logs_entity;
DROP INDEX IF EXISTS public.idx_challan_items_challan;
DROP INDEX IF EXISTS public.idx_customers_mobile;
DROP INDEX IF EXISTS public.idx_delivery_challans_customer;
DROP INDEX IF EXISTS public.idx_delivery_challans_status;
DROP INDEX IF EXISTS public.idx_design_jobs_status;
DROP INDEX IF EXISTS public.idx_employees_branch;
DROP INDEX IF EXISTS public.idx_employees_dept;
DROP INDEX IF EXISTS public.idx_employees_status;
ALTER TABLE public.gateway_transactions DROP CONSTRAINT IF EXISTS uq_gateway_transactions_internal_trx_id;
DROP INDEX IF EXISTS public.idx_inv_rolls_company_material;
DROP INDEX IF EXISTS public.idx_inv_rolls_company_status;
DROP INDEX IF EXISTS public.idx_invoice_items_invoice;
DROP INDEX IF EXISTS public.idx_invoices_comp_sales_order;
DROP INDEX IF EXISTS public.idx_job_orders_status;
DROP INDEX IF EXISTS public.idx_material_requests_status;
DROP INDEX IF EXISTS public.idx_production_tasks_operator;
DROP INDEX IF EXISTS public.idx_production_tasks_status;
DROP INDEX IF EXISTS public.idx_quotation_activities_quote_created;
DROP INDEX IF EXISTS public.idx_quotation_items_quote;
DROP INDEX IF EXISTS public.idx_sales_order_items_order;
DROP INDEX IF EXISTS public.idx_sales_orders_status;
DROP INDEX IF EXISTS public.idx_user_branch_access_bid;
DROP INDEX IF EXISTS public.idx_user_branch_access_uid;
DROP INDEX IF EXISTS public.idx_user_perm_overrides_cu;
DROP INDEX IF EXISTS public.idx_user_roles_comp_user;
