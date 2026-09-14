import { BranchRepository } from '../lib/repositories/branch.repository.ts'
import type {
  BranchMasterRecord,
  BranchStatus,
} from '../types/branch.types.ts'

export class BranchManagementService {
  /**
   * Create a new branch with validation
   */
  static async createBranch(
    companyId: string,
    payload: {
      name: string
      name_bn?: string | null
      code: string
      legal_name?: string | null
      phone?: string | null
      email?: string | null
      address?: string | null
      division_id?: number | null
      district_id?: number | null
      upazila_id?: number | null
      area?: string | null
      full_address?: string | null
      full_address_bn?: string | null
      is_main?: boolean
      manager_id?: string | null
      manager_name?: string | null
      operating_hours?: string | null
      timezone?: string
      document_numbering_config?: any
      financial_settings?: any
      production_capabilities?: any
      contact_person?: string | null
      contact_phone?: string | null
      contact_email?: string | null
    }
  ): Promise<BranchMasterRecord> {
    const cleanCode = payload.code.toUpperCase().trim()
    if (!cleanCode) {
      throw new Error('Branch code is required')
    }

    // Check code uniqueness within company
    const existing = await BranchRepository.getBranchByCode(companyId, cleanCode)
    if (existing) {
      throw new Error(`Branch with code "${cleanCode}" already exists for this organization`)
    }

    return BranchRepository.createBranch(companyId, {
      ...payload,
      code: cleanCode,
      status: 'active',
      is_active: true,
    })
  }

  /**
   * Update an existing branch
   */
  static async updateBranch(
    companyId: string,
    branchId: string,
    updates: Partial<BranchMasterRecord>
  ): Promise<BranchMasterRecord> {
    const current = await BranchRepository.getBranchById(companyId, branchId)
    if (!current) {
      throw new Error(`Branch with ID "${branchId}" not found`)
    }

    if (updates.code) {
      const cleanCode = updates.code.toUpperCase().trim()
      if (cleanCode !== current.code) {
        const existing = await BranchRepository.getBranchByCode(companyId, cleanCode)
        if (existing && existing.id !== branchId) {
          throw new Error(`Branch code "${cleanCode}" is already in use by another branch`)
        }
        updates.code = cleanCode
      }
    }

    return BranchRepository.updateBranch(companyId, branchId, updates)
  }

  /**
   * Set branch status (active, inactive, suspended, archived)
   */
  static async setBranchStatus(
    companyId: string,
    branchId: string,
    status: BranchStatus
  ): Promise<BranchMasterRecord> {
    const branch = await BranchRepository.getBranchById(companyId, branchId)
    if (!branch) {
      throw new Error(`Branch with ID "${branchId}" not found`)
    }

    if (branch.is_main && (status === 'archived' || status === 'inactive')) {
      throw new Error('Cannot archive or deactivate the main headquarters branch')
    }

    return BranchRepository.setBranchStatus(companyId, branchId, status)
  }

  /**
   * Get authorized branches for a user based on data scope
   */
  static async getAuthorizedBranchesForUser(
    companyId: string,
    userId: string,
    userBranchId?: string | null,
    userScope: string = 'company',
    isOwner: boolean = false
  ): Promise<BranchMasterRecord[]> {
    const allBranches = await BranchRepository.listBranches(companyId, {
      includeInactive: false,
    })

    if (isOwner || userScope === 'company' || userScope === 'all_branches') {
      return allBranches
    }

    if (userScope === 'selected_branches') {
      const authorizedIds = await BranchRepository.getUserAuthorizedBranchIds(companyId, userId)
      const allowedSet = new Set(authorizedIds)
      if (userBranchId) allowedSet.add(userBranchId)
      return allBranches.filter((b) => allowedSet.has(b.id))
    }

    // Single branch restricted scope ('branch', 'department', 'assigned', 'own')
    if (userBranchId) {
      return allBranches.filter((b) => b.id === userBranchId)
    }

    return allBranches.filter((b) => b.is_main)
  }
}
