-- ==============================================================================
-- PrintERP SaaS - Migration 016: Purchase Management & Supplier Price Benchmarks
-- Supports:
--   1. Purchase Orders with multi-item tracking
--   2. Partial Receiving (goods_received_notes with incremental stock sync)
--   3. Supplier Price History & Intelligence (Last, Average, Lowest, Highest)
--   4. Multi-Channel Supplier Payments (Cash, Bank, Cheque, MFS)
--   5. Strict Multi-Tenant Row Level Security
-- ==============================================================================

-- 1. PURCHASE ORDERS TABLE
create table if not exists public.purchase_orders (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    po_number text not null,
    supplier_id uuid references public.suppliers(id) on delete restrict,
    supplier_name text not null,
    supplier_phone text not null,
    supplier_email text,
    supplier_address text,
    po_date date not null default current_date,
    expected_delivery_date date not null,
    status text not null default 'issued' check (
        status in ('draft', 'issued', 'partially_received', 'received', 'billed', 'paid', 'cancelled')
    ),
    subtotal numeric(12,2) not null default 0,
    vat_amount numeric(12,2) not null default 0,
    discount_amount numeric(12,2) not null default 0,
    grand_total numeric(12,2) not null default 0,
    paid_amount numeric(12,2) not null default 0,
    due_amount numeric(12,2) not null default 0,
    notes text,
    created_by_name text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_purchase_orders_company_number unique (company_id, po_number)
);

create index if not exists idx_purchase_orders_company on public.purchase_orders(company_id);
create index if not exists idx_purchase_orders_supplier on public.purchase_orders(supplier_id);
create index if not exists idx_purchase_orders_status on public.purchase_orders(company_id, status);
alter table public.purchase_orders enable row level security;

-- 2. PURCHASE ORDER ITEMS TABLE (Ordered vs Received vs Remaining)
create table if not exists public.purchase_order_items (
    id uuid primary key default gen_random_uuid(),
    purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
    material_id uuid references public.materials(id) on delete restrict,
    material_name text not null,
    quantity_ordered numeric(10,2) not null,
    quantity_received numeric(10,2) not null default 0,
    quantity_remaining numeric(10,2) not null,
    unit text not null,
    unit_cost numeric(12,2) not null,
    total_cost numeric(12,2) not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_po_items_po on public.purchase_order_items(purchase_order_id);
alter table public.purchase_order_items enable row level security;

-- 3. GOODS RECEIVED NOTES TABLE (Incremental receiving batches)
create table if not exists public.goods_received_notes (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    grn_number text not null,
    purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
    supplier_name text not null,
    received_date timestamptz not null default now(),
    challan_number text,
    received_by_name text not null,
    notes text,
    created_at timestamptz not null default now()
);

create index if not exists idx_grn_po on public.goods_received_notes(purchase_order_id);
alter table public.goods_received_notes enable row level security;

-- 4. SUPPLIER PRICE HISTORY TABLE
create table if not exists public.supplier_price_history (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    material_id uuid references public.materials(id) on delete cascade,
    material_name text not null,
    supplier_id uuid references public.suppliers(id) on delete cascade,
    supplier_name text not null,
    purchase_price numeric(12,2) not null,
    previous_price numeric(12,2),
    quantity numeric(10,2) not null,
    po_id uuid references public.purchase_orders(id) on delete set null,
    po_date date not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_supplier_price_hist_mat on public.supplier_price_history(company_id, material_id);
create index if not exists idx_supplier_price_hist_supp on public.supplier_price_history(company_id, supplier_id);
alter table public.supplier_price_history enable row level security;

-- 5. SUPPLIER PAYMENTS TABLE
create table if not exists public.supplier_payments (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    purchase_order_id uuid references public.purchase_orders(id) on delete set null,
    supplier_id uuid references public.suppliers(id) on delete restrict,
    supplier_name text not null,
    payment_method text not null check (payment_method in ('cash', 'bank', 'cheque', 'mfs')),
    amount numeric(12,2) not null,
    payment_date date not null default current_date,
    cheque_number text,
    bank_name text,
    mfs_transaction_id text,
    notes text,
    recorded_by_name text not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_supplier_payments_po on public.supplier_payments(purchase_order_id);
create index if not exists idx_supplier_payments_supp on public.supplier_payments(supplier_id);
alter table public.supplier_payments enable row level security;

-- 6. RLS POLICIES
create policy "Active company users can view purchase orders"
    on public.purchase_orders for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can manage purchase orders"
    on public.purchase_orders for all
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'purchase.view')
            or public.auth_user_has_permission(company_id, 'purchase.create')
            or public.auth_user_has_permission(company_id, 'purchase.edit')
        )
    );

create policy "Active company users can view po items"
    on public.purchase_order_items for select
    using (
        exists (
            select 1 from public.purchase_orders po
            where po.id = purchase_order_items.purchase_order_id
            and public.auth_is_active_company_user(po.company_id)
        )
    );

create policy "Authorized company users can manage po items"
    on public.purchase_order_items for all
    using (
        exists (
            select 1 from public.purchase_orders po
            where po.id = purchase_order_items.purchase_order_id
            and public.auth_is_active_company_user(po.company_id)
        )
    );

create policy "Active company users can view price history"
    on public.supplier_price_history for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can insert price history"
    on public.supplier_price_history for insert
    with check (public.auth_is_active_company_user(company_id));

create policy "Active company users can view supplier payments"
    on public.supplier_payments for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can insert supplier payments"
    on public.supplier_payments for insert
    with check (public.auth_is_active_company_user(company_id));
