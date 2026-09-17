-- ==============================================================================
-- InkFlow SaaS - Migration 089: Modernize and Relax Products Constraints
-- Fixes constraint errors on products table:
--   1. products_product_type_check: Adds ready_product, production_product, service, finishing, additional, etc.
--   2. products_unit_check: Adds piece, set, pack, box, item, meter, rft, liter, etc.
-- ==============================================================================

DO $$
BEGIN
    -- 1. Drop existing product_type check constraint if present
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public' 
          AND table_name = 'products' 
          AND constraint_name = 'products_product_type_check'
    ) THEN
        ALTER TABLE public.products DROP CONSTRAINT products_product_type_check;
    END IF;

    -- Add comprehensive product_type check constraint supporting modern and legacy types
    ALTER TABLE public.products ADD CONSTRAINT products_product_type_check CHECK (
        product_type IN (
            'finished_product', 'ready_product', 'production_product', 
            'print_service', 'service', 'fabrication_service', 'fabrication',
            'installation_service', 'installation', 'finishing', 'additional',
            'custom_job', 'material', 'delivery', 'package_bundle', 'PRODUCT', 'SERVICE'
        )
    );

    -- 2. Drop existing unit check constraint if present
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public' 
          AND table_name = 'products' 
          AND constraint_name = 'products_unit_check'
    ) THEN
        ALTER TABLE public.products DROP CONSTRAINT products_unit_check;
    END IF;

    -- Add comprehensive unit check constraint supporting all valid catalog units
    ALTER TABLE public.products ADD CONSTRAINT products_unit_check CHECK (
        unit IN (
            'pcs', 'piece', 'set', 'pack', 'box', 'item', 'sheet', 'roll',
            'sft', 'sqft', 'rft', 'sqm', 'inch', 'ft', 'meter',
            'kg', 'ltr', 'liter', 'ml', 'hr', 'hour'
        )
    );
END $$;
