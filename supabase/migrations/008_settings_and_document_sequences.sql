-- ==============================================================================
-- PrintERP SaaS - Migration 008: Settings, Document Sequences & Audit Logs
-- Supports:
--   1. Transaction-safe document numbering (QUO-000001, ORD-000001, INV-000001, etc.)
--   2. Audit logging for important settings changes
--   3. Expanded company_settings (Branding, Localization, Tax, Notifications)
-- ==============================================================================

-- 1. EXPAND COMPANY_SETTINGS TABLE
alter table public.company_settings
    add column if not exists primary_color text default '#2563eb',
    add column if not exists invoice_logo_url text,
    add column if not exists quotation_logo_url text,
    add column if not exists document_footer_text text default 'Thank you for your business. For any queries, please contact our support desk.',
    add column if not exists document_footer_text_bn text default 'আমাদের সাথে ব্যবসা করার জন্য ধন্যবাদ। কোনো অনুসন্ধানের জন্য আমাদের হেল্পলাইনে যোগাযোগ করুন।',
    add column if not exists date_format text default 'DD/MM/YYYY',
    add column if not exists sms_enabled boolean default false,
    add column if not exists sms_sender_id text,
    add column if not exists sms_api_key text,
    add column if not exists whatsapp_enabled boolean default false,
    add column if not exists low_stock_alerts boolean default true;

-- 2. TRANSACTION-SAFE DOCUMENT SEQUENCES TABLE
create table if not exists public.document_sequences (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    doc_type text not null check (doc_type in ('quotation', 'order', 'invoice', 'challan', 'payment', 'purchase')),
    prefix text not null,
    current_val bigint not null default 0,
    padding integer not null default 6,
    updated_at timestamptz not null default now(),
    constraint unique_company_doc_sequence unique (company_id, doc_type)
);

create index if not exists idx_doc_sequences_company on public.document_sequences(company_id);
alter table public.document_sequences enable row level security;

create policy "Active company users can view document sequences"
    on public.document_sequences for select
    using (public.auth_is_active_company_user(company_id));

create policy "Admins can manage document sequences"
    on public.document_sequences for all
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_get_user_company_role(company_id) in ('business_owner', 'owner', 'admin')
            or public.auth_is_platform_owner()
        )
    );

-- 3. TRANSACTION-SAFE SEQUENCE GENERATOR FUNCTION (Uses SELECT ... FOR UPDATE)
create or replace function public.get_next_document_number(
    p_company_id uuid,
    p_doc_type text
)
returns text as $$
declare
    v_prefix text;
    v_next_val bigint;
    v_padding integer;
    v_formatted text;
begin
    -- Lock row exclusively to prevent race conditions across parallel order bookings
    select prefix, current_val + 1, padding
    into v_prefix, v_next_val, v_padding
    from public.document_sequences
    where company_id = p_company_id
      and doc_type = p_doc_type
    for update;

    -- If no sequence exists yet, initialize it
    if v_next_val is null then
        v_prefix := case p_doc_type
            when 'quotation' then 'QUO'
            when 'order' then 'ORD'
            when 'invoice' then 'INV'
            when 'challan' then 'CHL'
            when 'payment' then 'PAY'
            when 'purchase' then 'PUR'
            else 'DOC'
        end;
        v_next_val := 1;
        v_padding := 6;

        insert into public.document_sequences (company_id, doc_type, prefix, current_val, padding)
        values (p_company_id, p_doc_type, v_prefix, v_next_val, v_padding);
    else
        update public.document_sequences
        set current_val = v_next_val,
            updated_at = now()
        where company_id = p_company_id
          and doc_type = p_doc_type;
    end if;

    -- Return formatted number e.g. "INV-000001"
    v_formatted := v_prefix || '-' || lpad(v_next_val::text, v_padding, '0');
    return v_formatted;
end;
$$ language plpgsql security definer;

-- 4. AUDIT LOGS TABLE
create table if not exists public.audit_logs (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    user_id uuid references auth.users(id) on delete set null,
    entity_type text not null, -- 'company_settings', 'document_sequences', 'tax_info', 'roles'
    entity_id text,
    action text not null, -- 'update', 'create', 'delete'
    old_values jsonb,
    new_values jsonb,
    ip_address text,
    created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_company on public.audit_logs(company_id);
create index if not exists idx_audit_logs_created on public.audit_logs(created_at desc);
alter table public.audit_logs enable row level security;

create policy "Admins can view audit logs"
    on public.audit_logs for select
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_get_user_company_role(company_id) in ('business_owner', 'owner', 'admin')
            or public.auth_is_platform_owner()
        )
    );

-- 5. FUNCTION TO LOG AUDIT EVENT
create or replace function public.log_audit_event(
    p_company_id uuid,
    p_entity_type text,
    p_action text,
    p_old_values jsonb default null,
    p_new_values jsonb default null,
    p_entity_id text default null
)
returns uuid as $$
declare
    v_log_id uuid;
begin
    insert into public.audit_logs (
        company_id,
        user_id,
        entity_type,
        entity_id,
        action,
        old_values,
        new_values
    ) values (
        p_company_id,
        auth.uid(),
        p_entity_type,
        p_entity_id,
        p_action,
        p_old_values,
        p_new_values
    ) returning id into v_log_id;

    return v_log_id;
end;
$$ language plpgsql security definer;
