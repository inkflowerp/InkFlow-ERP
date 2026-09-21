// ==============================================================================
// PrintERP / InkFlow SaaS - Advanced Inventory Management Service (V3)
// Authoritative PostgreSQL persistence via InventoryRepository & AuditRepository
// ==============================================================================

import type {
  MaterialRecord,
  InventoryLocationRecord,
  InventoryStockBalanceRecord,
  TaskMaterialRequirementRecord,
  MaterialRequestRecord,
  MaterialIssueRecord,
  InventoryRemnantRecord,
  InventoryTransferRecord,
  InventoryAdjustmentRecord,
  StockLedgerRecord,
  InventoryRollRecord,
  InventorySummaryStats,
} from '../types/inventory.types.ts'
import { InventoryRepository } from '../lib/repositories/inventory.repository.ts'
import { AuditRepository } from '../lib/repositories/audit.repository.ts'

export class InventoryService {
  // ==========================================
  // LOCATIONS
  // ==========================================

  static async getLocations(companyId: string, branchId?: string | null): Promise<InventoryLocationRecord[]> {
    if (!companyId) return []
    return await InventoryRepository.getLocations(companyId, branchId)
  }

  static async getLocationById(id: string, companyId: string): Promise<InventoryLocationRecord | null> {
    if (!id || !companyId) return null
    return await InventoryRepository.getLocationById(id, companyId)
  }

  static async createLocation(location: {
    company_id: string
    branch_id?: string | null
    location_code: string
    location_name: string
    location_type: string
    description?: string | null
  }): Promise<InventoryLocationRecord> {
    if (!location.company_id) {
      throw new Error('Company context is required to create an inventory location.')
    }
    const created = await InventoryRepository.createLocation(location)
    await AuditRepository.logEvent({
      companyId: location.company_id,
      userEmail: 'system',
      action: 'inventory.location_created',
      entity: 'inventory_location',
      entityId: created.id,
      newValue: created,
      description: `Created inventory location ${created.location_name} (${created.location_code})`,
    })
    return created
  }

  // ==========================================
  // MATERIALS MASTER
  // ==========================================

  static async getMaterials(
    companyId: string,
    options?: { branchId?: string | null; category?: string; search?: string; lowStockOnly?: boolean }
  ): Promise<MaterialRecord[]> {
    if (!companyId) return []
    return await InventoryRepository.getMaterials(companyId, options)
  }

  static async getMaterialById(id: string, companyId: string): Promise<MaterialRecord | null> {
    if (!id || !companyId) return null
    return await InventoryRepository.getMaterialById(id, companyId)
  }

  static async createMaterial(data: Partial<MaterialRecord> & {
    company_id: string
    sku: string
    name: string
    category: any
    unit: any
    actor_email?: string
  }): Promise<MaterialRecord> {
    if (!data.company_id) {
      throw new Error('Company context is required to create a material.')
    }
    const created = await InventoryRepository.createMaterial(data)

    await AuditRepository.logEvent({
      companyId: data.company_id,
      userEmail: data.actor_email || 'inventory@inkflow.com',
      action: 'inventory.material_created',
      entity: 'material',
      entityId: created.id,
      newValue: { sku: created.sku, name: created.name, unit: created.unit, category: created.category },
      description: `Created material master ${created.name} (${created.sku})`,
    })

    return created
  }

  static async updateMaterial(
    id: string,
    data: Partial<MaterialRecord>,
    companyId: string,
    actorEmail?: string
  ): Promise<MaterialRecord | null> {
    if (!id || !companyId) return null
    const updated = await InventoryRepository.updateMaterial(id, data, companyId)

    await AuditRepository.logEvent({
      companyId,
      userEmail: actorEmail || 'inventory@inkflow.com',
      action: 'inventory.material_updated',
      entity: 'material',
      entityId: id,
      newValue: data,
      description: `Updated material master ${updated.name} (${updated.sku})`,
    })

    return updated
  }

