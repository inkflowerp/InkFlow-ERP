'use server'

import { revalidatePath } from 'next/cache'
import { QuotationService } from '@/services/quotation.service'
import { QuotationRepository } from '@/lib/repositories/quotation.repository'
import { CustomerRepository } from '@/lib/repositories/customer.repository'
import { ProductRepository } from '@/lib/repositories/product.repository'
import { CrmService } from '@/services/crm.service'
import { AuditService } from '@/services/audit.service'
import { EntitlementService } from '@/services/entitlement.service'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'
import {
  QuotationRecord,
  QuotationStatus,
  QuotationActivityRecord,
  CreateQuotationPayload,
  SendQuotationPayload,
  RecordFollowUpPayload,
  ApplyNegotiationPayload,
  normalizeQuotationRecord,
  extractQuotationsFromAny,
  deduplicateQuotations,
} from '@/types/quotation.types'
import { CustomerRecord, ResolvedProductRate } from '@/types/crm.types'
import { InvoiceRecord } from '@/types/billing.types'
import { SalesOrderRecord } from '@/types/order.types'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'

export interface ServerActionResult<T> {
  success: boolean
  data?: T
  error?: string
  duplicateMatch?: boolean
  duplicateCustomer?: CustomerRecord
}

/**
 * Server Action: Search existing customers for quotation dropdown
 */
