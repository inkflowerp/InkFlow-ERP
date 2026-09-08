-- ==============================================================================
-- PrintERP SaaS - Migration 028: Workflow Automation Engine
-- Supports:
--   1. Declarative Workflow Rules with Structured Triggers & Actions
--   2. Workflow Execution Audit Logs
--   3. Pre-Seeded Printing Industry Workflows
--   4. Multi-Tenant Row Level Security (RLS)
-- ==============================================================================

-- 1. WORKFLOW RULES TABLE
create table if not exists public.workflow_rules (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    name text not null,
    description text,
    is_active boolean not null default true,
    trigger_type text not null check (
        trigger_type in (
            'record_created',
            'status_changed',
            'payment_received',
            'date_reached',
            'stock_threshold',
            'approval_completed'
        )
    ),
    trigger_entity text not null check (
        trigger_entity in (
            'quotation',
            'order',
            'design',
            'job',
            'invoice',
            'payment',
            'material',
            'delivery',
            'customer'
        )
    ),
    trigger_config jsonb not null default '{}'::jsonb,
    conditions jsonb not null default '[]'::jsonb,
    actions jsonb not null default '[]'::jsonb,
    execution_count int not null default 0,
    last_executed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_workflow_rules_comp_trigger on public.workflow_rules(company_id, trigger_type, trigger_entity);
alter table public.workflow_rules enable row level security;

-- 2. WORKFLOW EXECUTION LOGS TABLE
create table if not exists public.workflow_execution_logs (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    rule_id uuid references public.workflow_rules(id) on delete set null,
    rule_name text not null,
    trigger_type text not null,
    entity_type text not null,
    entity_id text,
    status text not null check (status in ('success', 'failed', 'skipped')),
    actions_taken jsonb not null default '[]'::jsonb,
    error_message text,
    executed_at timestamptz not null default now()
);

create index if not exists idx_wf_exec_logs_comp on public.workflow_execution_logs(company_id, executed_at desc);
alter table public.workflow_execution_logs enable row level security;

-- 3. ROW LEVEL SECURITY (RLS) POLICIES
create policy "Company members can view workflow rules"
    on public.workflow_rules for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized users can manage workflow rules"
    on public.workflow_rules for all
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_user_has_permission(company_id, 'settings.edit')
            or public.auth_is_platform_owner()
        )
    );

create policy "Company members can view workflow logs"
    on public.workflow_execution_logs for select
    using (public.auth_is_active_company_user(company_id));

create policy "System can insert workflow execution logs"
    on public.workflow_execution_logs for insert
    with check (
        public.auth_is_active_company_user(company_id)
        or public.auth_is_platform_owner()
    );

-- 4. PRE-SEEDED WORKFLOW RULES (Inserted for all existing companies)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.companies LOOP
        INSERT INTO public.workflow_rules (
            company_id, name, description, is_active, trigger_type, trigger_entity, trigger_config, conditions, actions, execution_count
        ) VALUES
        (r.id, 'Quotation Approved ➔ Auto-Create Order', 'Automatically converts an approved quotation into a booked Job Order with media specifications.', true, 'status_changed', 'quotation', '{"to_status": "approved"}'::jsonb, '[]'::jsonb, '[{"type": "create_document", "config": {"target_document": "order", "copy_items": true}}, {"type": "send_notification", "config": {"title": "New Order Generated", "message": "Order created automatically from approved quote."}}]'::jsonb, 0),
        (r.id, 'Order Confirmed ➔ Create Production Jobs', 'Generates digital press or CNC acrylic fabrication job tickets upon order confirmation.', true, 'status_changed', 'order', '{"to_status": "confirmed"}'::jsonb, '[]'::jsonb, '[{"type": "create_document", "config": {"target_document": "production_job"}}, {"type": "change_status", "config": {"target": "order", "new_status": "in_prepress"}}]'::jsonb, 0),
        (r.id, 'Design Approved ➔ Route to Production Press', 'Routes prepress approved vector artwork to the allocated print machine floor queue.', true, 'approval_completed', 'design', '{"approval_type": "prepress_proof"}'::jsonb, '[]'::jsonb, '[{"type": "change_status", "config": {"target": "job", "new_status": "queued_for_print"}}, {"type": "send_notification", "config": {"title": "Artwork Approved for Press", "message": "Job sent to Konica/Roland press queue."}}]'::jsonb, 0),
        (r.id, 'Production Completed ➔ Notify Sales Team', 'Alerts sales representatives when the print job finishes and passes QC inspection.', true, 'status_changed', 'job', '{"to_status": "completed"}'::jsonb, '[]'::jsonb, '[{"type": "send_notification", "config": {"title": "Job Print Complete", "role": "sales_manager", "message": "Print and finishing completed for order."}}, {"type": "send_whatsapp", "config": {"template": "order_ready_client", "recipient": "customer_phone"}}]'::jsonb, 0),
        (r.id, 'Order Ready ➔ Create Delivery Task', 'Creates a dispatch challan and assigns an installation/delivery rider.', true, 'status_changed', 'order', '{"to_status": "ready"}'::jsonb, '[]'::jsonb, '[{"type": "create_task", "config": {"task_type": "delivery", "priority": "high"}}, {"type": "assign_employee", "config": {"role": "delivery_rider"}}]'::jsonb, 0),
        (r.id, 'Invoice Overdue ➔ Multi-Channel Reminder', 'Dispatches SMS and WhatsApp payment reminder when invoice reaches overdue status.', true, 'date_reached', 'invoice', '{"condition": "overdue_days >= 3"}'::jsonb, '[{"field": "due_amount", "operator": "greater_than", "value": 0}]'::jsonb, '[{"type": "send_sms", "config": {"message": "Gentle reminder: Your invoice is overdue. Kindly settle via bKash/Bank."}}, {"type": "create_task", "config": {"task_type": "payment_follow_up", "assign_to": "accountant"}}]'::jsonb, 0),
        (r.id, 'Stock Below Minimum ➔ Alert Purchase Manager', 'Alerts raw material procurement team when roll media or ink chemistry breaches reorder point.', true, 'stock_threshold', 'material', '{"threshold_type": "below_min_stock_level"}'::jsonb, '[]'::jsonb, '[{"type": "send_notification", "config": {"title": "Low Stock Reorder Alert", "message": "Material level breached safety buffer. Reorder required."}}, {"type": "create_task", "config": {"task_type": "rfq_supplier", "priority": "urgent"}}]'::jsonb, 0);
    END LOOP;
END $$;

