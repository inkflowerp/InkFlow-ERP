-- ==============================================================================
-- PrintERP SaaS - Migration 024: Bangladesh VAT/Tax & Concurrency-Safe Documents
-- Supports:
--   1. Configurable VAT (Enable/Disable, Inclusive/Exclusive, Rates: 5%, 7.5%, 15%)
--   2. Tax Information (13-digit BIN, TIN, Trade License, VAT Circle)
--   3. Document Templates (6 Document Types, 3 Bilingual Modes)
--   4. Concurrency-Safe Atomic Document Numbering Sequences
--   5. Strict Multi-Tenant Row Level Security
-- ==============================================================================

-- 1. COMPANY TAX SETTINGS TABLE
create table if not exists public.company_tax_settings (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade unique,
    vat_enabled boolean not null default true,
    default_vat_rate numeric(5,2) not null default 15.00,
    pricing_mode text not null default 'exclusive' check (pricing_mode in ('inclusive', 'exclusive')),
    bin_number text, -- 13-digit NBR Business Identification Number
    tin_number text, -- 12-digit Taxpayer Identification Number
    trade_license_number text,
    vat_commissionerate text,
    vat_circle text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_tax_settings_company on public.company_tax_settings(company_id);
alter table public.company_tax_settings enable row level security;

-- 2. DOCUMENT TEMPLATES CONFIG TABLE
create table if not exists public.document_templates_config (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    document_type text not null check (
        document_type in ('quotation', 'invoice', 'vat_mushak', 'receipt', 'challan', 'purchase_order')
    ),
    default_language text not null default 'bilingual' check (
        default_language in ('english', 'bengali', 'bilingual')
    ),
    show_company_logo boolean not null default true,
    company_name_bn text,
    header_disclaimer text,
    footer_terms_en text,
    footer_terms_bn text,
    authorized_signatory_title text not null default 'Managing Director',
    show_seal_box boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_company_doc_template unique (company_id, document_type)
);

create index if not exists idx_doc_templates_company on public.document_templates_config(company_id);
alter table public.document_templates_config enable row level security;

-- 3. CONCURRENCY-SAFE DOCUMENT NUMBER COUNTERS TABLE
create table if not exists public.document_number_counters (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    document_type text not null, -- e.g. 'invoice', 'quotation', 'challan', 'receipt', 'po'
    year_prefix integer not null, -- e.g. 2024
    current_counter bigint not null default 100,
    updated_at timestamptz not null default now(),
    constraint uk_company_doc_year unique (company_id, document_type, year_prefix)
);

create index if not exists idx_doc_counters_lookup on public.document_number_counters(company_id, document_type, year_prefix);
alter table public.document_number_counters enable row level security;

-- 4. CONCURRENCY-SAFE ATOMIC SEQUENCE GENERATOR FUNCTION
create or replace function public.get_next_tenant_document_number(
    p_company_id uuid,
    p_document_type text,
    p_prefix text default null
)
returns text
language plpgsql
security definer
as $$
declare
    v_year integer := extract(year from current_date);
    v_counter bigint;
    v_doc_prefix text;
    v_result text;
begin
    -- Security check
    if not public.auth_is_active_company_user(p_company_id) then
        raise exception 'Unauthorized attempt to generate company document sequence';
    end if;

    -- Determine prefix
    if p_prefix is not null then
        v_doc_prefix := p_prefix;
    else
        case p_document_type
            when 'invoice' then v_doc_prefix := 'INV';
            when 'quotation' then v_doc_prefix := 'QT';
            when 'vat_mushak' then v_doc_prefix := 'MUSK';
            when 'receipt' then v_doc_prefix := 'MR';
            when 'challan' then v_doc_prefix := 'CH';
            when 'purchase_order' then v_doc_prefix := 'PO';
            else v_doc_prefix := 'DOC';
        end case;
    end if;

    -- Atomic row-level lock & increment
    insert into public.document_number_counters (company_id, document_type, year_prefix, current_counter, updated_at)
    values (p_company_id, p_document_type, v_year, 101, now())
    on conflict (company_id, document_type, year_prefix)
    do update set
        current_counter = public.document_number_counters.current_counter + 1,
        updated_at = now()
    returning current_counter into v_counter;

    -- Format result: e.g. INV-2024-00101
    v_result := v_doc_prefix || '-' || v_year || '-' || lpad(v_counter::text, 5, '0');
    return v_result;
end;
$$;

-- 5. RLS POLICIES
create policy "Active company users can view tax settings"
    on public.company_tax_settings for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company admins can manage tax settings"
    on public.company_tax_settings for all
    using (
        public.auth_is_active_company_user(company_id)
        and public.auth_user_has_permission(company_id, 'settings.edit')
    );

create policy "Active company users can view document templates"
    on public.document_templates_config for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company admins can manage document templates"
    on public.document_templates_config for all
    using (
        public.auth_is_active_company_user(company_id)
        and public.auth_user_has_permission(company_id, 'settings.edit')
    );
