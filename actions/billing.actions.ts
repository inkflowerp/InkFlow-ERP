'use server'

import { revalidatePath } from 'next/cache'
import { BillingService } from '@/services/billing.service'
import { AuditService } from '@/services/audit.service'
import { CustomerRepository } from '@/lib/repositories/customer.repository'
import { ProductRepository } from '@/lib/repositories/product.repository'
import { CrmService } from '@/services/crm.service'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'
import {
  InvoiceRecord,
  PaymentRecord,
  FinancialWriteOffRecord,
  BillingPeriod,
  BillingOverviewMetrics,
  CollectionPriorityItem,
  ReceivablesAgingSummary,
  SalespersonCollectionStat,
  PaymentMethodSummaryItem,
  MultiInvoicePaymentInput,
  CreditLimitWarningInfo,
} from '@/types/billing.types'
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
  item_kind?: 'service' | 'ready_product' | 'material' | 'custom' | 'custom_manufacturing' | 'outsource'
  product_type?: string
  category_preset?: 'digital_print' | 'offset_print' | 'signage_fabrication' | 'ready_merchandise' | 'custom' | string | null
  item_name: string
  item_description?: string
  description_bn?: string | null
  material_spec?: string | null
  dimensions_spec?: string
  width?: number
  height?: number
  dimension_unit?: 'ft' | 'inch' | 'm' | string
  area_sft?: number
  quantity: number
  unit?: string
  unit_price: number
  rate_source?: 'custom' | 'last_invoice' | 'default' | 'override' | string | null
  tier_applied?: string
  moq?: number
  unit_cost?: number
  finishing?: string
  add_on?: string
  add_on_rate?: number
  selected_finishing?: Array<{ id: string; name: string; rate?: number; cost?: number }>
  selected_add_ons?: Array<{ id: string; name: string; rate?: number; cost?: number }>
  selected_installation?: { id: string; name: string; rate?: number; cost?: number } | null
  artwork_required?: boolean
  installation_required?: boolean
  offset_specs?: {
    paper_gsm?: number | string | null
    color_mode?: string | null
    binding_type?: string | null
    numbering_required?: boolean | null
    numbering_range?: string | null
    ncr_parts?: number | null
    plates_count?: number | null
  } | null
  signage_specs?: {
    letter_height_inch?: number | null
    led_module_type?: string | null
    led_count?: number | null
    power_supply_watts?: number | null
    frame_structure?: string | null
    installation_type?: string | null
  } | null
  design_required?: boolean
  customer_approval_required?: boolean
  workflow_routing?: 'ready_product' | 'design_required' | 'design_ok' | 'ready_production' | string
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
  customer_name_bn?: string | null
  customer_company?: string
  customer_phone?: string
  customer_whatsapp?: string
  customer_address?: string
  customer_email?: string
  customer_bin?: string
  customer_tin?: string
  customer_type?: string
  invoice_type?: 'sales_invoice' | 'vat_invoice' | 'payment_receipt'
  invoice_date?: string
  due_date?: string
  discount_amount?: number
  vat_percentage?: number
  advance_percentage?: number | null
  advance_amount?: number
  due_on_delivery?: number | null
  payment_method_note?: string | null
  mushak_version?: string | null
  reference_no?: string | null
  payment_method?: 'cash' | 'bkash' | 'nagad' | 'bank' | 'cheque' | 'other_mfs'
  notes?: string
  terms_and_conditions?: string
  language_mode?: 'en' | 'bn' | 'bilingual'
  delivery_date?: string | null
  delivery_location?: string | null
  delivery_method?: string | null
  installation_required?: boolean | null
  quotation_id?: string
  sales_order_id?: string
  job_order_id?: string
  credit_override_reason?: string
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
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

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
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

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
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const products = await ProductRepository.getProducts(companyId, true)
    return { success: true, data: products }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch invoice products.' }
  }
}

/**
 * Server Action: Check customer credit limit before issuing an invoice
 */
