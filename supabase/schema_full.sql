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

drop trigger if exists update_companies_modtime on public.companies;
create trigger update_companies_modtime
    before update on public.companies
    for each row execute function public.update_updated_at_column();

drop trigger if exists update_profiles_modtime on public.profiles;
create trigger update_profiles_modtime
    before update on public.profiles
    for each row execute function public.update_updated_at_column();

drop trigger if exists update_memberships_modtime on public.tenant_memberships;
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

-- 6. SYSTEM HEALTH TELEMETRY TABLE READY

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


-- >>> FILE: 031_platform_support_sessions_and_hardening.sql <<<
-- ==============================================================================
-- PrintERP / InkFlow SaaS - Migration 031: Platform Support Sessions & Control Plane Hardening
-- Supports:
--   1. Secure Temporary Support Sessions with Explicit Reason & Automatic TTL
--   2. Granular Support Access Levels (read_only, config_only, full_support)
--   3. Platform Security Definer Functions for Support Validation
--   4. Strict RLS Policies Isolating Platform Data from Normal Tenant Users
-- ==============================================================================

-- 1. PLATFORM SUPPORT SESSIONS TABLE
create table if not exists public.platform_support_sessions (
    id uuid primary key default gen_random_uuid(),
    platform_admin_id uuid not null references public.platform_admins(id) on delete cascade,
    company_id uuid not null references public.companies(id) on delete cascade,
    reason text not null,
    access_level text not null default 'read_only' check (access_level in ('read_only', 'config_only', 'full_support')),
    session_token_hash text not null unique,
    status text not null default 'active' check (status in ('active', 'expired', 'revoked')),
    started_at timestamptz not null default now(),
    expires_at timestamptz not null default now() + interval '2 hours',
    revoked_at timestamptz,
    revoked_by uuid references public.platform_admins(id) on delete set null,
    created_at timestamptz not null default now()
);

create index if not exists idx_platform_support_sessions_company on public.platform_support_sessions(company_id);
create index if not exists idx_platform_support_sessions_admin on public.platform_support_sessions(platform_admin_id);
create index if not exists idx_platform_support_sessions_status on public.platform_support_sessions(status);
create index if not exists idx_platform_support_sessions_token on public.platform_support_sessions(session_token_hash);
create index if not exists idx_platform_support_sessions_expires on public.platform_support_sessions(expires_at desc);

alter table public.platform_support_sessions enable row level security;

-- 2. SUPPORT SESSION VALIDATION FUNCTION
create or replace function public.auth_validate_support_session(
    p_company_id uuid,
    p_token_hash text
)
returns table (
    is_valid boolean,
    access_level text,
    admin_id uuid,
    admin_email text,
    admin_name text,
    expires_at timestamptz
) as $$
begin
    return query
    select 
        (pss.status = 'active' and pss.expires_at > now()) as is_valid,
        pss.access_level,
        pa.id as admin_id,
        pa.email as admin_email,
        pa.full_name as admin_name,
        pss.expires_at
    from public.platform_support_sessions pss
    join public.platform_admins pa on pa.id = pss.platform_admin_id
    where pss.company_id = p_company_id
      and pss.session_token_hash = p_token_hash
      and pa.is_active = true
    limit 1;
end;
$$ language plpgsql security definer;

-- 3. RLS POLICIES FOR SUPPORT SESSIONS
create policy "Platform owners have full control on support sessions"
    on public.platform_support_sessions for all
    using (public.auth_is_platform_owner());

-- 4. ENSURE PLATFORM ADMIN COLUMNS
alter table public.platform_admins
    add column if not exists mfa_enabled boolean not null default false,
    add column if not exists last_login_at timestamptz,
    add column if not exists phone text,
    add column if not exists avatar_url text,
    add column if not exists preferences jsonb not null default '{"language": "en", "timezone": "Asia/Dhaka", "date_format": "YYYY-MM-DD", "currency": "BDT"}'::jsonb;

-- 5. ENSURE COMPANY STATUS CHECK CONSTRAINT SUPPORTS ALL 7 LIFECYCLE STATES
-- Lifecycle states: 'trial', 'active', 'past_due', 'grace_period', 'suspended', 'cancelled', 'archived'
do $$
begin
    -- Add suspension_reason column if missing
    alter table public.companies
        add column if not exists suspension_reason text,
        add column if not exists suspended_at timestamptz,
        add column if not exists suspended_by uuid references public.platform_admins(id) on delete set null,
        add column if not exists cancelled_at timestamptz,
        add column if not exists cancellation_reason text,
        add column if not exists archived_at timestamptz;
end $$;


-- >>> FILE: 032_platform_security_hardening.sql <<<
-- ==============================================================================
-- PrintERP / InkFlow SaaS - Migration 032: Platform Security & Root Control Plane Hardening
-- Single Source of Truth: Supabase Auth + PostgreSQL RLS + Explicit Platform RBAC
-- ==============================================================================

-- 1. Ensure all required columns exist on platform_admins
alter table public.platform_admins
    add column if not exists mfa_enabled boolean not null default false,
    add column if not exists last_login_at timestamptz,
    add column if not exists phone text,
    add column if not exists avatar_url text,
    add column if not exists preferences jsonb not null default '{"language": "en", "timezone": "Asia/Dhaka", "date_format": "YYYY-MM-DD", "currency": "BDT"}'::jsonb;

-- Ensure indexes on platform_admins
create index if not exists idx_platform_admins_user on public.platform_admins(user_id);
create index if not exists idx_platform_admins_email on public.platform_admins(email);
create index if not exists idx_platform_admins_active on public.platform_admins(is_active);

-- 2. Ensure platform_support_sessions table & constraints
create table if not exists public.platform_support_sessions (
    id uuid primary key default gen_random_uuid(),
    platform_admin_id uuid not null references public.platform_admins(id) on delete cascade,
    company_id uuid not null references public.companies(id) on delete cascade,
    reason text not null,
    access_level text not null default 'read_only' check (access_level in ('read_only', 'config_only', 'full_support')),
    session_token_hash text not null unique,
    status text not null default 'active' check (status in ('active', 'expired', 'revoked')),
    started_at timestamptz not null default now(),
    expires_at timestamptz not null default now() + interval '2 hours',
    revoked_at timestamptz,
    revoked_by uuid references public.platform_admins(id) on delete set null,
    created_at timestamptz not null default now()
);

create index if not exists idx_platform_support_sessions_company on public.platform_support_sessions(company_id);
create index if not exists idx_platform_support_sessions_admin on public.platform_support_sessions(platform_admin_id);
create index if not exists idx_platform_support_sessions_status on public.platform_support_sessions(status);
create index if not exists idx_platform_support_sessions_token on public.platform_support_sessions(session_token_hash);
create index if not exists idx_platform_support_sessions_expires on public.platform_support_sessions(expires_at desc);

alter table public.platform_support_sessions enable row level security;

-- 3. Ensure platform_active_sessions table
create table if not exists public.platform_active_sessions (
    id uuid primary key default gen_random_uuid(),
    platform_admin_id uuid not null references public.platform_admins(id) on delete cascade,
    session_token_hash text not null unique,
    ip_address text,
    user_agent text,
    device_name text,
    location text,
    is_revoked boolean not null default false,
    last_seen_at timestamptz not null default now(),
    created_at timestamptz not null default now()
);

create index if not exists idx_platform_sessions_admin on public.platform_active_sessions(platform_admin_id);
create index if not exists idx_platform_sessions_token on public.platform_active_sessions(session_token_hash);
create index if not exists idx_platform_sessions_revoked on public.platform_active_sessions(is_revoked);

alter table public.platform_active_sessions enable row level security;

-- 4. Fail-Closed Platform Security Definer Functions

-- Canonical check for Platform Owner
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

-- Strict Server-Side Support Session Validator
create or replace function public.auth_validate_support_session(
    p_company_id uuid,
    p_token_hash text
)
returns table (
    is_valid boolean,
    access_level text,
    admin_id uuid,
    admin_email text,
    admin_name text,
    expires_at timestamptz
) as $$
begin
    return query
    select 
        (pss.status = 'active' and pss.expires_at > now()) as is_valid,
        pss.access_level,
        pa.id as admin_id,
        pa.email as admin_email,
        pa.full_name as admin_name,
        pss.expires_at
    from public.platform_support_sessions pss
    join public.platform_admins pa on pa.id = pss.platform_admin_id
    where pss.company_id = p_company_id
      and pss.session_token_hash = p_token_hash
      and pa.is_active = true
    limit 1;
end;
$$ language plpgsql security definer;

-- 5. RLS Policies for Platform Tables (Tenant users are completely quarantined)
drop policy if exists "Platform owners have full control on support sessions" on public.platform_support_sessions;
create policy "Platform owners have full control on support sessions"
    on public.platform_support_sessions for all
    using (public.auth_is_platform_owner());

drop policy if exists "Platform owners have full control on active sessions" on public.platform_active_sessions;
create policy "Platform owners have full control on active sessions"
    on public.platform_active_sessions for all
    using (public.auth_is_platform_owner());

drop policy if exists "Platform owners can view and manage platform_admins" on public.platform_admins;
create policy "Platform owners can view and manage platform_admins"
    on public.platform_admins for all
    using (public.auth_is_platform_owner());


-- >>> FILE: 033_user_account_creation_and_profiles_fix.sql <<<
-- ==============================================================================
-- PrintERP / InkFlow SaaS - Migration 033: User Account Creation & Profiles Hardening
-- Ensures auth.users signup trigger automatically syncs into public.user_profiles
-- and public.profiles with metadata, and configures non-blocking RLS policies.
-- ==============================================================================

-- 1. Ensure public.user_profiles table exists with all standard columns
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

-- Ensure public.profiles table exists as well for backwards compatibility
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

-- 2. Enhanced handle_new_user trigger function
create or replace function public.handle_new_user()
returns trigger as $$
declare
    user_name text;
    user_phone text;
    user_locale text;
begin
    user_name := coalesce(
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'name',
        split_part(new.email, '@', 1)
    );
    user_phone := coalesce(
        new.raw_user_meta_data->>'phone',
        new.phone,
        null
    );
    user_locale := coalesce(
        new.raw_user_meta_data->>'preferred_locale',
        new.raw_user_meta_data->>'locale',
        'bn'
    );

    -- 1. Insert into public.user_profiles
    insert into public.user_profiles (
        id,
        email,
        full_name,
        phone,
        preferred_locale,
        is_active,
        created_at,
        updated_at
    )
    values (
        new.id,
        new.email,
        user_name,
        user_phone,
        user_locale,
        true,
        now(),
        now()
    )
    on conflict (id) do update set
        email = excluded.email,
        full_name = coalesce(excluded.full_name, public.user_profiles.full_name),
        phone = coalesce(excluded.phone, public.user_profiles.phone),
        preferred_locale = coalesce(excluded.preferred_locale, public.user_profiles.preferred_locale),
        updated_at = now();

    -- 2. Insert into public.profiles for backwards compatibility
    insert into public.profiles (
        id,
        full_name,
        phone,
        preferred_locale,
        created_at,
        updated_at
    )
    values (
        new.id,
        user_name,
        user_phone,
        user_locale,
        now(),
        now()
    )
    on conflict (id) do update set
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        phone = coalesce(excluded.phone, public.profiles.phone),
        preferred_locale = coalesce(excluded.preferred_locale, public.profiles.preferred_locale),
        updated_at = now();

    return new;
end;
$$ language plpgsql security definer;

-- 3. Re-bind trigger to auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- 4. Enable RLS and verify policies on user_profiles
alter table public.user_profiles enable row level security;

drop policy if exists "Users can view own user_profile" on public.user_profiles;
create policy "Users can view own user_profile" on public.user_profiles
    for select using (auth.uid() = id);

drop policy if exists "Users can update own user_profile" on public.user_profiles;
create policy "Users can update own user_profile" on public.user_profiles
    for update using (auth.uid() = id);

drop policy if exists "Users can insert own user_profile" on public.user_profiles;
create policy "Users can insert own user_profile" on public.user_profiles
    for insert with check (auth.uid() = id);

-- Allow company members to view profiles of teammates in the same company
drop policy if exists "Members can view teammate profiles" on public.user_profiles;
create policy "Members can view teammate profiles" on public.user_profiles
    for select using (
        exists (
            select 1 from public.company_users cu1
            join public.company_users cu2 on cu1.company_id = cu2.company_id
            where cu1.user_id = auth.uid()
              and cu2.user_id = public.user_profiles.id
              and cu1.status = 'active'
        )
    );


-- >>> FILE: 034_tenant_auth_and_isolation_hardening.sql <<<
-- ==============================================================================
-- InkFlow SaaS - Migration 034: Production Tenant Auth & Multi-Tenant Isolation Hardening
-- Enforces PostgreSQL-level isolation, search_path protection on security definer functions,
-- active membership verification, and row-level security across all operational tables.
-- ==============================================================================

-- 1. HARDEN SECURITY DEFINER HELPER FUNCTIONS WITH EXPLICIT SEARCH_PATH

