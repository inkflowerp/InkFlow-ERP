'use server'

import { revalidatePath } from 'next/cache'
import { CostingService } from '@/services/costing.service'
import { AuditService } from '@/services/audit.service'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'
import { JobCostingRecord } from '@/types/costing.types'
import { PricingCalculationInput } from '@/types/product.types'

export interface ServerActionResult<T> {
  success: boolean
  data?: T
  error?: string
}

function checkCostingPermission(tenant: any, requiredPerm: string): boolean {
  if (!tenant) return false
  if (tenant.companyRole === 'business_owner' || tenant.companyRole === 'admin') return true
  if (tenant.permissions?.includes('costing.manage')) return true
  if (tenant.permissions?.includes(requiredPerm)) return true
  return false
}

// ==========================================
// COSTING ACTIONS
// ==========================================

export async function getCostingsAction(
  requestedCompanyId?: string
): Promise<ServerActionResult<JobCostingRecord[]>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const hasCostView = checkCostingPermission(tenant, 'costing.view')
    const costings = await CostingService.getCostings(companyId)

    // Cost Data Shielding for unprivileged sales/client roles
    if (!hasCostView) {
      const masked = costings.map((c) => ({
        ...c,
        est: { ...c.est, material_cost: 0, labor_cost: 0, machine_cost: 0, total_cost: 0, profit: 0, margin_percentage: 0 },
        act: { ...c.act, material_cost: 0, labor_cost: 0, machine_cost: 0, total_cost: 0, profit: 0, margin_percentage: 0 },
        variances: { material_variance: 0, machine_variance: 0, labor_variance: 0, finishing_variance: 0, transport_variance: 0, total_variance: 0 },
        costing_snapshot: {},
      }))
      return { success: true, data: masked }
    }

    return { success: true, data: costings }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch job costings.' }
  }
}

export async function getCostingByIdAction(
  id: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<JobCostingRecord | null>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const hasCostView = checkCostingPermission(tenant, 'costing.view')
    const costing = await CostingService.getCostingById(id, companyId)
    if (!costing) return { success: true, data: null }

    if (!hasCostView) {
      return {
        success: true,
        data: {
          ...costing,
          est: { ...costing.est, material_cost: 0, labor_cost: 0, machine_cost: 0, total_cost: 0, profit: 0, margin_percentage: 0 },
          act: { ...costing.act, material_cost: 0, labor_cost: 0, machine_cost: 0, total_cost: 0, profit: 0, margin_percentage: 0 },
          variances: { material_variance: 0, machine_variance: 0, labor_variance: 0, finishing_variance: 0, transport_variance: 0, total_variance: 0 },
          costing_snapshot: {},
        },
      }
    }

    return { success: true, data: costing }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch job costing.' }
  }
}

export async function createCostingAction(
  data: Partial<JobCostingRecord>,
  requestedCompanyId?: string
): Promise<ServerActionResult<JobCostingRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    if (!checkCostingPermission(tenant, 'costing.create') && !checkCostingPermission(tenant, 'costing.edit')) {
      return { success: false, error: 'Unauthorized: You do not have permission to create costing records.' }
    }

    const created = await CostingService.createCosting({
      ...data,
      company_id: companyId,
      created_by: tenant.userId,
    })

    try {
      await AuditService.logEvent(
        companyId,
        tenant.userId,
        tenant.userEmail,
        'create',
        'costing',
        created.id,
        null,
        { job_number: created.job_number, selling_price: created.selling_price },
        `Created job costing ${created.job_number}`
      )
    } catch {}

    revalidatePath('/costing')
    return { success: true, data: created }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create costing.' }
  }
}

export async function createCostingFromProductAction(
  productId: string,
  input: PricingCalculationInput,
  options: {
    customer_id?: string
    customer_name?: string
    job_order_id?: string
    sales_order_id?: string
    quotation_id?: string
    selling_price_override?: number
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<JobCostingRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const costing = await CostingService.createCostingFromProduct(productId, input, {
      ...options,
      companyId,
    })

    revalidatePath('/costing')
    return { success: true, data: costing }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create product costing.' }
  }
}

export async function syncActualConsumptionToCostingAction(
  costingId: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<JobCostingRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    if (!checkCostingPermission(tenant, 'costing.edit')) {
      return { success: false, error: 'Unauthorized: You do not have permission to actualize costing.' }
    }

    const updated = await CostingService.syncActualConsumptionToCosting(costingId, companyId)
    if (!updated) return { success: false, error: 'Costing not found.' }

    revalidatePath('/costing')
    return { success: true, data: updated }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to sync actual consumption.' }
  }
}
