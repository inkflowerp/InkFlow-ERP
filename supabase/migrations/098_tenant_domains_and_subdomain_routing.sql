-- ==============================================================================
-- Migration: 098_tenant_domains_and_subdomain_routing.sql
-- Description: Production Tenant Subdomain Architecture & Future Custom Domain Mapping
-- ==============================================================================

-- 1. Ensure companies.slug has lower-case index and clean URL constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_slug_lower ON public.companies (LOWER(slug));

-- 2. Create tenant_domains table for Subdomain & Custom Domain Routing
CREATE TABLE IF NOT EXISTS public.tenant_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL,
    domain_type VARCHAR(50) NOT NULL DEFAULT 'subdomain' CHECK (domain_type IN ('subdomain', 'custom')),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    verified_at TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('pending_dns', 'active', 'suspended', 'revoked')),
    ssl_status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (ssl_status IN ('pending', 'active', 'expired', 'error')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_domains_domain UNIQUE (domain)
);

-- Indexes for ultra-fast domain resolution in edge middleware and route handlers
CREATE INDEX IF NOT EXISTS idx_tenant_domains_tenant_id ON public.tenant_domains(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_domains_domain_lower ON public.tenant_domains(LOWER(domain));
CREATE INDEX IF NOT EXISTS idx_tenant_domains_lookup ON public.tenant_domains(LOWER(domain), status);

-- 3. Enable Row Level Security on tenant_domains
ALTER TABLE public.tenant_domains ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for tenant_domains
DROP POLICY IF EXISTS "tenant_domains_select_policy" ON public.tenant_domains;
CREATE POLICY "tenant_domains_select_policy" ON public.tenant_domains
    FOR SELECT
    USING (
        tenant_id IN (
            SELECT company_id FROM public.company_users
            WHERE user_id = auth.uid() AND status = 'active'
        )
        OR EXISTS (
            SELECT 1 FROM public.platform_admins
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

DROP POLICY IF EXISTS "tenant_domains_manage_policy" ON public.tenant_domains;
CREATE POLICY "tenant_domains_manage_policy" ON public.tenant_domains
    FOR ALL
    USING (
        tenant_id IN (
            SELECT company_id FROM public.company_users
            WHERE user_id = auth.uid() 
            AND status = 'active' 
            AND role IN ('business_owner', 'system_admin')
        )
        OR EXISTS (
            SELECT 1 FROM public.platform_admins
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- 5. Helper Function: Resolve Tenant by Hostname
CREATE OR REPLACE FUNCTION public.resolve_tenant_by_hostname(p_hostname TEXT)
RETURNS TABLE (
    tenant_id UUID,
    slug VARCHAR(255),
    name VARCHAR(255),
    name_bn VARCHAR(255),
    status VARCHAR(50),
    domain_type VARCHAR(50),
    is_active BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clean_host TEXT := LOWER(TRIM(p_hostname));
    v_extracted_slug TEXT;
BEGIN
    -- 1. Check direct match in tenant_domains (supports custom domains & explicit subdomains)
    RETURN QUERY
    SELECT 
        c.id AS tenant_id,
        c.slug,
        c.name,
        c.name_bn,
        CASE WHEN c.is_active THEN 'active'::VARCHAR(50) ELSE 'suspended'::VARCHAR(50) END AS status,
        td.domain_type,
        c.is_active
    FROM public.tenant_domains td
    JOIN public.companies c ON c.id = td.tenant_id
    WHERE LOWER(td.domain) = v_clean_host
      AND td.status = 'active'
    LIMIT 1;

    IF FOUND THEN
        RETURN;
    END IF;

    -- 2. Check if hostname matches slug directly or as first subdomain segment
    IF v_clean_host LIKE '%.%' THEN
        v_extracted_slug := SPLIT_PART(v_clean_host, '.', 1);
    ELSE
        v_extracted_slug := v_clean_host;
    END IF;

    RETURN QUERY
    SELECT 
        c.id AS tenant_id,
        c.slug,
        c.name,
        c.name_bn,
        CASE WHEN c.is_active THEN 'active'::VARCHAR(50) ELSE 'suspended'::VARCHAR(50) END AS status,
        'subdomain'::VARCHAR(50) AS domain_type,
        c.is_active
    FROM public.companies c
    WHERE LOWER(c.slug) = v_extracted_slug
    LIMIT 1;
END;
$$;

-- 6. Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_tenant_domains_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tenant_domains_updated_at ON public.tenant_domains;
CREATE TRIGGER trg_tenant_domains_updated_at
    BEFORE UPDATE ON public.tenant_domains
    FOR EACH ROW
    EXECUTE FUNCTION public.update_tenant_domains_modtime();
