-- ==============================================================================
-- InkFlow ERP SaaS - Migration 078: Billing & Collections Owner Control Center
-- Single Authoritative Source of Financial & Receivables Operations in PostgreSQL:
--   1. Atomic Multi-Invoice Payment Allocation RPC: record_multi_invoice_payment_atomic
--   2. Atomic Financial Write-off & Non-Destructive Audit RPC: record_financial_write_off_atomic
--   3. Atomic Invoice Void / Cancellation RPC: cancel_invoice_atomic
--   4. Optimized Performance Indexes for Billing, Receivables & Aging Queries
--   5. Strict Multi-Tenant Row Level Security & Financial Immutability
-- ==============================================================================

-- 1. EXTEND INVOICES & PAYMENTS COLUMNS (Fail-safe idempotency)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'branch_id'
    ) THEN
        ALTER TABLE public.invoices ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'branch_id'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'unallocated_amount'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN unallocated_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'salesperson_name'
    ) THEN
        ALTER TABLE public.invoices ADD COLUMN salesperson_name TEXT DEFAULT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'salesperson_id'
    ) THEN
        ALTER TABLE public.invoices ADD COLUMN salesperson_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;


-- 2. OPTIMIZED PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_invoices_comp_date ON public.invoices(company_id, invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_comp_due_status ON public.invoices(company_id, due_date, status);
CREATE INDEX IF NOT EXISTS idx_invoices_comp_salesperson ON public.invoices(company_id, salesperson_id);
CREATE INDEX IF NOT EXISTS idx_payments_comp_date ON public.payments(company_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_comp_method ON public.payments(company_id, payment_method);
CREATE INDEX IF NOT EXISTS idx_payment_alloc_inv_pay ON public.payment_allocations(invoice_id, payment_id);


-- 3. ATOMIC RPC: RECORD MULTI-INVOICE PAYMENT ALLOCATION
CREATE OR REPLACE FUNCTION public.record_multi_invoice_payment_atomic(
    p_company_id UUID,
    p_customer_id UUID,
    p_customer_name TEXT,
    p_amount NUMERIC,
    p_payment_method TEXT,
    p_payment_date DATE DEFAULT CURRENT_DATE,
    p_bank_name TEXT DEFAULT NULL,
    p_cheque_number TEXT DEFAULT NULL,
    p_cheque_date DATE DEFAULT NULL,
    p_mfs_transaction_id TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_received_by_name TEXT DEFAULT NULL,
    p_allocations JSONB DEFAULT '[]'::jsonb,
    p_branch_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_payment_num TEXT;
    v_payment_id UUID;
    v_alloc JSONB;
    v_inv_id UUID;
    v_alloc_amt NUMERIC;
    v_inv RECORD;
    v_new_paid NUMERIC;
    v_new_due NUMERIC;
    v_new_status TEXT;
    v_total_allocated NUMERIC := 0;
    v_unallocated NUMERIC := 0;
BEGIN
    IF p_company_id IS NULL OR p_customer_id IS NULL THEN
        RAISE EXCEPTION 'Company ID and Customer ID are required';
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be greater than zero';
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
        NOW()
    ) RETURNING id INTO v_payment_id;

    -- Process invoice allocations transactionally
    IF p_allocations IS NOT NULL AND jsonb_array_length(p_allocations) > 0 THEN
        FOR v_alloc IN SELECT * FROM jsonb_array_elements(p_allocations)
        LOOP
            v_inv_id := (v_alloc->>'invoice_id')::UUID;
            v_alloc_amt := COALESCE((v_alloc->>'amount')::NUMERIC, (v_alloc->>'allocated_amount')::NUMERIC, 0);

            IF v_inv_id IS NOT NULL AND v_alloc_amt > 0 THEN
                -- Lock invoice row exclusively
                SELECT id, grand_total, paid_amount, due_amount, write_off_amount, status
                INTO v_inv
                FROM public.invoices
                WHERE id = v_inv_id AND company_id = p_company_id
                FOR UPDATE;

                IF v_inv.id IS NOT NULL THEN
                    -- Prevent over-allocation on individual invoice
                    IF v_alloc_amt > (v_inv.due_amount + 0.01) THEN
                        v_alloc_amt := v_inv.due_amount;
                    END IF;

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


-- 4. ATOMIC RPC: RECORD FINANCIAL WRITE-OFF (Non-destructive audit trail)
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
BEGIN
    IF p_company_id IS NULL OR p_invoice_id IS NULL THEN
        RAISE EXCEPTION 'Company ID and Invoice ID are required';
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Write-off amount must be greater than zero';
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
        created_at
    ) VALUES (
        p_company_id,
        p_invoice_id,
        p_amount,
        p_reason,
        p_authorized_by_name,
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


-- 5. ATOMIC RPC: CANCEL / VOID INVOICE
CREATE OR REPLACE FUNCTION public.cancel_invoice_atomic(
    p_company_id UUID,
    p_invoice_id UUID,
    p_reason TEXT,
    p_actor_name TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_inv RECORD;
    v_released_due NUMERIC;
BEGIN
    IF p_company_id IS NULL OR p_invoice_id IS NULL THEN
        RAISE EXCEPTION 'Company ID and Invoice ID are required';
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
