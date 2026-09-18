-- ==============================================================================
-- InkFlow ERP SaaS - Migration 091: Workforce, Attendance, Overtime & Payroll Hardening
-- Authoritative schema for:
--   1. Fix Supabase advisor findings (salary_advances RLS, duplicate indexes, search_path)
--   2. Extended Employee Master with Bangladesh specifics & Salary Structure
--   3. Authoritative Daily Attendance Summaries & Punches
--   4. Overtime Requests & Approval Ledger (Draft -> Pending -> Approved -> Paid)
--   5. Salary Advances Ledger & Month-End Deduction Offsets
--   6. Immutable Monthly Payroll Runs, Item Snapshots & Salary Payments
--   7. Workforce Audit Logs & Financial Double-Entry Journal Integration
--   8. Strict Multi-Tenant Row Level Security & Realtime Publication
-- ==============================================================================

-- 1. FIX SUPABASE ADVISOR FINDINGS ON EXISTING TABLES

-- A. Fix missing RLS policy on salary_advances from migration 020
alter table if exists public.salary_advances enable row level security;

drop policy if exists "tenant_isolation_salary_advances" on public.salary_advances;
create policy "tenant_isolation_salary_advances" on public.salary_advances for all
    using (public.auth_is_active_company_user(company_id))
    with check (public.auth_is_active_company_user(company_id));

-- B. Clean up duplicate or redundant indexes on attendance_locations
drop index if exists public.idx_att_locations_comp_active;
drop index if exists public.idx_attendance_locations_company_id;

-- 2. EXTEND & HARDEN EMPLOYEES TABLE
alter table if exists public.employees
    add column if not exists name_bn text,
    add column if not exists email text,
    add column if not exists address text,
    add column if not exists emergency_contact_name text,
    add column if not exists emergency_contact_phone text,
    add column if not exists emergency_contact_relation text,
    add column if not exists branch_id uuid references public.branches(id) on delete set null,
    add column if not exists user_id uuid references auth.users(id) on delete set null,
    add column if not exists responsibilities text[] default '{}',
    add column if not exists salary_basis text not null default 'monthly' check (
        salary_basis in ('monthly', 'daily_rate', 'hourly_rate', 'contract')
    ),
    add column if not exists hourly_rate numeric(10,2) default 0 check (hourly_rate >= 0),
    add column if not exists daily_rate numeric(10,2) default 0 check (daily_rate >= 0),
    add column if not exists base_salary numeric(12,2) default 0 check (base_salary >= 0),
    add column if not exists overtime_hourly_rate numeric(10,2) default 0 check (overtime_hourly_rate >= 0),
    add column if not exists current_advance_balance numeric(12,2) default 0 check (current_advance_balance >= 0),
    add column if not exists is_daily_worker boolean default false,
    add column if not exists salary_structure jsonb default '{
        "basic": 0,
        "house_allowance": 0,
        "transport_allowance": 0,
        "food_allowance": 0,
        "medical_allowance": 0,
        "other_allowances": 0
    }'::jsonb,
    add column if not exists bank_payment_info jsonb default '{}'::jsonb,
    add column if not exists mfs_payment_info jsonb default '{}'::jsonb,
    add column if not exists notes text;

create index if not exists idx_employees_comp_branch on public.employees(company_id, branch_id);
create index if not exists idx_employees_comp_status on public.employees(company_id, status);
create index if not exists idx_employees_comp_dept on public.employees(company_id, department);

-- 3. SHIFTS TABLE EXTENSIONS
alter table if exists public.shifts
    add column if not exists grace_period_minutes integer not null default 15 check (grace_period_minutes >= 0),
    add column if not exists break_duration_minutes integer not null default 60 check (break_duration_minutes >= 0),
    add column if not exists is_overnight boolean not null default false,
    add column if not exists working_days text[] not null default '{"Sunday","Monday","Tuesday","Wednesday","Thursday","Saturday"}',
    add column if not exists overtime_rules jsonb not null default '{"enabled": true, "multiplier": 1.5, "min_minutes": 30}'::jsonb;

