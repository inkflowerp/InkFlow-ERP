'use server'

import { revalidatePath } from 'next/cache'
import { BillingService } from '@/services/billing.service'
import { AuditService } from '@/services/audit.service'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'
import { InvoiceRecord, PaymentRecord } from '@/types/billing.types'

export interface ServerActionResult<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Server Action: Securely creates an invoice in PostgreSQL
 */
export async function createInvoiceAction(
  invoiceData: {
    customer_id: string
    customer_name: string
    customer_phone?: string
    customer_address?: string
    invoice_type?: 'sales_invoice' | 'service_bill' | 'mushak_6_3'
    sales_order_id?: string
    order_number?: string
    invoice_date?: string
    due_date?: string
    subtotal: number
    discount_amount?: number
    vat_percentage?: number
    vat_amount?: number
    grand_total: number
    notes?: string
    items: Array<{
      item_name: string
      quantity: number
      unit_price: number
      total_price: number
      unit?: string
      width?: number
      height?: number
      media_type?: string
    }>
  },
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
      tenant.permissions.includes('invoices.create')

    if (!hasPermission) {
      return { success: false, error: 'Unauthorized: You do not have permission to create invoices.' }
    }

    if (!invoiceData.customer_id || !invoiceData.customer_name) {
      return { success: false, error: 'Customer is required to generate an invoice.' }
    }

    if (!invoiceData.items || invoiceData.items.length === 0) {
      return { success: false, error: 'At least one line item is required.' }
    }

    const mappedItems = (invoiceData.items || []).map((it, idx) => ({
      id: `item-${Date.now()}-${idx}`,
      item_description: it.item_name || 'Printing Item',
      dimensions_spec: it.width && it.height ? `${it.width} x ${it.height} ${it.unit || 'inch'}` : null,
      quantity: it.quantity,
      unit: it.unit || 'pcs',
      unit_price: it.unit_price,
      vat_percentage: 0,
      total_price: it.total_price,
    }))

    const created = await BillingService.createInvoice({
      ...invoiceData,
      invoice_type: invoiceData.invoice_type === 'mushak_6_3' ? 'vat_invoice' : 'sales_invoice',
      customer_phone: invoiceData.customer_phone || '',
      due_date: invoiceData.due_date || new Date().toISOString().split('T')[0],
      items: mappedItems as any,
      company_id: companyId,
      created_by_name: tenant.fullName || 'Billing Officer',
    })

    await AuditService.trackInvoiceCreate(
      companyId,
      tenant.userId,
      tenant.userEmail,
      created.id,
      created.invoice_number,
      created.grand_total,
      created.customer_name
    )

    revalidatePath('/', 'layout')
    return { success: true, data: created }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create invoice' }
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