export async function checkCustomerCreditLimitAction(
  customerId: string,
  newInvoiceAmount: number,
  requestedCompanyId?: string
): Promise<ServerActionResult<CreditLimitWarningInfo>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const info = await BillingService.checkCustomerCreditLimit(companyId, customerId, newInvoiceAmount)
    return { success: true, data: info }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to check customer credit limit.' }
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
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const hasPermission =
      tenant.companyRole === 'business_owner' ||
      tenant.permissions.includes('invoice.create') ||
      tenant.permissions.includes('invoices.create') ||
      tenant.permissions.includes('billing.create') ||
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
    let customerEmail = payload.customer_email || null
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

      if (newCust.save_customer !== false) {
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
          customerEmail = exactMatch.email || newCust.email || null
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
          customerEmail = createdCust.email || null
        }
      } else {
        customerName = newCust.name.trim()
        customerPhone = newCust.mobile.trim()
        customerAddress = newCust.address.trim()
        customerEmail = newCust.email || null
      }
    }

    if (!customerName) {
      return { success: false, error: 'Valid customer information is required to generate an invoice.' }
    }

    // 2. Calculate line items and totals server-side
    let calculatedSubtotal = 0
    const mappedItems = payload.items.map((it) => {
      const qty = Math.max(0.01, Number(it.quantity) || 1)
      const rate = Math.max(0, Number(it.unit_price) || 0)
      const w = Number(it.width) || 0
      const h = Number(it.height) || 0

      let lineTotal = 0
      if (w > 0 && h > 0 && (it.unit === 'sft' || it.unit === 'sqft' || it.unit === 'sqin')) {
        const area = it.unit === 'sqin' ? (w * h) / 144 : w * h
        lineTotal = Math.round(area * qty * rate)
      } else {
        lineTotal = Math.round(qty * rate)
      }

      calculatedSubtotal += lineTotal

      const dimensionStr = it.dimensions_spec || (w > 0 && h > 0 ? `${w} × ${h} ${it.unit || 'inch'}` : null)
      const specParts: string[] = []
      if (it.finishing && it.finishing !== 'None') specParts.push(`Finishing: ${it.finishing}`)
      if (it.add_on && it.add_on !== 'None') specParts.push(`Add-on: ${it.add_on}`)
      const finishingStr = specParts.length > 0 ? ` (${specParts.join(', ')})` : ''

      const isReady = it.item_kind === 'ready_product' || it.workflow_routing === 'ready_product'
      const routing =
        it.workflow_routing ||
        (isReady
          ? 'ready_product'
          : it.design_required
          ? 'design_required'
          : 'ready_production')

      return {
        product_id: it.product_id || null,
        item_name: it.item_name || 'Printing Item',
        item_description: it.item_description || `${it.item_name || 'Printing Item'}${finishingStr}`,
        description_bn: it.description_bn || null,
        material_spec: it.material_spec || null,
        category_preset: it.category_preset || null,
        dimensions_spec: dimensionStr,
        width: w || undefined,
        height: h || undefined,
        quantity: qty,
        unit: it.unit || 'pcs',
        unit_price: rate,
        rate_source: it.rate_source || 'default',
        tier_applied: it.tier_applied || null,
        moq: it.moq || null,
        unit_cost: it.unit_cost || 0,
        vat_percentage: 0,
        total_price: lineTotal,
        finishing: it.finishing || null,
        selected_finishing: it.selected_finishing || null,
        selected_add_ons: it.selected_add_ons || null,
        selected_installation: it.selected_installation || null,
        artwork_required: Boolean(it.artwork_required),
        installation_required: Boolean(it.installation_required),
        offset_specs: it.offset_specs || null,
        signage_specs: it.signage_specs || null,
        item_kind: it.item_kind || (isReady ? 'ready_product' : 'custom_manufacturing'),
        workflow_routing: routing,
        design_required: Boolean(it.design_required || routing === 'design_required'),
        customer_approval_required: Boolean(it.customer_approval_required),
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
      branch_id: tenant.branchId || null,
      customer_id: resolvedCustomerId || null,
      customer_name: customerName,
      customer_name_bn: payload.customer_name_bn || null,
      customer_company: payload.customer_company || payload.new_customer?.company_name || null,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      customer_address: customerAddress,
      customer_bin: payload.customer_bin || customerBin,
      customer_tin: payload.customer_tin || null,
      customer_type: payload.customer_type || payload.new_customer?.customer_type || 'retail',
      invoice_type: payload.invoice_type || 'sales_invoice',
      invoice_date: payload.invoice_date || new Date().toISOString().split('T')[0],
      due_date: payload.due_date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      quotation_id: payload.quotation_id || null,
      sales_order_id: payload.sales_order_id || null,
      job_order_id: payload.job_order_id || null,
      reference_no: payload.reference_no || null,
      salesperson_id: tenant.userId,
      salesperson_name: tenant.fullName,
      subtotal: calculatedSubtotal,
      discount_amount: discountAmt,
      vat_percentage: vatPct,
      vat_amount: vatAmt,
      grand_total: grandTotal,
      paid_amount: advanceAmt,
      due_amount: dueAmount,
      advance_percentage: payload.advance_percentage !== undefined ? payload.advance_percentage : (grandTotal > 0 ? Math.round((advanceAmt / grandTotal) * 100) : 50),
      advance_amount: advanceAmt,
      due_on_delivery: payload.due_on_delivery !== undefined && payload.due_on_delivery !== null ? payload.due_on_delivery : dueAmount,
      payment_method_note: payload.payment_method_note || null,
      mushak_version: payload.mushak_version || (payload.invoice_type === 'vat_invoice' ? '6.3' : null),
      language_mode: payload.language_mode || 'bn',
      delivery_date: payload.delivery_date || null,
      delivery_location: payload.delivery_location || null,
      delivery_method: payload.delivery_method || 'customer_pickup',
      installation_required: Boolean(payload.installation_required),
      notes: payload.notes || (payload.credit_override_reason ? `[Credit Override: ${payload.credit_override_reason}]` : null),
      terms_and_conditions: payload.terms_and_conditions || null,
      payment_method: payload.payment_method || 'cash',
      idempotency_key: (payload as any).idempotency_key || (payload as any).idempotencyKey || undefined,
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

    try {
      revalidatePath('/[tenantSlug]/invoices', 'page')
      revalidatePath('/[tenantSlug]/billing', 'page')
      revalidatePath('/[tenantSlug]/billing/[id]', 'page')
      revalidatePath('/[tenantSlug]/delivery', 'page')
      revalidatePath('/[tenantSlug]/design', 'page')
      revalidatePath('/[tenantSlug]/production', 'page')
      revalidatePath('/[tenantSlug]/orders', 'page')
      revalidatePath('/', 'layout')
    } catch {}

    return { success: true, data: createdInvoice }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create invoice' }
  }
}

/**
 * Server Action: Fetch single invoice by ID or Invoice Number
 */
export async function getInvoiceByIdAction(
  invoiceId: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<InvoiceRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const invoice = await BillingService.getInvoiceById(invoiceId, companyId)
    if (!invoice) {
      return { success: false, error: 'Invoice not found.' }
    }

    return { success: true, data: invoice }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch invoice.' }
  }
}

