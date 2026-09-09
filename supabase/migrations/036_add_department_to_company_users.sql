-- ==============================================================================
-- PrintERP / InkFlow SaaS - Migration 036: Add Department & Custom Metadata to Company Users
-- Adds department, responsibilities, and raw_overrides to public.company_users.
-- ==============================================================================

alter table if exists public.company_users
    add column if not exists department text default 'General',
    add column if not exists responsibilities text[],
    add column if not exists raw_overrides jsonb default '{}'::jsonb;

create index if not exists idx_company_users_department on public.company_users(department);
