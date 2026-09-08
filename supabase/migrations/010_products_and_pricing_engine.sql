-- ==============================================================================
-- PrintERP SaaS - Migration 010: Product/Service Catalog + Safe Pricing Engine
-- Supports:
--   1. Products table with 6 product types and 10 units of measure
--   2. Structured JSON pricing formulas (Safe non-eval declarative models)
--   3. Historical product price changes (product_price_history)
--   4. Sales price override audit log (price_overrides)
--   5. Strict Multi-Tenant Row Level Security
-- ==============================================================================

-- 1. PRODUCTS & SERVICES TABLE
create table if not exists public.products (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    name text not null,
    name_bn text,
    sku text not null,
    category text not null,
    product_type text not null check (
        product_type in ('finished_product', 'print_service', 'fabrication_service', 'installation_service', 'custom_job', 'material')
    ),
    unit text not null check (
        unit in ('pcs', 'sft', 'inch', 'ft', 'sqm', 'sheet', 'roll', 'kg', 'ltr', 'hr')
    ),
    material_spec text,
    description text,
    base_cost numeric(12,2) not null default 0,
    selling_price numeric(12,2) not null default 0,
    min_price numeric(12,2) not null default 0,
    tax_rate numeric(5,2) not null default 7.50,
    pricing_formula jsonb default null,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_products_company_sku unique (company_id, sku)
);

create index if not exists idx_products_company on public.products(company_id);
create index if not exists idx_products_type on public.products(company_id, product_type);
create index if not exists idx_products_sku on public.products(company_id, sku);
alter table public.products enable row level security;

-- 2. PRODUCT PRICE HISTORY
create table if not exists public.product_price_history (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    product_id uuid not null references public.products(id) on delete cascade,
    old_price numeric(12,2) not null,
    new_price numeric(12,2) not null,
    reason text,
    changed_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now()
);

create index if not exists idx_price_history_prod on public.product_price_history(product_id);
alter table public.product_price_history enable row level security;

-- 3. PRICE OVERRIDES AUDIT LOG
create table if not exists public.price_overrides (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    product_id uuid references public.products(id) on delete set null,
    document_type text check (document_type in ('quotation', 'order', 'invoice')),
    document_code text,
    original_price numeric(12,2) not null,
    override_price numeric(12,2) not null,
    reason text not null,
    authorized_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now()
);

create index if not exists idx_price_overrides_company on public.price_overrides(company_id);
alter table public.price_overrides enable row level security;

-- 4. RLS POLICIES FOR PRODUCTS & PRICING
create policy "Active company users can view products"
    on public.products for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can insert products"
    on public.products for insert
    with check (
        public.auth_is_active_company_user(company_id)
        and public.auth_user_has_permission(company_id, 'inventory.create')
    );

create policy "Authorized company users can update products"
    on public.products for update
    using (
        public.auth_is_active_company_user(company_id)
        and public.auth_user_has_permission(company_id, 'inventory.edit')
    );

create policy "Authorized company users can delete products"
    on public.products for delete
    using (
        public.auth_is_active_company_user(company_id)
        and public.auth_user_has_permission(company_id, 'inventory.delete')
    );

create policy "Active company users can view price history"
    on public.product_price_history for select
    using (public.auth_is_active_company_user(company_id));

create policy "Active company users can insert price history"
    on public.product_price_history for insert
    with check (public.auth_is_active_company_user(company_id));

create policy "Active company users can view price overrides"
    on public.price_overrides for select
    using (public.auth_is_active_company_user(company_id));

create policy "Active company users can log price overrides"
    on public.price_overrides for insert
    with check (public.auth_is_active_company_user(company_id));
