// ==============================================================================
// InkFlow ERP - Authoritative Tax & VAT Service (V7)
// Multi-Rate NBR VAT Engine, Line-Level Calculation, Snapshots & GL Integration
// ==============================================================================

import { TaxRepository } from '../lib/repositories/tax.repository.ts'
import { FinanceRepository } from '../lib/repositories/finance.repository.ts'
import type {
  TaxProfileRecord,
  TaxTransactionLineRecord,
  VatCalculationItemInput,
  VatCalculationItemResult,
  DocumentVatBreakdown,
  RateBreakdownSummary,
  TaxReportSummary,
  TaxType,
  TaxCalculationMode,
} from '../types/tax.types.ts'
import type { InvoiceRecord } from '../types/billing.types.ts'
import type { PurchaseOrderRecord } from '../types/purchase.types.ts'

export class TaxService {
  // ============================================================================
  // 1. TAX PROFILES
  // ============================================================================

  static async seedDefaultTaxProfiles(companyId: string) {
    return TaxRepository.seedDefaultTaxProfiles(companyId)
  }

  static async getTaxProfiles(companyId: string, options?: { branchId?: string | null; isActive?: boolean }) {
    await TaxRepository.seedDefaultTaxProfiles(companyId)
    return TaxRepository.getTaxProfiles(companyId, options)
  }

  static async getTaxProfileById(id: string, companyId: string) {
    return TaxRepository.getTaxProfileById(id, companyId)
  }

  static async getTaxProfileByCode(code: string, companyId: string) {
    return TaxRepository.getTaxProfileByCode(code, companyId)
  }

