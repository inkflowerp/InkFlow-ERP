import { createClient } from '../supabase/server.ts'
import { createAdminClient } from '../supabase/admin.ts'
import type {
  CompanyRow,
  CompanySettingsRow,
  CompanyUserWithProfile,
  BranchRow,
  RoleRow,
} from '../../types/tenant.types.ts'
import type { DataScope } from '../../types/rbac.types.ts'
import { MODULE_ACTION_SPECS } from '../../types/rbac.types.ts'
import { checkPermission } from '../auth/rbac.client.ts'

export class TenantRepository {
  private static membershipCache = new Map<string, { data: any; expiresAt: number }>()
  private static companySlugCache = new Map<string, { data: CompanyRow | null; expiresAt: number }>()
  private static companyIdCache = new Map<string, { data: CompanyRow | null; expiresAt: number }>()

  static invalidateMembershipCache(userId?: string): void {
    if (userId) {
      for (const key of TenantRepository.membershipCache.keys()) {
        if (key.startsWith(`${userId}:`)) {
          TenantRepository.membershipCache.delete(key)
        }
      }
    } else {
      TenantRepository.membershipCache.clear()
    }
  }

  static invalidateCompanyCache(slugOrId?: string): void {
    if (slugOrId) {
      const clean = slugOrId.toLowerCase().trim()
      TenantRepository.companySlugCache.delete(clean)
      TenantRepository.companyIdCache.delete(slugOrId)
    } else {
      TenantRepository.companySlugCache.clear()
      TenantRepository.companyIdCache.clear()
    }
  }

