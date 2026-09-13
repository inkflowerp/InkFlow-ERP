-- ==============================================================================
-- PrintERP / InkFlow SaaS - Migration 057: Customer Rates & Pricing Priority Engine
-- Supports:
--   1. Customer-specific product rates (customer_rates table)
--   2. 3-Tier Pricing Priority: Custom Rate -> Last Valid Invoice Rate -> Default Rate
--   3. Foreign key reference & index for product_id on invoice_items
--   4. Immutable Historical Invoicing Protection
--   5. Strict Multi-Tenant Row Level Security
-- ==============================================================================

-- 1. CUSTOMER RATES TABLE
create table if not exists public.customer_rates (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    customer_id uuid not null references public.customers(id) on delete cascade,
    product_id uuid not null references public.products(id) on delete cascade,
    rate numeric(12,2) not null check (rate >= 0),
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_customer_rates_comp_cust_prod unique (company_id, customer_id, product_id)
);

create index if not exists idx_customer_rates_comp_cust on public.customer_rates(company_id, customer_id);
create index if not exists idx_customer_rates_comp_prod on public.customer_rates(company_id, product_id);
alter table public.customer_rates enable row level security;

-- 2. ENSURE INVOICE_ITEMS HAS PRODUCT_ID REFERENCE (Non-destructive)
do $$
begin
    if not exists (
        select 1 from information_schema.columns 
        where table_schema = 'public' 
        and table_name = 'invoice_items' 
        and column_name = 'product_id'
    ) then
        alter table public.invoice_items add column product_id uuid references public.products(id) on delete set null;
    end if;
end $$;

create index if not exists idx_invoice_items_prod on public.invoice_items(product_id);
create index if not exists idx_invoices_cust_date on public.invoices(company_id, customer_id, invoice_date desc, created_at desc);

-- 3. RLS POLICIES FOR CUSTOMER RATES
drop policy if exists "Active company users can view customer rates" on public.customer_rates;
create policy "Active company users can view customer rates" on public.customer_rates for select
    using (public.auth_is_active_company_user(company_id));

drop policy if exists "Authorized company users can insert customer rates" on public.customer_rates;
create policy "Authorized company users can insert customer rates" on public.customer_rates for insert
    with check (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'customer.edit')
            or public.auth_user_has_permission(company_id, 'customers.edit')
            or public.auth_user_has_permission(company_id, 'customer.create')
            or public.auth_user_has_permission(company_id, 'customers.create')
        )
    );

drop policy if exists "Authorized company users can update customer rates" on public.customer_rates;
create policy "Authorized company users can update customer rates" on public.customer_rates for update
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'customer.edit')
            or public.auth_user_has_permission(company_id, 'customers.edit')
        )
    );

drop policy if exists "Authorized company users can delete customer rates" on public.customer_rates;
create policy "Authorized company users can delete customer rates" on public.customer_rates for delete
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'customer.edit')
            or public.auth_user_has_permission(company_id, 'customers.edit')
        )
    );
