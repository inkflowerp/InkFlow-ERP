-- Migration 114: Add invitation_expires_at to public.company_users and enforce expiry

ALTER TABLE public.company_users
ADD COLUMN IF NOT EXISTS invitation_expires_at timestamptz DEFAULT (now() + interval '7 days');

-- Update any existing pending invitations with a 7-day expiration if null
UPDATE public.company_users
SET invitation_expires_at = created_at + interval '7 days'
WHERE status = 'invited' AND invitation_expires_at IS NULL;
