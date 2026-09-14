// ==============================================================================
// InkFlow ERP - Authoritative Tax Repository (V7)
// Multi-Tenant PostgreSQL Tax Profiles, Default Seeds & Line-Level Tax Registers
// ==============================================================================

import { createClient } from '../supabase/server.ts'
import type {
  TaxProfileRecord,
  TaxTransactionLineRecord,
  TaxReportSummary,
} from '../../types/tax.types.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../db/data-store.ts'

export class TaxRepository {
  // ==========================================
  // 1. TAX PROFILES
  // ==========================================

  static async getTaxProfiles(
    companyId: string,
    options?: { branchId?: string | null; isActive?: boolean; taxType?: string }
  ): Promise<TaxProfileRecord[]> {
    try {
      const supabase = await createClient()
      let query = (supabase as any)
        .from('tax_profiles')
        .select('*')
        .eq('company_id', companyId)
        .order('rate', { ascending: false })

      if (options?.branchId) {
        query = query.or(`branch_id.eq.${options.branchId},branch_id.is.null`)
      }
      if (options?.isActive !== undefined) {
        query = query.eq('is_active', options.isActive)
      }
      if (options?.taxType) {
        query = query.eq('tax_type', options.taxType)
      }

      const { data, error } = await query
      if (!error && data && data.length > 0) {
        return data as unknown as TaxProfileRecord[]
      }
    } catch {}

    const all = PrintERPDataStore.get<TaxProfileRecord[]>(STORAGE_KEYS.TAX_PROFILES) || []
    return all.filter((p) => {
      if (p.company_id && p.company_id !== companyId) return false
      if (options?.isActive !== undefined && p.is_active !== options.isActive) return false
      if (options?.taxType && p.tax_type !== options.taxType) return false
      return true
    })
  }

  static async getTaxProfileById(id: string, companyId: string): Promise<TaxProfileRecord | null> {
    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('tax_profiles')
        .select('*')
        .eq('id', id)
        .eq('company_id', companyId)
        .maybeSingle()

      if (!error && data) return data as unknown as TaxProfileRecord
    } catch {}

