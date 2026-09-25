-- ==============================================================================
-- Migration 103: Dynamic Platform Branding, Domain, and Contact Settings
-- Synchronizes application name, logo, tagline, favicon, meta title, description,
-- helpline, custom root domain, and contact options across entire application.
-- ==============================================================================

alter table if exists public.platform_system_settings
    add column if not exists app_name text not null default 'InkFlow ERP',
    add column if not exists app_logo_url text default '',
    add column if not exists app_tagline text not null default 'The Complete Printing & Signage Operating System',
    add column if not exists favicon_url text not null default '/favicon.ico',
    add column if not exists app_title text not null default 'PrintERP SaaS - Operating System for Printing & Signage in Bangladesh',
    add column if not exists app_description text not null default 'Production-ready SaaS for digital printing, offset press, flex/banner, stickers, packaging, LED signage, acrylic fabrication, and installation businesses in Bangladesh.',
    add column if not exists support_helpline text not null default '+880 1819-876543',
    add column if not exists app_domain text not null default 'inkflow.com.bd',
    add column if not exists contact_email text not null default 'support@printerp.com.bd',
    add column if not exists contact_phone text not null default '+880 1819-876543',
    add column if not exists contact_address text not null default 'Arambagh Press Cluster, Motijheel, Dhaka-1000, Bangladesh';

-- Update the default singleton row if present
update public.platform_system_settings
set
    app_name = coalesce(nullif(app_name, ''), 'InkFlow ERP'),
    app_logo_url = coalesce(app_logo_url, ''),
    app_tagline = coalesce(nullif(app_tagline, ''), 'The Complete Printing & Signage Operating System'),
    favicon_url = coalesce(nullif(favicon_url, ''), '/favicon.ico'),
    app_title = coalesce(nullif(app_title, ''), 'PrintERP SaaS - Operating System for Printing & Signage in Bangladesh'),
    app_description = coalesce(nullif(app_description, ''), 'Production-ready SaaS for digital printing, offset press, flex/banner, stickers, packaging, LED signage, acrylic fabrication, and installation businesses in Bangladesh.'),
    support_helpline = coalesce(nullif(support_helpline, ''), '+880 1819-876543'),
    app_domain = coalesce(nullif(app_domain, ''), 'inkflow.com.bd'),
    contact_email = coalesce(nullif(contact_email, ''), 'support@printerp.com.bd'),
    contact_phone = coalesce(nullif(contact_phone, ''), '+880 1819-876543'),
    contact_address = coalesce(nullif(contact_address, ''), 'Arambagh Press Cluster, Motijheel, Dhaka-1000, Bangladesh')
where id = 'default';

-- Allow public read of platform identity & branding
drop policy if exists "Public read of platform branding" on public.platform_system_settings;
create policy "Public read of platform branding"
    on public.platform_system_settings for select
    using (true);
