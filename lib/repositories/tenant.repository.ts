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
import { checkPermission, DEFAULT_RESPONSIBILITY_MATRICES, normalizeResponsibilitySlug } from '../auth/rbac.client.ts'
import { parseAndNormalizePhone } from '../auth/identifier-helper.ts'
import { PrintFlowDataStore, STORAGE_KEYS } from '../db/data-store.ts'

export const DEFAULT_SYSTEM_ROLES: RoleRow[] = [
  {
    id: 'role-owner',
    company_id: null,
    name: 'Business Owner',
    name_bn: 'ব্যবসা স্বত্বাধিকারী',
    slug: 'business_owner',
    description: 'Universal administrative authority and organization governance.',
    is_system: true,
    is_active: true,
    permissions_count: 0,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'role-sales',
    company_id: null,
    name: 'Sales Manager',
    name_bn: 'সেলস ম্যানেজার',
    slug: 'sales_manager',
    description: 'Quotations, pricing, customer relations, invoicing, and order handling.',
    is_system: true,
    is_active: true,
    permissions_count: 0,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'role-designer',
    company_id: null,
    name: 'Graphic Designer',
    name_bn: 'গ্রাফিক ডিজাইনার',
    slug: 'designer',
    description: 'Artwork proofs, customer approvals, pre-press checks, and design revisions.',
    is_system: true,
    is_active: true,
    permissions_count: 0,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'role-production',
    company_id: null,
    name: 'Production Manager',
    name_bn: 'প্রোডাকশন ম্যানেজার',
    slug: 'production_manager',
    description: 'Plant machine queues, raw media allocation, stages, and quality control.',
    is_system: true,
    is_active: true,
    permissions_count: 0,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'role-operator',
    company_id: null,
    name: 'Machine Operator',
    name_bn: 'মেশিন অপারেটর',
    slug: 'operator',
    description: 'Floor press runs, finishing works, task completions, and machine logs.',
    is_system: true,
    is_active: true,
    permissions_count: 0,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'role-store',
    company_id: null,
    name: 'Store & Inventory Manager',
    name_bn: 'স্টোর ও ইনভেন্টরি ম্যানেজার',
    slug: 'store_manager',
    description: 'Raw media rolls, inks, boards, store ledger, and material dispatches.',
    is_system: true,
    is_active: true,
    permissions_count: 0,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'role-accountant',
    company_id: null,
    name: 'Accountant & Billing Officer',
    name_bn: 'হিসাবরক্ষক ও বিলিং কর্মকর্তা',
    slug: 'accountant',
    description: 'Invoicing, receipts, payment recording, banking, and financial reports.',
    is_system: true,
    is_active: true,
    permissions_count: 0,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'role-delivery',
    company_id: null,
    name: 'Delivery & Challan Coordinator',
    name_bn: 'ডেলিভারি ও চালান সমন্বয়ক',
    slug: 'delivery_coordinator',
    description: 'Delivery challans, site installation sign-offs, and dispatch routing.',
    is_system: true,
    is_active: true,
    permissions_count: 0,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'role-staff',
    company_id: null,
    name: 'General Staff',
    name_bn: 'সাধারণ কর্মী',
    slug: 'general_staff',
    description: 'Standard workspace member with basic operational view access.',
    is_system: true,
    is_active: true,
    permissions_count: 0,
    created_at: '2026-01-01T00:00:00.000Z',
  },
]