  // ==========================================
  // STOCK BALANCES & RECEIVING
  // ==========================================

  static async getStockBalances(companyId: string, options?: {
    locationId?: string
    materialId?: string
    branchId?: string | null
  }): Promise<InventoryStockBalanceRecord[]> {
    if (!companyId) return []
    return await InventoryRepository.getStockBalances(companyId, options)
  }

  /**
   * Receive physical stock or enter opening balance into location
   */
  static async receiveStock(params: {
    company_id: string
    branch_id?: string | null
    material_id: string
    location_id: string
    quantity: number
    unit_cost?: number
    is_opening_balance?: boolean
    supplier_reference?: string | null
    notes?: string | null
    performed_by_id?: string | null
    performed_by_name: string
    actor_email?: string
  }): Promise<{ material: MaterialRecord; ledgerEntry: StockLedgerRecord }> {
    if (params.quantity <= 0) {
      throw new Error('Stock receiving rejected: Quantity must be greater than zero.')
    }

    const transactionType = params.is_opening_balance ? 'opening_stock' : 'RECEIPT'
    const result = await InventoryRepository.recordStockAdjustment({
      company_id: params.company_id,
      branch_id: params.branch_id || null,
      material_id: params.material_id,
      location_id: params.location_id,
      quantity_change: Math.abs(params.quantity),
      transaction_type: transactionType,
      unit_cost: params.unit_cost,
      reference_type: params.is_opening_balance ? 'OPENING_BALANCE' : 'STOCK_RECEIPT',
      reference_id: params.supplier_reference || null,
      notes: params.notes || (params.is_opening_balance ? 'Opening balance recorded' : 'Stock received'),
      performed_by_id: params.performed_by_id || null,
      performed_by_name: params.performed_by_name,
    })

    await AuditRepository.logEvent({
      companyId: params.company_id,
      userEmail: params.actor_email || params.performed_by_name,
      action: params.is_opening_balance ? 'inventory.opening_stock' : 'inventory.receive',
      entity: 'inventory',
      entityId: params.material_id,
      newValue: {
        sku: result.material.sku,
        quantity: params.quantity,
        location_id: params.location_id,
        new_stock: result.material.current_stock,
      },
      description: `${params.is_opening_balance ? 'Recorded opening stock' : 'Received stock'} for ${result.material.name} (${result.material.sku}): +${params.quantity} ${result.material.unit}`,
    })

    return result
  }

  // ==========================================
  // TASK MATERIAL REQUIREMENTS
  // ==========================================

  static async getTaskRequirements(taskId: string, companyId: string): Promise<TaskMaterialRequirementRecord[]> {
    if (!taskId || !companyId) return []
    return await InventoryRepository.getTaskRequirements(taskId, companyId)
  }

  static async addTaskRequirement(requirement: {
    company_id: string
    production_task_id: string
    material_id: string
    estimated_quantity: number
    unit: string
    notes?: string | null
  }): Promise<TaskMaterialRequirementRecord> {
    return await InventoryRepository.addTaskRequirement(requirement)
  }

  static async removeTaskRequirement(id: string, companyId: string): Promise<boolean> {
    return await InventoryRepository.removeTaskRequirement(id, companyId)
  }

  // ==========================================
  // MATERIAL REQUESTS & APPROVALS
  // ==========================================

  static async getRequests(companyId: string, options?: {
    taskId?: string
    status?: string
    priority?: string
  }): Promise<MaterialRequestRecord[]> {
    if (!companyId) return []
    return await InventoryRepository.getRequests(companyId, options)
  }

  static async getRequestById(id: string, companyId: string): Promise<MaterialRequestRecord | null> {
    if (!id || !companyId) return null
    return await InventoryRepository.getRequestById(id, companyId)
  }

