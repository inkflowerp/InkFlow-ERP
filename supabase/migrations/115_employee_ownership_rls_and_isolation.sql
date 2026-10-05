-- ==============================================================================
-- PrintFlow SaaS - Migration 115: Employee Ownership RLS & Data Isolation Hardening
-- Enforces:
--   1. Operators read and update only tasks assigned to them, their machine, or branch
--   2. Designers read and update only their assigned design jobs
--   3. General Staff read only their own attendance, payslips, and advances
--   4. Eliminates cross-employee payroll leaks using auth.uid() <-> employees.user_id mapping
-- ==============================================================================

-- 1. Helper function: resolve employee id for current auth.uid() within company
CREATE OR REPLACE FUNCTION public.auth_get_current_employee_id(p_company_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_employee_id UUID;
BEGIN
    IF auth.uid() IS NULL OR p_company_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT id INTO v_employee_id
    FROM public.employees
    WHERE user_id = auth.uid()
      AND company_id = p_company_id
      AND status = 'active'
    LIMIT 1;

    RETURN v_employee_id;
END;
$$;

-- 2. Helper function: resolve company_users id for current auth.uid() within company
CREATE OR REPLACE FUNCTION public.auth_get_current_company_user_id(p_company_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_company_user_id UUID;
BEGIN
    IF auth.uid() IS NULL OR p_company_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT id INTO v_company_user_id
    FROM public.company_users
    WHERE user_id = auth.uid()
      AND company_id = p_company_id
      AND status = 'active'
    LIMIT 1;

    RETURN v_company_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.auth_get_current_employee_id(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auth_get_current_company_user_id(UUID) TO authenticated, service_role;

-- ==============================================================================
-- 3. PAYROLL ITEMS RLS HARDENING (Zero cross-employee salary exposure)
-- ==============================================================================
DROP POLICY IF EXISTS "Active company users can view payroll items" ON public.payroll_items;
DROP POLICY IF EXISTS "Authorized company users can manage payroll items" ON public.payroll_items;
DROP POLICY IF EXISTS "payroll_items_select_scoped" ON public.payroll_items;
DROP POLICY IF EXISTS "payroll_items_manage_authorized" ON public.payroll_items;

CREATE POLICY "payroll_items_select_scoped"
    ON public.payroll_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.payroll_periods pp
            WHERE pp.id = payroll_items.payroll_period_id
              AND public.auth_is_active_company_user(pp.company_id)
              AND (
                  -- HR Managers, Owners, Accountants can view all payroll items
                  public.auth_user_has_permission(pp.company_id, 'hr.edit')
                  OR public.auth_user_has_permission(pp.company_id, 'hr.approve')
                  OR public.auth_user_has_permission(pp.company_id, 'payroll.view')
                  OR public.auth_user_has_permission(pp.company_id, 'payroll.edit')
                  OR public.auth_get_user_company_role(pp.company_id) IN ('business_owner', 'owner', 'branch_manager', 'accountant')
                  -- Individual employees can ONLY view their own payroll item
                  OR payroll_items.employee_id = public.auth_get_current_employee_id(pp.company_id)
              )
        )
    );

CREATE POLICY "payroll_items_manage_authorized"
    ON public.payroll_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.payroll_periods pp
            WHERE pp.id = payroll_items.payroll_period_id
              AND public.auth_is_active_company_user(pp.company_id)
              AND (
                  public.auth_user_has_permission(pp.company_id, 'payroll.edit')
                  OR public.auth_user_has_permission(pp.company_id, 'hr.edit')
                  OR public.auth_get_user_company_role(pp.company_id) IN ('business_owner', 'owner', 'branch_manager')
              )
        )
    );

-- ==============================================================================
-- 4. SALARY ADVANCES RLS HARDENING
-- ==============================================================================
DROP POLICY IF EXISTS "tenant_isolation_salary_advances" ON public.salary_advances;
DROP POLICY IF EXISTS "salary_advances_select_scoped" ON public.salary_advances;
DROP POLICY IF EXISTS "salary_advances_insert_scoped" ON public.salary_advances;
DROP POLICY IF EXISTS "salary_advances_manage_scoped" ON public.salary_advances;