/**
 * Server Action: Fetch period-aware billing & collections overview metrics
 */
export async function getBillingOverviewAction(
  period: BillingPeriod = 'this_month',
  customRange?: { start: string; end: string },
  requestedCompanyId?: string
): Promise<ServerActionResult<{
  metrics: BillingOverviewMetrics
  priorityItems: CollectionPriorityItem[]
  paymentMethods: PaymentMethodSummaryItem[]
  salespersonStats: SalespersonCollectionStat[]
}>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const overview = await BillingService.getBillingOverview(companyId, period, customRange)
    return { success: true, data: overview }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch billing overview.' }
  }
}

/**
 * Server Action: Fetch invoices list with flexible filters
 */
export async function getInvoicesAction(
  filters?: {
    status?: string
    customerId?: string
    search?: string
    startDate?: string
    endDate?: string
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<InvoiceRecord[]>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const invoices = await BillingService.getInvoices(companyId, filters)
    return { success: true, data: invoices }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch invoices.' }
  }
}

/**
 * Server Action: Fetch payment records
 */
export async function getPaymentsAction(
  customerId?: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<PaymentRecord[]>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const payments = await BillingService.getPayments(companyId, customerId)
    return { success: true, data: payments }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch payments.' }
  }
}

/**
 * Server Action: Fetch Receivables Aging summary
 */
export async function getReceivablesAgingAction(
  requestedCompanyId?: string
): Promise<ServerActionResult<ReceivablesAgingSummary>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const aging = await BillingService.getReceivablesAging(companyId)
    return { success: true, data: aging }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch receivables aging.' }
  }
}

/**
 * Server Action: Reconciles customer debt balances against invoices, payments, and write-offs
 */
export async function reconcileCustomerBalancesAction(
  customerId?: string,
  autoFix: boolean = false,
  requestedCompanyId?: string
): Promise<ServerActionResult<any>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const report = await BillingService.reconcileCustomerBalances(companyId, customerId, autoFix)
    return { success: true, data: report }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to reconcile customer balances.' }
  }
}

/**
 * Server Action: Securely records a multi-invoice payment allocation
 */
