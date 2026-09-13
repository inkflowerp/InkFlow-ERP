'use server'

import { revalidatePath } from 'next/cache'
import { BillingService } from '@/services/billing.service'
import { AuditService } from '@/services/audit.service'
import { CustomerRepository } from '@/lib/repositories/customer.repository'
import { ProductRepository } from '@/lib/repositories/product.repository'
import { CrmService } from '@/services/crm.service'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'
import { InvoiceRecord, PaymentRecord } from '@/types/billing.types'
import { CustomerRecord, ResolvedProductRate } from '@/types/crm.types'

export interface ServerActionResult<T> {
  success: boolean
  data?: T
  error?: string
  duplicateMatch?: boolean
  duplicateCustomer?: CustomerRecord
}

export interface CreateInvoiceItemInput {
  product_id?: string
  item_name: string
  width?: number
  height?: number
  quantity: number
  unit?: string
  unit_price: number
  finishing?: string
  total_price?: number
}

export interface CreateInvoicePayload {
  customer_id?: string
  new_customer?: {
    name: string
    company_name?: string
    mobile: string
    whatsapp?: string
    address: string
    customer_type?: 'retail' | 'reseller' | 'corporate' | 'government'
    email?: string
    save_customer?: boolean
  }
  customer_name?: string
  customer_company?: string
  customer_phone?: string
  customer_whatsapp?: string
  customer_address?: string
  customer_email?: string
  customer_type?: string
  invoice_type?: 'sales_invoice' | 'vat_invoice' | 'service_bill'
  invoice_date?: string
  due_date?: string
  discount_amount?: number
  vat_percentage?: number
  advance_amount?: number
  payment_method?: 'cash' | 'bkash' | 'nagad' | 'bank' | 'cheque'
  notes?: string
  items: CreateInvoiceItemInput[]
}

/**
 * Server Action: Search existing customers for invoice dropdown
 */
export async function searchInvoiceCustomersAction(
  query: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<CustomerRecord[]>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const companyId = tenant?.companyId || requestedCompanyId
    if (!companyId) {
      return { success: false, error: 'Unauthorized: No active tenant context found.' }
    }

    const customers = await CrmService.searchCustomers(query, companyId)
    return { success: true, data: customers.slice(0, 15) }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to search customers.' }
  }
}

/**
 * Server Action: Resolve 3-tier rates for a selected customer
 */
export async function resolveCustomerPricingAction(
  customerId: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<ResolvedProductRate[]>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const companyId = tenant?.companyId || requestedCompanyId
    if (!companyId) {
      return { success: false, error: 'Unauthorized: No active tenant context found.' }
    }

    const resolvedRates = await CustomerRepository.resolveCustomerRates(companyId, customerId)
    return { success: true, data: resolvedRates }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to resolve customer pricing.' }
  }
}

/**
 * Server Action: Fetch active products for invoice line items
 */
export async function getInvoiceProductsAction(
  requestedCompanyId?: string
): Promise<ServerActionResult<any[]>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const companyId = tenant?.companyId || requestedCompanyId
    if (!companyId) {
      return { success: false, error: 'Unauthorized: No active tenant context found.' }
    }

    const products = await ProductRepository.getProducts(companyId, true)
    return { success: true, data: products }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch invoice products.' }
  }
}

/**
 * Server Action: Securely creates an invoice in PostgreSQL with full Save-First guarantees
 */
