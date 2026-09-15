-- ==============================================================================
-- InkFlow ERP SaaS - Migration 079: Billing Financial Integrity & Authorization Hardening
-- Single Authoritative Source of Financial Operations in PostgreSQL:
--   1. Idempotency & Actor Tracking Columns for Invoices, Payments, Write-offs
--   2. Hardened record_multi_invoice_payment_atomic with Idempotency & Tenant Authorization
--   3. Hardened record_financial_write_off_atomic with Actor & Balance Rules
--   4. Hardened cancel_invoice_atomic with Strict Financial State Transitions
--   5. Customer Financial Balance Reconciliation RPC: reconcile_customer_balance_atomic
-- ==============================================================================

-- 1. ADD IDEMPOTENCY & ACTOR TRACKING COLUMNS
DO $$
BEGIN
    -- Idempotency key on payments
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'idempotency_key'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN idempotency_key TEXT DEFAULT NULL;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_idempotency ON public.payments(company_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
    END IF;

    -- Actor User ID on payments
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'actor_user_id'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;

    -- Idempotency key on invoices
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'idempotency_key'
    ) THEN
        ALTER TABLE public.invoices ADD COLUMN idempotency_key TEXT DEFAULT NULL;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_idempotency ON public.invoices(company_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
    END IF;

    -- Actor User ID on financial write-offs
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'financial_write_offs' AND column_name = 'actor_user_id'
    ) THEN
        ALTER TABLE public.financial_write_offs ADD COLUMN actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;

    -- Financial balance columns on customers
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS total_invoiced_amount NUMERIC DEFAULT 0;
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS total_paid_amount NUMERIC DEFAULT 0;
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS total_due_balance NUMERIC DEFAULT 0;
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS current_balance NUMERIC DEFAULT 0;
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS last_payment_date DATE DEFAULT NULL;
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS last_payment_amount NUMERIC DEFAULT NULL;
END $$;


