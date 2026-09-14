-- ==============================================================================
-- InkFlow ERP - Migration 069: Mobile + WhatsApp + SMS + Offline Sync
-- Multi-Tenant Outbox, Idempotent Sync, Unified Communication & Client Devices
-- ==============================================================================

-- 1. SYNC OUTBOX (Client-to-Server Sync Queue with Idempotency)
CREATE TABLE IF NOT EXISTS sync_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  idempotency_key VARCHAR(120) NOT NULL UNIQUE,
  device_id VARCHAR(100) NOT NULL,
  action_type VARCHAR(60) NOT NULL,
  entity_type VARCHAR(60) NOT NULL,
  entity_id VARCHAR(100),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(30) NOT NULL DEFAULT 'pending', -- pending, syncing, synced, conflict, failed, cancelled
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 5,
  last_error TEXT,
  conflict_details JSONB,
  server_version INTEGER DEFAULT 1,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_outbox_company_status ON sync_outbox(company_id, status);
CREATE INDEX IF NOT EXISTS idx_sync_outbox_idempotency ON sync_outbox(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_sync_outbox_device ON sync_outbox(company_id, device_id);

-- 2. COMMUNICATION MESSAGES (Unified Audit Log for WhatsApp, SMS, Email & In-App)
CREATE TABLE IF NOT EXISTS communication_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  channel VARCHAR(30) NOT NULL, -- whatsapp, sms, email, in_app, telegram
  recipient_name VARCHAR(150) NOT NULL,
  recipient_destination VARCHAR(150) NOT NULL, -- phone number or email address
  subject VARCHAR(255),
  template_key VARCHAR(100),
  variables JSONB DEFAULT '{}'::jsonb,
  message_content TEXT NOT NULL,
  attachment_url TEXT,
  attachment_name VARCHAR(255),
  provider VARCHAR(60) NOT NULL, -- meta_whatsapp, twilio, greenweb, bulksmsbd, ssl_wireless, gmail, resend, mock
  provider_message_id VARCHAR(150),
  status VARCHAR(30) NOT NULL DEFAULT 'queued', -- queued, sending, sent, delivered, read, failed
  error_code VARCHAR(50),
  error_message TEXT,
  attempts INTEGER NOT NULL DEFAULT 1,
  idempotency_key VARCHAR(120) UNIQUE,
  sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comm_messages_company ON communication_messages(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comm_messages_channel ON communication_messages(company_id, channel, status);
CREATE INDEX IF NOT EXISTS idx_comm_messages_recipient ON communication_messages(company_id, recipient_destination);
CREATE INDEX IF NOT EXISTS idx_comm_messages_idempotency ON communication_messages(idempotency_key);

-- 3. COMMUNICATION TEMPLATES (Configurable Multi-Channel Bilingual Message Templates)
CREATE TABLE IF NOT EXISTS communication_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  template_key VARCHAR(100) NOT NULL,
  name VARCHAR(150) NOT NULL,
  name_bn VARCHAR(150),
  channel VARCHAR(30) NOT NULL DEFAULT 'all', -- all, whatsapp, sms, email, in_app
  subject_en VARCHAR(255),
  subject_bn VARCHAR(255),
  body_en TEXT NOT NULL,
  body_bn TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_comm_template_company_key UNIQUE(company_id, template_key, channel)
);

CREATE INDEX IF NOT EXISTS idx_comm_templates_company ON communication_templates(company_id, is_active);

-- 4. CLIENT DEVICES (Registered Mobile/PWA Devices & Local Cache Tracking)
CREATE TABLE IF NOT EXISTS client_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id VARCHAR(100) NOT NULL,
  device_name VARCHAR(150),
  platform VARCHAR(50), -- android, ios, pwa, desktop_web
  app_version VARCHAR(30),
  push_subscription JSONB,
  last_ip_address VARCHAR(45),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_client_device_user UNIQUE(company_id, user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_client_devices_user ON client_devices(company_id, user_id);

-- 5. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE sync_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_devices ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES ENFORCING MULTI-TENANT ISOLATION

-- sync_outbox
DROP POLICY IF EXISTS "sync_outbox_tenant_isolation" ON sync_outbox;
CREATE POLICY "sync_outbox_tenant_isolation" ON sync_outbox
  FOR ALL USING (
    public.auth_is_active_company_user(company_id)
  );

-- communication_messages
DROP POLICY IF EXISTS "comm_messages_tenant_isolation" ON communication_messages;
CREATE POLICY "comm_messages_tenant_isolation" ON communication_messages
  FOR ALL USING (
    public.auth_is_active_company_user(company_id)
  );

-- communication_templates
DROP POLICY IF EXISTS "comm_templates_tenant_isolation" ON communication_templates;
CREATE POLICY "comm_templates_tenant_isolation" ON communication_templates
  FOR ALL USING (
    public.auth_is_active_company_user(company_id)
  );

-- client_devices
DROP POLICY IF EXISTS "client_devices_tenant_isolation" ON client_devices;
CREATE POLICY "client_devices_tenant_isolation" ON client_devices
  FOR ALL USING (
    public.auth_is_active_company_user(company_id)
  );
