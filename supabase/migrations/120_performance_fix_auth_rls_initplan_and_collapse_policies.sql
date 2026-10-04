-- Migration 120: Fix Auth RLS InitPlan and Collapse Multiple Permissive Policies
-- Resolves auth_rls_initplan warnings by wrapping auth.uid() and helper functions with (select ...)
-- Collapses multiple permissive policies into uniform single policies per role+action (SELECT, INSERT, UPDATE, DELETE)

-- ==============================================================================
-- Table: additional_options
-- ==============================================================================
DROP POLICY IF EXISTS "additional_options_delete_tenant" ON public.additional_options;
DROP POLICY IF EXISTS "additional_options_insert_tenant" ON public.additional_options;
DROP POLICY IF EXISTS "additional_options_select_tenant" ON public.additional_options;
DROP POLICY IF EXISTS "additional_options_update_tenant" ON public.additional_options;
DROP POLICY IF EXISTS "additional_options_tenant_select_policy" ON public.additional_options;
CREATE POLICY "additional_options_tenant_select_policy" ON public.additional_options
    FOR SELECT TO authenticated
    USING (
      (((company_id = (( SELECT ((select auth.jwt()) ->> 'company_id'::text)))::uuid) OR (( SELECT ((select auth.jwt()) ->> 'role'::text)) = 'platform_admin'::text)))
    );
DROP POLICY IF EXISTS "additional_options_tenant_insert_policy" ON public.additional_options;
CREATE POLICY "additional_options_tenant_insert_policy" ON public.additional_options
    FOR INSERT TO authenticated
    WITH CHECK (
      (((company_id = (( SELECT ((select auth.jwt()) ->> 'company_id'::text)))::uuid) OR (( SELECT ((select auth.jwt()) ->> 'role'::text)) = 'platform_admin'::text)))
    );
DROP POLICY IF EXISTS "additional_options_tenant_update_policy" ON public.additional_options;
CREATE POLICY "additional_options_tenant_update_policy" ON public.additional_options
    FOR UPDATE TO authenticated
    USING (
      (((company_id = (( SELECT ((select auth.jwt()) ->> 'company_id'::text)))::uuid) OR (( SELECT ((select auth.jwt()) ->> 'role'::text)) = 'platform_admin'::text)))
    )
    WITH CHECK (
      (((company_id = (( SELECT ((select auth.jwt()) ->> 'company_id'::text)))::uuid) OR (( SELECT ((select auth.jwt()) ->> 'role'::text)) = 'platform_admin'::text)))
    );
DROP POLICY IF EXISTS "additional_options_tenant_delete_policy" ON public.additional_options;
CREATE POLICY "additional_options_tenant_delete_policy" ON public.additional_options
    FOR DELETE TO authenticated
    USING (
      (((company_id = (( SELECT ((select auth.jwt()) ->> 'company_id'::text)))::uuid) OR (( SELECT ((select auth.jwt()) ->> 'role'::text)) = 'platform_admin'::text)))
    );

-- ==============================================================================
-- Table: attendance_corrections
-- ==============================================================================
DROP POLICY IF EXISTS "Company users can create attendance corrections" ON public.attendance_corrections;
DROP POLICY IF EXISTS "Company users can view own or authorized attendance corrections" ON public.attendance_corrections;
DROP POLICY IF EXISTS "Authorized HR users can review attendance corrections" ON public.attendance_corrections;
DROP POLICY IF EXISTS "attendance_corrections_tenant_select_policy" ON public.attendance_corrections;
CREATE POLICY "attendance_corrections_tenant_select_policy" ON public.attendance_corrections
    FOR SELECT TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND ((requested_by = (select auth.uid())) OR auth_user_has_permission(company_id, 'hr.view'::text) OR auth_user_has_permission(company_id, 'hr.edit'::text) OR auth_user_has_permission(company_id, 'hr.approve'::text))))
    );
DROP POLICY IF EXISTS "attendance_corrections_tenant_insert_policy" ON public.attendance_corrections;
CREATE POLICY "attendance_corrections_tenant_insert_policy" ON public.attendance_corrections
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (requested_by = (select auth.uid()))))
    );
DROP POLICY IF EXISTS "attendance_corrections_tenant_update_policy" ON public.attendance_corrections;
CREATE POLICY "attendance_corrections_tenant_update_policy" ON public.attendance_corrections
    FOR UPDATE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'hr.edit'::text) OR auth_user_has_permission(company_id, 'hr.approve'::text))))
    )
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'hr.edit'::text) OR auth_user_has_permission(company_id, 'hr.approve'::text))))
    );

-- ==============================================================================
-- Table: attendance_locations
-- ==============================================================================
DROP POLICY IF EXISTS "Authorized company users can manage attendance locations" ON public.attendance_locations;
DROP POLICY IF EXISTS "Active company users can view attendance locations" ON public.attendance_locations;
DROP POLICY IF EXISTS "attendance_locations_tenant_select_policy" ON public.attendance_locations;
CREATE POLICY "attendance_locations_tenant_select_policy" ON public.attendance_locations
    FOR SELECT TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'settings.manage'::text) OR auth_user_has_permission(company_id, 'hr.edit'::text) OR auth_user_has_permission(company_id, 'hr.create'::text))))
      OR ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "attendance_locations_tenant_insert_policy" ON public.attendance_locations;
CREATE POLICY "attendance_locations_tenant_insert_policy" ON public.attendance_locations
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'settings.manage'::text) OR auth_user_has_permission(company_id, 'hr.edit'::text) OR auth_user_has_permission(company_id, 'hr.create'::text))))
    );
DROP POLICY IF EXISTS "attendance_locations_tenant_update_policy" ON public.attendance_locations;
CREATE POLICY "attendance_locations_tenant_update_policy" ON public.attendance_locations
    FOR UPDATE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'settings.manage'::text) OR auth_user_has_permission(company_id, 'hr.edit'::text) OR auth_user_has_permission(company_id, 'hr.create'::text))))
    )
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'settings.manage'::text) OR auth_user_has_permission(company_id, 'hr.edit'::text) OR auth_user_has_permission(company_id, 'hr.create'::text))))
    );
DROP POLICY IF EXISTS "attendance_locations_tenant_delete_policy" ON public.attendance_locations;
CREATE POLICY "attendance_locations_tenant_delete_policy" ON public.attendance_locations
    FOR DELETE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'settings.manage'::text) OR auth_user_has_permission(company_id, 'hr.edit'::text) OR auth_user_has_permission(company_id, 'hr.create'::text))))
    );

-- ==============================================================================
-- Table: attendance_qr_tokens
-- ==============================================================================
DROP POLICY IF EXISTS "Authorized managers can manage attendance qr tokens" ON public.attendance_qr_tokens;
DROP POLICY IF EXISTS "Active company users can view attendance qr tokens metadata" ON public.attendance_qr_tokens;
DROP POLICY IF EXISTS "attendance_qr_tokens_tenant_select_policy" ON public.attendance_qr_tokens;
CREATE POLICY "attendance_qr_tokens_tenant_select_policy" ON public.attendance_qr_tokens
    FOR SELECT TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'settings.manage'::text) OR auth_user_has_permission(company_id, 'hr.edit'::text))))
      OR ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "attendance_qr_tokens_tenant_insert_policy" ON public.attendance_qr_tokens;
CREATE POLICY "attendance_qr_tokens_tenant_insert_policy" ON public.attendance_qr_tokens
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'settings.manage'::text) OR auth_user_has_permission(company_id, 'hr.edit'::text))))
    );
DROP POLICY IF EXISTS "attendance_qr_tokens_tenant_update_policy" ON public.attendance_qr_tokens;
CREATE POLICY "attendance_qr_tokens_tenant_update_policy" ON public.attendance_qr_tokens
    FOR UPDATE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'settings.manage'::text) OR auth_user_has_permission(company_id, 'hr.edit'::text))))
    )
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'settings.manage'::text) OR auth_user_has_permission(company_id, 'hr.edit'::text))))
    );
DROP POLICY IF EXISTS "attendance_qr_tokens_tenant_delete_policy" ON public.attendance_qr_tokens;
CREATE POLICY "attendance_qr_tokens_tenant_delete_policy" ON public.attendance_qr_tokens
    FOR DELETE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'settings.manage'::text) OR auth_user_has_permission(company_id, 'hr.edit'::text))))
    );

-- ==============================================================================
-- Table: attendance_records
-- ==============================================================================
DROP POLICY IF EXISTS "Authorized HR users can manage attendance records" ON public.attendance_records;
DROP POLICY IF EXISTS "Authenticated users can insert own attendance records" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance_records_select_scoped" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance_records_tenant_select_policy" ON public.attendance_records;
CREATE POLICY "attendance_records_tenant_select_policy" ON public.attendance_records
    FOR SELECT TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'hr.edit'::text) OR auth_user_has_permission(company_id, 'hr.approve'::text))))
      OR (((select public.auth_is_active_company_user(company_id)) AND ((user_id = (select auth.uid())) OR auth_user_has_permission(company_id, 'hr.edit'::text) OR auth_user_has_permission(company_id, 'hr.approve'::text) OR (auth_get_user_company_role(company_id) = ANY (ARRAY['business_owner'::text, 'owner'::text, 'branch_manager'::text])))))
    );
DROP POLICY IF EXISTS "attendance_records_tenant_insert_policy" ON public.attendance_records;
CREATE POLICY "attendance_records_tenant_insert_policy" ON public.attendance_records
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'hr.edit'::text) OR auth_user_has_permission(company_id, 'hr.approve'::text))))
      OR (((select public.auth_is_active_company_user(company_id)) AND ((user_id = (select auth.uid())) OR (user_id IS NULL))))
    );
DROP POLICY IF EXISTS "attendance_records_tenant_update_policy" ON public.attendance_records;
CREATE POLICY "attendance_records_tenant_update_policy" ON public.attendance_records
    FOR UPDATE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'hr.edit'::text) OR auth_user_has_permission(company_id, 'hr.approve'::text))))
    )
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'hr.edit'::text) OR auth_user_has_permission(company_id, 'hr.approve'::text))))
    );
DROP POLICY IF EXISTS "attendance_records_tenant_delete_policy" ON public.attendance_records;
CREATE POLICY "attendance_records_tenant_delete_policy" ON public.attendance_records
    FOR DELETE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'hr.edit'::text) OR auth_user_has_permission(company_id, 'hr.approve'::text))))
    );

-- ==============================================================================
-- Table: attendances
-- ==============================================================================
DROP POLICY IF EXISTS "attendances_manage_scoped" ON public.attendances;
DROP POLICY IF EXISTS "attendances_select_scoped" ON public.attendances;
DROP POLICY IF EXISTS "attendances_tenant_select_policy" ON public.attendances;
CREATE POLICY "attendances_tenant_select_policy" ON public.attendances
    FOR SELECT TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'hr.edit'::text) OR auth_user_has_permission(company_id, 'hr.approve'::text) OR (auth_get_user_company_role(company_id) = ANY (ARRAY['business_owner'::text, 'owner'::text, 'branch_manager'::text])))))
      OR (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'hr.edit'::text) OR auth_user_has_permission(company_id, 'hr.approve'::text) OR (auth_get_user_company_role(company_id) = ANY (ARRAY['business_owner'::text, 'owner'::text, 'branch_manager'::text])) OR (employee_id = auth_get_current_employee_id(company_id)))))
    );
DROP POLICY IF EXISTS "attendances_tenant_insert_policy" ON public.attendances;
CREATE POLICY "attendances_tenant_insert_policy" ON public.attendances
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'hr.edit'::text) OR auth_user_has_permission(company_id, 'hr.approve'::text) OR (auth_get_user_company_role(company_id) = ANY (ARRAY['business_owner'::text, 'owner'::text, 'branch_manager'::text])))))
    );
DROP POLICY IF EXISTS "attendances_tenant_update_policy" ON public.attendances;
CREATE POLICY "attendances_tenant_update_policy" ON public.attendances
    FOR UPDATE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'hr.edit'::text) OR auth_user_has_permission(company_id, 'hr.approve'::text) OR (auth_get_user_company_role(company_id) = ANY (ARRAY['business_owner'::text, 'owner'::text, 'branch_manager'::text])))))
    )
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'hr.edit'::text) OR auth_user_has_permission(company_id, 'hr.approve'::text) OR (auth_get_user_company_role(company_id) = ANY (ARRAY['business_owner'::text, 'owner'::text, 'branch_manager'::text])))))
    );
DROP POLICY IF EXISTS "attendances_tenant_delete_policy" ON public.attendances;
CREATE POLICY "attendances_tenant_delete_policy" ON public.attendances
    FOR DELETE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'hr.edit'::text) OR auth_user_has_permission(company_id, 'hr.approve'::text) OR (auth_get_user_company_role(company_id) = ANY (ARRAY['business_owner'::text, 'owner'::text, 'branch_manager'::text])))))
    );

-- ==============================================================================
-- Table: audit_logs
-- ==============================================================================
DROP POLICY IF EXISTS "System and authorized users can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System and users can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Active tenant users can view tenant audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can view company audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Company members can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Tenant users and platform admins view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_tenant_select_policy" ON public.audit_logs;
CREATE POLICY "audit_logs_tenant_select_policy" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (
      ((select public.auth_is_active_company_user(company_id)))
      OR ((auth_user_get_role(company_id) = ANY (ARRAY['owner'::text, 'admin'::text])))
      OR (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'settings.view'::text) OR auth_user_has_permission(company_id, 'reports.view'::text) OR (select public.auth_is_platform_owner()))))
      OR (((select public.auth_is_active_company_user(company_id)) OR (select public.auth_is_platform_admin())))
    );
DROP POLICY IF EXISTS "audit_logs_tenant_insert_policy" ON public.audit_logs;
CREATE POLICY "audit_logs_tenant_insert_policy" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) OR (select public.auth_is_platform_owner())))
      OR ((select public.auth_user_has_company_access(company_id)))
    );

-- ==============================================================================
-- Table: auth_verifications
-- ==============================================================================
DROP POLICY IF EXISTS "Service role and platform admins manage auth verifications" ON public.auth_verifications;
DROP POLICY IF EXISTS "auth_verifications_tenant_select_policy" ON public.auth_verifications;
CREATE POLICY "auth_verifications_tenant_select_policy" ON public.auth_verifications
    FOR SELECT TO authenticated
    USING (
      ((((select auth.role()) = 'service_role'::text) OR (select public.auth_is_platform_admin())))
    );
DROP POLICY IF EXISTS "auth_verifications_tenant_insert_policy" ON public.auth_verifications;
CREATE POLICY "auth_verifications_tenant_insert_policy" ON public.auth_verifications
    FOR INSERT TO authenticated
    WITH CHECK (
      ((((select auth.role()) = 'service_role'::text) OR (select public.auth_is_platform_admin())))
    );
DROP POLICY IF EXISTS "auth_verifications_tenant_update_policy" ON public.auth_verifications;
CREATE POLICY "auth_verifications_tenant_update_policy" ON public.auth_verifications
    FOR UPDATE TO authenticated
    USING (
      ((((select auth.role()) = 'service_role'::text) OR (select public.auth_is_platform_admin())))
    )
    WITH CHECK (
      ((((select auth.role()) = 'service_role'::text) OR (select public.auth_is_platform_admin())))
    );
DROP POLICY IF EXISTS "auth_verifications_tenant_delete_policy" ON public.auth_verifications;
CREATE POLICY "auth_verifications_tenant_delete_policy" ON public.auth_verifications
    FOR DELETE TO authenticated
    USING (
      ((((select auth.role()) = 'service_role'::text) OR (select public.auth_is_platform_admin())))
    );

-- ==============================================================================
-- Table: bank_accounts
-- ==============================================================================
DROP POLICY IF EXISTS "Authorized company users can manage bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Active company users can view bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_tenant_select_policy" ON public.bank_accounts;
CREATE POLICY "bank_accounts_tenant_select_policy" ON public.bank_accounts
    FOR SELECT TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND auth_user_has_permission(company_id, 'accounting.edit'::text)))
      OR ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "bank_accounts_tenant_insert_policy" ON public.bank_accounts;
CREATE POLICY "bank_accounts_tenant_insert_policy" ON public.bank_accounts
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND auth_user_has_permission(company_id, 'accounting.edit'::text)))
    );
DROP POLICY IF EXISTS "bank_accounts_tenant_update_policy" ON public.bank_accounts;
CREATE POLICY "bank_accounts_tenant_update_policy" ON public.bank_accounts
    FOR UPDATE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND auth_user_has_permission(company_id, 'accounting.edit'::text)))
    )
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND auth_user_has_permission(company_id, 'accounting.edit'::text)))
    );
DROP POLICY IF EXISTS "bank_accounts_tenant_delete_policy" ON public.bank_accounts;
CREATE POLICY "bank_accounts_tenant_delete_policy" ON public.bank_accounts
    FOR DELETE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND auth_user_has_permission(company_id, 'accounting.edit'::text)))
    );

-- ==============================================================================
-- Table: branches
-- ==============================================================================
DROP POLICY IF EXISTS "Admins can manage branches" ON public.branches;
DROP POLICY IF EXISTS "Active members can view branches" ON public.branches;
DROP POLICY IF EXISTS "branches_tenant_select_policy" ON public.branches;
CREATE POLICY "branches_tenant_select_policy" ON public.branches
    FOR SELECT TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_get_user_company_role(company_id) = ANY (ARRAY['owner'::text, 'business_owner'::text, 'admin'::text]))))
      OR ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "branches_tenant_insert_policy" ON public.branches;
CREATE POLICY "branches_tenant_insert_policy" ON public.branches
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_get_user_company_role(company_id) = ANY (ARRAY['owner'::text, 'business_owner'::text, 'admin'::text]))))
    );
DROP POLICY IF EXISTS "branches_tenant_update_policy" ON public.branches;
CREATE POLICY "branches_tenant_update_policy" ON public.branches
    FOR UPDATE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_get_user_company_role(company_id) = ANY (ARRAY['owner'::text, 'business_owner'::text, 'admin'::text]))))
    )
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_get_user_company_role(company_id) = ANY (ARRAY['owner'::text, 'business_owner'::text, 'admin'::text]))))
    );
DROP POLICY IF EXISTS "branches_tenant_delete_policy" ON public.branches;
CREATE POLICY "branches_tenant_delete_policy" ON public.branches
    FOR DELETE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_get_user_company_role(company_id) = ANY (ARRAY['owner'::text, 'business_owner'::text, 'admin'::text]))))
    );

-- ==============================================================================
-- Table: challan_items
-- ==============================================================================
DROP POLICY IF EXISTS "Authorized company users can manage challan items" ON public.challan_items;
DROP POLICY IF EXISTS "Active company users can view challan items" ON public.challan_items;
DROP POLICY IF EXISTS "challan_items_tenant_select_policy" ON public.challan_items;
CREATE POLICY "challan_items_tenant_select_policy" ON public.challan_items
    FOR SELECT TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM delivery_challans ch
  WHERE ((ch.id = challan_items.challan_id) AND (select public.auth_is_active_company_user(ch.company_id))))))
    );
DROP POLICY IF EXISTS "challan_items_tenant_insert_policy" ON public.challan_items;
CREATE POLICY "challan_items_tenant_insert_policy" ON public.challan_items
    FOR INSERT TO authenticated
    WITH CHECK (
      ((EXISTS ( SELECT 1
   FROM delivery_challans ch
  WHERE ((ch.id = challan_items.challan_id) AND (select public.auth_is_active_company_user(ch.company_id))))))
    );
DROP POLICY IF EXISTS "challan_items_tenant_update_policy" ON public.challan_items;
CREATE POLICY "challan_items_tenant_update_policy" ON public.challan_items
    FOR UPDATE TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM delivery_challans ch
  WHERE ((ch.id = challan_items.challan_id) AND (select public.auth_is_active_company_user(ch.company_id))))))
    )
    WITH CHECK (
      ((EXISTS ( SELECT 1
   FROM delivery_challans ch
  WHERE ((ch.id = challan_items.challan_id) AND (select public.auth_is_active_company_user(ch.company_id))))))
    );
DROP POLICY IF EXISTS "challan_items_tenant_delete_policy" ON public.challan_items;
CREATE POLICY "challan_items_tenant_delete_policy" ON public.challan_items
    FOR DELETE TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM delivery_challans ch
  WHERE ((ch.id = challan_items.challan_id) AND (select public.auth_is_active_company_user(ch.company_id))))))
    );

-- ==============================================================================
-- Table: communication_channels_config
-- ==============================================================================
DROP POLICY IF EXISTS "Authorized company admins can manage channel configs" ON public.communication_channels_config;
DROP POLICY IF EXISTS "Active company users can view channel configs" ON public.communication_channels_config;
DROP POLICY IF EXISTS "communication_channels_config_tenant_select_policy" ON public.communication_channels_config;
CREATE POLICY "communication_channels_config_tenant_select_policy" ON public.communication_channels_config
    FOR SELECT TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND auth_user_has_permission(company_id, 'settings.edit'::text)))
      OR ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "communication_channels_config_tenant_insert_policy" ON public.communication_channels_config;
CREATE POLICY "communication_channels_config_tenant_insert_policy" ON public.communication_channels_config
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND auth_user_has_permission(company_id, 'settings.edit'::text)))
    );
DROP POLICY IF EXISTS "communication_channels_config_tenant_update_policy" ON public.communication_channels_config;
CREATE POLICY "communication_channels_config_tenant_update_policy" ON public.communication_channels_config
    FOR UPDATE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND auth_user_has_permission(company_id, 'settings.edit'::text)))
    )
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND auth_user_has_permission(company_id, 'settings.edit'::text)))
    );
DROP POLICY IF EXISTS "communication_channels_config_tenant_delete_policy" ON public.communication_channels_config;
CREATE POLICY "communication_channels_config_tenant_delete_policy" ON public.communication_channels_config
    FOR DELETE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND auth_user_has_permission(company_id, 'settings.edit'::text)))
    );

-- ==============================================================================
-- Table: companies
-- ==============================================================================
DROP POLICY IF EXISTS "Authenticated users can create companies" ON public.companies;
DROP POLICY IF EXISTS "Members can view company details" ON public.companies;
DROP POLICY IF EXISTS "Owners and Admins can update company" ON public.companies;
DROP POLICY IF EXISTS "companies_tenant_select_policy" ON public.companies;
CREATE POLICY "companies_tenant_select_policy" ON public.companies
    FOR SELECT TO authenticated
    USING (
      ((select public.auth_is_active_company_user(id)))
    );
DROP POLICY IF EXISTS "companies_tenant_insert_policy" ON public.companies;
CREATE POLICY "companies_tenant_insert_policy" ON public.companies
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select auth.uid()) IS NOT NULL))
    );
DROP POLICY IF EXISTS "companies_tenant_update_policy" ON public.companies;
CREATE POLICY "companies_tenant_update_policy" ON public.companies
    FOR UPDATE TO authenticated
    USING (
      ((auth_get_user_company_role(id) = ANY (ARRAY['owner'::text, 'business_owner'::text, 'admin'::text])))
    )
    WITH CHECK (
      ((auth_get_user_company_role(id) = ANY (ARRAY['owner'::text, 'business_owner'::text, 'admin'::text])))
    );

-- ==============================================================================
-- Table: company_settings
-- ==============================================================================
DROP POLICY IF EXISTS "Authenticated users can insert company settings for created com" ON public.company_settings;
DROP POLICY IF EXISTS "Active members can view company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Admins can update company settings" ON public.company_settings;
DROP POLICY IF EXISTS "company_settings_tenant_select_policy" ON public.company_settings;
CREATE POLICY "company_settings_tenant_select_policy" ON public.company_settings
    FOR SELECT TO authenticated
    USING (
      ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "company_settings_tenant_insert_policy" ON public.company_settings;
CREATE POLICY "company_settings_tenant_insert_policy" ON public.company_settings
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select auth.uid()) IS NOT NULL))
    );
DROP POLICY IF EXISTS "company_settings_tenant_update_policy" ON public.company_settings;
CREATE POLICY "company_settings_tenant_update_policy" ON public.company_settings
    FOR UPDATE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND ((auth_get_user_company_role(company_id) = ANY (ARRAY['owner'::text, 'business_owner'::text, 'admin'::text])) OR auth_user_has_permission(company_id, 'settings.edit'::text))))
    )
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND ((auth_get_user_company_role(company_id) = ANY (ARRAY['owner'::text, 'business_owner'::text, 'admin'::text])) OR auth_user_has_permission(company_id, 'settings.edit'::text))))
    );

-- ==============================================================================
-- Table: company_subscriptions
-- ==============================================================================
DROP POLICY IF EXISTS "Platform admins can delete company subscriptions" ON public.company_subscriptions;
DROP POLICY IF EXISTS "Platform admins can insert company subscriptions" ON public.company_subscriptions;
DROP POLICY IF EXISTS "Active company users can view their own subscription" ON public.company_subscriptions;
DROP POLICY IF EXISTS "Active company users can view their subscription" ON public.company_subscriptions;
DROP POLICY IF EXISTS "Platform admins can view all company subscriptions" ON public.company_subscriptions;
DROP POLICY IF EXISTS "Platform admins can update company subscriptions" ON public.company_subscriptions;
DROP POLICY IF EXISTS "company_subscriptions_tenant_select_policy" ON public.company_subscriptions;
CREATE POLICY "company_subscriptions_tenant_select_policy" ON public.company_subscriptions
    FOR SELECT TO authenticated
    USING (
      ((select public.auth_is_active_company_user(company_id)))
      OR ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
    );
