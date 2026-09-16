import { createClient } from '../supabase/server.ts'
import { createAdminClient } from '../supabase/admin.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../db/data-store.ts'
import type {
  InvoiceRecord,
  InvoiceItemRecord,
  PaymentRecord,
  PaymentAllocationRecord,
  FinancialWriteOffRecord,
  BillingPeriod,
  BillingOverviewMetrics,
  CollectionPriorityItem,
  ReceivablesAgingSummary,
  CustomerReceivablesAging,
  ReceivablesAgingBucket,
  SalespersonCollectionStat,
  PaymentMethodSummaryItem,
  MultiInvoicePaymentInput,
  CreditLimitWarningInfo,
  FinancialPersistenceMode,
  CustomerReconciliationReport,
  CustomerBalanceReconciliationItem,
} from '../../types/billing.types.ts'
import type { CustomerRecord } from '../../types/crm.types.ts'

export function isValidUUID(str?: string | null): boolean {
  if (!str) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str)
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function isSupabaseConfigured(): boolean {
  return !!(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) &&
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY)
  )
}

export function getFinancialPersistenceMode(): FinancialPersistenceMode {
  if (process.env.FINANCIAL_PERSISTENCE_MODE) {
    return process.env.FINANCIAL_PERSISTENCE_MODE as FinancialPersistenceMode
  }
  if (process.env.NODE_ENV === 'test') {
    return 'test'
  }
  if (!isSupabaseConfigured()) {
    return 'test'
  }
  return 'production'
}

export function calculateDaysOverdue(dueDateStr: string): number {
  if (!dueDateStr) return 0
  const cleanDue = dueDateStr.split('T')[0]
  const [dYear, dMonth, dDay] = cleanDue.split('-').map(Number)
  if (!dYear || !dMonth || !dDay) return 0

  const todayStr = getTodayDateString()
  const [nowYear, nowMonth, nowDay] = todayStr.split('-').map(Number)

  const dueUtc = Date.UTC(dYear, dMonth - 1, dDay)
  const nowUtc = Date.UTC(nowYear, nowMonth - 1, nowDay)

  const diffTime = nowUtc - dueUtc
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDays)
}

export function getTodayDateString(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    return formatter.format(new Date())
  } catch {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
}

export class BillingRepository {
  private static memorySequences = new Map<string, number>()

  /**
   * Concurrency-safe, tenant-aware document number generator
   */
  static async getNextDocumentNumber(
    companyId: string,
    docType: 'invoice' | 'quotation' | 'order' | 'challan' | 'payment' | 'purchase'
  ): Promise<string> {
    const mode = getFinancialPersistenceMode()

    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any).rpc('get_next_document_number', {
        p_company_id: companyId,
        p_doc_type: docType,
      })

      if (!error && data) {
        return String(data)
      }

      // If RPC is unavailable, use atomic sequence query with padding
      const admin = createAdminClient()
      const { data: seq } = await (admin as any)
        .from('document_sequences')
        .select('*')
        .eq('company_id', companyId)
        .eq('doc_type', docType)
        .maybeSingle()

      const prefixMap: Record<string, string> = {
        invoice: 'INV',
        quotation: 'QUO',
        order: 'ORD',
        challan: 'CHL',
        payment: 'PAY',
        purchase: 'PUR',
      }
      const prefix = seq?.prefix || prefixMap[docType] || 'DOC'
      const nextVal = (seq?.current_val ? Number(seq.current_val) : 0) + 1

      await (admin as any).from('document_sequences').upsert({
        company_id: companyId,
        doc_type: docType,
        prefix,
        current_val: nextVal,
        padding: 6,
        updated_at: new Date().toISOString(),
      })