  static async createRequest(params: {
    company_id: string
    branch_id?: string | null
    production_task_id?: string | null
    destination_location_id?: string | null
    source_location_id?: string | null
    priority?: 'low' | 'normal' | 'high' | 'urgent'
    requested_by_id?: string | null
    requested_by_name: string
    notes?: string | null
    items: Array<{
      material_id: string
      requested_quantity: number
      unit: string
      notes?: string | null
    }>
    actor_email?: string
  }): Promise<MaterialRequestRecord> {
    const created = await InventoryRepository.createRequest(params)

    await AuditRepository.logEvent({
      companyId: params.company_id,
      userEmail: params.actor_email || params.requested_by_name,
      action: 'inventory.request_created',
      entity: 'material_request',
      entityId: created.id,
      newValue: { request_number: created.request_number, items_count: params.items.length },
      description: `Created material request ${created.request_number} by ${params.requested_by_name}`,
    })

    return created
  }

  static async approveRequest(
    id: string,
    companyId: string,
    approver: { id?: string | null; name: string; email?: string }
  ): Promise<MaterialRequestRecord> {
    const req = await InventoryRepository.getRequestById(id, companyId)
    if (!req) {
      throw new Error(`Material request ${id} not found.`)
    }
    if (req.status !== 'requested' && req.status !== 'draft') {
      throw new Error(`Cannot approve material request in '${req.status}' state.`)
    }

    const updated = await InventoryRepository.updateRequestStatus(id, 'approved', companyId, {
      approved_by_id: approver.id,
      approved_by_name: approver.name,
    })

    await AuditRepository.logEvent({
      companyId,
      userEmail: approver.email || approver.name,
      action: 'inventory.request_approved',
      entity: 'material_request',
      entityId: id,
      description: `Approved material request ${req.request_number} by ${approver.name}`,
    })

    return updated
  }

  static async rejectRequest(
    id: string,
    companyId: string,
    rejector: { id?: string | null; name: string; reason: string; email?: string }
  ): Promise<MaterialRequestRecord> {
    const req = await InventoryRepository.getRequestById(id, companyId)
    if (!req) {
      throw new Error(`Material request ${id} not found.`)
    }

    const updated = await InventoryRepository.updateRequestStatus(id, 'rejected', companyId, {
      approved_by_id: rejector.id,
      approved_by_name: rejector.name,
      rejection_reason: rejector.reason,
    })

    await AuditRepository.logEvent({
      companyId,
      userEmail: rejector.email || rejector.name,
      action: 'inventory.request_rejected',
      entity: 'material_request',
      entityId: id,
      description: `Rejected material request ${req.request_number}. Reason: ${rejector.reason}`,
    })

    return updated
  }

  // ==========================================
  // MATERIAL ISSUES
  // ==========================================

  static async getIssues(companyId: string, options?: {
    taskId?: string
    requestId?: string
  }): Promise<MaterialIssueRecord[]> {
    if (!companyId) return []
    return await InventoryRepository.getIssues(companyId, options)
  }

  static async getIssueById(id: string, companyId: string): Promise<MaterialIssueRecord | null> {
    if (!id || !companyId) return null
    return await InventoryRepository.getIssueById(id, companyId)
  }

  static async issueMaterial(params: {
    company_id: string
    branch_id?: string | null
    request_id?: string | null
    production_task_id?: string | null
    source_location_id: string
    destination_location_id?: string | null
    issued_by_id?: string | null
    issued_by_name: string
    received_by_name?: string | null
    notes?: string | null
    items: Array<{
      request_item_id?: string | null
      material_id: string
      issued_quantity: number
      unit: string
      unit_cost?: number
    }>
    actor_email?: string
  }): Promise<MaterialIssueRecord> {
    if (!params.items || params.items.length === 0) {
      throw new Error('Issue rejected: At least one item is required to issue material.')
    }

    const created = await InventoryRepository.createIssue(params)

    await AuditRepository.logEvent({
      companyId: params.company_id,
      userEmail: params.actor_email || params.issued_by_name,
      action: 'inventory.material_issued',
      entity: 'material_issue',
      entityId: created.id,
      newValue: {
        issue_number: created.issue_number,
        source_location: params.source_location_id,
        items_count: params.items.length,
      },
      description: `Issued materials under ${created.issue_number} to Task ${params.production_task_id || 'Direct'}`,
    })

    return created
  }

