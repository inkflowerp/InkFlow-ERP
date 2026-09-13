// ==============================================================================
// PrintERP SaaS - Unified Communication Template Service
// Manages and renders customizable Email Subjects, Email Bodies, and WhatsApp
// templates for Quotations and Invoices.
// ==============================================================================

import { PrintERPDataStore, STORAGE_KEYS } from '../lib/db/data-store.ts'
import type { DocumentType, DocumentTemplateConfigRecord } from '../types/tax-and-docs.types.ts'
import type { QuotationRecord } from '../types/quotation.types.ts'
import type { InvoiceRecord } from '../types/billing.types.ts'
import { formatBDT } from '../lib/formatters.ts'

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
  emailSubjectEn: 'Official Quotation #{{quotation_number}} from {{company_name}} [৳ {{grand_total}}]',
  emailSubjectBn: 'বাণিজ্যিক কোটেশন #{{quotation_number}} - {{company_name}} [৳ {{grand_total}}]',
  emailBodyEn: `<p>Dear <strong>{{customer_name}}</strong>,</p>
<p>Thank you for reaching out to <strong>{{company_name}}</strong>. Please find attached our official price proposal for your requested print items.</p>
<div class="info-card">
  <table>
    <tr><td class="label">Quotation #:</td><td class="value"><strong>{{quotation_number}}</strong></td></tr>
    <tr><td class="label">Issue Date:</td><td class="value">{{date}}</td></tr>
    <tr><td class="label">Valid Until:</td><td class="value">{{valid_until}}</td></tr>
    <tr><td class="label">Grand Total:</td><td class="value"><strong>৳ {{grand_total}}</strong></td></tr>
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
    <tr><td class="label">প্রদানের তারিখ:</td><td class="value">{{date}}</td></tr>
    <tr><td class="label">মেয়াদ:</td><td class="value">{{valid_until}}</td></tr>
    <tr><td class="label">মোট মূল্য:</td><td class="value"><strong>৳ {{grand_total}}</strong></td></tr>
  </table>
</div>
<p><a href="{{document_link}}" class="btn">কোটেশন বিস্তারিত দেখুন ও অনুমোদন দিন</a></p>
<p>ধন্যবাদান্তে,<br><strong>{{company_name}}</strong></p>`,
  whatsappTemplateEn: `*OFFICIAL QUOTATION - {{company_name}}*

Dear {{customer_name}},
Thank you for your inquiry! Here is your official price proposal:

📄 *Quotation No:* #{{quotation_number}}
📅 *Date:* {{date}}
⏳ *Valid Until:* {{valid_until}}

📋 *Items Summary:*
{{items_summary}}

💵 *Grand Total:* ৳ {{grand_total}}

🔗 *View & Approve Online:* {{document_link}}

_Thank you for doing business with {{company_name}}!_`,
  whatsappTemplateBn: `*বাণিজ্যিক দরপত্র (কোটেশন) - {{company_name}}*

প্রিয় {{customer_name}},
আমাদের সাথে যোগাযোগের জন্য ধন্যবাদ। আপনার কোটেশন বিবরণ:

📄 *কোটেশন নং:* #{{quotation_number}}
📅 *তারিখ:* {{date}}
⏳ *মেয়াদ:* {{valid_until}} পর্যন্ত

📋 *আইটেম বিবরণ:*
{{items_summary}}

💵 *সর্বমোট বিল:* ৳ {{grand_total}}

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
    <tr><td class="label">Grand Total:</td><td class="value">৳ {{grand_total}}</td></tr>
    <tr><td class="label">Paid Amount:</td><td class="value" style="color:#10b981;">৳ {{paid_amount}}</td></tr>
    <tr><td class="label">Due Balance:</td><td class="value" style="color:#ef4444;"><strong>৳ {{due_amount}}</strong></td></tr>
    <tr><td class="label">Due Date:</td><td class="value">{{due_date}}</td></tr>
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
    <tr><td class="label">মোট বিল:</td><td class="value">৳ {{grand_total}}</td></tr>
    <tr><td class="label">পরিশোধিত:</td><td class="value">৳ {{paid_amount}}</td></tr>
    <tr><td class="label">অবশিষ্ট বকেয়া:</td><td class="value" style="color:#ef4444;"><strong>৳ {{due_amount}}</strong></td></tr>
  </table>
</div>
<p><a href="{{document_link}}" class="btn">অনলাইনে ইনভয়েস দেখুন ও পেমেন্ট করুন</a></p>
<p>ধন্যবাদান্তে,<br><strong>{{company_name}}</strong></p>`,
  whatsappTemplateEn: `*COMMERCIAL INVOICE - {{company_name}}*

Dear {{customer_name}},
Your invoice has been generated for your recent print order:

📄 *Invoice No:* #{{invoice_number}}
📅 *Date:* {{invoice_date}}
⏳ *Due Date:* {{due_date}}

📋 *Items Summary:*
{{items_summary}}

💰 *Grand Total:* ৳ {{grand_total}}
✅ *Paid Amount:* ৳ {{paid_amount}}
⚠️ *Due Balance:* ৳ {{due_amount}}

🔗 *View & Download Invoice:* {{document_link}}

_Thank you for doing business with {{company_name}}!_`,
  whatsappTemplateBn: `*বাণিজ্যিক বিক্রয় চালান বিল - {{company_name}}*

প্রিয় {{customer_name}},
আপনার সাম্প্রতিক প্রিন্ট অর্ডারের ইনভয়েস বিল প্রস্তুত করা হয়েছে:

📄 *ইনভয়েস নং:* #{{invoice_number}}
📅 *তারিখ:* {{invoice_date}}
⏳ *পরিশোধের মেয়াদ:* {{due_date}}

📋 *আইটেম বিবরণ:*
{{items_summary}}

💰 *সর্বমোট বিল:* ৳ {{grand_total}}
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
    const compName = company?.name || 'Vision Sign BD'
    const itemsSummary = (quote.items || [])
      .map((it: any) => {
        const title = it.item_name || it.description || 'Print Item'
        const total = it.total_price ?? it.item_total ?? (Number(it.unit_rate || it.unit_price || 0) * Number(it.quantity || 1))
        return `• ${title} (${it.quantity || 1} ${it.unit || 'pcs'}) - ৳ ${Number(total).toLocaleString('en-IN')}`
      })
      .join('\n')

    const tenantSlug = company?.slug || 'my-company'
    const docLink = `${baseUrl}/${tenantSlug}/quotations/${quote.id}`

    return {
      customer_name: quote.customer_name || 'Customer',
      customer_company: quote.customer_company || '',
      customer_phone: quote.customer_phone || '',
      company_name: compName,
      quotation_number: quote.quotation_number,
      grand_total: Number(quote.grand_total || 0).toLocaleString('en-IN'),
      subtotal: Number(quote.subtotal || quote.grand_total || 0).toLocaleString('en-IN'),
      discount_amount: Number(quote.discount_amount || 0).toLocaleString('en-IN'),
      vat_amount: Number(quote.vat_amount || 0).toLocaleString('en-IN'),
      date: quote.quotation_date || new Date().toISOString().split('T')[0],
      valid_until: quote.valid_until || '15 days from issuance',
      items_summary: itemsSummary,
      document_link: docLink,
    }
  }

  /**
   * Builds Invoice Variables for live interpolation
   */
  static buildInvoiceVariables(invoice: InvoiceRecord, company?: any, baseUrl = ''): Record<string, string> {
    const compName = company?.name || 'Vision Sign BD'
    const itemsSummary = (invoice.items || [])
      .map((it: any) => {
        const title = it.item_name || it.description || 'Printed Item'
        const total = it.total_price ?? it.item_total ?? (Number(it.unit_price || it.unit_rate || 0) * Number(it.quantity || 1))
        return `• ${title} (${it.quantity || 1} ${it.unit || 'pcs'}) - ৳ ${Number(total).toLocaleString('en-IN')}`
      })
      .join('\n')

    const tenantSlug = company?.slug || 'my-company'
    const docLink = `${baseUrl}/${tenantSlug}/billing/${invoice.id}`

    return {
      customer_name: invoice.customer_name || 'Customer',
      customer_phone: invoice.customer_phone || '',
      customer_bin: invoice.customer_bin || '',
      company_name: compName,
      invoice_number: invoice.invoice_number,
      grand_total: Number(invoice.grand_total || 0).toLocaleString('en-IN'),
      total_amount: Number(invoice.grand_total || 0).toLocaleString('en-IN'),
      paid_amount: Number(invoice.paid_amount || 0).toLocaleString('en-IN'),
      due_amount: Number(invoice.due_amount || 0).toLocaleString('en-IN'),
      invoice_date: invoice.invoice_date || new Date().toISOString().split('T')[0],
      due_date: invoice.due_date || 'Due Upon Receipt',
      items_summary: itemsSummary,
      document_link: docLink,
    }
  }
}
