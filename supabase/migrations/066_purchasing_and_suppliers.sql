-- ==============================================================================
-- PrintERP / InkFlow SaaS - Migration 066: Purchasing & Suppliers Management (V5)
-- Production-Certified Multi-Tenant Procurement & Supplier Operations
-- ==============================================================================

-- 1. EXTEND EXISTING SUPPLIERS TABLE WITH V5 CAPABILITIES
alter table public.suppliers add column if not exists supplier_code text;
alter table public.suppliers add column if not exists name_bn text;
alter table public.suppliers add column if not exists branch_id uuid references public.branches(id) on delete set null;
alter table public.suppliers add column if not exists alt_phone text;
alter table public.suppliers add column if not exists division text;
alter table public.suppliers add column if not exists district text;
alter table public.suppliers add column if not exists upazila text;
alter table public.suppliers add column if not exists area text;
alter table public.suppliers add column if not exists bin text;
alter table public.suppliers add column if not exists tin text;
alter table public.suppliers add column if not exists trade_license text;
alter table public.suppliers add column if not exists website text;
alter table public.suppliers add column if not exists credit_limit numeric(12,2) default 0;
alter table public.suppliers add column if not exists lead_time_days integer default 3;
alter table public.suppliers add column if not exists default_currency text default 'BDT';
alter table public.suppliers add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.suppliers add column if not exists updated_by uuid references auth.users(id) on delete set null;

create index if not exists idx_suppliers_code on public.suppliers(company_id, supplier_code);
create index if not exists idx_suppliers_branch on public.suppliers(company_id, branch_id);

-- 2. SUPPLIER ITEMS CATALOG (Mapping Suppliers to Materials)
create table if not exists public.supplier_items (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    branch_id uuid references public.branches(id) on delete set null,
    supplier_id uuid not null references public.suppliers(id) on delete cascade,
    material_id uuid not null references public.materials(id) on delete cascade,
    supplier_sku text,
    supplier_item_name text,
    purchase_unit text not null default 'unit',
    conversion_factor numeric(10,4) not null default 1.0,
    unit_price numeric(12,2) not null default 0,
    currency text not null default 'BDT',
    moq numeric(10,2) default 1,
    lead_time_days integer default 3,
    is_preferred boolean not null default false,
    is_active boolean not null default true,
    effective_date date not null default current_date,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_supplier_material unique (company_id, supplier_id, material_id)
);

create index if not exists idx_supplier_items_supp on public.supplier_items(company_id, supplier_id);
create index if not exists idx_supplier_items_mat on public.supplier_items(company_id, material_id);
alter table public.supplier_items enable row level security;

-- 3. PURCHASE REQUESTS & ITEMS
create table if not exists public.purchase_requests (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    branch_id uuid references public.branches(id) on delete set null,
    pr_number text not null,
    department text default 'Production',
    requested_by_id uuid references auth.users(id) on delete set null,
    requested_by_name text not null,
    request_date date not null default current_date,
    required_date date not null default (current_date + interval '3 days'),
    priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
    supplier_id uuid references public.suppliers(id) on delete set null,
    reason text,
    notes text,
    status text not null default 'submitted' check (
        status in ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'cancelled')
    ),
    approved_by_id uuid references auth.users(id) on delete set null,
    approved_by_name text,
    approved_at timestamptz,
    rejection_reason text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_purchase_requests_num unique (company_id, pr_number)
);

create index if not exists idx_purchase_requests_comp on public.purchase_requests(company_id);
create index if not exists idx_purchase_requests_status on public.purchase_requests(company_id, status);
alter table public.purchase_requests enable row level security;

create table if not exists public.purchase_request_items (
    id uuid primary key default gen_random_uuid(),
    purchase_request_id uuid not null references public.purchase_requests(id) on delete cascade,
    material_id uuid references public.materials(id) on delete set null,
    material_name text not null,
    quantity numeric(10,2) not null,
    unit text not null default 'pcs',
    required_date date,
    estimated_unit_price numeric(12,2) default 0,
    estimated_amount numeric(12,2) default 0,
    preferred_supplier_id uuid references public.suppliers(id) on delete set null,
    notes text,
    created_at timestamptz not null default now()
);

create index if not exists idx_pr_items_pr on public.purchase_request_items(purchase_request_id);
alter table public.purchase_request_items enable row level security;

