'use server'

import { revalidatePath } from 'next/cache'
import { PurchaseService } from '@/services/purchase.service'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'
import type {
  PurchaseRequestRecord,
  PurchaseRequestItemRecord,
  PurchaseOrderRecord,
  PurchaseOrderItemRecord,
  GoodsReceivedNoteRecord,
  SupplierReturnRecord,
} from '@/types/purchase.types'

export interface ServerActionResult<T> {
  success: boolean
  data?: T
  error?: string
}

function checkPurchasePermission(tenant: any, requiredPerm: string): boolean {
  if (!tenant) return false
  if (tenant.companyRole === 'business_owner' || tenant.companyRole === 'admin') return true
  if (tenant.permissions?.includes('purchases.manage') || tenant.permissions?.includes('inventory.manage')) return true
  if (tenant.permissions?.includes(requiredPerm)) return true
  return false
}

// ==========================================
// 1. PURCHASE REQUESTS ACTIONS
// ==========================================

export async function getPurchaseRequestsAction(
  requestedCompanyId?: string,
  options?: { status?: string; search?: string }
): Promise<ServerActionResult<PurchaseRequestRecord[]>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const companyId = tenant?.companyId || requestedCompanyId
    if (!companyId || !tenant) {
      return { success: false, error: 'Unauthorized: No active tenant context found.' }
    }

    const requests = await PurchaseService.getPurchaseRequests(companyId, {
      ...options,
      branchId: tenant.branchId,
    })
    return { success: true, data: requests }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch purchase requests.' }
  }
}

export async function getPurchaseRequestByIdAction(
  id: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<PurchaseRequestRecord | null>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const companyId = tenant?.companyId || requestedCompanyId
    if (!companyId || !tenant) {
      return { success: false, error: 'Unauthorized: No active tenant context found.' }
    }

    const request = await PurchaseService.getPurchaseRequestById(id, companyId)
    return { success: true, data: request }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch purchase request.' }
  }
}

export async function createPurchaseRequestAction(
  data: Partial<PurchaseRequestRecord> & {
    items: PurchaseRequestItemRecord[]
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<PurchaseRequestRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const companyId = tenant?.companyId || requestedCompanyId
    if (!companyId || !tenant) {
      return { success: false, error: 'Unauthorized: No active tenant context found.' }
    }

    if (!checkPurchasePermission(tenant, 'purchases.create')) {
      return { success: false, error: 'Unauthorized: You do not have permission to create purchase requests.' }
    }

    const created = await PurchaseService.createPurchaseRequest(
      {
        ...data,
        company_id: companyId,
        branch_id: tenant.branchId || data.branch_id || null,
        requested_by_id: tenant.userId,
        requested_by_name: tenant.fullName || tenant.userEmail || 'User',
      },
      tenant.userId,
      tenant.userEmail
    )

    revalidatePath('/purchases')
    revalidatePath('/purchases/requests')
    return { success: true, data: created }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create purchase request.' }
  }
}

export async function approvePurchaseRequestAction(
  id: string,
  autoCreatePO: boolean = true,
  requestedCompanyId?: string
): Promise<ServerActionResult<{ request: PurchaseRequestRecord; po?: PurchaseOrderRecord }>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const companyId = tenant?.companyId || requestedCompanyId
    if (!companyId || !tenant) {
      return { success: false, error: 'Unauthorized: No active tenant context found.' }
    }

    if (!checkPurchasePermission(tenant, 'purchases.approve')) {
      return { success: false, error: 'Unauthorized: You do not have permission to approve purchase requests.' }
    }

    const result = await PurchaseService.approvePurchaseRequest(
      id,
      {
        id: tenant.userId,
        name: tenant.fullName || tenant.userEmail || 'Manager',
        email: tenant.userEmail,
      },
      companyId,
      autoCreatePO
    )

    revalidatePath('/purchases')
    revalidatePath('/purchases/requests')
    revalidatePath('/purchases/orders')
    return { success: true, data: result }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to approve purchase request.' }
  }
}

