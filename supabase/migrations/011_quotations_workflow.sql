-- ==============================================================================
-- PrintERP SaaS - Migration 011: Quotation Lifecycle Workflow
-- Supports:
--   1. 8 Quotation Statuses (draft, sent, viewed, negotiation, approved, rejected, expired, converted)
--   2. Multi-item dimensional calculations (quotation_items)
--   3. Internal cost shielding and margin controls
--   4. Quotation activity timeline tracking (quotation_activities)
--   5. Strict Multi-Tenant Row Level Security
-- ==============================================================================

-- 1. QUOTATIONS TABLE
create table if not exists public.quotations (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    quotation_number text not null,
    customer_id uuid references public.customers(id) on delete restrict,
    customer_name text not null,
    customer_name_bn text,
    customer_phone text not null,
    customer_email text,
    customer_address text,
    customer_bin text,
    status text not null default 'draft' check (
        status in ('draft', 'sent', 'viewed', 'negotiation', 'approved', 'rejected', 'expired', 'converted')
    ),
    quotation_date date not null default current_date,
    valid_until date not null,
    salesperson_id uuid references auth.users(id) on delete set null,
    salesperson_name text not null,
    subtotal numeric(12,2) not null default 0,
    discount_amount numeric(12,2) not null default 0,
    vat_rate numeric(5,2) not null default 7.50,
    vat_amount numeric(12,2) not null default 0,
    grand_total numeric(12,2) not null default 0,
    total_cost numeric(12,2) not null default 0, -- Internal only, shielded from client PDF
    margin_percent numeric(5,2) not null default 0, -- Internal only
    language_mode text not null default 'bilingual' check (language_mode in ('en', 'bn', 'bilingual')),
    notes text,
    terms_and_conditions text,
    converted_order_id text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_quotations_company_number unique (company_id, quotation_number)
);

create index if not exists idx_quotations_company on public.quotations(company_id);
create index if not exists idx_quotations_status on public.quotations(company_id, status);
create index if not exists idx_quotations_customer on public.quotations(customer_id);
alter table public.quotations enable row level security;

-- 2. QUOTATION ITEMS TABLE
create table if not exists public.quotation_items (
    id uuid primary key default gen_random_uuid(),
    quotation_id uuid not null references public.quotations(id) on delete cascade,
    product_id uuid references public.products(id) on delete set null,
    description text not null,
    description_bn text,
    material_spec text,
    width numeric(10,2),
    height numeric(10,2),
    dimension_unit text not null default 'ft' check (dimension_unit in ('ft', 'inch', 'm')),
    area_sft numeric(10,2) not null default 0,
    quantity integer not null default 1,
    unit text not null default 'sft',
    unit_rate numeric(10,2) not null,
    material_cost numeric(10,2) default 0,
    labor_cost numeric(10,2) default 0,
    finishing_cost numeric(10,2) default 0,
    installation_cost numeric(10,2) default 0,
    item_total numeric(12,2) not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_quotation_items_quote on public.quotation_items(quotation_id);
alter table public.quotation_items enable row level security;

-- 3. QUOTATION ACTIVITY TIMELINE
create table if not exists public.quotation_activities (
    id uuid primary key default gen_random_uuid(),
    quotation_id uuid not null references public.quotations(id) on delete cascade,
    action text not null check (
        action in ('created', 'sent', 'viewed', 'negotiated', 'approved', 'rejected', 'expired', 'converted')
    ),
    details text,
    actor_name text not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_quotation_activities_quote on public.quotation_activities(quotation_id);
alter table public.quotation_activities enable row level security;

-- 4. RLS POLICIES FOR QUOTATIONS
create policy "Active company users can view quotations"
    on public.quotations for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can insert quotations"
    on public.quotations for insert
    with check (
        public.auth_is_active_company_user(company_id)
        and public.auth_user_has_permission(company_id, 'quotation.create')
    );

create policy "Authorized company users can update quotations"
    on public.quotations for update
    using (
        public.auth_is_active_company_user(company_id)
        and public.auth_user_has_permission(company_id, 'quotation.edit')
    );

create policy "Authorized company users can delete quotations"
    on public.quotations for delete
    using (
        public.auth_is_active_company_user(company_id)
        and public.auth_user_has_permission(company_id, 'quotation.delete')
    );

create policy "Active company users can view quotation items"
    on public.quotation_items for select
    using (
        exists (
            select 1 from public.quotations q
            where q.id = quotation_items.quotation_id
            and public.auth_is_active_company_user(q.company_id)
        )
    );

create policy "Authorized company users can manage quotation items"
    on public.quotation_items for all
    using (
        exists (
            select 1 from public.quotations q
            where q.id = quotation_items.quotation_id
            and public.auth_is_active_company_user(q.company_id)
        )
    );

create policy "Active company users can view quotation activities"
    on public.quotation_activities for select
    using (
        exists (
            select 1 from public.quotations q
            where q.id = quotation_activities.quotation_id
            and public.auth_is_active_company_user(q.company_id)
        )
    );

create policy "Active company users can insert quotation activities"
    on public.quotation_activities for insert
    with check (
        exists (
            select 1 from public.quotations q
            where q.id = quotation_activities.quotation_id
            and public.auth_is_active_company_user(q.company_id)
        )
    );