DROP POLICY IF EXISTS "company_subscriptions_tenant_insert_policy" ON public.company_subscriptions;
CREATE POLICY "company_subscriptions_tenant_insert_policy" ON public.company_subscriptions
    FOR INSERT TO authenticated
    WITH CHECK (
      ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
    );
DROP POLICY IF EXISTS "company_subscriptions_tenant_update_policy" ON public.company_subscriptions;
CREATE POLICY "company_subscriptions_tenant_update_policy" ON public.company_subscriptions
    FOR UPDATE TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
    )
    WITH CHECK (
      ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
    );
DROP POLICY IF EXISTS "company_subscriptions_tenant_delete_policy" ON public.company_subscriptions;
CREATE POLICY "company_subscriptions_tenant_delete_policy" ON public.company_subscriptions
    FOR DELETE TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
    );

-- ==============================================================================
-- Table: company_tax_settings
-- ==============================================================================
DROP POLICY IF EXISTS "Authorized company admins can manage tax settings" ON public.company_tax_settings;
DROP POLICY IF EXISTS "Active company users can view tax settings" ON public.company_tax_settings;
DROP POLICY IF EXISTS "company_tax_settings_tenant_select_policy" ON public.company_tax_settings;
CREATE POLICY "company_tax_settings_tenant_select_policy" ON public.company_tax_settings
    FOR SELECT TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND auth_user_has_permission(company_id, 'settings.edit'::text)))
      OR ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "company_tax_settings_tenant_insert_policy" ON public.company_tax_settings;
CREATE POLICY "company_tax_settings_tenant_insert_policy" ON public.company_tax_settings
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND auth_user_has_permission(company_id, 'settings.edit'::text)))
    );
DROP POLICY IF EXISTS "company_tax_settings_tenant_update_policy" ON public.company_tax_settings;
CREATE POLICY "company_tax_settings_tenant_update_policy" ON public.company_tax_settings
    FOR UPDATE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND auth_user_has_permission(company_id, 'settings.edit'::text)))
    )
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND auth_user_has_permission(company_id, 'settings.edit'::text)))
    );
DROP POLICY IF EXISTS "company_tax_settings_tenant_delete_policy" ON public.company_tax_settings;
CREATE POLICY "company_tax_settings_tenant_delete_policy" ON public.company_tax_settings
    FOR DELETE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND auth_user_has_permission(company_id, 'settings.edit'::text)))
    );

-- ==============================================================================
-- Table: company_users
-- ==============================================================================
DROP POLICY IF EXISTS "Admins can manage company users" ON public.company_users;
DROP POLICY IF EXISTS "Active members can view company users" ON public.company_users;
DROP POLICY IF EXISTS "Members can view company users" ON public.company_users;
DROP POLICY IF EXISTS "company_users_tenant_select_policy" ON public.company_users;
CREATE POLICY "company_users_tenant_select_policy" ON public.company_users
    FOR SELECT TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_get_user_company_role(company_id) = ANY (ARRAY['owner'::text, 'business_owner'::text, 'admin'::text]))))
      OR (((select public.auth_is_active_company_user(company_id)) OR ((select auth.uid()) = user_id)))
    );
DROP POLICY IF EXISTS "company_users_tenant_insert_policy" ON public.company_users;
CREATE POLICY "company_users_tenant_insert_policy" ON public.company_users
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_get_user_company_role(company_id) = ANY (ARRAY['owner'::text, 'business_owner'::text, 'admin'::text]))))
    );
DROP POLICY IF EXISTS "company_users_tenant_update_policy" ON public.company_users;
CREATE POLICY "company_users_tenant_update_policy" ON public.company_users
    FOR UPDATE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_get_user_company_role(company_id) = ANY (ARRAY['owner'::text, 'business_owner'::text, 'admin'::text]))))
    )
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_get_user_company_role(company_id) = ANY (ARRAY['owner'::text, 'business_owner'::text, 'admin'::text]))))
    );
DROP POLICY IF EXISTS "company_users_tenant_delete_policy" ON public.company_users;
CREATE POLICY "company_users_tenant_delete_policy" ON public.company_users
    FOR DELETE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_get_user_company_role(company_id) = ANY (ARRAY['owner'::text, 'business_owner'::text, 'admin'::text]))))
    );

-- ==============================================================================
-- Table: daily_labor_logs
-- ==============================================================================
DROP POLICY IF EXISTS "Authorized company users can manage daily labor logs" ON public.daily_labor_logs;
DROP POLICY IF EXISTS "Active company users can view daily labor logs" ON public.daily_labor_logs;
DROP POLICY IF EXISTS "daily_labor_logs_tenant_select_policy" ON public.daily_labor_logs;
CREATE POLICY "daily_labor_logs_tenant_select_policy" ON public.daily_labor_logs
    FOR SELECT TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'production.edit'::text) OR auth_user_has_permission(company_id, 'hr.edit'::text))))
      OR ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "daily_labor_logs_tenant_insert_policy" ON public.daily_labor_logs;
CREATE POLICY "daily_labor_logs_tenant_insert_policy" ON public.daily_labor_logs
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'production.edit'::text) OR auth_user_has_permission(company_id, 'hr.edit'::text))))
    );
DROP POLICY IF EXISTS "daily_labor_logs_tenant_update_policy" ON public.daily_labor_logs;
CREATE POLICY "daily_labor_logs_tenant_update_policy" ON public.daily_labor_logs
    FOR UPDATE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'production.edit'::text) OR auth_user_has_permission(company_id, 'hr.edit'::text))))
    )
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'production.edit'::text) OR auth_user_has_permission(company_id, 'hr.edit'::text))))
    );
DROP POLICY IF EXISTS "daily_labor_logs_tenant_delete_policy" ON public.daily_labor_logs;
CREATE POLICY "daily_labor_logs_tenant_delete_policy" ON public.daily_labor_logs
    FOR DELETE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'production.edit'::text) OR auth_user_has_permission(company_id, 'hr.edit'::text))))
    );

-- ==============================================================================
-- Table: delivery_challans
-- ==============================================================================
DROP POLICY IF EXISTS "Authorized company users can manage delivery challans" ON public.delivery_challans;
DROP POLICY IF EXISTS "Active company users can view delivery challans" ON public.delivery_challans;
DROP POLICY IF EXISTS "delivery_challans_tenant_select_policy" ON public.delivery_challans;
CREATE POLICY "delivery_challans_tenant_select_policy" ON public.delivery_challans
    FOR SELECT TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'delivery.view'::text) OR auth_user_has_permission(company_id, 'delivery.create'::text) OR auth_user_has_permission(company_id, 'delivery.edit'::text))))
      OR ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "delivery_challans_tenant_insert_policy" ON public.delivery_challans;
CREATE POLICY "delivery_challans_tenant_insert_policy" ON public.delivery_challans
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'delivery.view'::text) OR auth_user_has_permission(company_id, 'delivery.create'::text) OR auth_user_has_permission(company_id, 'delivery.edit'::text))))
    );
DROP POLICY IF EXISTS "delivery_challans_tenant_update_policy" ON public.delivery_challans;
CREATE POLICY "delivery_challans_tenant_update_policy" ON public.delivery_challans
    FOR UPDATE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'delivery.view'::text) OR auth_user_has_permission(company_id, 'delivery.create'::text) OR auth_user_has_permission(company_id, 'delivery.edit'::text))))
    )
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'delivery.view'::text) OR auth_user_has_permission(company_id, 'delivery.create'::text) OR auth_user_has_permission(company_id, 'delivery.edit'::text))))
    );
DROP POLICY IF EXISTS "delivery_challans_tenant_delete_policy" ON public.delivery_challans;
CREATE POLICY "delivery_challans_tenant_delete_policy" ON public.delivery_challans
    FOR DELETE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'delivery.view'::text) OR auth_user_has_permission(company_id, 'delivery.create'::text) OR auth_user_has_permission(company_id, 'delivery.edit'::text))))
    );

-- ==============================================================================
-- Table: design_jobs
-- ==============================================================================
DROP POLICY IF EXISTS "Authorized company users can insert design jobs" ON public.design_jobs;
DROP POLICY IF EXISTS "design_jobs_select_scoped" ON public.design_jobs;
DROP POLICY IF EXISTS "design_jobs_update_scoped" ON public.design_jobs;
DROP POLICY IF EXISTS "design_jobs_tenant_select_policy" ON public.design_jobs;
CREATE POLICY "design_jobs_tenant_select_policy" ON public.design_jobs
    FOR SELECT TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND ((auth_get_user_company_role(company_id) = ANY (ARRAY['business_owner'::text, 'owner'::text, 'branch_manager'::text, 'sales_manager'::text, 'production_manager'::text])) OR auth_user_has_permission(company_id, 'design.approve'::text) OR auth_user_has_permission(company_id, 'orders.view'::text) OR (designer_id = (select auth.uid())) OR (designer_id IS NULL))))
    );
DROP POLICY IF EXISTS "design_jobs_tenant_insert_policy" ON public.design_jobs;
CREATE POLICY "design_jobs_tenant_insert_policy" ON public.design_jobs
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'design.create'::text) OR auth_user_has_permission(company_id, 'order.create'::text))))
    );
DROP POLICY IF EXISTS "design_jobs_tenant_update_policy" ON public.design_jobs;
CREATE POLICY "design_jobs_tenant_update_policy" ON public.design_jobs
    FOR UPDATE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND ((auth_get_user_company_role(company_id) = ANY (ARRAY['business_owner'::text, 'owner'::text, 'branch_manager'::text, 'sales_manager'::text, 'production_manager'::text])) OR auth_user_has_permission(company_id, 'design.edit'::text) OR auth_user_has_permission(company_id, 'design.approve'::text) OR (designer_id = (select auth.uid())))))
    )
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND ((auth_get_user_company_role(company_id) = ANY (ARRAY['business_owner'::text, 'owner'::text, 'branch_manager'::text, 'sales_manager'::text, 'production_manager'::text])) OR auth_user_has_permission(company_id, 'design.edit'::text) OR auth_user_has_permission(company_id, 'design.approve'::text) OR (designer_id = (select auth.uid())))))
    );

-- ==============================================================================
-- Table: design_versions
-- ==============================================================================
DROP POLICY IF EXISTS "Authorized company users can manage design versions" ON public.design_versions;
DROP POLICY IF EXISTS "Active company users can view design versions" ON public.design_versions;
DROP POLICY IF EXISTS "design_versions_tenant_select_policy" ON public.design_versions;
CREATE POLICY "design_versions_tenant_select_policy" ON public.design_versions
    FOR SELECT TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM design_jobs dj
  WHERE ((dj.id = design_versions.design_job_id) AND (select public.auth_is_active_company_user(dj.company_id)) AND ((dj.is_locked = false) OR auth_user_has_permission(dj.company_id, 'design.approve'::text))))))
      OR ((EXISTS ( SELECT 1
   FROM design_jobs dj
  WHERE ((dj.id = design_versions.design_job_id) AND (select public.auth_is_active_company_user(dj.company_id))))))
    );
DROP POLICY IF EXISTS "design_versions_tenant_insert_policy" ON public.design_versions;
CREATE POLICY "design_versions_tenant_insert_policy" ON public.design_versions
    FOR INSERT TO authenticated
    WITH CHECK (
      ((EXISTS ( SELECT 1
   FROM design_jobs dj
  WHERE ((dj.id = design_versions.design_job_id) AND (select public.auth_is_active_company_user(dj.company_id)) AND ((dj.is_locked = false) OR auth_user_has_permission(dj.company_id, 'design.approve'::text))))))
    );
DROP POLICY IF EXISTS "design_versions_tenant_update_policy" ON public.design_versions;
CREATE POLICY "design_versions_tenant_update_policy" ON public.design_versions
    FOR UPDATE TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM design_jobs dj
  WHERE ((dj.id = design_versions.design_job_id) AND (select public.auth_is_active_company_user(dj.company_id)) AND ((dj.is_locked = false) OR auth_user_has_permission(dj.company_id, 'design.approve'::text))))))
    )
    WITH CHECK (
      ((EXISTS ( SELECT 1
   FROM design_jobs dj
  WHERE ((dj.id = design_versions.design_job_id) AND (select public.auth_is_active_company_user(dj.company_id)) AND ((dj.is_locked = false) OR auth_user_has_permission(dj.company_id, 'design.approve'::text))))))
    );
DROP POLICY IF EXISTS "design_versions_tenant_delete_policy" ON public.design_versions;
CREATE POLICY "design_versions_tenant_delete_policy" ON public.design_versions
    FOR DELETE TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM design_jobs dj
  WHERE ((dj.id = design_versions.design_job_id) AND (select public.auth_is_active_company_user(dj.company_id)) AND ((dj.is_locked = false) OR auth_user_has_permission(dj.company_id, 'design.approve'::text))))))
    );

-- ==============================================================================
-- Table: document_sequences
-- ==============================================================================
DROP POLICY IF EXISTS "Admins can manage document sequences" ON public.document_sequences;
DROP POLICY IF EXISTS "Active company users can view document sequences" ON public.document_sequences;
DROP POLICY IF EXISTS "document_sequences_tenant_select_policy" ON public.document_sequences;
CREATE POLICY "document_sequences_tenant_select_policy" ON public.document_sequences
    FOR SELECT TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND ((auth_get_user_company_role(company_id) = ANY (ARRAY['business_owner'::text, 'owner'::text, 'admin'::text])) OR (select public.auth_is_platform_owner()))))
      OR ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "document_sequences_tenant_insert_policy" ON public.document_sequences;
CREATE POLICY "document_sequences_tenant_insert_policy" ON public.document_sequences
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND ((auth_get_user_company_role(company_id) = ANY (ARRAY['business_owner'::text, 'owner'::text, 'admin'::text])) OR (select public.auth_is_platform_owner()))))
    );
DROP POLICY IF EXISTS "document_sequences_tenant_update_policy" ON public.document_sequences;
CREATE POLICY "document_sequences_tenant_update_policy" ON public.document_sequences
    FOR UPDATE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND ((auth_get_user_company_role(company_id) = ANY (ARRAY['business_owner'::text, 'owner'::text, 'admin'::text])) OR (select public.auth_is_platform_owner()))))
    )
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND ((auth_get_user_company_role(company_id) = ANY (ARRAY['business_owner'::text, 'owner'::text, 'admin'::text])) OR (select public.auth_is_platform_owner()))))
    );
DROP POLICY IF EXISTS "document_sequences_tenant_delete_policy" ON public.document_sequences;
CREATE POLICY "document_sequences_tenant_delete_policy" ON public.document_sequences
    FOR DELETE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND ((auth_get_user_company_role(company_id) = ANY (ARRAY['business_owner'::text, 'owner'::text, 'admin'::text])) OR (select public.auth_is_platform_owner()))))
    );

-- ==============================================================================
-- Table: document_templates_config
-- ==============================================================================
DROP POLICY IF EXISTS "Authorized company admins can manage document templates" ON public.document_templates_config;
DROP POLICY IF EXISTS "Active company users can view document templates" ON public.document_templates_config;
DROP POLICY IF EXISTS "document_templates_config_tenant_select_policy" ON public.document_templates_config;
CREATE POLICY "document_templates_config_tenant_select_policy" ON public.document_templates_config
    FOR SELECT TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND auth_user_has_permission(company_id, 'settings.edit'::text)))
      OR ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "document_templates_config_tenant_insert_policy" ON public.document_templates_config;
CREATE POLICY "document_templates_config_tenant_insert_policy" ON public.document_templates_config
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND auth_user_has_permission(company_id, 'settings.edit'::text)))
    );
DROP POLICY IF EXISTS "document_templates_config_tenant_update_policy" ON public.document_templates_config;
CREATE POLICY "document_templates_config_tenant_update_policy" ON public.document_templates_config
    FOR UPDATE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND auth_user_has_permission(company_id, 'settings.edit'::text)))
    )
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND auth_user_has_permission(company_id, 'settings.edit'::text)))
    );
DROP POLICY IF EXISTS "document_templates_config_tenant_delete_policy" ON public.document_templates_config;
CREATE POLICY "document_templates_config_tenant_delete_policy" ON public.document_templates_config
    FOR DELETE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND auth_user_has_permission(company_id, 'settings.edit'::text)))
    );

-- ==============================================================================
-- Table: email_gateways
-- ==============================================================================
DROP POLICY IF EXISTS "Authorized tenant admins manage own email gateways" ON public.email_gateways;
DROP POLICY IF EXISTS "Platform admins manage platform email gateways" ON public.email_gateways;
DROP POLICY IF EXISTS "Tenant users view own email gateways" ON public.email_gateways;
DROP POLICY IF EXISTS "email_gateways_tenant_select_policy" ON public.email_gateways;
CREATE POLICY "email_gateways_tenant_select_policy" ON public.email_gateways
    FOR SELECT TO authenticated
    USING (
      (((tenant_id IS NOT NULL) AND (scope_type = 'TENANT'::text) AND (select public.auth_is_active_company_user(tenant_id)) AND auth_user_has_permission(tenant_id, 'settings.edit'::text)))
      OR (((select public.auth_is_platform_admin()) AND (tenant_id IS NULL) AND (scope_type = 'PLATFORM'::text)))
      OR (((tenant_id IS NOT NULL) AND (scope_type = 'TENANT'::text) AND (select public.auth_is_active_company_user(tenant_id))))
    );
DROP POLICY IF EXISTS "email_gateways_tenant_insert_policy" ON public.email_gateways;
CREATE POLICY "email_gateways_tenant_insert_policy" ON public.email_gateways
    FOR INSERT TO authenticated
    WITH CHECK (
      (((tenant_id IS NOT NULL) AND (scope_type = 'TENANT'::text) AND (select public.auth_is_active_company_user(tenant_id)) AND auth_user_has_permission(tenant_id, 'settings.edit'::text)))
      OR (((select public.auth_is_platform_admin()) AND (tenant_id IS NULL) AND (scope_type = 'PLATFORM'::text)))
    );
DROP POLICY IF EXISTS "email_gateways_tenant_update_policy" ON public.email_gateways;
CREATE POLICY "email_gateways_tenant_update_policy" ON public.email_gateways
    FOR UPDATE TO authenticated
    USING (
      (((tenant_id IS NOT NULL) AND (scope_type = 'TENANT'::text) AND (select public.auth_is_active_company_user(tenant_id)) AND auth_user_has_permission(tenant_id, 'settings.edit'::text)))
      OR (((select public.auth_is_platform_admin()) AND (tenant_id IS NULL) AND (scope_type = 'PLATFORM'::text)))
    )
    WITH CHECK (
      (((tenant_id IS NOT NULL) AND (scope_type = 'TENANT'::text) AND (select public.auth_is_active_company_user(tenant_id)) AND auth_user_has_permission(tenant_id, 'settings.edit'::text)))
      OR (((select public.auth_is_platform_admin()) AND (tenant_id IS NULL) AND (scope_type = 'PLATFORM'::text)))
    );
DROP POLICY IF EXISTS "email_gateways_tenant_delete_policy" ON public.email_gateways;
CREATE POLICY "email_gateways_tenant_delete_policy" ON public.email_gateways
    FOR DELETE TO authenticated
    USING (
      (((tenant_id IS NOT NULL) AND (scope_type = 'TENANT'::text) AND (select public.auth_is_active_company_user(tenant_id)) AND auth_user_has_permission(tenant_id, 'settings.edit'::text)))
      OR (((select public.auth_is_platform_admin()) AND (tenant_id IS NULL) AND (scope_type = 'PLATFORM'::text)))
    );

-- ==============================================================================
-- Table: email_logs
-- ==============================================================================
DROP POLICY IF EXISTS "Tenant users append own email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Platform admins view email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Tenant users view own email logs" ON public.email_logs;
DROP POLICY IF EXISTS "email_logs_tenant_select_policy" ON public.email_logs;
CREATE POLICY "email_logs_tenant_select_policy" ON public.email_logs
    FOR SELECT TO authenticated
    USING (
      ((select public.auth_is_platform_admin()))
      OR (((tenant_id IS NOT NULL) AND (scope_type = 'TENANT'::text) AND (select public.auth_is_active_company_user(tenant_id))))
    );
DROP POLICY IF EXISTS "email_logs_tenant_insert_policy" ON public.email_logs;
CREATE POLICY "email_logs_tenant_insert_policy" ON public.email_logs
    FOR INSERT TO authenticated
    WITH CHECK (
      ((((tenant_id IS NOT NULL) AND (scope_type = 'TENANT'::text) AND (select public.auth_is_active_company_user(tenant_id))) OR ((select public.auth_is_platform_admin()) AND (scope_type = 'PLATFORM'::text) AND (tenant_id IS NULL))))
    );

-- ==============================================================================
-- Table: email_queue
-- ==============================================================================
DROP POLICY IF EXISTS "Platform admins view email queue" ON public.email_queue;
DROP POLICY IF EXISTS "Tenant users enqueue emails" ON public.email_queue;
DROP POLICY IF EXISTS "Tenant users view own email queue" ON public.email_queue;
DROP POLICY IF EXISTS "email_queue_tenant_select_policy" ON public.email_queue;
CREATE POLICY "email_queue_tenant_select_policy" ON public.email_queue
    FOR SELECT TO authenticated
    USING (
      ((select public.auth_is_platform_admin()))
      OR (((tenant_id IS NOT NULL) AND (select public.auth_is_active_company_user(tenant_id))))
    );
DROP POLICY IF EXISTS "email_queue_tenant_insert_policy" ON public.email_queue;
CREATE POLICY "email_queue_tenant_insert_policy" ON public.email_queue
    FOR INSERT TO authenticated
    WITH CHECK (
      ((select public.auth_is_platform_admin()))
      OR (((tenant_id IS NOT NULL) AND (select public.auth_is_active_company_user(tenant_id))))
    );
DROP POLICY IF EXISTS "email_queue_tenant_update_policy" ON public.email_queue;
CREATE POLICY "email_queue_tenant_update_policy" ON public.email_queue
    FOR UPDATE TO authenticated
    USING (
      ((select public.auth_is_platform_admin()))
    )
    WITH CHECK (
      ((select public.auth_is_platform_admin()))
    );
DROP POLICY IF EXISTS "email_queue_tenant_delete_policy" ON public.email_queue;
CREATE POLICY "email_queue_tenant_delete_policy" ON public.email_queue
    FOR DELETE TO authenticated
    USING (
      ((select public.auth_is_platform_admin()))
    );

-- ==============================================================================
-- Table: email_templates
-- ==============================================================================
DROP POLICY IF EXISTS "Authorized tenant admins manage own email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Platform admins manage platform email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Tenant users view accessible templates" ON public.email_templates;
DROP POLICY IF EXISTS "email_templates_tenant_select_policy" ON public.email_templates;
CREATE POLICY "email_templates_tenant_select_policy" ON public.email_templates
    FOR SELECT TO authenticated
    USING (
      (((tenant_id IS NOT NULL) AND (select public.auth_is_active_company_user(tenant_id)) AND auth_user_has_permission(tenant_id, 'settings.edit'::text)))
      OR (((select public.auth_is_platform_admin()) AND (tenant_id IS NULL)))
      OR (((tenant_id IS NULL) OR (select public.auth_is_active_company_user(tenant_id))))
    );
DROP POLICY IF EXISTS "email_templates_tenant_insert_policy" ON public.email_templates;
CREATE POLICY "email_templates_tenant_insert_policy" ON public.email_templates
    FOR INSERT TO authenticated
    WITH CHECK (
      (((tenant_id IS NOT NULL) AND (select public.auth_is_active_company_user(tenant_id)) AND auth_user_has_permission(tenant_id, 'settings.edit'::text)))
      OR (((select public.auth_is_platform_admin()) AND (tenant_id IS NULL)))
    );
DROP POLICY IF EXISTS "email_templates_tenant_update_policy" ON public.email_templates;
CREATE POLICY "email_templates_tenant_update_policy" ON public.email_templates
    FOR UPDATE TO authenticated
    USING (
      (((tenant_id IS NOT NULL) AND (select public.auth_is_active_company_user(tenant_id)) AND auth_user_has_permission(tenant_id, 'settings.edit'::text)))
      OR (((select public.auth_is_platform_admin()) AND (tenant_id IS NULL)))
    )
    WITH CHECK (
      (((tenant_id IS NOT NULL) AND (select public.auth_is_active_company_user(tenant_id)) AND auth_user_has_permission(tenant_id, 'settings.edit'::text)))
      OR (((select public.auth_is_platform_admin()) AND (tenant_id IS NULL)))
    );
DROP POLICY IF EXISTS "email_templates_tenant_delete_policy" ON public.email_templates;
CREATE POLICY "email_templates_tenant_delete_policy" ON public.email_templates
    FOR DELETE TO authenticated
    USING (
      (((tenant_id IS NOT NULL) AND (select public.auth_is_active_company_user(tenant_id)) AND auth_user_has_permission(tenant_id, 'settings.edit'::text)))
      OR (((select public.auth_is_platform_admin()) AND (tenant_id IS NULL)))
    );