    const all = PrintERPDataStore.get<TaxProfileRecord[]>(STORAGE_KEYS.TAX_PROFILES) || []
    return all.find((p) => p.id === id && (!p.company_id || p.company_id === companyId)) || null
  }

  static async getTaxProfileByCode(code: string, companyId: string): Promise<TaxProfileRecord | null> {
    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('tax_profiles')
        .select('*')
        .eq('code', code)
        .eq('company_id', companyId)
        .maybeSingle()

      if (!error && data) return data as unknown as TaxProfileRecord
    } catch {}

    const all = PrintERPDataStore.get<TaxProfileRecord[]>(STORAGE_KEYS.TAX_PROFILES) || []
    return all.find((p) => p.code === code && (!p.company_id || p.company_id === companyId)) || null
  }

  static async createTaxProfile(profile: TaxProfileRecord): Promise<TaxProfileRecord> {
    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('tax_profiles')
        .insert(profile)
        .select()
        .single()

      if (!error && data) {
        PrintERPDataStore.addItem(STORAGE_KEYS.TAX_PROFILES, data)
        return data as unknown as TaxProfileRecord
      }
    } catch {}

    PrintERPDataStore.addItem(STORAGE_KEYS.TAX_PROFILES, profile)
    return profile
  }

  static async updateTaxProfile(id: string, companyId: string, updates: Partial<TaxProfileRecord>): Promise<TaxProfileRecord> {
    const payload = { ...updates, updated_at: new Date().toISOString() }
    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('tax_profiles')
        .update(payload)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single()

      if (!error && data) {
        PrintERPDataStore.updateItem<TaxProfileRecord>(STORAGE_KEYS.TAX_PROFILES, id, data)
        return data as unknown as TaxProfileRecord
      }
    } catch {}

    const updated = PrintERPDataStore.updateItem<TaxProfileRecord>(STORAGE_KEYS.TAX_PROFILES, id, payload)
    if (updated) return updated
    throw new Error(`Tax profile ${id} not found to update.`)
  }

  /**
   * Seeds standard Bangladesh NBR tax profiles for a tenant
   */
  static async seedDefaultTaxProfiles(companyId: string): Promise<TaxProfileRecord[]> {
    const existing = await this.getTaxProfiles(companyId)
    if (existing && existing.length > 0) return existing

    const now = new Date().toISOString()
    const today = now.split('T')[0]

    const defaults: TaxProfileRecord[] = [
      {
        id: `tp-std-15-${companyId}`,
        company_id: companyId,
        code: 'VAT-15',
        name: 'Standard VAT 15%',
        name_bn: 'আদর্শ ভ্যাট ১৫%',
        rate: 15.00,
        calculation_mode: 'exclusive',
        tax_type: 'STANDARD',
        is_recoverable: true,
        effective_from: today,
        is_active: true,
        is_default: true,
        description: 'Standard NBR VAT on commercial goods & printing supply',
        created_at: now,
        updated_at: now,
      },
      {
        id: `tp-trun-7-5-${companyId}`,
        company_id: companyId,
        code: 'VAT-7.5',
        name: 'Truncated Service VAT 7.5%',
        name_bn: 'সংকুচিত সেবা ভ্যাট ৭.৫%',
        rate: 7.50,
        calculation_mode: 'exclusive',
        tax_type: 'TRUNCATED',
        is_recoverable: true,
        effective_from: today,
        is_active: true,
        is_default: false,
        description: 'Reduced service rate for advertising agencies and printing services',
        created_at: now,
        updated_at: now,
      },
      {
        id: `tp-red-5-${companyId}`,
        company_id: companyId,
        code: 'VAT-5',
        name: 'Retail Printing POS 5%',
        name_bn: 'খুচরা ভ্যাট ৫%',
        rate: 5.00,
        calculation_mode: 'inclusive',
        tax_type: 'REDUCED',
        is_recoverable: false,
        effective_from: today,
        is_active: true,
        is_default: false,
        description: 'Reduced retail rate for walk-in POS print customers',
        created_at: now,
        updated_at: now,
      },
      {
        id: `tp-zero-${companyId}`,
        company_id: companyId,
        code: 'VAT-ZERO',
        name: 'Zero-Rated Export 0%',
        name_bn: 'রপ্তানি শূন্যহার ০%',
        rate: 0.00,
        calculation_mode: 'exclusive',
        tax_type: 'ZERO_RATED',
        is_recoverable: true,
        effective_from: today,
        is_active: true,
        is_default: false,
        description: '0% rate for direct export and bonded supply',
        created_at: now,
        updated_at: now,
      },
      {
        id: `tp-exempt-${companyId}`,
        company_id: companyId,
        code: 'VAT-EXEMPT',
        name: 'Statutory Exempted Supply 0%',
        name_bn: 'অব্যাহতিপ্রাপ্ত সরবরাহ ০%',
        rate: 0.00,
        calculation_mode: 'exclusive',
        tax_type: 'EXEMPT',
        is_recoverable: false,
        effective_from: today,
        is_active: true,
        is_default: false,
        description: 'Exempted supply under NBR First Schedule',
        created_at: now,
        updated_at: now,
      },
      {
        id: `tp-non-tax-${companyId}`,
        company_id: companyId,
        code: 'VAT-NON-TAXABLE',
        name: 'Non-Taxable Supply',
        name_bn: 'অকরযোগ্য সরবরাহ',
        rate: 0.00,
        calculation_mode: 'exclusive',
        tax_type: 'NON_TAXABLE',
        is_recoverable: false,
        effective_from: today,
        is_active: true,
        is_default: false,
        description: 'Out of scope transactions and internal movements',
        created_at: now,
        updated_at: now,
      },
    ]

    for (const d of defaults) {
      await this.createTaxProfile(d)
    }

    return defaults
  }

  // ==========================================
  // 2. TAX TRANSACTION LINES (REGISTER)
  // ==========================================

  static async recordTaxTransactionLines(lines: TaxTransactionLineRecord[]): Promise<TaxTransactionLineRecord[]> {
    if (!lines || lines.length === 0) return []

    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('tax_transaction_lines')
        .insert(lines)
        .select()

      if (!error && data) {
        for (const item of data) {
          PrintERPDataStore.addItem(STORAGE_KEYS.TAX_TRANSACTION_LINES, item)
        }
        return data as unknown as TaxTransactionLineRecord[]
      }
    } catch {}

    for (const line of lines) {
      PrintERPDataStore.addItem(STORAGE_KEYS.TAX_TRANSACTION_LINES, line)
    }
    return lines
  }

  static async getTaxTransactionLines(
    companyId: string,
    options?: {
      startDate?: string
      endDate?: string
      partyType?: 'CUSTOMER' | 'SUPPLIER'
      transactionType?: string
      taxProfileCode?: string
      branchId?: string | null
    }
  ): Promise<TaxTransactionLineRecord[]> {
    try {
      const supabase = await createClient()
      let query = (supabase as any)
        .from('tax_transaction_lines')
        .select('*')
        .eq('company_id', companyId)
        .order('document_date', { ascending: false })

      if (options?.startDate) query = query.gte('document_date', options.startDate)
      if (options?.endDate) query = query.lte('document_date', options.endDate)
      if (options?.partyType) query = query.eq('party_type', options.partyType)
      if (options?.transactionType) query = query.eq('transaction_type', options.transactionType)
      if (options?.taxProfileCode) query = query.eq('tax_profile_code', options.taxProfileCode)
      if (options?.branchId) query = query.eq('branch_id', options.branchId)

      const { data, error } = await query
      if (!error && data) return data as unknown as TaxTransactionLineRecord[]
    } catch {}

    const all = PrintERPDataStore.get<TaxTransactionLineRecord[]>(STORAGE_KEYS.TAX_TRANSACTION_LINES) || []
    return all.filter((l) => {
      if (l.company_id && l.company_id !== companyId) return false
      if (options?.startDate && l.document_date < options.startDate) return false
      if (options?.endDate && l.document_date > options.endDate) return false
      if (options?.partyType && l.party_type !== options.partyType) return false
      if (options?.transactionType && l.transaction_type !== options.transactionType) return false
      if (options?.taxProfileCode && l.tax_profile_code !== options.taxProfileCode) return false
      if (options?.branchId && l.branch_id !== options.branchId) return false
      return true
    })
  }

  static async getTaxSummary(
    companyId: string,
    startDate?: string,
    endDate?: string
  ): Promise<TaxReportSummary> {
    const lines = await this.getTaxTransactionLines(companyId, { startDate, endDate })

    let totalTaxableSales = 0
    let stdVat15 = 0
    let trunVat = 0
    let redVat = 0
    let zeroSales = 0
    let exemptSales = 0
    let totalOutputVat = 0

    let totalTaxablePurchases = 0
    let eligibleInputVat = 0
    let ineligibleInputVat = 0
    let totalInputVat = 0

    for (const l of lines) {
      if (l.party_type === 'CUSTOMER' || l.transaction_type === 'SALES_INVOICE') {
        totalTaxableSales += Number(l.taxable_amount || 0)
        const vAmt = Number(l.vat_amount || 0)
        totalOutputVat += vAmt

        if (l.tax_type === 'STANDARD' || l.tax_rate === 15) {
          stdVat15 += vAmt
        } else if (l.tax_type === 'TRUNCATED') {
          trunVat += vAmt
        } else if (l.tax_type === 'REDUCED') {
          redVat += vAmt
        } else if (l.tax_type === 'ZERO_RATED') {
          zeroSales += Number(l.taxable_amount || 0)
        } else if (l.tax_type === 'EXEMPT') {
          exemptSales += Number(l.taxable_amount || 0)
        }
      } else if (l.party_type === 'SUPPLIER' || l.transaction_type === 'PURCHASE_BILL') {
        totalTaxablePurchases += Number(l.taxable_amount || 0)
        const vAmt = Number(l.vat_amount || 0)
        totalInputVat += vAmt
        if (l.is_recoverable) {
          eligibleInputVat += vAmt
        } else {
          ineligibleInputVat += vAmt
        }
      }
    }

    const netTaxPosition = Number((totalOutputVat - eligibleInputVat).toFixed(2))

    return {
      period_start: startDate || 'Beginning',
      period_end: endDate || new Date().toISOString().split('T')[0],
      output_vat: {
        total_taxable_sales: Number(totalTaxableSales.toFixed(2)),
        standard_vat_15: Number(stdVat15.toFixed(2)),
        truncated_vat: Number(trunVat.toFixed(2)),
        reduced_vat: Number(redVat.toFixed(2)),
        zero_rated_sales: Number(zeroSales.toFixed(2)),
        exempt_sales: Number(exemptSales.toFixed(2)),
        total_output_vat: Number(totalOutputVat.toFixed(2)),
      },
      input_vat: {
        total_taxable_purchases: Number(totalTaxablePurchases.toFixed(2)),
        eligible_input_vat: Number(eligibleInputVat.toFixed(2)),
        ineligible_input_vat: Number(ineligibleInputVat.toFixed(2)),
        total_input_vat: Number(totalInputVat.toFixed(2)),
      },
      net_tax_position: netTaxPosition,
      transactions_count: lines.length,
    }
  }
}
