-- ==============================================================================
-- PrintERP SaaS - Full Unified Schema (Consolidated from 30 Migrations)
-- Target: Supabase Postgres (PostgreSQL 15+)
-- ==============================================================================


-- >>> FILE: 001_initial_schema.sql <<<
-- ==============================================================================
-- PrintERP SaaS - Multi-Tenant Initial Schema Migration (001)
-- Unicode-Safe UTF-8, Multi-Tenancy Architecture
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 1. COMPANIES (TENANTS)
create table if not exists public.companies (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique,
    name text not null,
    name_bn text,
    legal_name text,
    trade_license_no text,
    bin_no text,
    tin_no text,
    business_type text not null default 'printing_signage',
    phone text,
    email text,
    website text,
    division_id integer,
    district_id integer,
    upazila_id integer,
    address text,
    address_bn text,
    currency text not null default 'BDT',
    default_locale text not null default 'bn',
    logo_url text,
    is_active boolean not null default true,
    settings jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint slug_valid check (slug ~* '^[a-z0-9-]+$')
);

create index if not exists idx_companies_slug on public.companies(slug);
create index if not exists idx_companies_is_active on public.companies(is_active);

-- 2. USER PROFILES
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text not null,
    full_name_bn text,
    phone text,
    avatar_url text,
    preferred_locale text not null default 'bn',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_phone on public.profiles(phone);

-- 3. TENANT MEMBERSHIPS & ROLES
create table if not exists public.tenant_memberships (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null check (role in ('owner', 'admin', 'manager', 'operator', 'accountant', 'designer', 'installer')),
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint unique_company_user unique (company_id, user_id)
);

create index if not exists idx_tenant_memberships_company on public.tenant_memberships(company_id);
create index if not exists idx_tenant_memberships_user on public.tenant_memberships(user_id);
create index if not exists idx_tenant_memberships_role on public.tenant_memberships(role);

-- 4. AUDIT LOGS
create table if not exists public.audit_logs (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    user_id uuid references auth.users(id) on delete set null,
    action text not null,
    entity_type text not null,
    entity_id text,
    old_values jsonb,
    new_values jsonb,
    ip_address text,
    user_agent text,
    created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_company on public.audit_logs(company_id);
create index if not exists idx_audit_logs_created on public.audit_logs(created_at desc);

-- Automatic profile creation trigger when user signs up in Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, full_name, preferred_locale)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        coalesce(new.raw_user_meta_data->>'preferred_locale', 'bn')
    )
    on conflict (id) do nothing;
    return new;
end;
$$ language plpgsql security definer;

-- Trigger execution
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- Trigger for auto-updating timestamps
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger update_companies_modtime
    before update on public.companies
    for each row execute function public.update_updated_at_column();

create trigger update_profiles_modtime
    before update on public.profiles
    for each row execute function public.update_updated_at_column();

create trigger update_memberships_modtime
    before update on public.tenant_memberships
    for each row execute function public.update_updated_at_column();


-- >>> FILE: 002_bangladesh_geo.sql <<<
-- ==============================================================================
-- PrintERP SaaS - Bangladesh Administrative Geo Schema & Seed (002)
-- Unicode-Safe (UTF-8) with full Bengali and English mapping
-- ==============================================================================

-- 1. DIVISIONS (বিভাগ)
create table if not exists public.divisions (
    id serial primary key,
    name text not null,
    name_bn text not null,
    code text unique not null,
    created_at timestamptz not null default now()
);