  static async createCompany(
    companyData: Partial<CompanyRow> & {
      name: string
      slug: string
      business_type: string
      plan?: string
      default_locale?: string
    },
    ownerUserId?: string
  ): Promise<CompanyRow> {
    const admin = createAdminClient()
    const { data: newCompany, error: compErr } = await (admin as any)
      .from('companies')
      .insert({
        name: companyData.name.trim(),
        name_bn: companyData.name_bn?.trim() || null,
        slug: companyData.slug.toLowerCase().trim(),
        business_type: companyData.business_type,
        legal_name: companyData.legal_name || companyData.name,
        trade_license_no: companyData.trade_license_no || null,
        bin_no: companyData.bin_no || null,
        tin_no: companyData.tin_no || null,
        phone: companyData.phone || null,
        email: companyData.email || null,
        whatsapp: companyData.whatsapp || null,
        division_id: companyData.division_id || null,
        district_id: companyData.district_id || null,
        upazila_id: companyData.upazila_id || null,
        address: companyData.address || null,
        address_bn: companyData.address_bn || null,
        office_hours: (companyData as any).office_hours || '9:00 AM - 8:00 PM (Sat - Thu)',
        holidays: (companyData as any).holidays || 'Friday',
        logo_url: companyData.logo_url || null,
        currency: companyData.currency || 'BDT',
        default_locale: companyData.default_locale || 'bn',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (compErr || !newCompany) {
      throw new Error(`Failed to create company: ${compErr?.message || 'Unknown database error'}`)
    }

    // Initialize default company settings
    await (admin as any).from('company_settings').insert({
      company_id: newCompany.id,
      invoice_prefix: 'INV',
      quotation_prefix: 'QUO',
      order_prefix: 'ORD',
      challan_prefix: 'CHL',
      default_vat_percentage: 0,
      show_vat_on_invoice: true,
      show_tin_bin: true,
      default_payment_terms: 'cash_on_delivery',
      auto_generate_invoice_from_order: false,
      require_manager_invoice_approval: false,
      enable_sms_notifications: false,
      enable_whatsapp_notifications: true,
      phone: companyData.phone || null,
      whatsapp: companyData.whatsapp || null,
      email: companyData.email || null,
      logo_url: companyData.logo_url || null,
      office_hours: (companyData as any).office_hours || '9:00 AM - 8:00 PM (Sat - Thu)',
      holidays: (companyData as any).holidays || 'Friday',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    // Check if default branch was already created by database trigger trg_on_company_created
    let { data: mainBranch } = await (admin as any)
      .from('branches')
      .select('*')
      .eq('company_id', newCompany.id)
      .maybeSingle()

    if (!mainBranch) {
      const { data: createdBranch } = await (admin as any)
        .from('branches')
        .insert({
          company_id: newCompany.id,
          name: 'Main Branch / হেড অফিস',
          code: 'MAIN',
          is_main: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()
      mainBranch = createdBranch
    }

    // Initialize Company Subscription (Dynamic Plan & Trial Duration)
    try {
      const rawPlan = companyData.plan?.toLowerCase()
      const targetPlanCode = rawPlan === 'growth' ? 'business' : (rawPlan || 'trial')
      
      let { data: planRecord } = await (admin as any)
        .from('subscription_plans')
        .select('*')
        .eq('code', targetPlanCode)
        .maybeSingle()

      if (!planRecord && targetPlanCode === 'trial') {
        const { data: trialPlan } = await (admin as any)
          .from('subscription_plans')
          .select('*')
          .eq('code', 'trial')
          .maybeSingle()
        planRecord = trialPlan
      }

      if (!planRecord) {
        const { data: starterPlan } = await (admin as any)
          .from('subscription_plans')
          .select('*')
          .eq('code', 'starter')
          .maybeSingle()
        planRecord = starterPlan
      }

      const assignedPlanId = planRecord?.id
      if (assignedPlanId) {
        const isTrialPlan = targetPlanCode === 'trial' || planRecord.code === 'trial'
        const trialDays = Number(planRecord.trial_days) || 14
        await (admin as any).from('company_subscriptions').insert({
          company_id: newCompany.id,
          plan_id: assignedPlanId,
          status: isTrialPlan ? 'trial' : 'active',
          billing_interval: 'monthly',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          trial_ends_at: isTrialPlan ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString() : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }
    } catch {
      // Non-blocking fallback for subscription initialization
    }

    // If ownerUserId is provided and valid UUID, link as Business Owner (provided user is NOT a platform administrator)
    const isUuid = ownerUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ownerUserId)
    if (ownerUserId && isUuid) {
      const { data: isPlatformAdmin } = await (admin as any)
        .from('platform_admins')
        .select('id')
        .eq('user_id', ownerUserId)
        .eq('is_active', true)
        .maybeSingle()

      if (!isPlatformAdmin) {
        const { data: compUser } = await (admin as any)
          .from('company_users')
          .upsert(
            {
              company_id: newCompany.id,
              user_id: ownerUserId,
              branch_id: mainBranch?.id || null,
              status: 'active',
              invited_email: companyData.email || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'company_id,user_id' }
          )
          .select()
          .single()

        // Look for business_owner role or owner role
        const { data: ownerRole } = await (admin as any)
          .from('roles')
          .select('id')
          .or('slug.eq.business_owner,slug.eq.owner,id.eq.00000000-0000-0000-0000-000000000001')
          .maybeSingle()

        if (ownerRole && compUser) {
          await (admin as any).from('user_roles').upsert(
            {
              company_user_id: compUser.id,
              role_id: ownerRole.id,
              company_id: newCompany.id,
            },
            { onConflict: 'company_user_id,role_id' }
          )
        }

        try {
          await (admin as any).from('tenant_memberships').upsert({
            company_id: newCompany.id,
            user_id: ownerUserId,
            role: 'owner',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        } catch {
          // Non-blocking
        }
      }
    }

    return newCompany as unknown as CompanyRow
  }

  static async getCompanyBySlug(slug: string): Promise<CompanyRow | null> {
    const cleanSlug = (slug || '').toLowerCase().trim()
    if (!cleanSlug) return null

    const cached = TenantRepository.companySlugCache.get(cleanSlug)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data
    }

    try {
      const admin = createAdminClient()
      const { data, error } = await admin
        .from('companies')
        .select('*')
        .ilike('slug', cleanSlug)
        .maybeSingle()

      if (error) {
        return null
      }
      const company = (data as CompanyRow) || null
      TenantRepository.companySlugCache.set(cleanSlug, {
        data: company,
        expiresAt: Date.now() + 60000,
      })
      if (company?.id) {
        TenantRepository.companyIdCache.set(company.id, {
          data: company,
          expiresAt: Date.now() + 60000,
        })
      }
      return company
    } catch {
      return null
    }
  }

  static async getCompanyById(id: string): Promise<CompanyRow | null> {
    if (!id) return null

    const cached = TenantRepository.companyIdCache.get(id)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data
    }

    try {
      const admin = createAdminClient()
      const { data, error } = await admin
        .from('companies')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error) {
        return null
      }
      const company = (data as CompanyRow) || null
      TenantRepository.companyIdCache.set(id, {
        data: company,
        expiresAt: Date.now() + 60000,
      })
      if (company?.slug) {
        TenantRepository.companySlugCache.set(company.slug.toLowerCase().trim(), {
          data: company,
          expiresAt: Date.now() + 60000,
        })
      }
      return company
    } catch {
      return null
    }
  }

  static async getAllCompanies(): Promise<CompanyRow[]> {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch companies: ${error.message}`)
    }
    return (data || []) as CompanyRow[]
  }

  static async getBranches(companyId: string): Promise<BranchRow[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .eq('company_id', companyId)
      .order('is_main', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch branches: ${error.message}`)
    }
    return (data || []) as BranchRow[]
  }

  static async getRoles(companyId?: string): Promise<RoleRow[]> {
    const admin = createAdminClient()
    let query = admin.from('roles').select('*')
    if (companyId) {
      query = query.or(`company_id.eq.${companyId},company_id.is.null`)
    }
    const { data, error } = await query
    if (error) {
      throw new Error(`Failed to fetch roles: ${error.message}`)
    }
    return (data || []) as RoleRow[]
  }

  static async getCompanyUsers(companyId: string): Promise<CompanyUserWithProfile[]> {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('company_users')
      .select(`
        *,
        branch:branches(*),
        user_roles(role:roles(*))
      `)
      .eq('company_id', companyId)

    if (error) {
      throw new Error(`Failed to fetch company users: ${error.message}`)
    }

    const cuList = data || []
    const userIds = cuList.map((c: any) => c.user_id).filter(Boolean)
    const profileMap = new Map<string, any>()

    if (userIds.length > 0) {
      try {
        const { data: profs } = await (admin as any)
          .from('user_profiles')
          .select('*')
          .in('id', userIds)
        ;(profs || []).forEach((p: any) => profileMap.set(p.id, p))
      } catch {}
    }

    const cuIds = cuList.map((c: any) => c.id).filter(Boolean)
    const overrideMap = new Map<string, Record<string, boolean>>()
    if (cuIds.length > 0) {
      try {
        const { data: ovs } = await (admin as any)
          .from('user_permission_overrides')
          .select('company_user_id, permission:permissions(code), is_granted')
          .in('company_user_id', cuIds)
        ;(ovs || []).forEach((ov: any) => {
          if (!overrideMap.has(ov.company_user_id)) {
            overrideMap.set(ov.company_user_id, {})
          }
          if (ov.permission?.code) {
            overrideMap.get(ov.company_user_id)![ov.permission.code] = ov.is_granted
          }
        })
      } catch {}
    }

    // Fetch user branch access for each user
    const branchAccessMap = new Map<string, string[]>()
    if (userIds.length > 0) {
      try {
        const { data: uba } = await (admin as any)
          .from('user_branch_access')
          .select('user_id, branch_id')
          .eq('company_id', companyId)
          .in('user_id', userIds)
        ;(uba || []).forEach((item: any) => {
          if (!branchAccessMap.has(item.user_id)) {
            branchAccessMap.set(item.user_id, [])
          }
          branchAccessMap.get(item.user_id)!.push(item.branch_id)
        })
      } catch {}
    }

    return cuList.map((cu: any) => {
      const roles = (cu.user_roles || []).map((ur: any) => ur.role).filter(Boolean)
      const overrides = overrideMap.get(cu.id) || {}
      const roleResponsibilities = roles.map((r: any) => r.slug || r.name)
      const rawResponsibilities = Array.isArray(cu.responsibilities) && cu.responsibilities.length > 0
        ? cu.responsibilities
        : roleResponsibilities
      const responsibilities = rawResponsibilities.length > 0 ? rawResponsibilities : ['general_staff']
      const prof = profileMap.get(cu.user_id)
      const authorizedBranches = branchAccessMap.get(cu.user_id) || (cu.branch_id ? [cu.branch_id] : [])

      const dataScopes: Record<string, DataScope> = cu.data_scopes && typeof cu.data_scopes === 'object' && Object.keys(cu.data_scopes).length > 0
        ? cu.data_scopes
        : {
            customers: 'company',
            orders: 'company',
            invoices: 'company',
            reports: 'company',
            production: 'company',
            inventory: 'company',
          }

      return {
        id: cu.id,
        company_id: cu.company_id,
        user_id: cu.user_id,
        branch_id: cu.branch_id,
        status: cu.status,
        department: cu.department || 'General',
        responsibilities,
        overrides,
        data_scopes: dataScopes,
        authorized_branch_ids: authorizedBranches,
        invited_email: cu.invited_email,
        created_at: cu.created_at,
        updated_at: cu.updated_at,
        profile: prof || {
          id: cu.user_id,
          email: cu.invited_email || '',
          full_name: 'Team Member',
          full_name_bn: null,
          phone: null,
          avatar_url: null,
          preferred_locale: 'bn',
          is_active: cu.status === 'active',
          created_at: cu.created_at,
          updated_at: cu.updated_at,
        },
        roles,
        branch: cu.branch || null,
      } as CompanyUserWithProfile
    })
  }

  static async getCompanySettings(companyId: string): Promise<CompanySettingsRow | null> {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('company_settings')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to fetch company settings: ${error.message}`)
    }
    return (data as CompanySettingsRow) || null
  }

  static async updateCompanySettings(
    companyId: string,
    settings: Partial<CompanySettingsRow>
  ): Promise<CompanySettingsRow> {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('company_settings')
      .update({
        ...settings,
        updated_at: new Date().toISOString(),
      })
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update company settings: ${error.message}`)
    }
    TenantRepository.invalidateCompanyCache(companyId)
    return data as CompanySettingsRow
  }

  static async updateCompany(
    companyId: string,
    updates: Partial<CompanyRow>
  ): Promise<CompanyRow> {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('companies')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', companyId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update company: ${error.message}`)
    }
    TenantRepository.invalidateCompanyCache(companyId)
    if (data?.slug) {
      TenantRepository.invalidateCompanyCache(data.slug)
    }
    return data as CompanyRow
  }

  static async updateUserStatus(
    companyUserId: string,
    status: 'active' | 'disabled' | 'invited'
  ): Promise<void> {
    const admin = createAdminClient()
    const { error } = await admin
      .from('company_users')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', companyUserId)

    if (error) {
      throw new Error(`Failed to update user status: ${error.message}`)
    }
  }

  static async ensurePermission(code: string): Promise<string | null> {
    const admin = createAdminClient()
    try {
      const { data: existing } = await (admin as any)
        .from('permissions')
        .select('id')
        .eq('code', code)
        .maybeSingle()

      if (existing?.id) return existing.id

      const parts = code.split('.')
      const moduleName = parts[0] || 'general'
      const actionName = parts[1] || 'view'

      const { data: created, error } = await (admin as any)
        .from('permissions')
        .insert({
          code,
          name: code,
          module: moduleName,
          action: actionName,
          description: `Permission for ${moduleName} ${actionName}`,
          created_at: new Date().toISOString(),
        })
        .select('id')
        .maybeSingle()

      if (error) {
        const { data: recheck } = await (admin as any)
          .from('permissions')
          .select('id')
          .eq('code', code)
          .maybeSingle()
        return recheck?.id || null
      }
      return created?.id || null
    } catch {
      return null
    }
  }

  /**
   * Updates user responsibilities, role assignments, overrides, data scopes, and branch access
   */
  static async updateUserResponsibilitiesAndOverrides(params: {
    companyUserId: string
    department?: string | null
    branchId?: string | null
    responsibilities?: string[]
    overrides?: Record<string, boolean>
    dataScopes?: Record<string, DataScope>
    authorizedBranchIds?: string[]
  }): Promise<void> {
    const admin = createAdminClient()
    const updates: any = { updated_at: new Date().toISOString() }
    if (params.department !== undefined) updates.department = params.department
    if (params.branchId !== undefined) updates.branch_id = params.branchId
    if (params.responsibilities !== undefined) updates.responsibilities = params.responsibilities
    if (params.dataScopes !== undefined) updates.data_scopes = params.dataScopes

    const { data: targetCU, error: userError } = await admin
      .from('company_users')
      .update(updates)
      .eq('id', params.companyUserId)
      .select('id, company_id, user_id')
      .single()

    if (userError || !targetCU) {
      throw new Error(`Failed to update company user record: ${userError?.message || 'User not found'}`)
    }

    const companyId = targetCU.company_id
    const userId = targetCU.user_id

    // 1. Sync User Roles if responsibilities provided
    if (params.responsibilities && Array.isArray(params.responsibilities)) {
      const allRoles = await TenantRepository.getRoles(companyId)
      const roleIdSet = new Set<string>()

      for (const resp of params.responsibilities) {
        const matchedRole = allRoles.find(
          (r) => r.slug === resp || r.name.toLowerCase() === resp.toLowerCase()
        )
        if (matchedRole) {
          roleIdSet.add(matchedRole.id)
        }
      }

      // Reassign user_roles
      await (admin as any).from('user_roles').delete().eq('company_user_id', params.companyUserId)
      for (const rId of Array.from(roleIdSet)) {
        await (admin as any).from('user_roles').insert({
          company_user_id: params.companyUserId,
          role_id: rId,
          company_id: companyId,
        })
      }
    }

    // 2. Sync User Permission Overrides
    if (params.overrides !== undefined) {
      await (admin as any).from('user_permission_overrides').delete().eq('company_user_id', params.companyUserId)

      for (const [permCode, isGranted] of Object.entries(params.overrides)) {
        const permId = await TenantRepository.ensurePermission(permCode)

        if (permId) {
          await (admin as any).from('user_permission_overrides').insert({
            company_id: companyId,
            company_user_id: params.companyUserId,
            permission_id: permId,
            is_granted: isGranted,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        }
      }
    }

    // 3. Sync User Branch Access
    if (params.authorizedBranchIds !== undefined && userId) {
      await (admin as any).from('user_branch_access').delete().eq('company_id', companyId).eq('user_id', userId)

      for (const bId of params.authorizedBranchIds) {
        await (admin as any).from('user_branch_access').insert({
          company_id: companyId,
          user_id: userId,
          branch_id: bId,
          created_at: new Date().toISOString(),
        })
      }
    }

    // Invalidate membership cache so changes are immediately active
    TenantRepository.invalidateMembershipCache(userId)
    if (companyId) {
      TenantRepository.invalidateCompanyCache(companyId)
    }
  }

  /**
   * Custom Role Management Methods
   */
  static async getRolesWithPermissions(companyId?: string) {
    const admin = createAdminClient()
    const roles = await TenantRepository.getRoles(companyId)
    const roleIds = roles.map((r) => r.id)

    const permMap = new Map<string, string[]>()
    if (roleIds.length > 0) {
      try {
        const { data: rps } = await (admin as any)
          .from('role_permissions')
          .select('role_id, permission:permissions(code)')
          .in('role_id', roleIds)
        ;(rps || []).forEach((rp: any) => {
          if (!permMap.has(rp.role_id)) {
            permMap.set(rp.role_id, [])
          }
          if (rp.permission?.code) {
            permMap.get(rp.role_id)!.push(rp.permission.code)
          }
        })
      } catch {}
    }

    return roles.map((r) => ({
      ...r,
      permissions: permMap.get(r.id) || [],
    }))
  }

  static async createCustomRole(params: {
    companyId: string
    name: string
    nameBn?: string
    slug?: string
    description?: string
    permissions: string[]
  }) {
    const admin = createAdminClient()
    const slug = params.slug || params.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

    const { data: newRole, error } = await (admin as any)
      .from('roles')
      .insert({
        company_id: params.companyId,
        name: params.name.trim(),
        name_bn: params.nameBn?.trim() || null,
        slug,
        description: params.description || null,
        is_system: false,
        is_active: true,
        permissions_count: params.permissions.length,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error || !newRole) {
      throw new Error(`Failed to create custom role: ${error?.message || 'Database error'}`)
    }

    // Insert permissions into role_permissions with auto-provisioning
    if (params.permissions.length > 0) {
      for (const code of params.permissions) {
        const permId = await TenantRepository.ensurePermission(code)
        if (permId) {
          await (admin as any).from('role_permissions').insert({
            role_id: newRole.id,
            permission_id: permId,
          })
        }
      }
    }

    TenantRepository.invalidateMembershipCache()
    return newRole
  }

  static async updateRolePermissions(
    roleId: string,
    permissions: string[],
    details?: { name?: string; nameBn?: string; description?: string }
  ) {
    const admin = createAdminClient()

    if (details) {
      await (admin as any)
        .from('roles')
        .update({
          ...(details.name ? { name: details.name.trim() } : {}),
          ...(details.nameBn !== undefined ? { name_bn: details.nameBn ? details.nameBn.trim() : null } : {}),
          ...(details.description !== undefined ? { description: details.description ? details.description.trim() : null } : {}),
          permissions_count: permissions.length,
          updated_at: new Date().toISOString(),
        })
        .eq('id', roleId)
    }

    // Replace role_permissions with auto-provisioning
    await (admin as any).from('role_permissions').delete().eq('role_id', roleId)

    for (const code of permissions) {
      const permId = await TenantRepository.ensurePermission(code)
      if (permId) {
        await (admin as any).from('role_permissions').insert({
          role_id: roleId,
          permission_id: permId,
        })
      }
    }

    TenantRepository.invalidateMembershipCache()
  }

  static async deleteCustomRole(roleId: string, companyId: string) {
    const admin = createAdminClient()

    // Check if any company users are currently assigned to this role
    const { count } = await (admin as any)
      .from('user_roles')
      .select('id', { count: 'exact', head: true })
      .eq('role_id', roleId)

    if (count && count > 0) {
      throw new Error(`Cannot delete role: ${count} users are currently assigned. Reassign them first.`)
    }

    const { error } = await (admin as any)
      .from('roles')
      .delete()
      .eq('id', roleId)
      .eq('company_id', companyId)
      .eq('is_system', false)

    if (error) {
      throw new Error(`Failed to delete role: ${error.message}`)
    }

    TenantRepository.invalidateMembershipCache()
  }

  /**
   * Resolves verified tenant membership and calculates effective permissions across all responsibilities
   */
  static async resolveUserMembership(
    userId: string,
    requestedSlugOrId?: string
  ): Promise<{
    company: CompanyRow
    companyUser: CompanyUserWithProfile
    effectivePermissions: string[]
    primaryRole: string
  } | null> {
    if (!userId) return null

    const cacheKey = `${userId}:${requestedSlugOrId || 'any'}`
    const cached = TenantRepository.membershipCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data
    }

    const admin = createAdminClient()

    let targetCompanyId: string | null = null

    if (requestedSlugOrId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedSlugOrId)
      if (isUuid) {
        targetCompanyId = requestedSlugOrId
      } else {
        const targetCompany = await TenantRepository.getCompanyBySlug(requestedSlugOrId)
        if (!targetCompany) {
          TenantRepository.membershipCache.set(cacheKey, { data: null, expiresAt: Date.now() + 5000 })
          return null
        }
        targetCompanyId = targetCompany.id
      }
    }

    let query = admin
      .from('company_users')
      .select(`
        *,
        company:companies!inner(*),
        branch:branches(*),
        user_roles(role:roles(*))
      `)
      .eq('user_id', userId)
      .eq('status', 'active')

    if (targetCompanyId) {
      query = query.eq('company_id', targetCompanyId)
    }

    let { data: records, error } = await query

    if (error || !records || records.length === 0) {
      TenantRepository.membershipCache.set(cacheKey, { data: null, expiresAt: Date.now() + 5000 })
      return null
    }

    const cu: any = records[0]
    const company = cu.company as CompanyRow
    if (!company.is_active) {
      TenantRepository.membershipCache.set(cacheKey, { data: null, expiresAt: Date.now() + 5000 })
      return null
    }

    const roles: RoleRow[] = (cu.user_roles || []).map((ur: any) => ur.role).filter(Boolean)
    const overrides: Record<string, boolean> = {}

    try {
      const { data: ovs } = await (admin as any)
        .from('user_permission_overrides')
        .select('permission:permissions(code), is_granted')
        .eq('company_user_id', cu.id)
      ;(ovs || []).forEach((ov: any) => {
        if (ov.permission?.code) {
          overrides[ov.permission.code] = ov.is_granted
        }
      })
    } catch {}

    if (cu.overrides && typeof cu.overrides === 'object') {
      Object.assign(overrides, cu.overrides)
    }

    // Query employees table to see if employee record has specific role or portal_credentials
    let employeeRole: string | null = null
    try {
      const { data: emp } = await (admin as any)
        .from('employees')
        .select('role, portal_credentials')
        .eq('company_id', company.id)
        .eq('user_id', userId)
        .maybeSingle()
      if (emp) {
        employeeRole = emp.portal_credentials?.role || emp.role || null
      }
    } catch {}

    const roleResponsibilities = roles.map((r: any) => r.slug || r.name)
    const rawResponsibilities = Array.isArray(cu.responsibilities) && cu.responsibilities.length > 0
      ? cu.responsibilities
      : (employeeRole ? [employeeRole] : roleResponsibilities)

    // Normalize responsibilities to match RBAC matrix slugs
    const responsibilities = (rawResponsibilities.length > 0 ? rawResponsibilities : (employeeRole ? [employeeRole] : ['general_staff'])).map((r: string) => {
      const lower = (r || '').toLowerCase().trim()
      if (lower === 'sales' || lower === 'sales_executive') return 'sales_manager'
      if (lower === 'operator' || lower === 'technician' || lower === 'machine_operator') return 'operator'
      if (lower === 'designer' || lower === 'graphic_designer') return 'designer'
      if (lower === 'accounts' || lower === 'billing') return 'accountant'
      if (lower === 'delivery' || lower === 'installer') return 'delivery_coordinator'
      if (lower === 'production') return 'production_manager'
      return lower || 'general_staff'
    })

    const isCompanyOwner = (company as any)?.owner_id === userId
    const isOwner =
      isCompanyOwner ||
      (!employeeRole && (
        responsibilities.includes('owner') ||
        responsibilities.includes('business_owner') ||
        roles.some((r) => r.slug === 'owner' || r.slug === 'business_owner' || r.slug === 'platform_owner')
      ))
    const primaryRole = isOwner ? 'business_owner' : responsibilities[0] || 'general_staff'

    // Compute effective permissions across all responsibilities & overrides
    const effectivePermSet = new Set<string>()

    if (isOwner) {
      // Business Owner has full organizational permissions
      for (const [mod, spec] of Object.entries(MODULE_ACTION_SPECS)) {
        for (const act of spec.actions) {
          effectivePermSet.add(`${mod}.${act}`)
        }
      }
    } else {
      const userCtx = {
        userId,
        role: primaryRole as any,
        primaryRole: primaryRole as any,
        responsibilities,
        overrides,
      }

      for (const [mod, spec] of Object.entries(MODULE_ACTION_SPECS)) {
        for (const act of spec.actions) {
          const permCode = `${mod}.${act}`
          if (overrides[permCode] === true) {
            effectivePermSet.add(permCode)
          } else if (overrides[permCode] === false) {
            // Explicit deny override
            continue
          } else if (checkPermission(userCtx, permCode)) {
            effectivePermSet.add(permCode)
          }
        }
      }
    }

    let userProfile: any = null
    try {
      const { data: p } = await (admin as any).from('user_profiles').select('*').eq('id', userId).maybeSingle()
      userProfile = p
    } catch {}
    if (!userProfile) {
      try {
        const { data: p } = await (admin as any).from('profiles').select('*').eq('id', userId).maybeSingle()
        userProfile = p
      } catch {}
    }

    const dataScopes: Record<string, DataScope> =
      cu.data_scopes && typeof cu.data_scopes === 'object' && Object.keys(cu.data_scopes).length > 0
        ? cu.data_scopes
        : {
            customers: 'company',
            orders: 'company',
            invoices: 'company',
            reports: 'company',
            production: 'company',
            inventory: 'company',
          }

    const companyUser: CompanyUserWithProfile = {
      id: cu.id,
      company_id: cu.company_id,
      user_id: cu.user_id,
      branch_id: cu.branch_id,
      status: cu.status,
      department: cu.department || 'Operations',
      responsibilities: responsibilities.length > 0 ? responsibilities : ['general_staff'],
      overrides,
      data_scopes: dataScopes,
      invited_email: cu.invited_email,
      created_at: cu.created_at,
      updated_at: cu.updated_at,
      profile: userProfile || {
        id: cu.user_id,
        email: cu.invited_email || '',
        full_name: 'Team Member',
        full_name_bn: null,
        phone: null,
        avatar_url: null,
        preferred_locale: 'bn',
        is_active: true,
        created_at: cu.created_at,
        updated_at: cu.updated_at,
      },
      roles,
      branch: cu.branch || null,
    }

    const resolved = {
      company,
      companyUser,
      effectivePermissions: Array.from(effectivePermSet),
      primaryRole,
    }

    // Cache resolved membership for 30s
    TenantRepository.membershipCache.set(cacheKey, {
      data: resolved,
      expiresAt: Date.now() + 30000,
    })

    return resolved
  }
}

