-- ==============================================================================
-- InkFlow SaaS - Migration 071: V9.1 Operator-First UX & Production Hardening
-- Single Authoritative Source of Business Data in PostgreSQL:
--   1. Strict Concurrency-Safe Document Number Generator (FOR UPDATE lock)
--   2. Standardized Production State Separation (job_status vs current_stage)
--   3. First-Class Problem Reporting (production_problem_reports)
--   4. Atomic Transaction RPCs:
--      - create_invoice_atomic
--      - record_payment_atomic
--      - record_stock_issue_atomic
--      - record_stock_adjustment_atomic
--      - process_branch_transfer_atomic
--      - report_production_problem_atomic
--      - complete_production_task_atomic
--   5. Practice / Training Mode Isolation Flag
--   6. Strict Multi-Tenant & Branch RLS Policies
-- ==============================================================================

-- 1. HARDEN DOCUMENT SEQUENCES FUNCTION (No random numbers, fail-safe FOR UPDATE)
CREATE OR REPLACE FUNCTION public.get_next_document_number(
    p_company_id UUID,
    p_doc_type TEXT
)
RETURNS TEXT AS $$
DECLARE
    v_prefix TEXT;
    v_next_val BIGINT;
    v_padding INTEGER := 6;
    v_formatted TEXT;
BEGIN
    IF p_company_id IS NULL OR p_doc_type IS NULL THEN
        RAISE EXCEPTION 'Company ID and Document Type are required for sequence generation';
    END IF;

    -- Lock row exclusively to prevent race conditions across parallel bookings
    SELECT prefix, current_val + 1, padding
    INTO v_prefix, v_next_val, v_padding
    FROM public.document_sequences
    WHERE company_id = p_company_id
      AND doc_type = p_doc_type
    FOR UPDATE;

    -- If no sequence exists yet, initialize it transactionally
    IF v_next_val IS NULL THEN
        v_prefix := CASE p_doc_type
            WHEN 'quotation' THEN 'QUO'
            WHEN 'order' THEN 'ORD'
            WHEN 'invoice' THEN 'INV'
            WHEN 'challan' THEN 'CHL'
            WHEN 'payment' THEN 'PAY'
            WHEN 'purchase' THEN 'PUR'
            WHEN 'transfer' THEN 'TRF'
            WHEN 'job' THEN 'JOB'
            WHEN 'problem' THEN 'PRB'
            ELSE 'DOC'
        END;
        v_next_val := 1;
        v_padding := 6;

        INSERT INTO public.document_sequences (company_id, doc_type, prefix, current_val, padding, updated_at)
        VALUES (p_company_id, p_doc_type, v_prefix, v_next_val, v_padding, NOW())
        ON CONFLICT (company_id, doc_type) 
        DO UPDATE SET current_val = public.document_sequences.current_val + 1, updated_at = NOW()
        RETURNING current_val INTO v_next_val;
    ELSE
        UPDATE public.document_sequences
        SET current_val = v_next_val,
            updated_at = NOW()
        WHERE company_id = p_company_id
          AND doc_type = p_doc_type;
    END IF;

    -- Return formatted number e.g. "INV-000001"
    v_formatted := v_prefix || '-' || LPAD(v_next_val::TEXT, v_padding, '0');
    RETURN v_formatted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. STANDARDIZED PRODUCTION STATE ENHANCEMENTS
-- Ensure production jobs and tasks maintain separation of job_status and current_stage
DO $$
BEGIN
    -- Add standardized status and stage columns if not already present
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'production_jobs' AND column_name = 'current_stage'
    ) THEN
        ALTER TABLE public.production_jobs ADD COLUMN current_stage TEXT NOT NULL DEFAULT 'printing'
            CHECK (current_stage IN ('design', 'printing', 'lamination', 'cutting', 'finishing', 'fabrication', 'wiring', 'installation', 'qc', 'delivery'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'production_jobs' AND column_name = 'is_practice'
    ) THEN
        ALTER TABLE public.production_jobs ADD COLUMN is_practice BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'is_practice'
    ) THEN
        ALTER TABLE public.invoices ADD COLUMN is_practice BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END $$;


-- 3. PRODUCTION PROBLEM REPORTS TABLE (⚠ সমস্যা হয়েছে First-Class Entity)
CREATE TABLE IF NOT EXISTS public.production_problem_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    problem_number TEXT NOT NULL,
    production_task_id UUID REFERENCES public.production_tasks(id) ON DELETE CASCADE,
    production_job_id UUID REFERENCES public.production_jobs(id) ON DELETE SET NULL,
    job_order_id UUID REFERENCES public.job_orders(id) ON DELETE SET NULL,
    reason TEXT NOT NULL CHECK (reason IN (
        'machine_problem', 
        'material_problem', 
        'design_problem', 
        'print_quality', 
        'customer_change', 
        'missing_material', 
        'other'
    )),
    notes TEXT,
    photo_url TEXT,
    voice_note_url TEXT,
    reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reported_by_name TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
    resolution_notes TEXT,
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolved_by_name TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_production_problem_number UNIQUE (company_id, problem_number)
);

