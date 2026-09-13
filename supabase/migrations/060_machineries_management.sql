-- ==============================================================================
-- InkFlow SaaS - Migration 060: Machineries Management & Equipment Fleet
-- Supports:
--   1. Tenant-scoped Machineries table (Digital, Offset, Large Format, UV, DTF, CNC, Laser, Fabrication, Finishing)
--   2. Machine Assignments with start/end windows and job order links
--   3. Maintenance Records (Preventive, Corrective, Calibration, Inspections)
--   4. Breakdown Logs & Resolution Tracking (Downtime calculation, Severity, Repair costs)
--   5. Granular RBAC Permissions (machineries.view, create, edit, delete, assign, status, maintenance, breakdown, resolve_breakdown, cost_view, export)
--   6. Strict Multi-Tenant Row Level Security
-- ==============================================================================

-- 1. MACHINERIES TABLE
create table if not exists public.machineries (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    branch_id uuid references public.branches(id) on delete set null,
    
    -- Basic Information
    name text not null,
    code text not null,
    machine_type text not null, -- e.g. 'digital_printing', 'large_format_printing', 'uv_flatbed', 'eco_solvent', 'sublimation', 'dtf_dtg', 'cutting_plotter', 'laser_cutting', 'cnc_router', 'engraving', 'acrylic_fabrication', 'metal_fabrication', 'welding', 'finishing', 'binding', 'laminating', 'installation', 'other'
    category text not null default 'printing', -- 'printing', 'cutting_cnc', 'fabrication', 'finishing', 'installation', 'other'
    brand text,
    model text,
    serial_number text,
    description text,
    photo_url text,
    purchase_date date,
    installation_date date,
    supplier text,
    supplier_id uuid references public.suppliers(id) on delete set null,
    warranty_expiry date,
    location text,
    department text not null default 'printing' check (
        department in ('printing', 'finishing', 'fabrication', 'design', 'installation', 'other')
    ),
    
    -- Status & Lifecycle
    status text not null default 'available' check (
        status in ('available', 'in_use', 'scheduled', 'maintenance', 'breakdown', 'offline', 'retired')
    ),
    status_notes text,
    status_updated_at timestamptz default now(),
    is_archived boolean not null default false,

    -- Production Specifications
    supported_production_types text[] default '{}',
    supported_materials text[] default '{}',
    supported_units text[] default '{}',
    max_width numeric(10,2),
    max_height numeric(10,2),
    max_length numeric(10,2),
    min_width numeric(10,2),
    min_height numeric(10,2),
    dimension_unit text default 'inch' check (dimension_unit in ('inch', 'ft', 'mm', 'cm', 'm')),
    production_capacity numeric(12,2) default 0,
    capacity_unit text default 'sft/hour',
    estimated_speed numeric(10,2) default 0,
    speed_unit text default 'sft/hour',
    setup_time_mins integer default 0,
    changeover_time_mins integer default 0,
    default_operator_requirement text,
    operators_required_count integer not null default 1,

    -- Costing Specifications (Future V4 Readiness)
    purchase_cost numeric(12,2) not null default 0,
    hourly_machine_cost numeric(12,2) not null default 0,
    per_unit_machine_cost numeric(12,2) not null default 0,
    electricity_cost_per_hour numeric(12,2) not null default 0,
    maintenance_cost_per_hour numeric(12,2) not null default 0,
    other_operating_cost_per_hour numeric(12,2) not null default 0,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint uk_machineries_company_code unique (company_id, code)
);

create index if not exists idx_machineries_company on public.machineries(company_id);
create index if not exists idx_machineries_branch on public.machineries(company_id, branch_id);
create index if not exists idx_machineries_status on public.machineries(company_id, status);
create index if not exists idx_machineries_type on public.machineries(company_id, machine_type);
create index if not exists idx_machineries_dept on public.machineries(company_id, department);
create index if not exists idx_machineries_archived on public.machineries(company_id, is_archived);

alter table public.machineries enable row level security;