  // ==========================================
  // CONSUMPTION & SCRAP SIGN-OFF
  // ==========================================

  /**
   * Records production consumption sign-off:
   * Consumed stock, scrap/wastage with reason, reusable remnants ($W \times L$), and unused return to store
   */
  static async logProductionConsumption(params: {
    company_id: string
    branch_id?: string | null
    production_task_id: string
    material_id: string
    consumed_quantity: number
    unit: string
    location_id?: string | null
    returned_quantity?: number
    return_location_id?: string | null
    wastage_quantity?: number
    wastage_reason?: string | null
    remnants?: Array<{
      width: number
      length: number
      dimension_unit?: string
      quantity?: number
      location_id: string
      condition?: 'excellent' | 'usable' | 'minor_defect'
      notes?: string | null
    }>
    actor_id?: string | null
    actor_name: string
    actor_email?: string
  }): Promise<{ success: boolean; remnantsCreated: number }> {
    const material = await InventoryRepository.getMaterialById(params.material_id, params.company_id)
    if (!material) {
      throw new Error(`Material ${params.material_id} not found.`)
    }

    // 1. Log Consumption in Stock Ledger
    if (params.consumed_quantity > 0) {
      await InventoryRepository.recordStockAdjustment({
        company_id: params.company_id,
        branch_id: params.branch_id || null,
        material_id: params.material_id,
        location_id: params.location_id || null,
        quantity_change: 0, // Already deducted at issue stage; logs consumption audit
        transaction_type: 'CONSUMPTION',
        reference_type: 'PRODUCTION_CONSUMPTION',
        production_task_id: params.production_task_id,
        notes: `Production Task ${params.production_task_id} consumed ${params.consumed_quantity} ${params.unit}`,
        performed_by_id: params.actor_id,
        performed_by_name: params.actor_name,
      })
    }

    // 2. Unused Material Return to Store Location
    if (params.returned_quantity && params.returned_quantity > 0 && params.return_location_id) {
      await InventoryRepository.recordStockAdjustment({
        company_id: params.company_id,
        branch_id: params.branch_id || null,
        material_id: params.material_id,
        location_id: params.return_location_id,
        quantity_change: Math.abs(params.returned_quantity),
        transaction_type: 'RETURN',
        reference_type: 'PRODUCTION_RETURN',
        production_task_id: params.production_task_id,
        notes: `Unused material returned from Task ${params.production_task_id}: +${params.returned_quantity} ${params.unit}`,
        performed_by_id: params.actor_id,
        performed_by_name: params.actor_name,
      })
    }

    // 3. Scrap / Wastage Logging
    if (params.wastage_quantity && params.wastage_quantity > 0) {
      await InventoryRepository.recordStockAdjustment({
        company_id: params.company_id,
        branch_id: params.branch_id || null,
        material_id: params.material_id,
        location_id: params.location_id || null,
        quantity_change: 0,
        transaction_type: 'WASTAGE',
        reference_type: 'PRODUCTION_WASTAGE',
        production_task_id: params.production_task_id,
        notes: `Production Scrap logged: ${params.wastage_quantity} ${params.unit}. Reason: ${params.wastage_reason || 'Cutting/Print Loss'}`,
        performed_by_id: params.actor_id,
        performed_by_name: params.actor_name,
      })
    }

    // 4. Create Reusable Remnants
    let remnantsCount = 0
    if (params.remnants && params.remnants.length > 0) {
      for (const rem of params.remnants) {
        await InventoryRepository.createRemnant({
          company_id: params.company_id,
          branch_id: params.branch_id || null,
          parent_material_id: params.material_id,
          production_task_id: params.production_task_id,
          location_id: rem.location_id,
          width: rem.width,
          length: rem.length,
          dimension_unit: rem.dimension_unit || 'ft',
          quantity: rem.quantity || 1,
          condition: rem.condition || 'usable',
          notes: rem.notes || null,
          created_by_name: params.actor_name,
        })
        remnantsCount++
      }
    }

    await AuditRepository.logEvent({
      companyId: params.company_id,
      userEmail: params.actor_email || params.actor_name,
      action: 'inventory.consumption_logged',
      entity: 'production_task',
      entityId: params.production_task_id,
      newValue: {
        material_id: params.material_id,
        consumed: params.consumed_quantity,
        returned: params.returned_quantity || 0,
        wastage: params.wastage_quantity || 0,
        remnants_created: remnantsCount,
      },
      description: `Logged consumption for ${material.name} on Task ${params.production_task_id}`,
    })

    return { success: true, remnantsCreated: remnantsCount }
  }

