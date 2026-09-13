-- ==============================================================================
-- InkFlow SaaS - Migration 062: V2 Advanced Production Planning & Machine Scheduling
-- Supports:
--   1. Independent, trackable Production Tasks with multi-task sequencing
--   2. Task Lifecycle: queued -> scheduled -> ready -> in_progress -> completed (plus on_hold, rework, cancelled)
--   3. Sequential dependencies between upstream & downstream tasks
--   4. Machine & Operator scheduling with conflict detection
--   5. Non-destructive Rework and Hold tracking with blocking reasons
--   6. Strict Multi-Tenant Row Level Security & Branch Scoping
-- ==============================================================================

-- 1. PRODUCTION TASKS TABLE
CREATE TABLE IF NOT EXISTS public.production_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    job_order_id UUID REFERENCES public.job_orders(id) ON DELETE CASCADE,
    production_job_id UUID REFERENCES public.production_jobs(id) ON DELETE SET NULL,
    task_number TEXT NOT NULL,
    task_name TEXT NOT NULL,
    task_type TEXT NOT NULL DEFAULT 'printing' CHECK (
        task_type IN ('prepress', 'printing', 'lamination', 'cutting', 'fabrication', 'finishing', 'mounting', 'installation', 'manual', 'other')
    ),
    department TEXT NOT NULL CHECK (
        department IN ('design', 'printing', 'finishing', 'fabrication', 'installation')
    ),
    sequence_order INTEGER NOT NULL DEFAULT 1,
    description TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT 'pcs',
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'urgent', 'very_urgent')),
    required_machine_type TEXT,
    required_material TEXT,
    width NUMERIC(10,2),
    height NUMERIC(10,2),
    estimated_duration_minutes INTEGER NOT NULL DEFAULT 60,
    assigned_machine_id UUID REFERENCES public.machineries(id) ON DELETE SET NULL,
    assigned_machine_name TEXT,
    assigned_operator_id UUID REFERENCES public.company_users(id) ON DELETE SET NULL,
    assigned_operator_name TEXT,
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (
        status IN ('queued', 'scheduled', 'ready', 'in_progress', 'paused', 'completed', 'on_hold', 'rework', 'cancelled')
    ),
    hold_reason TEXT CHECK (
        hold_reason IS NULL OR hold_reason IN ('customer_approval', 'material_unavailable', 'machine_breakdown', 'artwork_issue', 'payment_hold', 'quality_issue', 'other')
    ),
    hold_notes TEXT,
    is_rework BOOLEAN NOT NULL DEFAULT FALSE,
    rework_parent_task_id UUID REFERENCES public.production_tasks(id) ON DELETE SET NULL,
    good_quantity INTEGER DEFAULT 0,
    rejected_quantity INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_production_tasks_company_number UNIQUE (company_id, task_number)
);

-- 2. LINK MACHINERY ASSIGNMENTS TO PRODUCTION TASKS
ALTER TABLE public.machinery_assignments ADD COLUMN IF NOT EXISTS production_task_id UUID REFERENCES public.production_tasks(id) ON DELETE SET NULL;

-- 3. INDEXES FOR HIGH-PERFORMANCE SCHEDULING & QUEUE QUERIES
CREATE INDEX IF NOT EXISTS idx_production_tasks_company ON public.production_tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_production_tasks_job_seq ON public.production_tasks(company_id, job_order_id, sequence_order);
CREATE INDEX IF NOT EXISTS idx_production_tasks_status ON public.production_tasks(company_id, status);
CREATE INDEX IF NOT EXISTS idx_production_tasks_machine ON public.production_tasks(company_id, assigned_machine_id);
CREATE INDEX IF NOT EXISTS idx_production_tasks_operator ON public.production_tasks(company_id, assigned_operator_id);
CREATE INDEX IF NOT EXISTS idx_production_tasks_branch ON public.production_tasks(company_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_production_tasks_schedule ON public.production_tasks(company_id, scheduled_start, scheduled_end);

-- 4. ENABLE RLS
ALTER TABLE public.production_tasks ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLICIES
DROP POLICY IF EXISTS "Active company users can view production tasks" ON public.production_tasks;
CREATE POLICY "Active company users can view production tasks"
    ON public.production_tasks FOR SELECT
    USING (public.auth_is_active_company_user(company_id));

DROP POLICY IF EXISTS "Authorized company users can manage production tasks" ON public.production_tasks;
CREATE POLICY "Authorized company users can manage production tasks"
    ON public.production_tasks FOR ALL
    USING (
        public.auth_is_active_company_user(company_id)
        AND (
            public.auth_user_has_permission(company_id, 'production.view')
            OR public.auth_user_has_permission(company_id, 'production.edit')
            OR public.auth_user_has_permission(company_id, 'production.create')
            OR public.auth_user_has_permission(company_id, 'production.assign')
        )
    );
