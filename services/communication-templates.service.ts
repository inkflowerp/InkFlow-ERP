// ==============================================================================
// PrintERP SaaS - Unified Communication Template Service
// Manages and renders customizable Email Subjects, Email Bodies, and WhatsApp
// templates for Quotations and Invoices with strictly supported template variables.
// ==============================================================================

import { PrintERPDataStore, STORAGE_KEYS } from '../lib/db/data-store.ts'
import type { DocumentType, DocumentTemplateConfigRecord } from '../types/tax-and-docs.types.ts'
import type { QuotationRecord } from '../types/quotation.types.ts'
import type { InvoiceRecord } from '../types/billing.types.ts'

export interface TemplateVariableDefinition {
  tag: string
  name: string
  description: string
  category: 'company' | 'customer' | 'quotation' | 'invoice' | 'user'
  example: string
}

export const SUPPORTED_TEMPLATE_VARIABLES: {
  company: TemplateVariableDefinition[]
  customer: TemplateVariableDefinition[]
  quotation: TemplateVariableDefinition[]
  invoice: TemplateVariableDefinition[]
  user: TemplateVariableDefinition[]
} = {
  company: [
    { tag: '{{company_name}}', name: 'Company Name', description: 'Your business / tenant trade name', category: 'company', example: 'Print & Signage Enterprise' },
    { tag: '{{company_phone}}', name: 'Company Phone', description: 'Official company phone / hotline', category: 'company', example: '+880 1711-000000' },
    { tag: '{{company_email}}', name: 'Company Email', description: 'Official business email', category: 'company', example: 'billing@example.com' },
    { tag: '{{company_address}}', name: 'Company Address', description: 'Registered business address', category: 'company', example: '12/A Motijheel C/A, Dhaka' },
    { tag: '{{company_website}}', name: 'Company Website', description: 'Public website or portal URL', category: 'company', example: 'https://demo.printerp.app' },
  ],
  customer: [
    { tag: '{{customer_name}}', name: 'Customer Name', description: 'Client contact person or name', category: 'customer', example: 'Ashiqur Rahman' },
    { tag: '{{customer_company}}', name: 'Customer Company', description: 'Client organization / company name', category: 'customer', example: 'Metro Advertising Ltd.' },
    { tag: '{{customer_phone}}', name: 'Customer Phone', description: 'Customer mobile / phone number', category: 'customer', example: '+880 1711-223344' },
    { tag: '{{customer_whatsapp}}', name: 'Customer WhatsApp', description: 'WhatsApp number for chat messaging', category: 'customer', example: '+880 1711-223344' },
    { tag: '{{customer_email}}', name: 'Customer Email', description: 'Customer email address', category: 'customer', example: 'ashiq@metromedia.com' },
    { tag: '{{customer_address}}', name: 'Customer Address', description: 'Delivery / billing street address', category: 'customer', example: 'Gulshan-2, Dhaka' },
  ],
  quotation: [
    { tag: '{{quotation_number}}', name: 'Quotation Number', description: 'Unique quotation identifier', category: 'quotation', example: 'Q-2026-0842' },
    { tag: '{{quotation_date}}', name: 'Quotation Date', description: 'Date the quotation was generated', category: 'quotation', example: '2026-09-14' },
    { tag: '{{valid_until}}', name: 'Valid Until', description: 'Quotation validity expiry date', category: 'quotation', example: '2026-09-29' },
    { tag: '{{quotation_subtotal}}', name: 'Quotation Subtotal', description: 'Subtotal before discount and tax', category: 'quotation', example: '42,000' },
    { tag: '{{quotation_discount}}', name: 'Quotation Discount', description: 'Total discount amount', category: 'quotation', example: '0' },
    { tag: '{{quotation_vat}}', name: 'Quotation VAT', description: 'Calculated VAT / tax amount', category: 'quotation', example: '3,500' },
    { tag: '{{quotation_total}}', name: 'Quotation Total', description: 'Grand total quotation amount', category: 'quotation', example: '45,500' },
    { tag: '{{quotation_notes}}', name: 'Quotation Notes', description: 'Special remarks or notes', category: 'quotation', example: 'Standard turnaround 3-5 days' },
  ],
  invoice: [
    { tag: '{{invoice_number}}', name: 'Invoice Number', description: 'Unique sales invoice number', category: 'invoice', example: 'INV-2026-1055' },
    { tag: '{{invoice_date}}', name: 'Invoice Date', description: 'Date invoice was issued', category: 'invoice', example: '2026-09-14' },
    { tag: '{{invoice_subtotal}}', name: 'Invoice Subtotal', description: 'Subtotal before discounts/taxes', category: 'invoice', example: '42,000' },
    { tag: '{{invoice_discount}}', name: 'Invoice Discount', description: 'Total discount deducted', category: 'invoice', example: '0' },
    { tag: '{{invoice_vat}}', name: 'Invoice VAT', description: 'Calculated VAT amount', category: 'invoice', example: '3,500' },
    { tag: '{{invoice_total}}', name: 'Invoice Total', description: 'Invoice grand total', category: 'invoice', example: '45,500' },
    { tag: '{{paid_amount}}', name: 'Paid Amount', description: 'Amount collected / paid so far', category: 'invoice', example: '20,000' },
    { tag: '{{due_amount}}', name: 'Due Amount', description: 'Current outstanding due balance', category: 'invoice', example: '25,500' },
    { tag: '{{payment_status}}', name: 'Payment Status', description: 'Invoice status (UNPAID / PAID / PARTIALLY PAID)', category: 'invoice', example: 'PARTIALLY PAID' },
  ],
  user: [
    { tag: '{{prepared_by}}', name: 'Prepared By', description: 'Staff who created the document', category: 'user', example: 'Kazi Farhan' },
    { tag: '{{salesperson_name}}', name: 'Salesperson Name', description: 'Assigned sales representative', category: 'user', example: 'Tanvir Ahmed' },
  ],
}

