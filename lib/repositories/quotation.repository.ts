import { createClient } from '../supabase/server.ts'
import { createAdminClient } from '../supabase/admin.ts'
import type {
  QuotationRecord,
  QuotationItemRecord,
  QuotationActivityRecord,
  QuotationStatus,
  CreateQuotationItemInput,
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
      const nextVal = (seq?.current_val ? Number(seq.current_val) : 0) + 1

      await (admin as any).from('document_sequences').upsert({
        company_id: companyId,
        doc_type: 'quotation',
        prefix,
        current_val: nextVal,
        padding: 6,
        updated_at: new Date().toISOString(),
      })

      return `${prefix}-${String(nextVal).padStart(6, '0')}`
    } catch {
      // Fallback to DataStore atomic number
      return PrintERPDataStore.getNextDocumentNumber(companyId, 'quotation')
    }
  }

  /**
   * Retrieves all quotations for a tenant
   */
  static async getQuotations(companyId: string): Promise<QuotationRecord[]> {
    return measureAsync(`QuotationRepository.getQuotations(${companyId})`, async () => {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('quotations')
        .select('*, items:quotation_items(*)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (error) {
        // Safe fallback to client/mock datastore
        const quotes = PrintERPDataStore.get<QuotationRecord[]>(STORAGE_KEYS.QUOTATIONS) || []
        return quotes.filter((q) => !q.company_id || q.company_id === companyId)
      }

      const list = (data || []) as unknown as QuotationRecord[]
      if (list.length === 0) {
        const quotes = PrintERPDataStore.get<QuotationRecord[]>(STORAGE_KEYS.QUOTATIONS) || []
        return quotes.filter((q) => !q.company_id || q.company_id === companyId)
      }

      return list
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

      const supabase = await createClient()
      let query = (supabase as any)
        .from('quotations')
        .select('*, items:quotation_items(*)', { count: 'exact' })
        .eq('company_id', companyId)

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

      if (error) {
        const all = await this.getQuotations(companyId)
        const filtered = all.filter((q) => {
          const matchSearch =
            !options.search ||
            q.quotation_number.toLowerCase().includes(options.search.toLowerCase()) ||
            q.customer_name.toLowerCase().includes(options.search.toLowerCase()) ||
            q.customer_phone.includes(options.search)
          const matchStatus = !options.status || options.status === 'all' || q.status === options.status
          return matchSearch && matchStatus
        })
        return buildPaginatedResponse(
          filtered.slice(offset, offset + pageSize),
          filtered.length,
          page,
          pageSize
        )
      }

      return buildPaginatedResponse(
        (data || []) as unknown as QuotationRecord[],
        count || 0,
        page,
        pageSize
      )
    })
  }

  /**
   * Retrieves a single quotation with items and activity timeline
   */
  static async getQuotationById(id: string, companyId: string): Promise<QuotationRecord | null> {
    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('quotations')
        .select('*, items:quotation_items(*)')
        .or(`id.eq.${id},quotation_number.eq.${id}`)
        .eq('company_id', companyId)
        .maybeSingle()

      if (!error && data) {
        return data as unknown as QuotationRecord
      }
    } catch {}

    const quotes = PrintERPDataStore.get<QuotationRecord[]>(STORAGE_KEYS.QUOTATIONS) || []
    return quotes.find((q) => (q.id === id || q.quotation_number === id) && (!q.company_id || q.company_id === companyId)) || null
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
      const rate = Math.max(0, Number(it.unit_rate) || 0)
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
        description: it.description || 'Print Item',
        description_bn: it.description_bn || null,
        material_spec: it.material_spec || null,
        width: w,
        height: h,
        dimension_unit: dimUnit,
        area_sft: areaSft,
        quantity: qty,
        unit: it.unit || (areaSft > 0 ? 'sft' : 'pcs'),
        unit_rate: rate,
        rate_source: it.rate_source || 'default',
        finishing: it.finishing || null,
        color_spec: it.color_spec || null,
        artwork_required: it.artwork_required || false,
        installation_required: it.installation_required || false,
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
        customer_phone: quoteRecord.customer_phone,
        customer_email: quoteRecord.customer_email,
        customer_address: quoteRecord.customer_address,
        customer_bin: quoteRecord.customer_bin,
        status: quoteRecord.status,
        quotation_date: quoteRecord.quotation_date,
        valid_until: quoteRecord.valid_until,
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
        notes: quoteRecord.notes,
        terms_and_conditions: quoteRecord.terms_and_conditions,
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
    const supabase = await createClient()
    const payload: any = { ...updates, updated_at: new Date().toISOString() }
    delete payload.id
    delete payload.company_id
    delete payload.items

    try {
      await (supabase as any)
        .from('quotations')
        .update(payload)
        .eq('id', id)
        .eq('company_id', companyId)
    } catch {
      // fallback
    }

    return PrintERPDataStore.updateItem<QuotationRecord>(STORAGE_KEYS.QUOTATIONS, id, updates)
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
    }
  ): Promise<InvoiceRecord> {
    const quote = await this.getQuotationById(quotationId, companyId)
    if (!quote) {
      throw new Error(`Quotation ${quotationId} not found in company context.`)
    }

    const dueDate = options?.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

    const invNumber = PrintERPDataStore.getNextDocumentNumber(companyId, 'invoice')
    const invoiceId = `inv-${Date.now()}`

    const invoice: InvoiceRecord = {
      id: invoiceId,
      company_id: companyId,
      invoice_number: invNumber,
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
      paid_amount: 0,
      due_amount: quote.grand_total,
      write_off_amount: 0,
      status: 'unpaid',
      notes: `Converted from Quotation ${quote.quotation_number}.${quote.notes ? ` Notes: ${quote.notes}` : ''}`,
      created_by_name: options?.createdByName || quote.salesperson_name || 'Commercial Executive',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: (quote.items || []).map((it, idx) => ({
        id: `inv-item-${Date.now()}-${idx + 1}`,
        invoice_id: invoiceId,
        product_id: it.product_id || null,
        item_description: it.description,
        dimensions_spec: it.width > 0 && it.height > 0 ? `${it.width} × ${it.height} ${it.dimension_unit}` : null,
        quantity: it.quantity,
        unit: it.unit,
        unit_price: it.unit_rate, // PRESERVED QUOTED RATE
        vat_percentage: 0,
        total_price: it.item_total,
      })),
    }

    // Persist to DataStore
    PrintERPDataStore.addItem<InvoiceRecord>(STORAGE_KEYS.INVOICES, invoice)

    // Update Quotation Status to Converted
    await this.updateQuotation(quote.id, {
      status: 'converted',
      converted_invoice_id: invoice.id,
    }, companyId)

    // Log Activity
    const activity: QuotationActivityRecord = {
      id: `qa-${Date.now()}`,
      quotation_id: quote.id,
      action: 'converted',
      details: `Converted to Invoice #${invoice.invoice_number}`,
      actor_name: options?.createdByName || 'Sales Staff',
      created_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem<QuotationActivityRecord>(STORAGE_KEYS.QUOTATION_ACTIVITIES, activity)

    return invoice
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
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('quotation_activities')
      .select('*')
      .eq('quotation_id', quotationId)
      .order('created_at', { ascending: false })

    if (error || !data || data.length === 0) {
      const activities = PrintERPDataStore.get<QuotationActivityRecord[]>(STORAGE_KEYS.QUOTATION_ACTIVITIES) || []
      return activities.filter((a) => a.quotation_id === quotationId)
    }

    return data as QuotationActivityRecord[]
  }
}
