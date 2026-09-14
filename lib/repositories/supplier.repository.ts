// ==============================================================================
// PrintERP / InkFlow SaaS - Supplier Repository (V5)
// Multi-Tenant PostgreSQL Supplier Master, Supplier Items & Price History
// ==============================================================================

import { createClient } from '../supabase/server.ts'
import type { SupplierRecord, SupplierMaterialPrice } from '../../types/crm.types.ts'
import type {
  SupplierItemRecord,
  SupplierPriceHistoryRecord,
  SupplierLedgerEntryRecord,
} from '../../types/purchase.types.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../db/data-store.ts'

export class SupplierRepository {
  // ==========================================
  // SUPPLIER MASTER
  // ==========================================

  static async getSuppliers(
    companyId: string,
    options?: { branchId?: string | null; category?: string; isActive?: boolean; search?: string }
  ): Promise<SupplierRecord[]> {
    try {
      const supabase = await createClient()
      let query = (supabase as any)
        .from('suppliers')
        .select('*')
        .eq('company_id', companyId)
        .order('supplier_name', { ascending: true })

      if (options?.branchId) {
        query = query.or(`branch_id.eq.${options.branchId},branch_id.is.null`)
      }
      if (options?.category && options.category !== 'all') {
        query = query.eq('category', options.category)
      }
      if (options?.isActive !== undefined) {
        query = query.eq('is_active', options.isActive)
      }
      if (options?.search) {
        const q = `%${options.search}%`
        query = query.or(`supplier_name.ilike.${q},supplier_code.ilike.${q},mobile.ilike.${q},company.ilike.${q},name_bn.ilike.${q}`)
      }

      const { data, error } = await query
      if (!error && data) return data as unknown as SupplierRecord[]
    } catch {}

    const all = PrintERPDataStore.get<SupplierRecord[]>(STORAGE_KEYS.SUPPLIERS) || []
    return all.filter((s) => {
      if (s.company_id && s.company_id !== companyId) return false
      if (options?.category && options.category !== 'all' && s.category !== options.category) return false
      if (options?.isActive !== undefined && s.is_active !== options.isActive) return false
      if (options?.search) {
        const q = options.search.toLowerCase()
        const match =
          s.supplier_name.toLowerCase().includes(q) ||
          s.mobile.includes(q) ||
          (s.supplier_code && s.supplier_code.toLowerCase().includes(q)) ||
          (s.name_bn && s.name_bn.includes(q))
        if (!match) return false
      }
      return true
    })
  }

  static async getSupplierById(id: string, companyId: string): Promise<SupplierRecord | null> {
    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('suppliers')
        .select('*')
        .eq('id', id)
        .eq('company_id', companyId)
        .maybeSingle()

      if (!error && data) return data as unknown as SupplierRecord
    } catch {}

