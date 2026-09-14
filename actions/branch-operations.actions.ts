'use server'

import { CrossBranchOperationsService } from '../services/cross-branch-operations.service.ts'
import { BranchOperationsRepository } from '../lib/repositories/branch-operations.repository.ts'
import { requireTenantUser } from '../lib/auth/tenant-auth.ts'
import type {
  BranchTransferStatus,
  InterBranchFinancialTransferStatus,
} from '../types/branch.types.ts'

export async function listBranchTransfersAction(filters?: {
  branchId?: string
  status?: BranchTransferStatus
  materialId?: string
}) {
  const tenant = await requireTenantUser()
  try {
    const list = await BranchOperationsRepository.listBranchTransfers(
      tenant.companyId,
      filters
    )
    return { success: true, data: list }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function requestBranchTransferAction(payload: {
  from_branch_id: string
  from_location_id?: string | null
  to_branch_id: string
  to_location_id?: string | null
  material_id: string
  material_name?: string
  quantity: number
  unit?: string
  notes?: string | null
  idempotency_key?: string | null
}) {
  const tenant = await requireTenantUser()
  try {
    const transfer = await CrossBranchOperationsService.requestTransfer(
      tenant.companyId,
      {
        ...payload,
        requested_by: tenant.userId,
        requested_by_name: tenant.fullName || tenant.userEmail || 'User',
      }
    )
    return { success: true, data: transfer }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function approveBranchTransferAction(transferId: string) {
  const tenant = await requireTenantUser()
  try {
    const transfer = await CrossBranchOperationsService.approveTransfer(
      tenant.companyId,
      transferId,
      { id: tenant.userId, name: tenant.fullName || tenant.userEmail || 'Authorizer' }
    )
    return { success: true, data: transfer }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function dispatchBranchTransferAction(transferId: string) {
  const tenant = await requireTenantUser()
  try {
    const transfer = await CrossBranchOperationsService.dispatchTransfer(
      tenant.companyId,
      transferId,
      { id: tenant.userId, name: tenant.fullName || tenant.userEmail || 'Dispatcher' }
    )
    return { success: true, data: transfer }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function receiveBranchTransferAction(transferId: string) {
  const tenant = await requireTenantUser()
  try {
    const transfer = await CrossBranchOperationsService.receiveTransfer(
      tenant.companyId,
      transferId,
      { id: tenant.userId, name: tenant.fullName || tenant.userEmail || 'Receiver' }
    )
    return { success: true, data: transfer }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function rejectBranchTransferAction(
  transferId: string,
  rejectionReason: string
) {
  const tenant = await requireTenantUser()
  try {
    const transfer = await CrossBranchOperationsService.rejectTransfer(
      tenant.companyId,
      transferId,
      rejectionReason,
      { id: tenant.userId, name: tenant.fullName || tenant.userEmail || 'Authorizer' }
    )
    return { success: true, data: transfer }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function cancelBranchTransferAction(transferId: string) {
  const tenant = await requireTenantUser()
  try {
    const transfer = await CrossBranchOperationsService.cancelTransfer(
      tenant.companyId,
      transferId,
      { id: tenant.userId, name: tenant.fullName || tenant.userEmail || 'Operator' }
    )
    return { success: true, data: transfer }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function listFinancialTransfersAction(filters?: {
  branchId?: string
  status?: InterBranchFinancialTransferStatus
}) {
  const tenant = await requireTenantUser()
  try {
    const list = await BranchOperationsRepository.listFinancialTransfers(
      tenant.companyId,
      filters
    )
    return { success: true, data: list }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function requestFinancialTransferAction(payload: {
  from_branch_id: string
  to_branch_id: string
  from_account_id?: string | null
  to_account_id?: string | null
  amount: number
  currency?: string
  reference?: string | null
  notes?: string | null
  idempotency_key?: string | null
}) {
  const tenant = await requireTenantUser()
  try {
    const transfer = await CrossBranchOperationsService.requestFinancialTransfer(
      tenant.companyId,
      {
        ...payload,
        requested_by: tenant.userId,
        requested_by_name: tenant.fullName || tenant.userEmail || 'Accountant',
      }
    )
    return { success: true, data: transfer }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function completeFinancialTransferAction(transferId: string) {
  const tenant = await requireTenantUser()
  try {
    const transfer = await CrossBranchOperationsService.completeFinancialTransfer(
      tenant.companyId,
      transferId,
      { id: tenant.userId, name: tenant.fullName || tenant.userEmail || 'Approver' }
    )
    return { success: true, data: transfer }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function routeProductionTaskToBranchAction(
  taskId: string,
  targetBranchId: string,
  reason?: string
) {
  const tenant = await requireTenantUser()
  try {
    const task = await CrossBranchOperationsService.routeProductionTaskToBranch(
      tenant.companyId,
      taskId,
      targetBranchId,
      { id: tenant.userId, name: tenant.fullName || tenant.userEmail || 'Production Manager' },
      reason
    )
    return { success: true, data: task }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function assignEmployeeToBranchAction(payload: {
  employee_id: string
  branch_id: string
  start_date: string
  end_date?: string | null
  notes?: string | null
}) {
  const tenant = await requireTenantUser()
  try {
    const assignment = await CrossBranchOperationsService.assignEmployeeToBranch(
      tenant.companyId,
      {
        ...payload,
        assigned_by: tenant.userId,
      }
    )
    return { success: true, data: assignment }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