-- 4. DAILY ATTENDANCE SUMMARIES TABLE
-- Authoritative single record per employee per attendance date
create table if not exists public.attendance_daily_summaries (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    branch_id uuid references public.branches(id) on delete set null,
    employee_id uuid not null references public.employees(id) on delete cascade,
    shift_id uuid references public.shifts(id) on delete set null,
    attendance_date date not null default current_date,
    status text not null default 'present' check (
        status in ('present', 'late', 'absent', 'half_day', 'leave', 'holiday', 'off_day', 'field_work')
    ),
    leave_type text check (
        leave_type in ('paid_leave', 'unpaid_leave', 'sick_leave', 'casual_leave', 'other')
    ),
    check_in_time time,
    check_out_time time,
    check_in_at timestamptz,
    check_out_at timestamptz,
    late_minutes integer not null default 0 check (late_minutes >= 0),
    early_leave_minutes integer not null default 0 check (early_leave_minutes >= 0),
    worked_minutes integer not null default 0 check (worked_minutes >= 0),
    potential_ot_minutes integer not null default 0 check (potential_ot_minutes >= 0),
    approved_ot_minutes integer not null default 0 check (approved_ot_minutes >= 0),
    attendance_source text not null default 'qr_geo' check (
        attendance_source in ('qr_geo', 'manual', 'field_job', 'biometric', 'system')
    ),
    location_id uuid references public.attendance_locations(id) on delete set null,
    job_order_id uuid references public.job_orders(id) on delete set null,
    notes text,
    correction_status text default null check (
        correction_status in ('pending', 'approved', 'rejected')
    ),
    approved_by_id uuid references auth.users(id) on delete set null,
    approved_by_name text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_att_daily_comp_emp_date unique (company_id, employee_id, attendance_date)
);

create index if not exists idx_att_daily_comp_date on public.attendance_daily_summaries(company_id, attendance_date);
create index if not exists idx_att_daily_emp_date on public.attendance_daily_summaries(employee_id, attendance_date);
create index if not exists idx_att_daily_comp_status on public.attendance_daily_summaries(company_id, status);
create index if not exists idx_att_daily_comp_job on public.attendance_daily_summaries(company_id, job_order_id);
alter table public.attendance_daily_summaries enable row level security;

