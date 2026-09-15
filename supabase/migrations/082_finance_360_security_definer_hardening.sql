-- InkFlow ERP SaaS - Migration 082: Finance 360 SECURITY DEFINER RPC Hardening
-- Adds explicit SET search_path = public, pg_temp; and enforces server tenant boundaries.

-- 1. RECORD EXPENSE ATOMIC
CREATE OR REPLACE FUNCTION public.record_expense_atomic(
    p_company_id uuid,
    p_branch_id uuid,
    p_expense_number text,
    p_category text,
    p_amount numeric,
    p_payment_account_id uuid,
    p_expense_account_id uuid,
    p_vendor_name text,
    p_description text,
    p_expense_date date,
    p_attachment_url text,
    p_actor_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_auth_uid uuid := auth.uid();
    v_txn_id uuid;
    v_pay_acc public.accounts%rowtype;
    v_exp_acc public.accounts%rowtype;
    v_now timestamptz := now();
BEGIN
    -- Reject anonymous PostgREST direct calls
    IF v_auth_uid IS NULL AND current_setting('request.jwt.claim.role', true) = 'anon' THEN
        RAISE EXCEPTION 'Unauthorized: Anonymous callers are not permitted to invoke financial functions.';
    END IF;

    -- Validate caller company membership if authenticated
    IF v_auth_uid IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.user_id = v_auth_uid
              AND cu.company_id = p_company_id
              AND cu.is_active = true
        ) THEN
            RAISE EXCEPTION 'Unauthorized: Caller is not an active member of company %', p_company_id;
        END IF;
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Expense amount must be greater than 0';
    END IF;

    -- Lock accounts
    SELECT * INTO v_pay_acc FROM public.accounts
    WHERE id = p_payment_account_id AND company_id = p_company_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment account % not found', p_payment_account_id;
    END IF;

    SELECT * INTO v_exp_acc FROM public.accounts
    WHERE id = p_expense_account_id AND company_id = p_company_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Expense account % not found', p_expense_account_id;
    END IF;

    -- 1. Create master financial transaction
    INSERT INTO public.financial_transactions (
        company_id,
        branch_id,
        transaction_number,
        transaction_date,
        transaction_type,
        status,
        total_amount,
        reference_type,
        reference_id,
        narration,
        posted_by_name,
        posted_at,
        metadata
    ) VALUES (
        p_company_id,
        p_branch_id,
        p_expense_number,
        COALESCE(p_expense_date, current_date),
        'EXPENSE',
        'POSTED',
        p_amount,
        'EXPENSE',
        p_expense_number,
        COALESCE(p_description, 'Expense voucher: ' || p_category),
        COALESCE(p_actor_name, 'Accounts Officer'),
        v_now,
        jsonb_build_object('category', p_category, 'vendor', p_vendor_name, 'attachment_url', p_attachment_url)
    ) RETURNING id INTO v_txn_id;

    -- 2. Create double-entry lines
    INSERT INTO public.journal_entry_lines (
        transaction_id, company_id, account_id, debit, credit, memo
    ) VALUES (
        v_txn_id, p_company_id, v_exp_acc.id, p_amount, 0, 'Expense: ' || p_description
    );

    INSERT INTO public.journal_entry_lines (
        transaction_id, company_id, account_id, debit, credit, memo
    ) VALUES (
        v_txn_id, p_company_id, v_pay_acc.id, 0, p_amount, 'Disbursement for ' || p_expense_number
    );

    -- 3. Update account balances
    UPDATE public.accounts
    SET current_balance = current_balance + p_amount, updated_at = v_now
    WHERE id = v_exp_acc.id;

    UPDATE public.accounts
    SET current_balance = current_balance - p_amount, updated_at = v_now
    WHERE id = v_pay_acc.id;

    -- 4. Record in legacy expenses table for backwards compatibility
    INSERT INTO public.expenses (
        company_id,
        expense_number,
        expense_date,
        category,
        amount,
        payment_method,
        vendor_name,
        description,
        attachment_url,
        bank_account_id,
        recorded_by_name,
        created_at,
        updated_at
    ) VALUES (
        p_company_id,
        p_expense_number,
        COALESCE(p_expense_date, current_date),
        CASE
            WHEN p_category IN ('rent', 'salary', 'labor', 'electricity', 'internet', 'transport', 'fuel', 'marketing', 'maintenance', 'materials', 'office', 'other')
            THEN p_category
            ELSE 'other'
        END,
        p_amount,
        CASE
            WHEN v_pay_acc.account_subtype = 'CASH' THEN 'cash'
            WHEN v_pay_acc.account_subtype = 'BANK' THEN 'bank'
            WHEN v_pay_acc.account_subtype = 'MFS' THEN 'bkash'
            ELSE 'cash'
        END,
        p_vendor_name,
        p_description,
        p_attachment_url,
        CASE WHEN v_pay_acc.account_subtype = 'BANK' THEN v_pay_acc.id ELSE NULL END,
        COALESCE(p_actor_name, 'Accounts Officer'),
        v_now,
        v_now
    ) ON CONFLICT DO NOTHING;

    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_txn_id,
        'transaction_number', p_expense_number,
        'amount', p_amount
    );