CREATE POLICY "salary_advances_select_scoped"
    ON public.salary_advances FOR SELECT
    USING (
        public.auth_is_active_company_user(company_id)
        AND (
            public.auth_user_has_permission(company_id, 'hr.edit')
            OR public.auth_user_has_permission(company_id, 'hr.approve')
            OR public.auth_user_has_permission(company_id, 'payroll.view')
            OR public.auth_get_user_company_role(company_id) IN ('business_owner', 'owner', 'branch_manager', 'accountant')
            OR employee_id = public.auth_get_current_employee_id(company_id)
        )
    );

CREATE POLICY "salary_advances_insert_scoped"
    ON public.salary_advances FOR INSERT
    WITH CHECK (
        public.auth_is_active_company_user(company_id)
        AND (
            public.auth_user_has_permission(company_id, 'hr.edit')
            OR public.auth_user_has_permission(company_id, 'hr.create')
            OR public.auth_get_user_company_role(company_id) IN ('business_owner', 'owner', 'branch_manager')
            OR employee_id = public.auth_get_current_employee_id(company_id)
        )
    );

CREATE POLICY "salary_advances_manage_scoped"
    ON public.salary_advances FOR UPDATE
    USING (
        public.auth_is_active_company_user(company_id)
        AND (
            public.auth_user_has_permission(company_id, 'hr.edit')
            OR public.auth_user_has_permission(company_id, 'hr.approve')
            OR public.auth_get_user_company_role(company_id) IN ('business_owner', 'owner', 'branch_manager')
        )
    );

-- ==============================================================================
-- 5. ATTENDANCE RECORDS & DAILY ATTENDANCE RLS HARDENING
-- ==============================================================================
DROP POLICY IF EXISTS "Active company users can view attendances" ON public.attendances;
DROP POLICY IF EXISTS "Authorized company users can manage attendances" ON public.attendances;
DROP POLICY IF EXISTS "attendances_select_scoped" ON public.attendances;
DROP POLICY IF EXISTS "attendances_manage_scoped" ON public.attendances;

CREATE POLICY "attendances_select_scoped"
    ON public.attendances FOR SELECT
    USING (
        public.auth_is_active_company_user(company_id)
        AND (
            public.auth_user_has_permission(company_id, 'hr.edit')
            OR public.auth_user_has_permission(company_id, 'hr.approve')
            OR public.auth_get_user_company_role(company_id) IN ('business_owner', 'owner', 'branch_manager')
            OR employee_id = public.auth_get_current_employee_id(company_id)
        )
    );

CREATE POLICY "attendances_manage_scoped"
    ON public.attendances FOR ALL
    USING (
        public.auth_is_active_company_user(company_id)
        AND (
            public.auth_user_has_permission(company_id, 'hr.edit')
            OR public.auth_user_has_permission(company_id, 'hr.approve')
            OR public.auth_get_user_company_role(company_id) IN ('business_owner', 'owner', 'branch_manager')
        )
    );

DROP POLICY IF EXISTS "Company users can view attendance records" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance_records_select_scoped" ON public.attendance_records;

CREATE POLICY "attendance_records_select_scoped"
    ON public.attendance_records FOR SELECT
    USING (
        public.auth_is_active_company_user(company_id)
        AND (
            user_id = auth.uid()
            OR public.auth_user_has_permission(company_id, 'hr.edit')
            OR public.auth_user_has_permission(company_id, 'hr.approve')
            OR public.auth_get_user_company_role(company_id) IN ('business_owner', 'owner', 'branch_manager')
        )
    );

-- ==============================================================================
-- 6. PRODUCTION TASKS RLS HARDENING (Operator Scoping)
-- ==============================================================================
DROP POLICY IF EXISTS "Active company users can view production tasks" ON public.production_tasks;
DROP POLICY IF EXISTS "Authorized company users can manage production tasks" ON public.production_tasks;
DROP POLICY IF EXISTS "production_tasks_select_scoped" ON public.production_tasks;
DROP POLICY IF EXISTS "production_tasks_update_scoped" ON public.production_tasks;
DROP POLICY IF EXISTS "production_tasks_manage_authorized" ON public.production_tasks;
DROP POLICY IF EXISTS "production_tasks_delete_authorized" ON public.production_tasks;