-- ==============================================================================
-- Table: employees
-- ==============================================================================
DROP POLICY IF EXISTS "Authorized company users can manage employees" ON public.employees;
DROP POLICY IF EXISTS "Active company users can view employees" ON public.employees;
DROP POLICY IF EXISTS "employees_tenant_select_policy" ON public.employees;
CREATE POLICY "employees_tenant_select_policy" ON public.employees
    FOR SELECT TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'hr.view'::text) OR auth_user_has_permission(company_id, 'hr.create'::text) OR auth_user_has_permission(company_id, 'hr.edit'::text))))
      OR ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "employees_tenant_insert_policy" ON public.employees;
CREATE POLICY "employees_tenant_insert_policy" ON public.employees
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'hr.view'::text) OR auth_user_has_permission(company_id, 'hr.create'::text) OR auth_user_has_permission(company_id, 'hr.edit'::text))))
    );
DROP POLICY IF EXISTS "employees_tenant_update_policy" ON public.employees;
CREATE POLICY "employees_tenant_update_policy" ON public.employees
    FOR UPDATE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'hr.view'::text) OR auth_user_has_permission(company_id, 'hr.create'::text) OR auth_user_has_permission(company_id, 'hr.edit'::text))))
    )
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'hr.view'::text) OR auth_user_has_permission(company_id, 'hr.create'::text) OR auth_user_has_permission(company_id, 'hr.edit'::text))))
    );
DROP POLICY IF EXISTS "employees_tenant_delete_policy" ON public.employees;
CREATE POLICY "employees_tenant_delete_policy" ON public.employees
    FOR DELETE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'hr.view'::text) OR auth_user_has_permission(company_id, 'hr.create'::text) OR auth_user_has_permission(company_id, 'hr.edit'::text))))
    );

-- ==============================================================================
-- Table: expenses
-- ==============================================================================
DROP POLICY IF EXISTS "Authorized company users can manage expenses" ON public.expenses;
DROP POLICY IF EXISTS "Active company users can view expenses" ON public.expenses;
DROP POLICY IF EXISTS "expenses_tenant_select_policy" ON public.expenses;
CREATE POLICY "expenses_tenant_select_policy" ON public.expenses
    FOR SELECT TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'accounting.view'::text) OR auth_user_has_permission(company_id, 'accounting.create'::text) OR auth_user_has_permission(company_id, 'accounting.edit'::text))))
      OR ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "expenses_tenant_insert_policy" ON public.expenses;
CREATE POLICY "expenses_tenant_insert_policy" ON public.expenses
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'accounting.view'::text) OR auth_user_has_permission(company_id, 'accounting.create'::text) OR auth_user_has_permission(company_id, 'accounting.edit'::text))))
    );
DROP POLICY IF EXISTS "expenses_tenant_update_policy" ON public.expenses;
CREATE POLICY "expenses_tenant_update_policy" ON public.expenses
    FOR UPDATE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'accounting.view'::text) OR auth_user_has_permission(company_id, 'accounting.create'::text) OR auth_user_has_permission(company_id, 'accounting.edit'::text))))
    )
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'accounting.view'::text) OR auth_user_has_permission(company_id, 'accounting.create'::text) OR auth_user_has_permission(company_id, 'accounting.edit'::text))))
    );
DROP POLICY IF EXISTS "expenses_tenant_delete_policy" ON public.expenses;
CREATE POLICY "expenses_tenant_delete_policy" ON public.expenses
    FOR DELETE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'accounting.view'::text) OR auth_user_has_permission(company_id, 'accounting.create'::text) OR auth_user_has_permission(company_id, 'accounting.edit'::text))))
    );

-- ==============================================================================
-- Table: features_catalog
-- ==============================================================================
DROP POLICY IF EXISTS "Platform admins can manage features catalog" ON public.features_catalog;
DROP POLICY IF EXISTS "Public can view active features catalog" ON public.features_catalog;
DROP POLICY IF EXISTS "features_catalog_tenant_select_policy" ON public.features_catalog;
CREATE POLICY "features_catalog_tenant_select_policy" ON public.features_catalog
    FOR SELECT TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
      OR ((is_active = true))
    );
DROP POLICY IF EXISTS "features_catalog_tenant_insert_policy" ON public.features_catalog;
CREATE POLICY "features_catalog_tenant_insert_policy" ON public.features_catalog
    FOR INSERT TO authenticated
    WITH CHECK (
      ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
    );
DROP POLICY IF EXISTS "features_catalog_tenant_update_policy" ON public.features_catalog;
CREATE POLICY "features_catalog_tenant_update_policy" ON public.features_catalog
    FOR UPDATE TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
    )
    WITH CHECK (
      ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
    );
DROP POLICY IF EXISTS "features_catalog_tenant_delete_policy" ON public.features_catalog;
CREATE POLICY "features_catalog_tenant_delete_policy" ON public.features_catalog
    FOR DELETE TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
    );

-- ==============================================================================
-- Table: finishing_options
-- ==============================================================================
DROP POLICY IF EXISTS "finishing_options_delete_tenant" ON public.finishing_options;
DROP POLICY IF EXISTS "finishing_options_insert_tenant" ON public.finishing_options;
DROP POLICY IF EXISTS "finishing_options_select_tenant" ON public.finishing_options;
DROP POLICY IF EXISTS "finishing_options_update_tenant" ON public.finishing_options;
DROP POLICY IF EXISTS "finishing_options_tenant_select_policy" ON public.finishing_options;
CREATE POLICY "finishing_options_tenant_select_policy" ON public.finishing_options
    FOR SELECT TO authenticated
    USING (
      (((company_id = (( SELECT ((select auth.jwt()) ->> 'company_id'::text)))::uuid) OR (( SELECT ((select auth.jwt()) ->> 'role'::text)) = 'platform_admin'::text)))
    );
DROP POLICY IF EXISTS "finishing_options_tenant_insert_policy" ON public.finishing_options;
CREATE POLICY "finishing_options_tenant_insert_policy" ON public.finishing_options
    FOR INSERT TO authenticated
    WITH CHECK (
      (((company_id = (( SELECT ((select auth.jwt()) ->> 'company_id'::text)))::uuid) OR (( SELECT ((select auth.jwt()) ->> 'role'::text)) = 'platform_admin'::text)))
    );
DROP POLICY IF EXISTS "finishing_options_tenant_update_policy" ON public.finishing_options;
CREATE POLICY "finishing_options_tenant_update_policy" ON public.finishing_options
    FOR UPDATE TO authenticated
    USING (
      (((company_id = (( SELECT ((select auth.jwt()) ->> 'company_id'::text)))::uuid) OR (( SELECT ((select auth.jwt()) ->> 'role'::text)) = 'platform_admin'::text)))
    )
    WITH CHECK (
      (((company_id = (( SELECT ((select auth.jwt()) ->> 'company_id'::text)))::uuid) OR (( SELECT ((select auth.jwt()) ->> 'role'::text)) = 'platform_admin'::text)))
    );
DROP POLICY IF EXISTS "finishing_options_tenant_delete_policy" ON public.finishing_options;
CREATE POLICY "finishing_options_tenant_delete_policy" ON public.finishing_options
    FOR DELETE TO authenticated
    USING (
      (((company_id = (( SELECT ((select auth.jwt()) ->> 'company_id'::text)))::uuid) OR (( SELECT ((select auth.jwt()) ->> 'role'::text)) = 'platform_admin'::text)))
    );

-- ==============================================================================
-- Table: gateway_audit_logs
-- ==============================================================================
DROP POLICY IF EXISTS "Platform admins view all gateway audit logs" ON public.gateway_audit_logs;
DROP POLICY IF EXISTS "Tenant users view own gateway audit logs" ON public.gateway_audit_logs;
DROP POLICY IF EXISTS "gateway_audit_logs_tenant_select_policy" ON public.gateway_audit_logs;
CREATE POLICY "gateway_audit_logs_tenant_select_policy" ON public.gateway_audit_logs
    FOR SELECT TO authenticated
    USING (
      ((select public.auth_is_platform_admin()))
      OR (((tenant_id IS NOT NULL) AND (select public.auth_is_active_company_user(tenant_id))))
    );

-- ==============================================================================
-- Table: gateway_integrations
-- ==============================================================================
DROP POLICY IF EXISTS "Authorized tenant admins manage own gateway integrations" ON public.gateway_integrations;
DROP POLICY IF EXISTS "Platform admins manage platform gateway integrations" ON public.gateway_integrations;
DROP POLICY IF EXISTS "Tenant users manage own gateway_integrations" ON public.gateway_integrations;
DROP POLICY IF EXISTS "Tenant users view own gateway integrations" ON public.gateway_integrations;
DROP POLICY IF EXISTS "gateway_integrations_tenant_select_policy" ON public.gateway_integrations;
CREATE POLICY "gateway_integrations_tenant_select_policy" ON public.gateway_integrations
    FOR SELECT TO authenticated
    USING (
      (((tenant_id IS NOT NULL) AND (select public.auth_is_active_company_user(tenant_id)) AND auth_user_has_permission(tenant_id, 'settings.edit'::text)))
      OR (((select public.auth_is_platform_admin()) AND (tenant_id IS NULL)))
      OR ((((tenant_id IS NOT NULL) AND (select public.auth_is_active_company_user(tenant_id))) OR ((tenant_id IS NULL) AND (select public.auth_is_platform_admin()))))
      OR (((tenant_id IS NOT NULL) AND (select public.auth_is_active_company_user(tenant_id))))
    );
DROP POLICY IF EXISTS "gateway_integrations_tenant_insert_policy" ON public.gateway_integrations;
CREATE POLICY "gateway_integrations_tenant_insert_policy" ON public.gateway_integrations
    FOR INSERT TO authenticated
    WITH CHECK (
      (((tenant_id IS NOT NULL) AND (select public.auth_is_active_company_user(tenant_id)) AND auth_user_has_permission(tenant_id, 'settings.edit'::text)))
      OR (((select public.auth_is_platform_admin()) AND (tenant_id IS NULL)))
      OR ((((tenant_id IS NOT NULL) AND (select public.auth_is_active_company_user(tenant_id))) OR ((tenant_id IS NULL) AND (select public.auth_is_platform_admin()))))
    );
DROP POLICY IF EXISTS "gateway_integrations_tenant_update_policy" ON public.gateway_integrations;
CREATE POLICY "gateway_integrations_tenant_update_policy" ON public.gateway_integrations
    FOR UPDATE TO authenticated
    USING (
      (((tenant_id IS NOT NULL) AND (select public.auth_is_active_company_user(tenant_id)) AND auth_user_has_permission(tenant_id, 'settings.edit'::text)))
      OR (((select public.auth_is_platform_admin()) AND (tenant_id IS NULL)))
      OR ((((tenant_id IS NOT NULL) AND (select public.auth_is_active_company_user(tenant_id))) OR ((tenant_id IS NULL) AND (select public.auth_is_platform_admin()))))
    )
    WITH CHECK (
      (((tenant_id IS NOT NULL) AND (select public.auth_is_active_company_user(tenant_id)) AND auth_user_has_permission(tenant_id, 'settings.edit'::text)))
      OR (((select public.auth_is_platform_admin()) AND (tenant_id IS NULL)))
      OR ((((tenant_id IS NOT NULL) AND (select public.auth_is_active_company_user(tenant_id))) OR ((tenant_id IS NULL) AND (select public.auth_is_platform_admin()))))
    );
DROP POLICY IF EXISTS "gateway_integrations_tenant_delete_policy" ON public.gateway_integrations;
CREATE POLICY "gateway_integrations_tenant_delete_policy" ON public.gateway_integrations
    FOR DELETE TO authenticated
    USING (
      (((tenant_id IS NOT NULL) AND (select public.auth_is_active_company_user(tenant_id)) AND auth_user_has_permission(tenant_id, 'settings.edit'::text)))
      OR (((select public.auth_is_platform_admin()) AND (tenant_id IS NULL)))
      OR ((((tenant_id IS NOT NULL) AND (select public.auth_is_active_company_user(tenant_id))) OR ((tenant_id IS NULL) AND (select public.auth_is_platform_admin()))))
    );

-- ==============================================================================
-- Table: gateway_transactions
-- ==============================================================================
DROP POLICY IF EXISTS "Platform admins can manage gateway transactions" ON public.gateway_transactions;
DROP POLICY IF EXISTS "Tenant users view own gateway_transactions" ON public.gateway_transactions;
DROP POLICY IF EXISTS "Service and admins insert gateway transactions" ON public.gateway_transactions;
DROP POLICY IF EXISTS "Tenant users can initiate checkout transactions" ON public.gateway_transactions;
DROP POLICY IF EXISTS "Platform admins view all gateway transactions" ON public.gateway_transactions;
DROP POLICY IF EXISTS "Tenant users can view their own gateway transactions" ON public.gateway_transactions;
DROP POLICY IF EXISTS "Tenant users view own gateway transactions" ON public.gateway_transactions;
DROP POLICY IF EXISTS "Service and admins update gateway transactions" ON public.gateway_transactions;
DROP POLICY IF EXISTS "gateway_transactions_tenant_select_policy" ON public.gateway_transactions;
CREATE POLICY "gateway_transactions_tenant_select_policy" ON public.gateway_transactions
    FOR SELECT TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
      OR ((((tenant_id IS NOT NULL) AND (select public.auth_is_active_company_user(tenant_id))) OR ((tenant_id IS NULL) AND (select public.auth_is_platform_admin()))))
      OR ((select public.auth_is_platform_admin()))
      OR (((tenant_id IS NOT NULL) AND (select public.auth_is_active_company_user(tenant_id))))
    );
DROP POLICY IF EXISTS "gateway_transactions_tenant_insert_policy" ON public.gateway_transactions;
CREATE POLICY "gateway_transactions_tenant_insert_policy" ON public.gateway_transactions
    FOR INSERT TO authenticated
    WITH CHECK (
      ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
      OR ((((tenant_id IS NOT NULL) AND (select public.auth_is_active_company_user(tenant_id))) OR ((tenant_id IS NULL) AND (select public.auth_is_platform_admin()))))
      OR (((select public.auth_is_platform_admin()) OR ((tenant_id IS NOT NULL) AND (select public.auth_is_active_company_user(tenant_id)))))
      OR (((tenant_id IS NOT NULL) AND (select public.auth_is_active_company_user(tenant_id)) AND (payment_status = 'initiated'::text) AND (verification_status = 'unverified'::text)))
    );
DROP POLICY IF EXISTS "gateway_transactions_tenant_update_policy" ON public.gateway_transactions;
CREATE POLICY "gateway_transactions_tenant_update_policy" ON public.gateway_transactions
    FOR UPDATE TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
      OR ((((tenant_id IS NOT NULL) AND (select public.auth_is_active_company_user(tenant_id))) OR ((tenant_id IS NULL) AND (select public.auth_is_platform_admin()))))
      OR (((select public.auth_is_platform_admin()) OR ((tenant_id IS NOT NULL) AND (select public.auth_is_active_company_user(tenant_id)))))
    )
    WITH CHECK (
      ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
      OR ((((tenant_id IS NOT NULL) AND (select public.auth_is_active_company_user(tenant_id))) OR ((tenant_id IS NULL) AND (select public.auth_is_platform_admin()))))
      OR (((select public.auth_is_platform_admin()) OR ((tenant_id IS NOT NULL) AND (select public.auth_is_active_company_user(tenant_id)))))
    );
DROP POLICY IF EXISTS "gateway_transactions_tenant_delete_policy" ON public.gateway_transactions;
CREATE POLICY "gateway_transactions_tenant_delete_policy" ON public.gateway_transactions
    FOR DELETE TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
      OR ((((tenant_id IS NOT NULL) AND (select public.auth_is_active_company_user(tenant_id))) OR ((tenant_id IS NULL) AND (select public.auth_is_platform_admin()))))
    );

-- ==============================================================================
-- Table: installation_options
-- ==============================================================================
DROP POLICY IF EXISTS "installation_options_delete_tenant" ON public.installation_options;
DROP POLICY IF EXISTS "installation_options_insert_tenant" ON public.installation_options;
DROP POLICY IF EXISTS "installation_options_select_tenant" ON public.installation_options;
DROP POLICY IF EXISTS "installation_options_update_tenant" ON public.installation_options;
DROP POLICY IF EXISTS "installation_options_tenant_select_policy" ON public.installation_options;
CREATE POLICY "installation_options_tenant_select_policy" ON public.installation_options
    FOR SELECT TO authenticated
    USING (
      (((company_id = (( SELECT ((select auth.jwt()) ->> 'company_id'::text)))::uuid) OR (( SELECT ((select auth.jwt()) ->> 'role'::text)) = 'platform_admin'::text)))
    );
DROP POLICY IF EXISTS "installation_options_tenant_insert_policy" ON public.installation_options;
CREATE POLICY "installation_options_tenant_insert_policy" ON public.installation_options
    FOR INSERT TO authenticated
    WITH CHECK (
      (((company_id = (( SELECT ((select auth.jwt()) ->> 'company_id'::text)))::uuid) OR (( SELECT ((select auth.jwt()) ->> 'role'::text)) = 'platform_admin'::text)))
    );
DROP POLICY IF EXISTS "installation_options_tenant_update_policy" ON public.installation_options;
CREATE POLICY "installation_options_tenant_update_policy" ON public.installation_options
    FOR UPDATE TO authenticated
    USING (
      (((company_id = (( SELECT ((select auth.jwt()) ->> 'company_id'::text)))::uuid) OR (( SELECT ((select auth.jwt()) ->> 'role'::text)) = 'platform_admin'::text)))
    )
    WITH CHECK (
      (((company_id = (( SELECT ((select auth.jwt()) ->> 'company_id'::text)))::uuid) OR (( SELECT ((select auth.jwt()) ->> 'role'::text)) = 'platform_admin'::text)))
    );
DROP POLICY IF EXISTS "installation_options_tenant_delete_policy" ON public.installation_options;
CREATE POLICY "installation_options_tenant_delete_policy" ON public.installation_options
    FOR DELETE TO authenticated
    USING (
      (((company_id = (( SELECT ((select auth.jwt()) ->> 'company_id'::text)))::uuid) OR (( SELECT ((select auth.jwt()) ->> 'role'::text)) = 'platform_admin'::text)))
    );

-- ==============================================================================
-- Table: installations
-- ==============================================================================
DROP POLICY IF EXISTS "Authorized company users can manage installations" ON public.installations;
DROP POLICY IF EXISTS "Active company users can view installations" ON public.installations;
DROP POLICY IF EXISTS "installations_tenant_select_policy" ON public.installations;
CREATE POLICY "installations_tenant_select_policy" ON public.installations
    FOR SELECT TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'delivery.view'::text) OR auth_user_has_permission(company_id, 'delivery.edit'::text) OR auth_user_has_permission(company_id, 'production.edit'::text))))
      OR ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "installations_tenant_insert_policy" ON public.installations;
CREATE POLICY "installations_tenant_insert_policy" ON public.installations
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'delivery.view'::text) OR auth_user_has_permission(company_id, 'delivery.edit'::text) OR auth_user_has_permission(company_id, 'production.edit'::text))))
    );
DROP POLICY IF EXISTS "installations_tenant_update_policy" ON public.installations;
CREATE POLICY "installations_tenant_update_policy" ON public.installations
    FOR UPDATE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'delivery.view'::text) OR auth_user_has_permission(company_id, 'delivery.edit'::text) OR auth_user_has_permission(company_id, 'production.edit'::text))))
    )
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'delivery.view'::text) OR auth_user_has_permission(company_id, 'delivery.edit'::text) OR auth_user_has_permission(company_id, 'production.edit'::text))))
    );
DROP POLICY IF EXISTS "installations_tenant_delete_policy" ON public.installations;
CREATE POLICY "installations_tenant_delete_policy" ON public.installations
    FOR DELETE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'delivery.view'::text) OR auth_user_has_permission(company_id, 'delivery.edit'::text) OR auth_user_has_permission(company_id, 'production.edit'::text))))
    );

-- ==============================================================================
-- Table: inventory_locations
-- ==============================================================================
DROP POLICY IF EXISTS "Authorized company users can manage inventory locations" ON public.inventory_locations;
DROP POLICY IF EXISTS "Active company users can view inventory locations" ON public.inventory_locations;
DROP POLICY IF EXISTS "inventory_locations_tenant_select_policy" ON public.inventory_locations;
CREATE POLICY "inventory_locations_tenant_select_policy" ON public.inventory_locations
    FOR SELECT TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'inventory.view'::text) OR auth_user_has_permission(company_id, 'inventory.edit'::text) OR auth_user_has_permission(company_id, 'inventory.create'::text))))
      OR ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "inventory_locations_tenant_insert_policy" ON public.inventory_locations;
CREATE POLICY "inventory_locations_tenant_insert_policy" ON public.inventory_locations
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'inventory.view'::text) OR auth_user_has_permission(company_id, 'inventory.edit'::text) OR auth_user_has_permission(company_id, 'inventory.create'::text))))
    );
DROP POLICY IF EXISTS "inventory_locations_tenant_update_policy" ON public.inventory_locations;
CREATE POLICY "inventory_locations_tenant_update_policy" ON public.inventory_locations
    FOR UPDATE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'inventory.view'::text) OR auth_user_has_permission(company_id, 'inventory.edit'::text) OR auth_user_has_permission(company_id, 'inventory.create'::text))))
    )
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'inventory.view'::text) OR auth_user_has_permission(company_id, 'inventory.edit'::text) OR auth_user_has_permission(company_id, 'inventory.create'::text))))
    );
DROP POLICY IF EXISTS "inventory_locations_tenant_delete_policy" ON public.inventory_locations;
CREATE POLICY "inventory_locations_tenant_delete_policy" ON public.inventory_locations
    FOR DELETE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'inventory.view'::text) OR auth_user_has_permission(company_id, 'inventory.edit'::text) OR auth_user_has_permission(company_id, 'inventory.create'::text))))
    );

-- ==============================================================================
-- Table: inventory_rolls
-- ==============================================================================
DROP POLICY IF EXISTS "Authorized company users can manage inventory rolls" ON public.inventory_rolls;
DROP POLICY IF EXISTS "inventory_rolls_delete_tenant" ON public.inventory_rolls;
DROP POLICY IF EXISTS "inventory_rolls_insert_tenant" ON public.inventory_rolls;
DROP POLICY IF EXISTS "Active company users can view inventory rolls" ON public.inventory_rolls;
DROP POLICY IF EXISTS "inventory_rolls_select_tenant" ON public.inventory_rolls;
DROP POLICY IF EXISTS "inventory_rolls_update_tenant" ON public.inventory_rolls;
DROP POLICY IF EXISTS "inventory_rolls_tenant_select_policy" ON public.inventory_rolls;
CREATE POLICY "inventory_rolls_tenant_select_policy" ON public.inventory_rolls
    FOR SELECT TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM materials m
  WHERE ((m.id = inventory_rolls.material_id) AND (select public.auth_is_active_company_user(m.company_id))))))
      OR (((company_id = (( SELECT ((select auth.jwt()) ->> 'company_id'::text)))::uuid) OR (( SELECT ((select auth.jwt()) ->> 'role'::text)) = 'platform_admin'::text)))
    );
DROP POLICY IF EXISTS "inventory_rolls_tenant_insert_policy" ON public.inventory_rolls;
CREATE POLICY "inventory_rolls_tenant_insert_policy" ON public.inventory_rolls
    FOR INSERT TO authenticated
    WITH CHECK (
      ((EXISTS ( SELECT 1
   FROM materials m
  WHERE ((m.id = inventory_rolls.material_id) AND (select public.auth_is_active_company_user(m.company_id))))))
      OR (((company_id = (( SELECT ((select auth.jwt()) ->> 'company_id'::text)))::uuid) OR (( SELECT ((select auth.jwt()) ->> 'role'::text)) = 'platform_admin'::text)))
    );
DROP POLICY IF EXISTS "inventory_rolls_tenant_update_policy" ON public.inventory_rolls;
CREATE POLICY "inventory_rolls_tenant_update_policy" ON public.inventory_rolls
    FOR UPDATE TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM materials m
  WHERE ((m.id = inventory_rolls.material_id) AND (select public.auth_is_active_company_user(m.company_id))))))
      OR (((company_id = (( SELECT ((select auth.jwt()) ->> 'company_id'::text)))::uuid) OR (( SELECT ((select auth.jwt()) ->> 'role'::text)) = 'platform_admin'::text)))
    )
    WITH CHECK (
      ((EXISTS ( SELECT 1
   FROM materials m
  WHERE ((m.id = inventory_rolls.material_id) AND (select public.auth_is_active_company_user(m.company_id))))))
      OR (((company_id = (( SELECT ((select auth.jwt()) ->> 'company_id'::text)))::uuid) OR (( SELECT ((select auth.jwt()) ->> 'role'::text)) = 'platform_admin'::text)))
    );
DROP POLICY IF EXISTS "inventory_rolls_tenant_delete_policy" ON public.inventory_rolls;
CREATE POLICY "inventory_rolls_tenant_delete_policy" ON public.inventory_rolls
    FOR DELETE TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM materials m
  WHERE ((m.id = inventory_rolls.material_id) AND (select public.auth_is_active_company_user(m.company_id))))))
      OR (((company_id = (( SELECT ((select auth.jwt()) ->> 'company_id'::text)))::uuid) OR (( SELECT ((select auth.jwt()) ->> 'role'::text)) = 'platform_admin'::text)))
    );

