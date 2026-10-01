-- ==============================================================================
-- PrintERP SaaS - Migration 108: Atomic Invoicing, Dual-Entry Advance Payments & Inventory Concurrency Hardening
-- ==============================================================================

-- 0. CLEANUP OBSOLETE FUNCTION OVERLOADS (Ensures unique signatures & grants)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT oid::regprocedure AS func_sig
        FROM pg_proc
        WHERE proname = 'create_invoice_atomic'
          AND pronamespace = 'public'::regnamespace
    ) LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_sig || ' CASCADE;';
    END LOOP;

    FOR r IN (
        SELECT oid::regprocedure AS func_sig
        FROM pg_proc
        WHERE proname = 'mutate_inventory_stock_atomic'
          AND pronamespace = 'public'::regnamespace
    ) LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_sig || ' CASCADE;';
    END LOOP;
END $$;

-- 1. ATOMIC INVOICE CREATION WITH INTEGRATED ADVANCE PAYMENT & DUAL-ENTRY RECONCILIATION
CREATE OR REPLACE FUNCTION public.create_invoice_atomic(
    p_company_id UUID,
    p_branch_id UUID DEFAULT NULL,
    p_customer_id UUID DEFAULT NULL,
    p_customer_name TEXT DEFAULT 'Walk-in Customer',
    p_customer_phone TEXT DEFAULT '',
    p_customer_email TEXT DEFAULT NULL,
    p_customer_address TEXT DEFAULT NULL,
    p_customer_bin TEXT DEFAULT NULL,
    p_customer_tin TEXT DEFAULT NULL,
    p_customer_company TEXT DEFAULT NULL,
    p_customer_type TEXT DEFAULT 'retail',
    p_invoice_type TEXT DEFAULT 'sales_invoice',
    p_invoice_date DATE DEFAULT CURRENT_DATE,
    p_due_date DATE DEFAULT NULL,
    p_quotation_id UUID DEFAULT NULL,
    p_sales_order_id UUID DEFAULT NULL,
    p_job_order_id UUID DEFAULT NULL,
    p_order_number TEXT DEFAULT NULL,
    p_reference_no TEXT DEFAULT NULL,
    p_subtotal NUMERIC DEFAULT 0,
    p_discount_amount NUMERIC DEFAULT 0,
    p_vat_percentage NUMERIC DEFAULT 0,
    p_vat_amount NUMERIC DEFAULT 0,
    p_grand_total NUMERIC DEFAULT 0,
    p_paid_amount NUMERIC DEFAULT 0,
    p_due_amount NUMERIC DEFAULT 0,
    p_advance_percentage NUMERIC DEFAULT 0,
    p_advance_amount NUMERIC DEFAULT 0,
    p_due_on_delivery NUMERIC DEFAULT NULL,
    p_payment_method TEXT DEFAULT 'cash',
    p_payment_method_note TEXT DEFAULT NULL,
    p_mushak_version TEXT DEFAULT NULL,
    p_language_mode TEXT DEFAULT 'bn',
    p_delivery_date DATE DEFAULT NULL,
    p_delivery_location TEXT DEFAULT NULL,
    p_delivery_method TEXT DEFAULT 'customer_pickup',
    p_installation_required BOOLEAN DEFAULT FALSE,
    p_notes TEXT DEFAULT NULL,
    p_terms_and_conditions TEXT DEFAULT NULL,
    p_created_by_name TEXT DEFAULT 'Commercial Executive',
    p_idempotency_key TEXT DEFAULT NULL,
    p_actor_user_id UUID DEFAULT NULL,
    p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB AS $$
#variable_conflict use_variable
DECLARE
    v_auth_uid UUID;
    v_has_access BOOLEAN := true;
    v_effective_actor_id UUID;
    v_existing_invoice RECORD;
    v_invoice_num TEXT;
    v_invoice_id UUID;
    v_item JSONB;
    v_status TEXT;
    v_due_date DATE;
    v_payment_id UUID;
    v_receipt_num TEXT;
BEGIN
    IF p_company_id IS NULL THEN
        RAISE EXCEPTION 'Company ID is required for invoice creation';
    END IF;

    -- Security Definer Tenant Boundary Check
    v_auth_uid := auth.uid();
    IF v_auth_uid IS NULL AND current_setting('request.jwt.claim.role', true) = 'anon' THEN
        RAISE EXCEPTION 'Unauthorized: Authenticated session required for financial operations';
    END IF;

    IF v_auth_uid IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.company_users 
            WHERE user_id = v_auth_uid 
              AND company_id = p_company_id 
              AND (status = 'active' OR is_active = true)
            UNION
            SELECT 1 FROM public.tenant_memberships
            WHERE user_id = v_auth_uid
              AND company_id = p_company_id
            UNION
            SELECT 1 FROM public.companies 
            WHERE id = p_company_id AND (owner_id = v_auth_uid OR created_by = v_auth_uid)
        ) INTO v_has_access;

        IF NOT v_has_access THEN
            RAISE EXCEPTION 'Unauthorized: User does not belong to target company context';
        END IF;
    END IF;

    v_effective_actor_id := COALESCE(v_auth_uid, p_actor_user_id);

    -- 1. Idempotency Check: Return existing committed invoice if idempotency key matches
    IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
        SELECT id, invoice_number, grand_total, paid_amount, due_amount, status
        INTO v_existing_invoice
        FROM public.invoices
        WHERE company_id = p_company_id AND idempotency_key = p_idempotency_key
        LIMIT 1;

        IF v_existing_invoice.id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'success', true,
                'is_idempotent_replay', true,
                'invoice_id', v_existing_invoice.id,
                'invoice_number', v_existing_invoice.invoice_number,
                'grand_total', v_existing_invoice.grand_total,
                'paid_amount', v_existing_invoice.paid_amount,
                'due_amount', v_existing_invoice.due_amount,
                'status', v_existing_invoice.status
            );
        END IF;
    END IF;

    -- 2. Status & Due Date Computation
    v_due_date := COALESCE(p_due_date, p_invoice_date + INTERVAL '7 days');
    IF p_due_amount <= 0.01 THEN
        v_status := 'paid';
    ELSIF p_paid_amount > 0 THEN
        v_status := 'partially_paid';
    ELSE
        v_status := 'unpaid';
    END IF;

    -- 3. Concurrency-safe Sequence Generation
    v_invoice_num := public.get_next_document_number(p_company_id, 'invoice');

    -- 4. Insert Master Invoice Record
    INSERT INTO public.invoices (
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
        created_at,
        updated_at
    ) VALUES (
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
        COALESCE(p_invoice_date, CURRENT_DATE),
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
        COALESCE(p_created_by_name, 'Commercial Executive'),
        p_idempotency_key,
        NOW(),
        NOW()
    ) RETURNING id INTO v_invoice_id;

    -- 5. Insert Line Items
    IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
        LOOP
            INSERT INTO public.invoice_items (
                invoice_id,
                item_description,
                dimensions_spec,
                quantity,
                unit,
                unit_price,
                vat_percentage,
                total_price
            ) VALUES (
                v_invoice_id,
                COALESCE(v_item->>'item_description', v_item->>'item_name', v_item->>'description', 'Printing Item'),
                v_item->>'dimensions_spec',
                COALESCE((v_item->>'quantity')::NUMERIC, 1),
                COALESCE(v_item->>'unit', 'pcs'),
                COALESCE((v_item->>'unit_price')::NUMERIC, 0),
                COALESCE((v_item->>'vat_percentage')::NUMERIC, 0),
                COALESCE((v_item->>'total_price')::NUMERIC, (COALESCE((v_item->>'quantity')::NUMERIC, 1) * COALESCE((v_item->>'unit_price')::NUMERIC, 0)))
            );
        END LOOP;
    END IF;

    -- 6. Dual-Entry Accounting: Record Real Payment for Advance if paid_amount > 0
    IF p_paid_amount > 0 THEN
        v_receipt_num := public.get_next_document_number(p_company_id, 'payment');

        INSERT INTO public.payments (
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
        ) VALUES (
            p_company_id,
            p_branch_id,
            v_receipt_num,
            p_customer_id,
            p_customer_name,
            COALESCE(p_invoice_date, CURRENT_DATE),
            'advance_payment',
            COALESCE(p_payment_method, 'cash'),
            p_paid_amount,
            0,
            COALESCE(p_payment_method_note, 'Advance payment on invoice ' || v_invoice_num),
            COALESCE(p_created_by_name, 'Cashier'),
            CASE WHEN p_idempotency_key IS NOT NULL THEN p_idempotency_key || '_pay' ELSE NULL END,
            v_effective_actor_id,
            NOW()
        ) RETURNING id INTO v_payment_id;

        INSERT INTO public.payment_allocations (
            payment_id,
            invoice_id,
            allocated_amount,
            created_at
        ) VALUES (
            v_payment_id,
            v_invoice_id,
            p_paid_amount,
            NOW()
        );

        -- Update Customer Paid Metrics
        IF p_customer_id IS NOT NULL THEN
            UPDATE public.customers
            SET total_paid_amount = COALESCE(total_paid_amount, 0) + p_paid_amount,
                last_payment_date = COALESCE(p_invoice_date, CURRENT_DATE),
                last_payment_amount = p_paid_amount,
                updated_at = NOW()
            WHERE id = p_customer_id AND company_id = p_company_id;
        END IF;
    END IF;

    -- 7. Update Customer Total Due & Invoiced Balance
    IF p_customer_id IS NOT NULL THEN
        UPDATE public.customers
        SET total_due_balance = GREATEST(0, COALESCE(total_due_balance, 0) + p_due_amount),
            total_invoiced_amount = COALESCE(total_invoiced_amount, 0) + p_grand_total,
            current_balance = GREATEST(0, COALESCE(current_balance, 0) + p_due_amount),
            updated_at = NOW()
        WHERE id = p_customer_id AND company_id = p_company_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'invoice_id', v_invoice_id,
        'invoice_number', v_invoice_num,
        'grand_total', p_grand_total,
        'paid_amount', p_paid_amount,
        'due_amount', p_due_amount,
        'payment_id', v_payment_id,
        'receipt_number', v_receipt_num,
        'status', v_status
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. HARDENED INVENTORY STOCK MUTATION RPC (Supports all caller parameters without signature mismatch)
CREATE OR REPLACE FUNCTION public.mutate_inventory_stock_atomic(
    p_company_id UUID,
    p_material_id UUID,
    p_location_id UUID DEFAULT NULL,
    p_quantity_change NUMERIC DEFAULT 0,
    p_transaction_type TEXT DEFAULT 'CONSUMPTION',
    p_reference_id TEXT DEFAULT NULL,
    p_reference_type TEXT DEFAULT NULL,
    p_task_id UUID DEFAULT NULL,
    p_unit_cost NUMERIC DEFAULT 0,
    p_notes TEXT DEFAULT NULL,
    p_performed_by_name TEXT DEFAULT 'System',
    p_branch_id UUID DEFAULT NULL,
    p_production_task_id UUID DEFAULT NULL,
    p_performed_by_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_material RECORD;
    v_new_balance NUMERIC;
    v_loc_balance NUMERIC;
    v_ledger_id UUID;
    v_default_loc_id UUID;
    v_effective_task_id UUID;
BEGIN
    IF p_company_id IS NULL OR p_material_id IS NULL THEN
        RAISE EXCEPTION 'Company ID and Material ID are required for stock mutation';
    END IF;

    v_effective_task_id := COALESCE(p_task_id, p_production_task_id);

    -- 1. Lock material record to serialize concurrent stock updates
    SELECT * INTO v_material
    FROM public.materials
    WHERE id = p_material_id AND company_id = p_company_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Material not found: %', p_material_id USING ERRCODE = 'P0002';
    END IF;

    -- Calculate new total material balance
    v_new_balance := COALESCE(v_material.current_stock, 0) + p_quantity_change;

    -- Prevent negative stock
    IF v_new_balance < 0 THEN
        RAISE EXCEPTION 'Insufficient stock: Material % (%) has available stock %, cannot deduct %.',
            v_material.name, v_material.sku, v_material.current_stock, abs(p_quantity_change)
        USING ERRCODE = '23514';
    END IF;

    -- 2. Resolve or create default location if location_id not supplied
    IF p_location_id IS NULL THEN
        SELECT id INTO v_default_loc_id
        FROM public.inventory_locations
        WHERE company_id = p_company_id AND is_default = TRUE
        LIMIT 1;

        IF v_default_loc_id IS NULL THEN
            SELECT id INTO v_default_loc_id
            FROM public.inventory_locations
            WHERE company_id = p_company_id
            ORDER BY created_at ASC
            LIMIT 1;
        END IF;

        IF v_default_loc_id IS NULL THEN
            INSERT INTO public.inventory_locations (company_id, name, code, is_default, is_active)
            VALUES (p_company_id, 'Main Store', 'MAIN', TRUE, TRUE)
            RETURNING id INTO v_default_loc_id;
        END IF;

        p_location_id := v_default_loc_id;
    END IF;

    -- 3. Upsert Location Stock Balance with Row Lock
    INSERT INTO public.inventory_stock_balances (
        company_id,
        material_id,
        location_id,
        available_quantity,
        updated_at
    ) VALUES (
        p_company_id,
        p_material_id,
        p_location_id,
        GREATEST(0, p_quantity_change),
        NOW()
    )
    ON CONFLICT (company_id, material_id, location_id)
    DO UPDATE SET
        available_quantity = public.inventory_stock_balances.available_quantity + p_quantity_change,
        updated_at = NOW()
    RETURNING available_quantity INTO v_loc_balance;

    IF v_loc_balance < 0 THEN
        RAISE EXCEPTION 'Insufficient stock in location for material %: Cannot deduct %.',
            v_material.name, abs(p_quantity_change)
        USING ERRCODE = '23514';
    END IF;

    -- 4. Update Material master cached current_stock
    UPDATE public.materials
    SET current_stock = v_new_balance,
        updated_at = NOW()
    WHERE id = p_material_id AND company_id = p_company_id;

    -- 5. Record immutable entry in stock_ledger
    INSERT INTO public.stock_ledger (
        company_id,
        branch_id,
        material_id,
        location_id,
        transaction_type,
        quantity_change,
        unit,
        balance_after,
        unit_cost,
        total_cost,
        reference_type,
        reference_id,
        production_task_id,
        notes,
        performed_by_name,
        created_at
    ) VALUES (
        p_company_id,
        p_branch_id,
        p_material_id,
        p_location_id,
        p_transaction_type,
        p_quantity_change,
        v_material.unit,
        v_new_balance,
        p_unit_cost,
        abs(p_quantity_change) * COALESCE(p_unit_cost, 0),
        p_reference_type,
        p_reference_id,
        v_effective_task_id,
        p_notes,
        COALESCE(p_performed_by_name, 'System'),
        NOW()
    ) RETURNING id INTO v_ledger_id;

    RETURN jsonb_build_object(
        'success', true,
        'ledger_id', v_ledger_id,
        'material_id', p_material_id,
        'previous_stock', v_material.current_stock,
        'new_stock', v_new_balance,
        'quantity_change', p_quantity_change,
        'location_id', p_location_id,
        'location_balance', v_loc_balance
    );
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.create_invoice_atomic TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mutate_inventory_stock_atomic TO authenticated, service_role;

-- 3. COMMUNICATION JOBS COLUMN RECONCILIATION
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'communication_jobs') THEN
        ALTER TABLE public.communication_jobs
            ADD COLUMN IF NOT EXISTS event_type TEXT,
            ADD COLUMN IF NOT EXISTS recipient_phone TEXT,
            ADD COLUMN IF NOT EXISTS recipient_email TEXT,
            ADD COLUMN IF NOT EXISTS recipient_user_id UUID,
            ADD COLUMN IF NOT EXISTS recipient_customer_id UUID,
            ADD COLUMN IF NOT EXISTS template_key TEXT,
            ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;
    END IF;
END $$;
