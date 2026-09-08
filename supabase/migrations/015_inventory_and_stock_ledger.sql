-- ==============================================================================
-- PrintERP SaaS - Migration 015: Specialized Inventory & Stock Ledger
-- Supports:
--   1. Printing & Signage Materials (Roll Media, Rigid Sheets, Metals, LED, Inks)
--   2. Roll Inventory (Width x Length = SFT area accounting)
--   3. Company-configurable coverage conversion rates (Inks & Substrates)
--   4. 7 Inventory Transaction Types & Immutable Stock Ledger
--   5. Material Wastage & Scrap Audit (Expected vs Actual)
--   6. Multi-Method Inventory Valuation (Last Purchase Price, Average Cost, Manual, Supplier)
--   7. Strict Multi-Tenant Row Level Security
-- ==============================================================================

-- 1. MATERIALS TABLE
create table if not exists public.materials (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    sku text not null,
    name text not null,
    name_bn text,
    category text not null check (
        category in ('roll_media', 'rigid_sheet', 'metal_framing', 'led_electrical', 'ink_chemistry', 'hardware_accessories')
    ),
    unit text not null check (unit in ('roll', 'sheet', 'piece', 'meter', 'sft', 'liter', 'kg')),
    is_roll boolean not null default false,
    roll_width_ft numeric(8,2),
    roll_length_ft numeric(8,2),
    total_roll_area_sft numeric(10,2),
    current_stock numeric(12,2) not null default 0,
    min_stock_level numeric(12,2) not null default 0,
    coverage_rate_sft_per_unit numeric(10,2), -- Configurable coverage (e.g. 850 sft/liter)
    last_purchase_price numeric(12,2) not null default 0,
    average_cost numeric(12,2) not null default 0,
    manual_cost numeric(12,2) not null default 0,
    valuation_method text not null default 'average_cost' check (
        valuation_method in ('last_purchase_price', 'average_cost', 'manual_cost', 'supplier_price')
    ),
    location text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_materials_company_sku unique (company_id, sku)
);

create index if not exists idx_materials_company on public.materials(company_id);
create index if not exists idx_materials_category on public.materials(company_id, category);
create index if not exists idx_materials_low_stock on public.materials(company_id, current_stock);
alter table public.materials enable row level security;

-- 2. INVENTORY ROLLS TABLE (Discrete mounted rolls on factory presses)
create table if not exists public.inventory_rolls (
    id uuid primary key default gen_random_uuid(),
    material_id uuid not null references public.materials(id) on delete cascade,
    roll_tag text not null,
    width_ft numeric(8,2) not null,
    initial_length_ft numeric(8,2) not null,
    initial_area_sft numeric(10,2) not null,
    consumed_area_sft numeric(10,2) not null default 0,
    remaining_area_sft numeric(10,2) not null,
    status text not null default 'mounted' check (
        status in ('in_warehouse', 'mounted', 'depleted', 'scrapped')
    ),
    mounted_press_name text,
    created_at timestamptz not null default now()
);

create index if not exists idx_inventory_rolls_material on public.inventory_rolls(material_id);
alter table public.inventory_rolls enable row level security;

-- 3. STOCK LEDGER TABLE (Immutable transaction log)
create table if not exists public.stock_ledger (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    material_id uuid not null references public.materials(id) on delete cascade,
    transaction_type text not null check (
        transaction_type in ('purchase', 'consumption', 'adjustment', 'return', 'wastage', 'transfer', 'opening_stock')
    ),
    quantity_change numeric(12,2) not null,
    unit text not null,
    balance_after numeric(12,2) not null,
    unit_cost numeric(12,2) not null default 0,
    total_cost numeric(12,2) not null default 0,
    reference_id text,
    notes text,
    performed_by_name text not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_stock_ledger_company on public.stock_ledger(company_id);
create index if not exists idx_stock_ledger_material on public.stock_ledger(material_id);
create index if not exists idx_stock_ledger_type on public.stock_ledger(company_id, transaction_type);
alter table public.stock_ledger enable row level security;

-- 4. MATERIAL WASTAGES TABLE
create table if not exists public.material_wastages (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    material_id uuid not null references public.materials(id) on delete cascade,
    job_order_id uuid references public.job_orders(id) on delete set null,
    expected_usage numeric(10,2) not null,
    actual_usage numeric(10,2) not null,
    wastage_quantity numeric(10,2) not null,
    unit text not null,
    wastage_reason text not null,
    estimated_cost numeric(12,2) not null default 0,
    created_at timestamptz not null default now()
);

create index if not exists idx_material_wastages_company on public.material_wastages(company_id);
create index if not exists idx_material_wastages_material on public.material_wastages(material_id);
alter table public.material_wastages enable row level security;

-- 5. RLS POLICIES
create policy "Active company users can view materials"
    on public.materials for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can manage materials"
    on public.materials for all
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'inventory.view')
            or public.auth_user_has_permission(company_id, 'inventory.edit')
            or public.auth_user_has_permission(company_id, 'inventory.create')
        )
    );

create policy "Active company users can view inventory rolls"
    on public.inventory_rolls for select
    using (
        exists (
            select 1 from public.materials m
            where m.id = inventory_rolls.material_id
            and public.auth_is_active_company_user(m.company_id)
        )
    );

create policy "Authorized company users can manage inventory rolls"
    on public.inventory_rolls for all
    using (
        exists (
            select 1 from public.materials m
            where m.id = inventory_rolls.material_id
            and public.auth_is_active_company_user(m.company_id)
        )
    );

create policy "Active company users can view stock ledger"
    on public.stock_ledger for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can insert stock ledger"
    on public.stock_ledger for insert
    with check (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'inventory.edit')
            or public.auth_user_has_permission(company_id, 'production.edit')
            or public.auth_user_has_permission(company_id, 'purchase.create')
        )
    );

create policy "Active company users can view wastages"
    on public.material_wastages for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can insert wastages"
    on public.material_wastages for insert
    with check (
        public.auth_is_active_company_user(company_id)
        and public.auth_user_has_permission(company_id, 'inventory.edit')
    );