-- ==============================================================================
-- Table: invoice_items
-- ==============================================================================
DROP POLICY IF EXISTS "Authorized company users can manage invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Active company users can view invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "invoice_items_tenant_select_policy" ON public.invoice_items;
CREATE POLICY "invoice_items_tenant_select_policy" ON public.invoice_items
    FOR SELECT TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM invoices inv
  WHERE ((inv.id = invoice_items.invoice_id) AND (select public.auth_is_active_company_user(inv.company_id))))))
    );
DROP POLICY IF EXISTS "invoice_items_tenant_insert_policy" ON public.invoice_items;
CREATE POLICY "invoice_items_tenant_insert_policy" ON public.invoice_items
    FOR INSERT TO authenticated
    WITH CHECK (
      ((EXISTS ( SELECT 1
   FROM invoices inv
  WHERE ((inv.id = invoice_items.invoice_id) AND (select public.auth_is_active_company_user(inv.company_id))))))
    );
DROP POLICY IF EXISTS "invoice_items_tenant_update_policy" ON public.invoice_items;
CREATE POLICY "invoice_items_tenant_update_policy" ON public.invoice_items
    FOR UPDATE TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM invoices inv
  WHERE ((inv.id = invoice_items.invoice_id) AND (select public.auth_is_active_company_user(inv.company_id))))))
    )
    WITH CHECK (
      ((EXISTS ( SELECT 1
   FROM invoices inv
  WHERE ((inv.id = invoice_items.invoice_id) AND (select public.auth_is_active_company_user(inv.company_id))))))
    );
DROP POLICY IF EXISTS "invoice_items_tenant_delete_policy" ON public.invoice_items;
CREATE POLICY "invoice_items_tenant_delete_policy" ON public.invoice_items
    FOR DELETE TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM invoices inv
  WHERE ((inv.id = invoice_items.invoice_id) AND (select public.auth_is_active_company_user(inv.company_id))))))
    );

-- ==============================================================================
-- Table: invoice_requests
-- ==============================================================================
DROP POLICY IF EXISTS "Tenant users can delete invoice requests" ON public.invoice_requests;
DROP POLICY IF EXISTS "Tenant users can insert invoice requests" ON public.invoice_requests;
DROP POLICY IF EXISTS "Tenant users can view invoice requests" ON public.invoice_requests;
DROP POLICY IF EXISTS "Tenant users can update invoice requests" ON public.invoice_requests;
DROP POLICY IF EXISTS "invoice_requests_tenant_select_policy" ON public.invoice_requests;
CREATE POLICY "invoice_requests_tenant_select_policy" ON public.invoice_requests
    FOR SELECT TO authenticated
    USING (
      ((company_id IN ( SELECT company_users.company_id
   FROM company_users
  WHERE (company_users.user_id = (select auth.uid())))))
    );
DROP POLICY IF EXISTS "invoice_requests_tenant_insert_policy" ON public.invoice_requests;
CREATE POLICY "invoice_requests_tenant_insert_policy" ON public.invoice_requests
    FOR INSERT TO authenticated
    WITH CHECK (
      ((company_id IN ( SELECT company_users.company_id
   FROM company_users
  WHERE (company_users.user_id = (select auth.uid())))))
    );
DROP POLICY IF EXISTS "invoice_requests_tenant_update_policy" ON public.invoice_requests;
CREATE POLICY "invoice_requests_tenant_update_policy" ON public.invoice_requests
    FOR UPDATE TO authenticated
    USING (
      ((company_id IN ( SELECT company_users.company_id
   FROM company_users
  WHERE (company_users.user_id = (select auth.uid())))))
    )
    WITH CHECK (
      ((company_id IN ( SELECT company_users.company_id
   FROM company_users
  WHERE (company_users.user_id = (select auth.uid())))))
    );
DROP POLICY IF EXISTS "invoice_requests_tenant_delete_policy" ON public.invoice_requests;
CREATE POLICY "invoice_requests_tenant_delete_policy" ON public.invoice_requests
    FOR DELETE TO authenticated
    USING (
      ((company_id IN ( SELECT company_users.company_id
   FROM company_users
  WHERE (company_users.user_id = (select auth.uid())))))
    );

-- ==============================================================================
-- Table: invoices
-- ==============================================================================
DROP POLICY IF EXISTS "Authorized company users can manage invoices" ON public.invoices;
DROP POLICY IF EXISTS "Active company users can view invoices" ON public.invoices;
DROP POLICY IF EXISTS "invoices_tenant_select_policy" ON public.invoices;
CREATE POLICY "invoices_tenant_select_policy" ON public.invoices
    FOR SELECT TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'billing.view'::text) OR auth_user_has_permission(company_id, 'billing.create'::text) OR auth_user_has_permission(company_id, 'billing.edit'::text))))
      OR ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "invoices_tenant_insert_policy" ON public.invoices;
CREATE POLICY "invoices_tenant_insert_policy" ON public.invoices
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'billing.view'::text) OR auth_user_has_permission(company_id, 'billing.create'::text) OR auth_user_has_permission(company_id, 'billing.edit'::text))))
    );
DROP POLICY IF EXISTS "invoices_tenant_update_policy" ON public.invoices;
CREATE POLICY "invoices_tenant_update_policy" ON public.invoices
    FOR UPDATE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'billing.view'::text) OR auth_user_has_permission(company_id, 'billing.create'::text) OR auth_user_has_permission(company_id, 'billing.edit'::text))))
    )
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'billing.view'::text) OR auth_user_has_permission(company_id, 'billing.create'::text) OR auth_user_has_permission(company_id, 'billing.edit'::text))))
    );
DROP POLICY IF EXISTS "invoices_tenant_delete_policy" ON public.invoices;
CREATE POLICY "invoices_tenant_delete_policy" ON public.invoices
    FOR DELETE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'billing.view'::text) OR auth_user_has_permission(company_id, 'billing.create'::text) OR auth_user_has_permission(company_id, 'billing.edit'::text))))
    );

-- ==============================================================================
-- Table: job_costings
-- ==============================================================================
DROP POLICY IF EXISTS "Authorized company users can manage job costings" ON public.job_costings;
DROP POLICY IF EXISTS "Active company users can view job costings" ON public.job_costings;
DROP POLICY IF EXISTS "job_costings_tenant_select_policy" ON public.job_costings;
CREATE POLICY "job_costings_tenant_select_policy" ON public.job_costings
    FOR SELECT TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'costing.view'::text) OR auth_user_has_permission(company_id, 'costing.edit'::text) OR auth_user_has_permission(company_id, 'production.edit'::text))))
      OR ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "job_costings_tenant_insert_policy" ON public.job_costings;
CREATE POLICY "job_costings_tenant_insert_policy" ON public.job_costings
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'costing.view'::text) OR auth_user_has_permission(company_id, 'costing.edit'::text) OR auth_user_has_permission(company_id, 'production.edit'::text))))
    );
DROP POLICY IF EXISTS "job_costings_tenant_update_policy" ON public.job_costings;
CREATE POLICY "job_costings_tenant_update_policy" ON public.job_costings
    FOR UPDATE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'costing.view'::text) OR auth_user_has_permission(company_id, 'costing.edit'::text) OR auth_user_has_permission(company_id, 'production.edit'::text))))
    )
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'costing.view'::text) OR auth_user_has_permission(company_id, 'costing.edit'::text) OR auth_user_has_permission(company_id, 'production.edit'::text))))
    );
DROP POLICY IF EXISTS "job_costings_tenant_delete_policy" ON public.job_costings;
CREATE POLICY "job_costings_tenant_delete_policy" ON public.job_costings
    FOR DELETE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'costing.view'::text) OR auth_user_has_permission(company_id, 'costing.edit'::text) OR auth_user_has_permission(company_id, 'production.edit'::text))))
    );

-- ==============================================================================
-- Table: job_orders
-- ==============================================================================
DROP POLICY IF EXISTS "Authorized company users can manage job orders" ON public.job_orders;
DROP POLICY IF EXISTS "Active company users can view job orders" ON public.job_orders;
DROP POLICY IF EXISTS "job_orders_tenant_select_policy" ON public.job_orders;
CREATE POLICY "job_orders_tenant_select_policy" ON public.job_orders
    FOR SELECT TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'production.edit'::text) OR auth_user_has_permission(company_id, 'production.create'::text) OR auth_user_has_permission(company_id, 'order.edit'::text))))
      OR ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "job_orders_tenant_insert_policy" ON public.job_orders;
CREATE POLICY "job_orders_tenant_insert_policy" ON public.job_orders
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'production.edit'::text) OR auth_user_has_permission(company_id, 'production.create'::text) OR auth_user_has_permission(company_id, 'order.edit'::text))))
    );
DROP POLICY IF EXISTS "job_orders_tenant_update_policy" ON public.job_orders;
CREATE POLICY "job_orders_tenant_update_policy" ON public.job_orders
    FOR UPDATE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'production.edit'::text) OR auth_user_has_permission(company_id, 'production.create'::text) OR auth_user_has_permission(company_id, 'order.edit'::text))))
    )
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'production.edit'::text) OR auth_user_has_permission(company_id, 'production.create'::text) OR auth_user_has_permission(company_id, 'order.edit'::text))))
    );
DROP POLICY IF EXISTS "job_orders_tenant_delete_policy" ON public.job_orders;
CREATE POLICY "job_orders_tenant_delete_policy" ON public.job_orders
    FOR DELETE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'production.edit'::text) OR auth_user_has_permission(company_id, 'production.create'::text) OR auth_user_has_permission(company_id, 'order.edit'::text))))
    );

-- ==============================================================================
-- Table: machinery_assignments
-- ==============================================================================
DROP POLICY IF EXISTS "Authorized company users can manage machinery assignments" ON public.machinery_assignments;
DROP POLICY IF EXISTS "Active company users can view machinery assignments" ON public.machinery_assignments;
DROP POLICY IF EXISTS "machinery_assignments_tenant_select_policy" ON public.machinery_assignments;
CREATE POLICY "machinery_assignments_tenant_select_policy" ON public.machinery_assignments
    FOR SELECT TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'machineries.assign'::text) OR auth_user_has_permission(company_id, 'production.assign'::text) OR auth_user_has_permission(company_id, 'production.edit'::text) OR (auth_get_user_company_role(company_id) = ANY (ARRAY['business_owner'::text, 'owner'::text, 'admin'::text, 'production_manager'::text])))))
      OR ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "machinery_assignments_tenant_insert_policy" ON public.machinery_assignments;
CREATE POLICY "machinery_assignments_tenant_insert_policy" ON public.machinery_assignments
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'machineries.assign'::text) OR auth_user_has_permission(company_id, 'production.assign'::text) OR auth_user_has_permission(company_id, 'production.edit'::text) OR (auth_get_user_company_role(company_id) = ANY (ARRAY['business_owner'::text, 'owner'::text, 'admin'::text, 'production_manager'::text])))))
    );
DROP POLICY IF EXISTS "machinery_assignments_tenant_update_policy" ON public.machinery_assignments;
CREATE POLICY "machinery_assignments_tenant_update_policy" ON public.machinery_assignments
    FOR UPDATE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'machineries.assign'::text) OR auth_user_has_permission(company_id, 'production.assign'::text) OR auth_user_has_permission(company_id, 'production.edit'::text) OR (auth_get_user_company_role(company_id) = ANY (ARRAY['business_owner'::text, 'owner'::text, 'admin'::text, 'production_manager'::text])))))
    )
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'machineries.assign'::text) OR auth_user_has_permission(company_id, 'production.assign'::text) OR auth_user_has_permission(company_id, 'production.edit'::text) OR (auth_get_user_company_role(company_id) = ANY (ARRAY['business_owner'::text, 'owner'::text, 'admin'::text, 'production_manager'::text])))))
    );
DROP POLICY IF EXISTS "machinery_assignments_tenant_delete_policy" ON public.machinery_assignments;
CREATE POLICY "machinery_assignments_tenant_delete_policy" ON public.machinery_assignments
    FOR DELETE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'machineries.assign'::text) OR auth_user_has_permission(company_id, 'production.assign'::text) OR auth_user_has_permission(company_id, 'production.edit'::text) OR (auth_get_user_company_role(company_id) = ANY (ARRAY['business_owner'::text, 'owner'::text, 'admin'::text, 'production_manager'::text])))))
    );

-- ==============================================================================
-- Table: machinery_maintenances
-- ==============================================================================
DROP POLICY IF EXISTS "Authorized company users can manage machinery maintenances" ON public.machinery_maintenances;
DROP POLICY IF EXISTS "Active company users can view machinery maintenances" ON public.machinery_maintenances;
DROP POLICY IF EXISTS "machinery_maintenances_tenant_select_policy" ON public.machinery_maintenances;
CREATE POLICY "machinery_maintenances_tenant_select_policy" ON public.machinery_maintenances
    FOR SELECT TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'machineries.maintenance'::text) OR auth_user_has_permission(company_id, 'production.edit'::text) OR (auth_get_user_company_role(company_id) = ANY (ARRAY['business_owner'::text, 'owner'::text, 'admin'::text, 'production_manager'::text])))))
      OR ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "machinery_maintenances_tenant_insert_policy" ON public.machinery_maintenances;
CREATE POLICY "machinery_maintenances_tenant_insert_policy" ON public.machinery_maintenances
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'machineries.maintenance'::text) OR auth_user_has_permission(company_id, 'production.edit'::text) OR (auth_get_user_company_role(company_id) = ANY (ARRAY['business_owner'::text, 'owner'::text, 'admin'::text, 'production_manager'::text])))))
    );
DROP POLICY IF EXISTS "machinery_maintenances_tenant_update_policy" ON public.machinery_maintenances;
CREATE POLICY "machinery_maintenances_tenant_update_policy" ON public.machinery_maintenances
    FOR UPDATE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'machineries.maintenance'::text) OR auth_user_has_permission(company_id, 'production.edit'::text) OR (auth_get_user_company_role(company_id) = ANY (ARRAY['business_owner'::text, 'owner'::text, 'admin'::text, 'production_manager'::text])))))
    )
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'machineries.maintenance'::text) OR auth_user_has_permission(company_id, 'production.edit'::text) OR (auth_get_user_company_role(company_id) = ANY (ARRAY['business_owner'::text, 'owner'::text, 'admin'::text, 'production_manager'::text])))))
    );
DROP POLICY IF EXISTS "machinery_maintenances_tenant_delete_policy" ON public.machinery_maintenances;
CREATE POLICY "machinery_maintenances_tenant_delete_policy" ON public.machinery_maintenances
    FOR DELETE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'machineries.maintenance'::text) OR auth_user_has_permission(company_id, 'production.edit'::text) OR (auth_get_user_company_role(company_id) = ANY (ARRAY['business_owner'::text, 'owner'::text, 'admin'::text, 'production_manager'::text])))))
    );

-- ==============================================================================
-- Table: material_purchase_configs
-- ==============================================================================
DROP POLICY IF EXISTS "mat_purchase_configs_delete_tenant" ON public.material_purchase_configs;
DROP POLICY IF EXISTS "mat_purchase_configs_insert_tenant" ON public.material_purchase_configs;
DROP POLICY IF EXISTS "mat_purchase_configs_select_tenant" ON public.material_purchase_configs;
DROP POLICY IF EXISTS "mat_purchase_configs_update_tenant" ON public.material_purchase_configs;
DROP POLICY IF EXISTS "material_purchase_configs_tenant_select_policy" ON public.material_purchase_configs;
CREATE POLICY "material_purchase_configs_tenant_select_policy" ON public.material_purchase_configs
    FOR SELECT TO authenticated
    USING (
      (((company_id = (( SELECT ((select auth.jwt()) ->> 'company_id'::text)))::uuid) OR (( SELECT ((select auth.jwt()) ->> 'role'::text)) = 'platform_admin'::text)))
    );
DROP POLICY IF EXISTS "material_purchase_configs_tenant_insert_policy" ON public.material_purchase_configs;
CREATE POLICY "material_purchase_configs_tenant_insert_policy" ON public.material_purchase_configs
    FOR INSERT TO authenticated
    WITH CHECK (
      (((company_id = (( SELECT ((select auth.jwt()) ->> 'company_id'::text)))::uuid) OR (( SELECT ((select auth.jwt()) ->> 'role'::text)) = 'platform_admin'::text)))
    );
DROP POLICY IF EXISTS "material_purchase_configs_tenant_update_policy" ON public.material_purchase_configs;
CREATE POLICY "material_purchase_configs_tenant_update_policy" ON public.material_purchase_configs
    FOR UPDATE TO authenticated
    USING (
      (((company_id = (( SELECT ((select auth.jwt()) ->> 'company_id'::text)))::uuid) OR (( SELECT ((select auth.jwt()) ->> 'role'::text)) = 'platform_admin'::text)))
    )
    WITH CHECK (
      (((company_id = (( SELECT ((select auth.jwt()) ->> 'company_id'::text)))::uuid) OR (( SELECT ((select auth.jwt()) ->> 'role'::text)) = 'platform_admin'::text)))
    );
DROP POLICY IF EXISTS "material_purchase_configs_tenant_delete_policy" ON public.material_purchase_configs;
CREATE POLICY "material_purchase_configs_tenant_delete_policy" ON public.material_purchase_configs
    FOR DELETE TO authenticated
    USING (
      (((company_id = (( SELECT ((select auth.jwt()) ->> 'company_id'::text)))::uuid) OR (( SELECT ((select auth.jwt()) ->> 'role'::text)) = 'platform_admin'::text)))
    );

-- ==============================================================================
-- Table: material_requests
-- ==============================================================================
DROP POLICY IF EXISTS "Authorized company users can manage material requests" ON public.material_requests;
DROP POLICY IF EXISTS "Active company users can view material requests" ON public.material_requests;
DROP POLICY IF EXISTS "material_requests_tenant_select_policy" ON public.material_requests;
CREATE POLICY "material_requests_tenant_select_policy" ON public.material_requests
    FOR SELECT TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'inventory.view'::text) OR auth_user_has_permission(company_id, 'inventory.edit'::text) OR auth_user_has_permission(company_id, 'production.view'::text) OR auth_user_has_permission(company_id, 'production.edit'::text))))
      OR ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "material_requests_tenant_insert_policy" ON public.material_requests;
CREATE POLICY "material_requests_tenant_insert_policy" ON public.material_requests
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'inventory.view'::text) OR auth_user_has_permission(company_id, 'inventory.edit'::text) OR auth_user_has_permission(company_id, 'production.view'::text) OR auth_user_has_permission(company_id, 'production.edit'::text))))
    );
DROP POLICY IF EXISTS "material_requests_tenant_update_policy" ON public.material_requests;
CREATE POLICY "material_requests_tenant_update_policy" ON public.material_requests
    FOR UPDATE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'inventory.view'::text) OR auth_user_has_permission(company_id, 'inventory.edit'::text) OR auth_user_has_permission(company_id, 'production.view'::text) OR auth_user_has_permission(company_id, 'production.edit'::text))))
    )
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'inventory.view'::text) OR auth_user_has_permission(company_id, 'inventory.edit'::text) OR auth_user_has_permission(company_id, 'production.view'::text) OR auth_user_has_permission(company_id, 'production.edit'::text))))
    );
DROP POLICY IF EXISTS "material_requests_tenant_delete_policy" ON public.material_requests;
CREATE POLICY "material_requests_tenant_delete_policy" ON public.material_requests
    FOR DELETE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'inventory.view'::text) OR auth_user_has_permission(company_id, 'inventory.edit'::text) OR auth_user_has_permission(company_id, 'production.view'::text) OR auth_user_has_permission(company_id, 'production.edit'::text))))
    );

-- ==============================================================================
-- Table: materials
-- ==============================================================================
DROP POLICY IF EXISTS "Authorized company users can manage materials" ON public.materials;
DROP POLICY IF EXISTS "Active company users can view materials" ON public.materials;
DROP POLICY IF EXISTS "materials_tenant_select_policy" ON public.materials;
CREATE POLICY "materials_tenant_select_policy" ON public.materials
    FOR SELECT TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'inventory.view'::text) OR auth_user_has_permission(company_id, 'inventory.edit'::text) OR auth_user_has_permission(company_id, 'inventory.create'::text))))
      OR ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "materials_tenant_insert_policy" ON public.materials;
CREATE POLICY "materials_tenant_insert_policy" ON public.materials
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'inventory.view'::text) OR auth_user_has_permission(company_id, 'inventory.edit'::text) OR auth_user_has_permission(company_id, 'inventory.create'::text))))
    );
DROP POLICY IF EXISTS "materials_tenant_update_policy" ON public.materials;
CREATE POLICY "materials_tenant_update_policy" ON public.materials
    FOR UPDATE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'inventory.view'::text) OR auth_user_has_permission(company_id, 'inventory.edit'::text) OR auth_user_has_permission(company_id, 'inventory.create'::text))))
    )
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'inventory.view'::text) OR auth_user_has_permission(company_id, 'inventory.edit'::text) OR auth_user_has_permission(company_id, 'inventory.create'::text))))
    );
DROP POLICY IF EXISTS "materials_tenant_delete_policy" ON public.materials;
CREATE POLICY "materials_tenant_delete_policy" ON public.materials
    FOR DELETE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'inventory.view'::text) OR auth_user_has_permission(company_id, 'inventory.edit'::text) OR auth_user_has_permission(company_id, 'inventory.create'::text))))
    );

-- ==============================================================================
-- Table: message_templates
-- ==============================================================================
DROP POLICY IF EXISTS "Authorized company users can manage templates" ON public.message_templates;
DROP POLICY IF EXISTS "Active company users can view templates" ON public.message_templates;
DROP POLICY IF EXISTS "message_templates_tenant_select_policy" ON public.message_templates;
CREATE POLICY "message_templates_tenant_select_policy" ON public.message_templates
    FOR SELECT TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND auth_user_has_permission(company_id, 'settings.edit'::text)))
      OR ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "message_templates_tenant_insert_policy" ON public.message_templates;
CREATE POLICY "message_templates_tenant_insert_policy" ON public.message_templates
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND auth_user_has_permission(company_id, 'settings.edit'::text)))
    );
DROP POLICY IF EXISTS "message_templates_tenant_update_policy" ON public.message_templates;
CREATE POLICY "message_templates_tenant_update_policy" ON public.message_templates
    FOR UPDATE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND auth_user_has_permission(company_id, 'settings.edit'::text)))
    )
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND auth_user_has_permission(company_id, 'settings.edit'::text)))
    );
DROP POLICY IF EXISTS "message_templates_tenant_delete_policy" ON public.message_templates;
CREATE POLICY "message_templates_tenant_delete_policy" ON public.message_templates
    FOR DELETE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND auth_user_has_permission(company_id, 'settings.edit'::text)))
    );

-- ==============================================================================
-- Table: notification_preferences
-- ==============================================================================
DROP POLICY IF EXISTS "Tenant admins manage notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Tenant users view notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_tenant_select_policy" ON public.notification_preferences;
CREATE POLICY "notification_preferences_tenant_select_policy" ON public.notification_preferences
    FOR SELECT TO authenticated
    USING (
      ((((select public.auth_is_active_company_user(tenant_id)) AND auth_user_has_permission(tenant_id, 'settings.edit'::text)) OR (select public.auth_is_platform_admin())))
      OR (((select public.auth_is_active_company_user(tenant_id)) OR (select public.auth_is_platform_admin())))
    );
DROP POLICY IF EXISTS "notification_preferences_tenant_insert_policy" ON public.notification_preferences;
CREATE POLICY "notification_preferences_tenant_insert_policy" ON public.notification_preferences
    FOR INSERT TO authenticated
    WITH CHECK (
      ((((select public.auth_is_active_company_user(tenant_id)) AND auth_user_has_permission(tenant_id, 'settings.edit'::text)) OR (select public.auth_is_platform_admin())))
    );
DROP POLICY IF EXISTS "notification_preferences_tenant_update_policy" ON public.notification_preferences;
CREATE POLICY "notification_preferences_tenant_update_policy" ON public.notification_preferences
    FOR UPDATE TO authenticated
    USING (
      ((((select public.auth_is_active_company_user(tenant_id)) AND auth_user_has_permission(tenant_id, 'settings.edit'::text)) OR (select public.auth_is_platform_admin())))
    )
    WITH CHECK (
      ((((select public.auth_is_active_company_user(tenant_id)) AND auth_user_has_permission(tenant_id, 'settings.edit'::text)) OR (select public.auth_is_platform_admin())))
    );
DROP POLICY IF EXISTS "notification_preferences_tenant_delete_policy" ON public.notification_preferences;
CREATE POLICY "notification_preferences_tenant_delete_policy" ON public.notification_preferences
    FOR DELETE TO authenticated
    USING (
      ((((select public.auth_is_active_company_user(tenant_id)) AND auth_user_has_permission(tenant_id, 'settings.edit'::text)) OR (select public.auth_is_platform_admin())))
    );

