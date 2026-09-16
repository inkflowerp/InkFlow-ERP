-- ==============================================================================
-- InkFlow SaaS - Migration 085: Products & Services Commercial Master 2.1
-- Supports:
--   1. Pricing Methods (fixed, per_piece, per_area, per_length, per_weight, per_volume, per_job, per_hour, tiered, formula)
--   2. Minimum Billable Quantity (distinct from MOQ and Minimum Charge)
--   3. Price Tiers (retail, corporate, dealer, wholesale, custom)
--   4. Supplier-Specific Purchase Economics (product_supplier_prices table)
--   5. Component / Recipe / Bundle Architecture (components JSONB)
--   6. Multi-Component Cost Breakdown (cost_breakdown JSONB)
--   7. Margin Floor & Low-Margin Approval Logging (price_overrides table extension)
-- ==============================================================================

-- 1. EXTEND PUBLIC.PRODUCTS TABLE NON-DESTRUCTIVELY
do $$
begin
    -- Pricing Method (fixed, per_piece, per_area, per_length, per_weight, per_volume, per_job, per_hour, tiered, formula)
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'pricing_method') then
        alter table public.products add column pricing_method text not null default 'per_piece';
    end if;

    -- Minimum Billable Quantity (e.g. 20 sqft for stickers ordered under 20 sqft)
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'min_billable_quantity') then
        alter table public.products add column min_billable_quantity numeric(10,2) not null default 1.0;
    end if;

    -- Manual Price Override Allowed setting
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'allow_manual_override') then
        alter table public.products add column allow_manual_override boolean not null default true;
    end if;

    -- Minimum Allowed Gross Margin % (Commercial Protection Floor, e.g. 15.0%)
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'min_allowed_margin_percent') then
        alter table public.products add column min_allowed_margin_percent numeric(5,2) not null default 15.0;
    end if;

    -- Multi-Tier Pricing Matrix (e.g. {"retail": 30, "corporate": 28, "dealer": 25, "wholesale": 22})
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'price_tiers') then
        alter table public.products add column price_tiers jsonb not null default '{}'::jsonb;
    end if;

    -- Multi-Component Direct Cost Breakdown (material, ink, machine, labor, finishing, fabrication, installation, delivery, other)
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'cost_breakdown') then
        alter table public.products add column cost_breakdown jsonb not null default '{}'::jsonb;
    end if;

    -- Component / Recipe / Bundle BOM definition
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'components') then
        alter table public.products add column components jsonb not null default '[]'::jsonb;
    end if;
end $$;

-- 2. CREATE SUPPLIER-SPECIFIC PURCHASE ECONOMICS TABLE
create table if not exists public.product_supplier_prices (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    product_id uuid not null references public.products(id) on delete cascade,
    supplier_id uuid references public.suppliers(id) on delete set null,
    supplier_name text not null,
    purchase_unit text not null default 'roll',
    conversion_ratio numeric(12,4) not null default 1.0,
    purchase_price numeric(12,2) not null default 0.0,
    moq numeric(10,2) not null default 1.0,
    lead_time_days integer not null default 1,
    last_purchase_date timestamptz,
    is_preferred boolean not null default false,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_product_supplier_prices_company_product on public.product_supplier_prices(company_id, product_id);
create index if not exists idx_product_supplier_prices_supplier on public.product_supplier_prices(supplier_id);

alter table public.product_supplier_prices enable row level security;

do $$
begin
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'product_supplier_prices' and policyname = 'product_supplier_prices_select_tenant') then
        create policy "product_supplier_prices_select_tenant"
            on public.product_supplier_prices for select
            using (company_id = (select auth.jwt() ->> 'company_id')::uuid or (select auth.jwt() ->> 'role') = 'platform_admin');
    end if;

    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'product_supplier_prices' and policyname = 'product_supplier_prices_insert_tenant') then
        create policy "product_supplier_prices_insert_tenant"
            on public.product_supplier_prices for insert
            with check (company_id = (select auth.jwt() ->> 'company_id')::uuid or (select auth.jwt() ->> 'role') = 'platform_admin');
    end if;

    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'product_supplier_prices' and policyname = 'product_supplier_prices_update_tenant') then
        create policy "product_supplier_prices_update_tenant"
            on public.product_supplier_prices for update
            using (company_id = (select auth.jwt() ->> 'company_id')::uuid or (select auth.jwt() ->> 'role') = 'platform_admin');
    end if;

    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'product_supplier_prices' and policyname = 'product_supplier_prices_delete_tenant') then
        create policy "product_supplier_prices_delete_tenant"
            on public.product_supplier_prices for delete
            using (company_id = (select auth.jwt() ->> 'company_id')::uuid or (select auth.jwt() ->> 'role') = 'platform_admin');
    end if;
end $$;

-- 3. EXTEND PUBLIC.PRICE_OVERRIDES AUDIT TABLE
do $$
begin
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'price_overrides' and column_name = 'product_name') then
        alter table public.price_overrides add column product_name text;
    end if;

    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'price_overrides' and column_name = 'document_id') then
        alter table public.price_overrides add column document_id uuid;
    end if;

    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'price_overrides' and column_name = 'original_margin_percent') then
        alter table public.price_overrides add column original_margin_percent numeric(5,2);
    end if;

    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'price_overrides' and column_name = 'override_margin_percent') then
        alter table public.price_overrides add column override_margin_percent numeric(5,2);
    end if;

    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'price_overrides' and column_name = 'authorized_by_name') then
        alter table public.price_overrides add column authorized_by_name text;
    end if;

    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'price_overrides' and column_name = 'tenant_slug') then
        alter table public.price_overrides add column tenant_slug text;
    end if;
end $$;

-- 4. COMMERCIAL MASTER 2.1 PERFORMANCE INDEXES
create index if not exists idx_products_company_pricing_method on public.products(company_id, pricing_method);
