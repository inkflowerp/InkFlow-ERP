import { createClient } from '../supabase/server.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../db/data-store.ts'
import type {
  BranchMasterRecord,
  UserBranchAccessRecord,
  BranchStatus,
} from '../../types/branch.types.ts'

export class BranchRepository {
  /**
   * List all branches for a company with optional status filtering
   */
  static async listBranches(
    companyId: string,
    options?: { status?: BranchStatus; includeInactive?: boolean }
  ): Promise<BranchMasterRecord[]> {
    const storeBranches = (PrintERPDataStore.get<BranchMasterRecord[]>(
      STORAGE_KEYS.BRANCHES,
      companyId
    ) || []) as BranchMasterRecord[]

    if (storeBranches.length > 0) {
      return storeBranches
        .filter((b) => {
          if (options?.status) return b.status === options.status
          if (!options?.includeInactive)
            return b.is_active !== false && b.status !== 'archived'
          return true
        })
        .sort((a, b) => (b.is_main ? 1 : 0) - (a.is_main ? 1 : 0))
    }

    try {
      const supabase = await createClient()
      let query = supabase
        .from('branches')
        .select('*')
        .eq('company_id', companyId)
        .order('is_main', { ascending: false })
        .order('name', { ascending: true })

      if (options?.status) {
        query = query.eq('status', options.status)
      } else if (!options?.includeInactive) {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query
      if (!error && data && data.length > 0) {
        return data as BranchMasterRecord[]
      }
    } catch {}

    return []
  }

  /**
   * Get single branch by ID
   */
  static async getBranchById(
    companyId: string,
    branchId: string
  ): Promise<BranchMasterRecord | null> {
    const branches = (PrintERPDataStore.get<BranchMasterRecord[]>(
      STORAGE_KEYS.BRANCHES,
      companyId
    ) || []) as BranchMasterRecord[]

    const found = branches.find((b) => b.id === branchId)
    if (found) return found

    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('company_id', companyId)
        .eq('id', branchId)
        .maybeSingle()

      if (!error && data) return data as BranchMasterRecord
    } catch {}

    return null
  }

  /**
   * Get single branch by branch code
   */
  static async getBranchByCode(
    companyId: string,
    code: string
  ): Promise<BranchMasterRecord | null> {
    const cleanCode = code.toUpperCase().trim()
    const branches = (PrintERPDataStore.get<BranchMasterRecord[]>(
      STORAGE_KEYS.BRANCHES,
      companyId
    ) || []) as BranchMasterRecord[]

    const found = branches.find((b) => b.code.toUpperCase() === cleanCode)
    if (found) return found

    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('company_id', companyId)
        .eq('code', cleanCode)
        .maybeSingle()

      if (!error && data) return data as BranchMasterRecord
    } catch {}