export interface QuotationCommunicationTemplate {
  emailSubjectEn: string
  emailSubjectBn: string
  emailBodyEn: string
  emailBodyBn: string
  whatsappTemplateEn: string
  whatsappTemplateBn: string
}

export interface InvoiceCommunicationTemplate {
  emailSubjectEn: string
  emailSubjectBn: string
  emailBodyEn: string
  emailBodyBn: string
  whatsappTemplateEn: string
  whatsappTemplateBn: string
}

export const DEFAULT_QUOTATION_COMMUNICATION_TEMPLATE: QuotationCommunicationTemplate = {
  emailSubjectEn: 'Official Quotation #{{quotation_number}} from {{company_name}} [৳ {{quotation_total}}]',
  emailSubjectBn: 'বাণিজ্যিক কোটেশন #{{quotation_number}} - {{company_name}} [৳ {{quotation_total}}]',
  emailBodyEn: `<p>Dear <strong>{{customer_name}}</strong>,</p>
<p>Thank you for reaching out to <strong>{{company_name}}</strong>. Please find attached our official price proposal for your requested print items.</p>
<div class="info-card">
  <table>
    <tr><td class="label">Quotation #:</td><td class="value"><strong>{{quotation_number}}</strong></td></tr>
    <tr><td class="label">Issue Date:</td><td class="value">{{quotation_date}}</td></tr>
    <tr><td class="label">Valid Until:</td><td class="value">{{valid_until}}</td></tr>
    <tr><td class="label">Grand Total:</td><td class="value"><strong>৳ {{quotation_total}}</strong></td></tr>
  </table>
</div>
<p><strong>Item Overview:</strong><br>{{items_summary}}</p>
<p>The formal PDF proposal has been attached to this email for your convenience and records.</p>
<p><a href="{{document_link}}" class="btn">View & Approve Quotation Online</a></p>
<p>Thank you for choosing {{company_name}}!</p>`,
  emailBodyBn: `<p>প্রিয় <strong>{{customer_name}}</strong>,</p>
<p><strong>{{company_name}}</strong>-এর সাথে যোগাযোগের জন্য ধন্যবাদ। আপনার অনুরোধকৃত প্রিন্ট কাজের বিস্তারিত কোটেশন পত্রটি এই ইমেইলের সাথে পিডিএফ (PDF) হিসেবে সংযুক্ত করা হলো।</p>
<div class="info-card">
  <table>
    <tr><td class="label">কোটেশন নং:</td><td class="value"><strong>{{quotation_number}}</strong></td></tr>
    <tr><td class="label">প্রদানের তারিখ:</td><td class="value">{{quotation_date}}</td></tr>
    <tr><td class="label">মেয়াদ:</td><td class="value">{{valid_until}}</td></tr>
    <tr><td class="label">মোট মূল্য:</td><td class="value"><strong>৳ {{quotation_total}}</strong></td></tr>
  </table>
</div>
<p><a href="{{document_link}}" class="btn">কোটেশন বিস্তারিত দেখুন ও অনুমোদন দিন</a></p>
<p>ধন্যবাদান্তে,<br><strong>{{company_name}}</strong></p>`,
  whatsappTemplateEn: `*OFFICIAL QUOTATION - {{company_name}}*

Dear {{customer_name}},
Thank you for your inquiry! Here is your official price proposal:

📄 *Quotation No:* #{{quotation_number}}
📅 *Date:* {{quotation_date}}
⏳ *Valid Until:* {{valid_until}}

📋 *Items Summary:*
{{items_summary}}

💵 *Grand Total:* ৳ {{quotation_total}}

🔗 *View & Approve Online:* {{document_link}}

_Thank you for doing business with {{company_name}}!_`,
  whatsappTemplateBn: `*বাণিজ্যিক দরপত্র (কোটেশন) - {{company_name}}*

প্রিয় {{customer_name}},
আমাদের সাথে যোগাযোগের জন্য ধন্যবাদ। আপনার কোটেশন বিবরণ:

📄 *কোটেশন নং:* #{{quotation_number}}
📅 *তারিখ:* {{quotation_date}}
⏳ *মেয়াদ:* {{valid_until}} পর্যন্ত

📋 *আইটেম বিবরণ:*
{{items_summary}}

💵 *সর্বমোট বিল:* ৳ {{quotation_total}}

🔗 *কোটেশন দেখুন ও অনুমোদন দিন:* {{document_link}}

_{{company_name}}_`,
}