export async function rejectPurchaseRequestAction(
  id: string,
  reason: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<PurchaseRequestRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const companyId = tenant?.companyId || requestedCompanyId
    if (!companyId || !tenant) {
      return { success: false, error: 'Unauthorized: No active tenant context found.' }
    }

    if (!checkPurchasePermission(tenant, 'purchases.reject')) {
      return { success: false, error: 'Unauthorized: You do not have permission to reject purchase requests.' }
    }

    const updated = await PurchaseService.rejectPurchaseRequest(
      id,
      {
        id: tenant.userId,
        name: tenant.fullName || tenant.userEmail || 'Manager',
        reason,
        email: tenant.userEmail,
      },
      companyId
    )

    revalidatePath('/purchases')
    revalidatePath('/purchases/requests')
    return { success: true, data: updated }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to reject purchase request.' }
  }
}

// ==========================================
// 2. PURCHASE ORDERS ACTIONS
// ==========================================

export async function getPurchaseOrdersAction(
  requestedCompanyId?: string,
  options?: { status?: string; supplierId?: string; search?: string }
): Promise<ServerActionResult<PurchaseOrderRecord[]>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const companyId = tenant?.companyId || requestedCompanyId
    if (!companyId || !tenant) {
      return { success: false, error: 'Unauthorized: No active tenant context found.' }
    }

    const orders = await PurchaseService.getPurchaseOrders(companyId, {
      ...options,
      branchId: tenant.branchId,
    })
    return { success: true, data: orders }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch purchase orders.' }
  }
}

export async function getPurchaseOrderByIdAction(
  id: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<PurchaseOrderRecord | null>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const companyId = tenant?.companyId || requestedCompanyId
    if (!companyId || !tenant) {
      return { success: false, error: 'Unauthorized: No active tenant context found.' }
    }

    const order = await PurchaseService.getPurchaseOrderById(id, companyId)
    return { success: true, data: order }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch purchase order.' }
  }
}

export async function createPurchaseOrderAction(
  data: Partial<PurchaseOrderRecord> & {
    supplier_id: string
    supplier_name: string
    supplier_phone: string
    items: PurchaseOrderItemRecord[]
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<PurchaseOrderRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const companyId = tenant?.companyId || requestedCompanyId
    if (!companyId || !tenant) {
      return { success: false, error: 'Unauthorized: No active tenant context found.' }
    }

    if (!checkPurchasePermission(tenant, 'purchase_orders.create') && !checkPurchasePermission(tenant, 'purchases.create')) {
      return { success: false, error: 'Unauthorized: You do not have permission to create purchase orders.' }
    }

    const created = await PurchaseService.createPurchaseOrder(
      {
        ...data,
        company_id: companyId,
        branch_id: tenant.branchId || data.branch_id || null,
        created_by_name: tenant.fullName || tenant.userEmail || 'Procurement Officer',
      },
      tenant.userId,
      tenant.userEmail
    )

    revalidatePath('/purchases')
    revalidatePath('/purchases/orders')
    return { success: true, data: created }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create purchase order.' }
  }
}

export async function approvePurchaseOrderAction(
  id: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<PurchaseOrderRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const companyId = tenant?.companyId || requestedCompanyId
    if (!companyId || !tenant) {
      return { success: false, error: 'Unauthorized: No active tenant context found.' }
    }

    if (!checkPurchasePermission(tenant, 'purchase_orders.approve') && !checkPurchasePermission(tenant, 'purchases.approve')) {
      return { success: false, error: 'Unauthorized: You do not have permission to approve purchase orders.' }
    }

    const updated = await PurchaseService.approvePurchaseOrder(
      id,
      {
        id: tenant.userId,
        name: tenant.fullName || tenant.userEmail || 'Manager',
        email: tenant.userEmail,
      },
      companyId
    )

    revalidatePath('/purchases')
    revalidatePath(`/purchases/${id}`)
    return { success: true, data: updated }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to approve purchase order.' }
  }
}

export async function sendPurchaseOrderAction(
  id: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<PurchaseOrderRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const companyId = tenant?.companyId || requestedCompanyId
    if (!companyId || !tenant) {
      return { success: false, error: 'Unauthorized: No active tenant context found.' }
    }

    const updated = await PurchaseService.sendPurchaseOrder(
      id,
      {
        name: tenant.fullName || tenant.userEmail || 'Staff',
        email: tenant.userEmail,
      },
      companyId
    )

    revalidatePath('/purchases')
    revalidatePath(`/purchases/${id}`)
    return { success: true, data: updated }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to issue purchase order.' }
  }
}

