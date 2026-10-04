'use server'

import { BranchManagementService } from '../services/branch-management.service.ts'
import { BranchRepository } from '../lib/repositories/branch.repository.ts'
import { requireTenantUser } from '../lib/auth/tenant-auth.ts'
import { SubscriptionGuard } from '../lib/subscription/subscription-guard.ts'
import { withTenantAction } from '../lib/actions/action-wrapper.ts'
import type { BranchStatus } from '../types/branch.types.ts'

export const listBranchesAction = withTenantAction(
  { permission: 'branch.view' },
  async (
    ctx,
    options?: {
      status?: BranchStatus
      includeInactive?: boolean
    },
    companyIdParam?: string
  ) => {
    try {
      const branches = await BranchRepository.listBranches(ctx.companyId, options)
      return { success: true, data: branches }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
)

export const getBranchByIdAction = withTenantAction(
  { permission: 'branch.view' },
  async (ctx, branchId: string, companyIdParam?: string) => {
    try {
      const branch = await BranchRepository.getBranchById(ctx.companyId, branchId)
      return { success: true, data: branch }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
)

export const createBranchAction = withTenantAction(
  { permission: 'branches.manage', auditAction: 'branch.create', entityType: 'branch' },
  async (
    ctx,
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
    },
    companyIdParam?: string
  ) => {
    try {
      await SubscriptionGuard.requireLimit(ctx.companyId, 'max_branches')
      const branch = await BranchManagementService.createBranch(ctx.companyId, payload)
      return { success: true, data: branch }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
)

export const updateBranchAction = withTenantAction(
  { permission: 'branches.manage', auditAction: 'branch.update', entityType: 'branch' },
  async (
    ctx,
    branchId: string,
    updates: any,
    companyIdParam?: string
  ) => {
    try {
      const branch = await BranchManagementService.updateBranch(
        ctx.companyId,
        branchId,
        updates
      )
      return { success: true, data: branch }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
)

export const setBranchStatusAction = withTenantAction(
  {
    permission: 'branches.manage',
    destructive: true,
    auditAction: 'branch.status_change',
    entityType: 'branch',
  },
  async (
    ctx,
    branchId: string,
    status: BranchStatus,
    companyIdParam?: string
  ) => {
    try {
      const branch = await BranchManagementService.setBranchStatus(
        ctx.companyId,
        branchId,
        status
      )
      return { success: true, data: branch }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
)

export const updateBranchStatusAction = setBranchStatusAction

export const getUserAuthorizedBranchesAction = withTenantAction(
  { permission: 'branch.view' },
  async (
    ctx,
    userBranchId?: string | null,
    userScope: string = 'company',
    isOwner: boolean = false,
    companyIdParam?: string
  ) => {
    try {
      const branches = await BranchManagementService.getAuthorizedBranchesForUser(
        ctx.companyId,
        ctx.user.id,
        userBranchId,
        userScope,
        isOwner
      )
      return { success: true, data: branches }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
)

export const setUserAuthorizedBranchesAction = withTenantAction(
  {
    permission: 'users.branch_assign',
    auditAction: 'branch.assign_user',
    entityType: 'branch',
  },
  async (
    ctx,
    targetUserId: string,
    branchIds: string[],
    companyIdParam?: string
  ) => {
    try {
      await BranchRepository.setUserAuthorizedBranches(
        ctx.companyId,
        targetUserId,
        branchIds
      )
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
)
