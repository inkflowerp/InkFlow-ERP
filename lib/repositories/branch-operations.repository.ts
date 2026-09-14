import { createClient } from '../supabase/server.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../db/data-store.ts'
import type {
  BranchTransferRecord,
  BranchTransferStatus,
  InterBranchFinancialTransferRecord,
  InterBranchFinancialTransferStatus,
  EmployeeBranchAssignmentRecord,
  WorkflowConfigurationRecord,
  WorkflowType,
} from '../../types/branch.types.ts'

export class BranchOperationsRepository {
  // ==========================================================================
  // 1. INVENTORY TRANSFERS
  // ==========================================================================

  static async listBranchTransfers(
    companyId: string,
    filters?: {
      branchId?: string
      status?: BranchTransferStatus
      materialId?: string
    }
  ): Promise<BranchTransferRecord[]> {
    const list = (PrintERPDataStore.get<BranchTransferRecord[]>(
      STORAGE_KEYS.BRANCH_TRANSFERS,
      companyId
    ) || []) as BranchTransferRecord[]

    if (list.length > 0) {
      return list.filter((t) => {
        if (
          filters?.branchId &&
          t.from_branch_id !== filters.branchId &&
          t.to_branch_id !== filters.branchId
        ) {
          return false
        }
        if (filters?.status && t.status !== filters.status) return false
        if (filters?.materialId && t.material_id !== filters.materialId) return false
        return true
      })
    }

    try {
      const supabase = await createClient()
      let query = supabase
        .from('branch_transfer_requests')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (filters?.branchId) {
        query = query.or(
          `from_branch_id.eq.${filters.branchId},to_branch_id.eq.${filters.branchId}`
        )
      }
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.materialId) {
        query = query.eq('material_id', filters.materialId)
      }

      const { data, error } = await query
      if (!error && data && data.length > 0) {
        return data as BranchTransferRecord[]
      }
    } catch {}

