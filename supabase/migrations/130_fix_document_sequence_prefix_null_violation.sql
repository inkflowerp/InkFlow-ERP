-- Migration 130: Fix Document Sequence Generator Prefix Not-Null Violation
-- Prevents PL/pgSQL variable overwrite to NULL when SELECT ... INTO returns 0 rows.
-- Backfills any existing missing prefixes in public.document_sequences.

-- 1. Ensure any legacy or incomplete sequence rows have valid prefixes
UPDATE public.document_sequences
SET prefix = CASE LOWER(doc_type)
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
END
WHERE prefix IS NULL OR prefix = '';

-- 2. Ensure prefix column has NOT NULL and default padding
ALTER TABLE public.document_sequences ALTER COLUMN prefix SET NOT NULL;
ALTER TABLE public.document_sequences ALTER COLUMN padding SET DEFAULT 6;

-- 3. Replace get_next_document_number with null-safe variable retention
CREATE OR REPLACE FUNCTION public.get_next_document_number(
    p_company_id UUID,
    p_doc_type TEXT,
    p_fiscal_year TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_fiscal_year TEXT;
    v_default_prefix TEXT;
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

    -- Determine standard default prefix
    v_default_prefix := CASE LOWER(p_doc_type)
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
    SELECT current_val + 1, COALESCE(padding, v_padding), COALESCE(prefix, v_default_prefix)
    INTO v_next_val, v_padding, v_prefix
    FROM public.document_sequences
    WHERE company_id = p_company_id
      AND doc_type = p_doc_type
      AND fiscal_year = v_fiscal_year
    FOR UPDATE;

    -- Re-ensure non-null prefix and padding in case SELECT ... INTO returned no rows (which sets all INTO variables to NULL)
    v_prefix := COALESCE(v_prefix, v_default_prefix);
    v_padding := COALESCE(v_padding, CASE WHEN LOWER(p_doc_type) = 'customer' THEN 4 ELSE 6 END);

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
        DO UPDATE SET current_val = public.document_sequences.current_val + 1,
                      prefix = COALESCE(public.document_sequences.prefix, EXCLUDED.prefix),
                      updated_at = NOW()
        RETURNING current_val INTO v_next_val;
    ELSE
        UPDATE public.document_sequences
        SET current_val = v_next_val,
            prefix = COALESCE(prefix, v_prefix),
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

-- 4. Set security attributes & grants
REVOKE ALL ON FUNCTION public.get_next_document_number(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_next_document_number(UUID, TEXT, TEXT) TO authenticated, service_role;
ALTER FUNCTION public.get_next_document_number(UUID, TEXT, TEXT) SET search_path = public, pg_temp;