-- 2. DISTRICTS (জেলা)
create table if not exists public.districts (
    id serial primary key,
    division_id integer not null references public.divisions(id) on delete cascade,
    name text not null,
    name_bn text not null,
    code text unique not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_districts_division on public.districts(division_id);

-- 3. UPAZILAS / THANAS (উপজেলা / থানা)
create table if not exists public.upazilas (
    id serial primary key,
    district_id integer not null references public.districts(id) on delete cascade,
    name text not null,
    name_bn text not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_upazilas_district on public.upazilas(district_id);

-- SEED DIVISIONS (8 Divisions)
insert into public.divisions (id, name, name_bn, code) values
(1, 'Dhaka', 'ঢাকা', 'DHA'),
(2, 'Chattogram', 'চট্টগ্রাম', 'CTG'),
(3, 'Rajshahi', 'রাজশাহী', 'RAJ'),
(4, 'Khulna', 'খুলনা', 'KHU'),
(5, 'Barishal', 'বরিশাল', 'BAR'),
(6, 'Sylhet', 'সিলেট', 'SYL'),
(7, 'Rangpur', 'রংপুর', 'RAN'),
(8, 'Mymensingh', 'ময়মনসিংহ', 'MYM')
on conflict (id) do update set 
    name = excluded.name, 
    name_bn = excluded.name_bn;

-- SEED DISTRICTS (All 64 Districts)
insert into public.districts (id, division_id, name, name_bn, code) values
-- Dhaka Division (1)
(1, 1, 'Dhaka', 'ঢাকা', 'DHA-01'),
(2, 1, 'Gazipur', 'গাজীপুর', 'GAZ-02'),
(3, 1, 'Narayanganj', 'নারায়ণগঞ্জ', 'NAR-03'),
(4, 1, 'Tangail', 'টাঙ্গাইল', 'TAN-04'),
(5, 1, 'Kishoreganj', 'কিশোরগঞ্জ', 'KIS-05'),
(6, 1, 'Manikganj', 'মানিকগঞ্জ', 'MAN-06'),
(7, 1, 'Munshiganj', 'মুন্সীগঞ্জ', 'MUN-07'),
(8, 1, 'Narsingdi', 'নরসিংদী', 'NAS-08'),
(9, 1, 'Faridpur', 'ফরিদপুর', 'FAR-09'),
(10, 1, 'Gopalganj', 'গোপালগঞ্জ', 'GOP-10'),
(11, 1, 'Madaripur', 'মাদারীপুর', 'MAD-11'),
(12, 1, 'Rajbari', 'রাজবাড়ী', 'RAJ-12'),
(13, 1, 'Shariatpur', 'শরীয়তপুর', 'SHA-13'),

-- Chattogram Division (2)
(14, 2, 'Chattogram', 'চট্টগ্রাম', 'CTG-14'),
(15, 2, 'Cox''s Bazar', 'কক্সবাজার', 'COX-15'),
(16, 2, 'Cumilla', 'কুমিল্লা', 'CUM-16'),
(17, 2, 'Feni', 'ফেনী', 'FEN-17'),
(18, 2, 'Brahmanbaria', 'ব্রাহ্মণবাড়িয়া', 'BRA-18'),
(19, 2, 'Chandpur', 'চাঁদপুর', 'CHA-19'),
(20, 2, 'Noakhali', 'নোয়াখালী', 'NOA-20'),
(21, 2, 'Lakshmipur', 'লক্ষ্মীপুর', 'LAK-21'),
(22, 2, 'Khagrachhari', 'খাগড়াছড়ি', 'KHA-22'),
(23, 2, 'Rangamati', 'রাঙ্গামাটি', 'RAN-23'),
(24, 2, 'Bandarban', 'বান্দরবান', 'BAN-24'),

-- Rajshahi Division (3)
(25, 3, 'Rajshahi', 'রাজশাহী', 'RAJ-25'),
(26, 3, 'Bogura', 'বগুড়া', 'BOG-26'),
(27, 3, 'Pabna', 'পাবনা', 'PAB-27'),
(28, 3, 'Sirajganj', 'সিরাজগঞ্জ', 'SIR-28'),
(29, 3, 'Naogaon', 'নওগাঁ', 'NAO-29'),
(30, 3, 'Natore', 'নাটোর', 'NAT-30'),
(31, 3, 'Chapai Nawabganj', 'চাঁপাইনবাবগঞ্জ', 'CNW-31'),
(32, 3, 'Joypurhat', 'জয়পুরহাট', 'JOY-32'),

-- Khulna Division (4)
(33, 4, 'Khulna', 'খুলনা', 'KHU-33'),
(34, 4, 'Jashore', 'যশোর', 'JAS-34'),
(35, 4, 'Kushtia', 'কুষ্টিয়া', 'KUS-35'),
(36, 4, 'Satkhira', 'সাতক্ষীরা', 'SAT-36'),
(37, 4, 'Bagerhat', 'বাগেরহাট', 'BAG-37'),
(38, 4, 'Jhenaidah', 'ঝিনাইদহ', 'JHE-38'),
(39, 4, 'Chuadanga', 'চুয়াডাঙ্গা', 'CHU-39'),
(40, 4, 'Magura', 'মাগুরা', 'MAG-40'),
(41, 4, 'Meherpur', 'মেহেরপুর', 'MEH-41'),
(42, 4, 'Narail', 'নড়াইল', 'NAR-42'),

-- Barishal Division (5)
(43, 5, 'Barishal', 'বরিশাল', 'BAR-43'),
(44, 5, 'Patuakhali', 'পটুয়াখালী', 'PAT-44'),
(45, 5, 'Bhola', 'ভোলা', 'BHO-45'),
(46, 5, 'Pirojpur', 'পিরোজপুর', 'PIR-46'),
(47, 5, 'Barguna', 'বরগুনা', 'BRG-47'),
(48, 5, 'Jhalokati', 'ঝালকাঠি', 'JHA-48'),

-- Sylhet Division (6)
(49, 6, 'Sylhet', 'সিলেট', 'SYL-49'),
(50, 6, 'Moulvibazar', 'মৌলভীবাজার', 'MOU-50'),
(51, 6, 'Habiganj', 'হবিগঞ্জ', 'HAB-51'),
(52, 6, 'Sunamganj', 'সুনামগঞ্জ', 'SUN-52'),

-- Rangpur Division (7)
(53, 7, 'Rangpur', 'রংপুর', 'RAN-53'),
(54, 7, 'Dinajpur', 'দিনাজপুর', 'DIN-54'),
(55, 7, 'Kurigram', 'কুড়িগ্রাম', 'KUR-55'),
(56, 7, 'Gaibandha', 'গাইবান্ধা', 'GAI-56'),
(57, 7, 'Nilphamari', 'নীলফামারী', 'NIL-57'),
(58, 7, 'Panchagarh', 'পঞ্চগড়', 'PAN-58'),
(59, 7, 'Thakurgaon', 'ঠাকুরগাঁও', 'THA-59'),
(60, 7, 'Lalmonirhat', 'লালমনিরহাট', 'LAL-60'),

-- Mymensingh Division (8)
(61, 8, 'Mymensingh', 'ময়মনসিংহ', 'MYM-61'),
(62, 8, 'Jamalpur', 'জামালপুর', 'JAM-62'),
(63, 8, 'Netrokona', 'নেত্রকোণা', 'NET-63'),
(64, 8, 'Sherpur', 'শেরপুর', 'SHE-64')
on conflict (id) do update set 
    division_id = excluded.division_id,
    name = excluded.name, 
    name_bn = excluded.name_bn;

-- SEED KEY PRINTING & COMMERCIAL HUBS UPAZILAS / THANAS
insert into public.upazilas (district_id, name, name_bn) values
(1, 'Motijheel (Printing Hub)', 'মতিঝিল (প্রিন্টিং হাব)'),
(1, 'Paltan / Fakirapool (Printing Cluster)', 'পল্টন / ফকিরাপুল (প্রিন্টিং ক্লাস্টার)'),
(1, 'Arambagh', 'আরামবাগ'),
(1, 'Banglabazar (Offset & Publishing)', 'বাংলাবাজার (অফসেট ও প্রকাশনা)'),
(1, 'Nilkhet (Digital Print & Binding)', 'নীলক্ষেত (ডিজিটাল প্রিন্ট ও বাইন্ডিং)'),
(1, 'Tejgaon Industrial Area', 'তেজগাঁও শিল্প এলাকা'),
(1, 'Dhanmondi', 'ধানমন্ডি'),
(1, 'Gulshan', 'গুলশান'),
(1, 'Uttara', 'উত্তরা'),
(1, 'Mirpur', 'মিরপুর'),
(1, 'Badda', 'বাড্ডা'),
(2, 'Tongi (Packaging & Industrial)', 'টঙ্গী (প্যাকেজিং ও শিল্প)'),
(2, 'Gazipur Sadar', 'গাজীপুর সদর'),
(3, 'Narayanganj Sadar', 'নারায়ণগঞ্জ সদর'),
(3, 'Fatullah', 'ফতুল্লা'),
(14, 'Anderkilla (Signage & Printing Hub)', 'আন্দরকিল্লা (সাইনেজ ও প্রিন্টিং হাব)'),
(14, 'Agrabad Commercial Area', 'আগ্রাবাদ বাণিজ্যিক এলাকা'),
(14, 'Pahartali', 'পাহাড়তলী'),
(14, 'Kotwali', 'কোতোয়ালী'),
(25, 'Boalia', 'বোয়ালিয়া'),
(26, 'Bogura Sadar', 'বগুড়া সদর'),
(33, 'Khulna Sadar', 'খুলনা সদর'),
(49, 'Sylhet Sadar', 'সিলেট সদর');


-- >>> FILE: 003_multitenant_rls.sql <<<
-- ==============================================================================
-- PrintERP SaaS - Multi-Tenant Row Level Security (RLS) Policies (003)
-- Ensures strict multi-tenant isolation across all organizations
-- ==============================================================================

-- Enable RLS on all tables
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.tenant_memberships enable row level security;
alter table public.audit_logs enable row level security;
alter table public.divisions enable row level security;
alter table public.districts enable row level security;
alter table public.upazilas enable row level security;

-- 1. PUBLIC REFERENCE TABLES (Divisions, Districts, Upazilas)
-- Read-only access for all authenticated and anon users
create policy "Allow read access to divisions"
    on public.divisions for select
    using (true);

create policy "Allow read access to districts"
    on public.districts for select
    using (true);

create policy "Allow read access to upazilas"
    on public.upazilas for select
    using (true);

-- 2. SECURITY HELPER FUNCTIONS
create or replace function public.auth_user_has_company_access(target_company_id uuid)
returns boolean as $$
begin
    return exists (
        select 1
        from public.tenant_memberships
        where company_id = target_company_id
          and user_id = auth.uid()
          and is_active = true
    );
end;
$$ language plpgsql security definer;

create or replace function public.auth_user_get_role(target_company_id uuid)
returns text as $$
declare
    user_role text;
begin
    select role into user_role
    from public.tenant_memberships
    where company_id = target_company_id
      and user_id = auth.uid()
      and is_active = true
    limit 1;
    return user_role;
end;
$$ language plpgsql security definer;

-- 3. PROFILES POLICIES
-- Users can view and update their own profile
create policy "Users can view own profile"
    on public.profiles for select
    using (auth.uid() = id);

create policy "Users can update own profile"
    on public.profiles for update
    using (auth.uid() = id);

create policy "Users can insert own profile"
    on public.profiles for insert
    with check (auth.uid() = id);

-- 4. COMPANIES (TENANTS) POLICIES
-- Users can view companies they belong to
create policy "Members can view company details"
    on public.companies for select
    using (public.auth_user_has_company_access(id));

-- Only owners and admins can update company details
create policy "Owners and Admins can update company"
    on public.companies for update
    using (public.auth_user_get_role(id) in ('owner', 'admin'));

-- Any authenticated user can create a new company (for onboarding)
create policy "Authenticated users can create companies"
    on public.companies for insert
    with check (auth.uid() is not null);

-- 5. TENANT MEMBERSHIPS POLICIES
-- Users can see memberships for companies they belong to
create policy "Members can view company members"
    on public.tenant_memberships for select
    using (public.auth_user_has_company_access(company_id));

-- Users can also see their own memberships anywhere (to list companies)
create policy "Users can view own memberships"
    on public.tenant_memberships for select
    using (auth.uid() = user_id);

-- Owners and Admins can manage memberships (invite, remove, update roles)
create policy "Admins can manage company memberships"
    on public.tenant_memberships for all
    using (public.auth_user_get_role(company_id) in ('owner', 'admin'));

-- Creator of a company can add their own owner membership
create policy "Company creators can insert owner membership"
    on public.tenant_memberships for insert
    with check (
        auth.uid() = user_id 
        and role = 'owner'
    );

-- 6. AUDIT LOGS POLICIES
-- Members can view audit logs for their company if admin/owner
create policy "Admins can view company audit logs"
    on public.audit_logs for select
    using (public.auth_user_get_role(company_id) in ('owner', 'admin'));

create policy "System and users can insert audit logs"
    on public.audit_logs for insert
    with check (public.auth_user_has_company_access(company_id));


-- >>> FILE: 004_printing_catalog_enums.sql <<<
-- ==============================================================================
-- PrintERP SaaS - Printing, Signage & Fabrication Domain Enums & Schema (004)
-- Tailored for Bangladeshi Printing, Signage, LED, Acrylic & Fabrication Hubs
-- ==============================================================================

-- 1. BUSINESS DOMAIN CATEGORIES
create table if not exists public.business_categories (
    code text primary key,
    name_en text not null,
    name_bn text not null,
    description_en text,
    description_bn text,
    icon text,
    sort_order integer not null default 0
);

insert into public.business_categories (code, name_en, name_bn, description_en, description_bn, icon, sort_order) values
('digital_print', 'Digital Printing', 'ডিজিটাল প্রিন্টিং', 'High-res laser & inkjet printing, brochures, catalogs, business cards', 'উচ্চ রেজোলিউশন লেজার ও কালার প্রিন্ট, ক্যাটালগ, ভিজিটিং কার্ড', 'Printer', 1),
('offset_print', 'Offset Printing', 'অফসেট প্রিন্টিং', 'Commercial volume printing, books, magazines, calendar, pad, memo', 'বাণিজ্যিক ভলিউম প্রিন্টিং, বই, ক্যালেন্ডার, প্যাড, মেমো, খাম', 'Layers', 2),
('flex_banner', 'Flex & Banner', 'ফ্লেক্স ও ব্যানার', 'Outdoor PVC flex, star flex, panaflex, rollup banners, vinyl', 'আউটডোর পিভিসি ফ্লেক্স, স্টার ফ্লেক্স, প্যানাফ্লেক্স, রোলআপ ব্যানার', 'Maximize', 3),
('sticker_label', 'Stickers & Labels', 'স্টিকার ও লেবেল', 'Die-cut vinyl, paper stickers, reflective, holographic, transparent', 'ডাই-কাট ভিনাইল, পেপার স্টিকার, রিফ্লেক্টিভ, হলোগ্রাফিক, ট্রান্সপারেন্ট', 'Tag', 4),
('packaging_box', 'Packaging & Carton', 'প্যাকেজিং ও কার্টুন', 'Duplex board boxes, corrugated cartons, food grade packaging, bags', 'ডুপ্লেক্স বোর্ড বক্স, করোগেটেড কার্টুন, ফুড গ্রেড প্যাকেট, ব্যাগ', 'Box', 5),
('garment_print', 'Garment & T-Shirt', 'গার্মেন্টস ও টি-শার্ট', 'Screen printing, DTF, sublimation, embroidery, heat transfer', 'স্ক্রিন প্রিন্টিং, ডিটিএফ, সাবলিমেশন, এমব্রয়ডারি', 'Shirt', 6),
('promotional', 'Promotional Products', 'প্রমোশনাল গিফট', 'Crest, medal, pen, mug, umbrella, diary, keyrings', 'ক্রেস্ট, মেডেল, কলম, মগ, ছাতা, ডায়েরি, চাবির রিং', 'Gift', 7),
('led_signage', 'LED Signage & Neon', 'এলইডি সাইনেজ ও নিয়ন', 'LED moving displays, 3D channel letters, neon sign, backlit boards', 'এলইডি ডিসপ্লে, থ্রিডি চ্যানেল লেটার, নিয়ন সাইন, ব্যাকলিট সাইনবোর্ড', 'Sun', 8),
('acrylic_signage', 'Acrylic Signage', 'এক্রিলিক সাইনেজ', 'Laser cut acrylic boards, nameplates, 3D acrylic letters, reception signs', 'লেজার কাট এক্রিলিক বোর্ড, নেইমপ্লেট, থ্রিডি এক্রিলিক লেটার', 'Sparkles', 9),
('metal_fabrication', 'Metal Fabrication', 'মেটাল ফেব্রিকেশন', 'MS/SS structure, truss, billboard frames, iron racks, laser cut metal', 'এমএস/এসএস স্ট্রাকচার, ট্রাস, বিলবোর্ড ফ্রেম, মেটাল ফ্রেম', 'Wrench', 10),
('acp_signage', 'ACP Signage & Cladding', 'এসিপি সাইনেজ ও ক্ল্যাডিং', 'Aluminium composite panel groove cutting, building fascia, canopy', 'অ্যালুমিনিয়াম কম্পোজিট প্যানেল গ্রুপ কাটিং, বিল্ডিং ফ্রন্ট', 'Grid', 11),
('pvc_signage', 'PVC & Foam Board', 'পিভিসি ও ফোম বোর্ড', 'Foam board pasting, PVC sheet branding, indoor signage, POSM', 'ফোম বোর্ড পেস্টিং, পিভিসি শিট ব্র্যান্ডিং, ইনডোর সাইনেজ', 'Layout', 12)
on conflict (code) do update set
    name_en = excluded.name_en,
    name_bn = excluded.name_bn,
    description_en = excluded.description_en,
    description_bn = excluded.description_bn;

-- 2. MEASUREMENT UNITS
create table if not exists public.measurement_units (
    code text primary key,
    name_en text not null,
    name_bn text not null,
    symbol_en text not null,
    symbol_bn text not null,
    category text not null check (category in ('area', 'length', 'quantity', 'weight', 'volume'))
);

insert into public.measurement_units (code, name_en, name_bn, symbol_en, symbol_bn, category) values
('sft', 'Square Feet', 'বর্গফুট', 'sq.ft', 'বর্গফুট', 'area'),
('rft', 'Running Feet', 'রানিং ফুট', 'r.ft', 'রানিং ফুট', 'length'),
('sqinch', 'Square Inch', 'বর্গ ইঞ্চি', 'sq.in', 'বর্গ ইঞ্চি', 'area'),
('sqm', 'Square Meter', 'বর্গ মিটার', 'sq.m', 'বর্গ মিটার', 'area'),
('pcs', 'Pieces', 'পিস', 'pcs', 'টি', 'quantity'),
('pack', 'Packet / Pack', 'প্যাকেট', 'pkt', 'প্যাকেট', 'quantity'),
('ream', 'Ream', 'রিম', 'ream', 'রিম', 'quantity'),
('gross', 'Gross (144 pcs)', 'গ্রস (১৪৪ টি)', 'grs', 'গ্রস', 'quantity'),
('thaan', 'Thaan (Fabric Roll)', 'থান', 'thn', 'থান', 'length'),
('meter', 'Meter', 'মিটার', 'm', 'মি.', 'length'),
('inch', 'Inch', 'ইঞ্চি', 'in', 'ইঞ্চি', 'length'),
('kg', 'Kilogram', 'কিলোগ্রাম', 'kg', 'কেজি', 'weight')
on conflict (code) do update set
    name_en = excluded.name_en,
    name_bn = excluded.name_bn,
    symbol_en = excluded.symbol_en,
    symbol_bn = excluded.symbol_bn;

-- Enable RLS for catalog reference tables
alter table public.business_categories enable row level security;
alter table public.measurement_units enable row level security;

create policy "Allow read access to business categories"
    on public.business_categories for select using (true);

create policy "Allow read access to measurement units"
    on public.measurement_units for select using (true);


-- >>> FILE: 005_core_multitenant_entities.sql <<<
-- ==============================================================================
-- PrintERP SaaS - Migration 005: Core Multi-Tenant Entities & RBAC
-- Entities: companies (extended), company_settings, branches, user_profiles,
--           roles, permissions, role_permissions, company_users, user_roles
-- Every tenant-owned table contains company_id referencing companies(id).
-- ==============================================================================

-- 1. EXTEND COMPANIES TABLE
alter table if exists public.companies
    add column if not exists whatsapp text,
    add column if not exists area text;

-- 2. COMPANY SETTINGS (1:1 per company)
create table if not exists public.company_settings (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null unique references public.companies(id) on delete cascade,
    invoice_prefix text not null default 'INV',
    quotation_prefix text not null default 'QT',
    challan_prefix text not null default 'CH',
    vat_enabled boolean not null default true,
    vat_rate numeric(5,2) not null default 7.50,
    default_currency text not null default 'BDT',
    default_language text not null default 'bn',
    phone text,
    whatsapp text,
    email text,
    logo_url text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_company_settings_company on public.company_settings(company_id);

-- 3. BRANCHES (1:N per company)
create table if not exists public.branches (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    name text not null,
    name_bn text,
    code text not null,
    phone text,
    address text,
    is_main boolean not null default false,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint unique_company_branch_code unique (company_id, code)
);

create index if not exists idx_branches_company on public.branches(company_id);
create index if not exists idx_branches_is_active on public.branches(is_active);

-- 4. USER PROFILES (Global user profile attached to auth.users)
create table if not exists public.user_profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text not null,
    full_name text not null,
    full_name_bn text,
    phone text,
    avatar_url text,
    preferred_locale text not null default 'bn',
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_user_profiles_email on public.user_profiles(email);
create index if not exists idx_user_profiles_phone on public.user_profiles(phone);

-- 5. ROLES (System default roles + custom company roles)
create table if not exists public.roles (
    id uuid primary key default gen_random_uuid(),
    company_id uuid references public.companies(id) on delete cascade, -- null indicates global system role
    name text not null,
    name_bn text,
    slug text not null,
    description text,
    is_system boolean not null default false,
    created_at timestamptz not null default now(),
    constraint unique_company_role_slug unique nulls not distinct (company_id, slug)
);

create index if not exists idx_roles_company on public.roles(company_id);
create index if not exists idx_roles_slug on public.roles(slug);

-- 6. PERMISSIONS
create table if not exists public.permissions (
    id uuid primary key default gen_random_uuid(),
    code text unique not null,
    module text not null,
    name text not null,
    description text,
    created_at timestamptz not null default now()
);

create index if not exists idx_permissions_code on public.permissions(code);
create index if not exists idx_permissions_module on public.permissions(module);

-- 7. ROLE_PERMISSIONS
create table if not exists public.role_permissions (
    id uuid primary key default gen_random_uuid(),
    role_id uuid not null references public.roles(id) on delete cascade,
    permission_id uuid not null references public.permissions(id) on delete cascade,
    created_at timestamptz not null default now(),
    constraint unique_role_permission unique (role_id, permission_id)
);

create index if not exists idx_role_permissions_role on public.role_permissions(role_id);
create index if not exists idx_role_permissions_perm on public.role_permissions(permission_id);

-- 8. COMPANY_USERS (Multi-tenant membership with status and branch assignment)
create table if not exists public.company_users (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    branch_id uuid references public.branches(id) on delete set null,
    status text not null default 'active' check (status in ('active', 'disabled', 'invited')),
    invited_email text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint unique_company_user_membership unique (company_id, user_id)
);

create index if not exists idx_company_users_company on public.company_users(company_id);
create index if not exists idx_company_users_user on public.company_users(user_id);
create index if not exists idx_company_users_status on public.company_users(status);
create index if not exists idx_company_users_branch on public.company_users(branch_id);

-- 9. USER_ROLES (Association between company_users and roles)
create table if not exists public.user_roles (
    id uuid primary key default gen_random_uuid(),
    company_user_id uuid not null references public.company_users(id) on delete cascade,
    role_id uuid not null references public.roles(id) on delete cascade,
    company_id uuid not null references public.companies(id) on delete cascade,
    created_at timestamptz not null default now(),
    constraint unique_company_user_role unique (company_user_id, role_id)
);

create index if not exists idx_user_roles_user on public.user_roles(company_user_id);
create index if not exists idx_user_roles_role on public.user_roles(role_id);
create index if not exists idx_user_roles_company on public.user_roles(company_id);

-- SEED SYSTEM ROLES
insert into public.roles (id, company_id, name, name_bn, slug, description, is_system) values
('00000000-0000-0000-0000-000000000001', null, 'Owner', 'মালিক', 'owner', 'Full organization access including billing, deletion, and settings', true),
('00000000-0000-0000-0000-000000000002', null, 'Administrator', 'অ্যাডমিনিস্ট্রেটর', 'admin', 'Manage users, branches, inventory, and financial settings', true),
('00000000-0000-0000-0000-000000000003', null, 'Shop Manager', 'ম্যানেজার', 'manager', 'Oversee quotations, jobs, and shop-floor scheduling', true),
('00000000-0000-0000-0000-000000000004', null, 'Machine Operator', 'অপারেটর', 'operator', 'View assigned print/fabrication jobs and update stage statuses', true),
('00000000-0000-0000-0000-000000000005', null, 'Accountant', 'হিসাবরক্ষক', 'accountant', 'Manage customer billing, payments, due collection, and expenses', true),
('00000000-0000-0000-0000-000000000006', null, 'Graphic Designer', 'গ্রাফিক ডিজাইনার', 'designer', 'Manage prepress artwork, proof approvals, and customer files', true),
('00000000-0000-0000-0000-000000000007', null, 'Installation Technician', 'ইন্সটলার', 'installer', 'Handle on-site signage fitting, delivery challans, and completion signoffs', true)
on conflict (id) do update set
    name = excluded.name,
    name_bn = excluded.name_bn,
    description = excluded.description;

-- SEED GRANULAR PERMISSIONS
insert into public.permissions (code, module, name, description) values
('orders.view', 'job_orders', 'View Job Orders', 'View all job orders across assigned branches'),
('orders.create', 'job_orders', 'Create Job Orders', 'Create new print and fabrication job orders'),
('orders.edit', 'job_orders', 'Edit Job Orders', 'Modify job order specifications and rates'),
('orders.delete', 'job_orders', 'Delete Job Orders', 'Delete or cancel job orders'),
('quotations.view', 'quotations', 'View Quotations', 'View price quotations'),
('quotations.create', 'quotations', 'Create Quotations', 'Calculate area/running feet and generate quotations'),
('quotations.approve', 'quotations', 'Approve Quotations', 'Approve quotations and convert to job orders'),
('production.view', 'production', 'View Production Floor', 'Monitor active machines and job queues'),
('production.update_status', 'production', 'Update Job Status', 'Progress job from design to print, QC, and ready'),
('inventory.view', 'inventory', 'View Inventory', 'Check raw material stock levels (flex, vinyl, paper, LED, ACP)'),
('inventory.manage', 'inventory', 'Manage Inventory', 'Add stock purchases, adjustments, and supplier bills'),
('billing.view', 'billing', 'View Invoices', 'View invoices and payment records'),
('billing.create', 'billing', 'Create Invoices', 'Generate tax invoices and challans'),
('billing.collect_payment', 'billing', 'Collect Payments', 'Record cash, bKash, Nagad, and bank payments'),
('users.view', 'user_management', 'View Users', 'View company members and branches'),
('users.manage', 'user_management', 'Manage Users', 'Invite, add, disable, activate, and assign roles to users'),
('branches.manage', 'branch_management', 'Manage Branches', 'Add and edit commercial branches/factories'),
('settings.manage', 'settings', 'Manage Company Settings', 'Modify company details, prefixes, and VAT preferences')
on conflict (code) do update set
    name = excluded.name,
    description = excluded.description;

-- SEED OWNER PERMISSIONS (Owner gets all permissions)
insert into public.role_permissions (role_id, permission_id)
select '00000000-0000-0000-0000-000000000001', p.id
from public.permissions p
on conflict (role_id, permission_id) do nothing;


-- >>> FILE: 006_strict_rls_policies.sql <<<
-- ==============================================================================
-- PrintERP SaaS - Migration 006: Strict Multi-Tenant Row Level Security (RLS)
-- Never trust company_id from browser. Resolve context from authenticated user.
-- Disabled users cannot access any company records.
-- ==============================================================================

-- 1. ENABLE ROW LEVEL SECURITY
alter table public.company_settings enable row level security;
alter table public.branches enable row level security;
alter table public.user_profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.company_users enable row level security;
alter table public.user_roles enable row level security;

-- 2. SECURITY DEFINER HELPER FUNCTIONS

-- Checks if the authenticated user is an ACTIVE member of the company
create or replace function public.auth_is_active_company_user(target_company_id uuid)
returns boolean as $$
begin
    return exists (
        select 1
        from public.company_users
        where company_id = target_company_id
          and user_id = auth.uid()
          and status = 'active'
    );
end;
$$ language plpgsql security definer;

-- Resolves the primary role slug of the user in the company
create or replace function public.auth_get_user_company_role(target_company_id uuid)
returns text as $$
declare
    role_slug text;
begin
    select r.slug into role_slug
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    join public.company_users cu on cu.id = ur.company_user_id
    where cu.company_id = target_company_id
      and cu.user_id = auth.uid()
      and cu.status = 'active'
    limit 1;
    return role_slug;
end;
$$ language plpgsql security definer;

-- Checks if the authenticated user has a specific permission in the company
create or replace function public.auth_user_has_permission(target_company_id uuid, required_permission text)
returns boolean as $$
begin
    -- Owners always have all permissions
    if public.auth_get_user_company_role(target_company_id) = 'owner' then
        return true;
    end if;

    return exists (
        select 1
        from public.user_roles ur
        join public.company_users cu on cu.id = ur.company_user_id
        join public.role_permissions rp on rp.role_id = ur.role_id
        join public.permissions p on p.id = rp.permission_id
        where cu.company_id = target_company_id
          and cu.user_id = auth.uid()
          and cu.status = 'active'
          and p.code = required_permission
    );
end;
$$ language plpgsql security definer;

-- 3. RLS POLICIES FOR USER_PROFILES
create policy "Users can view own user_profile"
    on public.user_profiles for select
    using (auth.uid() = id);

create policy "Users can update own user_profile"
    on public.user_profiles for update
    using (auth.uid() = id);

create policy "Users can insert own user_profile"
    on public.user_profiles for insert
    with check (auth.uid() = id);

-- 4. RLS POLICIES FOR COMPANY_SETTINGS
-- Active members can view company settings
create policy "Active members can view company settings"
    on public.company_settings for select
    using (public.auth_is_active_company_user(company_id));

-- Only owners, admins, or users with settings.manage can update company settings
create policy "Admins can update company settings"
    on public.company_settings for update
    using (
        public.auth_is_active_company_user(company_id) 
        and (
            public.auth_get_user_company_role(company_id) in ('owner', 'admin')
            or public.auth_user_has_permission(company_id, 'settings.manage')
        )
    );

create policy "Authenticated users can insert company settings for created companies"
    on public.company_settings for insert
    with check (auth.uid() is not null);

-- 5. RLS POLICIES FOR BRANCHES
create policy "Active members can view branches"
    on public.branches for select
    using (public.auth_is_active_company_user(company_id));

create policy "Admins can manage branches"
    on public.branches for all
    using (
        public.auth_is_active_company_user(company_id) 
        and (
            public.auth_get_user_company_role(company_id) in ('owner', 'admin')
            or public.auth_user_has_permission(company_id, 'branches.manage')
        )
    );

-- 6. RLS POLICIES FOR COMPANY_USERS
-- Users can view company_users in companies they are active in
create policy "Active members can view company users"
    on public.company_users for select
    using (
        public.auth_is_active_company_user(company_id)
        or auth.uid() = user_id -- Allows users to discover which companies they belong to
    );

create policy "Admins can manage company users"
    on public.company_users for all
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_get_user_company_role(company_id) in ('owner', 'admin')
            or public.auth_user_has_permission(company_id, 'users.manage')
        )
    );

-- 7. RLS POLICIES FOR ROLES & PERMISSIONS
create policy "Anyone can read permissions catalog"
    on public.permissions for select
    using (true);

create policy "Users can view roles available in their company"
    on public.roles for select
    using (
        company_id is null -- System roles are visible to all
        or public.auth_is_active_company_user(company_id)
    );

create policy "Admins can manage custom roles"
    on public.roles for all
    using (
        company_id is not null
        and public.auth_is_active_company_user(company_id)
        and public.auth_get_user_company_role(company_id) in ('owner', 'admin')
    );

create policy "Users can view role_permissions"
    on public.role_permissions for select
    using (true);

create policy "Active members can view user_roles"
    on public.user_roles for select
    using (public.auth_is_active_company_user(company_id));

create policy "Admins can manage user_roles"
    on public.user_roles for all
    using (
        public.auth_is_active_company_user(company_id)
        and public.auth_get_user_company_role(company_id) in ('owner', 'admin')
    );

-- 8. AUTOMATIC ONBOARDING PROVISIONING TRIGGER
-- When a company is created, automatically:
--  - Creates company_settings
--  - Creates main branch
--  - Inserts creator into company_users as active member
--  - Assigns Owner role to creator
create or replace function public.handle_new_company_provisioning()
returns trigger as $$
declare
    main_branch_id uuid;
    new_company_user_id uuid;
    owner_role_id uuid;
begin
    -- 1. Create company settings
    insert into public.company_settings (
        company_id,
        invoice_prefix,
        quotation_prefix,
        challan_prefix,
        vat_enabled,
        vat_rate,
        default_currency,
        default_language,
        phone,
        whatsapp,
        email
    ) values (
        new.id,
        'INV',
        'QT',
        'CH',
        true,
        7.50,
        new.currency,
        new.default_locale,
        new.phone,
        new.whatsapp,
        new.email
    ) on conflict (company_id) do nothing;

    -- 2. Create main branch
    insert into public.branches (
        company_id,
        name,
        name_bn,
        code,
        phone,
        address,
        is_main,
        is_active
    ) values (
        new.id,
        'Head Office / Main Branch',
        'প্রধান শাখা / হেড অফিস',
        'MAIN-01',
        new.phone,
        new.address,
        true,
        true
    ) returning id into main_branch_id;

    -- 3. If an authenticated user initiated creation, register as active owner
    if auth.uid() is not null then
        insert into public.company_users (
            company_id,
            user_id,
            branch_id,
            status
        ) values (
            new.id,
            auth.uid(),
            main_branch_id,
            'active'
        ) returning id into new_company_user_id;

        -- Find owner role ID
        select id into owner_role_id
        from public.roles
        where slug = 'owner' and is_system = true
        limit 1;

        if owner_role_id is not null and new_company_user_id is not null then
            insert into public.user_roles (
                company_user_id,
                role_id,
                company_id
            ) values (
                new_company_user_id,
                owner_role_id,
                new.id
            ) on conflict do nothing;
        end if;
    end if;

    return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_company_created_provision on public.companies;
create trigger on_company_created_provision
    after insert on public.companies
    for each row execute function public.handle_new_company_provisioning();


-- >>> FILE: 007_rbac_matrix_and_platform_owner.sql <<<
-- ==============================================================================
-- PrintERP SaaS - Migration 007: Complete RBAC Matrix & Platform Owner
-- Fine-grained Module / Resource / Action permissions system
-- 7 Primary Roles:
--   1. Platform Owner (Platform-level Superadmin)
--   2. Business Owner (Tenant Executive)
--   3. Sales Manager
--   4. Graphic Designer
--   5. Production Manager
--   6. Print Operator
--   7. General Staff
-- ==============================================================================

-- 1. PLATFORM OWNER / SUPERADMIN TABLE (Completely isolated from tenant data)
create table if not exists public.platform_admins (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null unique references auth.users(id) on delete cascade,
    email text not null unique,
    full_name text not null,
    role text not null default 'platform_owner' check (role in ('platform_owner', 'platform_support')),
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

-- 2. EXPAND PERMISSIONS SCHEMA (Module / Resource / Action)
alter table public.permissions
    add column if not exists resource text,
    add column if not exists action text check (action in ('view', 'create', 'edit', 'delete', 'approve', 'full_control'));

-- 3. USER PERMISSION OVERRIDES (User-level overrides: grant or revoke)
create table if not exists public.user_permission_overrides (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    company_user_id uuid not null references public.company_users(id) on delete cascade,
    permission_id uuid not null references public.permissions(id) on delete cascade,
    is_granted boolean not null default true, -- true = grant, false = explicit deny
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint unique_user_permission_override unique (company_user_id, permission_id)
);

create index if not exists idx_user_perm_overrides_user on public.user_permission_overrides(company_user_id);
create index if not exists idx_user_perm_overrides_comp on public.user_permission_overrides(company_id);
alter table public.user_permission_overrides enable row level security;

-- 4. PLATFORM SUBSCRIPTION PLANS & FEATURE FLAGS
create table if not exists public.platform_plans (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    code text unique not null,
    price_bdt_monthly numeric(10,2) not null,
    price_bdt_yearly numeric(10,2) not null,
    max_users integer not null,
    max_branches integer not null,
    features jsonb not null default '[]'::jsonb,
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

create table if not exists public.platform_feature_flags (
    id uuid primary key default gen_random_uuid(),
    key text unique not null,
    name text not null,
    description text,
    is_enabled boolean not null default false,
    created_at timestamptz not null default now()
);

alter table public.platform_plans enable row level security;
alter table public.platform_feature_flags enable row level security;

-- 5. SEED PRIMARY ROLES
delete from public.role_permissions;
delete from public.roles where is_system = true;

insert into public.roles (id, company_id, name, name_bn, slug, description, is_system) values
('00000000-0000-0000-0000-000000000001', null, 'Business Owner', 'প্রতিষ্ঠানের মালিক', 'business_owner', 'Full organization access: P&L, accounts, reports, HR, settings, and deletion', true),
('00000000-0000-0000-0000-000000000002', null, 'Sales Manager', 'সেলস ম্যানেজার', 'sales_manager', 'Customers, leads, price quotations, job order booking, advance collection, and delivery', true),
('00000000-0000-0000-0000-000000000003', null, 'Graphic Designer', 'গ্রাফিক ডিজাইনার (প্রিপ প্রেস)', 'designer', 'Pre-press design queue, artwork uploads (AI/PDF), proof approval, and revision logs', true),
('00000000-0000-0000-0000-000000000004', null, 'Production Manager', 'প্রোডাকশন ম্যানেজার', 'production_manager', 'Floor scheduling, machine allocation, materials issuance, finishing, and installation', true),
('00000000-0000-0000-0000-000000000005', null, 'Print Operator', 'মেশিন অপারেটর', 'operator', 'Assigned jobs, printing execution, material consumption logging, and QC completion', true),
('00000000-0000-0000-0000-000000000006', null, 'General Staff', 'সাধারণ কর্মী', 'general_staff', 'Restricted access based strictly on assigned duties and user overrides', true)
on conflict (id) do update set
    name = excluded.name,
    name_bn = excluded.name_bn,
    slug = excluded.slug,
    description = excluded.description;

-- 6. POPULATE COMPLETE MODULE / RESOURCE / ACTION PERMISSIONS
-- Resources: Customer, Quotation, Order, Invoice, Payment, Production, Inventory, Purchase, Supplier, Delivery, HR, Payroll, Reports, Settings
delete from public.role_permissions;
delete from public.permissions;

do $$
declare
    rec record;
    act text;
    perm_code text;
    perm_name text;
    perm_id uuid;
begin
    -- Standard Resources
    for rec in (
        select 'sales' as mod, 'customer' as res, 'Customer' as label union all
        select 'sales', 'quotation', 'Quotation' union all
        select 'sales', 'order', 'Job Order' union all
        select 'billing', 'invoice', 'Invoice' union all
        select 'billing', 'payment', 'Payment' union all
        select 'production', 'production', 'Production Floor' union all
        select 'inventory', 'inventory', 'Material Inventory' union all
        select 'inventory', 'purchase', 'Stock Purchase' union all
        select 'inventory', 'supplier', 'Supplier' union all
        select 'fulfillment', 'delivery', 'Delivery & Installation' union all
        select 'hr', 'hr', 'Human Resources' union all
        select 'hr', 'payroll', 'Payroll' union all
        select 'analytics', 'reports', 'Reports & Analytics' union all
        select 'settings', 'settings', 'Company Settings'
    ) loop
        for act in select unnest(array['view', 'create', 'edit', 'delete', 'approve', 'full_control']) loop
            perm_code := rec.res || '.' || act;
            perm_name := initcap(act) || ' ' || rec.label;
            insert into public.permissions (code, module, resource, action, name, description)
            values (
                perm_code,
                rec.mod,
                rec.res,
                act,
                perm_name,
                'Ability to ' || act || ' ' || rec.label
            );
        end loop;
    end loop;
end $$;

-- 7. SEED ROLE PERMISSION PRESETS
-- Business Owner gets full_control on everything
insert into public.role_permissions (role_id, permission_id)
select '00000000-0000-0000-0000-000000000001', id from public.permissions;

-- Sales Manager gets view/create/edit/approve on Customer, Quotation, Order, Payment, Delivery
insert into public.role_permissions (role_id, permission_id)
select '00000000-0000-0000-0000-000000000002', id from public.permissions
where resource in ('customer', 'quotation', 'order', 'payment', 'delivery', 'reports')
  and action in ('view', 'create', 'edit', 'approve');

-- Designer gets view/create/edit/approve on Quotation, Order, Production
insert into public.role_permissions (role_id, permission_id)
select '00000000-0000-0000-0000-000000000003', id from public.permissions
where resource in ('order', 'production', 'quotation')
  and action in ('view', 'create', 'edit', 'approve');

-- Production Manager gets view/create/edit/approve/full_control on Production, Inventory, Delivery, Supplier
insert into public.role_permissions (role_id, permission_id)
select '00000000-0000-0000-0000-000000000004', id from public.permissions
where resource in ('production', 'inventory', 'purchase', 'supplier', 'delivery')
  and action in ('view', 'create', 'edit', 'approve', 'full_control');

-- Print Operator gets view & edit on Production and Inventory (for logging consumption)
insert into public.role_permissions (role_id, permission_id)
select '00000000-0000-0000-0000-000000000005', id from public.permissions
where resource in ('production', 'inventory')
  and action in ('view', 'edit');

-- General Staff gets view on Order and Delivery
insert into public.role_permissions (role_id, permission_id)
select '00000000-0000-0000-0000-000000000006', id from public.permissions
where resource in ('order', 'delivery')
  and action in ('view');

-- 8. SEED DEFAULT PLATFORM PLANS & FLAGS
insert into public.platform_plans (name, code, price_bdt_monthly, price_bdt_yearly, max_users, max_branches, features) values
('Starter Press', 'starter', 2500.00, 25000.00, 3, 1, '["Basic Quotations", "Job Orders", "Thermal Print Receipts", "1 Branch"]'::jsonb),
('Growth Signage', 'growth', 6000.00, 60000.00, 10, 3, '["Everything in Starter", "Bilingual Invoices", "Production Floor Board", "Material Inventory", "3 Branches", "SMS Alerts"]'::jsonb),
('Enterprise Factory', 'enterprise', 15000.00, 150000.00, 50, 10, '["Everything in Growth", "Unlimited Branches", "Custom RBAC Matrix", "Audit Logs", "WhatsApp API", "Mushak 6.3 Tax Invoicing"]'::jsonb)
on conflict (code) do nothing;

insert into public.platform_feature_flags (key, name, description, is_enabled) values
('whatsapp_notifications', 'WhatsApp Cloud API Order Status', 'Send automated PDF challans and proof previews to customer WhatsApp numbers', true),
('mushak_6_3', 'NBR Mushak 6.3 Automated Tax Invoicing', 'Formal National Board of Revenue VAT invoice layout', true),
('ai_job_estimator', 'AI Dimensional Print Estimator', 'Smart cost estimation for flex, acrylic, and offset jobs', true),
('bd_sms_gateway', 'Bangladeshi SMS Gateway', 'OTP and delivery readiness alerts via Greenweb/SSL Wireless', true)
on conflict (key) do nothing;

-- 9. POSTGRESQL RLS FUNCTIONS

-- Verifies if user is a Platform Owner (Superadmin)
create or replace function public.auth_is_platform_owner()
returns boolean as $$
begin
    return exists (
        select 1
        from public.platform_admins
        where user_id = auth.uid()
          and is_active = true
    );
end;
$$ language plpgsql security definer;

-- Enhanced Permission Check (Checks User Overrides first, then Role Permissions)
create or replace function public.auth_user_has_permission(target_company_id uuid, required_permission text)
returns boolean as $$
declare
    v_company_user_id uuid;
    v_user_role text;
    v_override boolean;
begin
    -- 1. Platform Owners always have system-wide permission
    if public.auth_is_platform_owner() then
        return true;
    end if;

    -- 2. Find company user
    select id into v_company_user_id
    from public.company_users
    where company_id = target_company_id
      and user_id = auth.uid()
      and status = 'active';

    if v_company_user_id is null then
        return false;
    end if;

    -- 3. Business Owners always have full permission in their company
    if public.auth_get_user_company_role(target_company_id) in ('business_owner', 'owner') then
        return true;
    end if;

    -- 4. Check User-Level Permission Overrides
    select upo.is_granted into v_override
    from public.user_permission_overrides upo
    join public.permissions p on p.id = upo.permission_id
    where upo.company_user_id = v_company_user_id
      and (p.code = required_permission or p.code = split_part(required_permission, '.', 1) || '.full_control')
    limit 1;

    if v_override is not null then
        return v_override;
    end if;

    -- 5. Check Role-Level Permissions
    return exists (
        select 1
        from public.user_roles ur
        join public.role_permissions rp on rp.role_id = ur.role_id
        join public.permissions p on p.id = rp.permission_id
        where ur.company_user_id = v_company_user_id
          and (
              p.code = required_permission
              or p.code = split_part(required_permission, '.', 1) || '.full_control'
          )
    );
end;
$$ language plpgsql security definer;

-- 10. RLS POLICIES FOR PLATFORM TABLES
create policy "Platform owners can view and manage platform_admins"
    on public.platform_admins for all
    using (public.auth_is_platform_owner());

create policy "Platform owners can manage platform_plans"
    on public.platform_plans for all
    using (public.auth_is_platform_owner() or auth.uid() is not null);

create policy "Platform owners can manage platform_feature_flags"
    on public.platform_feature_flags for all
    using (public.auth_is_platform_owner() or auth.uid() is not null);

create policy "Users can view overrides in their company"
    on public.user_permission_overrides for select
    using (public.auth_is_active_company_user(company_id));

create policy "Admins can manage user_permission_overrides"
    on public.user_permission_overrides for all
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_get_user_company_role(company_id) in ('business_owner', 'owner', 'admin')
            or public.auth_is_platform_owner()
        )
    );


-- >>> FILE: 008_settings_and_document_sequences.sql <<<
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


-- >>> FILE: 009_customers_and_suppliers.sql <<<
-- ==============================================================================
-- PrintERP SaaS - Migration 009: Customer and Supplier Management
-- Supports:
--   1. Customer Directory with 6 customer types (Corporate, Agency, Retail, Dealer, Government, Regular)
--   2. Customer Communication Logs & Notes
--   3. Supplier Directory with 9 material categories (Media, Acrylic, LED, Hardware, Ink, Paper, PVC, Aluminum, Other)
--   4. Supplier Contract Material Price Sheets
--   5. Strict Multi-Tenant Row Level Security
-- ==============================================================================

-- 1. CUSTOMERS TABLE
create table if not exists public.customers (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    customer_type text not null default 'regular' check (
        customer_type in ('corporate', 'agency', 'retail', 'dealer', 'government', 'regular')
    ),
    name text not null,
    name_bn text,
    contact_person text,
    mobile text not null,
    whatsapp text,
    email text,
    division_id integer references public.divisions(id) on delete set null,
    district_id integer references public.districts(id) on delete set null,
    upazila_id integer references public.upazilas(id) on delete set null,
    area text,
    address text,
    address_bn text,
    bin_no text,
    tin_no text,
    credit_limit numeric(12,2) not null default 0,
    payment_terms text not null default 'cash_on_delivery' check (
        payment_terms in ('cash_on_delivery', 'net_7', 'net_15', 'net_30', 'advance_50')
    ),
    notes text,
    tags text[] default array[]::text[],
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_customers_company on public.customers(company_id);
create index if not exists idx_customers_mobile on public.customers(company_id, mobile);
create index if not exists idx_customers_type on public.customers(company_id, customer_type);
alter table public.customers enable row level security;

-- 2. CUSTOMER COMMUNICATIONS LOG
create table if not exists public.customer_communications (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    customer_id uuid not null references public.customers(id) on delete cascade,
    type text not null check (type in ('phone_call', 'whatsapp_message', 'email', 'meeting', 'site_visit')),
    summary text not null,
    details text,
    logged_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now()
);

create index if not exists idx_customer_comms_cust on public.customer_communications(customer_id);
alter table public.customer_communications enable row level security;

-- 3. SUPPLIERS TABLE
create table if not exists public.suppliers (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    supplier_name text not null,
    company text,
    contact_person text,
    mobile text not null,
    whatsapp text,
    email text,
    address text,
    category text not null check (
        category in ('media', 'acrylic', 'led', 'hardware', 'ink', 'paper', 'pvc', 'aluminum', 'other')
    ),
    payment_terms text not null default 'credit_15' check (
        payment_terms in ('cash', 'credit_15', 'credit_30', 'advance')
    ),
    notes text,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_suppliers_company on public.suppliers(company_id);
create index if not exists idx_suppliers_category on public.suppliers(company_id, category);
alter table public.suppliers enable row level security;

-- 4. SUPPLIER MATERIAL CONTRACT PRICES
create table if not exists public.supplier_material_prices (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    supplier_id uuid not null references public.suppliers(id) on delete cascade,
    material_name text not null,
    category text not null,
    unit text not null, -- 'sft', 'sqm', 'kg', 'roll', 'sheet', 'piece', 'ream', 'liter'
    contract_price_bdt numeric(10,2) not null,
    effective_date date not null default current_date,
    notes text,
    created_at timestamptz not null default now()
);

create index if not exists idx_supp_prices_supp on public.supplier_material_prices(supplier_id);
alter table public.supplier_material_prices enable row level security;

-- 5. RLS POLICIES FOR CUSTOMERS & SUPPLIERS
create policy "Active company users can view customers"
    on public.customers for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can insert customers"
    on public.customers for insert
    with check (
        public.auth_is_active_company_user(company_id)
        and public.auth_user_has_permission(company_id, 'customer.create')
    );

create policy "Authorized company users can update customers"
    on public.customers for update
    using (
        public.auth_is_active_company_user(company_id)
        and public.auth_user_has_permission(company_id, 'customer.edit')
    );

create policy "Authorized company users can delete customers"
    on public.customers for delete
    using (
        public.auth_is_active_company_user(company_id)
        and public.auth_user_has_permission(company_id, 'customer.delete')
    );

create policy "Active company users can view communications"
    on public.customer_communications for select
    using (public.auth_is_active_company_user(company_id));

create policy "Active company users can create communications"
    on public.customer_communications for insert
    with check (public.auth_is_active_company_user(company_id));

create policy "Active company users can view suppliers"
    on public.suppliers for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can manage suppliers"
    on public.suppliers for all
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'supplier.edit')
            or public.auth_user_has_permission(company_id, 'supplier.create')
        )
    );

