'use server'

import { BranchManagementService } from '../services/branch-management.service.ts'
import { BranchRepository } from '../lib/repositories/branch.repository.ts'
import { requireTenantUser } from '../lib/auth/tenant-auth.ts'
import type { BranchStatus } from '../types/branch.types.ts'

export async function listBranchesAction(options?: {
  status?: BranchStatus
  includeInactive?: boolean
}) {
  const tenant = await requireTenantUser()
  try {
    const branches = await BranchRepository.listBranches(tenant.companyId, options)
    return { success: true, data: branches }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getBranchByIdAction(branchId: string) {
  const tenant = await requireTenantUser()
  try {
    const branch = await BranchRepository.getBranchById(tenant.companyId, branchId)
    return { success: true, data: branch }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function createBranchAction(payload: {
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
}) {
  const tenant = await requireTenantUser()
  try {
    const branch = await BranchManagementService.createBranch(tenant.companyId, payload)
    return { success: true, data: branch }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateBranchAction(
  branchId: string,
  updates: any
) {
  const tenant = await requireTenantUser()
  try {
    const branch = await BranchManagementService.updateBranch(
      tenant.companyId,
      branchId,
      updates
    )
    return { success: true, data: branch }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function setBranchStatusAction(
  branchId: string,
  status: BranchStatus
) {
  const tenant = await requireTenantUser()
  try {
    const branch = await BranchManagementService.setBranchStatus(
      tenant.companyId,
      branchId,
      status
    )
    return { success: true, data: branch }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export const updateBranchStatusAction = setBranchStatusAction

export async function getUserAuthorizedBranchesAction(
  userBranchId?: string | null,
  userScope: string = 'company',
  isOwner: boolean = false
) {
  const tenant = await requireTenantUser()
  try {
    const branches = await BranchManagementService.getAuthorizedBranchesForUser(
      tenant.companyId,
      tenant.userId,
      userBranchId,
      userScope,
      isOwner
    )
    return { success: true, data: branches }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function setUserAuthorizedBranchesAction(
  targetUserId: string,
  branchIds: string[]
) {
  const tenant = await requireTenantUser()
  try {
    await BranchRepository.setUserAuthorizedBranches(
      tenant.companyId,
      targetUserId,
      branchIds
    )
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
