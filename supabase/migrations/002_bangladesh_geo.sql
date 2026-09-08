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