-- ==============================================================================
-- Table: otp_requests
-- ==============================================================================
DROP POLICY IF EXISTS "Platform admins and service role manage OTP requests" ON public.otp_requests;
DROP POLICY IF EXISTS "Users can verify their own active OTP requests" ON public.otp_requests;
DROP POLICY IF EXISTS "otp_requests_tenant_select_policy" ON public.otp_requests;
CREATE POLICY "otp_requests_tenant_select_policy" ON public.otp_requests
    FOR SELECT TO authenticated
    USING (
      ((select public.auth_is_platform_admin()))
      OR (((user_id = ( SELECT auth.uid() AS uid)) OR ((tenant_id IS NOT NULL) AND (select public.auth_is_active_company_user(tenant_id))) OR (select public.auth_is_platform_admin())))
    );
DROP POLICY IF EXISTS "otp_requests_tenant_insert_policy" ON public.otp_requests;
CREATE POLICY "otp_requests_tenant_insert_policy" ON public.otp_requests
    FOR INSERT TO authenticated
    WITH CHECK (
      ((select public.auth_is_platform_admin()))
    );
DROP POLICY IF EXISTS "otp_requests_tenant_update_policy" ON public.otp_requests;
CREATE POLICY "otp_requests_tenant_update_policy" ON public.otp_requests
    FOR UPDATE TO authenticated
    USING (
      ((select public.auth_is_platform_admin()))
    )
    WITH CHECK (
      ((select public.auth_is_platform_admin()))
    );
DROP POLICY IF EXISTS "otp_requests_tenant_delete_policy" ON public.otp_requests;
CREATE POLICY "otp_requests_tenant_delete_policy" ON public.otp_requests
    FOR DELETE TO authenticated
    USING (
      ((select public.auth_is_platform_admin()))
    );

-- ==============================================================================
-- Table: payment_allocations
-- ==============================================================================
DROP POLICY IF EXISTS "Authorized company users can manage allocations" ON public.payment_allocations;
DROP POLICY IF EXISTS "Active company users can view allocations" ON public.payment_allocations;
DROP POLICY IF EXISTS "payment_allocations_tenant_select_policy" ON public.payment_allocations;
CREATE POLICY "payment_allocations_tenant_select_policy" ON public.payment_allocations
    FOR SELECT TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM payments p
  WHERE ((p.id = payment_allocations.payment_id) AND (select public.auth_is_active_company_user(p.company_id))))))
    );
DROP POLICY IF EXISTS "payment_allocations_tenant_insert_policy" ON public.payment_allocations;
CREATE POLICY "payment_allocations_tenant_insert_policy" ON public.payment_allocations
    FOR INSERT TO authenticated
    WITH CHECK (
      ((EXISTS ( SELECT 1
   FROM payments p
  WHERE ((p.id = payment_allocations.payment_id) AND (select public.auth_is_active_company_user(p.company_id))))))
    );
DROP POLICY IF EXISTS "payment_allocations_tenant_update_policy" ON public.payment_allocations;
CREATE POLICY "payment_allocations_tenant_update_policy" ON public.payment_allocations
    FOR UPDATE TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM payments p
  WHERE ((p.id = payment_allocations.payment_id) AND (select public.auth_is_active_company_user(p.company_id))))))
    )
    WITH CHECK (
      ((EXISTS ( SELECT 1
   FROM payments p
  WHERE ((p.id = payment_allocations.payment_id) AND (select public.auth_is_active_company_user(p.company_id))))))
    );
DROP POLICY IF EXISTS "payment_allocations_tenant_delete_policy" ON public.payment_allocations;
CREATE POLICY "payment_allocations_tenant_delete_policy" ON public.payment_allocations
    FOR DELETE TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM payments p
  WHERE ((p.id = payment_allocations.payment_id) AND (select public.auth_is_active_company_user(p.company_id))))))
    );

-- ==============================================================================
-- Table: payments
-- ==============================================================================
DROP POLICY IF EXISTS "Authorized company users can manage payments" ON public.payments;
DROP POLICY IF EXISTS "Active company users can view payments" ON public.payments;
DROP POLICY IF EXISTS "payments_tenant_select_policy" ON public.payments;
CREATE POLICY "payments_tenant_select_policy" ON public.payments
    FOR SELECT TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'billing.view'::text) OR auth_user_has_permission(company_id, 'billing.create'::text))))
      OR ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "payments_tenant_insert_policy" ON public.payments;
CREATE POLICY "payments_tenant_insert_policy" ON public.payments
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'billing.view'::text) OR auth_user_has_permission(company_id, 'billing.create'::text))))
    );
DROP POLICY IF EXISTS "payments_tenant_update_policy" ON public.payments;
CREATE POLICY "payments_tenant_update_policy" ON public.payments
    FOR UPDATE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'billing.view'::text) OR auth_user_has_permission(company_id, 'billing.create'::text))))
    )
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'billing.view'::text) OR auth_user_has_permission(company_id, 'billing.create'::text))))
    );
DROP POLICY IF EXISTS "payments_tenant_delete_policy" ON public.payments;
CREATE POLICY "payments_tenant_delete_policy" ON public.payments
    FOR DELETE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'billing.view'::text) OR auth_user_has_permission(company_id, 'billing.create'::text))))
    );

-- ==============================================================================
-- Table: payroll_items
-- ==============================================================================
DROP POLICY IF EXISTS "payroll_items_manage_authorized" ON public.payroll_items;
DROP POLICY IF EXISTS "payroll_items_select_scoped" ON public.payroll_items;
DROP POLICY IF EXISTS "payroll_items_tenant_select_policy" ON public.payroll_items;
CREATE POLICY "payroll_items_tenant_select_policy" ON public.payroll_items
    FOR SELECT TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM payroll_periods pp
  WHERE ((pp.id = payroll_items.payroll_period_id) AND (select public.auth_is_active_company_user(pp.company_id)) AND (auth_user_has_permission(pp.company_id, 'payroll.edit'::text) OR auth_user_has_permission(pp.company_id, 'hr.edit'::text) OR (auth_get_user_company_role(pp.company_id) = ANY (ARRAY['business_owner'::text, 'owner'::text, 'branch_manager'::text])))))))
      OR ((EXISTS ( SELECT 1
   FROM payroll_periods pp
  WHERE ((pp.id = payroll_items.payroll_period_id) AND (select public.auth_is_active_company_user(pp.company_id)) AND (auth_user_has_permission(pp.company_id, 'hr.edit'::text) OR auth_user_has_permission(pp.company_id, 'hr.approve'::text) OR auth_user_has_permission(pp.company_id, 'payroll.view'::text) OR auth_user_has_permission(pp.company_id, 'payroll.edit'::text) OR (auth_get_user_company_role(pp.company_id) = ANY (ARRAY['business_owner'::text, 'owner'::text, 'branch_manager'::text, 'accountant'::text])) OR (payroll_items.employee_id = auth_get_current_employee_id(pp.company_id)))))))
    );
DROP POLICY IF EXISTS "payroll_items_tenant_insert_policy" ON public.payroll_items;
CREATE POLICY "payroll_items_tenant_insert_policy" ON public.payroll_items
    FOR INSERT TO authenticated
    WITH CHECK (
      ((EXISTS ( SELECT 1
   FROM payroll_periods pp
  WHERE ((pp.id = payroll_items.payroll_period_id) AND (select public.auth_is_active_company_user(pp.company_id)) AND (auth_user_has_permission(pp.company_id, 'payroll.edit'::text) OR auth_user_has_permission(pp.company_id, 'hr.edit'::text) OR (auth_get_user_company_role(pp.company_id) = ANY (ARRAY['business_owner'::text, 'owner'::text, 'branch_manager'::text])))))))
    );
DROP POLICY IF EXISTS "payroll_items_tenant_update_policy" ON public.payroll_items;
CREATE POLICY "payroll_items_tenant_update_policy" ON public.payroll_items
    FOR UPDATE TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM payroll_periods pp
  WHERE ((pp.id = payroll_items.payroll_period_id) AND (select public.auth_is_active_company_user(pp.company_id)) AND (auth_user_has_permission(pp.company_id, 'payroll.edit'::text) OR auth_user_has_permission(pp.company_id, 'hr.edit'::text) OR (auth_get_user_company_role(pp.company_id) = ANY (ARRAY['business_owner'::text, 'owner'::text, 'branch_manager'::text])))))))
    )
    WITH CHECK (
      ((EXISTS ( SELECT 1
   FROM payroll_periods pp
  WHERE ((pp.id = payroll_items.payroll_period_id) AND (select public.auth_is_active_company_user(pp.company_id)) AND (auth_user_has_permission(pp.company_id, 'payroll.edit'::text) OR auth_user_has_permission(pp.company_id, 'hr.edit'::text) OR (auth_get_user_company_role(pp.company_id) = ANY (ARRAY['business_owner'::text, 'owner'::text, 'branch_manager'::text])))))))
    );
DROP POLICY IF EXISTS "payroll_items_tenant_delete_policy" ON public.payroll_items;
CREATE POLICY "payroll_items_tenant_delete_policy" ON public.payroll_items
    FOR DELETE TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM payroll_periods pp
  WHERE ((pp.id = payroll_items.payroll_period_id) AND (select public.auth_is_active_company_user(pp.company_id)) AND (auth_user_has_permission(pp.company_id, 'payroll.edit'::text) OR auth_user_has_permission(pp.company_id, 'hr.edit'::text) OR (auth_get_user_company_role(pp.company_id) = ANY (ARRAY['business_owner'::text, 'owner'::text, 'branch_manager'::text])))))))
    );

-- ==============================================================================
-- Table: payroll_periods
-- ==============================================================================
DROP POLICY IF EXISTS "Authorized company users can manage payroll periods" ON public.payroll_periods;
DROP POLICY IF EXISTS "Active company users can view payroll periods" ON public.payroll_periods;
DROP POLICY IF EXISTS "payroll_periods_tenant_select_policy" ON public.payroll_periods;
CREATE POLICY "payroll_periods_tenant_select_policy" ON public.payroll_periods
    FOR SELECT TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND auth_user_has_permission(company_id, 'payroll.edit'::text)))
      OR ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "payroll_periods_tenant_insert_policy" ON public.payroll_periods;
CREATE POLICY "payroll_periods_tenant_insert_policy" ON public.payroll_periods
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND auth_user_has_permission(company_id, 'payroll.edit'::text)))
    );
DROP POLICY IF EXISTS "payroll_periods_tenant_update_policy" ON public.payroll_periods;
CREATE POLICY "payroll_periods_tenant_update_policy" ON public.payroll_periods
    FOR UPDATE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND auth_user_has_permission(company_id, 'payroll.edit'::text)))
    )
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND auth_user_has_permission(company_id, 'payroll.edit'::text)))
    );
DROP POLICY IF EXISTS "payroll_periods_tenant_delete_policy" ON public.payroll_periods;
CREATE POLICY "payroll_periods_tenant_delete_policy" ON public.payroll_periods
    FOR DELETE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND auth_user_has_permission(company_id, 'payroll.edit'::text)))
    );

-- ==============================================================================
-- Table: plan_versions
-- ==============================================================================
DROP POLICY IF EXISTS "Platform admins can manage plan versions" ON public.plan_versions;
DROP POLICY IF EXISTS "Public can view plan versions" ON public.plan_versions;
DROP POLICY IF EXISTS "plan_versions_tenant_select_policy" ON public.plan_versions;
CREATE POLICY "plan_versions_tenant_select_policy" ON public.plan_versions
    FOR SELECT TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
      OR (true)
    );
DROP POLICY IF EXISTS "plan_versions_tenant_insert_policy" ON public.plan_versions;
CREATE POLICY "plan_versions_tenant_insert_policy" ON public.plan_versions
    FOR INSERT TO authenticated
    WITH CHECK (
      ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
    );
DROP POLICY IF EXISTS "plan_versions_tenant_update_policy" ON public.plan_versions;
CREATE POLICY "plan_versions_tenant_update_policy" ON public.plan_versions
    FOR UPDATE TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
    )
    WITH CHECK (
      ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
    );
DROP POLICY IF EXISTS "plan_versions_tenant_delete_policy" ON public.plan_versions;
CREATE POLICY "plan_versions_tenant_delete_policy" ON public.plan_versions
    FOR DELETE TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
    );

-- ==============================================================================
-- Table: platform_active_sessions
-- ==============================================================================
DROP POLICY IF EXISTS "Platform admins view active sessions" ON public.platform_active_sessions;
DROP POLICY IF EXISTS "Platform owners have full control on active sessions" ON public.platform_active_sessions;
DROP POLICY IF EXISTS "Platform owners have full control on platform active sessions" ON public.platform_active_sessions;
DROP POLICY IF EXISTS "platform_active_sessions_tenant_select_policy" ON public.platform_active_sessions;
CREATE POLICY "platform_active_sessions_tenant_select_policy" ON public.platform_active_sessions
    FOR SELECT TO authenticated
    USING (
      ((select public.auth_is_platform_admin()))
      OR ((select public.auth_is_platform_owner()))
    );
DROP POLICY IF EXISTS "platform_active_sessions_tenant_insert_policy" ON public.platform_active_sessions;
CREATE POLICY "platform_active_sessions_tenant_insert_policy" ON public.platform_active_sessions
    FOR INSERT TO authenticated
    WITH CHECK (
      ((select public.auth_is_platform_admin()))
      OR ((select public.auth_is_platform_owner()))
    );
DROP POLICY IF EXISTS "platform_active_sessions_tenant_update_policy" ON public.platform_active_sessions;
CREATE POLICY "platform_active_sessions_tenant_update_policy" ON public.platform_active_sessions
    FOR UPDATE TO authenticated
    USING (
      ((select public.auth_is_platform_admin()))
      OR ((select public.auth_is_platform_owner()))
    )
    WITH CHECK (
      ((select public.auth_is_platform_admin()))
      OR ((select public.auth_is_platform_owner()))
    );
DROP POLICY IF EXISTS "platform_active_sessions_tenant_delete_policy" ON public.platform_active_sessions;
CREATE POLICY "platform_active_sessions_tenant_delete_policy" ON public.platform_active_sessions
    FOR DELETE TO authenticated
    USING (
      ((select public.auth_is_platform_admin()))
      OR ((select public.auth_is_platform_owner()))
    );

-- ==============================================================================
-- Table: platform_admins
-- ==============================================================================
DROP POLICY IF EXISTS "Platform admins manage platform_admins" ON public.platform_admins;
DROP POLICY IF EXISTS "Platform owners can view and manage platform_admins" ON public.platform_admins;
DROP POLICY IF EXISTS "platform_admins_tenant_select_policy" ON public.platform_admins;
CREATE POLICY "platform_admins_tenant_select_policy" ON public.platform_admins
    FOR SELECT TO authenticated
    USING (
      ((select public.auth_is_platform_admin()))
      OR ((select public.auth_is_platform_owner()))
    );
DROP POLICY IF EXISTS "platform_admins_tenant_insert_policy" ON public.platform_admins;
CREATE POLICY "platform_admins_tenant_insert_policy" ON public.platform_admins
    FOR INSERT TO authenticated
    WITH CHECK (
      ((select public.auth_is_platform_admin()))
      OR ((select public.auth_is_platform_owner()))
    );
DROP POLICY IF EXISTS "platform_admins_tenant_update_policy" ON public.platform_admins;
CREATE POLICY "platform_admins_tenant_update_policy" ON public.platform_admins
    FOR UPDATE TO authenticated
    USING (
      ((select public.auth_is_platform_admin()))
      OR ((select public.auth_is_platform_owner()))
    )
    WITH CHECK (
      ((select public.auth_is_platform_admin()))
      OR ((select public.auth_is_platform_owner()))
    );
DROP POLICY IF EXISTS "platform_admins_tenant_delete_policy" ON public.platform_admins;
CREATE POLICY "platform_admins_tenant_delete_policy" ON public.platform_admins
    FOR DELETE TO authenticated
    USING (
      ((select public.auth_is_platform_admin()))
      OR ((select public.auth_is_platform_owner()))
    );

-- ==============================================================================
-- Table: platform_audit_logs
-- ==============================================================================
DROP POLICY IF EXISTS "Platform admins view platform audit logs" ON public.platform_audit_logs;
DROP POLICY IF EXISTS "Platform owners can view platform audit logs" ON public.platform_audit_logs;
DROP POLICY IF EXISTS "platform_audit_logs_tenant_select_policy" ON public.platform_audit_logs;
CREATE POLICY "platform_audit_logs_tenant_select_policy" ON public.platform_audit_logs
    FOR SELECT TO authenticated
    USING (
      ((select public.auth_is_platform_admin()))
      OR ((select public.auth_is_platform_owner()))
    );
DROP POLICY IF EXISTS "platform_audit_logs_tenant_insert_policy" ON public.platform_audit_logs;
CREATE POLICY "platform_audit_logs_tenant_insert_policy" ON public.platform_audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (
      ((select public.auth_is_platform_admin()))
    );
DROP POLICY IF EXISTS "platform_audit_logs_tenant_update_policy" ON public.platform_audit_logs;
CREATE POLICY "platform_audit_logs_tenant_update_policy" ON public.platform_audit_logs
    FOR UPDATE TO authenticated
    USING (
      ((select public.auth_is_platform_admin()))
    )
    WITH CHECK (
      ((select public.auth_is_platform_admin()))
    );
DROP POLICY IF EXISTS "platform_audit_logs_tenant_delete_policy" ON public.platform_audit_logs;
CREATE POLICY "platform_audit_logs_tenant_delete_policy" ON public.platform_audit_logs
    FOR DELETE TO authenticated
    USING (
      ((select public.auth_is_platform_admin()))
    );

-- ==============================================================================
-- Table: platform_feature_flags
-- ==============================================================================
DROP POLICY IF EXISTS "Platform owners can manage platform_feature_flags" ON public.platform_feature_flags;
DROP POLICY IF EXISTS "platform_feature_flags_tenant_select_policy" ON public.platform_feature_flags;
CREATE POLICY "platform_feature_flags_tenant_select_policy" ON public.platform_feature_flags
    FOR SELECT TO authenticated
    USING (
      (((select public.auth_is_platform_owner()) OR ((select auth.uid()) IS NOT NULL)))
    );
DROP POLICY IF EXISTS "platform_feature_flags_tenant_insert_policy" ON public.platform_feature_flags;
CREATE POLICY "platform_feature_flags_tenant_insert_policy" ON public.platform_feature_flags
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select public.auth_is_platform_owner()) OR ((select auth.uid()) IS NOT NULL)))
    );
DROP POLICY IF EXISTS "platform_feature_flags_tenant_update_policy" ON public.platform_feature_flags;
CREATE POLICY "platform_feature_flags_tenant_update_policy" ON public.platform_feature_flags
    FOR UPDATE TO authenticated
    USING (
      (((select public.auth_is_platform_owner()) OR ((select auth.uid()) IS NOT NULL)))
    )
    WITH CHECK (
      (((select public.auth_is_platform_owner()) OR ((select auth.uid()) IS NOT NULL)))
    );
DROP POLICY IF EXISTS "platform_feature_flags_tenant_delete_policy" ON public.platform_feature_flags;
CREATE POLICY "platform_feature_flags_tenant_delete_policy" ON public.platform_feature_flags
    FOR DELETE TO authenticated
    USING (
      (((select public.auth_is_platform_owner()) OR ((select auth.uid()) IS NOT NULL)))
    );

-- ==============================================================================
-- Table: platform_notifications
-- ==============================================================================
DROP POLICY IF EXISTS "Active platform admins can delete platform notifications" ON public.platform_notifications;
DROP POLICY IF EXISTS "Authorized platform admins and service can insert platform noti" ON public.platform_notifications;
DROP POLICY IF EXISTS "Active platform admins can view platform notifications" ON public.platform_notifications;
DROP POLICY IF EXISTS "Active platform admins can update platform notifications" ON public.platform_notifications;
DROP POLICY IF EXISTS "platform_notifications_tenant_select_policy" ON public.platform_notifications;
CREATE POLICY "platform_notifications_tenant_select_policy" ON public.platform_notifications
    FOR SELECT TO authenticated
    USING (
      (((select public.auth_is_platform_admin()) AND ((recipient_user_id IS NULL) OR (recipient_user_id = (select auth.uid())))))
    );
DROP POLICY IF EXISTS "platform_notifications_tenant_insert_policy" ON public.platform_notifications;
CREATE POLICY "platform_notifications_tenant_insert_policy" ON public.platform_notifications
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select public.auth_is_platform_admin()) OR ((select auth.uid()) IS NULL)))
    );
DROP POLICY IF EXISTS "platform_notifications_tenant_update_policy" ON public.platform_notifications;
CREATE POLICY "platform_notifications_tenant_update_policy" ON public.platform_notifications
    FOR UPDATE TO authenticated
    USING (
      (((select public.auth_is_platform_admin()) AND ((recipient_user_id IS NULL) OR (recipient_user_id = (select auth.uid())))))
    )
    WITH CHECK (
      ((select public.auth_is_platform_admin()))
    );
DROP POLICY IF EXISTS "platform_notifications_tenant_delete_policy" ON public.platform_notifications;
CREATE POLICY "platform_notifications_tenant_delete_policy" ON public.platform_notifications
    FOR DELETE TO authenticated
    USING (
      ((select public.auth_is_platform_admin()))
    );

-- ==============================================================================
-- Table: platform_plans
-- ==============================================================================
DROP POLICY IF EXISTS "Platform owners can manage platform_plans" ON public.platform_plans;
DROP POLICY IF EXISTS "platform_plans_tenant_select_policy" ON public.platform_plans;
CREATE POLICY "platform_plans_tenant_select_policy" ON public.platform_plans
    FOR SELECT TO authenticated
    USING (
      (((select public.auth_is_platform_owner()) OR ((select auth.uid()) IS NOT NULL)))
    );
DROP POLICY IF EXISTS "platform_plans_tenant_insert_policy" ON public.platform_plans;
CREATE POLICY "platform_plans_tenant_insert_policy" ON public.platform_plans
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select public.auth_is_platform_owner()) OR ((select auth.uid()) IS NOT NULL)))
    );
DROP POLICY IF EXISTS "platform_plans_tenant_update_policy" ON public.platform_plans;
CREATE POLICY "platform_plans_tenant_update_policy" ON public.platform_plans
    FOR UPDATE TO authenticated
    USING (
      (((select public.auth_is_platform_owner()) OR ((select auth.uid()) IS NOT NULL)))
    )
    WITH CHECK (
      (((select public.auth_is_platform_owner()) OR ((select auth.uid()) IS NOT NULL)))
    );
DROP POLICY IF EXISTS "platform_plans_tenant_delete_policy" ON public.platform_plans;
CREATE POLICY "platform_plans_tenant_delete_policy" ON public.platform_plans
    FOR DELETE TO authenticated
    USING (
      (((select public.auth_is_platform_owner()) OR ((select auth.uid()) IS NOT NULL)))
    );

-- ==============================================================================
-- Table: platform_role_template_permissions
-- ==============================================================================
DROP POLICY IF EXISTS "Platform owners manage platform_role_template_permissions" ON public.platform_role_template_permissions;
DROP POLICY IF EXISTS "Platform admins read platform role template permissions" ON public.platform_role_template_permissions;
DROP POLICY IF EXISTS "platform_role_template_permissions_tenant_select_policy" ON public.platform_role_template_permissions;
CREATE POLICY "platform_role_template_permissions_tenant_select_policy" ON public.platform_role_template_permissions
    FOR SELECT TO authenticated
    USING (
      ((select public.auth_is_platform_owner()))
      OR ((select public.auth_is_platform_admin()))
    );
DROP POLICY IF EXISTS "platform_role_template_permissions_tenant_insert_policy" ON public.platform_role_template_permissions;
CREATE POLICY "platform_role_template_permissions_tenant_insert_policy" ON public.platform_role_template_permissions
    FOR INSERT TO authenticated
    WITH CHECK (
      ((select public.auth_is_platform_owner()))
    );
DROP POLICY IF EXISTS "platform_role_template_permissions_tenant_update_policy" ON public.platform_role_template_permissions;
CREATE POLICY "platform_role_template_permissions_tenant_update_policy" ON public.platform_role_template_permissions
    FOR UPDATE TO authenticated
    USING (
      ((select public.auth_is_platform_owner()))
    )
    WITH CHECK (
      ((select public.auth_is_platform_owner()))
    );
DROP POLICY IF EXISTS "platform_role_template_permissions_tenant_delete_policy" ON public.platform_role_template_permissions;
CREATE POLICY "platform_role_template_permissions_tenant_delete_policy" ON public.platform_role_template_permissions
    FOR DELETE TO authenticated
    USING (
      ((select public.auth_is_platform_owner()))
    );

-- ==============================================================================
-- Table: platform_role_templates
-- ==============================================================================
DROP POLICY IF EXISTS "Platform owners manage platform_role_templates" ON public.platform_role_templates;
DROP POLICY IF EXISTS "Platform admins read platform role templates" ON public.platform_role_templates;
DROP POLICY IF EXISTS "platform_role_templates_tenant_select_policy" ON public.platform_role_templates;
CREATE POLICY "platform_role_templates_tenant_select_policy" ON public.platform_role_templates
    FOR SELECT TO authenticated
    USING (
      ((select public.auth_is_platform_owner()))
      OR ((select public.auth_is_platform_admin()))
    );
