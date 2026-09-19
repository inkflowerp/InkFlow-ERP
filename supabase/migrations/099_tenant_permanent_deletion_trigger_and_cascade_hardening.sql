-- ==============================================================================
-- InkFlow SaaS - Migration 099: Tenant Permanent Deletion Trigger & Cascade Hardening
-- Ensures anti-mutation triggers permit platform admin permanent deletions,
-- and updates delete_tenant_permanently RPC to safely resolve all columns dynamically.
-- ==============================================================================

-- 1. HARDEN AUDIT LOG ANTI-MUTATION TRIGGER
CREATE OR REPLACE FUNCTION public.trg_prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
    -- Permit deletion during platform tenant purging or service_role operations
    IF current_setting('app.is_deleting_tenant', true) = 'true' 
       OR current_setting('role', true) IN ('service_role', 'postgres') THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        ELSE
            RETURN NEW;
        END IF;
    END IF;

    RAISE EXCEPTION 'Data Integrity Violation: Audit log records are immutable and cannot be modified or deleted.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. HARDEN FINANCIAL ANTI-DELETION TRIGGER (Invoices, Payments, Expenses)
CREATE OR REPLACE FUNCTION public.trg_prevent_financial_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Permit deletion during platform tenant purging or service_role operations
    IF current_setting('app.is_deleting_tenant', true) = 'true' 
       OR current_setting('role', true) IN ('service_role', 'postgres') THEN
        RETURN OLD;
    END IF;

    RAISE EXCEPTION 'Financial Integrity Rule: Deletion of financial records is prohibited. Use void, cancel, reverse, or adjust workflows.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. MASTER ATOMIC DELETION FUNCTION HARDENING