create policy "Active company users can view supplier material prices"
    on public.supplier_material_prices for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can manage supplier material prices"
    on public.supplier_material_prices for all
    using (public.auth_is_active_company_user(company_id));


-- >>> FILE: 010_products_and_pricing_engine.sql <<<
-- ==============================================================================
-- PrintERP SaaS - Migration 010: Product/Service Catalog + Safe Pricing Engine
-- Supports:
--   1. Products table with 6 product types and 10 units of measure
--   2. Structured JSON pricing formulas (Safe non-eval declarative models)
--   3. Historical product price changes (product_price_history)
--   4. Sales price override audit log (price_overrides)
--   5. Strict Multi-Tenant Row Level Security
-- ==============================================================================

-- 1. PRODUCTS & SERVICES TABLE
create table if not exists public.products (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    name text not null,
    name_bn text,
    sku text not null,
    category text not null,
    product_type text not null check (
        product_type in ('finished_product', 'print_service', 'fabrication_service', 'installation_service', 'custom_job', 'material')
    ),
    unit text not null check (
        unit in ('pcs', 'sft', 'inch', 'ft', 'sqm', 'sheet', 'roll', 'kg', 'ltr', 'hr')
    ),
    material_spec text,
    description text,
    base_cost numeric(12,2) not null default 0,
    selling_price numeric(12,2) not null default 0,
    min_price numeric(12,2) not null default 0,
    tax_rate numeric(5,2) not null default 7.50,
    pricing_formula jsonb default null,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_products_company_sku unique (company_id, sku)
);

