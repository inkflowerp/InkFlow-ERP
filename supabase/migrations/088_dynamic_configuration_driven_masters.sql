-- ==============================================================================
-- InkFlow SaaS - Migration 088: Dynamic Configuration-Driven Masters
-- Comprehensive Database Support:
--   1. Printing Methods Master (public.printing_methods)
--   2. Multi-Configuration Material Purchase (public.material_purchase_configs)
--   3. Finishing Options Master (public.finishing_options)
--   4. Additional Options Master (public.additional_options)
--   5. Installation & Fulfillment Master (public.installation_options)
--   6. Multi-Tenant Row Level Security & Performance Indexes
-- ==============================================================================

-- 1. PRINTING METHODS TABLE
CREATE TABLE IF NOT EXISTS public.printing_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_bn TEXT,
    code TEXT,
    description TEXT,
    category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
    compatible_material_types TEXT[] DEFAULT ARRAY['roll']::TEXT[],
    cost_per_sqft NUMERIC(10,2) DEFAULT 0,
    default_ink_type TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_printing_methods_company_name UNIQUE (company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_printing_methods_company_active ON public.printing_methods(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_printing_methods_category ON public.printing_methods(company_id, category_id);

ALTER TABLE public.printing_methods ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'printing_methods' AND policyname = 'printing_methods_select_tenant') THEN
        CREATE POLICY "printing_methods_select_tenant"
            ON public.printing_methods FOR SELECT
            USING (company_id = (SELECT auth.jwt() ->> 'company_id')::uuid OR (SELECT auth.jwt() ->> 'role') = 'platform_admin');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'printing_methods' AND policyname = 'printing_methods_insert_tenant') THEN
        CREATE POLICY "printing_methods_insert_tenant"
            ON public.printing_methods FOR INSERT
            WITH CHECK (company_id = (SELECT auth.jwt() ->> 'company_id')::uuid OR (SELECT auth.jwt() ->> 'role') = 'platform_admin');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'printing_methods' AND policyname = 'printing_methods_update_tenant') THEN
        CREATE POLICY "printing_methods_update_tenant"
            ON public.printing_methods FOR UPDATE
            USING (company_id = (SELECT auth.jwt() ->> 'company_id')::uuid OR (SELECT auth.jwt() ->> 'role') = 'platform_admin');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'printing_methods' AND policyname = 'printing_methods_delete_tenant') THEN
        CREATE POLICY "printing_methods_delete_tenant"
            ON public.printing_methods FOR DELETE
            USING (company_id = (SELECT auth.jwt() ->> 'company_id')::uuid OR (SELECT auth.jwt() ->> 'role') = 'platform_admin');
    END IF;
END $$;

-- 2. MATERIAL PURCHASE CONFIGURATIONS TABLE (Multiple Dimensions & Suppliers per Material)
CREATE TABLE IF NOT EXISTS public.material_purchase_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    config_name TEXT NOT NULL,
    width_ft NUMERIC(8,2) NOT NULL,
    length_ft NUMERIC(8,2) NOT NULL DEFAULT 164.0,
    unit TEXT NOT NULL DEFAULT 'roll',
    purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    item_code_sku TEXT,
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mat_purchase_configs_mat ON public.material_purchase_configs(company_id, material_id, is_active);
CREATE INDEX IF NOT EXISTS idx_mat_purchase_configs_supp ON public.material_purchase_configs(company_id, supplier_id);

ALTER TABLE public.material_purchase_configs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'material_purchase_configs' AND policyname = 'mat_purchase_configs_select_tenant') THEN
        CREATE POLICY "mat_purchase_configs_select_tenant"
            ON public.material_purchase_configs FOR SELECT
            USING (company_id = (SELECT auth.jwt() ->> 'company_id')::uuid OR (SELECT auth.jwt() ->> 'role') = 'platform_admin');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'material_purchase_configs' AND policyname = 'mat_purchase_configs_insert_tenant') THEN
        CREATE POLICY "mat_purchase_configs_insert_tenant"
            ON public.material_purchase_configs FOR INSERT
            WITH CHECK (company_id = (SELECT auth.jwt() ->> 'company_id')::uuid OR (SELECT auth.jwt() ->> 'role') = 'platform_admin');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'material_purchase_configs' AND policyname = 'mat_purchase_configs_update_tenant') THEN
        CREATE POLICY "mat_purchase_configs_update_tenant"
            ON public.material_purchase_configs FOR UPDATE
            USING (company_id = (SELECT auth.jwt() ->> 'company_id')::uuid OR (SELECT auth.jwt() ->> 'role') = 'platform_admin');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'material_purchase_configs' AND policyname = 'mat_purchase_configs_delete_tenant') THEN
        CREATE POLICY "mat_purchase_configs_delete_tenant"
            ON public.material_purchase_configs FOR DELETE
            USING (company_id = (SELECT auth.jwt() ->> 'company_id')::uuid OR (SELECT auth.jwt() ->> 'role') = 'platform_admin');
    END IF;
END $$;