export function getDefaultRolePermissions(slug: string): string[] {
  const normSlug = slug === 'owner' ? 'business_owner' : slug
  const matrix = (DEFAULT_RESPONSIBILITY_MATRICES as any)[normSlug]
  if (!matrix) return ['tasks.view']
  const permissions: string[] = []
  for (const [mod, actions] of Object.entries(matrix)) {
    for (const [act, granted] of Object.entries(actions as Record<string, boolean>)) {
      if (granted && act !== 'full_control') {
        permissions.push(`${mod}.${act}`)
      }
    }
  }
  return permissions
}

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
        legal_name: companyData.legal_name?.trim() || null,
        trade_license_no: companyData.trade_license_no || null,
        bin_no: companyData.bin_no || null,
        tin_no: companyData.tin_no || null,
        phone: companyData.phone || null,
        email: companyData.email || null,
        whatsapp: companyData.whatsapp || null,
        division_id: companyData.division_id || null,
        district_id: companyData.district_id || null,
        upazila_id: companyData.upazila_id || null,
        area: (companyData as any).area?.trim() || null,
        address: companyData.address || null,
        address_bn: companyData.address_bn || null,
        office_hours: (companyData as any).office_hours || '9:00 AM - 8:00 PM (Sat - Thu)',
        holidays: (companyData as any).holidays || 'Friday',
        logo_url: companyData.logo_url || null,
        currency: companyData.currency || 'BDT',
        default_locale: companyData.default_locale || 'bn',
        owner_id: ownerUserId || null,
        created_by: ownerUserId || null,
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
              responsibilities: ['business_owner'],
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

    // Invalidate and immediately prime cache with new company
    TenantRepository.invalidateCompanyCache(newCompany.slug)
    TenantRepository.invalidateCompanyCache(newCompany.id)
    TenantRepository.companySlugCache.set(newCompany.slug.toLowerCase().trim(), {
      data: newCompany as unknown as CompanyRow,
      expiresAt: Date.now() + 60000,
    })
    TenantRepository.companyIdCache.set(newCompany.id, {
      data: newCompany as unknown as CompanyRow,
      expiresAt: Date.now() + 60000,
    })
    if (ownerUserId) {
      TenantRepository.invalidateMembershipCache(ownerUserId)
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
      // DO NOT CACHE NULL: Avoid negative caching so freshly registered tenants are instantly resolvable
      if (company) {
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
      } else {
        TenantRepository.companySlugCache.delete(cleanSlug)
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
      // DO NOT CACHE NULL
      if (company) {
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
      } else {
        TenantRepository.companyIdCache.delete(id)
      }
      return company
    } catch {
      return null
    }
  }

  static async searchCompaniesByName(nameQuery: string, limit = 5): Promise<CompanyRow[]> {
    if (!nameQuery || !nameQuery.trim()) return []
    try {
      const admin = createAdminClient()
      const { data, error } = await (admin as any)
        .from('companies')
        .select('*')
        .ilike('name', `%${nameQuery.trim()}%`)
        .eq('is_active', true)
        .limit(limit)

      if (error || !data) return []
      return data as CompanyRow[]
    } catch {
      return []
    }
  }

  static async lookupWorkspacesByEmail(email: string): Promise<Array<{ slug: string; name: string }>> {
    if (!email || !email.includes('@')) return []
    const cleanEmail = email.trim().toLowerCase()
    try {
      const admin = createAdminClient()
      const workspaceMap = new Map<string, string>()

      // 1. Direct company contact email match
      const { data: directCompanies } = await (admin as any)
        .from('companies')
        .select('slug, name, is_active')
        .ilike('email', cleanEmail)
        .eq('is_active', true)

      if (directCompanies) {
        for (const comp of directCompanies) {
          if (comp.slug && comp.name) {
            workspaceMap.set(comp.slug, comp.name)
          }
        }
      }

      // 2. Invited email match in company_users
      const { data: invitedUsers } = await (admin as any)
        .from('company_users')
        .select('company_id, companies!inner(slug, name, is_active)')
        .ilike('invited_email', cleanEmail)
        .eq('companies.is_active', true)

      if (invitedUsers) {
        for (const item of invitedUsers) {
          const comp = Array.isArray(item.companies) ? item.companies[0] : item.companies
          if (comp?.slug && comp?.name) {
            workspaceMap.set(comp.slug, comp.name)
          }
        }
      }

      // 3. User ID lookup by email via listUsers
      try {
        const { data: authUserData } = await admin.auth.admin.listUsers()
        const matchingUser = authUserData?.users?.find(
          (u) => u.email?.toLowerCase() === cleanEmail
        )
        if (matchingUser) {
          const { data: memberCompanies } = await (admin as any)
            .from('company_users')
            .select('company_id, companies!inner(slug, name, is_active)')
            .eq('user_id', matchingUser.id)
            .eq('companies.is_active', true)

          if (memberCompanies) {
            for (const item of memberCompanies) {
              const comp = Array.isArray(item.companies) ? item.companies[0] : item.companies
              if (comp?.slug && comp?.name) {
                workspaceMap.set(comp.slug, comp.name)
              }
            }
          }
        }
      } catch {
        // Non-blocking fallback
      }

      return Array.from(workspaceMap.entries()).map(([slug, name]) => ({
        slug,
        name,
      }))
    } catch {
      return []
    }
  }

  static async getUserMembership(companyId: string, userId: string): Promise<{ id: string } | null> {
    try {
      const admin = createAdminClient()
      const { data } = await admin
        .from('company_users')
        .select('id')
        .eq('company_id', companyId)
        .eq('user_id', userId)
        .maybeSingle()
      return data || null
    } catch {
      return null
    }
  }

  static async resetTenantTables(companyId: string): Promise<void> {
    const admin = createAdminClient()
    const tablesToClear = [
      'sales_order_items',
      'order_items',
      'sales_orders',
      'orders',
      'job_orders',
      'order_timeline_events',
      'quotation_items',
      'quotations',
      'quotation_activities',
      'invoice_items',
      'invoices',
      'invoice_requests',
      'payments',
      'payment_adjustments',
      'expenses',
      'cash_book_entries',
      'delivery_challan_items',
      'delivery_challans',
      'production_tasks',
      'production_jobs',
      'inventory_transactions',
      'material_stock_ledger',
      'notifications',
      'audit_logs',
      'activity_logs',
      'customer_contacts',
      'customers',
      'customer_segments',
      'suppliers',
      'design_files',
      'design_proofs',
      'design_jobs',
    ]

    for (const table of tablesToClear) {
      try {
        await (admin as any).from(table).delete().eq('company_id', companyId)
      } catch (tableErr) {
        console.warn(`[TenantRepository.resetTenantTables] Reset failed for ${table}:`, tableErr)
      }
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
    try {
      if (!companyId) return []
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('company_id', companyId)
        .order('is_main', { ascending: false })

      if (error) {
        console.warn(`[TenantRepository] getBranches query warning: ${error.message}`)
        return []
      }
      return (data || []) as BranchRow[]
    } catch (err: any) {
      console.warn(`[TenantRepository] getBranches error: ${err?.message}`)
      return []
    }
  }

  static async getRoles(companyId?: string): Promise<RoleRow[]> {
    try {
      const admin = createAdminClient()
      let query = admin.from('roles').select('*')
      if (companyId) {
        query = query.or(`company_id.eq.${companyId},company_id.is.null`)
      }
      const { data, error } = await query
      if (error) {
        console.warn(`[TenantRepository] getRoles query warning: ${error.message}, falling back to default system roles`)
        return DEFAULT_SYSTEM_ROLES
      }
      if (!data || data.length === 0) {
        return DEFAULT_SYSTEM_ROLES
      }
      return data as RoleRow[]
    } catch (err: any) {
      console.warn(`[TenantRepository] getRoles failed: ${err?.message}, falling back to default system roles`)
      return DEFAULT_SYSTEM_ROLES
    }
  }

  static async getCompanyUsers(companyId: string): Promise<CompanyUserWithProfile[]> {
    try {
      if (!companyId) return []
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
        console.warn(`[TenantRepository] getCompanyUsers error: ${error.message}`)
        return []
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

    // Fetch linked workforce employee profiles for each user (strictly without salary/financials)
    const employeeMap = new Map<string, any>()
    if (userIds.length > 0) {
      try {
        const { data: emps } = await (admin as any)
          .from('employees')
          .select('id, employee_id_number, name, name_bn, role, department, mobile, email, status, user_id, profile_picture_url, avatar_url')
          .eq('company_id', companyId)
          .in('user_id', userIds)
        ;(emps || []).forEach((e: any) => employeeMap.set(e.user_id, e))
      } catch {}
    }

    // Fetch auth last_sign_in_at for active users
    const lastLoginMap = new Map<string, string>()
    try {
      const { data: authData } = await admin.auth.admin.listUsers({ perPage: 1000 })
      ;(authData?.users || []).forEach((u) => {
        if (u.id && u.last_sign_in_at) {
          lastLoginMap.set(u.id, u.last_sign_in_at)
        }
      })
    } catch {}

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
      const linkedEmployee = employeeMap.get(cu.user_id) || null
      const lastLoginAt = lastLoginMap.get(cu.user_id) || (prof as any)?.last_login_at || null

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

        const isExpired =
          cu.status === 'invited' &&
          cu.invitation_expires_at &&
          new Date(cu.invitation_expires_at).getTime() < Date.now()

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
          invitation_expires_at: cu.invitation_expires_at || null,
          is_expired: Boolean(isExpired),
          linked_employee: linkedEmployee,
          last_login_at: lastLoginAt,
        profile: prof
          ? {
              ...prof,
              avatar_url: prof.avatar_url || linkedEmployee?.profile_picture_url || linkedEmployee?.avatar_url || null,
            }
          : {
              id: cu.user_id,
              email: cu.invited_email || '',
              full_name: 'Team Member',
              full_name_bn: null,
              phone: null,
              avatar_url: linkedEmployee?.profile_picture_url || linkedEmployee?.avatar_url || null,
              preferred_locale: 'bn',
              is_active: cu.status === 'active',
              created_at: cu.created_at,
              updated_at: cu.updated_at,
            },
        roles,
        branch: cu.branch || null,
      } as CompanyUserWithProfile
    })
    } catch (err: any) {
      console.warn(`[TenantRepository] getCompanyUsers failed: ${err?.message}`)
      return []
    }
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
    roleId?: string
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

    // 1. Sync User Roles if roleId or responsibilities provided
    const allRoles = await TenantRepository.getRoles(companyId)
    const roleIdSet = new Set<string>()

    if (params.roleId) {
      roleIdSet.add(params.roleId)
    }

    if (params.responsibilities && Array.isArray(params.responsibilities)) {
      for (const resp of params.responsibilities) {
        const matchedRole = allRoles.find(
          (r) => r.slug === resp || r.name.toLowerCase() === resp.toLowerCase()
        )
        if (matchedRole) {
          roleIdSet.add(matchedRole.id)
        }
      }
    }

    // Only update user_roles if roles were explicitly identified
    if (roleIdSet.size > 0) {
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

    // 4. Bidirectional Sync: Keep linked employee record in workforce roster in sync
    if (userId && companyId) {
      try {
        const empUpdates: any = { updated_at: new Date().toISOString() }
        if (params.responsibilities !== undefined) empUpdates.responsibilities = params.responsibilities
        if (params.department !== undefined) empUpdates.department = params.department
        if (params.branchId !== undefined) empUpdates.branch_id = params.branchId

        await (admin as any)
          .from('employees')
          .update(empUpdates)
          .eq('company_id', companyId)
          .eq('user_id', userId)

        // Also update local data store for memory/offline fallback
        try {
          const localEmployees = PrintFlowDataStore.get<any[]>(STORAGE_KEYS.EMPLOYEES, companyId) || []
          let empChanged = false
          const updatedLocal = localEmployees.map((emp) => {
            if (emp.user_id === userId) {
              empChanged = true
              return { ...emp, ...empUpdates }
            }
            return emp
          })
          if (empChanged) {
            PrintFlowDataStore.set(STORAGE_KEYS.EMPLOYEES, updatedLocal, true, companyId)
          }
        } catch {}
      } catch (empSyncErr: any) {
        console.warn('[TenantRepository] employee roster sync warning:', empSyncErr?.message)
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
    try {
      const admin = createAdminClient()
      const roles = await TenantRepository.getRoles(companyId)
      const roleList = Array.isArray(roles) && roles.length > 0 ? roles : DEFAULT_SYSTEM_ROLES
      const roleIds = roleList.map((r) => r.id)

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
        } catch (permErr: any) {
          console.warn('[TenantRepository] role_permissions fetch warning:', permErr?.message)
        }
      }

      return roleList.map((r) => {
        const dbPerms = permMap.get(r.id) || []
        const perms = dbPerms.length > 0 ? dbPerms : getDefaultRolePermissions(r.slug)
        return {
          ...r,
          permissions: perms,
        }
      })
    } catch (err: any) {
      console.error('[TenantRepository] getRolesWithPermissions error:', err?.message)
      return DEFAULT_SYSTEM_ROLES.map((r) => ({
        ...r,
        permissions: getDefaultRolePermissions(r.slug),
      }))
    }
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

    const { data: targetRole } = await (admin as any).from('roles').select('slug, name').eq('id', roleId).maybeSingle()
    if (targetRole && (targetRole.slug === 'business_owner' || targetRole.slug === 'owner' || targetRole.name?.toLowerCase().includes('owner'))) {
      throw new Error('Business Owner role permissions are immutable and cannot be modified.')
    }

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
    employeeRecord?: any
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
      .in('status', ['active', 'invited'])

    if (targetCompanyId) {
      query = query.eq('company_id', targetCompanyId)
    }

    let { data: records, error } = await query

    // If not found by user_id, search by email/phone across company_users and employees to auto-recover invited employees
    if (!records || records.length === 0) {
      try {
        let lookupEmail: string | null = null
        let lookupPhone: string | null = null

        const { data: prof } = await (admin as any)
          .from('user_profiles')
          .select('email, phone')
          .eq('id', userId)
          .maybeSingle()
        if (prof) {
          lookupEmail = prof.email || null
          lookupPhone = prof.phone || null
        }

        if (!lookupEmail) {
          try {
            const { data: authUser } = await admin.auth.admin.getUserById(userId)
            if (authUser?.user) {
              lookupEmail = authUser.user.email || null
              lookupPhone = authUser.user.phone || null
            }
          } catch {}
        }

        const normalizedEmail = lookupEmail?.trim().toLowerCase()

        if (normalizedEmail || lookupPhone) {
          // 1. Try to find matching company_user by invited_email
          let cuMatchQuery = admin
            .from('company_users')
            .select(`
              *,
              company:companies!inner(*),
              branch:branches(*),
              user_roles(role:roles(*))
            `)
            .in('status', ['active', 'invited'])

          if (targetCompanyId) {
            cuMatchQuery = cuMatchQuery.eq('company_id', targetCompanyId)
          }

          if (normalizedEmail) {
            cuMatchQuery = cuMatchQuery.ilike('invited_email', normalizedEmail)
          }

          const { data: matchedCUs } = await cuMatchQuery

          if (matchedCUs && matchedCUs.length > 0) {
            records = matchedCUs
            await (admin as any)
              .from('company_users')
              .update({ user_id: userId, status: 'active', updated_at: new Date().toISOString() })
              .eq('id', matchedCUs[0].id)
          }
        }

        // 2. If still not found, check employees table by email or phone
        if ((!records || records.length === 0) && (normalizedEmail || lookupPhone)) {
          let empQuery = (admin as any).from('employees').select('*')
          if (targetCompanyId) {
            empQuery = empQuery.eq('company_id', targetCompanyId)
          }
          if (normalizedEmail) {
            empQuery = empQuery.ilike('email', normalizedEmail)
          }
          const { data: matchedEmps } = await empQuery.limit(1)
          const matchedEmp = matchedEmps?.[0]

          if (matchedEmp) {
            await (admin as any)
              .from('employees')
              .update({ user_id: userId, updated_at: new Date().toISOString() })
              .eq('id', matchedEmp.id)

            const company = await TenantRepository.getCompanyById(matchedEmp.company_id)
            if (company) {
              const assignedRoleSlug = (
                matchedEmp.portal_credentials?.role ||
                matchedEmp.role ||
                'operator'
              ).toLowerCase().trim()

              const empResps = Array.isArray(matchedEmp.portal_credentials?.responsibilities) && matchedEmp.portal_credentials.responsibilities.length > 0
                ? matchedEmp.portal_credentials.responsibilities
                : [assignedRoleSlug]

              const { data: newCU } = await (admin as any)
                .from('company_users')
                .insert({
                  company_id: matchedEmp.company_id,
                  user_id: userId,
                  branch_id: matchedEmp.branch_id || null,
                  invited_email: normalizedEmail || matchedEmp.email,
                  status: 'active',
                  responsibilities: empResps,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .select(`
                  *,
                  company:companies!inner(*),
                  branch:branches(*),
                  user_roles(role:roles(*))
                `)
                .single()

              if (newCU) {
                records = [newCU]
              }
            }
          }
        }
      } catch (recoveryErr) {
        console.warn('[TenantRepository] Membership fallback recovery error:', recoveryErr)
      }
    }

    if (error || !records || records.length === 0) {
      TenantRepository.membershipCache.set(cacheKey, { data: null, expiresAt: Date.now() + 5000 })
      return null
    }

    const cu: any = records[0]
    // If user was previously invited, activate membership automatically upon authenticated resolution
    if (cu.status === 'invited') {
      try {
        await (admin as any)
          .from('company_users')
          .update({ status: 'active', user_id: userId, updated_at: new Date().toISOString() })
          .eq('id', cu.id)
        cu.status = 'active'
      } catch {}
    }

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
    let employeeRecord: any = null
    try {
      let { data: emp } = await (admin as any)
        .from('employees')
        .select('*')
        .eq('company_id', company.id)
        .eq('user_id', userId)
        .maybeSingle()

      if (!emp) {
        // Fallback: match by user's phone or email within this company
        const userPhone = cu.profile?.phone
        const userEmail = cu.profile?.email || cu.invited_email

        let matchedEmp: any = null

        if (userEmail && userEmail.trim()) {
          const { data: byEmail } = await (admin as any)
            .from('employees')
            .select('*')
            .eq('company_id', company.id)
            .ilike('email', userEmail.trim())
            .limit(1)
            .maybeSingle()
          if (byEmail) matchedEmp = byEmail
        }

        if (!matchedEmp && userPhone) {
          const phoneVariants = parseAndNormalizePhone(userPhone)
          const phoneCandidates = phoneVariants ? phoneVariants.candidates : [userPhone]
          const { data: byPhone } = await (admin as any)
            .from('employees')
            .select('*')
            .eq('company_id', company.id)
            .in('mobile', phoneCandidates)
            .limit(1)
            .maybeSingle()
          if (byPhone) matchedEmp = byPhone
        }

        if (matchedEmp) {
          emp = matchedEmp
          // Auto-link employee record to this authenticated user only if not yet linked
          if (!matchedEmp.user_id) {
            try {
              await (admin as any)
                .from('employees')
                .update({
                  user_id: userId,
                  email: matchedEmp.email || userEmail || null,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', matchedEmp.id)
            } catch (linkErr) {
              console.warn('[TenantRepository] Auto-link employee user_id failed:', linkErr)
            }
          }
        }
      }

      if (emp) {
        employeeRecord = emp
        employeeRole = emp.portal_credentials?.role || emp.role || null
      }
    } catch {}

    const roleResponsibilities = roles.map((r: any) => r.slug || r.name)
    const rawResponsibilities = Array.isArray(cu.responsibilities) && cu.responsibilities.length > 0
      ? cu.responsibilities
      : (employeeRole ? [employeeRole] : roleResponsibilities)

    // Normalize responsibilities to match RBAC matrix slugs
    const responsibilities = (rawResponsibilities.length > 0 ? rawResponsibilities : (employeeRole ? [employeeRole] : ['general_staff'])).map((r: string) => {
      return normalizeResponsibilitySlug(r)
    })

    const roleSlug = roles[0]?.slug || employeeRole
    if (roleSlug && !responsibilities.includes(normalizeResponsibilitySlug(roleSlug))) {
      responsibilities.push(normalizeResponsibilitySlug(roleSlug))
    }

    let isTenantMembershipOwner = false
    try {
      const { data: tm } = await (admin as any)
        .from('tenant_memberships')
        .select('role')
        .eq('company_id', company.id)
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle()
      if (tm?.role === 'owner' || tm?.role === 'business_owner') {
        isTenantMembershipOwner = true
      }
    } catch {}

    const isCompanyOwner = Boolean(
      userId &&
      company &&
      (company as any).owner_id &&
      (company as any).owner_id === userId
    )

    const isStaffMember = Boolean(
      employeeRole ||
      employeeRecord ||
      responsibilities.some((r: string) => [
        'operator',
        'machine_operator',
        'technician',
        'designer',
        'graphic_designer',
        'sales',
        'sales_manager',
        'sales_executive',
        'production',
        'production_manager',
        'accountant',
        'accounts',
        'billing',
        'delivery',
        'delivery_coordinator',
        'installer',
        'store_manager',
        'general_staff',
        'staff',
        'branch_manager',
        'hr_manager',
        'hr',
        'printing',
        'finishing',
        'fabrication',
        'material_request',
        'installation',
        'customers',
        'quotations',
      ].includes(r))
    )

    const isOwner =
      isCompanyOwner ||
      (!isStaffMember && (
        isTenantMembershipOwner ||
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
      is_active: cu.is_active ?? true,
      raw_overrides: cu.raw_overrides ?? null,
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
      employeeRecord,
    }

    // Cache resolved membership for 30s
    TenantRepository.membershipCache.set(cacheKey, {
      data: resolved,
      expiresAt: Date.now() + 30000,
    })

    return resolved
  }
}

