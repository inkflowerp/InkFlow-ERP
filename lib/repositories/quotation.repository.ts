import { createClient } from '../supabase/server.ts'
import { createAdminClient } from '../supabase/admin.ts'
import type {
  QuotationRecord,
  QuotationItemRecord,
  QuotationActivityRecord,
  QuotationStatus,
  CreateQuotationItemInput,
} from '../../types/quotation.types.ts'
import {
  normalizeQuotationRecord,
  extractQuotationsFromAny,
  deduplicateQuotations,
} from '../../types/quotation.types.ts'
import type { InvoiceRecord } from '../../types/billing.types.ts'
import { measureAsync } from '../performance/logger.ts'
import { buildPaginatedResponse, type PaginatedResult } from '../api/pagination-helper.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../db/data-store.ts'

export class QuotationRepository {
  /**
   * Concurrency-safe, tenant-aware sequential quotation number generator
   */
  static async getNextQuotationNumber(companyId: string): Promise<string> {
    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any).rpc('get_next_document_number', {
        p_company_id: companyId,
        p_doc_type: 'quotation',
      })

      if (!error && data) {
        return String(data)
      }

      const admin = createAdminClient()
      const { data: seq } = await (admin as any)
        .from('document_sequences')
        .select('*')
        .eq('company_id', companyId)
        .eq('doc_type', 'quotation')
        .maybeSingle()

      const prefix = seq?.prefix || 'QUO'
      let nextVal = seq?.current_value || 1
      if (!seq) {
        await (admin as any).from('document_sequences').insert({
          company_id: companyId,
          doc_type: 'quotation',
          prefix,
          current_value: 1,
        })
      } else {
        nextVal += 1
        await (admin as any)
          .from('document_sequences')
          .update({ current_value: nextVal, updated_at: new Date().toISOString() })
          .eq('id', seq.id)
      }

      const { data: quoteSeq } = await (supabase as any)
        .from('quotations')
        .select('quotation_number')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(1)