  // ==========================================
  // REMNANTS & TRANSFERS & ADJUSTMENTS
  // ==========================================

  static async getRemnants(companyId: string, options?: {
    materialId?: string
    status?: string
    locationId?: string
  }): Promise<InventoryRemnantRecord[]> {
    if (!companyId) return []
    return await InventoryRepository.getRemnants(companyId, options)
  }

  static async getRemnantById(id: string, companyId: string): Promise<InventoryRemnantRecord | null> {
    if (!id || !companyId) return null
    return await InventoryRepository.getRemnantById(id, companyId)
  }

  static async createRemnant(params: {
    company_id: string
    branch_id?: string | null
    parent_material_id: string
    production_task_id?: string | null
    location_id: string
    width: number
    length: number
    dimension_unit?: string
    quantity?: number
    unit?: string
    condition?: 'excellent' | 'usable' | 'minor_defect'
    notes?: string | null
    created_by_name: string
  }): Promise<InventoryRemnantRecord> {
    return await InventoryRepository.createRemnant(params)
  }

  static async updateRemnantStatus(
    id: string,
    status: 'available' | 'reserved' | 'consumed' | 'scrapped',
    companyId: string
  ): Promise<InventoryRemnantRecord> {
    return await InventoryRepository.updateRemnantStatus(id, status, companyId)
  }

  static async getTransfers(companyId: string): Promise<InventoryTransferRecord[]> {
    if (!companyId) return []
    return await InventoryRepository.getTransfers(companyId)
  }

  static async transferStock(params: {
    company_id: string
    source_branch_id?: string | null
    source_location_id: string
    destination_branch_id?: string | null
    destination_location_id: string
    material_id: string
    quantity: number
    unit: string
    reason?: string | null
    transferred_by_name: string
    actor_email?: string
  }): Promise<InventoryTransferRecord> {
    const created = await InventoryRepository.createTransfer(params)

    await AuditRepository.logEvent({
      companyId: params.company_id,
      userEmail: params.actor_email || params.transferred_by_name,
      action: 'inventory.stock_transfer',
      entity: 'inventory_transfer',
      entityId: created.id,
      newValue: {
        transfer_number: created.transfer_number,
        quantity: params.quantity,
        source: params.source_location_id,
        destination: params.destination_location_id,
      },
      description: `Transferred ${params.quantity} ${params.unit} via ${created.transfer_number}`,
    })

    return created
  }

  static async getAdjustments(companyId: string): Promise<InventoryAdjustmentRecord[]> {
    if (!companyId) return []
    return await InventoryRepository.getAdjustments(companyId)
  }