export async function createInvoiceAction(
  payload: CreateInvoicePayload,
  requestedCompanyId?: string
): Promise<ServerActionResult<InvoiceRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const companyId = tenant?.companyId || requestedCompanyId
    if (!companyId || !tenant) {
      return { success: false, error: 'Unauthorized: No active tenant context found.' }
    }

    const hasPermission =
      tenant.companyRole === 'business_owner' ||
      tenant.permissions.includes('invoice.create') ||
      tenant.permissions.includes('invoices.create') ||
      tenant.permissions.includes('commercial.manage')

    if (!hasPermission) {
      return { success: false, error: 'Unauthorized: You do not have permission to create invoices.' }
    }

    if (!payload.items || payload.items.length === 0) {
      return { success: false, error: 'At least one line item is required to create an invoice.' }
    }

    // 1. Resolve or Create Customer
    let resolvedCustomerId = payload.customer_id
    let customerName = payload.customer_name || ''
    let customerPhone = payload.customer_phone || ''
    let customerAddress = payload.customer_address || ''
    let customerBin = payload.customer_email || null

    if (!resolvedCustomerId && payload.new_customer) {
      const newCust = payload.new_customer
      if (!newCust.name || !newCust.name.trim()) {
        return { success: false, error: 'Customer Name is required.' }
      }
      if (!newCust.mobile || !newCust.mobile.trim()) {
        return { success: false, error: 'Phone Number is required.' }
      }
      if (!newCust.address || !newCust.address.trim()) {
        return { success: false, error: 'Address is required.' }
      }

      // If save_customer is checked (default), create customer record
      if (newCust.save_customer !== false) {
        // Duplicate check
        const dupCheck = await CrmService.findDuplicates(
          {
            mobile: newCust.mobile,
            whatsapp: newCust.whatsapp,
            name: newCust.name,
            company_name: newCust.company_name,
          },
          companyId
        )

        if (dupCheck.hasDuplicate && dupCheck.matches.length > 0) {
          const exactMatch = dupCheck.matches[0].customer
          resolvedCustomerId = exactMatch.id
          customerName = exactMatch.name
          customerPhone = exactMatch.mobile
          customerAddress = exactMatch.address || newCust.address
        } else {
          const createdCust = await CustomerRepository.createCustomer({
            company_id: companyId,
            name: newCust.name.trim(),
            company_name: newCust.company_name?.trim() || null,
            mobile: newCust.mobile.trim(),
            whatsapp: newCust.whatsapp?.trim() || null,
            address: newCust.address.trim(),
            customer_type: newCust.customer_type || 'regular',
            email: newCust.email?.trim().toLowerCase() || null,
          })
          resolvedCustomerId = createdCust.id
          customerName = createdCust.name
          customerPhone = createdCust.mobile
          customerAddress = createdCust.address || ''
        }
      } else {
        // Unsaved customer snapshot
        customerName = newCust.name.trim()
        customerPhone = newCust.mobile.trim()
        customerAddress = newCust.address.trim()
      }
    }

    if (!customerName) {
      return { success: false, error: 'Valid customer information is required to generate an invoice.' }
    }

    // 2. Calculate line items and totals server-side
    let calculatedSubtotal = 0
    const mappedItems = payload.items.map((it, idx) => {
      const qty = Math.max(0.01, Number(it.quantity) || 1)
      const rate = Math.max(0, Number(it.unit_price) || 0)
      const w = Number(it.width) || 0
      const h = Number(it.height) || 0
      
      let lineTotal = 0
      if (w > 0 && h > 0 && (it.unit === 'sft' || it.unit === 'sqft' || it.unit === 'sqin')) {
        const area = it.unit === 'sqin' ? (w * h) / 144 : (w * h)
        lineTotal = Math.round(area * qty * rate)
      } else {
        lineTotal = Math.round(qty * rate)
      }

      calculatedSubtotal += lineTotal

      const dimensionStr = w > 0 && h > 0 ? `${w} × ${h} ${it.unit || 'inch'}` : null
      const finishingStr = it.finishing && it.finishing !== 'None' ? ` (${it.finishing})` : ''

      return {
        product_id: it.product_id || null,
        item_description: `${it.item_name || 'Printing Item'}${finishingStr}`,
        dimensions_spec: dimensionStr,
        quantity: qty,
        unit: it.unit || 'pcs',
        unit_price: rate,
        vat_percentage: 0,
        total_price: lineTotal,
      }
    })

    const discountAmt = Math.max(0, Number(payload.discount_amount) || 0)
    const vatPct = Math.max(0, Number(payload.vat_percentage) || 0)
    const subtotalAfterDiscount = Math.max(0, calculatedSubtotal - discountAmt)
    const vatAmt = Math.round((subtotalAfterDiscount * vatPct) / 100)
    const grandTotal = subtotalAfterDiscount + vatAmt
    const advanceAmt = Math.min(grandTotal, Math.max(0, Number(payload.advance_amount) || 0))
    const dueAmount = Math.max(0, grandTotal - advanceAmt)

    // 3. Persist Invoice in PostgreSQL
    const createdInvoice = await BillingService.createInvoice({
      company_id: companyId,
      customer_id: resolvedCustomerId || '00000000-0000-0000-0000-000000000000',
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_address: customerAddress,
      customer_bin: customerBin,
      invoice_type: payload.invoice_type || 'sales_invoice',
      invoice_date: payload.invoice_date || new Date().toISOString().split('T')[0],
      due_date: payload.due_date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      subtotal: calculatedSubtotal,
      discount_amount: discountAmt,
      vat_percentage: vatPct,
      vat_amount: vatAmt,
      grand_total: grandTotal,
      paid_amount: advanceAmt,
      due_amount: dueAmount,
      notes: payload.notes || null,
      payment_method: payload.payment_method || 'cash',
      items: mappedItems as any,
      created_by_name: tenant.fullName || 'Commercial Executive',
    } as any)

    // 4. Audit Trail
    await AuditService.trackInvoiceCreate(
      companyId,
      tenant.userId,
      tenant.userEmail,
      createdInvoice.id,
      createdInvoice.invoice_number,
      createdInvoice.grand_total,
      createdInvoice.customer_name
    )

    revalidatePath('/', 'layout')
    return { success: true, data: createdInvoice }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create invoice' }
  }
}

