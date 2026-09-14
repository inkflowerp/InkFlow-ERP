-- ==============================================================================
-- InkFlow SaaS - Migration 065: Products, Services, Advanced Formulas & Costing
-- Supports:
--   1. Extended Product Master with Variants & Bangladeshi Print/Signage Specs
--   2. Structured Production Formulas (Material, Machine, Labor, Finishing, Transport)
--   3. Multi-Tier Price Lists (Retail, Wholesale, Dealer, Corporate, VIP)
--   4. Non-Destructive Extension of Job Costing (Snapshots, Machine Cost, Orders, Quotations)
--   5. Strict Multi-Tenant Row Level Security & RBAC Shielding
-- ==============================================================================

-- 1. PRODUCT VARIANTS TABLE
create table if not exists public.product_variants (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    product_id uuid not null references public.products(id) on delete cascade,
    variant_name text not null,
    sku_suffix text,
    thickness_mm numeric(6,2),
    gsm integer,
    finish text,
    color text,
    size_spec text,
    cost_adjustment numeric(12,2) not null default 0,
    price_adjustment numeric(12,2) not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_product_variants_prod on public.product_variants(company_id, product_id);
alter table public.product_variants enable row level security;

-- 2. PRODUCT FORMULAS TABLE (Versioned Production Bill of Materials & Pricing Formulas)
create table if not exists public.product_formulas (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    product_id uuid not null references public.products(id) on delete cascade,
    formula_name text not null default 'Default Formula',
    version integer not null default 1,
    model text not null check (
        model in ('dimensional_area', 'running_length', 'unit_quantity', 'compound_signage', 'custom_formula')
    ),
    waste_factor_percent numeric(5,2) not null default 5.0,
    material_requirements jsonb not null default '[]'::jsonb,
    machine_operations jsonb not null default '[]'::jsonb,
    labor_operations jsonb not null default '[]'::jsonb,
    finishing_operations jsonb not null default '[]'::jsonb,
    other_costs jsonb not null default '[]'::jsonb,
    target_margin_percent numeric(5,2) not null default 35.0,
    min_margin_percent numeric(5,2) not null default 15.0,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_product_formulas_prod_version unique (company_id, product_id, version)
);

create index if not exists idx_product_formulas_prod on public.product_formulas(company_id, product_id);
alter table public.product_formulas enable row level security;

-- 3. PRICE LISTS TABLE
create table if not exists public.price_lists (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    name text not null,
    code text not null,
    tier_type text not null default 'retail' check (
        tier_type in ('retail', 'wholesale', 'dealer', 'corporate', 'vip', 'custom')
    ),
    description text,
    default_markup_percent numeric(5,2) not null default 0,
    is_default boolean not null default false,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_price_lists_comp_code unique (company_id, code)
);

create index if not exists idx_price_lists_company on public.price_lists(company_id);
alter table public.price_lists enable row level security;

-- 4. PRICE LIST ITEMS TABLE
create table if not exists public.price_list_items (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    price_list_id uuid not null references public.price_lists(id) on delete cascade,
    product_id uuid not null references public.products(id) on delete cascade,
    custom_rate numeric(12,2),
    discount_percent numeric(5,2) not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_price_list_items_unique unique (company_id, price_list_id, product_id)
);

create index if not exists idx_price_list_items_list on public.price_list_items(company_id, price_list_id);
alter table public.price_list_items enable row level security;

-- 5. EXTEND JOB_COSTINGS TABLE (Non-destructive)
alter table public.job_costings add column if not exists branch_id uuid references public.branches(id) on delete set null;
alter table public.job_costings add column if not exists job_order_id uuid references public.job_orders(id) on delete set null;
alter table public.job_costings add column if not exists sales_order_id uuid references public.sales_orders(id) on delete set null;
alter table public.job_costings add column if not exists quotation_id uuid references public.quotations(id) on delete set null;
alter table public.job_costings add column if not exists product_id uuid references public.products(id) on delete set null;
alter table public.job_costings add column if not exists item_title text default 'Custom Print & Fabrication Job';
alter table public.job_costings add column if not exists dimensions_spec text;
alter table public.job_costings add column if not exists quantity numeric(12,2) default 1;
alter table public.job_costings add column if not exists unit text default 'pcs';
alter table public.job_costings add column if not exists est_machine_cost numeric(12,2) default 0;
alter table public.job_costings add column if not exists act_machine_cost numeric(12,2) default 0;
alter table public.job_costings add column if not exists costing_snapshot jsonb not null default '{}'::jsonb;
alter table public.job_costings add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.job_costings add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_job_costings_comp_job on public.job_costings(company_id, job_number);
create index if not exists idx_job_costings_sales_order on public.job_costings(company_id, sales_order_id);
create index if not exists idx_job_costings_status on public.job_costings(company_id, status);

-- 6. ROW-LEVEL SECURITY POLICIES
drop policy if exists "Active company users can view product variants" on public.product_variants;
create policy "Active company users can view product variants"
    on public.product_variants for select
    using (public.auth_is_active_company_user(company_id));

drop policy if exists "Active company users can manage product variants" on public.product_variants;
create policy "Active company users can manage product variants"
    on public.product_variants for all
    using (public.auth_is_active_company_user(company_id))
    with check (public.auth_is_active_company_user(company_id));

drop policy if exists "Active company users can view product formulas" on public.product_formulas;
create policy "Active company users can view product formulas"
    on public.product_formulas for select
    using (public.auth_is_active_company_user(company_id));

drop policy if exists "Active company users can manage product formulas" on public.product_formulas;
create policy "Active company users can manage product formulas"
    on public.product_formulas for all
    using (public.auth_is_active_company_user(company_id))
    with check (public.auth_is_active_company_user(company_id));

drop policy if exists "Active company users can view price lists" on public.price_lists;
create policy "Active company users can view price lists"
    on public.price_lists for select
    using (public.auth_is_active_company_user(company_id));

drop policy if exists "Active company users can manage price lists" on public.price_lists;
create policy "Active company users can manage price lists"
    on public.price_lists for all
    using (public.auth_is_active_company_user(company_id))
    with check (public.auth_is_active_company_user(company_id));

drop policy if exists "Active company users can view price list items" on public.price_list_items;
create policy "Active company users can view price list items"
    on public.price_list_items for select
    using (public.auth_is_active_company_user(company_id));

drop policy if exists "Active company users can manage price list items" on public.price_list_items;
create policy "Active company users can manage price list items"
    on public.price_list_items for all
    using (public.auth_is_active_company_user(company_id))
    with check (public.auth_is_active_company_user(company_id));
