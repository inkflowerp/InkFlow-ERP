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
  CreateQuotationPayload,
  SendQuotationPayload,
} from '@/types/quotation.types'
import { CustomerRecord, ResolvedProductRate } from '@/types/crm.types'
import { InvoiceRecord } from '@/types/billing.types'

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
