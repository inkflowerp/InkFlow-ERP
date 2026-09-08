-- ==============================================================================
-- PrintERP SaaS - Migration 020: Employee, Attendance, Salary Advances & Payroll
-- Supports:
--   1. 3 Employee Types (Permanent, Contract, Daily Labor)
--   2. Attendance Tracking (Late minutes, Overtime hours, Leaves)
--   3. Partial Salary Advances with Month-End Offset
--   4. Immutable Locked Monthly Payroll Runs
--   5. Daily Worker Shift Logs with Job Attribution
--   6. Strict Multi-Tenant Row Level Security
-- ==============================================================================

-- 1. EMPLOYEES TABLE
create table if not exists public.employees (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    employee_id_number text not null,
    name text not null,
    name_bn text,
    mobile text not null,
    address text,
    role text not null,
    department text not null check (
        department in ('printing', 'finishing', 'fabrication', 'design', 'installation', 'accounts', 'sales', 'management')
    ),
    employee_type text not null check (
        employee_type in ('permanent', 'contract', 'daily_labor')
    ),
    joining_date date not null default current_date,
    salary_type text not null check (
        salary_type in ('monthly', 'daily_rate', 'contract')
    ),
    base_salary numeric(12,2) not null default 0,
    daily_rate numeric(12,2) not null default 0,
    overtime_hourly_rate numeric(10,2) not null default 0,
    current_advance_balance numeric(12,2) not null default 0,
    status text not null default 'active' check (
        status in ('active', 'on_leave', 'terminated')
    ),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_employees_company_number unique (company_id, employee_id_number)
);

create index if not exists idx_employees_company on public.employees(company_id);
create index if not exists idx_employees_dept on public.employees(company_id, department);
create index if not exists idx_employees_status on public.employees(company_id, status);
alter table public.employees enable row level security;

-- 2. ATTENDANCES TABLE
create table if not exists public.attendances (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    employee_id uuid not null references public.employees(id) on delete cascade,
    attendance_date date not null default current_date,
    status text not null check (
        status in ('present', 'absent', 'late', 'leave', 'half_day', 'holiday')
    ),
    leave_type text check (
        leave_type in ('paid_leave', 'unpaid_leave', 'sick_leave', 'casual_leave', 'other')
    ),
    check_in_time time,
    check_out_time time,
    late_minutes integer not null default 0,
    overtime_hours numeric(4,1) not null default 0,
    notes text,
    created_at timestamptz not null default now(),
    constraint uk_attendances_emp_date unique (employee_id, attendance_date)
);

create index if not exists idx_attendances_company on public.attendances(company_id);
create index if not exists idx_attendances_date on public.attendances(company_id, attendance_date);
alter table public.attendances enable row level security;

-- 3. SALARY ADVANCES TABLE (Early Partial Salary Payments)
create table if not exists public.salary_advances (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    advance_voucher_number text not null,
    employee_id uuid not null references public.employees(id) on delete cascade,
    amount numeric(12,2) not null,
    disbursed_date date not null default current_date,
    payment_method text not null default 'cash',
    reason text,
    is_settled boolean not null default false,
    settled_in_payroll_period text,
    created_at timestamptz not null default now()
);

create index if not exists idx_salary_advances_company on public.salary_advances(company_id);
create index if not exists idx_salary_advances_emp on public.salary_advances(employee_id);
alter table public.salary_advances enable row level security;

-- 4. PAYROLL PERIODS TABLE (Locked after approval)
create table if not exists public.payroll_periods (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    period_name text not null,
    start_date date not null,
    end_date date not null,
    status text not null default 'draft' check (
        status in ('draft', 'processed', 'locked', 'disbursed')
    ),
    total_gross_salary numeric(12,2) not null default 0,
    total_advances_deducted numeric(12,2) not null default 0,
    total_net_salary numeric(12,2) not null default 0,
    approved_by_name text,
    approved_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists idx_payroll_periods_company on public.payroll_periods(company_id);
alter table public.payroll_periods enable row level security;

-- 5. PAYROLL ITEMS TABLE
create table if not exists public.payroll_items (
    id uuid primary key default gen_random_uuid(),
    payroll_period_id uuid not null references public.payroll_periods(id) on delete cascade,
    employee_id uuid not null references public.employees(id) on delete cascade,
    base_salary numeric(12,2) not null default 0,
    overtime_hours numeric(5,1) not null default 0,
    overtime_amount numeric(12,2) not null default 0,
    allowances numeric(12,2) not null default 0,
    bonuses numeric(12,2) not null default 0,
    gross_salary numeric(12,2) not null default 0,
    advance_salary_deducted numeric(12,2) not null default 0,
    absence_deduction numeric(12,2) not null default 0,
    late_fine numeric(12,2) not null default 0,
    loan_deduction numeric(12,2) not null default 0,
    other_deductions numeric(12,2) not null default 0,
    net_salary numeric(12,2) not null default 0,
    payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid')),
    created_at timestamptz not null default now()
);

create index if not exists idx_payroll_items_period on public.payroll_items(payroll_period_id);
create index if not exists idx_payroll_items_emp on public.payroll_items(employee_id);
alter table public.payroll_items enable row level security;

-- 6. DAILY LABOR LOGS TABLE
create table if not exists public.daily_labor_logs (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    employee_id uuid not null references public.employees(id) on delete cascade,
    work_date date not null default current_date,
    assigned_job_number text,
    daily_rate numeric(10,2) not null,
    overtime_hours numeric(4,1) not null default 0,
    total_payout numeric(10,2) not null,
    production_contribution text not null,
    payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid')),
    created_at timestamptz not null default now()
);

create index if not exists idx_daily_labor_company on public.daily_labor_logs(company_id);
create index if not exists idx_daily_labor_date on public.daily_labor_logs(company_id, work_date);
alter table public.daily_labor_logs enable row level security;

-- 7. RLS POLICIES
create policy "Active company users can view employees"
    on public.employees for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can manage employees"
    on public.employees for all
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'hr.view')
            or public.auth_user_has_permission(company_id, 'hr.create')
            or public.auth_user_has_permission(company_id, 'hr.edit')
        )
    );

create policy "Active company users can view attendances"
    on public.attendances for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can manage attendances"
    on public.attendances for all
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'hr.view')
            or public.auth_user_has_permission(company_id, 'hr.edit')
        )
    );

create policy "Active company users can view payroll periods"
    on public.payroll_periods for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can manage payroll periods"
    on public.payroll_periods for all
    using (
        public.auth_is_active_company_user(company_id)
        and public.auth_user_has_permission(company_id, 'payroll.edit')
    );

create policy "Active company users can view payroll items"
    on public.payroll_items for select
    using (
        exists (
            select 1 from public.payroll_periods pp
            where pp.id = payroll_items.payroll_period_id
            and public.auth_is_active_company_user(pp.company_id)
        )
    );

create policy "Authorized company users can manage payroll items"
    on public.payroll_items for all
    using (
        exists (
            select 1 from public.payroll_periods pp
            where pp.id = payroll_items.payroll_period_id
            and public.auth_is_active_company_user(pp.company_id)
        )
    );

create policy "Active company users can view daily labor logs"
    on public.daily_labor_logs for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can manage daily labor logs"
    on public.daily_labor_logs for all
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'production.edit')
            or public.auth_user_has_permission(company_id, 'hr.edit')
        )
    );
