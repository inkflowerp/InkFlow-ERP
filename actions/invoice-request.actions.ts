'use server'

import { revalidatePath } from 'next/cache'
import { InvoiceRequestService, CreateInvoiceRequestInput } from '../services/invoice-request.service.ts'
import { AuditService } from '../services/audit.service.ts'
import { getCurrentTenant } from '../lib/auth/tenant-auth.ts'
import type { InvoiceRequestRecord } from '../types/workflow.types.ts'

export interface ServerActionResult<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Server Action: Submit an invoice request from Designer or Sales
 */
export async function createInvoiceRequestAction(
  input: Omit<CreateInvoiceRequestInput, 'companyId' | 'requestedById' | 'requestedByName'> & {
    companyId?: string
    requestedByName?: string
  }
): Promise<ServerActionResult<InvoiceRequestRecord>> {
  try {
    const tenant = await getCurrentTenant(input.companyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const created = await InvoiceRequestService.createInvoiceRequest({
      ...input,
      companyId,
      requestedById: tenant.userId || null,
      requestedByName: input.requestedByName || tenant.fullName || 'Designer',
    })

    try {
      await AuditService.logEvent(
        companyId,
        tenant.userId,
        tenant.userEmail,
        'invoice_request.create',
        'invoice_request',
        created.id,
        null,
        {
          request_number: created.request_number,
          customer_name: created.customer_name,
          order_number: created.order_number,
          design_number: created.design_number,
        },
        `Created invoice request ${created.request_number} for customer ${created.customer_name}`
      )
    } catch {}

    revalidatePath('/', 'layout')
    return { success: true, data: created }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create invoice request' }
  }
}

/**
 * Server Action: Fetch invoice requests for current tenant
 */
export async function getInvoiceRequestsAction(
  filters?: {
    status?: 'pending' | 'invoice_created' | 'rejected' | 'cancelled'
    customerId?: string
    salesOrderId?: string
    jobOrderId?: string
    designJobId?: string
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<InvoiceRequestRecord[]>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const data = await InvoiceRequestService.getRequests(tenant.companyId, filters)
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch invoice requests' }
  }
}

/**
 * Server Action: Cancel an invoice request
 */
export async function cancelInvoiceRequestAction(
  requestId: string,
  reason?: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<boolean>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const success = await InvoiceRequestService.cancelRequest(requestId, tenant.companyId, reason)
    revalidatePath('/', 'layout')
    return { success: true, data: success }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to cancel invoice request' }
  }
}