DROP POLICY IF EXISTS "platform_role_templates_tenant_insert_policy" ON public.platform_role_templates;
CREATE POLICY "platform_role_templates_tenant_insert_policy" ON public.platform_role_templates
    FOR INSERT TO authenticated
    WITH CHECK (
      ((select public.auth_is_platform_owner()))
    );
DROP POLICY IF EXISTS "platform_role_templates_tenant_update_policy" ON public.platform_role_templates;
CREATE POLICY "platform_role_templates_tenant_update_policy" ON public.platform_role_templates
    FOR UPDATE TO authenticated
    USING (
      ((select public.auth_is_platform_owner()))
    )
    WITH CHECK (
      ((select public.auth_is_platform_owner()))
    );
DROP POLICY IF EXISTS "platform_role_templates_tenant_delete_policy" ON public.platform_role_templates;
CREATE POLICY "platform_role_templates_tenant_delete_policy" ON public.platform_role_templates
    FOR DELETE TO authenticated
    USING (
      ((select public.auth_is_platform_owner()))
    );

-- ==============================================================================
-- Table: platform_saas_plans
-- ==============================================================================
DROP POLICY IF EXISTS "Platform owners manage platform_saas_plans" ON public.platform_saas_plans;
DROP POLICY IF EXISTS "Platform admins view platform_saas_plans" ON public.platform_saas_plans;
DROP POLICY IF EXISTS "platform_saas_plans_tenant_select_policy" ON public.platform_saas_plans;
CREATE POLICY "platform_saas_plans_tenant_select_policy" ON public.platform_saas_plans
    FOR SELECT TO authenticated
    USING (
      ((select public.auth_is_platform_owner()))
      OR ((select public.auth_is_platform_admin()))
    );
DROP POLICY IF EXISTS "platform_saas_plans_tenant_insert_policy" ON public.platform_saas_plans;
CREATE POLICY "platform_saas_plans_tenant_insert_policy" ON public.platform_saas_plans
    FOR INSERT TO authenticated
    WITH CHECK (
      ((select public.auth_is_platform_owner()))
    );
DROP POLICY IF EXISTS "platform_saas_plans_tenant_update_policy" ON public.platform_saas_plans;
CREATE POLICY "platform_saas_plans_tenant_update_policy" ON public.platform_saas_plans
    FOR UPDATE TO authenticated
    USING (
      ((select public.auth_is_platform_owner()))
    )
    WITH CHECK (
      ((select public.auth_is_platform_owner()))
    );
DROP POLICY IF EXISTS "platform_saas_plans_tenant_delete_policy" ON public.platform_saas_plans;
CREATE POLICY "platform_saas_plans_tenant_delete_policy" ON public.platform_saas_plans
    FOR DELETE TO authenticated
    USING (
      ((select public.auth_is_platform_owner()))
    );

-- ==============================================================================
-- Table: platform_support_sessions
-- ==============================================================================
DROP POLICY IF EXISTS "Platform admins manage support sessions" ON public.platform_support_sessions;
DROP POLICY IF EXISTS "Platform owners have full control on support sessions" ON public.platform_support_sessions;
DROP POLICY IF EXISTS "platform_support_sessions_tenant_select_policy" ON public.platform_support_sessions;
CREATE POLICY "platform_support_sessions_tenant_select_policy" ON public.platform_support_sessions
    FOR SELECT TO authenticated
    USING (
      ((select public.auth_is_platform_admin()))
      OR ((select public.auth_is_platform_owner()))
    );
DROP POLICY IF EXISTS "platform_support_sessions_tenant_insert_policy" ON public.platform_support_sessions;
CREATE POLICY "platform_support_sessions_tenant_insert_policy" ON public.platform_support_sessions
    FOR INSERT TO authenticated
    WITH CHECK (
      ((select public.auth_is_platform_admin()))
      OR ((select public.auth_is_platform_owner()))
    );
DROP POLICY IF EXISTS "platform_support_sessions_tenant_update_policy" ON public.platform_support_sessions;
CREATE POLICY "platform_support_sessions_tenant_update_policy" ON public.platform_support_sessions
    FOR UPDATE TO authenticated
    USING (
      ((select public.auth_is_platform_admin()))
      OR ((select public.auth_is_platform_owner()))
    )
    WITH CHECK (
      ((select public.auth_is_platform_admin()))
      OR ((select public.auth_is_platform_owner()))
    );
DROP POLICY IF EXISTS "platform_support_sessions_tenant_delete_policy" ON public.platform_support_sessions;
CREATE POLICY "platform_support_sessions_tenant_delete_policy" ON public.platform_support_sessions
    FOR DELETE TO authenticated
    USING (
      ((select public.auth_is_platform_admin()))
      OR ((select public.auth_is_platform_owner()))
    );

-- ==============================================================================
-- Table: platform_system_settings
-- ==============================================================================
DROP POLICY IF EXISTS "Platform owners can modify platform system settings" ON public.platform_system_settings;
DROP POLICY IF EXISTS "Platform owners manage system settings" ON public.platform_system_settings;
DROP POLICY IF EXISTS "Platform admins can read platform system settings" ON public.platform_system_settings;
DROP POLICY IF EXISTS "Platform admins view system settings" ON public.platform_system_settings;
DROP POLICY IF EXISTS "Public read of platform branding" ON public.platform_system_settings;
DROP POLICY IF EXISTS "platform_system_settings_tenant_select_policy" ON public.platform_system_settings;
CREATE POLICY "platform_system_settings_tenant_select_policy" ON public.platform_system_settings
    FOR SELECT TO authenticated
    USING (
      ((select public.auth_is_platform_owner()))
      OR ((select public.auth_is_platform_admin()))
      OR (true)
    );
DROP POLICY IF EXISTS "platform_system_settings_tenant_insert_policy" ON public.platform_system_settings;
CREATE POLICY "platform_system_settings_tenant_insert_policy" ON public.platform_system_settings
    FOR INSERT TO authenticated
    WITH CHECK (
      ((select public.auth_is_platform_owner()))
    );
DROP POLICY IF EXISTS "platform_system_settings_tenant_update_policy" ON public.platform_system_settings;
CREATE POLICY "platform_system_settings_tenant_update_policy" ON public.platform_system_settings
    FOR UPDATE TO authenticated
    USING (
      ((select public.auth_is_platform_owner()))
    )
    WITH CHECK (
      ((select public.auth_is_platform_owner()))
    );
DROP POLICY IF EXISTS "platform_system_settings_tenant_delete_policy" ON public.platform_system_settings;
CREATE POLICY "platform_system_settings_tenant_delete_policy" ON public.platform_system_settings
    FOR DELETE TO authenticated
    USING (
      ((select public.auth_is_platform_owner()))
    );

-- ==============================================================================
-- Table: platform_tenant_feature_flags
-- ==============================================================================
DROP POLICY IF EXISTS "Platform owners can manage platform tenant feature flags" ON public.platform_tenant_feature_flags;
DROP POLICY IF EXISTS "Tenant users can view their own tenant feature flags" ON public.platform_tenant_feature_flags;
DROP POLICY IF EXISTS "platform_tenant_feature_flags_tenant_select_policy" ON public.platform_tenant_feature_flags;
CREATE POLICY "platform_tenant_feature_flags_tenant_select_policy" ON public.platform_tenant_feature_flags
    FOR SELECT TO authenticated
    USING (
      ((select public.auth_is_platform_owner()))
      OR ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "platform_tenant_feature_flags_tenant_insert_policy" ON public.platform_tenant_feature_flags;
CREATE POLICY "platform_tenant_feature_flags_tenant_insert_policy" ON public.platform_tenant_feature_flags
    FOR INSERT TO authenticated
    WITH CHECK (
      ((select public.auth_is_platform_owner()))
    );
DROP POLICY IF EXISTS "platform_tenant_feature_flags_tenant_update_policy" ON public.platform_tenant_feature_flags;
CREATE POLICY "platform_tenant_feature_flags_tenant_update_policy" ON public.platform_tenant_feature_flags
    FOR UPDATE TO authenticated
    USING (
      ((select public.auth_is_platform_owner()))
    )
    WITH CHECK (
      ((select public.auth_is_platform_owner()))
    );
DROP POLICY IF EXISTS "platform_tenant_feature_flags_tenant_delete_policy" ON public.platform_tenant_feature_flags;
CREATE POLICY "platform_tenant_feature_flags_tenant_delete_policy" ON public.platform_tenant_feature_flags
    FOR DELETE TO authenticated
    USING (
      ((select public.auth_is_platform_owner()))
    );

-- ==============================================================================
-- Table: price_list_items
-- ==============================================================================
DROP POLICY IF EXISTS "Active company users can manage price list items" ON public.price_list_items;
DROP POLICY IF EXISTS "Active company users can view price list items" ON public.price_list_items;
DROP POLICY IF EXISTS "price_list_items_tenant_select_policy" ON public.price_list_items;
CREATE POLICY "price_list_items_tenant_select_policy" ON public.price_list_items
    FOR SELECT TO authenticated
    USING (
      ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "price_list_items_tenant_insert_policy" ON public.price_list_items;
CREATE POLICY "price_list_items_tenant_insert_policy" ON public.price_list_items
    FOR INSERT TO authenticated
    WITH CHECK (
      ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "price_list_items_tenant_update_policy" ON public.price_list_items;
CREATE POLICY "price_list_items_tenant_update_policy" ON public.price_list_items
    FOR UPDATE TO authenticated
    USING (
      ((select public.auth_is_active_company_user(company_id)))
    )
    WITH CHECK (
      ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "price_list_items_tenant_delete_policy" ON public.price_list_items;
CREATE POLICY "price_list_items_tenant_delete_policy" ON public.price_list_items
    FOR DELETE TO authenticated
    USING (
      ((select public.auth_is_active_company_user(company_id)))
    );

-- ==============================================================================
-- Table: price_lists
-- ==============================================================================
DROP POLICY IF EXISTS "Active company users can manage price lists" ON public.price_lists;
DROP POLICY IF EXISTS "Active company users can view price lists" ON public.price_lists;
DROP POLICY IF EXISTS "price_lists_tenant_select_policy" ON public.price_lists;
CREATE POLICY "price_lists_tenant_select_policy" ON public.price_lists
    FOR SELECT TO authenticated
    USING (
      ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "price_lists_tenant_insert_policy" ON public.price_lists;
CREATE POLICY "price_lists_tenant_insert_policy" ON public.price_lists
    FOR INSERT TO authenticated
    WITH CHECK (
      ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "price_lists_tenant_update_policy" ON public.price_lists;
CREATE POLICY "price_lists_tenant_update_policy" ON public.price_lists
    FOR UPDATE TO authenticated
    USING (
      ((select public.auth_is_active_company_user(company_id)))
    )
    WITH CHECK (
      ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "price_lists_tenant_delete_policy" ON public.price_lists;
CREATE POLICY "price_lists_tenant_delete_policy" ON public.price_lists
    FOR DELETE TO authenticated
    USING (
      ((select public.auth_is_active_company_user(company_id)))
    );

-- ==============================================================================
-- Table: printing_methods
-- ==============================================================================
DROP POLICY IF EXISTS "printing_methods_delete_tenant" ON public.printing_methods;
DROP POLICY IF EXISTS "printing_methods_insert_tenant" ON public.printing_methods;
DROP POLICY IF EXISTS "printing_methods_select_tenant" ON public.printing_methods;
DROP POLICY IF EXISTS "printing_methods_update_tenant" ON public.printing_methods;
DROP POLICY IF EXISTS "printing_methods_tenant_select_policy" ON public.printing_methods;
CREATE POLICY "printing_methods_tenant_select_policy" ON public.printing_methods
    FOR SELECT TO authenticated
    USING (
      (((company_id = (( SELECT ((select auth.jwt()) ->> 'company_id'::text)))::uuid) OR (( SELECT ((select auth.jwt()) ->> 'role'::text)) = 'platform_admin'::text)))
    );
DROP POLICY IF EXISTS "printing_methods_tenant_insert_policy" ON public.printing_methods;
CREATE POLICY "printing_methods_tenant_insert_policy" ON public.printing_methods
    FOR INSERT TO authenticated
    WITH CHECK (
      (((company_id = (( SELECT ((select auth.jwt()) ->> 'company_id'::text)))::uuid) OR (( SELECT ((select auth.jwt()) ->> 'role'::text)) = 'platform_admin'::text)))
    );
DROP POLICY IF EXISTS "printing_methods_tenant_update_policy" ON public.printing_methods;
CREATE POLICY "printing_methods_tenant_update_policy" ON public.printing_methods
    FOR UPDATE TO authenticated
    USING (
      (((company_id = (( SELECT ((select auth.jwt()) ->> 'company_id'::text)))::uuid) OR (( SELECT ((select auth.jwt()) ->> 'role'::text)) = 'platform_admin'::text)))
    )
    WITH CHECK (
      (((company_id = (( SELECT ((select auth.jwt()) ->> 'company_id'::text)))::uuid) OR (( SELECT ((select auth.jwt()) ->> 'role'::text)) = 'platform_admin'::text)))
    );
DROP POLICY IF EXISTS "printing_methods_tenant_delete_policy" ON public.printing_methods;
CREATE POLICY "printing_methods_tenant_delete_policy" ON public.printing_methods
    FOR DELETE TO authenticated
    USING (
      (((company_id = (( SELECT ((select auth.jwt()) ->> 'company_id'::text)))::uuid) OR (( SELECT ((select auth.jwt()) ->> 'role'::text)) = 'platform_admin'::text)))
    );

-- ==============================================================================
-- Table: product_categories
-- ==============================================================================
DROP POLICY IF EXISTS "product_categories_delete_tenant" ON public.product_categories;
DROP POLICY IF EXISTS "product_categories_insert_tenant" ON public.product_categories;
DROP POLICY IF EXISTS "product_categories_select_tenant" ON public.product_categories;
DROP POLICY IF EXISTS "product_categories_update_tenant" ON public.product_categories;
DROP POLICY IF EXISTS "product_categories_tenant_select_policy" ON public.product_categories;
CREATE POLICY "product_categories_tenant_select_policy" ON public.product_categories
    FOR SELECT TO authenticated
    USING (
      (((company_id = (( SELECT ((select auth.jwt()) ->> 'company_id'::text)))::uuid) OR (( SELECT ((select auth.jwt()) ->> 'role'::text)) = 'platform_admin'::text)))
    );
DROP POLICY IF EXISTS "product_categories_tenant_insert_policy" ON public.product_categories;
CREATE POLICY "product_categories_tenant_insert_policy" ON public.product_categories
    FOR INSERT TO authenticated
    WITH CHECK (
      (((company_id = (( SELECT ((select auth.jwt()) ->> 'company_id'::text)))::uuid) OR (( SELECT ((select auth.jwt()) ->> 'role'::text)) = 'platform_admin'::text)))
    );
DROP POLICY IF EXISTS "product_categories_tenant_update_policy" ON public.product_categories;
CREATE POLICY "product_categories_tenant_update_policy" ON public.product_categories
    FOR UPDATE TO authenticated
    USING (
      (((company_id = (( SELECT ((select auth.jwt()) ->> 'company_id'::text)))::uuid) OR (( SELECT ((select auth.jwt()) ->> 'role'::text)) = 'platform_admin'::text)))
    )
    WITH CHECK (
      (((company_id = (( SELECT ((select auth.jwt()) ->> 'company_id'::text)))::uuid) OR (( SELECT ((select auth.jwt()) ->> 'role'::text)) = 'platform_admin'::text)))
    );
DROP POLICY IF EXISTS "product_categories_tenant_delete_policy" ON public.product_categories;
CREATE POLICY "product_categories_tenant_delete_policy" ON public.product_categories
    FOR DELETE TO authenticated
    USING (
      (((company_id = (( SELECT ((select auth.jwt()) ->> 'company_id'::text)))::uuid) OR (( SELECT ((select auth.jwt()) ->> 'role'::text)) = 'platform_admin'::text)))
    );

-- ==============================================================================
-- Table: product_formulas
-- ==============================================================================
DROP POLICY IF EXISTS "Active company users can manage product formulas" ON public.product_formulas;
DROP POLICY IF EXISTS "Active company users can view product formulas" ON public.product_formulas;
DROP POLICY IF EXISTS "product_formulas_tenant_select_policy" ON public.product_formulas;
CREATE POLICY "product_formulas_tenant_select_policy" ON public.product_formulas
    FOR SELECT TO authenticated
    USING (
      ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "product_formulas_tenant_insert_policy" ON public.product_formulas;
CREATE POLICY "product_formulas_tenant_insert_policy" ON public.product_formulas
    FOR INSERT TO authenticated
    WITH CHECK (
      ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "product_formulas_tenant_update_policy" ON public.product_formulas;
CREATE POLICY "product_formulas_tenant_update_policy" ON public.product_formulas
    FOR UPDATE TO authenticated
    USING (
      ((select public.auth_is_active_company_user(company_id)))
    )
    WITH CHECK (
      ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "product_formulas_tenant_delete_policy" ON public.product_formulas;
CREATE POLICY "product_formulas_tenant_delete_policy" ON public.product_formulas
    FOR DELETE TO authenticated
    USING (
      ((select public.auth_is_active_company_user(company_id)))
    );

-- ==============================================================================
-- Table: product_supplier_prices
-- ==============================================================================
DROP POLICY IF EXISTS "product_supplier_prices_delete_tenant" ON public.product_supplier_prices;
DROP POLICY IF EXISTS "product_supplier_prices_insert_tenant" ON public.product_supplier_prices;
DROP POLICY IF EXISTS "product_supplier_prices_select_tenant" ON public.product_supplier_prices;
DROP POLICY IF EXISTS "product_supplier_prices_update_tenant" ON public.product_supplier_prices;
DROP POLICY IF EXISTS "product_supplier_prices_tenant_select_policy" ON public.product_supplier_prices;
CREATE POLICY "product_supplier_prices_tenant_select_policy" ON public.product_supplier_prices
    FOR SELECT TO authenticated
    USING (
      (((company_id = (( SELECT ((select auth.jwt()) ->> 'company_id'::text)))::uuid) OR (( SELECT ((select auth.jwt()) ->> 'role'::text)) = 'platform_admin'::text)))
    );
DROP POLICY IF EXISTS "product_supplier_prices_tenant_insert_policy" ON public.product_supplier_prices;
CREATE POLICY "product_supplier_prices_tenant_insert_policy" ON public.product_supplier_prices
    FOR INSERT TO authenticated
    WITH CHECK (
      (((company_id = (( SELECT ((select auth.jwt()) ->> 'company_id'::text)))::uuid) OR (( SELECT ((select auth.jwt()) ->> 'role'::text)) = 'platform_admin'::text)))
    );
DROP POLICY IF EXISTS "product_supplier_prices_tenant_update_policy" ON public.product_supplier_prices;
CREATE POLICY "product_supplier_prices_tenant_update_policy" ON public.product_supplier_prices
    FOR UPDATE TO authenticated
    USING (
      (((company_id = (( SELECT ((select auth.jwt()) ->> 'company_id'::text)))::uuid) OR (( SELECT ((select auth.jwt()) ->> 'role'::text)) = 'platform_admin'::text)))
    )
    WITH CHECK (
      (((company_id = (( SELECT ((select auth.jwt()) ->> 'company_id'::text)))::uuid) OR (( SELECT ((select auth.jwt()) ->> 'role'::text)) = 'platform_admin'::text)))
    );
DROP POLICY IF EXISTS "product_supplier_prices_tenant_delete_policy" ON public.product_supplier_prices;
CREATE POLICY "product_supplier_prices_tenant_delete_policy" ON public.product_supplier_prices
    FOR DELETE TO authenticated
    USING (
      (((company_id = (( SELECT ((select auth.jwt()) ->> 'company_id'::text)))::uuid) OR (( SELECT ((select auth.jwt()) ->> 'role'::text)) = 'platform_admin'::text)))
    );

-- ==============================================================================
-- Table: product_variants
-- ==============================================================================
DROP POLICY IF EXISTS "Active company users can manage product variants" ON public.product_variants;
DROP POLICY IF EXISTS "Active company users can view product variants" ON public.product_variants;
DROP POLICY IF EXISTS "product_variants_tenant_select_policy" ON public.product_variants;
CREATE POLICY "product_variants_tenant_select_policy" ON public.product_variants
    FOR SELECT TO authenticated
    USING (
      ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "product_variants_tenant_insert_policy" ON public.product_variants;
CREATE POLICY "product_variants_tenant_insert_policy" ON public.product_variants
    FOR INSERT TO authenticated
    WITH CHECK (
      ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "product_variants_tenant_update_policy" ON public.product_variants;
CREATE POLICY "product_variants_tenant_update_policy" ON public.product_variants
    FOR UPDATE TO authenticated
    USING (
      ((select public.auth_is_active_company_user(company_id)))
    )
    WITH CHECK (
      ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "product_variants_tenant_delete_policy" ON public.product_variants;
CREATE POLICY "product_variants_tenant_delete_policy" ON public.product_variants
    FOR DELETE TO authenticated
    USING (
      ((select public.auth_is_active_company_user(company_id)))
    );

-- ==============================================================================
-- Table: production_jobs
-- ==============================================================================
DROP POLICY IF EXISTS "Authorized company users can manage production jobs" ON public.production_jobs;
DROP POLICY IF EXISTS "Active company users can view production jobs" ON public.production_jobs;
DROP POLICY IF EXISTS "production_jobs_tenant_select_policy" ON public.production_jobs;
CREATE POLICY "production_jobs_tenant_select_policy" ON public.production_jobs
    FOR SELECT TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'production.view'::text) OR auth_user_has_permission(company_id, 'production.edit'::text) OR auth_user_has_permission(company_id, 'production.create'::text))))
      OR ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "production_jobs_tenant_insert_policy" ON public.production_jobs;
CREATE POLICY "production_jobs_tenant_insert_policy" ON public.production_jobs
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'production.view'::text) OR auth_user_has_permission(company_id, 'production.edit'::text) OR auth_user_has_permission(company_id, 'production.create'::text))))
    );
DROP POLICY IF EXISTS "production_jobs_tenant_update_policy" ON public.production_jobs;
CREATE POLICY "production_jobs_tenant_update_policy" ON public.production_jobs
    FOR UPDATE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'production.view'::text) OR auth_user_has_permission(company_id, 'production.edit'::text) OR auth_user_has_permission(company_id, 'production.create'::text))))
    )
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'production.view'::text) OR auth_user_has_permission(company_id, 'production.edit'::text) OR auth_user_has_permission(company_id, 'production.create'::text))))
    );
DROP POLICY IF EXISTS "production_jobs_tenant_delete_policy" ON public.production_jobs;
CREATE POLICY "production_jobs_tenant_delete_policy" ON public.production_jobs
    FOR DELETE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'production.view'::text) OR auth_user_has_permission(company_id, 'production.edit'::text) OR auth_user_has_permission(company_id, 'production.create'::text))))
    );

-- ==============================================================================
-- Table: profiles
-- ==============================================================================
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_tenant_select_policy" ON public.profiles;
CREATE POLICY "profiles_tenant_select_policy" ON public.profiles
    FOR SELECT TO authenticated
    USING (
      (((select auth.uid()) = id))
    );
DROP POLICY IF EXISTS "profiles_tenant_insert_policy" ON public.profiles;
CREATE POLICY "profiles_tenant_insert_policy" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select auth.uid()) = id))
    );
DROP POLICY IF EXISTS "profiles_tenant_update_policy" ON public.profiles;
CREATE POLICY "profiles_tenant_update_policy" ON public.profiles
    FOR UPDATE TO authenticated
    USING (
      (((select auth.uid()) = id))
    )
    WITH CHECK (
      (((select auth.uid()) = id))
    );

-- ==============================================================================
-- Table: purchase_order_items
-- ==============================================================================
DROP POLICY IF EXISTS "Authorized company users can manage po items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Active company users can view po items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "purchase_order_items_tenant_select_policy" ON public.purchase_order_items;
CREATE POLICY "purchase_order_items_tenant_select_policy" ON public.purchase_order_items
    FOR SELECT TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM purchase_orders po
  WHERE ((po.id = purchase_order_items.purchase_order_id) AND (select public.auth_is_active_company_user(po.company_id))))))
    );
DROP POLICY IF EXISTS "purchase_order_items_tenant_insert_policy" ON public.purchase_order_items;
CREATE POLICY "purchase_order_items_tenant_insert_policy" ON public.purchase_order_items
    FOR INSERT TO authenticated
    WITH CHECK (
      ((EXISTS ( SELECT 1
   FROM purchase_orders po
  WHERE ((po.id = purchase_order_items.purchase_order_id) AND (select public.auth_is_active_company_user(po.company_id))))))
    );
DROP POLICY IF EXISTS "purchase_order_items_tenant_update_policy" ON public.purchase_order_items;
CREATE POLICY "purchase_order_items_tenant_update_policy" ON public.purchase_order_items
    FOR UPDATE TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM purchase_orders po
  WHERE ((po.id = purchase_order_items.purchase_order_id) AND (select public.auth_is_active_company_user(po.company_id))))))
    )
    WITH CHECK (
      ((EXISTS ( SELECT 1
   FROM purchase_orders po
  WHERE ((po.id = purchase_order_items.purchase_order_id) AND (select public.auth_is_active_company_user(po.company_id))))))
    );
