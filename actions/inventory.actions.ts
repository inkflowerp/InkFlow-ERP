'use server'

import { revalidatePath } from 'next/cache'
import { InventoryService } from '@/services/inventory.service'
import { AuditService } from '@/services/audit.service'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'
import { PurchaseService } from '@/services/purchase.service'
import { ProductRepository } from '@/lib/repositories/product.repository'
import { EntitlementService } from '@/services/entitlement.service'
import {
  MaterialRecord,
  InventoryLocationRecord,
  MaterialRequestRecord,
  MaterialIssueRecord,
  FloorConsumptionRecord,
  InventoryRemnantRecord,
  InventoryTransferRecord,
  InventoryAdjustmentRecord,
  StockLedgerRecord,
  TaskMaterialRequirementRecord,
  InventoryRollRecord,
  RollFeedCalculationInput,
  RollFeedCalculationResult,
  IssueMasterRollParams,
  IssueMasterRollResult,
} from '@/types/inventory.types'
import { RollConsumptionEngine } from '@/lib/domain/roll-consumption-engine'
import type { PurchaseOrderRecord, GoodsReceivedNoteRecord } from '@/types/purchase.types'
import type {
  PriceIntelligenceRecord,
  PriceIntelligenceSummary,
  MasterPhysicalClassification,
} from '@/types/price-intelligence.types'

export interface ServerActionResult<T> {
  success: boolean
  data?: T
  error?: string
}

function checkInventoryPermission(tenant: any, requiredPerm: string): boolean {
  if (!tenant) return false
  if (tenant.companyRole === 'business_owner' || tenant.companyRole === 'admin') return true
  if (tenant.permissions?.includes('inventory.manage')) return true
  if (tenant.permissions?.includes(requiredPerm)) return true
  return false
}

// ==========================================
// MATERIAL MASTER ACTIONS
// ==========================================

export async function createMaterialAction(
  data: Partial<MaterialRecord> & {
    sku: string
    name: string
    category: any
    unit: any
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<MaterialRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    // Enforce Plan Inventory Feature Entitlement
    await EntitlementService.enforceFeature(companyId, 'inventory')

    if (!checkInventoryPermission(tenant, 'inventory.create') && !checkInventoryPermission(tenant, 'inventory.edit')) {
      return { success: false, error: 'Unauthorized: You do not have permission to create materials.' }
    }

    if (!data.sku?.trim() || !data.name?.trim()) {
      return { success: false, error: 'Material SKU and Name are required.' }
    }

    const material = await InventoryService.createMaterial({
      ...data,
      company_id: companyId,
      branch_id: tenant.branchId || null,
      actor_email: tenant.userEmail,
    })

    revalidatePath('/[tenantSlug]/inventory', 'page')
    return { success: true, data: material }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create material' }
  }
}

export async function updateMaterialAction(
  id: string,
  updates: Partial<MaterialRecord>,
  requestedCompanyId?: string
): Promise<ServerActionResult<MaterialRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    if (!checkInventoryPermission(tenant, 'inventory.edit')) {
      return { success: false, error: 'Unauthorized: You do not have permission to edit materials.' }
    }

    const updated = await InventoryService.updateMaterial(id, updates, companyId, tenant.userEmail)
    if (!updated) {
      return { success: false, error: 'Material not found.' }
    }

    revalidatePath('/[tenantSlug]/inventory', 'page')
    return { success: true, data: updated }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update material' }
  }
}

export async function getMaterialsAction(
  requestedCompanyId?: string,
  options?: {
    branchId?: string | null
    category?: string
    search?: string
    lowStockOnly?: boolean
  }
): Promise<ServerActionResult<MaterialRecord[]>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId
    const data = await InventoryService.getMaterials(companyId, options)
    return { success: true, data: data || [] }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch materials' }
  }
}

// ==========================================
// LOCATION ACTIONS
// ==========================================

export async function createLocationAction(
  location: {
    location_code: string
    location_name: string
    location_type: string
    description?: string | null
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<InventoryLocationRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    if (!checkInventoryPermission(tenant, 'inventory.manage') && !checkInventoryPermission(tenant, 'inventory.create')) {
      return { success: false, error: 'Unauthorized: You do not have permission to manage inventory locations.' }
    }

    const created = await InventoryService.createLocation({
      ...location,
      company_id: companyId,
      branch_id: tenant.branchId || null,
    })

    revalidatePath('/[tenantSlug]/inventory', 'page')
    return { success: true, data: created }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create location' }
  }
}

