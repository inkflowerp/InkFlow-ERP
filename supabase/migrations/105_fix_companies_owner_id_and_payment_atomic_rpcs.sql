-- ==============================================================================
-- InkFlow ERP SaaS - Migration 105: Fix companies owner_id & financial atomic RPCs
-- Fixes: column "owner_id" does not exist in public.companies
-- Ensures:
--   1. ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
--   2. ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
--   3. Recreates record_multi_invoice_payment_atomic, record_financial_write_off_atomic,
--      cancel_invoice_atomic, record_cheque_dishonor_atomic, and record_expense_with_journal_atomic
--      with resilient company membership check including tenant_memberships and companies.
-- ==============================================================================

-- 1. ADD OWNER_ID & CREATED_BY COLUMNS TO COMPANIES IF MISSING
ALTER TABLE IF EXISTS public.companies
    ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_companies_owner_id ON public.companies(owner_id);
CREATE INDEX IF NOT EXISTS idx_companies_created_by ON public.companies(created_by);


-- 2. HARDENED RECORD_MULTI_INVOICE_PAYMENT_ATOMIC
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
#variable_conflict use_variable
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
    v_effective_actor_id UUID;
BEGIN
    IF p_company_id IS NULL THEN
        RAISE EXCEPTION 'Company ID is required';
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be greater than zero';
    END IF;

    -- SECURITY DEFINER Tenant & Auth Boundary:
    v_auth_uid := auth.uid();
    
    -- Reject unauthenticated anonymous callers
    IF v_auth_uid IS NULL AND current_setting('request.jwt.claim.role', true) = 'anon' THEN
        RAISE EXCEPTION 'Unauthorized: Authenticated session required for financial operations';
    END IF;

    -- Verify authenticated user belongs to target company
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

    -- Authoritative actor resolution (authenticated session takes absolute precedence over caller input)
    v_effective_actor_id := COALESCE(v_auth_uid, p_actor_user_id);

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
        v_effective_actor_id,
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
    IF p_customer_id IS NOT NULL THEN
        UPDATE public.customers
        SET total_paid_amount = COALESCE(total_paid_amount, 0) + p_amount,
            total_due_balance = GREATEST(0, COALESCE(total_due_balance, 0) - v_total_allocated),
            current_balance = GREATEST(0, COALESCE(current_balance, 0) - p_amount),
            last_payment_date = COALESCE(p_payment_date, CURRENT_DATE),
            last_payment_amount = p_amount,
            updated_at = NOW()
        WHERE id = p_customer_id AND company_id = p_company_id;
    END IF;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- 3. HARDENED RECORD_FINANCIAL_WRITE_OFF_ATOMIC
