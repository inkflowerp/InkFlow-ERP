-- ==============================================================================
-- Migration 123: Preference-Aware Notification System, Atomic Queue Worker & Business Rules
-- Supports per-user & tenant notification preferences, quiet hours in Asia/Dhaka,
-- atomic FOR UPDATE SKIP LOCKED job claiming, business rules, and message templates.
-- ==============================================================================

-- 1. Upgrade notification_preferences
ALTER TABLE IF EXISTS public.notification_preferences
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS quiet_hours_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quiet_hours_start text NOT NULL DEFAULT '22:00',
  ADD COLUMN IF NOT EXISTS quiet_hours_end text NOT NULL DEFAULT '08:00';

-- Drop old unique constraint if present
ALTER TABLE IF EXISTS public.notification_preferences
  DROP CONSTRAINT IF EXISTS uk_tenant_event_pref;

ALTER TABLE IF EXISTS public.notification_preferences
  DROP CONSTRAINT IF EXISTS uk_notif_pref_tenant_event_user;

ALTER TABLE public.notification_preferences
  ADD CONSTRAINT uk_notif_pref_tenant_event_user UNIQUE NULLS NOT DISTINCT (tenant_id, event_type, user_id);

CREATE INDEX IF NOT EXISTS idx_notif_pref_tenant_user
  ON public.notification_preferences (tenant_id, user_id);

-- 2. Upgrade message_templates check constraint
ALTER TABLE IF EXISTS public.message_templates
  DROP CONSTRAINT IF EXISTS message_templates_channel_check;

ALTER TABLE IF EXISTS public.message_templates
  ADD CONSTRAINT message_templates_channel_check
  CHECK (channel = ANY (ARRAY['all'::text, 'whatsapp'::text, 'sms'::text, 'email'::text, 'in_app'::text]));

-- 3. Upgrade communication_jobs status constraint & dead-letter tracking
ALTER TABLE IF EXISTS public.communication_jobs
  DROP CONSTRAINT IF EXISTS communication_jobs_status_check;

ALTER TABLE IF EXISTS public.communication_jobs
  ADD CONSTRAINT communication_jobs_status_check
  CHECK (status = ANY (ARRAY['queued'::text, 'processing'::text, 'sent'::text, 'delivered'::text, 'failed'::text, 'retrying'::text, 'cancelled'::text, 'dead_letter'::text]));

ALTER TABLE IF EXISTS public.communication_jobs
  ADD COLUMN IF NOT EXISTS is_dead_letter boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS provider_response jsonb DEFAULT '{}'::jsonb;

-- 4. Atomic FOR UPDATE SKIP LOCKED Queue Claiming Function
CREATE OR REPLACE FUNCTION public.fn_claim_communication_jobs(
  p_limit integer DEFAULT 25,
  p_worker_id text DEFAULT 'worker'
)
RETURNS SETOF public.communication_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH selected AS (
    SELECT id
    FROM public.communication_jobs
    WHERE status IN ('queued', 'retrying')
      AND (next_attempt_at IS NULL OR next_attempt_at <= now())
      AND (next_retry_at IS NULL OR next_retry_at <= now())
    ORDER BY priority ASC, created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT p_limit
  )
  UPDATE public.communication_jobs c
  SET status = 'processing',
      locked_at = now(),
      updated_at = now()
  FROM selected
  WHERE c.id = selected.id
  RETURNING c.*;
END;
$$;

-- 5. Business Rules Table (Configurable per tenant)
CREATE TABLE IF NOT EXISTS public.notification_business_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  rule_type text NOT NULL, -- 'overdue_invoice', 'low_stock', 'production_deadline'
  is_enabled boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  channels text[] NOT NULL DEFAULT ARRAY['in_app', 'whatsapp', 'email'],
  last_evaluated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uk_company_rule_type UNIQUE (company_id, rule_type)
);

ALTER TABLE public.notification_business_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_business_rules FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for notification_business_rules" ON public.notification_business_rules;
CREATE POLICY "Tenant isolation for notification_business_rules"
  ON public.notification_business_rules
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_notif_rules_company
  ON public.notification_business_rules (company_id, is_enabled);

