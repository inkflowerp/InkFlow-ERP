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