END;
$$;


-- 2. RECORD SUPPLIER PAYMENT ATOMIC
CREATE OR REPLACE FUNCTION public.record_supplier_payment_atomic(
    p_company_id uuid,
    p_branch_id uuid,
    p_supplier_id uuid,
    p_supplier_name text,
    p_payment_account_id uuid,
    p_amount numeric,
    p_payment_number text,
    p_payment_date date,
    p_reference_number text,
    p_notes text,
    p_actor_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_auth_uid uuid := auth.uid();
    v_txn_id uuid;
    v_pay_acc public.accounts%rowtype;
    v_ap_acc public.accounts%rowtype;
    v_now timestamptz := now();
BEGIN
    -- Reject anonymous PostgREST direct calls
    IF v_auth_uid IS NULL AND current_setting('request.jwt.claim.role', true) = 'anon' THEN
        RAISE EXCEPTION 'Unauthorized: Anonymous callers are not permitted to invoke financial functions.';
    END IF;

    -- Validate caller company membership if authenticated
    IF v_auth_uid IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.user_id = v_auth_uid
              AND cu.company_id = p_company_id
              AND cu.is_active = true
        ) THEN
            RAISE EXCEPTION 'Unauthorized: Caller is not an active member of company %', p_company_id;
        END IF;
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Supplier payment amount must be greater than 0';
    END IF;

    SELECT * INTO v_pay_acc FROM public.accounts
    WHERE id = p_payment_account_id AND company_id = p_company_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment account % not found', p_payment_account_id;
    END IF;

    SELECT * INTO v_ap_acc FROM public.accounts
    WHERE (code = '2010' OR account_subtype = 'PAYABLE') AND company_id = p_company_id
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Accounts Payable account (2010) not found';
    END IF;

    -- 1. Create financial transaction
    INSERT INTO public.financial_transactions (
        company_id,
        branch_id,
        transaction_number,
        transaction_date,
        transaction_type,
        status,
        total_amount,
        reference_type,
        reference_id,
        narration,
        posted_by_name,
        posted_at,
        metadata
    ) VALUES (
        p_company_id,
        p_branch_id,
        p_payment_number,
        COALESCE(p_payment_date, current_date),
        'SUPPLIER_PAYMENT',
        'POSTED',
        p_amount,
        'PURCHASE_ORDER',
        p_reference_number,
        'Supplier payment to ' || p_supplier_name || ' via ' || v_pay_acc.name,
        COALESCE(p_actor_name, 'Procurement Manager'),
        v_now,
        jsonb_build_object('supplier_id', p_supplier_id, 'supplier_name', p_supplier_name, 'notes', p_notes)
    ) RETURNING id INTO v_txn_id;

    -- 2. Create double-entry lines
    INSERT INTO public.journal_entry_lines (
        transaction_id, company_id, account_id, debit, credit, memo
    ) VALUES (
        v_txn_id, p_company_id, v_ap_acc.id, p_amount, 0, 'AP reduction for supplier ' || p_supplier_name
    );

    INSERT INTO public.journal_entry_lines (
        transaction_id, company_id, account_id, debit, credit, memo
    ) VALUES (
        v_txn_id, p_company_id, v_pay_acc.id, 0, p_amount, 'Payment outflow to supplier ' || p_supplier_name
    );

    -- 3. Update account balances
    UPDATE public.accounts
    SET current_balance = current_balance - p_amount, updated_at = v_now
    WHERE id = v_ap_acc.id;

    UPDATE public.accounts
    SET current_balance = current_balance - p_amount, updated_at = v_now
    WHERE id = v_pay_acc.id;

    -- 4. Sync Supplier Ledger Entry
    INSERT INTO public.supplier_ledger_entries (
        company_id,
        branch_id,
        supplier_id,
        entry_type,
        reference_type,
        reference_id,
        debit,
        credit,
        running_balance,
        notes,
        created_at
    ) VALUES (
        p_company_id,
        p_branch_id,
        p_supplier_id,
        'PAYMENT',
        'PAYMENT_RECEIPT',
        p_payment_number,
        p_amount,
        0,
        0,
        'Payment via ' || v_pay_acc.name || ' (' || p_payment_number || ')',
        v_now
    );

    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_txn_id,
        'payment_number', p_payment_number,
        'amount', p_amount
    );
