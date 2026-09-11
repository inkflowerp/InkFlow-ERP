-- ==============================================================================
-- InkFlow ERP SaaS - Migration 047: QR Code & Geolocation Attendance Engine
-- Authoritative schema for:
--   1. attendance_locations (Workplace geofences, branch scoping, coordinates)
--   2. attendance_qr_tokens (Cryptographic SHA-256 hashed rotation tokens)
--   3. attendance_records (Immutable GPS & QR verified attendance punch ledger)
--   4. attendance_corrections (Employee request & manager approval workflow)
--   5. attendance_audit_logs (Immutable audit trail for all QR/punch events)
--   6. Strict Multi-Tenant Row Level Security & Realtime Publication
-- ==============================================================================

-- 1. ATTENDANCE LOCATIONS TABLE
create table if not exists public.attendance_locations (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    branch_id uuid references public.branches(id) on delete set null,
    name text not null,
    address text,
    latitude double precision not null,
    longitude double precision not null,
    radius_meters integer not null default 100 check (radius_meters > 0),
    max_accuracy_meters integer not null default 100 check (max_accuracy_meters > 0),
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_att_locations_company on public.attendance_locations(company_id);
create index if not exists idx_att_locations_branch on public.attendance_locations(branch_id);
create index if not exists idx_att_locations_active on public.attendance_locations(company_id, is_active);
alter table public.attendance_locations enable row level security;

-- 2. ATTENDANCE QR TOKENS TABLE (Cryptographically Hashed)
create table if not exists public.attendance_qr_tokens (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    location_id uuid not null references public.attendance_locations(id) on delete cascade,
    token_hash text not null unique,
    token_prefix text not null,
    generated_by uuid references auth.users(id) on delete set null,
    expires_at timestamptz,
    revoked_at timestamptz,
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

create index if not exists idx_att_qr_tokens_hash on public.attendance_qr_tokens(token_hash);
create index if not exists idx_att_qr_tokens_location on public.attendance_qr_tokens(location_id);
create index if not exists idx_att_qr_tokens_company on public.attendance_qr_tokens(company_id);
create index if not exists idx_att_qr_tokens_active on public.attendance_qr_tokens(location_id, is_active);
alter table public.attendance_qr_tokens enable row level security;

-- 3. ATTENDANCE RECORDS TABLE (Verified Punch Ledger)
create table if not exists public.attendance_records (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    employee_id uuid not null references public.employees(id) on delete cascade,
    user_id uuid references auth.users(id) on delete set null,
    branch_id uuid references public.branches(id) on delete set null,
    location_id uuid references public.attendance_locations(id) on delete set null,
    attendance_date date not null default current_date,
    attendance_type text not null check (
        attendance_type in ('CHECK_IN', 'CHECK_OUT', 'BREAK_START', 'BREAK_END', 'FIELD_CHECK_IN', 'FIELD_CHECK_OUT')
    ),
    checked_at timestamptz not null default now(),
    latitude double precision not null,
    longitude double precision not null,
    gps_accuracy_meters double precision not null,
    distance_from_location_meters double precision not null,
    qr_token_id uuid references public.attendance_qr_tokens(id) on delete set null,
    verification_status text not null default 'verified' check (
        verification_status in ('verified', 'rejected', 'flagged', 'manual_override')
    ),
    verification_reason text,
    device_info jsonb default '{}'::jsonb,
    notes text,
    created_at timestamptz not null default now()
);

create index if not exists idx_att_records_company on public.attendance_records(company_id);
create index if not exists idx_att_records_employee on public.attendance_records(employee_id);
create index if not exists idx_att_records_user on public.attendance_records(user_id);
create index if not exists idx_att_records_date on public.attendance_records(company_id, attendance_date);
create index if not exists idx_att_records_emp_date on public.attendance_records(employee_id, attendance_date);
alter table public.attendance_records enable row level security;

-- 4. ATTENDANCE CORRECTIONS TABLE
create table if not exists public.attendance_corrections (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    employee_id uuid not null references public.employees(id) on delete cascade,
    requested_by uuid references auth.users(id) on delete set null,
    attendance_record_id uuid references public.attendance_records(id) on delete set null,
    attendance_date date not null,
    requested_type text not null check (requested_type in ('CHECK_IN', 'CHECK_OUT')),
    requested_time time not null,
    reason text not null,
    status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
    reviewed_by uuid references auth.users(id) on delete set null,
    reviewed_at timestamptz,
    review_notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table if exists public.attendance_corrections
    add column if not exists requested_by uuid references auth.users(id) on delete set null;

create index if not exists idx_att_corrections_company on public.attendance_corrections(company_id);
create index if not exists idx_att_corrections_emp on public.attendance_corrections(employee_id);
create index if not exists idx_att_corrections_status on public.attendance_corrections(company_id, status);
alter table public.attendance_corrections enable row level security;

-- 5. ATTENDANCE AUDIT LOGS TABLE (Immutable)
create table if not exists public.attendance_audit_logs (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    actor_id uuid references auth.users(id) on delete set null,
    actor_name text not null,
    action_type text not null check (
        action_type in (
            'qr_generated',
            'qr_regenerated',
            'qr_revoked',
            'location_created',
            'location_updated',
            'location_deleted',
            'attendance_check_in',
            'attendance_check_out',
            'attendance_rejected',
            'attendance_correction_requested',
            'attendance_correction_reviewed'
        )
    ),
    location_id uuid references public.attendance_locations(id) on delete set null,
    employee_id uuid references public.employees(id) on delete set null,
    details jsonb not null default '{}'::jsonb,
    ip_address text,
    user_agent text,
    created_at timestamptz not null default now()
);

create index if not exists idx_att_audit_company on public.attendance_audit_logs(company_id);
create index if not exists idx_att_audit_actor on public.attendance_audit_logs(actor_id);
create index if not exists idx_att_audit_action on public.attendance_audit_logs(company_id, action_type);
create index if not exists idx_att_audit_created on public.attendance_audit_logs(company_id, created_at);
alter table public.attendance_audit_logs enable row level security;

-- 6. ROW LEVEL SECURITY POLICIES

-- attendance_locations RLS
drop policy if exists "Active company users can view attendance locations" on public.attendance_locations;
create policy "Active company users can view attendance locations"
    on public.attendance_locations for select
    using (public.auth_is_active_company_user(company_id));

drop policy if exists "Authorized company users can manage attendance locations" on public.attendance_locations;
create policy "Authorized company users can manage attendance locations"
    on public.attendance_locations for all
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'settings.manage')
            or public.auth_user_has_permission(company_id, 'hr.edit')
            or public.auth_user_has_permission(company_id, 'hr.create')
        )
    );

