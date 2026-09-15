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

  static async convertToOrder(quoteId: string, companyId: string = 'c-01', options?: { createdByName?: string; advanceAmount?: number }): Promise<any> {
    return QuotationRepository.convertQuotationToJobOrder(quoteId, companyId, options)
  }

  static async convertToInvoice(quoteId: string, companyId: string = 'c-01', createdByName?: string): Promise<InvoiceRecord> {
    return QuotationRepository.convertQuotationToInvoice(quoteId, companyId, { createdByName })
  }

  static async recordFollowUp(
    quotationId: string,
    companyId: string = 'c-01',
    data: {
      method: 'whatsapp' | 'phone' | 'email' | 'in_person' | 'other'
      note: string
      outcome?: string
      nextFollowUpDate?: string | null
      markResponded?: boolean
    },
    actorName?: string
  ): Promise<QuotationRecord | null> {
    return QuotationRepository.recordFollowUp(quotationId, companyId, data, actorName)
  }

  static async applyNegotiation(
    quotationId: string,
    companyId: string = 'c-01',
    discountAmount: number,
    notes?: string,
    actorName?: string
  ): Promise<QuotationRecord | null> {
    return QuotationRepository.applyNegotiation(quotationId, companyId, discountAmount, notes, actorName)
  }

  static async updateStatus(
    quotationId: string,
    newStatus: QuotationStatus,
    reason?: string,
    companyId: string = 'c-01',
    actorName?: string
  ): Promise<QuotationRecord | null> {
    return QuotationRepository.updateStatus(quotationId, newStatus, reason, companyId, actorName)
  }

  static async getActivities(quotationId: string, companyId: string = 'c-01'): Promise<QuotationActivityRecord[]> {
    return QuotationRepository.getActivities(quotationId, companyId)
  }

  static async addActivity(activity: QuotationActivityRecord): Promise<void> {
    return QuotationRepository.addActivity(activity)
  }

  /**
   * Timezone-safe local date parser preventing UTC midnight offset shifts
   */
  static parseDateSafe(dateInput: string | Date | null | undefined): Date {
    if (!dateInput) return new Date()
    if (typeof dateInput === 'string') {
      const trimmed = dateInput.trim()
      // Plain YYYY-MM-DD date format
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const parts = trimmed.split('-')
        const year = parseInt(parts[0], 10)
        const month = parseInt(parts[1], 10) - 1
        const day = parseInt(parts[2], 10)
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
          return new Date(year, month, day)
        }
      }
      // ISO timestamp with time or timezone
      const d = new Date(trimmed)
      if (!isNaN(d.getTime())) {
        return new Date(d.getFullYear(), d.getMonth(), d.getDate())
      }
    } else if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
      return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate())
    }
    return new Date()
  }

  /**
   * Translates validity date into business meaning and visual urgency
   */
  static calculateExpiryUrgency(validUntil: string): {
    label: string
    urgency: 'critical' | 'warning' | 'normal' | 'expired'
    daysLeft: number
  } {
    if (!validUntil) return { label: 'No validity date', urgency: 'normal', daysLeft: 999 }

    try {
      const trimmed = String(validUntil).trim()
      let targetDateStr = ''
      if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
        targetDateStr = trimmed.slice(0, 10)
      } else {
        const d = new Date(trimmed)
        if (isNaN(d.getTime())) {
          return { label: 'No validity date', urgency: 'normal', daysLeft: 999 }
        }
        targetDateStr = d.toISOString().split('T')[0]
      }

      const todayStr = new Date().toISOString().split('T')[0]
      const targetUtc = new Date(targetDateStr + 'T00:00:00Z')
      const todayUtc = new Date(todayStr + 'T00:00:00Z')

      if (isNaN(targetUtc.getTime()) || isNaN(todayUtc.getTime())) {
        return { label: 'No validity date', urgency: 'normal', daysLeft: 999 }
      }

      const diffTime = targetUtc.getTime() - todayUtc.getTime()
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

      if (diffDays < 0) {
        const pastDays = Math.abs(diffDays)
        return {
          label: pastDays === 1 ? 'Expired yesterday' : `Expired ${pastDays} days ago`,
          urgency: 'expired',
          daysLeft: diffDays,
        }
      }
      if (diffDays === 0) {
        return { label: 'Expires today', urgency: 'critical', daysLeft: 0 }
      }
      if (diffDays === 1) {
        return { label: 'Expires tomorrow', urgency: 'critical', daysLeft: 1 }
      }
      if (diffDays <= 3) {
        return { label: `Expires in ${diffDays} days`, urgency: 'warning', daysLeft: diffDays }
      }
      return { label: `Expires in ${diffDays} days`, urgency: 'normal', daysLeft: diffDays }
    } catch {
      return { label: 'No validity date', urgency: 'normal', daysLeft: 999 }
    }
  }

  /**
   * Intelligently derives the Next Action for an active quotation
   */
  static calculateNextAction(quote: QuotationRecord): string {
    if (quote.status === 'converted') {
      if (quote.converted_order_id && quote.converted_invoice_id) {
        return 'Converted to Order & Invoice'
      }
      if (quote.converted_order_id) {
        return `Converted to Order #${quote.converted_order_id}`
      }
      return 'Converted to Invoice'
    }

    if (quote.status === 'approved') {
      return 'Approved — Convert to Job Order / Invoice'
    }

    if (quote.status === 'rejected') {
      return 'Rejected — Review client feedback'
    }

    const expiry = this.calculateExpiryUrgency(quote.valid_until)
    if (expiry.urgency === 'expired') {
      return 'Expired — Follow up for revised quote'
    }

    if (quote.follow_up_date) {
      const fDate = this.parseDateSafe(quote.follow_up_date)
      fDate.setHours(0, 0, 0, 0)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (fDate <= today) {
        return 'Follow up today (Scheduled)'
      }
    }

    if (quote.status === 'negotiation') {
      return 'Customer is negotiating — Finalize price'
    }

    if (quote.status === 'viewed') {
      return 'Customer viewed proposal — Call for decision'
    }

    if (quote.status === 'sent') {
      return 'Waiting for customer response'
    }

    if (expiry.daysLeft <= 1) {
      return 'Expiring soon — Urgent follow-up'
    }

    return 'Draft — Complete & Send to Client'
  }

  /**
   * Aggregates 5 Commercial Sales-Control KPIs for Business Owners
   */
  static getKpiMetrics(quotes: QuotationRecord[]) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const activeQuotes = quotes.filter(
      (q) => q.status !== 'converted' && q.status !== 'rejected' && q.status !== 'expired'
    )

    // 1. OPEN PIPELINE (Total Grand Total of active proposals)
    const openPipeline = activeQuotes.reduce((sum, q) => sum + (Number(q.grand_total) || 0), 0)

    // 2. ACTIVE QUOTATIONS count
    const activeCount = activeQuotes.length

    // 3. FOLLOW-UP TODAY (Quotes with follow-up scheduled for today or overdue)
    const followUpToday = activeQuotes.filter((q) => {
      if (q.follow_up_date) {
        const d = this.parseDateSafe(q.follow_up_date)
        d.setHours(0, 0, 0, 0)
        return d <= today
      }
      return false
    }).length

    // 4. EXPIRING SOON (Active quotes expiring in <= 3 days)
    const expiringSoon = activeQuotes.filter((q) => {
      const exp = this.calculateExpiryUrgency(q.valid_until)
      return exp.urgency === 'critical' || exp.urgency === 'warning'
    }).length

    // 5. CONVERTED / WON VALUE
    const wonQuotes = quotes.filter((q) => q.status === 'converted' || q.status === 'approved')
    const wonCount = wonQuotes.length
    const wonValue = wonQuotes.reduce((sum, q) => sum + (Number(q.grand_total) || 0), 0)

    return {
      openPipeline,
      activeCount,
      followUpToday,
      expiringSoon,
      wonCount,
      wonValue,
      totalQuotes: quotes.length,
    }
  }

  /**
   * Automatically identifies high-priority quotations that require owner / salesperson attention
   */
  static getNeedsAttentionQuotes(quotes: QuotationRecord[]): QuotationRecord[] {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return quotes
      .filter((q) => {
        if (q.status === 'converted' || q.status === 'rejected') return false

        // 1. Approved but not converted
        if (q.status === 'approved') return true

        // 2. Follow-up scheduled today or overdue
        if (q.follow_up_date) {
          const fDate = this.parseDateSafe(q.follow_up_date)
          fDate.setHours(0, 0, 0, 0)
          if (fDate <= today) return true
        }

        // 3. Expiring today or within 3 days
        const exp = this.calculateExpiryUrgency(q.valid_until)
        if (exp.urgency === 'critical' || exp.urgency === 'warning') return true

        // 4. Sent for > 2 days with no follow up recorded
        if (q.status === 'sent' && !q.last_follow_up_at) {
          const sentDate = this.parseDateSafe(q.quotation_date || q.created_at)
          const daysOld = (today.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24)
          if (daysOld >= 2) return true
        }

        // 5. Negotiation in progress
        if (q.status === 'negotiation') return true

        return false
      })
      .slice(0, 8)
  }

  /**
   * Generates customer-facing text message for WhatsApp or Email
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
