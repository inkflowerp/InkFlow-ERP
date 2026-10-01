-- ==============================================================================
-- PrintERP SaaS - Migration 107: OpenWA Tenant WhatsApp Gateway & Multi-Tenant Infrastructure
-- Supports:
--   1. tenant_whatsapp_connections: Multi-tenant OpenWA session mapping & engine configuration
--   2. whatsapp_contacts: Tenant phone directory linked to customers and employees
--   3. whatsapp_chats: Inbound and outbound conversations ledger
--   4. whatsapp_messages: Immutable conversation timeline with ack status tracking
--   5. communication_jobs: Asynchronous transactional message queue with backoff & retry
--   6. otp_requests: Multi-channel cryptographic OTP ledger with SMS fallback
--   7. notification_preferences: Granular per-event multi-channel routing preferences
--   8. Granular RBAC Permissions: whatsapp.view, whatsapp.send, whatsapp.manage_connection, etc.
--   9. Strict Multi-Tenant Row Level Security (RLS) & Performance Indexes
-- ==============================================================================

-- 1. TENANT WHATSAPP CONNECTIONS
CREATE TABLE IF NOT EXISTS public.tenant_whatsapp_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'openwa',
    openwa_session_id TEXT NOT NULL,
    openwa_session_uuid TEXT,
    phone_number TEXT,
    phone_country_code TEXT DEFAULT '+880',
    display_name TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'qr_ready', 'connecting', 'connected', 'disconnected', 'logged_out', 'error', 'disabled')
    ),
    engine TEXT NOT NULL DEFAULT 'whatsapp-web.js',
    connected_at TIMESTAMPTZ,
    disconnected_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ,
    last_error TEXT,
    webhook_status TEXT DEFAULT 'unregistered',
    webhook_secret TEXT,
    daily_send_limit INTEGER NOT NULL DEFAULT 500,
    send_delay_seconds INTEGER NOT NULL DEFAULT 3,
    qr_code_raw TEXT,
    qr_code_updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_tenant_whatsapp_connection UNIQUE (tenant_id),
    CONSTRAINT uk_openwa_session_id UNIQUE (openwa_session_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_whatsapp_status ON public.tenant_whatsapp_connections(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_tenant_whatsapp_session ON public.tenant_whatsapp_connections(openwa_session_id);
ALTER TABLE public.tenant_whatsapp_connections ENABLE ROW LEVEL SECURITY;

-- 2. WHATSAPP CONTACTS
CREATE TABLE IF NOT EXISTS public.whatsapp_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL, -- Canonical BD 8801XXXXXXXXX or international digits
    display_name TEXT NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    contact_type TEXT NOT NULL DEFAULT 'customer' CHECK (
        contact_type IN ('customer', 'employee', 'other', 'unknown')
    ),
    avatar_url TEXT,
    is_opted_in BOOLEAN NOT NULL DEFAULT true,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_tenant_contact_phone UNIQUE (tenant_id, phone_number)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_tenant ON public.whatsapp_contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_phone ON public.whatsapp_contacts(tenant_id, phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_cust ON public.whatsapp_contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_emp ON public.whatsapp_contacts(employee_id);
ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;

-- 3. WHATSAPP CHATS
CREATE TABLE IF NOT EXISTS public.whatsapp_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    connection_id UUID NOT NULL REFERENCES public.tenant_whatsapp_connections(id) ON DELETE CASCADE,
    chat_id TEXT NOT NULL, -- e.g. 88017XXXXXXXX@c.us or groupJid@g.us
    contact_id UUID REFERENCES public.whatsapp_contacts(id) ON DELETE SET NULL,
    chat_type TEXT NOT NULL DEFAULT 'individual' CHECK (chat_type IN ('individual', 'group')),
    name TEXT NOT NULL,
    last_message_id UUID,
    last_message_body TEXT,
    last_message_at TIMESTAMPTZ,
    unread_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_tenant_whatsapp_chat UNIQUE (tenant_id, chat_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_tenant ON public.whatsapp_chats(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_recent ON public.whatsapp_chats(tenant_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_contact ON public.whatsapp_chats(contact_id);
ALTER TABLE public.whatsapp_chats ENABLE ROW LEVEL SECURITY;

-- 4. WHATSAPP MESSAGES
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    connection_id UUID NOT NULL REFERENCES public.tenant_whatsapp_connections(id) ON DELETE CASCADE,
    chat_id UUID NOT NULL REFERENCES public.whatsapp_chats(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.whatsapp_contacts(id) ON DELETE SET NULL,
    provider_message_id TEXT,
    direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
    message_type TEXT NOT NULL DEFAULT 'text' CHECK (
        message_type IN ('text', 'image', 'video', 'audio', 'document', 'location', 'contact', 'system', 'template', 'otp')
    ),
    body TEXT,
    media_url TEXT,
    media_mime_type TEXT,
    media_filename TEXT,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (
        status IN ('queued', 'sending', 'sent', 'delivered', 'read', 'failed', 'cancelled')
    ),
    sent_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    related_type TEXT, -- e.g. 'invoice', 'quotation', 'job', 'payment', 'delivery'
    related_id UUID,
    idempotency_key TEXT UNIQUE,
    error_code TEXT,
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_chat ON public.whatsapp_messages(chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_tenant ON public.whatsapp_messages(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_provider_id ON public.whatsapp_messages(provider_message_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_related ON public.whatsapp_messages(tenant_id, related_type, related_id);
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- 5. COMMUNICATION JOBS QUEUE
CREATE TABLE IF NOT EXISTS public.communication_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'sms', 'email')),
    provider TEXT NOT NULL DEFAULT 'openwa',
    recipient TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    related_type TEXT,
    related_id UUID,
    priority INTEGER NOT NULL DEFAULT 2, -- 1 = High (OTP/Security), 2 = Normal (Transactional), 3 = Low (Bulk)
    status TEXT NOT NULL DEFAULT 'queued' CHECK (
        status IN ('queued', 'processing', 'sent', 'delivered', 'failed', 'retrying', 'cancelled')
    ),
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 4,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_error TEXT,
    locked_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    idempotency_key TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comm_jobs_pending ON public.communication_jobs(status, next_attempt_at, priority)
    WHERE status IN ('queued', 'retrying');
CREATE INDEX IF NOT EXISTS idx_comm_jobs_tenant ON public.communication_jobs(tenant_id, created_at DESC);
ALTER TABLE public.communication_jobs ENABLE ROW LEVEL SECURITY;

-- 6. OTP REQUESTS (MULTI-CHANNEL)
CREATE TABLE IF NOT EXISTS public.otp_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    phone_number TEXT NOT NULL,
    purpose TEXT NOT NULL CHECK (
        purpose IN ('login', 'signup', 'phone_verification', 'password_reset', 'employee_activation', 'customer_verification', 'sensitive_action')
    ),
    channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'sms', 'email')),
    otp_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    resend_available_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '60 seconds'),
    is_verified BOOLEAN NOT NULL DEFAULT false,
    verified_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_requests_lookup ON public.otp_requests(phone_number, purpose, is_verified, expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_requests_user ON public.otp_requests(user_id);
ALTER TABLE public.otp_requests ENABLE ROW LEVEL SECURITY;

-- 7. NOTIFICATION PREFERENCES
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    in_app_enabled BOOLEAN NOT NULL DEFAULT true,
    whatsapp_enabled BOOLEAN NOT NULL DEFAULT true,
    sms_enabled BOOLEAN NOT NULL DEFAULT false,
    email_enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_tenant_event_pref UNIQUE (tenant_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_notif_pref_tenant ON public.notification_preferences(tenant_id);
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- 8. SEED GRANULAR WHATSAPP & COMMUNICATION PERMISSIONS
INSERT INTO public.permissions (code, module, name, description) VALUES
('whatsapp.view', 'whatsapp', 'View WhatsApp Inbox & Chats', 'Read conversations, message logs, and contact threads'),
('whatsapp.send', 'whatsapp', 'Send WhatsApp Messages', 'Compose and reply to customer and employee conversations'),
('whatsapp.send_customer', 'whatsapp', 'Send to Customers', 'Initiate transactional chats and updates with registered customers'),
('whatsapp.send_employee', 'whatsapp', 'Send to Employees', 'Dispatch notifications and production job assignments to staff'),
('whatsapp.send_bulk', 'whatsapp', 'Send Controlled Mass Messages', 'Launch consent-aware broadcast campaigns with rate limiting'),
('whatsapp.conversations', 'whatsapp', 'Manage Conversations', 'Archive, assign, and clear conversation threads'),
('whatsapp.manage_connection', 'whatsapp', 'Manage WhatsApp Connection', 'Link QR code, start, stop, or disconnect tenant WhatsApp session'),
('whatsapp.manage_templates', 'whatsapp', 'Manage WhatsApp Templates', 'Configure and customize bilingual transactional message templates'),
('whatsapp.logs', 'whatsapp', 'View Communication Logs', 'Audit outbound message receipts, latencies, and failure reports'),
('whatsapp.manage_otp', 'whatsapp', 'Manage OTP & Security Channels', 'Configure two-factor authentication rules and fallbacks')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    module = EXCLUDED.module;

-- 9. STRICT ROW LEVEL SECURITY (RLS) POLICIES

-- Tenant WhatsApp Connections RLS
CREATE POLICY "Tenant active users view their WhatsApp connection"
    ON public.tenant_whatsapp_connections FOR SELECT
    TO authenticated
    USING (
        public.auth_is_active_company_user(tenant_id)
        OR public.auth_is_platform_admin()
    );

CREATE POLICY "Tenant admins manage their WhatsApp connection"
    ON public.tenant_whatsapp_connections FOR ALL
    TO authenticated
    USING (
        (public.auth_is_active_company_user(tenant_id) AND public.auth_user_has_permission(tenant_id, 'whatsapp.manage_connection'))
        OR public.auth_is_platform_admin()
    )
    WITH CHECK (
        (public.auth_is_active_company_user(tenant_id) AND public.auth_user_has_permission(tenant_id, 'whatsapp.manage_connection'))
        OR public.auth_is_platform_admin()
    );

-- WhatsApp Contacts RLS
CREATE POLICY "Tenant active users view WhatsApp contacts"
    ON public.whatsapp_contacts FOR SELECT
    TO authenticated
    USING (
        public.auth_is_active_company_user(tenant_id)
        OR public.auth_is_platform_admin()
    );

CREATE POLICY "Authorized tenant users manage WhatsApp contacts"
    ON public.whatsapp_contacts FOR ALL
    TO authenticated
    USING (
        (public.auth_is_active_company_user(tenant_id) AND (
            public.auth_user_has_permission(tenant_id, 'whatsapp.send')
            OR public.auth_user_has_permission(tenant_id, 'customers.edit')
        ))
        OR public.auth_is_platform_admin()
    );

-- WhatsApp Chats RLS
CREATE POLICY "Tenant active users view WhatsApp chats"
    ON public.whatsapp_chats FOR SELECT
    TO authenticated
    USING (
        public.auth_is_active_company_user(tenant_id)
        OR public.auth_is_platform_admin()
    );

CREATE POLICY "Authorized tenant users manage WhatsApp chats"
    ON public.whatsapp_chats FOR ALL
    TO authenticated
    USING (
        (public.auth_is_active_company_user(tenant_id) AND public.auth_user_has_permission(tenant_id, 'whatsapp.send'))
        OR public.auth_is_platform_admin()
    );

-- WhatsApp Messages RLS
CREATE POLICY "Tenant active users view WhatsApp messages"
    ON public.whatsapp_messages FOR SELECT
    TO authenticated
    USING (
        public.auth_is_active_company_user(tenant_id)
        OR public.auth_is_platform_admin()
    );

CREATE POLICY "Authorized tenant users insert WhatsApp messages"
    ON public.whatsapp_messages FOR INSERT
    TO authenticated
    WITH CHECK (
        (public.auth_is_active_company_user(tenant_id) AND public.auth_user_has_permission(tenant_id, 'whatsapp.send'))
        OR public.auth_is_platform_admin()
    );

CREATE POLICY "Authorized tenant users update WhatsApp messages"
    ON public.whatsapp_messages FOR UPDATE
    TO authenticated
    USING (
        (public.auth_is_active_company_user(tenant_id) AND public.auth_user_has_permission(tenant_id, 'whatsapp.send'))
        OR public.auth_is_platform_admin()
    );

-- Communication Jobs Queue RLS
CREATE POLICY "Tenant users view own communication jobs"
    ON public.communication_jobs FOR SELECT
    TO authenticated
    USING (
        public.auth_is_active_company_user(tenant_id)
        OR public.auth_is_platform_admin()
    );

CREATE POLICY "System and authorized users enqueue communication jobs"
    ON public.communication_jobs FOR INSERT
    TO authenticated
    WITH CHECK (
        public.auth_is_active_company_user(tenant_id)
        OR public.auth_is_platform_admin()
    );

-- OTP Requests RLS (Strict: Service Role & Authenticated Self)
CREATE POLICY "Users can verify their own active OTP requests"
    ON public.otp_requests FOR SELECT
    TO authenticated
    USING (
        user_id = (SELECT auth.uid())
        OR (tenant_id IS NOT NULL AND public.auth_is_active_company_user(tenant_id))
        OR public.auth_is_platform_admin()
    );

CREATE POLICY "Platform admins and service role manage OTP requests"
    ON public.otp_requests FOR ALL
    TO authenticated
    USING (public.auth_is_platform_admin());

-- Notification Preferences RLS
CREATE POLICY "Tenant users view notification preferences"
    ON public.notification_preferences FOR SELECT
    TO authenticated
    USING (
        public.auth_is_active_company_user(tenant_id)
        OR public.auth_is_platform_admin()
    );

CREATE POLICY "Tenant admins manage notification preferences"
    ON public.notification_preferences FOR ALL
    TO authenticated
    USING (
        (public.auth_is_active_company_user(tenant_id) AND public.auth_user_has_permission(tenant_id, 'settings.edit'))
        OR public.auth_is_platform_admin()
    );
