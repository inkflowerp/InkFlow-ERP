-- ==============================================================================
-- InkFlow SaaS - Migration 063: Production Concurrency & Machine Scheduling Hardening
-- Supports:
--   1. PostgreSQL btree_gist extension for interval exclusion constraints
--   2. Database-level race-condition prevention on overlapping machine schedules
--   3. Atomic stored procedure for serialized machine booking with row-level locks
--   4. Strict multi-tenant security validation and maintenance interlocking
-- ==============================================================================

-- 1. ENABLE EXTENSION
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. EXCLUSION CONSTRAINT ON PRODUCTION TASKS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'exclude_production_tasks_machine_schedule_overlap'
    ) THEN
        ALTER TABLE public.production_tasks
        ADD CONSTRAINT exclude_production_tasks_machine_schedule_overlap
        EXCLUDE USING gist (
            company_id WITH =,
            assigned_machine_id WITH =,
            tstzrange(scheduled_start, scheduled_end, '[)') WITH &&
        )
        WHERE (
            assigned_machine_id IS NOT NULL 
            AND scheduled_start IS NOT NULL 
            AND scheduled_end IS NOT NULL 
            AND status NOT IN ('cancelled', 'completed')
        );
    END IF;
END $$;

-- 3. EXCLUSION CONSTRAINT ON MACHINERY ASSIGNMENTS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'exclude_machinery_assignments_schedule_overlap'
    ) THEN
        ALTER TABLE public.machinery_assignments
        ADD CONSTRAINT exclude_machinery_assignments_schedule_overlap
        EXCLUDE USING gist (
            company_id WITH =,
            machine_id WITH =,
            tstzrange(scheduled_start, scheduled_end, '[)') WITH &&
        )
        WHERE (
            status NOT IN ('cancelled', 'completed')
        );
    END IF;
END $$;

-- 4. ATOMIC SCHEDULING STORED FUNCTION WITH ROW-LEVEL LOCKING
CREATE OR REPLACE FUNCTION public.schedule_production_task_atomic(
    p_task_id UUID,
    p_company_id UUID,
    p_machine_id UUID,
    p_operator_id UUID,
    p_scheduled_start TIMESTAMPTZ,
    p_scheduled_end TIMESTAMPTZ,
    p_duration_minutes INTEGER,
    p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_task RECORD;
    v_machine RECORD;
    v_maint RECORD;
    v_overlap RECORD;
    v_updated_task RECORD;
BEGIN
    -- 1. Fetch and verify task
    SELECT * INTO v_task 
    FROM public.production_tasks 
    WHERE id = p_task_id AND company_id = p_company_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Production task not found' USING ERRCODE = 'P0002';
    END IF;

    -- 2. If machine is specified, lock machine row and verify status & capabilities
    IF p_machine_id IS NOT NULL THEN
        -- Row-level lock to serialize concurrent bookings on the same machine
        SELECT * INTO v_machine
        FROM public.machineries
        WHERE id = p_machine_id AND company_id = p_company_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Assigned machine not found' USING ERRCODE = 'P0002';
        END IF;

        IF v_machine.status = 'breakdown' THEN
            RAISE EXCEPTION 'Cannot schedule task on %: Machine is currently broken down.', v_machine.name USING ERRCODE = '23P01';
        END IF;
        IF v_machine.status = 'maintenance' THEN
            RAISE EXCEPTION 'Cannot schedule task on %: Machine is currently under maintenance.', v_machine.name USING ERRCODE = '23P01';
        END IF;
        IF v_machine.status IN ('retired', 'offline') THEN
            RAISE EXCEPTION 'Cannot schedule task on %: Machine is %.', v_machine.name, v_machine.status USING ERRCODE = '23P01';
        END IF;

        -- 3. Check maintenance schedule window conflicts (4-hour window estimate)
        SELECT * INTO v_maint
        FROM public.machinery_maintenances
        WHERE machine_id = p_machine_id 
          AND company_id = p_company_id
          AND status NOT IN ('completed', 'cancelled')
          AND scheduled_date IS NOT NULL
          AND (
              tstzrange(scheduled_date, scheduled_date + INTERVAL '4 hours', '[)') && 
              tstzrange(p_scheduled_start, p_scheduled_end, '[)')
          )
        LIMIT 1;

        IF FOUND THEN
            RAISE EXCEPTION 'Schedule conflict: Machine % has scheduled maintenance during this window.', v_machine.name USING ERRCODE = '23P01';
        END IF;

        -- 4. Check overlapping active production tasks
        SELECT * INTO v_overlap
        FROM public.production_tasks
        WHERE company_id = p_company_id
          AND assigned_machine_id = p_machine_id
          AND id != p_task_id
          AND status NOT IN ('cancelled', 'completed')
          AND scheduled_start IS NOT NULL
          AND scheduled_end IS NOT NULL
          AND (tstzrange(scheduled_start, scheduled_end, '[)') && tstzrange(p_scheduled_start, p_scheduled_end, '[)'))
        LIMIT 1;

        IF FOUND THEN
            RAISE EXCEPTION 'Schedule conflict: Machine % is already booked for Task % from % to %.', 
                v_machine.name, v_overlap.task_number, v_overlap.scheduled_start, v_overlap.scheduled_end 
            USING ERRCODE = '23P01';
        END IF;
    END IF;

    -- 5. Perform the update
    UPDATE public.production_tasks
    SET
        assigned_machine_id = p_machine_id,
        assigned_machine_name = CASE WHEN p_machine_id IS NOT NULL THEN v_machine.name ELSE NULL END,
        assigned_operator_id = COALESCE(p_operator_id, assigned_operator_id),
        scheduled_start = p_scheduled_start,
        scheduled_end = p_scheduled_end,
        estimated_duration_minutes = COALESCE(p_duration_minutes, estimated_duration_minutes, 60),
        status = CASE WHEN status = 'queued' THEN 'scheduled' ELSE status END,
        notes = COALESCE(p_notes, notes),
        updated_at = NOW()
    WHERE id = p_task_id AND company_id = p_company_id
    RETURNING * INTO v_updated_task;

    RETURN to_jsonb(v_updated_task);
END;
$$;