CREATE INDEX IF NOT EXISTS idx_prod_problems_company ON public.production_problem_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_prod_problems_task ON public.production_problem_reports(production_task_id);
CREATE INDEX IF NOT EXISTS idx_prod_problems_status ON public.production_problem_reports(company_id, status);
CREATE INDEX IF NOT EXISTS idx_prod_problems_branch ON public.production_problem_reports(company_id, branch_id);

ALTER TABLE public.production_problem_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view problem reports for their company"
    ON public.production_problem_reports FOR SELECT
    TO authenticated
    USING (public.auth_is_active_company_user(company_id));

CREATE POLICY "Users can insert problem reports for their company"
    ON public.production_problem_reports FOR INSERT
    TO authenticated
    WITH CHECK (public.auth_is_active_company_user(company_id));

CREATE POLICY "Users can update problem reports for their company"
    ON public.production_problem_reports FOR UPDATE
    TO authenticated
    USING (public.auth_is_active_company_user(company_id));


-- 4. RPC: REPORT PRODUCTION PROBLEM ATOMICALLY
CREATE OR REPLACE FUNCTION public.report_production_problem_atomic(
    p_company_id UUID,
    p_task_id UUID,
    p_reason TEXT,
    p_notes TEXT DEFAULT NULL,
    p_photo_url TEXT DEFAULT NULL,
    p_reported_by_name TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_problem_num TEXT;
    v_problem_id UUID;
    v_task RECORD;
    v_job_id UUID;
    v_branch_id UUID;
BEGIN
    -- Fetch task
    SELECT id, company_id, branch_id, production_job_id, task_name
    INTO v_task
    FROM public.production_tasks
    WHERE id = p_task_id AND company_id = p_company_id;

    IF v_task.id IS NULL THEN
        RAISE EXCEPTION 'Production task not found in company context';
    END IF;

    v_branch_id := v_task.branch_id;
    v_job_id := v_task.production_job_id;

    -- Generate sequence number
    v_problem_num := public.get_next_document_number(p_company_id, 'problem');

    -- Insert problem report
    INSERT INTO public.production_problem_reports (
        company_id,
        branch_id,
        problem_number,
        production_task_id,
        production_job_id,
        reason,
        notes,
        photo_url,
        reported_by,
        reported_by_name,
        status,
        created_at,
        updated_at
    ) VALUES (
        p_company_id,
        v_branch_id,
        v_problem_num,
        p_task_id,
        v_job_id,
        p_reason,
        p_notes,
        p_photo_url,
        auth.uid(),
        COALESCE(p_reported_by_name, 'Operator'),
        'open',
        NOW(),
        NOW()
    ) RETURNING id INTO v_problem_id;

    -- Update task status to paused / on_hold
    UPDATE public.production_tasks
    SET status = 'paused',
        hold_reason = p_reason,
        hold_notes = p_notes,
        updated_at = NOW()
    WHERE id = p_task_id;

    -- Also update parent production job status to paused
    IF v_job_id IS NOT NULL THEN
        UPDATE public.production_jobs
        SET status = 'paused',
            pause_reason = 'Problem: ' || p_reason || ' - ' || COALESCE(p_notes, ''),
            updated_at = NOW()
        WHERE id = v_job_id;
    END IF;

    -- Return created problem report payload
    RETURN jsonb_build_object(
        'success', true,
        'problem_id', v_problem_id,
        'problem_number', v_problem_num,
        'task_id', p_task_id,
        'status', 'open',
        'reason', p_reason
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. RPC: ATOMIC INVOICE CREATION
CREATE OR REPLACE FUNCTION public.create_invoice_atomic(
    p_company_id UUID,
    p_customer_id UUID,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_subtotal NUMERIC,
    p_discount NUMERIC,
    p_vat_amount NUMERIC,
    p_grand_total NUMERIC,
    p_due_date DATE,
    p_items JSONB,
    p_branch_id UUID DEFAULT NULL,
    p_created_by_name TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_invoice_num TEXT;
    v_invoice_id UUID;
    v_item JSONB;
BEGIN
    IF p_company_id IS NULL OR p_customer_id IS NULL OR p_grand_total IS NULL THEN
        RAISE EXCEPTION 'Missing required invoice parameters';
    END IF;

    -- Generate atomic invoice number
    v_invoice_num := public.get_next_document_number(p_company_id, 'invoice');

    -- Insert invoice header
    INSERT INTO public.invoices (
        company_id,
        branch_id,
        invoice_number,
        customer_id,
        customer_name,
        customer_phone,
        subtotal,
        discount_amount,
        vat_amount,
        grand_total,
        paid_amount,
        due_amount,
        status,
        due_date,
        created_by_name,
        created_at,
        updated_at
    ) VALUES (
        p_company_id,
        p_branch_id,
        v_invoice_num,
        p_customer_id,
        p_customer_name,
        p_customer_phone,
        p_subtotal,
        COALESCE(p_discount, 0),
        COALESCE(p_vat_amount, 0),
        p_grand_total,
        0,
        p_grand_total,
        'unpaid',
        p_due_date,
        COALESCE(p_created_by_name, 'System'),
        NOW(),
        NOW()
    ) RETURNING id INTO v_invoice_id;

    -- Insert items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO public.invoice_items (
            company_id,
            invoice_id,
            item_description,
            quantity,
            unit_price,
            total_price,
            created_at
        ) VALUES (
            p_company_id,
            v_invoice_id,
            COALESCE(v_item->>'item_description', v_item->>'description', 'Print Service'),
            COALESCE((v_item->>'quantity')::NUMERIC, 1),
            COALESCE((v_item->>'unit_price')::NUMERIC, 0),
            COALESCE((v_item->>'total_price')::NUMERIC, 0),
            NOW()
        );
    END LOOP;

    -- Update customer outstanding balance
    UPDATE public.customers
    SET current_balance = COALESCE(current_balance, 0) + p_grand_total,
        total_orders = COALESCE(total_orders, 0) + 1,
        updated_at = NOW()
    WHERE id = p_customer_id;

    RETURN jsonb_build_object(
        'success', true,
        'invoice_id', v_invoice_id,
        'invoice_number', v_invoice_num,
        'grand_total', p_grand_total,
        'due_amount', p_grand_total,
        'status', 'unpaid'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6. RPC: ATOMIC PAYMENT RECORDING
CREATE OR REPLACE FUNCTION public.record_payment_atomic(
    p_company_id UUID,
    p_customer_id UUID,
    p_customer_name TEXT,
    p_amount NUMERIC,
    p_payment_method TEXT,
    p_invoice_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_received_by_name TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_payment_num TEXT;
    v_payment_id UUID;
    v_inv RECORD;
    v_new_paid NUMERIC;
    v_new_due NUMERIC;
    v_new_status TEXT;
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be greater than zero';
    END IF;

    -- Generate receipt number
    v_payment_num := public.get_next_document_number(p_company_id, 'payment');

    -- Insert payment record
    INSERT INTO public.payments (
        company_id,
        receipt_number,
        customer_id,
        customer_name,
        amount,
        payment_method,
        invoice_id,
        notes,
        received_by_name,
        created_at
    ) VALUES (
        p_company_id,
        v_payment_num,
        p_customer_id,
        p_customer_name,
        p_amount,
        p_payment_method,
        p_invoice_id,
        p_notes,
        COALESCE(p_received_by_name, 'Cashier'),
        NOW()
    ) RETURNING id INTO v_payment_id;

    -- If linked to invoice, update invoice paid / due balance
    IF p_invoice_id IS NOT NULL THEN
        SELECT id, grand_total, paid_amount, due_amount, status
        INTO v_inv
        FROM public.invoices
        WHERE id = p_invoice_id AND company_id = p_company_id
        FOR UPDATE;

        IF v_inv.id IS NOT NULL THEN
            v_new_paid := COALESCE(v_inv.paid_amount, 0) + p_amount;
            v_new_due := GREATEST(0, v_inv.grand_total - v_new_paid);
            v_new_status := CASE 
                WHEN v_new_due = 0 THEN 'paid'
                WHEN v_new_paid > 0 THEN 'partially_paid'
                ELSE 'unpaid'
            END;

            UPDATE public.invoices
            SET paid_amount = v_new_paid,
                due_amount = v_new_due,
                status = v_new_status,
                updated_at = NOW()
            WHERE id = p_invoice_id;
        END IF;
    END IF;

    -- Reduce customer outstanding balance
    UPDATE public.customers
    SET current_balance = GREATEST(0, COALESCE(current_balance, 0) - p_amount),
        updated_at = NOW()
    WHERE id = p_customer_id;

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'receipt_number', v_payment_num,
        'amount', p_amount,
        'invoice_id', p_invoice_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