-- 2. HARDENED ATOMIC RPC: RECORD MULTI-INVOICE PAYMENT ALLOCATION
CREATE OR REPLACE FUNCTION public.record_multi_invoice_payment_atomic(
    p_company_id UUID,
    p_customer_id UUID DEFAULT NULL,
    p_customer_name TEXT DEFAULT 'Walk-in Customer',
    p_amount NUMERIC DEFAULT 0,
    p_payment_method TEXT DEFAULT 'cash',
    p_payment_date DATE DEFAULT CURRENT_DATE,
    p_bank_name TEXT DEFAULT NULL,
    p_cheque_number TEXT DEFAULT NULL,
    p_cheque_date DATE DEFAULT NULL,
    p_mfs_transaction_id TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_received_by_name TEXT DEFAULT NULL,
    p_allocations JSONB DEFAULT '[]'::jsonb,
    p_branch_id UUID DEFAULT NULL,
    p_idempotency_key TEXT DEFAULT NULL,
    p_actor_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_payment_num TEXT;
    v_payment_id UUID;
    v_existing_payment RECORD;
    v_alloc JSONB;
    v_inv_id UUID;
    v_alloc_amt NUMERIC;
    v_inv RECORD;
    v_new_paid NUMERIC;
    v_new_due NUMERIC;
    v_new_status TEXT;
    v_total_allocated NUMERIC := 0;
    v_unallocated NUMERIC := 0;
    v_auth_uid UUID;
    v_has_access BOOLEAN := true;
BEGIN
    IF p_company_id IS NULL THEN
        RAISE EXCEPTION 'Company ID is required';
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be greater than zero';
    END IF;

    -- SECURITY DEFINER Tenant Authorization Check:
    -- If executed in an authenticated user context, verify active company membership
    v_auth_uid := auth.uid();
    IF v_auth_uid IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.company_users 
            WHERE user_id = v_auth_uid AND company_id = p_company_id AND is_active = true
            UNION
            SELECT 1 FROM public.companies 
            WHERE id = p_company_id AND (owner_id = v_auth_uid OR created_by = v_auth_uid)
        ) INTO v_has_access;

        IF NOT v_has_access THEN
            RAISE EXCEPTION 'Unauthorized: User does not belong to target company context';
        END IF;
    END IF;

    -- Idempotency Check: Return existing committed transaction if idempotency key matches
    IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
        SELECT id, receipt_number, amount, unallocated_amount, payment_method, customer_id
        INTO v_existing_payment
        FROM public.payments
        WHERE company_id = p_company_id AND idempotency_key = p_idempotency_key
        LIMIT 1;

        IF v_existing_payment.id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'success', true,
                'is_idempotent_replay', true,
                'payment_id', v_existing_payment.id,
                'receipt_number', v_existing_payment.receipt_number,
                'amount', v_existing_payment.amount,
                'allocated_total', (v_existing_payment.amount - COALESCE(v_existing_payment.unallocated_amount, 0)),
                'unallocated_surplus', COALESCE(v_existing_payment.unallocated_amount, 0),
                'payment_method', v_existing_payment.payment_method,
                'customer_id', v_existing_payment.customer_id
            );
        END IF;
    END IF;

    -- Generate sequential payment receipt number
    v_payment_num := public.get_next_document_number(p_company_id, 'payment');

    -- Insert Master Payment Record
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
        bank_name,
        cheque_number,
        cheque_date,
        mfs_transaction_id,
        notes,
        received_by_name,
        idempotency_key,
        actor_user_id,
        created_at
    ) VALUES (
        p_company_id,
        p_branch_id,
        v_payment_num,
        p_customer_id,
        p_customer_name,
        COALESCE(p_payment_date, CURRENT_DATE),
        CASE WHEN jsonb_array_length(p_allocations) > 0 THEN 'due_payment' ELSE 'advance_payment' END,
        p_payment_method,
        p_amount,
        0,
        p_bank_name,
        p_cheque_number,
        p_cheque_date,
        p_mfs_transaction_id,
        p_notes,
        COALESCE(p_received_by_name, 'Cashier'),
        p_idempotency_key,
        COALESCE(p_actor_user_id, v_auth_uid),
        NOW()
    ) RETURNING id INTO v_payment_id;

    -- Process invoice allocations transactionally
    IF p_allocations IS NOT NULL AND jsonb_array_length(p_allocations) > 0 THEN
        FOR v_alloc IN SELECT * FROM jsonb_array_elements(p_allocations)
        LOOP
            v_inv_id := (v_alloc->>'invoice_id')::UUID;
            v_alloc_amt := COALESCE((v_alloc->>'amount')::NUMERIC, (v_alloc->>'allocated_amount')::NUMERIC, 0);

            IF v_inv_id IS NOT NULL AND v_alloc_amt > 0 THEN
                -- Lock invoice row exclusively and enforce company & status validation
                SELECT id, grand_total, paid_amount, due_amount, write_off_amount, status
                INTO v_inv
                FROM public.invoices
                WHERE id = v_inv_id AND company_id = p_company_id
                FOR UPDATE;

                IF v_inv.id IS NOT NULL THEN
                    IF v_inv.status = 'cancelled' THEN
                        RAISE EXCEPTION 'Cannot allocate payment to cancelled invoice %', v_inv_id;
                    END IF;

                    -- Cap allocation to remaining due balance
                    IF v_alloc_amt > (v_inv.due_amount + 0.01) THEN
                        v_alloc_amt := v_inv.due_amount;
                    END IF;

                    -- Ensure total allocation does not exceed master payment amount
                    IF (v_total_allocated + v_alloc_amt) > (p_amount + 0.01) THEN
                        v_alloc_amt := GREATEST(0, p_amount - v_total_allocated);
                    END IF;

                    IF v_alloc_amt > 0 THEN
                        v_new_paid := COALESCE(v_inv.paid_amount, 0) + v_alloc_amt;
                        v_new_due := GREATEST(0, v_inv.grand_total - v_new_paid - COALESCE(v_inv.write_off_amount, 0));
                        v_new_status := CASE 
                            WHEN v_new_due <= 0.01 THEN 'paid'
                            WHEN v_new_paid > 0 THEN 'partially_paid'
                            ELSE 'unpaid'
                        END;

                        -- Insert Allocation record
                        INSERT INTO public.payment_allocations (
                            payment_id,
                            invoice_id,
                            allocated_amount,
                            created_at
                        ) VALUES (
                            v_payment_id,
                            v_inv_id,
                            v_alloc_amt,
                            NOW()
                        );

                        -- Update Invoice state
                        UPDATE public.invoices
                        SET paid_amount = v_new_paid,
                            due_amount = v_new_due,
                            status = v_new_status,
                            updated_at = NOW()
                        WHERE id = v_inv_id;

                        v_total_allocated := v_total_allocated + v_alloc_amt;
                    END IF;
                END IF;
            END IF;
        END LOOP;
    END IF;

    -- Calculate any surplus advance amount
    v_unallocated := GREATEST(0, p_amount - v_total_allocated);

    -- Update payment record with final unallocated amount
    UPDATE public.payments
    SET unallocated_amount = v_unallocated
    WHERE id = v_payment_id;

    -- Reconcile Customer Balance in PostgreSQL
    UPDATE public.customers
    SET total_paid_amount = COALESCE(total_paid_amount, 0) + p_amount,
        total_due_balance = GREATEST(0, COALESCE(total_due_balance, 0) - v_total_allocated),
        current_balance = GREATEST(0, COALESCE(current_balance, 0) - p_amount),
        last_payment_date = COALESCE(p_payment_date, CURRENT_DATE),
        last_payment_amount = p_amount,
        updated_at = NOW()
    WHERE id = p_customer_id;

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'receipt_number', v_payment_num,
        'amount', p_amount,
        'allocated_total', v_total_allocated,
        'unallocated_surplus', v_unallocated,
        'payment_method', p_payment_method,
        'customer_id', p_customer_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. HARDENED ATOMIC RPC: RECORD FINANCIAL WRITE-OFF
