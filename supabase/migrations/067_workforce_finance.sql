-- ==============================================================================
-- InkFlow ERP SaaS - Migration 067: Workforce + Geo Attendance + Double-Entry Finance
-- Authoritative schema for:
--   1. Extended Employee Master (Branch, Responsibilities, Employment Types, Emergency Contacts, Wage Rates)
--   2. Shifts & Overnight Schedule Management (Overnight shifts, Grace periods, Break times)
--   3. Employee Shift Assignments
--   4. Extended Attendance Records (Shift linkage, Field/Job attribution, Overtime approval, Labor costing)
--   5. Chart of Accounts (Asset, Liability, Equity, Revenue, Expense)
--   6. Financial Transactions & Double-Entry Journal Entry Lines (Balanced Debit = Credit)
--   7. Account Transfers (Cash <-> Bank <-> MFS)
--   8. Daily Cash Closings & Drawer Reconciliation
--   9. Financial Periods (Open / Closed fiscal periods)
--   10. Strict Multi-Tenant Row Level Security & Performance B-Tree Indexes
-- ==============================================================================

-- 1. EXTEND EMPLOYEES TABLE
alter table if exists public.employees
    add column if not exists branch_id uuid references public.branches(id) on delete set null,
    add column if not exists user_id uuid references auth.users(id) on delete set null,
    add column if not exists responsibilities text[] default '{}',
    add column if not exists email text,
    add column if not exists emergency_contact_name text,
    add column if not exists emergency_contact_phone text,
    add column if not exists emergency_contact_relation text,
    add column if not exists hourly_rate numeric(10,2) default 0,
    add column if not exists is_daily_worker boolean default false,
    add column if not exists bank_payment_info jsonb default '{}'::jsonb,
    add column if not exists mfs_payment_info jsonb default '{}'::jsonb,
    add column if not exists notes text;

create index if not exists idx_employees_branch on public.employees(company_id, branch_id);
create index if not exists idx_employees_user on public.employees(user_id);

-- 2. SHIFTS TABLE
create table if not exists public.shifts (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    branch_id uuid references public.branches(id) on delete set null,
    shift_code text not null,
    shift_name text not null,
    start_time text not null, -- 'HH:mm' e.g. '09:00' or '22:00'
    end_time text not null,   -- 'HH:mm' e.g. '18:00' or '06:00'
    is_overnight boolean not null default false,
    grace_period_minutes integer not null default 15,
    break_duration_minutes integer not null default 60,
    working_days text[] not null default '{"Sunday","Monday","Tuesday","Wednesday","Thursday","Saturday"}',
    overtime_rules jsonb not null default '{"enabled": true, "multiplier": 1.5, "min_minutes": 30}'::jsonb,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_shifts_comp_code unique (company_id, shift_code)
);

create index if not exists idx_shifts_company on public.shifts(company_id);
create index if not exists idx_shifts_branch on public.shifts(company_id, branch_id);
alter table public.shifts enable row level security;

