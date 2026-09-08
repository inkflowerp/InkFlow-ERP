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
