-- ==============================================================================
-- PrintFlow SaaS - Migration 129: Relax Products Check Constraint for Outsource
-- Adds 'outsource' and 'outsource_product' to products_product_type_check constraint
-- ==============================================================================

DO $$
BEGIN
    -- Drop existing product_type check constraint if present
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public' 
          AND table_name = 'products' 
          AND constraint_name = 'products_product_type_check'
    ) THEN
        ALTER TABLE public.products DROP CONSTRAINT products_product_type_check;
    END IF;

    -- Add comprehensive product_type check constraint including outsource types
    ALTER TABLE public.products ADD CONSTRAINT products_product_type_check CHECK (
        product_type IN (
            'finished_product', 'ready_product', 'production_product', 
            'print_service', 'service', 'fabrication_service', 'fabrication',
            'installation_service', 'installation', 'finishing', 'additional',
            'custom_job', 'material', 'delivery', 'package_bundle', 'PRODUCT', 'SERVICE',
            'outsource', 'outsource_product'
        )
    );
END $$;
