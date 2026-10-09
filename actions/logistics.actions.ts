'use server'

import { withTenantAction } from '../lib/actions/action-wrapper.ts'


import { revalidatePath } from 'next/cache'
import { LogisticsService } from '@/services/logistics.service'
import { LogisticsRepository } from '@/lib/repositories/logistics.repository'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'
import type { DeliveryChallanRecord, InstallationRecord, DeliveryStatus } from '@/types/logistics.types'

export interface ServerActionResult<T> {
  success: boolean
  data?: T
  error?: string
}

async function resolveLogisticsTenant(requestedCompanyId?: string) {
  const tenant = await getCurrentTenant(requestedCompanyId)
  if (!tenant || !tenant.companyId) {
    throw new Error('Unauthorized: Valid authenticated tenant session required.')
  }
  return tenant
}

/**
 * Server Action: Fetch delivery challans for the active tenant
 */
export const getChallansAction = withTenantAction(
  {
    permission: "delivery.view",
    entityType: "logistics"
  },
  async (ctx, requestedCompanyId?: string) : Promise<ServerActionResult<DeliveryChallanRecord[]>> => {
  try {
    const tenant = await resolveLogisticsTenant(requestedCompanyId)
    const challans = await LogisticsService.getChallans(tenant.companyId)
    return { success: true, data: challans }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch delivery challans' }
  }

})

/**
 * Server Action: Fetch single challan by ID or Challan Number
 */
export const getChallanByIdAction = withTenantAction(
  {
    permission: "delivery.view",
    entityType: "logistics"
  },
  async (ctx, id: string,
  requestedCompanyId?: string) : Promise<ServerActionResult<DeliveryChallanRecord | null>> => {
  try {
    const tenant = await resolveLogisticsTenant(requestedCompanyId)
    const challan = await LogisticsService.getChallanById(id, tenant.companyId)
    return { success: true, data: challan }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch delivery challan' }
  }

})

/**
 * Server Action: Create a new delivery challan
 */
export const createChallanAction = withTenantAction(
  {
    permission: "delivery.create",
    entityType: "logistics"
  },
  async (ctx, payload: any,
  requestedCompanyId?: string) : Promise<ServerActionResult<DeliveryChallanRecord>> => {
  try {
    const tenant = await resolveLogisticsTenant(requestedCompanyId || payload.company_id)
    const challan = await LogisticsService.createChallan({
      ...payload,
      company_id: tenant.companyId,
      dispatched_by_name: payload.dispatched_by_name || tenant.fullName || 'Logistics Coordinator',
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

})

/**
 * Server Action: Update delivery challan status / confirm delivery
 */
export const updateChallanStatusAction = withTenantAction(
  {
    permission: "delivery.edit",
    entityType: "logistics"
  },
  async (ctx, id: string,
  status: DeliveryStatus | 'ready' | 'assigned' | 'out_for_delivery' | 'delivered' | 'cancelled',
  requestedCompanyId?: string,
  extraUpdates?: Partial<DeliveryChallanRecord>) : Promise<ServerActionResult<DeliveryChallanRecord>> => {
  try {
    const tenant = await resolveLogisticsTenant(requestedCompanyId)
    const updated = await LogisticsService.updateChallanStatus(id, status, tenant.companyId, extraUpdates)

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

})

/**
 * Server Action: Fetch installation jobs for the active tenant
 */
export const getInstallationsAction = withTenantAction(
  {
    permission: "delivery.view",
    entityType: "logistics"
  },
  async (ctx, requestedCompanyId?: string) : Promise<ServerActionResult<InstallationRecord[]>> => {
  try {
    const tenant = await resolveLogisticsTenant(requestedCompanyId)
    const installations = await LogisticsService.getInstallations(tenant.companyId)
    return { success: true, data: installations }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch installations' }
  }

})