export const DEFAULT_INVOICE_COMMUNICATION_TEMPLATE: InvoiceCommunicationTemplate = {
  emailSubjectEn: 'Commercial Sales Invoice #{{invoice_number}} from {{company_name}} [Due: ৳ {{due_amount}}]',
  emailSubjectBn: 'বাণিজ্যিক ইনভয়েস #{{invoice_number}} - {{company_name}} [বকেয়া: ৳ {{due_amount}}]',
  emailBodyEn: `<p>Dear <strong>{{customer_name}}</strong>,</p>
<p>We have generated Invoice <strong>#{{invoice_number}}</strong> for your recent print production with <strong>{{company_name}}</strong>.</p>
<div class="info-card">
  <table>
    <tr><td class="label">Invoice No:</td><td class="value"><strong>{{invoice_number}}</strong></td></tr>
    <tr><td class="label">Invoice Date:</td><td class="value">{{invoice_date}}</td></tr>
    <tr><td class="label">Grand Total:</td><td class="value">৳ {{invoice_total}}</td></tr>
    <tr><td class="label">Paid Amount:</td><td class="value" style="color:#10b981;">৳ {{paid_amount}}</td></tr>
    <tr><td class="label">Due Balance:</td><td class="value" style="color:#ef4444;"><strong>৳ {{due_amount}}</strong></td></tr>
    <tr><td class="label">Payment Status:</td><td class="value"><strong>{{payment_status}}</strong></td></tr>
  </table>
</div>
<p><strong>Item Overview:</strong><br>{{items_summary}}</p>
<p>Please find the official tax invoice PDF attached to this email.</p>
<p><a href="{{document_link}}" class="btn">View & Settle Invoice Online</a></p>
<p>Thank you for choosing {{company_name}}!</p>`,
  emailBodyBn: `<p>প্রিয় <strong>{{customer_name}}</strong>,</p>
<p><strong>{{company_name}}</strong> থেকে আপনার কাজের জন্য বিক্রয় চালান বিল <strong>#{{invoice_number}}</strong> প্রস্তুত করা হয়েছে। বিস্তারিত ইনভয়েস পিডিএফ ফাইল সংযুক্ত করা হলো।</p>
<div class="info-card">
  <table>
    <tr><td class="label">ইনভয়েস নং:</td><td class="value"><strong>{{invoice_number}}</strong></td></tr>
    <tr><td class="label">তারিখ:</td><td class="value">{{invoice_date}}</td></tr>
    <tr><td class="label">মোট বিল:</td><td class="value">৳ {{invoice_total}}</td></tr>
    <tr><td class="label">পরিশোধিত:</td><td class="value">৳ {{paid_amount}}</td></tr>
    <tr><td class="label">অবশিষ্ট বকেয়া:</td><td class="value" style="color:#ef4444;"><strong>৳ {{due_amount}}</strong></td></tr>
    <tr><td class="label">স্ট্যাটাস:</td><td class="value"><strong>{{payment_status}}</strong></td></tr>
  </table>
</div>
<p><a href="{{document_link}}" class="btn">অনলাইনে ইনভয়েস দেখুন ও পেমেন্ট করুন</a></p>
<p>ধন্যবাদান্তে,<br><strong>{{company_name}}</strong></p>`,
  whatsappTemplateEn: `*COMMERCIAL INVOICE - {{company_name}}*

Dear {{customer_name}},
Your invoice has been generated for your recent print order:

📄 *Invoice No:* #{{invoice_number}}
📅 *Date:* {{invoice_date}}
📊 *Status:* {{payment_status}}

📋 *Items Summary:*
{{items_summary}}

💰 *Grand Total:* ৳ {{invoice_total}}
✅ *Paid Amount:* ৳ {{paid_amount}}
⚠️ *Due Balance:* ৳ {{due_amount}}

🔗 *View & Download Invoice:* {{document_link}}

_Thank you for doing business with {{company_name}}!_`,
  whatsappTemplateBn: `*বাণিজ্যিক বিক্রয় চালান বিল - {{company_name}}*

প্রিয় {{customer_name}},
আপনার সাম্প্রতিক প্রিন্ট অর্ডারের ইনভয়েস বিল প্রস্তুত করা হয়েছে:

📄 *ইনভয়েস নং:* #{{invoice_number}}
📅 *তারিখ:* {{invoice_date}}
📊 *স্ট্যাটাস:* {{payment_status}}

📋 *আইটেম বিবরণ:*
{{items_summary}}

💰 *সর্বমোট বিল:* ৳ {{invoice_total}}
✅ *জমা:* ৳ {{paid_amount}}
⚠️ *বকেয়া:* ৳ {{due_amount}}

🔗 *ইনভয়েস লিংক:* {{document_link}}

_{{company_name}}_`,
}

