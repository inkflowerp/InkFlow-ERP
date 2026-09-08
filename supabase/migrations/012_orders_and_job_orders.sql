-- ==============================================================================
-- PrintERP SaaS - Migration 012: Sales Orders & Multi-Job Production Ticketing
-- Supports:
--   1. Sales Orders with Priority (Normal, Urgent, Very Urgent) and Payment Terms (Cash, Advance, Partial, Credit)
--   2. Multi-Job Orders (job_orders table generating discrete machine bay tickets)
--   3. 9-Stage Order Lifecycle Timeline (order_timeline_events)
--   4. Strict Multi-Tenant Row Level Security
-- ==============================================================================

-- 1. SALES ORDERS TABLE
create table if not exists public.sales_orders (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    order_number text not null,
    quotation_id uuid references public.quotations(id) on delete set null,
    customer_id uuid references public.customers(id) on delete restrict,
    customer_name text not null,
    customer_name_bn text,
    customer_phone text not null,
    customer_address text,
    salesperson_name text not null,
    order_date date not null default current_date,
    delivery_date date not null,
    priority text not null default 'normal' check (priority in ('normal', 'urgent', 'very_urgent')),
    status text not null default 'confirmed' check (
        status in ('pending', 'confirmed', 'in_production', 'finishing', 'ready_for_delivery', 'partially_delivered', 'delivered', 'installed', 'completed', 'cancelled')
    ),
    payment_terms text not null default 'advance' check (payment_terms in ('cash', 'advance', 'partial', 'credit')),
    subtotal numeric(12,2) not null default 0,
    discount_amount numeric(12,2) not null default 0,
    vat_amount numeric(12,2) not null default 0,
    final_price numeric(12,2) not null default 0,
    advance_amount numeric(12,2) not null default 0,
    due_amount numeric(12,2) not null default 0,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_sales_orders_company_number unique (company_id, order_number)
);

create index if not exists idx_sales_orders_company on public.sales_orders(company_id);
create index if not exists idx_sales_orders_priority on public.sales_orders(company_id, priority);
create index if not exists idx_sales_orders_status on public.sales_orders(company_id, status);
create index if not exists idx_sales_orders_customer on public.sales_orders(customer_id);
alter table public.sales_orders enable row level security;

-- 2. SALES ORDER ITEMS TABLE
create table if not exists public.sales_order_items (
    id uuid primary key default gen_random_uuid(),
    order_id uuid not null references public.sales_orders(id) on delete cascade,
    product_id uuid references public.products(id) on delete set null,
    item_name text not null,
    material_spec text,
    width numeric(10,2),
    height numeric(10,2),
    dimension_unit text not null default 'ft' check (dimension_unit in ('ft', 'inch', 'm')),
    quantity integer not null default 1,
    unit text not null default 'sft',
    unit_price numeric(10,2) not null,
    total_price numeric(12,2) not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_sales_order_items_order on public.sales_order_items(order_id);
alter table public.sales_order_items enable row level security;

-- 3. JOB ORDERS TABLE (Discrete Shop Floor Production Tickets)
create table if not exists public.job_orders (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    job_number text not null,
    order_id uuid not null references public.sales_orders(id) on delete cascade,
    order_item_id uuid references public.sales_order_items(id) on delete set null,
    product_name text not null,
    customer_name text not null,
    quantity integer not null default 1,
    size_spec text not null,
    material_spec text not null,
    artwork_url text,
    artwork_status text not null default 'approved' check (artwork_status in ('pending', 'approved', 'revised')),
    deadline timestamptz not null,
    assigned_department text not null check (
        assigned_department in ('design', 'wide_format_print', 'digital_offset', 'laser_cnc', 'fabrication', 'finishing', 'installation')
    ),
    assigned_employee_name text,
    production_instructions text,
    status text not null default 'queued' check (
        status in ('queued', 'in_progress', 'paused', 'quality_check', 'completed')
    ),
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_job_orders_company_number unique (company_id, job_number)
);

create index if not exists idx_job_orders_company on public.job_orders(company_id);
create index if not exists idx_job_orders_order on public.job_orders(order_id);
create index if not exists idx_job_orders_dept on public.job_orders(company_id, assigned_department);
create index if not exists idx_job_orders_status on public.job_orders(company_id, status);
alter table public.job_orders enable row level security;

-- 4. ORDER TIMELINE EVENTS
create table if not exists public.order_timeline_events (
    id uuid primary key default gen_random_uuid(),
    order_id uuid not null references public.sales_orders(id) on delete cascade,
    stage text not null check (
        stage in ('quotation', 'approval', 'sales_order', 'job_order', 'production', 'finishing', 'delivery', 'installation', 'completion')
    ),
    title text not null,
    description text,
    actor_name text not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_order_timeline_order on public.order_timeline_events(order_id);
alter table public.order_timeline_events enable row level security;

-- 5. RLS POLICIES FOR ORDERS & JOBS
create policy "Active company users can view sales orders"
    on public.sales_orders for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can insert sales orders"
    on public.sales_orders for insert
    with check (
        public.auth_is_active_company_user(company_id)
        and public.auth_user_has_permission(company_id, 'order.create')
    );

create policy "Authorized company users can update sales orders"
    on public.sales_orders for update
    using (
        public.auth_is_active_company_user(company_id)
        and public.auth_user_has_permission(company_id, 'order.edit')
    );

create policy "Authorized company users can delete sales orders"
    on public.sales_orders for delete
    using (
        public.auth_is_active_company_user(company_id)
        and public.auth_user_has_permission(company_id, 'order.delete')
    );

create policy "Active company users can view job orders"
    on public.job_orders for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can manage job orders"
    on public.job_orders for all
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'production.edit')
            or public.auth_user_has_permission(company_id, 'production.create')
            or public.auth_user_has_permission(company_id, 'order.edit')
        )
    );

create policy "Active company users can view timeline"
    on public.order_timeline_events for select
    using (
        exists (
            select 1 from public.sales_orders o
            where o.id = order_timeline_events.order_id
            and public.auth_is_active_company_user(o.company_id)
        )
    );

create policy "Active company users can insert timeline"
    on public.order_timeline_events for insert
    with check (
        exists (
            select 1 from public.sales_orders o
            where o.id = order_timeline_events.order_id
            and public.auth_is_active_company_user(o.company_id)
        )
    );