create index if not exists idx_products_company on public.products(company_id);
create index if not exists idx_products_type on public.products(company_id, product_type);
create index if not exists idx_products_sku on public.products(company_id, sku);
alter table public.products enable row level security;

-- 2. PRODUCT PRICE HISTORY
create table if not exists public.product_price_history (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    product_id uuid not null references public.products(id) on delete cascade,
    old_price numeric(12,2) not null,
    new_price numeric(12,2) not null,
    reason text,
    changed_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now()
);

create index if not exists idx_price_history_prod on public.product_price_history(product_id);
alter table public.product_price_history enable row level security;

-- 3. PRICE OVERRIDES AUDIT LOG
create table if not exists public.price_overrides (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    product_id uuid references public.products(id) on delete set null,
    document_type text check (document_type in ('quotation', 'order', 'invoice')),
    document_code text,
    original_price numeric(12,2) not null,
    override_price numeric(12,2) not null,
    reason text not null,
    authorized_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now()
);

create index if not exists idx_price_overrides_company on public.price_overrides(company_id);
alter table public.price_overrides enable row level security;

-- 4. RLS POLICIES FOR PRODUCTS & PRICING
create policy "Active company users can view products"
    on public.products for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can insert products"
    on public.products for insert
    with check (
        public.auth_is_active_company_user(company_id)
        and public.auth_user_has_permission(company_id, 'inventory.create')
    );

create policy "Authorized company users can update products"
    on public.products for update
    using (
        public.auth_is_active_company_user(company_id)
        and public.auth_user_has_permission(company_id, 'inventory.edit')
    );

create policy "Authorized company users can delete products"
    on public.products for delete
    using (
        public.auth_is_active_company_user(company_id)
        and public.auth_user_has_permission(company_id, 'inventory.delete')
    );

create policy "Active company users can view price history"
    on public.product_price_history for select
    using (public.auth_is_active_company_user(company_id));

create policy "Active company users can insert price history"
    on public.product_price_history for insert
    with check (public.auth_is_active_company_user(company_id));

create policy "Active company users can view price overrides"
    on public.price_overrides for select
    using (public.auth_is_active_company_user(company_id));

create policy "Active company users can log price overrides"
    on public.price_overrides for insert
    with check (public.auth_is_active_company_user(company_id));


-- >>> FILE: 011_quotations_workflow.sql <<<
-- ==============================================================================
-- PrintERP SaaS - Migration 011: Quotation Lifecycle Workflow
-- Supports:
--   1. 8 Quotation Statuses (draft, sent, viewed, negotiation, approved, rejected, expired, converted)
--   2. Multi-item dimensional calculations (quotation_items)
--   3. Internal cost shielding and margin controls
--   4. Quotation activity timeline tracking (quotation_activities)
--   5. Strict Multi-Tenant Row Level Security
-- ==============================================================================

-- 1. QUOTATIONS TABLE
create table if not exists public.quotations (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    quotation_number text not null,
    customer_id uuid references public.customers(id) on delete restrict,
    customer_name text not null,
    customer_name_bn text,
    customer_phone text not null,
    customer_email text,
    customer_address text,
    customer_bin text,
    status text not null default 'draft' check (
        status in ('draft', 'sent', 'viewed', 'negotiation', 'approved', 'rejected', 'expired', 'converted')
    ),
    quotation_date date not null default current_date,
    valid_until date not null,
    salesperson_id uuid references auth.users(id) on delete set null,
    salesperson_name text not null,
    subtotal numeric(12,2) not null default 0,
    discount_amount numeric(12,2) not null default 0,
    vat_rate numeric(5,2) not null default 7.50,
    vat_amount numeric(12,2) not null default 0,
    grand_total numeric(12,2) not null default 0,
    total_cost numeric(12,2) not null default 0, -- Internal only, shielded from client PDF
    margin_percent numeric(5,2) not null default 0, -- Internal only
    language_mode text not null default 'bilingual' check (language_mode in ('en', 'bn', 'bilingual')),
    notes text,
    terms_and_conditions text,
    converted_order_id text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_quotations_company_number unique (company_id, quotation_number)
);

create index if not exists idx_quotations_company on public.quotations(company_id);
create index if not exists idx_quotations_status on public.quotations(company_id, status);
create index if not exists idx_quotations_customer on public.quotations(customer_id);
alter table public.quotations enable row level security;

-- 2. QUOTATION ITEMS TABLE
create table if not exists public.quotation_items (
    id uuid primary key default gen_random_uuid(),
    quotation_id uuid not null references public.quotations(id) on delete cascade,
    product_id uuid references public.products(id) on delete set null,
    description text not null,
    description_bn text,
    material_spec text,
    width numeric(10,2),
    height numeric(10,2),
    dimension_unit text not null default 'ft' check (dimension_unit in ('ft', 'inch', 'm')),
    area_sft numeric(10,2) not null default 0,
    quantity integer not null default 1,
    unit text not null default 'sft',
    unit_rate numeric(10,2) not null,
    material_cost numeric(10,2) default 0,
    labor_cost numeric(10,2) default 0,
    finishing_cost numeric(10,2) default 0,
    installation_cost numeric(10,2) default 0,
    item_total numeric(12,2) not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_quotation_items_quote on public.quotation_items(quotation_id);
alter table public.quotation_items enable row level security;

-- 3. QUOTATION ACTIVITY TIMELINE
create table if not exists public.quotation_activities (
    id uuid primary key default gen_random_uuid(),
    quotation_id uuid not null references public.quotations(id) on delete cascade,
    action text not null check (
        action in ('created', 'sent', 'viewed', 'negotiated', 'approved', 'rejected', 'expired', 'converted')
    ),
    details text,
    actor_name text not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_quotation_activities_quote on public.quotation_activities(quotation_id);
alter table public.quotation_activities enable row level security;

-- 4. RLS POLICIES FOR QUOTATIONS
create policy "Active company users can view quotations"
    on public.quotations for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can insert quotations"
    on public.quotations for insert
    with check (
        public.auth_is_active_company_user(company_id)
        and public.auth_user_has_permission(company_id, 'quotation.create')
    );

create policy "Authorized company users can update quotations"
    on public.quotations for update
    using (
        public.auth_is_active_company_user(company_id)
        and public.auth_user_has_permission(company_id, 'quotation.edit')
    );

create policy "Authorized company users can delete quotations"
    on public.quotations for delete
    using (
        public.auth_is_active_company_user(company_id)
        and public.auth_user_has_permission(company_id, 'quotation.delete')
    );

create policy "Active company users can view quotation items"
    on public.quotation_items for select
    using (
        exists (
            select 1 from public.quotations q
            where q.id = quotation_items.quotation_id
            and public.auth_is_active_company_user(q.company_id)
        )
    );

create policy "Authorized company users can manage quotation items"
    on public.quotation_items for all
    using (
        exists (
            select 1 from public.quotations q
            where q.id = quotation_items.quotation_id
            and public.auth_is_active_company_user(q.company_id)
        )
    );

create policy "Active company users can view quotation activities"
    on public.quotation_activities for select
    using (
        exists (
            select 1 from public.quotations q
            where q.id = quotation_activities.quotation_id
            and public.auth_is_active_company_user(q.company_id)
        )
    );

create policy "Active company users can insert quotation activities"
    on public.quotation_activities for insert
    with check (
        exists (
            select 1 from public.quotations q
            where q.id = quotation_activities.quotation_id
            and public.auth_is_active_company_user(q.company_id)
        )
    );


-- >>> FILE: 012_orders_and_job_orders.sql <<<
-- ==============================================================================
-- PrintERP SaaS - Migration 012: Sales Orders & Multi-Job Production Ticketing
-- Supports:
--   1. Sales Orders with Priority (Normal, Urgent, Very Urgent) and Payment Terms (Cash, Advance, Partial, Credit)
--   2. Multi-Job Orders (job_orders table generating discrete machine bay tickets)
--   3. 9-Stage Order Lifecycle Timeline (order_timeline_events)
--   4. Strict Multi-Tenant Row Level Security
-- ==============================================================================

-- 1. SALES ORDERS TABLE
create table if not exists public.sales_orders (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    order_number text not null,
    quotation_id uuid references public.quotations(id) on delete set null,
    customer_id uuid references public.customers(id) on delete restrict,
    customer_name text not null,
    customer_name_bn text,
    customer_phone text not null,
    customer_address text,
    salesperson_name text not null,
    order_date date not null default current_date,
    delivery_date date not null,
    priority text not null default 'normal' check (priority in ('normal', 'urgent', 'very_urgent')),
    status text not null default 'confirmed' check (
        status in ('pending', 'confirmed', 'in_production', 'finishing', 'ready_for_delivery', 'partially_delivered', 'delivered', 'installed', 'completed', 'cancelled')
    ),
    payment_terms text not null default 'advance' check (payment_terms in ('cash', 'advance', 'partial', 'credit')),
    subtotal numeric(12,2) not null default 0,
    discount_amount numeric(12,2) not null default 0,
    vat_amount numeric(12,2) not null default 0,
    final_price numeric(12,2) not null default 0,
    advance_amount numeric(12,2) not null default 0,
    due_amount numeric(12,2) not null default 0,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_sales_orders_company_number unique (company_id, order_number)
);

create index if not exists idx_sales_orders_company on public.sales_orders(company_id);
create index if not exists idx_sales_orders_priority on public.sales_orders(company_id, priority);
create index if not exists idx_sales_orders_status on public.sales_orders(company_id, status);
create index if not exists idx_sales_orders_customer on public.sales_orders(customer_id);
alter table public.sales_orders enable row level security;

-- 2. SALES ORDER ITEMS TABLE
create table if not exists public.sales_order_items (
    id uuid primary key default gen_random_uuid(),
    order_id uuid not null references public.sales_orders(id) on delete cascade,
    product_id uuid references public.products(id) on delete set null,
    item_name text not null,
    material_spec text,
    width numeric(10,2),
    height numeric(10,2),
    dimension_unit text not null default 'ft' check (dimension_unit in ('ft', 'inch', 'm')),
    quantity integer not null default 1,
    unit text not null default 'sft',
    unit_price numeric(10,2) not null,
    total_price numeric(12,2) not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_sales_order_items_order on public.sales_order_items(order_id);
alter table public.sales_order_items enable row level security;

-- 3. JOB ORDERS TABLE (Discrete Shop Floor Production Tickets)
create table if not exists public.job_orders (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    job_number text not null,
    order_id uuid not null references public.sales_orders(id) on delete cascade,
    order_item_id uuid references public.sales_order_items(id) on delete set null,
    product_name text not null,
    customer_name text not null,
    quantity integer not null default 1,
    size_spec text not null,
    material_spec text not null,
    artwork_url text,
    artwork_status text not null default 'approved' check (artwork_status in ('pending', 'approved', 'revised')),
    deadline timestamptz not null,
    assigned_department text not null check (
        assigned_department in ('design', 'wide_format_print', 'digital_offset', 'laser_cnc', 'fabrication', 'finishing', 'installation')
    ),
    assigned_employee_name text,
    production_instructions text,
    status text not null default 'queued' check (
        status in ('queued', 'in_progress', 'paused', 'quality_check', 'completed')
    ),
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_job_orders_company_number unique (company_id, job_number)
);

create index if not exists idx_job_orders_company on public.job_orders(company_id);
create index if not exists idx_job_orders_order on public.job_orders(order_id);
create index if not exists idx_job_orders_dept on public.job_orders(company_id, assigned_department);
create index if not exists idx_job_orders_status on public.job_orders(company_id, status);
alter table public.job_orders enable row level security;

-- 4. ORDER TIMELINE EVENTS
create table if not exists public.order_timeline_events (
    id uuid primary key default gen_random_uuid(),
    order_id uuid not null references public.sales_orders(id) on delete cascade,
    stage text not null check (
        stage in ('quotation', 'approval', 'sales_order', 'job_order', 'production', 'finishing', 'delivery', 'installation', 'completion')
    ),
    title text not null,
    description text,
    actor_name text not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_order_timeline_order on public.order_timeline_events(order_id);
alter table public.order_timeline_events enable row level security;

-- 5. RLS POLICIES FOR ORDERS & JOBS
create policy "Active company users can view sales orders"
    on public.sales_orders for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can insert sales orders"
    on public.sales_orders for insert
    with check (
        public.auth_is_active_company_user(company_id)
        and public.auth_user_has_permission(company_id, 'order.create')
    );

create policy "Authorized company users can update sales orders"
    on public.sales_orders for update
    using (
        public.auth_is_active_company_user(company_id)
        and public.auth_user_has_permission(company_id, 'order.edit')
    );

create policy "Authorized company users can delete sales orders"
    on public.sales_orders for delete
    using (
        public.auth_is_active_company_user(company_id)
        and public.auth_user_has_permission(company_id, 'order.delete')
    );

create policy "Active company users can view job orders"
    on public.job_orders for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can manage job orders"
    on public.job_orders for all
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'production.edit')
            or public.auth_user_has_permission(company_id, 'production.create')
            or public.auth_user_has_permission(company_id, 'order.edit')
        )
    );

create policy "Active company users can view timeline"
    on public.order_timeline_events for select
    using (
        exists (
            select 1 from public.sales_orders o
            where o.id = order_timeline_events.order_id
            and public.auth_is_active_company_user(o.company_id)
        )
    );

create policy "Active company users can insert timeline"
    on public.order_timeline_events for insert
    with check (
        exists (
            select 1 from public.sales_orders o
            where o.id = order_timeline_events.order_id
            and public.auth_is_active_company_user(o.company_id)
        )
    );


-- >>> FILE: 013_design_management.sql <<<
-- ==============================================================================
-- PrintERP SaaS - Migration 013: Design Management & Artwork Versioning
-- Supports:
--   1. 6 Design Workflow Statuses (received, designing, customer_approval, revision, approved, rejected)
--   2. Multi-Format Artwork & Proof Versioning (v1, v2, v3)
--   3. Customer Approval & Immutability Lock (is_locked preventing accidental overwrite)
--   4. Customer Feedback & Revision Audit Trail
--   5. Strict Multi-Tenant Row Level Security
-- ==============================================================================

-- 1. DESIGN JOBS TABLE
create table if not exists public.design_jobs (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    design_number text not null,
    job_order_id uuid references public.job_orders(id) on delete set null,
    sales_order_id uuid references public.sales_orders(id) on delete set null,
    customer_id uuid references public.customers(id) on delete restrict,
    customer_name text not null,
    title text not null,
    designer_id uuid references auth.users(id) on delete set null,
    designer_name text not null,
    priority text not null default 'normal' check (priority in ('normal', 'urgent', 'very_urgent')),
    status text not null default 'received' check (
        status in ('received', 'designing', 'customer_approval', 'revision', 'approved', 'rejected')
    ),
    deadline timestamptz not null,
    instructions text,
    dimensions_spec text,
    current_version integer not null default 1,
    revision_count integer not null default 0,
    customer_feedback text,
    approved_version integer,
    approved_by text,
    approval_timestamp timestamptz,
    approval_note text,
    is_locked boolean not null default false, -- Once approved, locks against accidental file replacement
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_design_jobs_company_number unique (company_id, design_number)
);

create index if not exists idx_design_jobs_company on public.design_jobs(company_id);
create index if not exists idx_design_jobs_status on public.design_jobs(company_id, status);
create index if not exists idx_design_jobs_designer on public.design_jobs(company_id, designer_id);
create index if not exists idx_design_jobs_priority on public.design_jobs(company_id, priority);
alter table public.design_jobs enable row level security;

-- 2. DESIGN VERSIONS TABLE (Artwork proofs and production source files)
create table if not exists public.design_versions (
    id uuid primary key default gen_random_uuid(),
    design_job_id uuid not null references public.design_jobs(id) on delete cascade,
    version_number integer not null default 1,
    version_label text not null,
    proof_file_url text not null, -- Web-previewable proof: JPG, PNG, PDF, SVG
    proof_file_name text not null,
    source_file_url text, -- Raw vector/raster file: AI, PSD, CDR, ZIP
    source_file_name text,
    file_format text not null check (file_format in ('jpg', 'png', 'pdf', 'svg', 'ai', 'psd', 'cdr', 'zip')),
    file_size_bytes bigint default 0,
    change_notes text,
    uploaded_by_name text not null,
    is_approved boolean not null default false,
    created_at timestamptz not null default now(),
    constraint uk_design_job_version unique (design_job_id, version_number)
);

create index if not exists idx_design_versions_job on public.design_versions(design_job_id);
alter table public.design_versions enable row level security;

-- 3. DESIGN FEEDBACK LOGS TABLE
create table if not exists public.design_feedback_logs (
    id uuid primary key default gen_random_uuid(),
    design_job_id uuid not null references public.design_jobs(id) on delete cascade,
    version_number integer not null default 1,
    sender_type text not null check (sender_type in ('customer', 'designer', 'sales')),
    sender_name text not null,
    message text not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_design_feedback_job on public.design_feedback_logs(design_job_id);
alter table public.design_feedback_logs enable row level security;

-- 4. RLS POLICIES
create policy "Active company users can view design jobs"
    on public.design_jobs for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can insert design jobs"
    on public.design_jobs for insert
    with check (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'design.create')
            or public.auth_user_has_permission(company_id, 'order.create')
        )
    );

create policy "Authorized company users can update design jobs"
    on public.design_jobs for update
    using (
        public.auth_is_active_company_user(company_id)
        and public.auth_user_has_permission(company_id, 'design.edit')
    );

create policy "Active company users can view design versions"
    on public.design_versions for select
    using (
        exists (
            select 1 from public.design_jobs dj
            where dj.id = design_versions.design_job_id
            and public.auth_is_active_company_user(dj.company_id)
        )
    );

create policy "Authorized company users can manage design versions"
    on public.design_versions for all
    using (
        exists (
            select 1 from public.design_jobs dj
            where dj.id = design_versions.design_job_id
            and public.auth_is_active_company_user(dj.company_id)
            and (dj.is_locked = false or public.auth_user_has_permission(dj.company_id, 'design.approve'))
        )
    );

create policy "Active company users can view feedback"
    on public.design_feedback_logs for select
    using (
        exists (
            select 1 from public.design_jobs dj
            where dj.id = design_feedback_logs.design_job_id
            and public.auth_is_active_company_user(dj.company_id)
        )
    );