CREATE OR REPLACE FUNCTION public.record_financial_write_off_atomic(
    p_company_id UUID,
    p_invoice_id UUID,
    p_amount NUMERIC,
    p_reason TEXT,
    p_authorized_by_name TEXT,
    p_actor_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
#variable_conflict use_variable
DECLARE
    v_write_off_id UUID;
    v_inv RECORD;
    v_new_write_off NUMERIC;
    v_new_due NUMERIC;
    v_new_status TEXT;
    v_auth_uid UUID;
    v_has_access BOOLEAN := true;
    v_effective_actor_id UUID;
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
    
    -- Reject unauthenticated anonymous callers
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
        v_effective_actor_id,
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
        WHERE id = v_inv.customer_id AND company_id = p_company_id;
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- 4. HARDENED CANCEL_INVOICE_ATOMIC
CREATE OR REPLACE FUNCTION public.cancel_invoice_atomic(
    p_company_id UUID,
    p_invoice_id UUID,
    p_reason TEXT,
    p_actor_name TEXT DEFAULT NULL,
    p_actor_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
#variable_conflict use_variable
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
    
    -- Reject unauthenticated anonymous callers
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

    v_released_due := COALESCE(v_inv.due_amount, 0);

    UPDATE public.invoices
    SET status = 'cancelled',
        due_amount = 0,
        notes = CASE 
            WHEN notes IS NOT NULL AND notes <> '' THEN notes || ' | Cancelled: ' || COALESCE(p_reason, 'No reason given')
            ELSE 'Cancelled: ' || COALESCE(p_reason, 'No reason given')
        END,
        updated_at = NOW()
    WHERE id = p_invoice_id;

    IF v_inv.customer_id IS NOT NULL AND v_released_due > 0 THEN
        UPDATE public.customers
        SET total_due_balance = GREATEST(0, COALESCE(total_due_balance, 0) - v_released_due),
            current_balance = GREATEST(0, COALESCE(current_balance, 0) - v_released_due),
            updated_at = NOW()
        WHERE id = v_inv.customer_id AND company_id = p_company_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'invoice_id', p_invoice_id,
        'invoice_number', v_inv.invoice_number,
        'released_due', v_released_due,
        'status', 'cancelled'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- 5. HARDENED RECORD_CHEQUE_DISHONOR_ATOMIC
CREATE OR REPLACE FUNCTION public.record_cheque_dishonor_atomic(
    p_company_id UUID,
    p_payment_id UUID,
    p_reason TEXT,
    p_fee NUMERIC DEFAULT 0,
    p_authorized_by_name TEXT DEFAULT NULL,
    p_actor_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
#variable_conflict use_variable
DECLARE
    v_pay RECORD;
    v_alloc RECORD;
    v_inv RECORD;
    v_dishonor_id UUID;
    v_auth_uid UUID;
    v_has_access BOOLEAN := true;
BEGIN
    IF p_company_id IS NULL OR p_payment_id IS NULL THEN
        RAISE EXCEPTION 'Company ID and Payment ID are required';
    END IF;

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

    SELECT * INTO v_pay
    FROM public.payments
    WHERE id = p_payment_id AND company_id = p_company_id
    FOR UPDATE;

    IF v_pay.id IS NULL THEN
        RAISE EXCEPTION 'Payment record % not found', p_payment_id;
    END IF;

    IF v_pay.status = 'dishonored' THEN
        RAISE EXCEPTION 'Cheque payment % is already marked as dishonored', v_pay.receipt_number;
    END IF;

    FOR v_alloc IN 
        SELECT * FROM public.payment_allocations 
        WHERE payment_id = p_payment_id
    LOOP
        SELECT id, grand_total, paid_amount, due_amount, write_off_amount, status
        INTO v_inv
        FROM public.invoices
        WHERE id = v_alloc.invoice_id AND company_id = p_company_id
        FOR UPDATE;

        IF v_inv.id IS NOT NULL THEN
            UPDATE public.invoices
            SET paid_amount = GREATEST(0, COALESCE(paid_amount, 0) - v_alloc.allocated_amount),
                due_amount = GREATEST(0, grand_total - GREATEST(0, COALESCE(paid_amount, 0) - v_alloc.allocated_amount) - COALESCE(write_off_amount, 0)),
                status = CASE 
                    WHEN (grand_total - GREATEST(0, COALESCE(paid_amount, 0) - v_alloc.allocated_amount) - COALESCE(write_off_amount, 0)) >= grand_total THEN 'unpaid'
                    ELSE 'partially_paid'
                END,
                updated_at = NOW()
            WHERE id = v_inv.id;
        END IF;
    END LOOP;

    UPDATE public.payments
    SET status = 'dishonored',
        notes = CASE 
            WHEN notes IS NOT NULL AND notes <> '' THEN notes || ' | Dishonored: ' || COALESCE(p_reason, 'Cheque bounced')
            ELSE 'Dishonored: ' || COALESCE(p_reason, 'Cheque bounced')
        END,
        updated_at = NOW()
    WHERE id = p_payment_id;

    IF v_pay.customer_id IS NOT NULL THEN
        UPDATE public.customers
        SET total_paid_amount = GREATEST(0, COALESCE(total_paid_amount, 0) - v_pay.amount),
            total_due_balance = COALESCE(total_due_balance, 0) + (v_pay.amount - COALESCE(v_pay.unallocated_amount, 0)) + COALESCE(p_fee, 0),
            current_balance = COALESCE(current_balance, 0) + v_pay.amount + COALESCE(p_fee, 0),
            updated_at = NOW()
        WHERE id = v_pay.customer_id AND company_id = p_company_id;
    END IF;

    INSERT INTO public.cheque_dishonors (
        company_id,
        payment_id,
        customer_id,
        dishonor_date,
        reason,
        penalty_fee,
        authorized_by_name,
        actor_user_id,
        created_at
    ) VALUES (
        p_company_id,
        p_payment_id,
        v_pay.customer_id,
        CURRENT_DATE,
        COALESCE(p_reason, 'Cheque bounced / Insufficient funds'),
        COALESCE(p_fee, 0),
        COALESCE(p_authorized_by_name, 'Bank Settlement Officer'),
        COALESCE(v_auth_uid, p_actor_user_id),
        NOW()
    ) RETURNING id INTO v_dishonor_id;

    RETURN jsonb_build_object(
        'success', true,
        'dishonor_id', v_dishonor_id,
        'payment_id', p_payment_id,
        'receipt_number', v_pay.receipt_number,
        'reinstated_amount', v_pay.amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- 6. HARDENED FINANCE 360 RPCS: EXPENSE WITH JOURNAL
CREATE OR REPLACE FUNCTION public.record_expense_with_journal_atomic(
    p_company_id UUID,
    p_category_id UUID,
    p_payment_account_id UUID,
    p_amount NUMERIC,
    p_expense_date DATE DEFAULT CURRENT_DATE,
    p_payment_method TEXT DEFAULT 'cash',
    p_payee_name TEXT DEFAULT NULL,
    p_reference_no TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_authorized_by TEXT DEFAULT NULL,
    p_vendor_id UUID DEFAULT NULL,
    p_branch_id UUID DEFAULT NULL,
    p_is_recurring BOOLEAN DEFAULT FALSE,
    p_recurring_frequency TEXT DEFAULT NULL,
    p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
#variable_conflict use_variable
DECLARE
    v_expense_num TEXT;
    v_expense_id UUID;
    v_journal_id UUID;
    v_journal_num TEXT;
    v_existing_expense RECORD;
    v_pay_acc RECORD;
    v_exp_cat RECORD;
    v_auth_uid UUID;
BEGIN
    v_auth_uid := auth.uid();
    
    IF v_auth_uid IS NULL AND current_setting('request.jwt.claim.role', true) = 'anon' THEN
        RAISE EXCEPTION 'Unauthorized: Anonymous callers are not permitted to invoke financial functions.';
    END IF;

    IF v_auth_uid IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.user_id = v_auth_uid
              AND cu.company_id = p_company_id
              AND (cu.status = 'active' OR cu.is_active = true)
            UNION
            SELECT 1 FROM public.tenant_memberships tm
            WHERE tm.user_id = v_auth_uid
              AND tm.company_id = p_company_id
            UNION
            SELECT 1 FROM public.companies c
            WHERE c.id = p_company_id AND (c.owner_id = v_auth_uid OR c.created_by = v_auth_uid)
        ) THEN
            RAISE EXCEPTION 'Unauthorized: Caller is not an active member of company %', p_company_id;
        END IF;
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Expense amount must be greater than 0';
    END IF;

    SELECT * INTO v_pay_acc FROM public.accounts
    WHERE id = p_payment_account_id AND company_id = p_company_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment account % not found', p_payment_account_id;
    END IF;

    SELECT * INTO v_exp_cat FROM public.expense_categories
    WHERE id = p_category_id AND company_id = p_company_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Expense category % not found', p_category_id;
    END IF;

    IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
        SELECT id, voucher_number, amount, status
        INTO v_existing_expense
        FROM public.expenses
        WHERE company_id = p_company_id AND idempotency_key = p_idempotency_key
        LIMIT 1;

        IF FOUND THEN
            RETURN jsonb_build_object(
                'success', true,
                'is_idempotent_replay', true,
                'expense_id', v_existing_expense.id,
                'voucher_number', v_existing_expense.voucher_number,
                'amount', v_existing_expense.amount,
                'status', v_existing_expense.status
            );
        END IF;
    END IF;

    v_expense_num := public.get_next_document_number(p_company_id, 'expense');

    INSERT INTO public.expenses (
        company_id,
        branch_id,
        voucher_number,
        category_id,
        payment_account_id,
        amount,
        expense_date,
        payment_method,
        payee_name,
        reference_no,
        notes,
        authorized_by,
        vendor_id,
        is_recurring,
        recurring_frequency,
        idempotency_key,
        status,
        created_at
    ) VALUES (
        p_company_id,
        p_branch_id,
        v_expense_num,
        p_category_id,
        p_payment_account_id,
        p_amount,
        p_expense_date,
        p_payment_method,
        p_payee_name,
        p_reference_no,
        p_notes,
        COALESCE(p_authorized_by, 'Accountant / Cashier'),
        p_vendor_id,
        COALESCE(p_is_recurring, FALSE),
        p_recurring_frequency,
        p_idempotency_key,
        'paid',
        NOW()
    ) RETURNING id INTO v_expense_id;

    v_journal_num := public.get_next_document_number(p_company_id, 'journal');

    INSERT INTO public.journals (
        company_id,
        branch_id,
        voucher_number,
        entry_date,
        description,
        total_amount,
        status,
        reference_type,
        reference_id,
        created_at
    ) VALUES (
        p_company_id,
        p_branch_id,
        v_journal_num,
        p_expense_date,
        'Expense: ' || v_exp_cat.name || COALESCE(' - ' || p_payee_name, ''),
        p_amount,
        'posted',
        'expense',
        v_expense_id,
        NOW()
    ) RETURNING id INTO v_journal_id;

    IF v_exp_cat.account_id IS NOT NULL THEN
        INSERT INTO public.journal_lines (
            journal_id,
            account_id,
            description,
            debit,
            credit,
            created_at
        ) VALUES (
            v_journal_id,
            v_exp_cat.account_id,
            'Expense: ' || v_exp_cat.name,
            p_amount,
            0,
            NOW()
        );

        UPDATE public.accounts
        SET balance = balance + p_amount,
            updated_at = NOW()
        WHERE id = v_exp_cat.account_id;
    END IF;

    INSERT INTO public.journal_lines (
        journal_id,
        account_id,
        description,
        debit,
        credit,
        created_at
    ) VALUES (
        v_journal_id,
        p_payment_account_id,
        'Payment via ' || p_payment_method || ' for Expense ' || v_expense_num,
        0,
        p_amount,
        NOW()
    );

    UPDATE public.accounts
    SET balance = balance - p_amount,
        updated_at = NOW()
    WHERE id = p_payment_account_id;

    RETURN jsonb_build_object(
        'success', true,
        'expense_id', v_expense_id,
        'voucher_number', v_expense_num,
        'journal_id', v_journal_id,
        'journal_number', v_journal_num,
        'amount', p_amount,
        'payment_method', p_payment_method
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
