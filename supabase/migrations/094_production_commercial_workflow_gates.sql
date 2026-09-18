-- ==============================================================================
-- PrintERP SaaS - Migration 094: Production Commercial Workflow & Gating Architecture
-- Supports:
--   1. Invoice Requests table with tenant isolation & status lifecycle
--   2. Workflow routing & commercial gate statuses on Sales Orders, Job Orders, Design Jobs, Production Jobs
--   3. Expanded In-App Notification types for Invoice Requests & Production Gating
--   4. RLS security policies for designers, managers, and owners
-- ==============================================================================

-- 1. INVOICE REQUESTS TABLE
create table if not exists public.invoice_requests (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    request_number text not null,
    customer_id uuid references public.customers(id) on delete set null,
    customer_name text not null,
    customer_phone text,
    sales_order_id uuid references public.sales_orders(id) on delete set null,
    order_number text,
    job_order_id uuid references public.job_orders(id) on delete set null,
    job_number text,
    design_job_id uuid references public.design_jobs(id) on delete set null,
    design_number text,
    requested_by_id uuid references auth.users(id) on delete set null,
    requested_by_name text not null default 'Designer',
    status text not null default 'pending' check (
        status in ('pending', 'invoice_created', 'rejected', 'cancelled')
    ),
    invoice_id uuid references public.invoices(id) on delete set null,
    invoice_number text,
    items_summary text,
    estimated_amount numeric(12,2) default 0,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_invoice_requests_company on public.invoice_requests(company_id);
create index if not exists idx_invoice_requests_status on public.invoice_requests(company_id, status);
create index if not exists idx_invoice_requests_order on public.invoice_requests(sales_order_id);
create index if not exists idx_invoice_requests_job on public.invoice_requests(job_order_id);
create index if not exists idx_invoice_requests_design on public.invoice_requests(design_job_id);

-- Unique pending request constraint per sales order / design job to prevent duplicate spamming
create unique index if not exists uk_pending_invoice_request_order
    on public.invoice_requests(company_id, sales_order_id)
    where status = 'pending' and sales_order_id is not null;

create unique index if not exists uk_pending_invoice_request_design
    on public.invoice_requests(company_id, design_job_id)
    where status = 'pending' and design_job_id is not null;

alter table public.invoice_requests enable row level security;

-- RLS Policies for invoice_requests
create policy "Tenant users can view invoice requests"
    on public.invoice_requests
    for select
    using (
        company_id in (
            select company_id from public.company_users where user_id = auth.uid()
        )
    );

create policy "Tenant users can insert invoice requests"
    on public.invoice_requests
    for insert
    with check (
        company_id in (
            select company_id from public.company_users where user_id = auth.uid()
        )
    );

create policy "Tenant users can update invoice requests"
    on public.invoice_requests
    for update
    using (
        company_id in (
            select company_id from public.company_users where user_id = auth.uid()
        )
    );

create policy "Tenant users can delete invoice requests"
    on public.invoice_requests
    for delete
    using (
        company_id in (
            select company_id from public.company_users where user_id = auth.uid()
        )
    );

-- 2. WORKFLOW ROUTING & COMMERCIAL GATES ON SALES ORDERS
alter table public.sales_orders
    add column if not exists workflow_routing text default 'design_required' check (
        workflow_routing in ('design_required', 'design_ok', 'ready_production', 'custom')
    ),
    add column if not exists commercial_status text default 'invoice_required' check (
        commercial_status in ('invoice_required', 'invoice_requested', 'invoice_created', 'unpaid', 'partially_paid', 'paid')
    ),
    add column if not exists production_gate_status text default 'blocked_commercial' check (
        production_gate_status in ('blocked_commercial', 'blocked_design', 'blocked_approval', 'ready_for_production', 'in_production', 'completed')
    ),
    add column if not exists invoice_id uuid references public.invoices(id) on delete set null,
    add column if not exists invoice_number text,
    add column if not exists invoice_requested_at timestamptz;

-- 3. WORKFLOW ROUTING & COMMERCIAL GATES ON JOB ORDERS
alter table public.job_orders
    add column if not exists workflow_routing text default 'design_required' check (
        workflow_routing in ('design_required', 'design_ok', 'ready_production', 'custom')
    ),
    add column if not exists commercial_status text default 'invoice_required',
    add column if not exists production_gate_status text default 'blocked_commercial',
    add column if not exists invoice_id uuid references public.invoices(id) on delete set null,
    add column if not exists invoice_number text;

-- 4. COMMERCIAL LINKAGE ON DESIGN JOBS
alter table public.design_jobs
    add column if not exists workflow_routing text default 'design_required',
    add column if not exists commercial_status text default 'invoice_required',
    add column if not exists invoice_id uuid references public.invoices(id) on delete set null,
    add column if not exists invoice_number text,
    add column if not exists invoice_request_id uuid references public.invoice_requests(id) on delete set null;

-- 5. COMMERCIAL GATE FLAGS ON PRODUCTION JOBS
alter table public.production_jobs
    add column if not exists commercial_gate_status text default 'blocked_commercial',
    add column if not exists invoice_id uuid references public.invoices(id) on delete set null,
    add column if not exists is_blocked_by_commercial_gate boolean default true,
    add column if not exists is_blocked_by_design_gate boolean default false;

-- 6. UPDATE IN-APP NOTIFICATIONS TYPE CHECK CONSTRAINT
do $$
begin
    alter table public.in_app_notifications drop constraint if exists in_app_notifications_type_check;
    alter table public.in_app_notifications add constraint in_app_notifications_type_check check (
        type in (
            'new_order', 'payment_received', 'design_revision',
            'artwork_approved', 'production_completed', 'delivery_scheduled',
            'overdue_invoice', 'low_stock', 'leave_approval',
            'invoice_request', 'design_ready', 'customer_approval_needed',
            'production_gate_cleared', 'production_ready'
        )
    );
exception
    when others then
        null;
end $$;