  static async createTaxProfile(input: Partial<TaxProfileRecord> & { company_id: string; code: string; name: string; rate: number }): Promise<TaxProfileRecord> {
    const now = new Date().toISOString()
    const profile: TaxProfileRecord = {
      id: input.id || `tp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      company_id: input.company_id,
      branch_id: input.branch_id || null,
      code: input.code.toUpperCase().trim(),
      name: input.name.trim(),
      name_bn: input.name_bn || null,
      rate: Number(input.rate),
      calculation_mode: input.calculation_mode || 'exclusive',
      tax_type: input.tax_type || 'STANDARD',
      is_recoverable: input.is_recoverable !== undefined ? input.is_recoverable : true,
      effective_from: input.effective_from || now.split('T')[0],
      effective_to: input.effective_to || null,
      is_active: input.is_active !== undefined ? input.is_active : true,
      is_default: Boolean(input.is_default),
      description: input.description || null,
      created_at: now,
      updated_at: now,
    }

    return TaxRepository.createTaxProfile(profile)
  }

  static async updateTaxProfile(id: string, companyId: string, updates: Partial<TaxProfileRecord>) {
    return TaxRepository.updateTaxProfile(id, companyId, updates)
  }

  // ============================================================================
  // 2. DETERMINISTIC VAT CALCULATION ENGINE
  // ============================================================================

  /**
   * Calculates VAT for an individual line item.
   * Order of Operations:
   * 1. Gross Amount = Quantity * Unit Price
   * 2. Discount Amount = Deducted from Gross Amount
   * 3. Taxable Base = Math.max(0, Gross - Discount)
   * 4. Tax Calculation:
   *    - Exclusive: VAT = Taxable Base * (Rate / 100); Total = Taxable Base + VAT
   *    - Inclusive: VAT = Taxable Base * Rate / (100 + Rate); Net = Taxable Base - VAT; Total = Taxable Base
   *    - Zero-Rated / Exempt / Non-Taxable: VAT = 0; Total = Taxable Base
   */
  static calculateLineVat(
    item: VatCalculationItemInput,
    profile?: TaxProfileRecord | null
  ): VatCalculationItemResult {
    const qty = Number(item.quantity) || 0
    const price = Number(item.unit_price) || 0
    const gross = Number((qty * price).toFixed(2))
    const discount = Math.min(gross, Number((item.discount_amount || 0).toFixed(2)))
    const taxableBase = Math.max(0, Number((gross - discount).toFixed(2)))

    const rate = item.custom_rate !== undefined && item.custom_rate !== null ? Number(item.custom_rate) : profile ? Number(profile.rate) : 0
    const mode: TaxCalculationMode = item.custom_mode || profile?.calculation_mode || 'exclusive'
    const taxType: TaxType = item.tax_type || profile?.tax_type || (rate === 0 ? 'ZERO_RATED' : 'STANDARD')
    const code = profile?.code || (rate === 0 ? 'VAT-ZERO' : `VAT-${rate}`)

    let vatAmount = 0
    let totalAmount = taxableBase

    if (taxType === 'ZERO_RATED' || taxType === 'EXEMPT' || taxType === 'NON_TAXABLE' || taxType === 'OUT_OF_SCOPE' || rate === 0) {
      vatAmount = 0
      totalAmount = taxableBase
    } else if (mode === 'inclusive') {
      // Gross includes VAT: VAT = Gross * (Rate / (100 + Rate))
      vatAmount = Number(((taxableBase * rate) / (100 + rate)).toFixed(2))
      totalAmount = taxableBase
    } else {
      // Exclusive mode: VAT added on top of taxable base
      vatAmount = Number(((taxableBase * rate) / 100).toFixed(2))
      totalAmount = Number((taxableBase + vatAmount).toFixed(2))
    }

    return {
      item_id: item.item_id,
      description: item.description,
      quantity: qty,
      unit_price: price,
      gross_amount: gross,
      discount_amount: discount,
      taxable_amount: taxableBase,
      tax_profile_code: code,
      tax_type: taxType,
      vat_rate: rate,
      vat_amount: vatAmount,
      total_amount: totalAmount,
      pricing_mode: mode,
    }
  }

  /**
   * Computes document-level VAT aggregation and multi-rate breakdowns across multiple line items.
   */
  static calculateDocumentVat(
    items: VatCalculationItemInput[],
    profilesMap?: Map<string, TaxProfileRecord>
  ): DocumentVatBreakdown {
    let subtotal = 0
    let totalDiscount = 0
    let taxableSubtotal = 0
    let totalVat = 0
    let grandTotal = 0

    const rateMap = new Map<string, RateBreakdownSummary>()

    for (const item of items) {
      const profile = item.tax_profile_id && profilesMap ? profilesMap.get(item.tax_profile_id) : null
      const lineRes = this.calculateLineVat(item, profile)

      subtotal += lineRes.gross_amount
      totalDiscount += lineRes.discount_amount
      taxableSubtotal += lineRes.taxable_amount
      totalVat += lineRes.vat_amount
      grandTotal += lineRes.total_amount

      const rateKey = `${lineRes.tax_profile_code}_${lineRes.vat_rate}_${lineRes.pricing_mode}`
      const existing = rateMap.get(rateKey) || {
        tax_profile_code: lineRes.tax_profile_code,
        tax_type: lineRes.tax_type,
        vat_rate: lineRes.vat_rate,
        pricing_mode: lineRes.pricing_mode,
        taxable_amount: 0,
        vat_amount: 0,
        total_amount: 0,
      }

      existing.taxable_amount = Number((existing.taxable_amount + lineRes.taxable_amount).toFixed(2))
      existing.vat_amount = Number((existing.vat_amount + lineRes.vat_amount).toFixed(2))
      existing.total_amount = Number((existing.total_amount + lineRes.total_amount).toFixed(2))
      rateMap.set(rateKey, existing)
    }

    return {
      subtotal: Number(subtotal.toFixed(2)),
      total_discount: Number(totalDiscount.toFixed(2)),
      taxable_subtotal: Number(taxableSubtotal.toFixed(2)),
      total_vat: Number(totalVat.toFixed(2)),
      grand_total: Number(grandTotal.toFixed(2)),
      rate_breakdowns: Array.from(rateMap.values()),
    }
  }

  // ============================================================================
  // 3. TAX AUDIT REGISTER & GENERAL LEDGER INTEGRATION
  // ============================================================================

  /**
   * Records tax transaction lines for a finalized Sales Invoice
   */
  static async recordSalesInvoiceTaxLines(
    invoice: InvoiceRecord,
    companyId: string,
    financialTxnId?: string
  ): Promise<TaxTransactionLineRecord[]> {
    const lines: TaxTransactionLineRecord[] = []
    const docDate = invoice.invoice_date || new Date().toISOString().split('T')[0]

    for (const item of invoice.items || []) {
      const lineTotal = Number(item.total_price || (item.quantity * item.unit_price) || 0)
      const vatRate = Number(item.vat_percentage !== undefined ? item.vat_percentage : invoice.vat_percentage || 0)
      const vatAmount = Number(((lineTotal * vatRate) / 100).toFixed(2))
      const totalAmount = Number((lineTotal + vatAmount).toFixed(2))
      const code = vatRate === 0 ? 'VAT-ZERO' : `VAT-${vatRate}`
      const taxType: TaxType = vatRate === 0 ? 'ZERO_RATED' : vatRate === 15 ? 'STANDARD' : vatRate === 7.5 ? 'TRUNCATED' : 'REDUCED'

      lines.push({
        id: `txl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        company_id: companyId,
        branch_id: (invoice as any).branch_id || null,
        transaction_type: 'SALES_INVOICE',
        document_id: invoice.id,
        document_number: invoice.invoice_number,
        document_date: docDate,
        line_id: item.id,
        party_type: 'CUSTOMER',
        party_id: invoice.customer_id || '',
        party_name: invoice.customer_name,
        party_bin: invoice.customer_bin || null,
        party_tin: invoice.customer_tin || null,
        tax_profile_code: code,
        tax_type: taxType,
        tax_rate: vatRate,
        calculation_mode: 'exclusive',
        gross_amount: lineTotal,
        discount_amount: 0,
        taxable_amount: lineTotal,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        is_recoverable: true,
        financial_transaction_id: financialTxnId || null,
        notes: `Sales VAT on ${invoice.invoice_number} - ${item.item_description || 'Item'}`,
        created_at: new Date().toISOString(),
      })
    }

    // Fallback if no items array
    if (lines.length === 0 && Number(invoice.vat_amount || 0) > 0) {
      lines.push({
        id: `txl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        company_id: companyId,
        branch_id: (invoice as any).branch_id || null,
        transaction_type: 'SALES_INVOICE',
        document_id: invoice.id,
        document_number: invoice.invoice_number,
        document_date: docDate,
        party_type: 'CUSTOMER',
        party_id: invoice.customer_id || '',
        party_name: invoice.customer_name,
        party_bin: invoice.customer_bin || null,
        party_tin: invoice.customer_tin || null,
        tax_profile_code: `VAT-${invoice.vat_percentage || 15}`,
        tax_type: invoice.vat_percentage === 15 ? 'STANDARD' : 'TRUNCATED',
        tax_rate: Number(invoice.vat_percentage || 15),
        calculation_mode: 'exclusive',
        gross_amount: Number(invoice.subtotal || 0),
        discount_amount: Number(invoice.discount_amount || 0),
        taxable_amount: Math.max(0, Number(invoice.subtotal || 0) - Number(invoice.discount_amount || 0)),
        vat_amount: Number(invoice.vat_amount || 0),
        total_amount: Number(invoice.grand_total || 0),
        is_recoverable: true,
        financial_transaction_id: financialTxnId || null,
        notes: `Sales VAT on Invoice ${invoice.invoice_number}`,
        created_at: new Date().toISOString(),
      })
    }

    return TaxRepository.recordTaxTransactionLines(lines)
  }

  /**
   * Records tax transaction lines for a Purchase Order / Supplier Bill
   */
  static async recordPurchaseOrderTaxLines(
    po: PurchaseOrderRecord,
    companyId: string,
    financialTxnId?: string
  ): Promise<TaxTransactionLineRecord[]> {
    const lines: TaxTransactionLineRecord[] = []
    const docDate = po.po_date || new Date().toISOString().split('T')[0]

    for (const item of po.items || []) {
      const lineTotal = Number(item.total_cost || 0)
      const taxPct = Number(item.tax_percent || 0)
      const vatAmount = Number(((lineTotal * taxPct) / 100).toFixed(2))
      const code = taxPct === 0 ? 'VAT-ZERO' : `VAT-${taxPct}`
      const taxType: TaxType = taxPct === 0 ? 'ZERO_RATED' : taxPct === 15 ? 'STANDARD' : 'TRUNCATED'

      lines.push({
        id: `txl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        company_id: companyId,
        branch_id: po.branch_id || null,
        transaction_type: 'PURCHASE_BILL',
        document_id: po.id,
        document_number: po.po_number,
        document_date: docDate,
        line_id: item.id,
        party_type: 'SUPPLIER',
        party_id: po.supplier_id,
        party_name: po.supplier_name,
        party_bin: (po as any).supplier_bin || null,
        party_tin: (po as any).supplier_tin || null,
        tax_profile_code: code,
        tax_type: taxType,
        tax_rate: taxPct,
        calculation_mode: 'exclusive',
        gross_amount: lineTotal,
        discount_amount: 0,
        taxable_amount: lineTotal,
        vat_amount: vatAmount,
        total_amount: Number((lineTotal + vatAmount).toFixed(2)),
        is_recoverable: true, // eligible input tax
        financial_transaction_id: financialTxnId || null,
        notes: `Input VAT on ${po.po_number} - ${item.material_name || 'Material'}`,
        created_at: new Date().toISOString(),
      })
    }

    if (lines.length === 0 && Number(po.vat_amount || 0) > 0) {
      lines.push({
        id: `txl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        company_id: companyId,
        branch_id: po.branch_id || null,
        transaction_type: 'PURCHASE_BILL',
        document_id: po.id,
        document_number: po.po_number,
        document_date: docDate,
        party_type: 'SUPPLIER',
        party_id: po.supplier_id,
        party_name: po.supplier_name,
        tax_profile_code: 'VAT-15',
        tax_type: 'STANDARD',
        tax_rate: 15,
        calculation_mode: 'exclusive',
        gross_amount: Number(po.subtotal || 0),
        discount_amount: Number(po.discount_amount || 0),
        taxable_amount: Math.max(0, Number(po.subtotal || 0) - Number(po.discount_amount || 0)),
        vat_amount: Number(po.vat_amount || 0),
        total_amount: Number(po.grand_total || 0),
        is_recoverable: true,
        financial_transaction_id: financialTxnId || null,
        notes: `Input VAT on PO ${po.po_number}`,
        created_at: new Date().toISOString(),
      })
    }

    return TaxRepository.recordTaxTransactionLines(lines)
  }

  /**
   * Generic recorder for sales tax lines from explicit calculation items
   */
  static async recordSalesTaxLines(input: {
    companyId: string
    branchId?: string | null
    documentType: string
    documentId: string
    documentNumber: string
    partyId: string
    partyName: string
    partyBin?: string | null
    partyTin?: string | null
    taxDate: string
    items: VatCalculationItemInput[]
    financialTxnId?: string
    userId?: string
  }): Promise<TaxTransactionLineRecord[]> {
    const lines: TaxTransactionLineRecord[] = []
    const profiles = await TaxRepository.getTaxProfiles(input.companyId)
    const profileMap = new Map(profiles.map((p) => [p.id, p]))

    for (const item of input.items) {
      const profile = item.tax_profile_id ? profileMap.get(item.tax_profile_id) : null
      const res = this.calculateLineVat(item, profile)

      lines.push({
        id: `txl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        company_id: input.companyId,
        branch_id: input.branchId || null,
        transaction_type: 'SALES_INVOICE',
        document_id: input.documentId,
        document_number: input.documentNumber,
        document_date: input.taxDate,
        line_id: item.item_id || null,
        party_type: 'CUSTOMER',
        party_id: input.partyId,
        party_name: input.partyName,
        party_bin: input.partyBin || null,
        party_tin: input.partyTin || null,
        tax_profile_id: item.tax_profile_id || null,
        tax_profile_code: res.tax_profile_code,
        tax_type: res.tax_type,
        tax_rate: res.vat_rate,
        calculation_mode: res.pricing_mode,
        gross_amount: res.gross_amount,
        discount_amount: res.discount_amount,
        taxable_amount: res.taxable_amount,
        vat_amount: res.vat_amount,
        total_amount: res.total_amount,
        is_recoverable: true,
        financial_transaction_id: input.financialTxnId || null,
        notes: `Sales VAT on ${input.documentNumber} - ${item.description || 'Item'}`,
        created_at: new Date().toISOString(),
      })
    }

    return TaxRepository.recordTaxTransactionLines(lines)
  }

  /**
   * Generic recorder for purchase tax lines from explicit calculation items
   */
  static async recordPurchaseTaxLines(input: {
    companyId: string
    branchId?: string | null
    documentType: string
    documentId: string
    documentNumber: string
    partyId: string
    partyName: string
    partyBin?: string | null
    partyTin?: string | null
    taxDate: string
    items: VatCalculationItemInput[]
    isRecoverable?: boolean
    financialTxnId?: string
    userId?: string
  }): Promise<TaxTransactionLineRecord[]> {
    const lines: TaxTransactionLineRecord[] = []
    const profiles = await TaxRepository.getTaxProfiles(input.companyId)
    const profileMap = new Map(profiles.map((p) => [p.id, p]))

    for (const item of input.items) {
      const profile = item.tax_profile_id ? profileMap.get(item.tax_profile_id) : null
      const res = this.calculateLineVat(item, profile)

      lines.push({
        id: `txl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        company_id: input.companyId,
        branch_id: input.branchId || null,
        transaction_type: 'PURCHASE_BILL',
        document_id: input.documentId,
        document_number: input.documentNumber,
        document_date: input.taxDate,
        line_id: item.item_id || null,
        party_type: 'SUPPLIER',
        party_id: input.partyId,
        party_name: input.partyName,
        party_bin: input.partyBin || null,
        party_tin: input.partyTin || null,
        tax_profile_id: item.tax_profile_id || null,
        tax_profile_code: res.tax_profile_code,
        tax_type: res.tax_type,
        tax_rate: res.vat_rate,
        calculation_mode: res.pricing_mode,
        gross_amount: res.gross_amount,
        discount_amount: res.discount_amount,
        taxable_amount: res.taxable_amount,
        vat_amount: res.vat_amount,
        total_amount: res.total_amount,
        is_recoverable: input.isRecoverable !== undefined ? input.isRecoverable : true,
        financial_transaction_id: input.financialTxnId || null,
        notes: `Input VAT on ${input.documentNumber} - ${item.description || 'Material'}`,
        created_at: new Date().toISOString(),
      })
    }

    return TaxRepository.recordTaxTransactionLines(lines)
  }

  // ============================================================================
  // 4. TAX REPORTING & VAT RECONCILIATION
  // ============================================================================

  static async getTaxReport(companyId: string, startDate?: string, endDate?: string): Promise<TaxReportSummary> {
    return TaxRepository.getTaxSummary(companyId, startDate, endDate)
  }

  static async getTaxSummaryReport(companyId: string, startDate?: string, endDate?: string): Promise<TaxReportSummary> {
    return TaxRepository.getTaxSummary(companyId, startDate, endDate)
  }

  static async getTaxRegister(
    companyId: string,
    type?: 'sales' | 'purchase',
    options?: { startDate?: string; endDate?: string; branchId?: string | null }
  ): Promise<TaxTransactionLineRecord[]> {
    const partyType = type === 'sales' ? 'CUSTOMER' : type === 'purchase' ? 'SUPPLIER' : undefined
    return TaxRepository.getTaxTransactionLines(companyId, {
      ...options,
      partyType,
    })
  }
}