-- 2. MACHINERY ASSIGNMENTS TABLE
create table if not exists public.machinery_assignments (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    machine_id uuid not null references public.machineries(id) on delete cascade,
    job_order_id uuid references public.job_orders(id) on delete set null,
    production_job_id uuid references public.production_jobs(id) on delete set null,
    operator_id uuid references auth.users(id) on delete set null,
    operator_name text,
    scheduled_start timestamptz not null,
    scheduled_end timestamptz not null,
    actual_start timestamptz,
    actual_end timestamptz,
    status text not null default 'scheduled' check (
        status in ('scheduled', 'in_progress', 'completed', 'cancelled')
    ),
    notes text,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_machinery_assignments_comp on public.machinery_assignments(company_id);
create index if not exists idx_machinery_assignments_machine on public.machinery_assignments(machine_id);
create index if not exists idx_machinery_assignments_job on public.machinery_assignments(job_order_id);
create index if not exists idx_machinery_assignments_prod on public.machinery_assignments(production_job_id);
create index if not exists idx_machinery_assignments_window on public.machinery_assignments(machine_id, scheduled_start, scheduled_end);

alter table public.machinery_assignments enable row level security;


-- 3. MACHINERY MAINTENANCES TABLE
create table if not exists public.machinery_maintenances (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    machine_id uuid not null references public.machineries(id) on delete cascade,
    maintenance_type text not null check (
        maintenance_type in ('preventive', 'corrective', 'emergency', 'inspection', 'cleaning', 'calibration', 'other')
    ),
    status text not null default 'scheduled' check (
        status in ('scheduled', 'in_progress', 'completed', 'cancelled')
    ),
    scheduled_date date not null,
    start_time timestamptz,
    end_time timestamptz,
    technician_name text,
    vendor_name text,
    problem_description text,
    work_performed text,
    parts_used text,
    cost numeric(12,2) not null default 0,
    notes text,
    attachment_url text,
    next_maintenance_date date,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_machinery_maint_comp on public.machinery_maintenances(company_id);
create index if not exists idx_machinery_maint_machine on public.machinery_maintenances(machine_id);
create index if not exists idx_machinery_maint_date on public.machinery_maintenances(company_id, scheduled_date);

alter table public.machinery_maintenances enable row level security;


-- 4. MACHINERY BREAKDOWNS TABLE
create table if not exists public.machinery_breakdowns (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    machine_id uuid not null references public.machineries(id) on delete cascade,
    reported_by_id uuid references auth.users(id) on delete set null,
    reported_by_name text not null,
    reported_at timestamptz not null default now(),
    problem_title text not null,
    problem_description text not null,
    severity text not null default 'medium' check (
        severity in ('low', 'medium', 'high', 'critical')
    ),
    production_impact text not null default 'minor_delay' check (
        production_impact in ('none', 'minor_delay', 'job_stalled', 'facility_halt')
    ),
    affected_job_order_id uuid references public.job_orders(id) on delete set null,
    affected_production_job_id uuid references public.production_jobs(id) on delete set null,
    attachment_url text,
    status text not null default 'reported' check (
        status in ('reported', 'under_repair', 'resolved', 'unrepairable')
    ),
    diagnosis text,
    repair_action text,
    technician_name text,
    parts_replaced text,
    repair_cost numeric(12,2) not null default 0,
    downtime_minutes integer not null default 0,
    resolved_at timestamptz,
    resolved_by_name text,
    resolution_notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_machinery_breakdowns_comp on public.machinery_breakdowns(company_id);
create index if not exists idx_machinery_breakdowns_machine on public.machinery_breakdowns(machine_id);
create index if not exists idx_machinery_breakdowns_status on public.machinery_breakdowns(company_id, status);

alter table public.machinery_breakdowns enable row level security;


-- 5. ROW LEVEL SECURITY POLICIES

-- Machineries RLS
create policy "Active company users can view machineries"
    on public.machineries for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can insert machineries"
    on public.machineries for insert
    with check (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'machineries.create')
            or public.auth_user_has_permission(company_id, 'production.create')
            or public.auth_get_user_company_role(company_id) in ('business_owner', 'owner', 'admin')
        )
    );

create policy "Authorized company users can update machineries"
    on public.machineries for update
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'machineries.edit')
            or public.auth_user_has_permission(company_id, 'machineries.status')
            or public.auth_user_has_permission(company_id, 'production.edit')
            or public.auth_get_user_company_role(company_id) in ('business_owner', 'owner', 'admin')
        )
    );

create policy "Authorized company users can delete machineries"
    on public.machineries for delete
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'machineries.delete')
            or public.auth_get_user_company_role(company_id) in ('business_owner', 'owner', 'admin')
        )
    );

-- Machinery Assignments RLS
create policy "Active company users can view machinery assignments"
    on public.machinery_assignments for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can manage machinery assignments"
    on public.machinery_assignments for all
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'machineries.assign')
            or public.auth_user_has_permission(company_id, 'production.assign')
            or public.auth_user_has_permission(company_id, 'production.edit')
            or public.auth_get_user_company_role(company_id) in ('business_owner', 'owner', 'admin', 'production_manager')
        )
    );