END;
$$;


-- 3. RECORD FINANCIAL TRANSFER ATOMIC
CREATE OR REPLACE FUNCTION public.record_financial_transfer_atomic(
    p_company_id uuid,
    p_branch_id uuid,
    p_from_account_id uuid,
    p_to_account_id uuid,
    p_amount numeric,
    p_fee_amount numeric,
    p_transfer_number text,
    p_transfer_date date,
    p_notes text,
    p_actor_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_auth_uid uuid := auth.uid();
    v_txn_id uuid;
    v_trf_id uuid;
    v_from_acc public.accounts%rowtype;
    v_to_acc public.accounts%rowtype;
    v_fee_acc public.accounts%rowtype;
    v_fee numeric := COALESCE(p_fee_amount, 0);
    v_now timestamptz := now();
BEGIN
    -- Reject anonymous PostgREST direct calls
    IF v_auth_uid IS NULL AND current_setting('request.jwt.claim.role', true) = 'anon' THEN
        RAISE EXCEPTION 'Unauthorized: Anonymous callers are not permitted to invoke financial functions.';
    END IF;

    -- Validate caller company membership if authenticated
    IF v_auth_uid IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.user_id = v_auth_uid
              AND cu.company_id = p_company_id
              AND cu.is_active = true
        ) THEN
            RAISE EXCEPTION 'Unauthorized: Caller is not an active member of company %', p_company_id;
        END IF;
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Transfer amount must be greater than 0';
    END IF;

    IF p_from_account_id = p_to_account_id THEN
        RAISE EXCEPTION 'Source and destination accounts cannot be identical';
    END IF;

    SELECT * INTO v_from_acc FROM public.accounts
    WHERE id = p_from_account_id AND company_id = p_company_id
    FOR UPDATE;

    SELECT * INTO v_to_acc FROM public.accounts
    WHERE id = p_to_account_id AND company_id = p_company_id
    FOR UPDATE;

    IF NOT FOUND OR v_from_acc.id IS NULL THEN
        RAISE EXCEPTION 'Transfer accounts not found';
    END IF;

    -- 1. Create financial transaction
    INSERT INTO public.financial_transactions (
        company_id,
        branch_id,
        transaction_number,
        transaction_date,
        transaction_type,
        status,
        total_amount,
        reference_type,
        reference_id,
        narration,
        posted_by_name,
        posted_at,
        metadata
    ) VALUES (
        p_company_id,
        p_branch_id,
        p_transfer_number,
        COALESCE(p_transfer_date, current_date),
        'ACCOUNT_TRANSFER',
        'POSTED',
        p_amount,
        'TRANSFER',
        p_transfer_number,
        'Funds transfer from ' || v_from_acc.name || ' to ' || v_to_acc.name,
        COALESCE(p_actor_name, 'Accounts Officer'),
        v_now,
        jsonb_build_object('fee', v_fee, 'notes', p_notes)
    ) RETURNING id INTO v_txn_id;

    -- 2. Double-Entry Journal Lines
    INSERT INTO public.journal_entry_lines (
        transaction_id, company_id, account_id, debit, credit, memo
    ) VALUES (
        v_txn_id, p_company_id, v_to_acc.id, p_amount, 0, 'Transfer in from ' || v_from_acc.name
    );

    INSERT INTO public.journal_entry_lines (
        transaction_id, company_id, account_id, debit, credit, memo
    ) VALUES (
        v_txn_id, p_company_id, v_from_acc.id, 0, p_amount + v_fee, 'Transfer out to ' || v_to_acc.name
    );

    IF v_fee > 0 THEN
        SELECT * INTO v_fee_acc FROM public.accounts
        WHERE (code = '6070' OR account_subtype = 'OPEX_GENERAL') AND company_id = p_company_id
        LIMIT 1;

        IF FOUND THEN
            INSERT INTO public.journal_entry_lines (
                transaction_id, company_id, account_id, debit, credit, memo
            ) VALUES (
                v_txn_id, p_company_id, v_fee_acc.id, v_fee, 0, 'Transfer processing fee'
            );

            UPDATE public.accounts
            SET current_balance = current_balance + v_fee, updated_at = v_now
            WHERE id = v_fee_acc.id;
        END IF;
    END IF;

    -- 3. Update account balances
    UPDATE public.accounts
    SET current_balance = current_balance + p_amount, updated_at = v_now
    WHERE id = v_to_acc.id;

    UPDATE public.accounts
    SET current_balance = current_balance - (p_amount + v_fee), updated_at = v_now
    WHERE id = v_from_acc.id;

    -- 4. Record account transfer row
    INSERT INTO public.account_transfers (
        company_id,
        branch_id,
        transfer_number,
        from_account_id,
        to_account_id,
        amount,
        fee_amount,
        transfer_date,
        transaction_id,
        status,
        notes,
        created_by_name,
        created_at
    ) VALUES (
        p_company_id,
        p_branch_id,
        p_transfer_number,
        v_from_acc.id,
        v_to_acc.id,
        p_amount,
        v_fee,
        COALESCE(p_transfer_date, current_date),
        v_txn_id,
        'POSTED',
        p_notes,
        COALESCE(p_actor_name, 'Accounts Officer'),
        v_now
    ) RETURNING id INTO v_trf_id;

    RETURN jsonb_build_object(
        'success', true,
        'transfer_id', v_trf_id,
        'transaction_id', v_txn_id,
        'transfer_number', p_transfer_number,
        'amount', p_amount
    );