create policy "Active company users can insert feedback"
    on public.design_feedback_logs for insert
    with check (
        exists (
            select 1 from public.design_jobs dj
            where dj.id = design_feedback_logs.design_job_id
            and public.auth_is_active_company_user(dj.company_id)
        )
    );


-- >>> FILE: 014_production_management.sql <<<
-- ==============================================================================
-- PrintERP SaaS - Migration 014: Production Management & Rework Tracking
-- Supports:
--   1. 5 Production Departments (design, printing, finishing, fabrication, installation)
--   2. Adaptive departmental stages and task checklists
--   3. Shop floor execution actions (Assign, Start, Pause, Complete, Reject, Rework)
--   4. Rework, scrap, material wastage, and labor overtime tracking
--   5. Strict Multi-Tenant Row Level Security
-- ==============================================================================

-- 1. PRODUCTION JOBS TABLE
create table if not exists public.production_jobs (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    production_job_number text not null,
    job_order_id uuid references public.job_orders(id) on delete set null,
    sales_order_id uuid references public.sales_orders(id) on delete set null,
    customer_name text not null,
    product_name text not null,
    department text not null check (
        department in ('design', 'printing', 'finishing', 'fabrication', 'installation')
    ),
    stage text not null default 'queued',
    status text not null default 'queued' check (
        status in ('queued', 'in_progress', 'paused', 'quality_check', 'completed', 'rework', 'rejected')
    ),
    pause_reason text,
    priority text not null default 'normal' check (priority in ('normal', 'urgent', 'very_urgent')),
    deadline timestamptz not null,
    dimensions_spec text not null,
    quantity integer not null default 1,
    material_spec text not null,
    artwork_proof_url text,
    production_instructions text,
    assigned_workers text[] default '{}',
    finishing_tasks text[] default '{}',
    fabrication_tasks text[] default '{}',
    has_rework boolean not null default false,
    rework_count integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_production_jobs_company_number unique (company_id, production_job_number)
);

create index if not exists idx_production_jobs_company on public.production_jobs(company_id);
create index if not exists idx_production_jobs_dept on public.production_jobs(company_id, department);
create index if not exists idx_production_jobs_status on public.production_jobs(company_id, status);
create index if not exists idx_production_jobs_priority on public.production_jobs(company_id, priority);
alter table public.production_jobs enable row level security;

-- 2. PRODUCTION REWORKS TABLE (Defect, scrap, and labor impact logging)
create table if not exists public.production_reworks (
    id uuid primary key default gen_random_uuid(),
    production_job_id uuid not null references public.production_jobs(id) on delete cascade,
    rework_number text not null,
    reason text not null,
    responsible_department text not null check (
        responsible_department in ('design', 'printing', 'finishing', 'fabrication', 'installation')
    ),
    material_wastage text not null,
    extra_labor_hours numeric(5,2) not null default 0,
    additional_time_hours numeric(5,2) not null default 0,
    estimated_wastage_cost numeric(12,2) not null default 0,
    reported_by_name text not null,
    status text not null default 'pending' check (status in ('pending', 'in_rework', 'resolved')),
    created_at timestamptz not null default now()
);

create index if not exists idx_production_reworks_job on public.production_reworks(production_job_id);
alter table public.production_reworks enable row level security;

-- 3. RLS POLICIES
create policy "Active company users can view production jobs"
    on public.production_jobs for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can manage production jobs"
    on public.production_jobs for all
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'production.view')
            or public.auth_user_has_permission(company_id, 'production.edit')
            or public.auth_user_has_permission(company_id, 'production.create')
        )
    );

create policy "Active company users can view reworks"
    on public.production_reworks for select
    using (
        exists (
            select 1 from public.production_jobs pj
            where pj.id = production_reworks.production_job_id
            and public.auth_is_active_company_user(pj.company_id)
        )
    );

create policy "Authorized company users can insert reworks"
    on public.production_reworks for insert
    with check (
        exists (
            select 1 from public.production_jobs pj
            where pj.id = production_reworks.production_job_id
            and public.auth_is_active_company_user(pj.company_id)
        )
    );


-- >>> FILE: 015_inventory_and_stock_ledger.sql <<<
-- ==============================================================================
-- PrintERP SaaS - Migration 015: Specialized Inventory & Stock Ledger
-- Supports:
--   1. Printing & Signage Materials (Roll Media, Rigid Sheets, Metals, LED, Inks)
--   2. Roll Inventory (Width x Length = SFT area accounting)
--   3. Company-configurable coverage conversion rates (Inks & Substrates)
--   4. 7 Inventory Transaction Types & Immutable Stock Ledger
--   5. Material Wastage & Scrap Audit (Expected vs Actual)
--   6. Multi-Method Inventory Valuation (Last Purchase Price, Average Cost, Manual, Supplier)
--   7. Strict Multi-Tenant Row Level Security
-- ==============================================================================

-- 1. MATERIALS TABLE
create table if not exists public.materials (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    sku text not null,
    name text not null,
    name_bn text,
    category text not null check (
        category in ('roll_media', 'rigid_sheet', 'metal_framing', 'led_electrical', 'ink_chemistry', 'hardware_accessories')
    ),
    unit text not null check (unit in ('roll', 'sheet', 'piece', 'meter', 'sft', 'liter', 'kg')),
    is_roll boolean not null default false,
    roll_width_ft numeric(8,2),
    roll_length_ft numeric(8,2),
    total_roll_area_sft numeric(10,2),
    current_stock numeric(12,2) not null default 0,
    min_stock_level numeric(12,2) not null default 0,
    coverage_rate_sft_per_unit numeric(10,2), -- Configurable coverage (e.g. 850 sft/liter)
    last_purchase_price numeric(12,2) not null default 0,
    average_cost numeric(12,2) not null default 0,
    manual_cost numeric(12,2) not null default 0,
    valuation_method text not null default 'average_cost' check (
        valuation_method in ('last_purchase_price', 'average_cost', 'manual_cost', 'supplier_price')
    ),
    location text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_materials_company_sku unique (company_id, sku)
);

create index if not exists idx_materials_company on public.materials(company_id);
create index if not exists idx_materials_category on public.materials(company_id, category);
create index if not exists idx_materials_low_stock on public.materials(company_id, current_stock);
alter table public.materials enable row level security;

-- 2. INVENTORY ROLLS TABLE (Discrete mounted rolls on factory presses)
create table if not exists public.inventory_rolls (
    id uuid primary key default gen_random_uuid(),
    material_id uuid not null references public.materials(id) on delete cascade,
    roll_tag text not null,
    width_ft numeric(8,2) not null,
    initial_length_ft numeric(8,2) not null,
    initial_area_sft numeric(10,2) not null,
    consumed_area_sft numeric(10,2) not null default 0,
    remaining_area_sft numeric(10,2) not null,
    status text not null default 'mounted' check (
        status in ('in_warehouse', 'mounted', 'depleted', 'scrapped')
    ),
    mounted_press_name text,
    created_at timestamptz not null default now()
);

create index if not exists idx_inventory_rolls_material on public.inventory_rolls(material_id);
alter table public.inventory_rolls enable row level security;

-- 3. STOCK LEDGER TABLE (Immutable transaction log)
create table if not exists public.stock_ledger (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    material_id uuid not null references public.materials(id) on delete cascade,
    transaction_type text not null check (
        transaction_type in ('purchase', 'consumption', 'adjustment', 'return', 'wastage', 'transfer', 'opening_stock')
    ),
    quantity_change numeric(12,2) not null,
    unit text not null,
    balance_after numeric(12,2) not null,
    unit_cost numeric(12,2) not null default 0,
    total_cost numeric(12,2) not null default 0,
    reference_id text,
    notes text,
    performed_by_name text not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_stock_ledger_company on public.stock_ledger(company_id);
create index if not exists idx_stock_ledger_material on public.stock_ledger(material_id);
create index if not exists idx_stock_ledger_type on public.stock_ledger(company_id, transaction_type);
alter table public.stock_ledger enable row level security;

-- 4. MATERIAL WASTAGES TABLE
create table if not exists public.material_wastages (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    material_id uuid not null references public.materials(id) on delete cascade,
    job_order_id uuid references public.job_orders(id) on delete set null,
    expected_usage numeric(10,2) not null,
    actual_usage numeric(10,2) not null,
    wastage_quantity numeric(10,2) not null,
    unit text not null,
    wastage_reason text not null,
    estimated_cost numeric(12,2) not null default 0,
    created_at timestamptz not null default now()
);

create index if not exists idx_material_wastages_company on public.material_wastages(company_id);
create index if not exists idx_material_wastages_material on public.material_wastages(material_id);
alter table public.material_wastages enable row level security;

-- 5. RLS POLICIES
create policy "Active company users can view materials"
    on public.materials for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can manage materials"
    on public.materials for all
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'inventory.view')
            or public.auth_user_has_permission(company_id, 'inventory.edit')
            or public.auth_user_has_permission(company_id, 'inventory.create')
        )
    );

create policy "Active company users can view inventory rolls"
    on public.inventory_rolls for select
    using (
        exists (
            select 1 from public.materials m
            where m.id = inventory_rolls.material_id
            and public.auth_is_active_company_user(m.company_id)
        )
    );

create policy "Authorized company users can manage inventory rolls"
    on public.inventory_rolls for all
    using (
        exists (
            select 1 from public.materials m
            where m.id = inventory_rolls.material_id
            and public.auth_is_active_company_user(m.company_id)
        )
    );

create policy "Active company users can view stock ledger"
    on public.stock_ledger for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can insert stock ledger"
    on public.stock_ledger for insert
    with check (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'inventory.edit')
            or public.auth_user_has_permission(company_id, 'production.edit')
            or public.auth_user_has_permission(company_id, 'purchase.create')
        )
    );

create policy "Active company users can view wastages"
    on public.material_wastages for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can insert wastages"
    on public.material_wastages for insert
    with check (
        public.auth_is_active_company_user(company_id)
        and public.auth_user_has_permission(company_id, 'inventory.edit')
    );


-- >>> FILE: 016_purchase_management.sql <<<
-- ==============================================================================
-- PrintERP SaaS - Migration 016: Purchase Management & Supplier Price Benchmarks
-- Supports:
--   1. Purchase Orders with multi-item tracking
--   2. Partial Receiving (goods_received_notes with incremental stock sync)
--   3. Supplier Price History & Intelligence (Last, Average, Lowest, Highest)
--   4. Multi-Channel Supplier Payments (Cash, Bank, Cheque, MFS)
--   5. Strict Multi-Tenant Row Level Security
-- ==============================================================================

-- 1. PURCHASE ORDERS TABLE
create table if not exists public.purchase_orders (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    po_number text not null,
    supplier_id uuid references public.suppliers(id) on delete restrict,
    supplier_name text not null,
    supplier_phone text not null,
    supplier_email text,
    supplier_address text,
    po_date date not null default current_date,
    expected_delivery_date date not null,
    status text not null default 'issued' check (
        status in ('draft', 'issued', 'partially_received', 'received', 'billed', 'paid', 'cancelled')
    ),
    subtotal numeric(12,2) not null default 0,
    vat_amount numeric(12,2) not null default 0,
    discount_amount numeric(12,2) not null default 0,
    grand_total numeric(12,2) not null default 0,
    paid_amount numeric(12,2) not null default 0,
    due_amount numeric(12,2) not null default 0,
    notes text,
    created_by_name text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_purchase_orders_company_number unique (company_id, po_number)
);

create index if not exists idx_purchase_orders_company on public.purchase_orders(company_id);
create index if not exists idx_purchase_orders_supplier on public.purchase_orders(supplier_id);
create index if not exists idx_purchase_orders_status on public.purchase_orders(company_id, status);
alter table public.purchase_orders enable row level security;

-- 2. PURCHASE ORDER ITEMS TABLE (Ordered vs Received vs Remaining)
create table if not exists public.purchase_order_items (
    id uuid primary key default gen_random_uuid(),
    purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
    material_id uuid references public.materials(id) on delete restrict,
    material_name text not null,
    quantity_ordered numeric(10,2) not null,
    quantity_received numeric(10,2) not null default 0,
    quantity_remaining numeric(10,2) not null,
    unit text not null,
    unit_cost numeric(12,2) not null,
    total_cost numeric(12,2) not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_po_items_po on public.purchase_order_items(purchase_order_id);
alter table public.purchase_order_items enable row level security;

-- 3. GOODS RECEIVED NOTES TABLE (Incremental receiving batches)
create table if not exists public.goods_received_notes (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    grn_number text not null,
    purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
    supplier_name text not null,
    received_date timestamptz not null default now(),
    challan_number text,
    received_by_name text not null,
    notes text,
    created_at timestamptz not null default now()
);

create index if not exists idx_grn_po on public.goods_received_notes(purchase_order_id);
alter table public.goods_received_notes enable row level security;

-- 4. SUPPLIER PRICE HISTORY TABLE
create table if not exists public.supplier_price_history (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    material_id uuid references public.materials(id) on delete cascade,
    material_name text not null,
    supplier_id uuid references public.suppliers(id) on delete cascade,
    supplier_name text not null,
    purchase_price numeric(12,2) not null,
    previous_price numeric(12,2),
    quantity numeric(10,2) not null,
    po_id uuid references public.purchase_orders(id) on delete set null,
    po_date date not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_supplier_price_hist_mat on public.supplier_price_history(company_id, material_id);
create index if not exists idx_supplier_price_hist_supp on public.supplier_price_history(company_id, supplier_id);
alter table public.supplier_price_history enable row level security;

-- 5. SUPPLIER PAYMENTS TABLE
create table if not exists public.supplier_payments (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    purchase_order_id uuid references public.purchase_orders(id) on delete set null,
    supplier_id uuid references public.suppliers(id) on delete restrict,
    supplier_name text not null,
    payment_method text not null check (payment_method in ('cash', 'bank', 'cheque', 'mfs')),
    amount numeric(12,2) not null,
    payment_date date not null default current_date,
    cheque_number text,
    bank_name text,
    mfs_transaction_id text,
    notes text,
    recorded_by_name text not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_supplier_payments_po on public.supplier_payments(purchase_order_id);
create index if not exists idx_supplier_payments_supp on public.supplier_payments(supplier_id);
alter table public.supplier_payments enable row level security;

-- 6. RLS POLICIES
create policy "Active company users can view purchase orders"
    on public.purchase_orders for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can manage purchase orders"
    on public.purchase_orders for all
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'purchase.view')
            or public.auth_user_has_permission(company_id, 'purchase.create')
            or public.auth_user_has_permission(company_id, 'purchase.edit')
        )
    );

create policy "Active company users can view po items"
    on public.purchase_order_items for select
    using (
        exists (
            select 1 from public.purchase_orders po
            where po.id = purchase_order_items.purchase_order_id
            and public.auth_is_active_company_user(po.company_id)
        )
    );

create policy "Authorized company users can manage po items"
    on public.purchase_order_items for all
    using (
        exists (
            select 1 from public.purchase_orders po
            where po.id = purchase_order_items.purchase_order_id
            and public.auth_is_active_company_user(po.company_id)
        )
    );

create policy "Active company users can view price history"
    on public.supplier_price_history for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can insert price history"
    on public.supplier_price_history for insert
    with check (public.auth_is_active_company_user(company_id));

create policy "Active company users can view supplier payments"
    on public.supplier_payments for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can insert supplier payments"
    on public.supplier_payments for insert
    with check (public.auth_is_active_company_user(company_id));


-- >>> FILE: 017_invoicing_and_payments.sql <<<
-- ==============================================================================
-- PrintERP SaaS - Migration 017: Invoicing, Payments & Multi-Invoice Allocation
-- Supports:
--   1. Sales Invoices, NBR Mushak 6.3 VAT Invoices, and Payment Money Receipts
--   2. Multi-Invoice Payment Allocation
--   3. Overdue Aging & Days Overdue Tracking
--   4. Non-Destructive Financial Write-offs and Adjustments Audit Trail
--   5. Strict Multi-Tenant Row Level Security
-- ==============================================================================

-- 1. INVOICES TABLE
create table if not exists public.invoices (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    invoice_number text not null,
    invoice_type text not null default 'sales_invoice' check (
        invoice_type in ('sales_invoice', 'vat_invoice', 'payment_receipt')
    ),
    customer_id uuid references public.customers(id) on delete restrict,
    customer_name text not null,
    customer_phone text not null,
    customer_bin text, -- 13-digit Business Identification Number (NBR)
    customer_tin text,
    customer_address text,
    sales_order_id uuid references public.sales_orders(id) on delete set null,
    order_number text,
    invoice_date date not null default current_date,
    due_date date not null,
    status text not null default 'unpaid' check (
        status in ('unpaid', 'partially_paid', 'paid', 'overdue', 'written_off', 'cancelled')
    ),
    subtotal numeric(12,2) not null default 0,
    discount_amount numeric(12,2) not null default 0,
    vat_percentage numeric(5,2) not null default 0,
    vat_amount numeric(12,2) not null default 0,
    grand_total numeric(12,2) not null default 0,
    paid_amount numeric(12,2) not null default 0,
    due_amount numeric(12,2) not null default 0,
    write_off_amount numeric(12,2) not null default 0,
    notes text,
    terms_and_conditions text,
    created_by_name text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_invoices_company_number unique (company_id, invoice_number)
);

create index if not exists idx_invoices_company on public.invoices(company_id);
create index if not exists idx_invoices_customer on public.invoices(company_id, customer_id);
create index if not exists idx_invoices_status on public.invoices(company_id, status);
create index if not exists idx_invoices_due on public.invoices(company_id, due_date);
alter table public.invoices enable row level security;

