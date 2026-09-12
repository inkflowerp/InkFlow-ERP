-- ==============================================================================
-- InkFlow SaaS - Migration 050: Authoritative Platform Notifications & Real-Time Replication
-- Supports:
--   1. Real-time Platform Notifications Ledger (Admin alerts, Telemetry, Broadcasts, Security, Support)
--   2. Strict Row Level Security (RLS) allowing only verified platform administrators
--   3. Complete Tenant Isolation: Tenant users cannot view or subscribe to platform notifications
--   4. REPLICA IDENTITY FULL & supabase_realtime publication membership for live updates
--   5. High-performance composite indexes for real-time query pagination & filtering
-- ==============================================================================

-- 1. CREATE PLATFORM NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.platform_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
    type TEXT NOT NULL DEFAULT 'broadcast', -- 'broadcast', 'support', 'tenant', 'tenant_lifecycle', 'billing', 'security', 'system', 'usage_warning', 'general'
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    company_name TEXT,
    action_url TEXT,
    target_audience TEXT NOT NULL DEFAULT 'all_admins', -- 'all_admins', 'all_tenants', 'specific_tenant', 'specific_user'
    recipient_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. CREATE PERFORMANCE INDEXES FOR REAL-TIME FILTERING & PAGINATION
CREATE INDEX IF NOT EXISTS idx_platform_notifs_created 
    ON public.platform_notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_notifs_unread 
    ON public.platform_notifications(is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_notifs_type 
    ON public.platform_notifications(type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_notifs_severity 
    ON public.platform_notifications(severity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_notifs_recipient 
    ON public.platform_notifications(recipient_user_id) 
    WHERE recipient_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_platform_notifs_company 
    ON public.platform_notifications(company_id) 
    WHERE company_id IS NOT NULL;

-- 3. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.platform_notifications ENABLE ROW LEVEL SECURITY;

-- 4. STRICT RLS POLICIES FOR PLATFORM NOTIFICATIONS
-- A. SELECT: Only active platform administrators can view platform notifications.
--    Tenant users (company_users) evaluate auth_is_platform_admin() to false and receive ZERO rows.
DROP POLICY IF EXISTS "Active platform admins can view platform notifications" ON public.platform_notifications;
CREATE POLICY "Active platform admins can view platform notifications"
    ON public.platform_notifications FOR SELECT
    USING (
        public.auth_is_platform_admin() 
        AND (recipient_user_id IS NULL OR recipient_user_id = auth.uid())
    );

-- B. INSERT: Platform admins or internal database service functions can insert notifications.
DROP POLICY IF EXISTS "Authorized platform admins and service can insert platform notifications" ON public.platform_notifications;
CREATE POLICY "Authorized platform admins and service can insert platform notifications"
    ON public.platform_notifications FOR INSERT
    WITH CHECK (
        public.auth_is_platform_admin() 
        OR auth.uid() IS NULL
    );

-- C. UPDATE: Platform admins can update their own read state or notifications.
DROP POLICY IF EXISTS "Active platform admins can update platform notifications" ON public.platform_notifications;
CREATE POLICY "Active platform admins can update platform notifications"
    ON public.platform_notifications FOR UPDATE
    USING (
        public.auth_is_platform_admin() 
        AND (recipient_user_id IS NULL OR recipient_user_id = auth.uid())
    )
    WITH CHECK (
        public.auth_is_platform_admin()
    );

-- D. DELETE: Active platform admins can delete/dismiss platform notifications.
DROP POLICY IF EXISTS "Active platform admins can delete platform notifications" ON public.platform_notifications;
CREATE POLICY "Active platform admins can delete platform notifications"
    ON public.platform_notifications FOR DELETE
    USING (
        public.auth_is_platform_admin()
    );

-- 5. ENABLE REPLICA IDENTITY FULL FOR SUPABASE REALTIME REPLICATION
ALTER TABLE public.platform_notifications REPLICA IDENTITY FULL;

-- 6. ADD TABLE TO supabase_realtime PUBLICATION
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'platform_notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_notifications;
    END IF;
END $$;