// ==========================================
// STOCK RECEIPT & OPENING BALANCE ACTIONS
// ==========================================

export async function receiveStockAction(
  params: {
    material_id: string
    location_id: string
    quantity: number
    unit_cost?: number
    is_opening_balance?: boolean
    supplier_reference?: string | null
    supplier_id?: string | null
    supplier_name?: string | null
    size_label?: string | null
    width_ft?: number | null
    length_ft?: number | null
    physical_form?: MasterPhysicalClassification
    purchase_unit?: string | null
    challan_number?: string | null
    supplier_invoice_number?: string | null
    batch_lot_number?: string | null
    purchase_date?: string | null
    notes?: string | null
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<{ material: MaterialRecord; ledgerEntry: StockLedgerRecord; rollsCreated?: InventoryRollRecord[] }>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    if (!checkInventoryPermission(tenant, 'inventory.create') && !checkInventoryPermission(tenant, 'inventory.adjust')) {
      return { success: false, error: 'Unauthorized: You do not have permission to receive stock.' }
    }

    const result = await InventoryService.receiveStock({
      ...params,
      company_id: companyId,
      branch_id: tenant.branchId || null,
      performed_by_id: tenant.userId,
      performed_by_name: tenant.fullName || 'Store Keeper',
      actor_email: tenant.userEmail,
    })

    revalidatePath('/[tenantSlug]/inventory', 'page')
    return { success: true, data: result }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to receive stock' }
  }
}

export async function getPriceIntelligenceAction(
  materialId: string,
  sizeLabel?: string,
  currentPrice?: number,
  supplierId?: string | null,
  requestedCompanyId?: string
): Promise<ServerActionResult<PriceIntelligenceSummary | null>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const summary = await InventoryService.getPriceIntelligence(
      materialId,
      companyId,
      sizeLabel,
      currentPrice,
      supplierId
    )
    return { success: true, data: summary }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch price intelligence' }
  }
}

// ==========================================
// MATERIAL REQUEST ACTIONS
// ==========================================

export async function createMaterialRequestAction(
  params: {
    production_task_id?: string | null
    destination_location_id?: string | null
    source_location_id?: string | null
    priority?: 'low' | 'normal' | 'high' | 'urgent'
    notes?: string | null
    items: Array<{
      material_id: string
      requested_quantity: number
      unit: string
      notes?: string | null
    }>
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<MaterialRequestRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const request = await InventoryService.createRequest({
      ...params,
      company_id: companyId,
      branch_id: tenant.branchId || null,
      requested_by_id: tenant.userId,
      requested_by_name: tenant.fullName || 'Operator',
      actor_email: tenant.userEmail,
    })

    revalidatePath('/[tenantSlug]/inventory', 'page')
    revalidatePath('/[tenantSlug]/production', 'page')
    return { success: true, data: request }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create material request' }
  }
}

export async function approveMaterialRequestAction(
  requestId: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<MaterialRequestRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    if (!checkInventoryPermission(tenant, 'inventory.approve') && !checkInventoryPermission(tenant, 'inventory.manage')) {
      return { success: false, error: 'Unauthorized: You do not have permission to approve material requests.' }
    }

    const approved = await InventoryService.approveRequest(requestId, companyId, {
      id: tenant.userId,
      name: tenant.fullName || 'Store Manager',
      email: tenant.userEmail,
    })

    revalidatePath('/[tenantSlug]/inventory', 'page')
    return { success: true, data: approved }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to approve material request' }
  }
}

export async function rejectMaterialRequestAction(
  requestId: string,
  reason: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<MaterialRequestRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    if (!checkInventoryPermission(tenant, 'inventory.approve') && !checkInventoryPermission(tenant, 'inventory.manage')) {
      return { success: false, error: 'Unauthorized: You do not have permission to reject material requests.' }
    }

    const rejected = await InventoryService.rejectRequest(requestId, companyId, {
      id: tenant.userId,
      name: tenant.fullName || 'Store Manager',
      reason,
      email: tenant.userEmail,
    })

    revalidatePath('/[tenantSlug]/inventory', 'page')
    return { success: true, data: rejected }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to reject material request' }
  }
}