    const all = PrintERPDataStore.get<SupplierRecord[]>(STORAGE_KEYS.SUPPLIERS) || []
    return all.find((s) => s.id === id && (!s.company_id || s.company_id === companyId)) || null
  }

  static async createSupplier(data: Partial<SupplierRecord> & {
    company_id: string
    supplier_name: string
    mobile: string
    category: any
  }): Promise<SupplierRecord> {
    const payload: any = {
      id: data.id || crypto.randomUUID(),
      company_id: data.company_id,
      branch_id: data.branch_id || null,
      supplier_code: data.supplier_code || `SUP-${Date.now().toString().slice(-4)}`,
      supplier_name: data.supplier_name.trim(),
      name_bn: data.name_bn?.trim() || null,
      company: data.company?.trim() || null,
      contact_person: data.contact_person?.trim() || null,
      mobile: data.mobile.trim(),
      alt_phone: data.alt_phone?.trim() || null,
      whatsapp: data.whatsapp?.trim() || null,
      email: data.email?.trim() || null,
      address: data.address?.trim() || null,
      division: data.division?.trim() || null,
      district: data.district?.trim() || null,
      upazila: data.upazila?.trim() || null,
      area: data.area?.trim() || null,
      bin: data.bin?.trim() || null,
      tin: data.tin?.trim() || null,
      trade_license: data.trade_license?.trim() || null,
      website: data.website?.trim() || null,
      category: data.category,
      payment_terms: data.payment_terms || 'credit_15',
      credit_limit: Number(data.credit_limit) || 0,
      lead_time_days: Number(data.lead_time_days) || 3,
      default_currency: data.default_currency || 'BDT',
      notes: data.notes?.trim() || null,
      is_active: data.is_active !== undefined ? data.is_active : true,
      created_by: data.created_by || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    try {
      const supabase = await createClient()
      const { data: created, error } = await (supabase as any)
        .from('suppliers')
        .insert(payload)
        .select()
        .single()

      if (!error && created) {
        PrintERPDataStore.addItem(STORAGE_KEYS.SUPPLIERS, created)
        return created as unknown as SupplierRecord
      }
    } catch {}

    PrintERPDataStore.addItem(STORAGE_KEYS.SUPPLIERS, payload)
    return payload as unknown as SupplierRecord
  }

  static async updateSupplier(
    id: string,
    updates: Partial<SupplierRecord>,
    companyId: string
  ): Promise<SupplierRecord | null> {
    const payload = { ...updates, updated_at: new Date().toISOString() }

    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('suppliers')
        .update(payload)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single()

      if (!error && data) {
        PrintERPDataStore.updateItem<SupplierRecord>(STORAGE_KEYS.SUPPLIERS, id, data)
        return data as unknown as SupplierRecord
      }
    } catch {}

    return PrintERPDataStore.updateItem<SupplierRecord>(STORAGE_KEYS.SUPPLIERS, id, payload)
  }

  static async deleteSupplier(id: string, companyId: string): Promise<boolean> {
    try {
      const supabase = await createClient()
      const { error } = await (supabase as any)
        .from('suppliers')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId)

      if (!error) {
        PrintERPDataStore.removeItem(STORAGE_KEYS.SUPPLIERS, id)
        return true
      }
    } catch {}

    return PrintERPDataStore.removeItem(STORAGE_KEYS.SUPPLIERS, id)
  }

  // ==========================================
  // SUPPLIER ITEMS CATALOG
  // ==========================================

  static async getSupplierItems(
    companyId: string,
    options?: { supplierId?: string; materialId?: string }
  ): Promise<SupplierItemRecord[]> {
    try {
      const supabase = await createClient()
      let query = (supabase as any)
        .from('supplier_items')
        .select('*, material:materials(id, sku, name, unit, current_stock)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (options?.supplierId) query = query.eq('supplier_id', options.supplierId)
      if (options?.materialId) query = query.eq('material_id', options.materialId)

      const { data, error } = await query
      if (!error && data) return data as unknown as SupplierItemRecord[]
    } catch {}

    const all = PrintERPDataStore.get<SupplierItemRecord[]>(STORAGE_KEYS.SUPPLIER_ITEMS) || []
    return all.filter((item) => {
      if (item.company_id && item.company_id !== companyId) return false
      if (options?.supplierId && item.supplier_id !== options.supplierId) return false
      if (options?.materialId && item.material_id !== options.materialId) return false
      return true
    })
  }

  static async createSupplierItem(data: Partial<SupplierItemRecord> & {
    company_id: string
    supplier_id: string
    material_id: string
    unit_price: number
  }): Promise<SupplierItemRecord> {
    const payload: any = {
      id: data.id || crypto.randomUUID(),
      company_id: data.company_id,
      branch_id: data.branch_id || null,
      supplier_id: data.supplier_id,
      material_id: data.material_id,
      supplier_sku: data.supplier_sku?.trim() || null,
      supplier_item_name: data.supplier_item_name?.trim() || null,
      purchase_unit: data.purchase_unit || 'unit',
      conversion_factor: Number(data.conversion_factor) || 1.0,
      unit_price: Number(data.unit_price) || 0,
      currency: data.currency || 'BDT',
      moq: Number(data.moq) || 1,
      lead_time_days: Number(data.lead_time_days) || 3,
      is_preferred: Boolean(data.is_preferred),
      is_active: data.is_active !== undefined ? data.is_active : true,
      effective_date: data.effective_date || new Date().toISOString().split('T')[0],
      notes: data.notes?.trim() || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    try {
      const supabase = await createClient()
      const { data: created, error } = await (supabase as any)
        .from('supplier_items')
        .insert(payload)
        .select('*, material:materials(id, sku, name, unit, current_stock)')
        .single()

      if (!error && created) {
        PrintERPDataStore.addItem(STORAGE_KEYS.SUPPLIER_ITEMS, created)
        return created as unknown as SupplierItemRecord
      }
    } catch {}

    PrintERPDataStore.addItem(STORAGE_KEYS.SUPPLIER_ITEMS, payload)
    return payload as unknown as SupplierItemRecord
  }

  static async updateSupplierItem(
    id: string,
    updates: Partial<SupplierItemRecord>,
    companyId: string
  ): Promise<SupplierItemRecord | null> {
    const payload = { ...updates, updated_at: new Date().toISOString() }

    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('supplier_items')
        .update(payload)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single()

      if (!error && data) {
        PrintERPDataStore.updateItem<SupplierItemRecord>(STORAGE_KEYS.SUPPLIER_ITEMS, id, data)
        return data as unknown as SupplierItemRecord
      }
    } catch {}

    return PrintERPDataStore.updateItem<SupplierItemRecord>(STORAGE_KEYS.SUPPLIER_ITEMS, id, payload)
  }

  static async deleteSupplierItem(id: string, companyId: string): Promise<boolean> {
    try {
      const supabase = await createClient()
      const { error } = await (supabase as any)
        .from('supplier_items')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId)

      if (!error) {
        PrintERPDataStore.removeItem(STORAGE_KEYS.SUPPLIER_ITEMS, id)
        return true
      }
    } catch {}

    return PrintERPDataStore.removeItem(STORAGE_KEYS.SUPPLIER_ITEMS, id)
  }

  // ==========================================
  // SUPPLIER PRICE HISTORY & BENCHMARKS
  // ==========================================

  static async getSupplierPriceHistory(
    companyId: string,
    options?: { materialId?: string; supplierId?: string }
  ): Promise<SupplierPriceHistoryRecord[]> {
    try {
      const supabase = await createClient()
      let query = (supabase as any)
        .from('supplier_price_history')
        .select('*')
        .eq('company_id', companyId)
        .order('po_date', { ascending: false })

      if (options?.materialId) query = query.eq('material_id', options.materialId)
      if (options?.supplierId) query = query.eq('supplier_id', options.supplierId)

      const { data, error } = await query
      if (!error && data) return data as unknown as SupplierPriceHistoryRecord[]
    } catch {}

    const all = PrintERPDataStore.get<SupplierPriceHistoryRecord[]>(STORAGE_KEYS.PRICE_HISTORY) || []
    return all.filter((h) => {
      if (h.company_id && h.company_id !== companyId) return false
      if (options?.materialId && h.material_id !== options.materialId) return false
      if (options?.supplierId && h.supplier_id !== options.supplierId) return false
      return true
    })
  }

  static async recordSupplierPriceHistory(data: {
    company_id: string
    material_id: string
    material_name: string
    supplier_id: string
    supplier_name: string
    purchase_price: number
    previous_price?: number | null
    quantity: number
    po_id?: string | null
    po_date?: string
  }): Promise<SupplierPriceHistoryRecord> {
    const payload: SupplierPriceHistoryRecord = {
      id: crypto.randomUUID(),
      company_id: data.company_id,
      material_id: data.material_id,
      material_name: data.material_name,
      supplier_id: data.supplier_id,
      supplier_name: data.supplier_name,
      purchase_price: Number(data.purchase_price) || 0,
      previous_price: data.previous_price !== undefined ? data.previous_price : null,
      quantity: Number(data.quantity) || 0,
      po_id: data.po_id || null,
      po_date: data.po_date || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    }

    try {
      const supabase = await createClient()
      const { data: created, error } = await (supabase as any)
        .from('supplier_price_history')
        .insert(payload)
        .select()
        .single()

      if (!error && created) {
        PrintERPDataStore.addItem(STORAGE_KEYS.PRICE_HISTORY, created)
        return created as unknown as SupplierPriceHistoryRecord
      }
    } catch {}

    PrintERPDataStore.addItem(STORAGE_KEYS.PRICE_HISTORY, payload)
    return payload
  }

  // ==========================================
  // SUPPLIER LEDGER ENTRIES
  // ==========================================

  static async getSupplierLedger(companyId: string, supplierId?: string): Promise<SupplierLedgerEntryRecord[]> {
    try {
      const supabase = await createClient()
      let query = (supabase as any)
        .from('supplier_ledger_entries')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true })

      if (supplierId) {
        query = query.eq('supplier_id', supplierId)
      }

      const { data, error } = await query
      if (!error && data) return data as unknown as SupplierLedgerEntryRecord[]
    } catch {}

    const all = PrintERPDataStore.get<SupplierLedgerEntryRecord[]>(STORAGE_KEYS.SUPPLIER_LEDGER_ENTRIES) || []
    return all.filter((e) => (!e.company_id || e.company_id === companyId) && (!supplierId || e.supplier_id === supplierId))
  }

  static async recordSupplierLedgerEntry(entry: {
    company_id: string
    branch_id?: string | null
    supplier_id: string
    entry_type: 'PURCHASE_ORDER' | 'GOODS_RECEIPT' | 'PAYMENT' | 'RETURN' | 'ADJUSTMENT'
    reference_type?: string | null
    reference_id?: string | null
    debit?: number
    credit?: number
    notes?: string | null
  }): Promise<SupplierLedgerEntryRecord> {
    const existing = await this.getSupplierLedger(entry.company_id, entry.supplier_id)
    const prevBalance = existing.length > 0 ? existing[existing.length - 1].running_balance : 0
    const debit = Number(entry.debit) || 0
    const credit = Number(entry.credit) || 0
    const running_balance = prevBalance + credit - debit

    const payload: SupplierLedgerEntryRecord = {
      id: crypto.randomUUID(),
      company_id: entry.company_id,
      branch_id: entry.branch_id || null,
      supplier_id: entry.supplier_id,
      entry_type: entry.entry_type,
      reference_type: entry.reference_type || null,
      reference_id: entry.reference_id || null,
      debit,
      credit,
      running_balance,
      notes: entry.notes || null,
      created_at: new Date().toISOString(),
    }

    try {
      const supabase = await createClient()
      const { data: created, error } = await (supabase as any)
        .from('supplier_ledger_entries')
        .insert(payload)
        .select()
        .single()

      if (!error && created) {
        PrintERPDataStore.addItem(STORAGE_KEYS.SUPPLIER_LEDGER_ENTRIES, created)
        return created as unknown as SupplierLedgerEntryRecord
      }
    } catch {}

    PrintERPDataStore.addItem(STORAGE_KEYS.SUPPLIER_LEDGER_ENTRIES, payload)
    return payload
  }

  static async recordLedgerEntry(entry: any): Promise<SupplierLedgerEntryRecord> {
    return this.recordSupplierLedgerEntry(entry)
  }

  static async getLedgerEntries(companyId: string, supplierId?: string): Promise<SupplierLedgerEntryRecord[]> {
    return this.getSupplierLedger(companyId, supplierId)
  }
}
