'use server'

import { withTenantAction } from '@/lib/actions/action-wrapper'


import { revalidatePath } from 'next/cache'
import { SupplierService } from '@/services/supplier.service'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'
import type { SupplierRecord } from '@/types/crm.types'
import type {
  SupplierItemRecord,
  SupplierPriceHistoryRecord,
  SupplierLedgerEntryRecord,
} from '@/types/purchase.types'

export interface ServerActionResult<T> {
  success: boolean
  data?: T
  error?: string
}

function checkSupplierPermission(tenant: any, requiredPerm: string): boolean {
  if (!tenant) return false
  if (tenant.companyRole === 'business_owner' || tenant.companyRole === 'admin') return true
  if (tenant.permissions?.includes('suppliers.manage') || tenant.permissions?.includes('inventory.manage')) return true
  if (tenant.permissions?.includes(requiredPerm)) return true
  return false
}

// ==========================================
// SUPPLIER MASTER ACTIONS
// ==========================================

export const getSuppliersAction = withTenantAction(
  {
    permission: "supplier.view",
    entityType: "supplier"
  },
  async (ctx, requestedCompanyId?: string,
  options?: { category?: string; isActive?: boolean; search?: string }) : Promise<ServerActionResult<SupplierRecord[]>> => {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const suppliers = await SupplierService.getSuppliers(companyId, {
      ...options,
      branchId: tenant.branchId,
    })
    return { success: true, data: suppliers }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch suppliers.' }
  }

})

export const getSupplierByIdAction = withTenantAction(
  {
    permission: "supplier.view",
    entityType: "supplier"
  },
  async (ctx, id: string,
  requestedCompanyId?: string) : Promise<ServerActionResult<SupplierRecord | null>> => {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const supplier = await SupplierService.getSupplierById(id, companyId)
    return { success: true, data: supplier }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch supplier.' }
  }

})

export const createSupplierAction = withTenantAction(
  {
    permission: "supplier.create",
    entityType: "supplier"
  },
  async (ctx, data: Partial<SupplierRecord> & {
    supplier_name: string
    mobile: string
    category: any
  },
  requestedCompanyId?: string) : Promise<ServerActionResult<SupplierRecord>> => {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    if (!checkSupplierPermission(tenant, 'suppliers.create') && !checkSupplierPermission(tenant, 'suppliers.edit')) {
      return { success: false, error: 'Unauthorized: You do not have permission to create suppliers.' }
    }

    const created = await SupplierService.createSupplier(
      {
        ...data,
        company_id: companyId,
        branch_id: tenant.branchId || data.branch_id || null,
        created_by: tenant.userId,
      },
      tenant.userId,
      tenant.userEmail
    )

    revalidatePath('/suppliers')
    return { success: true, data: created }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create supplier.' }
  }

})

export const updateSupplierAction = withTenantAction(
  {
    permission: "supplier.edit",
    entityType: "supplier"
  },
  async (ctx, id: string,
  data: Partial<SupplierRecord>,
  requestedCompanyId?: string) : Promise<ServerActionResult<SupplierRecord>> => {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    if (!checkSupplierPermission(tenant, 'suppliers.edit')) {
      return { success: false, error: 'Unauthorized: You do not have permission to edit suppliers.' }
    }

    const updated = await SupplierService.updateSupplier(
      id,
      data,
      companyId,
      tenant.userId,
      tenant.userEmail
    )
    if (!updated) return { success: false, error: 'Supplier not found.' }

    revalidatePath('/suppliers')
    revalidatePath(`/suppliers/${id}`)
    return { success: true, data: updated }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update supplier.' }
  }

})

export const deleteSupplierAction = withTenantAction(
  {
    permission: "supplier.delete",
    destructive: true,
    auditAction: "supplier.deletesupplier",
    entityType: "supplier"
  },
  async (ctx, id: string,
  requestedCompanyId?: string) : Promise<ServerActionResult<boolean>> => {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    if (!checkSupplierPermission(tenant, 'suppliers.delete')) {
      return { success: false, error: 'Unauthorized: You do not have permission to delete suppliers.' }
    }

    const success = await SupplierService.deleteSupplier(id, companyId, tenant.userId, tenant.userEmail)
    revalidatePath('/suppliers')
    return { success: true, data: success }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete supplier.' }
  }

})

// ==========================================
// SUPPLIER ITEMS ACTIONS
// ==========================================

export const getSupplierItemsAction = withTenantAction(
  {
    permission: "supplier.view",
    entityType: "supplier"
  },
  async (ctx, supplierId?: string,
  materialId?: string,
  requestedCompanyId?: string) : Promise<ServerActionResult<SupplierItemRecord[]>> => {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const items = await SupplierService.getSupplierItems(companyId, { supplierId, materialId })
    return { success: true, data: items }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch supplier items.' }
  }

})

export const createSupplierItemAction = withTenantAction(
  {
    permission: "supplier.create",
    entityType: "supplier"
  },
  async (ctx, data: Partial<SupplierItemRecord> & {
    supplier_id: string
    material_id: string
    unit_price: number
  },
  requestedCompanyId?: string) : Promise<ServerActionResult<SupplierItemRecord>> => {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    if (!checkSupplierPermission(tenant, 'suppliers.edit') && !checkSupplierPermission(tenant, 'suppliers.create')) {
      return { success: false, error: 'Unauthorized: You do not have permission to map supplier items.' }
    }

    const created = await SupplierService.createSupplierItem(
      {
        ...data,
        company_id: companyId,
        branch_id: tenant.branchId || data.branch_id || null,
      },
      tenant.userId,
      tenant.userEmail
    )

    revalidatePath('/suppliers')
    revalidatePath(`/suppliers/${data.supplier_id}`)
    return { success: true, data: created }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create supplier item mapping.' }
  }

})

export const deleteSupplierItemAction = withTenantAction(
  {
    permission: "supplier.delete",
    destructive: true,
    auditAction: "supplier.deletesupplieritem",
    entityType: "supplier"
  },
  async (ctx, id: string,
  supplierId?: string,
  requestedCompanyId?: string) : Promise<ServerActionResult<boolean>> => {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const success = await SupplierService.deleteSupplierItem(id, companyId)
    if (supplierId) revalidatePath(`/suppliers/${supplierId}`)
    return { success: true, data: success }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete supplier item.' }
  }

})

// ==========================================
// PRICE HISTORY & BENCHMARKS ACTIONS
// ==========================================

export const getSupplierPriceHistoryAction = withTenantAction(
  {
    permission: "supplier.view",
    entityType: "supplier"
  },
  async (ctx, materialId?: string,
  supplierId?: string,
  requestedCompanyId?: string) : Promise<ServerActionResult<SupplierPriceHistoryRecord[]>> => {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const history = await SupplierService.getPriceHistory(companyId, { materialId, supplierId })
    return { success: true, data: history }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch supplier price history.' }
  }

})

export const getSupplierLedgerAction = withTenantAction(
  {
    permission: "supplier.view",
    entityType: "supplier"
  },
  async (ctx, supplierId: string,
  requestedCompanyId?: string) : Promise<ServerActionResult<SupplierLedgerEntryRecord[]>> => {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const ledger = await SupplierService.getSupplierLedger(companyId, supplierId)
    return { success: true, data: ledger }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch supplier ledger.' }
  }

})