// ==========================================
// MATERIAL ISSUE ACTIONS
// ==========================================

export async function issueMaterialAction(
  params: {
    request_id?: string | null
    production_task_id?: string | null
    source_location_id: string
    destination_location_id?: string | null
    received_by_name?: string | null
    notes?: string | null
    items: Array<{
      request_item_id?: string | null
      material_id: string
      issued_quantity: number
      unit: string
      unit_cost?: number
    }>
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<MaterialIssueRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    if (!checkInventoryPermission(tenant, 'inventory.issue') && !checkInventoryPermission(tenant, 'inventory.manage')) {
      return { success: false, error: 'Unauthorized: You do not have permission to issue materials.' }
    }

    const issue = await InventoryService.issueMaterial({
      ...params,
      company_id: companyId,
      branch_id: tenant.branchId || null,
      issued_by_id: tenant.userId,
      issued_by_name: tenant.fullName || 'Store Keeper',
      actor_email: tenant.userEmail,
    })

    revalidatePath('/[tenantSlug]/inventory', 'page')
    revalidatePath('/[tenantSlug]/production', 'page')
    return { success: true, data: issue }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to issue material' }
  }
}

// ==========================================
// CONSUMPTION & SCRAP SIGN-OFF ACTIONS
// ==========================================

export async function logProductionConsumptionAction(
  params: {
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
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<{ remnantsCreated: number }>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const result = await InventoryService.logProductionConsumption({
      ...params,
      company_id: companyId,
      branch_id: tenant.branchId || null,
      actor_id: tenant.userId,
      actor_name: tenant.fullName || 'Operator',
      actor_email: tenant.userEmail,
    })

    revalidatePath('/[tenantSlug]/inventory', 'page')
    revalidatePath('/[tenantSlug]/production', 'page')
    revalidatePath('/[tenantSlug]/operator', 'page')
    return { success: true, data: { remnantsCreated: result.remnantsCreated } }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to log production consumption' }
  }
}

// ==========================================
// PRINT FLOOR CONSUMPTION UNIT ACTIONS
// ==========================================

export async function getFloorConsumptionsAction(
  options?: { machineId?: string; status?: string; search?: string },
  requestedCompanyId?: string
): Promise<ServerActionResult<FloorConsumptionRecord[]>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const data = await InventoryService.getFloorConsumptions(companyId, options)
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to load floor consumptions' }
  }
}

export async function logFloorConsumptionAction(
  params: {
    issue_id?: string | null
    issue_item_id?: string | null
    material_id: string
    consumed_quantity: number
    unit: string
    wastage_quantity?: number
    wastage_reason?: string | null
    returned_quantity?: number
    return_location_id?: string | null
    machine_id?: string | null
    machine_name?: string | null
    job_reference?: string | null
    production_task_id?: string | null
    operator_name?: string
    operator_id?: string | null
    remnants?: Array<{
      width: number
      length: number
      dimension_unit?: string
      quantity?: number
      location_id: string
      condition?: 'excellent' | 'usable' | 'minor_defect'
      notes?: string | null
    }>
    notes?: string | null
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<FloorConsumptionRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const result = await InventoryService.logFloorConsumption({
      ...params,
      company_id: companyId,
      branch_id: tenant.branchId || null,
      operator_id: params.operator_id || tenant.userId,
      operator_name: params.operator_name || tenant.fullName || 'Operator',
      actor_email: tenant.userEmail,
    })

    revalidatePath('/[tenantSlug]/inventory', 'page')
    revalidatePath('/[tenantSlug]/production', 'page')
    return { success: true, data: result.floorRecord }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to log floor consumption' }
  }
}

export async function returnFloorStockToStoreAction(
  params: {
    issue_id: string
    material_id: string
    quantity: number
    return_location_id: string
    notes?: string | null
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<{ remainingFloorBalance: number }>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const result = await InventoryService.returnFloorStockToStore({
      ...params,
      company_id: companyId,
      operator_name: tenant.fullName || 'Store Keeper',
      actor_email: tenant.userEmail,
    })

    revalidatePath('/[tenantSlug]/inventory', 'page')
    return { success: true, data: result }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to return floor stock to store' }
  }
}

// ==========================================
// REMNANTS & TRANSFERS & ADJUSTMENT ACTIONS
// ==========================================

