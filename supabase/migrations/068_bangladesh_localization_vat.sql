-- ==============================================================================
-- InkFlow ERP - Migration 068: Bangladesh Localization & VAT Engine (V7)
-- Authoritative, multi-tenant Bangladesh tax architecture & localized profile
-- ==============================================================================

-- 1. TAX PROFILES MASTER TABLE
create table if not exists public.tax_profiles (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    branch_id uuid references public.branches(id) on delete cascade,
    code text not null, -- e.g. 'VAT-15', 'VAT-7.5', 'VAT-5', 'VAT-ZERO', 'VAT-EXEMPT', 'VAT-NON-TAXABLE'
    name text not null, -- e.g. 'Standard VAT 15%'
    name_bn text,       -- e.g. 'আদর্শ ভ্যাট ১৫%'
    rate numeric(5,2) not null default 15.00 check (rate >= 0.00 and rate <= 100.00),
    calculation_mode text not null default 'exclusive' check (calculation_mode in ('inclusive', 'exclusive')),
    tax_type text not null default 'STANDARD' check (
        tax_type in ('STANDARD', 'TRUNCATED', 'REDUCED', 'ZERO_RATED', 'EXEMPT', 'NON_TAXABLE', 'OUT_OF_SCOPE')
    ),
    is_recoverable boolean not null default true,
    effective_from date not null default current_date,
    effective_to date,
    is_active boolean not null default true,
    is_default boolean not null default false,
    description text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_tax_profile_company_code unique (company_id, code)
);

create index if not exists idx_tax_profiles_company on public.tax_profiles(company_id);
create index if not exists idx_tax_profiles_branch on public.tax_profiles(branch_id);
create index if not exists idx_tax_profiles_type on public.tax_profiles(company_id, tax_type);
create index if not exists idx_tax_profiles_active on public.tax_profiles(company_id, is_active);

alter table public.tax_profiles enable row level security;

create policy "Users can view tax profiles for their company"
    on public.tax_profiles for select
    using (auth.uid() is not null);

create policy "Company members can insert tax profiles"
    on public.tax_profiles for insert
    with check (auth.uid() is not null);

create policy "Company members can update tax profiles"
    on public.tax_profiles for update
    using (auth.uid() is not null);

-- 2. TAX TRANSACTION LINES (AUTHORITATIVE LINE-LEVEL TAX AUDIT REGISTER)
create table if not exists public.tax_transaction_lines (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    branch_id uuid references public.branches(id) on delete cascade,
    transaction_type text not null check (
        transaction_type in ('SALES_INVOICE', 'PURCHASE_BILL', 'CREDIT_NOTE', 'DEBIT_NOTE', 'PURCHASE_RETURN', 'MANUAL_ADJUSTMENT')
    ),
    document_id text not null,
    document_number text not null,
    document_date date not null default current_date,
    line_id text,
    party_type text not null check (party_type in ('CUSTOMER', 'SUPPLIER')),
    party_id text not null,
    party_name text not null,
    party_bin text,
    party_tin text,
    tax_profile_id uuid references public.tax_profiles(id) on delete set null,
    tax_profile_code text not null,
    tax_type text not null,
    tax_rate numeric(5,2) not null,
    calculation_mode text not null check (calculation_mode in ('inclusive', 'exclusive')),
    gross_amount numeric(15,2) not null check (gross_amount >= 0),
    discount_amount numeric(15,2) not null default 0 check (discount_amount >= 0),
    taxable_amount numeric(15,2) not null check (taxable_amount >= 0),
    vat_amount numeric(15,2) not null check (vat_amount >= 0),
    total_amount numeric(15,2) not null check (total_amount >= 0),
    is_recoverable boolean not null default true,
    financial_transaction_id text,
    financial_period_id text,
    notes text,
    created_at timestamptz not null default now()
);

create index if not exists idx_tax_txns_company_date on public.tax_transaction_lines(company_id, document_date);
create index if not exists idx_tax_txns_doc on public.tax_transaction_lines(company_id, document_id);
create index if not exists idx_tax_txns_party on public.tax_transaction_lines(company_id, party_type, party_id);
create index if not exists idx_tax_txns_type on public.tax_transaction_lines(company_id, transaction_type);

alter table public.tax_transaction_lines enable row level security;

create policy "Users can view tax transactions for their company"
    on public.tax_transaction_lines for select
    using (auth.uid() is not null);

create policy "Company members can insert tax transactions"
    on public.tax_transaction_lines for insert
    with check (auth.uid() is not null);

-- 3. ADMINISTRATIVE LOCATIONS MASTER TABLE
create table if not exists public.locations_master (
    id uuid primary key default gen_random_uuid(),
    division_id integer not null,
    division_name text not null,
    division_name_bn text not null,
    district_id integer not null,
    district_name text not null,
    district_name_bn text not null,
    upazila_id integer,
    upazila_name text,
    upazila_name_bn text,
    post_code text,
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

create index if not exists idx_locations_div_dist on public.locations_master(division_id, district_id);

alter table public.locations_master enable row level security;

create policy "All authenticated users can view locations master"
    on public.locations_master for select
    using (true);

-- 4. EXTEND COMPANIES TABLE WITH BANGLADESH LOCALIZATION FIELDS
alter table public.companies
    add column if not exists legal_name_bn text,
    add column if not exists trade_name text,
    add column if not exists trade_name_bn text,
    add column if not exists bin_number text,
    add column if not exists tin_number text,
    add column if not exists trade_license_number text,
    add column if not exists vat_commissionerate text,
    add column if not exists vat_circle text,
    add column if not exists division_id integer,
    add column if not exists district_id integer,
    add column if not exists upazila_id integer,
    add column if not exists area text,
    add column if not exists full_address_bn text,
    add column if not exists default_language text default 'en',
    add column if not exists default_currency text default 'BDT',
    add column if not exists date_format text default 'DD/MM/YYYY',
    add column if not exists number_format text default 'en_IN',
    add column if not exists fiscal_year_start text default '07-01';

-- 5. EXTEND BRANCHES TABLE WITH BANGLADESH LOCALIZATION FIELDS
alter table public.branches
    add column if not exists branch_name_bn text,
    add column if not exists bin_number text,
    add column if not exists division_id integer,
    add column if not exists district_id integer,
    add column if not exists upazila_id integer,
    add column if not exists area text,
    add column if not exists full_address_bn text,
    add column if not exists is_active boolean default true;
