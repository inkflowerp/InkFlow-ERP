-- ==============================================================================
-- PrintFlow - Migration 110: Data Integrity, Concurrency & Security Hardening
-- ==============================================================================

-- 1. HARDEN GATEWAY WEBHOOKS IDEMPOTENCY
-- Ensure no duplicate webhook events can be recorded or processed simultaneously
CREATE UNIQUE INDEX IF NOT EXISTS uq_gateway_webhooks_event 
ON public.gateway_webhooks(provider, provider_event_id) 
WHERE provider_event_id IS NOT NULL AND provider_event_id <> '';

-- 2. HARDEN CUSTOMER IDENTIFICATION UNIQUENESS
-- Ensure unique customer numbering within each company / tenant
CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_company_customer_id_no 
ON public.customers (company_id, customer_id_no) 
WHERE customer_id_no IS NOT NULL AND customer_id_no <> '';

-- 3. EXPAND DOCUMENT SEQUENCE FUNCTION TO SECURELY SUPPORT CUSTOMER NUMBERING
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
            WHEN 'customer' THEN 'CUST'
            ELSE 'DOC'
        END;
        v_next_val := 1;
        v_padding := CASE p_doc_type
            WHEN 'customer' THEN 4
            ELSE 6
        END;

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

    v_formatted := v_prefix || '-' || LPAD(v_next_val::TEXT, v_padding, '0');
    RETURN v_formatted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_next_document_number(UUID, TEXT) TO authenticated, service_role;

-- 4. ATOMIC ACCOUNT BALANCE INCREMENT (Eliminates read-modify-write lost updates in General Ledger)
CREATE OR REPLACE FUNCTION public.increment_account_balance_atomic(
    p_company_id UUID,
    p_account_id UUID,
    p_delta NUMERIC
)
RETURNS public.accounts AS $$
DECLARE
    v_account public.accounts;
BEGIN
    UPDATE public.accounts
    SET current_balance = COALESCE(current_balance, 0) + p_delta,
        updated_at = NOW()
    WHERE id = p_account_id
      AND company_id = p_company_id
    RETURNING * INTO v_account;

    RETURN v_account;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.increment_account_balance_atomic(UUID, UUID, NUMERIC) TO authenticated, service_role;

-- 5. ATOMIC CUSTOMER BALANCE INCREMENT (Eliminates read-modify-write race conditions in customer debt counters)
CREATE OR REPLACE FUNCTION public.increment_customer_balance_atomic(
    p_company_id UUID,
    p_customer_id UUID,
    p_due_delta NUMERIC DEFAULT 0,
    p_invoiced_delta NUMERIC DEFAULT 0,
    p_paid_delta NUMERIC DEFAULT 0,
    p_last_payment_date DATE DEFAULT NULL,
    p_last_payment_amount NUMERIC DEFAULT NULL
)
RETURNS public.customers AS $$
DECLARE
    v_customer public.customers;
BEGIN
    UPDATE public.customers
    SET total_due_balance = GREATEST(0, COALESCE(total_due_balance, 0) + p_due_delta),
        total_invoiced_amount = GREATEST(0, COALESCE(total_invoiced_amount, 0) + p_invoiced_delta),
        total_paid_amount = GREATEST(0, COALESCE(total_paid_amount, 0) + p_paid_delta),
        last_payment_date = COALESCE(p_last_payment_date, last_payment_date),
        last_payment_amount = COALESCE(p_last_payment_amount, last_payment_amount),
        updated_at = NOW()
    WHERE id = p_customer_id
      AND company_id = p_company_id
    RETURNING * INTO v_customer;

    RETURN v_customer;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.increment_customer_balance_atomic(UUID, UUID, NUMERIC, NUMERIC, NUMERIC, DATE, NUMERIC) TO authenticated, service_role;