-- 3. FINISHING OPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.finishing_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_bn TEXT,
    category TEXT DEFAULT 'general',
    pricing_method TEXT NOT NULL DEFAULT 'sqft' CHECK (pricing_method IN ('sqft', 'per_piece', 'per_linear_ft', 'fixed', 'percentage')),
    selling_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    cost NUMERIC(10,2) NOT NULL DEFAULT 0,
    material_id UUID REFERENCES public.materials(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_finishing_options_company_name UNIQUE (company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_finishing_options_company_active ON public.finishing_options(company_id, is_active);

ALTER TABLE public.finishing_options ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'finishing_options' AND policyname = 'finishing_options_select_tenant') THEN
        CREATE POLICY "finishing_options_select_tenant"
            ON public.finishing_options FOR SELECT
            USING (company_id = (SELECT auth.jwt() ->> 'company_id')::uuid OR (SELECT auth.jwt() ->> 'role') = 'platform_admin');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'finishing_options' AND policyname = 'finishing_options_insert_tenant') THEN
        CREATE POLICY "finishing_options_insert_tenant"
            ON public.finishing_options FOR INSERT
            WITH CHECK (company_id = (SELECT auth.jwt() ->> 'company_id')::uuid OR (SELECT auth.jwt() ->> 'role') = 'platform_admin');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'finishing_options' AND policyname = 'finishing_options_update_tenant') THEN
        CREATE POLICY "finishing_options_update_tenant"
            ON public.finishing_options FOR UPDATE
            USING (company_id = (SELECT auth.jwt() ->> 'company_id')::uuid OR (SELECT auth.jwt() ->> 'role') = 'platform_admin');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'finishing_options' AND policyname = 'finishing_options_delete_tenant') THEN
        CREATE POLICY "finishing_options_delete_tenant"
            ON public.finishing_options FOR DELETE
            USING (company_id = (SELECT auth.jwt() ->> 'company_id')::uuid OR (SELECT auth.jwt() ->> 'role') = 'platform_admin');
    END IF;
END $$;

-- 4. ADDITIONAL OPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.additional_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_bn TEXT,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    pricing_method TEXT NOT NULL DEFAULT 'sqft' CHECK (pricing_method IN ('sqft', 'per_piece', 'fixed')),
    selling_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    cost NUMERIC(10,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_additional_options_company_name UNIQUE (company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_additional_options_company_active ON public.additional_options(company_id, is_active);

ALTER TABLE public.additional_options ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'additional_options' AND policyname = 'additional_options_select_tenant') THEN
        CREATE POLICY "additional_options_select_tenant"
            ON public.additional_options FOR SELECT
            USING (company_id = (SELECT auth.jwt() ->> 'company_id')::uuid OR (SELECT auth.jwt() ->> 'role') = 'platform_admin');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'additional_options' AND policyname = 'additional_options_insert_tenant') THEN
        CREATE POLICY "additional_options_insert_tenant"
            ON public.additional_options FOR INSERT
            WITH CHECK (company_id = (SELECT auth.jwt() ->> 'company_id')::uuid OR (SELECT auth.jwt() ->> 'role') = 'platform_admin');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'additional_options' AND policyname = 'additional_options_update_tenant') THEN
        CREATE POLICY "additional_options_update_tenant"
            ON public.additional_options FOR UPDATE
            USING (company_id = (SELECT auth.jwt() ->> 'company_id')::uuid OR (SELECT auth.jwt() ->> 'role') = 'platform_admin');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'additional_options' AND policyname = 'additional_options_delete_tenant') THEN
        CREATE POLICY "additional_options_delete_tenant"
            ON public.additional_options FOR DELETE
            USING (company_id = (SELECT auth.jwt() ->> 'company_id')::uuid OR (SELECT auth.jwt() ->> 'role') = 'platform_admin');
    END IF;
END $$;

-- 5. INSTALLATION & FULFILLMENT OPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.installation_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_bn TEXT,
    fulfillment_type TEXT NOT NULL DEFAULT 'installation' CHECK (fulfillment_type IN ('installation', 'delivery', 'pickup', 'custom')),
    pricing_method TEXT NOT NULL DEFAULT 'fixed' CHECK (pricing_method IN ('fixed', 'per_piece', 'sqft', 'per_km')),
    selling_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    cost NUMERIC(10,2) NOT NULL DEFAULT 0,
    creates_task BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_installation_options_company_name UNIQUE (company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_installation_options_company_active ON public.installation_options(company_id, is_active);

ALTER TABLE public.installation_options ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'installation_options' AND policyname = 'installation_options_select_tenant') THEN
        CREATE POLICY "installation_options_select_tenant"
            ON public.installation_options FOR SELECT
            USING (company_id = (SELECT auth.jwt() ->> 'company_id')::uuid OR (SELECT auth.jwt() ->> 'role') = 'platform_admin');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'installation_options' AND policyname = 'installation_options_insert_tenant') THEN
        CREATE POLICY "installation_options_insert_tenant"
            ON public.installation_options FOR INSERT
            WITH CHECK (company_id = (SELECT auth.jwt() ->> 'company_id')::uuid OR (SELECT auth.jwt() ->> 'role') = 'platform_admin');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'installation_options' AND policyname = 'installation_options_update_tenant') THEN
        CREATE POLICY "installation_options_update_tenant"
            ON public.installation_options FOR UPDATE
            USING (company_id = (SELECT auth.jwt() ->> 'company_id')::uuid OR (SELECT auth.jwt() ->> 'role') = 'platform_admin');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'installation_options' AND policyname = 'installation_options_delete_tenant') THEN
        CREATE POLICY "installation_options_delete_tenant"
            ON public.installation_options FOR DELETE
            USING (company_id = (SELECT auth.jwt() ->> 'company_id')::uuid OR (SELECT auth.jwt() ->> 'role') = 'platform_admin');
    END IF;
END $$;