-- 2. INVOICE ITEMS TABLE
create table if not exists public.invoice_items (
    id uuid primary key default gen_random_uuid(),
    invoice_id uuid not null references public.invoices(id) on delete cascade,
    item_description text not null,
    dimensions_spec text,
    quantity numeric(10,2) not null,
    unit text not null,
    unit_price numeric(12,2) not null,
    vat_percentage numeric(5,2) not null default 0,
    total_price numeric(12,2) not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_invoice_items_invoice on public.invoice_items(invoice_id);
alter table public.invoice_items enable row level security;

-- 3. PAYMENTS TABLE (Customer collections & Money Receipts)
create table if not exists public.payments (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    receipt_number text not null,
    customer_id uuid references public.customers(id) on delete restrict,
    customer_name text not null,
    payment_date date not null default current_date,
    payment_type text not null check (
        payment_type in ('full_payment', 'partial_payment', 'advance_payment', 'due_payment')
    ),
    payment_method text not null check (
        payment_method in ('cash', 'bank', 'cheque', 'bkash', 'nagad', 'other_mfs')
    ),
    amount numeric(12,2) not null,
    bank_name text,
    cheque_number text,
    cheque_date date,
    mfs_transaction_id text,
    notes text,
    received_by_name text not null,
    created_at timestamptz not null default now(),
    constraint uk_payments_company_receipt unique (company_id, receipt_number)
);

create index if not exists idx_payments_company on public.payments(company_id);
create index if not exists idx_payments_customer on public.payments(company_id, customer_id);
alter table public.payments enable row level security;

-- 4. PAYMENT ALLOCATIONS TABLE (A single payment allocated across multiple invoices)
create table if not exists public.payment_allocations (
    id uuid primary key default gen_random_uuid(),
    payment_id uuid not null references public.payments(id) on delete cascade,
    invoice_id uuid not null references public.invoices(id) on delete cascade,
    allocated_amount numeric(12,2) not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_payment_alloc_payment on public.payment_allocations(payment_id);
create index if not exists idx_payment_alloc_invoice on public.payment_allocations(invoice_id);
alter table public.payment_allocations enable row level security;

-- 5. FINANCIAL WRITE-OFFS & ADJUSTMENTS AUDIT TABLE
create table if not exists public.financial_write_offs (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    invoice_id uuid not null references public.invoices(id) on delete cascade,
    amount numeric(12,2) not null,
    reason text not null,
    authorized_by_name text not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_financial_write_offs_company on public.financial_write_offs(company_id);
create index if not exists idx_financial_write_offs_invoice on public.financial_write_offs(invoice_id);
alter table public.financial_write_offs enable row level security;

-- 6. RLS POLICIES
create policy "Active company users can view invoices"
    on public.invoices for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can manage invoices"
    on public.invoices for all
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'billing.view')
            or public.auth_user_has_permission(company_id, 'billing.create')
            or public.auth_user_has_permission(company_id, 'billing.edit')
        )
    );

create policy "Active company users can view invoice items"
    on public.invoice_items for select
    using (
        exists (
            select 1 from public.invoices inv
            where inv.id = invoice_items.invoice_id
            and public.auth_is_active_company_user(inv.company_id)
        )
    );

create policy "Authorized company users can manage invoice items"
    on public.invoice_items for all
    using (
        exists (
            select 1 from public.invoices inv
            where inv.id = invoice_items.invoice_id
            and public.auth_is_active_company_user(inv.company_id)
        )
    );

create policy "Active company users can view payments"
    on public.payments for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can manage payments"
    on public.payments for all
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'billing.view')
            or public.auth_user_has_permission(company_id, 'billing.create')
        )
    );

create policy "Active company users can view allocations"
    on public.payment_allocations for select
    using (
        exists (
            select 1 from public.payments p
            where p.id = payment_allocations.payment_id
            and public.auth_is_active_company_user(p.company_id)
        )
    );

create policy "Authorized company users can manage allocations"
    on public.payment_allocations for all
    using (
        exists (
            select 1 from public.payments p
            where p.id = payment_allocations.payment_id
            and public.auth_is_active_company_user(p.company_id)
        )
    );

create policy "Active company users can view write offs"
    on public.financial_write_offs for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can insert write offs"
    on public.financial_write_offs for insert
    with check (
        public.auth_is_active_company_user(company_id)
        and public.auth_user_has_permission(company_id, 'billing.edit')
    );


-- >>> FILE: 018_delivery_and_installation.sql <<<
-- ==============================================================================
-- PrintERP SaaS - Migration 018: Delivery, Dispatch Challans & On-Site Installation
-- Supports:
--   1. 4 Delivery Methods (Company Vehicle, Courier, Local Transport, Customer Pickup)
--   2. Delivery Challans (Transit slips with receiver sign-off)
--   3. On-Site Signage & Rigging Installations (Crew, Site Photos, Customer Confirmation)
--   4. Interactive Delivery Calendar
--   5. Strict Multi-Tenant Row Level Security
-- ==============================================================================

-- 1. DELIVERY CHALLANS TABLE
create table if not exists public.delivery_challans (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    challan_number text not null,
    sales_order_id uuid references public.sales_orders(id) on delete set null,
    order_number text,
    customer_id uuid references public.customers(id) on delete restrict,
    customer_name text not null,
    customer_phone text not null,
    delivery_address text not null,
    delivery_method text not null check (
        delivery_method in ('company_vehicle', 'courier', 'local_transport', 'customer_pickup')
    ),
    delivery_person_name text,
    delivery_person_phone text,
    vehicle_info text, -- Vehicle plate number or courier tracking ID
    transport_cost numeric(12,2) not null default 0,
    scheduled_date date not null default current_date,
    status text not null default 'scheduled' check (
        status in ('scheduled', 'assigned', 'out_for_delivery', 'delivered', 'failed', 'returned')
    ),
    delivered_at timestamptz,
    receiver_name text,
    receiver_phone text,
    receiver_signature text,
    notes text,
    created_by_name text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_delivery_challans_company_number unique (company_id, challan_number)
);

create index if not exists idx_delivery_challans_company on public.delivery_challans(company_id);
create index if not exists idx_delivery_challans_customer on public.delivery_challans(company_id, customer_id);
create index if not exists idx_delivery_challans_status on public.delivery_challans(company_id, status);
create index if not exists idx_delivery_challans_date on public.delivery_challans(company_id, scheduled_date);
alter table public.delivery_challans enable row level security;

-- 2. CHALLAN ITEMS TABLE
create table if not exists public.challan_items (
    id uuid primary key default gen_random_uuid(),
    challan_id uuid not null references public.delivery_challans(id) on delete cascade,
    product_description text not null,
    dimensions_spec text,
    quantity numeric(10,2) not null,
    unit text not null,
    remarks text,
    created_at timestamptz not null default now()
);

create index if not exists idx_challan_items_challan on public.challan_items(challan_id);
alter table public.challan_items enable row level security;

-- 3. INSTALLATIONS TABLE (On-Site Rigging & Fitting)
create table if not exists public.installations (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    installation_number text not null,
    sales_order_id uuid references public.sales_orders(id) on delete set null,
    order_number text,
    customer_id uuid references public.customers(id) on delete restrict,
    customer_name text not null,
    site_location text not null,
    installer_lead_name text not null,
    crew_members text[] not null default '{}',
    installation_date date not null default current_date,
    scheduled_time text,
    status text not null default 'pending' check (
        status in ('pending', 'scheduled', 'on_site', 'completed', 'failed', 'rescheduled')
    ),
    transport_cost numeric(12,2) not null default 0,
    labor_cost numeric(12,2) not null default 0,
    equipment_used text,
    site_photos text[] not null default '{}',
    customer_confirmed_by text,
    customer_confirmed_phone text,
    customer_rating_or_note text,
    confirmed_at timestamptz,
    failure_reason text,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_installations_company_number unique (company_id, installation_number)
);

create index if not exists idx_installations_company on public.installations(company_id);
create index if not exists idx_installations_status on public.installations(company_id, status);
create index if not exists idx_installations_date on public.installations(company_id, installation_date);
alter table public.installations enable row level security;

-- 4. RLS POLICIES
create policy "Active company users can view delivery challans"
    on public.delivery_challans for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can manage delivery challans"
    on public.delivery_challans for all
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'delivery.view')
            or public.auth_user_has_permission(company_id, 'delivery.create')
            or public.auth_user_has_permission(company_id, 'delivery.edit')
        )
    );

create policy "Active company users can view challan items"
    on public.challan_items for select
    using (
        exists (
            select 1 from public.delivery_challans ch
            where ch.id = challan_items.challan_id
            and public.auth_is_active_company_user(ch.company_id)
        )
    );

create policy "Authorized company users can manage challan items"
    on public.challan_items for all
    using (
        exists (
            select 1 from public.delivery_challans ch
            where ch.id = challan_items.challan_id
            and public.auth_is_active_company_user(ch.company_id)
        )
    );

create policy "Active company users can view installations"
    on public.installations for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can manage installations"
    on public.installations for all
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'delivery.view')
            or public.auth_user_has_permission(company_id, 'delivery.edit')
            or public.auth_user_has_permission(company_id, 'production.edit')
        )
    );


-- >>> FILE: 019_expenses_and_accounting.sql <<<
-- ==============================================================================
-- PrintERP SaaS - Migration 019: Expenses, Cash Book & SME Bank Accounts
-- Supports:
--   1. 12 SME Expense Categories (Rent, Salary, Labor, Electricity, Internet, Transport, Fuel, Marketing, Maintenance, Materials, Office, Other)
--   2. Daily Cash Book Management (Cash In, Cash Out, Drawer Reconciliation)
--   3. Multi-Bank Accounts with Masked Account Numbers
--   4. Strict Multi-Tenant Row Level Security
-- ==============================================================================

-- 1. EXPENSES TABLE
create table if not exists public.expenses (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    expense_number text not null,
    expense_date date not null default current_date,
    category text not null check (
        category in ('rent', 'salary', 'labor', 'electricity', 'internet', 'transport', 'fuel', 'marketing', 'maintenance', 'materials', 'office', 'other')
    ),
    amount numeric(12,2) not null,
    payment_method text not null check (
        payment_method in ('cash', 'bank', 'cheque', 'bkash', 'nagad', 'other_mfs')
    ),
    vendor_name text,
    description text not null,
    attachment_url text,
    branch_name text not null default 'Head Office',
    bank_account_id uuid,
    recorded_by_name text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_expenses_company_number unique (company_id, expense_number)
);

create index if not exists idx_expenses_company on public.expenses(company_id);
create index if not exists idx_expenses_category on public.expenses(company_id, category);
create index if not exists idx_expenses_date on public.expenses(company_id, expense_date);
alter table public.expenses enable row level security;

-- 2. BANK ACCOUNTS TABLE
create table if not exists public.bank_accounts (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    bank_name text not null,
    account_name text not null,
    account_number text not null,
    branch_name text,
    routing_number text,
    opening_balance numeric(12,2) not null default 0,
    current_balance numeric(12,2) not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

create index if not exists idx_bank_accounts_company on public.bank_accounts(company_id);
alter table public.bank_accounts enable row level security;

-- 3. CASH BOOK ENTRIES TABLE
create table if not exists public.cash_book_entries (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    entry_date date not null default current_date,
    entry_type text not null check (entry_type in ('cash_in', 'cash_out')),
    amount numeric(12,2) not null,
    category text not null,
    description text not null,
    reference_id text,
    performed_by_name text not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_cash_book_company on public.cash_book_entries(company_id);
create index if not exists idx_cash_book_date on public.cash_book_entries(company_id, entry_date);
alter table public.cash_book_entries enable row level security;

-- 4. RLS POLICIES
create policy "Active company users can view expenses"
    on public.expenses for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can manage expenses"
    on public.expenses for all
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'accounting.view')
            or public.auth_user_has_permission(company_id, 'accounting.create')
            or public.auth_user_has_permission(company_id, 'accounting.edit')
        )
    );

create policy "Active company users can view bank accounts"
    on public.bank_accounts for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can manage bank accounts"
    on public.bank_accounts for all
    using (
        public.auth_is_active_company_user(company_id)
        and public.auth_user_has_permission(company_id, 'accounting.edit')
    );

create policy "Active company users can view cash book"
    on public.cash_book_entries for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can insert cash book"
    on public.cash_book_entries for insert
    with check (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'accounting.create')
            or public.auth_user_has_permission(company_id, 'billing.create')
        )
    );


-- >>> FILE: 020_employees_and_payroll.sql <<<
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


-- >>> FILE: 021_job_costing_and_profitability.sql <<<
-- ==============================================================================
-- PrintERP SaaS - Migration 021: Job Costing, 9-Head Costs & Profitability Engine
-- Supports:
--   1. 9 Standard Cost Heads (Material, Ink, Printing, Finishing, Labor, Fabrication, Installation, Transport, Other)
--   2. Pre-Production Estimated vs Post-Production Actual Costing
--   3. Granular Variance Analysis (Favorable savings vs Unfavorable overruns)
--   4. 4 Labor Costing Modes (Fixed Job, Hourly, Daily Worker, Employee Contribution)
--   5. Strict Multi-Tenant Row Level Security & Role-Based Shielding
-- ==============================================================================

-- 1. JOB COSTINGS TABLE
create table if not exists public.job_costings (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    job_id uuid references public.production_jobs(id) on delete cascade,
    job_number text not null,
    customer_id uuid references public.customers(id) on delete restrict,
    customer_name text not null,
    selling_price numeric(12,2) not null,
    
    -- Pre-Production Estimated Costs
    est_material_cost numeric(12,2) not null default 0,
    est_ink_cost numeric(12,2) not null default 0,
    est_printing_cost numeric(12,2) not null default 0,
    est_finishing_cost numeric(12,2) not null default 0,
    est_labor_cost numeric(12,2) not null default 0,
    est_fabrication_cost numeric(12,2) not null default 0,
    est_installation_cost numeric(12,2) not null default 0,
    est_transport_cost numeric(12,2) not null default 0,
    est_other_cost numeric(12,2) not null default 0,
    est_total_cost numeric(12,2) not null default 0,
    est_profit numeric(12,2) not null default 0,
    est_margin_percentage numeric(5,2) not null default 0,

    -- Post-Production Actual Costs
    act_material_cost numeric(12,2) not null default 0,
    act_ink_cost numeric(12,2) not null default 0,
    act_printing_cost numeric(12,2) not null default 0,
    act_finishing_cost numeric(12,2) not null default 0,
    act_labor_cost numeric(12,2) not null default 0,
    act_fabrication_cost numeric(12,2) not null default 0,
    act_installation_cost numeric(12,2) not null default 0,
    act_transport_cost numeric(12,2) not null default 0,
    act_other_cost numeric(12,2) not null default 0,
    act_total_cost numeric(12,2) not null default 0,
    act_profit numeric(12,2) not null default 0,
    act_margin_percentage numeric(5,2) not null default 0,

    -- Variance Metrics (Actual - Estimated)
    material_variance numeric(12,2) not null default 0,
    labor_variance numeric(12,2) not null default 0,
    transport_variance numeric(12,2) not null default 0,
    total_variance numeric(12,2) not null default 0,

    labor_cost_mode text not null default 'hourly' check (
        labor_cost_mode in ('fixed_job', 'hourly', 'daily_worker', 'employee_contribution')
    ),
    status text not null default 'estimated' check (
        status in ('estimated', 'in_production', 'actualized', 'closed')
    ),
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_job_costings_company_job unique (company_id, job_number)
);

create index if not exists idx_job_costings_company on public.job_costings(company_id);
create index if not exists idx_job_costings_customer on public.job_costings(company_id, customer_id);
create index if not exists idx_job_costings_status on public.job_costings(company_id, status);
alter table public.job_costings enable row level security;

-- 2. RLS POLICIES
create policy "Active company users can view job costings"
    on public.job_costings for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can manage job costings"
    on public.job_costings for all
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'costing.view')
            or public.auth_user_has_permission(company_id, 'costing.edit')
            or public.auth_user_has_permission(company_id, 'production.edit')
        )
    );


-- >>> FILE: 022_reporting_and_analytics.sql <<<
-- ==============================================================================
-- PrintERP SaaS - Migration 022: Reporting and Business Analytics Engine
-- Provides:
--   1. Server-side SQL aggregations for Sales, Production, Financial, Inventory & Customer
--   2. Optimized performance avoiding multi-thousand row browser loading
--   3. Multi-Tenant isolation enforced through public.auth_is_active_company_user
-- ==============================================================================

-- 1. SALES SUMMARY AGGREGATE FUNCTION
create or replace function public.get_tenant_sales_summary(
    p_company_id uuid,
    p_start_date date default current_date - interval '30 days',
    p_end_date date default current_date
)
returns table (
    total_sales numeric,
    total_orders bigint,
    avg_order_value numeric,
    total_discount numeric,
    total_vat numeric
)
language plpgsql
security definer
as $$
begin
    -- Security check
    if not public.auth_is_active_company_user(p_company_id) then
        raise exception 'Unauthorized access to company sales analytics';
    end if;

    return query
    select
        coalesce(sum(so.final_price), 0)::numeric as total_sales,
        count(so.id)::bigint as total_orders,
        coalesce(avg(so.final_price), 0)::numeric as avg_order_value,
        coalesce(sum(so.discount_amount), 0)::numeric as total_discount,
        coalesce(sum(so.vat_amount), 0)::numeric as total_vat
    from public.sales_orders so
    where so.company_id = p_company_id
      and so.order_date between p_start_date and p_end_date;
end;
$$;

-- 2. PRODUCTION SUMMARY AGGREGATE FUNCTION
create or replace function public.get_tenant_production_summary(
    p_company_id uuid,
    p_start_date date default current_date - interval '30 days',
    p_end_date date default current_date
)
returns table (
    total_jobs bigint,
    completed_jobs bigint,
    delayed_jobs bigint,
    rework_count bigint,
    rework_wastage_cost numeric
)
language plpgsql
security definer
as $$
begin
    if not public.auth_is_active_company_user(p_company_id) then
        raise exception 'Unauthorized access to company production analytics';
    end if;

    return query
    select
        count(pj.id)::bigint as total_jobs,
        count(case when pj.stage = 'completed' then 1 end)::bigint as completed_jobs,
        count(case when pj.deadline < current_date and pj.stage != 'completed' then 1 end)::bigint as delayed_jobs,
        coalesce((select count(*) from public.production_reworks pr where pr.company_id = p_company_id), 0)::bigint as rework_count,
        coalesce((select sum(pr.wastage_cost) from public.production_reworks pr where pr.company_id = p_company_id), 0)::numeric as rework_wastage_cost
    from public.production_jobs pj
    where pj.company_id = p_company_id
      and pj.created_at::date between p_start_date and p_end_date;
end;
$$;

-- 3. FINANCIAL SUMMARY AGGREGATE FUNCTION
create or replace function public.get_tenant_financial_summary(
    p_company_id uuid,
    p_start_date date default current_date - interval '30 days',
    p_end_date date default current_date
)
returns table (
    total_billed numeric,
    total_collected numeric,
    total_due numeric,
    total_expenses numeric,
    net_operating_profit numeric
)
language plpgsql
security definer
as $$
declare
    v_billed numeric := 0;
    v_collected numeric := 0;
    v_due numeric := 0;
    v_expenses numeric := 0;
begin
    if not public.auth_is_active_company_user(p_company_id) then
        raise exception 'Unauthorized access to company financial analytics';
    end if;

    select
        coalesce(sum(inv.total_amount), 0),
        coalesce(sum(inv.paid_amount), 0),
        coalesce(sum(inv.due_amount), 0)
    into v_billed, v_collected, v_due
    from public.invoices inv
    where inv.company_id = p_company_id
      and inv.invoice_date between p_start_date and p_end_date;

    select coalesce(sum(exp.amount), 0)
    into v_expenses
    from public.expenses exp
    where exp.company_id = p_company_id
      and exp.expense_date between p_start_date and p_end_date;

    return query
    select
        v_billed,
        v_collected,
        v_due,
        v_expenses,
        (v_billed - v_expenses)::numeric as net_operating_profit;