-- 3. EMPLOYEE SHIFT ASSIGNMENTS TABLE
create table if not exists public.employee_shifts (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    employee_id uuid not null references public.employees(id) on delete cascade,
    shift_id uuid not null references public.shifts(id) on delete cascade,
    effective_from date not null default current_date,
    effective_to date,
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

create index if not exists idx_emp_shifts_emp on public.employee_shifts(company_id, employee_id);
create index if not exists idx_emp_shifts_shift on public.employee_shifts(company_id, shift_id);
alter table public.employee_shifts enable row level security;

-- 4. EXTEND ATTENDANCE RECORDS TABLE
alter table if exists public.attendance_records
    add column if not exists shift_id uuid references public.shifts(id) on delete set null,
    add column if not exists job_order_id uuid references public.job_orders(id) on delete set null,
    add column if not exists overtime_minutes integer default 0,
    add column if not exists is_overtime_approved boolean default false,
    add column if not exists approved_overtime_hours numeric(5,2) default 0,
    add column if not exists workforce_labor_cost numeric(12,2) default 0;

create index if not exists idx_att_records_shift on public.attendance_records(company_id, shift_id);
create index if not exists idx_att_records_job on public.attendance_records(company_id, job_order_id);

-- 5. CHART OF ACCOUNTS TABLE
create table if not exists public.accounts (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    branch_id uuid references public.branches(id) on delete set null,
    code text not null,
    name text not null,
    name_bn text,
    account_type text not null check (
        account_type in ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')
    ),
    account_subtype text not null check (
        account_subtype in (
            'CASH', 'BANK', 'MFS', 'RECEIVABLE', 'PAYABLE', 
            'INVENTORY', 'REVENUE', 'COGS_MATERIAL', 'COGS_LABOR', 
            'COGS_MACHINE', 'OPEX_RENT', 'OPEX_UTILITIES', 'OPEX_SALARY', 
            'OPEX_TRANSPORT', 'OPEX_MAINTENANCE', 'OPEX_MARKETING', 
            'OPEX_GENERAL', 'EQUITY', 'OTHER'
        )
    ),
    currency text not null default 'BDT',
    opening_balance numeric(14,2) not null default 0,
    current_balance numeric(14,2) not null default 0,
    is_system boolean not null default false,
    is_active boolean not null default true,
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_accounts_comp_code unique (company_id, code)
);

create index if not exists idx_accounts_company on public.accounts(company_id);
create index if not exists idx_accounts_type on public.accounts(company_id, account_type);
create index if not exists idx_accounts_subtype on public.accounts(company_id, account_subtype);
alter table public.accounts enable row level security;

-- 6. FINANCIAL TRANSACTIONS TABLE (Master Journal Header)
create table if not exists public.financial_transactions (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    branch_id uuid references public.branches(id) on delete set null,
    transaction_number text not null,
    transaction_date date not null default current_date,
    transaction_type text not null check (
        transaction_type in (
            'CUSTOMER_PAYMENT', 'SUPPLIER_PAYMENT', 'EXPENSE', 
            'ACCOUNT_TRANSFER', 'REFUND', 'JOURNAL_ADJUSTMENT', 
            'CASH_CLOSING_ADJUSTMENT', 'SALARY_PAYMENT', 'SALES_INVOICE', 'PURCHASE_GRN'
        )
    ),
    status text not null default 'POSTED' check (
        status in ('DRAFT', 'PENDING_APPROVAL', 'POSTED', 'REVERSED', 'CANCELLED')
    ),
    total_amount numeric(14,2) not null default 0 check (total_amount >= 0),
    reference_type text, -- 'INVOICE', 'PURCHASE_ORDER', 'GOODS_RECEIPT', 'EXPENSE', 'TRANSFER', 'CASH_CLOSING', 'PAYROLL'
    reference_id text,
    narration text not null,
    posted_by_id uuid references auth.users(id) on delete set null,
    posted_by_name text not null default 'System',
    posted_at timestamptz not null default now(),
    reversal_of_id uuid references public.financial_transactions(id) on delete set null,
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_fin_txn_comp_num unique (company_id, transaction_number)
);

create index if not exists idx_fin_txn_company on public.financial_transactions(company_id);
create index if not exists idx_fin_txn_date on public.financial_transactions(company_id, transaction_date);
create index if not exists idx_fin_txn_type on public.financial_transactions(company_id, transaction_type);
create index if not exists idx_fin_txn_status on public.financial_transactions(company_id, status);
create index if not exists idx_fin_txn_ref on public.financial_transactions(company_id, reference_type, reference_id);
alter table public.financial_transactions enable row level security;

-- 7. JOURNAL ENTRY LINES TABLE (Double-Entry Debit/Credit Lines)
create table if not exists public.journal_entry_lines (
    id uuid primary key default gen_random_uuid(),
    transaction_id uuid not null references public.financial_transactions(id) on delete cascade,
    company_id uuid not null references public.companies(id) on delete cascade,
    account_id uuid not null references public.accounts(id) on delete restrict,
    debit numeric(14,2) not null default 0 check (debit >= 0),
    credit numeric(14,2) not null default 0 check (credit >= 0),
    memo text,
    created_at timestamptz not null default now(),
    constraint chk_entry_not_both_zero check (debit > 0 or credit > 0)
);

create index if not exists idx_jel_txn on public.journal_entry_lines(transaction_id);
create index if not exists idx_jel_comp_acc on public.journal_entry_lines(company_id, account_id);
alter table public.journal_entry_lines enable row level security;

-- 8. ACCOUNT TRANSFERS TABLE
create table if not exists public.account_transfers (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    branch_id uuid references public.branches(id) on delete set null,
    transfer_number text not null,
    from_account_id uuid not null references public.accounts(id) on delete restrict,
    to_account_id uuid not null references public.accounts(id) on delete restrict,
    amount numeric(14,2) not null check (amount > 0),
    fee_amount numeric(10,2) not null default 0 check (fee_amount >= 0),
    transfer_date date not null default current_date,
    transaction_id uuid references public.financial_transactions(id) on delete set null,
    status text not null default 'POSTED' check (status in ('PENDING', 'POSTED', 'CANCELLED')),
    notes text,
    created_by_name text not null,
    created_at timestamptz not null default now(),
    constraint uk_acc_transfers_num unique (company_id, transfer_number),
    constraint chk_diff_accounts check (from_account_id <> to_account_id)
);

create index if not exists idx_acc_transfers_comp on public.account_transfers(company_id);
create index if not exists idx_acc_transfers_from on public.account_transfers(company_id, from_account_id);
create index if not exists idx_acc_transfers_to on public.account_transfers(company_id, to_account_id);
alter table public.account_transfers enable row level security;

-- 9. DAILY CASH CLOSINGS TABLE
create table if not exists public.cash_closings (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    branch_id uuid references public.branches(id) on delete set null,
    closing_number text not null,
    closing_date date not null default current_date,
    account_id uuid not null references public.accounts(id) on delete restrict,
    opening_cash numeric(14,2) not null default 0,
    cash_inflows numeric(14,2) not null default 0,
    cash_outflows numeric(14,2) not null default 0,
    expected_cash numeric(14,2) not null default 0,
    counted_cash numeric(14,2) not null default 0,
    variance numeric(14,2) not null default 0,
    variance_reason text,
    status text not null default 'SUBMITTED' check (status in ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED')),
    adjustment_transaction_id uuid references public.financial_transactions(id) on delete set null,
    closed_by_name text not null,
    approved_by_name text,
    approved_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_cash_closings_num unique (company_id, closing_number)
);

create index if not exists idx_cash_closings_comp on public.cash_closings(company_id);
create index if not exists idx_cash_closings_date on public.cash_closings(company_id, closing_date);
alter table public.cash_closings enable row level security;

-- 10. FINANCIAL PERIODS TABLE
create table if not exists public.financial_periods (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    period_name text not null,
    start_date date not null,
    end_date date not null,
    status text not null default 'OPEN' check (status in ('OPEN', 'CLOSED')),
    closed_at timestamptz,
    closed_by_name text,
    created_at timestamptz not null default now(),
    constraint uk_fin_periods_comp_name unique (company_id, period_name)
);

create index if not exists idx_fin_periods_comp on public.financial_periods(company_id);
alter table public.financial_periods enable row level security;

-- 11. ROW LEVEL SECURITY (RLS) POLICIES

drop policy if exists "tenant_isolation_shifts" on public.shifts;
create policy "tenant_isolation_shifts" on public.shifts for all
    using (public.auth_is_active_company_user(company_id));

drop policy if exists "tenant_isolation_employee_shifts" on public.employee_shifts;
create policy "tenant_isolation_employee_shifts" on public.employee_shifts for all
    using (public.auth_is_active_company_user(company_id));

drop policy if exists "tenant_isolation_accounts" on public.accounts;
create policy "tenant_isolation_accounts" on public.accounts for all
    using (public.auth_is_active_company_user(company_id));

drop policy if exists "tenant_isolation_financial_transactions" on public.financial_transactions;
create policy "tenant_isolation_financial_transactions" on public.financial_transactions for all
    using (public.auth_is_active_company_user(company_id));

drop policy if exists "tenant_isolation_journal_entry_lines" on public.journal_entry_lines;
create policy "tenant_isolation_journal_entry_lines" on public.journal_entry_lines for all
    using (public.auth_is_active_company_user(company_id));

drop policy if exists "tenant_isolation_account_transfers" on public.account_transfers;
create policy "tenant_isolation_account_transfers" on public.account_transfers for all
    using (public.auth_is_active_company_user(company_id));

drop policy if exists "tenant_isolation_cash_closings" on public.cash_closings;
create policy "tenant_isolation_cash_closings" on public.cash_closings for all
    using (public.auth_is_active_company_user(company_id));

drop policy if exists "tenant_isolation_financial_periods" on public.financial_periods;
create policy "tenant_isolation_financial_periods" on public.financial_periods for all
    using (public.auth_is_active_company_user(company_id));