export async function createRemnantAction(
  params: {
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
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<InventoryRemnantRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const remnant = await InventoryService.createRemnant({
      ...params,
      company_id: companyId,
      branch_id: tenant.branchId || null,
      created_by_name: tenant.fullName || 'Store Operator',
    })

    revalidatePath('/[tenantSlug]/inventory', 'page')
    return { success: true, data: remnant }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create remnant' }
  }
}

export async function updateRemnantStatusAction(
  id: string,
  status: 'available' | 'reserved' | 'consumed' | 'scrapped',
  requestedCompanyId?: string
): Promise<ServerActionResult<InventoryRemnantRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const remnant = await InventoryService.updateRemnantStatus(id, status, companyId)
    revalidatePath('/[tenantSlug]/inventory', 'page')
    return { success: true, data: remnant }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update remnant status' }
  }
}

export async function transferStockAction(
  params: {
    source_location_id: string
    destination_location_id: string
    material_id: string
    quantity: number
    unit: string
    reason?: string | null
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<InventoryTransferRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    if (!checkInventoryPermission(tenant, 'inventory.transfer') && !checkInventoryPermission(tenant, 'inventory.manage')) {
      return { success: false, error: 'Unauthorized: You do not have permission to transfer inventory.' }
    }

    const transfer = await InventoryService.transferStock({
      ...params,
      company_id: companyId,
      transferred_by_name: tenant.fullName || 'Store Keeper',
      actor_email: tenant.userEmail,
    })

    revalidatePath('/[tenantSlug]/inventory', 'page')
    return { success: true, data: transfer }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to transfer stock' }
  }
}

export async function adjustStockAction(
  adjustment: {
    material_id: string
    location_id?: string
    quantity_change?: number
    new_quantity?: number
    reason: string
    entry_type?: any
    cost_per_unit?: number
    reference_id?: string
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<any>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    if (!checkInventoryPermission(tenant, 'inventory.adjust') && !checkInventoryPermission(tenant, 'inventory.manage')) {
      return { success: false, error: 'Unauthorized: You do not have permission to adjust inventory stock.' }
    }

    if (!adjustment.material_id) {
      return { success: false, error: 'Material ID is required.' }
    }

    if (!adjustment.reason || adjustment.reason.trim().length < 3) {
      return { success: false, error: 'A clear reason is required for stock adjustment.' }
    }

    if (adjustment.new_quantity !== undefined && adjustment.location_id) {
      const adjRecord = await InventoryService.createAdjustment({
        company_id: companyId,
        branch_id: tenant.branchId || null,
        location_id: adjustment.location_id,
        material_id: adjustment.material_id,
        adjustment_type: 'physical_count',
        new_quantity: adjustment.new_quantity,
        reason: adjustment.reason,
        authorized_by_name: tenant.fullName || 'Store Manager',
        actor_email: tenant.userEmail,
      })
      revalidatePath('/[tenantSlug]/inventory', 'page')
      return { success: true, data: adjRecord }
    }

    const ledgerEntry = await InventoryService.recordStockAdjustment({
      company_id: companyId,
      branch_id: tenant.branchId || null,
      material_id: adjustment.material_id,
      location_id: adjustment.location_id || null,
      quantity_change: adjustment.quantity_change || 0,
      reason: adjustment.reason,
      performed_by_name: tenant.fullName || 'Store Manager',
      entry_type: adjustment.entry_type || 'manual_correction',
      cost_per_unit: adjustment.cost_per_unit,
      reference_id: adjustment.reference_id,
    })

    revalidatePath('/[tenantSlug]/inventory', 'page')
    return { success: true, data: ledgerEntry }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to adjust inventory stock' }
  }
}

// ==========================================
// TASK REQUIREMENT ACTIONS
// ==========================================

export async function addTaskRequirementAction(
  requirement: {
    production_task_id: string
    material_id: string
    estimated_quantity: number
    unit: string
    notes?: string | null
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<TaskMaterialRequirementRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const req = await InventoryService.addTaskRequirement({
      ...requirement,
      company_id: companyId,
    })

    revalidatePath('/[tenantSlug]/production', 'page')
    return { success: true, data: req }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to add task material requirement' }
  }
}