-- 4. EXTEND PURCHASE ORDERS & ITEMS TABLE
alter table public.purchase_orders add column if not exists branch_id uuid references public.branches(id) on delete set null;
alter table public.purchase_orders add column if not exists purchase_request_id uuid references public.purchase_requests(id) on delete set null;
alter table public.purchase_orders add column if not exists supplier_reference text;
alter table public.purchase_orders add column if not exists currency text default 'BDT';
alter table public.purchase_orders add column if not exists payment_terms text default 'credit_15';
alter table public.purchase_orders add column if not exists shipping_cost numeric(12,2) default 0;
alter table public.purchase_orders add column if not exists other_charges numeric(12,2) default 0;
alter table public.purchase_orders add column if not exists terms_and_conditions text;
alter table public.purchase_orders add column if not exists approved_by_id uuid references auth.users(id) on delete set null;
alter table public.purchase_orders add column if not exists approved_by_name text;
alter table public.purchase_orders add column if not exists approved_at timestamptz;
alter table public.purchase_orders add column if not exists sent_at timestamptz;
alter table public.purchase_orders add column if not exists cancelled_at timestamptz;
alter table public.purchase_orders add column if not exists cancellation_reason text;

alter table public.purchase_order_items add column if not exists supplier_sku text;
alter table public.purchase_order_items add column if not exists discount_percent numeric(5,2) default 0;
alter table public.purchase_order_items add column if not exists tax_percent numeric(5,2) default 0;
alter table public.purchase_order_items add column if not exists expected_date date;
alter table public.purchase_order_items add column if not exists notes text;

-- 5. EXTEND GOODS RECEIVED NOTES & ITEMS
alter table public.goods_received_notes add column if not exists branch_id uuid references public.branches(id) on delete set null;
alter table public.goods_received_notes add column if not exists supplier_id uuid references public.suppliers(id) on delete set null;
alter table public.goods_received_notes add column if not exists receiving_location_id uuid references public.inventory_locations(id) on delete set null;
alter table public.goods_received_notes add column if not exists supplier_delivery_note text;
alter table public.goods_received_notes add column if not exists supplier_invoice_number text;
alter table public.goods_received_notes add column if not exists status text default 'posted' check (
    status in ('draft', 'received', 'inspected', 'quarantined', 'posted', 'cancelled')
);
alter table public.goods_received_notes add column if not exists accepted_total numeric(12,2) default 0;
alter table public.goods_received_notes add column if not exists rejected_total numeric(12,2) default 0;
alter table public.goods_received_notes add column if not exists damaged_total numeric(12,2) default 0;
alter table public.goods_received_notes add column if not exists posted_at timestamptz default now();
alter table public.goods_received_notes add column if not exists posted_by_id uuid references auth.users(id) on delete set null;
alter table public.goods_received_notes add column if not exists posted_by_name text;

create table if not exists public.goods_received_note_items (
    id uuid primary key default gen_random_uuid(),
    grn_id uuid not null references public.goods_received_notes(id) on delete cascade,
    po_item_id uuid references public.purchase_order_items(id) on delete set null,
    material_id uuid not null references public.materials(id) on delete cascade,
    material_name text not null,
    quantity_ordered numeric(10,2) not null default 0,
    previously_received numeric(10,2) not null default 0,
    current_received numeric(10,2) not null,
    accepted_quantity numeric(10,2) not null,
    rejected_quantity numeric(10,2) not null default 0,
    damaged_quantity numeric(10,2) not null default 0,
    unit text not null,
    unit_cost numeric(12,2) not null,
    total_cost numeric(12,2) not null,
    batch_lot_number text,
    roll_id text,
    expiry_date date,
    rejection_reason text,
    notes text,
    created_at timestamptz not null default now()
);

create index if not exists idx_grn_items_grn on public.goods_received_note_items(grn_id);
create index if not exists idx_grn_items_mat on public.goods_received_note_items(material_id);
alter table public.goods_received_note_items enable row level security;

-- 6. SUPPLIER RETURNS TABLE & ITEMS
create table if not exists public.supplier_returns (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    branch_id uuid references public.branches(id) on delete set null,
    return_number text not null,
    grn_id uuid references public.goods_received_notes(id) on delete set null,
    purchase_order_id uuid references public.purchase_orders(id) on delete set null,
    supplier_id uuid not null references public.suppliers(id) on delete cascade,
    supplier_name text not null,
    return_date date not null default current_date,
    status text not null default 'draft' check (
        status in ('draft', 'approved', 'completed', 'cancelled')
    ),
    reason text not null,
    total_return_amount numeric(12,2) not null default 0,
    approved_by_id uuid references auth.users(id) on delete set null,
    approved_by_name text,
    approved_at timestamptz,
    notes text,
    created_by_name text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_supplier_returns_num unique (company_id, return_number)
);

