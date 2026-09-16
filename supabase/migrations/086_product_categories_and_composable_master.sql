-- ==============================================================================
-- InkFlow SaaS - Migration 086: Product Categories & Composable Master Architecture
-- Supports:
--   1. Dedicated Product Categories Hierarchy (product_categories table)
--   2. Product Type Applicability and Parent-Child Taxonomy
--   3. Category Linkage on Products (category_id foreign key)
--   4. Strict Tenant Isolation and Row Level Security
-- ==============================================================================

-- 1. CREATE PUBLIC.PRODUCT_CATEGORIES TABLE
create table if not exists public.product_categories (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    name text not null,
    name_bn text,
    slug text not null,
    parent_id uuid references public.product_categories(id) on delete set null,
    applies_to_product_types text[] not null default array['all']::text[],
    description text,
    is_active boolean not null default true,
    display_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_product_categories_company_name unique(company_id, name),
    constraint uk_product_categories_company_slug unique(company_id, slug)
);

-- 2. CREATE PERFORMANCE & SEARCH INDEXES
create index if not exists idx_product_categories_company on public.product_categories(company_id);
create index if not exists idx_product_categories_parent on public.product_categories(parent_id);
create index if not exists idx_product_categories_active on public.product_categories(company_id, is_active);
create index if not exists idx_product_categories_display on public.product_categories(company_id, display_order);

-- 3. ENABLE ROW LEVEL SECURITY
alter table public.product_categories enable row level security;

do $$
begin
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'product_categories' and policyname = 'product_categories_select_tenant') then
        create policy "product_categories_select_tenant"
            on public.product_categories for select
            using (company_id = (select auth.jwt() ->> 'company_id')::uuid or (select auth.jwt() ->> 'role') = 'platform_admin');
    end if;

    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'product_categories' and policyname = 'product_categories_insert_tenant') then
        create policy "product_categories_insert_tenant"
            on public.product_categories for insert
            with check (company_id = (select auth.jwt() ->> 'company_id')::uuid or (select auth.jwt() ->> 'role') = 'platform_admin');
    end if;

    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'product_categories' and policyname = 'product_categories_update_tenant') then
        create policy "product_categories_update_tenant"
            on public.product_categories for update
            using (company_id = (select auth.jwt() ->> 'company_id')::uuid or (select auth.jwt() ->> 'role') = 'platform_admin');
    end if;

    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'product_categories' and policyname = 'product_categories_delete_tenant') then
        create policy "product_categories_delete_tenant"
            on public.product_categories for delete
            using (company_id = (select auth.jwt() ->> 'company_id')::uuid or (select auth.jwt() ->> 'role') = 'platform_admin');
    end if;
end $$;

-- 4. EXTEND PUBLIC.PRODUCTS WITH CATEGORY_ID NON-DESTRUCTIVELY
do $$
begin
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'category_id') then
        alter table public.products add column category_id uuid references public.product_categories(id) on delete set null;
    end if;
end $$;

create index if not exists idx_products_company_category_id on public.products(company_id, category_id);