DROP POLICY IF EXISTS "purchase_order_items_tenant_delete_policy" ON public.purchase_order_items;
CREATE POLICY "purchase_order_items_tenant_delete_policy" ON public.purchase_order_items
    FOR DELETE TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM purchase_orders po
  WHERE ((po.id = purchase_order_items.purchase_order_id) AND (select public.auth_is_active_company_user(po.company_id))))))
    );

-- ==============================================================================
-- Table: purchase_orders
-- ==============================================================================
DROP POLICY IF EXISTS "Authorized company users can manage purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Active company users can view purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_tenant_select_policy" ON public.purchase_orders;
CREATE POLICY "purchase_orders_tenant_select_policy" ON public.purchase_orders
    FOR SELECT TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'purchase.view'::text) OR auth_user_has_permission(company_id, 'purchase.create'::text) OR auth_user_has_permission(company_id, 'purchase.edit'::text))))
      OR ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "purchase_orders_tenant_insert_policy" ON public.purchase_orders;
CREATE POLICY "purchase_orders_tenant_insert_policy" ON public.purchase_orders
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'purchase.view'::text) OR auth_user_has_permission(company_id, 'purchase.create'::text) OR auth_user_has_permission(company_id, 'purchase.edit'::text))))
    );
DROP POLICY IF EXISTS "purchase_orders_tenant_update_policy" ON public.purchase_orders;
CREATE POLICY "purchase_orders_tenant_update_policy" ON public.purchase_orders
    FOR UPDATE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'purchase.view'::text) OR auth_user_has_permission(company_id, 'purchase.create'::text) OR auth_user_has_permission(company_id, 'purchase.edit'::text))))
    )
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'purchase.view'::text) OR auth_user_has_permission(company_id, 'purchase.create'::text) OR auth_user_has_permission(company_id, 'purchase.edit'::text))))
    );
DROP POLICY IF EXISTS "purchase_orders_tenant_delete_policy" ON public.purchase_orders;
CREATE POLICY "purchase_orders_tenant_delete_policy" ON public.purchase_orders
    FOR DELETE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'purchase.view'::text) OR auth_user_has_permission(company_id, 'purchase.create'::text) OR auth_user_has_permission(company_id, 'purchase.edit'::text))))
    );

-- ==============================================================================
-- Table: quotation_items
-- ==============================================================================
DROP POLICY IF EXISTS "Authorized company users can manage quotation items" ON public.quotation_items;
DROP POLICY IF EXISTS "Active company users can view quotation items" ON public.quotation_items;
DROP POLICY IF EXISTS "quotation_items_tenant_select_policy" ON public.quotation_items;
CREATE POLICY "quotation_items_tenant_select_policy" ON public.quotation_items
    FOR SELECT TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM quotations q
  WHERE ((q.id = quotation_items.quotation_id) AND (select public.auth_is_active_company_user(q.company_id))))))
    );
DROP POLICY IF EXISTS "quotation_items_tenant_insert_policy" ON public.quotation_items;
CREATE POLICY "quotation_items_tenant_insert_policy" ON public.quotation_items
    FOR INSERT TO authenticated
    WITH CHECK (
      ((EXISTS ( SELECT 1
   FROM quotations q
  WHERE ((q.id = quotation_items.quotation_id) AND (select public.auth_is_active_company_user(q.company_id))))))
    );
DROP POLICY IF EXISTS "quotation_items_tenant_update_policy" ON public.quotation_items;
CREATE POLICY "quotation_items_tenant_update_policy" ON public.quotation_items
    FOR UPDATE TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM quotations q
  WHERE ((q.id = quotation_items.quotation_id) AND (select public.auth_is_active_company_user(q.company_id))))))
    )
    WITH CHECK (
      ((EXISTS ( SELECT 1
   FROM quotations q
  WHERE ((q.id = quotation_items.quotation_id) AND (select public.auth_is_active_company_user(q.company_id))))))
    );
DROP POLICY IF EXISTS "quotation_items_tenant_delete_policy" ON public.quotation_items;
CREATE POLICY "quotation_items_tenant_delete_policy" ON public.quotation_items
    FOR DELETE TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM quotations q
  WHERE ((q.id = quotation_items.quotation_id) AND (select public.auth_is_active_company_user(q.company_id))))))
    );

-- ==============================================================================
-- Table: roles
-- ==============================================================================
DROP POLICY IF EXISTS "Admins can manage custom roles" ON public.roles;
DROP POLICY IF EXISTS "Admins can manage custom roles for their company" ON public.roles;
DROP POLICY IF EXISTS "Users can view roles available in their company" ON public.roles;
DROP POLICY IF EXISTS "Users can view roles for their company or system roles" ON public.roles;
DROP POLICY IF EXISTS "roles_tenant_select_policy" ON public.roles;
CREATE POLICY "roles_tenant_select_policy" ON public.roles
    FOR SELECT TO authenticated
    USING (
      (((company_id IS NOT NULL) AND (select public.auth_is_active_company_user(company_id)) AND (auth_get_user_company_role(company_id) = ANY (ARRAY['owner'::text, 'admin'::text]))))
      OR (((company_id IS NOT NULL) AND (select public.auth_is_active_company_user(company_id))))
      OR (((company_id IS NULL) OR (select public.auth_is_active_company_user(company_id))))
    );
DROP POLICY IF EXISTS "roles_tenant_insert_policy" ON public.roles;
CREATE POLICY "roles_tenant_insert_policy" ON public.roles
    FOR INSERT TO authenticated
    WITH CHECK (
      (((company_id IS NOT NULL) AND (select public.auth_is_active_company_user(company_id)) AND (auth_get_user_company_role(company_id) = ANY (ARRAY['owner'::text, 'admin'::text]))))
      OR (((company_id IS NOT NULL) AND (select public.auth_is_active_company_user(company_id))))
    );
DROP POLICY IF EXISTS "roles_tenant_update_policy" ON public.roles;
CREATE POLICY "roles_tenant_update_policy" ON public.roles
    FOR UPDATE TO authenticated
    USING (
      (((company_id IS NOT NULL) AND (select public.auth_is_active_company_user(company_id)) AND (auth_get_user_company_role(company_id) = ANY (ARRAY['owner'::text, 'admin'::text]))))
      OR (((company_id IS NOT NULL) AND (select public.auth_is_active_company_user(company_id))))
    )
    WITH CHECK (
      (((company_id IS NOT NULL) AND (select public.auth_is_active_company_user(company_id)) AND (auth_get_user_company_role(company_id) = ANY (ARRAY['owner'::text, 'admin'::text]))))
      OR (((company_id IS NOT NULL) AND (select public.auth_is_active_company_user(company_id))))
    );
DROP POLICY IF EXISTS "roles_tenant_delete_policy" ON public.roles;
CREATE POLICY "roles_tenant_delete_policy" ON public.roles
    FOR DELETE TO authenticated
    USING (
      (((company_id IS NOT NULL) AND (select public.auth_is_active_company_user(company_id)) AND (auth_get_user_company_role(company_id) = ANY (ARRAY['owner'::text, 'admin'::text]))))
      OR (((company_id IS NOT NULL) AND (select public.auth_is_active_company_user(company_id))))
    );

-- ==============================================================================
-- Table: saas_subscription_invoice_items
-- ==============================================================================
DROP POLICY IF EXISTS "Platform admins can manage all SaaS invoice items" ON public.saas_subscription_invoice_items;
DROP POLICY IF EXISTS "Tenant users can view their own SaaS invoice items" ON public.saas_subscription_invoice_items;
DROP POLICY IF EXISTS "saas_subscription_invoice_items_tenant_select_policy" ON public.saas_subscription_invoice_items;
CREATE POLICY "saas_subscription_invoice_items_tenant_select_policy" ON public.saas_subscription_invoice_items
    FOR SELECT TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
      OR ((EXISTS ( SELECT 1
   FROM saas_subscription_invoices inv
  WHERE ((inv.id = saas_subscription_invoice_items.invoice_id) AND (select public.auth_is_active_company_user(inv.company_id))))))
    );
DROP POLICY IF EXISTS "saas_subscription_invoice_items_tenant_insert_policy" ON public.saas_subscription_invoice_items;
CREATE POLICY "saas_subscription_invoice_items_tenant_insert_policy" ON public.saas_subscription_invoice_items
    FOR INSERT TO authenticated
    WITH CHECK (
      ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
    );
DROP POLICY IF EXISTS "saas_subscription_invoice_items_tenant_update_policy" ON public.saas_subscription_invoice_items;
CREATE POLICY "saas_subscription_invoice_items_tenant_update_policy" ON public.saas_subscription_invoice_items
    FOR UPDATE TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
    )
    WITH CHECK (
      ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
    );
DROP POLICY IF EXISTS "saas_subscription_invoice_items_tenant_delete_policy" ON public.saas_subscription_invoice_items;
CREATE POLICY "saas_subscription_invoice_items_tenant_delete_policy" ON public.saas_subscription_invoice_items
    FOR DELETE TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
    );

-- ==============================================================================
-- Table: saas_subscription_invoices
-- ==============================================================================
DROP POLICY IF EXISTS "Platform admins can manage all SaaS invoices" ON public.saas_subscription_invoices;
DROP POLICY IF EXISTS "Tenant users can view their own SaaS invoices" ON public.saas_subscription_invoices;
DROP POLICY IF EXISTS "saas_subscription_invoices_tenant_select_policy" ON public.saas_subscription_invoices;
CREATE POLICY "saas_subscription_invoices_tenant_select_policy" ON public.saas_subscription_invoices
    FOR SELECT TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
      OR ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "saas_subscription_invoices_tenant_insert_policy" ON public.saas_subscription_invoices;
CREATE POLICY "saas_subscription_invoices_tenant_insert_policy" ON public.saas_subscription_invoices
    FOR INSERT TO authenticated
    WITH CHECK (
      ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
    );
DROP POLICY IF EXISTS "saas_subscription_invoices_tenant_update_policy" ON public.saas_subscription_invoices;
CREATE POLICY "saas_subscription_invoices_tenant_update_policy" ON public.saas_subscription_invoices
    FOR UPDATE TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
    )
    WITH CHECK (
      ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
    );
DROP POLICY IF EXISTS "saas_subscription_invoices_tenant_delete_policy" ON public.saas_subscription_invoices;
CREATE POLICY "saas_subscription_invoices_tenant_delete_policy" ON public.saas_subscription_invoices
    FOR DELETE TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
    );

-- ==============================================================================
-- Table: saas_tenant_storage_usage
-- ==============================================================================
DROP POLICY IF EXISTS "Platform admins can view all storage usage" ON public.saas_tenant_storage_usage;
DROP POLICY IF EXISTS "Tenant users can view their own storage usage" ON public.saas_tenant_storage_usage;
DROP POLICY IF EXISTS "saas_tenant_storage_usage_tenant_select_policy" ON public.saas_tenant_storage_usage;
CREATE POLICY "saas_tenant_storage_usage_tenant_select_policy" ON public.saas_tenant_storage_usage
    FOR SELECT TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
      OR ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "saas_tenant_storage_usage_tenant_insert_policy" ON public.saas_tenant_storage_usage;
CREATE POLICY "saas_tenant_storage_usage_tenant_insert_policy" ON public.saas_tenant_storage_usage
    FOR INSERT TO authenticated
    WITH CHECK (
      ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
    );
DROP POLICY IF EXISTS "saas_tenant_storage_usage_tenant_update_policy" ON public.saas_tenant_storage_usage;
CREATE POLICY "saas_tenant_storage_usage_tenant_update_policy" ON public.saas_tenant_storage_usage
    FOR UPDATE TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
    )
    WITH CHECK (
      ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
    );
DROP POLICY IF EXISTS "saas_tenant_storage_usage_tenant_delete_policy" ON public.saas_tenant_storage_usage;
CREATE POLICY "saas_tenant_storage_usage_tenant_delete_policy" ON public.saas_tenant_storage_usage
    FOR DELETE TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
    );

-- ==============================================================================
-- Table: subscription_events
-- ==============================================================================
DROP POLICY IF EXISTS "Platform super admins can view all subscription events" ON public.subscription_events;
DROP POLICY IF EXISTS "Platform admins can insert subscription events" ON public.subscription_events;
DROP POLICY IF EXISTS "Platform admins can view all subscription events" ON public.subscription_events;
DROP POLICY IF EXISTS "Tenant users can view their own subscription events" ON public.subscription_events;
DROP POLICY IF EXISTS "subscription_events_tenant_select_policy" ON public.subscription_events;
CREATE POLICY "subscription_events_tenant_select_policy" ON public.subscription_events
    FOR SELECT TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
      OR ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "subscription_events_tenant_insert_policy" ON public.subscription_events;
CREATE POLICY "subscription_events_tenant_insert_policy" ON public.subscription_events
    FOR INSERT TO authenticated
    WITH CHECK (
      ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
    );
DROP POLICY IF EXISTS "subscription_events_tenant_update_policy" ON public.subscription_events;
CREATE POLICY "subscription_events_tenant_update_policy" ON public.subscription_events
    FOR UPDATE TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
    )
    WITH CHECK (
      ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
    );
DROP POLICY IF EXISTS "subscription_events_tenant_delete_policy" ON public.subscription_events;
CREATE POLICY "subscription_events_tenant_delete_policy" ON public.subscription_events
    FOR DELETE TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
    );

-- ==============================================================================
-- Table: subscription_plans
-- ==============================================================================
DROP POLICY IF EXISTS "Platform admins can manage subscription plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Anyone can view active subscription plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Public can view active subscription plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "subscription_plans_tenant_select_policy" ON public.subscription_plans;
CREATE POLICY "subscription_plans_tenant_select_policy" ON public.subscription_plans
    FOR SELECT TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
      OR ((is_active = true))
    );
DROP POLICY IF EXISTS "subscription_plans_tenant_insert_policy" ON public.subscription_plans;
CREATE POLICY "subscription_plans_tenant_insert_policy" ON public.subscription_plans
    FOR INSERT TO authenticated
    WITH CHECK (
      ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
    );
DROP POLICY IF EXISTS "subscription_plans_tenant_update_policy" ON public.subscription_plans;
CREATE POLICY "subscription_plans_tenant_update_policy" ON public.subscription_plans
    FOR UPDATE TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
    )
    WITH CHECK (
      ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
    );
DROP POLICY IF EXISTS "subscription_plans_tenant_delete_policy" ON public.subscription_plans;
CREATE POLICY "subscription_plans_tenant_delete_policy" ON public.subscription_plans
    FOR DELETE TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM platform_admins
  WHERE (platform_admins.user_id = (select auth.uid())))))
    );

-- ==============================================================================
-- Table: supplier_material_prices
-- ==============================================================================
DROP POLICY IF EXISTS "Authorized company users can manage supplier material prices" ON public.supplier_material_prices;
DROP POLICY IF EXISTS "Active company users can view supplier material prices" ON public.supplier_material_prices;
DROP POLICY IF EXISTS "supplier_material_prices_tenant_select_policy" ON public.supplier_material_prices;
CREATE POLICY "supplier_material_prices_tenant_select_policy" ON public.supplier_material_prices
    FOR SELECT TO authenticated
    USING (
      ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "supplier_material_prices_tenant_insert_policy" ON public.supplier_material_prices;
CREATE POLICY "supplier_material_prices_tenant_insert_policy" ON public.supplier_material_prices
    FOR INSERT TO authenticated
    WITH CHECK (
      ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "supplier_material_prices_tenant_update_policy" ON public.supplier_material_prices;
CREATE POLICY "supplier_material_prices_tenant_update_policy" ON public.supplier_material_prices
    FOR UPDATE TO authenticated
    USING (
      ((select public.auth_is_active_company_user(company_id)))
    )
    WITH CHECK (
      ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "supplier_material_prices_tenant_delete_policy" ON public.supplier_material_prices;
CREATE POLICY "supplier_material_prices_tenant_delete_policy" ON public.supplier_material_prices
    FOR DELETE TO authenticated
    USING (
      ((select public.auth_is_active_company_user(company_id)))
    );

-- ==============================================================================
-- Table: suppliers
-- ==============================================================================
DROP POLICY IF EXISTS "Authorized company users can manage suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Active company users can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_tenant_select_policy" ON public.suppliers;
CREATE POLICY "suppliers_tenant_select_policy" ON public.suppliers
    FOR SELECT TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'supplier.edit'::text) OR auth_user_has_permission(company_id, 'supplier.create'::text))))
      OR ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "suppliers_tenant_insert_policy" ON public.suppliers;
CREATE POLICY "suppliers_tenant_insert_policy" ON public.suppliers
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'supplier.edit'::text) OR auth_user_has_permission(company_id, 'supplier.create'::text))))
    );
DROP POLICY IF EXISTS "suppliers_tenant_update_policy" ON public.suppliers;
CREATE POLICY "suppliers_tenant_update_policy" ON public.suppliers
    FOR UPDATE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'supplier.edit'::text) OR auth_user_has_permission(company_id, 'supplier.create'::text))))
    )
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'supplier.edit'::text) OR auth_user_has_permission(company_id, 'supplier.create'::text))))
    );
DROP POLICY IF EXISTS "suppliers_tenant_delete_policy" ON public.suppliers;
CREATE POLICY "suppliers_tenant_delete_policy" ON public.suppliers
    FOR DELETE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'supplier.edit'::text) OR auth_user_has_permission(company_id, 'supplier.create'::text))))
    );

-- ==============================================================================
-- Table: support_attachments
-- ==============================================================================
DROP POLICY IF EXISTS "Platform admins have full control on support attachments" ON public.support_attachments;
DROP POLICY IF EXISTS "Tenant users can insert own company support attachments" ON public.support_attachments;
DROP POLICY IF EXISTS "Tenant users can view own company support attachments" ON public.support_attachments;
DROP POLICY IF EXISTS "support_attachments_tenant_select_policy" ON public.support_attachments;
CREATE POLICY "support_attachments_tenant_select_policy" ON public.support_attachments
    FOR SELECT TO authenticated
    USING (
      (((select public.auth_is_platform_owner()) OR (EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE ((pa.user_id = (select auth.uid())) AND (pa.is_active = true))))))
      OR (((select public.auth_is_active_company_user(company_id)) OR (EXISTS ( SELECT 1
   FROM company_users cu
  WHERE ((cu.company_id = support_attachments.company_id) AND (cu.user_id = (select auth.uid())) AND (cu.status = 'active'::text))))))
    );
DROP POLICY IF EXISTS "support_attachments_tenant_insert_policy" ON public.support_attachments;
CREATE POLICY "support_attachments_tenant_insert_policy" ON public.support_attachments
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select public.auth_is_platform_owner()) OR (EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE ((pa.user_id = (select auth.uid())) AND (pa.is_active = true))))))
      OR (((select public.auth_is_active_company_user(company_id)) OR (EXISTS ( SELECT 1
   FROM company_users cu
  WHERE ((cu.company_id = support_attachments.company_id) AND (cu.user_id = (select auth.uid())) AND (cu.status = 'active'::text))))))
    );
DROP POLICY IF EXISTS "support_attachments_tenant_update_policy" ON public.support_attachments;
CREATE POLICY "support_attachments_tenant_update_policy" ON public.support_attachments
    FOR UPDATE TO authenticated
    USING (
      (((select public.auth_is_platform_owner()) OR (EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE ((pa.user_id = (select auth.uid())) AND (pa.is_active = true))))))
    )
    WITH CHECK (
      (((select public.auth_is_platform_owner()) OR (EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE ((pa.user_id = (select auth.uid())) AND (pa.is_active = true))))))
    );
DROP POLICY IF EXISTS "support_attachments_tenant_delete_policy" ON public.support_attachments;
CREATE POLICY "support_attachments_tenant_delete_policy" ON public.support_attachments
    FOR DELETE TO authenticated
    USING (
      (((select public.auth_is_platform_owner()) OR (EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE ((pa.user_id = (select auth.uid())) AND (pa.is_active = true))))))
    );

-- ==============================================================================
-- Table: support_conversations
-- ==============================================================================
DROP POLICY IF EXISTS "Platform admins have full control on support conversations" ON public.support_conversations;
DROP POLICY IF EXISTS "Tenant users can create conversations for own company" ON public.support_conversations;
DROP POLICY IF EXISTS "Tenant users can view own company conversations" ON public.support_conversations;
DROP POLICY IF EXISTS "Tenant users can update own company conversations" ON public.support_conversations;
DROP POLICY IF EXISTS "support_conversations_tenant_select_policy" ON public.support_conversations;
CREATE POLICY "support_conversations_tenant_select_policy" ON public.support_conversations
    FOR SELECT TO authenticated
    USING (
      (((select public.auth_is_platform_owner()) OR (EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE ((pa.user_id = (select auth.uid())) AND (pa.is_active = true))))))
      OR (((select public.auth_is_active_company_user(company_id)) OR (EXISTS ( SELECT 1
   FROM company_users cu
  WHERE ((cu.company_id = support_conversations.company_id) AND (cu.user_id = (select auth.uid())) AND (cu.status = 'active'::text))))))
    );
DROP POLICY IF EXISTS "support_conversations_tenant_insert_policy" ON public.support_conversations;
CREATE POLICY "support_conversations_tenant_insert_policy" ON public.support_conversations
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select public.auth_is_platform_owner()) OR (EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE ((pa.user_id = (select auth.uid())) AND (pa.is_active = true))))))
      OR (((select public.auth_is_active_company_user(company_id)) OR (EXISTS ( SELECT 1
   FROM company_users cu
  WHERE ((cu.company_id = support_conversations.company_id) AND (cu.user_id = (select auth.uid())) AND (cu.status = 'active'::text))))))
    );
DROP POLICY IF EXISTS "support_conversations_tenant_update_policy" ON public.support_conversations;
CREATE POLICY "support_conversations_tenant_update_policy" ON public.support_conversations
    FOR UPDATE TO authenticated
    USING (
      (((select public.auth_is_platform_owner()) OR (EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE ((pa.user_id = (select auth.uid())) AND (pa.is_active = true))))))
      OR (((select public.auth_is_active_company_user(company_id)) OR (EXISTS ( SELECT 1
   FROM company_users cu
  WHERE ((cu.company_id = support_conversations.company_id) AND (cu.user_id = (select auth.uid())) AND (cu.status = 'active'::text))))))
    )
    WITH CHECK (
      (((select public.auth_is_platform_owner()) OR (EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE ((pa.user_id = (select auth.uid())) AND (pa.is_active = true))))))
      OR (((select public.auth_is_active_company_user(company_id)) OR (EXISTS ( SELECT 1
   FROM company_users cu
  WHERE ((cu.company_id = support_conversations.company_id) AND (cu.user_id = (select auth.uid())) AND (cu.status = 'active'::text))))))
    );
DROP POLICY IF EXISTS "support_conversations_tenant_delete_policy" ON public.support_conversations;
CREATE POLICY "support_conversations_tenant_delete_policy" ON public.support_conversations
    FOR DELETE TO authenticated
    USING (
      (((select public.auth_is_platform_owner()) OR (EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE ((pa.user_id = (select auth.uid())) AND (pa.is_active = true))))))
    );

-- ==============================================================================
-- Table: support_messages
-- ==============================================================================
DROP POLICY IF EXISTS "Platform admins have full control on support messages" ON public.support_messages;
DROP POLICY IF EXISTS "Tenant users can insert messages into own conversations" ON public.support_messages;
DROP POLICY IF EXISTS "Tenant users can view public messages in own conversations" ON public.support_messages;
DROP POLICY IF EXISTS "support_messages_tenant_select_policy" ON public.support_messages;
CREATE POLICY "support_messages_tenant_select_policy" ON public.support_messages
    FOR SELECT TO authenticated
    USING (
      (((select public.auth_is_platform_owner()) OR (EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE ((pa.user_id = (select auth.uid())) AND (pa.is_active = true))))))
      OR (((message_type <> 'internal_note'::text) AND (deleted_at IS NULL) AND ((select public.auth_is_active_company_user(company_id)) OR (EXISTS ( SELECT 1
   FROM company_users cu
  WHERE ((cu.company_id = support_messages.company_id) AND (cu.user_id = (select auth.uid())) AND (cu.status = 'active'::text)))))))
    );
DROP POLICY IF EXISTS "support_messages_tenant_insert_policy" ON public.support_messages;
CREATE POLICY "support_messages_tenant_insert_policy" ON public.support_messages
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select public.auth_is_platform_owner()) OR (EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE ((pa.user_id = (select auth.uid())) AND (pa.is_active = true))))))
      OR (((sender_type = 'tenant_user'::text) AND (message_type = 'message'::text) AND ((select public.auth_is_active_company_user(company_id)) OR (EXISTS ( SELECT 1
   FROM company_users cu
  WHERE ((cu.company_id = support_messages.company_id) AND (cu.user_id = (select auth.uid())) AND (cu.status = 'active'::text)))))))
    );
DROP POLICY IF EXISTS "support_messages_tenant_update_policy" ON public.support_messages;
CREATE POLICY "support_messages_tenant_update_policy" ON public.support_messages
    FOR UPDATE TO authenticated
    USING (
      (((select public.auth_is_platform_owner()) OR (EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE ((pa.user_id = (select auth.uid())) AND (pa.is_active = true))))))
    )
    WITH CHECK (
      (((select public.auth_is_platform_owner()) OR (EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE ((pa.user_id = (select auth.uid())) AND (pa.is_active = true))))))
    );