-- Machinery Maintenances RLS
create policy "Active company users can view machinery maintenances"
    on public.machinery_maintenances for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can manage machinery maintenances"
    on public.machinery_maintenances for all
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'machineries.maintenance')
            or public.auth_user_has_permission(company_id, 'production.edit')
            or public.auth_get_user_company_role(company_id) in ('business_owner', 'owner', 'admin', 'production_manager')
        )
    );

-- Machinery Breakdowns RLS
create policy "Active company users can view machinery breakdowns"
    on public.machinery_breakdowns for select
    using (public.auth_is_active_company_user(company_id));

create policy "Active company users can report machinery breakdowns"
    on public.machinery_breakdowns for insert
    with check (
        public.auth_is_active_company_user(company_id)
    );

create policy "Authorized company users can update machinery breakdowns"
    on public.machinery_breakdowns for update
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'machineries.resolve_breakdown')
            or public.auth_user_has_permission(company_id, 'machineries.breakdown')
            or public.auth_user_has_permission(company_id, 'production.edit')
            or public.auth_get_user_company_role(company_id) in ('business_owner', 'owner', 'admin', 'production_manager')
        )
    );


-- 6. POPULATE AND SEED RBAC PERMISSIONS FOR MACHINERIES
insert into public.permissions (code, module, resource, action, name, description) values
('machineries.view', 'production', 'machinery', 'view', 'View Machineries', 'View list, status, and specifications of workshop machines'),
('machineries.create', 'production', 'machinery', 'create', 'Create Machinery', 'Add new machinery and production equipment'),
('machineries.edit', 'production', 'machinery', 'edit', 'Edit Machinery', 'Update machinery specifications, dimensions, and operational parameters'),
('machineries.delete', 'production', 'machinery', 'delete', 'Archive / Delete Machinery', 'Archive, retire, or delete machinery records'),
('machineries.assign', 'production', 'machinery', 'assign', 'Assign Machinery', 'Allocate and schedule machines for job orders and production tasks'),
('machineries.status', 'production', 'machinery', 'edit', 'Change Machinery Status', 'Update live operating status of machines (Available, In Use, Maintenance, etc.)'),
('machineries.maintenance', 'production', 'machinery', 'edit', 'Manage Maintenance', 'Schedule, start, and complete preventive and corrective maintenance'),
('machineries.breakdown', 'production', 'machinery', 'create', 'Report Breakdown', 'Report machine malfunctions and workshop breakdowns'),
('machineries.resolve_breakdown', 'production', 'machinery', 'edit', 'Resolve Breakdown', 'Diagnose, log repair work, and restore broken machines to service'),
('machineries.cost_view', 'production', 'machinery', 'view', 'View Machinery Costing', 'View machine hourly operating costs and purchase details'),
('machineries.export', 'production', 'machinery', 'view', 'Export Machinery Data', 'Export fleet registry and maintenance logs')
on conflict (code) do update set
    name = excluded.name,
    description = excluded.description;

-- Grant permissions to primary system roles:
-- 1. Business Owner gets all permissions
insert into public.role_permissions (role_id, permission_id)
select '00000000-0000-0000-0000-000000000001', id from public.permissions
where code like 'machineries.%'
on conflict (role_id, permission_id) do nothing;

-- 2. Production Manager gets all machinery operational permissions
insert into public.role_permissions (role_id, permission_id)
select '00000000-0000-0000-0000-000000000004', id from public.permissions
where code in (
    'machineries.view', 'machineries.create', 'machineries.edit',
    'machineries.assign', 'machineries.status', 'machineries.maintenance',
    'machineries.breakdown', 'machineries.resolve_breakdown', 'machineries.cost_view', 'machineries.export'
)
on conflict (role_id, permission_id) do nothing;

-- 3. Print Operator gets view, status change, and report breakdown
insert into public.role_permissions (role_id, permission_id)
select '00000000-0000-0000-0000-000000000005', id from public.permissions
where code in ('machineries.view', 'machineries.status', 'machineries.breakdown')
on conflict (role_id, permission_id) do nothing;

-- 4. General Staff gets view
insert into public.role_permissions (role_id, permission_id)
select '00000000-0000-0000-0000-000000000006', id from public.permissions
where code in ('machineries.view')
on conflict (role_id, permission_id) do nothing;