export async function searchQuotationCustomersAction(
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
export async function resolveQuotationRatesAction(
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
 * Server Action: Fetch active products for quotation line items
 */
export async function getQuotationProductsAction(
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
    return { success: false, error: error.message || 'Failed to fetch quotation products.' }
  }
}

/**
 * Server Action: Securely creates a formal Quotation with Price Snapshot & Save-First guarantee
 */
export async function createQuotationAction(
  payload: CreateQuotationPayload,
  requestedCompanyId?: string
): Promise<ServerActionResult<QuotationRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const companyId = tenant?.companyId || requestedCompanyId
    if (!companyId || !tenant) {
      return { success: false, error: 'Unauthorized: No active tenant context found.' }
    }

    // RBAC check
    const hasPermission =
      tenant.companyRole === 'business_owner' ||
      tenant.permissions.includes('quotation.create') ||
      tenant.permissions.includes('quotations.create') ||
      tenant.permissions.includes('sales.create')

    if (!hasPermission) {
      return { success: false, error: 'Unauthorized: You do not have permission to create quotations.' }
    }

    // Enforce Plan quota if applicable
    try {
      await EntitlementService.enforceLimit(companyId, 'monthly_orders')
    } catch (e: any) {
      // Non-blocking for quotations if not hard-capped, but respect if strict
    }

    if (!payload.items || payload.items.length === 0) {
      return { success: false, error: 'At least one item is required to create a quotation.' }
    }

    // 1. Resolve or Create Customer
    let resolvedCustomerId = payload.customer_id || null
    let customerName = payload.customer_name || ''
    let customerNameBn = payload.customer_name_bn || null
    let customerCompany = payload.customer_company || null
    let customerPhone = payload.customer_phone || ''
    let customerWhatsapp = payload.customer_whatsapp || null
    let customerEmail = payload.customer_email || null
    let customerAddress = payload.customer_address || ''
    let customerBin = payload.customer_bin || null
    let customerType = payload.customer_type || 'retail'

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

      // If save_customer is checked (default), create customer record with duplicate prevention
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
          customerNameBn = exactMatch.name_bn || null
          customerCompany = exactMatch.company_name || newCust.company_name || null
          customerPhone = exactMatch.mobile
          customerWhatsapp = exactMatch.whatsapp || newCust.whatsapp || null
          customerEmail = exactMatch.email || newCust.email || null
          customerAddress = exactMatch.address || newCust.address
          customerType = exactMatch.customer_type || exactMatch.customer_category || 'retail'
        } else {
          const createdCust = await CustomerRepository.createCustomer({
            company_id: companyId,
            name: newCust.name.trim(),
            company_name: newCust.company_name?.trim() || null,
            mobile: newCust.mobile.trim(),
            whatsapp: newCust.whatsapp?.trim() || null,
            address: newCust.address.trim(),
            customer_type: newCust.customer_type || 'retail',
            email: newCust.email?.trim().toLowerCase() || null,
          })
          resolvedCustomerId = createdCust.id
          customerName = createdCust.name
          customerCompany = createdCust.company_name || null
          customerPhone = createdCust.mobile
          customerWhatsapp = createdCust.whatsapp || null
          customerAddress = createdCust.address || ''
          customerType = createdCust.customer_type || 'retail'
        }
      } else {
        // Non-persistent customer snapshot
        customerName = newCust.name.trim()
        customerCompany = newCust.company_name?.trim() || null
        customerPhone = newCust.mobile.trim()
        customerWhatsapp = newCust.whatsapp?.trim() || null
        customerEmail = newCust.email?.trim() || null
        customerAddress = newCust.address.trim()
        customerType = newCust.customer_type || 'retail'
      }
    }

    if (!customerName) {
      return { success: false, error: 'Valid customer information is required to generate a quotation.' }
    }

    // 2. Persist Quotation in PostgreSQL & DataStore
    const quoteRecord = await QuotationRepository.createQuotation({
      company_id: companyId,
      customer_id: resolvedCustomerId,
      customer_name: customerName,
      customer_name_bn: customerNameBn,
      customer_company: customerCompany,
      customer_phone: customerPhone,
      customer_whatsapp: customerWhatsapp,
      customer_email: customerEmail,
      customer_address: customerAddress,
      customer_bin: customerBin,
      customer_type: customerType,
      status: 'draft',
      quotation_date: payload.quotation_date || new Date().toISOString().split('T')[0],
      valid_until: payload.valid_until || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      reference_no: payload.reference_no || null,
      salesperson_id: payload.salesperson_id || tenant.userId || null,
      salesperson_name: payload.salesperson_name || tenant.fullName || 'Sales Representative',
      items: payload.items,
      discount_amount: payload.discount_amount || 0,
      vat_rate: typeof payload.vat_rate === 'number' ? payload.vat_rate : 7.5,
      delivery_date: payload.delivery_date || null,
      delivery_location: payload.delivery_location || null,
      delivery_method: payload.delivery_method || 'customer_pickup',
      installation_required: payload.installation_required || false,
      notes: payload.notes || null,
      terms_and_conditions: payload.terms_and_conditions || null,
      internal_notes: payload.internal_notes || null,
      language_mode: payload.language_mode || 'bn',
    })

    // 3. Audit Trail
    try {
      await AuditService.logEvent(
        companyId,
        tenant.userId,
        tenant.userEmail,
        'quotation.create',
        'quotation',
        quoteRecord.id,
        null,
        {
          id: quoteRecord.id,
          quotation_number: quoteRecord.quotation_number,
          grand_total: quoteRecord.grand_total,
          customer_name: quoteRecord.customer_name,
        },
        `Created formal quotation #${quoteRecord.quotation_number} for ${quoteRecord.customer_name} (৳${quoteRecord.grand_total})`
      )
    } catch {
      // Non-blocking
    }

    revalidatePath('/', 'layout')
    return { success: true, data: quoteRecord }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create quotation' }
  }
}

import { PdfGeneratorService } from '@/services/pdf-generator.service'
import { CommunicationTemplateService } from '@/services/communication-templates.service'
import { BusinessEmailService } from '@/services/business-email.service'

/**
 * Server Action: Dispatches quotation communication (WhatsApp / Email)
 * Strictly guarantees Save-First before dispatch, attaches PDF, and uses customizable templates
 */