export async function recordMultiInvoicePaymentAction(
  payload: MultiInvoicePaymentInput,
  requestedCompanyId?: string
): Promise<ServerActionResult<PaymentRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const hasPermission =
      tenant.companyRole === 'business_owner' ||
      tenant.permissions.includes('payment.create') ||
      tenant.permissions.includes('payments.create') ||
      tenant.permissions.includes('billing.create')

    if (!hasPermission) {
      return { success: false, error: 'Unauthorized: You do not have permission to record payments.' }
    }

    if (!payload.amount || payload.amount <= 0) {
      return { success: false, error: 'Payment amount must be greater than 0.' }
    }

    const payment = await BillingService.recordMultiInvoicePayment({
      ...payload,
      companyId,
      branchId: tenant.branchId || undefined,
      receivedByName: tenant.fullName || payload.receivedByName || 'Cashier',
      actorUserId: tenant.userId,
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

    try {
      revalidatePath('/[tenantSlug]/invoices', 'page')
      revalidatePath('/[tenantSlug]/billing', 'page')
      revalidatePath('/[tenantSlug]/billing/[id]', 'page')
      revalidatePath('/', 'layout')
    } catch {}
    return { success: true, data: payment }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to record multi-invoice payment.' }
  }
}

/**
 * Server Action: Records single payment (backwards-compatible wrapper)
 */
export async function recordPaymentAction(
  data: {
    invoiceId?: string
    invoice_id?: string
    customerId?: string
    customer_id?: string
    customerName?: string
    customer_name?: string
    amount: number
    paymentMethod?: 'cash' | 'bank' | 'cheque' | 'bkash' | 'nagad' | 'other_mfs'
    payment_method?: 'cash' | 'bank' | 'cheque' | 'bkash' | 'nagad' | 'other_mfs'
    bankName?: string | null
    bank_name?: string | null
    chequeNumber?: string | null
    cheque_number?: string | null
    chequeDate?: string | null
    cheque_date?: string | null
    mfsTransactionId?: string | null
    mfs_transaction_id?: string | null
    notes?: string | null
    receivedByName?: string
    received_by_name?: string
    idempotencyKey?: string
    idempotency_key?: string
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<PaymentRecord>> {
  const customerId = data.customerId || data.customer_id || ''
  const customerName = data.customerName || data.customer_name || ''
  const paymentMethod = data.paymentMethod || data.payment_method || 'cash'
  const invoiceId = data.invoiceId || data.invoice_id
  const idempotencyKey = data.idempotencyKey || data.idempotency_key

  return await recordMultiInvoicePaymentAction(
    {
      customerId,
      customerName,
      amount: data.amount,
      paymentMethod,
      bankName: data.bankName || data.bank_name,
      chequeNumber: data.chequeNumber || data.cheque_number,
      chequeDate: data.chequeDate || data.cheque_date,
      mfsTransactionId: data.mfsTransactionId || data.mfs_transaction_id,
      notes: data.notes,
      receivedByName: data.receivedByName || data.received_by_name,
      idempotencyKey,
      allocations: invoiceId ? [{ invoiceId, amount: data.amount }] : [],
    },
    requestedCompanyId
  )
}

/**
 * Server Action: Records financial write-off / waiver with non-destructive audit logging
 */
export async function recordWriteOffAction(
  writeOffData: {
    invoice_id: string
    amount: number
    reason: string
    authorized_by_name?: string
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<FinancialWriteOffRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const hasPermission =
      tenant.companyRole === 'business_owner' ||
      tenant.permissions.includes('invoices.edit') ||
      tenant.permissions.includes('billing.edit') ||
      tenant.permissions.includes('finance.writeoff')

    if (!hasPermission) {
      return { success: false, error: 'Unauthorized: You do not have permission to authorize financial write-offs.' }
    }

    if (!writeOffData.amount || writeOffData.amount <= 0) {
      return { success: false, error: 'Write-off amount must be greater than 0.' }
    }
    if (!writeOffData.reason || !writeOffData.reason.trim()) {
      return { success: false, error: 'A valid business reason is required for financial write-off.' }
    }

    const writeOff = await BillingService.recordWriteOff({
      company_id: companyId,
      invoice_id: writeOffData.invoice_id,
      amount: writeOffData.amount,
      reason: writeOffData.reason.trim(),
      authorized_by_name: tenant.fullName || writeOffData.authorized_by_name || 'Authorized Manager',
      actor_user_id: tenant.userId,
    })

    try {
      revalidatePath('/[tenantSlug]/invoices', 'page')
      revalidatePath('/[tenantSlug]/billing', 'page')
      revalidatePath('/[tenantSlug]/billing/[id]', 'page')
      revalidatePath('/', 'layout')
    } catch {}
    return { success: true, data: writeOff }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to record financial write-off.' }
  }
}

/**
 * Server Action: Voids / cancels an invoice
 */
export async function cancelInvoiceAction(
  invoiceId: string,
  reason: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<boolean>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const hasPermission =
      tenant.companyRole === 'business_owner' ||
      tenant.permissions.includes('invoices.cancel') ||
      tenant.permissions.includes('invoices.delete') ||
      tenant.permissions.includes('billing.edit')

    if (!hasPermission) {
      return { success: false, error: 'Unauthorized: You do not have permission to cancel invoices.' }
    }

    const success = await BillingService.cancelInvoice(
      invoiceId,
      reason || 'Cancelled by business owner',
      tenant.fullName || 'Authorized Manager',
      companyId,
      tenant.userId
    )

    try {
      revalidatePath('/[tenantSlug]/invoices', 'page')
      revalidatePath('/[tenantSlug]/billing', 'page')
      revalidatePath('/[tenantSlug]/billing/[id]', 'page')
      revalidatePath('/', 'layout')
    } catch {}
    return { success: true, data: success }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to cancel invoice.' }
  }
}

/**
 * Server Action: Safely deletes/cancels an unpaid invoice without reducing subscription creation quota
 */
export async function deleteInvoiceAction(
  invoiceId: string,
  reason: string = 'Deleted by user',
  requestedCompanyId?: string
): Promise<ServerActionResult<boolean>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const hasPermission =
      tenant.companyRole === 'business_owner' ||
      tenant.permissions.includes('invoices.delete') ||
      tenant.permissions.includes('invoices.cancel') ||
      tenant.permissions.includes('billing.edit')

    if (!hasPermission) {
      return { success: false, error: 'Unauthorized: You do not have permission to delete invoices.' }
    }

    const success = await BillingService.deleteInvoice(
      invoiceId,
      companyId,
      tenant.fullName || 'Authorized Manager',
      tenant.userId
    )

    try {
      revalidatePath('/[tenantSlug]/invoices', 'page')
      revalidatePath('/[tenantSlug]/billing', 'page')
      revalidatePath('/[tenantSlug]/billing/[id]', 'page')
      revalidatePath('/', 'layout')
    } catch {}
    return { success: true, data: success }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete invoice.' }
  }
}