-- 6. Helper Function to seed default templates & rules for a company
CREATE OR REPLACE FUNCTION public.fn_seed_default_notifications_for_company(p_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Default message templates
  INSERT INTO public.message_templates (company_id, template_key, name, channel, body_en, body_bn)
  VALUES
    (p_company_id, 'invoice_created', 'Invoice Created', 'all',
     'Invoice #{{invoice_number}} for {{customer_name}} created. Amount: ৳{{amount}}.',
     'গ্রাহক {{customer_name}} এর জন্য ইনভয়েস #{{invoice_number}} তৈরি হয়েছে। মোট: ৳{{amount}}।'),
    (p_company_id, 'invoice_overdue', 'Invoice Overdue Reminder', 'all',
     'Reminder: Invoice #{{invoice_number}} for ৳{{due_amount}} is overdue. Please settle promptly.',
     'জরুরী তাগাদা: ইনভয়েস #{{invoice_number}} এর বকেয়া ৳{{due_amount}} পরিশোধের সময় অতিক্রান্ত হয়েছে।'),
    (p_company_id, 'payment_received', 'Payment Receipt', 'all',
     'Payment of ৳{{amount}} received for Invoice #{{invoice_number}}. Balance due: ৳{{due_amount}}.',
     'ইনভয়েস #{{invoice_number}} বাবদ ৳{{amount}} পরিশোধ গ্রহণ করা হয়েছে। অবশিষ্ট বাকি: ৳{{due_amount}}।'),
    (p_company_id, 'quotation_approved', 'Quotation Approved', 'all',
     'Quotation #{{quotation_number}} for {{customer_name}} has been approved. Ready for work order.',
     'গ্রাহক {{customer_name}} এর কোটেশন #{{quotation_number}} অনুমোদিত হয়েছে। ওয়ার্ক অর্ডারের জন্য প্রস্তুত।'),
    (p_company_id, 'design_feedback', 'Design Feedback Submitted', 'all',
     'New feedback on Design #{{design_number}}: "{{comment}}". Please review revisions.',
     'ডিজাইন #{{design_number}} এর উপর নতুন মন্তব্য এসেছে: "{{comment}}"'),
    (p_company_id, 'production_delay', 'Production Delay Alert', 'all',
     'Job #{{job_number}} is delayed: {{reason}}. New estimated completion: {{new_eta}}.',
     'জব #{{job_number}} বিলম্বিত হচ্ছে: {{reason}}। নতুন সম্ভাব্য সময়: {{new_eta}}।'),
    (p_company_id, 'production_problem', 'Production Problem Reported', 'all',
     'Problem reported on Task #{{task_number}} ({{machine_name}}): {{problem_type}} - {{description}}.',
     'টাস্ক #{{task_number}} ({{machine_name}}) এ সমস্যা রিপোর্ট করা হয়েছে: {{problem_type}} - {{description}}।'),
    (p_company_id, 'low_stock', 'Low Stock Warning', 'all',
     'Low Stock Alert: {{item_name}} balance is {{current_stock}} {{unit}} (Reorder level: {{reorder_level}}).',
     'মজুদ ঘাটতি সতর্কতা: {{item_name}} এর বর্তমান মজুদ {{current_stock}} {{unit}} (সর্বনিম্ন সীমা: {{reorder_level}})।'),
    (p_company_id, 'attendance_exception', 'Attendance Exception', 'in_app',
     'Attendance Alert: {{employee_name}} marked {{status}} on {{date}}.',
     'উপস্থিতি সতর্কতা: {{employee_name}} এর উপস্থিতি {{date}} তারিখে {{status}} হিসেবে রেকর্ড হয়েছে।'),
    (p_company_id, 'subscription_state', 'Subscription Status Notice', 'all',
     'Subscription Update: Your plan {{plan_name}} status is now {{status}}.',
     'সাবস্ক্রিপশন আপডেট: আপনার প্ল্যান {{plan_name}} এর বর্তমান অবস্থা: {{status}}।'),
    (p_company_id, 'support_reply', 'Support Ticket Reply', 'all',
     'New response on Support Ticket #{{ticket_number}}: {{preview}}.',
     'সাপোর্ট টিকিট #{{ticket_number}} এ নতুন উত্তর এসেছে: {{preview}}।')
  ON CONFLICT (company_id, template_key) DO NOTHING;

  -- Default business rules
  INSERT INTO public.notification_business_rules (company_id, rule_type, is_enabled, config, channels)
  VALUES
    (p_company_id, 'overdue_invoice', true, '{"before_due_days": 3, "on_due_date": true, "after_due_days": [3, 7]}'::jsonb, ARRAY['in_app', 'whatsapp', 'email']),
    (p_company_id, 'low_stock', true, '{"check_frequency_hours": 6, "notify_owner": true}'::jsonb, ARRAY['in_app', 'email']),
    (p_company_id, 'production_deadline', true, '{"warning_hours_before": 24, "notify_manager": true}'::jsonb, ARRAY['in_app', 'whatsapp'])
  ON CONFLICT (company_id, rule_type) DO NOTHING;
END;
$$;

-- 7. Seed for all existing companies
DO $$
DECLARE
  comp RECORD;
BEGIN
  FOR comp IN SELECT id FROM public.companies LOOP
    PERFORM public.fn_seed_default_notifications_for_company(comp.id);
  END LOOP;
END;
$$;

-- 8. Expand in_app_notifications type check constraint
DO $$
BEGIN
  ALTER TABLE public.in_app_notifications DROP CONSTRAINT IF EXISTS in_app_notifications_type_check;
  ALTER TABLE public.in_app_notifications ADD CONSTRAINT in_app_notifications_type_check CHECK (
    type IN (
      'invoice_created', 'invoice_overdue', 'payment_received',
      'quotation_approved', 'design_feedback', 'production_delay',
      'production_problem', 'low_stock', 'attendance_exception',
      'subscription_state', 'support_reply',
      'new_order', 'design_revision', 'artwork_approved',
      'production_completed', 'delivery_scheduled', 'overdue_invoice',
      'leave_approval', 'invoice_request', 'design_ready',
      'customer_approval_needed', 'production_gate_cleared', 'production_ready'
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

