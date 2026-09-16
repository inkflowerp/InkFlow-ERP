-- ==============================================================================
-- InkFlow SaaS - Migration 084: Products & Services Commercial Master 2.0
-- Supports:
--   1. Purchase Unit vs Selling Unit with Conversion Ratio
--   2. Expected Usable Yield & Default Wastage Percentage
--   3. Target Gross Margin % & Suggested Selling Price
--   4. Minimum Charge & Minimum Order Quantity
--   5. Commercial Product Types & Measurement Types
--   6. Roll & Sheet Dimensional Specs for Conversion
--   7. Extended Product Price & Commercial Audit Logs
-- ==============================================================================

-- 1. EXTEND PUBLIC.PRODUCTS TABLE NON-DESTRUCTIVELY
do $$
begin
    -- Commercial Product Classification
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'commercial_type') then
        alter table public.products add column commercial_type text not null default 'production_product';
    end if;

    -- Measurement Type (piece, length, area, weight, volume, job)
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'measurement_type') then
        alter table public.products add column measurement_type text not null default 'area';
    end if;

    -- Purchase Unit (e.g. roll, sheet, box, bottle, pack, kg, job, pcs)
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'purchase_unit') then
        alter table public.products add column purchase_unit text;
    end if;

    -- Purchase Price per Purchase Unit (e.g. 8500 per roll)
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'purchase_price') then
        alter table public.products add column purchase_price numeric(12,2) not null default 0;
    end if;

    -- Selling Unit (e.g. sft, pcs, rft, sheet, ml, job)
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'selling_unit') then
        alter table public.products add column selling_unit text;
    end if;

    -- Unit Conversion Ratio (1 Purchase Unit = N Selling Units, e.g. 1 Roll = 1640 sqft)
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'conversion_ratio') then
        alter table public.products add column conversion_ratio numeric(12,4) not null default 1.0;
    end if;

    -- Production Unit (e.g. sqft, sheet, pcs)
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'production_unit') then
        alter table public.products add column production_unit text;
    end if;

    -- Default Expected Wastage Percentage (e.g. 5.0%)
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'default_wastage_percentage') then
        alter table public.products add column default_wastage_percentage numeric(5,2) not null default 0.0;
    end if;

    -- Target Gross Margin Percentage (e.g. 35.0% or 40.0%)
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'target_margin_percentage') then
        alter table public.products add column target_margin_percentage numeric(5,2) not null default 35.0;
    end if;

    -- Minimum Charge per line item (e.g. ৳500 minimum for stickers)
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'minimum_charge') then
        alter table public.products add column minimum_charge numeric(12,2) not null default 0;
    end if;

    -- Minimum Order Quantity (e.g. 5 sqft)
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'min_order_quantity') then
        alter table public.products add column min_order_quantity numeric(10,2) not null default 1.0;
    end if;

    -- VAT applicability and tax inclusive setting
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'vat_applicable') then
        alter table public.products add column vat_applicable boolean not null default false;
    end if;

    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'is_tax_inclusive') then
        alter table public.products add column is_tax_inclusive boolean not null default false;
    end if;

    -- Roll Dimensions for Large Format / Roll Media
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'roll_width_ft') then
        alter table public.products add column roll_width_ft numeric(6,2);
    end if;

    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'roll_length_ft') then
        alter table public.products add column roll_length_ft numeric(6,2);
    end if;

    -- Sheet Dimensions for Sheet Media (Acrylic, PVC, ACP, Paper)
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'sheet_width_ft') then
        alter table public.products add column sheet_width_ft numeric(6,2);
    end if;

    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'sheet_length_ft') then
        alter table public.products add column sheet_length_ft numeric(6,2);
    end if;
end $$;

-- 2. EXTEND PUBLIC.PRODUCT_PRICE_HISTORY TABLE
do $$
begin
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'product_price_history' and column_name = 'old_purchase_price') then
        alter table public.product_price_history add column old_purchase_price numeric(12,2);
    end if;

    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'product_price_history' and column_name = 'new_purchase_price') then
        alter table public.product_price_history add column new_purchase_price numeric(12,2);
    end if;

    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'product_price_history' and column_name = 'old_margin_percent') then
        alter table public.product_price_history add column old_margin_percent numeric(5,2);
    end if;

    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'product_price_history' and column_name = 'new_margin_percent') then
        alter table public.product_price_history add column new_margin_percent numeric(5,2);
    end if;

    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'product_price_history' and column_name = 'old_wastage_percent') then
        alter table public.product_price_history add column old_wastage_percent numeric(5,2);
    end if;

    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'product_price_history' and column_name = 'new_wastage_percent') then
        alter table public.product_price_history add column new_wastage_percent numeric(5,2);
    end if;
end $$;

-- 3. COMMERCIAL PERFORMANCE INDEXES
create index if not exists idx_products_company_commercial_type on public.products(company_id, commercial_type);
create index if not exists idx_products_company_measurement_type on public.products(company_id, measurement_type);
create index if not exists idx_products_company_selling_unit on public.products(company_id, selling_unit);
