-- ==============================================================================
-- InkFlow SaaS - Migration 083: Products & Services Master Upgrade
-- Supports:
--   1. Non-destructive extension of public.products table with production flags & specs
--   2. Performance indexes for multi-tenant search, category filtering & active status
--   3. Foreign key reference & safety check for branch assignment and created_by
--   4. Strict Multi-Tenant Row Level Security & RBAC permission gating
-- ==============================================================================

-- 1. EXTEND PUBLIC.PRODUCTS TABLE NON-DESTRUCTIVELY
do $$
begin
    -- Branch reference
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'branch_id') then
        alter table public.products add column branch_id uuid references public.branches(id) on delete set null;
    end if;

    -- Bengali description
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'description_bn') then
        alter table public.products add column description_bn text;
    end if;

    -- Dimensions specification
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'dimensions_spec') then
        alter table public.products add column dimensions_spec text;
    end if;

    -- Internal notes
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'internal_notes') then
        alter table public.products add column internal_notes text;
    end if;

    -- Production workflow flags
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'requires_design') then
        alter table public.products add column requires_design boolean not null default false;
    end if;

    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'requires_approval') then
        alter table public.products add column requires_approval boolean not null default false;
    end if;

    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'requires_production') then
        alter table public.products add column requires_production boolean not null default true;
    end if;

    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'requires_fabrication') then
        alter table public.products add column requires_fabrication boolean not null default false;
    end if;

    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'requires_finishing') then
        alter table public.products add column requires_finishing boolean not null default false;
    end if;

    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'requires_installation') then
        alter table public.products add column requires_installation boolean not null default false;
    end if;

    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'requires_delivery') then
        alter table public.products add column requires_delivery boolean not null default false;
    end if;

    -- Production department & timing
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'default_department') then
        alter table public.products add column default_department text not null default 'printing';
    end if;

    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'estimated_production_time_hours') then
        alter table public.products add column estimated_production_time_hours numeric(6,2) not null default 4.0;
    end if;

    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'default_finishing') then
        alter table public.products add column default_finishing text;
    end if;

    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'production_instructions') then
        alter table public.products add column production_instructions text;
    end if;

    -- Created by user reference
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'created_by') then
        alter table public.products add column created_by uuid references auth.users(id) on delete set null;
    end if;
end $$;

-- 2. PRODUCTION PERFORMANCE & LOOKUP INDEXES
create index if not exists idx_products_company_active on public.products(company_id, is_active);
create index if not exists idx_products_company_category on public.products(company_id, category);
create index if not exists idx_products_company_name on public.products(company_id, name);
create index if not exists idx_products_company_sku_upper on public.products(company_id, upper(sku));

-- 3. HARDEN RLS POLICIES FOR PRODUCTS & PRICING
drop policy if exists "Active company users can view products" on public.products;
create policy "Active company users can view products"
    on public.products for select
    using (public.auth_is_active_company_user(company_id));

drop policy if exists "Authorized company users can insert products" on public.products;
create policy "Authorized company users can insert products"
    on public.products for insert
    with check (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'products.create')
            or public.auth_user_has_permission(company_id, 'products.manage')
            or public.auth_user_has_permission(company_id, 'inventory.create')
            or public.auth_user_has_permission(company_id, 'inventory.manage')
        )
    );

drop policy if exists "Authorized company users can update products" on public.products;
create policy "Authorized company users can update products"
    on public.products for update
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'products.edit')
            or public.auth_user_has_permission(company_id, 'products.manage')
            or public.auth_user_has_permission(company_id, 'pricing.edit')
            or public.auth_user_has_permission(company_id, 'pricing.manage')
            or public.auth_user_has_permission(company_id, 'inventory.edit')
            or public.auth_user_has_permission(company_id, 'inventory.manage')
        )
    );

drop policy if exists "Authorized company users can delete products" on public.products;
create policy "Authorized company users can delete products"
    on public.products for delete
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'products.delete')
            or public.auth_user_has_permission(company_id, 'products.manage')
            or public.auth_user_has_permission(company_id, 'inventory.delete')
            or public.auth_user_has_permission(company_id, 'inventory.manage')
        )
    );