DROP POLICY IF EXISTS "support_messages_tenant_delete_policy" ON public.support_messages;
CREATE POLICY "support_messages_tenant_delete_policy" ON public.support_messages
    FOR DELETE TO authenticated
    USING (
      (((select public.auth_is_platform_owner()) OR (EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE ((pa.user_id = (select auth.uid())) AND (pa.is_active = true))))))
    );

-- ==============================================================================
-- Table: tenant_domains
-- ==============================================================================
DROP POLICY IF EXISTS "tenant_domains_manage_policy" ON public.tenant_domains;
DROP POLICY IF EXISTS "tenant_domains_select_policy" ON public.tenant_domains;
DROP POLICY IF EXISTS "tenant_domains_tenant_select_policy" ON public.tenant_domains;
CREATE POLICY "tenant_domains_tenant_select_policy" ON public.tenant_domains
    FOR SELECT TO authenticated
    USING (
      (((tenant_id IN ( SELECT cu.company_id
   FROM ((company_users cu
     JOIN user_roles ur ON ((ur.company_user_id = cu.id)))
     JOIN roles r ON ((r.id = ur.role_id)))
  WHERE ((cu.user_id = (select auth.uid())) AND (cu.status = 'active'::text) AND ((r.slug = ANY (ARRAY['business_owner'::text, 'system_admin'::text, 'owner'::text, 'admin'::text])) OR (r.name = ANY (ARRAY['Business Owner'::text, 'System Admin'::text, 'Owner'::text, 'Admin'::text])))))) OR (EXISTS ( SELECT 1
   FROM platform_admins
  WHERE ((platform_admins.user_id = (select auth.uid())) AND (platform_admins.is_active = true))))))
      OR (((tenant_id IN ( SELECT company_users.company_id
   FROM company_users
  WHERE ((company_users.user_id = (select auth.uid())) AND (company_users.status = 'active'::text)))) OR (EXISTS ( SELECT 1
   FROM platform_admins
  WHERE ((platform_admins.user_id = (select auth.uid())) AND (platform_admins.is_active = true))))))
    );
DROP POLICY IF EXISTS "tenant_domains_tenant_insert_policy" ON public.tenant_domains;
CREATE POLICY "tenant_domains_tenant_insert_policy" ON public.tenant_domains
    FOR INSERT TO authenticated
    WITH CHECK (
      (((tenant_id IN ( SELECT cu.company_id
   FROM ((company_users cu
     JOIN user_roles ur ON ((ur.company_user_id = cu.id)))
     JOIN roles r ON ((r.id = ur.role_id)))
  WHERE ((cu.user_id = (select auth.uid())) AND (cu.status = 'active'::text) AND ((r.slug = ANY (ARRAY['business_owner'::text, 'system_admin'::text, 'owner'::text, 'admin'::text])) OR (r.name = ANY (ARRAY['Business Owner'::text, 'System Admin'::text, 'Owner'::text, 'Admin'::text])))))) OR (EXISTS ( SELECT 1
   FROM platform_admins
  WHERE ((platform_admins.user_id = (select auth.uid())) AND (platform_admins.is_active = true))))))
    );
DROP POLICY IF EXISTS "tenant_domains_tenant_update_policy" ON public.tenant_domains;
CREATE POLICY "tenant_domains_tenant_update_policy" ON public.tenant_domains
    FOR UPDATE TO authenticated
    USING (
      (((tenant_id IN ( SELECT cu.company_id
   FROM ((company_users cu
     JOIN user_roles ur ON ((ur.company_user_id = cu.id)))
     JOIN roles r ON ((r.id = ur.role_id)))
  WHERE ((cu.user_id = (select auth.uid())) AND (cu.status = 'active'::text) AND ((r.slug = ANY (ARRAY['business_owner'::text, 'system_admin'::text, 'owner'::text, 'admin'::text])) OR (r.name = ANY (ARRAY['Business Owner'::text, 'System Admin'::text, 'Owner'::text, 'Admin'::text])))))) OR (EXISTS ( SELECT 1
   FROM platform_admins
  WHERE ((platform_admins.user_id = (select auth.uid())) AND (platform_admins.is_active = true))))))
    )
    WITH CHECK (
      (((tenant_id IN ( SELECT cu.company_id
   FROM ((company_users cu
     JOIN user_roles ur ON ((ur.company_user_id = cu.id)))
     JOIN roles r ON ((r.id = ur.role_id)))
  WHERE ((cu.user_id = (select auth.uid())) AND (cu.status = 'active'::text) AND ((r.slug = ANY (ARRAY['business_owner'::text, 'system_admin'::text, 'owner'::text, 'admin'::text])) OR (r.name = ANY (ARRAY['Business Owner'::text, 'System Admin'::text, 'Owner'::text, 'Admin'::text])))))) OR (EXISTS ( SELECT 1
   FROM platform_admins
  WHERE ((platform_admins.user_id = (select auth.uid())) AND (platform_admins.is_active = true))))))
    );
DROP POLICY IF EXISTS "tenant_domains_tenant_delete_policy" ON public.tenant_domains;
CREATE POLICY "tenant_domains_tenant_delete_policy" ON public.tenant_domains
    FOR DELETE TO authenticated
    USING (
      (((tenant_id IN ( SELECT cu.company_id
   FROM ((company_users cu
     JOIN user_roles ur ON ((ur.company_user_id = cu.id)))
     JOIN roles r ON ((r.id = ur.role_id)))
  WHERE ((cu.user_id = (select auth.uid())) AND (cu.status = 'active'::text) AND ((r.slug = ANY (ARRAY['business_owner'::text, 'system_admin'::text, 'owner'::text, 'admin'::text])) OR (r.name = ANY (ARRAY['Business Owner'::text, 'System Admin'::text, 'Owner'::text, 'Admin'::text])))))) OR (EXISTS ( SELECT 1
   FROM platform_admins
  WHERE ((platform_admins.user_id = (select auth.uid())) AND (platform_admins.is_active = true))))))
    );

-- ==============================================================================
-- Table: tenant_memberships
-- ==============================================================================
DROP POLICY IF EXISTS "Admins can manage company memberships" ON public.tenant_memberships;
DROP POLICY IF EXISTS "Company creators can insert owner membership" ON public.tenant_memberships;
DROP POLICY IF EXISTS "Members can view company members" ON public.tenant_memberships;
DROP POLICY IF EXISTS "Users can view own memberships" ON public.tenant_memberships;
DROP POLICY IF EXISTS "tenant_memberships_tenant_select_policy" ON public.tenant_memberships;
CREATE POLICY "tenant_memberships_tenant_select_policy" ON public.tenant_memberships
    FOR SELECT TO authenticated
    USING (
      ((auth_user_get_role(company_id) = ANY (ARRAY['owner'::text, 'admin'::text])))
      OR ((select public.auth_user_has_company_access(company_id)))
      OR (((select auth.uid()) = user_id))
    );
DROP POLICY IF EXISTS "tenant_memberships_tenant_insert_policy" ON public.tenant_memberships;
CREATE POLICY "tenant_memberships_tenant_insert_policy" ON public.tenant_memberships
    FOR INSERT TO authenticated
    WITH CHECK (
      ((auth_user_get_role(company_id) = ANY (ARRAY['owner'::text, 'admin'::text])))
      OR ((((select auth.uid()) = user_id) AND (role = 'owner'::text)))
    );
DROP POLICY IF EXISTS "tenant_memberships_tenant_update_policy" ON public.tenant_memberships;
CREATE POLICY "tenant_memberships_tenant_update_policy" ON public.tenant_memberships
    FOR UPDATE TO authenticated
    USING (
      ((auth_user_get_role(company_id) = ANY (ARRAY['owner'::text, 'admin'::text])))
    )
    WITH CHECK (
      ((auth_user_get_role(company_id) = ANY (ARRAY['owner'::text, 'admin'::text])))
    );
DROP POLICY IF EXISTS "tenant_memberships_tenant_delete_policy" ON public.tenant_memberships;
CREATE POLICY "tenant_memberships_tenant_delete_policy" ON public.tenant_memberships
    FOR DELETE TO authenticated
    USING (
      ((auth_user_get_role(company_id) = ANY (ARRAY['owner'::text, 'admin'::text])))
    );

-- ==============================================================================
-- Table: tenant_whatsapp_connections
-- ==============================================================================
DROP POLICY IF EXISTS "Tenant admins manage their WhatsApp connection" ON public.tenant_whatsapp_connections;
DROP POLICY IF EXISTS "Tenant active users view their WhatsApp connection" ON public.tenant_whatsapp_connections;
DROP POLICY IF EXISTS "tenant_whatsapp_connections_tenant_select_policy" ON public.tenant_whatsapp_connections;
CREATE POLICY "tenant_whatsapp_connections_tenant_select_policy" ON public.tenant_whatsapp_connections
    FOR SELECT TO authenticated
    USING (
      ((((select public.auth_is_active_company_user(tenant_id)) AND auth_user_has_permission(tenant_id, 'whatsapp.manage_connection'::text)) OR (select public.auth_is_platform_admin())))
      OR (((select public.auth_is_active_company_user(tenant_id)) OR (select public.auth_is_platform_admin())))
    );
DROP POLICY IF EXISTS "tenant_whatsapp_connections_tenant_insert_policy" ON public.tenant_whatsapp_connections;
CREATE POLICY "tenant_whatsapp_connections_tenant_insert_policy" ON public.tenant_whatsapp_connections
    FOR INSERT TO authenticated
    WITH CHECK (
      ((((select public.auth_is_active_company_user(tenant_id)) AND auth_user_has_permission(tenant_id, 'whatsapp.manage_connection'::text)) OR (select public.auth_is_platform_admin())))
    );
DROP POLICY IF EXISTS "tenant_whatsapp_connections_tenant_update_policy" ON public.tenant_whatsapp_connections;
CREATE POLICY "tenant_whatsapp_connections_tenant_update_policy" ON public.tenant_whatsapp_connections
    FOR UPDATE TO authenticated
    USING (
      ((((select public.auth_is_active_company_user(tenant_id)) AND auth_user_has_permission(tenant_id, 'whatsapp.manage_connection'::text)) OR (select public.auth_is_platform_admin())))
    )
    WITH CHECK (
      ((((select public.auth_is_active_company_user(tenant_id)) AND auth_user_has_permission(tenant_id, 'whatsapp.manage_connection'::text)) OR (select public.auth_is_platform_admin())))
    );
DROP POLICY IF EXISTS "tenant_whatsapp_connections_tenant_delete_policy" ON public.tenant_whatsapp_connections;
CREATE POLICY "tenant_whatsapp_connections_tenant_delete_policy" ON public.tenant_whatsapp_connections
    FOR DELETE TO authenticated
    USING (
      ((((select public.auth_is_active_company_user(tenant_id)) AND auth_user_has_permission(tenant_id, 'whatsapp.manage_connection'::text)) OR (select public.auth_is_platform_admin())))
    );

-- ==============================================================================
-- Table: user_branch_access
-- ==============================================================================
DROP POLICY IF EXISTS "Admins can manage user branch access for their company" ON public.user_branch_access;
DROP POLICY IF EXISTS "Users can view user branch access for their company" ON public.user_branch_access;
DROP POLICY IF EXISTS "user_branch_access_tenant_select_policy" ON public.user_branch_access;
CREATE POLICY "user_branch_access_tenant_select_policy" ON public.user_branch_access
    FOR SELECT TO authenticated
    USING (
      ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "user_branch_access_tenant_insert_policy" ON public.user_branch_access;
CREATE POLICY "user_branch_access_tenant_insert_policy" ON public.user_branch_access
    FOR INSERT TO authenticated
    WITH CHECK (
      ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "user_branch_access_tenant_update_policy" ON public.user_branch_access;
CREATE POLICY "user_branch_access_tenant_update_policy" ON public.user_branch_access
    FOR UPDATE TO authenticated
    USING (
      ((select public.auth_is_active_company_user(company_id)))
    )
    WITH CHECK (
      ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "user_branch_access_tenant_delete_policy" ON public.user_branch_access;
CREATE POLICY "user_branch_access_tenant_delete_policy" ON public.user_branch_access
    FOR DELETE TO authenticated
    USING (
      ((select public.auth_is_active_company_user(company_id)))
    );

-- ==============================================================================
-- Table: user_permission_overrides
-- ==============================================================================
DROP POLICY IF EXISTS "Admins can manage user permission overrides for their company" ON public.user_permission_overrides;
DROP POLICY IF EXISTS "Admins can manage user_permission_overrides" ON public.user_permission_overrides;
DROP POLICY IF EXISTS "Users can view overrides in their company" ON public.user_permission_overrides;
DROP POLICY IF EXISTS "Users can view user permission overrides for their company" ON public.user_permission_overrides;
DROP POLICY IF EXISTS "user_permission_overrides_tenant_select_policy" ON public.user_permission_overrides;
CREATE POLICY "user_permission_overrides_tenant_select_policy" ON public.user_permission_overrides
    FOR SELECT TO authenticated
    USING (
      ((select public.auth_is_active_company_user(company_id)))
      OR (((select public.auth_is_active_company_user(company_id)) AND ((auth_get_user_company_role(company_id) = ANY (ARRAY['business_owner'::text, 'owner'::text, 'admin'::text])) OR (select public.auth_is_platform_owner()))))
    );
DROP POLICY IF EXISTS "user_permission_overrides_tenant_insert_policy" ON public.user_permission_overrides;
CREATE POLICY "user_permission_overrides_tenant_insert_policy" ON public.user_permission_overrides
    FOR INSERT TO authenticated
    WITH CHECK (
      ((select public.auth_is_active_company_user(company_id)))
      OR (((select public.auth_is_active_company_user(company_id)) AND ((auth_get_user_company_role(company_id) = ANY (ARRAY['business_owner'::text, 'owner'::text, 'admin'::text])) OR (select public.auth_is_platform_owner()))))
    );
DROP POLICY IF EXISTS "user_permission_overrides_tenant_update_policy" ON public.user_permission_overrides;
CREATE POLICY "user_permission_overrides_tenant_update_policy" ON public.user_permission_overrides
    FOR UPDATE TO authenticated
    USING (
      ((select public.auth_is_active_company_user(company_id)))
      OR (((select public.auth_is_active_company_user(company_id)) AND ((auth_get_user_company_role(company_id) = ANY (ARRAY['business_owner'::text, 'owner'::text, 'admin'::text])) OR (select public.auth_is_platform_owner()))))
    )
    WITH CHECK (
      ((select public.auth_is_active_company_user(company_id)))
      OR (((select public.auth_is_active_company_user(company_id)) AND ((auth_get_user_company_role(company_id) = ANY (ARRAY['business_owner'::text, 'owner'::text, 'admin'::text])) OR (select public.auth_is_platform_owner()))))
    );
DROP POLICY IF EXISTS "user_permission_overrides_tenant_delete_policy" ON public.user_permission_overrides;
CREATE POLICY "user_permission_overrides_tenant_delete_policy" ON public.user_permission_overrides
    FOR DELETE TO authenticated
    USING (
      ((select public.auth_is_active_company_user(company_id)))
      OR (((select public.auth_is_active_company_user(company_id)) AND ((auth_get_user_company_role(company_id) = ANY (ARRAY['business_owner'::text, 'owner'::text, 'admin'::text])) OR (select public.auth_is_platform_owner()))))
    );

-- ==============================================================================
-- Table: user_profiles
-- ==============================================================================
DROP POLICY IF EXISTS "Users can insert own user_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Members can view teammate profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own user_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own user_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_tenant_select_policy" ON public.user_profiles;
CREATE POLICY "user_profiles_tenant_select_policy" ON public.user_profiles
    FOR SELECT TO authenticated
    USING (
      ((EXISTS ( SELECT 1
   FROM (company_users cu1
     JOIN company_users cu2 ON ((cu1.company_id = cu2.company_id)))
  WHERE ((cu1.user_id = (select auth.uid())) AND (cu2.user_id = user_profiles.id) AND (cu1.status = 'active'::text)))))
      OR (((select auth.uid()) = id))
    );
DROP POLICY IF EXISTS "user_profiles_tenant_insert_policy" ON public.user_profiles;
CREATE POLICY "user_profiles_tenant_insert_policy" ON public.user_profiles
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select auth.uid()) = id))
    );
DROP POLICY IF EXISTS "user_profiles_tenant_update_policy" ON public.user_profiles;
CREATE POLICY "user_profiles_tenant_update_policy" ON public.user_profiles
    FOR UPDATE TO authenticated
    USING (
      (((select auth.uid()) = id))
    )
    WITH CHECK (
      (((select auth.uid()) = id))
    );

-- ==============================================================================
-- Table: user_roles
-- ==============================================================================
DROP POLICY IF EXISTS "Admins can manage user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Active members can view user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_tenant_select_policy" ON public.user_roles;
CREATE POLICY "user_roles_tenant_select_policy" ON public.user_roles
    FOR SELECT TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_get_user_company_role(company_id) = ANY (ARRAY['owner'::text, 'admin'::text]))))
      OR ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "user_roles_tenant_insert_policy" ON public.user_roles;
CREATE POLICY "user_roles_tenant_insert_policy" ON public.user_roles
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_get_user_company_role(company_id) = ANY (ARRAY['owner'::text, 'admin'::text]))))
    );
DROP POLICY IF EXISTS "user_roles_tenant_update_policy" ON public.user_roles;
CREATE POLICY "user_roles_tenant_update_policy" ON public.user_roles
    FOR UPDATE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_get_user_company_role(company_id) = ANY (ARRAY['owner'::text, 'admin'::text]))))
    )
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_get_user_company_role(company_id) = ANY (ARRAY['owner'::text, 'admin'::text]))))
    );
DROP POLICY IF EXISTS "user_roles_tenant_delete_policy" ON public.user_roles;
CREATE POLICY "user_roles_tenant_delete_policy" ON public.user_roles
    FOR DELETE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_get_user_company_role(company_id) = ANY (ARRAY['owner'::text, 'admin'::text]))))
    );

-- ==============================================================================
-- Table: whatsapp_chats
-- ==============================================================================
DROP POLICY IF EXISTS "Authorized tenant users manage WhatsApp chats" ON public.whatsapp_chats;
DROP POLICY IF EXISTS "Tenant active users view WhatsApp chats" ON public.whatsapp_chats;
DROP POLICY IF EXISTS "whatsapp_chats_tenant_select_policy" ON public.whatsapp_chats;
CREATE POLICY "whatsapp_chats_tenant_select_policy" ON public.whatsapp_chats
    FOR SELECT TO authenticated
    USING (
      ((((select public.auth_is_active_company_user(tenant_id)) AND auth_user_has_permission(tenant_id, 'whatsapp.send'::text)) OR (select public.auth_is_platform_admin())))
      OR (((select public.auth_is_active_company_user(tenant_id)) OR (select public.auth_is_platform_admin())))
    );
DROP POLICY IF EXISTS "whatsapp_chats_tenant_insert_policy" ON public.whatsapp_chats;
CREATE POLICY "whatsapp_chats_tenant_insert_policy" ON public.whatsapp_chats
    FOR INSERT TO authenticated
    WITH CHECK (
      ((((select public.auth_is_active_company_user(tenant_id)) AND auth_user_has_permission(tenant_id, 'whatsapp.send'::text)) OR (select public.auth_is_platform_admin())))
    );
DROP POLICY IF EXISTS "whatsapp_chats_tenant_update_policy" ON public.whatsapp_chats;
CREATE POLICY "whatsapp_chats_tenant_update_policy" ON public.whatsapp_chats
    FOR UPDATE TO authenticated
    USING (
      ((((select public.auth_is_active_company_user(tenant_id)) AND auth_user_has_permission(tenant_id, 'whatsapp.send'::text)) OR (select public.auth_is_platform_admin())))
    )
    WITH CHECK (
      ((((select public.auth_is_active_company_user(tenant_id)) AND auth_user_has_permission(tenant_id, 'whatsapp.send'::text)) OR (select public.auth_is_platform_admin())))
    );
DROP POLICY IF EXISTS "whatsapp_chats_tenant_delete_policy" ON public.whatsapp_chats;
CREATE POLICY "whatsapp_chats_tenant_delete_policy" ON public.whatsapp_chats
    FOR DELETE TO authenticated
    USING (
      ((((select public.auth_is_active_company_user(tenant_id)) AND auth_user_has_permission(tenant_id, 'whatsapp.send'::text)) OR (select public.auth_is_platform_admin())))
    );

-- ==============================================================================
-- Table: whatsapp_contacts
-- ==============================================================================
DROP POLICY IF EXISTS "Authorized tenant users manage WhatsApp contacts" ON public.whatsapp_contacts;
DROP POLICY IF EXISTS "Tenant active users view WhatsApp contacts" ON public.whatsapp_contacts;
DROP POLICY IF EXISTS "whatsapp_contacts_tenant_select_policy" ON public.whatsapp_contacts;
CREATE POLICY "whatsapp_contacts_tenant_select_policy" ON public.whatsapp_contacts
    FOR SELECT TO authenticated
    USING (
      ((((select public.auth_is_active_company_user(tenant_id)) AND (auth_user_has_permission(tenant_id, 'whatsapp.send'::text) OR auth_user_has_permission(tenant_id, 'customers.edit'::text))) OR (select public.auth_is_platform_admin())))
      OR (((select public.auth_is_active_company_user(tenant_id)) OR (select public.auth_is_platform_admin())))
    );
DROP POLICY IF EXISTS "whatsapp_contacts_tenant_insert_policy" ON public.whatsapp_contacts;
CREATE POLICY "whatsapp_contacts_tenant_insert_policy" ON public.whatsapp_contacts
    FOR INSERT TO authenticated
    WITH CHECK (
      ((((select public.auth_is_active_company_user(tenant_id)) AND (auth_user_has_permission(tenant_id, 'whatsapp.send'::text) OR auth_user_has_permission(tenant_id, 'customers.edit'::text))) OR (select public.auth_is_platform_admin())))
    );
DROP POLICY IF EXISTS "whatsapp_contacts_tenant_update_policy" ON public.whatsapp_contacts;
CREATE POLICY "whatsapp_contacts_tenant_update_policy" ON public.whatsapp_contacts
    FOR UPDATE TO authenticated
    USING (
      ((((select public.auth_is_active_company_user(tenant_id)) AND (auth_user_has_permission(tenant_id, 'whatsapp.send'::text) OR auth_user_has_permission(tenant_id, 'customers.edit'::text))) OR (select public.auth_is_platform_admin())))
    )
    WITH CHECK (
      ((((select public.auth_is_active_company_user(tenant_id)) AND (auth_user_has_permission(tenant_id, 'whatsapp.send'::text) OR auth_user_has_permission(tenant_id, 'customers.edit'::text))) OR (select public.auth_is_platform_admin())))
    );
DROP POLICY IF EXISTS "whatsapp_contacts_tenant_delete_policy" ON public.whatsapp_contacts;
CREATE POLICY "whatsapp_contacts_tenant_delete_policy" ON public.whatsapp_contacts
    FOR DELETE TO authenticated
    USING (
      ((((select public.auth_is_active_company_user(tenant_id)) AND (auth_user_has_permission(tenant_id, 'whatsapp.send'::text) OR auth_user_has_permission(tenant_id, 'customers.edit'::text))) OR (select public.auth_is_platform_admin())))
    );

-- ==============================================================================
-- Table: workflow_rules
-- ==============================================================================
DROP POLICY IF EXISTS "Authorized users can manage workflow rules" ON public.workflow_rules;
DROP POLICY IF EXISTS "Company members can view workflow rules" ON public.workflow_rules;
DROP POLICY IF EXISTS "workflow_rules_tenant_select_policy" ON public.workflow_rules;
CREATE POLICY "workflow_rules_tenant_select_policy" ON public.workflow_rules
    FOR SELECT TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'settings.edit'::text) OR (select public.auth_is_platform_owner()))))
      OR ((select public.auth_is_active_company_user(company_id)))
    );
DROP POLICY IF EXISTS "workflow_rules_tenant_insert_policy" ON public.workflow_rules;
CREATE POLICY "workflow_rules_tenant_insert_policy" ON public.workflow_rules
    FOR INSERT TO authenticated
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'settings.edit'::text) OR (select public.auth_is_platform_owner()))))
    );
DROP POLICY IF EXISTS "workflow_rules_tenant_update_policy" ON public.workflow_rules;
CREATE POLICY "workflow_rules_tenant_update_policy" ON public.workflow_rules
    FOR UPDATE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'settings.edit'::text) OR (select public.auth_is_platform_owner()))))
    )
    WITH CHECK (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'settings.edit'::text) OR (select public.auth_is_platform_owner()))))
    );
DROP POLICY IF EXISTS "workflow_rules_tenant_delete_policy" ON public.workflow_rules;
CREATE POLICY "workflow_rules_tenant_delete_policy" ON public.workflow_rules
    FOR DELETE TO authenticated
    USING (
      (((select public.auth_is_active_company_user(company_id)) AND (auth_user_has_permission(company_id, 'settings.edit'::text) OR (select public.auth_is_platform_owner()))))
    );