-- Check if authenticated user is an ACTIVE member of the company
create or replace function public.auth_is_active_company_user(target_company_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    if auth.uid() is null or target_company_id is null then
        return false;
    end if;

    return exists (
        select 1
        from public.company_users cu
        join public.companies c on c.id = cu.company_id
        where cu.company_id = target_company_id
          and cu.user_id = auth.uid()
          and cu.status = 'active'
          and c.is_active = true
    );
end;
$$;

-- Resolves the primary role slug of the user in the company
create or replace function public.auth_get_user_company_role(target_company_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    role_slug text;
begin
    if auth.uid() is null or target_company_id is null then
        return null;
    end if;

    select r.slug into role_slug
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    join public.company_users cu on cu.id = ur.company_user_id
    join public.companies c on c.id = cu.company_id
    where cu.company_id = target_company_id
      and cu.user_id = auth.uid()
      and cu.status = 'active'
      and c.is_active = true
    limit 1;
    
    return role_slug;
end;
$$;

-- Checks if the authenticated user has a specific permission in the company
create or replace function public.auth_user_has_permission(target_company_id uuid, required_permission text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    user_role text;
begin
    if auth.uid() is null or target_company_id is null or required_permission is null then
        return false;
    end if;

    user_role := public.auth_get_user_company_role(target_company_id);

    -- Owners & Business Owners have full organizational permissions
    if user_role in ('owner', 'business_owner', 'admin') then
        return true;
    end if;

    -- Check if user has explicit negative override
    if exists (
        select 1
        from public.user_permission_overrides upo
        join public.company_users cu on cu.id = upo.company_user_id
        join public.permissions p on p.id = upo.permission_id
        where cu.company_id = target_company_id
          and cu.user_id = auth.uid()
          and cu.status = 'active'
          and p.code = required_permission
          and upo.is_granted = false
    ) then
        return false;
    end if;

    -- Check if user has explicit positive override
    if exists (
        select 1
        from public.user_permission_overrides upo
        join public.company_users cu on cu.id = upo.company_user_id
        join public.permissions p on p.id = upo.permission_id
        where cu.company_id = target_company_id
          and cu.user_id = auth.uid()
          and cu.status = 'active'
          and p.code = required_permission
          and upo.is_granted = true
    ) then
        return true;
    end if;

    -- Check role-based permission
    return exists (
        select 1
        from public.user_roles ur
        join public.company_users cu on cu.id = ur.company_user_id
        join public.role_permissions rp on rp.role_id = ur.role_id
        join public.permissions p on p.id = rp.permission_id
        where cu.company_id = target_company_id
          and cu.user_id = auth.uid()
          and cu.status = 'active'
          and (p.code = required_permission or p.code = split_part(required_permission, '.', 1) || '.full_control')
    );
end;
$$;

-- Legacy alias helper for backwards-compatibility
create or replace function public.auth_user_has_company_access(target_company_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    return public.auth_is_active_company_user(target_company_id);
end;
$$;

-- Harden handle_new_user trigger function
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    user_name text;
    user_phone text;
    user_locale text;
begin
    user_name := coalesce(
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'name',
        split_part(new.email, '@', 1)
    );
    user_phone := coalesce(
        new.raw_user_meta_data->>'phone',
        new.phone,
        null
    );
    user_locale := coalesce(
        new.raw_user_meta_data->>'preferred_locale',
        new.raw_user_meta_data->>'locale',
        'bn'
    );

    -- 1. Upsert into public.user_profiles
    insert into public.user_profiles (
        id,
        email,
        full_name,
        phone,
        preferred_locale,
        is_active,
        created_at,
        updated_at
    )
    values (
        new.id,
        new.email,
        user_name,
        user_phone,
        user_locale,
        true,
        now(),
        now()
    )
    on conflict (id) do update set
        email = excluded.email,
        full_name = coalesce(excluded.full_name, public.user_profiles.full_name),
        phone = coalesce(excluded.phone, public.user_profiles.phone),
        preferred_locale = coalesce(excluded.preferred_locale, public.user_profiles.preferred_locale),
        updated_at = now();

    -- 2. Upsert into public.profiles for legacy compatibility
    insert into public.profiles (
        id,
        full_name,
        phone,
        preferred_locale,
        created_at,
        updated_at
    )
    values (
        new.id,
        user_name,
        user_phone,
        user_locale,
        now(),
        now()
    )
    on conflict (id) do update set
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        phone = coalesce(excluded.phone, public.profiles.phone),
        preferred_locale = coalesce(excluded.preferred_locale, public.profiles.preferred_locale),
        updated_at = now();

    return new;
end;
$$;

-- 2. RE-APPLY STRICT RLS POLICIES ACROSS ALL CORE TENANT ENTITIES

-- Companies
alter table public.companies enable row level security;
drop policy if exists "Members can view company details" on public.companies;
create policy "Members can view company details" on public.companies
    for select using (public.auth_is_active_company_user(id));

drop policy if exists "Owners and Admins can update company" on public.companies;
create policy "Owners and Admins can update company" on public.companies
    for update using (public.auth_get_user_company_role(id) in ('owner', 'business_owner', 'admin'));

drop policy if exists "Authenticated users can create companies" on public.companies;
create policy "Authenticated users can create companies" on public.companies
    for insert with check (auth.uid() is not null);

-- Company Settings
alter table public.company_settings enable row level security;
drop policy if exists "Active members can view company settings" on public.company_settings;
create policy "Active members can view company settings" on public.company_settings
    for select using (public.auth_is_active_company_user(company_id));

drop policy if exists "Admins can update company settings" on public.company_settings;
create policy "Admins can update company settings" on public.company_settings
    for update using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_get_user_company_role(company_id) in ('owner', 'business_owner', 'admin')
            or public.auth_user_has_permission(company_id, 'settings.edit')
        )
    );

-- Branches
alter table public.branches enable row level security;
drop policy if exists "Active members can view branches" on public.branches;
create policy "Active members can view branches" on public.branches
    for select using (public.auth_is_active_company_user(company_id));

drop policy if exists "Admins can manage branches" on public.branches;
create policy "Admins can manage branches" on public.branches
    for all using (
        public.auth_is_active_company_user(company_id)
        and public.auth_get_user_company_role(company_id) in ('owner', 'business_owner', 'admin')
    );

-- Company Users & Memberships
alter table public.company_users enable row level security;
drop policy if exists "Members can view company users" on public.company_users;
create policy "Members can view company users" on public.company_users
    for select using (public.auth_is_active_company_user(company_id) or auth.uid() = user_id);

drop policy if exists "Admins can manage company users" on public.company_users;
create policy "Admins can manage company users" on public.company_users
    for all using (
        public.auth_is_active_company_user(company_id)
        and public.auth_get_user_company_role(company_id) in ('owner', 'business_owner', 'admin')
    );

-- 3. ENSURE ESSENTIAL ISOLATION INDEXES
create index if not exists idx_company_users_comp_user on public.company_users(company_id, user_id);
create index if not exists idx_company_users_status on public.company_users(status);
create index if not exists idx_user_roles_comp_user on public.user_roles(company_user_id);


-- >>> FILE: 035_platform_control_panel_hardening.sql <<<
-- ==============================================================================
-- InkFlow SaaS - Migration 035: Platform Control Panel Hardening & Last-Owner Protection
-- Supports:
--   1. Last Active Platform Owner Protection Trigger
--   2. Authoritative Platform Support Session Functions & Expiry Checks
--   3. Secure Tenant Users Aggregation Definer Function (Zero Secrets Exposure)
--   4. Strict RLS Policies Isolating Platform Data from Tenant Accounts
--   5. High-Performance Platform Telemetry & Governance Indexes
-- ==============================================================================

-- 1. ENSURE PLATFORM_ADMINS COLUMNS & RESPONSIBILITIES ARRAY
alter table public.platform_admins
    add column if not exists phone text,
    add column if not exists avatar_url text,
    add column if not exists responsibilities jsonb not null default '["platform_owner"]'::jsonb,
    add column if not exists mfa_enabled boolean not null default false,
    add column if not exists last_login_at timestamptz,
    add column if not exists preferences jsonb not null default '{"language": "en", "timezone": "Asia/Dhaka", "date_format": "YYYY-MM-DD", "currency": "BDT"}'::jsonb;

-- 2. LAST PLATFORM OWNER PROTECTION TRIGGER
create or replace function public.prevent_last_platform_owner_removal()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_active_owners_count integer;
begin
    -- Only check if an active platform_owner is being deactivated, deleted, or demoted
    if (TG_OP = 'DELETE' and OLD.role = 'platform_owner' and OLD.is_active = true) or
       (TG_OP = 'UPDATE' and OLD.role = 'platform_owner' and OLD.is_active = true and (NEW.is_active = false or NEW.role != 'platform_owner')) then
        
        select count(*) into v_active_owners_count
        from public.platform_admins
        where role = 'platform_owner'
          and is_active = true
          and id != OLD.id;

        if v_active_owners_count < 1 then
            raise exception 'Platform Security Violation: Cannot remove, deactivate, or demote the last active Platform Owner.';
        end if;
    end if;

    if TG_OP = 'DELETE' then
        return OLD;
    else
        return NEW;
    end if;
end;
$$;

drop trigger if exists trg_prevent_last_platform_owner on public.platform_admins;
create trigger trg_prevent_last_platform_owner
    before update or delete on public.platform_admins
    for each row
    execute function public.prevent_last_platform_owner_removal();

-- 3. ENSURE PLATFORM ACTIVE SESSIONS TABLE
create table if not exists public.platform_active_sessions (
    id uuid primary key default gen_random_uuid(),
    platform_admin_id uuid not null references public.platform_admins(id) on delete cascade,
    session_token_hash text not null unique,
    ip_address text,
    user_agent text,
    device_name text default 'Desktop Workstation',
    location text default 'Bangladesh',
    is_revoked boolean not null default false,
    revoked_at timestamptz,
    last_seen_at timestamptz not null default now(),
    created_at timestamptz not null default now()
);

create index if not exists idx_platform_sessions_admin on public.platform_active_sessions(platform_admin_id);
create index if not exists idx_platform_sessions_revoked on public.platform_active_sessions(is_revoked);
create index if not exists idx_platform_sessions_token on public.platform_active_sessions(session_token_hash);
alter table public.platform_active_sessions enable row level security;

-- 4. SECURE TENANT USERS AGGREGATION FUNCTION FOR PLATFORM OWNER (Zero Secrets Exposure)
create or replace function public.get_platform_tenant_users_overview(
    p_search text default null,
    p_company_id uuid default null,
    p_status text default null,
    p_limit integer default 50,
    p_offset integer default 0
)
returns table (
    company_user_id uuid,
    user_id uuid,
    company_id uuid,
    company_name text,
    company_slug text,
    full_name text,
    full_name_bn text,
    email text,
    phone text,
    status text,
    primary_role text,
    responsibilities jsonb,
    branch_name text,
    created_at timestamptz,
    total_count bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    -- Must be authenticated platform administrator
    if not public.auth_is_platform_owner() then
        raise exception 'Unauthorized: Only platform administrators can view cross-tenant user registries.';
    end if;

    return query
    with filtered_users as (
        select
            cu.id as f_company_user_id,
            cu.user_id as f_user_id,
            cu.company_id as f_company_id,
            c.name as f_company_name,
            c.slug as f_company_slug,
            coalesce(up.full_name, split_part(coalesce(up.email, 'User'), '@', 1)) as f_full_name,
            up.full_name_bn as f_full_name_bn,
            coalesce(up.email, 'No Email') as f_email,
            up.phone as f_phone,
            cu.status as f_status,
            coalesce(
                (select r.slug from public.user_roles ur join public.roles r on r.id = ur.role_id where ur.company_user_id = cu.id limit 1),
                'member'
            ) as f_primary_role,
            coalesce(to_jsonb(cu.responsibilities), '[]'::jsonb) as f_responsibilities,
            b.name as f_branch_name,
            cu.created_at as f_created_at,
            count(*) over() as f_total_count
        from public.company_users cu
        join public.companies c on c.id = cu.company_id
        left join public.user_profiles up on up.id = cu.user_id
        left join public.branches b on b.id = cu.branch_id
        where (p_company_id is null or cu.company_id = p_company_id)
          and (p_status is null or cu.status = p_status)
          and (
              p_search is null or
              c.name ilike '%' || p_search || '%' or
              c.slug ilike '%' || p_search || '%' or
              up.full_name ilike '%' || p_search || '%' or
              up.email ilike '%' || p_search || '%' or
              up.phone ilike '%' || p_search || '%'
          )
        order by cu.created_at desc
        limit p_limit
        offset p_offset
    )
    select 
        f_company_user_id,
        f_user_id,
        f_company_id,
        f_company_name,
        f_company_slug,
        f_full_name,
        f_full_name_bn,
        f_email,
        f_phone,
        f_status,
        f_primary_role,
        f_responsibilities,
        f_branch_name,
        f_created_at,
        f_total_count
    from filtered_users;
end;
$$;

-- 5. RLS POLICIES FOR PLATFORM TABLES
create policy "Platform owners have full control on platform active sessions"
    on public.platform_active_sessions for all
    using (public.auth_is_platform_owner());

-- 6. INDEX OPTIMIZATIONS FOR PLATFORM PERFORMANCE
create index if not exists idx_platform_admins_user_active on public.platform_admins(user_id, is_active);
create index if not exists idx_platform_admins_email on public.platform_admins(email);
create index if not exists idx_companies_is_active on public.companies(is_active);
create index if not exists idx_company_subs_status_company on public.company_subscriptions(company_id, status);


-- >>> FILE: 036_add_department_to_company_users.sql <<<
-- ==============================================================================
-- PrintERP / InkFlow SaaS - Migration 036: Add Department & Custom Metadata to Company Users
-- Adds department, responsibilities, and raw_overrides to public.company_users.
-- ==============================================================================

alter table if exists public.company_users
    add column if not exists department text default 'General',
    add column if not exists responsibilities text[],
    add column if not exists raw_overrides jsonb default '{}'::jsonb;

create index if not exists idx_company_users_department on public.company_users(department);


-- >>> FILE: 037_platform_security_definer_hardening.sql <<<
-- ==============================================================================
-- InkFlow SaaS - Migration 037: Security Definer Hardening & Search Path Lockdown
-- Ensures all platform security definer functions:
--   1. Have explicit, safe search_path = public, pg_temp
--   2. Enforce strict caller validation
--   3. Fail-closed on missing records or unauthenticated callers
-- ==============================================================================

-- 1. Hardened auth_is_platform_owner
create or replace function public.auth_is_platform_owner()
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_user_id uuid;
begin
    v_user_id := auth.uid();
    if v_user_id is null then
        return false;
    end if;

    return exists (
        select 1
        from public.platform_admins
        where user_id = v_user_id
          and is_active = true
    );
end;
$$;

-- 2. Hardened auth_validate_support_session
create or replace function public.auth_validate_support_session(
    p_company_id uuid,
    p_token_hash text
)
returns table (
    is_valid boolean,
    access_level text,
    admin_id uuid,
    admin_email text,
    admin_name text,
    expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    if p_company_id is null or p_token_hash is null or trim(p_token_hash) = '' then
        return;
    end if;

    return query
    select 
        (pss.status = 'active' and pss.expires_at > now()) as is_valid,
        pss.access_level,
        pa.id as admin_id,
        pa.email as admin_email,
        pa.full_name as admin_name,
        pss.expires_at
    from public.platform_support_sessions pss
    join public.platform_admins pa on pa.id = pss.platform_admin_id
    where pss.company_id = p_company_id
      and pss.session_token_hash = p_token_hash
      and pa.is_active = true
    limit 1;
end;
$$;


-- >>> FILE: 038_strict_auth_isolation_boundary.sql <<<
-- ==============================================================================
-- InkFlow SaaS - Migration 038: Strict Platform vs Tenant Auth Isolation & RLS Boundary
-- Single Source of Truth & Fail-Closed Database Policies:
--   1. Platform Users -> platform_admins (is_active = true) -> Auth Context: Platform
--   2. Tenant Users -> company_users (status = 'active') + companies (is_active = true) -> Auth Context: Tenant
--   3. Cross-domain queries are rejected at PostgreSQL & RLS layer
-- ==============================================================================

-- 1. HARDEN SECURITY DEFINER HELPER FUNCTIONS WITH EXPLICIT SEARCH_PATH
create or replace function public.auth_is_platform_admin()
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_user_id uuid;
begin
    v_user_id := auth.uid();
    if v_user_id is null then
        return false;
    end if;

    return exists (
        select 1
        from public.platform_admins
        where user_id = v_user_id
          and is_active = true
    );
end;
$$;

create or replace function public.auth_is_platform_owner()
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_user_id uuid;
begin
    v_user_id := auth.uid();
    if v_user_id is null then
        return false;
    end if;

    return exists (
        select 1
        from public.platform_admins
        where user_id = v_user_id
          and role = 'platform_owner'
          and is_active = true
    );
end;
$$;

create or replace function public.auth_is_active_company_user(target_company_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    if auth.uid() is null or target_company_id is null then
        return false;
    end if;

    return exists (
        select 1
        from public.company_users cu
        join public.companies c on c.id = cu.company_id
        where cu.company_id = target_company_id
          and cu.user_id = auth.uid()
          and cu.status = 'active'
          and c.is_active = true
    );
end;
$$;

-- 2. PLATFORM DATA TABLES RLS (Zero Access to Ordinary Tenant Accounts)
alter table if exists public.platform_admins enable row level security;
drop policy if exists "Platform admins full control on platform_admins" on public.platform_admins;
create policy "Platform admins full control on platform_admins"
    on public.platform_admins for all
    using (public.auth_is_platform_admin());

alter table if exists public.platform_active_sessions enable row level security;
drop policy if exists "Platform admins view active sessions" on public.platform_active_sessions;
create policy "Platform admins view active sessions"
    on public.platform_active_sessions for all
    using (public.auth_is_platform_admin());

alter table if exists public.platform_support_sessions enable row level security;
drop policy if exists "Platform admins manage support sessions" on public.platform_support_sessions;
create policy "Platform admins manage support sessions"
    on public.platform_support_sessions for all
    using (public.auth_is_platform_admin());

-- 3. AUDIT LOG ISOLATION
alter table if exists public.audit_logs enable row level security;
drop policy if exists "Active tenant users can view tenant audit logs" on public.audit_logs;
create policy "Active tenant users can view tenant audit logs"
    on public.audit_logs for select
    using (public.auth_is_active_company_user(company_id));

alter table if exists public.platform_audit_logs enable row level security;
drop policy if exists "Platform admins view platform audit logs" on public.platform_audit_logs;
create policy "Platform admins view platform audit logs"
    on public.platform_audit_logs for all
    using (public.auth_is_platform_admin());


-- >>> FILE: 039_email_gateway_and_communication_system.sql <<<
-- ==============================================================================
-- PrintERP SaaS - Migration 039: Multi-Tenant Email Gateway System & Communication Infrastructure
-- Supports:
--   1. Platform-level Default Email Gateway & Configuration
--   2. Tenant-level Custom Email Gateways (BYO SMTP / Resend / SendGrid / Amazon SES)
--   3. Email Gateway Resolver & Fail-Closed Fallback Logic
--   4. Standardized Bilingual Email Templates (English & বাংলা) with Variable Interpolation
--   5. Asynchronous Email Queue with Exponential Backoff Retry Policy
--   6. Immutable Email Transmission & Audit Logs with Strict Tenant RLS
-- ==============================================================================

-- 1. EMAIL GATEWAYS TABLE
create table if not exists public.email_gateways (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid references public.companies(id) on delete cascade, -- NULL for Platform Global Gateway
    provider text not null check (provider in ('smtp', 'resend', 'sendgrid', 'ses', 'custom', 'mock')),
    type text not null default 'transactional' check (type in ('transactional', 'marketing', 'system')),
    smtp_host text,
    smtp_port integer,
    smtp_username text,
    encrypted_credentials text, -- AES-256-GCM encrypted password / API key / secret
    encryption_type text check (encryption_type in ('ssl', 'tls', 'starttls', 'none')),
    sender_name text not null,
    sender_email text not null,
    reply_to_email text,
    status text not null default 'active' check (status in ('active', 'inactive', 'unverified', 'error')),
    is_default boolean not null default false,
    extra_settings jsonb default '{}'::jsonb, -- e.g. { aws_region, ses_config_set, custom_headers, rate_limit }
    last_tested_at timestamptz,
    last_test_status text,
    last_test_error text,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Unique index to ensure at most one default gateway per tenant (and one default platform gateway)
create unique index if not exists idx_email_gateways_platform_default
    on public.email_gateways(is_default)
    where tenant_id is null and is_default = true;

create unique index if not exists idx_email_gateways_tenant_default
    on public.email_gateways(tenant_id, is_default)
    where tenant_id is not null and is_default = true;

create index if not exists idx_email_gateways_tenant on public.email_gateways(tenant_id);
create index if not exists idx_email_gateways_status on public.email_gateways(status);
alter table public.email_gateways enable row level security;

-- 2. EMAIL TEMPLATES TABLE
create table if not exists public.email_templates (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid references public.companies(id) on delete cascade, -- NULL for Platform Default Templates
    event_type text not null, -- e.g. 'invoice_created', 'quotation_sent', 'payment_received', 'due_reminder', 'design_approval_request', 'revision_notification', 'approval_confirmation', 'job_started', 'job_completed', 'delivery_scheduled', 'delivery_completed', 'user_invitation', 'password_reset', 'security_alert', 'test_email'
    name text not null,
    name_bn text,
    subject_template text not null,
    subject_template_bn text,
    body_template text not null,
    body_template_bn text,
    variables jsonb default '[]'::jsonb, -- list of supported variables e.g. ["customer_name", "invoice_number", "amount", "due_date", "company_name"]
    status text not null default 'active' check (status in ('active', 'inactive', 'draft')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Unique constraint for event_type per tenant (and platform level)
create unique index if not exists idx_email_templates_platform_event
    on public.email_templates(event_type)
    where tenant_id is null;

create unique index if not exists idx_email_templates_tenant_event
    on public.email_templates(tenant_id, event_type)
    where tenant_id is not null;

create index if not exists idx_email_templates_tenant on public.email_templates(tenant_id);
create index if not exists idx_email_templates_event on public.email_templates(event_type);
alter table public.email_templates enable row level security;

-- 3. EMAIL TRANSMISSION LOGS TABLE
create table if not exists public.email_logs (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid references public.companies(id) on delete cascade, -- NULL for pure Platform system emails
    gateway_id uuid references public.email_gateways(id) on delete set null,
    event_type text not null,
    recipient text not null,
    subject text not null,
    status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed', 'retrying')),
    provider_message_id text,
    error_message text,
    retry_count integer not null default 0,
    max_retries integer not null default 3,
    metadata jsonb default '{}'::jsonb,
    sent_by uuid references auth.users(id) on delete set null,
    sent_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists idx_email_logs_tenant on public.email_logs(tenant_id);
create index if not exists idx_email_logs_status on public.email_logs(status);
create index if not exists idx_email_logs_created on public.email_logs(created_at desc);
alter table public.email_logs enable row level security;

-- 4. ASYNCHRONOUS EMAIL QUEUE TABLE
create table if not exists public.email_queue (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid references public.companies(id) on delete cascade,
    event_type text not null,
    recipient text not null,
    subject text not null,
    html_body text not null,
    text_body text,
    variables jsonb default '{}'::jsonb,
    attachments jsonb default '[]'::jsonb,
    metadata jsonb default '{}'::jsonb,
    status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    attempts integer not null default 0,
    max_attempts integer not null default 3,
    next_run_at timestamptz not null default now(),
    last_error text,
    locked_at timestamptz,
    locked_by text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_email_queue_pending on public.email_queue(status, next_run_at)
    where status in ('pending', 'failed');
create index if not exists idx_email_queue_tenant on public.email_queue(tenant_id);
alter table public.email_queue enable row level security;

-- 5. ROW LEVEL SECURITY (RLS) POLICIES

-- Gateways RLS
-- Platform Admins: Full control over platform gateways (tenant_id is null)
create policy "Platform admins manage platform email gateways"
    on public.email_gateways for all
    using (public.auth_is_platform_admin() and tenant_id is null);

-- Active Tenant Users: Can read their own tenant gateways
create policy "Tenant users view own email gateways"
    on public.email_gateways for select
    using (
        tenant_id is not null
        and public.auth_is_active_company_user(tenant_id)
    );

-- Authorized Tenant Admins: Can insert, update, delete their own tenant gateways
create policy "Authorized tenant admins manage own email gateways"
    on public.email_gateways for all
    using (
        tenant_id is not null
        and public.auth_is_active_company_user(tenant_id)
        and public.auth_user_has_permission(tenant_id, 'settings.edit')
    );

-- Email Templates RLS
-- Platform Admins: Full control over platform default templates
create policy "Platform admins manage platform email templates"
    on public.email_templates for all
    using (public.auth_is_platform_admin() and tenant_id is null);

-- Tenant Users: Can read platform default templates (for fallback) AND their own tenant templates
create policy "Tenant users view accessible templates"
    on public.email_templates for select
    using (
        tenant_id is null -- Public / platform default templates
        or public.auth_is_active_company_user(tenant_id) -- Tenant customized templates
    );

-- Authorized Tenant Admins: Can manage their tenant-specific templates
create policy "Authorized tenant admins manage own email templates"
    on public.email_templates for all
    using (
        tenant_id is not null
        and public.auth_is_active_company_user(tenant_id)
        and public.auth_user_has_permission(tenant_id, 'settings.edit')
    );

-- Email Logs RLS
-- Platform Admins: View all logs / platform logs
create policy "Platform admins view email logs"
    on public.email_logs for select
    using (public.auth_is_platform_admin());

-- Active Tenant Users: View their own tenant logs
create policy "Tenant users view own email logs"
    on public.email_logs for select
    using (
        tenant_id is not null
        and public.auth_is_active_company_user(tenant_id)
    );

-- Active Tenant Users / Service: Can insert logs for their tenant
create policy "Tenant users append own email logs"
    on public.email_logs for insert
    with check (
        (tenant_id is not null and public.auth_is_active_company_user(tenant_id))
        or public.auth_is_platform_admin()
    );

-- Email Queue RLS
create policy "Platform admins view email queue"
    on public.email_queue for all
    using (public.auth_is_platform_admin());

create policy "Tenant users view own email queue"
    on public.email_queue for select
    using (
        tenant_id is not null
        and public.auth_is_active_company_user(tenant_id)
    );

create policy "Tenant users enqueue emails"
    on public.email_queue for insert
    with check (
        tenant_id is not null
        and public.auth_is_active_company_user(tenant_id)
    );


-- >>> FILE: 040_seed_trial_plan_and_repair_subscriptions.sql <<<
-- ==============================================================================
-- InkFlow / PrintERP SaaS - Migration 040: Seed Trial Plan & Repair Subscriptions
-- Ensures 'trial' is a first-class citizen in subscription_plans and repairs
-- any trial subscriptions that were linked to starter plan.
-- ==============================================================================

-- 1. Ensure trial_days column exists on subscription_plans
alter table public.subscription_plans add column if not exists trial_days integer not null default 0;

-- 2. Insert 'trial' into subscription_plans if not present
insert into public.subscription_plans (
    code,
    name,
    name_bn,
    description,
    price_monthly,
    price_yearly,
    max_users,
    max_branches,
    storage_gb,
    monthly_orders,
    max_customers,
    max_products,
    trial_days,
    features,
    is_active,
    sort_order
) values (
    'trial',
    'Free Trial (14 Days)',
    '১৪ দিনের ফ্রি ট্রায়াল',
    '14-day evaluation with full access to all ERP modules. No credit card required.',
    0.00,
    0.00,
    5,
    1,
    2,
    100,
    200,
    200,
    14,
    array[
        'basic_sales', 'basic_customers', 'quotation_pdf', 'delivery_challan',
        'multi_department', 'inventory', 'inventory_rolls', 'production',
        'production_kanban', 'reports', 'reports_analytics', 'hr', 'hr_payroll',
        'job_costing', 'whatsapp_notifications', 'multi_branch', 'advanced_analytics',
        'advanced_permissions', 'custom_workflows', 'api_access', 'priority_support'
    ],
    true,
    0
)
on conflict (code) do update set
    name = excluded.name,
    name_bn = excluded.name_bn,
    description = excluded.description,
    trial_days = excluded.trial_days,
    features = excluded.features,
    sort_order = excluded.sort_order;

-- 2. Repair existing trial subscriptions:
-- If a company subscription has status = 'trial' and currently points to a non-trial plan_id,
-- point it to the trial plan_id.
do $$
declare
    v_trial_plan_id uuid;
begin
    select id into v_trial_plan_id
    from public.subscription_plans
    where code = 'trial'
    limit 1;

    if v_trial_plan_id is not null then
        update public.company_subscriptions
        set plan_id = v_trial_plan_id,
            updated_at = now()
        where status = 'trial'
          and plan_id != v_trial_plan_id;
    end if;
end;
$$;


-- >>> FILE: 041_platform_system_settings.sql <<<
-- ==============================================================================
-- Migration 041: Platform System Settings & Disaster Recovery Telemetry
-- ==============================================================================

-- 1. Create table for cluster-wide platform system settings
create table if not exists public.platform_system_settings (
    id text primary key default 'default',
    session_timeout_minutes integer not null default 120,
    mfa_required_for_admins boolean not null default false,
    rate_limit_requests_per_minute integer not null default 120,
    max_export_records integer not null default 10000,
    default_trial_days integer not null default 14,
    default_currency text not null default 'BDT',
    default_vat_rate_pct numeric(5,2) not null default 15.00,
    maintenance_mode_enabled boolean not null default false,
    maintenance_message text not null default 'InkFlow is currently undergoing scheduled platform upgrades.',
    incident_alert_webhook text,
    backup_retention_days integer not null default 90,
    auto_backup_enabled boolean not null default true,
    last_backup_at timestamp with time zone not null default now(),
    last_restore_test_at timestamp with time zone not null default now(),
    last_restore_status text not null default 'passed',
    updated_at timestamp with time zone not null default now(),
    updated_by uuid references public.platform_admins(id)
);

-- 2. Enable Row Level Security (RLS)
alter table public.platform_system_settings enable row level security;

-- 3. RLS Policies
drop policy if exists "Platform admins can read platform system settings" on public.platform_system_settings;
create policy "Platform admins can read platform system settings"
    on public.platform_system_settings for select
    using (public.auth_is_platform_admin());

drop policy if exists "Platform owners can modify platform system settings" on public.platform_system_settings;
create policy "Platform owners can modify platform system settings"
    on public.platform_system_settings for all
    using (public.auth_is_platform_owner());

-- 4. Seed default singleton record
insert into public.platform_system_settings (
    id,
    session_timeout_minutes,
    mfa_required_for_admins,
    rate_limit_requests_per_minute,
    max_export_records,
    default_trial_days,
    default_currency,
    default_vat_rate_pct,
    maintenance_mode_enabled,
    maintenance_message,
    backup_retention_days,
    auto_backup_enabled
) values (
    'default',
    120,
    false,
    120,
    10000,
    14,
    'BDT',
    15.00,
    false,
    'InkFlow is currently undergoing scheduled platform upgrades.',
    90,
    true
)
on conflict (id) do nothing;


-- >>> FILE: 042_production_gateways_and_api_integrations.sql <<<
-- ==============================================================================
-- PrintERP SaaS - Migration 042: Production Gateways, API Integrations & Webhooks
-- Supports:
--   1. Unified Gateway Integrations Table (Email, SMS, Payment, WhatsApp, Telegram)
--   2. Strict Platform Owner vs Tenant Isolation with RLS & Encrypted Credentials
--   3. Financial Payment Transaction Ledger (bKash, SSLCOMMERZ, Nagad, UddoktaPay, Stripe)
--   4. Universal Communication Logs (Email, SMS, WhatsApp, Telegram, In-App)
--   5. Webhook Events Ledger (Signature Verification & Replay Protection)
--   6. Gateway Security Audit Ledger (Non-secret audit trail)
-- ==============================================================================

-- 1. GATEWAY INTEGRATIONS TABLE
create table if not exists public.gateway_integrations (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid references public.companies(id) on delete cascade, -- NULL for Platform Global Gateways
    category text not null check (category in ('email', 'sms', 'payment', 'whatsapp', 'telegram')),
    provider text not null, -- 'smtp', 'resend', 'sendgrid', 'ses', 'greenweb', 'bulksmsbd', 'ssl_wireless', 'twilio', 'bkash', 'sslcommerz', 'nagad', 'uddoktapay', 'stripe', 'meta_whatsapp', 'telegram_bot'
    name text not null,
    is_enabled boolean not null default false,
    is_default boolean not null default false,
    environment text not null default 'sandbox' check (environment in ('sandbox', 'live')),
    encrypted_credentials text, -- AES-256-GCM encrypted JSON containing API keys, secrets, tokens, passwords
    public_config jsonb not null default '{}'::jsonb, -- Non-sensitive configuration (hosts, ports, senders, IDs, URLs)
    status text not null default 'not_configured' check (status in ('not_configured', 'configured', 'testing', 'connected', 'error', 'disabled')),
    last_tested_at timestamptz,
    last_test_status text,
    last_test_error text,
    last_test_latency_ms integer default 0,
    failure_count integer not null default 0,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Unique index to prevent duplicate provider configurations per scope (platform or tenant)
create unique index if not exists idx_gateway_integrations_platform_provider
    on public.gateway_integrations(provider)
    where tenant_id is null;

create unique index if not exists idx_gateway_integrations_tenant_provider
    on public.gateway_integrations(tenant_id, provider)
    where tenant_id is not null;

create index if not exists idx_gateway_integrations_tenant on public.gateway_integrations(tenant_id);
create index if not exists idx_gateway_integrations_category on public.gateway_integrations(category);
create index if not exists idx_gateway_integrations_status on public.gateway_integrations(status);
create index if not exists idx_gateway_integrations_enabled on public.gateway_integrations(is_enabled);
alter table public.gateway_integrations enable row level security;

-- 2. FINANCIAL PAYMENT TRANSACTIONS TABLE
create table if not exists public.gateway_transactions (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid references public.companies(id) on delete cascade, -- NULL for Platform SaaS billing
    gateway_id uuid references public.gateway_integrations(id) on delete set null,
    provider text not null,
    invoice_id text,
    customer_id text,
    subscription_id text,
    amount numeric(12,2) not null,
    currency text not null default 'BDT',
    internal_trx_id text not null unique,
    provider_trx_id text,
    payment_status text not null default 'initiated' check (payment_status in ('initiated', 'pending', 'paid', 'failed', 'cancelled', 'refunded', 'expired')),
    idempotency_key text unique,
    payment_url text,
    callback_payload jsonb,
    webhook_payload jsonb,
    verification_payload jsonb,
    error_message text,
    initiated_at timestamptz not null default now(),
    completed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_gateway_tx_tenant on public.gateway_transactions(tenant_id);
create index if not exists idx_gateway_tx_status on public.gateway_transactions(payment_status);
create index if not exists idx_gateway_tx_internal on public.gateway_transactions(internal_trx_id);
create index if not exists idx_gateway_tx_provider on public.gateway_transactions(provider_trx_id);
create index if not exists idx_gateway_tx_created on public.gateway_transactions(created_at desc);
alter table public.gateway_transactions enable row level security;

-- 3. WEBHOOK EVENTS LEDGER TABLE
create table if not exists public.gateway_webhooks (
    id uuid primary key default gen_random_uuid(),
    gateway_id uuid references public.gateway_integrations(id) on delete set null,
    provider text not null,
    event_type text not null,
    provider_event_id text,
    signature text,
    is_verified boolean not null default false,
    payload jsonb not null default '{}'::jsonb,
    status text not null default 'received' check (status in ('received', 'processed', 'ignored', 'failed')),
    error_message text,
    processed_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists idx_gateway_webhooks_provider on public.gateway_webhooks(provider);
create index if not exists idx_gateway_webhooks_status on public.gateway_webhooks(status);
create index if not exists idx_gateway_webhooks_created on public.gateway_webhooks(created_at desc);
alter table public.gateway_webhooks enable row level security;

-- 4. GATEWAY SECURITY AUDIT LOGS TABLE
create table if not exists public.gateway_audit_logs (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid references public.companies(id) on delete cascade, -- NULL for Platform owner actions
    gateway_id uuid references public.gateway_integrations(id) on delete set null,
    action text not null, -- 'created', 'updated', 'enabled', 'disabled', 'credentials_replaced', 'test_connection', 'test_message_sent', 'environment_switched', 'deleted'
    details jsonb not null default '{}'::jsonb, -- Sanitized context, NEVER secrets
    ip_address text,
    performed_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now()
);

create index if not exists idx_gateway_audit_tenant on public.gateway_audit_logs(tenant_id);
create index if not exists idx_gateway_audit_created on public.gateway_audit_logs(created_at desc);
alter table public.gateway_audit_logs enable row level security;

-- 5. UPGRADE / EXPAND COMMUNICATION LOGS TABLE
-- (Check if exists from 023/039, or ensure all columns are present)
do $$
begin
    if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'communication_logs') then
        create table public.communication_logs (
            id uuid primary key default gen_random_uuid(),
            company_id uuid references public.companies(id) on delete cascade,
            gateway_id uuid references public.gateway_integrations(id) on delete set null,
            channel text not null check (channel in ('in_app', 'whatsapp', 'sms', 'email', 'telegram')),
            recipient_name text,
            recipient_destination text not null,
            provider_used text not null,
            message_content text not null,
            status text not null default 'sent' check (status in ('sent', 'delivered', 'failed', 'queued', 'cancelled')),
            provider_message_id text,
            error_message text,
            retry_count integer not null default 0,
            metadata jsonb default '{}'::jsonb,
            sent_by uuid references auth.users(id) on delete set null,
            sent_at timestamptz,
            delivered_at timestamptz,
            failed_at timestamptz,
            created_at timestamptz not null default now()
        );
    else
        -- Add any missing columns to existing communication_logs safely
        if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'communication_logs' and column_name = 'gateway_id') then
            alter table public.communication_logs add column gateway_id uuid references public.gateway_integrations(id) on delete set null;
        end if;
        if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'communication_logs' and column_name = 'provider_message_id') then
            alter table public.communication_logs add column provider_message_id text;
        end if;
        if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'communication_logs' and column_name = 'retry_count') then
            alter table public.communication_logs add column retry_count integer not null default 0;
        end if;
        if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'communication_logs' and column_name = 'metadata') then
            alter table public.communication_logs add column metadata jsonb default '{}'::jsonb;
        end if;
        if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'communication_logs' and column_name = 'sent_by') then
            alter table public.communication_logs add column sent_by uuid references auth.users(id) on delete set null;
        end if;
        if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'communication_logs' and column_name = 'sent_at') then
            alter table public.communication_logs add column sent_at timestamptz;
        end if;
        if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'communication_logs' and column_name = 'delivered_at') then
            alter table public.communication_logs add column delivered_at timestamptz;
        end if;
        if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'communication_logs' and column_name = 'failed_at') then
            alter table public.communication_logs add column failed_at timestamptz;
        end if;
    end if;
end $$;

create index if not exists idx_comm_logs_channel on public.communication_logs(channel);
create index if not exists idx_comm_logs_status on public.communication_logs(status);

-- 6. ROW LEVEL SECURITY (RLS) POLICIES

-- A. Gateway Integrations Policies
-- Platform Admins: Complete control over Platform Integrations (tenant_id is null)
create policy "Platform admins manage platform gateway integrations"
    on public.gateway_integrations for all
    using (public.auth_is_platform_admin() and tenant_id is null);

-- Tenant Users: Read only their own company gateway integrations
create policy "Tenant users view own gateway integrations"
    on public.gateway_integrations for select
    using (
        tenant_id is not null
        and public.auth_is_active_company_user(tenant_id)
    );

-- Tenant Admins: Manage their own company gateway integrations
create policy "Authorized tenant admins manage own gateway integrations"
    on public.gateway_integrations for all
    using (
        tenant_id is not null
        and public.auth_is_active_company_user(tenant_id)
        and public.auth_user_has_permission(tenant_id, 'settings.edit')
    );

-- B. Gateway Transactions Policies
-- Platform Admins: View all transactions
create policy "Platform admins view all gateway transactions"
    on public.gateway_transactions for select
    using (public.auth_is_platform_admin());

-- Tenant Users: View their own company transactions
create policy "Tenant users view own gateway transactions"
    on public.gateway_transactions for select
    using (
        tenant_id is not null
        and public.auth_is_active_company_user(tenant_id)
    );

-- System / Platform Service: Insert and Update transactions
create policy "Service and admins insert gateway transactions"
    on public.gateway_transactions for insert
    with check (
        public.auth_is_platform_admin()
        or (tenant_id is not null and public.auth_is_active_company_user(tenant_id))
    );

create policy "Service and admins update gateway transactions"
    on public.gateway_transactions for update
    using (
        public.auth_is_platform_admin()
        or (tenant_id is not null and public.auth_is_active_company_user(tenant_id))
    );

-- C. Gateway Webhooks Policies
-- Platform Admins: View webhook logs
create policy "Platform admins view gateway webhooks"
    on public.gateway_webhooks for select
    using (public.auth_is_platform_admin());

-- D. Gateway Audit Logs Policies
-- Platform Admins: View all audit logs
create policy "Platform admins view all gateway audit logs"
    on public.gateway_audit_logs for select
    using (public.auth_is_platform_admin());

-- Tenant Users: View their own company audit logs
create policy "Tenant users view own gateway audit logs"
    on public.gateway_audit_logs for select
    using (
        tenant_id is not null
        and public.auth_is_active_company_user(tenant_id)
    );


-- >>> FILE: 043_saas_subscription_lifecycle_and_events.sql <<<
-- ==============================================================================
-- InkFlow / PrintERP SaaS - Migration 043: SaaS Subscription Lifecycle & Events
-- Comprehensive Subscription State Machine, Immutable Event Ledger, Downgrade Scheduling,
-- and Verification Status on Financial Transactions.
-- ==============================================================================

-- 1. ENHANCE COMPANY_SUBSCRIPTIONS TABLE
alter table public.company_subscriptions
    add column if not exists next_plan_id uuid references public.subscription_plans(id) on delete set null,
    add column if not exists change_effective_at timestamptz,
    add column if not exists cancel_at_period_end boolean not null default false,
    add column if not exists grace_period_ends_at timestamptz,
    add column if not exists started_at timestamptz not null default now();

create index if not exists idx_company_sub_next_plan on public.company_subscriptions(next_plan_id);
create index if not exists idx_company_sub_cancel_period on public.company_subscriptions(cancel_at_period_end);

-- 2. ENHANCE GATEWAY_TRANSACTIONS WITH VERIFICATION STATUS
alter table public.gateway_transactions
    add column if not exists verification_status text not null default 'unverified' check (
        verification_status in ('unverified', 'verified', 'rejected')
    );

create index if not exists idx_gateway_tx_verification on public.gateway_transactions(verification_status);

-- 3. CREATE IMMUTABLE SUBSCRIPTION EVENTS LEDGER
create table if not exists public.subscription_events (
    id uuid primary key default gen_random_uuid(),
    subscription_id uuid references public.company_subscriptions(id) on delete cascade,
    company_id uuid not null references public.companies(id) on delete cascade,
    previous_plan_code text,
    new_plan_code text,
    previous_status text,
    new_status text,
    event_type text not null check (
        event_type in (
            'TRIAL_STARTED',
            'TRIAL_EXTENDED',
            'SUBSCRIPTION_CREATED',
            'PLAN_UPGRADED',
            'PLAN_DOWNGRADED',
            'RENEWED',
            'PAYMENT_PENDING',
            'PAYMENT_VERIFIED',
            'PAYMENT_FAILED',
            'CANCELLED',
            'REACTIVATED',
            'EXPIRED',
            'SUSPENDED'
        )
    ),
    reason text,
    transaction_id uuid references public.gateway_transactions(id) on delete set null,
    amount numeric(12,2),
    currency text not null default 'BDT',
    effective_at timestamptz not null default now(),
    performed_by uuid,
    created_at timestamptz not null default now()
);

create index if not exists idx_sub_events_company on public.subscription_events(company_id);
create index if not exists idx_sub_events_sub on public.subscription_events(subscription_id);
create index if not exists idx_sub_events_type on public.subscription_events(event_type);
create index if not exists idx_sub_events_created on public.subscription_events(created_at desc);

alter table public.subscription_events enable row level security;

-- 4. RLS POLICIES FOR SUBSCRIPTION EVENTS
create policy "Tenant users can view their subscription events"
    on public.subscription_events for select
    using (public.auth_is_active_company_user(company_id));

create policy "Platform super admins can view all subscription events"
    on public.subscription_events for all
    using (
        exists (
            select 1 from public.platform_admins
            where user_id = auth.uid()
        )
    );


-- >>> FILE: 044_subscription_billing_security_and_reconciliation.sql <<<
-- ==============================================================================
-- InkFlow / PrintERP SaaS - Migration 044: Subscription Billing Security & Reconciliation
-- Authoritative Billing Transactions, Webhook Idempotency Constraints,
-- Cron Performance Indexes, and Multi-Tenant Isolation Policies.
-- ==============================================================================

-- 1. ENSURE UNIQUE CONSTRAINT & INDEXES ON GATEWAY_TRANSACTIONS FOR IDEMPOTENCY
create unique index if not exists idx_gateway_tx_internal_unique 
    on public.gateway_transactions(internal_trx_id) 
    where internal_trx_id is not null;

create index if not exists idx_gateway_tx_provider_trx 
    on public.gateway_transactions(provider, provider_trx_id) 
    where provider_trx_id is not null;

create index if not exists idx_gateway_tx_payment_verification 
    on public.gateway_transactions(payment_status, verification_status);

-- 2. ENSURE COMPOSITE PERFORMANCE INDEXES FOR SUBSCRIPTION LIFECYCLE CRON
create index if not exists idx_company_sub_trial_lifecycle 
    on public.company_subscriptions(status, trial_ends_at) 
    where status = 'trial';

create index if not exists idx_company_sub_scheduled_downgrade 
    on public.company_subscriptions(change_effective_at) 
    where next_plan_id is not null;

create index if not exists idx_company_sub_period_cancel 
    on public.company_subscriptions(cancel_at_period_end, current_period_end) 
    where cancel_at_period_end = true;

-- 3. ENSURE STRICT RLS POLICIES FOR SUBSCRIPTION AND BILLING TABLES
alter table public.subscription_plans enable row level security;
alter table public.company_subscriptions enable row level security;
alter table public.subscription_events enable row level security;
alter table public.gateway_transactions enable row level security;

-- Ensure read access to active subscription plans
do $$
begin
    if not exists (
        select 1 from pg_policies 
        where tablename = 'subscription_plans' and policyname = 'Public can view active subscription plans'
    ) then
        create policy "Public can view active subscription plans"
            on public.subscription_plans for select
            using (is_active = true);
    end if;
end;
$$;

-- Ensure platform super admins can manage subscription plans
do $$
begin
    if not exists (
        select 1 from pg_policies 
        where tablename = 'subscription_plans' and policyname = 'Platform admins can manage subscription plans'
    ) then
        create policy "Platform admins can manage subscription plans"
            on public.subscription_plans for all
            using (
                exists (
                    select 1 from public.platform_admins
                    where user_id = auth.uid()
                )
            );
    end if;
end;
$$;


-- >>> FILE: 045_platform_saas_subscription_and_billing.sql <<<
-- ==============================================================================
-- InkFlow / PrintERP SaaS - Migration 045: Platform SaaS Subscription & Billing
-- Authoritative Platform Plans, Platform Subscriptions, Lifecycle Events,
-- Webhook Logs, and Strict Platform/Tenant Isolation Policies.
-- ==============================================================================

-- 1. PLATFORM SAAS PLANS TABLE
create table if not exists public.platform_saas_plans (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    slug text unique not null,
    description text,
    monthly_price numeric(12,2) not null,
    yearly_price numeric(12,2) not null,
    currency text not null default 'BDT',
    trial_days integer not null default 14,
    features jsonb not null default '[]'::jsonb,
    limits jsonb not null default '{}'::jsonb,
    is_active boolean not null default true,
    is_public boolean not null default true,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_platform_saas_plans_slug on public.platform_saas_plans(slug);
create index if not exists idx_platform_saas_plans_active on public.platform_saas_plans(is_active, sort_order);

-- 2. PLATFORM SUBSCRIPTIONS TABLE
create table if not exists public.platform_subscriptions (
    id uuid primary key default gen_random_uuid(),
    platform_account_id text not null default 'platform_root',
    plan_id uuid references public.platform_saas_plans(id) on delete restrict,
    status text not null default 'TRIALING' check (status in ('TRIALING', 'PENDING_PAYMENT', 'ACTIVE', 'PAST_DUE', 'GRACE_PERIOD', 'CANCELLED', 'EXPIRED', 'SUSPENDED')),
    billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly', 'yearly')),
    started_at timestamptz not null default now(),
    current_period_start timestamptz not null default now(),
    current_period_end timestamptz not null,
    trial_start timestamptz not null default now(),
    trial_end timestamptz,
    grace_period_end timestamptz,
    cancelled_at timestamptz,
    cancel_at_period_end boolean not null default false,
    previous_plan_id uuid references public.platform_saas_plans(id) on delete set null,
    next_plan_id uuid references public.platform_saas_plans(id) on delete set null,
    change_effective_at timestamptz,
    provider text,
    provider_customer_id text,
    provider_subscription_id text,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_platform_sub_account on public.platform_subscriptions(platform_account_id);
create index if not exists idx_platform_sub_status on public.platform_subscriptions(status);
create index if not exists idx_platform_sub_lifecycle on public.platform_subscriptions(status, current_period_end, trial_end, grace_period_end);

-- 3. PLATFORM SUBSCRIPTION EVENTS TABLE
create table if not exists public.platform_subscription_events (
    id uuid primary key default gen_random_uuid(),
    subscription_id uuid references public.platform_subscriptions(id) on delete cascade,
    platform_account_id text not null,
    event_type text not null,
    previous_plan_id uuid,
    new_plan_id uuid,
    previous_status text,
    new_status text,
    reason text,
    transaction_id text,
    performed_by text,
    effective_date timestamptz,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists idx_platform_sub_events_sub on public.platform_subscription_events(subscription_id);
create index if not exists idx_platform_sub_events_type on public.platform_subscription_events(event_type);
create index if not exists idx_platform_sub_events_created on public.platform_subscription_events(created_at desc);

-- 4. PLATFORM WEBHOOK EVENTS TABLE
create table if not exists public.platform_webhook_events (
    id uuid primary key default gen_random_uuid(),
    provider text not null,
    event_id text,
    event_type text not null,
    transaction_id text,
    billing_context text not null default 'PLATFORM',
    verification_status text not null default 'UNVERIFIED',
    processed boolean not null default false,
    processed_at timestamptz,
    failure_reason text,
    payload jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists idx_platform_webhook_events_provider_event on public.platform_webhook_events(provider, event_id);
create index if not exists idx_platform_webhook_events_trx on public.platform_webhook_events(transaction_id);

-- 5. EXTEND GATEWAY_TRANSACTIONS WITH BILLING CONTEXT IF NOT ALREADY PRESENT
do $$
begin
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'gateway_transactions' and column_name = 'billing_context') then
        alter table public.gateway_transactions add column billing_context text not null default 'TENANT' check (billing_context in ('PLATFORM', 'TENANT'));
    end if;

    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'gateway_transactions' and column_name = 'platform_account_id') then
        alter table public.gateway_transactions add column platform_account_id text;
    end if;

    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'gateway_transactions' and column_name = 'verification_status') then
        alter table public.gateway_transactions add column verification_status text not null default 'UNVERIFIED' check (verification_status in ('UNVERIFIED', 'VERIFIED', 'REJECTED'));
    end if;

    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'gateway_transactions' and column_name = 'plan_id') then
        alter table public.gateway_transactions add column plan_id uuid;
    end if;

    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'gateway_transactions' and column_name = 'transaction_type') then
        alter table public.gateway_transactions add column transaction_type text default 'SUBSCRIPTION_PURCHASE';
    end if;
end;
$$;

create index if not exists idx_gateway_tx_billing_context on public.gateway_transactions(billing_context, platform_account_id);

-- 6. SEED STANDARD SAAS PLATFORM PLANS
insert into public.platform_saas_plans (id, name, slug, description, monthly_price, yearly_price, currency, trial_days, features, limits, is_active, is_public, sort_order)
values
(
    '11111111-1111-1111-1111-111111111001',
    'SaaS Starter Cluster',
    'saas_starter',
    'Essential cloud ERP platform infrastructure for launching localized SaaS operations.',
    14999.00,
    149990.00,
    'BDT',
    14,
    '["multi_tenant", "basic_analytics", "automated_backups", "email_gateway", "sms_gateway"]'::jsonb,
    '{"max_tenants": 25, "max_total_users": 150, "storage_gb": 50, "monthly_api_calls": 250000}'::jsonb,
    true,
    true,
    1
),
(
    '11111111-1111-1111-1111-111111111002',
    'SaaS Growth Pro',
    'saas_growth',
    'High-throughput infrastructure with multi-gateway payments, WhatsApp & Telegram bots, and automated scaling.',
    34999.00,
    349990.00,
    'BDT',
    14,
    '["multi_tenant", "advanced_analytics", "automated_backups", "email_gateway", "sms_gateway", "whatsapp_gateway", "telegram_bot", "custom_domains", "api_gateway", "audit_ledger"]'::jsonb,
    '{"max_tenants": 100, "max_total_users": 750, "storage_gb": 250, "monthly_api_calls": 1000000}'::jsonb,
    true,
    true,
    2
),
(
    '11111111-1111-1111-1111-111111111003',
    'SaaS Enterprise Scale',
    'saas_enterprise',
    'Full enterprise SaaS cluster with white-labeling, dedicated compute nodes, 99.9% uptime SLA, and custom domain routing.',
    79999.00,
    799990.00,
    'BDT',
    14,
    '["multi_tenant", "advanced_analytics", "automated_backups", "email_gateway", "sms_gateway", "whatsapp_gateway", "telegram_bot", "custom_domains", "api_gateway", "audit_ledger", "white_label", "priority_sla_99_9", "dedicated_compute", "custom_billing_rules"]'::jsonb,
    '{"max_tenants": 500, "max_total_users": 3500, "storage_gb": 1000, "monthly_api_calls": 5000000}'::jsonb,
    true,
    true,
    3
),
(
    '11111111-1111-1111-1111-111111111004',
    'Dedicated Cloud Sovereign',
    'saas_sovereign',
    'Single-tenant isolated cloud cluster, custom database encryption, on-premise sync, and 24/7 VIP engineer escalation.',
    149999.00,
    1499990.00,
    'BDT',
    14,
    '["multi_tenant", "advanced_analytics", "automated_backups", "email_gateway", "sms_gateway", "whatsapp_gateway", "telegram_bot", "custom_domains", "api_gateway", "audit_ledger", "white_label", "priority_sla_99_9", "dedicated_compute", "custom_billing_rules", "dedicated_database", "source_escrow", "vip_support_24_7"]'::jsonb,
    '{"max_tenants": 2000, "max_total_users": 20000, "storage_gb": 5000, "monthly_api_calls": 25000000}'::jsonb,
    true,
    true,
    4
)
on conflict (slug) do update set
    name = excluded.name,
    description = excluded.description,
    monthly_price = excluded.monthly_price,
    yearly_price = excluded.yearly_price,
    features = excluded.features,
    limits = excluded.limits,
    is_active = excluded.is_active,
    updated_at = now();

-- 7. SEED INITIAL PLATFORM SUBSCRIPTION (TRIAL / INITIAL ACTIVE CLUSTER)
insert into public.platform_subscriptions (
    id,
    platform_account_id,
    plan_id,
    status,
    billing_cycle,
    started_at,
    current_period_start,
    current_period_end,
    trial_start,
    trial_end,
    metadata
)
values (
    '00000000-0000-0000-0000-000000000001',
    'platform_root',
    '11111111-1111-1111-1111-111111111002', -- SaaS Growth Pro
    'ACTIVE',
    'yearly',
    now() - interval '30 days',
    now() - interval '30 days',
    now() + interval '335 days',
    now() - interval '30 days',
    now() - interval '16 days',
    '{"cluster_region": "ap-southeast-1", "edition": "production_enterprise"}'::jsonb
)
on conflict (id) do nothing;

-- 8. ROW LEVEL SECURITY (RLS) POLICIES
alter table public.platform_saas_plans enable row level security;
alter table public.platform_subscriptions enable row level security;
alter table public.platform_subscription_events enable row level security;
alter table public.platform_webhook_events enable row level security;

-- Platform Super Admin policies
create policy "Platform owners can view platform_saas_plans"
    on public.platform_saas_plans for select
    using (public.auth_is_platform_owner() or auth.uid() is not null);

create policy "Platform owners can manage platform_saas_plans"
    on public.platform_saas_plans for all
    using (public.auth_is_platform_owner());

create policy "Platform owners can manage platform_subscriptions"
    on public.platform_subscriptions for all
    using (public.auth_is_platform_owner());

create policy "Platform owners can manage platform_subscription_events"
    on public.platform_subscription_events for all
    using (public.auth_is_platform_owner());

create policy "Platform owners can manage platform_webhook_events"
    on public.platform_webhook_events for all
    using (public.auth_is_platform_owner());


-- >>> FILE: 046_enable_realtime_synchronization.sql <<<
-- ==============================================================================
-- Migration: 046_enable_realtime_synchronization.sql
-- Description: Enables PostgreSQL Realtime replication for all PrintERP tables
-- Sets REPLICA IDENTITY FULL and adds operational tables to supabase_realtime publication
-- ==============================================================================

DO $$
BEGIN
  -- 1. Ensure supabase_realtime publication exists
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

DO $$
DECLARE
  tbl_name text;
  tables text[] := ARRAY[
    'companies',
    'company_users',
    'company_subscriptions',
    'subscription_events',
    'subscription_invoices',
    'roles',
    'branches',
    'customers',
    'customer_communications',
    'suppliers',
    'supplier_material_prices',
    'sales_orders',
    'sales_order_items',
    'job_orders',
    'order_timeline_events',
    'quotations',
    'quotation_items',
    'quotation_activities',
    'products',
    'product_price_history',
    'materials',
    'inventory_rolls',
    'stock_ledger',
    'material_wastages',
    'production_jobs',
    'production_reworks',
    'invoices',
    'invoice_items',
    'payments',
    'payment_adjustments',
    'expenses',
    'bank_accounts',
    'cash_book_entries',
    'purchase_orders',
    'purchase_order_items',
    'delivery_challans',
    'delivery_challan_items',
    'installations',
    'job_costings',
    'design_jobs',
    'design_versions',
    'employees',
    'attendance',
    'salary_advances',
    'daily_labor_logs',
    'payroll_periods',
    'payroll_items',
    'in_app_notifications',
    'communication_logs',
    'message_templates',
    'channel_configs',
    'company_tax_settings',
    'document_numbering',
    'document_templates',
    'notification_settings',
    'automation_rules',
    'audit_logs',
    'platform_companies',
    'platform_plans',
    'platform_feature_flags',
    'platform_users',
    'platform_incidents',
    'platform_system_settings'
  ];
BEGIN
  FOREACH tbl_name IN ARRAY tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = tbl_name
    ) THEN
      -- Enable REPLICA IDENTITY FULL so UPDATE and DELETE events include full row payloads
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL;', tbl_name);

      -- Add table to supabase_realtime publication if not already a member
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


-- >>> FILE: 047_qr_geolocation_attendance.sql <<<
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


-- >>> FILE: 048_production_performance_indexes.sql <<<
-- ==============================================================================
-- PrintERP / InkFlow SaaS - Migration 048: Production Performance Indexes & Scalability Hardening
-- Adds schema-verified composite covering indexes, foreign key index coverage,
-- and hardened server-side PL/pgSQL aggregation function for 100k+ record scalability.
-- ==============================================================================

-- 1. SALES ORDER ITEMS & TIMELINE
CREATE INDEX IF NOT EXISTS idx_sales_order_items_order_id
  ON public.sales_order_items (order_id);

CREATE INDEX IF NOT EXISTS idx_order_timeline_events_order_id
  ON public.order_timeline_events (order_id, created_at ASC);

-- 2. JOB ORDERS & PRODUCTION
CREATE INDEX IF NOT EXISTS idx_job_orders_company_order_status
  ON public.job_orders (company_id, order_id, status);

CREATE INDEX IF NOT EXISTS idx_production_reworks_job_id
  ON public.production_reworks (production_job_id, created_at DESC);

-- 3. CRM, CUSTOMERS & COMMUNICATIONS
CREATE INDEX IF NOT EXISTS idx_customers_company_name
  ON public.customers (company_id, name);

CREATE INDEX IF NOT EXISTS idx_customer_comms_company_cust_created
  ON public.customer_communications (company_id, customer_id, created_at DESC);

-- 4. QUOTATIONS & ACTIVITIES
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id
  ON public.quotation_items (quotation_id);

CREATE INDEX IF NOT EXISTS idx_quotation_activities_quotation_created
  ON public.quotation_activities (quotation_id, created_at DESC);

-- 5. INVOICES, PAYMENTS & BILLING
CREATE INDEX IF NOT EXISTS idx_invoices_company_invoice_number
  ON public.invoices (company_id, invoice_number);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id
  ON public.invoice_items (invoice_id);

CREATE INDEX IF NOT EXISTS idx_payments_company_customer_date
  ON public.payments (company_id, customer_id, payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_invoice
  ON public.payment_allocations (payment_id, invoice_id);

CREATE INDEX IF NOT EXISTS idx_financial_write_offs_company_invoice
  ON public.financial_write_offs (company_id, invoice_id);

-- 6. INVENTORY & STOCK LEDGER
CREATE INDEX IF NOT EXISTS idx_materials_company_sku
  ON public.materials (company_id, sku);

CREATE INDEX IF NOT EXISTS idx_inventory_rolls_material_status
  ON public.inventory_rolls (material_id, status);

-- 7. HR, ATTENDANCE & PAYROLL
CREATE INDEX IF NOT EXISTS idx_attendance_records_company_employee_date
  ON public.attendance_records (company_id, employee_id, attendance_date DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_records_company_date_status
  ON public.attendance_records (company_id, attendance_date DESC, verification_status);

CREATE INDEX IF NOT EXISTS idx_attendance_locations_company_active
  ON public.attendance_locations (company_id, is_active);

CREATE INDEX IF NOT EXISTS idx_payroll_items_period_employee
  ON public.payroll_items (payroll_period_id, employee_id);

-- 8. COMMUNICATIONS, GATEWAYS & LOGS
CREATE INDEX IF NOT EXISTS idx_email_logs_tenant_status_created
  ON public.email_logs (tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_queue_tenant_status_attempts
  ON public.email_queue (tenant_id, status, attempts, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_gateway_transactions_tenant_status_created
  ON public.gateway_transactions (tenant_id, payment_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_in_app_notifications_company_user_read
  ON public.in_app_notifications (company_id, user_id, is_read, created_at DESC);

-- 9. PLATFORM & MULTI-TENANT SUBSCRIPTIONS
CREATE INDEX IF NOT EXISTS idx_company_users_company_user_status
  ON public.company_users (company_id, user_id, status);

CREATE INDEX IF NOT EXISTS idx_company_subscriptions_company_status
  ON public.company_subscriptions (company_id, status, plan_id);

CREATE INDEX IF NOT EXISTS idx_platform_subscriptions_account_status
  ON public.platform_subscriptions (platform_account_id, status, plan_id);

CREATE INDEX IF NOT EXISTS idx_platform_subscription_events_account_created
  ON public.platform_subscription_events (platform_account_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_target_created
  ON public.platform_audit_logs (target_company_id, created_at DESC);

-- 10. OPTIMIZED SERVER-SIDE DASHBOARD AGGREGATION RPC
CREATE OR REPLACE FUNCTION public.get_tenant_dashboard_metrics_v2(
  p_company_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF p_company_id IS NULL THEN
    RAISE EXCEPTION 'company_id is required';
  END IF;

  -- Verify caller authorization if called from an authenticated client session
  IF auth.role() IS NOT NULL AND auth.role() <> 'service_role' THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Authentication required';
    END IF;
    IF NOT (public.auth_is_active_company_user(p_company_id) OR public.auth_is_platform_admin()) THEN
      RAISE EXCEPTION 'Unauthorized cross-tenant dashboard access denied';
    END IF;
  END IF;

  SELECT jsonb_build_object(
    'today_sales', COALESCE((
      SELECT SUM(final_price)
      FROM public.sales_orders
      WHERE company_id = p_company_id
        AND status NOT IN ('cancelled', 'draft')
        AND created_at >= CURRENT_DATE
    ), 0),
    'today_collections', COALESCE((
      SELECT SUM(amount)
      FROM public.payments
      WHERE company_id = p_company_id
        AND payment_date >= CURRENT_DATE
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
        AND status IN ('queued', 'in_progress', 'printing', 'finishing')
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

-- Revoke default public execution & grant strictly to authenticated and service_role
REVOKE EXECUTE ON FUNCTION public.get_tenant_dashboard_metrics_v2(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_tenant_dashboard_metrics_v2(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_tenant_dashboard_metrics_v2(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_dashboard_metrics_v2(UUID) TO service_role;



-- >>> FILE: 049_support_chat_system.sql <<<
-- ==============================================================================
-- InkFlow SaaS - Migration 049: Enterprise Support Chat & Conversation System
-- Supports:
--   1. Tenant-isolated support conversations with human-friendly numbering (SUP-000001)
--   2. Realtime messages with strict distinction between public replies and internal notes
--   3. Secure attachment handling with tenant isolation
--   4. Granular RLS policies preventing cross-tenant leakage & protecting internal notes
--   5. Realtime replication publication and replica identity configuration
-- ==============================================================================

-- 1. SUPPORT CONVERSATIONS TABLE
create table if not exists public.support_conversations (
    id uuid primary key default gen_random_uuid(),
    ticket_number text not null unique,
    company_id uuid not null references public.companies(id) on delete cascade,
    branch_id uuid references public.branches(id) on delete set null,
    created_by uuid references auth.users(id) on delete set null,
    created_by_name text not null,
    created_by_email text not null,
    assigned_to uuid references public.platform_admins(id) on delete set null,
    assigned_to_name text,
    subject text not null,
    status text not null default 'open' check (status in ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed')),
    priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
    category text not null default 'general' check (category in (
        'account', 'billing', 'subscription', 'login', 'email', 'whatsapp', 'sms',
        'payment', 'invoice', 'production', 'inventory', 'attendance', 'technical',
        'bug_report', 'feature_request', 'general', 'other'
    )),
    source text not null default 'app' check (source in ('app', 'mobile', 'widget', 'system')),
    context_metadata jsonb not null default '{}'::jsonb,
    unread_tenant_count integer not null default 0,
    unread_platform_count integer not null default 1,
    last_message_at timestamptz not null default now(),
    last_message_preview text,
    last_message_by text,
    last_message_sender_type text default 'tenant_user' check (last_message_sender_type in ('tenant_user', 'platform_support', 'system')),
    first_response_at timestamptz,
    resolved_at timestamptz,
    resolved_by uuid references public.platform_admins(id) on delete set null,
    closed_at timestamptz,
    closed_by uuid,
    reopened_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_support_conversations_company on public.support_conversations(company_id);
create index if not exists idx_support_conversations_status on public.support_conversations(status);
create index if not exists idx_support_conversations_priority on public.support_conversations(priority);
create index if not exists idx_support_conversations_assigned on public.support_conversations(assigned_to);
create index if not exists idx_support_conversations_last_msg on public.support_conversations(last_message_at desc);
create index if not exists idx_support_conversations_created on public.support_conversations(created_at desc);
create index if not exists idx_support_conversations_ticket on public.support_conversations(ticket_number);

-- 2. SUPPORT MESSAGES TABLE
create table if not exists public.support_messages (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references public.support_conversations(id) on delete cascade,
    company_id uuid not null references public.companies(id) on delete cascade,
    sender_user_id uuid not null,
    sender_name text not null,
    sender_email text,
    sender_type text not null check (sender_type in ('tenant_user', 'platform_support', 'system')),
    message_type text not null default 'message' check (message_type in ('message', 'support_reply', 'internal_note', 'system_event')),
    body text not null,
    attachments jsonb not null default '[]'::jsonb,
    client_mutation_id text,
    read_at timestamptz,
    edited_at timestamptz,
    deleted_at timestamptz,
    created_at timestamptz not null default now()
);

-- Indexes for messages
create index if not exists idx_support_messages_conv on public.support_messages(conversation_id, created_at asc);
create index if not exists idx_support_messages_company on public.support_messages(company_id);
create index if not exists idx_support_messages_type on public.support_messages(message_type);
create index if not exists idx_support_messages_created on public.support_messages(created_at asc);
create index if not exists idx_support_messages_mutation on public.support_messages(client_mutation_id);

-- 3. SUPPORT ATTACHMENTS TABLE
create table if not exists public.support_attachments (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references public.support_conversations(id) on delete cascade,
    message_id uuid references public.support_messages(id) on delete cascade,
    company_id uuid not null references public.companies(id) on delete cascade,
    uploaded_by uuid not null,
    file_name text not null,
    file_size integer not null,
    mime_type text not null,
    storage_path text not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_support_attachments_conv on public.support_attachments(conversation_id);
create index if not exists idx_support_attachments_msg on public.support_attachments(message_id);
create index if not exists idx_support_attachments_company on public.support_attachments(company_id);

-- 4. SEQUENCE GENERATOR FOR SUPPORT TICKET NUMBERS (SUP-000001)
create sequence if not exists public.support_ticket_number_seq start with 1 increment by 1;

create or replace function public.get_next_support_ticket_number()
returns text as $$
declare
    v_next_val bigint;
begin
    v_next_val := nextval('public.support_ticket_number_seq');
    return 'SUP-' || lpad(v_next_val::text, 6, '0');
end;
$$ language plpgsql security definer;

-- 5. ENABLE ROW LEVEL SECURITY
alter table public.support_conversations enable row level security;
alter table public.support_messages enable row level security;
alter table public.support_attachments enable row level security;

-- 6. RLS POLICIES FOR SUPPORT CONVERSATIONS

-- Tenant Users: can view their company's conversations
create policy "Tenant users can view own company conversations"
    on public.support_conversations for select
    using (
        public.auth_is_active_company_user(company_id)
        or exists (
            select 1 from public.company_users cu
            where cu.company_id = support_conversations.company_id
              and cu.user_id = auth.uid()
              and cu.status = 'active'
        )
    );

-- Tenant Users: can insert conversations for their own company
create policy "Tenant users can create conversations for own company"
    on public.support_conversations for insert
    with check (
        public.auth_is_active_company_user(company_id)
        or exists (
            select 1 from public.company_users cu
            where cu.company_id = support_conversations.company_id
              and cu.user_id = auth.uid()
              and cu.status = 'active'
        )
    );

-- Tenant Users: can update own company conversations (e.g. close/reopen or update unread)
create policy "Tenant users can update own company conversations"
    on public.support_conversations for update
    using (
        public.auth_is_active_company_user(company_id)
        or exists (
            select 1 from public.company_users cu
            where cu.company_id = support_conversations.company_id
              and cu.user_id = auth.uid()
              and cu.status = 'active'
        )
    );

-- Platform Admins: full control over support conversations
create policy "Platform admins have full control on support conversations"
    on public.support_conversations for all
    using (
        public.auth_is_platform_owner()
        or exists (
            select 1 from public.platform_admins pa
            where pa.user_id = auth.uid()
              and pa.is_active = true
        )
    );

-- 7. RLS POLICIES FOR SUPPORT MESSAGES

-- Tenant Users: can view messages in their company's conversations EXCEPT internal notes
create policy "Tenant users can view public messages in own conversations"
    on public.support_messages for select
    using (
        message_type != 'internal_note'
        and deleted_at is null
        and (
            public.auth_is_active_company_user(company_id)
            or exists (
                select 1 from public.company_users cu
                where cu.company_id = support_messages.company_id
                  and cu.user_id = auth.uid()
                  and cu.status = 'active'
            )
        )
    );

-- Tenant Users: can insert customer messages into own company conversations
create policy "Tenant users can insert messages into own conversations"
    on public.support_messages for insert
    with check (
        sender_type = 'tenant_user'
        and message_type = 'message'
        and (
            public.auth_is_active_company_user(company_id)
            or exists (
                select 1 from public.company_users cu
                where cu.company_id = support_messages.company_id
                  and cu.user_id = auth.uid()
                  and cu.status = 'active'
            )
        )
    );

-- Platform Admins: full control on messages (including internal notes)
create policy "Platform admins have full control on support messages"
    on public.support_messages for all
    using (
        public.auth_is_platform_owner()
        or exists (
            select 1 from public.platform_admins pa
            where pa.user_id = auth.uid()
              and pa.is_active = true
        )
    );

-- 8. RLS POLICIES FOR SUPPORT ATTACHMENTS

create policy "Tenant users can view own company support attachments"
    on public.support_attachments for select
    using (
        public.auth_is_active_company_user(company_id)
        or exists (
            select 1 from public.company_users cu
            where cu.company_id = support_attachments.company_id
              and cu.user_id = auth.uid()
              and cu.status = 'active'
        )
    );

create policy "Tenant users can insert own company support attachments"
    on public.support_attachments for insert
    with check (
        public.auth_is_active_company_user(company_id)
        or exists (
            select 1 from public.company_users cu
            where cu.company_id = support_attachments.company_id
              and cu.user_id = auth.uid()
              and cu.status = 'active'
        )
    );

create policy "Platform admins have full control on support attachments"
    on public.support_attachments for all
    using (
        public.auth_is_platform_owner()
        or exists (
            select 1 from public.platform_admins pa
            where pa.user_id = auth.uid()
              and pa.is_active = true
        )
    );

-- 9. REALTIME SYNCHRONIZATION SETUP
alter table public.support_conversations replica identity full;
alter table public.support_messages replica identity full;
alter table public.support_attachments replica identity full;

do $$
begin
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
        if not exists (
            select 1 from pg_publication_tables 
            where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'support_conversations'
        ) then
            alter publication supabase_realtime add table public.support_conversations;
        end if;

        if not exists (
            select 1 from pg_publication_tables 
            where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'support_messages'
        ) then
            alter publication supabase_realtime add table public.support_messages;
        end if;

        if not exists (
            select 1 from pg_publication_tables 
            where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'support_attachments'
        ) then
            alter publication supabase_realtime add table public.support_attachments;
        end if;
    end if;
end $$;


-- >>> FILE: 050_platform_notifications_realtime.sql <<<
-- ==============================================================================
-- InkFlow SaaS - Migration 050: Authoritative Platform Notifications & Real-Time Replication
-- Supports:
--   1. Real-time Platform Notifications Ledger (Admin alerts, Telemetry, Broadcasts, Security, Support)
--   2. Strict Row Level Security (RLS) allowing only verified platform administrators
--   3. Complete Tenant Isolation: Tenant users cannot view or subscribe to platform notifications
--   4. REPLICA IDENTITY FULL & supabase_realtime publication membership for live updates
--   5. High-performance composite indexes for real-time query pagination & filtering
-- ==============================================================================

-- 1. CREATE PLATFORM NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.platform_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
    type TEXT NOT NULL DEFAULT 'broadcast', -- 'broadcast', 'support', 'tenant', 'tenant_lifecycle', 'billing', 'security', 'system', 'usage_warning', 'general'
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    company_name TEXT,
    action_url TEXT,
    target_audience TEXT NOT NULL DEFAULT 'all_admins', -- 'all_admins', 'all_tenants', 'specific_tenant', 'specific_user'
    recipient_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. CREATE PERFORMANCE INDEXES FOR REAL-TIME FILTERING & PAGINATION
CREATE INDEX IF NOT EXISTS idx_platform_notifs_created 
    ON public.platform_notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_notifs_unread 
    ON public.platform_notifications(is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_notifs_type 
    ON public.platform_notifications(type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_notifs_severity 
    ON public.platform_notifications(severity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_notifs_recipient 
    ON public.platform_notifications(recipient_user_id) 
    WHERE recipient_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_platform_notifs_company 
    ON public.platform_notifications(company_id) 
    WHERE company_id IS NOT NULL;

-- 3. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.platform_notifications ENABLE ROW LEVEL SECURITY;

-- 4. STRICT RLS POLICIES FOR PLATFORM NOTIFICATIONS
-- A. SELECT: Only active platform administrators can view platform notifications.
--    Tenant users (company_users) evaluate auth_is_platform_admin() to false and receive ZERO rows.
DROP POLICY IF EXISTS "Active platform admins can view platform notifications" ON public.platform_notifications;
CREATE POLICY "Active platform admins can view platform notifications"
    ON public.platform_notifications FOR SELECT
    USING (
        public.auth_is_platform_admin() 
        AND (recipient_user_id IS NULL OR recipient_user_id = auth.uid())
    );

-- B. INSERT: Platform admins or internal database service functions can insert notifications.
DROP POLICY IF EXISTS "Authorized platform admins and service can insert platform notifications" ON public.platform_notifications;
CREATE POLICY "Authorized platform admins and service can insert platform notifications"
    ON public.platform_notifications FOR INSERT
    WITH CHECK (
        public.auth_is_platform_admin() 
        OR auth.uid() IS NULL
    );

-- C. UPDATE: Platform admins can update their own read state or notifications.
DROP POLICY IF EXISTS "Active platform admins can update platform notifications" ON public.platform_notifications;
CREATE POLICY "Active platform admins can update platform notifications"
    ON public.platform_notifications FOR UPDATE
    USING (
        public.auth_is_platform_admin() 
        AND (recipient_user_id IS NULL OR recipient_user_id = auth.uid())
    )
    WITH CHECK (
        public.auth_is_platform_admin()
    );

-- D. DELETE: Active platform admins can delete/dismiss platform notifications.
DROP POLICY IF EXISTS "Active platform admins can delete platform notifications" ON public.platform_notifications;
CREATE POLICY "Active platform admins can delete platform notifications"
    ON public.platform_notifications FOR DELETE
    USING (
        public.auth_is_platform_admin()
    );

-- 5. ENABLE REPLICA IDENTITY FULL FOR SUPABASE REALTIME REPLICATION
ALTER TABLE public.platform_notifications REPLICA IDENTITY FULL;

-- 6. ADD TABLE TO supabase_realtime PUBLICATION
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'platform_notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_notifications;
    END IF;
END $$;


-- >>> FILE: 051_gmail_smtp_email_integration.sql <<<
-- ==============================================================================
-- PrintERP SaaS - Migration 051: Multi-Tenant Gmail (OAuth 2.0) + SMTP Integration & Scope Isolation
-- Supports:
--   1. Gmail Provider (Google OAuth 2.0 + Gmail API) and Upgraded SMTP
--   2. Strict Platform Scope (tenant_id IS NULL) vs Tenant Scope (tenant_id IS NOT NULL)
--   3. Fail-Closed Boundary: Zero cross-scope fallback from Tenant to Platform
--   4. Encrypted OAuth Tokens (access_token, refresh_token, token_expires_at)
--   5. Idempotency Key Deduplication on Email Logs
--   6. Strict RLS Policies for Tenant and Platform Gateways & Logs
-- ==============================================================================

-- 1. UPGRADE EMAIL GATEWAYS TABLE
-- Add 'gmail' provider and scope_type to email_gateways if not present
do $$
begin
    -- Update provider check constraint to include 'gmail'
    alter table public.email_gateways drop constraint if exists email_gateways_provider_check;
    alter table public.email_gateways add constraint email_gateways_provider_check
        check (provider in ('gmail', 'smtp', 'resend', 'sendgrid', 'ses', 'custom', 'mock'));

    -- Add scope_type column if not exists
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'email_gateways' and column_name = 'scope_type') then
        alter table public.email_gateways add column scope_type text not null default 'TENANT' check (scope_type in ('PLATFORM', 'TENANT'));
    end if;

    -- Add gmail specific columns if not exists
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'email_gateways' and column_name = 'gmail_account_email') then
        alter table public.email_gateways add column gmail_account_email text;
    end if;

    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'email_gateways' and column_name = 'gmail_display_name') then
        alter table public.email_gateways add column gmail_display_name text;
    end if;

    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'email_gateways' and column_name = 'token_expires_at') then
        alter table public.email_gateways add column token_expires_at timestamptz;
    end if;

    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'email_gateways' and column_name = 'last_checked_at') then
        alter table public.email_gateways add column last_checked_at timestamptz;
    end if;

    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'email_gateways' and column_name = 'last_sent_at') then
        alter table public.email_gateways add column last_sent_at timestamptz;
    end if;
end $$;

-- Enforce scope integrity: PLATFORM has tenant_id NULL, TENANT has tenant_id NOT NULL
alter table public.email_gateways drop constraint if exists chk_email_gateways_scope_ownership;
alter table public.email_gateways add constraint chk_email_gateways_scope_ownership
    check (
        (scope_type = 'PLATFORM' and tenant_id is null) or
        (scope_type = 'TENANT' and tenant_id is not null)
    );

-- Set existing records scope_type accurately
update public.email_gateways
set scope_type = case when tenant_id is null then 'PLATFORM' else 'TENANT' end
where scope_type is null or scope_type != case when tenant_id is null then 'PLATFORM' else 'TENANT' end;

-- 2. UPGRADE EMAIL LOGS TABLE
do $$
begin
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'email_logs' and column_name = 'scope_type') then
        alter table public.email_logs add column scope_type text not null default 'TENANT' check (scope_type in ('PLATFORM', 'TENANT'));
    end if;

    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'email_logs' and column_name = 'idempotency_key') then
        alter table public.email_logs add column idempotency_key text;
    end if;
end $$;

-- Set existing logs scope_type accurately
update public.email_logs
set scope_type = case when tenant_id is null then 'PLATFORM' else 'TENANT' end
where scope_type is null or scope_type != case when tenant_id is null then 'PLATFORM' else 'TENANT' end;

-- Indexes for fast lookup and idempotency deduplication
create index if not exists idx_email_logs_idempotency on public.email_logs(idempotency_key) where idempotency_key is not null;
create index if not exists idx_email_logs_scope on public.email_logs(scope_type, tenant_id);
create index if not exists idx_email_gateways_scope on public.email_gateways(scope_type, tenant_id, is_default) where is_default = true;

-- 3. STRICT ROW LEVEL SECURITY (RLS) POLICIES
-- Drop old policies to re-apply strictly
drop policy if exists "Platform admins manage platform email gateways" on public.email_gateways;
drop policy if exists "Tenant users view own email gateways" on public.email_gateways;
drop policy if exists "Authorized tenant admins manage own email gateways" on public.email_gateways;

-- Gateways RLS
-- Platform Admins: Full control over PLATFORM email gateways ONLY (tenant_id IS NULL)
create policy "Platform admins manage platform email gateways"
    on public.email_gateways for all
    using (
        public.auth_is_platform_admin()
        and tenant_id is null
        and scope_type = 'PLATFORM'
    )
    with check (
        public.auth_is_platform_admin()
        and tenant_id is null
        and scope_type = 'PLATFORM'
    );

-- Active Tenant Users: Can view their own tenant gateways (never platform or other tenants)
create policy "Tenant users view own email gateways"
    on public.email_gateways for select
    using (
        tenant_id is not null
        and scope_type = 'TENANT'
        and public.auth_is_active_company_user(tenant_id)
    );

-- Authorized Tenant Admins: Can insert, update, delete their own tenant gateways
create policy "Authorized tenant admins manage own email gateways"
    on public.email_gateways for all
    using (
        tenant_id is not null
        and scope_type = 'TENANT'
        and public.auth_is_active_company_user(tenant_id)
        and public.auth_user_has_permission(tenant_id, 'settings.edit')
    )
    with check (
        tenant_id is not null
        and scope_type = 'TENANT'
        and public.auth_is_active_company_user(tenant_id)
        and public.auth_user_has_permission(tenant_id, 'settings.edit')
    );

-- Logs RLS
drop policy if exists "Platform admins view email logs" on public.email_logs;
drop policy if exists "Tenant users view own email logs" on public.email_logs;
drop policy if exists "Tenant users append own email logs" on public.email_logs;

-- Platform Admins: View platform logs and authorized audit logs
create policy "Platform admins view email logs"
    on public.email_logs for select
    using (public.auth_is_platform_admin());

-- Tenant Users: View their own tenant logs ONLY
create policy "Tenant users view own email logs"
    on public.email_logs for select
    using (
        tenant_id is not null
        and scope_type = 'TENANT'
        and public.auth_is_active_company_user(tenant_id)
    );

-- Tenant Users / Service: Can insert logs for their tenant
create policy "Tenant users append own email logs"
    on public.email_logs for insert
    with check (
        (tenant_id is not null and scope_type = 'TENANT' and public.auth_is_active_company_user(tenant_id))
        or (public.auth_is_platform_admin() and scope_type = 'PLATFORM' and tenant_id is null)
    );


-- >>> FILE: 052_strict_rls_and_security_hardening.sql <<<
-- ==============================================================================
-- InkFlow SaaS - Migration 052: Strict RLS & Security Definer Hardening
-- Single Source of Truth & Authoritative Isolation Boundary:
--   1. Enforces search_path = public, pg_temp across ALL security definer functions
--   2. Enforces caller authorization on sequence & document numbering generators
--   3. Drops overly permissive RLS policies (auth.uid() is not null) from platform tables
--   4. Locks down platform-wide tables strictly to active platform admins/owners
--   5. Enforces tenant boundaries on gateway, settings, and subscription tables
-- ==============================================================================

-- 1. HARDEN SECURITY DEFINER HELPER FUNCTIONS WITH SEARCH_PATH
create or replace function public.auth_is_platform_admin()
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_user_id uuid;
begin
    v_user_id := auth.uid();
    if v_user_id is null then
        return false;
    end if;

    return exists (
        select 1
        from public.platform_admins
        where user_id = v_user_id
          and is_active = true
    );
end;
$$;

create or replace function public.auth_is_platform_owner()
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_user_id uuid;
begin
    v_user_id := auth.uid();
    if v_user_id is null then
        return false;
    end if;

    return exists (
        select 1
        from public.platform_admins
        where user_id = v_user_id
          and role = 'platform_owner'
          and is_active = true
    );
end;
$$;

create or replace function public.auth_is_active_company_user(target_company_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    if auth.uid() is null or target_company_id is null then
        return false;
    end if;

    return exists (
        select 1
        from public.company_users cu
        join public.companies c on c.id = cu.company_id
        where cu.company_id = target_company_id
          and cu.user_id = auth.uid()
          and cu.status = 'active'
          and c.is_active = true
    );
end;
$$;

create or replace function public.auth_get_user_company_role(target_company_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_role text;
begin
    if auth.uid() is null or target_company_id is null then
        return null;
    end if;

    select r.slug into v_role
    from public.company_users cu
    join public.user_roles ur on ur.company_user_id = cu.id
    join public.roles r on r.id = ur.role_id
    where cu.company_id = target_company_id
      and cu.user_id = auth.uid()
      and cu.status = 'active'
    order by case when r.slug in ('owner', 'business_owner') then 1 else 2 end
    limit 1;

    return v_role;
end;
$$;

-- 2. HARDEN DOCUMENT NUMBERING & SEQUENCE FUNCTIONS
create or replace function public.get_next_document_number(
    p_company_id uuid,
    p_doc_type text
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_prefix text;
    v_next_val bigint;
    v_padding integer;
    v_formatted text;
begin
    -- Security verification: Caller must belong to the company or be an authorized platform admin
    if auth.role() is not null and auth.role() <> 'service_role' then
        if auth.uid() is null then
            raise exception 'Authentication required';
        end if;
        if not (public.auth_is_active_company_user(p_company_id) or public.auth_is_platform_admin()) then
            raise exception 'Unauthorized attempt to generate company sequence for unauthorized company';
        end if;
    end if;

    -- Lock row exclusively to prevent race conditions across parallel bookings
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
$$;

create or replace function public.get_next_tenant_document_number(
    p_company_id uuid,
    p_document_type text,
    p_prefix text default null
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_year integer := extract(year from current_date);
    v_counter bigint;
    v_doc_prefix text;
    v_result text;
begin
    -- Security verification
    if auth.role() is not null and auth.role() <> 'service_role' then
        if not (public.auth_is_active_company_user(p_company_id) or public.auth_is_platform_admin()) then
            raise exception 'Unauthorized attempt to generate company document sequence';
        end if;
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

    -- Format: PREFIX-YYYY-NUMBER e.g. INV-2026-000101
    v_result := v_doc_prefix || '-' || v_year::text || '-' || lpad(v_counter::text, 6, '0');
    return v_result;
end;
$$;

create or replace function public.get_next_support_ticket_number()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_next_val bigint;
begin
    v_next_val := nextval('public.support_ticket_number_seq');
    return 'SUP-' || lpad(v_next_val::text, 6, '0');
end;
$$;

-- 3. HARDEN REPORTING & ANALYTICS FUNCTIONS
drop function if exists public.get_tenant_sales_summary(uuid, date, date);
drop function if exists public.get_tenant_sales_summary(uuid);
drop function if exists public.get_tenant_sales_summary();
drop function if exists public.get_tenant_production_summary(uuid, date, date);
drop function if exists public.get_tenant_production_summary(uuid);
drop function if exists public.get_tenant_production_summary();
drop function if exists public.get_tenant_financial_summary(uuid, date, date);
drop function if exists public.get_tenant_financial_summary(uuid);
drop function if exists public.get_tenant_financial_summary();

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
set search_path = public, pg_temp
as $$
begin
    if auth.role() is not null and auth.role() <> 'service_role' then
        if not (public.auth_is_active_company_user(p_company_id) or public.auth_is_platform_admin()) then
            raise exception 'Unauthorized access to company sales analytics';
        end if;
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
set search_path = public, pg_temp
as $$
begin
    if auth.role() is not null and auth.role() <> 'service_role' then
        if not (public.auth_is_active_company_user(p_company_id) or public.auth_is_platform_admin()) then
            raise exception 'Unauthorized access to company production analytics';
        end if;
    end if;

    return query
    select
        count(pj.id)::bigint as total_jobs,
        count(pj.id) filter (where pj.status = 'completed')::bigint as completed_jobs,
        count(pj.id) filter (where pj.due_date < current_date and pj.status not in ('completed', 'cancelled'))::bigint as delayed_jobs,
        coalesce(sum(pj.rework_count), 0)::bigint as rework_count,
        coalesce(sum(pj.rework_wastage_cost), 0)::numeric as rework_wastage_cost
    from public.production_jobs pj
    where pj.company_id = p_company_id
      and pj.created_at::date between p_start_date and p_end_date;
end;
$$;

create or replace function public.get_tenant_financial_summary(
    p_company_id uuid,
    p_start_date date default current_date - interval '30 days',
    p_end_date date default current_date
)
returns table (
    total_invoiced numeric,
    total_collected numeric,
    total_outstanding numeric,
    total_expenses numeric,
    net_cashflow numeric
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_invoiced numeric;
    v_collected numeric;
    v_outstanding numeric;
    v_expenses numeric;
begin
    if auth.role() is not null and auth.role() <> 'service_role' then
        if not (public.auth_is_active_company_user(p_company_id) or public.auth_is_platform_admin()) then
            raise exception 'Unauthorized access to company financial analytics';
        end if;
    end if;

    select coalesce(sum(i.grand_total), 0) into v_invoiced
    from public.invoices i
    where i.company_id = p_company_id
      and i.invoice_date between p_start_date and p_end_date;

    select coalesce(sum(p.amount), 0) into v_collected
    from public.payments p
    where p.company_id = p_company_id
      and p.payment_date between p_start_date and p_end_date;

    select coalesce(sum(i.due_amount), 0) into v_outstanding
    from public.invoices i
    where i.company_id = p_company_id
      and i.status not in ('paid', 'cancelled');

    select coalesce(sum(e.amount), 0) into v_expenses
    from public.expenses e
    where e.company_id = p_company_id
      and e.expense_date between p_start_date and p_end_date;

    return query select
        v_invoiced as total_invoiced,
        v_collected as total_collected,
        v_outstanding as total_outstanding,
        v_expenses as total_expenses,
        (v_collected - v_expenses) as net_cashflow;
end;
$$;

-- 4. HARDEN AUDIT LOGGING FUNCTIONS
create or replace function public.log_audit_event(
    p_company_id uuid,
    p_entity_type text,
    p_action text,
    p_old_values jsonb default null,
    p_new_values jsonb default null,
    p_entity_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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
$$;

create or replace function public.log_platform_audit_event(
    p_action text,
    p_entity text,
    p_entity_id text default null,
    p_details jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_admin_id uuid;
    v_log_id uuid;
begin
    select id into v_admin_id
    from public.platform_admins
    where user_id = auth.uid()
      and is_active = true
    limit 1;

    insert into public.platform_audit_logs (
        admin_id,
        action,
        entity,
        entity_id,
        details
    ) values (
        v_admin_id,
        p_action,
        p_entity,
        p_entity_id,
        p_details
    ) returning id into v_log_id;

    return v_log_id;
end;
$$;

-- 5. REPAIR RLS POLICIES ACROSS ALL PLATFORM TABLES (DROP PERMISSIVE POLICIES)

-- Platform SaaS Plans
alter table if exists public.platform_saas_plans enable row level security;
drop policy if exists "Platform owners can view platform_saas_plans" on public.platform_saas_plans;
drop policy if exists "Platform owners can manage platform_saas_plans" on public.platform_saas_plans;
drop policy if exists "Anyone authenticated can view platform_saas_plans" on public.platform_saas_plans;

create policy "Platform admins view platform_saas_plans"
    on public.platform_saas_plans for select
    using (public.auth_is_platform_admin());

create policy "Platform owners manage platform_saas_plans"
    on public.platform_saas_plans for all
    using (public.auth_is_platform_owner());

-- Platform Role Templates
alter table if exists public.platform_role_templates enable row level security;
drop policy if exists "Authenticated users can read platform role templates" on public.platform_role_templates;
drop policy if exists "Platform owners can manage platform role templates" on public.platform_role_templates;

create policy "Platform admins read platform role templates"
    on public.platform_role_templates for select
    using (public.auth_is_platform_admin());

create policy "Platform owners manage platform_role_templates"
    on public.platform_role_templates for all
    using (public.auth_is_platform_owner());

-- Platform Role Template Permissions
alter table if exists public.platform_role_template_permissions enable row level security;
drop policy if exists "Authenticated users can read platform role template permissions" on public.platform_role_template_permissions;
drop policy if exists "Platform owners can manage platform role template permissions" on public.platform_role_template_permissions;

create policy "Platform admins read platform role template permissions"
    on public.platform_role_template_permissions for select
    using (public.auth_is_platform_admin());

create policy "Platform owners manage platform_role_template_permissions"
    on public.platform_role_template_permissions for all
    using (public.auth_is_platform_owner());

-- Platform Subscriptions & Events
alter table if exists public.platform_subscriptions enable row level security;
drop policy if exists "Platform owners can manage platform_subscriptions" on public.platform_subscriptions;
create policy "Platform admins manage platform_subscriptions"
    on public.platform_subscriptions for all
    using (public.auth_is_platform_admin());

alter table if exists public.platform_subscription_events enable row level security;
drop policy if exists "Platform owners can manage platform_subscription_events" on public.platform_subscription_events;
create policy "Platform admins manage platform_subscription_events"
    on public.platform_subscription_events for all
    using (public.auth_is_platform_admin());

alter table if exists public.platform_webhook_events enable row level security;
drop policy if exists "Platform owners can manage platform_webhook_events" on public.platform_webhook_events;
create policy "Platform admins manage platform_webhook_events"
    on public.platform_webhook_events for all
    using (public.auth_is_platform_admin());

-- Platform System Settings & Health
alter table if exists public.platform_system_settings enable row level security;
drop policy if exists "Platform admins can view system settings" on public.platform_system_settings;
drop policy if exists "Platform owners can manage system settings" on public.platform_system_settings;

create policy "Platform admins view system settings"
    on public.platform_system_settings for select
    using (public.auth_is_platform_admin());

create policy "Platform owners manage system settings"
    on public.platform_system_settings for all
    using (public.auth_is_platform_owner());

alter table if exists public.platform_system_health_events enable row level security;
drop policy if exists "Platform owners can view and manage system health events" on public.platform_system_health_events;
create policy "Platform admins manage system health events"
    on public.platform_system_health_events for all
    using (public.auth_is_platform_admin());

-- Platform Admins Table
alter table if exists public.platform_admins enable row level security;
drop policy if exists "Platform admins full control on platform_admins" on public.platform_admins;
create policy "Platform admins manage platform_admins"
    on public.platform_admins for all
    using (public.auth_is_platform_admin());

-- 6. REPAIR TENANT GATEWAY & AUDIT RLS POLICIES
alter table if exists public.gateway_integrations enable row level security;
drop policy if exists "Tenant isolation on gateway_integrations" on public.gateway_integrations;
drop policy if exists "Platform owners manage global gateways" on public.gateway_integrations;

create policy "Tenant users manage own gateway_integrations"
    on public.gateway_integrations for all
    using (
        (tenant_id is not null and public.auth_is_active_company_user(tenant_id))
        or (tenant_id is null and public.auth_is_platform_admin())
    );

alter table if exists public.gateway_transactions enable row level security;
drop policy if exists "Tenant isolation on gateway_transactions" on public.gateway_transactions;

create policy "Tenant users view own gateway_transactions"
    on public.gateway_transactions for all
    using (
        (tenant_id is not null and public.auth_is_active_company_user(tenant_id))
        or (tenant_id is null and public.auth_is_platform_admin())
    );

alter table if exists public.gateway_webhooks enable row level security;
drop policy if exists "Tenant isolation on gateway_webhooks" on public.gateway_webhooks;
drop policy if exists "Platform admins view gateway webhooks" on public.gateway_webhooks;
drop policy if exists "Tenant users view own gateway_webhooks" on public.gateway_webhooks;
drop policy if exists "Platform admins and gateway owners view webhooks" on public.gateway_webhooks;

create policy "Platform admins and gateway owners view webhooks"
    on public.gateway_webhooks for all
    using (
        public.auth_is_platform_admin()
        or exists (
            select 1 from public.gateway_integrations gi
            where gi.id = gateway_webhooks.gateway_id
              and gi.tenant_id is not null
              and public.auth_is_active_company_user(gi.tenant_id)
        )
    );

alter table if exists public.audit_logs enable row level security;
drop policy if exists "Admins can view audit logs" on public.audit_logs;
drop policy if exists "Tenant and platform isolation on audit_logs" on public.audit_logs;

create policy "Tenant users and platform admins view audit logs"
    on public.audit_logs for select
    using (
        public.auth_is_active_company_user(company_id)
        or public.auth_is_platform_admin()
    );


-- >>> FILE: 053_final_security_and_rls_hardening.sql <<<
-- ==============================================================================
-- InkFlow SaaS - Migration 053: Comprehensive Production Security & RLS Hardening
-- Single Source of Truth & Authoritative Isolation Boundary:
--   1. Enforces search_path = public, pg_temp across ALL security definer functions
--   2. Restricts EXECUTE permissions on privileged database functions
--   3. Eliminates any permissive or ambiguous RLS policies
--   4. Locks down platform-wide tables strictly to active platform admins
--   5. Enforces strict tenant isolation across all tenant entities
--   6. Enforces caller authorization on atomic sequence & document number generators
-- ==============================================================================

-- 1. HARDEN SECURITY DEFINER HELPER FUNCTIONS WITH EXPLICIT SEARCH PATH
CREATE OR REPLACE FUNCTION public.auth_is_platform_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id uuid;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN false;
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM public.platform_admins
        WHERE user_id = v_user_id
          AND is_active = true
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.auth_is_platform_owner()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id uuid;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN false;
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM public.platform_admins
        WHERE user_id = v_user_id
          AND role = 'platform_owner'
          AND is_active = true
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.auth_is_active_company_user(target_company_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NULL OR target_company_id IS NULL THEN
        RETURN false;
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM public.company_users cu
        JOIN public.companies c ON c.id = cu.company_id
        WHERE cu.company_id = target_company_id
          AND cu.user_id = auth.uid()
          AND cu.status = 'active'
          AND c.is_active = true
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.auth_get_user_company_role(target_company_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_role text;
BEGIN
    IF auth.uid() IS NULL OR target_company_id IS NULL THEN
        RETURN null;
    END IF;

    SELECT r.slug INTO v_role
    FROM public.company_users cu
    JOIN public.user_roles ur ON ur.company_user_id = cu.id
    JOIN public.roles r ON r.id = ur.role_id
    WHERE cu.company_id = target_company_id
      AND cu.user_id = auth.uid()
      AND cu.status = 'active'
    ORDER BY CASE WHEN r.slug IN ('owner', 'business_owner') THEN 1 ELSE 2 END
    LIMIT 1;

    RETURN v_role;
END;
$$;

-- 2. HARDEN DOCUMENT NUMBERING & SEQUENCE GENERATORS (FAIL CLOSED)
CREATE OR REPLACE FUNCTION public.get_next_document_number(
    p_company_id uuid,
    p_doc_type text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_prefix text;
    v_next_val bigint;
    v_padding integer;
    v_formatted text;
BEGIN
    -- Security verification: Caller must belong to the company or be an authorized platform admin
    IF auth.role() IS NOT NULL AND auth.role() <> 'service_role' THEN
        IF auth.uid() IS NULL THEN
            RAISE EXCEPTION 'Authentication required';
        END IF;
        IF NOT (public.auth_is_active_company_user(p_company_id) OR public.auth_is_platform_admin()) THEN
            RAISE EXCEPTION 'Unauthorized attempt to generate company sequence for unauthorized company';
        END IF;
    END IF;

    -- Lock row exclusively to prevent race conditions across parallel bookings
    SELECT prefix, current_val + 1, padding
    INTO v_prefix, v_next_val, v_padding
    FROM public.document_sequences
    WHERE company_id = p_company_id
      AND doc_type = p_doc_type
    FOR UPDATE;

    -- If no sequence exists yet, initialize it
    IF v_next_val IS NULL THEN
        v_prefix := CASE p_doc_type
            WHEN 'quotation' THEN 'QUO'
            WHEN 'order' THEN 'ORD'
            WHEN 'invoice' THEN 'INV'
            WHEN 'challan' THEN 'CHL'
            WHEN 'payment' THEN 'PAY'
            WHEN 'purchase' THEN 'PUR'
            ELSE 'DOC'
        END;
        v_next_val := 1;
        v_padding := 6;

        INSERT INTO public.document_sequences (company_id, doc_type, prefix, current_val, padding)
        VALUES (p_company_id, p_doc_type, v_prefix, v_next_val, v_padding);
    ELSE
        UPDATE public.document_sequences
        SET current_val = v_next_val,
            updated_at = now()
        WHERE company_id = p_company_id
          AND doc_type = p_doc_type;
    END IF;

    -- Format document number e.g. "INV-000001"
    v_formatted := v_prefix || '-' || lpad(v_next_val::text, v_padding, '0');
    RETURN v_formatted;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_next_tenant_document_number(
    p_company_id uuid,
    p_document_type text,
    p_prefix text DEFAULT null
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_year integer := EXTRACT(year FROM CURRENT_DATE);
    v_counter bigint;
    v_doc_prefix text;
    v_result text;
BEGIN
    -- Security verification
    IF auth.role() IS NOT NULL AND auth.role() <> 'service_role' THEN
        IF NOT (public.auth_is_active_company_user(p_company_id) OR public.auth_is_platform_admin()) THEN
            RAISE EXCEPTION 'Unauthorized attempt to generate company document sequence';
        END IF;
    END IF;

    IF p_prefix IS NOT NULL THEN
        v_doc_prefix := p_prefix;
    ELSE
        CASE p_document_type
            WHEN 'invoice' THEN v_doc_prefix := 'INV';
            WHEN 'quotation' THEN v_doc_prefix := 'QT';
            WHEN 'vat_mushak' THEN v_doc_prefix := 'MUSK';
            WHEN 'receipt' THEN v_doc_prefix := 'MR';
            WHEN 'challan' THEN v_doc_prefix := 'CH';
            WHEN 'purchase_order' THEN v_doc_prefix := 'PO';
            ELSE v_doc_prefix := 'DOC';
        END CASE;
    END IF;

    -- Atomic row-level lock & increment
    INSERT INTO public.document_number_counters (company_id, document_type, year_prefix, current_counter, updated_at)
    VALUES (p_company_id, p_document_type, v_year, 101, now())
    ON CONFLICT (company_id, document_type, year_prefix)
    DO UPDATE SET
        current_counter = public.document_number_counters.current_counter + 1,
        updated_at = now()
    RETURNING current_counter INTO v_counter;

    -- Format: PREFIX-YYYY-NUMBER e.g. INV-2026-000101
    v_result := v_doc_prefix || '-' || v_year::text || '-' || lpad(v_counter::text, 6, '0');
    RETURN v_result;
END;
$$;

-- 3. HARDEN AUDIT LOGGING & TAMPER RESISTANCE
CREATE OR REPLACE FUNCTION public.log_audit_event(
    p_company_id uuid,
    p_entity_type text,
    p_action text,
    p_old_values jsonb DEFAULT null,
    p_new_values jsonb DEFAULT null,
    p_entity_id text DEFAULT null
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_log_id uuid;
BEGIN
    -- Actor identity derived authoritatively from authenticated session
    INSERT INTO public.audit_logs (
        company_id,
        user_id,
        entity_type,
        entity_id,
        action,
        old_values,
        new_values
    ) VALUES (
        p_company_id,
        auth.uid(),
        p_entity_type,
        p_entity_id,
        p_action,
        p_old_values,
        p_new_values
    ) RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_platform_audit_event(
    p_action text,
    p_entity text,
    p_entity_id text DEFAULT null,
    p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_admin_id uuid;
    v_log_id uuid;
BEGIN
    SELECT id INTO v_admin_id
    FROM public.platform_admins
    WHERE user_id = auth.uid()
      AND is_active = true
    LIMIT 1;

    INSERT INTO public.platform_audit_logs (
        admin_id,
        action,
        entity,
        entity_id,
        details
    ) VALUES (
        v_admin_id,
        p_action,
        p_entity,
        p_entity_id,
        p_details
    ) RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$;

-- 4. RESTRICT FUNCTION PRIVILEGES (REVOKE FROM PUBLIC, GRANT TO AUTHENTICATED)
REVOKE ALL ON FUNCTION public.auth_is_platform_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auth_is_platform_owner() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auth_is_active_company_user(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auth_get_user_company_role(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_next_document_number(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_next_tenant_document_number(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_audit_event(uuid, text, text, jsonb, jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_platform_audit_event(text, text, text, jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.auth_is_platform_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auth_is_platform_owner() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auth_is_active_company_user(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auth_get_user_company_role(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_next_document_number(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_next_tenant_document_number(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_audit_event(uuid, text, text, jsonb, jsonb, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_platform_audit_event(text, text, text, jsonb) TO authenticated, service_role;

-- 5. COMPLETE RLS AUDIT & HARDENING ACROSS PLATFORM TABLES
ALTER TABLE IF EXISTS public.platform_admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Platform admins full control on platform_admins" ON public.platform_admins;
DROP POLICY IF EXISTS "Platform admins manage platform_admins" ON public.platform_admins;

CREATE POLICY "Platform admins manage platform_admins"
    ON public.platform_admins FOR ALL
    USING (public.auth_is_platform_admin());

ALTER TABLE IF EXISTS public.platform_saas_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Platform owners can view platform_saas_plans" ON public.platform_saas_plans;
DROP POLICY IF EXISTS "Platform owners can manage platform_saas_plans" ON public.platform_saas_plans;
DROP POLICY IF EXISTS "Anyone authenticated can view platform_saas_plans" ON public.platform_saas_plans;
DROP POLICY IF EXISTS "Platform admins view platform_saas_plans" ON public.platform_saas_plans;
DROP POLICY IF EXISTS "Platform owners manage platform_saas_plans" ON public.platform_saas_plans;

CREATE POLICY "Platform admins view platform_saas_plans"
    ON public.platform_saas_plans FOR SELECT
    USING (public.auth_is_platform_admin());

CREATE POLICY "Platform owners manage platform_saas_plans"
    ON public.platform_saas_plans FOR ALL
    USING (public.auth_is_platform_owner());

ALTER TABLE IF EXISTS public.platform_support_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Platform admins manage support sessions" ON public.platform_support_sessions;
CREATE POLICY "Platform admins manage support sessions"
    ON public.platform_support_sessions FOR ALL
    USING (public.auth_is_platform_admin());

-- 6. COMPLETE RLS AUDIT & HARDENING ACROSS TENANT TABLES
ALTER TABLE IF EXISTS public.gateway_integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation on gateway_integrations" ON public.gateway_integrations;
DROP POLICY IF EXISTS "Platform owners manage global gateways" ON public.gateway_integrations;
DROP POLICY IF EXISTS "Tenant users manage own gateway_integrations" ON public.gateway_integrations;

CREATE POLICY "Tenant users manage own gateway_integrations"
    ON public.gateway_integrations FOR ALL
    USING (
        (tenant_id IS NOT NULL AND public.auth_is_active_company_user(tenant_id))
        OR (tenant_id IS NULL AND public.auth_is_platform_admin())
    );

ALTER TABLE IF EXISTS public.gateway_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation on gateway_transactions" ON public.gateway_transactions;
DROP POLICY IF EXISTS "Tenant users view own gateway_transactions" ON public.gateway_transactions;

CREATE POLICY "Tenant users view own gateway_transactions"
    ON public.gateway_transactions FOR ALL
    USING (
        (tenant_id IS NOT NULL AND public.auth_is_active_company_user(tenant_id))
        OR (tenant_id IS NULL AND public.auth_is_platform_admin())
    );

ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Tenant and platform isolation on audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Tenant users and platform admins view audit logs" ON public.audit_logs;

CREATE POLICY "Tenant users and platform admins view audit logs"
    ON public.audit_logs FOR SELECT
    USING (
        public.auth_is_active_company_user(company_id)
        OR public.auth_is_platform_admin()
    );

-- 7. UNIQUE CONSTRAINTS FOR PAYMENT & WEBHOOK IDEMPOTENCY
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_gateway_transactions_internal_trx_id'
    ) THEN
        ALTER TABLE IF EXISTS public.gateway_transactions
            ADD CONSTRAINT uq_gateway_transactions_internal_trx_id UNIQUE (internal_trx_id);
    END IF;
EXCEPTION
    WHEN duplicate_table OR duplicate_object THEN
        NULL;
END;
$$;


-- >>> FILE: 054_auth_pkce_and_trigger_hardening.sql <<<
-- ==============================================================================
-- InkFlow SaaS - Migration 054: Auth PKCE & handle_new_user Trigger Hardening
-- Hardens auth.users trigger to prevent GoTrue 500 errors during OAuth sign-ins.
-- ==============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_name text;
    v_phone text;
    v_locale text;
    v_email text;
    v_avatar text;
begin
    -- 1. Extract and sanitize email
    v_email := coalesce(
        nullif(trim(lower(new.email)), ''),
        nullif(trim(lower(new.raw_user_meta_data->>'email')), ''),
        'user-' || new.id || '@inkflow.internal'
    );

    -- 2. Extract and sanitize full name
    v_name := coalesce(
        nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
        nullif(trim(new.raw_user_meta_data->>'name'), ''),
        nullif(trim(new.raw_user_meta_data->>'user_name'), ''),
        split_part(v_email, '@', 1),
        'User'
    );

    -- 3. Extract phone
    v_phone := coalesce(
        nullif(trim(new.raw_user_meta_data->>'phone'), ''),
        nullif(trim(new.phone), ''),
        null
    );

    -- 4. Extract preferred locale
    v_locale := coalesce(
        nullif(trim(new.raw_user_meta_data->>'preferred_locale'), ''),
        nullif(trim(new.raw_user_meta_data->>'locale'), ''),
        'bn'
    );

    -- 5. Extract avatar url
    v_avatar := coalesce(
        nullif(trim(new.raw_user_meta_data->>'avatar_url'), ''),
        nullif(trim(new.raw_user_meta_data->>'picture'), ''),
        null
    );

    -- 6. Upsert user_profiles record safely with exception handling
    begin
        insert into public.user_profiles (
            id,
            email,
            full_name,
            phone,
            avatar_url,
            preferred_locale,
            is_active,
            created_at,
            updated_at
        )
        values (
            new.id,
            v_email,
            v_name,
            v_phone,
            v_avatar,
            v_locale,
            true,
            now(),
            now()
        )
        on conflict (id) do update set
            email = excluded.email,
            full_name = coalesce(excluded.full_name, public.user_profiles.full_name),
            phone = coalesce(excluded.phone, public.user_profiles.phone),
            avatar_url = coalesce(excluded.avatar_url, public.user_profiles.avatar_url),
            preferred_locale = coalesce(excluded.preferred_locale, public.user_profiles.preferred_locale),
            updated_at = now();
    exception when others then
        -- Catch any unforeseen errors to prevent blocking auth.users insertion
        raise warning 'Error in handle_new_user user_profiles upsert: %', SQLERRM;
    end;

    -- 7. Upsert profiles record safely for backward compatibility
    begin
        insert into public.profiles (
            id,
            full_name,
            phone,
            avatar_url,
            preferred_locale,
            created_at,
            updated_at
        )
        values (
            new.id,
            v_name,
            v_phone,
            v_avatar,
            v_locale,
            now(),
            now()
        )
        on conflict (id) do update set
            full_name = coalesce(excluded.full_name, public.profiles.full_name),
            phone = coalesce(excluded.phone, public.profiles.phone),
            avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
            preferred_locale = coalesce(excluded.preferred_locale, public.profiles.preferred_locale),
            updated_at = now();
    exception when others then
        raise warning 'Error in handle_new_user profiles upsert: %', SQLERRM;
    end;

    return new;
end;
$$;

-- Ensure trigger is properly bound to auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();


-- >>> FILE: 055_email_otp_and_verification_system.sql <<<
-- ==============================================================================
-- PrintERP / InkFlow SaaS - Migration 055: Email OTP & Link Verification System
-- Provides authoritative storage for 6-digit OTPs and secure single-use URL tokens
-- for registration verification, password resets, and multi-factor security events.
-- ==============================================================================

create table if not exists public.auth_verifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade,
    email text not null,
    purpose text not null check (purpose in ('registration', 'password_reset', 'login_2fa')),
    otp_hash text,
    token_hash text,
    expires_at timestamptz not null,
    attempts integer not null default 0,
    max_attempts integer not null default 5,
    resend_available_at timestamptz not null default (now() + interval '60 seconds'),
    is_used boolean not null default false,
    verified_at timestamptz,
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Indexes for performant lookup and rate-limiting queries
create index if not exists idx_auth_verifications_email_purpose
    on public.auth_verifications(email, purpose);

create index if not exists idx_auth_verifications_token_hash
    on public.auth_verifications(token_hash)
    where token_hash is not null;

create index if not exists idx_auth_verifications_otp_hash
    on public.auth_verifications(otp_hash)
    where otp_hash is not null;

create index if not exists idx_auth_verifications_expires_at
    on public.auth_verifications(expires_at);

create index if not exists idx_auth_verifications_is_used
    on public.auth_verifications(is_used);

-- Enable Row Level Security (RLS)
alter table public.auth_verifications enable row level security;

-- Strict security policy: Only Service Role and Platform Admins can access auth_verifications
-- Client/anonymous users cannot query or tamper with verification records directly
create policy "Service role and platform admins manage auth verifications"
    on public.auth_verifications for all
    using (
        auth.role() = 'service_role'
        or public.auth_is_platform_admin()
    );


-- >>> FILE: 056_auth_verifications_hardening.sql <<<
-- ==============================================================================
-- PrintERP / InkFlow SaaS - Migration 056: Auth Verifications Hardening & Atomic Functions
-- Enhances public.auth_verifications with explicit purpose support ('password_reset_auth'),
-- atomic OTP and token verification stored procedures, and strict index optimization.
-- ==============================================================================

-- 1. Update purpose check constraint to support password_reset_auth and login_2fa
alter table public.auth_verifications
    drop constraint if exists auth_verifications_purpose_check;

alter table public.auth_verifications
    add constraint auth_verifications_purpose_check
    check (purpose in ('registration', 'password_reset', 'password_reset_auth', 'login_2fa'));

-- 2. Performance indexes
create index if not exists idx_auth_verifications_active_lookup
    on public.auth_verifications(email, purpose, is_used, expires_at);

create index if not exists idx_auth_verifications_token_lookup
    on public.auth_verifications(token_hash, is_used, expires_at)
    where token_hash is not null;

-- 3. Atomic OTP Verification Function
-- Guarantees atomic row-locking, attempt decrementing, and single-use invalidation
create or replace function public.verify_auth_otp_atomic(
    p_email text,
    p_otp_hash text,
    p_purpose text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_record public.auth_verifications%rowtype;
    v_now timestamptz := now();
    v_attempts_left int;
begin
    -- Lock latest active verification record for this email and purpose
    select * into v_record
    from public.auth_verifications
    where lower(email) = lower(p_email)
      and purpose = p_purpose
      and is_used = false
    order by created_at desc
    limit 1
    for update;

    if not found then
        return jsonb_build_object(
            'success', false,
            'code', 'NOT_FOUND',
            'error', 'No active verification code found. Please request a new code.'
        );
    end if;

    -- Check expiration
    if v_now > v_record.expires_at then
        return jsonb_build_object(
            'success', false,
            'code', 'EXPIRED',
            'error', 'Verification code has expired. Please request a new code.'
        );
    end if;

    -- Check attempt lockout
    if v_record.attempts >= v_record.max_attempts then
        return jsonb_build_object(
            'success', false,
            'code', 'LOCKED_OUT',
            'error', 'Too many incorrect attempts. Please request a new verification code.'
        );
    end if;

    -- Compare OTP hash
    if v_record.otp_hash is distinct from p_otp_hash then
        -- Increment attempt count
        update public.auth_verifications
        set attempts = attempts + 1,
            updated_at = v_now
        where id = v_record.id;

        v_attempts_left := v_record.max_attempts - (v_record.attempts + 1);

        if v_attempts_left <= 0 then
            return jsonb_build_object(
                'success', false,
                'code', 'LOCKED_OUT',
                'attempts_left', 0,
                'error', 'Too many incorrect attempts. Please request a new verification code.'
            );
        else
            return jsonb_build_object(
                'success', false,
                'code', 'MISMATCH',
                'attempts_left', v_attempts_left,
                'error', format('Incorrect verification code. %s attempt(s) remaining.', v_attempts_left)
            );
        end if;
    end if;

    -- OTP Match: Mark consumed atomically
    update public.auth_verifications
    set is_used = true,
        verified_at = v_now,
        updated_at = v_now
    where id = v_record.id;

    return jsonb_build_object(
        'success', true,
        'code', 'SUCCESS',
        'id', v_record.id,
        'user_id', v_record.user_id,
        'email', v_record.email,
        'purpose', v_record.purpose
    );
end;
$$;

-- 4. Atomic Token Verification Function
create or replace function public.verify_auth_token_atomic(
    p_token_hash text,
    p_purpose text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_record public.auth_verifications%rowtype;
    v_now timestamptz := now();
begin
    select * into v_record
    from public.auth_verifications
    where token_hash = p_token_hash
      and is_used = false
      and (p_purpose is null or purpose = p_purpose)
    order by created_at desc
    limit 1
    for update;

    if not found then
        return jsonb_build_object(
            'success', false,
            'code', 'NOT_FOUND',
            'error', 'This verification link is invalid or has already been used.'
        );
    end if;

    if v_now > v_record.expires_at then
        return jsonb_build_object(
            'success', false,
            'code', 'EXPIRED',
            'error', 'This verification link has expired. Please request a new one.'
        );
    end if;

    -- Mark consumed atomically
    update public.auth_verifications
    set is_used = true,
        verified_at = v_now,
        updated_at = v_now
    where id = v_record.id;

    return jsonb_build_object(
        'success', true,
        'code', 'SUCCESS',
        'id', v_record.id,
        'user_id', v_record.user_id,
        'email', v_record.email,
        'purpose', v_record.purpose
    );
end;
$$;

-- 5. Function Execution Privileges
revoke all on function public.verify_auth_otp_atomic(text, text, text) from public;
grant execute on function public.verify_auth_otp_atomic(text, text, text) to service_role;

revoke all on function public.verify_auth_token_atomic(text, text) from public;
grant execute on function public.verify_auth_token_atomic(text, text) to service_role;


-- >>> FILE: 057_customer_rates_and_pricing_priority.sql <<<
-- ==============================================================================
-- PrintERP / InkFlow SaaS - Migration 057: Customer Rates & Pricing Priority Engine
-- Supports:
--   1. Customer-specific product rates (customer_rates table)
--   2. 3-Tier Pricing Priority: Custom Rate -> Last Valid Invoice Rate -> Default Rate
--   3. Foreign key reference & index for product_id on invoice_items
--   4. Immutable Historical Invoicing Protection
--   5. Strict Multi-Tenant Row Level Security
-- ==============================================================================

-- 1. CUSTOMER RATES TABLE
create table if not exists public.customer_rates (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    customer_id uuid not null references public.customers(id) on delete cascade,
    product_id uuid not null references public.products(id) on delete cascade,
    rate numeric(12,2) not null check (rate >= 0),
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_customer_rates_comp_cust_prod unique (company_id, customer_id, product_id)
);

create index if not exists idx_customer_rates_comp_cust on public.customer_rates(company_id, customer_id);
create index if not exists idx_customer_rates_comp_prod on public.customer_rates(company_id, product_id);
alter table public.customer_rates enable row level security;

-- 2. ENSURE INVOICE_ITEMS HAS PRODUCT_ID REFERENCE (Non-destructive)
do $$
begin
    if not exists (
        select 1 from information_schema.columns 
        where table_schema = 'public' 
        and table_name = 'invoice_items' 
        and column_name = 'product_id'
    ) then
        alter table public.invoice_items add column product_id uuid references public.products(id) on delete set null;
    end if;
end $$;

create index if not exists idx_invoice_items_prod on public.invoice_items(product_id);
create index if not exists idx_invoices_cust_date on public.invoices(company_id, customer_id, invoice_date desc, created_at desc);

-- 3. RLS POLICIES FOR CUSTOMER RATES
drop policy if exists "Active company users can view customer rates" on public.customer_rates;
create policy "Active company users can view customer rates" on public.customer_rates for select
    using (public.auth_is_active_company_user(company_id));

drop policy if exists "Authorized company users can insert customer rates" on public.customer_rates;
create policy "Authorized company users can insert customer rates" on public.customer_rates for insert
    with check (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'customer.edit')
            or public.auth_user_has_permission(company_id, 'customers.edit')
            or public.auth_user_has_permission(company_id, 'customer.create')
            or public.auth_user_has_permission(company_id, 'customers.create')
        )
    );

drop policy if exists "Authorized company users can update customer rates" on public.customer_rates;
create policy "Authorized company users can update customer rates" on public.customer_rates for update
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'customer.edit')
            or public.auth_user_has_permission(company_id, 'customers.edit')
        )
    );

drop policy if exists "Authorized company users can delete customer rates" on public.customer_rates;
create policy "Authorized company users can delete customer rates" on public.customer_rates for delete
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'customer.edit')
            or public.auth_user_has_permission(company_id, 'customers.edit')
        )
    );


-- >>> FILE: 058_add_customer_company_name.sql <<<
-- ==============================================================================
-- Migration 058: Add company_name and expand customer categories in customers table
-- Authoritative schema update for Customer 360 module
-- ==============================================================================

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS company_name TEXT;
CREATE INDEX IF NOT EXISTS idx_customers_company_name_col ON public.customers (company_id, company_name);

-- Update customer_type check constraint to include reseller
DO $$
BEGIN
    ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_customer_type_check;
    ALTER TABLE public.customers ADD CONSTRAINT customers_customer_type_check 
        CHECK (customer_type IN ('corporate', 'agency', 'retail', 'dealer', 'government', 'regular', 'reseller'));
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;


-- >>> FILE: 059_add_tenant_company_extended_fields.sql <<<
-- ==============================================================================
-- PrintERP SaaS - Migration 059: Add Tenant Company Extended Fields
-- Fields added:
--   - legal_name: Registered Legal Entity Name (for NBR, tax & contracts)
--   - office_hours: Business / Shop working hours (e.g. '9:00 AM - 8:00 PM (Sat - Thu)')
--   - holidays: Weekly holidays & operational holidays (e.g. 'Friday / শুক্রবার')
-- ==============================================================================

-- 1. Ensure public.companies table contains extended company profile columns
ALTER TABLE IF EXISTS public.companies
    ADD COLUMN IF NOT EXISTS legal_name TEXT,
    ADD COLUMN IF NOT EXISTS office_hours TEXT DEFAULT '9:00 AM - 8:00 PM (Sat - Thu)',
    ADD COLUMN IF NOT EXISTS holidays TEXT DEFAULT 'Friday';

-- 2. Ensure public.company_settings table contains office_hours and holidays columns
ALTER TABLE IF EXISTS public.company_settings
    ADD COLUMN IF NOT EXISTS office_hours TEXT DEFAULT '9:00 AM - 8:00 PM (Sat - Thu)',
    ADD COLUMN IF NOT EXISTS holidays TEXT DEFAULT 'Friday';

-- Index for searching companies by legal entity name
CREATE INDEX IF NOT EXISTS idx_companies_legal_name ON public.companies(legal_name);


-- >>> FILE: 060_machineries_management.sql <<<
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
DO $$
BEGIN
    ALTER TABLE public.permissions DROP CONSTRAINT IF EXISTS permissions_action_check;
    ALTER TABLE public.permissions ADD CONSTRAINT permissions_action_check 
        CHECK (action IN ('view', 'create', 'edit', 'delete', 'approve', 'assign', 'manage', 'full_control'));
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

insert into public.permissions (code, module, resource, action, name, description) values
('machineries.view', 'production', 'machinery', 'view', 'View Machineries', 'View list, status, and specifications of workshop machines'),
('machineries.create', 'production', 'machinery', 'create', 'Create Machinery', 'Add new machinery and production equipment'),
('machineries.edit', 'production', 'machinery', 'edit', 'Edit Machinery', 'Update machinery specifications, dimensions, and operational parameters'),
('machineries.delete', 'production', 'machinery', 'delete', 'Archive / Delete Machinery', 'Archive, retire, or delete machinery records'),
('machineries.assign', 'production', 'machinery', 'edit', 'Assign Machinery', 'Allocate and schedule machines for job orders and production tasks'),
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


-- >>> FILE: 061_machinery_production_task_integration.sql <<<
-- ==============================================================================
-- InkFlow SaaS - Migration 061: Machinery Multi-Task Production Integration
-- Supports:
--   1. Multiple Machine Assignments per Job Order across distinct production tasks (Printing, Lamination, Cutting, CNC, Fabrication, Finishing)
--   2. Branch scoping on machinery assignments
--   3. Concurrency-safe index on machine schedule windows
-- ==============================================================================

ALTER TABLE public.machinery_assignments ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'printing';
ALTER TABLE public.machinery_assignments ADD COLUMN IF NOT EXISTS task_name TEXT;
ALTER TABLE public.machinery_assignments ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_machinery_assignments_job_task ON public.machinery_assignments (company_id, job_order_id, task_type);
CREATE INDEX IF NOT EXISTS idx_machinery_assignments_prod_task ON public.machinery_assignments (company_id, production_job_id, task_type);
CREATE INDEX IF NOT EXISTS idx_machinery_assignments_branch ON public.machinery_assignments (company_id, branch_id);


-- >>> FILE: 062_production_planning_and_scheduling.sql <<<
-- ==============================================================================
-- InkFlow SaaS - Migration 062: V2 Advanced Production Planning & Machine Scheduling
-- Supports:
--   1. Independent, trackable Production Tasks with multi-task sequencing
--   2. Task Lifecycle: queued -> scheduled -> ready -> in_progress -> completed (plus on_hold, rework, cancelled)
--   3. Sequential dependencies between upstream & downstream tasks
--   4. Machine & Operator scheduling with conflict detection
--   5. Non-destructive Rework and Hold tracking with blocking reasons
--   6. Strict Multi-Tenant Row Level Security & Branch Scoping
-- ==============================================================================

-- 1. PRODUCTION TASKS TABLE
CREATE TABLE IF NOT EXISTS public.production_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    job_order_id UUID REFERENCES public.job_orders(id) ON DELETE CASCADE,
    production_job_id UUID REFERENCES public.production_jobs(id) ON DELETE SET NULL,
    task_number TEXT NOT NULL,
    task_name TEXT NOT NULL,
    task_type TEXT NOT NULL DEFAULT 'printing' CHECK (
        task_type IN ('prepress', 'printing', 'lamination', 'cutting', 'fabrication', 'finishing', 'mounting', 'installation', 'manual', 'other')
    ),
    department TEXT NOT NULL CHECK (
        department IN ('design', 'printing', 'finishing', 'fabrication', 'installation')
    ),
    sequence_order INTEGER NOT NULL DEFAULT 1,
    description TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT 'pcs',
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'urgent', 'very_urgent')),
    required_machine_type TEXT,
    required_material TEXT,
    width NUMERIC(10,2),
    height NUMERIC(10,2),
    estimated_duration_minutes INTEGER NOT NULL DEFAULT 60,
    assigned_machine_id UUID REFERENCES public.machineries(id) ON DELETE SET NULL,
    assigned_machine_name TEXT,
    assigned_operator_id UUID REFERENCES public.company_users(id) ON DELETE SET NULL,
    assigned_operator_name TEXT,
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (
        status IN ('queued', 'scheduled', 'ready', 'in_progress', 'paused', 'completed', 'on_hold', 'rework', 'cancelled')
    ),
    hold_reason TEXT CHECK (
        hold_reason IS NULL OR hold_reason IN ('customer_approval', 'material_unavailable', 'machine_breakdown', 'artwork_issue', 'payment_hold', 'quality_issue', 'other')
    ),
    hold_notes TEXT,
    is_rework BOOLEAN NOT NULL DEFAULT FALSE,
    rework_parent_task_id UUID REFERENCES public.production_tasks(id) ON DELETE SET NULL,
    good_quantity INTEGER DEFAULT 0,
    rejected_quantity INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_production_tasks_company_number UNIQUE (company_id, task_number)
);

-- 2. LINK MACHINERY ASSIGNMENTS TO PRODUCTION TASKS
ALTER TABLE public.machinery_assignments ADD COLUMN IF NOT EXISTS production_task_id UUID REFERENCES public.production_tasks(id) ON DELETE SET NULL;

-- 3. INDEXES FOR HIGH-PERFORMANCE SCHEDULING & QUEUE QUERIES
CREATE INDEX IF NOT EXISTS idx_production_tasks_company ON public.production_tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_production_tasks_job_seq ON public.production_tasks(company_id, job_order_id, sequence_order);
CREATE INDEX IF NOT EXISTS idx_production_tasks_status ON public.production_tasks(company_id, status);
CREATE INDEX IF NOT EXISTS idx_production_tasks_machine ON public.production_tasks(company_id, assigned_machine_id);
CREATE INDEX IF NOT EXISTS idx_production_tasks_operator ON public.production_tasks(company_id, assigned_operator_id);
CREATE INDEX IF NOT EXISTS idx_production_tasks_branch ON public.production_tasks(company_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_production_tasks_schedule ON public.production_tasks(company_id, scheduled_start, scheduled_end);

-- 4. ENABLE RLS
ALTER TABLE public.production_tasks ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLICIES
DROP POLICY IF EXISTS "Active company users can view production tasks" ON public.production_tasks;
CREATE POLICY "Active company users can view production tasks"
    ON public.production_tasks FOR SELECT
    USING (public.auth_is_active_company_user(company_id));

DROP POLICY IF EXISTS "Authorized company users can manage production tasks" ON public.production_tasks;
CREATE POLICY "Authorized company users can manage production tasks"
    ON public.production_tasks FOR ALL
    USING (
        public.auth_is_active_company_user(company_id)
        AND (
            public.auth_user_has_permission(company_id, 'production.view')
            OR public.auth_user_has_permission(company_id, 'production.edit')
            OR public.auth_user_has_permission(company_id, 'production.create')
            OR public.auth_user_has_permission(company_id, 'production.assign')
        )
    );


-- >>> FILE: 063_production_concurrency_and_hardening.sql <<<
-- ==============================================================================
-- InkFlow SaaS - Migration 063: Production Concurrency & Machine Scheduling Hardening
-- Supports:
--   1. PostgreSQL btree_gist extension for interval exclusion constraints
--   2. Database-level race-condition prevention on overlapping machine schedules
--   3. Atomic stored procedure for serialized machine booking with row-level locks
--   4. Strict multi-tenant security validation and maintenance interlocking
-- ==============================================================================

-- 1. ENABLE EXTENSION
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. EXCLUSION CONSTRAINT ON PRODUCTION TASKS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'exclude_production_tasks_machine_schedule_overlap'
    ) THEN
        ALTER TABLE public.production_tasks
        ADD CONSTRAINT exclude_production_tasks_machine_schedule_overlap
        EXCLUDE USING gist (
            company_id WITH =,
            assigned_machine_id WITH =,
            tstzrange(scheduled_start, scheduled_end, '[)') WITH &&
        )
        WHERE (
            assigned_machine_id IS NOT NULL 
            AND scheduled_start IS NOT NULL 
            AND scheduled_end IS NOT NULL 
            AND status NOT IN ('cancelled', 'completed')
        );
    END IF;
END $$;

-- 3. EXCLUSION CONSTRAINT ON MACHINERY ASSIGNMENTS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'exclude_machinery_assignments_schedule_overlap'
    ) THEN
        ALTER TABLE public.machinery_assignments
        ADD CONSTRAINT exclude_machinery_assignments_schedule_overlap
        EXCLUDE USING gist (
            company_id WITH =,
            machine_id WITH =,
            tstzrange(scheduled_start, scheduled_end, '[)') WITH &&
        )
        WHERE (
            status NOT IN ('cancelled', 'completed')
        );
    END IF;
END $$;

-- 4. ATOMIC SCHEDULING STORED FUNCTION WITH ROW-LEVEL LOCKING
CREATE OR REPLACE FUNCTION public.schedule_production_task_atomic(
    p_task_id UUID,
    p_company_id UUID,
    p_machine_id UUID,
    p_operator_id UUID,
    p_scheduled_start TIMESTAMPTZ,
    p_scheduled_end TIMESTAMPTZ,
    p_duration_minutes INTEGER,
    p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_task RECORD;
    v_machine RECORD;
    v_maint RECORD;
    v_overlap RECORD;
    v_updated_task RECORD;
BEGIN
    -- 1. Fetch and verify task
    SELECT * INTO v_task 
    FROM public.production_tasks 
    WHERE id = p_task_id AND company_id = p_company_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Production task not found' USING ERRCODE = 'P0002';
    END IF;

    -- 2. If machine is specified, lock machine row and verify status & capabilities
    IF p_machine_id IS NOT NULL THEN
        -- Row-level lock to serialize concurrent bookings on the same machine
        SELECT * INTO v_machine
        FROM public.machineries
        WHERE id = p_machine_id AND company_id = p_company_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Assigned machine not found' USING ERRCODE = 'P0002';
        END IF;

        IF v_machine.status = 'breakdown' THEN
            RAISE EXCEPTION 'Cannot schedule task on %: Machine is currently broken down.', v_machine.name USING ERRCODE = '23P01';
        END IF;
        IF v_machine.status = 'maintenance' THEN
            RAISE EXCEPTION 'Cannot schedule task on %: Machine is currently under maintenance.', v_machine.name USING ERRCODE = '23P01';
        END IF;
        IF v_machine.status IN ('retired', 'offline') THEN
            RAISE EXCEPTION 'Cannot schedule task on %: Machine is %.', v_machine.name, v_machine.status USING ERRCODE = '23P01';
        END IF;

        -- 3. Check maintenance schedule window conflicts (4-hour window estimate)
        SELECT * INTO v_maint
        FROM public.machinery_maintenances
        WHERE machine_id = p_machine_id 
          AND company_id = p_company_id
          AND status NOT IN ('completed', 'cancelled')
          AND scheduled_date IS NOT NULL
          AND (
              tstzrange(scheduled_date, scheduled_date + INTERVAL '4 hours', '[)') && 
              tstzrange(p_scheduled_start, p_scheduled_end, '[)')
          )
        LIMIT 1;

        IF FOUND THEN
            RAISE EXCEPTION 'Schedule conflict: Machine % has scheduled maintenance during this window.', v_machine.name USING ERRCODE = '23P01';
        END IF;

        -- 4. Check overlapping active production tasks
        SELECT * INTO v_overlap
        FROM public.production_tasks
        WHERE company_id = p_company_id
          AND assigned_machine_id = p_machine_id
          AND id != p_task_id
          AND status NOT IN ('cancelled', 'completed')
          AND scheduled_start IS NOT NULL
          AND scheduled_end IS NOT NULL
          AND (tstzrange(scheduled_start, scheduled_end, '[)') && tstzrange(p_scheduled_start, p_scheduled_end, '[)'))
        LIMIT 1;

        IF FOUND THEN
            RAISE EXCEPTION 'Schedule conflict: Machine % is already booked for Task % from % to %.', 
                v_machine.name, v_overlap.task_number, v_overlap.scheduled_start, v_overlap.scheduled_end 
            USING ERRCODE = '23P01';
        END IF;
    END IF;

    -- 5. Perform the update
    UPDATE public.production_tasks
    SET
        assigned_machine_id = p_machine_id,
        assigned_machine_name = CASE WHEN p_machine_id IS NOT NULL THEN v_machine.name ELSE NULL END,
        assigned_operator_id = COALESCE(p_operator_id, assigned_operator_id),
        scheduled_start = p_scheduled_start,
        scheduled_end = p_scheduled_end,
        estimated_duration_minutes = COALESCE(p_duration_minutes, estimated_duration_minutes, 60),
        status = CASE WHEN status = 'queued' THEN 'scheduled' ELSE status END,
        notes = COALESCE(p_notes, notes),
        updated_at = NOW()
    WHERE id = p_task_id AND company_id = p_company_id
    RETURNING * INTO v_updated_task;

    RETURN to_jsonb(v_updated_task);
END;
$$;


-- >>> FILE: 064_inventory_management.sql <<<
-- ==============================================================================
-- InkFlow SaaS - Migration 064: V3 Advanced Inventory Management
-- Supports:
--   1. Inventory Locations / Multi-Warehouse per tenant and branch
--   2. Enhanced Material Master (SKUs, Specifications, Dimensions, Reorder Thresholds)
--   3. Partitioned Stock Balances with Zero-Negative Database Constraints
--   4. Material Requests & Approvals linked to Production Tasks
--   5. Material Issuance & Production Floor Release
--   6. Actual Consumption, Remnants, Wastage & Returns Accounting
--   7. Discrete Reusable Remnant Tracking (W x L with barcode readiness)
--   8. Inter-Location Stock Transfers & Stock Adjustment Counts
--   9. Immutable Stock Ledger & Atomic PostgreSQL Concurrency Protection
--   10. Strict Multi-Tenant Row Level Security
-- ==============================================================================

-- 1. INVENTORY LOCATIONS TABLE
CREATE TABLE IF NOT EXISTS public.inventory_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_inventory_locations_company_code UNIQUE (company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_inventory_locations_company ON public.inventory_locations(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_locations_branch ON public.inventory_locations(company_id, branch_id);
ALTER TABLE public.inventory_locations ENABLE ROW LEVEL SECURITY;

-- 2. ENHANCE MATERIALS TABLE
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS specification TEXT;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS thickness NUMERIC(8,2);
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS width NUMERIC(10,2);
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS length NUMERIC(10,2);
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS dimension_unit TEXT DEFAULT 'inch';
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS base_unit TEXT DEFAULT 'pcs';
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS reorder_level NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Remove category/unit check constraint if exists to allow flexible print/signage categories
DO $$
BEGIN
    ALTER TABLE public.materials DROP CONSTRAINT IF EXISTS materials_category_check;
    ALTER TABLE public.materials DROP CONSTRAINT IF EXISTS materials_unit_check;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_materials_branch ON public.materials(company_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_materials_active ON public.materials(company_id, is_active);

-- 3. INVENTORY STOCK BALANCES TABLE (Per Location)
CREATE TABLE IF NOT EXISTS public.inventory_stock_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.inventory_locations(id) ON DELETE CASCADE,
    available_quantity NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (available_quantity >= 0),
    reserved_quantity NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    issued_quantity NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (issued_quantity >= 0),
    damaged_quantity NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (damaged_quantity >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_inventory_stock_balances_loc UNIQUE (company_id, material_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_balances_company ON public.inventory_stock_balances(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_balances_material ON public.inventory_stock_balances(company_id, material_id);
CREATE INDEX IF NOT EXISTS idx_stock_balances_location ON public.inventory_stock_balances(company_id, location_id);
ALTER TABLE public.inventory_stock_balances ENABLE ROW LEVEL SECURITY;

-- 4. PRODUCTION TASK MATERIAL REQUIREMENTS TABLE
CREATE TABLE IF NOT EXISTS public.production_task_material_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    production_task_id UUID NOT NULL REFERENCES public.production_tasks(id) ON DELETE CASCADE,
    material_id UUID REFERENCES public.materials(id) ON DELETE SET NULL,
    material_name TEXT NOT NULL,
    required_quantity NUMERIC(12,2) NOT NULL DEFAULT 1 CHECK (required_quantity > 0),
    unit TEXT NOT NULL DEFAULT 'pcs',
    width NUMERIC(10,2),
    height NUMERIC(10,2),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_mat_req_task ON public.production_task_material_requirements(company_id, production_task_id);
ALTER TABLE public.production_task_material_requirements ENABLE ROW LEVEL SECURITY;

-- 5. MATERIAL REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.material_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    request_number TEXT NOT NULL,
    production_task_id UUID REFERENCES public.production_tasks(id) ON DELETE SET NULL,
    job_order_id UUID REFERENCES public.job_orders(id) ON DELETE SET NULL,
    requested_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    requested_by_name TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'urgent', 'very_urgent')),
    status TEXT NOT NULL DEFAULT 'requested' CHECK (
        status IN ('draft', 'requested', 'approved', 'rejected', 'partially_issued', 'issued', 'cancelled')
    ),
    notes TEXT,
    approved_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_by_name TEXT,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_material_requests_company_number UNIQUE (company_id, request_number)
);

CREATE INDEX IF NOT EXISTS idx_material_requests_company ON public.material_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_material_requests_status ON public.material_requests(company_id, status);
CREATE INDEX IF NOT EXISTS idx_material_requests_task ON public.material_requests(company_id, production_task_id);
ALTER TABLE public.material_requests ENABLE ROW LEVEL SECURITY;

-- 6. MATERIAL REQUEST ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.material_request_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    request_id UUID NOT NULL REFERENCES public.material_requests(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
    material_name TEXT NOT NULL,
    location_id UUID REFERENCES public.inventory_locations(id) ON DELETE SET NULL,
    requested_quantity NUMERIC(12,2) NOT NULL CHECK (requested_quantity > 0),
    approved_quantity NUMERIC(12,2) DEFAULT 0,
    issued_quantity NUMERIC(12,2) DEFAULT 0,
    unit TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'approved', 'rejected', 'partially_issued', 'issued', 'cancelled')
    ),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_material_req_items_req ON public.material_request_items(company_id, request_id);
ALTER TABLE public.material_request_items ENABLE ROW LEVEL SECURITY;

-- 7. MATERIAL ISSUES TABLE
CREATE TABLE IF NOT EXISTS public.material_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    issue_number TEXT NOT NULL,
    request_id UUID REFERENCES public.material_requests(id) ON DELETE SET NULL,
    production_task_id UUID REFERENCES public.production_tasks(id) ON DELETE SET NULL,
    job_order_id UUID REFERENCES public.job_orders(id) ON DELETE SET NULL,
    issued_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    issued_by_name TEXT NOT NULL,
    issued_to_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    issued_to_name TEXT,
    issue_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_material_issues_company_number UNIQUE (company_id, issue_number)
);

CREATE INDEX IF NOT EXISTS idx_material_issues_company ON public.material_issues(company_id);
CREATE INDEX IF NOT EXISTS idx_material_issues_task ON public.material_issues(company_id, production_task_id);
ALTER TABLE public.material_issues ENABLE ROW LEVEL SECURITY;

-- 8. MATERIAL ISSUE ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.material_issue_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    issue_id UUID NOT NULL REFERENCES public.material_issues(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
    material_name TEXT NOT NULL,
    location_id UUID REFERENCES public.inventory_locations(id) ON DELETE SET NULL,
    issued_quantity NUMERIC(12,2) NOT NULL CHECK (issued_quantity > 0),
    unit TEXT NOT NULL,
    unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_material_issue_items_issue ON public.material_issue_items(company_id, issue_id);
ALTER TABLE public.material_issue_items ENABLE ROW LEVEL SECURITY;

-- 9. INVENTORY REMNANTS TABLE (Discrete Reusable Offcuts)
CREATE TABLE IF NOT EXISTS public.inventory_remnants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    remnant_code TEXT NOT NULL,
    material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
    material_name TEXT NOT NULL,
    original_roll_id UUID REFERENCES public.inventory_rolls(id) ON DELETE SET NULL,
    width NUMERIC(10,2) NOT NULL,
    length NUMERIC(10,2) NOT NULL,
    dimension_unit TEXT NOT NULL DEFAULT 'inch' CHECK (dimension_unit IN ('inch', 'ft', 'mm', 'cm', 'm')),
    area_sft NUMERIC(10,2) NOT NULL DEFAULT 0,
    location_id UUID REFERENCES public.inventory_locations(id) ON DELETE SET NULL,
    condition TEXT NOT NULL DEFAULT 'usable' CHECK (condition IN ('prime', 'usable', 'blemished')),
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'consumed', 'scrapped')),
    created_from_task_id UUID REFERENCES public.production_tasks(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_inventory_remnants_code UNIQUE (company_id, remnant_code)
);

CREATE INDEX IF NOT EXISTS idx_inventory_remnants_company ON public.inventory_remnants(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_remnants_status ON public.inventory_remnants(company_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_remnants_mat ON public.inventory_remnants(company_id, material_id);
ALTER TABLE public.inventory_remnants ENABLE ROW LEVEL SECURITY;

-- 10. INVENTORY TRANSFERS TABLE (Dual-entry Location Transfers)
CREATE TABLE IF NOT EXISTS public.inventory_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    transfer_number TEXT NOT NULL,
    from_location_id UUID NOT NULL REFERENCES public.inventory_locations(id) ON DELETE RESTRICT,
    to_location_id UUID NOT NULL REFERENCES public.inventory_locations(id) ON DELETE RESTRICT,
    from_branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    to_branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
    material_name TEXT NOT NULL,
    quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
    unit TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
    notes TEXT,
    performed_by_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_inventory_transfers_number UNIQUE (company_id, transfer_number)
);

CREATE INDEX IF NOT EXISTS idx_inventory_transfers_company ON public.inventory_transfers(company_id);
ALTER TABLE public.inventory_transfers ENABLE ROW LEVEL SECURITY;

-- 11. INVENTORY ADJUSTMENTS TABLE (Physical Count Reconciliation)
CREATE TABLE IF NOT EXISTS public.inventory_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    adjustment_number TEXT NOT NULL,
    material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.inventory_locations(id) ON DELETE SET NULL,
    reason_code TEXT NOT NULL CHECK (
        reason_code IN ('physical_count_diff', 'damage_found', 'opening_correction', 'data_correction', 'other')
    ),
    reason_notes TEXT,
    system_quantity_before NUMERIC(12,2) NOT NULL,
    physical_quantity NUMERIC(12,2) NOT NULL,
    quantity_change NUMERIC(12,2) NOT NULL,
    unit TEXT NOT NULL,
    authorized_by_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_inventory_adjustments_number UNIQUE (company_id, adjustment_number)
);

CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_company ON public.inventory_adjustments(company_id);
ALTER TABLE public.inventory_adjustments ENABLE ROW LEVEL SECURITY;

-- 12. ENHANCE STOCK LEDGER
ALTER TABLE public.stock_ledger ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.stock_ledger ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.inventory_locations(id) ON DELETE SET NULL;
ALTER TABLE public.stock_ledger ADD COLUMN IF NOT EXISTS production_task_id UUID REFERENCES public.production_tasks(id) ON DELETE SET NULL;
ALTER TABLE public.stock_ledger ADD COLUMN IF NOT EXISTS reference_type TEXT;
ALTER TABLE public.stock_ledger ADD COLUMN IF NOT EXISTS normalized_quantity NUMERIC(14,4);
ALTER TABLE public.stock_ledger ADD COLUMN IF NOT EXISTS normalized_unit TEXT;

-- 13. ATOMIC INVENTORY MUTATION STORED PROCEDURE WITH ROW-LEVEL LOCK
CREATE OR REPLACE FUNCTION public.mutate_inventory_stock_atomic(
    p_company_id UUID,
    p_material_id UUID,
    p_location_id UUID,
    p_quantity_change NUMERIC,
    p_transaction_type TEXT,
    p_reference_id TEXT DEFAULT NULL,
    p_reference_type TEXT DEFAULT NULL,
    p_task_id UUID DEFAULT NULL,
    p_unit_cost NUMERIC DEFAULT 0,
    p_notes TEXT DEFAULT NULL,
    p_performed_by_name TEXT DEFAULT 'System'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_material RECORD;
    v_new_balance NUMERIC;
    v_loc_balance NUMERIC;
    v_ledger_id UUID;
    v_default_loc_id UUID;
BEGIN
    -- 1. Lock material record to serialize concurrent stock updates
    SELECT * INTO v_material
    FROM public.materials
    WHERE id = p_material_id AND company_id = p_company_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Material not found: %', p_material_id USING ERRCODE = 'P0002';
    END IF;

    -- Calculate new total material balance
    v_new_balance := v_material.current_stock + p_quantity_change;

    -- Prevent negative stock
    IF v_new_balance < 0 THEN
        RAISE EXCEPTION 'Insufficient stock: Material % (%) has available stock %, cannot deduct %.',
            v_material.name, v_material.sku, v_material.current_stock, abs(p_quantity_change)
        USING ERRCODE = '23514';
    END IF;

    -- 2. Resolve or create default location if location_id not supplied
    IF p_location_id IS NULL THEN
        SELECT id INTO v_default_loc_id
        FROM public.inventory_locations
        WHERE company_id = p_company_id AND is_default = TRUE
        LIMIT 1;

        IF v_default_loc_id IS NULL THEN
            SELECT id INTO v_default_loc_id
            FROM public.inventory_locations
            WHERE company_id = p_company_id
            ORDER BY created_at ASC
            LIMIT 1;
        END IF;

        IF v_default_loc_id IS NULL THEN
            INSERT INTO public.inventory_locations (company_id, name, code, is_default, is_active)
            values (p_company_id, 'Main Store', 'MAIN', TRUE, TRUE)
            RETURNING id INTO v_default_loc_id;
        END IF;

        p_location_id := v_default_loc_id;
    END IF;

    -- 3. Upsert Location Stock Balance with Row Lock
    INSERT INTO public.inventory_stock_balances (
        company_id,
        material_id,
        location_id,
        available_quantity,
        updated_at
    ) VALUES (
        p_company_id,
        p_material_id,
        p_location_id,
        GREATEST(0, p_quantity_change),
        NOW()
    )
    ON CONFLICT (company_id, material_id, location_id)
    DO UPDATE SET
        available_quantity = public.inventory_stock_balances.available_quantity + p_quantity_change,
        updated_at = NOW()
    RETURNING available_quantity INTO v_loc_balance;

    IF v_loc_balance < 0 THEN
        RAISE EXCEPTION 'Insufficient stock in location for material %: Cannot deduct %.',
            v_material.name, abs(p_quantity_change)
        USING ERRCODE = '23514';
    END IF;

    -- 4. Update Material master cached current_stock
    UPDATE public.materials
    SET current_stock = v_new_balance,
        updated_at = NOW()
    WHERE id = p_material_id AND company_id = p_company_id;

    -- 5. Insert immutable audit ledger record
    INSERT INTO public.stock_ledger (
        company_id,
        material_id,
        location_id,
        production_task_id,
        transaction_type,
        quantity_change,
        unit,
        balance_after,
        unit_cost,
        total_cost,
        reference_id,
        reference_type,
        notes,
        performed_by_name,
        created_at
    ) VALUES (
        p_company_id,
        p_material_id,
        p_location_id,
        p_task_id,
        p_transaction_type,
        p_quantity_change,
        v_material.unit,
        v_new_balance,
        p_unit_cost,
        abs(p_quantity_change) * p_unit_cost,
        p_reference_id,
        p_reference_type,
        p_notes,
        p_performed_by_name,
        NOW()
    )
    RETURNING id INTO v_ledger_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'material_id', p_material_id,
        'new_balance', v_new_balance,
        'location_balance', v_loc_balance,
        'ledger_id', v_ledger_id
    );
END;
$$;

-- 14. ROW LEVEL SECURITY POLICIES FOR NEW V3 TABLES
DROP POLICY IF EXISTS "Active company users can view inventory locations" ON public.inventory_locations;
CREATE POLICY "Active company users can view inventory locations"
    ON public.inventory_locations FOR SELECT
    USING (public.auth_is_active_company_user(company_id));

DROP POLICY IF EXISTS "Authorized company users can manage inventory locations" ON public.inventory_locations;
CREATE POLICY "Authorized company users can manage inventory locations"
    ON public.inventory_locations FOR ALL
    USING (
        public.auth_is_active_company_user(company_id)
        AND (
            public.auth_user_has_permission(company_id, 'inventory.view')
            OR public.auth_user_has_permission(company_id, 'inventory.edit')
            OR public.auth_user_has_permission(company_id, 'inventory.create')
        )
    );

DROP POLICY IF EXISTS "Active company users can view stock balances" ON public.inventory_stock_balances;
CREATE POLICY "Active company users can view stock balances"
    ON public.inventory_stock_balances FOR SELECT
    USING (public.auth_is_active_company_user(company_id));

DROP POLICY IF EXISTS "Active company users can view material requests" ON public.material_requests;
CREATE POLICY "Active company users can view material requests"
    ON public.material_requests FOR SELECT
    USING (public.auth_is_active_company_user(company_id));

DROP POLICY IF EXISTS "Authorized company users can manage material requests" ON public.material_requests;
CREATE POLICY "Authorized company users can manage material requests"
    ON public.material_requests FOR ALL
    USING (
        public.auth_is_active_company_user(company_id)
        AND (
            public.auth_user_has_permission(company_id, 'inventory.view')
            OR public.auth_user_has_permission(company_id, 'inventory.edit')
            OR public.auth_user_has_permission(company_id, 'production.view')
            OR public.auth_user_has_permission(company_id, 'production.edit')
        )
    );

DROP POLICY IF EXISTS "Active company users can view material request items" ON public.material_request_items;
CREATE POLICY "Active company users can view material request items"
    ON public.material_request_items FOR SELECT
    USING (public.auth_is_active_company_user(company_id));

DROP POLICY IF EXISTS "Active company users can view material issues" ON public.material_issues;
CREATE POLICY "Active company users can view material issues"
    ON public.material_issues FOR SELECT
    USING (public.auth_is_active_company_user(company_id));

DROP POLICY IF EXISTS "Active company users can view remnants" ON public.inventory_remnants;
CREATE POLICY "Active company users can view remnants"
    ON public.inventory_remnants FOR SELECT
    USING (public.auth_is_active_company_user(company_id));

DROP POLICY IF EXISTS "Active company users can view transfers" ON public.inventory_transfers;
CREATE POLICY "Active company users can view transfers"
    ON public.inventory_transfers FOR SELECT
    USING (public.auth_is_active_company_user(company_id));

DROP POLICY IF EXISTS "Active company users can view adjustments" ON public.inventory_adjustments;
CREATE POLICY "Active company users can view adjustments"
    ON public.inventory_adjustments FOR SELECT
    USING (public.auth_is_active_company_user(company_id));

DROP POLICY IF EXISTS "Active company users can view task requirements" ON public.production_task_material_requirements;
CREATE POLICY "Active company users can view task requirements"
    ON public.production_task_material_requirements FOR SELECT
    USING (public.auth_is_active_company_user(company_id));


-- >>> FILE: 065_products_pricing_costing.sql <<<
-- ==============================================================================
-- InkFlow SaaS - Migration 065: Products, Services, Advanced Formulas & Costing
-- Supports:
--   1. Extended Product Master with Variants & Bangladeshi Print/Signage Specs
--   2. Structured Production Formulas (Material, Machine, Labor, Finishing, Transport)
--   3. Multi-Tier Price Lists (Retail, Wholesale, Dealer, Corporate, VIP)
--   4. Non-Destructive Extension of Job Costing (Snapshots, Machine Cost, Orders, Quotations)
--   5. Strict Multi-Tenant Row Level Security & RBAC Shielding
-- ==============================================================================

-- 1. PRODUCT VARIANTS TABLE
create table if not exists public.product_variants (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    product_id uuid not null references public.products(id) on delete cascade,
    variant_name text not null,
    sku_suffix text,
    thickness_mm numeric(6,2),
    gsm integer,
    finish text,
    color text,
    size_spec text,
    cost_adjustment numeric(12,2) not null default 0,
    price_adjustment numeric(12,2) not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_product_variants_prod on public.product_variants(company_id, product_id);
alter table public.product_variants enable row level security;

-- 2. PRODUCT FORMULAS TABLE (Versioned Production Bill of Materials & Pricing Formulas)
create table if not exists public.product_formulas (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    product_id uuid not null references public.products(id) on delete cascade,
    formula_name text not null default 'Default Formula',
    version integer not null default 1,
    model text not null check (
        model in ('dimensional_area', 'running_length', 'unit_quantity', 'compound_signage', 'custom_formula')
    ),
    waste_factor_percent numeric(5,2) not null default 5.0,
    material_requirements jsonb not null default '[]'::jsonb,
    machine_operations jsonb not null default '[]'::jsonb,
    labor_operations jsonb not null default '[]'::jsonb,
    finishing_operations jsonb not null default '[]'::jsonb,
    other_costs jsonb not null default '[]'::jsonb,
    target_margin_percent numeric(5,2) not null default 35.0,
    min_margin_percent numeric(5,2) not null default 15.0,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_product_formulas_prod_version unique (company_id, product_id, version)
);

create index if not exists idx_product_formulas_prod on public.product_formulas(company_id, product_id);
alter table public.product_formulas enable row level security;

-- 3. PRICE LISTS TABLE
create table if not exists public.price_lists (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    name text not null,
    code text not null,
    tier_type text not null default 'retail' check (
        tier_type in ('retail', 'wholesale', 'dealer', 'corporate', 'vip', 'custom')
    ),
    description text,
    default_markup_percent numeric(5,2) not null default 0,
    is_default boolean not null default false,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_price_lists_comp_code unique (company_id, code)
);

create index if not exists idx_price_lists_company on public.price_lists(company_id);
alter table public.price_lists enable row level security;

-- 4. PRICE LIST ITEMS TABLE
create table if not exists public.price_list_items (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    price_list_id uuid not null references public.price_lists(id) on delete cascade,
    product_id uuid not null references public.products(id) on delete cascade,
    custom_rate numeric(12,2),
    discount_percent numeric(5,2) not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_price_list_items_unique unique (company_id, price_list_id, product_id)
);

create index if not exists idx_price_list_items_list on public.price_list_items(company_id, price_list_id);
alter table public.price_list_items enable row level security;

-- 5. EXTEND JOB_COSTINGS TABLE (Non-destructive)
alter table public.job_costings add column if not exists branch_id uuid references public.branches(id) on delete set null;
alter table public.job_costings add column if not exists job_order_id uuid references public.job_orders(id) on delete set null;
alter table public.job_costings add column if not exists sales_order_id uuid references public.sales_orders(id) on delete set null;
alter table public.job_costings add column if not exists quotation_id uuid references public.quotations(id) on delete set null;
alter table public.job_costings add column if not exists product_id uuid references public.products(id) on delete set null;
alter table public.job_costings add column if not exists item_title text default 'Custom Print & Fabrication Job';
alter table public.job_costings add column if not exists dimensions_spec text;
alter table public.job_costings add column if not exists quantity numeric(12,2) default 1;
alter table public.job_costings add column if not exists unit text default 'pcs';
alter table public.job_costings add column if not exists est_machine_cost numeric(12,2) default 0;
alter table public.job_costings add column if not exists act_machine_cost numeric(12,2) default 0;
alter table public.job_costings add column if not exists costing_snapshot jsonb not null default '{}'::jsonb;
alter table public.job_costings add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.job_costings add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_job_costings_comp_job on public.job_costings(company_id, job_number);
create index if not exists idx_job_costings_sales_order on public.job_costings(company_id, sales_order_id);
create index if not exists idx_job_costings_status on public.job_costings(company_id, status);

-- 6. ROW-LEVEL SECURITY POLICIES
drop policy if exists "Active company users can view product variants" on public.product_variants;
create policy "Active company users can view product variants"
    on public.product_variants for select
    using (public.auth_is_active_company_user(company_id));

drop policy if exists "Active company users can manage product variants" on public.product_variants;
create policy "Active company users can manage product variants"
    on public.product_variants for all
    using (public.auth_is_active_company_user(company_id))
    with check (public.auth_is_active_company_user(company_id));

drop policy if exists "Active company users can view product formulas" on public.product_formulas;
create policy "Active company users can view product formulas"
    on public.product_formulas for select
    using (public.auth_is_active_company_user(company_id));

drop policy if exists "Active company users can manage product formulas" on public.product_formulas;
create policy "Active company users can manage product formulas"
    on public.product_formulas for all
    using (public.auth_is_active_company_user(company_id))
    with check (public.auth_is_active_company_user(company_id));

drop policy if exists "Active company users can view price lists" on public.price_lists;
create policy "Active company users can view price lists"
    on public.price_lists for select
    using (public.auth_is_active_company_user(company_id));

drop policy if exists "Active company users can manage price lists" on public.price_lists;
create policy "Active company users can manage price lists"
    on public.price_lists for all
    using (public.auth_is_active_company_user(company_id))
    with check (public.auth_is_active_company_user(company_id));

drop policy if exists "Active company users can view price list items" on public.price_list_items;
create policy "Active company users can view price list items"
    on public.price_list_items for select
    using (public.auth_is_active_company_user(company_id));

drop policy if exists "Active company users can manage price list items" on public.price_list_items;
create policy "Active company users can manage price list items"
    on public.price_list_items for all
    using (public.auth_is_active_company_user(company_id))
    with check (public.auth_is_active_company_user(company_id));


-- >>> FILE: 066_purchasing_and_suppliers.sql <<<
-- ==============================================================================
-- PrintERP / InkFlow SaaS - Migration 066: Purchasing & Suppliers Management (V5)
-- Production-Certified Multi-Tenant Procurement & Supplier Operations
-- ==============================================================================

-- 1. EXTEND EXISTING SUPPLIERS TABLE WITH V5 CAPABILITIES
alter table public.suppliers add column if not exists supplier_code text;
alter table public.suppliers add column if not exists name_bn text;
alter table public.suppliers add column if not exists branch_id uuid references public.branches(id) on delete set null;
alter table public.suppliers add column if not exists alt_phone text;
alter table public.suppliers add column if not exists division text;
alter table public.suppliers add column if not exists district text;
alter table public.suppliers add column if not exists upazila text;
alter table public.suppliers add column if not exists area text;
alter table public.suppliers add column if not exists bin text;
alter table public.suppliers add column if not exists tin text;
alter table public.suppliers add column if not exists trade_license text;
alter table public.suppliers add column if not exists website text;
alter table public.suppliers add column if not exists credit_limit numeric(12,2) default 0;
alter table public.suppliers add column if not exists lead_time_days integer default 3;
alter table public.suppliers add column if not exists default_currency text default 'BDT';
alter table public.suppliers add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.suppliers add column if not exists updated_by uuid references auth.users(id) on delete set null;

create index if not exists idx_suppliers_code on public.suppliers(company_id, supplier_code);
create index if not exists idx_suppliers_branch on public.suppliers(company_id, branch_id);

-- 2. SUPPLIER ITEMS CATALOG (Mapping Suppliers to Materials)
create table if not exists public.supplier_items (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    branch_id uuid references public.branches(id) on delete set null,
    supplier_id uuid not null references public.suppliers(id) on delete cascade,
    material_id uuid not null references public.materials(id) on delete cascade,
    supplier_sku text,
    supplier_item_name text,
    purchase_unit text not null default 'unit',
    conversion_factor numeric(10,4) not null default 1.0,
    unit_price numeric(12,2) not null default 0,
    currency text not null default 'BDT',
    moq numeric(10,2) default 1,
    lead_time_days integer default 3,
    is_preferred boolean not null default false,
    is_active boolean not null default true,
    effective_date date not null default current_date,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_supplier_material unique (company_id, supplier_id, material_id)
);

create index if not exists idx_supplier_items_supp on public.supplier_items(company_id, supplier_id);
create index if not exists idx_supplier_items_mat on public.supplier_items(company_id, material_id);
alter table public.supplier_items enable row level security;

-- 3. PURCHASE REQUESTS & ITEMS
create table if not exists public.purchase_requests (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    branch_id uuid references public.branches(id) on delete set null,
    pr_number text not null,
    department text default 'Production',
    requested_by_id uuid references auth.users(id) on delete set null,
    requested_by_name text not null,
    request_date date not null default current_date,
    required_date date not null default (current_date + interval '3 days'),
    priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
    supplier_id uuid references public.suppliers(id) on delete set null,
    reason text,
    notes text,
    status text not null default 'submitted' check (
        status in ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'cancelled')
    ),
    approved_by_id uuid references auth.users(id) on delete set null,
    approved_by_name text,
    approved_at timestamptz,
    rejection_reason text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_purchase_requests_num unique (company_id, pr_number)
);

create index if not exists idx_purchase_requests_comp on public.purchase_requests(company_id);
create index if not exists idx_purchase_requests_status on public.purchase_requests(company_id, status);
alter table public.purchase_requests enable row level security;

create table if not exists public.purchase_request_items (
    id uuid primary key default gen_random_uuid(),
    purchase_request_id uuid not null references public.purchase_requests(id) on delete cascade,
    material_id uuid references public.materials(id) on delete set null,
    material_name text not null,
    quantity numeric(10,2) not null,
    unit text not null default 'pcs',
    required_date date,
    estimated_unit_price numeric(12,2) default 0,
    estimated_amount numeric(12,2) default 0,
    preferred_supplier_id uuid references public.suppliers(id) on delete set null,
    notes text,
    created_at timestamptz not null default now()
);

create index if not exists idx_pr_items_pr on public.purchase_request_items(purchase_request_id);
alter table public.purchase_request_items enable row level security;

-- 4. EXTEND PURCHASE ORDERS & ITEMS TABLE
alter table public.purchase_orders add column if not exists branch_id uuid references public.branches(id) on delete set null;
alter table public.purchase_orders add column if not exists purchase_request_id uuid references public.purchase_requests(id) on delete set null;
alter table public.purchase_orders add column if not exists supplier_reference text;
alter table public.purchase_orders add column if not exists currency text default 'BDT';
alter table public.purchase_orders add column if not exists payment_terms text default 'credit_15';
alter table public.purchase_orders add column if not exists shipping_cost numeric(12,2) default 0;
alter table public.purchase_orders add column if not exists other_charges numeric(12,2) default 0;
alter table public.purchase_orders add column if not exists terms_and_conditions text;
alter table public.purchase_orders add column if not exists approved_by_id uuid references auth.users(id) on delete set null;
alter table public.purchase_orders add column if not exists approved_by_name text;
alter table public.purchase_orders add column if not exists approved_at timestamptz;
alter table public.purchase_orders add column if not exists sent_at timestamptz;
alter table public.purchase_orders add column if not exists cancelled_at timestamptz;
alter table public.purchase_orders add column if not exists cancellation_reason text;

alter table public.purchase_order_items add column if not exists supplier_sku text;
alter table public.purchase_order_items add column if not exists discount_percent numeric(5,2) default 0;
alter table public.purchase_order_items add column if not exists tax_percent numeric(5,2) default 0;
alter table public.purchase_order_items add column if not exists expected_date date;
alter table public.purchase_order_items add column if not exists notes text;

-- 5. EXTEND GOODS RECEIVED NOTES & ITEMS
alter table public.goods_received_notes add column if not exists branch_id uuid references public.branches(id) on delete set null;
alter table public.goods_received_notes add column if not exists supplier_id uuid references public.suppliers(id) on delete set null;
alter table public.goods_received_notes add column if not exists receiving_location_id uuid references public.inventory_locations(id) on delete set null;
alter table public.goods_received_notes add column if not exists supplier_delivery_note text;
alter table public.goods_received_notes add column if not exists supplier_invoice_number text;
alter table public.goods_received_notes add column if not exists status text default 'posted' check (
    status in ('draft', 'received', 'inspected', 'quarantined', 'posted', 'cancelled')
);
alter table public.goods_received_notes add column if not exists accepted_total numeric(12,2) default 0;
alter table public.goods_received_notes add column if not exists rejected_total numeric(12,2) default 0;
alter table public.goods_received_notes add column if not exists damaged_total numeric(12,2) default 0;
alter table public.goods_received_notes add column if not exists posted_at timestamptz default now();
alter table public.goods_received_notes add column if not exists posted_by_id uuid references auth.users(id) on delete set null;
alter table public.goods_received_notes add column if not exists posted_by_name text;

create table if not exists public.goods_received_note_items (
    id uuid primary key default gen_random_uuid(),
    grn_id uuid not null references public.goods_received_notes(id) on delete cascade,
    po_item_id uuid references public.purchase_order_items(id) on delete set null,
    material_id uuid not null references public.materials(id) on delete cascade,
    material_name text not null,
    quantity_ordered numeric(10,2) not null default 0,
    previously_received numeric(10,2) not null default 0,
    current_received numeric(10,2) not null,
    accepted_quantity numeric(10,2) not null,
    rejected_quantity numeric(10,2) not null default 0,
    damaged_quantity numeric(10,2) not null default 0,
    unit text not null,
    unit_cost numeric(12,2) not null,
    total_cost numeric(12,2) not null,
    batch_lot_number text,
    roll_id text,
    expiry_date date,
    rejection_reason text,
    notes text,
    created_at timestamptz not null default now()
);

create index if not exists idx_grn_items_grn on public.goods_received_note_items(grn_id);
create index if not exists idx_grn_items_mat on public.goods_received_note_items(material_id);
alter table public.goods_received_note_items enable row level security;

-- 6. SUPPLIER RETURNS TABLE & ITEMS
create table if not exists public.supplier_returns (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    branch_id uuid references public.branches(id) on delete set null,
    return_number text not null,
    grn_id uuid references public.goods_received_notes(id) on delete set null,
    purchase_order_id uuid references public.purchase_orders(id) on delete set null,
    supplier_id uuid not null references public.suppliers(id) on delete cascade,
    supplier_name text not null,
    return_date date not null default current_date,
    status text not null default 'draft' check (
        status in ('draft', 'approved', 'completed', 'cancelled')
    ),
    reason text not null,
    total_return_amount numeric(12,2) not null default 0,
    approved_by_id uuid references auth.users(id) on delete set null,
    approved_by_name text,
    approved_at timestamptz,
    notes text,
    created_by_name text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_supplier_returns_num unique (company_id, return_number)
);

create index if not exists idx_supplier_returns_comp on public.supplier_returns(company_id);
create index if not exists idx_supplier_returns_supp on public.supplier_returns(company_id, supplier_id);
alter table public.supplier_returns enable row level security;

create table if not exists public.supplier_return_items (
    id uuid primary key default gen_random_uuid(),
    return_id uuid not null references public.supplier_returns(id) on delete cascade,
    grn_item_id uuid references public.goods_received_note_items(id) on delete set null,
    material_id uuid not null references public.materials(id) on delete cascade,
    material_name text not null,
    return_quantity numeric(10,2) not null,
    unit text not null,
    unit_cost numeric(12,2) not null,
    total_amount numeric(12,2) not null,
    reason text,
    location_id uuid references public.inventory_locations(id) on delete set null,
    created_at timestamptz not null default now()
);

create index if not exists idx_return_items_ret on public.supplier_return_items(return_id);
alter table public.supplier_return_items enable row level security;

-- 7. SUPPLIER LEDGER ENTRIES (Procurement Balance & Liability Tracking)
create table if not exists public.supplier_ledger_entries (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    branch_id uuid references public.branches(id) on delete set null,
    supplier_id uuid not null references public.suppliers(id) on delete cascade,
    entry_type text not null check (
        entry_type in ('PURCHASE_ORDER', 'GOODS_RECEIPT', 'PAYMENT', 'RETURN', 'ADJUSTMENT')
    ),
    reference_type text,
    reference_id text,
    debit numeric(12,2) not null default 0,
    credit numeric(12,2) not null default 0,
    running_balance numeric(12,2) not null default 0,
    notes text,
    created_at timestamptz not null default now()
);

create index if not exists idx_supplier_ledger_supp on public.supplier_ledger_entries(company_id, supplier_id);
create index if not exists idx_supplier_ledger_date on public.supplier_ledger_entries(company_id, created_at);
alter table public.supplier_ledger_entries enable row level security;

-- 8. ROW LEVEL SECURITY (RLS) POLICIES
drop policy if exists "tenant_isolation_supplier_items" on public.supplier_items;
create policy "tenant_isolation_supplier_items" on public.supplier_items for all
    using (public.auth_is_active_company_user(company_id));

drop policy if exists "tenant_isolation_purchase_requests" on public.purchase_requests;
create policy "tenant_isolation_purchase_requests" on public.purchase_requests for all
    using (public.auth_is_active_company_user(company_id));

drop policy if exists "tenant_isolation_purchase_request_items" on public.purchase_request_items;
create policy "tenant_isolation_purchase_request_items" on public.purchase_request_items for all
    using (
        exists (
            select 1 from public.purchase_requests pr
            where pr.id = purchase_request_items.purchase_request_id
            and public.auth_is_active_company_user(pr.company_id)
        )
    );

drop policy if exists "tenant_isolation_grn_items" on public.goods_received_note_items;
create policy "tenant_isolation_grn_items" on public.goods_received_note_items for all
    using (
        exists (
            select 1 from public.goods_received_notes grn
            where grn.id = goods_received_note_items.grn_id
            and public.auth_is_active_company_user(grn.company_id)
        )
    );

drop policy if exists "tenant_isolation_supplier_returns" on public.supplier_returns;
create policy "tenant_isolation_supplier_returns" on public.supplier_returns for all
    using (public.auth_is_active_company_user(company_id));

drop policy if exists "tenant_isolation_supplier_return_items" on public.supplier_return_items;
create policy "tenant_isolation_supplier_return_items" on public.supplier_return_items for all
    using (
        exists (
            select 1 from public.supplier_returns sr
            where sr.id = supplier_return_items.return_id
            and public.auth_is_active_company_user(sr.company_id)
        )
    );

drop policy if exists "tenant_isolation_supplier_ledger_entries" on public.supplier_ledger_entries;
create policy "tenant_isolation_supplier_ledger_entries" on public.supplier_ledger_entries for all
    using (public.auth_is_active_company_user(company_id));


-- >>> FILE: 067_workforce_finance.sql <<<
-- ==============================================================================
-- InkFlow ERP SaaS - Migration 067: Workforce + Geo Attendance + Double-Entry Finance
-- Authoritative schema for:
--   1. Extended Employee Master (Branch, Responsibilities, Employment Types, Emergency Contacts, Wage Rates)
--   2. Shifts & Overnight Schedule Management (Overnight shifts, Grace periods, Break times)
--   3. Employee Shift Assignments
--   4. Extended Attendance Records (Shift linkage, Field/Job attribution, Overtime approval, Labor costing)
--   5. Chart of Accounts (Asset, Liability, Equity, Revenue, Expense)
--   6. Financial Transactions & Double-Entry Journal Entry Lines (Balanced Debit = Credit)
--   7. Account Transfers (Cash <-> Bank <-> MFS)
--   8. Daily Cash Closings & Drawer Reconciliation
--   9. Financial Periods (Open / Closed fiscal periods)
--   10. Strict Multi-Tenant Row Level Security & Performance B-Tree Indexes
-- ==============================================================================

-- 1. EXTEND EMPLOYEES TABLE
alter table if exists public.employees
    add column if not exists branch_id uuid references public.branches(id) on delete set null,
    add column if not exists user_id uuid references auth.users(id) on delete set null,
    add column if not exists responsibilities text[] default '{}',
    add column if not exists email text,
    add column if not exists emergency_contact_name text,
    add column if not exists emergency_contact_phone text,
    add column if not exists emergency_contact_relation text,
    add column if not exists hourly_rate numeric(10,2) default 0,
    add column if not exists is_daily_worker boolean default false,
    add column if not exists bank_payment_info jsonb default '{}'::jsonb,
    add column if not exists mfs_payment_info jsonb default '{}'::jsonb,
    add column if not exists notes text;

create index if not exists idx_employees_branch on public.employees(company_id, branch_id);
create index if not exists idx_employees_user on public.employees(user_id);

-- 2. SHIFTS TABLE
create table if not exists public.shifts (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    branch_id uuid references public.branches(id) on delete set null,
    shift_code text not null,
    shift_name text not null,
    start_time text not null, -- 'HH:mm' e.g. '09:00' or '22:00'
    end_time text not null,   -- 'HH:mm' e.g. '18:00' or '06:00'
    is_overnight boolean not null default false,
    grace_period_minutes integer not null default 15,
    break_duration_minutes integer not null default 60,
    working_days text[] not null default '{"Sunday","Monday","Tuesday","Wednesday","Thursday","Saturday"}',
    overtime_rules jsonb not null default '{"enabled": true, "multiplier": 1.5, "min_minutes": 30}'::jsonb,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_shifts_comp_code unique (company_id, shift_code)
);

create index if not exists idx_shifts_company on public.shifts(company_id);
create index if not exists idx_shifts_branch on public.shifts(company_id, branch_id);
alter table public.shifts enable row level security;

-- 3. EMPLOYEE SHIFT ASSIGNMENTS TABLE
create table if not exists public.employee_shifts (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    employee_id uuid not null references public.employees(id) on delete cascade,
    shift_id uuid not null references public.shifts(id) on delete cascade,
    effective_from date not null default current_date,
    effective_to date,
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

create index if not exists idx_emp_shifts_emp on public.employee_shifts(company_id, employee_id);
create index if not exists idx_emp_shifts_shift on public.employee_shifts(company_id, shift_id);
alter table public.employee_shifts enable row level security;

-- 4. EXTEND ATTENDANCE RECORDS TABLE
alter table if exists public.attendance_records
    add column if not exists shift_id uuid references public.shifts(id) on delete set null,
    add column if not exists job_order_id uuid references public.job_orders(id) on delete set null,
    add column if not exists overtime_minutes integer default 0,
    add column if not exists is_overtime_approved boolean default false,
    add column if not exists approved_overtime_hours numeric(5,2) default 0,
    add column if not exists workforce_labor_cost numeric(12,2) default 0;

create index if not exists idx_att_records_shift on public.attendance_records(company_id, shift_id);
create index if not exists idx_att_records_job on public.attendance_records(company_id, job_order_id);

-- 5. CHART OF ACCOUNTS TABLE
create table if not exists public.accounts (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    branch_id uuid references public.branches(id) on delete set null,
    code text not null,
    name text not null,
    name_bn text,
    account_type text not null check (
        account_type in ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')
    ),
    account_subtype text not null check (
        account_subtype in (
            'CASH', 'BANK', 'MFS', 'RECEIVABLE', 'PAYABLE', 
            'INVENTORY', 'REVENUE', 'COGS_MATERIAL', 'COGS_LABOR', 
            'COGS_MACHINE', 'OPEX_RENT', 'OPEX_UTILITIES', 'OPEX_SALARY', 
            'OPEX_TRANSPORT', 'OPEX_MAINTENANCE', 'OPEX_MARKETING', 
            'OPEX_GENERAL', 'EQUITY', 'OTHER'
        )
    ),
    currency text not null default 'BDT',
    opening_balance numeric(14,2) not null default 0,
    current_balance numeric(14,2) not null default 0,
    is_system boolean not null default false,
    is_active boolean not null default true,
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_accounts_comp_code unique (company_id, code)
);

create index if not exists idx_accounts_company on public.accounts(company_id);
create index if not exists idx_accounts_type on public.accounts(company_id, account_type);
create index if not exists idx_accounts_subtype on public.accounts(company_id, account_subtype);
alter table public.accounts enable row level security;

-- 6. FINANCIAL TRANSACTIONS TABLE (Master Journal Header)
create table if not exists public.financial_transactions (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    branch_id uuid references public.branches(id) on delete set null,
    transaction_number text not null,
    transaction_date date not null default current_date,
    transaction_type text not null check (
        transaction_type in (
            'CUSTOMER_PAYMENT', 'SUPPLIER_PAYMENT', 'EXPENSE', 
            'ACCOUNT_TRANSFER', 'REFUND', 'JOURNAL_ADJUSTMENT', 
            'CASH_CLOSING_ADJUSTMENT', 'SALARY_PAYMENT', 'SALES_INVOICE', 'PURCHASE_GRN'
        )
    ),
    status text not null default 'POSTED' check (
        status in ('DRAFT', 'PENDING_APPROVAL', 'POSTED', 'REVERSED', 'CANCELLED')
    ),
    total_amount numeric(14,2) not null default 0 check (total_amount >= 0),
    reference_type text, -- 'INVOICE', 'PURCHASE_ORDER', 'GOODS_RECEIPT', 'EXPENSE', 'TRANSFER', 'CASH_CLOSING', 'PAYROLL'
    reference_id text,
    narration text not null,
    posted_by_id uuid references auth.users(id) on delete set null,
    posted_by_name text not null default 'System',
    posted_at timestamptz not null default now(),
    reversal_of_id uuid references public.financial_transactions(id) on delete set null,
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_fin_txn_comp_num unique (company_id, transaction_number)
);

create index if not exists idx_fin_txn_company on public.financial_transactions(company_id);
create index if not exists idx_fin_txn_date on public.financial_transactions(company_id, transaction_date);
create index if not exists idx_fin_txn_type on public.financial_transactions(company_id, transaction_type);
create index if not exists idx_fin_txn_status on public.financial_transactions(company_id, status);
create index if not exists idx_fin_txn_ref on public.financial_transactions(company_id, reference_type, reference_id);
alter table public.financial_transactions enable row level security;

-- 7. JOURNAL ENTRY LINES TABLE (Double-Entry Debit/Credit Lines)
create table if not exists public.journal_entry_lines (
    id uuid primary key default gen_random_uuid(),
    transaction_id uuid not null references public.financial_transactions(id) on delete cascade,
    company_id uuid not null references public.companies(id) on delete cascade,
    account_id uuid not null references public.accounts(id) on delete restrict,
    debit numeric(14,2) not null default 0 check (debit >= 0),
    credit numeric(14,2) not null default 0 check (credit >= 0),
    memo text,
    created_at timestamptz not null default now(),
    constraint chk_entry_not_both_zero check (debit > 0 or credit > 0)
);

create index if not exists idx_jel_txn on public.journal_entry_lines(transaction_id);
create index if not exists idx_jel_comp_acc on public.journal_entry_lines(company_id, account_id);
alter table public.journal_entry_lines enable row level security;

-- 8. ACCOUNT TRANSFERS TABLE
create table if not exists public.account_transfers (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    branch_id uuid references public.branches(id) on delete set null,
    transfer_number text not null,
    from_account_id uuid not null references public.accounts(id) on delete restrict,
    to_account_id uuid not null references public.accounts(id) on delete restrict,
    amount numeric(14,2) not null check (amount > 0),
    fee_amount numeric(10,2) not null default 0 check (fee_amount >= 0),
    transfer_date date not null default current_date,
    transaction_id uuid references public.financial_transactions(id) on delete set null,
    status text not null default 'POSTED' check (status in ('PENDING', 'POSTED', 'CANCELLED')),
    notes text,
    created_by_name text not null,
    created_at timestamptz not null default now(),
    constraint uk_acc_transfers_num unique (company_id, transfer_number),
    constraint chk_diff_accounts check (from_account_id <> to_account_id)
);

create index if not exists idx_acc_transfers_comp on public.account_transfers(company_id);
create index if not exists idx_acc_transfers_from on public.account_transfers(company_id, from_account_id);
create index if not exists idx_acc_transfers_to on public.account_transfers(company_id, to_account_id);
alter table public.account_transfers enable row level security;

-- 9. DAILY CASH CLOSINGS TABLE
create table if not exists public.cash_closings (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    branch_id uuid references public.branches(id) on delete set null,
    closing_number text not null,
    closing_date date not null default current_date,
    account_id uuid not null references public.accounts(id) on delete restrict,
    opening_cash numeric(14,2) not null default 0,
    cash_inflows numeric(14,2) not null default 0,
    cash_outflows numeric(14,2) not null default 0,
    expected_cash numeric(14,2) not null default 0,
    counted_cash numeric(14,2) not null default 0,
    variance numeric(14,2) not null default 0,
    variance_reason text,
    status text not null default 'SUBMITTED' check (status in ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED')),
    adjustment_transaction_id uuid references public.financial_transactions(id) on delete set null,
    closed_by_name text not null,
    approved_by_name text,
    approved_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_cash_closings_num unique (company_id, closing_number)
);

create index if not exists idx_cash_closings_comp on public.cash_closings(company_id);
create index if not exists idx_cash_closings_date on public.cash_closings(company_id, closing_date);
alter table public.cash_closings enable row level security;

-- 10. FINANCIAL PERIODS TABLE
create table if not exists public.financial_periods (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    period_name text not null,
    start_date date not null,
    end_date date not null,
    status text not null default 'OPEN' check (status in ('OPEN', 'CLOSED')),
    closed_at timestamptz,
    closed_by_name text,
    created_at timestamptz not null default now(),
    constraint uk_fin_periods_comp_name unique (company_id, period_name)
);

create index if not exists idx_fin_periods_comp on public.financial_periods(company_id);
alter table public.financial_periods enable row level security;

-- 11. ROW LEVEL SECURITY (RLS) POLICIES

drop policy if exists "tenant_isolation_shifts" on public.shifts;
create policy "tenant_isolation_shifts" on public.shifts for all
    using (public.auth_is_active_company_user(company_id));

drop policy if exists "tenant_isolation_employee_shifts" on public.employee_shifts;
create policy "tenant_isolation_employee_shifts" on public.employee_shifts for all
    using (public.auth_is_active_company_user(company_id));

drop policy if exists "tenant_isolation_accounts" on public.accounts;
create policy "tenant_isolation_accounts" on public.accounts for all
    using (public.auth_is_active_company_user(company_id));

drop policy if exists "tenant_isolation_financial_transactions" on public.financial_transactions;
create policy "tenant_isolation_financial_transactions" on public.financial_transactions for all
    using (public.auth_is_active_company_user(company_id));

drop policy if exists "tenant_isolation_journal_entry_lines" on public.journal_entry_lines;
create policy "tenant_isolation_journal_entry_lines" on public.journal_entry_lines for all
    using (public.auth_is_active_company_user(company_id));

drop policy if exists "tenant_isolation_account_transfers" on public.account_transfers;
create policy "tenant_isolation_account_transfers" on public.account_transfers for all
    using (public.auth_is_active_company_user(company_id));

drop policy if exists "tenant_isolation_cash_closings" on public.cash_closings;
create policy "tenant_isolation_cash_closings" on public.cash_closings for all
    using (public.auth_is_active_company_user(company_id));

drop policy if exists "tenant_isolation_financial_periods" on public.financial_periods;
create policy "tenant_isolation_financial_periods" on public.financial_periods for all
    using (public.auth_is_active_company_user(company_id));


-- >>> FILE: 068_bangladesh_localization_vat.sql <<<
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


-- >>> FILE: 069_mobile_communication_offline.sql <<<
-- ==============================================================================
-- InkFlow ERP - Migration 069: Mobile + WhatsApp + SMS + Offline Sync
-- Multi-Tenant Outbox, Idempotent Sync, Unified Communication & Client Devices
-- ==============================================================================

-- 1. SYNC OUTBOX (Client-to-Server Sync Queue with Idempotency)
CREATE TABLE IF NOT EXISTS sync_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  idempotency_key VARCHAR(120) NOT NULL UNIQUE,
  device_id VARCHAR(100) NOT NULL,
  action_type VARCHAR(60) NOT NULL,
  entity_type VARCHAR(60) NOT NULL,
  entity_id VARCHAR(100),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(30) NOT NULL DEFAULT 'pending', -- pending, syncing, synced, conflict, failed, cancelled
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 5,
  last_error TEXT,
  conflict_details JSONB,
  server_version INTEGER DEFAULT 1,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_outbox_company_status ON sync_outbox(company_id, status);
CREATE INDEX IF NOT EXISTS idx_sync_outbox_idempotency ON sync_outbox(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_sync_outbox_device ON sync_outbox(company_id, device_id);

-- 2. COMMUNICATION MESSAGES (Unified Audit Log for WhatsApp, SMS, Email & In-App)
CREATE TABLE IF NOT EXISTS communication_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  channel VARCHAR(30) NOT NULL, -- whatsapp, sms, email, in_app, telegram
  recipient_name VARCHAR(150) NOT NULL,
  recipient_destination VARCHAR(150) NOT NULL, -- phone number or email address
  subject VARCHAR(255),
  template_key VARCHAR(100),
  variables JSONB DEFAULT '{}'::jsonb,
  message_content TEXT NOT NULL,
  attachment_url TEXT,
  attachment_name VARCHAR(255),
  provider VARCHAR(60) NOT NULL, -- meta_whatsapp, twilio, greenweb, bulksmsbd, ssl_wireless, gmail, resend, mock
  provider_message_id VARCHAR(150),
  status VARCHAR(30) NOT NULL DEFAULT 'queued', -- queued, sending, sent, delivered, read, failed
  error_code VARCHAR(50),
  error_message TEXT,
  attempts INTEGER NOT NULL DEFAULT 1,
  idempotency_key VARCHAR(120) UNIQUE,
  sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comm_messages_company ON communication_messages(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comm_messages_channel ON communication_messages(company_id, channel, status);
CREATE INDEX IF NOT EXISTS idx_comm_messages_recipient ON communication_messages(company_id, recipient_destination);
CREATE INDEX IF NOT EXISTS idx_comm_messages_idempotency ON communication_messages(idempotency_key);

-- 3. COMMUNICATION TEMPLATES (Configurable Multi-Channel Bilingual Message Templates)
CREATE TABLE IF NOT EXISTS communication_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  template_key VARCHAR(100) NOT NULL,
  name VARCHAR(150) NOT NULL,
  name_bn VARCHAR(150),
  channel VARCHAR(30) NOT NULL DEFAULT 'all', -- all, whatsapp, sms, email, in_app
  subject_en VARCHAR(255),
  subject_bn VARCHAR(255),
  body_en TEXT NOT NULL,
  body_bn TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_comm_template_company_key UNIQUE(company_id, template_key, channel)
);

CREATE INDEX IF NOT EXISTS idx_comm_templates_company ON communication_templates(company_id, is_active);

-- 4. CLIENT DEVICES (Registered Mobile/PWA Devices & Local Cache Tracking)
CREATE TABLE IF NOT EXISTS client_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id VARCHAR(100) NOT NULL,
  device_name VARCHAR(150),
  platform VARCHAR(50), -- android, ios, pwa, desktop_web
  app_version VARCHAR(30),
  push_subscription JSONB,
  last_ip_address VARCHAR(45),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_client_device_user UNIQUE(company_id, user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_client_devices_user ON client_devices(company_id, user_id);

-- 5. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE sync_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_devices ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES ENFORCING MULTI-TENANT ISOLATION

-- sync_outbox
DROP POLICY IF EXISTS "sync_outbox_tenant_isolation" ON sync_outbox;
CREATE POLICY "sync_outbox_tenant_isolation" ON sync_outbox
  FOR ALL USING (
    public.auth_is_active_company_user(company_id)
  );

-- communication_messages
DROP POLICY IF EXISTS "comm_messages_tenant_isolation" ON communication_messages;
CREATE POLICY "comm_messages_tenant_isolation" ON communication_messages
  FOR ALL USING (
    public.auth_is_active_company_user(company_id)
  );

-- communication_templates
DROP POLICY IF EXISTS "comm_templates_tenant_isolation" ON communication_templates;
CREATE POLICY "comm_templates_tenant_isolation" ON communication_templates
  FOR ALL USING (
    public.auth_is_active_company_user(company_id)
  );

-- client_devices
DROP POLICY IF EXISTS "client_devices_tenant_isolation" ON client_devices;
CREATE POLICY "client_devices_tenant_isolation" ON client_devices
  FOR ALL USING (
    public.auth_is_active_company_user(company_id)
  );


-- >>> FILE: 070_multi_branch_advanced_management.sql <<<
-- ==============================================================================
-- InkFlow SaaS - Migration 070: Multi-Branch & Advanced Management Engine (V9)
-- Extends branches table, introduces branch transfer requests, inter-branch
-- financial transfers, cross-branch employee assignments, workflow configurations,
-- and user branch access with strict multi-tenant Row Level Security.
-- ==============================================================================

-- 1. EXTEND PUBLIC.BRANCHES TABLE
ALTER TABLE IF EXISTS public.branches
    ADD COLUMN IF NOT EXISTS legal_name TEXT,
    ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS manager_name TEXT,
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS division_id INTEGER REFERENCES public.locations_master(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS district_id INTEGER REFERENCES public.locations_master(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS upazila_id INTEGER REFERENCES public.locations_master(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS area TEXT,
    ADD COLUMN IF NOT EXISTS full_address TEXT,
    ADD COLUMN IF NOT EXISTS full_address_bn TEXT,
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'archived')),
    ADD COLUMN IF NOT EXISTS operating_hours TEXT,
    ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Asia/Dhaka',
    ADD COLUMN IF NOT EXISTS document_numbering_config JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS financial_settings JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS production_capabilities JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS contact_person TEXT,
    ADD COLUMN IF NOT EXISTS contact_phone TEXT,
    ADD COLUMN IF NOT EXISTS contact_email TEXT;

CREATE INDEX IF NOT EXISTS idx_branches_status ON public.branches(company_id, status);
CREATE INDEX IF NOT EXISTS idx_branches_manager ON public.branches(manager_id);
CREATE INDEX IF NOT EXISTS idx_branches_division ON public.branches(division_id);
CREATE INDEX IF NOT EXISTS idx_branches_district ON public.branches(district_id);

-- 2. BRANCH TRANSFER REQUESTS (Multi-Branch Inventory Movements)
CREATE TABLE IF NOT EXISTS public.branch_transfer_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    transfer_number TEXT NOT NULL,
    from_branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    from_location_id UUID REFERENCES public.inventory_locations(id) ON DELETE SET NULL,
    to_branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    to_location_id UUID REFERENCES public.inventory_locations(id) ON DELETE SET NULL,
    material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
    material_name TEXT NOT NULL,
    quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
    unit TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'requested', 'approved', 'rejected', 'dispatched', 'in_transit', 'received', 'cancelled')),
    requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    requested_by_name TEXT,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_by_name TEXT,
    approved_at TIMESTAMPTZ,
    dispatched_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    dispatched_by_name TEXT,
    dispatched_at TIMESTAMPTZ,
    received_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    received_by_name TEXT,
    received_at TIMESTAMPTZ,
    rejection_reason TEXT,
    notes TEXT,
    idempotency_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_branch_transfer_number UNIQUE (company_id, transfer_number)
);

CREATE INDEX IF NOT EXISTS idx_branch_transfers_company ON public.branch_transfer_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_branch_transfers_from_branch ON public.branch_transfer_requests(company_id, from_branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_transfers_to_branch ON public.branch_transfer_requests(company_id, to_branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_transfers_status ON public.branch_transfer_requests(company_id, status);
CREATE INDEX IF NOT EXISTS idx_branch_transfers_material ON public.branch_transfer_requests(company_id, material_id);
CREATE INDEX IF NOT EXISTS idx_branch_transfers_idempotency ON public.branch_transfer_requests(company_id, idempotency_key);

ALTER TABLE public.branch_transfer_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view branch transfer requests for their company"
    ON public.branch_transfer_requests
    FOR SELECT
    TO authenticated
    USING (public.auth_is_active_company_user(company_id));

CREATE POLICY "Users can insert branch transfer requests for their company"
    ON public.branch_transfer_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (public.auth_is_active_company_user(company_id));

CREATE POLICY "Users can update branch transfer requests for their company"
    ON public.branch_transfer_requests
    FOR UPDATE
    TO authenticated
    USING (public.auth_is_active_company_user(company_id));

-- 3. INTER-BRANCH FINANCIAL TRANSFERS
CREATE TABLE IF NOT EXISTS public.inter_branch_financial_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    transfer_number TEXT NOT NULL,
    from_branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    to_branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    from_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    to_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'BDT',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'requested', 'approved', 'completed', 'cancelled')),
    requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    requested_by_name TEXT,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_by_name TEXT,
    approved_at TIMESTAMPTZ,
    reference TEXT,
    notes TEXT,
    idempotency_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_inter_branch_financial_transfer_number UNIQUE (company_id, transfer_number)
);

CREATE INDEX IF NOT EXISTS idx_inter_branch_fin_company ON public.inter_branch_financial_transfers(company_id);
CREATE INDEX IF NOT EXISTS idx_inter_branch_fin_from ON public.inter_branch_financial_transfers(company_id, from_branch_id);
CREATE INDEX IF NOT EXISTS idx_inter_branch_fin_to ON public.inter_branch_financial_transfers(company_id, to_branch_id);
CREATE INDEX IF NOT EXISTS idx_inter_branch_fin_status ON public.inter_branch_financial_transfers(company_id, status);
CREATE INDEX IF NOT EXISTS idx_inter_branch_fin_idempotency ON public.inter_branch_financial_transfers(company_id, idempotency_key);

ALTER TABLE public.inter_branch_financial_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view inter branch financial transfers for their company"
    ON public.inter_branch_financial_transfers
    FOR SELECT
    TO authenticated
    USING (public.auth_is_active_company_user(company_id));

CREATE POLICY "Users can insert inter branch financial transfers for their company"
    ON public.inter_branch_financial_transfers
    FOR INSERT
    TO authenticated
    WITH CHECK (public.auth_is_active_company_user(company_id));

CREATE POLICY "Users can update inter branch financial transfers for their company"
    ON public.inter_branch_financial_transfers
    FOR UPDATE
    TO authenticated
    USING (public.auth_is_active_company_user(company_id));

-- 4. EMPLOYEE BRANCH ASSIGNMENTS (Cross-Branch Work & Temporary Deployments)
CREATE TABLE IF NOT EXISTS public.employee_branch_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE,
    is_temporary BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'cancelled')),
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emp_branch_assign_company ON public.employee_branch_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_emp_branch_assign_emp ON public.employee_branch_assignments(company_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_emp_branch_assign_branch ON public.employee_branch_assignments(company_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_emp_branch_assign_dates ON public.employee_branch_assignments(company_id, start_date, end_date);

ALTER TABLE public.employee_branch_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view employee branch assignments for their company"
    ON public.employee_branch_assignments
    FOR SELECT
    TO authenticated
    USING (public.auth_is_active_company_user(company_id));

CREATE POLICY "Users can insert employee branch assignments for their company"
    ON public.employee_branch_assignments
    FOR INSERT
    TO authenticated
    WITH CHECK (public.auth_is_active_company_user(company_id));

CREATE POLICY "Users can update employee branch assignments for their company"
    ON public.employee_branch_assignments
    FOR UPDATE
    TO authenticated
    USING (public.auth_is_active_company_user(company_id));

-- 5. WORKFLOW CONFIGURATIONS (Declarative Routing & Approval Rules)
CREATE TABLE IF NOT EXISTS public.workflow_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    workflow_type TEXT NOT NULL CHECK (workflow_type IN ('inventory_transfer', 'cross_branch_production', 'financial_transfer', 'procurement_routing')),
    rules JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_workflow_config UNIQUE (company_id, branch_id, workflow_type)
);

CREATE INDEX IF NOT EXISTS idx_workflow_config_company ON public.workflow_configurations(company_id);
CREATE INDEX IF NOT EXISTS idx_workflow_config_branch ON public.workflow_configurations(company_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_workflow_config_type ON public.workflow_configurations(company_id, workflow_type);

ALTER TABLE public.workflow_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workflow configurations for their company"
    ON public.workflow_configurations
    FOR SELECT
    TO authenticated
    USING (public.auth_is_active_company_user(company_id));

CREATE POLICY "Users can insert/update workflow configurations for their company"
    ON public.workflow_configurations
    FOR ALL
    TO authenticated
    USING (public.auth_is_active_company_user(company_id))
    WITH CHECK (public.auth_is_active_company_user(company_id));

-- 6. USER BRANCH ACCESS (Selected Branches Data Scope)
CREATE TABLE IF NOT EXISTS public.user_branch_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_user_branch_access UNIQUE (company_id, user_id, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_user_branch_access_user ON public.user_branch_access(company_id, user_id);
CREATE INDEX IF NOT EXISTS idx_user_branch_access_branch ON public.user_branch_access(company_id, branch_id);

ALTER TABLE public.user_branch_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view user branch access for their company"
    ON public.user_branch_access
    FOR SELECT
    TO authenticated
    USING (public.auth_is_active_company_user(company_id));

CREATE POLICY "Admins can manage user branch access for their company"
    ON public.user_branch_access
    FOR ALL
    TO authenticated
    USING (public.auth_is_active_company_user(company_id))
    WITH CHECK (public.auth_is_active_company_user(company_id));

-- 7. SEED BRANCH MANAGEMENT PERMISSIONS
INSERT INTO public.permissions (code, module, name, description) VALUES
('branch.view', 'branch_management', 'View Branches', 'View company branches and their operational statuses'),
('branch.create', 'branch_management', 'Create Branches', 'Add new company branches, factories, and retail outlets'),
('branch.edit', 'branch_management', 'Edit Branches', 'Modify branch details, operating parameters, and addresses'),
('branch.delete', 'branch_management', 'Delete/Archive Branches', 'Archive or deactivate existing branches'),
('branch.manage', 'branch_management', 'Manage All Branches', 'Full administrative control over all company branches'),
('branch.transfer.request', 'branch_management', 'Request Branch Transfer', 'Initiate cross-branch inventory or financial transfer requests'),
('branch.transfer.approve', 'branch_management', 'Approve Branch Transfer', 'Approve or reject pending inter-branch transfers'),
('branch.transfer.dispatch', 'branch_management', 'Dispatch Branch Transfer', 'Dispatch approved stock from source branch'),
('branch.transfer.receive', 'branch_management', 'Receive Branch Transfer', 'Acknowledge and receive transferred stock at target branch')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- Grant all new branch permissions to system Owner role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000001', p.id
FROM public.permissions p
WHERE p.code LIKE 'branch.%'
ON CONFLICT (role_id, permission_id) DO NOTHING;