/**
 * Server Action: Generates payment reminder WhatsApp link
 */
export async function sendPaymentReminderAction(
  invoiceId: string,
  channelOrCompanyId?: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<{ whatsappUrl?: string }>> {
  try {
    const effectiveCompanyId = requestedCompanyId || (channelOrCompanyId?.startsWith('comp-') ? channelOrCompanyId : undefined)
    const tenant = await getCurrentTenant(effectiveCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const res = await BillingService.sendPaymentReminder({
      companyId,
      invoiceId,
      actorName: tenant.fullName || 'Authorized Officer',
      companyName: tenant.companyName,
      tenantSlug: tenant.companySlug,
    })

    if (!res.success) {
      return { success: false, error: res.error || 'Failed to generate payment reminder.' }
    }

    return { success: true, data: { whatsappUrl: res.whatsappUrl } }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to dispatch payment reminder.' }
  }
}

/**
 * Server Action: Dispatches invoice communication (WhatsApp / Email)
 */
export async function sendInvoiceAction(
  params: {
    invoiceId: string
    channel: 'whatsapp' | 'email' | 'sms'
    format?: 'pdf' | 'text'
    recipientOverride?: string
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<{ messageId: string; whatsappUrl?: string }>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    if (params.channel === 'sms') {
      return { success: false, error: 'SMS dispatch is deprecated and disabled for invoices. Please use WhatsApp or Email with PDF.' }
    }

    const res = await BillingService.sendInvoice({
      companyId,
      invoiceId: params.invoiceId,
      channel: params.channel,
      format: params.format || 'pdf',
      recipientOverride: params.recipientOverride,
      actorName: tenant.fullName,
      userEmail: tenant.userEmail,
      companyName: tenant.companyName,
      tenantSlug: tenant.companySlug,
    })

    if (!res.success) {
      return { success: false, error: res.error || `Failed to send invoice via ${params.channel}.` }
    }

    return {
      success: true,
      data: {
        messageId: res.messageId || `msg-${Date.now()}`,
        whatsappUrl: res.whatsappUrl,
      },
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Communication dispatch error' }
  }
}
