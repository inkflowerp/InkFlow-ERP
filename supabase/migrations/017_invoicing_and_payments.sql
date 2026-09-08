-- ==============================================================================
-- PrintERP SaaS - Migration 017: Invoicing, Payments & Multi-Invoice Allocation
-- Supports:
--   1. Sales Invoices, NBR Mushak 6.3 VAT Invoices, and Payment Money Receipts
--   2. Multi-Invoice Payment Allocation
--   3. Overdue Aging & Days Overdue Tracking
--   4. Non-Destructive Financial Write-offs and Adjustments Audit Trail
--   5. Strict Multi-Tenant Row Level Security
-- ==============================================================================

-- 1. INVOICES TABLE
create table if not exists public.invoices (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    invoice_number text not null,
    invoice_type text not null default 'sales_invoice' check (
        invoice_type in ('sales_invoice', 'vat_invoice', 'payment_receipt')
    ),
    customer_id uuid references public.customers(id) on delete restrict,
    customer_name text not null,
    customer_phone text not null,
    customer_bin text, -- 13-digit Business Identification Number (NBR)
    customer_tin text,
    customer_address text,
    sales_order_id uuid references public.sales_orders(id) on delete set null,
    order_number text,
    invoice_date date not null default current_date,
    due_date date not null,
    status text not null default 'unpaid' check (
        status in ('unpaid', 'partially_paid', 'paid', 'overdue', 'written_off', 'cancelled')
    ),
    subtotal numeric(12,2) not null default 0,
    discount_amount numeric(12,2) not null default 0,
    vat_percentage numeric(5,2) not null default 0,
    vat_amount numeric(12,2) not null default 0,
    grand_total numeric(12,2) not null default 0,
    paid_amount numeric(12,2) not null default 0,
    due_amount numeric(12,2) not null default 0,
    write_off_amount numeric(12,2) not null default 0,
    notes text,
    terms_and_conditions text,
    created_by_name text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_invoices_company_number unique (company_id, invoice_number)
);

create index if not exists idx_invoices_company on public.invoices(company_id);
create index if not exists idx_invoices_customer on public.invoices(company_id, customer_id);
create index if not exists idx_invoices_status on public.invoices(company_id, status);
create index if not exists idx_invoices_due on public.invoices(company_id, due_date);
alter table public.invoices enable row level security;

-- 2. INVOICE ITEMS TABLE
create table if not exists public.invoice_items (
    id uuid primary key default gen_random_uuid(),
    invoice_id uuid not null references public.invoices(id) on delete cascade,
    item_description text not null,
    dimensions_spec text,
    quantity numeric(10,2) not null,
    unit text not null,
    unit_price numeric(12,2) not null,
    vat_percentage numeric(5,2) not null default 0,
    total_price numeric(12,2) not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_invoice_items_invoice on public.invoice_items(invoice_id);
alter table public.invoice_items enable row level security;

-- 3. PAYMENTS TABLE (Customer collections & Money Receipts)
create table if not exists public.payments (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    receipt_number text not null,
    customer_id uuid references public.customers(id) on delete restrict,
    customer_name text not null,
    payment_date date not null default current_date,
    payment_type text not null check (
        payment_type in ('full_payment', 'partial_payment', 'advance_payment', 'due_payment')
    ),
    payment_method text not null check (
        payment_method in ('cash', 'bank', 'cheque', 'bkash', 'nagad', 'other_mfs')
    ),
    amount numeric(12,2) not null,
    bank_name text,
    cheque_number text,
    cheque_date date,
    mfs_transaction_id text,
    notes text,
    received_by_name text not null,
    created_at timestamptz not null default now(),
    constraint uk_payments_company_receipt unique (company_id, receipt_number)
);

create index if not exists idx_payments_company on public.payments(company_id);
create index if not exists idx_payments_customer on public.payments(company_id, customer_id);
alter table public.payments enable row level security;

-- 4. PAYMENT ALLOCATIONS TABLE (A single payment allocated across multiple invoices)
create table if not exists public.payment_allocations (
    id uuid primary key default gen_random_uuid(),
    payment_id uuid not null references public.payments(id) on delete cascade,
    invoice_id uuid not null references public.invoices(id) on delete cascade,
    allocated_amount numeric(12,2) not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_payment_alloc_payment on public.payment_allocations(payment_id);
create index if not exists idx_payment_alloc_invoice on public.payment_allocations(invoice_id);
alter table public.payment_allocations enable row level security;

-- 5. FINANCIAL WRITE-OFFS & ADJUSTMENTS AUDIT TABLE
create table if not exists public.financial_write_offs (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    invoice_id uuid not null references public.invoices(id) on delete cascade,
    amount numeric(12,2) not null,
    reason text not null,
    authorized_by_name text not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_financial_write_offs_company on public.financial_write_offs(company_id);
create index if not exists idx_financial_write_offs_invoice on public.financial_write_offs(invoice_id);
alter table public.financial_write_offs enable row level security;

-- 6. RLS POLICIES
create policy "Active company users can view invoices"
    on public.invoices for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can manage invoices"
    on public.invoices for all
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'billing.view')
            or public.auth_user_has_permission(company_id, 'billing.create')
            or public.auth_user_has_permission(company_id, 'billing.edit')
        )
    );

create policy "Active company users can view invoice items"
    on public.invoice_items for select
    using (
        exists (
            select 1 from public.invoices inv
            where inv.id = invoice_items.invoice_id
            and public.auth_is_active_company_user(inv.company_id)
        )
    );

create policy "Authorized company users can manage invoice items"
    on public.invoice_items for all
    using (
        exists (
            select 1 from public.invoices inv
            where inv.id = invoice_items.invoice_id
            and public.auth_is_active_company_user(inv.company_id)
        )
    );

create policy "Active company users can view payments"
    on public.payments for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can manage payments"
    on public.payments for all
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'billing.view')
            or public.auth_user_has_permission(company_id, 'billing.create')
        )
    );

create policy "Active company users can view allocations"
    on public.payment_allocations for select
    using (
        exists (
            select 1 from public.payments p
            where p.id = payment_allocations.payment_id
            and public.auth_is_active_company_user(p.company_id)
        )
    );

create policy "Authorized company users can manage allocations"
    on public.payment_allocations for all
    using (
        exists (
            select 1 from public.payments p
            where p.id = payment_allocations.payment_id
            and public.auth_is_active_company_user(p.company_id)
        )
    );

create policy "Active company users can view write offs"
    on public.financial_write_offs for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can insert write offs"
    on public.financial_write_offs for insert
    with check (
        public.auth_is_active_company_user(company_id)
        and public.auth_user_has_permission(company_id, 'billing.edit')
    );