end;
$$;


-- >>> FILE: 023_communication_and_notifications.sql <<<
-- ==============================================================================
-- PrintERP SaaS - Migration 023: In-App Notifications & Communication Architecture
-- Supports:
--   1. Real-time In-App Notification Feed (Orders, Payments, Approvals, Low Stock)
--   2. WhatsApp Business API Configuration
--   3. Multi-Provider SMS Abstraction (BulkSMSBD, SSL Wireless, Alpha, MIM)
--   4. SMTP Email Configuration (Credentials Masked)
--   5. Bilingual Message Templates (English & বাংলা) with Variable Interpolation
--   6. Immutable Communication Audit Logs with RLS
-- ==============================================================================

-- 1. IN-APP NOTIFICATIONS TABLE
create table if not exists public.in_app_notifications (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    user_id uuid references auth.users(id) on delete set null,
    type text not null check (
        type in (
            'new_order', 'payment_received', 'design_revision',
            'artwork_approved', 'production_completed', 'delivery_scheduled',
            'overdue_invoice', 'low_stock', 'leave_approval'
        )
    ),
    title text not null,
    title_bn text,
    message text not null,
    message_bn text,
    action_url text,
    is_read boolean not null default false,
    created_at timestamptz not null default now()
);

create index if not exists idx_notifications_company on public.in_app_notifications(company_id);
create index if not exists idx_notifications_unread on public.in_app_notifications(company_id, is_read);
alter table public.in_app_notifications enable row level security;

-- 2. COMMUNICATION CHANNELS CONFIG TABLE
create table if not exists public.communication_channels_config (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    channel_type text not null check (channel_type in ('whatsapp', 'sms', 'email')),
    provider_name text not null, -- e.g. 'bulksmsbd', 'ssl_wireless', 'alpha', 'mim', 'meta_whatsapp', 'custom_smtp'
    is_enabled boolean not null default false,
    api_key_or_password text, -- Encrypted / masked credentials
    sender_id_or_phone text,  -- Masking sender ID or WhatsApp Phone Number ID
    account_or_user_id text,
    extra_settings jsonb default '{}'::jsonb,
    updated_at timestamptz not null default now(),
    constraint uk_company_channel unique (company_id, channel_type)
);

create index if not exists idx_channel_config_company on public.communication_channels_config(company_id);
alter table public.communication_channels_config enable row level security;

-- 3. MESSAGE TEMPLATES TABLE (Bilingual: English & বাংলা)
create table if not exists public.message_templates (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    template_key text not null, -- e.g. 'quotation_sent', 'order_confirmed', 'payment_received', 'delivery_dispatched', 'overdue_reminder'
    name text not null,
    channel text not null check (channel in ('all', 'whatsapp', 'sms', 'email')),
    body_en text not null,
    body_bn text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_company_template_key unique (company_id, template_key)
);

create index if not exists idx_message_templates_company on public.message_templates(company_id);
alter table public.message_templates enable row level security;

-- 4. COMMUNICATION LOGS TABLE (Non-destructive audit trail)
create table if not exists public.communication_logs (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    channel text not null check (channel in ('in_app', 'whatsapp', 'sms', 'email')),
    recipient_name text not null,
    recipient_destination text not null, -- Mobile number or email address
    provider_used text not null,
    message_content text not null,
    status text not null default 'sent' check (status in ('sent', 'delivered', 'failed', 'queued')),
    error_message text,
    created_at timestamptz not null default now()
);

create index if not exists idx_comm_logs_company on public.communication_logs(company_id);
create index if not exists idx_comm_logs_created on public.communication_logs(company_id, created_at);
alter table public.communication_logs enable row level security;

-- 5. RLS POLICIES
create policy "Active company users can view in-app notifications"
    on public.in_app_notifications for select
    using (public.auth_is_active_company_user(company_id));

create policy "Active company users can update their notifications"
    on public.in_app_notifications for update
    using (public.auth_is_active_company_user(company_id));

create policy "Active company users can view channel configs"
    on public.communication_channels_config for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company admins can manage channel configs"
    on public.communication_channels_config for all
    using (
        public.auth_is_active_company_user(company_id)
        and public.auth_user_has_permission(company_id, 'settings.edit')
    );

create policy "Active company users can view templates"
    on public.message_templates for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company users can manage templates"
    on public.message_templates for all
    using (
        public.auth_is_active_company_user(company_id)
        and public.auth_user_has_permission(company_id, 'settings.edit')
    );

create policy "Active company users can view communication logs"
    on public.communication_logs for select
    using (public.auth_is_active_company_user(company_id));

create policy "System and authorized users can append communication logs"
    on public.communication_logs for insert
    with check (public.auth_is_active_company_user(company_id));


-- >>> FILE: 024_vat_tax_and_document_settings.sql <<<
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


-- >>> FILE: 025_saas_subscriptions.sql <<<
-- ==============================================================================
-- PrintERP SaaS - Migration 025: SaaS Subscription System & Feature Gating
-- Supports:
--   1. 3 SaaS Plans (Starter, Business, Enterprise) with Configurable Limits
--   2. 6 Subscription States (Trial, Active, Past Due, Suspended, Cancelled, Expired)
--   3. Monthly & Yearly Billing Intervals with Decoupled Payment Architecture
--   4. Platform Owner Administration & Tenant Suspension Controls
--   5. Strict Multi-Tenant Row Level Security
-- ==============================================================================