-- attendance_qr_tokens RLS
drop policy if exists "Active company users can view attendance qr tokens metadata" on public.attendance_qr_tokens;
create policy "Active company users can view attendance qr tokens metadata"
    on public.attendance_qr_tokens for select
    using (public.auth_is_active_company_user(company_id));

drop policy if exists "Authorized managers can manage attendance qr tokens" on public.attendance_qr_tokens;
create policy "Authorized managers can manage attendance qr tokens"
    on public.attendance_qr_tokens for all
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'settings.manage')
            or public.auth_user_has_permission(company_id, 'hr.edit')
        )
    );

-- attendance_records RLS
drop policy if exists "Company users can view attendance records" on public.attendance_records;
create policy "Company users can view attendance records"
    on public.attendance_records for select
    using (
        public.auth_is_active_company_user(company_id)
        and (
            user_id = auth.uid()
            or public.auth_user_has_permission(company_id, 'hr.view')
            or public.auth_user_has_permission(company_id, 'hr.edit')
        )
    );

drop policy if exists "Authenticated users can insert own attendance records" on public.attendance_records;
create policy "Authenticated users can insert own attendance records"
    on public.attendance_records for insert
    with check (
        public.auth_is_active_company_user(company_id)
        and (user_id = auth.uid() or user_id is null)
    );

drop policy if exists "Authorized HR users can manage attendance records" on public.attendance_records;
create policy "Authorized HR users can manage attendance records"
    on public.attendance_records for all
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'hr.edit')
            or public.auth_user_has_permission(company_id, 'hr.approve')
        )
    );

-- attendance_corrections RLS
drop policy if exists "Company users can view own or authorized attendance corrections" on public.attendance_corrections;
create policy "Company users can view own or authorized attendance corrections"
    on public.attendance_corrections for select
    using (
        public.auth_is_active_company_user(company_id)
        and (
            requested_by = auth.uid()
            or public.auth_user_has_permission(company_id, 'hr.view')
            or public.auth_user_has_permission(company_id, 'hr.edit')
            or public.auth_user_has_permission(company_id, 'hr.approve')
        )
    );

drop policy if exists "Company users can create attendance corrections" on public.attendance_corrections;
create policy "Company users can create attendance corrections"
    on public.attendance_corrections for insert
    with check (
        public.auth_is_active_company_user(company_id)
        and requested_by = auth.uid()
    );

drop policy if exists "Authorized HR users can review attendance corrections" on public.attendance_corrections;
create policy "Authorized HR users can review attendance corrections"
    on public.attendance_corrections for update
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'hr.edit')
            or public.auth_user_has_permission(company_id, 'hr.approve')
        )
    );

-- attendance_audit_logs RLS
drop policy if exists "Authorized users can view attendance audit logs" on public.attendance_audit_logs;
create policy "Authorized users can view attendance audit logs"
    on public.attendance_audit_logs for select
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'settings.view')
            or public.auth_user_has_permission(company_id, 'hr.view')
            or public.auth_user_has_permission(company_id, 'hr.edit')
        )
    );

drop policy if exists "System can insert attendance audit logs" on public.attendance_audit_logs;
create policy "System can insert attendance audit logs"
    on public.attendance_audit_logs for insert
    with check (public.auth_is_active_company_user(company_id));

-- 7. REALTIME SYNCHRONIZATION PUBLICATION
DO $$
DECLARE
  tbl_name text;
  new_tables text[] := ARRAY[
    'attendance_locations',
    'attendance_qr_tokens',
    'attendance_records',
    'attendance_corrections',
    'attendance_audit_logs'
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
