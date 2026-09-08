-- ==============================================================================
-- PrintERP SaaS - Migration 009: Customer and Supplier Management
-- Supports:
--   1. Customer Directory with 6 customer types (Corporate, Agency, Retail, Dealer, Government, Regular)
--   2. Customer Communication Logs & Notes
--   3. Supplier Directory with 9 material categories (Media, Acrylic, LED, Hardware, Ink, Paper, PVC, Aluminum, Other)
--   4. Supplier Contract Material Price Sheets
--   5. Strict Multi-Tenant Row Level Security
-- ==============================================================================

-- 1. CUSTOMERS TABLE
create table if not exists public.customers (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    customer_type text not null default 'regular' check (
        customer_type in ('corporate', 'agency', 'retail', 'dealer', 'government', 'regular')
    ),
    name text not null,
    name_bn text,
    contact_person text,
    mobile text not null,
    whatsapp text,
    email text,
    division_id integer references public.divisions(id) on delete set null,
    district_id integer references public.districts(id) on delete set null,
    upazila_id integer references public.upazilas(id) on delete set null,
    area text,
    address text,
    address_bn text,
    bin_no text,
    tin_no text,
    credit_limit numeric(12,2) not null default 0,
    payment_terms text not null default 'cash_on_delivery' check (
        payment_terms in ('cash_on_delivery', 'net_7', 'net_15', 'net_30', 'advance_50')
    ),
    notes text,
    tags text[] default array[]::text[],
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_customers_company on public.customers(company_id);
create index if not exists idx_customers_mobile on public.customers(company_id, mobile);
create index if not exists idx_customers_type on public.customers(company_id, customer_type);
alter table public.customers enable row level security;

-- 2. CUSTOMER COMMUNICATIONS LOG
create table if not exists public.customer_communications (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    customer_id uuid not null references public.customers(id) on delete cascade,
    type text not null check (type in ('phone_call', 'whatsapp_message', 'email', 'meeting', 'site_visit')),
    summary text not null,
    details text,
    logged_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now()
);

create index if not exists idx_customer_comms_cust on public.customer_communications(customer_id);
alter table public.customer_communications enable row level security;

-- 3. SUPPLIERS TABLE
create table if not exists public.suppliers (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    supplier_name text not null,
    company text,
    contact_person text,
    mobile text not null,
    whatsapp text,
    email text,
    address text,
    category text not null check (
        category in ('media', 'acrylic', 'led', 'hardware', 'ink', 'paper', 'pvc', 'aluminum', 'other')
    ),
    payment_terms text not null default 'credit_15' check (
        payment_terms in ('cash', 'credit_15', 'credit_30', 'advance')
    ),
    notes text,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_suppliers_company on public.suppliers(company_id);
create index if not exists idx_suppliers_category on public.suppliers(company_id, category);
alter table public.suppliers enable row level security;

-- 4. SUPPLIER MATERIAL CONTRACT PRICES
create table if not exists public.supplier_material_prices (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    supplier_id uuid not null references public.suppliers(id) on delete cascade,
    material_name text not null,
    category text not null,
    unit text not null, -- 'sft', 'sqm', 'kg', 'roll', 'sheet', 'piece', 'ream', 'liter'
    contract_price_bdt numeric(10,2) not null,
    effective_date date not null default current_date,
    notes text,
    created_at timestamptz not null default now()
);

create index if not exists idx_supp_prices_supp on public.supplier_material_prices(supplier_id);
alter table public.supplier_material_prices enable row level security;

-- 5. RLS POLICIES FOR CUSTOMERS & SUPPLIERS
create policy "Active company users can view customers"
    on public.customers for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can insert customers"
    on public.customers for insert
    with check (
        public.auth_is_active_company_user(company_id)
        and public.auth_user_has_permission(company_id, 'customer.create')
    );

create policy "Authorized company users can update customers"
    on public.customers for update
    using (
        public.auth_is_active_company_user(company_id)
        and public.auth_user_has_permission(company_id, 'customer.edit')
    );

create policy "Authorized company users can delete customers"
    on public.customers for delete
    using (
        public.auth_is_active_company_user(company_id)
        and public.auth_user_has_permission(company_id, 'customer.delete')
    );

create policy "Active company users can view communications"
    on public.customer_communications for select
    using (public.auth_is_active_company_user(company_id));

create policy "Active company users can create communications"
    on public.customer_communications for insert
    with check (public.auth_is_active_company_user(company_id));

create policy "Active company users can view suppliers"
    on public.suppliers for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can manage suppliers"
    on public.suppliers for all
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'supplier.edit')
            or public.auth_user_has_permission(company_id, 'supplier.create')
        )
    );

create policy "Active company users can view supplier material prices"
    on public.supplier_material_prices for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can manage supplier material prices"
    on public.supplier_material_prices for all
    using (public.auth_is_active_company_user(company_id));