/**
 * Server Action: Dispatches invoice communication (WhatsApp / Email / SMS)
 */
export async function sendInvoiceAction(
  params: {
    invoiceId: string
    channel: 'whatsapp' | 'email' | 'sms'
    format: 'pdf' | 'text'
    recipientOverride?: string
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<{ messageId: string }>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const companyId = tenant?.companyId || requestedCompanyId
    if (!companyId || !tenant) {
      return { success: false, error: 'Unauthorized: No active tenant context found.' }
    }

    const res = await BillingService.sendInvoice({
      companyId,
      invoiceId: params.invoiceId,
      channel: params.channel,
      format: params.format,
      recipientOverride: params.recipientOverride,
      actorName: tenant.fullName,
    })

    if (!res.success) {
      return { success: false, error: res.error || `Failed to send invoice via ${params.channel}.` }
    }

    return { success: true, data: { messageId: res.messageId || `msg-${Date.now()}` } }
  } catch (error: any) {
    return { success: false, error: error.message || 'Communication dispatch error' }
  }
}

/**
 * Server Action: Securely records an atomic payment collection
 */
export async function recordPaymentAction(
  paymentData: {
    invoice_id?: string
    customer_id: string
    customer_name: string
    amount: number
    payment_method: 'cash' | 'bkash' | 'nagad' | 'bank_transfer' | 'cheque'
    payment_date?: string
    notes?: string
    bank_name?: string
    cheque_number?: string
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<PaymentRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const companyId = tenant?.companyId || requestedCompanyId
    if (!companyId || !tenant) {
      return { success: false, error: 'Unauthorized: No active tenant context found.' }
    }

    const hasPermission =
      tenant.companyRole === 'business_owner' ||
      tenant.permissions.includes('payment.create') ||
      tenant.permissions.includes('payments.create')

    if (!hasPermission) {
      return { success: false, error: 'Unauthorized: You do not have permission to record payments.' }
    }

    if (!paymentData.amount || paymentData.amount <= 0) {
      return { success: false, error: 'Payment amount must be greater than 0.' }
    }

    const mappedPaymentMethod =
      paymentData.payment_method === 'bank_transfer'
        ? 'bank'
        : paymentData.payment_method

    const payment = await BillingService.recordPayment({
      companyId: companyId,
      customerId: paymentData.customer_id,
      customerName: paymentData.customer_name,
      amount: paymentData.amount,
      paymentMethod: mappedPaymentMethod as any,
      invoiceId: paymentData.invoice_id,
      notes: paymentData.notes,
      receivedByName: tenant.fullName || 'Cashier',
    })

    await AuditService.trackPayment(
      companyId,
      tenant.userId,
      tenant.userEmail,
      payment.id,
      payment.receipt_number,
      payment.amount,
      payment.payment_method
    )

    revalidatePath('/', 'layout')
    return { success: true, data: payment }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to record payment' }
  }
}

