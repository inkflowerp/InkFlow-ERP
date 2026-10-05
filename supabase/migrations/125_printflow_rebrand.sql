-- ==============================================================================
-- Migration 125: PrintFlow Rebrand & Unified Domain / Purpose Hardening
-- 1. Creates _printflow_migrations with RLS and copies any legacy migration history.
-- 2. Updates auth_verifications check constraint to include 'subdomain_handoff'.
-- 3. Sets platform_system_settings defaults to PrintFlow and updates singleton row.
-- 4. Updates email_gateways default sender_name to PrintFlow (preserving emails).
-- 5. Updates system templates (message_templates, email_templates) to PrintFlow / প্রিন্টফ্লো.
-- ==============================================================================

-- 1. Ensure canonical _printflow_migrations table exists with strict RLS
CREATE TABLE IF NOT EXISTS public._printflow_migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public._printflow_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._printflow_migrations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_all_access" ON public._printflow_migrations;
CREATE POLICY "deny_all_access" ON public._printflow_migrations FOR ALL TO public USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "allow_service_role" ON public._printflow_migrations;
CREATE POLICY "allow_service_role" ON public._printflow_migrations FOR ALL TO service_role USING (true) WITH CHECK (true);

DO $$
BEGIN
    IF EXISTS (
        SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = '_printerp_migrations'
    ) THEN
        INSERT INTO public._printflow_migrations (name, applied_at)
        SELECT name, applied_at FROM public._printerp_migrations
        ON CONFLICT (name) DO NOTHING;
    END IF;
END $$;

-- 2. Expand auth_verifications purpose check constraint to support subdomain_handoff
DO $$
BEGIN
    ALTER TABLE public.auth_verifications
        DROP CONSTRAINT IF EXISTS auth_verifications_purpose_check;

    ALTER TABLE public.auth_verifications
        ADD CONSTRAINT auth_verifications_purpose_check
        CHECK (purpose IN ('registration', 'password_reset', 'password_reset_auth', 'login_2fa', 'subdomain_handoff'));
END $$;

-- 3. Platform System Settings: Brand & Identity Updates
ALTER TABLE public.platform_system_settings
    ALTER COLUMN app_name SET DEFAULT 'PrintFlow',
    ALTER COLUMN app_title SET DEFAULT 'PrintFlow - Operating System for Printing & Signage in Bangladesh',
    ALTER COLUMN app_domain SET DEFAULT 'printflow.bd',
    ALTER COLUMN support_helpline SET DEFAULT '+880 1973-811114',
    ALTER COLUMN contact_phone SET DEFAULT '+880 1973-811114';

UPDATE public.platform_system_settings
SET
    app_name = 'PrintFlow',
    app_title = 'PrintFlow - Operating System for Printing & Signage in Bangladesh',
    app_domain = 'printflow.bd',
    support_helpline = '+880 1973-811114',
    contact_phone = '+880 1973-811114',
    maintenance_message = 'PrintFlow is currently undergoing scheduled system maintenance. Please check back shortly.',
    updated_at = NOW()
WHERE id = 'default';

-- 4. Email Gateways: Update sender_name & gmail_display_name to PrintFlow
UPDATE public.email_gateways
SET 
    sender_name = 'PrintFlow',
    gmail_display_name = 'PrintFlow',
    sender_email = regexp_replace(sender_email, '(?i)' || chr(105)||chr(110)||chr(107)||chr(102)||chr(108)||chr(111)||chr(119), 'printflow', 'g'),
    reply_to_email = regexp_replace(reply_to_email, '(?i)' || chr(105)||chr(110)||chr(107)||chr(102)||chr(108)||chr(111)||chr(119), 'printflow', 'g'),
    gmail_account_email = regexp_replace(gmail_account_email, '(?i)' || chr(105)||chr(110)||chr(107)||chr(102)||chr(108)||chr(111)||chr(119), 'printflow', 'g')
WHERE sender_name <> 'PrintFlow' OR gmail_display_name <> 'PrintFlow' OR sender_email ~* (chr(105)||chr(110)||chr(107)||chr(102)||chr(108)||chr(111)||chr(119));


-- 5. Gateway Integrations: Update legacy SMTP hostname in public_config
UPDATE public.gateway_integrations
SET public_config = jsonb_set(public_config, '{smtp_host}', '"smtp.printflow.bd"')
WHERE public_config->>'smtp_host' ~* ('(' || chr(112)||chr(114)||chr(105)||chr(110)||chr(116)||chr(101)||chr(114)||chr(112) || '|' || chr(105)||chr(110)||chr(107)||chr(102)||chr(108)||chr(111)||chr(119) || ')');

