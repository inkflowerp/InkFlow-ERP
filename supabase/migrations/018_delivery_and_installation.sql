-- ==============================================================================
-- PrintERP SaaS - Migration 018: Delivery, Dispatch Challans & On-Site Installation
-- Supports:
--   1. 4 Delivery Methods (Company Vehicle, Courier, Local Transport, Customer Pickup)
--   2. Delivery Challans (Transit slips with receiver sign-off)
--   3. On-Site Signage & Rigging Installations (Crew, Site Photos, Customer Confirmation)
--   4. Interactive Delivery Calendar
--   5. Strict Multi-Tenant Row Level Security
-- ==============================================================================

-- 1. DELIVERY CHALLANS TABLE
create table if not exists public.delivery_challans (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    challan_number text not null,
    sales_order_id uuid references public.sales_orders(id) on delete set null,
    order_number text,
    customer_id uuid references public.customers(id) on delete restrict,
    customer_name text not null,
    customer_phone text not null,
    delivery_address text not null,
    delivery_method text not null check (
        delivery_method in ('company_vehicle', 'courier', 'local_transport', 'customer_pickup')
    ),
    delivery_person_name text,
    delivery_person_phone text,
    vehicle_info text, -- Vehicle plate number or courier tracking ID
    transport_cost numeric(12,2) not null default 0,
    scheduled_date date not null default current_date,
    status text not null default 'scheduled' check (
        status in ('scheduled', 'assigned', 'out_for_delivery', 'delivered', 'failed', 'returned')
    ),
    delivered_at timestamptz,
    receiver_name text,
    receiver_phone text,
    receiver_signature text,
    notes text,
    created_by_name text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_delivery_challans_company_number unique (company_id, challan_number)
);

create index if not exists idx_delivery_challans_company on public.delivery_challans(company_id);
create index if not exists idx_delivery_challans_customer on public.delivery_challans(company_id, customer_id);
create index if not exists idx_delivery_challans_status on public.delivery_challans(company_id, status);
create index if not exists idx_delivery_challans_date on public.delivery_challans(company_id, scheduled_date);
alter table public.delivery_challans enable row level security;

-- 2. CHALLAN ITEMS TABLE
create table if not exists public.challan_items (
    id uuid primary key default gen_random_uuid(),
    challan_id uuid not null references public.delivery_challans(id) on delete cascade,
    product_description text not null,
    dimensions_spec text,
    quantity numeric(10,2) not null,
    unit text not null,
    remarks text,
    created_at timestamptz not null default now()
);

create index if not exists idx_challan_items_challan on public.challan_items(challan_id);
alter table public.challan_items enable row level security;

-- 3. INSTALLATIONS TABLE (On-Site Rigging & Fitting)
create table if not exists public.installations (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    installation_number text not null,
    sales_order_id uuid references public.sales_orders(id) on delete set null,
    order_number text,
    customer_id uuid references public.customers(id) on delete restrict,
    customer_name text not null,
    site_location text not null,
    installer_lead_name text not null,
    crew_members text[] not null default '{}',
    installation_date date not null default current_date,
    scheduled_time text,
    status text not null default 'pending' check (
        status in ('pending', 'scheduled', 'on_site', 'completed', 'failed', 'rescheduled')
    ),
    transport_cost numeric(12,2) not null default 0,
    labor_cost numeric(12,2) not null default 0,
    equipment_used text,
    site_photos text[] not null default '{}',
    customer_confirmed_by text,
    customer_confirmed_phone text,
    customer_rating_or_note text,
    confirmed_at timestamptz,
    failure_reason text,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_installations_company_number unique (company_id, installation_number)
);

create index if not exists idx_installations_company on public.installations(company_id);
create index if not exists idx_installations_status on public.installations(company_id, status);
create index if not exists idx_installations_date on public.installations(company_id, installation_date);
alter table public.installations enable row level security;

-- 4. RLS POLICIES
create policy "Active company users can view delivery challans"
    on public.delivery_challans for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can manage delivery challans"
    on public.delivery_challans for all
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'delivery.view')
            or public.auth_user_has_permission(company_id, 'delivery.create')
            or public.auth_user_has_permission(company_id, 'delivery.edit')
        )
    );

create policy "Active company users can view challan items"
    on public.challan_items for select
    using (
        exists (
            select 1 from public.delivery_challans ch
            where ch.id = challan_items.challan_id
            and public.auth_is_active_company_user(ch.company_id)
        )
    );

create policy "Authorized company users can manage challan items"
    on public.challan_items for all
    using (
        exists (
            select 1 from public.delivery_challans ch
            where ch.id = challan_items.challan_id
            and public.auth_is_active_company_user(ch.company_id)
        )
    );

create policy "Active company users can view installations"
    on public.installations for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can manage installations"
    on public.installations for all
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'delivery.view')
            or public.auth_user_has_permission(company_id, 'delivery.edit')
            or public.auth_user_has_permission(company_id, 'production.edit')
        )
    );
