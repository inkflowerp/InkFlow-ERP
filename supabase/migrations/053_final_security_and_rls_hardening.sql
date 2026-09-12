-- ==============================================================================
-- InkFlow SaaS - Migration 053: Comprehensive Production Security & RLS Hardening
-- Single Source of Truth & Authoritative Isolation Boundary:
--   1. Enforces search_path = public, pg_temp across ALL security definer functions
--   2. Restricts EXECUTE permissions on privileged database functions
--   3. Eliminates any permissive or ambiguous RLS policies
--   4. Locks down platform-wide tables strictly to active platform admins
--   5. Enforces strict tenant isolation across all tenant entities
--   6. Enforces caller authorization on atomic sequence & document number generators
-- ==============================================================================

-- 1. HARDEN SECURITY DEFINER HELPER FUNCTIONS WITH EXPLICIT SEARCH PATH
CREATE OR REPLACE FUNCTION public.auth_is_platform_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id uuid;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN false;
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM public.platform_admins
        WHERE user_id = v_user_id
          AND is_active = true
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.auth_is_platform_owner()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id uuid;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN false;
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM public.platform_admins
        WHERE user_id = v_user_id
          AND role = 'platform_owner'
          AND is_active = true
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.auth_is_active_company_user(target_company_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NULL OR target_company_id IS NULL THEN
        RETURN false;
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM public.company_users cu
        JOIN public.companies c ON c.id = cu.company_id
        WHERE cu.company_id = target_company_id
          AND cu.user_id = auth.uid()
          AND cu.status = 'active'
          AND c.is_active = true
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.auth_get_user_company_role(target_company_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_role text;
BEGIN
    IF auth.uid() IS NULL OR target_company_id IS NULL THEN
        RETURN null;
    END IF;

    SELECT r.slug INTO v_role
    FROM public.company_users cu
    JOIN public.user_roles ur ON ur.company_user_id = cu.id
    JOIN public.roles r ON r.id = ur.role_id
    WHERE cu.company_id = target_company_id
      AND cu.user_id = auth.uid()
      AND cu.status = 'active'
    ORDER BY CASE WHEN r.slug IN ('owner', 'business_owner') THEN 1 ELSE 2 END
    LIMIT 1;

    RETURN v_role;
END;
$$;

-- 2. HARDEN DOCUMENT NUMBERING & SEQUENCE GENERATORS (FAIL CLOSED)
CREATE OR REPLACE FUNCTION public.get_next_document_number(
    p_company_id uuid,
    p_doc_type text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_prefix text;
    v_next_val bigint;
    v_padding integer;
    v_formatted text;
BEGIN
    -- Security verification: Caller must belong to the company or be an authorized platform admin
    IF auth.role() IS NOT NULL AND auth.role() <> 'service_role' THEN
        IF auth.uid() IS NULL THEN
            RAISE EXCEPTION 'Authentication required';
        END IF;
        IF NOT (public.auth_is_active_company_user(p_company_id) OR public.auth_is_platform_admin()) THEN
            RAISE EXCEPTION 'Unauthorized attempt to generate company sequence for unauthorized company';
        END IF;
    END IF;

    -- Lock row exclusively to prevent race conditions across parallel bookings
    SELECT prefix, current_val + 1, padding
    INTO v_prefix, v_next_val, v_padding
    FROM public.document_sequences
    WHERE company_id = p_company_id
      AND doc_type = p_doc_type
    FOR UPDATE;

    -- If no sequence exists yet, initialize it
    IF v_next_val IS NULL THEN
        v_prefix := CASE p_doc_type
            WHEN 'quotation' THEN 'QUO'
            WHEN 'order' THEN 'ORD'
            WHEN 'invoice' THEN 'INV'
            WHEN 'challan' THEN 'CHL'
            WHEN 'payment' THEN 'PAY'
            WHEN 'purchase' THEN 'PUR'
            ELSE 'DOC'
        END;
        v_next_val := 1;
        v_padding := 6;

        INSERT INTO public.document_sequences (company_id, doc_type, prefix, current_val, padding)
        VALUES (p_company_id, p_doc_type, v_prefix, v_next_val, v_padding);
    ELSE
        UPDATE public.document_sequences
        SET current_val = v_next_val,
            updated_at = now()
        WHERE company_id = p_company_id
          AND doc_type = p_doc_type;
    END IF;

    -- Format document number e.g. "INV-000001"
    v_formatted := v_prefix || '-' || lpad(v_next_val::text, v_padding, '0');
    RETURN v_formatted;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_next_tenant_document_number(
    p_company_id uuid,
    p_document_type text,
    p_prefix text DEFAULT null
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_year integer := EXTRACT(year FROM CURRENT_DATE);
    v_counter bigint;
    v_doc_prefix text;
    v_result text;
BEGIN
    -- Security verification
    IF auth.role() IS NOT NULL AND auth.role() <> 'service_role' THEN
        IF NOT (public.auth_is_active_company_user(p_company_id) OR public.auth_is_platform_admin()) THEN
            RAISE EXCEPTION 'Unauthorized attempt to generate company document sequence';
        END IF;
    END IF;

    IF p_prefix IS NOT NULL THEN
        v_doc_prefix := p_prefix;
    ELSE
        CASE p_document_type
            WHEN 'invoice' THEN v_doc_prefix := 'INV';
            WHEN 'quotation' THEN v_doc_prefix := 'QT';
            WHEN 'vat_mushak' THEN v_doc_prefix := 'MUSK';
            WHEN 'receipt' THEN v_doc_prefix := 'MR';
            WHEN 'challan' THEN v_doc_prefix := 'CH';
            WHEN 'purchase_order' THEN v_doc_prefix := 'PO';
            ELSE v_doc_prefix := 'DOC';
        END CASE;
    END IF;

    -- Atomic row-level lock & increment
    INSERT INTO public.document_number_counters (company_id, document_type, year_prefix, current_counter, updated_at)
    VALUES (p_company_id, p_document_type, v_year, 101, now())
    ON CONFLICT (company_id, document_type, year_prefix)
    DO UPDATE SET
        current_counter = public.document_number_counters.current_counter + 1,
        updated_at = now()
    RETURNING current_counter INTO v_counter;

    -- Format: PREFIX-YYYY-NUMBER e.g. INV-2026-000101
    v_result := v_doc_prefix || '-' || v_year::text || '-' || lpad(v_counter::text, 6, '0');
    RETURN v_result;
END;
$$;

-- 3. HARDEN AUDIT LOGGING & TAMPER RESISTANCE
CREATE OR REPLACE FUNCTION public.log_audit_event(
    p_company_id uuid,
    p_entity_type text,
    p_action text,
    p_old_values jsonb DEFAULT null,
    p_new_values jsonb DEFAULT null,
    p_entity_id text DEFAULT null
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_log_id uuid;
BEGIN
    -- Actor identity derived authoritatively from authenticated session
    INSERT INTO public.audit_logs (
        company_id,
        user_id,
        entity_type,
        entity_id,
        action,
        old_values,
        new_values
    ) VALUES (
        p_company_id,
        auth.uid(),
        p_entity_type,
        p_entity_id,
        p_action,
        p_old_values,
        p_new_values
    ) RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_platform_audit_event(
    p_action text,
    p_entity text,
    p_entity_id text DEFAULT null,
    p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_admin_id uuid;
    v_log_id uuid;
BEGIN
    SELECT id INTO v_admin_id
    FROM public.platform_admins
    WHERE user_id = auth.uid()
      AND is_active = true
    LIMIT 1;

    INSERT INTO public.platform_audit_logs (
        admin_id,
        action,
        entity,
        entity_id,
        details
    ) VALUES (
        v_admin_id,
        p_action,
        p_entity,
        p_entity_id,
        p_details
    ) RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$;

-- 4. RESTRICT FUNCTION PRIVILEGES (REVOKE FROM PUBLIC, GRANT TO AUTHENTICATED)
REVOKE ALL ON FUNCTION public.auth_is_platform_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auth_is_platform_owner() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auth_is_active_company_user(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auth_get_user_company_role(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_next_document_number(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_next_tenant_document_number(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_audit_event(uuid, text, text, jsonb, jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_platform_audit_event(text, text, text, jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.auth_is_platform_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auth_is_platform_owner() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auth_is_active_company_user(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auth_get_user_company_role(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_next_document_number(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_next_tenant_document_number(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_audit_event(uuid, text, text, jsonb, jsonb, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_platform_audit_event(text, text, text, jsonb) TO authenticated, service_role;

-- 5. COMPLETE RLS AUDIT & HARDENING ACROSS PLATFORM TABLES
ALTER TABLE IF EXISTS public.platform_admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Platform admins full control on platform_admins" ON public.platform_admins;
DROP POLICY IF EXISTS "Platform admins manage platform_admins" ON public.platform_admins;

CREATE POLICY "Platform admins manage platform_admins"
    ON public.platform_admins FOR ALL
    USING (public.auth_is_platform_admin());

ALTER TABLE IF EXISTS public.platform_saas_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Platform owners can view platform_saas_plans" ON public.platform_saas_plans;
DROP POLICY IF EXISTS "Platform owners can manage platform_saas_plans" ON public.platform_saas_plans;
DROP POLICY IF EXISTS "Anyone authenticated can view platform_saas_plans" ON public.platform_saas_plans;
DROP POLICY IF EXISTS "Platform admins view platform_saas_plans" ON public.platform_saas_plans;
DROP POLICY IF EXISTS "Platform owners manage platform_saas_plans" ON public.platform_saas_plans;

CREATE POLICY "Platform admins view platform_saas_plans"
    ON public.platform_saas_plans FOR SELECT
    USING (public.auth_is_platform_admin());

CREATE POLICY "Platform owners manage platform_saas_plans"
    ON public.platform_saas_plans FOR ALL
    USING (public.auth_is_platform_owner());

ALTER TABLE IF EXISTS public.platform_support_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Platform admins manage support sessions" ON public.platform_support_sessions;
CREATE POLICY "Platform admins manage support sessions"
    ON public.platform_support_sessions FOR ALL
    USING (public.auth_is_platform_admin());

-- 6. COMPLETE RLS AUDIT & HARDENING ACROSS TENANT TABLES
ALTER TABLE IF EXISTS public.gateway_integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation on gateway_integrations" ON public.gateway_integrations;
DROP POLICY IF EXISTS "Platform owners manage global gateways" ON public.gateway_integrations;
DROP POLICY IF EXISTS "Tenant users manage own gateway_integrations" ON public.gateway_integrations;

CREATE POLICY "Tenant users manage own gateway_integrations"
    ON public.gateway_integrations FOR ALL
    USING (
        (tenant_id IS NOT NULL AND public.auth_is_active_company_user(tenant_id))
        OR (tenant_id IS NULL AND public.auth_is_platform_admin())
    );

ALTER TABLE IF EXISTS public.gateway_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation on gateway_transactions" ON public.gateway_transactions;
DROP POLICY IF EXISTS "Tenant users view own gateway_transactions" ON public.gateway_transactions;

CREATE POLICY "Tenant users view own gateway_transactions"
    ON public.gateway_transactions FOR ALL
    USING (
        (tenant_id IS NOT NULL AND public.auth_is_active_company_user(tenant_id))
        OR (tenant_id IS NULL AND public.auth_is_platform_admin())
    );

ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Tenant and platform isolation on audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Tenant users and platform admins view audit logs" ON public.audit_logs;

CREATE POLICY "Tenant users and platform admins view audit logs"
    ON public.audit_logs FOR SELECT
    USING (
        public.auth_is_active_company_user(company_id)
        OR public.auth_is_platform_admin()
    );

-- 7. UNIQUE CONSTRAINTS FOR PAYMENT & WEBHOOK IDEMPOTENCY
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_gateway_transactions_internal_trx_id'
    ) THEN
        ALTER TABLE IF EXISTS public.gateway_transactions
            ADD CONSTRAINT uq_gateway_transactions_internal_trx_id UNIQUE (internal_trx_id);
    END IF;
EXCEPTION
    WHEN duplicate_table OR duplicate_object THEN
        NULL;
END;
$$;