CREATE POLICY "production_tasks_select_scoped"
    ON public.production_tasks FOR SELECT
    USING (
        public.auth_is_active_company_user(company_id)
        AND (
            -- Production managers, owners, and coordinators can view all tasks
            public.auth_get_user_company_role(company_id) IN ('business_owner', 'owner', 'branch_manager', 'production_manager', 'sales_manager')
            OR public.auth_user_has_permission(company_id, 'production.edit')
            OR public.auth_user_has_permission(company_id, 'production.create')
            OR public.auth_user_has_permission(company_id, 'production.assign')
            -- Operators can only view tasks assigned to them, their machines, or unassigned tasks in their branch
            OR assigned_operator_id = public.auth_get_current_company_user_id(company_id)
            OR assigned_machine_id IN (
                SELECT machine_id FROM public.machinery_assignments
                WHERE operator_id = public.auth_get_current_company_user_id(company_id)
            )
            OR (
                branch_id = (SELECT cu.branch_id FROM public.company_users cu WHERE cu.id = public.auth_get_current_company_user_id(company_id))
                AND (assigned_operator_id IS NULL OR status IN ('queued', 'scheduled', 'ready'))
            )
        )
    );

CREATE POLICY "production_tasks_update_scoped"
    ON public.production_tasks FOR UPDATE
    USING (
        public.auth_is_active_company_user(company_id)
        AND (
            public.auth_get_user_company_role(company_id) IN ('business_owner', 'owner', 'branch_manager', 'production_manager')
            OR public.auth_user_has_permission(company_id, 'production.edit')
            OR public.auth_user_has_permission(company_id, 'production.assign')
            -- Operators can update status/progress on their assigned tasks
            OR assigned_operator_id = public.auth_get_current_company_user_id(company_id)
            OR assigned_machine_id IN (
                SELECT machine_id FROM public.machinery_assignments
                WHERE operator_id = public.auth_get_current_company_user_id(company_id)
            )
        )
    );

CREATE POLICY "production_tasks_manage_authorized"
    ON public.production_tasks FOR INSERT
    WITH CHECK (
        public.auth_is_active_company_user(company_id)
        AND (
            public.auth_get_user_company_role(company_id) IN ('business_owner', 'owner', 'branch_manager', 'production_manager')
            OR public.auth_user_has_permission(company_id, 'production.create')
            OR public.auth_user_has_permission(company_id, 'production.edit')
        )
    );

CREATE POLICY "production_tasks_delete_authorized"
    ON public.production_tasks FOR DELETE
    USING (
        public.auth_is_active_company_user(company_id)
        AND (
            public.auth_get_user_company_role(company_id) IN ('business_owner', 'owner')
            OR public.auth_user_has_permission(company_id, 'production.delete')
        )
    );

-- ==============================================================================
-- 7. DESIGN JOBS RLS HARDENING (Designer Scoping)
-- ==============================================================================
DROP POLICY IF EXISTS "Active company users can view design jobs" ON public.design_jobs;
DROP POLICY IF EXISTS "Authorized company users can update design jobs" ON public.design_jobs;
DROP POLICY IF EXISTS "design_jobs_select_scoped" ON public.design_jobs;
DROP POLICY IF EXISTS "design_jobs_update_scoped" ON public.design_jobs;

CREATE POLICY "design_jobs_select_scoped"
    ON public.design_jobs FOR SELECT
    USING (
        public.auth_is_active_company_user(company_id)
        AND (
            -- Owners, sales managers, production managers can view all design jobs
            public.auth_get_user_company_role(company_id) IN ('business_owner', 'owner', 'branch_manager', 'sales_manager', 'production_manager')
            OR public.auth_user_has_permission(company_id, 'design.approve')
            OR public.auth_user_has_permission(company_id, 'orders.view')
            -- Individual Graphic Designers view their assigned jobs or unassigned intake
            OR designer_id = auth.uid()
            OR designer_id IS NULL
        )
    );

CREATE POLICY "design_jobs_update_scoped"
    ON public.design_jobs FOR UPDATE
    USING (
        public.auth_is_active_company_user(company_id)
        AND (
            public.auth_get_user_company_role(company_id) IN ('business_owner', 'owner', 'branch_manager', 'sales_manager', 'production_manager')
            OR public.auth_user_has_permission(company_id, 'design.edit')
            OR public.auth_user_has_permission(company_id, 'design.approve')
            -- Designers can update their assigned jobs
            OR designer_id = auth.uid()
        )
    );