      return `${prefix}-${String(nextVal).padStart(6, '0')}`
    } catch {
      // Fallback to DataStore atomic number
      return PrintERPDataStore.getNextDocumentNumber(companyId, 'quotation')
    }
  }

  /**
   * Retrieves all quotations for a tenant with resilient legacy data recovery and normalization
   */
  static async getQuotations(companyId: string): Promise<QuotationRecord[]> {
    return measureAsync(`QuotationRepository.getQuotations(${companyId})`, async () => {
      const rawCandidates: any[] = []

      // 1. Try standard Supabase Client
      try {
        const supabase = await createClient()
        let query = (supabase as any)
          .from('quotations')
          .select('*, items:quotation_items(*)')
        
        if (companyId && companyId !== 'c-01' && companyId !== 'default') {
          query = query.or(`company_id.eq.${companyId},company_id.eq.c-01,company_id.eq.default,company_id.is.null`)
        } else if (companyId) {
          query = query.or(`company_id.eq.${companyId},company_id.eq.c-01,company_id.eq.default,company_id.is.null`)
        }

        const { data, error } = await query.order('created_at', { ascending: false })
        if (!error && data && data.length > 0) {
          rawCandidates.push(...data)
        } else if (error) {
          // If nested relation quotation_items failed on legacy DB, fallback to flat query
          const { data: flatData, error: flatErr } = await (supabase as any)
            .from('quotations')
            .select('*')
            .order('created_at', { ascending: false })
          if (!flatErr && flatData && flatData.length > 0) {
            rawCandidates.push(...flatData)
          }
        }
      } catch {
        // Fallback
      }

      // 2. Try Admin Client if on server and no quotes found yet
      if (rawCandidates.length === 0 && typeof window === 'undefined') {
        try {
          const { createAdminClient } = await import('@/lib/supabase/admin')
          const admin = createAdminClient()
          let query = (admin as any)
            .from('quotations')
            .select('*, items:quotation_items(*)')

          if (companyId && companyId !== 'c-01' && companyId !== 'default') {
            query = query.or(`company_id.eq.${companyId},company_id.eq.c-01,company_id.eq.default,company_id.is.null`)
          } else if (companyId) {
            query = query.or(`company_id.eq.${companyId},company_id.eq.c-01,company_id.eq.default,company_id.is.null`)
          }

          const { data, error } = await query.order('created_at', { ascending: false })
          if (!error && data && data.length > 0) {
            rawCandidates.push(...data)
          } else if (error) {
            const { data: flatData, error: flatErr } = await (admin as any)
              .from('quotations')
              .select('*')
              .order('created_at', { ascending: false })
            if (!flatErr && flatData && flatData.length > 0) {
              rawCandidates.push(...flatData)
            }
          }
        } catch {}
      }

      // 3. Merge with local data store and deep scan browser storage for any historical quotations
      const rawStored = PrintERPDataStore.get<any[]>(STORAGE_KEYS.QUOTATIONS) || []
      if (Array.isArray(rawStored)) {
        rawCandidates.push(...rawStored)
      }

      if (typeof window !== 'undefined') {
        try {
          for (let i = 0; i < window.localStorage.length; i++) {
            const k = window.localStorage.key(i)
            if (!k) continue
            const raw = window.localStorage.getItem(k)
            if (!raw) continue

            if (
              k.startsWith('printerp_tenant_quotations') ||
              k.startsWith('printerp_quotations') ||
              k.includes('quotation') ||
              k.includes('quotes') ||
              k.includes('draft') ||
              k.includes('outbox') ||
              k.includes('inkflow')
            ) {
              const extracted = extractQuotationsFromAny(raw)
              if (extracted.length > 0) {
                rawCandidates.push(...extracted)
              }
            }
          }
        } catch {}
      }

      // 4. Deduplicate and normalize
      return deduplicateQuotations(rawCandidates, companyId)
    })
  }

  /**
   * Paginated and Filtered Quotations
   */
  static async getPaginatedQuotations(
    companyId: string,
    options: {
      page?: number
      pageSize?: number
      status?: string
      search?: string
    } = {}
  ): Promise<PaginatedResult<QuotationRecord>> {
    return measureAsync(`QuotationRepository.getPaginatedQuotations(${companyId})`, async () => {
      const page = Math.max(1, options.page || 1)
      const pageSize = Math.min(100, Math.max(1, options.pageSize || 25))
      const offset = (page - 1) * pageSize

      try {
        const supabase = await createClient()
        let query = (supabase as any)
          .from('quotations')
          .select('*, items:quotation_items(*)', { count: 'exact' })

        if (companyId && companyId !== 'c-01' && companyId !== 'default') {
          query = query.or(`company_id.eq.${companyId},company_id.eq.c-01,company_id.is.null`)
        } else if (companyId) {
          query = query.or(`company_id.eq.${companyId},company_id.is.null`)
        }

        if (options.status && options.status !== 'all') {
          query = query.eq('status', options.status)
        }

        if (options.search?.trim()) {
          const term = `%${options.search.trim()}%`
          query = query.or(`quotation_number.ilike.${term},customer_name.ilike.${term},customer_phone.ilike.${term}`)
        }

        query = query
          .order('created_at', { ascending: false })
          .range(offset, offset + pageSize - 1)

        const { data, count, error } = await query

        if (!error && data && data.length > 0) {
          const normalizedRows = data.map((d: any) => normalizeQuotationRecord(d))
          return buildPaginatedResponse(normalizedRows, count || normalizedRows.length, page, pageSize)
        }
      } catch {}

      // Fallback
      const all = await this.getQuotations(companyId)
      const filtered = all.filter((q) => {
        const matchSearch =
          !options.search ||
          (q.quotation_number || '').toLowerCase().includes(options.search.toLowerCase()) ||
          (q.customer_name || '').toLowerCase().includes(options.search.toLowerCase()) ||
          (q.customer_phone || '').includes(options.search)
        const matchStatus = !options.status || options.status === 'all' || q.status === options.status
        return matchSearch && matchStatus
      })
      return buildPaginatedResponse(
        filtered.slice(offset, offset + pageSize),
        filtered.length,
        page,
        pageSize
      )
    })
  }

  /**
   * Retrieves customer-specific quotations with direct database scoping
   */
  static async getCustomerQuotations(companyId: string, customerId: string): Promise<QuotationRecord[]> {
    return measureAsync(`QuotationRepository.getCustomerQuotations(${customerId})`, async () => {
      try {
        const supabase = await createClient()
        const { data, error } = await (supabase as any)
          .from('quotations')
          .select('*, items:quotation_items(*)')
          .eq('company_id', companyId)
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false })

        if (!error && data) {
          return data as unknown as QuotationRecord[]
        }
      } catch {}

      const all = await this.getQuotations(companyId)
      return all.filter((q) => q.customer_id === customerId)
    })
  }

  /**
   * Retrieves a single quotation with items and activity timeline
   */
  static async getQuotationById(id: string, companyId?: string): Promise<QuotationRecord | null> {
    const cleanId = String(id || '').trim()
    if (!cleanId) return null

    const isAllowedTenant = (recordCompanyId: string | null | undefined): boolean => {
      if (!companyId || companyId === 'all' || companyId === 'c-01' || companyId === 'default') return true
      if (!recordCompanyId) return true
      const normCompany = companyId.toLowerCase().trim()
      const normRec = String(recordCompanyId).toLowerCase().trim()
      return normRec === normCompany || normRec === normCompany.replace(/^comp-/, '').replace(/^co-/, '')
    }

    try {
      const supabase = await createClient()
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId)
      
      let query = (supabase as any)
        .from('quotations')
        .select('*, items:quotation_items(*)')

      if (isUUID) {
        query = query.or(`id.eq.${cleanId},quotation_number.eq.${cleanId}`)
      } else {
        query = query.eq('quotation_number', cleanId)
      }

      const { data, error } = await query.maybeSingle()

      if (!error && data) {
        if (isAllowedTenant(data.company_id)) {
          return normalizeQuotationRecord(data)
        }
        return null
      }

      // Try Admin client if on server
      if (typeof window === 'undefined') {
        const { createAdminClient } = await import('@/lib/supabase/admin')
        const admin = createAdminClient()
        let adminQuery = (admin as any)
          .from('quotations')
          .select('*, items:quotation_items(*)')
        
        if (isUUID) {
          adminQuery = adminQuery.or(`id.eq.${cleanId},quotation_number.eq.${cleanId}`)
        } else {
          adminQuery = adminQuery.eq('quotation_number', cleanId)
        }

        const { data: adminData } = await adminQuery.maybeSingle()
        if (adminData) {
          if (isAllowedTenant(adminData.company_id)) {
            return normalizeQuotationRecord(adminData)
          }
          return null
        }
      }
    } catch {}

    // Fallback: check DataStore & localStorage
    const localQuotes = PrintERPDataStore.get<any[]>(STORAGE_KEYS.QUOTATIONS) || []
    const allCandidates: any[] = [...localQuotes]

    if (typeof window !== 'undefined') {
      try {
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i)
          if (!k) continue
          if (
            k.startsWith('printerp_tenant_quotations') ||
            k.startsWith('printerp_quotations') ||
            k.includes('quotation') ||
            k.includes('quotes')
          ) {
            const raw = window.localStorage.getItem(k)
            if (raw) {
              const parsed = JSON.parse(raw)
              if (Array.isArray(parsed)) allCandidates.push(...parsed)
              else if (parsed && typeof parsed === 'object') allCandidates.push(parsed)
            }
          }
        }
      } catch {}
    }

    const found = allCandidates.find((q) => {
      if (!q || typeof q !== 'object') return false
      const qId = String(q.id || '').toLowerCase()
      const qNo = String(q.quotation_number || q.quote_number || q.number || '').toLowerCase()
      const target = cleanId.toLowerCase()
      const matchesId = qId === target || qNo === target
      if (!matchesId) return false
      return isAllowedTenant(q.company_id)
    })

    if (found) {
      return normalizeQuotationRecord(found)
    }

    return null
  }

  /**
   * Creates a formal quotation with price snapshot immutability in PostgreSQL & DataStore
   */
  static async createQuotation(quotation: Omit<Partial<QuotationRecord>, 'items'> & {
    company_id: string
    customer_id?: string | null
    customer_name: string
    customer_phone: string
    valid_until: string
    salesperson_name: string
    items: (CreateQuotationItemInput | QuotationItemRecord)[]
  }): Promise<QuotationRecord> {
    const companyId = quotation.company_id
    const quotationNumber = quotation.quotation_number || (await this.getNextQuotationNumber(companyId))

    // 1. Calculate items and validate totals
    let calculatedSubtotal = 0
    let totalCost = 0

    const itemsToInsert: QuotationItemRecord[] = (quotation.items || []).map((it, idx) => {
      const w = Number(it.width) || 0
      const h = Number(it.height) || 0
      const qty = Math.max(1, Number(it.quantity) || 1)
      const rate = Math.max(0, Number(it.unit_rate !== undefined ? it.unit_rate : ((it as any).unit_price !== undefined ? (it as any).unit_price : ((it as any).rate !== undefined ? (it as any).rate : ((it as any).price !== undefined ? (it as any).price : 0)))) || 0)
      const dimUnit = it.dimension_unit || 'ft'
      
      let areaSft = 0
      let lineTotal = 0

      if (w > 0 && h > 0) {
        if (dimUnit === 'inch') {
          areaSft = Math.round(((w * h) / 144) * qty * 100) / 100
        } else if (dimUnit === 'm') {
          areaSft = Math.round(w * h * 10.7639 * qty * 100) / 100
        } else {
          areaSft = Math.round(w * h * qty * 100) / 100
        }
        lineTotal = Math.round(areaSft * rate)
      } else {
        areaSft = 0
        lineTotal = Math.round(qty * rate)
      }

      calculatedSubtotal += lineTotal
      const estimatedItemCost = Math.round(lineTotal * 0.55)
      totalCost += estimatedItemCost

      return {
        id: it.id || `qi-${Date.now()}-${idx + 1}`,
        product_id: it.product_id || null,
        item_kind: it.item_kind || (w > 0 && h > 0 ? 'service' : 'ready_product'),
        product_type: it.product_type || null,
        category_preset: (it as any).category_preset || null,
        description: it.description || 'Print Item',
        description_bn: it.description_bn || null,
        material_spec: it.material_spec || null,
        dimensions_spec: (it as any).dimensions_spec || (w > 0 && h > 0 ? `${w} × ${h} ${dimUnit}` : null),
        width: w,
        height: h,
        dimension_unit: dimUnit,
        area_sft: areaSft,
        quantity: qty,
        unit: it.unit || (areaSft > 0 ? 'sft' : 'pcs'),
        unit_rate: rate,
        unit_price: rate,
        rate_source: it.rate_source || 'default',
        tier_applied: (it as any).tier_applied || null,
        moq: (it as any).moq || null,
        finishing: it.finishing || null,
        selected_finishing: (it as any).selected_finishing || null,
        selected_add_ons: (it as any).selected_add_ons || null,
        selected_installation: (it as any).selected_installation || null,
        color_spec: it.color_spec || null,
        artwork_required: it.artwork_required || false,
        installation_required: it.installation_required || false,
        offset_specs: (it as any).offset_specs || null,
        signage_specs: (it as any).signage_specs || null,
        material_cost: it.material_cost || Math.round(estimatedItemCost * 0.7),
        labor_cost: it.labor_cost || Math.round(estimatedItemCost * 0.3),
        finishing_cost: it.finishing_cost || 0,
        installation_cost: it.installation_cost || 0,
        item_total: lineTotal,
      }
    })

    const effectiveSubtotal = calculatedSubtotal || Number(quotation.subtotal) || Number(quotation.grand_total) || 0
    const discountAmount = Math.max(0, Number(quotation.discount_amount) || 0)
    const vatRate = typeof quotation.vat_rate === 'number' ? quotation.vat_rate : 7.5
    const subtotalAfterDiscount = Math.max(0, effectiveSubtotal - discountAmount)
    const vatAmount = quotation.vat_amount !== undefined ? Number(quotation.vat_amount) : Math.round((subtotalAfterDiscount * vatRate) / 100)
    const grandTotal = quotation.grand_total !== undefined ? Number(quotation.grand_total) : (subtotalAfterDiscount + vatAmount)
    const marginPercent = grandTotal > 0 ? Math.round(((grandTotal - totalCost) / grandTotal) * 100) : 40

    const advancePercent = quotation.advance_percentage !== undefined && quotation.advance_percentage !== null ? Number(quotation.advance_percentage) : 50
    const advanceAmount = quotation.advance_amount !== undefined && quotation.advance_amount !== null ? Number(quotation.advance_amount) : Math.round((grandTotal * advancePercent) / 100)
    const dueOnDelivery = quotation.due_on_delivery !== undefined && quotation.due_on_delivery !== null ? Number(quotation.due_on_delivery) : Math.max(0, grandTotal - advanceAmount)

    const quoteId = quotation.id || `quo-${Date.now()}`

    const quoteRecord: QuotationRecord = {
      id: quoteId,
      company_id: companyId,
      quotation_number: quotationNumber,
      customer_id: quotation.customer_id || null,
      customer_name: quotation.customer_name.trim(),
      customer_name_bn: quotation.customer_name_bn?.trim() || null,
      customer_company: quotation.customer_company?.trim() || null,
      customer_phone: quotation.customer_phone.trim(),
      customer_whatsapp: quotation.customer_whatsapp?.trim() || null,
      customer_email: quotation.customer_email?.trim().toLowerCase() || null,
      customer_address: quotation.customer_address?.trim() || null,
      customer_bin: quotation.customer_bin?.trim() || null,
      customer_type: quotation.customer_type || 'retail',
      status: quotation.status || 'draft',
      quotation_date: quotation.quotation_date || new Date().toISOString().split('T')[0],
      valid_until: quotation.valid_until,
      reference_no: quotation.reference_no?.trim() || null,
      salesperson_id: quotation.salesperson_id || null,
      salesperson_name: quotation.salesperson_name.trim(),
      items: itemsToInsert,
      subtotal: calculatedSubtotal,
      discount_amount: discountAmount,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      grand_total: grandTotal,
      advance_percentage: advancePercent,
      advance_amount: advanceAmount,
      due_on_delivery: dueOnDelivery,
      payment_method_note: quotation.payment_method_note || null,
      total_cost: totalCost,
      margin_percent: marginPercent,
      language_mode: quotation.language_mode || 'bn',
      delivery_date: quotation.delivery_date || null,
      delivery_location: quotation.delivery_location?.trim() || null,
      delivery_method: quotation.delivery_method || 'customer_pickup',
      installation_required: quotation.installation_required || false,
      notes: quotation.notes?.trim() || null,
      terms_and_conditions: quotation.terms_and_conditions || null,
      internal_notes: quotation.internal_notes?.trim() || null,
      converted_order_id: quotation.converted_order_id || null,
      converted_invoice_id: quotation.converted_invoice_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Attempt PostgreSQL persistence
    try {
      const supabase = await createClient()
      const payloadToSave: any = {
        company_id: quoteRecord.company_id,
        quotation_number: quoteRecord.quotation_number,
        customer_id: quoteRecord.customer_id || null,
        customer_name: quoteRecord.customer_name,
        customer_name_bn: quoteRecord.customer_name_bn,
        customer_company: quoteRecord.customer_company,
        customer_phone: quoteRecord.customer_phone,
        customer_whatsapp: quoteRecord.customer_whatsapp,
        customer_email: quoteRecord.customer_email,
        customer_address: quoteRecord.customer_address,
        customer_bin: quoteRecord.customer_bin,
        customer_type: quoteRecord.customer_type,
        status: quoteRecord.status,
        quotation_date: quoteRecord.quotation_date,
        valid_until: quoteRecord.valid_until,
        reference_no: quoteRecord.reference_no,
        salesperson_id: quoteRecord.salesperson_id,
        salesperson_name: quoteRecord.salesperson_name,
        subtotal: quoteRecord.subtotal,
        discount_amount: quoteRecord.discount_amount,
        vat_rate: quoteRecord.vat_rate,
        vat_amount: quoteRecord.vat_amount,
        grand_total: quoteRecord.grand_total,
        total_cost: quoteRecord.total_cost,
        margin_percent: quoteRecord.margin_percent,
        language_mode: quoteRecord.language_mode,
        delivery_date: quoteRecord.delivery_date,
        delivery_location: quoteRecord.delivery_location,
        delivery_method: quoteRecord.delivery_method,
        installation_required: quoteRecord.installation_required,
        notes: quoteRecord.notes,
        terms_and_conditions: quoteRecord.terms_and_conditions,
        internal_notes: quoteRecord.internal_notes,
        follow_up_date: quoteRecord.follow_up_date || null,
        follow_up_status: quoteRecord.follow_up_status || 'none',
        last_follow_up_method: quoteRecord.last_follow_up_method || null,
        last_follow_up_at: quoteRecord.last_follow_up_at || null,
        last_follow_up_note: quoteRecord.last_follow_up_note || null,
        next_action: quoteRecord.next_action || null,
        follow_up_count: quoteRecord.follow_up_count || 0,
        converted_order_id: quoteRecord.converted_order_id || null,
        converted_invoice_id: quoteRecord.converted_invoice_id || null,
        created_at: quoteRecord.created_at,
        updated_at: quoteRecord.updated_at,
      }

      if (quoteRecord.id && !quoteRecord.id.startsWith('quo-')) {
        payloadToSave.id = quoteRecord.id
      }

      const { data: savedQuote, error: quoteErr } = await (supabase as any)
        .from('quotations')
        .insert(payloadToSave)
        .select()
        .single()

      if (!quoteErr && savedQuote) {
        quoteRecord.id = savedQuote.id

        // Insert items
        const itemRows = itemsToInsert.map((item) => ({
          quotation_id: savedQuote.id,
          product_id: item.product_id || null,
          description: item.description,
          description_bn: item.description_bn || null,
          material_spec: item.material_spec || null,
          width: item.width,
          height: item.height,
          dimension_unit: item.dimension_unit,
          area_sft: item.area_sft,
          quantity: item.quantity,
          unit: item.unit,
          unit_rate: item.unit_rate,
          rate_source: item.rate_source || 'default',
          finishing: item.finishing || null,
          color_spec: item.color_spec || null,
          artwork_required: item.artwork_required || false,
          installation_required: item.installation_required || false,
          material_cost: item.material_cost,
          labor_cost: item.labor_cost,
          finishing_cost: item.finishing_cost,
          installation_cost: item.installation_cost,
          item_total: item.item_total,
        }))

        await (supabase as any).from('quotation_items').insert(itemRows)

        // Activity log
        await (supabase as any).from('quotation_activities').insert({
          quotation_id: savedQuote.id,
          action: 'created',
          details: `Quotation ${savedQuote.quotation_number} generated for ${quoteRecord.customer_name} (Total: ৳${grandTotal})`,
          actor_name: quoteRecord.salesperson_name,
        })
      }
    } catch {
      // Non-blocking, fallback to DataStore
    }

    // Always mirror in DataStore for offline/browser availability
    PrintERPDataStore.addItem<QuotationRecord>(STORAGE_KEYS.QUOTATIONS, quoteRecord)

    const activity: QuotationActivityRecord = {
      id: `qa-${Date.now()}`,
      quotation_id: quoteRecord.id,
      action: 'created',
      details: `Quotation ${quoteRecord.quotation_number} generated for ${quoteRecord.customer_name} (Total: ৳${grandTotal})`,
      actor_name: quoteRecord.salesperson_name,
      created_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem<QuotationActivityRecord>(STORAGE_KEYS.QUOTATION_ACTIVITIES, activity)

    return quoteRecord
  }

  /**
   * Updates a quotation record
   */
  static async updateQuotation(
    id: string,
    updates: Partial<QuotationRecord>,
    companyId: string
  ): Promise<QuotationRecord | null> {
    try {
      const supabase = await createClient()
      const payload: any = { ...updates, updated_at: new Date().toISOString() }
      delete payload.id
      delete payload.company_id
      delete payload.items

      await (supabase as any)
        .from('quotations')
        .update(payload)
        .eq('id', id)
        .eq('company_id', companyId)
    } catch {
      // fallback
    }

    const updated = PrintERPDataStore.updateItem<QuotationRecord>(STORAGE_KEYS.QUOTATIONS, id, updates)
    return updated || (await this.getQuotationById(id, companyId))
  }

  /**
   * Converts a quotation to a formal Invoice, strictly preserving quoted rates
   */
  static async convertQuotationToInvoice(
    quotationId: string,
    companyId: string,
    options?: {
      createdByName?: string
      dueDate?: string
      paidAmount?: number
      advanceAmount?: number
    }
  ): Promise<InvoiceRecord> {
    const quote = await this.getQuotationById(quotationId, companyId)
    if (!quote) {
      throw new Error(`Quotation ${quotationId} not found in company context.`)
    }

    const effectiveCompanyId = (companyId && companyId !== 'c-01' ? companyId : quote.company_id) || companyId || 'c-01'

    if (quote.status === 'converted' && quote.converted_invoice_id) {
      throw new Error(`Quotation #${quote.quotation_number} has already been converted to an Invoice.`)
    }

    const dueDate = options?.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
    const invNumber = PrintERPDataStore.getNextDocumentNumber(effectiveCompanyId, 'invoice')
    const invoiceId = `inv-${Date.now()}`

    const advancePaid = options?.paidAmount !== undefined
      ? Math.max(0, Number(options.paidAmount) || 0)
      : options?.advanceAmount !== undefined
        ? Math.max(0, Number(options.advanceAmount) || 0)
        : 0
    const dueAmount = Math.max(0, quote.grand_total - advancePaid)

    const invoice: InvoiceRecord = {
      id: invoiceId,
      company_id: effectiveCompanyId,
      invoice_number: invNumber,
      quotation_id: quote.id,
      quotation_number: quote.quotation_number,
      customer_id: quote.customer_id || '00000000-0000-0000-0000-000000000000',
      customer_name: quote.customer_name,
      customer_phone: quote.customer_phone,
      customer_address: quote.customer_address || '',
      customer_bin: quote.customer_bin || null,
      invoice_type: 'sales_invoice',
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: dueDate,
      subtotal: quote.subtotal,
      discount_amount: quote.discount_amount,
      vat_percentage: quote.vat_rate,
      vat_amount: quote.vat_amount,
      grand_total: quote.grand_total,
      paid_amount: advancePaid,
      due_amount: dueAmount,
      write_off_amount: 0,
      status: dueAmount === 0 ? 'paid' : advancePaid > 0 ? 'partially_paid' : 'unpaid',
      notes: `Converted from Quotation ${quote.quotation_number}.${quote.notes ? ` Notes: ${quote.notes}` : ''}`,
      created_by_name: options?.createdByName || quote.salesperson_name || 'Commercial Executive',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: (quote.items || []).map((it, idx) => {
        const isReady = it.item_kind === 'ready_product'
        const isDesignReq = it.artwork_required === true
        const routing = isReady ? 'ready_product' : isDesignReq ? 'design_required' : 'design_ok'

        return {
          id: `inv-item-${Date.now()}-${idx + 1}`,
          invoice_id: invoiceId,
          product_id: it.product_id || null,
          item_kind: it.item_kind || (isReady ? 'ready_product' : 'custom_manufacturing'),
          category_preset: (it as any).category_preset || null,
          offset_specs: (it as any).offset_specs || null,
          signage_specs: (it as any).signage_specs || null,
          item_description: it.description,
          description: it.description,
          dimensions_spec: it.width > 0 && it.height > 0 ? `${it.width} × ${it.height} ${it.dimension_unit || 'ft'}` : (it.dimensions_spec || null),
          width: it.width,
          height: it.height,
          dimension_unit: it.dimension_unit,
          area_sft: it.area_sft,
          quantity: it.quantity,
          unit: it.unit,
          unit_price: it.unit_rate, // PRESERVED QUOTED RATE
          unit_rate: it.unit_rate,
          vat_percentage: quote.vat_rate || 0,
          total_price: it.item_total,
          item_total: it.item_total,
          material: it.material_spec || null,
          material_spec: it.material_spec || null,
          finishing: it.finishing || (it.selected_finishing?.map((f: any) => f.name).join(', ')) || null,
          selected_finishing: it.selected_finishing || null,
          selected_add_ons: it.selected_add_ons || null,
          selected_installation: it.selected_installation || null,
          workflow_routing: routing,
          design_required: isDesignReq,
        }
      }),
    }

    // Persist to DataStore
    PrintERPDataStore.addItem<InvoiceRecord>(STORAGE_KEYS.INVOICES, invoice)

    // Update Quotation Status to Converted
    await this.updateQuotation(quote.id, {
      status: 'converted',
      converted_invoice_id: invoice.id,
    }, effectiveCompanyId)

    // Log Activity
    const activity: QuotationActivityRecord = {
      id: `qa-${Date.now()}`,
      quotation_id: quote.id,
      action: 'converted',
      details: `Converted to Invoice #${invoice.invoice_number} (Total: ৳${quote.grand_total})`,
      actor_name: options?.createdByName || 'Commercial Executive',
      created_at: new Date().toISOString(),
    }
    await this.addActivity(activity)

    return invoice
  }

  /**
   * Converts a quotation to a formal Job Order, strictly preserving all item specs & quoted prices
   */
  static async convertQuotationToJobOrder(
    quotationId: string,
    companyId: string,
    options?: {
      createdByName?: string
      advanceAmount?: number
    }
  ): Promise<any> {
    const quote = await this.getQuotationById(quotationId, companyId)
    if (!quote) {
      throw new Error(`Quotation ${quotationId} not found in company context.`)
    }

    const effectiveCompanyId = (companyId && companyId !== 'c-01' ? companyId : quote.company_id) || companyId || 'c-01'

    if (quote.status === 'converted' && quote.converted_order_id) {
      throw new Error(`Quotation #${quote.quotation_number} has already been converted to a Job Order.`)
    }

    const orderNumber = PrintERPDataStore.getNextDocumentNumber(effectiveCompanyId, 'order')
    const orderId = `ord-${Date.now()}`

    const advance = options?.advanceAmount !== undefined
      ? Math.max(0, Number(options.advanceAmount) || 0)
      : (quote.advance_amount !== undefined && quote.advance_amount !== null
          ? quote.advance_amount
          : Math.round((quote.grand_total * (quote.advance_percentage || 50)) / 100))
    const dueAmount = Math.max(0, quote.grand_total - advance)

    const salesOrder = {
      id: orderId,
      company_id: effectiveCompanyId,
      order_number: orderNumber,
      quotation_id: quote.id,
      quotation_number: quote.quotation_number,
      customer_id: quote.customer_id || '00000000-0000-0000-0000-000000000000',
      customer_name: quote.customer_name,
      customer_phone: quote.customer_phone,
      customer_address: quote.customer_address || '',
      order_date: new Date().toISOString().split('T')[0],
      delivery_date: quote.delivery_date || new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      status: 'confirmed',
      priority: 'normal',
      payment_terms: advance > 0 ? 'advance' : 'cash',
      subtotal: quote.subtotal,
      discount_amount: quote.discount_amount,
      vat_amount: quote.vat_amount,
      final_price: quote.grand_total,
      advance_amount: advance,
      due_amount: dueAmount,
      notes: `Converted from Quotation #${quote.quotation_number}.${quote.notes ? ` Notes: ${quote.notes}` : ''}`,
      salesperson_name: options?.createdByName || quote.salesperson_name || 'Sales Staff',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: (quote.items || []).map((it, idx) => {
        const isReady = it.item_kind === 'ready_product'
        const isDesignReq = it.artwork_required === true
        const routing = isReady ? 'ready_product' : isDesignReq ? 'design_required' : 'design_ok'

        return {
          id: `item-${Date.now()}-${idx + 1}`,
          order_id: orderId,
          product_id: it.product_id || null,
          item_kind: it.item_kind || (isReady ? 'ready_product' : 'custom_manufacturing'),
          category_preset: (it as any).category_preset || null,
          offset_specs: (it as any).offset_specs || null,
          signage_specs: (it as any).signage_specs || null,
          item_name: it.description,
          dimensions_spec: it.width > 0 && it.height > 0 ? `${it.width} × ${it.height} ${it.dimension_unit}` : (it.dimensions_spec || null),
          width: it.width || 0,
          height: it.height || 0,
          dimension_unit: it.dimension_unit || 'ft',
          area_sft: it.area_sft || 0,
          quantity: it.quantity,
          unit: it.unit,
          unit_price: it.unit_rate, // PRESERVED QUOTED RATE
          total_price: it.item_total,
          media_type: it.material_spec || null,
          finishing: it.finishing || (it.selected_finishing?.map((f: any) => f.name).join(', ')) || null,
          selected_finishing: it.selected_finishing || null,
          selected_add_ons: it.selected_add_ons || null,
          selected_installation: it.selected_installation || null,
          installation_required: it.installation_required || false,
          workflow_routing: routing,
          design_required: isDesignReq,
        }
      }),
    }

    // Persist to Supabase if configured and valid UUID company context
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    try {
      const supabase = await createClient()
      if (uuidRegex.test(effectiveCompanyId)) {
        const isCustUuid = quote.customer_id && uuidRegex.test(quote.customer_id)
        const isQuoteUuid = quote.id && uuidRegex.test(quote.id)

        const { data: dbOrder, error: orderErr } = await (supabase as any)
          .from('sales_orders')
          .insert({
            company_id: effectiveCompanyId,
            order_number: orderNumber,
            quotation_id: isQuoteUuid ? quote.id : null,
            customer_id: isCustUuid ? quote.customer_id : null,
            customer_name: quote.customer_name,
            customer_phone: quote.customer_phone,
            customer_address: quote.customer_address || null,
            salesperson_name: salesOrder.salesperson_name,
            order_date: salesOrder.order_date,
            delivery_date: salesOrder.delivery_date,
            priority: salesOrder.priority,
            status: salesOrder.status,
            payment_terms: salesOrder.payment_terms,
            subtotal: salesOrder.subtotal,
            discount_amount: salesOrder.discount_amount,
            vat_amount: salesOrder.vat_amount,
            final_price: salesOrder.final_price,
            advance_amount: salesOrder.advance_amount,
            due_amount: salesOrder.due_amount,
            notes: salesOrder.notes,
          })
          .select()
          .single()

        if (!orderErr && dbOrder) {
          salesOrder.id = dbOrder.id

          if (salesOrder.items && salesOrder.items.length > 0) {
            const itemsPayload = salesOrder.items.map((it: any) => ({
              order_id: dbOrder.id,
              product_id: it.product_id && uuidRegex.test(it.product_id) ? it.product_id : null,
              item_name: it.item_name,
              material_spec: it.media_type || it.material_spec || null,
              width: it.width || 1,
              height: it.height || 1,
              dimension_unit: it.dimension_unit || 'ft',
              quantity: it.quantity || 1,
              unit: it.unit || 'sft',
              unit_price: it.unit_price || 0,
              total_price: it.total_price || 0,
            }))
            await (supabase as any).from('sales_order_items').insert(itemsPayload)
          }

          // Insert job order in Supabase
          const jobNum = `JOB-${orderNumber.replace('ORD-', '')}-A`
          await (supabase as any).from('job_orders').insert({
            company_id: effectiveCompanyId,
            job_number: jobNum,
            order_id: dbOrder.id,
            product_name: salesOrder.items[0]?.item_name || 'Print Order Job',
            customer_name: salesOrder.customer_name,
            quantity: salesOrder.items[0]?.quantity || 1,
            size_spec: salesOrder.items[0]?.dimensions_spec || 'Standard',
            material_spec: salesOrder.items[0]?.media_type || 'Standard Media',
            artwork_status: 'approved',
            deadline: `${salesOrder.delivery_date}T18:00:00Z`,
            assigned_department: 'wide_format_print',
            production_instructions: salesOrder.notes || '',
            status: 'queued',
          })

          // Insert order timeline event
          await (supabase as any).from('order_timeline_events').insert({
            company_id: effectiveCompanyId,
            order_id: dbOrder.id,
            stage: 'sales_order',
            title: 'Order Created from Quotation',
            description: `Converted from Quotation #${quote.quotation_number} to Order #${orderNumber}`,
            actor_name: salesOrder.salesperson_name,
            created_at: new Date().toISOString(),
          })
        }
      }
    } catch (dbErr) {
      console.warn('[QuotationRepository] Supabase order insertion fallback to local:', dbErr)
    }

    // Persist to DataStore with all integrated downstream records (job order, prod tasks, mat reqs, costing)
    const integratedOrder = PrintERPDataStore.createSalesOrderWithIntegrations(salesOrder as any)

    // Update Quotation Status to Converted
    await this.updateQuotation(quote.id, {
      status: 'converted',
      converted_order_id: salesOrder.order_number,
    }, effectiveCompanyId)

    // Log Activity
    const activity: QuotationActivityRecord = {
      id: `qa-${Date.now()}`,
      quotation_id: quote.id,
      action: 'converted',
      details: `Converted to Job Order #${salesOrder.order_number} (Total: ৳${quote.grand_total}, Advance: ৳${advance})`,
      actor_name: options?.createdByName || 'Sales Staff',
      created_at: new Date().toISOString(),
    }
    await this.addActivity(activity)

    const allJobs = PrintERPDataStore.get<any[]>(STORAGE_KEYS.JOB_ORDERS) || []
    const matchingJob = allJobs.find((j: any) => j.order_id === salesOrder.id || j.order_id === orderId)
    const allProd = PrintERPDataStore.get<any[]>(STORAGE_KEYS.PRODUCTION_JOBS) || []
    const matchingProd = allProd.find((p: any) => p.sales_order_id === salesOrder.id || p.sales_order_id === orderId)
    const allInvs = PrintERPDataStore.get<any[]>(STORAGE_KEYS.INVOICES) || []
    const matchingInv = allInvs.find((i: any) => i.sales_order_id === salesOrder.id || i.sales_order_id === orderId)

    return {
      ...salesOrder,
      ...integratedOrder,
      job_order: matchingJob,
      production_job: matchingProd,
      invoice: matchingInv,
    }
  }

  /**
   * Records a quotation follow-up event with schedule and outcome
   */
  static async recordFollowUp(
    quotationId: string,
    companyId: string,
    data: {
      method: 'whatsapp' | 'phone' | 'email' | 'in_person' | 'other'
      note: string
      outcome?: string
      nextFollowUpDate?: string | null
      markResponded?: boolean
    },
    actorName: string = 'Sales Representative'
  ): Promise<QuotationRecord | null> {
    const quote = await this.getQuotationById(quotationId, companyId)
    if (!quote) return null

    const updates: Partial<QuotationRecord> = {
      last_follow_up_method: data.method,
      last_follow_up_at: new Date().toISOString(),
      last_follow_up_note: data.note,
      follow_up_date: data.nextFollowUpDate || null,
      follow_up_count: (quote.follow_up_count || 0) + 1,
      follow_up_status: data.nextFollowUpDate ? 'pending' : 'completed',
    }

    if (data.markResponded && quote.status === 'sent') {
      updates.status = 'viewed'
    }
    if (data.outcome === 'negotiating') {
      updates.status = 'negotiation'
    } else if (data.outcome === 'approved') {
      updates.status = 'approved'
    }

    await this.updateQuotation(quote.id, updates, companyId)

    const methodLabels: Record<string, string> = {
      whatsapp: 'WhatsApp',
      phone: 'Phone Call',
      email: 'Email',
      in_person: 'In-person Meeting',
      other: 'Direct Contact',
    }

    const activity: QuotationActivityRecord = {
      id: `qa-${Date.now()}`,
      quotation_id: quote.id,
      action: 'follow_up',
      details: `Follow-up via ${methodLabels[data.method] || data.method}: "${data.note}"${
        data.nextFollowUpDate ? ` (Next scheduled: ${data.nextFollowUpDate})` : ''
      }${data.outcome ? ` [Outcome: ${data.outcome}]` : ''}`,
      actor_name: actorName,
      created_at: new Date().toISOString(),
    }
    await this.addActivity(activity)

    return this.getQuotationById(quotationId, companyId)
  }

  /**
   * Applies negotiated concession discount and recalculates margin with internal shielding
   */
  static async applyNegotiation(
    quotationId: string,
    companyId: string,
    discountAmount: number,
    notes?: string,
    actorName: string = 'Sales Executive'
  ): Promise<QuotationRecord | null> {
    const quote = await this.getQuotationById(quotationId, companyId)
    if (!quote) return null

    if (quote.status === 'converted') {
      throw new Error(`Cannot negotiate price for an already converted quotation (#${quote.quotation_number}).`)
    }

    const safeDiscount = Math.max(0, Math.min(quote.subtotal, Number(discountAmount) || 0))
    const subtotalAfterDisc = Math.max(0, quote.subtotal - safeDiscount)
    const newVat = Math.round((subtotalAfterDisc * quote.vat_rate) / 100)
    const newGrandTotal = subtotalAfterDisc + newVat
    const totalCost = quote.total_cost || Math.round(quote.subtotal * 0.55)
    const newMargin = newGrandTotal > 0 ? Math.round(((newGrandTotal - totalCost) / newGrandTotal) * 100) : 35

    const updates: Partial<QuotationRecord> = {
      discount_amount: safeDiscount,
      vat_amount: newVat,
      grand_total: newGrandTotal,
      margin_percent: newMargin,
      status: 'negotiation',
    }

    await this.updateQuotation(quote.id, updates, companyId)

    const activity: QuotationActivityRecord = {
      id: `qa-${Date.now()}`,
      quotation_id: quote.id,
      action: 'negotiated',
      details: `Applied negotiated concession discount of ৳${safeDiscount}. New Grand Total: ৳${newGrandTotal} (Projected Margin: ${newMargin}%). ${
        notes ? `Remarks: ${notes}` : ''
      }`,
      actor_name: actorName,
      created_at: new Date().toISOString(),
    }
    await this.addActivity(activity)

    return this.getQuotationById(quotationId, companyId)
  }

  /**
   * Updates quotation status safely with activity log and state machine validation
   */
  static async updateStatus(
    quotationId: string,
    newStatus: QuotationStatus,
    reason?: string,
    companyId: string = 'c-01',
    actorName: string = 'System'
  ): Promise<QuotationRecord | null> {
    const quote = await this.getQuotationById(quotationId, companyId)
    if (!quote) return null

    if (quote.status === 'converted' && newStatus !== 'converted') {
      throw new Error(`Cannot change status of a converted quotation (#${quote.quotation_number}).`)
    }

    const validTransitions: Record<QuotationStatus, QuotationStatus[]> = {
      draft: ['sent', 'negotiation', 'approved', 'rejected', 'expired'],
      sent: ['viewed', 'negotiation', 'approved', 'rejected', 'expired'],
      viewed: ['negotiation', 'approved', 'rejected', 'expired'],
      negotiation: ['approved', 'rejected', 'expired', 'sent'],
      approved: ['converted', 'negotiation', 'rejected'],
      rejected: ['draft', 'negotiation'],
      expired: ['draft', 'negotiation'],
      converted: [],
    }

    if (quote.status !== newStatus && !validTransitions[quote.status]?.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${quote.status.toUpperCase()} to ${newStatus.toUpperCase()}.`)
    }

    await this.updateQuotation(quote.id, { status: newStatus }, companyId)

    const activity: QuotationActivityRecord = {
      id: `qa-${Date.now()}`,
      quotation_id: quote.id,
      action: 'status_change',
      details: `Status changed from ${quote.status.toUpperCase()} to ${newStatus.toUpperCase()}${
        reason ? ` (Reason: ${reason})` : ''
      }`,
      actor_name: actorName,
      created_at: new Date().toISOString(),
    }
    await this.addActivity(activity)

    return this.getQuotationById(quotationId, companyId)
  }

  /**
   * Adds an activity record to a quotation
   */
  static async addActivity(activity: QuotationActivityRecord): Promise<void> {
    try {
      const supabase = await createClient()
      await (supabase as any).from('quotation_activities').insert(activity)
    } catch {
      // Fallback to DataStore
    }
    PrintERPDataStore.addItem<QuotationActivityRecord>(STORAGE_KEYS.QUOTATION_ACTIVITIES, activity)
  }

  /**
   * Retrieves activity timeline for a quotation
   */
  static async getActivities(quotationId: string, companyId: string): Promise<QuotationActivityRecord[]> {
    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('quotation_activities')
        .select('*')
        .eq('quotation_id', quotationId)
        .order('created_at', { ascending: false })

      if (!error && data && data.length > 0) {
        return data as QuotationActivityRecord[]
      }
    } catch {
      // Fallback to DataStore
    }

    const activities = PrintERPDataStore.get<QuotationActivityRecord[]>(STORAGE_KEYS.QUOTATION_ACTIVITIES) || []
    return activities.filter((a) => a.quotation_id === quotationId)
  }

  /**
   * Deletes a quotation and its items/activities from DataStore and Supabase
   */
  static async deleteQuotation(id: string, companyId: string = 'c-01', quotationNumber?: string): Promise<boolean> {
    // 1. Remove from DataStore
    PrintERPDataStore.removeItem(STORAGE_KEYS.QUOTATIONS, id)
    if (companyId) {
      PrintERPDataStore.removeItem(STORAGE_KEYS.QUOTATIONS, id, companyId)
    }

    const list = PrintERPDataStore.get<any[]>(STORAGE_KEYS.QUOTATIONS) || []
    PrintERPDataStore.set(
      STORAGE_KEYS.QUOTATIONS,
      list.filter((q) => q.id !== id && (!quotationNumber || q.quotation_number !== quotationNumber))
    )

    if (companyId) {
      const compList = PrintERPDataStore.get<any[]>(STORAGE_KEYS.QUOTATIONS, companyId) || []
      PrintERPDataStore.set(
        STORAGE_KEYS.QUOTATIONS,
        compList.filter((q) => q.id !== id && (!quotationNumber || q.quotation_number !== quotationNumber)),
        true,
        companyId
      )
    }

    // 2. Remove from Supabase
    try {
      const { createAdminClient } = await import('../supabase/admin.ts')
      const admin = createAdminClient()
      if (id && !String(id).startsWith('temp-')) {
        await (admin as any).from('quotation_items').delete().eq('quotation_id', id)
        await (admin as any).from('quotation_activities').delete().eq('quotation_id', id)
        await (admin as any).from('quotations').delete().eq('id', id)
      }
      if (quotationNumber) {
        await (admin as any).from('quotations').delete().eq('quotation_number', quotationNumber)
      }
    } catch (dbErr) {
      console.warn('[QuotationRepository.deleteQuotation] Supabase deletion error:', dbErr)
    }

    try {
      const supabase = await createClient()
      if (id && !String(id).startsWith('temp-')) {
        await (supabase as any).from('quotations').delete().eq('id', id)
      }
      if (quotationNumber) {
        await (supabase as any).from('quotations').delete().eq('quotation_number', quotationNumber)
      }
    } catch {}

    return true
  }
}
