import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  CompanyRow,
  CompanySettingsRow,
  CompanyUserWithProfile,
  BranchRow,
  RoleRow,
} from '@/types/tenant.types'
import { MODULE_ACTION_SPECS, DataScope } from '@/types/rbac.types'
import { checkPermission } from '@/lib/auth/rbac.client'

export class TenantRepository {
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    // Create default Main Branch
    const { data: mainBranch } = await (admin as any)
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

    // Initialize Company Subscription (14-Day Evaluation Trial)
    try {
      const rawPlan = companyData.plan?.toLowerCase()
      const targetPlanCode = rawPlan === 'growth' ? 'business' : (rawPlan || 'trial')
      
      let { data: planRecord } = await (admin as any)
        .from('subscription_plans')
        .select('id, code')
        .eq('code', targetPlanCode)
        .maybeSingle()

      if (!planRecord && targetPlanCode === 'trial') {
        const { data: starterPlan } = await (admin as any)
          .from('subscription_plans')
          .select('id, code')
          .eq('code', 'starter')
          .maybeSingle()
        planRecord = starterPlan
      }

      const assignedPlanId = planRecord?.id
      if (assignedPlanId) {
        const isTrialPlan = targetPlanCode === 'trial'
        await (admin as any).from('company_subscriptions').insert({
          company_id: newCompany.id,
          plan_id: assignedPlanId,
          status: isTrialPlan ? 'trial' : 'active',
          billing_interval: 'monthly',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
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
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('companies')
      .select('*')
      .ilike('slug', slug.toLowerCase().trim())
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to fetch company by slug ${slug}: ${error.message}`)
    }
    return (data as CompanyRow) || null
  }

  static async getCompanyById(id: string): Promise<CompanyRow | null> {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('companies')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to fetch company by ID ${id}: ${error.message}`)
    }
    return (data as CompanyRow) || null
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

    return cuList.map((cu: any) => {
      const roles = (cu.user_roles || []).map((ur: any) => ur.role).filter(Boolean)
      const overrides = overrideMap.get(cu.id) || {}
      const responsibilities = roles.map((r: any) => r.slug || r.name)
      const prof = profileMap.get(cu.user_id)

      return {
        id: cu.id,
        company_id: cu.company_id,
        user_id: cu.user_id,
        branch_id: cu.branch_id,
        status: cu.status,
        department: cu.department || 'General',
        responsibilities,
        overrides,
        data_scopes: {
          customers: 'company',
          orders: 'company',
          invoices: 'company',
          reports: 'company',
          production: 'company',
          inventory: 'company',
        },
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

  static async updateUserResponsibilitiesAndOverrides(params: {
    companyUserId: string
    department?: string | null
    branchId?: string | null
    responsibilities?: string[]
    overrides?: Record<string, boolean>
  }): Promise<void> {
    const admin = createAdminClient()
    const updates: any = { updated_at: new Date().toISOString() }
    if (params.department !== undefined) updates.department = params.department
    if (params.branchId !== undefined) updates.branch_id = params.branchId

    const { error: userError } = await admin
      .from('company_users')
      .update(updates)
      .eq('id', params.companyUserId)

    if (userError) {
      throw new Error(`Failed to update company user record: ${userError.message}`)
    }

    if (params.overrides) {
      // Upsert user_permission_overrides
      for (const [permCode, isGranted] of Object.entries(params.overrides)) {
        // Resolve permission ID by code
        const { data: perm } = await admin
          .from('permissions')
          .select('id')
          .eq('code', permCode)
          .maybeSingle()

        if (perm?.id) {
          await (admin as any)
            .from('user_permission_overrides')
            .upsert(
              {
                company_user_id: params.companyUserId,
                permission_id: perm.id,
                is_granted: isGranted,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'company_user_id,permission_id' }
            )
        }
      }
    }
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
    const admin = createAdminClient()

    let targetCompanyId: string | null = null

    if (requestedSlugOrId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedSlugOrId)
      if (isUuid) {
        targetCompanyId = requestedSlugOrId
      } else {
        const targetCompany = await TenantRepository.getCompanyBySlug(requestedSlugOrId)
        if (!targetCompany) {
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
      return null
    }

    const cu: any = records[0]
    const company = cu.company as CompanyRow
    if (!company.is_active) {
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

    const responsibilities = roles.map((r: any) => r.slug || r.name)
    const isOwner =
      responsibilities.includes('owner') ||
      responsibilities.includes('business_owner') ||
      cu.department === 'Management' ||
      roles.length === 0
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

    const companyUser: CompanyUserWithProfile = {
      id: cu.id,
      company_id: cu.company_id,
      user_id: cu.user_id,
      branch_id: cu.branch_id,
      status: cu.status,
      department: cu.department || 'Operations',
      responsibilities: responsibilities.length > 0 ? responsibilities : ['business_owner'],
      overrides,
      data_scopes: {
        customers: 'company',
        orders: 'company',
        invoices: 'company',
        reports: 'company',
        production: 'company',
        inventory: 'company',
      },
      invited_email: cu.invited_email,
      created_at: cu.created_at,
      updated_at: cu.updated_at,
      profile: userProfile || {
        id: cu.user_id,
        email: cu.invited_email || '',
        full_name: 'Business Owner',
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

    return {
      company,
      companyUser,
      effectivePermissions: Array.from(effectivePermSet),
      primaryRole,
    }
  }
}

