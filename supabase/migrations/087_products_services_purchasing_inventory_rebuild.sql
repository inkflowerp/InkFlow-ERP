-- ==============================================================================
-- InkFlow SaaS - Migration 087: Products & Services, Purchasing & Inventory Rebuild
-- Comprehensive Architectural Rebuild:
--   1. Commercial Entity Classification: Product, Service, Material, Finishing, Additional, Installation
--   2. Dedicated Service Configuration JSONB & Allowance Rules
--   3. Material Master Widths, Roll Lengths & Consumption Rules
--   4. Discrete Physical Roll Tracking with Unique Roll Codes & Stock States
--   5. Reusable Remnant Linking to Physical Source Rolls
--   6. Multi-Tenant Row Level Security & High-Performance Indexes
-- ==============================================================================

-- 1. EXTEND PUBLIC.PRODUCTS TABLE
DO $$
BEGIN
    -- Entity Type ('product', 'service', 'material', 'finishing', 'additional', 'installation')
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'entity_type') THEN
        ALTER TABLE public.products ADD COLUMN entity_type TEXT NOT NULL DEFAULT 'product';
    END IF;

    -- Service Configuration (JSONB: presets, required materials, finishing, additionals, installation, allowance rules)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'service_config') THEN
        ALTER TABLE public.products ADD COLUMN service_config JSONB NOT NULL DEFAULT '{}'::jsonb;
    END IF;

    -- Material Configuration (JSONB: roll widths, roll length, conversion, allowance defaults)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'material_config') THEN
        ALTER TABLE public.products ADD COLUMN material_config JSONB NOT NULL DEFAULT '{}'::jsonb;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_company_entity_type ON public.products(company_id, entity_type);

-- 2. EXTEND PUBLIC.MATERIALS TABLE
DO $$
BEGIN
    -- Available physical roll widths in feet (e.g. ARRAY[3.0, 4.0, 5.0] or ARRAY[3.25, 4.25, 5.25])
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'materials' AND column_name = 'available_widths_ft') THEN
        ALTER TABLE public.materials ADD COLUMN available_widths_ft NUMERIC[] DEFAULT ARRAY[3.0, 4.0, 5.0]::NUMERIC[];
    END IF;

    -- Standard purchase roll length in feet (e.g. 164.0 ft)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'materials' AND column_name = 'standard_roll_length_ft') THEN
        ALTER TABLE public.materials ADD COLUMN standard_roll_length_ft NUMERIC(10,2) DEFAULT 164.0;
    END IF;

    -- Material Type ('roll', 'sheet', 'rigid', 'liquid', 'hardware', 'accessory')
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'materials' AND column_name = 'material_type') THEN
        ALTER TABLE public.materials ADD COLUMN material_type TEXT NOT NULL DEFAULT 'roll';
    END IF;

    -- Default production allowance per side in inches (e.g. 1.0 inch each side)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'materials' AND column_name = 'default_allowance_per_side_in') THEN
        ALTER TABLE public.materials ADD COLUMN default_allowance_per_side_in NUMERIC(6,2) DEFAULT 1.0;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_materials_company_type ON public.materials(company_id, material_type);

