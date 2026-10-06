-- ==============================================================================
-- Migration 127: Platform Landing Page Configuration & RLS
-- Stores draft and published configuration for the public marketing landing page.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.platform_landing_page (
    id TEXT PRIMARY KEY DEFAULT 'default',
    is_published BOOLEAN NOT NULL DEFAULT true,
    published_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    draft_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    published_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    published_by UUID REFERENCES public.platform_admins(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_by UUID REFERENCES public.platform_admins(id)
);

ALTER TABLE public.platform_landing_page ENABLE ROW LEVEL SECURITY;

-- Allow public read of published landing page configuration
DROP POLICY IF EXISTS "platform_landing_page_public_select" ON public.platform_landing_page;
CREATE POLICY "platform_landing_page_public_select"
    ON public.platform_landing_page
    FOR SELECT
    TO anon, authenticated
    USING (is_published = true);

-- Platform admins can select both draft and published configuration
DROP POLICY IF EXISTS "platform_landing_page_admin_select" ON public.platform_landing_page;
CREATE POLICY "platform_landing_page_admin_select"
    ON public.platform_landing_page
    FOR SELECT
    TO authenticated
    USING (public.auth_is_platform_admin());

-- Platform admins can update landing page configuration
DROP POLICY IF EXISTS "platform_landing_page_admin_all" ON public.platform_landing_page;
CREATE POLICY "platform_landing_page_admin_all"
    ON public.platform_landing_page
    FOR ALL
    TO authenticated
    USING (public.auth_is_platform_admin())
    WITH CHECK (public.auth_is_platform_admin());

-- Seed default singleton record
INSERT INTO public.platform_landing_page (
    id,
    is_published,
    published_config,
    draft_config
) VALUES (
    'default',
    true,
    '{}'::jsonb,
    '{}'::jsonb
) ON CONFLICT (id) DO NOTHING;