create index if not exists idx_supplier_returns_comp on public.supplier_returns(company_id);
create index if not exists idx_supplier_returns_supp on public.supplier_returns(company_id, supplier_id);
alter table public.supplier_returns enable row level security;

create table if not exists public.supplier_return_items (
    id uuid primary key default gen_random_uuid(),
    return_id uuid not null references public.supplier_returns(id) on delete cascade,
    grn_item_id uuid references public.goods_received_note_items(id) on delete set null,
    material_id uuid not null references public.materials(id) on delete cascade,
    material_name text not null,
    return_quantity numeric(10,2) not null,
    unit text not null,
    unit_cost numeric(12,2) not null,
    total_amount numeric(12,2) not null,
    reason text,
    location_id uuid references public.inventory_locations(id) on delete set null,
    created_at timestamptz not null default now()
);

create index if not exists idx_return_items_ret on public.supplier_return_items(return_id);
alter table public.supplier_return_items enable row level security;

-- 7. SUPPLIER LEDGER ENTRIES (Procurement Balance & Liability Tracking)
create table if not exists public.supplier_ledger_entries (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    branch_id uuid references public.branches(id) on delete set null,
    supplier_id uuid not null references public.suppliers(id) on delete cascade,
    entry_type text not null check (
        entry_type in ('PURCHASE_ORDER', 'GOODS_RECEIPT', 'PAYMENT', 'RETURN', 'ADJUSTMENT')
    ),
    reference_type text,
    reference_id text,
    debit numeric(12,2) not null default 0,
    credit numeric(12,2) not null default 0,
    running_balance numeric(12,2) not null default 0,
    notes text,
    created_at timestamptz not null default now()
);

create index if not exists idx_supplier_ledger_supp on public.supplier_ledger_entries(company_id, supplier_id);
create index if not exists idx_supplier_ledger_date on public.supplier_ledger_entries(company_id, created_at);
alter table public.supplier_ledger_entries enable row level security;

-- 8. ROW LEVEL SECURITY (RLS) POLICIES
drop policy if exists "tenant_isolation_supplier_items" on public.supplier_items;
create policy "tenant_isolation_supplier_items" on public.supplier_items for all
    using (public.auth_is_active_company_user(company_id));

drop policy if exists "tenant_isolation_purchase_requests" on public.purchase_requests;
create policy "tenant_isolation_purchase_requests" on public.purchase_requests for all
    using (public.auth_is_active_company_user(company_id));

drop policy if exists "tenant_isolation_purchase_request_items" on public.purchase_request_items;
create policy "tenant_isolation_purchase_request_items" on public.purchase_request_items for all
    using (
        exists (
            select 1 from public.purchase_requests pr
            where pr.id = purchase_request_items.purchase_request_id
            and public.auth_is_active_company_user(pr.company_id)
        )
    );

drop policy if exists "tenant_isolation_grn_items" on public.goods_received_note_items;
create policy "tenant_isolation_grn_items" on public.goods_received_note_items for all
    using (
        exists (
            select 1 from public.goods_received_notes grn
            where grn.id = goods_received_note_items.grn_id
            and public.auth_is_active_company_user(grn.company_id)
        )
    );

drop policy if exists "tenant_isolation_supplier_returns" on public.supplier_returns;
create policy "tenant_isolation_supplier_returns" on public.supplier_returns for all
    using (public.auth_is_active_company_user(company_id));

drop policy if exists "tenant_isolation_supplier_return_items" on public.supplier_return_items;
create policy "tenant_isolation_supplier_return_items" on public.supplier_return_items for all
    using (
        exists (
            select 1 from public.supplier_returns sr
            where sr.id = supplier_return_items.return_id
            and public.auth_is_active_company_user(sr.company_id)
        )
    );

drop policy if exists "tenant_isolation_supplier_ledger_entries" on public.supplier_ledger_entries;
create policy "tenant_isolation_supplier_ledger_entries" on public.supplier_ledger_entries for all
    using (public.auth_is_active_company_user(company_id));