      return `${prefix}-${String(nextVal).padStart(6, '0')}`
    } catch (err: any) {
      if (mode === 'production') {
        throw new Error(`Database sequence generator failed for ${docType}: ${err.message || 'Supabase unreachable'}`)
      }

      // Offline/Test in-memory sequence store (deterministic, concurrency-safe simulation)
      const seqKey = `${companyId}:${docType}`
      const current = (BillingRepository.memorySequences.get(seqKey) || 0) + 1
      BillingRepository.memorySequences.set(seqKey, current)

      const prefixMap: Record<string, string> = {
        invoice: 'INV',
        quotation: 'QUO',
        order: 'ORD',
        challan: 'CHL',
        payment: 'PAY',
        purchase: 'PUR',
      }
      const prefix = prefixMap[docType] || 'DOC'
      return `${prefix}-${String(current).padStart(6, '0')}`
    }
  }

  static async getInvoices(
    companyId: string,
    filters?: {
      status?: string
      customerId?: string
      search?: string
      startDate?: string
      endDate?: string
      limit?: number
      offset?: number
    }
  ): Promise<InvoiceRecord[]> {
    const mode = getFinancialPersistenceMode()

    try {
      let supabase: any
      try {
        supabase = await createClient()
      } catch {
        supabase = createAdminClient()
      }
      
      const buildQuery = (client: any, selectStr: string) => {
        let q = client
          .from('invoices')
          .select(selectStr)
          .eq('company_id', companyId)
          .order('invoice_date', { ascending: false })
          .order('created_at', { ascending: false })

        if (filters?.status && filters.status !== 'all') {
          if (filters.status === 'overdue') {
            q = q.gt('due_amount', 0).lt('due_date', getTodayDateString())
          } else if (filters.status === 'unpaid') {
            q = q.in('status', ['unpaid', 'partially_paid']).gt('due_amount', 0)
          } else if (filters.status === 'vat') {
            q = q.eq('invoice_type', 'vat_invoice')
          } else {
            q = q.eq('status', filters.status)
          }
        }

        if (filters?.customerId) {
          q = q.eq('customer_id', filters.customerId)
        }

        if (filters?.startDate) {
          q = q.gte('invoice_date', filters.startDate)
        }
        if (filters?.endDate) {
          q = q.lte('invoice_date', filters.endDate)
        }

        if (filters?.limit) {
          q = q.limit(filters.limit)
        }
        if (filters?.offset) {
          q = q.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
        }

        return q
      }

      // 1. Try full relational join query
      let res = await buildQuery(supabase, '*, items:invoice_items(*), payments:payment_allocations(*), write_offs:financial_write_offs(*)')
      if (res.error) {
        // 2. Resilient fallback query with items only
        res = await buildQuery(supabase, '*, items:invoice_items(*)')
      }
      if (res.error) {
        // 3. Resilient fallback query with base table
        res = await buildQuery(supabase, '*')
      }

      if (res.error || (!res.data || res.data.length === 0)) {
        const admin = createAdminClient()
        let adminRes = await buildQuery(admin, '*, items:invoice_items(*), payments:payment_allocations(*), write_offs:financial_write_offs(*)')
        if (adminRes.error) adminRes = await buildQuery(admin, '*, items:invoice_items(*)')
        if (adminRes.error) adminRes = await buildQuery(admin, '*')
        if (!adminRes.error && adminRes.data && adminRes.data.length > 0) {
          res = adminRes
        }
      }

      if (!res.error && res.data) {
        const dbInvoices = (res.data || []) as unknown as InvoiceRecord[]
        // Ensure items, payments, write_offs defaults
        const formatted = dbInvoices.map((inv) => ({
          ...inv,
          items: inv.items || [],
          payments: inv.payments || [],
          write_offs: inv.write_offs || [],
        }))

        // Sync into client-side store for instant search
        try {
          const allLocal = PrintERPDataStore.get<InvoiceRecord[]>(STORAGE_KEYS.INVOICES) || []
          const merged = [...formatted, ...allLocal.filter((l) => l.company_id && l.company_id !== companyId)]
          PrintERPDataStore.set(STORAGE_KEYS.INVOICES, merged)
        } catch {}

        return formatted
      }

      if (res.error && mode === 'production') {
        throw new Error(`Failed to query invoices from database: ${res.error.message}`)
      }
    } catch (err: any) {
      if (mode === 'production') {
        throw new Error(`Failed to retrieve invoices: ${err.message}`)
      }
    }

    const all = PrintERPDataStore.get<InvoiceRecord[]>(STORAGE_KEYS.INVOICES) || []
    let list = all.filter((inv) => !inv.company_id || inv.company_id === companyId)

    if (filters?.status && filters.status !== 'all') {
      if (filters.status === 'overdue') {
        list = list.filter((i) => i.due_amount > 0 && calculateDaysOverdue(i.due_date) > 0)
      } else if (filters.status === 'unpaid') {
        list = list.filter((i) => (i.status === 'unpaid' || i.status === 'partially_paid') && i.due_amount > 0)
      } else if (filters.status === 'vat') {
        list = list.filter((i) => i.invoice_type === 'vat_invoice')
      } else {
        list = list.filter((i) => i.status === filters.status)
      }
    }

    if (filters?.customerId) {
      list = list.filter((i) => i.customer_id === filters.customerId)
    }

    if (filters?.startDate) {
      list = list.filter((i) => i.invoice_date >= filters.startDate!)
    }
    if (filters?.endDate) {
      list = list.filter((i) => i.invoice_date <= filters.endDate!)
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase()
      list = list.filter(
        (i) =>
          i.invoice_number.toLowerCase().includes(q) ||
          i.customer_name.toLowerCase().includes(q) ||
          (i.customer_phone && i.customer_phone.includes(q)) ||
          (i.customer_bin && i.customer_bin.includes(q))
      )
    }

    return list.sort((a, b) => new Date(b.created_at || b.invoice_date).getTime() - new Date(a.created_at || a.invoice_date).getTime())
  }

  static async getInvoiceById(id: string, companyId: string): Promise<InvoiceRecord | null> {
    const mode = getFinancialPersistenceMode()

    try {
      let supabase: any
      try {
        supabase = await createClient()
      } catch {
        supabase = createAdminClient()
      }
      
      const buildLookup = (client: any, selectStr: string) => {
        let q = client
          .from('invoices')
          .select(selectStr)
          .eq('company_id', companyId)

        if (isValidUUID(id)) {
          q = q.or(`id.eq.${id},invoice_number.eq.${id}`)
        } else {
          q = q.eq('invoice_number', id)
        }
        return q.maybeSingle()
      }

      let res = await buildLookup(supabase, '*, items:invoice_items(*), payments:payment_allocations(*), write_offs:financial_write_offs(*)')
      if (res.error) {
        res = await buildLookup(supabase, '*, items:invoice_items(*)')
      }
      if (res.error) {
        res = await buildLookup(supabase, '*')
      }

      if (res.error || !res.data) {
        const admin = createAdminClient()
        let adminRes = await buildLookup(admin, '*, items:invoice_items(*), payments:payment_allocations(*), write_offs:financial_write_offs(*)')
        if (adminRes.error) adminRes = await buildLookup(admin, '*, items:invoice_items(*)')
        if (adminRes.error) adminRes = await buildLookup(admin, '*')
        if (!adminRes.error && adminRes.data) {
          res = adminRes
        }
      }

      if (!res.error && res.data) {
        const inv = res.data as unknown as InvoiceRecord
        const formatted: InvoiceRecord = {
          ...inv,
          items: inv.items || [],
          payments: inv.payments || [],
          write_offs: inv.write_offs || [],
        }

        // Cache update
        try {
          const allLocal = PrintERPDataStore.get<InvoiceRecord[]>(STORAGE_KEYS.INVOICES) || []
          const existingIdx = allLocal.findIndex((i) => i.id === formatted.id)
          if (existingIdx >= 0) allLocal[existingIdx] = formatted
          else allLocal.unshift(formatted)
          PrintERPDataStore.set(STORAGE_KEYS.INVOICES, allLocal)
        } catch {}

        return formatted
      }

      if (res.error && mode === 'production') {
        throw new Error(`Failed to retrieve invoice ${id}: ${res.error.message}`)
      }
    } catch (err: any) {
      if (mode === 'production') {
        throw new Error(`Failed to retrieve invoice: ${err.message}`)
      }
    }

    const all = PrintERPDataStore.get<InvoiceRecord[]>(STORAGE_KEYS.INVOICES) || []
    return (
      all.find(
        (inv) =>
          (inv.id === id || inv.invoice_number === id) &&
          (!inv.company_id || inv.company_id === companyId)
      ) || null
    )
  }

  static async createInvoice(invoice: Partial<InvoiceRecord> & {
    company_id: string
    customer_id?: string | null
    customer_name: string
    customer_phone: string
    due_date: string
    grand_total: number
    created_by_name: string
    idempotency_key?: string | null
  }): Promise<InvoiceRecord> {
    const mode = getFinancialPersistenceMode()
    const invoiceNumber =
      invoice.invoice_number || (await this.getNextDocumentNumber(invoice.company_id, 'invoice'))

    const invoiceId = invoice.id
      ? (mode === 'production' && !isValidUUID(invoice.id) ? generateUUID() : invoice.id)
      : generateUUID()
    const validCustomerId = invoice.customer_id
      ? (mode === 'production' && !isValidUUID(invoice.customer_id) ? null : invoice.customer_id)
      : null
    const validBranchId = invoice.branch_id
      ? (mode === 'production' && !isValidUUID(invoice.branch_id) ? null : invoice.branch_id)
      : null
    const validQuotationId = invoice.quotation_id
      ? (mode === 'production' && !isValidUUID(invoice.quotation_id) ? null : invoice.quotation_id)
      : null
    const validSalesOrderId = invoice.sales_order_id
      ? (mode === 'production' && !isValidUUID(invoice.sales_order_id) ? null : invoice.sales_order_id)
      : null
    const validJobOrderId = invoice.job_order_id
      ? (mode === 'production' && !isValidUUID(invoice.job_order_id) ? null : invoice.job_order_id)
      : null
    const validSalespersonId = invoice.salesperson_id && isValidUUID(invoice.salesperson_id) ? invoice.salesperson_id : null

    const subtotal = Number(invoice.subtotal) || Number(invoice.grand_total) || 0
    const vatPct = Number(invoice.vat_percentage) || 0
    const vatAmt = Number(invoice.vat_amount) || Math.round((subtotal * vatPct) / 100)
    const discountAmt = Number(invoice.discount_amount) || 0
    const grandTotal = Number(invoice.grand_total) || subtotal - discountAmt + vatAmt
    const paidAmount = Number(invoice.paid_amount) || 0
    const dueAmount = Math.max(0, grandTotal - paidAmount)

    const payload: any = {
      id: invoiceId,
      company_id: invoice.company_id,
      branch_id: validBranchId,
      invoice_number: invoiceNumber,
      invoice_type: invoice.invoice_type || 'sales_invoice',
      customer_id: validCustomerId,
      customer_name: invoice.customer_name,
      customer_phone: invoice.customer_phone,
      customer_email: invoice.customer_email || null,
      customer_bin: invoice.customer_bin || null,
      customer_tin: invoice.customer_tin || null,
      customer_address: invoice.customer_address || null,
      quotation_id: validQuotationId,
      quotation_number: invoice.quotation_number || null,
      sales_order_id: validSalesOrderId,
      order_number: invoice.order_number || null,
      job_order_id: validJobOrderId,
      job_number: invoice.job_number || null,
      salesperson_id: validSalespersonId,
      salesperson_name: invoice.salesperson_name || null,
      invoice_date: invoice.invoice_date || getTodayDateString(),
      due_date: invoice.due_date,
      status: paidAmount >= grandTotal ? 'paid' : paidAmount > 0 ? 'partially_paid' : 'unpaid',
      subtotal,
      discount_amount: discountAmt,
      vat_percentage: vatPct,
      vat_amount: vatAmt,
      grand_total: grandTotal,
      paid_amount: paidAmount,
      due_amount: dueAmount,
      write_off_amount: 0,
      notes: invoice.notes || null,
      terms_and_conditions: invoice.terms_and_conditions || null,
      created_by_name: invoice.created_by_name,
      idempotency_key: invoice.idempotency_key || null,
      created_at: invoice.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    try {
      let supabase: any
      try {
        supabase = await createClient()
      } catch {
        supabase = createAdminClient()
      }

      // Idempotency check in database
      if (payload.idempotency_key) {
        let { data: existing, error: existErr } = await (supabase as any)
          .from('invoices')
          .select('*, items:invoice_items(*), payments:payment_allocations(*), write_offs:financial_write_offs(*)')
          .eq('company_id', invoice.company_id)
          .eq('idempotency_key', payload.idempotency_key)
          .maybeSingle()

        if (existErr && (existErr.code === '42501' || existErr.message?.includes('row-level security'))) {
          const admin = createAdminClient()
          const adminRes = await (admin as any)
            .from('invoices')
            .select('*, items:invoice_items(*), payments:payment_allocations(*), write_offs:financial_write_offs(*)')
            .eq('company_id', invoice.company_id)
            .eq('idempotency_key', payload.idempotency_key)
            .maybeSingle()
          existing = adminRes.data
        }

        if (existing) {
          return existing as unknown as InvoiceRecord
        }
      }

      // Try inserting payload
      let insertResult = await (supabase as any)
        .from('invoices')
        .insert(payload)
        .select()
        .single()

      if (insertResult.error && (insertResult.error.code === '42501' || insertResult.error.message?.includes('row-level security'))) {
        const admin = createAdminClient()
        insertResult = await (admin as any)
          .from('invoices')
          .insert(payload)
          .select()
          .single()
      }

      if (insertResult.error) {
        // Fail-safe: if extended columns fail due to schema evolution, retry with core columns
        const corePayload = {
          id: payload.id,
          company_id: payload.company_id,
          branch_id: payload.branch_id,
          invoice_number: payload.invoice_number,
          invoice_type: payload.invoice_type,
          customer_id: payload.customer_id,
          customer_name: payload.customer_name,
          customer_phone: payload.customer_phone,
          customer_bin: payload.customer_bin,
          customer_tin: payload.customer_tin,
          customer_address: payload.customer_address,
          sales_order_id: payload.sales_order_id,
          order_number: payload.order_number,
          invoice_date: payload.invoice_date,
          due_date: payload.due_date,
          status: payload.status,
          subtotal: payload.subtotal,
          discount_amount: payload.discount_amount,
          vat_percentage: payload.vat_percentage,
          vat_amount: payload.vat_amount,
          grand_total: payload.grand_total,
          paid_amount: payload.paid_amount,
          due_amount: payload.due_amount,
          write_off_amount: payload.write_off_amount,
          notes: payload.notes,
          terms_and_conditions: payload.terms_and_conditions,
          created_by_name: payload.created_by_name,
          idempotency_key: payload.idempotency_key,
          created_at: payload.created_at,
          updated_at: payload.updated_at,
        }
        insertResult = await (supabase as any)
          .from('invoices')
          .insert(corePayload)
          .select()
          .single()

        if (insertResult.error && (insertResult.error.code === '42501' || insertResult.error.message?.includes('row-level security'))) {
          const admin = createAdminClient()
          insertResult = await (admin as any)
            .from('invoices')
            .insert(corePayload)
            .select()
            .single()
        }
      }

      if (insertResult.error) {
        throw new Error(`Database insert failed for invoice: ${insertResult.error.message}`)
      }

      const data = insertResult.data

      if (data) {
        // Insert invoice items if present
        if (invoice.items && invoice.items.length > 0) {
          const itemsPayload = invoice.items.map((it: any) => ({
            id: generateUUID(),
            invoice_id: data.id,
            product_id: it.product_id && isValidUUID(it.product_id) ? it.product_id : null,
            item_description: it.item_description || it.item_name || 'Printing Item',
            dimensions_spec:
              it.dimensions_spec ||
              (it.width && it.height ? `${it.width} × ${it.height} ${it.unit || 'inch'}` : null),
            quantity: Number(it.quantity) || 1,
            unit: it.unit || 'pcs',
            unit_price: Number(it.unit_price) || 0,
            vat_percentage: Number(it.vat_percentage) || 0,
            total_price: Number(it.total_price) || (Number(it.quantity) * Number(it.unit_price)),
            finishing: it.finishing || null,
          }))

          let itemsRes = await (supabase as any).from('invoice_items').insert(itemsPayload)
          if (itemsRes.error && (itemsRes.error.code === '42501' || itemsRes.error.message?.includes('row-level security'))) {
            const admin = createAdminClient()
            itemsRes = await (admin as any).from('invoice_items').insert(itemsPayload)
          }

          if (itemsRes.error) {
            // Fail-safe retry without finishing column if schema does not have it yet
            const fallbackItems = itemsPayload.map(({ finishing, ...rest }) => rest)
            let retryRes = await (supabase as any).from('invoice_items').insert(fallbackItems)
            if (retryRes.error && (retryRes.error.code === '42501' || retryRes.error.message?.includes('row-level security'))) {
              const admin = createAdminClient()
              retryRes = await (admin as any).from('invoice_items').insert(fallbackItems)
            }
            if (retryRes.error) {
              throw new Error(`Failed to save line items: ${retryRes.error.message}`)
            }
          }
        }

        // Update customer total due balance in PostgreSQL if customer is linked
        if (validCustomerId) {
          try {
            await (supabase as any).rpc('increment_customer_balance', {
              p_customer_id: validCustomerId,
              p_due_delta: dueAmount,
              p_invoiced_delta: grandTotal,
            })
          } catch {
            const { data: cust } = await (supabase as any)
              .from('customers')
              .select('total_due_balance, total_invoiced_amount')
              .eq('id', validCustomerId)
              .maybeSingle()
            if (cust) {
              await (supabase as any)
                .from('customers')
                .update({
                  total_due_balance: (Number(cust.total_due_balance) || 0) + dueAmount,
                  total_invoiced_amount: (Number(cust.total_invoiced_amount) || 0) + grandTotal,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', validCustomerId)
            }
          }
        }

        const retrieved = await this.getInvoiceById(data.id, invoice.company_id)
        const finalInvoice = retrieved || {
          ...payload,
          id: data.id,
          items: invoice.items || [],
          payments: [],
          write_offs: [],
        }

        // Sync into client store
        try {
          const allLocal = PrintERPDataStore.get<InvoiceRecord[]>(STORAGE_KEYS.INVOICES) || []
          const filtered = allLocal.filter((i) => i.id !== finalInvoice.id)
          PrintERPDataStore.set(STORAGE_KEYS.INVOICES, [finalInvoice, ...filtered])
        } catch {}

        return finalInvoice as InvoiceRecord
      }
    } catch (err: any) {
      if (mode === 'production') {
        throw new Error(`Invoice transaction failed: ${err.message}`)
      }
    }

    // In-memory simulation only for explicit test/training mode
    const finalLocalInvoice: InvoiceRecord = {
      ...payload,
      items: (invoice.items || []).map((it: any) => ({
        id: it.id || generateUUID(),
        invoice_id: payload.id,
        item_description: it.item_description || it.item_name || 'Printing Item',
        dimensions_spec: it.dimensions_spec || (it.width && it.height ? `${it.width} × ${it.height} ${it.unit || 'inch'}` : null),
        quantity: Number(it.quantity) || 1,
        unit: it.unit || 'pcs',
        unit_price: Number(it.unit_price) || 0,
        vat_percentage: Number(it.vat_percentage) || 0,
        total_price: Number(it.total_price) || (Number(it.quantity) * Number(it.unit_price)),
        finishing: it.finishing || null,
        created_at: new Date().toISOString(),
      })),
      payments: [],
      write_offs: [],
    }

    const all = PrintERPDataStore.get<InvoiceRecord[]>(STORAGE_KEYS.INVOICES) || []
    const idx = all.findIndex((i) => i.id === finalLocalInvoice.id)
    if (idx >= 0) all[idx] = finalLocalInvoice
    else all.unshift(finalLocalInvoice)
    PrintERPDataStore.set(STORAGE_KEYS.INVOICES, all)

    // Sync Customer in in-memory store
    if (validCustomerId) {
      const customers = PrintERPDataStore.get<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS) || []
      const cIdx = customers.findIndex((c) => c.id === validCustomerId)
      if (cIdx >= 0) {
        customers[cIdx] = {
          ...customers[cIdx],
          total_due_balance: (Number(customers[cIdx].total_due_balance) || 0) + dueAmount,
          total_invoiced_amount: (Number(customers[cIdx].total_invoiced_amount) || 0) + grandTotal,
          total_invoices_count: (Number(customers[cIdx].total_invoices_count) || 0) + 1,
          updated_at: new Date().toISOString(),
        }
        PrintERPDataStore.set(STORAGE_KEYS.CUSTOMERS, customers)
      }
    }

    return finalLocalInvoice
  }

  static async updateInvoice(
    id: string,
    param2: Partial<InvoiceRecord> | string,
    param3?: Partial<InvoiceRecord> | string
  ): Promise<InvoiceRecord> {
    const mode = getFinancialPersistenceMode()
    const updates: Partial<InvoiceRecord> = (typeof param2 === 'object' ? param2 : typeof param3 === 'object' ? param3 : {}) as Partial<InvoiceRecord>
    const companyId: string = typeof param2 === 'string' ? param2 : typeof param3 === 'string' ? param3 : ''

    const payload: any = { ...updates, updated_at: new Date().toISOString() }
    delete payload.id
    delete payload.company_id
    delete payload.items

    try {
      let supabase: any
      try {
        supabase = await createClient()
      } catch {
        supabase = createAdminClient()
      }
      let query = (supabase as any).from('invoices').update(payload).eq('id', id)
      if (companyId) {
        query = query.eq('company_id', companyId)
      }
      let { data, error } = await query.select().single()
      if (error && (error.code === '42501' || error.message?.includes('row-level security'))) {
        const admin = createAdminClient()
        let adminQuery = (admin as any).from('invoices').update(payload).eq('id', id)
        if (companyId) adminQuery = adminQuery.eq('company_id', companyId)
        const adminRes = await adminQuery.select().single()
        data = adminRes.data
        error = adminRes.error
      }
      if (!error && data) {
        return data as unknown as InvoiceRecord
      }
      if (error && mode === 'production') {
        throw new Error(`Failed to update invoice ${id}: ${error.message}`)
      }
    } catch (err: any) {
      if (mode === 'production') {
        throw new Error(`Invoice update failed: ${err.message}`)
      }
    }

    const all = PrintERPDataStore.get<InvoiceRecord[]>(STORAGE_KEYS.INVOICES) || []
    const idx = all.findIndex((i) => i.id === id)
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...payload }
      PrintERPDataStore.set(STORAGE_KEYS.INVOICES, all)
      return all[idx]
    }
    throw new Error(`Invoice ${id} not found to update.`)
  }

  static async getPayments(companyId: string, customerId?: string): Promise<PaymentRecord[]> {
    const mode = getFinancialPersistenceMode()

    try {
      let supabase: any
      try {
        supabase = await createClient()
      } catch {
        supabase = createAdminClient()
      }
      let query = (supabase as any)
        .from('payments')
        .select('*, allocations:payment_allocations(*)')
        .eq('company_id', companyId)
        .order('payment_date', { ascending: false })

      if (customerId) {
        query = query.eq('customer_id', customerId)
      }

      let { data, error } = await query
      if (error && (error.code === '42501' || error.message?.includes('row-level security'))) {
        const admin = createAdminClient()
        let adminQuery = (admin as any)
          .from('payments')
          .select('*, allocations:payment_allocations(*)')
          .eq('company_id', companyId)
          .order('payment_date', { ascending: false })
        if (customerId) adminQuery = adminQuery.eq('customer_id', customerId)
        const adminRes = await adminQuery
        data = adminRes.data
        error = adminRes.error
      }
      if (!error && data) {
        return (data || []) as unknown as PaymentRecord[]
      }
      if (error && mode === 'production') {
        throw new Error(`Failed to query payments: ${error.message}`)
      }
    } catch (err: any) {
      if (mode === 'production') {
        throw new Error(`Payments query failed: ${err.message}`)
      }
    }

    const all = PrintERPDataStore.get<PaymentRecord[]>(STORAGE_KEYS.PAYMENTS) || []
    return all
      .filter((p) => (!p.company_id || p.company_id === companyId) && (!customerId || p.customer_id === customerId))
      .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
  }

  /**
   * Authoritative multi-invoice payment allocation & recording
   */
  static async recordMultiInvoicePayment(params: MultiInvoicePaymentInput & { companyId: string; receivedByName: string }): Promise<PaymentRecord> {
    const mode = getFinancialPersistenceMode()

    if (!params.companyId) {
      throw new Error('Company context is required to record payment.')
    }
    if (params.amount <= 0) {
      throw new Error('Payment amount must be greater than zero.')
    }

    try {
      let supabase: any
      try {
        supabase = await createClient()
      } catch {
        supabase = createAdminClient()
      }
      let { data, error } = await (supabase as any).rpc('record_multi_invoice_payment_atomic', {
        p_company_id: params.companyId,
        p_customer_id: params.customerId,
        p_customer_name: params.customerName,
        p_amount: params.amount,
        p_payment_method: params.paymentMethod,
        p_payment_date: params.paymentDate || getTodayDateString(),
        p_bank_name: params.bankName || null,
        p_cheque_number: params.chequeNumber || null,
        p_cheque_date: params.chequeDate || null,
        p_mfs_transaction_id: params.mfsTransactionId || null,
        p_notes: params.notes || null,
        p_received_by_name: params.receivedByName,
        p_allocations: params.allocations || [],
        p_branch_id: params.branchId || null,
        p_idempotency_key: params.idempotencyKey || null,
        p_actor_user_id: params.actorUserId || null,
      })

      if (error && (error.code === '42501' || error.message?.includes('row-level security'))) {
        const admin = createAdminClient()
        const adminRes = await (admin as any).rpc('record_multi_invoice_payment_atomic', {
          p_company_id: params.companyId,
          p_customer_id: params.customerId,
          p_customer_name: params.customerName,
          p_amount: params.amount,
          p_payment_method: params.paymentMethod,
          p_payment_date: params.paymentDate || getTodayDateString(),
          p_bank_name: params.bankName || null,
          p_cheque_number: params.chequeNumber || null,
          p_cheque_date: params.chequeDate || null,
          p_mfs_transaction_id: params.mfsTransactionId || null,
          p_notes: params.notes || null,
          p_received_by_name: params.receivedByName,
          p_allocations: params.allocations || [],
          p_branch_id: params.branchId || null,
          p_idempotency_key: params.idempotencyKey || null,
          p_actor_user_id: params.actorUserId || null,
        })
        data = adminRes.data
        error = adminRes.error
      }

      if (error) {
        throw new Error(`Payment transaction rolled back in PostgreSQL: ${error.message}`)
      }

      if (data && data.success) {
        const { data: payRecord } = await (supabase as any)
          .from('payments')
          .select('*, allocations:payment_allocations(*)')
          .eq('id', data.payment_id)
          .maybeSingle()
        if (payRecord) return payRecord as PaymentRecord
      }
    } catch (err: any) {
      if (mode === 'production') {
        throw new Error(`Could not record payment. Transaction was rolled back: ${err.message}`)
      }
    }

    // In-memory simulation only for explicit test/training mode
    const receiptNumber = await this.getNextDocumentNumber(params.companyId, 'payment')
    const paymentId = generateUUID()

    const allocationRecords: PaymentAllocationRecord[] = []
    let totalAllocated = 0

    const allInvoices = PrintERPDataStore.get<InvoiceRecord[]>(STORAGE_KEYS.INVOICES) || []

    if (params.allocations && params.allocations.length > 0) {
      for (const alloc of params.allocations) {
        if (alloc.amount > 0) {
          const invIdx = allInvoices.findIndex((i) => i.id === alloc.invoiceId)
          if (invIdx >= 0) {
            const inv = allInvoices[invIdx]
            if (inv.status === 'cancelled') {
              throw new Error(`Cannot allocate payment to cancelled invoice ${inv.invoice_number}`)
            }

            const allocAmt = Math.min(alloc.amount, inv.due_amount)
            const newPaid = Number(inv.paid_amount || 0) + allocAmt
            const newDue = Math.max(0, Number(inv.grand_total) - newPaid - Number(inv.write_off_amount || 0))
            const newStatus = newDue <= 0 ? 'paid' : 'partially_paid'

            allInvoices[invIdx] = {
              ...inv,
              paid_amount: newPaid,
              due_amount: newDue,
              status: newStatus,
              updated_at: new Date().toISOString(),
            }

            allocationRecords.push({
              id: generateUUID(),
              payment_id: paymentId,
              invoice_id: inv.id,
              invoice_number: inv.invoice_number,
              allocated_amount: allocAmt,
              created_at: new Date().toISOString(),
            })

            totalAllocated += allocAmt
          }
        }
      }
      PrintERPDataStore.set(STORAGE_KEYS.INVOICES, allInvoices)
    } else {
      // Auto FIFO (Oldest first)
      const openInvoices = allInvoices
        .filter((i) => i.customer_id === params.customerId && i.due_amount > 0 && i.status !== 'cancelled')
        .sort((a, b) => new Date(a.invoice_date).getTime() - new Date(b.invoice_date).getTime())

      let remaining = params.amount
      for (const inv of openInvoices) {
        if (remaining <= 0) break
        const invIdx = allInvoices.findIndex((i) => i.id === inv.id)
        if (invIdx >= 0) {
          const toAlloc = Math.min(remaining, inv.due_amount)
          const newPaid = Number(inv.paid_amount || 0) + toAlloc
          const newDue = Math.max(0, Number(inv.grand_total) - newPaid - Number(inv.write_off_amount || 0))
          const newStatus = newDue <= 0 ? 'paid' : 'partially_paid'

          allInvoices[invIdx] = {
            ...inv,
            paid_amount: newPaid,
            due_amount: newDue,
            status: newStatus,
            updated_at: new Date().toISOString(),
          }

          allocationRecords.push({
            id: generateUUID(),
            payment_id: paymentId,
            invoice_id: inv.id,
            invoice_number: inv.invoice_number,
            allocated_amount: toAlloc,
            created_at: new Date().toISOString(),
          })

          totalAllocated += toAlloc
          remaining -= toAlloc
        }
      }
      PrintERPDataStore.set(STORAGE_KEYS.INVOICES, allInvoices)
    }

    const unallocated = Math.max(0, params.amount - totalAllocated)

    const paymentRecord: PaymentRecord = {
      id: paymentId,
      company_id: params.companyId,
      branch_id: params.branchId || null,
      receipt_number: receiptNumber,
      customer_id: params.customerId,
      customer_name: params.customerName,
      payment_date: params.paymentDate || getTodayDateString(),
      payment_type: params.allocations && params.allocations.length > 0 ? 'due_payment' : 'advance_payment',
      payment_method: params.paymentMethod,
      amount: params.amount,
      unallocated_amount: unallocated,
      bank_name: params.bankName || null,
      cheque_number: params.chequeNumber || null,
      cheque_date: params.chequeDate || null,
      mfs_transaction_id: params.mfsTransactionId || null,
      notes: params.notes || null,
      received_by_name: params.receivedByName,
      idempotency_key: params.idempotencyKey || null,
      actor_user_id: params.actorUserId || null,
      allocations: allocationRecords,
      created_at: new Date().toISOString(),
    }

    const allPayments = PrintERPDataStore.get<PaymentRecord[]>(STORAGE_KEYS.PAYMENTS) || []
    allPayments.push(paymentRecord)
    PrintERPDataStore.set(STORAGE_KEYS.PAYMENTS, allPayments)

    // Update customer balance in mock store
    const allCustomers = PrintERPDataStore.get<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS) || []
    const cIdx = allCustomers.findIndex((c) => c.id === params.customerId)
    if (cIdx >= 0) {
      allCustomers[cIdx] = {
        ...allCustomers[cIdx],
        total_paid_amount: (Number(allCustomers[cIdx].total_paid_amount) || 0) + params.amount,
        total_due_balance: Math.max(0, (Number(allCustomers[cIdx].total_due_balance) || 0) - totalAllocated),
        last_payment_date: paymentRecord.payment_date,
        last_payment_amount: params.amount,
        updated_at: new Date().toISOString(),
      }
      PrintERPDataStore.set(STORAGE_KEYS.CUSTOMERS, allCustomers)
    }

    return paymentRecord
  }

  static async recordPayment(params: {
    company_id: string
    customer_id: string
    customer_name: string
    amount: number
    payment_method: 'cash' | 'bank' | 'cheque' | 'bkash' | 'nagad' | 'other_mfs'
    invoice_id?: string
    bank_name?: string | null
    cheque_number?: string | null
    cheque_date?: string | null
    mfs_transaction_id?: string | null
    notes?: string | null
    received_by_name: string
    idempotency_key?: string
    actor_user_id?: string
  }): Promise<PaymentRecord> {
    const allocations = params.invoice_id ? [{ invoiceId: params.invoice_id, amount: params.amount }] : []
    return await this.recordMultiInvoicePayment({
      companyId: params.company_id,
      customerId: params.customer_id,
      customerName: params.customer_name,
      amount: params.amount,
      paymentMethod: params.payment_method,
      invoiceId: params.invoice_id,
      bankName: params.bank_name,
      chequeNumber: params.cheque_number,
      chequeDate: params.cheque_date,
      mfsTransactionId: params.mfs_transaction_id,
      notes: params.notes,
      receivedByName: params.received_by_name,
      idempotencyKey: params.idempotency_key,
      actorUserId: params.actor_user_id,
      allocations,
    } as any)
  }

  static async recordWriteOff(writeOff: {
    company_id: string
    invoice_id: string
    amount: number
    reason: string
    authorized_by_name: string
    actor_user_id?: string
  }): Promise<FinancialWriteOffRecord> {
    const mode = getFinancialPersistenceMode()

    if (writeOff.amount <= 0) {
      throw new Error('Write-off amount must be greater than zero.')
    }
    if (!writeOff.reason || !writeOff.reason.trim()) {
      throw new Error('A valid reason is required for financial write-off.')
    }

    try {
      let supabase: any
      try {
        supabase = await createClient()
      } catch {
        supabase = createAdminClient()
      }
      let { data, error } = await (supabase as any).rpc('record_financial_write_off_atomic', {
        p_company_id: writeOff.company_id,
        p_invoice_id: writeOff.invoice_id,
        p_amount: writeOff.amount,
        p_reason: writeOff.reason,
        p_authorized_by_name: writeOff.authorized_by_name,
        p_actor_user_id: writeOff.actor_user_id || null,
      })

      if (error && (error.code === '42501' || error.message?.includes('row-level security'))) {
        const admin = createAdminClient()
        const adminRes = await (admin as any).rpc('record_financial_write_off_atomic', {
          p_company_id: writeOff.company_id,
          p_invoice_id: writeOff.invoice_id,
          p_amount: writeOff.amount,
          p_reason: writeOff.reason,
          p_authorized_by_name: writeOff.authorized_by_name,
          p_actor_user_id: writeOff.actor_user_id || null,
        })
        data = adminRes.data
        error = adminRes.error
      }

      if (error) {
        throw new Error(`Write-off transaction failed in PostgreSQL: ${error.message}`)
      }

      if (data && data.success) {
        return {
          id: data.write_off_id,
          company_id: writeOff.company_id,
          invoice_id: writeOff.invoice_id,
          amount: writeOff.amount,
          reason: writeOff.reason,
          authorized_by_name: writeOff.authorized_by_name,
          actor_user_id: writeOff.actor_user_id || null,
          created_at: new Date().toISOString(),
        }
      }
    } catch (err: any) {
      if (mode === 'production') {
        throw new Error(`Financial write-off failed: ${err.message}`)
      }
    }

    // In-memory simulation for test/training mode
    const allInvoices = PrintERPDataStore.get<InvoiceRecord[]>(STORAGE_KEYS.INVOICES) || []
    const invIdx = allInvoices.findIndex((i) => i.id === writeOff.invoice_id)
    if (invIdx < 0) {
      throw new Error(`Invoice not found for write-off`)
    }

    const inv = allInvoices[invIdx]
    if (inv.status === 'cancelled') {
      throw new Error(`Cannot write off cancelled invoice ${inv.invoice_number}`)
    }
    if (inv.due_amount <= 0) {
      throw new Error(`Invoice ${inv.invoice_number} has no remaining due to write off`)
    }
    if (writeOff.amount > inv.due_amount) {
      throw new Error(`Write-off amount (৳${writeOff.amount}) cannot exceed due balance (৳${inv.due_amount})`)
    }

    const payload: FinancialWriteOffRecord = {
      id: generateUUID(),
      ...writeOff,
      actor_user_id: writeOff.actor_user_id || null,
      created_at: new Date().toISOString(),
    }

    const newWriteOff = Number(inv.write_off_amount || 0) + writeOff.amount
    const newDue = Math.max(0, Number(inv.grand_total) - Number(inv.paid_amount || 0) - newWriteOff)
    const newStatus = newDue <= 0 ? 'written_off' : inv.status

    allInvoices[invIdx] = {
      ...inv,
      write_off_amount: newWriteOff,
      due_amount: newDue,
      status: newStatus,
      write_offs: [...(inv.write_offs || []), payload],
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.set(STORAGE_KEYS.INVOICES, allInvoices)

    if (inv.customer_id) {
      const allCust = PrintERPDataStore.get<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS) || []
      const cIdx = allCust.findIndex((c) => c.id === inv.customer_id)
      if (cIdx >= 0) {
        allCust[cIdx] = {
          ...allCust[cIdx],
          total_due_balance: Math.max(0, (Number(allCust[cIdx].total_due_balance) || 0) - writeOff.amount),
          updated_at: new Date().toISOString(),
        }
        PrintERPDataStore.set(STORAGE_KEYS.CUSTOMERS, allCust)
      }
    }

    return payload
  }

  static async cancelInvoice(invoiceId: string, reason: string, actorName: string, companyId: string, actorUserId?: string): Promise<boolean> {
    const mode = getFinancialPersistenceMode()

    try {
      let supabase: any
      try {
        supabase = await createClient()
      } catch {
        supabase = createAdminClient()
      }
      let { data, error } = await (supabase as any).rpc('cancel_invoice_atomic', {
        p_company_id: companyId,
        p_invoice_id: invoiceId,
        p_reason: reason,
        p_actor_name: actorName,
        p_actor_user_id: actorUserId || null,
      })

      if (error && (error.code === '42501' || error.message?.includes('row-level security'))) {
        const admin = createAdminClient()
        const adminRes = await (admin as any).rpc('cancel_invoice_atomic', {
          p_company_id: companyId,
          p_invoice_id: invoiceId,
          p_reason: reason,
          p_actor_name: actorName,
          p_actor_user_id: actorUserId || null,
        })
        data = adminRes.data
        error = adminRes.error
      }

      if (error) {
        throw new Error(`Cancellation failed in PostgreSQL: ${error.message}`)
      }

      if (data && data.success) {
        return true
      }
    } catch (err: any) {
      if (mode === 'production') {
        throw new Error(`Invoice cancellation failed: ${err.message}`)
      }
    }

    // In-memory simulation for test/training mode
    const allInvoices = PrintERPDataStore.get<InvoiceRecord[]>(STORAGE_KEYS.INVOICES) || []
    const idx = allInvoices.findIndex((i) => i.id === invoiceId)
    if (idx >= 0) {
      const inv = allInvoices[idx]
      if (inv.status === 'cancelled') {
        throw new Error('Invoice is already cancelled')
      }
      if (inv.status === 'paid') {
        throw new Error('Paid invoices cannot be cancelled directly. Please perform an authorized payment refund/reversal.')
      }
      if (Number(inv.paid_amount || 0) > 0) {
        throw new Error(`Partially paid invoices (Paid: ৳${inv.paid_amount}) cannot be cancelled directly.`)
      }
      if (inv.status === 'written_off') {
        throw new Error('Written-off invoices cannot be cancelled.')
      }

      const releasedDue = inv.due_amount
      allInvoices[idx] = {
        ...inv,
        status: 'cancelled',
        due_amount: 0,
        notes: `${inv.notes || ''} [Cancelled: ${reason} by ${actorName}]`,
        updated_at: new Date().toISOString(),
      }
      PrintERPDataStore.set(STORAGE_KEYS.INVOICES, allInvoices)

      if (inv.customer_id && releasedDue > 0) {
        const allCust = PrintERPDataStore.get<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS) || []
        const cIdx = allCust.findIndex((c) => c.id === inv.customer_id)
        if (cIdx >= 0) {
          allCust[cIdx] = {
            ...allCust[cIdx],
            total_due_balance: Math.max(0, (Number(allCust[cIdx].total_due_balance) || 0) - releasedDue),
            updated_at: new Date().toISOString(),
          }
          PrintERPDataStore.set(STORAGE_KEYS.CUSTOMERS, allCust)
        }
      }
      return true
    }
    return false
  }

  /**
   * Evaluates customer credit limit and calculates projected outstanding balance
   */
  static async checkCustomerCreditLimit(
    companyId: string,
    customerId: string,
    newInvoiceAmount: number
  ): Promise<CreditLimitWarningInfo> {
    const customers = await (async () => {
      try {
        const supabase = await createClient()
        const { data } = await (supabase as any)
          .from('customers')
          .select('id, name, credit_limit, total_due_balance')
          .eq('id', customerId)
          .eq('company_id', companyId)
          .maybeSingle()
        if (data) return data
      } catch {}
      const all = PrintERPDataStore.get<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS) || []
      return all.find((c) => c.id === customerId) || null
    })()

    const customerName = customers?.name || 'Customer'
    const creditLimit = Number(customers?.credit_limit) || 0
    const currentOutstanding = Number(customers?.total_due_balance) || 0
    const projectedOutstanding = currentOutstanding + newInvoiceAmount
    const isExceeded = creditLimit > 0 && projectedOutstanding > creditLimit
    const exceededBy = isExceeded ? projectedOutstanding - creditLimit : 0

    return {
      customerId,
      customerName,
      creditLimit,
      currentOutstanding,
      newInvoiceAmount,
      projectedOutstanding,
      exceededBy,
      isExceeded,
      warningMessage: isExceeded
        ? `Customer ${customerName} has an existing outstanding due of ৳${currentOutstanding.toLocaleString()}. Adding this ৳${newInvoiceAmount.toLocaleString()} invoice will exceed their credit limit (৳${creditLimit.toLocaleString()}) by ৳${exceededBy.toLocaleString()}.`
        : '',
    }
  }

  /**
   * Generates owner-oriented period-aware billing & collections metrics
   */
  static async getBillingOverview(
    companyId: string,
    period: BillingPeriod = 'this_month',
    customRange?: { start: string; end: string }
  ): Promise<{
    metrics: BillingOverviewMetrics
    priorityItems: CollectionPriorityItem[]
    paymentMethods: PaymentMethodSummaryItem[]
    salespersonStats: SalespersonCollectionStat[]
  }> {
    const todayStr = getTodayDateString()

    let startDate = todayStr
    let endDate = todayStr
    let periodLabel = 'This Month'

    if (period === 'today') {
      startDate = todayStr
      endDate = todayStr
      periodLabel = "Today's"
    } else if (period === 'this_week') {
      const d = new Date()
      const day = d.getDay()
      const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
      const mon = new Date(d.setDate(diff))
      startDate = mon.toISOString().split('T')[0]
      endDate = todayStr
      periodLabel = 'This Week'
    } else if (period === 'this_month') {
      startDate = `${todayStr.slice(0, 7)}-01`
      endDate = todayStr
      periodLabel = 'This Month'
    } else if (period === 'all_time') {
      startDate = '2000-01-01'
      endDate = todayStr
      periodLabel = 'All Time'
    } else if (period === 'custom' && customRange) {
      startDate = customRange.start
      endDate = customRange.end
      periodLabel = 'Custom Period'
    }

    const invoices = await this.getInvoices(companyId)
    const payments = await this.getPayments(companyId)

    // Period sales
    const periodInvoices = invoices.filter(
      (inv) => inv.invoice_date >= startDate && inv.invoice_date <= endDate && inv.status !== 'cancelled'
    )
    const salesAmount = periodInvoices.reduce((sum, inv) => sum + Number(inv.grand_total || 0), 0)
    const salesCount = periodInvoices.length

    // Period collections
    const periodPayments = payments.filter((p) => p.payment_date >= startDate && p.payment_date <= endDate)
    const collectionAmount = periodPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
    const collectionCount = periodPayments.length

    // Receivables stats
    const openInvoices = invoices.filter((inv) => (Number(inv.due_amount) || 0) > 0 && inv.status !== 'cancelled')
    const totalReceivables = openInvoices.reduce((sum, inv) => sum + Number(inv.due_amount || 0), 0)

    const dueTodayInvoices = openInvoices.filter((inv) => inv.due_date === todayStr)
    const dueTodayAmount = dueTodayInvoices.reduce((sum, inv) => sum + Number(inv.due_amount || 0), 0)
    const dueTodayCount = dueTodayInvoices.length

    const overdueInvoices = openInvoices.filter((inv) => calculateDaysOverdue(inv.due_date) > 0)
    const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + Number(inv.due_amount || 0), 0)
    const overdueCount = overdueInvoices.length

    const outstandingDue = totalReceivables
    const outstandingDueCount = openInvoices.length

    const collectionRate = salesAmount > 0 ? Math.min(100, Math.round((collectionAmount / salesAmount) * 100)) : 0

    const metrics: BillingOverviewMetrics = {
      period,
      periodLabel,
      startDate,
      endDate,
      salesAmount,
      salesCount,
      collectionAmount,
      collectionCount,
      dueTodayAmount,
      dueTodayCount,
      outstandingDue,
      outstandingDueCount,
      overdueAmount,
      overdueCount,
      totalReceivables,
      collectionRate,
    }

    // Collection Priority items
    const priorityItems: CollectionPriorityItem[] = []
    const seenPriorityIds = new Set<string>()

    // 1. Overdue invoices (sorted by highest overdue amount & days)
    const sortedOverdue = [...overdueInvoices].sort((a, b) => Number(b.due_amount) - Number(a.due_amount))
    for (const inv of sortedOverdue.slice(0, 15)) {
      if (!seenPriorityIds.has(inv.id)) {
        seenPriorityIds.add(inv.id)
        priorityItems.push({
          id: inv.id,
          invoiceId: inv.id,
          invoiceNumber: inv.invoice_number,
          customerId: inv.customer_id || '',
          customerName: inv.customer_name,
          customerPhone: inv.customer_phone,
          invoiceDate: inv.invoice_date,
          dueDate: inv.due_date,
          grandTotal: inv.grand_total,
          paidAmount: inv.paid_amount,
          dueAmount: inv.due_amount,
          daysOverdue: calculateDaysOverdue(inv.due_date),
          salespersonName: inv.salesperson_name || inv.created_by_name,
          status: inv.status,
          priorityReason: 'overdue',
        })
      }
    }

    // 2. Due today invoices
    for (const inv of dueTodayInvoices) {
      if (!seenPriorityIds.has(inv.id)) {
        seenPriorityIds.add(inv.id)
        priorityItems.push({
          id: inv.id,
          invoiceId: inv.id,
          invoiceNumber: inv.invoice_number,
          customerId: inv.customer_id || '',
          customerName: inv.customer_name,
          customerPhone: inv.customer_phone,
          invoiceDate: inv.invoice_date,
          dueDate: inv.due_date,
          grandTotal: inv.grand_total,
          paidAmount: inv.paid_amount,
          dueAmount: inv.due_amount,
          daysOverdue: 0,
          salespersonName: inv.salesperson_name || inv.created_by_name,
          status: inv.status,
          priorityReason: 'due_today',
        })
      }
    }

    // 3. High Value Due (>= ৳25,000)
    for (const inv of openInvoices.filter((i) => Number(i.due_amount) >= 25000)) {
      if (!seenPriorityIds.has(inv.id)) {
        seenPriorityIds.add(inv.id)
        priorityItems.push({
          id: inv.id,
          invoiceId: inv.id,
          invoiceNumber: inv.invoice_number,
          customerId: inv.customer_id || '',
          customerName: inv.customer_name,
          customerPhone: inv.customer_phone,
          invoiceDate: inv.invoice_date,
          dueDate: inv.due_date,
          grandTotal: inv.grand_total,
          paidAmount: inv.paid_amount,
          dueAmount: inv.due_amount,
          daysOverdue: calculateDaysOverdue(inv.due_date),
          salespersonName: inv.salesperson_name || inv.created_by_name,
          status: inv.status,
          priorityReason: 'high_value',
        })
      }
    }

    // Payment methods summary for selected period
    const methodMap: Record<string, { label: string; labelBn: string; icon: string; total: number; count: number }> = {
      cash: { label: 'Cash Counter', labelBn: 'ক্যাশ কাউন্টার', icon: '💵', total: 0, count: 0 },
      bkash: { label: 'bKash Merchant', labelBn: 'বিকাশ মার্চেন্ট', icon: '📱', total: 0, count: 0 },
      nagad: { label: 'Nagad Wallet', labelBn: 'নগদ ওয়ালেট', icon: '📱', total: 0, count: 0 },
      bank: { label: 'Bank Transfer (EFT / RTGS)', labelBn: 'ব্যাংক ট্রান্সফার', icon: '🏦', total: 0, count: 0 },
      cheque: { label: 'Bank Cheque', labelBn: 'ব্যাংক চেক', icon: '📝', total: 0, count: 0 },
      other_mfs: { label: 'Rocket / Other MFS', labelBn: 'অন্যান্য এমএফএস', icon: '💳', total: 0, count: 0 },
    }

    for (const p of periodPayments) {
      const m = p.payment_method || 'cash'
      if (methodMap[m]) {
        methodMap[m].total += Number(p.amount) || 0
        methodMap[m].count += 1
      }
    }

    const paymentMethods: PaymentMethodSummaryItem[] = Object.entries(methodMap).map(([key, item]) => ({
      method: key as any,
      label: item.label,
      labelBn: item.labelBn,
      icon: item.icon,
      totalAmount: item.total,
      transactionCount: item.count,
    }))

    // Salesperson collection breakdown
    const salespersonMap = new Map<string, SalespersonCollectionStat>()
    for (const inv of invoices) {
      const spName = inv.salesperson_name || inv.created_by_name || 'Commercial Desk'
      const existing = salespersonMap.get(spName) || {
        salespersonId: inv.salesperson_id || null,
        salespersonName: spName,
        totalBilled: 0,
        totalCollected: 0,
        outstandingDue: 0,
        overdueAmount: 0,
        customerCount: 0,
        oldestDueDays: 0,
      }

      existing.totalBilled += Number(inv.grand_total) || 0
      existing.totalCollected += Number(inv.paid_amount) || 0
      if (inv.due_amount > 0 && inv.status !== 'cancelled') {
        existing.outstandingDue += Number(inv.due_amount) || 0
        const days = calculateDaysOverdue(inv.due_date)
        if (days > 0) {
          existing.overdueAmount += Number(inv.due_amount) || 0
          existing.oldestDueDays = Math.max(existing.oldestDueDays, days)
        }
      }
      salespersonMap.set(spName, existing)
    }

    const salespersonStats = Array.from(salespersonMap.values()).sort((a, b) => b.outstandingDue - a.outstandingDue)

    return {
      metrics,
      priorityItems,
      paymentMethods,
      salespersonStats,
    }
  }

  /**
   * Calculates standard 6-bucket receivables aging
   */
  static async getReceivablesAging(companyId: string): Promise<ReceivablesAgingSummary> {
    const invoices = await this.getInvoices(companyId)
    const openInvoices = invoices.filter((i) => Number(i.due_amount) > 0 && i.status !== 'cancelled')

    const buckets: Record<string, { label: string; labelBn: string; amount: number; invoiceCount: number; customers: Set<string> }> = {
      current: { label: 'Current (Not Due)', labelBn: 'বর্তমান (মেয়াদ বাকি)', amount: 0, invoiceCount: 0, customers: new Set() },
      '1_7': { label: '1–7 Days', labelBn: '১–৭ দিন', amount: 0, invoiceCount: 0, customers: new Set() },
      '8_30': { label: '8–30 Days', labelBn: '৮–৩০ দিন', amount: 0, invoiceCount: 0, customers: new Set() },
      '31_60': { label: '31–60 Days', labelBn: '৩১–৬০ দিন', amount: 0, invoiceCount: 0, customers: new Set() },
      '61_90': { label: '61–90 Days', labelBn: '৬১–৯০ দিন', amount: 0, invoiceCount: 0, customers: new Set() },
      '90_plus': { label: '90+ Days', labelBn: '৯০+ দিন', amount: 0, invoiceCount: 0, customers: new Set() },
    }

    const customerAgingMap = new Map<string, CustomerReceivablesAging>()

    for (const inv of openInvoices) {
      const due = Number(inv.due_amount) || 0
      const days = calculateDaysOverdue(inv.due_date)
      const custId = inv.customer_id || 'unknown'
      const custName = inv.customer_name || 'Customer'

      let bucketKey: 'current' | '1_7' | '8_30' | '31_60' | '61_90' | '90_plus' = 'current'
      if (days === 0) {
        bucketKey = 'current'
      } else if (days <= 7) {
        bucketKey = '1_7'
      } else if (days <= 30) {
        bucketKey = '8_30'
      } else if (days <= 60) {
        bucketKey = '31_60'
      } else if (days <= 90) {
        bucketKey = '61_90'
      } else {
        bucketKey = '90_plus'
      }

      buckets[bucketKey].amount += due
      buckets[bucketKey].invoiceCount += 1
      buckets[bucketKey].customers.add(custId)

      const custAging = customerAgingMap.get(custId) || {
        customerId: custId,
        customerName: custName,
        customerPhone: inv.customer_phone || '',
        creditLimit: 0,
        currentOutstanding: 0,
        totalOverdue: 0,
        current: 0,
        days1_7: 0,
        days8_30: 0,
        days31_60: 0,
        days61_90: 0,
        days90Plus: 0,
        oldestDueDays: 0,
        invoiceCount: 0,
      }

      custAging.currentOutstanding += due
      custAging.invoiceCount += 1
      if (days > 0) {
        custAging.totalOverdue += due
        custAging.oldestDueDays = Math.max(custAging.oldestDueDays, days)
      }

      if (bucketKey === 'current') custAging.current += due
      else if (bucketKey === '1_7') custAging.days1_7 += due
      else if (bucketKey === '8_30') custAging.days8_30 += due
      else if (bucketKey === '31_60') custAging.days31_60 += due
      else if (bucketKey === '61_90') custAging.days61_90 += due
      else if (bucketKey === '90_plus') custAging.days90Plus += due

      customerAgingMap.set(custId, custAging)
    }

    const agingBuckets: ReceivablesAgingBucket[] = Object.entries(buckets).map(([key, b]) => ({
      bucket: key as any,
      label: b.label,
      labelBn: b.labelBn,
      amount: b.amount,
      invoiceCount: b.invoiceCount,
      customerCount: b.customers.size,
    }))

    const customerAgingList = Array.from(customerAgingMap.values()).sort(
      (a, b) => b.totalOverdue - a.totalOverdue || b.currentOutstanding - a.currentOutstanding
    )

    const totalReceivables = openInvoices.reduce((sum, inv) => sum + Number(inv.due_amount || 0), 0)
    const totalOverdue = openInvoices
      .filter((inv) => calculateDaysOverdue(inv.due_date) > 0)
      .reduce((sum, inv) => sum + Number(inv.due_amount || 0), 0)

    return {
      buckets: agingBuckets,
      customerAging: customerAgingList,
      totalReceivables,
      totalOverdue,
    }
  }

  /**
   * Diagnostic & Reconciliation Tool: Validates and reconciles customer debt balance
   */
  static async reconcileCustomerBalances(
    companyId: string,
    customerId?: string,
    autoFix: boolean = false
  ): Promise<CustomerReconciliationReport> {
    const invoices = await this.getInvoices(companyId, { customerId })
    const payments = await this.getPayments(companyId, customerId)

    // Group invoices by customer
    const custMap = new Map<string, { name: string; totalInvoiced: number; totalAllocated: number; totalWriteOffs: number; calculatedDue: number }>()

    for (const inv of invoices) {
      if (inv.status === 'cancelled') continue
      const cId = inv.customer_id
      if (!cId) continue

      const existing = custMap.get(cId) || {
        name: inv.customer_name,
        totalInvoiced: 0,
        totalAllocated: 0,
        totalWriteOffs: 0,
        calculatedDue: 0,
      }

      existing.totalInvoiced += Number(inv.grand_total) || 0
      existing.totalAllocated += Number(inv.paid_amount) || 0
      existing.totalWriteOffs += Number(inv.write_off_amount) || 0
      existing.calculatedDue += Number(inv.due_amount) || 0
      custMap.set(cId, existing)
    }

    // Check against stored customer balances
    const customers = await (async () => {
      try {
        const supabase = await createClient()
        let query = (supabase as any).from('customers').select('*').eq('company_id', companyId)
        if (customerId) query = query.eq('id', customerId)
        const { data } = await query
        if (data) return data as CustomerRecord[]
      } catch {}
      const all = PrintERPDataStore.get<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS) || []
      return all.filter((c) => (!c.company_id || c.company_id === companyId) && (!customerId || c.id === customerId))
    })()

    const items: CustomerBalanceReconciliationItem[] = []
    let totalStored = 0
    let totalCalculated = 0
    let mismatched = 0

    for (const cust of customers) {
      const stats = custMap.get(cust.id) || {
        name: cust.name,
        totalInvoiced: Number(cust.total_invoiced_amount) || 0,
        totalAllocated: Number(cust.total_paid_amount) || 0,
        totalWriteOffs: 0,
        calculatedDue: 0,
      }

      const storedDue = Number(cust.total_due_balance) || 0
      const diff = Math.abs(storedDue - stats.calculatedDue)
      const isBalanced = diff < 0.01

      if (!isBalanced) mismatched += 1
      totalStored += storedDue
      totalCalculated += stats.calculatedDue

      items.push({
        customerId: cust.id,
        customerName: cust.name,
        storedDueBalance: storedDue,
        calculatedDueBalance: stats.calculatedDue,
        difference: storedDue - stats.calculatedDue,
        totalInvoiced: stats.totalInvoiced,
        totalAllocatedPaid: stats.totalAllocated,
        totalWriteOffs: stats.totalWriteOffs,
        isBalanced,
      })
    }

    if (autoFix && mismatched > 0) {
      try {
        const supabase = await createClient()
        await (supabase as any).rpc('reconcile_customer_balance_atomic', {
          p_company_id: companyId,
          p_customer_id: customerId || null,
        })
      } catch {}
    }

    return {
      companyId,
      generatedAt: new Date().toISOString(),
      totalCustomers: customers.length,
      balancedCustomers: customers.length - mismatched,
      mismatchedCustomers: mismatched,
      totalStoredDue: totalStored,
      totalCalculatedDue: totalCalculated,
      reconciled: mismatched === 0,
      items,
    }
  }

  static async getInvoicePrintData(id: string, companyId: string): Promise<{
    invoice: InvoiceRecord
    company: any
  } | null> {
    try {
      const supabase = await createClient()
      const invoice = await this.getInvoiceById(id, companyId)
      if (!invoice) return null

      const { data: company } = await (supabase as any)
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .maybeSingle()

      return {
        invoice,
        company: company || { name: 'InkFlow Enterprise', address: 'Dhaka, Bangladesh' },
      }
    } catch {
      const invoice = await this.getInvoiceById(id, companyId)
      if (!invoice) return null
      return {
        invoice,
        company: { name: 'InkFlow Enterprise', address: 'Dhaka, Bangladesh' },
      }
    }
  }
}