    return []
  }

  static async getBranchTransferById(
    companyId: string,
    transferId: string
  ): Promise<BranchTransferRecord | null> {
    const list = (PrintERPDataStore.get<BranchTransferRecord[]>(
      STORAGE_KEYS.BRANCH_TRANSFERS,
      companyId
    ) || []) as BranchTransferRecord[]

    const found = list.find((t) => t.id === transferId)
    if (found) return found

    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('branch_transfer_requests')
        .select('*')
        .eq('company_id', companyId)
        .eq('id', transferId)
        .maybeSingle()

      if (!error && data) return data as BranchTransferRecord
    } catch {}

    return null
  }

  static async getBranchTransferByIdempotencyKey(
    companyId: string,
    idempotencyKey: string
  ): Promise<BranchTransferRecord | null> {
    const list = (PrintERPDataStore.get<BranchTransferRecord[]>(
      STORAGE_KEYS.BRANCH_TRANSFERS,
      companyId
    ) || []) as BranchTransferRecord[]

    const found = list.find((t) => t.idempotency_key === idempotencyKey)
    if (found) return found

    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('branch_transfer_requests')
        .select('*')
        .eq('company_id', companyId)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle()

      if (!error && data) return data as BranchTransferRecord
    } catch {}

    return null
  }

  static async createBranchTransfer(
    companyId: string,
    payload: Partial<BranchTransferRecord>
  ): Promise<BranchTransferRecord> {
    if (payload.idempotency_key) {
      const existing = await this.getBranchTransferByIdempotencyKey(companyId, payload.idempotency_key)
      if (existing) {
        return existing
      }
    }

    const transferId = payload.id || crypto.randomUUID()
    const now = new Date().toISOString()
    const record: BranchTransferRecord = {
      id: transferId,
      company_id: companyId,
      transfer_number:
        payload.transfer_number ||
        `TRF-${Date.now().toString().slice(-6)}`,
      from_branch_id: payload.from_branch_id || '',
      from_location_id: payload.from_location_id || null,
      to_branch_id: payload.to_branch_id || '',
      to_location_id: payload.to_location_id || null,
      material_id: payload.material_id || '',
      material_name: payload.material_name || '',
      quantity: Number(payload.quantity) || 0,
      unit: payload.unit || 'sqft',
      status: (payload.status as BranchTransferStatus) || 'draft',
      requested_by: payload.requested_by || null,
      requested_by_name: payload.requested_by_name || null,
      approved_by: payload.approved_by || null,
      approved_by_name: payload.approved_by_name || null,
      approved_at: payload.approved_at || null,
      dispatched_by: payload.dispatched_by || null,
      dispatched_by_name: payload.dispatched_by_name || null,
      dispatched_at: payload.dispatched_at || null,
      received_by: payload.received_by || null,
      received_by_name: payload.received_by_name || null,
      received_at: payload.received_at || null,
      rejection_reason: payload.rejection_reason || null,
      notes: payload.notes || null,
      idempotency_key: payload.idempotency_key || null,
      created_at: now,
      updated_at: now,
    }

    const list = (PrintERPDataStore.get<BranchTransferRecord[]>(
      STORAGE_KEYS.BRANCH_TRANSFERS,
      companyId
    ) || []) as BranchTransferRecord[]

    list.push(record)
    PrintERPDataStore.set(STORAGE_KEYS.BRANCH_TRANSFERS, companyId, list)

    try {
      const supabase = await createClient()
      await supabase.from('branch_transfer_requests').insert([record as any])
    } catch {}

    return record
  }

  static async updateBranchTransfer(
    companyId: string,
    transferId: string,
    updates: Partial<BranchTransferRecord>
  ): Promise<BranchTransferRecord> {
    const now = new Date().toISOString()
    const updateData = { ...updates, updated_at: now }

    const list = (PrintERPDataStore.get<BranchTransferRecord[]>(
      STORAGE_KEYS.BRANCH_TRANSFERS,
      companyId
    ) || []) as BranchTransferRecord[]

    const index = list.findIndex((t) => t.id === transferId)
    if (index === -1) {
      throw new Error(`Branch transfer ${transferId} not found`)
    }

    const updated = { ...list[index], ...updateData }
    list[index] = updated
    PrintERPDataStore.set(STORAGE_KEYS.BRANCH_TRANSFERS, companyId, list)

    try {
      const supabase = await createClient()
      await supabase
        .from('branch_transfer_requests')
        .update(updateData as any)
        .eq('company_id', companyId)
        .eq('id', transferId)
    } catch {}

    return updated
  }

  // ==========================================================================
  // 2. INTER-BRANCH FINANCIAL TRANSFERS
  // ==========================================================================

  static async listFinancialTransfers(
    companyId: string,
    filters?: {
      branchId?: string
      status?: InterBranchFinancialTransferStatus
    }
  ): Promise<InterBranchFinancialTransferRecord[]> {
    const list = (PrintERPDataStore.get<InterBranchFinancialTransferRecord[]>(
      STORAGE_KEYS.INTER_BRANCH_FINANCIAL_TRANSFERS,
      companyId
    ) || []) as InterBranchFinancialTransferRecord[]

    if (list.length > 0) {
      return list.filter((t) => {
        if (
          filters?.branchId &&
          t.from_branch_id !== filters.branchId &&
          t.to_branch_id !== filters.branchId
        ) {
          return false
        }
        if (filters?.status && t.status !== filters.status) return false
        return true
      })
    }

    try {
      const supabase = await createClient()
      let query = supabase
        .from('inter_branch_financial_transfers')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (filters?.branchId) {
        query = query.or(
          `from_branch_id.eq.${filters.branchId},to_branch_id.eq.${filters.branchId}`
        )
      }
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }

      const { data, error } = await query
      if (!error && data && data.length > 0) {
        return data as InterBranchFinancialTransferRecord[]
      }
    } catch {}

    return []
  }

  static async createFinancialTransfer(
    companyId: string,
    payload: Partial<InterBranchFinancialTransferRecord>
  ): Promise<InterBranchFinancialTransferRecord> {
    const id = payload.id || crypto.randomUUID()
    const now = new Date().toISOString()
    const record: InterBranchFinancialTransferRecord = {
      id,
      company_id: companyId,
      transfer_number:
        payload.transfer_number ||
        `FT-${Date.now().toString().slice(-6)}`,
      from_branch_id: payload.from_branch_id || '',
      to_branch_id: payload.to_branch_id || '',
      from_account_id: payload.from_account_id || null,
      to_account_id: payload.to_account_id || null,
      amount: Number(payload.amount) || 0,
      currency: payload.currency || 'BDT',
      status: (payload.status as InterBranchFinancialTransferStatus) || 'draft',
      requested_by: payload.requested_by || null,
      requested_by_name: payload.requested_by_name || null,
      approved_by: payload.approved_by || null,
      approved_by_name: payload.approved_by_name || null,
      approved_at: payload.approved_at || null,
      reference: payload.reference || null,
      notes: payload.notes || null,
      idempotency_key: payload.idempotency_key || null,
      created_at: now,
      updated_at: now,
    }

    const list = (PrintERPDataStore.get<InterBranchFinancialTransferRecord[]>(
      STORAGE_KEYS.INTER_BRANCH_FINANCIAL_TRANSFERS,
      companyId
    ) || []) as InterBranchFinancialTransferRecord[]

    list.push(record)
    PrintERPDataStore.set(
      STORAGE_KEYS.INTER_BRANCH_FINANCIAL_TRANSFERS,
      companyId,
      list
    )

    try {
      const supabase = await createClient()
      await supabase
        .from('inter_branch_financial_transfers')
        .insert([record as any])
    } catch {}

    return record
  }

  static async updateFinancialTransfer(
    companyId: string,
    transferId: string,
    updates: Partial<InterBranchFinancialTransferRecord>
  ): Promise<InterBranchFinancialTransferRecord> {
    const now = new Date().toISOString()
    const updateData = { ...updates, updated_at: now }

    const list = (PrintERPDataStore.get<InterBranchFinancialTransferRecord[]>(
      STORAGE_KEYS.INTER_BRANCH_FINANCIAL_TRANSFERS,
      companyId
    ) || []) as InterBranchFinancialTransferRecord[]

    const index = list.findIndex((t) => t.id === transferId)
    if (index === -1) {
      throw new Error(`Financial transfer ${transferId} not found`)
    }

    const updated = { ...list[index], ...updateData }
    list[index] = updated
    PrintERPDataStore.set(
      STORAGE_KEYS.INTER_BRANCH_FINANCIAL_TRANSFERS,
      companyId,
      list
    )

    try {
      const supabase = await createClient()
      await supabase
        .from('inter_branch_financial_transfers')
        .update(updateData as any)
        .eq('company_id', companyId)
        .eq('id', transferId)
    } catch {}

    return updated
  }

  // ==========================================================================
  // 3. EMPLOYEE BRANCH ASSIGNMENTS
  // ==========================================================================

  static async listEmployeeAssignments(
    companyId: string,
    filters?: { employeeId?: string; branchId?: string; status?: string }
  ): Promise<EmployeeBranchAssignmentRecord[]> {
    const list = (PrintERPDataStore.get<EmployeeBranchAssignmentRecord[]>(
      STORAGE_KEYS.EMPLOYEE_BRANCH_ASSIGNMENTS,
      companyId
    ) || []) as EmployeeBranchAssignmentRecord[]

    if (list.length > 0) {
      return list.filter((a) => {
        if (filters?.employeeId && a.employee_id !== filters.employeeId) return false
        if (filters?.branchId && a.branch_id !== filters.branchId) return false
        if (filters?.status && a.status !== filters.status) return false
        return true
      })
    }

    try {
      const supabase = await createClient()
      let query = supabase
        .from('employee_branch_assignments')
        .select('*')
        .eq('company_id', companyId)
        .order('start_date', { ascending: false })

      if (filters?.employeeId) {
        query = query.eq('employee_id', filters.employeeId)
      }
      if (filters?.branchId) {
        query = query.eq('branch_id', filters.branchId)
      }
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }

      const { data, error } = await query
      if (!error && data && data.length > 0) {
        return data as EmployeeBranchAssignmentRecord[]
      }
    } catch {}

    return []
  }

  static async createEmployeeAssignment(
    companyId: string,
    payload: Partial<EmployeeBranchAssignmentRecord>
  ): Promise<EmployeeBranchAssignmentRecord> {
    const id = payload.id || crypto.randomUUID()
    const now = new Date().toISOString()
    const record: EmployeeBranchAssignmentRecord = {
      id,
      company_id: companyId,
      employee_id: payload.employee_id || '',
      branch_id: payload.branch_id || '',
      start_date: payload.start_date || new Date().toISOString().slice(0, 10),
      end_date: payload.end_date || null,
      is_temporary: payload.is_temporary !== false,
      status: (payload.status as any) || 'active',
      assigned_by: payload.assigned_by || null,
      notes: payload.notes || null,
      created_at: now,
      updated_at: now,
    }

    const list = (PrintERPDataStore.get<EmployeeBranchAssignmentRecord[]>(
      STORAGE_KEYS.EMPLOYEE_BRANCH_ASSIGNMENTS,
      companyId
    ) || []) as EmployeeBranchAssignmentRecord[]

    list.push(record)
    PrintERPDataStore.set(
      STORAGE_KEYS.EMPLOYEE_BRANCH_ASSIGNMENTS,
      companyId,
      list
    )

    try {
      const supabase = await createClient()
      await supabase
        .from('employee_branch_assignments')
        .insert([record as any])
    } catch {}

    return record
  }

  // ==========================================================================
  // 4. WORKFLOW CONFIGURATIONS
  // ==========================================================================

  static async getWorkflowConfig(
    companyId: string,
    workflowType: WorkflowType,
    branchId?: string | null
  ): Promise<WorkflowConfigurationRecord | null> {
    const list = (PrintERPDataStore.get<WorkflowConfigurationRecord[]>(
      STORAGE_KEYS.WORKFLOW_CONFIGURATIONS,
      companyId
    ) || []) as WorkflowConfigurationRecord[]

    const found = list.find(
      (w) =>
        w.workflow_type === workflowType &&
        w.is_active &&
        ((branchId && w.branch_id === branchId) || (!branchId && !w.branch_id))
    )
    if (found) return found

    try {
      const supabase = await createClient()
      let query = supabase
        .from('workflow_configurations')
        .select('*')
        .eq('company_id', companyId)
        .eq('workflow_type', workflowType)
        .eq('is_active', true)

      if (branchId) {
        query = query.eq('branch_id', branchId)
      } else {
        query = query.is('branch_id', null)
      }

      const { data, error } = await query.maybeSingle()
      if (!error && data) return data as WorkflowConfigurationRecord
    } catch {}

    return null
  }

  static async setWorkflowConfig(
    companyId: string,
    payload: Partial<WorkflowConfigurationRecord>
  ): Promise<WorkflowConfigurationRecord> {
    const id = payload.id || crypto.randomUUID()
    const now = new Date().toISOString()
    const record: WorkflowConfigurationRecord = {
      id,
      company_id: companyId,
      branch_id: payload.branch_id || null,
      workflow_type: payload.workflow_type || 'inventory_transfer',
      rules: payload.rules || {},
      is_active: payload.is_active !== false,
      updated_by: payload.updated_by || null,
      created_at: now,
      updated_at: now,
    }

    let list = (PrintERPDataStore.get<WorkflowConfigurationRecord[]>(
      STORAGE_KEYS.WORKFLOW_CONFIGURATIONS,
      companyId
    ) || []) as WorkflowConfigurationRecord[]

    const index = list.findIndex(
      (w) =>
        w.workflow_type === record.workflow_type &&
        w.branch_id === record.branch_id
    )
    if (index >= 0) {
      list[index] = record
    } else {
      list.push(record)
    }

    PrintERPDataStore.set(
      STORAGE_KEYS.WORKFLOW_CONFIGURATIONS,
      companyId,
      list
    )

    try {
      const supabase = await createClient()
      await supabase
        .from('workflow_configurations')
        .upsert([record as any])
    } catch {}

    return record
  }
}
