'use server'

import { revalidatePath } from 'next/cache'
import { LogisticsService } from '../services/logistics.service.ts'
import { LogisticsRepository } from '../lib/repositories/logistics.repository.ts'
import { getCurrentTenant } from '../lib/auth/tenant-auth.ts'
import type { DeliveryChallanRecord, InstallationRecord, DeliveryStatus } from '../types/logistics.types.ts'

export interface ServerActionResult<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Server Action: Fetch delivery challans for the active tenant
 */
export async function getChallansAction(
  requestedCompanyId?: string
): Promise<ServerActionResult<DeliveryChallanRecord[]>> {
  try {
    let companyId = requestedCompanyId || ''
    try {
      const tenant = await getCurrentTenant(requestedCompanyId)
      if (tenant?.companyId) {
        companyId = tenant.companyId
      }
    } catch {}

    if (!companyId) {
      return { success: false, error: 'Unauthorized: Valid company context required.' }
    }

    const challans = await LogisticsService.getChallans(companyId)
    return { success: true, data: challans }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch delivery challans' }
  }
}

/**
 * Server Action: Fetch single challan by ID or Challan Number
 */
export async function getChallanByIdAction(
  id: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<DeliveryChallanRecord | null>> {
  try {
    let companyId = requestedCompanyId || ''
    try {
      const tenant = await getCurrentTenant(requestedCompanyId)
      if (tenant?.companyId) {
        companyId = tenant.companyId
      }
    } catch {}

    if (!companyId) {
      return { success: false, error: 'Unauthorized: Valid company context required.' }
    }

    const challan = await LogisticsService.getChallanById(id, companyId)
    return { success: true, data: challan }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch delivery challan' }
  }
}

/**
 * Server Action: Create a new delivery challan
 */
export async function createChallanAction(
  payload: any,
  requestedCompanyId?: string
): Promise<ServerActionResult<DeliveryChallanRecord>> {
  try {
    let companyId = requestedCompanyId || ''
    let creatorName = 'Logistics Coordinator'

    try {
      const tenant = await getCurrentTenant(requestedCompanyId)
      if (tenant?.companyId) {
        companyId = tenant.companyId
        creatorName = tenant.fullName || creatorName
      }
    } catch {}

    if (!companyId) {
      companyId = payload.company_id || 'default'
    }

    const challan = await LogisticsService.createChallan({
      ...payload,
      company_id: companyId,
      dispatched_by_name: payload.dispatched_by_name || creatorName,
    })

    try {
      revalidatePath('/[tenantSlug]/delivery', 'page')
      revalidatePath('/[tenantSlug]/orders', 'page')
      revalidatePath('/[tenantSlug]/billing', 'page')
      revalidatePath('/', 'layout')
    } catch {}

    return { success: true, data: challan }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create delivery challan' }
  }
}

/**
 * Server Action: Update delivery challan status / confirm delivery
 */
export async function updateChallanStatusAction(
  id: string,
  status: 'ready' | 'assigned' | 'out_for_delivery' | 'delivered' | 'cancelled',
  requestedCompanyId?: string,
  extraUpdates?: Partial<DeliveryChallanRecord>
): Promise<ServerActionResult<DeliveryChallanRecord>> {
  try {
    let companyId = requestedCompanyId || ''
    try {
      const tenant = await getCurrentTenant(requestedCompanyId)
      if (tenant?.companyId) {
        companyId = tenant.companyId
      }
    } catch {}

    if (!companyId) {
      companyId = (extraUpdates as any)?.company_id || 'default'
    }

    const updated = await LogisticsService.updateChallanStatus(id, status, companyId, extraUpdates)

    try {
      revalidatePath('/[tenantSlug]/delivery', 'page')
      revalidatePath('/[tenantSlug]/delivery/[id]', 'page')
      revalidatePath('/[tenantSlug]/orders', 'page')
      revalidatePath('/[tenantSlug]/billing', 'page')
      revalidatePath('/', 'layout')
    } catch {}

    return { success: true, data: updated }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update challan status' }
  }
}

/**
 * Server Action: Fetch installation jobs for the active tenant
 */
export async function getInstallationsAction(
  requestedCompanyId?: string
): Promise<ServerActionResult<InstallationRecord[]>> {
  try {
    let companyId = requestedCompanyId || ''
    try {
      const tenant = await getCurrentTenant(requestedCompanyId)
      if (tenant?.companyId) {
        companyId = tenant.companyId
      }
    } catch {}

    if (!companyId) {
      return { success: false, error: 'Unauthorized: Valid company context required.' }
    }

    const installations = await LogisticsService.getInstallations(companyId)
    return { success: true, data: installations }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch installations' }
  }
}