export async function removeTaskRequirementAction(
  id: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<boolean>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const removed = await InventoryService.removeTaskRequirement(id, companyId)
    revalidatePath('/[tenantSlug]/production', 'page')
    return { success: true, data: removed }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to remove requirement' }
  }
}

// ==========================================
// PHYSICAL ROLL MOUNT / UNMOUNT ACTIONS
// ==========================================

export async function mountRollToMachineAction(
  params: {
    roll_id: string
    machine_id: string
    machine_name: string
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<InventoryRollRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const roll = await InventoryService.mountRollToMachine({
      company_id: companyId,
      roll_id: params.roll_id,
      machine_id: params.machine_id,
      machine_name: params.machine_name,
      operator_name: tenant.fullName || tenant.userEmail || 'Operator',
    })

    revalidatePath('/[tenantSlug]/inventory', 'page')
    revalidatePath('/[tenantSlug]/production', 'page')
    revalidatePath('/[tenantSlug]/machinery', 'page')
    return { success: true, data: roll }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to mount roll to machine' }
  }
}

export async function unmountRollFromMachineAction(
  params: {
    roll_id: string
    machine_id?: string
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<InventoryRollRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const roll = await InventoryService.unmountRollFromMachine({
      company_id: companyId,
      roll_id: params.roll_id,
      machine_id: params.machine_id,
    })

    revalidatePath('/[tenantSlug]/inventory', 'page')
    revalidatePath('/[tenantSlug]/production', 'page')
    revalidatePath('/[tenantSlug]/machinery', 'page')
    return { success: true, data: roll }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to unmount roll from machine' }
  }
}

/**
 * Server Action: Deterministic roll feed, bleed, and wastage calculation
 */
export async function calculateRollFeedAction(
  input: RollFeedCalculationInput
): Promise<ServerActionResult<RollFeedCalculationResult>> {
  try {
    const result = RollConsumptionEngine.calculateRollLinearFeed(input)
    return { success: true, data: result }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to calculate roll feed' }
  }
}

/**
 * Server Action: Consume linear length from a physical roll with bleed allowance and scrap/wastage logging
 */
export async function consumeRollWithBleedAndWastageAction(
  params: {
    roll_id: string
    linear_length_consumed_ft: number
    bleed_allowance_ft?: number
    wastage_length_ft?: number
    wastage_reason?: string | null
    production_task_id?: string | null
    job_order_id?: string | null
    offcut_remnant?: {
      create_remnant: boolean
      width_ft?: number
      length_ft?: number
      location_id?: string
      condition?: 'excellent' | 'usable' | 'minor_defect'
      notes?: string | null
    }
    notes?: string | null
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<{ roll: InventoryRollRecord; remnant?: InventoryRemnantRecord | null; totalDeductedFt: number }>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const result = await InventoryService.consumeFromPhysicalRoll({
      ...params,
      company_id: companyId,
      operator_name: tenant.fullName || tenant.userEmail || 'Floor Operator',
      actor_email: tenant.userEmail,
    })

    revalidatePath('/[tenantSlug]/inventory', 'page')
    revalidatePath('/[tenantSlug]/production', 'page')
    revalidatePath('/[tenantSlug]/operator', 'page')
    revalidatePath('/[tenantSlug]/machinery', 'page')

    return { success: true, data: result }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to consume from roll' }
  }
}

/**
 * Server Action: Requisition and mount/issue a brand new physical master roll directly to the print floor
 */
export async function requestAndIssueFloorRollAction(
  params: IssueMasterRollParams,
  requestedCompanyId?: string
): Promise<ServerActionResult<InventoryRollRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const roll = await InventoryService.requestAndIssueNewRollToFloor({
      ...params,
      company_id: companyId,
      branch_id: tenant.branchId || null,
      operator_name: params.operator_name || tenant.fullName || tenant.userEmail || 'Floor Operator',
      actor_email: tenant.userEmail,
    })

    revalidatePath('/[tenantSlug]/inventory', 'page')
    revalidatePath('/[tenantSlug]/production', 'page')
    revalidatePath('/[tenantSlug]/operator', 'page')
    revalidatePath('/[tenantSlug]/machinery', 'page')

    return { success: true, data: roll }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to request new floor roll' }
  }
}

/**
 * Server Action: Requisition and issue batch master rolls to print floor with complete telemetry
 */