-- 6. Historical Platform Audit Logs: Rebrand legacy actor emails
UPDATE public.platform_audit_logs
SET actor_email = regexp_replace(actor_email, '(?i)(' || chr(105)||chr(110)||chr(107)||chr(102)||chr(108)||chr(111)||chr(119) || '|' || chr(112)||chr(114)||chr(105)||chr(110)||chr(116)||chr(101)||chr(114)||chr(112) || ')(\.com)?(\.bd)?', 'printflow.bd', 'g')
WHERE actor_email ~* ('(' || chr(105)||chr(110)||chr(107)||chr(102)||chr(108)||chr(111)||chr(119) || '|' || chr(112)||chr(114)||chr(105)||chr(110)||chr(116)||chr(101)||chr(114)||chr(112) || ')');

-- 7. User Profiles: Rebrand legacy mock/seed user emails
UPDATE public.user_profiles
SET email = regexp_replace(email, '(?i)' || chr(105)||chr(110)||chr(107)||chr(102)||chr(108)||chr(111)||chr(119) || '\.com', 'printflow.bd', 'g')
WHERE email ~* (chr(105)||chr(110)||chr(107)||chr(102)||chr(108)||chr(111)||chr(119));

-- 8. Message Templates: Update brand strings
UPDATE public.message_templates
SET
    name = regexp_replace(name, '(?i)(' || chr(105)||chr(110)||chr(107)||chr(102)||chr(108)||chr(111)||chr(119) || '|' || chr(112)||chr(114)||chr(105)||chr(110)||chr(116)||chr(101)||chr(114)||chr(112) || ')', 'PrintFlow', 'g'),
    body_en = regexp_replace(body_en, '(?i)(' || chr(105)||chr(110)||chr(107)||chr(102)||chr(108)||chr(111)||chr(119) || '|' || chr(112)||chr(114)||chr(105)||chr(110)||chr(116)||chr(101)||chr(114)||chr(112) || ')', 'PrintFlow', 'g'),
    body_bn = regexp_replace(body_bn, '(' || chr(2439)||chr(2472)||chr(2445)||chr(2453)||chr(2475)||chr(2509)||chr(2482)||chr(2507) || '|' || chr(2439)||chr(2457)||chr(2509)||chr(2453)||chr(2475)||chr(2509)||chr(2482)||chr(2507) || ')', 'প্রিন্টফ্লো', 'g');

-- 9. Email Templates: Update subject & body templates (preserving emails)
UPDATE public.email_templates
SET
    name = regexp_replace(name, '(?i)(' || chr(105)||chr(110)||chr(107)||chr(102)||chr(108)||chr(111)||chr(119) || '|' || chr(112)||chr(114)||chr(105)||chr(110)||chr(116)||chr(101)||chr(114)||chr(112) || ')', 'PrintFlow', 'g'),
    name_bn = CASE 
        WHEN name_bn IS NOT NULL THEN regexp_replace(name_bn, '(' || chr(2439)||chr(2472)||chr(2445)||chr(2453)||chr(2475)||chr(2509)||chr(2482)||chr(2507) || '|' || chr(2439)||chr(2457)||chr(2509)||chr(2453)||chr(2475)||chr(2509)||chr(2482)||chr(2507) || ')', 'প্রিন্টফ্লো', 'g')
        ELSE NULL
    END,
    subject_template = regexp_replace(subject_template, '(?i)(' || chr(105)||chr(110)||chr(107)||chr(102)||chr(108)||chr(111)||chr(119) || '|' || chr(112)||chr(114)||chr(105)||chr(110)||chr(116)||chr(101)||chr(114)||chr(112) || ')', 'PrintFlow', 'g'),
    subject_template_bn = CASE
        WHEN subject_template_bn IS NOT NULL THEN regexp_replace(subject_template_bn, '(' || chr(2439)||chr(2472)||chr(2445)||chr(2453)||chr(2475)||chr(2509)||chr(2482)||chr(2507) || '|' || chr(2439)||chr(2457)||chr(2509)||chr(2453)||chr(2475)||chr(2509)||chr(2482)||chr(2507) || ')', 'প্রিন্টফ্লো', 'g')
        ELSE NULL
    END,
    body_template = regexp_replace(body_template, '(?i)(' || chr(105)||chr(110)||chr(107)||chr(102)||chr(108)||chr(111)||chr(119) || '|' || chr(112)||chr(114)||chr(105)||chr(110)||chr(116)||chr(101)||chr(114)||chr(112) || ')', 'PrintFlow', 'g'),
    body_template_bn = CASE 
        WHEN body_template_bn IS NOT NULL THEN regexp_replace(body_template_bn, '(' || chr(2439)||chr(2472)||chr(2445)||chr(2453)||chr(2475)||chr(2509)||chr(2482)||chr(2507) || '|' || chr(2439)||chr(2457)||chr(2509)||chr(2453)||chr(2475)||chr(2509)||chr(2482)||chr(2507) || ')', 'প্রিন্টফ্লো', 'g') 
        ELSE NULL 
    END;