CREATE OR REPLACE FUNCTION public.delete_tenant_permanently(
    p_company_id UUID,
    p_admin_id UUID DEFAULT NULL,
    p_reason TEXT DEFAULT 'Company permanently deleted by platform administrator'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_company_name TEXT;
    v_company_slug TEXT;
    v_caller_role TEXT;
    v_child_tables TEXT[] := ARRAY[
        -- Support & Chat Sessions
        'support_attachments',
        'support_messages',
        'support_conversations',
        'platform_support_sessions',
        -- Subscriptions & Invoicing
        'saas_subscription_invoice_items',
        'saas_subscription_invoices',
        'saas_tenant_storage_usage',
        'platform_tenant_feature_flags',
        'platform_subscription_events',
        'platform_subscriptions',
        'subscription_events',
        'gateway_webhooks',
        'gateway_audit_logs',
        'gateway_transactions',
        'gateway_integrations',
        'saas_invoices',
        'billing_history',
        'company_subscriptions',
        -- Workflows & Automations
        'workflow_execution_logs',
        'workflow_rules',
        'workflow_configurations',
        'automation_rules',
        'saved_views',
        -- Communications & Gateways
        'email_logs',
        'email_queue',
        'email_templates',
        'communication_messages',
        'communication_logs',
        'communication_templates',
        'communication_channels_config',
        'message_templates',
        'in_app_notifications',
        'tenant_email_configs',
        'email_gateways',
        'sms_gateways',
        'client_devices',
        'sync_outbox',
        -- Workforce & Payroll
        'workforce_audit_logs',
        'daily_labor_logs',
        'salary_payments',
        'payroll_items',
        'payroll_periods',
        'salary_advances',
        'overtime_records',
        'attendance_audit_logs',
        'attendance_corrections',
        'attendance_qr_tokens',
        'attendance_daily_summaries',
        'attendance_records',
        'attendance_locations',
        'attendances',
        'employee_shifts',
        'shifts',
        'employees',
        -- Finance, Banking & Ledger
        'tax_transaction_lines',
        'tax_profiles',
        'financial_write_offs',
        'payment_adjustments',
        'payment_allocations',
        'payments',
        'invoice_requests',
        'invoice_items',
        'invoices',
        'expenses',
        'bank_statement_lines',
        'bank_statements',
        'bank_accounts',
        'cash_book_entries',
        'cash_closings',
        'account_transfers',
        'inter_branch_financial_transfers',
        'journal_entry_lines',
        'financial_transactions',
        'accounts',
        'financial_periods',
        -- Design & Prepress
        'design_feedback_logs',
        'design_versions',
        'design_jobs',
        -- Production & Machine Floor
        'production_problem_reports',
        'production_task_material_requirements',
        'production_tasks',
        'production_reworks',
        'production_jobs',
        'operator_jobs',
        'job_costings',
        'machinery_breakdowns',
        'machinery_maintenances',
        'machinery_assignments',
        'machineries',
        'machine_profiles',
        -- Inventory & Materials
        'material_wastages',
        'mounted_rolls',
        'inventory_remnants',
        'inventory_transfers',
        'inventory_adjustments',
        'material_requests',
        'material_request_items',
        'material_issues',
        'material_issue_items',
        'goods_received_note_items',
        'goods_received_notes',
        'purchase_request_items',
        'purchase_requests',
        'purchase_order_items',
        'purchase_orders',
        'materials',
        'paper_stocks',
        'stock_ledger',
        'inventory_stock_balances',
        'inventory_locations',
        'inventory_rolls',
        -- Sales, Quotations & Deliveries
        'delivery_challan_items',
        'challan_items',
        'delivery_challans',
        'installations',
        'order_timeline_events',
        'sales_order_items',
        'order_items',
        'job_orders',
        'sales_orders',
        'quotation_activities',
        'quotation_items',
        'quotations',
        -- Pricing & Catalog
        'price_overrides',
        'pricing_rules',
        'price_list_items',
        'price_lists',
        'product_formulas',
        'product_variants',
        'product_price_history',
        'price_history',
        'product_supplier_prices',
        'installation_options',
        'additional_options',
        'finishing_options',
        'material_purchase_configs',
        'printing_methods',
        'product_categories',
        'products',
        -- CRM & Suppliers
        'supplier_material_prices',
        'supplier_price_history',
        'supplier_items',
        'supplier_ledger_entries',
        'supplier_payments',
        'supplier_return_items',
        'supplier_returns',
        'suppliers',
        'customer_communications',
        'customer_rates',
        'customers',
        -- Tenant Config & Sequences
        'document_sequences',
        'document_number_counters',
        'document_numbering_configs',
        'document_templates_config',
        'branding_settings',
        'company_tax_settings',
        'tenant_domains',
        'company_settings',
        -- Branch & Users
        'branch_transfer_requests',
        'branch_transfers',
        'employee_branch_assignments',
        'branches',
        'user_branch_access',
        'user_permission_overrides',
        'user_roles',
        'company_users',
        'tenant_memberships',
        'role_permissions',
        'roles',
        'audit_logs',
        'platform_tenant_exports',
        'platform_notifications',
        'platform_background_jobs',
        'platform_system_health_events',
        'platform_companies'
    ];
    v_table TEXT;
BEGIN
    -- 1. Security Check: Caller must be service_role, postgres, or an active platform admin
    v_caller_role := current_setting('role', true);
    IF v_caller_role != 'service_role' AND v_caller_role != 'postgres' THEN
        IF auth.uid() IS NULL OR NOT EXISTS (
            SELECT 1 FROM public.platform_admins
            WHERE user_id = auth.uid()
              AND is_active = true
              AND role IN ('platform_owner', 'platform_admin')
        ) THEN
            RAISE EXCEPTION 'Access Denied: Platform Owner or Platform Admin privileges required to permanently delete a tenant organization.';
        END IF;
    END IF;

    -- 2. Validate Target Company
    SELECT name, slug INTO v_company_name, v_company_slug
    FROM public.companies
    WHERE id = p_company_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', format('Company with ID %s does not exist or has already been deleted.', p_company_id)
        );
    END IF;

    -- 3. Enable Deletion Bypass for Anti-Mutation Triggers
    PERFORM set_config('app.is_deleting_tenant', 'true', true);

    -- 4. Dynamic Cascade Cleanup across All Child Tables
    FOREACH v_table IN ARRAY v_child_tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = v_table) THEN
            -- Delete by company_id if column exists
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = v_table AND column_name = 'company_id') THEN
                EXECUTE format('DELETE FROM public.%I WHERE company_id = $1', v_table) USING p_company_id;
            END IF;

            -- Delete by tenant_id if column exists
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = v_table AND column_name = 'tenant_id') THEN
                EXECUTE format('DELETE FROM public.%I WHERE tenant_id = $1', v_table) USING p_company_id;
            END IF;
        END IF;
    END LOOP;

    -- 5. Special nested dependencies (e.g. user_roles by company_users)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') 
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'company_users') THEN
        DELETE FROM public.user_roles 
        WHERE company_user_id IN (SELECT id FROM public.company_users WHERE company_id = p_company_id);
    END IF;

    -- 6. Final Company Deletion
    DELETE FROM public.companies WHERE id = p_company_id;

    -- 7. Record Administrative Security Audit Log in platform_audit_logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_audit_logs') THEN
        INSERT INTO public.platform_audit_logs (
            platform_admin_id,
            actor_email,
            action,
            entity_type,
            entity_id,
            target_company_id,
            details
        ) VALUES (
            p_admin_id,
            'platform-admin@printerp.com.bd',
            'company.permanent_delete',
            'company',
            p_company_id::text,
            NULL,
            jsonb_build_object(
                'deleted_company_name', v_company_name,
                'deleted_company_slug', v_company_slug,
                'deleted_by_admin_id', p_admin_id,
                'reason', p_reason,
                'timestamp', NOW()
            )
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'company_id', p_company_id,
        'company_name', v_company_name,
        'company_slug', v_company_slug,
        'message', format('Tenant "%s" (%s) and all dependent records have been permanently deleted.', v_company_name, v_company_slug)
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_tenant_permanently(UUID, UUID, TEXT) FROM public;
REVOKE EXECUTE ON FUNCTION public.delete_tenant_permanently(UUID, UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.delete_tenant_permanently(UUID, UUID, TEXT) TO service_role;