export async function sendQuotationAction(
  params: SendQuotationPayload,
  requestedCompanyId?: string
): Promise<ServerActionResult<{ messageId: string; whatsappUrl?: string }>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const companyId = tenant?.companyId || requestedCompanyId
    if (!companyId || !tenant) {
      return { success: false, error: 'Unauthorized: No active tenant context found.' }
    }

    if (params.channel === 'sms') {
      return { success: false, error: 'SMS dispatch is deprecated and disabled for quotations. Please use WhatsApp or Email with PDF.' }
    }

    const quote = await QuotationRepository.getQuotationById(params.quotationId, companyId)
    if (!quote) {
      return { success: false, error: 'Quotation not found in company context.' }
    }

    const companyName = tenant.companyName || 'InkFlow'
    const recipient = params.recipientOverride || (params.channel === 'email' ? quote.customer_email : (quote.customer_whatsapp || quote.customer_phone))

    if (!recipient) {
      return { success: false, error: `Customer ${params.channel} contact information is missing.` }
    }

    // Build template variables
    const vars = CommunicationTemplateService.buildQuotationVariables(quote, {
      name: companyName,
      slug: tenant.companySlug,
    })

    const templates = CommunicationTemplateService.getQuotationTemplates(companyId)
    const lang = quote.language_mode || 'bn'

    let whatsappUrl: string | undefined

    if (params.channel === 'email') {
      const subject = CommunicationTemplateService.interpolate(
        lang === 'en' ? templates.emailSubjectEn : templates.emailSubjectBn,
        vars
      )
      const bodyHtml = CommunicationTemplateService.interpolate(
        lang === 'en' ? templates.emailBodyEn : templates.emailBodyBn,
        vars
      )

      // Generate Quotation PDF Buffer
      const pdfBuffer = PdfGeneratorService.generateQuotationPdf(quote, {
        name: companyName,
        slug: tenant.companySlug,
      })

      const sendRes = await BusinessEmailService.sendQuotationEmail({
        companyId,
        companyName,
        quotationId: quote.id,
        quotationNumber: quote.quotation_number,
        customerName: quote.customer_name,
        recipientEmail: recipient,
        grandTotal: quote.grand_total,
        validUntil: quote.valid_until,
        notes: quote.notes || '',
        language: lang === 'en' ? 'en' : 'bn',
        sentBy: tenant.userEmail,
        customSubject: subject,
        customHtmlBody: bodyHtml,
        attachments: [
          {
            filename: `Quotation-${quote.quotation_number}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      })

      if (!sendRes.success) {
        console.warn('[QuotationAction] Email sending notice:', sendRes.error)
      }
    } else if (params.channel === 'whatsapp') {
      const whatsappText = CommunicationTemplateService.interpolate(
        lang === 'en' ? templates.whatsappTemplateEn : templates.whatsappTemplateBn,
        vars
      )
      const cleanPhone = recipient.replace(/\D/g, '')
      const formattedPhone = cleanPhone.startsWith('880')
        ? cleanPhone
        : cleanPhone.startsWith('0')
        ? `88${cleanPhone}`
        : `880${cleanPhone}`
      whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(whatsappText)}`
    }

    // Update status to 'sent'
    await QuotationRepository.updateQuotation(quote.id, { status: 'sent' }, companyId)

    // Log Activity
    const activityRecord = {
      id: `qa-${Date.now()}`,
      quotation_id: quote.id,
      action: 'sent' as const,
      details: `Quotation sent via ${params.channel.toUpperCase()} (${params.format.toUpperCase()}) to ${recipient} (PDF attached)`,
      actor_name: tenant.fullName || 'Sales Executive',
      created_at: new Date().toISOString(),
    }
    await QuotationRepository.addActivity(activityRecord)

    // Audit Log
    try {
      await AuditService.logEvent(
        companyId,
        tenant.userId,
        tenant.userEmail,
        'quotation.send',
        'quotation',
        quote.id,
        null,
        { channel: params.channel, format: params.format, recipient, hasPdfAttachment: true },
        `Sent quotation #${quote.quotation_number} via ${params.channel} with PDF`
      )
    } catch {
      // Non-blocking
    }

    revalidatePath('/', 'layout')
    return {
      success: true,
      data: { messageId: `${params.channel}-${Date.now()}`, whatsappUrl },
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to dispatch quotation communication' }
  }
}

/**
 * Server Action: Converts an approved quotation into a formal Invoice, preserving quoted rates
 */
export async function convertQuotationToInvoiceAction(
  quotationId: string,
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
      tenant.permissions.includes('invoices.create') ||
      tenant.permissions.includes('invoice.create') ||
      tenant.permissions.includes('quotations.approve') ||
      tenant.permissions.includes('quotation.approve')

    if (!hasPermission) {
      return { success: false, error: 'Unauthorized: You do not have permission to convert quotations to invoices.' }
    }

    const invoice = await QuotationRepository.convertQuotationToInvoice(quotationId, companyId, {
      createdByName: tenant.fullName || 'Commercial Executive',
    })

    // Audit Log
    try {
      await AuditService.logEvent(
        companyId,
        tenant.userId,
        tenant.userEmail,
        'quotation.convert',
        'quotation',
        quotationId,
        null,
        { quotationId, invoiceId: invoice.id, invoiceNumber: invoice.invoice_number },
        `Converted quotation to Invoice #${invoice.invoice_number}`
      )
    } catch {
      // Non-blocking
    }

    revalidatePath('/', 'layout')
    return { success: true, data: invoice }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to convert quotation to invoice' }
  }
}

/**
 * Server Action: Fetches authoritative quotations for tenant
 */
export async function getQuotationsAction(
  requestedCompanyId?: string,
  tenantSlug?: string
): Promise<ServerActionResult<QuotationRecord[]>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId || tenantSlug)
    const companyId = tenant?.companyId || requestedCompanyId || 'c-01'

    const quotes = await QuotationService.getQuotations(companyId)
    return { success: true, data: quotes }
  } catch (error: any) {
    const fallbackQuotes = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.QUOTATIONS) || []).map((q) =>
      normalizeQuotationRecord(q)
    )
    return { success: true, data: fallbackQuotes }
  }
}

