-- ==============================================================================
-- InkFlow ERP - Migration 102: Universal Username & Phone Multi-Identifier Login
-- Guarantees uniqueness across login identifiers (Email, Username, Phone)
-- ==============================================================================

-- 1. Add username column to user_profiles if missing
ALTER TABLE IF EXISTS public.user_profiles
    ADD COLUMN IF NOT EXISTS username text;

-- 2. Add username column to public.profiles if missing (compatibility layer)
ALTER TABLE IF EXISTS public.profiles
    ADD COLUMN IF NOT EXISTS username text;

-- 3. Case-insensitive unique index on user_profiles.username
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_username_lower
    ON public.user_profiles (lower(trim(username)))
    WHERE username IS NOT NULL AND trim(username) != '';

-- 4. Case-insensitive index on phone in user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone_search
    ON public.user_profiles (trim(phone))
    WHERE phone IS NOT NULL;

-- 5. Ensure employee login columns exist on public.employees
ALTER TABLE IF EXISTS public.employees
    ADD COLUMN IF NOT EXISTS portal_credentials jsonb,
    ADD COLUMN IF NOT EXISTS user_id uuid,
    ADD COLUMN IF NOT EXISTS email text;

-- 6. Search index on employees mobile
CREATE INDEX IF NOT EXISTS idx_employees_mobile_search
    ON public.employees (trim(mobile))
    WHERE mobile IS NOT NULL;

-- 7. Functional index on employees portal_credentials username
CREATE INDEX IF NOT EXISTS idx_employees_portal_username_lower
    ON public.employees ((lower(trim(portal_credentials->>'username'))))
    WHERE portal_credentials IS NOT NULL AND portal_credentials->>'username' IS NOT NULL;

-- 8. Functional index on employees portal_credentials email
CREATE INDEX IF NOT EXISTS idx_employees_portal_email_lower
    ON public.employees ((lower(trim(portal_credentials->>'email'))))
    WHERE portal_credentials IS NOT NULL AND portal_credentials->>'email' IS NOT NULL;

-- 9. Backpopulate username in user_profiles from existing employee portal credentials
UPDATE public.user_profiles up
SET username = lower(trim(e.portal_credentials->>'username'))
FROM public.employees e
WHERE e.user_id = up.id
  AND e.portal_credentials IS NOT NULL
  AND e.portal_credentials->>'username' IS NOT NULL
  AND (up.username IS NULL OR up.username = '');