  static async createAdjustment(params: {
    company_id: string
    branch_id?: string | null
    location_id: string
    material_id: string
    adjustment_type: 'physical_count' | 'damage_discovered' | 'data_correction' | 'opening_balance' | 'other'
    new_quantity: number
    reason: string
    authorized_by_name: string
    actor_email?: string
  }): Promise<InventoryAdjustmentRecord> {
    const created = await InventoryRepository.createAdjustment(params)

    await AuditRepository.logEvent({
      companyId: params.company_id,
      userEmail: params.actor_email || params.authorized_by_name,
      action: 'inventory.stock_adjustment',
      entity: 'inventory_adjustment',
      entityId: created.id,
      newValue: {
        adjustment_number: created.adjustment_number,
        previous_quantity: created.previous_quantity,
        new_quantity: created.new_quantity,
        variance: created.variance_quantity,
        reason: params.reason,
      },
      description: `Stock adjusted via ${created.adjustment_number}: ${created.variance_quantity > 0 ? '+' : ''}${created.variance_quantity} ${created.unit}. Reason: ${params.reason}`,
    })

    return created
  }

  // ==========================================
  // STOCK LEDGER & KPIS
  // ==========================================

  static async getStockLedger(companyId: string, materialId?: string): Promise<StockLedgerRecord[]> {
    if (!companyId) return []
    return await InventoryRepository.getStockLedger(companyId, materialId)
  }

  static async getInventoryRolls(companyId: string): Promise<InventoryRollRecord[]> {
    if (!companyId) return []
    return await InventoryRepository.getInventoryRolls(companyId)
  }

  static async mountRollToMachine(params: {
    company_id: string
    roll_id: string
    machine_id: string
    machine_name: string
    operator_name?: string
  }): Promise<InventoryRollRecord> {
    return await InventoryRepository.mountRollToMachine(params)
  }

  static async unmountRollFromMachine(params: {
    company_id: string
    roll_id: string
    machine_id?: string
  }): Promise<InventoryRollRecord> {
    return await InventoryRepository.unmountRollFromMachine(params)
  }

  static async recordStockAdjustment(params: {
    company_id: string
    branch_id?: string | null
    material_id: string
    location_id?: string | null
    quantity_change: number
    reason?: string
    notes?: string
    performed_by_name: string
    entry_type?: any
    cost_per_unit?: number
    reference_id?: string
  }): Promise<StockLedgerRecord> {
    const result = await InventoryRepository.recordStockAdjustment({
      company_id: params.company_id,
      branch_id: params.branch_id || null,
      material_id: params.material_id,
      location_id: params.location_id || null,
      quantity_change: params.quantity_change,
      transaction_type: params.quantity_change >= 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
      unit_cost: params.cost_per_unit,
      reference_id: params.reference_id,
      notes: params.notes || params.reason,
      performed_by_name: params.performed_by_name,
    })
    return result.ledgerEntry
  }

  static async getInventorySummary(companyId: string): Promise<InventorySummaryStats> {
    if (!companyId) {
      return {
        totalMaterials: 0,
        totalAvailableStockValue: 0,
        lowStockCount: 0,
        pendingRequestsCount: 0,
        totalRemnantsCount: 0,
        totalWastageRecordsCount: 0,
      }
    }

    const [materials, requests, remnants, ledger] = await Promise.all([
      InventoryRepository.getMaterials(companyId),
      InventoryRepository.getRequests(companyId, { status: 'requested' }),
      InventoryRepository.getRemnants(companyId, { status: 'available' }),
      InventoryRepository.getStockLedger(companyId),
    ])

    const lowStockCount = materials.filter((m) => {
      const threshold = Number(m.reorder_level || m.min_stock_level || 0)
      return threshold > 0 && Number(m.current_stock || 0) <= threshold
    }).length

    const totalValue = materials.reduce((sum, m) => {
      const stock = Number(m.current_stock || 0)
      const cost = Number(m.average_cost || m.last_purchase_price || 0)
      return sum + (stock > 0 ? stock * cost : 0)
    }, 0)

    const wastageCount = ledger.filter((l) => l.transaction_type === 'WASTAGE' || l.transaction_type === 'wastage').length

    return {
      totalMaterials: materials.length,
      totalAvailableStockValue: totalValue,
      lowStockCount,
      pendingRequestsCount: requests.length,
      totalRemnantsCount: remnants.length,
      totalWastageRecordsCount: wastageCount,
    }
  }
}
