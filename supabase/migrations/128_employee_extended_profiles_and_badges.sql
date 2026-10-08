-- ==============================================================================
-- PrintFlow SaaS - Migration 128: Employee Extended Profiles & Staff ID Badges
-- Extends public.employees with full 360-degree profile schema:
--   1. Profile photo & avatar persistence across database & store
--   2. Branch scoping and Auth User link
--   3. Duty, shift, grace minutes & overtime parameters
--   4. Portal credentials, username, and dynamic role scopes
--   5. Granular salary breakdown (basic, house, medical, conveyance)
--   6. Bank & MFS payout details
--   7. NID, Blood group, emergency contacts, qualifications, documents
-- ==============================================================================

BEGIN;

ALTER TABLE public.employees
    ADD COLUMN IF NOT EXISTS profile_picture_url text,
    ADD COLUMN IF NOT EXISTS avatar_url text,
    ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS branch_name text,
    ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS duty_settings jsonb DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS portal_credentials jsonb DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS salary_structure jsonb DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS bank_payment_info jsonb DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS mfs_payment_info jsonb DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS commission_settings jsonb DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS document_attachments jsonb DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS blood_group text,
    ADD COLUMN IF NOT EXISTS nid_number text,
    ADD COLUMN IF NOT EXISTS date_of_birth date,
    ADD COLUMN IF NOT EXISTS permanent_address text,
    ADD COLUMN IF NOT EXISTS educational_qualification text,
    ADD COLUMN IF NOT EXISTS emergency_contact_name text,
    ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
    ADD COLUMN IF NOT EXISTS emergency_contact_relation text,
    ADD COLUMN IF NOT EXISTS allowed_monthly_leaves integer DEFAULT 2,
    ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cash',
    ADD COLUMN IF NOT EXISTS is_daily_worker boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS contract_end_date date;

CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_branch_id ON public.employees(branch_id);

COMMIT;