CREATE OR REPLACE FUNCTION public.record_financial_write_off_atomic(
    p_company_id UUID,
    p_invoice_id UUID,
    p_amount NUMERIC,
    p_reason TEXT,
    p_authorized_by_name TEXT,
    p_actor_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_write_off_id UUID;
    v_inv RECORD;
    v_new_write_off NUMERIC;
    v_new_due NUMERIC;
    v_new_status TEXT;
    v_auth_uid UUID;
    v_has_access BOOLEAN := true;
BEGIN
    IF p_company_id IS NULL OR p_invoice_id IS NULL THEN
        RAISE EXCEPTION 'Company ID and Invoice ID are required';
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Write-off amount must be greater than zero';
    END IF;

    IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
        RAISE EXCEPTION 'A valid business justification is required for write-off';
    END IF;

    -- Security Check
    v_auth_uid := auth.uid();
    IF v_auth_uid IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.company_users 
            WHERE user_id = v_auth_uid AND company_id = p_company_id AND is_active = true
            UNION
            SELECT 1 FROM public.companies 
            WHERE id = p_company_id AND (owner_id = v_auth_uid OR created_by = v_auth_uid)
        ) INTO v_has_access;

        IF NOT v_has_access THEN
            RAISE EXCEPTION 'Unauthorized: User does not belong to target company context';
        END IF;
    END IF;

    -- Lock invoice row
    SELECT id, customer_id, invoice_number, grand_total, paid_amount, due_amount, write_off_amount, status
    INTO v_inv
    FROM public.invoices
    WHERE id = p_invoice_id AND company_id = p_company_id
    FOR UPDATE;

    IF v_inv.id IS NULL THEN
        RAISE EXCEPTION 'Invoice not found in company context';
    END IF;

    IF v_inv.status = 'cancelled' THEN
        RAISE EXCEPTION 'Cannot write off cancelled invoice %', v_inv.invoice_number;
    END IF;

    IF v_inv.due_amount <= 0 THEN
        RAISE EXCEPTION 'Invoice % has no remaining due to write off', v_inv.invoice_number;
    END IF;

    IF p_amount > (v_inv.due_amount + 0.01) THEN
        RAISE EXCEPTION 'Write-off amount (৳%) cannot exceed outstanding invoice due (৳%)', p_amount, v_inv.due_amount;
    END IF;

    -- 1. Insert non-destructive financial write-off record
    INSERT INTO public.financial_write_offs (
        company_id,
        invoice_id,
        amount,
        reason,
        authorized_by_name,
        actor_user_id,
        created_at
    ) VALUES (
        p_company_id,
        p_invoice_id,
        p_amount,
        p_reason,
        COALESCE(p_authorized_by_name, 'Authorized Officer'),
        COALESCE(p_actor_user_id, v_auth_uid),
        NOW()
    ) RETURNING id INTO v_write_off_id;

    -- 2. Update invoice balance
    v_new_write_off := COALESCE(v_inv.write_off_amount, 0) + p_amount;
    v_new_due := GREATEST(0, v_inv.grand_total - COALESCE(v_inv.paid_amount, 0) - v_new_write_off);
    v_new_status := CASE 
        WHEN v_new_due <= 0.01 THEN 'written_off'
        ELSE v_inv.status
    END;

    UPDATE public.invoices
    SET write_off_amount = v_new_write_off,
        due_amount = v_new_due,
        status = v_new_status,
        updated_at = NOW()
    WHERE id = p_invoice_id;

    -- 3. Adjust customer outstanding balance
    IF v_inv.customer_id IS NOT NULL THEN
        UPDATE public.customers
        SET total_due_balance = GREATEST(0, COALESCE(total_due_balance, 0) - p_amount),
            current_balance = GREATEST(0, COALESCE(current_balance, 0) - p_amount),
            updated_at = NOW()
        WHERE id = v_inv.customer_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'write_off_id', v_write_off_id,
        'invoice_id', p_invoice_id,
        'invoice_number', v_inv.invoice_number,
        'amount', p_amount,
        'new_due_amount', v_new_due,
        'new_status', v_new_status
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. HARDENED ATOMIC RPC: CANCEL / VOID INVOICE
CREATE OR REPLACE FUNCTION public.cancel_invoice_atomic(
    p_company_id UUID,
    p_invoice_id UUID,
    p_reason TEXT,
    p_actor_name TEXT DEFAULT NULL,
    p_actor_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_inv RECORD;
    v_released_due NUMERIC;
    v_auth_uid UUID;
    v_has_access BOOLEAN := true;
BEGIN
    IF p_company_id IS NULL OR p_invoice_id IS NULL THEN
        RAISE EXCEPTION 'Company ID and Invoice ID are required';
    END IF;

    -- Security Check
    v_auth_uid := auth.uid();
    IF v_auth_uid IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.company_users 
            WHERE user_id = v_auth_uid AND company_id = p_company_id AND is_active = true
            UNION
            SELECT 1 FROM public.companies 
            WHERE id = p_company_id AND (owner_id = v_auth_uid OR created_by = v_auth_uid)
        ) INTO v_has_access;

        IF NOT v_has_access THEN
            RAISE EXCEPTION 'Unauthorized: User does not belong to target company context';
        END IF;
    END IF;

    SELECT id, customer_id, invoice_number, grand_total, paid_amount, due_amount, status
    INTO v_inv
    FROM public.invoices
    WHERE id = p_invoice_id AND company_id = p_company_id
    FOR UPDATE;

    IF v_inv.id IS NULL THEN
        RAISE EXCEPTION 'Invoice not found in company context';
    END IF;

    IF v_inv.status = 'cancelled' THEN
        RAISE EXCEPTION 'Invoice is already cancelled';
    END IF;

    IF v_inv.status = 'paid' THEN
        RAISE EXCEPTION 'Paid invoices cannot be cancelled directly. Please perform an authorized payment refund/reversal.';
    END IF;

    IF COALESCE(v_inv.paid_amount, 0) > 0 THEN
        RAISE EXCEPTION 'Partially paid invoices (Paid: ৳%) cannot be cancelled directly without refunding or deallocating payments.', v_inv.paid_amount;
    END IF;

    IF v_inv.status = 'written_off' THEN
        RAISE EXCEPTION 'Written-off invoices cannot be cancelled directly.';
    END IF;

    -- Record cancellation and void remaining due
    v_released_due := v_inv.due_amount;

    UPDATE public.invoices
    SET status = 'cancelled',
        due_amount = 0,
        notes = COALESCE(notes, '') || ' [Cancelled on ' || CURRENT_DATE || ': ' || COALESCE(p_reason, 'No reason given') || ' by ' || COALESCE(p_actor_name, 'System') || ']',
        updated_at = NOW()
    WHERE id = p_invoice_id;

    -- Reduce customer due balance by released due
    IF v_inv.customer_id IS NOT NULL AND v_released_due > 0 THEN
        UPDATE public.customers
        SET total_due_balance = GREATEST(0, COALESCE(total_due_balance, 0) - v_released_due),
            current_balance = GREATEST(0, COALESCE(current_balance, 0) - v_released_due),
            updated_at = NOW()
        WHERE id = v_inv.customer_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'invoice_id', p_invoice_id,
        'invoice_number', v_inv.invoice_number,
        'released_due', v_released_due,
        'status', 'cancelled'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. ATOMIC RPC: RECONCILE CUSTOMER BALANCE