export class CommunicationTemplateService {
  /**
   * Interpolates dictionary values into template string
   */
  static interpolate(template: string, vars: Record<string, any>): string {
    if (!template) return ''
    let output = template
    for (const [key, val] of Object.entries(vars)) {
      if (val !== undefined && val !== null) {
        output = output.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), String(val))
      }
    }
    // Clean remaining unreplaced tags
    output = output.replace(/{{\s*[\w_.]+\s*}}/g, '')
    return output
  }

  /**
   * Retrieves Quotation communication template configuration
   */
  static getQuotationTemplates(companyId: string): QuotationCommunicationTemplate {
    const docTemplates = PrintERPDataStore.get<Record<DocumentType, DocumentTemplateConfigRecord>>(STORAGE_KEYS.DOCUMENT_TEMPLATES)
    const quoteDocTpl = docTemplates?.quotation

    return {
      emailSubjectEn: quoteDocTpl?.email_subject_template || DEFAULT_QUOTATION_COMMUNICATION_TEMPLATE.emailSubjectEn,
      emailSubjectBn: quoteDocTpl?.email_subject_template_bn || DEFAULT_QUOTATION_COMMUNICATION_TEMPLATE.emailSubjectBn,
      emailBodyEn: quoteDocTpl?.email_body_template || DEFAULT_QUOTATION_COMMUNICATION_TEMPLATE.emailBodyEn,
      emailBodyBn: quoteDocTpl?.email_body_template_bn || DEFAULT_QUOTATION_COMMUNICATION_TEMPLATE.emailBodyBn,
      whatsappTemplateEn: quoteDocTpl?.whatsapp_template || DEFAULT_QUOTATION_COMMUNICATION_TEMPLATE.whatsappTemplateEn,
      whatsappTemplateBn: quoteDocTpl?.whatsapp_template_bn || DEFAULT_QUOTATION_COMMUNICATION_TEMPLATE.whatsappTemplateBn,
    }
  }

  /**
   * Retrieves Invoice communication template configuration
   */
  static getInvoiceTemplates(companyId: string): InvoiceCommunicationTemplate {
    const docTemplates = PrintERPDataStore.get<Record<DocumentType, DocumentTemplateConfigRecord>>(STORAGE_KEYS.DOCUMENT_TEMPLATES)
    const invDocTpl = docTemplates?.invoice

    return {
      emailSubjectEn: invDocTpl?.email_subject_template || DEFAULT_INVOICE_COMMUNICATION_TEMPLATE.emailSubjectEn,
      emailSubjectBn: invDocTpl?.email_subject_template_bn || DEFAULT_INVOICE_COMMUNICATION_TEMPLATE.emailSubjectBn,
      emailBodyEn: invDocTpl?.email_body_template || DEFAULT_INVOICE_COMMUNICATION_TEMPLATE.emailBodyEn,
      emailBodyBn: invDocTpl?.email_body_template_bn || DEFAULT_INVOICE_COMMUNICATION_TEMPLATE.emailBodyBn,
      whatsappTemplateEn: invDocTpl?.whatsapp_template || DEFAULT_INVOICE_COMMUNICATION_TEMPLATE.whatsappTemplateEn,
      whatsappTemplateBn: invDocTpl?.whatsapp_template_bn || DEFAULT_INVOICE_COMMUNICATION_TEMPLATE.whatsappTemplateBn,
    }
  }

  /**
   * Builds Quotation Variables for live interpolation
   */
  static buildQuotationVariables(quote: QuotationRecord, company?: any, baseUrl = ''): Record<string, string> {
    const compName = company?.name || company?.company_name || 'Print & Signage Enterprise'
    const compPhone = company?.phone || company?.contact_phone || '+880 1711-000000'
    const compEmail = company?.email || company?.contact_email || 'info@example.com'
    const compAddress = company?.address || 'Dhaka, Bangladesh'
    const tenantSlug = company?.slug || 'my-company'
    const compWebsite = company?.website || `https://${tenantSlug}.printerp.app`

    // Lookup customer from datastore if customer_id is present
    let customer: any = null
    if (quote.customer_id) {
      const allCustomers = PrintERPDataStore.get<any[]>(STORAGE_KEYS.CUSTOMERS) || []
      customer = allCustomers.find((c) => c.id === quote.customer_id)
    }

    const custName = customer?.name || quote.customer_name || 'Customer'
    const custCompany = customer?.company_name || quote.customer_company || ''
    const custPhone = customer?.mobile || customer?.phone || quote.customer_phone || ''
    const custWhatsapp = customer?.whatsapp || quote.customer_whatsapp || custPhone
    const custEmail = customer?.email || quote.customer_email || ''
    const custAddress = customer?.full_address || customer?.address || quote.customer_address || ''

    const qDate = quote.quotation_date || (quote.created_at ? quote.created_at.split('T')[0] : new Date().toISOString().split('T')[0])
    const qValidUntil = quote.valid_until || '15 days from issuance'
    const qSubtotal = Number(quote.subtotal || quote.grand_total || 0).toLocaleString('en-IN')
    const qDiscount = Number(quote.discount_amount || 0).toLocaleString('en-IN')
    const qVat = Number(quote.vat_amount || 0).toLocaleString('en-IN')
    const qTotal = Number(quote.grand_total || 0).toLocaleString('en-IN')
    const qNotes = quote.notes || quote.terms_and_conditions || ''

    const prepBy = (quote as any).prepared_by_name || (quote as any).created_by_name || 'Sales Desk'
    const salesName = quote.salesperson_name || prepBy || 'Sales Representative'

    const itemsSummary = (quote.items || [])
      .map((it: any) => {
        const title = it.item_name || it.description || 'Print Item'
        const total = it.total_price ?? it.item_total ?? (Number(it.unit_rate || it.unit_price || 0) * Number(it.quantity || 1))
        return `• ${title} (${it.quantity || 1} ${it.unit || 'pcs'}) - ৳ ${Number(total).toLocaleString('en-IN')}`
      })
      .join('\n')

    const docLink = `${baseUrl}/${tenantSlug}/quotations/${quote.id}`

    return {
      // Company variables
      company_name: compName,
      company_phone: compPhone,
      company_email: compEmail,
      company_address: compAddress,
      company_website: compWebsite,

      // Customer variables
      customer_name: custName,
      customer_company: custCompany,
      customer_phone: custPhone,
      customer_whatsapp: custWhatsapp,
      customer_email: custEmail,
      customer_address: custAddress,

      // Quotation variables
      quotation_number: quote.quotation_number,
      quotation_date: qDate,
      valid_until: qValidUntil,
      quotation_subtotal: qSubtotal,
      quotation_discount: qDiscount,
      quotation_vat: qVat,
      quotation_total: qTotal,
      quotation_notes: qNotes,

      // User variables
      prepared_by: prepBy,
      salesperson_name: salesName,

      // Aliases & backwards-compatibility tags
      grand_total: qTotal,
      subtotal: qSubtotal,
      discount_amount: qDiscount,
      vat_amount: qVat,
      date: qDate,
      items_summary: itemsSummary,
      document_link: docLink,
    }
  }

  /**
   * Builds Invoice Variables for live interpolation
   */
  static buildInvoiceVariables(invoice: InvoiceRecord, company?: any, baseUrl = ''): Record<string, string> {
    const compName = company?.name || company?.company_name || 'Print & Signage Enterprise'
    const compPhone = company?.phone || company?.contact_phone || '+880 1711-000000'
    const compEmail = company?.email || company?.contact_email || 'billing@example.com'
    const compAddress = company?.address || 'Dhaka, Bangladesh'
    const tenantSlug = company?.slug || 'my-company'
    const compWebsite = company?.website || `https://${tenantSlug}.printerp.app`

    // Lookup customer from datastore if customer_id is present
    let customer: any = null
    if (invoice.customer_id) {
      const allCustomers = PrintERPDataStore.get<any[]>(STORAGE_KEYS.CUSTOMERS) || []
      customer = allCustomers.find((c) => c.id === invoice.customer_id)
    }

    const custName = customer?.name || invoice.customer_name || 'Customer'
    const custCompany = customer?.company_name || ''
    const custPhone = customer?.mobile || customer?.phone || invoice.customer_phone || ''
    const custWhatsapp = customer?.whatsapp || custPhone
    const custEmail = customer?.email || invoice.customer_email || ''
    const custAddress = customer?.full_address || customer?.address || invoice.customer_address || ''

    const invDate = invoice.invoice_date || (invoice.created_at ? invoice.created_at.split('T')[0] : new Date().toISOString().split('T')[0])
    const invSubtotal = Number(invoice.subtotal || invoice.grand_total || 0).toLocaleString('en-IN')
    const invDiscount = Number(invoice.discount_amount || 0).toLocaleString('en-IN')
    const invVat = Number(invoice.vat_amount || 0).toLocaleString('en-IN')
    const invTotal = Number(invoice.grand_total || 0).toLocaleString('en-IN')
    const paidAmt = Number(invoice.paid_amount || 0).toLocaleString('en-IN')
    const dueAmt = Number(invoice.due_amount || 0).toLocaleString('en-IN')
    const paymentStatus = (invoice.status || 'unpaid').replace('_', ' ').toUpperCase()

    const prepBy = invoice.created_by_name || 'Accounts Billing'
    const salesName = (invoice as any).salesperson_name || invoice.created_by_name || 'Accounts Representative'

    const itemsSummary = (invoice.items || [])
      .map((it: any) => {
        const title = it.item_name || it.description || 'Printed Item'
        const total = it.total_price ?? it.item_total ?? (Number(it.unit_price || it.unit_rate || 0) * Number(it.quantity || 1))
        return `• ${title} (${it.quantity || 1} ${it.unit || 'pcs'}) - ৳ ${Number(total).toLocaleString('en-IN')}`
      })
      .join('\n')

    const docLink = `${baseUrl}/${tenantSlug}/billing/${invoice.id}`

    return {
      // Company variables
      company_name: compName,
      company_phone: compPhone,
      company_email: compEmail,
      company_address: compAddress,
      company_website: compWebsite,

      // Customer variables
      customer_name: custName,
      customer_company: custCompany,
      customer_phone: custPhone,
      customer_whatsapp: custWhatsapp,
      customer_email: custEmail,
      customer_address: custAddress,

      // Invoice variables
      invoice_number: invoice.invoice_number,
      invoice_date: invDate,
      invoice_subtotal: invSubtotal,
      invoice_discount: invDiscount,
      invoice_vat: invVat,
      invoice_total: invTotal,
      paid_amount: paidAmt,
      due_amount: dueAmt,
      payment_status: paymentStatus,

      // User variables
      prepared_by: prepBy,
      salesperson_name: salesName,

      // Aliases & backwards-compatibility tags
      grand_total: invTotal,
      total_amount: invTotal,
      due_date: invoice.due_date || 'Due Upon Receipt',
      customer_bin: invoice.customer_bin || '',
      items_summary: itemsSummary,
      document_link: docLink,
    }
  }
}
