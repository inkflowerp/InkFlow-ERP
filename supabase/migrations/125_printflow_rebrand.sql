-- ==============================================================================
-- Migration 125: PrintFlow Rebrand & Unified Domain / Purpose Hardening
-- 1. Updates auth_verifications check constraint to include 'subdomain_handoff'.
-- 2. Sets platform_system_settings defaults to PrintFlow and updates singleton row.
--    NOTE: contact_email is strictly preserved per project invariants.
-- 3. Updates email_gateways default sender_name to PrintFlow (leaving emails untouched).
-- 4. Updates system templates (message_templates, email_templates) from InkFlow to PrintFlow.
-- ==============================================================================

-- 1. Expand auth_verifications purpose check constraint to support subdomain_handoff
DO $$
BEGIN
    ALTER TABLE public.auth_verifications
        DROP CONSTRAINT IF EXISTS auth_verifications_purpose_check;

    ALTER TABLE public.auth_verifications
        ADD CONSTRAINT auth_verifications_purpose_check
        CHECK (purpose IN ('registration', 'password_reset', 'password_reset_auth', 'login_2fa', 'subdomain_handoff'));
END $$;

-- 2. Platform System Settings: Brand & Identity Updates
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
    maintenance_message = REPLACE(REPLACE(maintenance_message, 'InkFlow ERP', 'PrintFlow'), 'InkFlow', 'PrintFlow'),
    updated_at = NOW()
WHERE id = 'default';

-- 3. Email Gateways: Update sender_name to PrintFlow (preserving sender_email & reply_to_email)
UPDATE public.email_gateways
SET sender_name = 'PrintFlow'
WHERE sender_name IN ('InkFlow', 'InkFlow ERP', 'PrintERP')
   OR sender_name ILIKE '%InkFlow%'
   OR sender_name ILIKE '%PrintERP%';

-- 4. Message Templates: Update English & Bengali brand strings
UPDATE public.message_templates
SET
    name = REPLACE(REPLACE(name, 'InkFlow ERP', 'PrintFlow'), 'InkFlow', 'PrintFlow'),
    body_en = REPLACE(REPLACE(body_en, 'InkFlow ERP', 'PrintFlow'), 'InkFlow', 'PrintFlow'),
    body_bn = REPLACE(REPLACE(REPLACE(body_bn, 'ইনকফ্লো ইআরপি', 'প্রিন্টফ্লো'), 'ইনকফ্লো', 'প্রিন্টফ্লো'), 'ইঙ্কফ্লো', 'প্রিন্টফ্লো')
WHERE name ILIKE '%InkFlow%'
   OR body_en ILIKE '%InkFlow%'
   OR body_bn LIKE '%ইনকফ্লো%'
   OR body_bn LIKE '%ইঙ্কফ্লো%';

-- 5. Email Templates: Update subject & body templates (preserving emails)
UPDATE public.email_templates
SET
    name = REPLACE(REPLACE(name, 'InkFlow ERP', 'PrintFlow'), 'InkFlow', 'PrintFlow'),
    subject = REPLACE(REPLACE(subject, 'InkFlow ERP', 'PrintFlow'), 'InkFlow', 'PrintFlow'),
    html_body = REPLACE(REPLACE(html_body, 'InkFlow ERP', 'PrintFlow'), 'InkFlow', 'PrintFlow'),
    text_body = REPLACE(REPLACE(text_body, 'InkFlow ERP', 'PrintFlow'), 'InkFlow', 'PrintFlow')
WHERE name ILIKE '%InkFlow%'
   OR subject ILIKE '%InkFlow%'
   OR html_body ILIKE '%InkFlow%'
   OR (text_body IS NOT NULL AND text_body ILIKE '%InkFlow%');
