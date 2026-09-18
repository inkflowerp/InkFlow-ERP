-- ==============================================================================
-- PrintERP SaaS - Migration 093: Permanent Tenant Deletion & Cascade Architecture
-- Authoritative, atomic server-side PostgreSQL permanent deletion
-- Function: public.delete_tenant_permanently(p_company_id, p_admin_id, p_reason)
-- ==============================================================================

-- 1. Verify schema prerequisites
do $$
begin
    raise notice 'PrintERP Permanent Deletion Migration 093 executing.';
end $$;

-- 2. Master Atomic Deletion Function
create or replace function public.delete_tenant_permanently(
    p_company_id uuid,
    p_admin_id uuid default null,
    p_reason text default 'Company permanently deleted by platform administrator'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_company_name text;
    v_company_slug text;
    v_deleted_counts jsonb := '{}'::jsonb;
    v_count integer;
    v_caller_role text;
begin
    -- 1. CRITICAL SECURITY GUARD: Caller MUST be a verified Platform Owner, Platform Admin, or Service Role
    v_caller_role := current_setting('role', true);
    if v_caller_role != 'service_role' and v_caller_role != 'postgres' then
        if auth.uid() is null or not exists (
            select 1 from public.platform_admins
            where user_id = auth.uid()
              and is_active = true
              and role in ('platform_owner', 'platform_admin')
        ) then
            raise exception 'Access Denied: Platform Owner or Platform Admin privileges required to permanently delete a tenant organization.';
        end if;
    end if;

    -- 2. Validate Target Company
    select name, slug into v_company_name, v_company_slug
    from public.companies
    where id = p_company_id;

    if not found then
        return jsonb_build_object(
            'success', false,
            'error', format('Company with ID %s does not exist or has already been deleted.', p_company_id)
        );
    end if;

    -- 3. Comprehensive Reverse-Topological Cascade Deletion across ALL Tenant Domains

    -- A. Support & Chat Sessions
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'support_attachments') then
        delete from public.support_attachments where message_id in (
            select id from public.support_messages where conversation_id in (
                select id from public.support_conversations where company_id = p_company_id
            )
        );
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'support_messages') then
        delete from public.support_messages where conversation_id in (select id from public.support_conversations where company_id = p_company_id);
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'support_conversations') then
        delete from public.support_conversations where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'platform_support_sessions') then
        delete from public.platform_support_sessions where company_id = p_company_id;
    end if;

    -- B. SaaS Subscriptions, Invoices & Gateways
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'saas_subscription_invoice_items') then
        delete from public.saas_subscription_invoice_items where invoice_id in (select id from public.saas_subscription_invoices where company_id = p_company_id);
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'saas_subscription_invoices') then
        delete from public.saas_subscription_invoices where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'saas_tenant_storage_usage') then
        delete from public.saas_tenant_storage_usage where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'platform_tenant_feature_flags') then
        delete from public.platform_tenant_feature_flags where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'platform_subscription_events') then
        delete from public.platform_subscription_events where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'platform_subscriptions') then
        delete from public.platform_subscriptions where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'subscription_events') then
        delete from public.subscription_events where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'gateway_webhooks') then
        delete from public.gateway_webhooks where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'gateway_audit_logs') then
        delete from public.gateway_audit_logs where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'gateway_transactions') then
        delete from public.gateway_transactions where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'gateway_integrations') then
        delete from public.gateway_integrations where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'saas_invoices') then
        delete from public.saas_invoices where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'billing_history') then
        delete from public.billing_history where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'company_subscriptions') then
        delete from public.company_subscriptions where company_id = p_company_id;
    end if;

    -- C. Workflows & Automations
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'workflow_execution_logs') then
        delete from public.workflow_execution_logs where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'workflow_rules') then
        delete from public.workflow_rules where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'workflow_configurations') then
        delete from public.workflow_configurations where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'automation_rules') then
        delete from public.automation_rules where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'saved_views') then
        delete from public.saved_views where company_id = p_company_id;
    end if;

    -- D. Communications & Devices
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'email_logs') then
        delete from public.email_logs where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'email_queue') then
        delete from public.email_queue where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'email_templates') then
        delete from public.email_templates where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'communication_messages') then
        delete from public.communication_messages where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'communication_logs') then
        delete from public.communication_logs where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'communication_templates') then
        delete from public.communication_templates where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'communication_channels_config') then
        delete from public.communication_channels_config where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'message_templates') then
        delete from public.message_templates where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'in_app_notifications') then
        delete from public.in_app_notifications where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'tenant_email_configs') then
        delete from public.tenant_email_configs where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'email_gateways') then
        delete from public.email_gateways where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'sms_gateways') then
        delete from public.sms_gateways where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'client_devices') then
        delete from public.client_devices where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'sync_outbox') then
        delete from public.sync_outbox where company_id = p_company_id;
    end if;

    -- E. Workforce, Shifts, Attendance & Payroll
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'workforce_audit_logs') then
        delete from public.workforce_audit_logs where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'daily_labor_logs') then
        delete from public.daily_labor_logs where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'salary_payments') then
        delete from public.salary_payments where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'payroll_items') then
        delete from public.payroll_items where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'payroll_periods') then
        delete from public.payroll_periods where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'salary_advances') then
        delete from public.salary_advances where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'overtime_records') then
        delete from public.overtime_records where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'attendance_audit_logs') then
        delete from public.attendance_audit_logs where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'attendance_corrections') then
        delete from public.attendance_corrections where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'attendance_qr_tokens') then
        delete from public.attendance_qr_tokens where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'attendance_daily_summaries') then
        delete from public.attendance_daily_summaries where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'attendance_records') then
        delete from public.attendance_records where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'attendance_locations') then
        delete from public.attendance_locations where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'attendances') then
        delete from public.attendances where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'employee_shifts') then
        delete from public.employee_shifts where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'shifts') then
        delete from public.shifts where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'employee_branch_assignments') then
        delete from public.employee_branch_assignments where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'employees') then
        get diagnostics v_count = row_count;
        delete from public.employees where company_id = p_company_id;
        v_deleted_counts := jsonb_set(v_deleted_counts, '{employees}', to_jsonb(v_count));
    end if;

    -- F. Logistics & Delivery
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'installations') then
        delete from public.installations where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'delivery_challan_items') then
        delete from public.delivery_challan_items where challan_id in (select id from public.delivery_challans where company_id = p_company_id);
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'challan_items') then
        delete from public.challan_items where challan_id in (select id from public.delivery_challans where company_id = p_company_id);
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'delivery_challans') then
        delete from public.delivery_challans where company_id = p_company_id;
    end if;

    -- G. Invoicing, Payments, Accounting Ledgers & Tax
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'tax_transaction_lines') then
        delete from public.tax_transaction_lines where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'tax_profiles') then
        delete from public.tax_profiles where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'financial_write_offs') then
        delete from public.financial_write_offs where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'payment_adjustments') then
        delete from public.payment_adjustments where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'payment_allocations') then
        delete from public.payment_allocations where payment_id in (select id from public.payments where company_id = p_company_id);
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'payments') then
        delete from public.payments where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'invoice_items') then
        delete from public.invoice_items where invoice_id in (select id from public.invoices where company_id = p_company_id);
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'invoices') then
        get diagnostics v_count = row_count;
        delete from public.invoices where company_id = p_company_id;
        v_deleted_counts := jsonb_set(v_deleted_counts, '{invoices}', to_jsonb(v_count));
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'journal_entry_lines') then
        delete from public.journal_entry_lines where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'financial_transactions') then
        delete from public.financial_transactions where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'cash_book_entries') then
        delete from public.cash_book_entries where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'cash_closings') then
        delete from public.cash_closings where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'account_transfers') then
        delete from public.account_transfers where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'inter_branch_financial_transfers') then
        delete from public.inter_branch_financial_transfers where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'bank_statement_lines') then
        delete from public.bank_statement_lines where statement_id in (select id from public.bank_statements where company_id = p_company_id);
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'bank_statements') then
        delete from public.bank_statements where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'bank_accounts') then
        delete from public.bank_accounts where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'expenses') then
        delete from public.expenses where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'financial_periods') then
        delete from public.financial_periods where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'accounts') then
        delete from public.accounts where company_id = p_company_id;
    end if;

    -- H. Purchasing, GRN & Suppliers
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'supplier_ledger_entries') then
        delete from public.supplier_ledger_entries where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'supplier_payments') then
        delete from public.supplier_payments where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'supplier_return_items') then
        delete from public.supplier_return_items where return_id in (select id from public.supplier_returns where company_id = p_company_id);
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'supplier_returns') then
        delete from public.supplier_returns where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'goods_received_note_items') then
        delete from public.goods_received_note_items where grn_id in (select id from public.goods_received_notes where company_id = p_company_id);
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'goods_received_notes') then
        delete from public.goods_received_notes where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'purchase_order_items') then
        delete from public.purchase_order_items where purchase_order_id in (select id from public.purchase_orders where company_id = p_company_id);
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'purchase_orders') then
        delete from public.purchase_orders where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'purchase_request_items') then
        delete from public.purchase_request_items where request_id in (select id from public.purchase_requests where company_id = p_company_id);
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'purchase_requests') then
        delete from public.purchase_requests where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'product_supplier_prices') then
        delete from public.product_supplier_prices where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'supplier_price_history') then
        delete from public.supplier_price_history where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'supplier_material_prices') then
        delete from public.supplier_material_prices where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'supplier_items') then
        delete from public.supplier_items where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'suppliers') then
        delete from public.suppliers where company_id = p_company_id;
    end if;

    -- I. Inventory & Materials
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'material_issue_items') then
        delete from public.material_issue_items where issue_id in (select id from public.material_issues where company_id = p_company_id);
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'material_issues') then
        delete from public.material_issues where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'material_request_items') then
        delete from public.material_request_items where request_id in (select id from public.material_requests where company_id = p_company_id);
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'material_requests') then
        delete from public.material_requests where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'inventory_transfers') then
        delete from public.inventory_transfers where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'inventory_adjustments') then
        delete from public.inventory_adjustments where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'inventory_remnants') then
        delete from public.inventory_remnants where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'material_wastages') then
        delete from public.material_wastages where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'mounted_rolls') then
        delete from public.mounted_rolls where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'inventory_rolls') then
        delete from public.inventory_rolls where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'paper_stocks') then
        delete from public.paper_stocks where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'stock_ledger') then
        delete from public.stock_ledger where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'inventory_stock_balances') then
        delete from public.inventory_stock_balances where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'inventory_locations') then
        delete from public.inventory_locations where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'materials') then
        delete from public.materials where company_id = p_company_id;
    end if;

    -- J. Production & Machineries
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'production_problem_reports') then
        delete from public.production_problem_reports where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'machinery_breakdowns') then
        delete from public.machinery_breakdowns where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'machinery_maintenances') then
        delete from public.machinery_maintenances where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'machinery_assignments') then
        delete from public.machinery_assignments where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'machineries') then
        delete from public.machineries where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'machine_profiles') then
        delete from public.machine_profiles where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'production_task_material_requirements') then
        delete from public.production_task_material_requirements where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'production_tasks') then
        delete from public.production_tasks where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'production_reworks') then
        delete from public.production_reworks where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'operator_jobs') then
        delete from public.operator_jobs where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'job_costings') then
        delete from public.job_costings where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'production_jobs') then
        delete from public.production_jobs where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'job_orders') then
        delete from public.job_orders where company_id = p_company_id;
    end if;

    -- K. Design Management
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'design_feedback_logs') then
        delete from public.design_feedback_logs where job_id in (select id from public.design_jobs where company_id = p_company_id);
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'design_versions') then
        delete from public.design_versions where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'design_jobs') then
        delete from public.design_jobs where company_id = p_company_id;
    end if;

    -- L. Orders, Quotations & CRM
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'order_timeline_events') then
        delete from public.order_timeline_events where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'sales_order_items') then
        delete from public.sales_order_items where order_id in (select id from public.sales_orders where company_id = p_company_id);
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'order_items') then
        delete from public.order_items where order_id in (select id from public.sales_orders where company_id = p_company_id);
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'sales_orders') then
        delete from public.sales_orders where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'quotation_activities') then
        delete from public.quotation_activities where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'quotation_items') then
        delete from public.quotation_items where quotation_id in (select id from public.quotations where company_id = p_company_id);
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'quotations') then
        delete from public.quotations where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'customer_communications') then
        delete from public.customer_communications where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'customer_rates') then
        delete from public.customer_rates where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'customers') then
        get diagnostics v_count = row_count;
        delete from public.customers where company_id = p_company_id;
        v_deleted_counts := jsonb_set(v_deleted_counts, '{customers}', to_jsonb(v_count));
    end if;

    -- M. Products, Pricing Engine & Composable Masters
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'pricing_rules') then
        delete from public.pricing_rules where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'price_overrides') then
        delete from public.price_overrides where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'price_list_items') then
        delete from public.price_list_items where list_id in (select id from public.price_lists where company_id = p_company_id);
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'price_lists') then
        delete from public.price_lists where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'product_formulas') then
        delete from public.product_formulas where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'product_variants') then
        delete from public.product_variants where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'product_price_history') then
        delete from public.product_price_history where product_id in (select id from public.products where company_id = p_company_id);
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'price_history') then
        delete from public.price_history where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'installation_options') then
        delete from public.installation_options where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'additional_options') then
        delete from public.additional_options where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'finishing_options') then
        delete from public.finishing_options where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'material_purchase_configs') then
        delete from public.material_purchase_configs where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'printing_methods') then
        delete from public.printing_methods where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'product_categories') then
        delete from public.product_categories where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'products') then
        get diagnostics v_count = row_count;
        delete from public.products where company_id = p_company_id;
        v_deleted_counts := jsonb_set(v_deleted_counts, '{products}', to_jsonb(v_count));
    end if;

    -- N. Settings & Numbering Configs
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'document_sequences') then
        delete from public.document_sequences where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'document_number_counters') then
        delete from public.document_number_counters where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'document_numbering_configs') then
        delete from public.document_numbering_configs where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'document_templates_config') then
        delete from public.document_templates_config where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'branding_settings') then
        delete from public.branding_settings where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'company_tax_settings') then
        delete from public.company_tax_settings where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'company_settings') then
        delete from public.company_settings where company_id = p_company_id;
    end if;

    -- O. Multi-Branch & Transfers
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'branch_transfer_requests') then
        delete from public.branch_transfer_requests where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'branch_transfers') then
        delete from public.branch_transfers where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'branches') then
        delete from public.branches where company_id = p_company_id;
    end if;

    -- P. RBAC & Memberships
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'user_branch_access') then
        delete from public.user_branch_access where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'user_permission_overrides') then
        delete from public.user_permission_overrides where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'user_roles') then
        delete from public.user_roles where company_user_id in (select id from public.company_users where company_id = p_company_id);
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'company_users') then
        delete from public.company_users where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'tenant_memberships') then
        delete from public.tenant_memberships where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'role_permissions') then
        delete from public.role_permissions where role_id in (select id from public.roles where company_id = p_company_id);
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'roles') then
        delete from public.roles where company_id = p_company_id;
    end if;

    -- Q. Company-scoped Audit Logs
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'audit_logs') then
        delete from public.audit_logs where company_id = p_company_id;
    end if;

    -- R. Platform Telemetry & Notifications
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'platform_tenant_exports') then
        delete from public.platform_tenant_exports where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'platform_notifications') then
        delete from public.platform_notifications where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'platform_background_jobs') then
        delete from public.platform_background_jobs where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'platform_system_health_events') then
        delete from public.platform_system_health_events where company_id = p_company_id;
    end if;
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'platform_companies') then
        delete from public.platform_companies where id = p_company_id;
    end if;

    -- 4. FINAL STEP: Physical Deletion of the Company record
    delete from public.companies where id = p_company_id;

    -- 5. Record Administrative Security Audit Log in Platform Root Audit (Minimal metadata only, zero business data)
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'platform_audit_logs') then
        insert into public.platform_audit_logs (
            platform_admin_id,
            actor_email,
            action,
            entity_type,
            entity_id,
            target_company_id,
            details
        ) values (
            p_admin_id,
            'platform-admin@printerp.com.bd',
            'company.permanent_delete',
            'company',
            p_company_id::text,
            null,
            jsonb_build_object(
                'deleted_company_name', v_company_name,
                'deleted_company_slug', v_company_slug,
                'deleted_by_admin_id', p_admin_id,
                'reason', p_reason,
                'timestamp', now()
            )
        );
    end if;

    return jsonb_build_object(
        'success', true,
        'company_id', p_company_id,
        'company_name', v_company_name,
        'company_slug', v_company_slug,
        'deleted_counts', v_deleted_counts,
        'message', format('Tenant "%s" (%s) and all dependent operational records have been permanently deleted.', v_company_name, v_company_slug)
    );
end;
$$;

-- Grant execution ONLY to service_role and restrict from public
revoke execute on function public.delete_tenant_permanently(uuid, uuid, text) from public;
revoke execute on function public.delete_tenant_permanently(uuid, uuid, text) from authenticated;
grant execute on function public.delete_tenant_permanently(uuid, uuid, text) to service_role;
