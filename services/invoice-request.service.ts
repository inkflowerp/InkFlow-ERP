import { InvoiceRequestRepository, type InvoiceRequestFilterOptions } from '../lib/repositories/invoice-request.repository.ts'
import type { InvoiceRequestRecord } from '../types/workflow.types.ts'
import { createClient } from '../lib/supabase/server.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../lib/db/data-store.ts'
import type { InAppNotificationRecord } from '../types/communication.types.ts'

export interface CreateInvoiceRequestInput {
  companyId?: string
  company_id?: string
  customerId?: string | null
  customer_id?: string | null
  customerName?: string
  customer_name?: string
  customerPhone?: string | null
  customer_phone?: string | null
  salesOrderId?: string | null
  sales_order_id?: string | null
  orderId?: string | null
  order_id?: string | null
  orderNumber?: string | null
  order_number?: string | null
  jobOrderId?: string | null
  job_order_id?: string | null
  jobNumber?: string | null
  job_number?: string | null
  designJobId?: string | null
  design_job_id?: string | null
  designNumber?: string | null
  design_number?: string | null
  requestedById?: string | null
  requested_by_id?: string | null
  requestedByName?: string
  requested_by_name?: string
  itemsSummary?: string | null
  items_summary?: string | null
  estimatedAmount?: number
  estimated_amount?: number
  priority?: string
  notes?: string | null
}

export class InvoiceRequestService {
  /**
   * Get invoice requests for a company
   */
  static async getRequests(
    companyId: string,
    filters?: InvoiceRequestFilterOptions
  ): Promise<InvoiceRequestRecord[]> {
    if (!companyId) return []
    return await InvoiceRequestRepository.getRequests(companyId, filters)
  }

  /**
   * Get single invoice request by ID
   */
  static async getRequestById(id: string, companyId: string): Promise<InvoiceRequestRecord | null> {
    if (!id || !companyId) return null
    return await InvoiceRequestRepository.getRequestById(id, companyId)
  }