-- 5. OVERTIME RECORDS TABLE
-- Explicit request & approval ledger for overtime compensation
create table if not exists public.overtime_records (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    branch_id uuid references public.branches(id) on delete set null,
    employee_id uuid not null references public.employees(id) on delete cascade,
    attendance_id uuid references public.attendance_daily_summaries(id) on delete set null,
    ot_date date not null default current_date,
    start_time time,
    end_time time,
    duration_minutes integer not null check (duration_minutes > 0),
    duration_hours numeric(5,2) generated always as (round((duration_minutes::numeric / 60.0), 2)) stored,
    ot_type text not null default 'regular_day' check (
        ot_type in ('regular_day', 'weekly_off', 'holiday', 'night_shift')
    ),
    base_hourly_rate numeric(10,2) not null check (base_hourly_rate >= 0),
    multiplier numeric(4,2) not null default 1.50 check (multiplier >= 1.0),
    effective_ot_rate numeric(10,2) generated always as (round(base_hourly_rate * multiplier, 2)) stored,
    calculated_amount numeric(12,2) not null check (calculated_amount >= 0),
    status text not null default 'pending_approval' check (
        status in ('draft', 'pending_approval', 'approved', 'rejected', 'paid', 'cancelled')
    ),
    reason text not null,
    requested_by_id uuid references auth.users(id) on delete set null,
    requested_by_name text not null default 'Staff',
    approved_by_id uuid references auth.users(id) on delete set null,
    approved_by_name text,
    approved_at timestamptz,
    rejection_reason text,
    payroll_period_id uuid references public.payroll_periods(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_ot_comp_emp on public.overtime_records(company_id, employee_id);
create index if not exists idx_ot_comp_date on public.overtime_records(company_id, ot_date);
create index if not exists idx_ot_comp_status on public.overtime_records(company_id, status);
create index if not exists idx_ot_payroll_period on public.overtime_records(company_id, payroll_period_id);
alter table public.overtime_records enable row level security;

-- 6. EXTENDED SALARY ADVANCES TABLE
alter table if exists public.salary_advances
    add column if not exists branch_id uuid references public.branches(id) on delete set null,
    add column if not exists status text not null default 'disbursed' check (
        status in ('draft', 'pending', 'approved', 'disbursed', 'rejected')
    ),
    add column if not exists deducted_amount numeric(12,2) not null default 0 check (deducted_amount >= 0),
    add column if not exists remaining_amount numeric(12,2) not null default 0 check (remaining_amount >= 0),
    add column if not exists approved_by_id uuid references auth.users(id) on delete set null,
    add column if not exists approved_by_name text,
    add column if not exists approved_at timestamptz,
    add column if not exists transaction_id uuid references public.financial_transactions(id) on delete set null,
    add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_salary_advances_status on public.salary_advances(company_id, status);
create index if not exists idx_salary_advances_settled on public.salary_advances(company_id, is_settled);

-- 7. EXTENDED PAYROLL PERIODS & ITEMS
alter table if exists public.payroll_periods
    add column if not exists branch_id uuid references public.branches(id) on delete set null,
    add column if not exists working_days_count integer not null default 26,
    add column if not exists total_ot_amount numeric(12,2) not null default 0,
    add column if not exists total_other_deductions numeric(12,2) not null default 0,
    add column if not exists total_paid_amount numeric(12,2) not null default 0,
    add column if not exists total_due_amount numeric(12,2) not null default 0,
    add column if not exists approved_by_id uuid references auth.users(id) on delete set null,
    add column if not exists locked_at timestamptz,
    add column if not exists notes text,
    add column if not exists updated_at timestamptz not null default now();

-- Unique period name per company (e.g., "September 2026")
alter table if exists public.payroll_periods
    drop constraint if exists uk_payroll_periods_comp_name,
    add constraint uk_payroll_periods_comp_name unique (company_id, period_name);

alter table if exists public.payroll_items
    add column if not exists company_id uuid references public.companies(id) on delete cascade,
    add column if not exists employee_type text not null default 'permanent',
    add column if not exists salary_basis text not null default 'monthly',
    add column if not exists daily_rate numeric(10,2) not null default 0,
    add column if not exists hourly_rate numeric(10,2) not null default 0,
    add column if not exists days_present integer not null default 0,
    add column if not exists hours_worked numeric(6,2) not null default 0,
    add column if not exists allowances_breakdown jsonb default '{}'::jsonb,
    add column if not exists advance_remaining_balance numeric(12,2) not null default 0,
    add column if not exists paid_amount numeric(12,2) not null default 0,
    add column if not exists due_amount numeric(12,2) not null default 0,
    add column if not exists snapshot_data jsonb default '{}'::jsonb,
    add column if not exists updated_at timestamptz not null default now();

-- Ensure unique item per period per employee
alter table if exists public.payroll_items
    drop constraint if exists uk_payroll_items_period_emp,
    add constraint uk_payroll_items_period_emp unique (payroll_period_id, employee_id);

-- 8. SALARY PAYMENTS TABLE
-- Explicit payment vouchers recorded against payroll items
create table if not exists public.salary_payments (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    branch_id uuid references public.branches(id) on delete set null,
    payment_voucher_number text not null,
    payroll_period_id uuid not null references public.payroll_periods(id) on delete cascade,
    payroll_item_id uuid not null references public.payroll_items(id) on delete cascade,
    employee_id uuid not null references public.employees(id) on delete cascade,
    payment_date date not null default current_date,
    amount numeric(12,2) not null check (amount > 0),
    payment_method text not null default 'cash' check (
        payment_method in ('cash', 'bank', 'bkash', 'nagad', 'rocket', 'other')
    ),
    reference_number text,
    notes text,
    paid_by_id uuid references auth.users(id) on delete set null,
    paid_by_name text not null default 'Accounts Manager',
    transaction_id uuid references public.financial_transactions(id) on delete set null,
    created_at timestamptz not null default now(),
    constraint uk_salary_payments_voucher unique (company_id, payment_voucher_number)
);

create index if not exists idx_salary_payments_comp on public.salary_payments(company_id);
create index if not exists idx_salary_payments_period on public.salary_payments(company_id, payroll_period_id);
create index if not exists idx_salary_payments_emp on public.salary_payments(company_id, employee_id);
create index if not exists idx_salary_payments_date on public.salary_payments(company_id, payment_date);
alter table public.salary_payments enable row level security;

-- 9. WORKFORCE AUDIT LOGS TABLE
create table if not exists public.workforce_audit_logs (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    actor_id uuid references auth.users(id) on delete set null,
    actor_name text not null default 'System',
    action_type text not null check (
        action_type in (
            'employee_created', 'employee_updated', 'employee_status_changed',
            'attendance_created', 'attendance_corrected', 'attendance_approved',
            'overtime_requested', 'overtime_approved', 'overtime_rejected',
            'salary_advance_requested', 'salary_advance_disbursed', 'salary_advance_settled',
            'payroll_generated', 'payroll_reviewed', 'payroll_approved', 'payroll_locked',
            'salary_payment_recorded', 'salary_adjusted'
        )
    ),
    entity_type text not null, -- 'employee', 'attendance', 'overtime', 'advance', 'payroll', 'payment'
    entity_id uuid,
    before_state jsonb default null,
    after_state jsonb default null,
    reason text,
    ip_address text,
    user_agent text,
    created_at timestamptz not null default now()
);

create index if not exists idx_wf_audit_comp on public.workforce_audit_logs(company_id);
create index if not exists idx_wf_audit_action on public.workforce_audit_logs(company_id, action_type);
create index if not exists idx_wf_audit_entity on public.workforce_audit_logs(company_id, entity_type, entity_id);
create index if not exists idx_wf_audit_created on public.workforce_audit_logs(company_id, created_at);
alter table public.workforce_audit_logs enable row level security;

-- 10. ROW LEVEL SECURITY (RLS) POLICIES

-- attendance_daily_summaries RLS
drop policy if exists "tenant_isolation_att_daily" on public.attendance_daily_summaries;
create policy "tenant_isolation_att_daily" on public.attendance_daily_summaries for all
    using (public.auth_is_active_company_user(company_id))
    with check (public.auth_is_active_company_user(company_id));

-- overtime_records RLS
drop policy if exists "tenant_isolation_overtime_records" on public.overtime_records;
create policy "tenant_isolation_overtime_records" on public.overtime_records for all
    using (public.auth_is_active_company_user(company_id))
    with check (public.auth_is_active_company_user(company_id));

-- salary_payments RLS
drop policy if exists "tenant_isolation_salary_payments" on public.salary_payments;
create policy "tenant_isolation_salary_payments" on public.salary_payments for all
    using (public.auth_is_active_company_user(company_id))
    with check (public.auth_is_active_company_user(company_id));

-- workforce_audit_logs RLS
drop policy if exists "tenant_isolation_wf_audit_logs" on public.workforce_audit_logs;
create policy "tenant_isolation_wf_audit_logs" on public.workforce_audit_logs for all
    using (public.auth_is_active_company_user(company_id))
    with check (public.auth_is_active_company_user(company_id));

-- 11. REALTIME SYNCHRONIZATION PUBLICATION
DO $$
DECLARE
  tbl_name text;
  new_tables text[] := ARRAY[
    'attendance_daily_summaries',
    'overtime_records',
    'salary_advances',
    'payroll_periods',
    'payroll_items',
    'salary_payments',
    'workforce_audit_logs'
  ];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  FOREACH tbl_name IN ARRAY new_tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = tbl_name
    ) THEN
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL;', tbl_name);

      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = tbl_name
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl_name);
      END IF;
    END IF;
  END LOOP;
END $$;