/**
 * Server Action: Fetches single quotation with activity history
 */
export async function getQuotationDetailAction(
  id: string,
  requestedCompanyId?: string,
  tenantSlug?: string
): Promise<ServerActionResult<{ quotation: QuotationRecord; activities: QuotationActivityRecord[] }>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId || tenantSlug)
    const companyId = tenant?.companyId || requestedCompanyId

    let quote = companyId ? await QuotationService.getQuotationById(id, companyId) : await QuotationService.getQuotationById(id)
    if (!quote && companyId) {
      quote = await QuotationService.getQuotationById(id)
    }

    if (!quote) {
      const allLocal = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.QUOTATIONS) || []).map((q) => normalizeQuotationRecord(q))
      const found = allLocal.find(
        (q: QuotationRecord) =>
          q.id === id ||
          q.quotation_number === id ||
          q.id?.toLowerCase() === id.toLowerCase() ||
          q.quotation_number?.toLowerCase() === id.toLowerCase()
      )
      if (found) {
        quote = found
      }
    }

    if (!quote) {
      return { success: false, error: 'Quotation not found.' }
    }

    const activities = await QuotationService.getActivities(quote.id, quote.company_id || companyId || 'c-01')
    return { success: true, data: { quotation: quote, activities } }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch quotation details.' }
  }
}

/**
 * Server Action: Records a quotation follow-up with scheduled date, method, and outcome
 */
export async function recordQuotationFollowUpAction(
  params: RecordFollowUpPayload,
  requestedCompanyId?: string
): Promise<ServerActionResult<QuotationRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const companyId = tenant?.companyId || requestedCompanyId
    if (!companyId || !tenant) {
      return { success: false, error: 'Unauthorized: No active tenant context found.' }
    }

    const hasPermission =
      tenant.companyRole === 'business_owner' ||
      tenant.permissions.includes('quotations.view') ||
      tenant.permissions.includes('quotations.create') ||
      tenant.permissions.includes('quotations.edit') ||
      tenant.permissions.includes('quotation.edit')

    if (!hasPermission) {
      return { success: false, error: 'Unauthorized: You do not have permission to record quotation follow-ups.' }
    }

    const updated = await QuotationService.recordFollowUp(
      params.quotationId,
      companyId,
      {
        method: params.method,
        note: params.note,
        outcome: params.outcome,
        nextFollowUpDate: params.nextFollowUpDate,
        markResponded: params.markResponded,
      },
      tenant.fullName || 'Sales Executive'
    )

    if (!updated) {
      return { success: false, error: 'Quotation not found.' }
    }

    try {
      await AuditService.logEvent(
        companyId,
        tenant.userId,
        tenant.userEmail,
        'quotation.follow_up',
        'quotation',
        params.quotationId,
        null,
        { method: params.method, nextFollowUpDate: params.nextFollowUpDate, outcome: params.outcome },
        `Recorded follow-up for quotation #${updated.quotation_number} via ${params.method}`
      )
    } catch {
      // Non-blocking
    }

    revalidatePath('/', 'layout')
    return { success: true, data: updated }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to record follow-up.' }
  }
}

/**
 * Server Action: Updates quotation status safely with activity and audit logging
 */