  /**
   * Create an invoice request, update commercial status on related records, and notify sales/management
   */
  static async createInvoiceRequest(input: CreateInvoiceRequestInput): Promise<InvoiceRequestRecord> {
    const companyId = input.companyId || input.company_id
    if (!companyId) {
      throw new Error('Company context is required.')
    }
    const customerName = input.customerName || input.customer_name
    if (!customerName) {
      throw new Error('Customer name is required for invoice request.')
    }

    const salesOrderId = input.salesOrderId || input.sales_order_id || input.orderId || input.order_id || null
    const orderNumber = input.orderNumber || input.order_number || null
    const jobOrderId = input.jobOrderId || input.job_order_id || null
    const jobNumber = input.jobNumber || input.job_number || null
    const designJobId = input.designJobId || input.design_job_id || null
    const designNumber = input.designNumber || input.design_number || null

    // 1. Create or return existing pending invoice request
    const request = await InvoiceRequestRepository.createRequest({
      company_id: companyId,
      customer_id: input.customerId || input.customer_id || null,
      customer_name: customerName,
      customer_phone: input.customerPhone || input.customer_phone || null,
      sales_order_id: salesOrderId,
      order_number: orderNumber,
      job_order_id: jobOrderId,
      job_number: jobNumber,
      design_job_id: designJobId,
      design_number: designNumber,
      requested_by_id: input.requestedById || input.requested_by_id || null,
      requested_by_name: input.requestedByName || input.requested_by_name || 'Designer',
      items_summary: input.itemsSummary || input.items_summary || null,
      estimated_amount: input.estimatedAmount || input.estimated_amount || 0,
      notes: input.notes || null,
    })

    // 2. Update commercial status on related Sales Order and Design Job
    try {
      const supabase = await createClient()
      if (input.salesOrderId) {
        await (supabase as any)
          .from('sales_orders')
          .update({
            commercial_status: 'invoice_requested',
            invoice_requested_at: new Date().toISOString(),
          })
          .eq('id', input.salesOrderId)
          .eq('company_id', input.companyId)
      }

      if (input.designJobId) {
        await (supabase as any)
          .from('design_jobs')
          .update({
            commercial_status: 'invoice_requested',
            invoice_request_id: request.id,
          })
          .eq('id', input.designJobId)
          .eq('company_id', input.companyId)
      }
    } catch {
      // Local fallback updates
      if (salesOrderId) {
        const orders = PrintERPDataStore.get<any[]>(STORAGE_KEYS.ORDERS) || []
        const ord = orders.find((o) => o.id === salesOrderId)
        if (ord) {
          ord.commercial_status = 'invoice_requested'
          ord.invoice_requested_at = new Date().toISOString()
          PrintERPDataStore.set(STORAGE_KEYS.ORDERS, orders)
        }
      }
      if (designJobId) {
        const designs = PrintERPDataStore.get<any[]>(STORAGE_KEYS.DESIGN_JOBS) || []
        const des = designs.find((d) => d.id === designJobId)
        if (des) {
          des.commercial_status = 'invoice_requested'
          des.invoice_request_id = request.id
          PrintERPDataStore.set(STORAGE_KEYS.DESIGN_JOBS, designs)
        }
      }
    }

    // 3. Dispatch In-App Notification to Sales Managers / Business Owners
    const notifActionUrl = `/billing?action=create_invoice&order_id=${salesOrderId || ''}&request_id=${request.id}&customer_name=${encodeURIComponent(customerName)}`
    const notifTitle = `Invoice Request: ${customerName}`
    const notifTitleBn = `ইনভয়েস তৈরির অনুরোধ: ${customerName}`
    const docRef = orderNumber ? `Order ${orderNumber}` : designNumber ? `Design ${designNumber}` : 'Artwork'
    const notifMsg = `Designer ${request.requested_by_name || 'Designer'} requested invoice creation for ${customerName} (${docRef}).`
    const notifMsgBn = `ডিজাইনার ${request.requested_by_name || 'ডিজাইনার'} ${customerName}-এর জন্য ইনভয়েস তৈরির অনুরোধ পাঠিয়েছেন (${docRef})।`

    try {
      const supabase = await createClient()
      await (supabase as any).from('in_app_notifications').insert({
        company_id: companyId,
        type: 'invoice_request',
        category: 'billing',
        title: notifTitle,
        title_bn: notifTitleBn,
        message: notifMsg,
        message_bn: notifMsgBn,
        action_url: notifActionUrl,
        is_read: false,
        created_at: new Date().toISOString(),
      })
    } catch {
      // Fallback in-app notification to local store
      const notifs = PrintERPDataStore.get<InAppNotificationRecord[]>(STORAGE_KEYS.IN_APP_NOTIFICATIONS) || []
      notifs.unshift({
        id: `notif-${Date.now()}`,
        company_id: companyId,
        user_id: null,
        type: 'invoice_request',
        category: 'billing',
        title: notifTitle,
        title_bn: notifTitleBn,
        message: notifMsg,
        message_bn: notifMsgBn,
        action_url: notifActionUrl,
        is_read: false,
        created_at: new Date().toISOString(),
      } as any)
      PrintERPDataStore.set(STORAGE_KEYS.IN_APP_NOTIFICATIONS, notifs)
    }

    return request
  }

  /**
   * Resolve an invoice request when an official invoice is created
   */
  static async resolveInvoiceRequest(
    requestId: string,
    invoiceId: string,
    invoiceNumber: string,
    companyId: string
  ): Promise<InvoiceRequestRecord> {
    const existing = await InvoiceRequestRepository.getRequestById(requestId, companyId)
    if (!existing) {
      throw new Error(`Invoice request ${requestId} not found for this tenant.`)
    }

    const resolved = await InvoiceRequestRepository.resolveRequestWithInvoice(
      { requestId },
      invoiceId,
      invoiceNumber,
      companyId
    )

    if (resolved.length === 0) {
      throw new Error(`Failed to resolve invoice request ${requestId}.`)
    }

    return resolved[0]
  }

  /**
   * Cancel or reject an invoice request
   */
  static async cancelRequest(id: string, companyId: string, reason?: string): Promise<boolean> {
    const updated = await InvoiceRequestRepository.updateRequestStatus(id, companyId, 'cancelled', reason)
    return Boolean(updated)
  }
}