export async function issueMasterRollsBatchAction(
  params: IssueMasterRollParams,
  requestedCompanyId?: string
): Promise<ServerActionResult<IssueMasterRollResult>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const result = await InventoryService.issueMasterRollsBatch({
      ...params,
      company_id: companyId,
      branch_id: tenant.branchId || null,
      operator_name: params.operator_name || tenant.fullName || tenant.userEmail || 'Floor Operator',
      actor_email: tenant.userEmail,
    })

    revalidatePath('/[tenantSlug]/inventory', 'page')
    revalidatePath('/[tenantSlug]/production', 'page')
    revalidatePath('/[tenantSlug]/operator', 'page')
    revalidatePath('/[tenantSlug]/machinery', 'page')

    return { success: true, data: result }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to issue master rolls batch' }
  }
}

/**
 * Server Action: Get all physical rolls in inventory/floor
 */
export async function getInventoryRollsAction(
  requestedCompanyId?: string
): Promise<ServerActionResult<InventoryRollRecord[]>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const rolls = await InventoryService.getInventoryRolls(companyId)
    return { success: true, data: rolls }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch rolls' }
  }
}

export interface InventoryDashboardData {
  materials: MaterialRecord[]
  locations: InventoryLocationRecord[]
  balances: any[]
  requests: MaterialRequestRecord[]
  issues: MaterialIssueRecord[]
  floorConsumptions: FloorConsumptionRecord[]
  remnants: InventoryRemnantRecord[]
  ledger: StockLedgerRecord[]
  rolls: InventoryRollRecord[]
  orders: PurchaseOrderRecord[]
  goodsReceivedNotes: GoodsReceivedNoteRecord[]
  readyProducts: any[]
  summary: any
}

/**
 * Server Action: Load all inventory dashboard data
 */
export async function getInventoryDashboardDataAction(
  requestedCompanyId?: string
): Promise<ServerActionResult<InventoryDashboardData>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const [matData, locData, balData, reqData, issData, floorData, remData, ledData, sumData, rollsData, posData, grnData, prodsData] = await Promise.all([
      InventoryService.getMaterials(companyId).catch(() => []),
      InventoryService.getLocations(companyId).catch(() => []),
      InventoryService.getStockBalances(companyId).catch(() => []),
      InventoryService.getRequests(companyId).catch(() => []),
      InventoryService.getIssues(companyId).catch(() => []),
      InventoryService.getFloorConsumptions(companyId).catch(() => []),
      InventoryService.getRemnants(companyId).catch(() => []),
      InventoryService.getStockLedger(companyId).catch(() => []),
      InventoryService.getInventorySummary(companyId).catch(() => ({})),
      InventoryService.getInventoryRolls(companyId).catch(() => []),
      PurchaseService.getPurchaseOrders(companyId).catch(() => []),
      PurchaseService.getGoodsReceivedNotes(companyId).catch(() => []),
      ProductRepository.getProducts(companyId, false, 'all').catch(() => []),
    ])

    return {
      success: true,
      data: {
        materials: matData || [],
        locations: locData || [],
        balances: balData || [],
        requests: reqData || [],
        issues: issData || [],
        floorConsumptions: floorData || [],
        remnants: remData || [],
        ledger: ledData || [],
        rolls: rollsData || [],
        orders: posData || [],
        goodsReceivedNotes: grnData || [],
        readyProducts: prodsData || [],
        summary: sumData,
      },
    }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to load inventory dashboard data.' }
  }
}

export interface MaterialFullDetails {
  material: MaterialRecord | null
  locations: InventoryLocationRecord[]
  balances: any[]
  remnants: InventoryRemnantRecord[]
  ledger: StockLedgerRecord[]
}

/**
 * Server Action: Load single material details
 */
export async function getMaterialDetailsAction(
  materialId: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<MaterialFullDetails>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const [mat, locs, bals, rems, led] = await Promise.all([
      InventoryService.getMaterialById(materialId, companyId),
      InventoryService.getLocations(companyId),
      InventoryService.getStockBalances(companyId, { materialId }),
      InventoryService.getRemnants(companyId, { materialId }),
      InventoryService.getStockLedger(companyId, materialId),
    ])

    return {
      success: true,
      data: {
        material: mat,
        locations: locs || [],
        balances: bals || [],
        remnants: rems || [],
        ledger: led || [],
      },
    }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to load material details.' }
  }
}