-- 3. ENHANCE PUBLIC.INVENTORY_ROLLS TABLE
CREATE TABLE IF NOT EXISTS public.inventory_rolls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    location_id UUID REFERENCES public.inventory_locations(id) ON DELETE SET NULL,
    material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
    roll_code TEXT NOT NULL,
    roll_tag TEXT,
    width_ft NUMERIC(8,2) NOT NULL,
    initial_length_ft NUMERIC(8,2) NOT NULL,
    current_length_ft NUMERIC(8,2) NOT NULL,
    initial_area_sft NUMERIC(10,2) NOT NULL,
    consumed_area_sft NUMERIC(10,2) NOT NULL DEFAULT 0,
    remaining_area_sft NUMERIC(10,2) NOT NULL,
    current_area_sft NUMERIC(10,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'available' CHECK (
        status IN ('available', 'reserved', 'mounted', 'in_use', 'depleted', 'scrapped')
    ),
    mounted_press_name TEXT,
    location_name TEXT DEFAULT 'Main Store',
    unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
    purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
    grn_id UUID REFERENCES public.goods_received_notes(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    batch_lot_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_inventory_rolls_company_code UNIQUE (company_id, roll_code)
);

DO $$
BEGIN
    -- Ensure columns exist if table was partially created in earlier migrations
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'inventory_rolls' AND column_name = 'company_id') THEN
        ALTER TABLE public.inventory_rolls ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'inventory_rolls' AND column_name = 'branch_id') THEN
        ALTER TABLE public.inventory_rolls ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'inventory_rolls' AND column_name = 'location_id') THEN
        ALTER TABLE public.inventory_rolls ADD COLUMN location_id UUID REFERENCES public.inventory_locations(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'inventory_rolls' AND column_name = 'roll_code') THEN
        ALTER TABLE public.inventory_rolls ADD COLUMN roll_code TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'inventory_rolls' AND column_name = 'current_length_ft') THEN
        ALTER TABLE public.inventory_rolls ADD COLUMN current_length_ft NUMERIC(8,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'inventory_rolls' AND column_name = 'current_area_sft') THEN
        ALTER TABLE public.inventory_rolls ADD COLUMN current_area_sft NUMERIC(10,2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'inventory_rolls' AND column_name = 'purchase_order_id') THEN
        ALTER TABLE public.inventory_rolls ADD COLUMN purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'inventory_rolls' AND column_name = 'grn_id') THEN
        ALTER TABLE public.inventory_rolls ADD COLUMN grn_id UUID REFERENCES public.goods_received_notes(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'inventory_rolls' AND column_name = 'unit_cost') THEN
        ALTER TABLE public.inventory_rolls ADD COLUMN unit_cost NUMERIC(12,2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'inventory_rolls' AND column_name = 'total_cost') THEN
        ALTER TABLE public.inventory_rolls ADD COLUMN total_cost NUMERIC(12,2) DEFAULT 0;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_inventory_rolls_company_material ON public.inventory_rolls(company_id, material_id);
CREATE INDEX IF NOT EXISTS idx_inventory_rolls_company_status ON public.inventory_rolls(company_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_rolls_location ON public.inventory_rolls(company_id, location_id);

ALTER TABLE public.inventory_rolls ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inventory_rolls' AND policyname = 'inventory_rolls_select_tenant') THEN
        CREATE POLICY "inventory_rolls_select_tenant"
            ON public.inventory_rolls FOR SELECT
            USING (company_id = (SELECT auth.jwt() ->> 'company_id')::uuid OR (SELECT auth.jwt() ->> 'role') = 'platform_admin');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inventory_rolls' AND policyname = 'inventory_rolls_insert_tenant') THEN
        CREATE POLICY "inventory_rolls_insert_tenant"
            ON public.inventory_rolls FOR INSERT
            WITH CHECK (company_id = (SELECT auth.jwt() ->> 'company_id')::uuid OR (SELECT auth.jwt() ->> 'role') = 'platform_admin');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inventory_rolls' AND policyname = 'inventory_rolls_update_tenant') THEN
        CREATE POLICY "inventory_rolls_update_tenant"
            ON public.inventory_rolls FOR UPDATE
            USING (company_id = (SELECT auth.jwt() ->> 'company_id')::uuid OR (SELECT auth.jwt() ->> 'role') = 'platform_admin');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inventory_rolls' AND policyname = 'inventory_rolls_delete_tenant') THEN
        CREATE POLICY "inventory_rolls_delete_tenant"
            ON public.inventory_rolls FOR DELETE
            USING (company_id = (SELECT auth.jwt() ->> 'company_id')::uuid OR (SELECT auth.jwt() ->> 'role') = 'platform_admin');
    END IF;
END $$;

-- 4. ENHANCE PUBLIC.INVENTORY_REMNANTS TABLE
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'inventory_remnants' AND column_name = 'source_roll_id') THEN
        ALTER TABLE public.inventory_remnants ADD COLUMN source_roll_id UUID REFERENCES public.inventory_rolls(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_inventory_remnants_dimensions ON public.inventory_remnants(company_id, material_id, status, width, length);