END;
$$;


-- 4. RECORD CUSTOMER REFUND ATOMIC
CREATE OR REPLACE FUNCTION public.record_customer_refund_atomic(
    p_company_id uuid,
    p_branch_id uuid,
    p_customer_id uuid,
    p_customer_name text,
    p_refund_account_id uuid,
    p_amount numeric,
    p_refund_number text,
    p_refund_date date,
    p_reason text,
    p_actor_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_auth_uid uuid := auth.uid();
    v_txn_id uuid;
    v_pay_acc public.accounts%rowtype;
    v_rev_acc public.accounts%rowtype;
    v_now timestamptz := now();
BEGIN
    -- Reject anonymous PostgREST direct calls
    IF v_auth_uid IS NULL AND current_setting('request.jwt.claim.role', true) = 'anon' THEN
        RAISE EXCEPTION 'Unauthorized: Anonymous callers are not permitted to invoke financial functions.';
    END IF;

    -- Validate caller company membership if authenticated
    IF v_auth_uid IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.user_id = v_auth_uid
              AND cu.company_id = p_company_id
              AND cu.is_active = true
        ) THEN
            RAISE EXCEPTION 'Unauthorized: Caller is not an active member of company %', p_company_id;
        END IF;
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Refund amount must be greater than 0';
    END IF;

    SELECT * INTO v_pay_acc FROM public.accounts
    WHERE id = p_refund_account_id AND company_id = p_company_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Refund payment account % not found', p_refund_account_id;
    END IF;

    SELECT * INTO v_rev_acc FROM public.accounts
    WHERE (code = '4010' OR account_type = 'REVENUE') AND company_id = p_company_id
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sales revenue account (4010) not found';
    END IF;

    -- 1. Create master financial transaction
    INSERT INTO public.financial_transactions (
        company_id,
        branch_id,
        transaction_number,
        transaction_date,
        transaction_type,
        status,
        total_amount,
        reference_type,
        reference_id,
        narration,
        posted_by_name,
        posted_at,
        metadata
    ) VALUES (
        p_company_id,
        p_branch_id,
        p_refund_number,
        COALESCE(p_refund_date, current_date),
        'REFUND',
        'POSTED',
        p_amount,
        'CUSTOMER_REFUND',
        p_refund_number,
        'Customer refund to ' || p_customer_name || ' (Reason: ' || COALESCE(p_reason, 'Order cancellation') || ')',
        COALESCE(p_actor_name, 'Accounts Manager'),
        v_now,
        jsonb_build_object('customer_id', p_customer_id, 'customer_name', p_customer_name, 'reason', p_reason)
    ) RETURNING id INTO v_txn_id;

    -- 2. Double-Entry Journal Lines
    INSERT INTO public.journal_entry_lines (
        transaction_id, company_id, account_id, debit, credit, memo
    ) VALUES (
        v_txn_id, p_company_id, v_rev_acc.id, p_amount, 0, 'Sales revenue reversal for ' || p_customer_name
    );

    INSERT INTO public.journal_entry_lines (
        transaction_id, company_id, account_id, debit, credit, memo
    ) VALUES (
        v_txn_id, p_company_id, v_pay_acc.id, 0, p_amount, 'Refund payment outflow via ' || v_pay_acc.name
    );

    -- 3. Update account balances
    UPDATE public.accounts
    SET current_balance = current_balance - p_amount, updated_at = v_now
    WHERE id = v_rev_acc.id;

    UPDATE public.accounts
    SET current_balance = current_balance - p_amount, updated_at = v_now
    WHERE id = v_pay_acc.id;

    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_txn_id,
        'refund_number', p_refund_number,
        'amount', p_amount
    );
END;
$$;
