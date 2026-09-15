-- ==============================================================================
-- PrintERP SaaS - Migration 077: Quotations Sales-Control Center Hardening
-- Enhances public.quotations, public.quotation_items, and public.quotation_activities
-- to support the Business-Owner-First Sales Control Center with Follow-Up Engine,
-- Concession Negotiations, Dual Order/Invoice Conversion, and Timeline Actions.
-- ==============================================================================

-- 1. EXTEND PUBLIC.QUOTATIONS TABLE
alter table public.quotations
    add column if not exists customer_company text,
    add column if not exists customer_whatsapp text,
    add column if not exists customer_type text default 'retail',
    add column if not exists reference_no text,
    add column if not exists delivery_date date,
    add column if not exists delivery_location text,
    add column if not exists delivery_method text default 'customer_pickup',
    add column if not exists installation_required boolean default false,
    add column if not exists internal_notes text,
    add column if not exists follow_up_date date,
    add column if not exists follow_up_status text default 'none' check (follow_up_status in ('pending', 'completed', 'overdue', 'none')),
    add column if not exists last_follow_up_method text check (last_follow_up_method is null or last_follow_up_method in ('whatsapp', 'phone', 'email', 'in_person', 'other')),
    add column if not exists last_follow_up_at timestamptz,
    add column if not exists last_follow_up_note text,
    add column if not exists next_action text,
    add column if not exists follow_up_count integer default 0,
    add column if not exists converted_invoice_id text,
    add column if not exists converted_at timestamptz,
    add column if not exists original_grand_total numeric(12,2),
    add column if not exists negotiation_discount numeric(12,2) default 0;

-- Indexes for Sales Control Center query performance
create index if not exists idx_quotations_follow_up on public.quotations(company_id, follow_up_date);
create index if not exists idx_quotations_valid_until on public.quotations(company_id, valid_until);
create index if not exists idx_quotations_next_action on public.quotations(company_id, status, follow_up_date);

-- 2. EXTEND PUBLIC.QUOTATION_ITEMS TABLE
alter table public.quotation_items
    add column if not exists rate_source text default 'default' check (rate_source in ('custom', 'last_invoice', 'default', 'override')),
    add column if not exists finishing text,
    add column if not exists color_spec text,
    add column if not exists artwork_required boolean default false,
    add column if not exists installation_required boolean default false;

-- 3. EXTEND PUBLIC.QUOTATION_ACTIVITIES TABLE ACTION CONSTRAINT
do $$
declare
    con_name text;
begin
    -- Find and drop existing check constraint on quotation_activities.action if present
    for con_name in (
        select con.conname
        from pg_constraint con
        join pg_class rel on rel.oid = con.conrelid
        join pg_namespace nsp on nsp.oid = rel.relnamespace
        where rel.relname = 'quotation_activities'
          and nsp.nspname = 'public'
          and con.contype = 'c'
    ) loop
        execute 'alter table public.quotation_activities drop constraint if exists ' || quote_ident(con_name);
    end loop;
end $$;

alter table public.quotation_activities
    add constraint chk_quotation_activities_action check (
        action in ('created', 'sent', 'viewed', 'negotiated', 'approved', 'rejected', 'expired', 'converted', 'follow_up', 'status_change', 'duplicate')
    );

-- Performance index for quotation activities timeline
create index if not exists idx_quotation_activities_quote_created on public.quotation_activities(quotation_id, created_at desc);