    return null
  }

  /**
   * Create a new branch
   */
  static async createBranch(
    companyId: string,
    payload: Partial<BranchMasterRecord>
  ): Promise<BranchMasterRecord> {
    const branchId = payload.id || crypto.randomUUID()
    const now = new Date().toISOString()
    const branch: BranchMasterRecord = {
      id: branchId,
      company_id: companyId,
      name: payload.name || 'New Branch',
      name_bn: payload.name_bn || null,
      code: (payload.code || 'BR').toUpperCase().trim(),
      legal_name: payload.legal_name || null,
      phone: payload.phone || null,
      email: payload.email || null,
      address: payload.address || null,
      division_id: payload.division_id || null,
      district_id: payload.district_id || null,
      upazila_id: payload.upazila_id || null,
      area: payload.area || null,
      full_address: payload.full_address || null,
      full_address_bn: payload.full_address_bn || null,
      is_main: Boolean(payload.is_main),
      is_active: payload.is_active !== false,
      status: (payload.status as BranchStatus) || 'active',
      manager_id: payload.manager_id || null,
      manager_name: payload.manager_name || null,
      operating_hours: payload.operating_hours || '9:00 AM - 8:00 PM (Sat-Thu)',
      timezone: payload.timezone || 'Asia/Dhaka',
      document_numbering_config: payload.document_numbering_config || {
        invoice_prefix: `${payload.code || 'BR'}-INV`,
        quotation_prefix: `${payload.code || 'BR'}-QT`,
        challan_prefix: `${payload.code || 'BR'}-CH`,
      },
      financial_settings: payload.financial_settings || {
        allow_negative_cash: false,
        daily_cash_limit: 100000,
      },
      production_capabilities: payload.production_capabilities || [],
      contact_person: payload.contact_person || null,
      contact_phone: payload.contact_phone || null,
      contact_email: payload.contact_email || null,
      created_at: now,
      updated_at: now,
    }

    const branches = (PrintERPDataStore.get<BranchMasterRecord[]>(
      STORAGE_KEYS.BRANCHES,
      companyId
    ) || []) as BranchMasterRecord[]

    if (branch.is_main) {
      branches.forEach((b) => {
        b.is_main = false
      })
    }

    branches.push(branch)
    PrintERPDataStore.set(STORAGE_KEYS.BRANCHES, companyId, branches)

    try {
      const supabase = await createClient()
      await supabase.from('branches').insert([branch as any])
    } catch {}

    return branch
  }

  /**
   * Update an existing branch
   */
  static async updateBranch(
    companyId: string,
    branchId: string,
    updates: Partial<BranchMasterRecord>
  ): Promise<BranchMasterRecord> {
    const now = new Date().toISOString()
    const updateData = { ...updates, updated_at: now }

    const branches = (PrintERPDataStore.get<BranchMasterRecord[]>(
      STORAGE_KEYS.BRANCHES,
      companyId
    ) || []) as BranchMasterRecord[]

    const index = branches.findIndex((b) => b.id === branchId)
    if (index === -1) {
      throw new Error(`Branch with ID ${branchId} not found`)
    }

    if (updates.is_main) {
      branches.forEach((b) => {
        b.is_main = false
      })
    }

    const updated = { ...branches[index], ...updateData }
    branches[index] = updated
    PrintERPDataStore.set(STORAGE_KEYS.BRANCHES, companyId, branches)

    try {
      const supabase = await createClient()
      await supabase
        .from('branches')
        .update(updateData as any)
        .eq('company_id', companyId)
        .eq('id', branchId)
    } catch {}

    return updated
  }

  /**
   * Set branch status (active, inactive, suspended, archived)
   */
  static async setBranchStatus(
    companyId: string,
    branchId: string,
    status: BranchStatus
  ): Promise<BranchMasterRecord> {
    const is_active = status === 'active'
    return this.updateBranch(companyId, branchId, { status, is_active })
  }

  /**
   * Get user's authorized branch IDs (for selected_branches scope)
   */
  static async getUserAuthorizedBranchIds(
    companyId: string,
    userId: string
  ): Promise<string[]> {
    const accessList = (PrintERPDataStore.get<UserBranchAccessRecord[]>(
      STORAGE_KEYS.USER_BRANCH_ACCESS,
      companyId
    ) || []) as UserBranchAccessRecord[]

    const storeIds = accessList
      .filter((a) => a.user_id === userId)
      .map((a) => a.branch_id)
    if (storeIds.length > 0) return storeIds

    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('user_branch_access')
        .select('branch_id')
        .eq('company_id', companyId)
        .eq('user_id', userId)

      if (!error && data && data.length > 0) {
        return data.map((d: any) => d.branch_id)
      }
    } catch {}

    return []
  }

  /**
   * Set user authorized branches
   */
  static async setUserAuthorizedBranches(
    companyId: string,
    userId: string,
    branchIds: string[]
  ): Promise<void> {
    const now = new Date().toISOString()
    const records: UserBranchAccessRecord[] = branchIds.map((bId) => ({
      id: crypto.randomUUID(),
      company_id: companyId,
      user_id: userId,
      branch_id: bId,
      created_at: now,
    }))

    let accessList = (PrintERPDataStore.get<UserBranchAccessRecord[]>(
      STORAGE_KEYS.USER_BRANCH_ACCESS,
      companyId
    ) || []) as UserBranchAccessRecord[]

    accessList = accessList.filter((a) => a.user_id !== userId).concat(records)
    PrintERPDataStore.set(STORAGE_KEYS.USER_BRANCH_ACCESS, companyId, accessList)

    try {
      const supabase = await createClient()
      await supabase
        .from('user_branch_access')
        .delete()
        .eq('company_id', companyId)
        .eq('user_id', userId)

      if (records.length > 0) {
        await supabase.from('user_branch_access').insert(records as any)
      }
    } catch {}
  }
}