// ==========================================
// 3. GOODS RECEIVING ACTIONS (V5 -> V3 ATOMIC INVENTORY)
// ==========================================

export async function getGoodsReceivedNotesAction(
  requestedCompanyId?: string,
  options?: { poId?: string; supplierId?: string }
): Promise<ServerActionResult<GoodsReceivedNoteRecord[]>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const companyId = tenant?.companyId || requestedCompanyId
    if (!companyId || !tenant) {
      return { success: false, error: 'Unauthorized: No active tenant context found.' }
    }

    const grns = await PurchaseService.getGoodsReceivedNotes(companyId, options)
    return { success: true, data: grns }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch goods received notes.' }
  }
}

export async function receiveGoodsAction(
  params: {
    purchase_order_id: string
    receiving_location_id?: string | null
    received_date?: string
    challan_number?: string | null
    supplier_delivery_note?: string | null
    supplier_invoice_number?: string | null
    notes?: string | null
    items_received: Array<{
      po_item_id?: string | null
      material_id: string
      material_name: string
      current_received: number
      accepted_quantity: number
      rejected_quantity?: number
      damaged_quantity?: number
      unit: string
      unit_cost?: number
      batch_lot_number?: string | null
      roll_id?: string | null
      expiry_date?: string | null
      rejection_reason?: string | null
      notes?: string | null
    }>
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<{ grn: GoodsReceivedNoteRecord; updatedPO: PurchaseOrderRecord }>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const companyId = tenant?.companyId || requestedCompanyId
    if (!companyId || !tenant) {
      return { success: false, error: 'Unauthorized: No active tenant context found.' }
    }

    if (!checkPurchasePermission(tenant, 'goods_receipts.create') && !checkPurchasePermission(tenant, 'inventory.manage')) {
      return { success: false, error: 'Unauthorized: You do not have permission to receive goods.' }
    }

    const result = await PurchaseService.receiveGoods({
      ...params,
      company_id: companyId,
      branch_id: tenant.branchId || null,
      received_by_name: tenant.fullName || tenant.userEmail || 'Receiving Officer',
      actor_id: tenant.userId,
      actor_email: tenant.userEmail,
    })

    revalidatePath('/purchases')
    revalidatePath('/purchases/receipts')
    revalidatePath(`/purchases/${params.purchase_order_id}`)
    revalidatePath('/inventory')
    return { success: true, data: result }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to process goods receipt.' }
  }
}

// ==========================================
// 4. SUPPLIER RETURNS ACTIONS
// ==========================================

export async function getSupplierReturnsAction(
  requestedCompanyId?: string,
  options?: { supplierId?: string; poId?: string; status?: string }
): Promise<ServerActionResult<SupplierReturnRecord[]>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const companyId = tenant?.companyId || requestedCompanyId
    if (!companyId || !tenant) {
      return { success: false, error: 'Unauthorized: No active tenant context found.' }
    }

    const returns = await PurchaseService.getSupplierReturns(companyId, options)
    return { success: true, data: returns }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch supplier returns.' }
  }
}

export async function createSupplierReturnAction(
  params: {
    supplier_id: string
    supplier_name: string
    grn_id?: string | null
    purchase_order_id?: string | null
    reason: string
    notes?: string | null
    items: Array<{
      grn_item_id?: string | null
      material_id: string
      material_name: string
      return_quantity: number
      unit: string
      unit_cost: number
      reason?: string | null
      location_id?: string | null
    }>
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<SupplierReturnRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const companyId = tenant?.companyId || requestedCompanyId
    if (!companyId || !tenant) {
      return { success: false, error: 'Unauthorized: No active tenant context found.' }
    }

    if (!checkPurchasePermission(tenant, 'supplier_returns.create') && !checkPurchasePermission(tenant, 'inventory.manage')) {
      return { success: false, error: 'Unauthorized: You do not have permission to create supplier returns.' }
    }

    const created = await PurchaseService.createSupplierReturn({
      ...params,
      company_id: companyId,
      branch_id: tenant.branchId || null,
      created_by_name: tenant.fullName || tenant.userEmail || 'Staff',
      actor_id: tenant.userId,
      actor_email: tenant.userEmail,
    })

    revalidatePath('/purchases')
    revalidatePath('/purchases/returns')
    revalidatePath('/inventory')
    return { success: true, data: created }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create supplier return.' }
  }
}
