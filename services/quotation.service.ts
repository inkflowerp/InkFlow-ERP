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
import {
  parseDateSafe,
  calculateExpiryUrgency,
  calculateNextAction,
  getKpiMetrics,
  getNeedsAttentionQuotes,
  generateQuotationTextMessage,
  generateBangladeshiQuotationWhatsAppMessage,
  getSectorForQuotation,
} from '../lib/quotations/quotation-utils.ts'
import { QuotationRepository } from '../lib/repositories/quotation.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../lib/db/data-store.ts'
import type { SalesOrderRecord } from '../types/order.types.ts'
import type { InvoiceRecord } from '../types/billing.types.ts'

export {
  DEFAULT_QUOTATION_TERMS,
  DEFAULT_QUOTATION_TERMS_BN,
  parseDateSafe,
  calculateExpiryUrgency,
  calculateNextAction,
  getKpiMetrics,
  getNeedsAttentionQuotes,
  generateQuotationTextMessage,
  generateBangladeshiQuotationWhatsAppMessage,
  getSectorForQuotation,
}

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

  static async deleteQuotation(id: string, companyId: string = 'c-01', quotationNumber?: string): Promise<boolean> {
    return QuotationRepository.deleteQuotation(id, companyId, quotationNumber)
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
    const updated = await QuotationRepository.updateStatus(quotationId, newStatus, reason, companyId, actorName)
    if (updated) {
      try {
        const { WorkflowService } = await import('@/services/workflow.service')
        await WorkflowService.dispatchTrigger(companyId, 'status_changed', 'quotation', quotationId, {
          to_status: newStatus,
          status: newStatus,
          quotation_number: updated.quotation_number || updated.id,
          total_amount: updated.grand_total || updated.subtotal || 0,
          grand_total: updated.grand_total || 0,
          customer_name: updated.customer_name,
          customer_phone: updated.customer_phone,
          customer: {
            name: updated.customer_name,
            phone: updated.customer_phone,
            email: updated.customer_email,
          },
          pricing: {
            total_amount: updated.grand_total || 0,
            grand_total: updated.grand_total || 0,
          },
          reason,
          actorName,
        })
      } catch (e) {
        console.error('[QuotationService] Workflow dispatch error:', e)
      }
    }
    return updated
  }

  static async getActivities(quotationId: string, companyId: string = 'c-01'): Promise<QuotationActivityRecord[]> {
    return QuotationRepository.getActivities(quotationId, companyId)
  }

  static async addActivity(activity: QuotationActivityRecord): Promise<void> {
    return QuotationRepository.addActivity(activity)
  }

  static parseDateSafe = parseDateSafe
  static calculateExpiryUrgency = calculateExpiryUrgency
  static calculateNextAction = calculateNextAction
  static getKpiMetrics = getKpiMetrics
  static getNeedsAttentionQuotes = getNeedsAttentionQuotes
  static generateQuotationTextMessage = generateQuotationTextMessage
  static generateBangladeshiQuotationWhatsAppMessage = generateBangladeshiQuotationWhatsAppMessage
  static getSectorForQuotation = getSectorForQuotation
}

