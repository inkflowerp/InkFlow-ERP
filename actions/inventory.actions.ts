'use server'

import { revalidatePath } from 'next/cache'
import { InventoryService } from '@/services/inventory.service'
import { AuditService } from '@/services/audit.service'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'
import { PurchaseService } from '@/services/purchase.service'
import { ProductRepository } from '@/lib/repositories/product.repository'
import {
  MaterialRecord,
  InventoryLocationRecord,
  MaterialRequestRecord,
  MaterialIssueRecord,
  InventoryRemnantRecord,
  InventoryTransferRecord,
  InventoryAdjustmentRecord,
  StockLedgerRecord,
  TaskMaterialRequirementRecord,
  InventoryRollRecord,
} from '@/types/inventory.types'
import type { PurchaseOrderRecord, GoodsReceivedNoteRecord } from '@/types/purchase.types'

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

import { EntitlementService } from '@/services/entitlement.service'

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
    notes?: string | null
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<{ material: MaterialRecord; ledgerEntry: StockLedgerRecord }>> {
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

export interface InventoryDashboardData {
  materials: MaterialRecord[]
  locations: InventoryLocationRecord[]
  balances: any[]
  requests: MaterialRequestRecord[]
  issues: MaterialIssueRecord[]
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

    const [matData, locData, balData, reqData, issData, remData, ledData, sumData, rollsData, posData, grnData, prodsData] = await Promise.all([
      InventoryService.getMaterials(companyId).catch(() => []),
      InventoryService.getLocations(companyId).catch(() => []),
      InventoryService.getStockBalances(companyId).catch(() => []),
      InventoryService.getRequests(companyId).catch(() => []),
      InventoryService.getIssues(companyId).catch(() => []),
      InventoryService.getRemnants(companyId).catch(() => []),
      InventoryService.getStockLedger(companyId).catch(() => []),
      InventoryService.getInventorySummary(companyId).catch(() => ({})),
      InventoryService.getInventoryRolls(companyId).catch(() => []),
      PurchaseService.getPurchaseOrders(companyId).catch(() => []),
      PurchaseService.getGoodsReceivedNotes(companyId).catch(() => []),
      ProductRepository.getProducts(companyId, false, 'all', undefined, 'product').catch(() => []),
    ])

    return {
      success: true,
      data: {
        materials: matData || [],
        locations: locData || [],
        balances: balData || [],
        requests: reqData || [],
        issues: issData || [],
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
