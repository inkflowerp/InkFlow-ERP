-- ==============================================================================
-- PrintFlow - Migration 116: Server-Side Financial Totals, Strict Check Constraints,
-- Consolidated Fiscal-Year Document Sequences, Idempotency & Unified Ledger Reconciliation
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ADD / HARMONIZE IDEMPOTENCY KEY ON ALL MONEY-MOVING TABLES
-- ------------------------------------------------------------------------------

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_company_idempotency
    ON public.invoices(company_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL AND idempotency_key <> '';

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_company_idempotency
    ON public.payments(company_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL AND idempotency_key <> '';

ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_expenses_company_idempotency
    ON public.expenses(company_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL AND idempotency_key <> '';

ALTER TABLE public.stock_ledger ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_ledger_company_idempotency
    ON public.stock_ledger(company_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL AND idempotency_key <> '';

-- ------------------------------------------------------------------------------
-- 2. HARDEN FINANCIAL CHECK CONSTRAINTS ACROSS INVOICES, QUOTATIONS & POs
-- ------------------------------------------------------------------------------

-- Invoices Check Constraints
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS chk_invoice_subtotal_non_neg;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS chk_invoice_discount_non_neg;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS chk_invoice_vat_non_neg;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS chk_invoice_grand_total_non_neg;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS chk_invoice_paid_non_neg;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS chk_invoice_due_non_neg;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS chk_invoice_paid_le_grand;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS chk_invoice_grand_total_formula;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS chk_invoice_paid_plus_due;

-- Sanitize any legacy drift before applying constraints
UPDATE public.invoices
SET 
    subtotal = GREATEST(0, COALESCE(subtotal, 0)),
    discount_amount = GREATEST(0, COALESCE(discount_amount, 0)),
    vat_amount = GREATEST(0, COALESCE(vat_amount, 0)),
    grand_total = ROUND(GREATEST(0, COALESCE(subtotal, 0)) - GREATEST(0, COALESCE(discount_amount, 0)) + GREATEST(0, COALESCE(vat_amount, 0)), 2),
    paid_amount = LEAST(
        ROUND(GREATEST(0, COALESCE(subtotal, 0)) - GREATEST(0, COALESCE(discount_amount, 0)) + GREATEST(0, COALESCE(vat_amount, 0)), 2),
        GREATEST(0, COALESCE(paid_amount, 0))
    ),
    due_amount = GREATEST(0, ROUND(GREATEST(0, COALESCE(subtotal, 0)) - GREATEST(0, COALESCE(discount_amount, 0)) + GREATEST(0, COALESCE(vat_amount, 0)), 2) - 
        LEAST(
            ROUND(GREATEST(0, COALESCE(subtotal, 0)) - GREATEST(0, COALESCE(discount_amount, 0)) + GREATEST(0, COALESCE(vat_amount, 0)), 2),
            GREATEST(0, COALESCE(paid_amount, 0))
        ) - COALESCE(write_off_amount, 0))
WHERE grand_total <> ROUND(COALESCE(subtotal, 0) - COALESCE(discount_amount, 0) + COALESCE(vat_amount, 0), 2)
   OR paid_amount > grand_total
   OR ROUND(paid_amount + due_amount + COALESCE(write_off_amount, 0), 2) <> ROUND(grand_total, 2);

ALTER TABLE public.invoices
    ADD CONSTRAINT chk_invoice_subtotal_non_neg CHECK (subtotal >= 0),
    ADD CONSTRAINT chk_invoice_discount_non_neg CHECK (discount_amount >= 0),
    ADD CONSTRAINT chk_invoice_vat_non_neg CHECK (vat_amount >= 0),
    ADD CONSTRAINT chk_invoice_grand_total_non_neg CHECK (grand_total >= 0),
    ADD CONSTRAINT chk_invoice_paid_non_neg CHECK (paid_amount >= 0),
    ADD CONSTRAINT chk_invoice_due_non_neg CHECK (due_amount >= 0),
    ADD CONSTRAINT chk_invoice_paid_le_grand CHECK (paid_amount <= grand_total),
    ADD CONSTRAINT chk_invoice_grand_total_formula CHECK (ROUND(grand_total, 2) = ROUND(subtotal - discount_amount + vat_amount, 2)),
    ADD CONSTRAINT chk_invoice_paid_plus_due CHECK (ROUND(paid_amount + due_amount + COALESCE(write_off_amount, 0), 2) = ROUND(grand_total, 2));

-- Quotations Check Constraints
ALTER TABLE public.quotations DROP CONSTRAINT IF EXISTS chk_quotation_subtotal_non_neg;
ALTER TABLE public.quotations DROP CONSTRAINT IF EXISTS chk_quotation_discount_non_neg;
ALTER TABLE public.quotations DROP CONSTRAINT IF EXISTS chk_quotation_vat_non_neg;
ALTER TABLE public.quotations DROP CONSTRAINT IF EXISTS chk_quotation_grand_total_non_neg;
ALTER TABLE public.quotations DROP CONSTRAINT IF EXISTS chk_quotation_grand_total_formula;

UPDATE public.quotations
SET
    subtotal = GREATEST(0, COALESCE(subtotal, 0)),
    discount_amount = GREATEST(0, COALESCE(discount_amount, 0)),
    vat_amount = GREATEST(0, COALESCE(vat_amount, 0)),
    grand_total = ROUND(GREATEST(0, COALESCE(subtotal, 0)) - GREATEST(0, COALESCE(discount_amount, 0)) + GREATEST(0, COALESCE(vat_amount, 0)), 2)
WHERE grand_total <> ROUND(COALESCE(subtotal, 0) - COALESCE(discount_amount, 0) + COALESCE(vat_amount, 0), 2);

ALTER TABLE public.quotations
    ADD CONSTRAINT chk_quotation_subtotal_non_neg CHECK (subtotal >= 0),
    ADD CONSTRAINT chk_quotation_discount_non_neg CHECK (discount_amount >= 0),
    ADD CONSTRAINT chk_quotation_vat_non_neg CHECK (vat_amount >= 0),
    ADD CONSTRAINT chk_quotation_grand_total_non_neg CHECK (grand_total >= 0),
    ADD CONSTRAINT chk_quotation_grand_total_formula CHECK (ROUND(grand_total, 2) = ROUND(subtotal - discount_amount + vat_amount, 2));

-- Purchase Orders Check Constraints
ALTER TABLE public.purchase_orders DROP CONSTRAINT IF EXISTS chk_po_subtotal_non_neg;
ALTER TABLE public.purchase_orders DROP CONSTRAINT IF EXISTS chk_po_vat_non_neg;
ALTER TABLE public.purchase_orders DROP CONSTRAINT IF EXISTS chk_po_grand_total_non_neg;
ALTER TABLE public.purchase_orders DROP CONSTRAINT IF EXISTS chk_po_grand_total_formula;

UPDATE public.purchase_orders
SET
    subtotal = GREATEST(0, COALESCE(subtotal, 0)),
    vat_amount = GREATEST(0, COALESCE(vat_amount, 0)),
    grand_total = ROUND(GREATEST(0, COALESCE(subtotal, 0)) - GREATEST(0, COALESCE(discount_amount, 0)) + GREATEST(0, COALESCE(vat_amount, 0)), 2)
WHERE grand_total <> ROUND(COALESCE(subtotal, 0) - COALESCE(discount_amount, 0) + COALESCE(vat_amount, 0), 2);

ALTER TABLE public.purchase_orders
    ADD CONSTRAINT chk_po_subtotal_non_neg CHECK (subtotal >= 0),
    ADD CONSTRAINT chk_po_vat_non_neg CHECK (vat_amount >= 0),
    ADD CONSTRAINT chk_po_grand_total_non_neg CHECK (grand_total >= 0),
    ADD CONSTRAINT chk_po_grand_total_formula CHECK (ROUND(grand_total, 2) = ROUND(subtotal - COALESCE(discount_amount, 0) + vat_amount, 2));

-- ------------------------------------------------------------------------------
-- 3. UNIFIED FISCAL-YEAR GAP-AWARE DOCUMENT NUMBERING ENGINE
-- ------------------------------------------------------------------------------

-- Consolidate document_sequences to support fiscal_year
ALTER TABLE public.document_sequences 
    ADD COLUMN IF NOT EXISTS fiscal_year TEXT DEFAULT TO_CHAR(CURRENT_DATE, 'YYYY');

-- Drop old constraints and create composite uniqueness per company, doc_type, and fiscal_year
ALTER TABLE public.document_sequences DROP CONSTRAINT IF EXISTS document_sequences_company_id_doc_type_key;
ALTER TABLE public.document_sequences DROP CONSTRAINT IF EXISTS uk_company_doc_type_year;

CREATE UNIQUE INDEX IF NOT EXISTS uk_doc_sequences_company_type_year
    ON public.document_sequences (company_id, doc_type, fiscal_year);

-- Canonical, gap-aware, per-company, per-fiscal-year numbering generator
CREATE OR REPLACE FUNCTION public.get_next_document_number(
    p_company_id UUID,
    p_doc_type TEXT,
    p_fiscal_year TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_fiscal_year TEXT;
    v_prefix TEXT;
    v_next_val BIGINT;
    v_padding INTEGER := 6;
    v_formatted TEXT;
BEGIN
    IF p_company_id IS NULL OR p_doc_type IS NULL THEN
        RAISE EXCEPTION 'Company ID and Document Type are required for sequence generation';
    END IF;

    -- Determine fiscal year (default to Bangladesh calendar year YYYY)
    v_fiscal_year := COALESCE(p_fiscal_year, TO_CHAR(CURRENT_DATE, 'YYYY'));

    -- Determine standard prefix
    v_prefix := CASE LOWER(p_doc_type)
        WHEN 'quotation' THEN 'QUO'
        WHEN 'order' THEN 'ORD'
        WHEN 'invoice' THEN 'INV'
        WHEN 'challan' THEN 'CHL'
        WHEN 'payment' THEN 'PAY'
        WHEN 'purchase' THEN 'PUR'
        WHEN 'transfer' THEN 'TRF'
        WHEN 'job' THEN 'JOB'
        WHEN 'problem' THEN 'PRB'
        WHEN 'customer' THEN 'CUST'
        WHEN 'receipt' THEN 'REC'
        ELSE 'DOC'
    END;

    IF LOWER(p_doc_type) = 'customer' THEN
        v_padding := 4;
    ELSE
        v_padding := 6;
    END IF;

    -- Concurrency Lock: Lock sequence row for update to guarantee strictly gapless sequential numbers
    SELECT current_val + 1, padding, prefix
    INTO v_next_val, v_padding, v_prefix
    FROM public.document_sequences
    WHERE company_id = p_company_id
      AND doc_type = p_doc_type
      AND fiscal_year = v_fiscal_year
    FOR UPDATE;

    IF v_next_val IS NULL THEN
        v_next_val := 1;
        INSERT INTO public.document_sequences (
            company_id,
            doc_type,
            fiscal_year,
            prefix,
            current_val,
            padding,
            updated_at
        ) VALUES (
            p_company_id,
            p_doc_type,
            v_fiscal_year,
            v_prefix,
            v_next_val,
            v_padding,
            NOW()
        )
        ON CONFLICT (company_id, doc_type, fiscal_year)
        DO UPDATE SET current_val = public.document_sequences.current_val + 1, updated_at = NOW()
        RETURNING current_val INTO v_next_val;
    ELSE
        UPDATE public.document_sequences
        SET current_val = v_next_val,
            updated_at = NOW()
        WHERE company_id = p_company_id
          AND doc_type = p_doc_type
          AND fiscal_year = v_fiscal_year;
    END IF;

    -- Format standard: PREFIX-YEAR-PADDING (e.g. INV-2026-000001)
    v_formatted := v_prefix || '-' || v_fiscal_year || '-' || LPAD(v_next_val::TEXT, v_padding, '0');
    RETURN v_formatted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_next_document_number(UUID, TEXT, TEXT) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 4. OVERWRITE & RECOMPUTE TOTALS SERVER-SIDE IN create_invoice_atomic
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_invoice_atomic(
    p_company_id uuid,
    p_branch_id uuid default null::uuid,
    p_customer_id uuid default null::uuid,
    p_customer_name text default 'Walk-in Customer'::text,
    p_customer_phone text default ''::text,
    p_customer_email text default null::text,
    p_customer_address text default null::text,
    p_customer_bin text default null::text,
    p_customer_tin text default null::text,
    p_customer_company text default null::text,
    p_customer_type text default 'retail'::text,
    p_invoice_type text default 'sales_invoice'::text,
    p_invoice_date date default current_date,
    p_due_date date default null::date,
    p_quotation_id uuid default null::uuid,
    p_sales_order_id uuid default null::uuid,
    p_job_order_id uuid default null::uuid,
    p_order_number text default null::text,
    p_reference_no text default null::text,
    p_subtotal numeric default 0,
    p_discount_amount numeric default 0,
    p_vat_percentage numeric default 0,
    p_vat_amount numeric default 0,
    p_grand_total numeric default 0,
    p_paid_amount numeric default 0,
    p_due_amount numeric default 0,
    p_advance_percentage numeric default 0,
    p_advance_amount numeric default 0,
    p_due_on_delivery numeric default null::numeric,
    p_payment_method text default 'cash'::text,
    p_payment_method_note text default null::text,
    p_mushak_version text default null::text,
    p_language_mode text default 'bn'::text,
    p_delivery_date date default null::date,
    p_delivery_location text default null::text,
    p_delivery_method text default 'customer_pickup'::text,
    p_installation_required boolean default false,
    p_notes text default null::text,
    p_terms_and_conditions text default null::text,
    p_created_by_name text default 'Commercial Executive'::text,
    p_idempotency_key text default null::text,
    p_actor_user_id uuid default null::uuid,
    p_items jsonb default '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_variable
DECLARE
    v_auth_uid uuid;
    v_effective_actor_id uuid;
    v_actor_display_name text;
    v_existing_invoice record;
    v_invoice_num text;
    v_invoice_id uuid;
    v_item jsonb;
    v_status text;
    v_due_date date;
    v_payment_id uuid;
    v_receipt_num text;

    -- Server-side authoritative recomputed totals
    v_calc_subtotal numeric := 0;
    v_calc_discount numeric := 0;
    v_calc_vat_pct numeric := 0;
    v_calc_vat_amount numeric := 0;
    v_calc_grand_total numeric := 0;
    v_calc_paid numeric := 0;
    v_calc_due numeric := 0;
    v_vat_enabled boolean := true;
    v_default_vat_rate numeric := 15.00;
    v_item_qty numeric;
    v_item_price numeric;
    v_item_line_total numeric;
BEGIN
    IF p_company_id IS NULL THEN
        RAISE EXCEPTION 'Company ID is required for invoice creation';
    END IF;

    -- Strict Session & Permission Check
    IF auth.role() = 'authenticated' OR auth.uid() IS NOT NULL THEN
        v_auth_uid := auth.uid();
        IF v_auth_uid IS NULL THEN
            RAISE EXCEPTION 'Unauthorized: Authenticated session required for financial operations';
        END IF;

        IF NOT public.auth_user_has_company_access(p_company_id) THEN
            RAISE EXCEPTION 'Unauthorized: User does not belong to target company context';
        END IF;

        IF NOT (
            public.auth_user_has_permission(p_company_id, 'invoice.create')
            OR public.auth_user_has_permission(p_company_id, 'invoice.full_control')
        ) THEN
            RAISE EXCEPTION 'Permission denied: invoice.create required for company %', p_company_id;
        END IF;

        v_effective_actor_id := v_auth_uid;
    ELSIF auth.role() = 'anon' THEN
        RAISE EXCEPTION 'Unauthorized: Anonymous callers are not permitted to invoke financial functions.';
    ELSE
        v_effective_actor_id := COALESCE(auth.uid(), p_actor_user_id);
    END IF;

    -- Resolve trustworthy display name for actor
    SELECT COALESCE(full_name, p_created_by_name, 'Commercial Executive')
    INTO v_actor_display_name
    FROM public.profiles
    WHERE id = v_effective_actor_id;

    IF v_actor_display_name IS NULL THEN
        v_actor_display_name := COALESCE(p_created_by_name, 'Commercial Executive');
    END IF;

    -- 1. Idempotency Check: Returns existing invoice if key already processed
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

    -- --------------------------------------------------------------------------
    -- 2. SERVER-SIDE AUTHORITATIVE RECOMPUTATION OF TOTALS
    -- Reject / overwrite caller-supplied totals using database tax rules
    -- --------------------------------------------------------------------------
    IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
        LOOP
            v_item_qty := GREATEST(0, COALESCE((v_item->>'quantity')::numeric, 1));
            v_item_price := GREATEST(0, COALESCE((v_item->>'unit_price')::numeric, 0));
            v_item_line_total := ROUND(v_item_qty * v_item_price, 2);
            v_calc_subtotal := v_calc_subtotal + v_item_line_total;
        END LOOP;
    ELSE
        v_calc_subtotal := GREATEST(0, COALESCE(p_subtotal, 0));
    END IF;

    -- Lookup company tax settings
    SELECT vat_enabled, default_vat_rate
    INTO v_vat_enabled, v_default_vat_rate
    FROM public.company_tax_settings
    WHERE company_id = p_company_id
    LIMIT 1;

    IF v_vat_enabled IS NULL THEN
        v_vat_enabled := true;
        v_default_vat_rate := 15.00;
    END IF;

    IF v_vat_enabled THEN
        v_calc_vat_pct := COALESCE(p_vat_percentage, v_default_vat_rate, 0);
    ELSE
        v_calc_vat_pct := 0;
    END IF;

    -- Recompute discount (capped at subtotal)
    v_calc_discount := LEAST(v_calc_subtotal, GREATEST(0, ROUND(COALESCE(p_discount_amount, 0), 2)));
    
    -- Taxable base
    -- VAT amount
    v_calc_vat_amount := ROUND((v_calc_subtotal - v_calc_discount) * (v_calc_vat_pct / 100.0), 2);
    
    -- Grand total
    v_calc_grand_total := ROUND(v_calc_subtotal - v_calc_discount + v_calc_vat_amount, 2);

    -- Paid amount (cannot exceed grand total)
    v_calc_paid := LEAST(v_calc_grand_total, GREATEST(0, ROUND(COALESCE(p_paid_amount, 0), 2)));
    
    -- Due amount
    v_calc_due := ROUND(v_calc_grand_total - v_calc_paid, 2);

    -- 3. Determine Initial Invoice Status
    IF v_calc_paid >= v_calc_grand_total AND v_calc_grand_total > 0 THEN
        v_status := 'paid';
    ELSIF v_calc_paid > 0 THEN
        v_status := 'partially_paid';
    ELSE
        v_status := 'unpaid';
    END IF;

    v_due_date := COALESCE(p_due_date, COALESCE(p_invoice_date, CURRENT_DATE) + INTERVAL '30 days');

    -- 4. Atomic Gap-Aware Sequential Number Generation
    v_invoice_num := public.get_next_document_number(p_company_id, 'invoice');

    -- 5. Insert Master Invoice Row with Authoritative Recomputed Totals
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
        customer_email,
        quotation_id,
        job_order_id,
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
        v_calc_subtotal,
        v_calc_discount,
        v_calc_vat_pct,
        v_calc_vat_amount,
        v_calc_grand_total,
        v_calc_paid,
        v_calc_due,
        0,
        p_notes,
        p_terms_and_conditions,
        v_actor_display_name,
        p_idempotency_key,
        p_customer_email,
        p_quotation_id,
        p_job_order_id,
        NOW(),
        NOW()
    ) RETURNING id INTO v_invoice_id;

    -- 6. Insert Line Items with Authoritative Line Totals
    IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
        LOOP
            v_item_qty := GREATEST(0, COALESCE((v_item->>'quantity')::numeric, 1));
            v_item_price := GREATEST(0, COALESCE((v_item->>'unit_price')::numeric, 0));
            v_item_line_total := ROUND(v_item_qty * v_item_price, 2);

            INSERT INTO public.invoice_items (
                invoice_id,
                item_description,
                dimensions_spec,
                quantity,
                unit,
                unit_price,
                vat_percentage,
                total_price,
                product_id,
                created_at
            ) VALUES (
                v_invoice_id,
                COALESCE(v_item->>'item_description', v_item->>'item_name', v_item->>'description', 'Printing Item'),
                v_item->>'dimensions_spec',
                v_item_qty,
                COALESCE(v_item->>'unit', 'pcs'),
                v_item_price,
                COALESCE((v_item->>'vat_percentage')::numeric, v_calc_vat_pct),
                v_item_line_total,
                CASE WHEN (v_item->>'product_id') ~ '^[0-9a-fA-F-]{36}$' THEN (v_item->>'product_id')::uuid ELSE NULL END,
                NOW()
            );
        END LOOP;
    END IF;

    -- 7. Dual-Entry Accounting: Record Payment for Advance if paid_amount > 0
    IF v_calc_paid > 0 THEN
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
            'advance',
            COALESCE(p_payment_method, 'cash'),
            v_calc_paid,
            0,
            COALESCE(p_payment_method_note, 'Immediate advance on invoice creation'),
            v_actor_display_name,
            CASE WHEN p_idempotency_key IS NOT NULL THEN p_idempotency_key || ':pmt' ELSE NULL END,
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
            v_calc_paid,
            NOW()
        );
    END IF;

    -- 8. Concurrency Safe Customer Balance Reconciliation
    IF p_customer_id IS NOT NULL THEN
        PERFORM public.reconcile_customer_balance_atomic(p_company_id, p_customer_id);
    END IF;

    -- 9. Audit Logging with Actor ID
    INSERT INTO public.audit_logs (
        company_id,
        user_id,
        action,
        entity_type,
        entity_id,
        new_values,
        notes,
        created_at
    ) VALUES (
        p_company_id,
        v_effective_actor_id,
        'invoice.created_atomic',
        'invoice',
        v_invoice_id,
        jsonb_build_object(
            'invoice_number', v_invoice_num,
            'subtotal', v_calc_subtotal,
            'discount', v_calc_discount,
            'vat', v_calc_vat_amount,
            'grand_total', v_calc_grand_total,
            'paid', v_calc_paid,
            'due', v_calc_due
        ),
        'Created invoice ' || v_invoice_num || ' with server-enforced totals',
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'is_idempotent_replay', false,
        'invoice_id', v_invoice_id,
        'invoice_number', v_invoice_num,
        'subtotal', v_calc_subtotal,
        'discount_amount', v_calc_discount,
        'vat_amount', v_calc_vat_amount,
        'grand_total', v_calc_grand_total,
        'paid_amount', v_calc_paid,
        'due_amount', v_calc_due,
        'status', v_status
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_invoice_atomic TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 5. UPGRADED RECONCILIATION ENGINE & DRIFT DETECTION
-- ------------------------------------------------------------------------------

-- Upgraded reconcile_customer_balance_atomic with drift detection
CREATE OR REPLACE FUNCTION public.reconcile_customer_balance_atomic(
    p_company_id UUID,
    p_customer_id UUID DEFAULT NULL::UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_variable
DECLARE
    v_cust RECORD;
    v_calc_invoiced NUMERIC;
    v_calc_paid NUMERIC;
    v_calc_due NUMERIC;
    v_drift NUMERIC := 0;
    v_reconciled_count INT := 0;
    v_drift_count INT := 0;
BEGIN
    IF p_company_id IS NULL THEN
        RAISE EXCEPTION 'Company ID is required for balance reconciliation';
    END IF;

    FOR v_cust IN
        SELECT id, name, total_invoiced_amount, total_paid_amount, total_due_balance
        FROM public.customers
        WHERE company_id = p_company_id AND (p_customer_id IS NULL OR id = p_customer_id)
        FOR UPDATE
    LOOP
        -- Invoiced: Sum of non-cancelled invoices
        SELECT COALESCE(SUM(grand_total), 0)
        INTO v_calc_invoiced
        FROM public.invoices
        WHERE company_id = p_company_id AND customer_id = v_cust.id AND status <> 'cancelled';

        -- Paid: Sum of recorded payments
        SELECT COALESCE(SUM(amount), 0)
        INTO v_calc_paid
        FROM public.payments
        WHERE company_id = p_company_id AND customer_id = v_cust.id;

        -- Due: Sum of remaining dues on non-cancelled invoices minus write-offs
        SELECT COALESCE(SUM(due_amount), 0)
        INTO v_calc_due
        FROM public.invoices
        WHERE company_id = p_company_id AND customer_id = v_cust.id AND status <> 'cancelled';

        -- Detect drift
        IF ROUND(v_cust.total_due_balance, 2) <> ROUND(v_calc_due, 2) THEN
            v_drift := v_drift + ABS(v_cust.total_due_balance - v_calc_due);
            v_drift_count := v_drift_count + 1;
        END IF;

        -- Update customer row to exact ledger numbers
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
        'drift_detected_count', v_drift_count,
        'total_drift_amount', v_drift
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reconcile_customer_balance_atomic(UUID, UUID) TO authenticated, service_role;

-- Stock Quantity Ledger Reconciliation
CREATE OR REPLACE FUNCTION public.reconcile_inventory_stock_atomic(
    p_company_id UUID,
    p_material_id UUID DEFAULT NULL::UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_variable
DECLARE
    v_mat RECORD;
    v_ledger_qty NUMERIC;
    v_drift_count INT := 0;
    v_reconciled_count INT := 0;
BEGIN
    IF p_company_id IS NULL THEN
        RAISE EXCEPTION 'Company ID is required for stock reconciliation';
    END IF;

    FOR v_mat IN
        SELECT id, name, current_stock
        FROM public.materials
        WHERE company_id = p_company_id AND (p_material_id IS NULL OR id = p_material_id)
        FOR UPDATE
    LOOP
        -- Calculate ledger sum
        SELECT COALESCE(SUM(
            CASE 
                WHEN transaction_type IN ('purchase_in', 'production_return', 'adjustment_add', 'initial_stock') THEN quantity_change
                ELSE -ABS(quantity_change)
            END
        ), v_mat.current_stock)
        INTO v_ledger_qty
        FROM public.stock_ledger
        WHERE company_id = p_company_id AND material_id = v_mat.id;

        IF ROUND(v_mat.current_stock, 4) <> ROUND(v_ledger_qty, 4) THEN
            v_drift_count := v_drift_count + 1;
            UPDATE public.materials
            SET current_stock = v_ledger_qty,
                updated_at = NOW()
            WHERE id = v_mat.id;
        END IF;

        v_reconciled_count := v_reconciled_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'reconciled_count', v_reconciled_count,
        'drift_detected_count', v_drift_count
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reconcile_inventory_stock_atomic(UUID, UUID) TO authenticated, service_role;

-- Drift Report Scanner (Read-only inspection for Admin view)
CREATE OR REPLACE FUNCTION public.get_financial_drift_report(p_company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_customer_drifts JSONB;
    v_stock_drifts JSONB;
    v_has_drift BOOLEAN := false;
BEGIN
    -- Customer Drifts
    SELECT jsonb_agg(d)
    INTO v_customer_drifts
    FROM (
        SELECT 
            c.id,
            c.name,
            c.total_due_balance AS stored_due,
            COALESCE(SUM(i.due_amount), 0) AS ledger_due,
            ROUND(c.total_due_balance - COALESCE(SUM(i.due_amount), 0), 2) AS variance
        FROM public.customers c
        LEFT JOIN public.invoices i ON i.customer_id = c.id AND i.company_id = c.company_id AND i.status <> 'cancelled'
        WHERE c.company_id = p_company_id
        GROUP BY c.id, c.name, c.total_due_balance
        HAVING ROUND(c.total_due_balance, 2) <> ROUND(COALESCE(SUM(i.due_amount), 0), 2)
    ) d;

    -- Stock Drifts
    SELECT jsonb_agg(s)
    INTO v_stock_drifts
    FROM (
        SELECT
            m.id,
            m.name,
            m.current_stock AS stored_stock,
            COALESCE(SUM(
                CASE 
                    WHEN sl.transaction_type IN ('purchase_in', 'production_return', 'adjustment_add', 'initial_stock') THEN sl.quantity_change
                    ELSE -ABS(sl.quantity_change)
                END
            ), m.current_stock) AS ledger_stock,
            ROUND(m.current_stock - COALESCE(SUM(
                CASE 
                    WHEN sl.transaction_type IN ('purchase_in', 'production_return', 'adjustment_add', 'initial_stock') THEN sl.quantity_change
                    ELSE -ABS(sl.quantity_change)
                END
            ), m.current_stock), 4) AS variance
        FROM public.materials m
        LEFT JOIN public.stock_ledger sl ON sl.material_id = m.id AND sl.company_id = m.company_id
        WHERE m.company_id = p_company_id
        GROUP BY m.id, m.name, m.current_stock
        HAVING ROUND(m.current_stock, 4) <> ROUND(COALESCE(SUM(
            CASE 
                WHEN sl.transaction_type IN ('purchase_in', 'production_return', 'adjustment_add', 'initial_stock') THEN sl.quantity_change
                ELSE -ABS(sl.quantity_change)
            END
        ), m.current_stock), 4)
    ) s;

    v_has_drift := (v_customer_drifts IS NOT NULL AND jsonb_array_length(v_customer_drifts) > 0)
                OR (v_stock_drifts IS NOT NULL AND jsonb_array_length(v_stock_drifts) > 0);

    RETURN jsonb_build_object(
        'has_drift', v_has_drift,
        'customer_drifts', COALESCE(v_customer_drifts, '[]'::jsonb),
        'stock_drifts', COALESCE(v_stock_drifts, '[]'::jsonb),
        'scanned_at', NOW()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_financial_drift_report(UUID) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 6. STRICT FINANCIAL ANTI-DELETION GUARDS (Item 9)
-- Prevents hard DELETE on invoices, payments, expenses, journal lines, and ledger.
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_prevent_financial_hard_deletion()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Financial Security Invariant: Hard deletion of financial records (%) is strictly prohibited. Use void, reverse, or credit note workflows.', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_hard_delete_invoices ON public.invoices;
CREATE TRIGGER trg_prevent_hard_delete_invoices
    BEFORE DELETE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.trg_prevent_financial_hard_deletion();

DROP TRIGGER IF EXISTS trg_prevent_hard_delete_payments ON public.payments;
CREATE TRIGGER trg_prevent_hard_delete_payments
    BEFORE DELETE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.trg_prevent_financial_hard_deletion();

DROP TRIGGER IF EXISTS trg_prevent_hard_delete_expenses ON public.expenses;
CREATE TRIGGER trg_prevent_hard_delete_expenses
    BEFORE DELETE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION public.trg_prevent_financial_hard_deletion();

DROP TRIGGER IF EXISTS trg_prevent_hard_delete_stock_ledger ON public.stock_ledger;
CREATE TRIGGER trg_prevent_hard_delete_stock_ledger
    BEFORE DELETE ON public.stock_ledger
    FOR EACH ROW EXECUTE FUNCTION public.trg_prevent_financial_hard_deletion();