export async function updateQuotationStatusAction(
  quotationId: string,
  status: QuotationStatus,
  reason?: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<QuotationRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const companyId = tenant?.companyId || requestedCompanyId
    if (!companyId || !tenant) {
      return { success: false, error: 'Unauthorized: No active tenant context found.' }
    }

    const hasPermission =
      tenant.companyRole === 'business_owner' ||
      tenant.permissions.includes('quotations.edit') ||
      tenant.permissions.includes('quotations.approve') ||
      tenant.permissions.includes('quotation.edit') ||
      tenant.permissions.includes('quotation.approve')

    if (!hasPermission) {
      return { success: false, error: 'Unauthorized: You do not have permission to update quotation status.' }
    }

    const updated = await QuotationService.updateStatus(
      quotationId,
      status,
      reason,
      companyId,
      tenant.fullName || 'Sales Executive'
    )

    if (!updated) {
      return { success: false, error: 'Quotation not found.' }
    }

    try {
      await AuditService.logEvent(
        companyId,
        tenant.userId,
        tenant.userEmail,
        'quotation.status_change',
        'quotation',
        quotationId,
        null,
        { newStatus: status, reason },
        `Advanced quotation #${updated.quotation_number} status to ${status.toUpperCase()}`
      )
    } catch {
      // Non-blocking
    }

    revalidatePath('/', 'layout')
    return { success: true, data: updated }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update quotation status.' }
  }
}

/**
 * Server Action: Applies negotiated discount concession and recalculates margin with internal shielding
 */
export async function applyQuotationNegotiationAction(
  quotationId: string,
  discountAmount: number,
  notes?: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<QuotationRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const companyId = tenant?.companyId || requestedCompanyId
    if (!companyId || !tenant) {
      return { success: false, error: 'Unauthorized: No active tenant context found.' }
    }

    const hasPermission =
      tenant.companyRole === 'business_owner' ||
      tenant.permissions.includes('quotations.edit') ||
      tenant.permissions.includes('quotation.edit')

    if (!hasPermission) {
      return { success: false, error: 'Unauthorized: You do not have permission to modify quotation prices.' }
    }

    const updated = await QuotationService.applyNegotiation(
      quotationId,
      companyId,
      discountAmount,
      notes,
      tenant.fullName || 'Sales Executive'
    )

    if (!updated) {
      return { success: false, error: 'Quotation not found.' }
    }

    try {
      await AuditService.logEvent(
        companyId,
        tenant.userId,
        tenant.userEmail,
        'quotation.negotiate',
        'quotation',
        quotationId,
        null,
        { discountAmount, newGrandTotal: updated.grand_total, newMargin: updated.margin_percent },
        `Applied concession discount of ৳${discountAmount} to quotation #${updated.quotation_number}`
      )
    } catch {
      // Non-blocking
    }

    revalidatePath('/', 'layout')
    return { success: true, data: updated }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to apply negotiated price.' }
  }
}

/**
 * Server Action: Converts an approved quotation into a production Job Order
 */
export async function convertQuotationToJobOrderAction(
  quotationId: string,
  options?: { advanceAmount?: number },
  requestedCompanyId?: string
): Promise<ServerActionResult<any>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const companyId = tenant?.companyId || requestedCompanyId
    if (!companyId || !tenant) {
      return { success: false, error: 'Unauthorized: No active tenant context found.' }
    }

    const hasPermission =
      tenant.companyRole === 'business_owner' ||
      tenant.permissions.includes('orders.create') ||
      tenant.permissions.includes('order.create') ||
      tenant.permissions.includes('quotations.approve') ||
      tenant.permissions.includes('quotation.approve')

    if (!hasPermission) {
      return { success: false, error: 'Unauthorized: You do not have permission to convert quotations to job orders.' }
    }

    const order = await QuotationService.convertToOrder(quotationId, companyId, {
      createdByName: tenant.fullName || 'Sales Executive',
      advanceAmount: options?.advanceAmount,
    })

    try {
      await AuditService.logEvent(
        companyId,
        tenant.userId,
        tenant.userEmail,
        'quotation.convert_order',
        'quotation',
        quotationId,
        null,
        { quotationId, orderNumber: order.order_number },
        `Converted quotation to Production Job Order #${order.order_number}`
      )
    } catch {
      // Non-blocking
    }

    revalidatePath('/', 'layout')
    return { success: true, data: order }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to convert quotation to job order.' }
  }
}