CREATE OR REPLACE FUNCTION public.reconcile_customer_balance_atomic(
    p_company_id UUID,
    p_customer_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_cust RECORD;
    v_calc_invoiced NUMERIC;
    v_calc_paid NUMERIC;
    v_calc_write_off NUMERIC;
    v_calc_due NUMERIC;
    v_reconciled_count INT := 0;
BEGIN
    FOR v_cust IN
        SELECT id, name, total_invoiced_amount, total_paid_amount, total_due_balance
        FROM public.customers
        WHERE company_id = p_company_id AND (p_customer_id IS NULL OR id = p_customer_id)
    LOOP
        -- Calculate total invoiced (excluding cancelled invoices)
        SELECT COALESCE(SUM(grand_total), 0)
        INTO v_calc_invoiced
        FROM public.invoices
        WHERE company_id = p_company_id AND customer_id = v_cust.id AND status <> 'cancelled';

        -- Calculate total paid from master payments
        SELECT COALESCE(SUM(amount), 0)
        INTO v_calc_paid
        FROM public.payments
        WHERE company_id = p_company_id AND customer_id = v_cust.id;

        -- Calculate total write offs
        SELECT COALESCE(SUM(amount), 0)
        INTO v_calc_write_off
        FROM public.financial_write_offs
        WHERE company_id = p_company_id AND invoice_id IN (
            SELECT id FROM public.invoices WHERE customer_id = v_cust.id
        );

        -- Calculate true remaining due balance across open invoices
        SELECT COALESCE(SUM(due_amount), 0)
        INTO v_calc_due
        FROM public.invoices
        WHERE company_id = p_company_id AND customer_id = v_cust.id AND status <> 'cancelled';

        -- Update customer record atomically if mismatch exists
        UPDATE public.customers
        SET total_invoiced_amount = v_calc_invoiced,
            total_paid_amount = v_calc_paid,
            total_due_balance = v_calc_due,
            updated_at = NOW()
        WHERE id = v_cust.id;

        v_reconciled_count := v_reconciled_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'reconciled_count', v_reconciled_count,
        'company_id', p_company_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
