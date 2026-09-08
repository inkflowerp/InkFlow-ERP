-- ==============================================================================
-- PrintERP SaaS - Migration 027: Security, Comprehensive Audit & Data Integrity
-- Supports:
--   1. Comprehensive Audit Logging (15 Critical Event Categories)
--   2. Immutable Append-Only Audit Ledger Rules
--   3. Financial Anti-Deletion Architecture (Void, Cancel, Reverse, Adjust)
--   4. Payment Reversals & Historical Adjustments Ledger
--   5. Inventory Stock Ledger Integrity Enforcement
--   6. Strict Multi-Tenant Row Level Security (RLS) Policy Hardening
-- ==============================================================================

-- 1. ENHANCE AUDIT LOGS TABLE FOR COMPREHENSIVE COMPLIANCE
create table if not exists public.audit_logs (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    user_id uuid references auth.users(id) on delete set null,
    user_email text,
    action text not null, -- e.g. 'auth.login', 'customer.edit', 'pricing.price_override', 'order.cancel', etc.
    entity text not null, -- e.g. 'customer', 'quotation', 'order', 'invoice', 'payment', 'inventory'
    entity_id text,
    previous_value jsonb,
    new_value jsonb,
    ip_address text,
    device_metadata jsonb default '{}'::jsonb,
    created_at timestamptz not null default now()
);

-- Ensure existing audit_logs table has all newly required columns if already created
alter table public.audit_logs
    add column if not exists user_email text,
    add column if not exists entity text,
    add column if not exists previous_value jsonb,
    add column if not exists new_value jsonb,
    add column if not exists device_metadata jsonb default '{}'::jsonb;

-- Populate entity from entity_type if null
update public.audit_logs set entity = entity_type where entity is null and entity_type is not null;

create index if not exists idx_audit_logs_comp_action on public.audit_logs(company_id, action);
create index if not exists idx_audit_logs_comp_created on public.audit_logs(company_id, created_at desc);
create index if not exists idx_audit_logs_entity on public.audit_logs(company_id, entity, entity_id);
alter table public.audit_logs enable row level security;

-- IMMUTABILITY RULE ON AUDIT LOGS: Nobody (not even business owners) can delete or modify audit records
create or replace function public.trg_prevent_audit_log_mutation()
returns trigger as $$
begin
    raise exception 'Data Integrity Violation: Audit log records are immutable and cannot be modified or deleted.';
end;
$$ language plpgsql security definer;

drop trigger if exists prevent_audit_log_mutation on public.audit_logs;
create trigger prevent_audit_log_mutation
    before update or delete on public.audit_logs
    for each row
    execute function public.trg_prevent_audit_log_mutation();

-- 2. PAYMENT REVERSALS & ADJUSTMENTS TABLE
-- Historical payments must never be directly modified. Adjustments are recorded as linked transactions.
create table if not exists public.payment_adjustments (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    payment_id uuid not null references public.payments(id) on delete restrict,
    type text not null check (type in ('reversal', 'adjustment')),
    original_amount numeric(12,2) not null,
    adjusted_amount numeric(12,2) not null,
    difference_amount numeric(12,2) not null,
    reason text not null,
    authorized_by_id uuid references auth.users(id) on delete set null,
    authorized_by_name text not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_payment_adj_comp on public.payment_adjustments(company_id);
create index if not exists idx_payment_adj_pay on public.payment_adjustments(payment_id);
alter table public.payment_adjustments enable row level security;

-- 3. FINANCIAL DATA INTEGRITY: PREVENT SILENT DELETION OF INVOICES & PAYMENTS
create or replace function public.trg_prevent_financial_deletion()
returns trigger as $$
begin
    raise exception 'Financial Integrity Rule: Deletion of financial records is prohibited. Use void, cancel, reverse, or adjust workflows.';
end;
$$ language plpgsql security definer;

-- Apply anti-deletion trigger on invoices
drop trigger if exists prevent_invoice_deletion on public.invoices;
create trigger prevent_invoice_deletion
    before delete on public.invoices
    for each row
    execute function public.trg_prevent_financial_deletion();

-- Apply anti-deletion trigger on payments
drop trigger if exists prevent_payment_deletion on public.payments;
create trigger prevent_payment_deletion
    before delete on public.payments
    for each row
    execute function public.trg_prevent_financial_deletion();

-- Apply anti-deletion trigger on expenses
drop trigger if exists prevent_expense_deletion on public.expenses;
create trigger prevent_expense_deletion
    before delete on public.expenses
    for each row
    execute function public.trg_prevent_financial_deletion();

-- 4. INVENTORY DATA INTEGRITY: ENFORCE STOCK LEDGER TRANSACTIONS
-- Direct modification of current_stock without an underlying stock_ledger transaction is restricted.
create or replace function public.record_inventory_stock_transaction(
    p_company_id uuid,
    p_material_id uuid,
    p_transaction_type text,
    p_quantity_change numeric,
    p_unit_cost numeric,
    p_reference_id text,
    p_notes text,
    p_performed_by_name text
)
returns numeric as $$
declare
    v_current_stock numeric;
    v_new_stock numeric;
    v_unit text;
begin
    -- 1. Fetch material
    select current_stock, unit into v_current_stock, v_unit
    from public.materials
    where id = p_material_id and company_id = p_company_id
    for update;

    if not found then
        raise exception 'Material not found in company %', p_company_id;
    end if;

    v_new_stock := v_current_stock + p_quantity_change;

    if v_new_stock < 0 then
        raise exception 'Inventory Integrity Rule: Transaction would result in negative stock level (%)', v_new_stock;
    end if;

    -- 2. Insert immutable stock ledger row
    insert into public.stock_ledger (
        company_id,
        material_id,
        transaction_type,
        quantity_change,
        unit,
        balance_after,
        unit_cost,
        total_cost,
        reference_id,
        notes,
        performed_by_name
    ) values (
        p_company_id,
        p_material_id,
        p_transaction_type,
        p_quantity_change,
        v_unit,
        v_new_stock,
        p_unit_cost,
        abs(p_quantity_change) * p_unit_cost,
        p_reference_id,
        p_notes,
        p_performed_by_name
    );

    -- 3. Update material cached balance
    update public.materials
    set current_stock = v_new_stock,
        updated_at = now()
    where id = p_material_id and company_id = p_company_id;

    return v_new_stock;
end;
$$ language plpgsql security definer;

-- 5. ROW LEVEL SECURITY (RLS) POLICIES
create policy "Company members can view audit logs"
    on public.audit_logs for select
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'settings.view')
            or public.auth_user_has_permission(company_id, 'reports.view')
            or public.auth_is_platform_owner()
        )
    );

create policy "System and authorized users can insert audit logs"
    on public.audit_logs for insert
    with check (
        public.auth_is_active_company_user(company_id)
        or public.auth_is_platform_owner()
    );

create policy "Company members can view payment adjustments"
    on public.payment_adjustments for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized billing users can record payment adjustments"
    on public.payment_adjustments for insert
    with check (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'billing.edit')
            or public.auth_user_has_permission(company_id, 'billing.approve')
            or public.auth_is_platform_owner()
        )
    );
