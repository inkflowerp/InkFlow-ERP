import { BranchOperationsRepository } from '../lib/repositories/branch-operations.repository.ts'
import { BranchRepository } from '../lib/repositories/branch.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../lib/db/data-store.ts'
import type {
  BranchTransferRecord,
  InterBranchFinancialTransferRecord,
  EmployeeBranchAssignmentRecord,
} from '../types/branch.types.ts'

export class CrossBranchOperationsService {
  // ==========================================================================
  // 1. CROSS-BRANCH INVENTORY TRANSFERS
  // ==========================================================================

  /**
   * Request an inter-branch inventory transfer
   */
  static async requestTransfer(
    companyId: string,
    payload: {
      from_branch_id: string
      to_branch_id: string
      material_id: string
      material_name?: string
      unit?: string
      quantity: number
      from_location_id?: string | null
      to_location_id?: string | null
      requested_by?: string | null
      requested_by_name?: string | null
      notes?: string | null
      idempotency_key?: string | null
    }
  ): Promise<BranchTransferRecord> {
    if (!payload.from_branch_id || !payload.to_branch_id) {
      throw new Error('Both source and destination branches are required')
    }
    if (payload.from_branch_id === payload.to_branch_id) {
      throw new Error('Source and destination branches cannot be identical')
    }
    if (!payload.material_id) {
      throw new Error('Material ID is required')
    }
    if (!payload.quantity || payload.quantity <= 0) {
      throw new Error('Transfer quantity must be greater than 0')
    }

    // Check material existence
    const materials = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.MATERIALS, companyId) || [])
    const material = materials.find((m: any) => m.id === payload.material_id)
    const matName = payload.material_name || material?.name || 'Raw Material'
    const unit = payload.unit || material?.unit || 'sqft'

    return BranchOperationsRepository.createBranchTransfer(companyId, {
      ...payload,
      material_name: matName,
      unit,
      status: 'requested',
    })
  }

  /**
   * Approve a transfer request
   */
  static async approveTransfer(
    companyId: string,
    transferId: string,
    approvedBy: { id: string; name: string }
  ): Promise<BranchTransferRecord> {
    const transfer = await BranchOperationsRepository.getBranchTransferById(companyId, transferId)
    if (!transfer) throw new Error(`Transfer ${transferId} not found`)
    if (transfer.status !== 'requested' && transfer.status !== 'draft') {
      throw new Error(`Cannot approve transfer in status "${transfer.status}"`)
    }

    return BranchOperationsRepository.updateBranchTransfer(companyId, transferId, {
      status: 'approved',
      approved_by: approvedBy.id,
      approved_by_name: approvedBy.name,
      approved_at: new Date().toISOString(),
    })
  }

  /**
   * Dispatch approved transfer: Deducts stock from source branch/location
   */
  static async dispatchTransfer(
    companyId: string,
    transferId: string,
    dispatchedBy: { id: string; name: string }
  ): Promise<BranchTransferRecord> {
    const transfer = await BranchOperationsRepository.getBranchTransferById(companyId, transferId)
    if (!transfer) throw new Error(`Transfer ${transferId} not found`)
    if (transfer.status !== 'approved') {
      throw new Error(`Cannot dispatch transfer in status "${transfer.status}". Must be approved first.`)
    }

    // Atomic Stock Deduction at Source Branch
    const materials = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.MATERIALS, companyId) || [])
    const matIndex = materials.findIndex((m: any) => m.id === transfer.material_id)
    if (matIndex >= 0) {
      const currentStock = Number(materials[matIndex].current_stock) || 0
      if (currentStock < transfer.quantity) {
        throw new Error(
          `Insufficient stock at source branch. Available: ${currentStock}, Requested: ${transfer.quantity}`
        )
      }
      materials[matIndex].current_stock = currentStock - transfer.quantity
      materials[matIndex].updated_at = new Date().toISOString()
      PrintERPDataStore.set(STORAGE_KEYS.MATERIALS, companyId, materials)

      // Post to V3 Stock Ledger
      const ledger = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.STOCK_LEDGER, companyId) || [])
      ledger.push({
        id: crypto.randomUUID(),
        company_id: companyId,
        branch_id: transfer.from_branch_id,
        material_id: transfer.material_id,
        transaction_type: 'transfer_out',
        quantity_change: -transfer.quantity,
        unit: transfer.unit,
        balance_after: materials[matIndex].current_stock,
        reference_id: transfer.transfer_number,
        performed_by_name: dispatchedBy.name,
        notes: `Inter-branch transfer dispatch to branch ${transfer.to_branch_id}`,
        created_at: new Date().toISOString(),
      })
      PrintERPDataStore.set(STORAGE_KEYS.STOCK_LEDGER, companyId, ledger)
    }

    return BranchOperationsRepository.updateBranchTransfer(companyId, transferId, {
      status: 'in_transit',
      dispatched_by: dispatchedBy.id,
      dispatched_by_name: dispatchedBy.name,
      dispatched_at: new Date().toISOString(),
    })
  }

  /**
   * Receive in-transit transfer: Adds stock to destination branch/location
   */
  static async receiveTransfer(
    companyId: string,
    transferId: string,
    receivedBy: { id: string; name: string }
  ): Promise<BranchTransferRecord> {
    const transfer = await BranchOperationsRepository.getBranchTransferById(companyId, transferId)
    if (!transfer) throw new Error(`Transfer ${transferId} not found`)
    if (transfer.status !== 'in_transit' && transfer.status !== 'dispatched') {
      throw new Error(`Cannot receive transfer in status "${transfer.status}". Must be in_transit.`)
    }

    // Atomic Stock Credit at Target Branch
    const materials = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.MATERIALS, companyId) || [])
    const matIndex = materials.findIndex((m: any) => m.id === transfer.material_id)
    if (matIndex >= 0) {
      const currentStock = Number(materials[matIndex].current_stock) || 0
      materials[matIndex].current_stock = currentStock + transfer.quantity
      materials[matIndex].updated_at = new Date().toISOString()
      PrintERPDataStore.set(STORAGE_KEYS.MATERIALS, companyId, materials)

      // Post to V3 Stock Ledger
      const ledger = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.STOCK_LEDGER, companyId) || [])
      ledger.push({
        id: crypto.randomUUID(),
        company_id: companyId,
        branch_id: transfer.to_branch_id,
        material_id: transfer.material_id,
        transaction_type: 'transfer_in',
        quantity_change: transfer.quantity,
        unit: transfer.unit,
        balance_after: materials[matIndex].current_stock,
        reference_id: transfer.transfer_number,
        performed_by_name: receivedBy.name,
        notes: `Inter-branch transfer received from branch ${transfer.from_branch_id}`,
        created_at: new Date().toISOString(),
      })
      PrintERPDataStore.set(STORAGE_KEYS.STOCK_LEDGER, companyId, ledger)
    }

    return BranchOperationsRepository.updateBranchTransfer(companyId, transferId, {
      status: 'received',
      received_by: receivedBy.id,
      received_by_name: receivedBy.name,
      received_at: new Date().toISOString(),
    })
  }

  /**
   * Reject a transfer request
   */
  static async rejectTransfer(
    companyId: string,
    transferId: string,
    rejectionReason: string,
    rejectedBy: { id: string; name: string }
  ): Promise<BranchTransferRecord> {
    const transfer = await BranchOperationsRepository.getBranchTransferById(companyId, transferId)
    if (!transfer) throw new Error(`Transfer ${transferId} not found`)
    if (transfer.status !== 'requested' && transfer.status !== 'draft') {
      throw new Error(`Cannot reject transfer in status "${transfer.status}"`)
    }

    return BranchOperationsRepository.updateBranchTransfer(companyId, transferId, {
      status: 'rejected',
      rejection_reason: rejectionReason,
      notes: `Rejected by ${rejectedBy.name}: ${rejectionReason}`,
    })
  }

  /**
   * Cancel a transfer request (reverts stock if in_transit)
   */
  static async cancelTransfer(
    companyId: string,
    transferId: string,
    cancelledBy: { id: string; name: string }
  ): Promise<BranchTransferRecord> {
    const transfer = await BranchOperationsRepository.getBranchTransferById(companyId, transferId)
    if (!transfer) throw new Error(`Transfer ${transferId} not found`)
    if (transfer.status === 'received') {
      throw new Error('Cannot cancel a transfer that has already been received')
    }

    // If already dispatched / in_transit, revert stock back to source branch
    if (transfer.status === 'in_transit' || transfer.status === 'dispatched') {
      const materials = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.MATERIALS, companyId) || [])
      const matIndex = materials.findIndex((m: any) => m.id === transfer.material_id)
      if (matIndex >= 0) {
        materials[matIndex].current_stock =
          (Number(materials[matIndex].current_stock) || 0) + transfer.quantity
        PrintERPDataStore.set(STORAGE_KEYS.MATERIALS, companyId, materials)

        const ledger = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.STOCK_LEDGER, companyId) || [])
        ledger.push({
          id: crypto.randomUUID(),
          company_id: companyId,
          branch_id: transfer.from_branch_id,
          material_id: transfer.material_id,
          transaction_type: 'adjustment',
          quantity_change: transfer.quantity,
          unit: transfer.unit,
          balance_after: materials[matIndex].current_stock,
          reference_id: transfer.transfer_number,
          performed_by_name: cancelledBy.name,
          notes: `Reversion from cancelled in-transit transfer ${transfer.transfer_number}`,
          created_at: new Date().toISOString(),
        })
        PrintERPDataStore.set(STORAGE_KEYS.STOCK_LEDGER, companyId, ledger)
      }
    }

    return BranchOperationsRepository.updateBranchTransfer(companyId, transferId, {
      status: 'cancelled',
      notes: `Cancelled by ${cancelledBy.name}`,
    })
  }

  // ==========================================================================
  // 2. INTER-BRANCH FINANCIAL TRANSFERS
  // ==========================================================================

  /**
   * Request an inter-branch financial transfer
   */
  static async requestFinancialTransfer(
    companyId: string,
    payload: {
      from_branch_id: string
      to_branch_id: string
      from_account_id?: string | null
      to_account_id?: string | null
      amount: number
      currency?: string
      requested_by?: string | null
      requested_by_name?: string | null
      reference?: string | null
      notes?: string | null
      idempotency_key?: string | null
    }
  ): Promise<InterBranchFinancialTransferRecord> {
    if (!payload.from_branch_id || !payload.to_branch_id) {
      throw new Error('Both source and destination branches are required for financial transfer')
    }
    if (payload.from_branch_id === payload.to_branch_id) {
      throw new Error('Source and destination branches cannot be identical')
    }
    if (!payload.amount || payload.amount <= 0) {
      throw new Error('Financial transfer amount must be greater than 0')
    }

    return BranchOperationsRepository.createFinancialTransfer(companyId, {
      ...payload,
      status: 'requested',
    })
  }

  /**
   * Complete an approved financial transfer (Balanced double-entry posting)
   */
  static async completeFinancialTransfer(
    companyId: string,
    transferId: string,
    completedBy: { id: string; name: string }
  ): Promise<InterBranchFinancialTransferRecord> {
    const transfer = (
      await BranchOperationsRepository.listFinancialTransfers(companyId)
    ).find((t: InterBranchFinancialTransferRecord) => t.id === transferId)
    if (!transfer) throw new Error(`Financial transfer ${transferId} not found`)
    if (transfer.status === 'completed') return transfer

    // Record cash book / transaction entries for both branches
    const cashBook = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.CASH_BOOK, companyId) || [])
    const now = new Date().toISOString()

    // 1. Source branch cash-out
    cashBook.push({
      id: crypto.randomUUID(),
      company_id: companyId,
      branch_id: transfer.from_branch_id,
      entry_type: 'cash_out',
      amount: transfer.amount,
      category: 'inter_branch_transfer',
      description: `Transfer to branch ${transfer.to_branch_id} (Ref: ${transfer.transfer_number})`,
      performed_by_name: completedBy.name,
      created_at: now,
    })

    // 2. Destination branch cash-in
    cashBook.push({
      id: crypto.randomUUID(),
      company_id: companyId,
      branch_id: transfer.to_branch_id,
      entry_type: 'cash_in',
      amount: transfer.amount,
      category: 'inter_branch_transfer',
      description: `Transfer from branch ${transfer.from_branch_id} (Ref: ${transfer.transfer_number})`,
      performed_by_name: completedBy.name,
      created_at: now,
    })

    PrintERPDataStore.set(STORAGE_KEYS.CASH_BOOK, companyId, cashBook)

    return BranchOperationsRepository.updateFinancialTransfer(companyId, transferId, {
      status: 'completed',
      approved_by: completedBy.id,
      approved_by_name: completedBy.name,
      approved_at: now,
    })
  }

  // ==========================================================================
  // 3. CROSS-BRANCH PRODUCTION ROUTING
  // ==========================================================================

  /**
   * Reassign a production task from one branch queue to another
   */
  static async routeProductionTaskToBranch(
    companyId: string,
    taskId: string,
    targetBranchId: string,
    routedBy: { id: string; name: string },
    reason?: string
  ): Promise<any> {
    const targetBranch = await BranchRepository.getBranchById(companyId, targetBranchId)
    if (!targetBranch) throw new Error(`Target branch ${targetBranchId} not found`)
    if (!targetBranch.is_active) throw new Error(`Target branch "${targetBranch.name}" is not active`)

    const tasks = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.PRODUCTION_TASKS, companyId) || [])
    const index = tasks.findIndex((t: any) => t.id === taskId)
    if (index === -1) throw new Error(`Production task ${taskId} not found`)

    const previousBranchId = tasks[index].branch_id
    tasks[index].branch_id = targetBranchId
    tasks[index].updated_at = new Date().toISOString()
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_TASKS, companyId, tasks)

    // Log timeline event
    const events = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.TIMELINE_EVENTS, companyId) || [])
    events.push({
      id: crypto.randomUUID(),
      company_id: companyId,
      entity_type: 'production_task',
      entity_id: taskId,
      event_type: 'branch_reassigned',
      actor_name: routedBy.name,
      details: `Reassigned from branch ${previousBranchId || 'Main'} to ${targetBranch.name}. Reason: ${reason || 'Capacity balancing'}`,
      created_at: new Date().toISOString(),
    })
    PrintERPDataStore.set(STORAGE_KEYS.TIMELINE_EVENTS, companyId, events)

    return tasks[index]
  }

  // ==========================================================================
  // 4. TEMPORARY WORKFORCE ASSIGNMENTS
  // ==========================================================================

  /**
   * Temporarily assign an employee to work at another branch
   */
  static async assignEmployeeToBranch(
    companyId: string,
    payload: {
      employee_id: string
      branch_id: string
      start_date: string
      end_date?: string | null
      assigned_by?: string | null
      notes?: string | null
    }
  ): Promise<EmployeeBranchAssignmentRecord> {
    const branch = await BranchRepository.getBranchById(companyId, payload.branch_id)
    if (!branch) throw new Error(`Branch ${payload.branch_id} not found`)

    const employees = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.EMPLOYEES, companyId) || [])
    const employee = employees.find((e: any) => e.id === payload.employee_id)
    if (!employee) throw new Error(`Employee ${payload.employee_id} not found`)

    return BranchOperationsRepository.createEmployeeAssignment(companyId, {
      ...payload,
      is_temporary: true,
      status: 'active',
    })
  }
}
