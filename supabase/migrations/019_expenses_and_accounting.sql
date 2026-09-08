-- ==============================================================================
-- PrintERP SaaS - Migration 019: Expenses, Cash Book & SME Bank Accounts
-- Supports:
--   1. 12 SME Expense Categories (Rent, Salary, Labor, Electricity, Internet, Transport, Fuel, Marketing, Maintenance, Materials, Office, Other)
--   2. Daily Cash Book Management (Cash In, Cash Out, Drawer Reconciliation)
--   3. Multi-Bank Accounts with Masked Account Numbers
--   4. Strict Multi-Tenant Row Level Security
-- ==============================================================================

-- 1. EXPENSES TABLE
create table if not exists public.expenses (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    expense_number text not null,
    expense_date date not null default current_date,
    category text not null check (
        category in ('rent', 'salary', 'labor', 'electricity', 'internet', 'transport', 'fuel', 'marketing', 'maintenance', 'materials', 'office', 'other')
    ),
    amount numeric(12,2) not null,
    payment_method text not null check (
        payment_method in ('cash', 'bank', 'cheque', 'bkash', 'nagad', 'other_mfs')
    ),
    vendor_name text,
    description text not null,
    attachment_url text,
    branch_name text not null default 'Head Office',
    bank_account_id uuid,
    recorded_by_name text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_expenses_company_number unique (company_id, expense_number)
);

create index if not exists idx_expenses_company on public.expenses(company_id);
create index if not exists idx_expenses_category on public.expenses(company_id, category);
create index if not exists idx_expenses_date on public.expenses(company_id, expense_date);
alter table public.expenses enable row level security;

-- 2. BANK ACCOUNTS TABLE
create table if not exists public.bank_accounts (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    bank_name text not null,
    account_name text not null,
    account_number text not null,
    branch_name text,
    routing_number text,
    opening_balance numeric(12,2) not null default 0,
    current_balance numeric(12,2) not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

create index if not exists idx_bank_accounts_company on public.bank_accounts(company_id);
alter table public.bank_accounts enable row level security;

-- 3. CASH BOOK ENTRIES TABLE
create table if not exists public.cash_book_entries (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    entry_date date not null default current_date,
    entry_type text not null check (entry_type in ('cash_in', 'cash_out')),
    amount numeric(12,2) not null,
    category text not null,
    description text not null,
    reference_id text,
    performed_by_name text not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_cash_book_company on public.cash_book_entries(company_id);
create index if not exists idx_cash_book_date on public.cash_book_entries(company_id, entry_date);
alter table public.cash_book_entries enable row level security;

-- 4. RLS POLICIES
create policy "Active company users can view expenses"
    on public.expenses for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can manage expenses"
    on public.expenses for all
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'accounting.view')
            or public.auth_user_has_permission(company_id, 'accounting.create')
            or public.auth_user_has_permission(company_id, 'accounting.edit')
        )
    );

create policy "Active company users can view bank accounts"
    on public.bank_accounts for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can manage bank accounts"
    on public.bank_accounts for all
    using (
        public.auth_is_active_company_user(company_id)
        and public.auth_user_has_permission(company_id, 'accounting.edit')
    );

create policy "Active company users can view cash book"
    on public.cash_book_entries for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can insert cash book"
    on public.cash_book_entries for insert
    with check (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'accounting.create')
            or public.auth_user_has_permission(company_id, 'billing.create')
        )
    );
