-- ==============================================================================
-- PrintFlow - RPC Authorization & Tenant Isolation Verification Suite
-- Tests:
-- 1. Anonymous role (anon) is rejected from service-role and user-callable RPCs.
-- 2. Cross-tenant attacks: Tenant-B user calling Tenant-A IDs is rejected.
-- 3. In-tenant authorized caller: Tenant-A user with permissions succeeds.
-- ==============================================================================

BEGIN;

DO $$
DECLARE
    v_tenant_a_id uuid;
    v_tenant_b_id uuid;
    v_user_a_id uuid;
    v_user_b_id uuid;
    v_inv_a_id uuid;
    v_cust_a_id uuid;
    v_res jsonb;
BEGIN
    -- 1. Resolve test tenant IDs and users from Phase 0 seed dataset
    SELECT id INTO v_tenant_a_id FROM public.companies WHERE slug = 'alpha-print';
    SELECT id INTO v_tenant_b_id FROM public.companies WHERE slug = 'beta-press';

    IF v_tenant_a_id IS NULL OR v_tenant_b_id IS NULL THEN
        RAISE EXCEPTION 'Test tenants alpha-print and beta-press must be seeded before running rpc_authz';
    END IF;

    SELECT id INTO v_user_a_id FROM auth.users WHERE email = 'owner.alpha@test.com';
    SELECT id INTO v_user_b_id FROM auth.users WHERE email = 'owner.beta@test.com';

    SELECT id INTO v_inv_a_id FROM public.invoices WHERE company_id = v_tenant_a_id LIMIT 1;
    SELECT id INTO v_cust_a_id FROM public.customers WHERE company_id = v_tenant_a_id LIMIT 1;

    -- ==============================================================================
    -- TEST GROUP 1: Anonymous (anon) Role Access Rejection
    -- ==============================================================================
    SET LOCAL ROLE anon;

    -- 1.1 anon must be rejected from service-role RPC mutate_inventory_stock_atomic
    BEGIN
        PERFORM public.mutate_inventory_stock_atomic(
            p_company_id => v_tenant_a_id,
            p_material_id => gen_random_uuid(),
            p_location_id => null,
            p_quantity_change => 10,
            p_transaction_type => 'purchase_received',
            p_reference_id => null,
            p_reference_type => null,
            p_task_id => null,
            p_unit_cost => 50,
            p_notes => 'unauthorized anon test',
            p_performed_by_name => 'anon',
            p_branch_id => null,
            p_production_task_id => null,
            p_performed_by_id => null
        );
        RAISE EXCEPTION 'SECURITY BREACH: anon was able to execute mutate_inventory_stock_atomic';
    EXCEPTION
        WHEN insufficient_privilege THEN
            RAISE NOTICE '✓ PASS: anon denied EXECUTE on mutate_inventory_stock_atomic';
    END;

    -- 1.2 anon must be rejected from admin_purge_all_company_operational_data
    BEGIN
        PERFORM public.admin_purge_all_company_operational_data(v_tenant_a_id);
        RAISE EXCEPTION 'SECURITY BREACH: anon was able to execute admin_purge_all_company_operational_data';
    EXCEPTION
        WHEN insufficient_privilege THEN
            RAISE NOTICE '✓ PASS: anon denied EXECUTE on admin_purge_all_company_operational_data';
    END;

    -- 1.3 anon must be rejected from get_next_document_number
    BEGIN
        PERFORM public.get_next_document_number(v_tenant_a_id, 'invoice');
        RAISE EXCEPTION 'SECURITY BREACH: anon was able to execute get_next_document_number';
    EXCEPTION
        WHEN insufficient_privilege THEN
            RAISE NOTICE '✓ PASS: anon denied EXECUTE on get_next_document_number';
    END;

    -- 1.4 anon must be rejected from create_invoice_atomic
    BEGIN
        PERFORM public.create_invoice_atomic(p_company_id => v_tenant_a_id);
        RAISE EXCEPTION 'SECURITY BREACH: anon was able to execute create_invoice_atomic';
    EXCEPTION
        WHEN insufficient_privilege THEN
            RAISE NOTICE '✓ PASS: anon denied EXECUTE on create_invoice_atomic';
    END;

    -- 1.5 anon must be rejected from record_multi_invoice_payment_atomic
    BEGIN
        PERFORM public.record_multi_invoice_payment_atomic(p_company_id => v_tenant_a_id, p_amount => 500);
        RAISE EXCEPTION 'SECURITY BREACH: anon was able to execute record_multi_invoice_payment_atomic';
    EXCEPTION
        WHEN insufficient_privilege THEN
            RAISE NOTICE '✓ PASS: anon denied EXECUTE on record_multi_invoice_payment_atomic';
    END;

    -- ==============================================================================
    -- TEST GROUP 2: Cross-Tenant Isolation Rejection (Tenant-B user -> Tenant-A data)
    -- ==============================================================================
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claim.sub', v_user_b_id::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    -- 2.1 Tenant B user calling create_invoice_atomic on Tenant A must be rejected
    BEGIN
        PERFORM public.create_invoice_atomic(
            p_company_id => v_tenant_a_id,
            p_customer_name => 'Infiltrator Order',
            p_grand_total => 5000,
            p_due_amount => 5000
        );
        RAISE EXCEPTION 'SECURITY BREACH: Tenant B user created invoice in Tenant A context';
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLERRM LIKE '%Unauthorized%company%' OR SQLERRM LIKE '%does not belong%' THEN
                RAISE NOTICE '✓ PASS: Cross-tenant create_invoice_atomic blocked: %', SQLERRM;
            ELSE
                RAISE EXCEPTION 'FAIL: Unexpected error on cross-tenant create_invoice_atomic: %', SQLERRM;
            END IF;
    END;

    -- 2.2 Tenant B user calling cancel_invoice_atomic on Tenant A invoice must be rejected
    IF v_inv_a_id IS NOT NULL THEN
        BEGIN
            PERFORM public.cancel_invoice_atomic(
                p_company_id => v_tenant_a_id,
                p_invoice_id => v_inv_a_id,
                p_reason => 'Malicious cancellation by competitor'
            );
            RAISE EXCEPTION 'SECURITY BREACH: Tenant B user cancelled Tenant A invoice';
        EXCEPTION
            WHEN OTHERS THEN
                IF SQLERRM LIKE '%Unauthorized%company%' OR SQLERRM LIKE '%does not belong%' THEN
                    RAISE NOTICE '✓ PASS: Cross-tenant cancel_invoice_atomic blocked: %', SQLERRM;
                ELSE
                    RAISE EXCEPTION 'FAIL: Unexpected error on cross-tenant cancel_invoice_atomic: %', SQLERRM;
                END IF;
        END;
    END IF;

    -- 2.3 Tenant B user calling get_tenant_dashboard_metrics for Tenant A must be rejected
    BEGIN
        PERFORM public.get_tenant_dashboard_metrics(v_tenant_a_id);
        RAISE EXCEPTION 'SECURITY BREACH: Tenant B user queried Tenant A dashboard metrics';
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLERRM LIKE '%Unauthorized%' THEN
                RAISE NOTICE '✓ PASS: Cross-tenant dashboard metrics query blocked: %', SQLERRM;
            ELSE
                RAISE EXCEPTION 'FAIL: Unexpected error on cross-tenant metrics: %', SQLERRM;
            END IF;
    END;

    -- 2.4 Tenant B user calling service-role only RPC must be rejected by Postgres privilege check
    BEGIN
        PERFORM public.mutate_inventory_stock_atomic(
            p_company_id => v_tenant_a_id,
            p_material_id => gen_random_uuid(),
            p_location_id => null,
            p_quantity_change => -50,
            p_transaction_type => 'adjustment_decrease',
            p_reference_id => null,
            p_reference_type => null,
            p_task_id => null,
            p_unit_cost => 50,
            p_notes => 'tenant-b stock heist',
            p_performed_by_name => 'beta attacker',
            p_branch_id => null,
            p_production_task_id => null,
            p_performed_by_id => null
        );
        RAISE EXCEPTION 'SECURITY BREACH: Authenticated user was able to execute service-role mutate_inventory_stock_atomic';
    EXCEPTION
        WHEN insufficient_privilege THEN
            RAISE NOTICE '✓ PASS: Authenticated user denied EXECUTE on service-role mutate_inventory_stock_atomic';
    END;

    -- ==============================================================================
    -- TEST GROUP 3: Legitimate Tenant-A User Execution (Should Succeed)
    -- ==============================================================================
    PERFORM set_config('request.jwt.claim.sub', v_user_a_id::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    -- 3.1 Tenant A user fetching their own metrics succeeds
    v_res := public.get_tenant_dashboard_metrics(v_tenant_a_id);
    IF v_res IS NULL THEN
        RAISE EXCEPTION 'FAIL: Tenant A user failed to retrieve legitimate metrics';
    ELSE
        RAISE NOTICE '✓ PASS: Tenant A user retrieved own metrics successfully';
    END IF;

    -- 3.2 Tenant A user querying financial summary succeeds
    PERFORM public.get_tenant_financial_summary(v_tenant_a_id, (current_date - 30)::date, current_date);
    RAISE NOTICE '✓ PASS: Tenant A user retrieved financial summary successfully';

    RAISE NOTICE '======================================================';
    RAISE NOTICE '🎉 ALL RPC AUTHORIZATION & ISOLATION TESTS PASSED';
    RAISE NOTICE '======================================================';
END;
$$;

ROLLBACK;