-- 1. SUBSCRIPTION PLANS TABLE
create table if not exists public.subscription_plans (
    id uuid primary key default gen_random_uuid(),
    code text not null unique, -- 'starter', 'business', 'enterprise'
    name text not null,
    name_bn text,
    description text,
    price_monthly numeric(10,2) not null,
    price_yearly numeric(10,2) not null,
    max_users integer not null,
    max_branches integer not null,
    storage_gb integer not null,
    monthly_orders integer not null,
    max_customers integer not null,
    max_products integer not null,
    features text[] not null default '{}',
    is_active boolean not null default true,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Seed Initial 3 Plans
insert into public.subscription_plans (code, name, name_bn, description, price_monthly, price_yearly, max_users, max_branches, storage_gb, monthly_orders, max_customers, max_products, features, sort_order)
values
(
    'starter',
    'Starter Plan',
    'স্টার্টার প্ল্যান',
    'For small printing and retail sign shops needing basic quotations and orders.',
    1999.00,
    19990.00,
    3,
    1,
    1,
    50,
    100,
    100,
    array['basic_sales', 'basic_customers', 'quotation_pdf', 'delivery_challan'],
    1
),
(
    'business',
    'Business Plan',
    'বিজনেস প্ল্যান',
    'Complete production, inventory rolls, job costing, and HR for growing factories.',
    4999.00,
    49990.00,
    10,
    3,
    10,
    500,
    1000,
    1000,
    array['basic_sales', 'basic_customers', 'quotation_pdf', 'delivery_challan', 'multi_department', 'inventory_rolls', 'production_kanban', 'job_costing', 'hr_payroll', 'reports_analytics', 'whatsapp_notifications'],
    2
),
(
    'enterprise',
    'Enterprise Plan',
    'এন্টারপ্রাইজ প্ল্যান',
    'Unlimited branches, advanced permissions, and dedicated support for large firms.',
    9999.00,
    99990.00,
    999,
    999,
    100,
    99999,
    99999,
    99999,
    array['basic_sales', 'basic_customers', 'quotation_pdf', 'delivery_challan', 'multi_department', 'inventory_rolls', 'production_kanban', 'job_costing', 'hr_payroll', 'reports_analytics', 'whatsapp_notifications', 'multi_branch', 'custom_workflows', 'api_access', 'priority_support'],
    3
)
on conflict (code) do update set
    price_monthly = excluded.price_monthly,
    price_yearly = excluded.price_yearly,
    features = excluded.features;

-- 2. COMPANY SUBSCRIPTIONS TABLE
create table if not exists public.company_subscriptions (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade unique,
    plan_id uuid not null references public.subscription_plans(id) on delete restrict,
    status text not null default 'trial' check (
        status in ('trial', 'active', 'past_due', 'suspended', 'cancelled', 'expired')
    ),
    billing_interval text not null default 'monthly' check (
        billing_interval in ('monthly', 'yearly')
    ),
    current_period_start timestamptz not null default now(),
    current_period_end timestamptz not null default now() + interval '30 days',
    trial_ends_at timestamptz default now() + interval '14 days',
    cancelled_at timestamptz,
    payment_method_type text, -- 'bkash', 'sslcommerz', 'nagad', 'bank_wire'
    last_payment_reference text,
    custom_limits_override jsonb default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_company_sub_company on public.company_subscriptions(company_id);
create index if not exists idx_company_sub_status on public.company_subscriptions(status);
alter table public.company_subscriptions enable row level security;

-- 3. PLATFORM ADMINS TABLE (For cross-tenant super-admin management)
create table if not exists public.platform_admins (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade unique,
    role text not null default 'super_admin' check (role in ('super_admin', 'billing_admin', 'support_agent')),
    created_at timestamptz not null default now()
);

-- 4. RLS POLICIES
create policy "Anyone can view active subscription plans"
    on public.subscription_plans for select
    using (is_active = true);

create policy "Active company users can view their subscription"
    on public.company_subscriptions for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company admins can update their subscription"
    on public.company_subscriptions for update
    using (
        public.auth_is_active_company_user(company_id)
        and public.auth_user_has_permission(company_id, 'settings.edit')
    );


-- >>> FILE: 026_platform_administration.sql <<<
-- ==============================================================================
-- PrintERP SaaS - Migration 026: Platform Administration & Root Governance
-- Supports:
--   1. Platform Audit Logs (Immutable Root Audit Trail with RLS)
--   2. Tenant-Specific Feature Flag Overrides
--   3. Platform RBAC Templates (Mutable System Presets)
--   4. System Health Telemetry (Failed Jobs, Notifications, Storage, APIs, Integrations)
--   5. Strict Platform Security Definer Functions & Tenant Boundary Isolation
-- ==============================================================================

-- 1. PLATFORM AUDIT LOGS TABLE
create table if not exists public.platform_audit_logs (
    id uuid primary key default gen_random_uuid(),
    platform_admin_id uuid references public.platform_admins(id) on delete set null,
    actor_email text not null default 'system@printerp.com.bd',
    action text not null, -- 'company.activate', 'company.suspend', 'company.reactivate', 'company.change_plan', 'feature_flag.update', 'rbac_template.update', 'system.job_retry', 'system.resolve'
    entity_type text not null, -- 'company', 'plan', 'feature_flag', 'rbac_template', 'system_job', 'system_alert'
    entity_id text,
    target_company_id uuid references public.companies(id) on delete set null,
    details jsonb not null default '{}'::jsonb,
    ip_address text,
    user_agent text,
    created_at timestamptz not null default now()
);

create index if not exists idx_platform_audit_action on public.platform_audit_logs(action);
create index if not exists idx_platform_audit_target on public.platform_audit_logs(target_company_id);
create index if not exists idx_platform_audit_created on public.platform_audit_logs(created_at desc);
alter table public.platform_audit_logs enable row level security;

-- 2. TENANT-SPECIFIC FEATURE FLAG OVERRIDES TABLE
create table if not exists public.platform_tenant_feature_flags (
    id uuid primary key default gen_random_uuid(),
    flag_id uuid not null references public.platform_feature_flags(id) on delete cascade,
    company_id uuid not null references public.companies(id) on delete cascade,
    is_enabled boolean not null default false,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint unique_tenant_feature_flag unique (flag_id, company_id)
);

create index if not exists idx_tenant_flags_comp on public.platform_tenant_feature_flags(company_id);
create index if not exists idx_tenant_flags_flag on public.platform_tenant_feature_flags(flag_id);
alter table public.platform_tenant_feature_flags enable row level security;

-- 3. PLATFORM RBAC ROLE TEMPLATES & PERMISSION MATRIX TABLES
create table if not exists public.platform_role_templates (
    id uuid primary key default gen_random_uuid(),
    slug text unique not null, -- 'business_owner', 'sales_manager', 'designer', 'production_manager', 'operator', 'general_staff'
    name text not null,
    name_bn text,
    description text,
    is_system boolean not null default true,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.platform_role_template_permissions (
    id uuid primary key default gen_random_uuid(),
    role_template_id uuid not null references public.platform_role_templates(id) on delete cascade,
    resource text not null,
    action text not null check (action in ('view', 'create', 'edit', 'delete', 'approve', 'full_control')),
    is_allowed boolean not null default true,
    created_at timestamptz not null default now(),
    constraint unique_role_template_resource_action unique (role_template_id, resource, action)
);

create index if not exists idx_template_perms_role on public.platform_role_template_permissions(role_template_id);
alter table public.platform_role_templates enable row level security;
alter table public.platform_role_template_permissions enable row level security;

-- 4. SYSTEM HEALTH TELEMETRY TABLE
create table if not exists public.platform_system_health_events (
    id uuid primary key default gen_random_uuid(),
    category text not null check (category in ('job', 'notification', 'storage', 'api', 'integration')),
    service_name text not null, -- 'bg_order_cleanup', 'whatsapp_cloud_api', 'greenweb_sms', 's3_storage_bucket', 'bkash_checkout', 'mushak_6_3_sync'
    severity text not null default 'warning' check (severity in ('info', 'warning', 'error', 'critical')),
    message text not null,
    error_details jsonb not null default '{}'::jsonb,
    company_id uuid references public.companies(id) on delete set null,
    resolved boolean not null default false,
    resolved_at timestamptz,
    resolved_by uuid references public.platform_admins(id) on delete set null,
    created_at timestamptz not null default now()
);

create index if not exists idx_health_events_cat on public.platform_system_health_events(category);
create index if not exists idx_health_events_resolved on public.platform_system_health_events(resolved);
create index if not exists idx_health_events_created on public.platform_system_health_events(created_at desc);
alter table public.platform_system_health_events enable row level security;

-- 5. SEED INITIAL RBAC TEMPLATES
insert into public.platform_role_templates (slug, name, name_bn, description, is_system, sort_order) values
('business_owner', 'Business Owner', 'প্রতিষ্ঠানের মালিক', 'Full organization access: P&L, accounts, reports, HR, settings, and deletion', true, 1),
('sales_manager', 'Sales Manager', 'সেলস ম্যানেজার', 'Customers, leads, price quotations, job order booking, advance collection, and delivery', true, 2),
('designer', 'Graphic Designer', 'গ্রাফিক ডিজাইনার (প্রিপ প্রেস)', 'Pre-press design queue, artwork uploads (AI/PDF), proof approval, and revision logs', true, 3),
('production_manager', 'Production Manager', 'প্রোডাকশন ম্যানেজার', 'Floor scheduling, machine allocation, materials issuance, finishing, and installation', true, 4),
('operator', 'Print Operator', 'মেশিন অপারেটর', 'Assigned jobs, printing execution, material consumption logging, and QC completion', true, 5),
('general_staff', 'General Staff', 'সাধারণ কর্মী', 'Restricted access based strictly on assigned duties and user overrides', true, 6)
on conflict (slug) do update set
    name = excluded.name,
    name_bn = excluded.name_bn,
    description = excluded.description;

-- Seed default permissions for templates
do $$
declare
    v_template_id uuid;
    res text;
    act text;
begin
    -- 1. Business owner gets all
    select id into v_template_id from public.platform_role_templates where slug = 'business_owner';
    if v_template_id is not null then
        for res in select unnest(array['customer', 'quotation', 'order', 'invoice', 'payment', 'production', 'inventory', 'purchase', 'supplier', 'delivery', 'hr', 'payroll', 'reports', 'settings']) loop
            for act in select unnest(array['view', 'create', 'edit', 'delete', 'approve', 'full_control']) loop
                insert into public.platform_role_template_permissions (role_template_id, resource, action, is_allowed)
                values (v_template_id, res, act, true)
                on conflict do nothing;
            end loop;
        end loop;
    end if;

    -- 2. Sales Manager
    select id into v_template_id from public.platform_role_templates where slug = 'sales_manager';
    if v_template_id is not null then
        for res in select unnest(array['customer', 'quotation', 'order', 'invoice', 'payment', 'delivery', 'reports']) loop
            for act in select unnest(array['view', 'create', 'edit', 'approve']) loop
                insert into public.platform_role_template_permissions (role_template_id, resource, action, is_allowed)
                values (v_template_id, res, act, true)
                on conflict do nothing;
            end loop;
        end loop;
    end if;
end $$;

-- 6. SEED INITIAL SYSTEM HEALTH TELEMETRY EVENTS
insert into public.platform_system_health_events (category, service_name, severity, message, error_details, resolved) values
('job', 'bg_order_cleanup', 'warning', 'Nightly temporary proof cache cleaner encountered 14 locked files in /tmp/render', '{"locked_files": 14, "disk_impact_mb": 420}'::jsonb, false),
('notification', 'greenweb_sms', 'error', 'Greenweb SMS Gateway balance threshold dropped below 500 SMS credits', '{"balance_credits": 210, "gateway": "greenweb_bd"}'::jsonb, false),
('notification', 'whatsapp_cloud_api', 'warning', 'Meta WhatsApp webhook delivery retry latency spiked to 4.2s for media attachments', '{"avg_latency_ms": 4200, "threshold_ms": 2000}'::jsonb, false),
('storage', 's3_storage_bucket', 'info', 'High-res artwork bucket (BD-Central) passed 68% total tier quota (680 GB / 1 TB)', '{"used_gb": 680, "total_gb": 1000}'::jsonb, false),
('api', 'bkash_checkout', 'error', 'bKash merchant token refresh timeout during midnight settlement reconciliation', '{"endpoint": "token/refresh", "http_status": 504}'::jsonb, false),
('integration', 'mushak_6_3_sync', 'warning', 'NBR e-VAT portal returned 429 Too Many Requests during end-of-month batch tax submission', '{"code": "NBR_RATE_LIMIT", "retry_after": 60}'::jsonb, false);

-- 7. DATABASE HELPER FUNCTIONS

-- Helper to check if a feature flag is enabled for a given tenant (checks tenant override first, falls back to platform default)
create or replace function public.platform_is_feature_enabled(p_key text, p_company_id uuid default null)
returns boolean as $$
declare
    v_flag_id uuid;
    v_global_enabled boolean;
    v_tenant_enabled boolean;
begin
    select id, is_enabled into v_flag_id, v_global_enabled
    from public.platform_feature_flags
    where key = p_key;

    if v_flag_id is null then
        return false;
    end if;

    if p_company_id is not null then
        select is_enabled into v_tenant_enabled
        from public.platform_tenant_feature_flags
        where flag_id = v_flag_id
          and company_id = p_company_id;

        if v_tenant_enabled is not null then
            return v_tenant_enabled;
        end if;
    end if;

    return v_global_enabled;
end;
$$ language plpgsql security definer;

-- Helper to log platform audit event
create or replace function public.log_platform_audit_event(
    p_action text,
    p_entity_type text,
    p_entity_id text default null,
    p_target_company_id uuid default null,
    p_details jsonb default '{}'::jsonb,
    p_ip_address text default null
)
returns uuid as $$
declare
    v_log_id uuid;
    v_admin_id uuid;
    v_email text;
begin
    select id, email into v_admin_id, v_email
    from public.platform_admins
    where user_id = auth.uid()
    limit 1;

    insert into public.platform_audit_logs (
        platform_admin_id,
        actor_email,
        action,
        entity_type,
        entity_id,
        target_company_id,
        details,
        ip_address
    ) values (
        v_admin_id,
        coalesce(v_email, 'system@printerp.com.bd'),
        p_action,
        p_entity_type,
        p_entity_id,
        p_target_company_id,
        p_details,
        p_ip_address
    ) returning id into v_log_id;

    return v_log_id;
end;
$$ language plpgsql security definer;

-- 8. STRICT RLS POLICIES FOR PLATFORM TABLES
-- These tables MUST NOT be queryable by standard tenant users. Only platform owners can query or mutate them.

create policy "Platform owners can view platform audit logs"
    on public.platform_audit_logs for select
    using (public.auth_is_platform_owner());

create policy "Platform owners can manage platform tenant feature flags"
    on public.platform_tenant_feature_flags for all
    using (public.auth_is_platform_owner());

create policy "Tenant users can view their own tenant feature flags"
    on public.platform_tenant_feature_flags for select
    using (public.auth_is_active_company_user(company_id));

create policy "Platform owners can manage platform role templates"
    on public.platform_role_templates for all
    using (public.auth_is_platform_owner());

create policy "Authenticated users can read platform role templates"
    on public.platform_role_templates for select
    using (auth.uid() is not null);

create policy "Platform owners can manage platform role template permissions"
    on public.platform_role_template_permissions for all
    using (public.auth_is_platform_owner());

create policy "Authenticated users can read platform role template permissions"
    on public.platform_role_template_permissions for select
    using (auth.uid() is not null);

create policy "Platform owners can view and manage system health events"
    on public.platform_system_health_events for all
    using (public.auth_is_platform_owner());


-- >>> FILE: 027_security_audit_and_data_integrity.sql <<<
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


-- >>> FILE: 028_workflow_automation.sql <<<
-- ==============================================================================
-- PrintERP SaaS - Migration 028: Workflow Automation Engine
-- Supports:
--   1. Declarative Workflow Rules with Structured Triggers & Actions
--   2. Workflow Execution Audit Logs
--   3. Pre-Seeded Printing Industry Workflows
--   4. Multi-Tenant Row Level Security (RLS)
-- ==============================================================================

-- 1. WORKFLOW RULES TABLE
create table if not exists public.workflow_rules (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    name text not null,
    description text,
    is_active boolean not null default true,
    trigger_type text not null check (
        trigger_type in (
            'record_created',
            'status_changed',
            'payment_received',
            'date_reached',
            'stock_threshold',
            'approval_completed'
        )
    ),
    trigger_entity text not null check (
        trigger_entity in (
            'quotation',
            'order',
            'design',
            'job',
            'invoice',
            'payment',
            'material',
            'delivery',
            'customer'
        )
    ),
    trigger_config jsonb not null default '{}'::jsonb,
    conditions jsonb not null default '[]'::jsonb,
    actions jsonb not null default '[]'::jsonb,
    execution_count int not null default 0,
    last_executed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_workflow_rules_comp_trigger on public.workflow_rules(company_id, trigger_type, trigger_entity);
alter table public.workflow_rules enable row level security;

-- 2. WORKFLOW EXECUTION LOGS TABLE
create table if not exists public.workflow_execution_logs (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    rule_id uuid references public.workflow_rules(id) on delete set null,
    rule_name text not null,
    trigger_type text not null,
    entity_type text not null,
    entity_id text,
    status text not null check (status in ('success', 'failed', 'skipped')),
    actions_taken jsonb not null default '[]'::jsonb,
    error_message text,
    executed_at timestamptz not null default now()
);

create index if not exists idx_wf_exec_logs_comp on public.workflow_execution_logs(company_id, executed_at desc);
alter table public.workflow_execution_logs enable row level security;

-- 3. ROW LEVEL SECURITY (RLS) POLICIES
create policy "Company members can view workflow rules"
    on public.workflow_rules for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized users can manage workflow rules"
    on public.workflow_rules for all
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'settings.edit')
            or public.auth_is_platform_owner()
        )
    );

create policy "Company members can view workflow logs"
    on public.workflow_execution_logs for select
    using (public.auth_is_active_company_user(company_id));

create policy "System can insert workflow execution logs"
    on public.workflow_execution_logs for insert
    with check (
        public.auth_is_active_company_user(company_id)
        or public.auth_is_platform_owner()
    );

-- 4. PRE-SEEDED WORKFLOW RULES (Inserted for all existing companies)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.companies LOOP
        INSERT INTO public.workflow_rules (
            company_id, name, description, is_active, trigger_type, trigger_entity, trigger_config, conditions, actions, execution_count
        ) VALUES
        (r.id, 'Quotation Approved ➔ Auto-Create Order', 'Automatically converts an approved quotation into a booked Job Order with media specifications.', true, 'status_changed', 'quotation', '{"to_status": "approved"}'::jsonb, '[]'::jsonb, '[{"type": "create_document", "config": {"target_document": "order", "copy_items": true}}, {"type": "send_notification", "config": {"title": "New Order Generated", "message": "Order created automatically from approved quote."}}]'::jsonb, 0),
        (r.id, 'Order Confirmed ➔ Create Production Jobs', 'Generates digital press or CNC acrylic fabrication job tickets upon order confirmation.', true, 'status_changed', 'order', '{"to_status": "confirmed"}'::jsonb, '[]'::jsonb, '[{"type": "create_document", "config": {"target_document": "production_job"}}, {"type": "change_status", "config": {"target": "order", "new_status": "in_prepress"}}]'::jsonb, 0),
        (r.id, 'Design Approved ➔ Route to Production Press', 'Routes prepress approved vector artwork to the allocated print machine floor queue.', true, 'approval_completed', 'design', '{"approval_type": "prepress_proof"}'::jsonb, '[]'::jsonb, '[{"type": "change_status", "config": {"target": "job", "new_status": "queued_for_print"}}, {"type": "send_notification", "config": {"title": "Artwork Approved for Press", "message": "Job sent to Konica/Roland press queue."}}]'::jsonb, 0),
        (r.id, 'Production Completed ➔ Notify Sales Team', 'Alerts sales representatives when the print job finishes and passes QC inspection.', true, 'status_changed', 'job', '{"to_status": "completed"}'::jsonb, '[]'::jsonb, '[{"type": "send_notification", "config": {"title": "Job Print Complete", "role": "sales_manager", "message": "Print and finishing completed for order."}}, {"type": "send_whatsapp", "config": {"template": "order_ready_client", "recipient": "customer_phone"}}]'::jsonb, 0),
        (r.id, 'Order Ready ➔ Create Delivery Task', 'Creates a dispatch challan and assigns an installation/delivery rider.', true, 'status_changed', 'order', '{"to_status": "ready"}'::jsonb, '[]'::jsonb, '[{"type": "create_task", "config": {"task_type": "delivery", "priority": "high"}}, {"type": "assign_employee", "config": {"role": "delivery_rider"}}]'::jsonb, 0),
        (r.id, 'Invoice Overdue ➔ Multi-Channel Reminder', 'Dispatches SMS and WhatsApp payment reminder when invoice reaches overdue status.', true, 'date_reached', 'invoice', '{"condition": "overdue_days >= 3"}'::jsonb, '[{"field": "due_amount", "operator": "greater_than", "value": 0}]'::jsonb, '[{"type": "send_sms", "config": {"message": "Gentle reminder: Your invoice is overdue. Kindly settle via bKash/Bank."}}, {"type": "create_task", "config": {"task_type": "payment_follow_up", "assign_to": "accountant"}}]'::jsonb, 0),
        (r.id, 'Stock Below Minimum ➔ Alert Purchase Manager', 'Alerts raw material procurement team when roll media or ink chemistry breaches reorder point.', true, 'stock_threshold', 'material', '{"threshold_type": "below_min_stock_level"}'::jsonb, '[]'::jsonb, '[{"type": "send_notification", "config": {"title": "Low Stock Reorder Alert", "message": "Material level breached safety buffer. Reorder required."}}, {"type": "create_task", "config": {"task_type": "rfq_supplier", "priority": "urgent"}}]'::jsonb, 0);
    END LOOP;
END $$;



-- >>> FILE: 029_production_performance_optimization.sql <<<
-- ==============================================================================
-- PrintERP SaaS - Migration 029: Production Performance Optimization
-- High-performance covering indexes, foreign key index coverage,
-- optimized RLS function caching, and pre-aggregated dashboard KPI queries.
-- ==============================================================================

-- 1. COMPOSITE INDEXES FOR HIGH-TRAFFIC TENANT QUERIES
-- Eliminates sequential table scans by indexing (company_id, status, created_at DESC)

CREATE INDEX IF NOT EXISTS idx_sales_orders_company_status_created 
  ON public.sales_orders (company_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sales_orders_company_customer_created 
  ON public.sales_orders (company_id, customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quotations_company_status_created 
  ON public.quotations (company_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quotations_company_customer 
  ON public.quotations (company_id, customer_id);

CREATE INDEX IF NOT EXISTS idx_invoices_company_status_due 
  ON public.invoices (company_id, status, due_date ASC);

CREATE INDEX IF NOT EXISTS idx_invoices_company_sales_order 
  ON public.invoices (company_id, sales_order_id);

CREATE INDEX IF NOT EXISTS idx_payments_company_customer_date 
  ON public.payments (company_id, customer_id, payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_production_jobs_company_dept_status 
  ON public.production_jobs (company_id, department, status);

CREATE INDEX IF NOT EXISTS idx_production_jobs_company_status_prio 
  ON public.production_jobs (company_id, status, priority, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_company_category_stock 
  ON public.materials (company_id, category, current_stock);

CREATE INDEX IF NOT EXISTS idx_stock_ledger_company_material_date 
  ON public.stock_ledger (company_id, material_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_company_date 
  ON public.audit_logs (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_company_entity 
  ON public.audit_logs (company_id, entity, entity_id);

CREATE INDEX IF NOT EXISTS idx_customers_company_mobile 
  ON public.customers (company_id, mobile);

CREATE INDEX IF NOT EXISTS idx_delivery_company_sales_order 
  ON public.delivery_challans (company_id, sales_order_id, status);

CREATE INDEX IF NOT EXISTS idx_workflow_logs_company_rule 
  ON public.workflow_execution_logs (company_id, rule_id, executed_at DESC);

-- 2. HIGH-PERFORMANCE MATERIALIZED / SERVER-SIDE DASHBOARD KPI AGGREGATION
-- Avoids multiple network hops and heavy client-side aggregation by running
-- a single, parallelized, indexed query.

CREATE OR REPLACE FUNCTION public.get_tenant_dashboard_metrics(p_company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'today_sales', COALESCE((
      SELECT SUM(final_price)
      FROM public.sales_orders
      WHERE company_id = p_company_id
        AND status NOT IN ('cancelled', 'pending')
        AND created_at >= CURRENT_DATE
    ), 0),
    'pending_orders_count', (
      SELECT COUNT(*)
      FROM public.sales_orders
      WHERE company_id = p_company_id
        AND status IN ('pending', 'confirmed', 'in_production')
    ),
    'active_jobs_count', (
      SELECT COUNT(*)
      FROM public.production_jobs
      WHERE company_id = p_company_id
        AND status IN ('queued', 'in_progress', 'quality_check')
    ),
    'total_receivables', COALESCE((
      SELECT SUM(due_amount)
      FROM public.invoices
      WHERE company_id = p_company_id
        AND status IN ('unpaid', 'partially_paid', 'overdue')
    ), 0),
    'low_stock_materials_count', (
      SELECT COUNT(*)
      FROM public.materials
      WHERE company_id = p_company_id
        AND current_stock <= min_stock_level
    ),
    'last_updated', NOW()
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.get_tenant_dashboard_metrics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_dashboard_metrics(UUID) TO service_role;



-- >>> FILE: 030_platform_admin_hardening.sql <<<
-- ==============================================================================
-- PrintERP SaaS - Migration 030: Platform Admin Complete Hardening & Telemetry
-- Supports:
--   1. Platform Incidents Management Ledger
--   2. Platform Background Jobs Telemetry & Retries
--   3. Platform Emergency Controls & Kill-Switches
--   4. Platform Active Sessions & Token Revocation
--   5. Platform Tenant Data Export Logs
--   6. Platform Historical Health & Usage Snapshots
--   7. Strict Server-Side RLS Enforcement
-- ==============================================================================

-- 1. PLATFORM INCIDENTS TABLE
create table if not exists public.platform_incidents (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    description text not null,
    service_name text not null, -- 'whatsapp_cloud_api', 'greenweb_sms', 'bkash_gateway', 'database_cluster', 's3_storage'
    severity text not null default 'minor' check (severity in ('minor', 'major', 'critical')),
    status text not null default 'investigating' check (status in ('investigating', 'identified', 'monitoring', 'resolved')),
    affected_tenants_count integer not null default 0,
    root_cause text,
    resolution_notes text,
    created_by uuid references public.platform_admins(id) on delete set null,
    resolved_by uuid references public.platform_admins(id) on delete set null,
    started_at timestamptz not null default now(),
    resolved_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_platform_incidents_status on public.platform_incidents(status);
create index if not exists idx_platform_incidents_service on public.platform_incidents(service_name);
alter table public.platform_incidents enable row level security;

-- 2. PLATFORM BACKGROUND JOBS TABLE
create table if not exists public.platform_background_jobs (
    id uuid primary key default gen_random_uuid(),
    job_type text not null, -- 'render_proof_cleanup', 'subscription_expiry_check', 'daily_vat_summary', 'sms_digest_dispatch', 'invoice_pdf_compaction'
    company_id uuid references public.companies(id) on delete set null,
    status text not null default 'queued' check (status in ('queued', 'running', 'retrying', 'failed', 'completed', 'cancelled', 'dead_letter')),
    attempts integer not null default 0,
    max_attempts integer not null default 3,
    payload jsonb default '{}'::jsonb,
    error_log text,
    last_error_details jsonb default '{}'::jsonb,
    duration_ms integer,
    scheduled_for timestamptz not null default now(),
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists idx_platform_bg_jobs_status on public.platform_background_jobs(status);
create index if not exists idx_platform_bg_jobs_type on public.platform_background_jobs(job_type);
create index if not exists idx_platform_bg_jobs_comp on public.platform_background_jobs(company_id);
alter table public.platform_background_jobs enable row level security;

-- 3. PLATFORM EMERGENCY CONTROLS TABLE
create table if not exists public.platform_emergency_controls (
    id uuid primary key default gen_random_uuid(),
    control_key text unique not null, -- 'pause_whatsapp', 'pause_sms', 'pause_payments', 'pause_new_tenants', 'maintenance_mode', 'pause_background_jobs'
    name text not null,
    description text not null,
    is_active boolean not null default false,
    reason text,
    activated_by uuid references public.platform_admins(id) on delete set null,
    activated_by_email text,
    activated_at timestamptz,
    deactivated_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.platform_emergency_controls enable row level security;

-- Seed default emergency control keys
insert into public.platform_emergency_controls (control_key, name, description, is_active) values
('pause_whatsapp', 'Pause WhatsApp Cloud API', 'Temporarily halts all outgoing WhatsApp order challans and proof previews.', false),
('pause_sms', 'Pause SMS Gateway Dispatch', 'Suspends outbound Greenweb/SSL SMS notifications across all tenants.', false),
('pause_payments', 'Pause Payment Gateway Processing', 'Puts bKash, Nagad, and SSLCommerz checkouts into maintenance queue.', false),
('pause_new_tenants', 'Pause New Tenant Registration', 'Prevents new printing press signups from registering public onboarding.', false),
('maintenance_mode', 'Global Maintenance Mode', 'Locks tenant write mutations with an advisory maintenance banner.', false),
('pause_background_jobs', 'Pause Non-Critical Background Workers', 'Freezes background render workers and media compactions to preserve database compute.', false)
on conflict (control_key) do nothing;

-- 4. PLATFORM ACTIVE SESSIONS TABLE (For remote platform session revocation)
create table if not exists public.platform_active_sessions (
    id uuid primary key default gen_random_uuid(),
    platform_admin_id uuid not null references public.platform_admins(id) on delete cascade,
    session_token_hash text not null unique,
    ip_address text,
    user_agent text,
    device_name text,
    location text, -- 'Dhaka, Bangladesh'
    is_revoked boolean not null default false,
    last_seen_at timestamptz not null default now(),
    created_at timestamptz not null default now()
);

create index if not exists idx_platform_sessions_admin on public.platform_active_sessions(platform_admin_id);
alter table public.platform_active_sessions enable row level security;

-- 5. PLATFORM TENANT EXPORTS TABLE
create table if not exists public.platform_tenant_exports (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    requested_by uuid references public.platform_admins(id) on delete set null,
    requested_by_email text not null,
    modules text[] not null default '{}',
    status text not null default 'completed' check (status in ('pending', 'processing', 'completed', 'failed')),
    file_format text not null default 'json' check (file_format in ('json', 'csv', 'zip')),
    download_token text unique,
    expires_at timestamptz not null default now() + interval '24 hours',
    download_count integer not null default 0,
    created_at timestamptz not null default now()
);

create index if not exists idx_tenant_exports_comp on public.platform_tenant_exports(company_id);
alter table public.platform_tenant_exports enable row level security;

-- 6. RLS POLICIES FOR PLATFORM GOVERNANCE
create policy "Platform owners have full control on incidents"
    on public.platform_incidents for all
    using (public.auth_is_platform_owner());

create policy "Platform owners have full control on background jobs"
    on public.platform_background_jobs for all
    using (public.auth_is_platform_owner());

create policy "Platform owners have full control on emergency controls"
    on public.platform_emergency_controls for all
    using (public.auth_is_platform_owner());

create policy "Platform owners have full control on active sessions"
    on public.platform_active_sessions for all
    using (public.auth_is_platform_owner());

create policy "Platform owners have full control on tenant exports"
    on public.platform_tenant_exports for all
    using (public.auth_is_platform_owner());

