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
  customerType?: 'retail' | 'reseller' | 'corporate' | 'government' | string | null
  customer_type?: 'retail' | 'reseller' | 'corporate' | 'government' | string | null
  customerPhone?: string | null
  customer_phone?: string | null
  whatsappNumber?: string | null
  whatsapp_number?: string | null
  customerEmail?: string | null
  customer_email?: string | null
  customerAddress?: string | null
  customer_address?: string | null
  companyName?: string | null
  company_name?: string | null
  items?: any[]
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

    let resolvedSalesOrderId = salesOrderId
    let resolvedOrderNumber = orderNumber
    let resolvedJobOrderId = jobOrderId
    let resolvedJobNumber = jobNumber
    let resolvedDesignJobId = designJobId
    let resolvedDesignNumber = designNumber

    let resolvedCustomerId = input.customerId || input.customer_id || null
    let resolvedCustomerName = customerName
    let resolvedCustomerType = input.customerType || input.customer_type || 'retail'
    let resolvedCustomerPhone = input.customerPhone || input.customer_phone || null
    let resolvedWhatsappNumber = input.whatsappNumber || input.whatsapp_number || null
    let resolvedCustomerEmail = input.customerEmail || input.customer_email || null
    let resolvedCustomerAddress = input.customerAddress || input.customer_address || null
    let resolvedCompanyName = input.companyName || input.company_name || null
    let resolvedItems = Array.isArray(input.items) && input.items.length > 0 ? input.items : undefined
    let resolvedItemsSummary = input.itemsSummary || input.items_summary || null
    let resolvedEstimatedAmount = input.estimatedAmount ?? input.estimated_amount ?? 0

    // Smart backfill from linked Sales Order
    if (salesOrderId || orderNumber) {
      try {
        const orders = PrintERPDataStore.get<any[]>(STORAGE_KEYS.ORDERS) || []
        const linkedOrder = orders.find(
          (o) => (salesOrderId && o.id === salesOrderId) || (orderNumber && o.order_number === orderNumber)
        )
        if (linkedOrder) {
          if (!resolvedSalesOrderId && linkedOrder.id) resolvedSalesOrderId = linkedOrder.id
          if (!resolvedOrderNumber && linkedOrder.order_number) resolvedOrderNumber = linkedOrder.order_number
          if (!resolvedCustomerId && linkedOrder.customer_id) resolvedCustomerId = linkedOrder.customer_id
          if (!resolvedCustomerName && linkedOrder.customer_name) resolvedCustomerName = linkedOrder.customer_name
          if (linkedOrder.customer_type) resolvedCustomerType = linkedOrder.customer_type
          if (!resolvedCustomerPhone && linkedOrder.customer_phone) resolvedCustomerPhone = linkedOrder.customer_phone
          if (!resolvedWhatsappNumber && linkedOrder.whatsapp_number) resolvedWhatsappNumber = linkedOrder.whatsapp_number
          if (!resolvedCustomerEmail && (linkedOrder.customer_email || linkedOrder.email)) {
            resolvedCustomerEmail = linkedOrder.customer_email || linkedOrder.email
          }
          if (!resolvedCustomerAddress && (linkedOrder.customer_address || linkedOrder.delivery_address || linkedOrder.shipping_address)) {
            resolvedCustomerAddress = linkedOrder.customer_address || linkedOrder.delivery_address || linkedOrder.shipping_address
          }
          if (!resolvedCompanyName && (linkedOrder.company_name || linkedOrder.customer_company)) {
            resolvedCompanyName = linkedOrder.company_name || linkedOrder.customer_company
          }
          if (!resolvedItems && Array.isArray(linkedOrder.items) && linkedOrder.items.length > 0) {
            resolvedItems = linkedOrder.items.map((it: any) => ({
              productId: it.product_id || it.productId || undefined,
              product_id: it.product_id || it.productId || undefined,
              item_kind: it.item_kind || 'service',
              product_type: it.product_type || undefined,
              itemName: it.item_name || it.itemName || 'Work Order Item',
              item_name: it.item_name || it.itemName || 'Work Order Item',
              material_spec: it.material_spec || undefined,
              dimensions_spec: it.dimensions_spec || (it.width && it.height ? `${it.width}×${it.height} ${it.dimension_unit || 'ft'}` : undefined),
              width: String(it.width ?? '0'),
              height: String(it.height ?? '0'),
              dimension_unit: it.dimension_unit || 'ft',
              quantity: Number(it.quantity) || 1,
              unit: it.unit || 'sft',
              rate: Number(it.unit_price ?? it.rate ?? 0),
              unit_price: Number(it.unit_price ?? it.rate ?? 0),
              total_price: Number(it.total_price ?? 0),
              finishing: it.finishing || 'None',
              add_on: it.add_on || 'None',
              workflow_routing: it.workflow_routing || 'ready_production',
              design_required: Boolean(it.design_required),
            }))
          }
          if (!resolvedItemsSummary && linkedOrder.items && linkedOrder.items.length > 0) {
            resolvedItemsSummary = linkedOrder.items
              .map((it: any) => `${it.item_name || it.itemName} (${it.width || 0}×${it.height || 0} ${it.dimension_unit || 'ft'}, Qty: ${it.quantity || 1})`)
              .join('; ')
          }
          if (!resolvedEstimatedAmount) {
            resolvedEstimatedAmount = Number(linkedOrder.final_price || linkedOrder.subtotal || 0)
          }
        }
      } catch {}
    }

    // Smart backfill from linked Customer record
    if (resolvedCustomerId && (!resolvedCustomerPhone || !resolvedCustomerAddress || !resolvedCompanyName || !resolvedCustomerEmail || !resolvedCustomerType)) {
      try {
        const customers = PrintERPDataStore.get<any[]>(STORAGE_KEYS.CUSTOMERS) || []
        const linkedCust = customers.find((c) => c.id === resolvedCustomerId)
        if (linkedCust) {
          if (linkedCust.customer_type) resolvedCustomerType = linkedCust.customer_type
          if (!resolvedCustomerPhone && linkedCust.mobile) resolvedCustomerPhone = linkedCust.mobile
          if (!resolvedWhatsappNumber && (linkedCust.whatsapp_number || linkedCust.whatsapp)) {
            resolvedWhatsappNumber = linkedCust.whatsapp_number || linkedCust.whatsapp
          }
          if (!resolvedCustomerEmail && linkedCust.email) resolvedCustomerEmail = linkedCust.email
          if (!resolvedCustomerAddress && linkedCust.address) resolvedCustomerAddress = linkedCust.address
          if (!resolvedCompanyName && linkedCust.company_name) resolvedCompanyName = linkedCust.company_name
        }
      } catch {}
    }

    // Smart backfill from linked Design Job
    if (designJobId || designNumber) {
      try {
        const designs = PrintERPDataStore.get<any[]>(STORAGE_KEYS.DESIGN_JOBS) || []
        const linkedDesign = designs.find(
          (d) => (designJobId && d.id === designJobId) || (designNumber && d.design_number === designNumber)
        )
        if (linkedDesign) {
          if (!resolvedDesignJobId && linkedDesign.id) resolvedDesignJobId = linkedDesign.id
          if (!resolvedDesignNumber && linkedDesign.design_number) resolvedDesignNumber = linkedDesign.design_number
          if (!resolvedCustomerName && linkedDesign.customer_name) resolvedCustomerName = linkedDesign.customer_name
          if (!resolvedCustomerPhone && linkedDesign.customer_phone) resolvedCustomerPhone = linkedDesign.customer_phone
          if (!resolvedCustomerAddress && linkedDesign.customer_address) resolvedCustomerAddress = linkedDesign.customer_address
          if (!resolvedCompanyName && linkedDesign.company_name) resolvedCompanyName = linkedDesign.company_name
          if (!resolvedItemsSummary && linkedDesign.title) {
            resolvedItemsSummary = `${linkedDesign.title} (${linkedDesign.dimensions_spec || 'Standard'})`
          }
        }
      } catch {}
    }

    // 1. Create or return existing pending invoice request with merged information
    const request = await InvoiceRequestRepository.createRequest({
      company_id: companyId,
      customer_id: resolvedCustomerId,
      customer_name: resolvedCustomerName,
      customer_type: resolvedCustomerType,
      customer_phone: resolvedCustomerPhone,
      whatsapp_number: resolvedWhatsappNumber,
      customer_email: resolvedCustomerEmail,
      customer_address: resolvedCustomerAddress,
      company_name: resolvedCompanyName,
      items: resolvedItems,
      sales_order_id: resolvedSalesOrderId,
      order_number: resolvedOrderNumber,
      job_order_id: resolvedJobOrderId,
      job_number: resolvedJobNumber,
      design_job_id: resolvedDesignJobId,
      design_number: resolvedDesignNumber,
      requested_by_id: input.requestedById || input.requested_by_id || null,
      requested_by_name: input.requestedByName || input.requested_by_name || 'Designer',
      items_summary: resolvedItemsSummary,
      estimated_amount: resolvedEstimatedAmount,
      notes: input.notes || null,
    })

    // 2. Update commercial status on related Sales Order and Design Job
    try {
      const supabase = await createClient()
      if (salesOrderId) {
        await (supabase as any)
          .from('sales_orders')
          .update({
            commercial_status: 'invoice_requested',
            invoice_requested_at: new Date().toISOString(),
          })
          .eq('id', salesOrderId)
          .eq('company_id', companyId)
      }

      if (designJobId) {
        await (supabase as any)
          .from('design_jobs')
          .update({
            commercial_status: 'invoice_requested',
            invoice_request_id: request.id,
          })
          .eq('id', designJobId)
          .eq('company_id', companyId)
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
  static async cancelRequest(id: string, companyId: string, reason?: string, cancelledBy?: string): Promise<boolean> {
    const updated = await InvoiceRequestRepository.updateRequestStatus(id, companyId, 'cancelled', reason)
    return Boolean(updated)
  }
}
