import type {
  QuotationRecord,
  QuotationActivityRecord,
  QuotationStatus,
  CreateQuotationPayload,
} from '../types/quotation.types.ts'
import {
  DEFAULT_QUOTATION_TERMS,
  DEFAULT_QUOTATION_TERMS_BN,
} from '../types/quotation.types.ts'
import { QuotationRepository } from '../lib/repositories/quotation.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../lib/db/data-store.ts'
import type { SalesOrderRecord } from '../types/order.types.ts'
import type { InvoiceRecord } from '../types/billing.types.ts'

export { DEFAULT_QUOTATION_TERMS, DEFAULT_QUOTATION_TERMS_BN }

export class QuotationService {
  static async getQuotations(companyId: string = 'c-01'): Promise<QuotationRecord[]> {
    return QuotationRepository.getQuotations(companyId)
  }

  static async getQuotationById(id: string, companyId: string = 'c-01'): Promise<QuotationRecord | null> {
    return QuotationRepository.getQuotationById(id, companyId)
  }

  static async createQuotation(data: Partial<QuotationRecord>): Promise<QuotationRecord> {
    return QuotationRepository.createQuotation({
      company_id: data.company_id || 'c-01',
      customer_id: data.customer_id || null,
      customer_name: data.customer_name || 'Customer',
      customer_name_bn: data.customer_name_bn || null,
      customer_company: data.customer_company || null,
      customer_phone: data.customer_phone || '+8801711000000',
      customer_whatsapp: data.customer_whatsapp || null,
      customer_email: data.customer_email || null,
      customer_address: data.customer_address || null,
      customer_bin: data.customer_bin || null,
      customer_type: data.customer_type || 'retail',
      status: data.status || 'draft',
      quotation_date: data.quotation_date || new Date().toISOString().split('T')[0],
      valid_until: data.valid_until || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      reference_no: data.reference_no || null,
      salesperson_id: data.salesperson_id || null,
      salesperson_name: data.salesperson_name || 'Sales Representative',
      language_mode: data.language_mode || 'bn',
      items: data.items || [],
      discount_amount: data.discount_amount || 0,
      vat_rate: data.vat_rate || 7.5,
      delivery_date: data.delivery_date || null,
      delivery_location: data.delivery_location || null,
      delivery_method: data.delivery_method || 'customer_pickup',
      installation_required: data.installation_required || false,
      notes: data.notes || '',
      terms_and_conditions: data.terms_and_conditions || DEFAULT_QUOTATION_TERMS,
      internal_notes: data.internal_notes || null,
    })
  }

  static async updateQuotation(id: string, data: Partial<QuotationRecord>, companyId: string = 'c-01'): Promise<QuotationRecord | null> {
    return QuotationRepository.updateQuotation(id, data, companyId)
  }

  static async deleteQuotation(id: string, companyId: string = 'c-01'): Promise<boolean> {
    const quote = await this.getQuotationById(id, companyId)
    if (!quote) return false
    PrintERPDataStore.removeItem(STORAGE_KEYS.QUOTATIONS, id)
    return true
  }

  static async convertToOrder(quoteId: string): Promise<SalesOrderRecord | null> {
    return PrintERPDataStore.convertQuotationToSalesOrder(quoteId)
  }

  static async convertToInvoice(quoteId: string, companyId: string = 'c-01', createdByName?: string): Promise<InvoiceRecord> {
    return QuotationRepository.convertQuotationToInvoice(quoteId, companyId, { createdByName })
  }

  static async getActivities(quotationId: string, companyId: string = 'c-01'): Promise<QuotationActivityRecord[]> {
    return QuotationRepository.getActivities(quotationId, companyId)
  }

  static async addActivity(activity: QuotationActivityRecord): Promise<QuotationActivityRecord[]> {
    return PrintERPDataStore.addItem(STORAGE_KEYS.QUOTATION_ACTIVITIES, activity)
  }

  /**
   * Generates customer-facing text message for WhatsApp, SMS, or Email
   * Strictly shields internal notes, database IDs, and sensitive data.
   */
  static generateQuotationTextMessage(quote: QuotationRecord, companyName: string = 'InkFlow'): string {
    const itemsSummary = (quote.items || [])
      .map((it, idx) => {
        const dim = it.width > 0 && it.height > 0 ? ` (${it.width}ft × ${it.height}ft)` : ''
        return `${idx + 1}. ${it.description}${dim} - ৳${Number(it.item_total).toLocaleString('en-BD')}`
      })
      .slice(0, 4)
      .join('\n')

    const moreItems = quote.items && quote.items.length > 4 ? `\n...and ${quote.items.length - 4} more items` : ''

    return `*Quotation: ${quote.quotation_number}*
From: ${companyName}
Customer: ${quote.customer_name}${quote.customer_company ? ` (${quote.customer_company})` : ''}
Date: ${quote.quotation_date}
Valid Until: ${quote.valid_until}

*Items Summary:*
${itemsSummary}${moreItems}

Subtotal: ৳${Number(quote.subtotal).toLocaleString('en-BD')}
${quote.discount_amount > 0 ? `Discount: -৳${Number(quote.discount_amount).toLocaleString('en-BD')}\n` : ''}VAT (${quote.vat_rate}%): ৳${Number(quote.vat_amount).toLocaleString('en-BD')}
*Grand Total: ৳${Number(quote.grand_total).toLocaleString('en-BD')} BDT*

${quote.notes ? `*Notes:* ${quote.notes}\n` : ''}Thank you for your business.`
  }
}
