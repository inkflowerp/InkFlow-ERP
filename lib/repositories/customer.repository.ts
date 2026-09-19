import { createClient } from '../supabase/server.ts'
import type {
  CustomerRecord,
  CustomerCommunication,
  CustomerRateRecord,
  ResolvedProductRate,
  CustomerFinancialSummary,
  CustomerProductPurchaseStat,
  CustomerTimelineEvent,
  CustomerSummaryStatistics,
} from '../../types/crm.types.ts'
import { ProductRepository } from './product.repository.ts'
import { measureAsync } from '../performance/logger.ts'
import { buildPaginatedResponse, type PaginatedResult } from '../api/pagination-helper.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../db/data-store.ts'

export function isSupabaseConfigured(): boolean {
  return !!(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) &&
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY)
  )
}

export function isTestMode(): boolean {
  return (
    process.env.NODE_ENV === 'test' ||
    process.env.VITEST === 'true' ||
    process.env.NODE_TEST_CONTEXT !== undefined ||
    process.argv.some((arg) => arg.includes('test') || arg.includes('--test'))
  )
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

export class CustomerRepository {
  /**
   * Retrieves all customers for a tenant (Authoritative PostgreSQL)
   */
  static async getCustomers(companyId: string): Promise<CustomerRecord[]> {
    return measureAsync(`CustomerRepository.getCustomers(${companyId})`, async () => {
      if (!isSupabaseConfigured()) {
        if (isTestMode()) {
          return (PrintERPDataStore.get<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS) || []).filter((c: CustomerRecord) => c.company_id === companyId)
        }
        throw new Error('Authoritative database connection is required to fetch customers.')
      }

      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('customers')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch customers from database: ${error.message}`)
      }
      return (data || []) as unknown as CustomerRecord[]
    })
  }

  /**
   * Summary KPI Statistics for the Customers List
   */
  static async getCustomersSummary(companyId: string): Promise<CustomerSummaryStatistics> {
    return measureAsync(`CustomerRepository.getCustomersSummary(${companyId})`, async () => {
      if (!isSupabaseConfigured()) {
        if (isTestMode()) {
          const list = (PrintERPDataStore.get<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS) || []).filter((c: CustomerRecord) => c.company_id === companyId)
          return {
            totalCustomers: list.length,
            activeCustomers: list.filter((c: CustomerRecord) => c.is_active !== false).length,
            customersWithDue: 0,
            totalOutstandingDue: 0,
          }
        }
        throw new Error('Authoritative database connection is required to calculate customer summary statistics.')
      }

      const supabase = await createClient()

      // 1. Total and Active Customers count
      const { data: customerList, error: custErr } = await (supabase as any)
        .from('customers')
        .select('id, is_active')
        .eq('company_id', companyId)

      if (custErr) {
        throw new Error(`Failed to fetch customer summary stats: ${custErr.message}`)
      }

      const totalCustomers = customerList?.length || 0
      const activeCustomers = customerList?.filter((c: any) => c.is_active !== false).length || 0

      // 2. Outstanding Invoices & Due Aggregation
      const { data: invoices, error: invErr } = await (supabase as any)
        .from('invoices')
        .select('customer_id, due_amount, status')
        .eq('company_id', companyId)
        .neq('status', 'cancelled')

      if (invErr) {
        throw new Error(`Failed to calculate customer due statistics: ${invErr.message}`)
      }

      const customersWithDueSet = new Set<string>()
      let totalOutstandingDue = 0

      for (const inv of invoices || []) {
        const due = Number(inv.due_amount) || 0
        if (due > 0) {
          totalOutstandingDue += due
          if (inv.customer_id) {
            customersWithDueSet.add(inv.customer_id)
          }
        }
      }

      return {
        totalCustomers,
        activeCustomers,
        customersWithDue: customersWithDueSet.size,
        totalOutstandingDue: Math.round(totalOutstandingDue * 100) / 100,
      }
    })
  }

  /**
   * Paginated & Filterable Customer Search with Consolidated Batch Financial Enrichment (Zero N+1)
   */
  static async getPaginatedCustomers(
    companyId: string,
    options: {
      page?: number
      pageSize?: number
      search?: string
      customerType?: string
      dueFilter?: 'all' | 'has_due' | 'no_due'
      activeFilter?: 'all' | 'active' | 'inactive'
      sortBy?: 'newest' | 'billed' | 'due' | 'latest_order' | 'name'
      sortOrder?: 'asc' | 'desc'
    } = {}
  ): Promise<PaginatedResult<CustomerRecord>> {
    return measureAsync(`CustomerRepository.getPaginatedCustomers(${companyId})`, async () => {
      const page = Math.max(1, options.page || 1)
      const pageSize = Math.min(100, Math.max(1, options.pageSize || 25))
      const offset = (page - 1) * pageSize

      if (!isSupabaseConfigured()) {
        if (isTestMode()) {
          const list = (PrintERPDataStore.get<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS) || []).filter((c: CustomerRecord) => c.company_id === companyId)
          return buildPaginatedResponse(list, list.length, page, pageSize)
        }
        throw new Error('Authoritative database connection is required to fetch paginated customers.')
      }

      const supabase = await createClient()
      const todayStr = getTodayDateString()

      // If filtering by due, fetch customer IDs with outstanding due
      let dueCustomerIds: Set<string> | null = null
      if (options.dueFilter === 'has_due' || options.dueFilter === 'no_due') {
        const { data: dueInvoices, error: dueErr } = await (supabase as any)
          .from('invoices')
          .select('customer_id, due_amount')
          .eq('company_id', companyId)
          .neq('status', 'cancelled')
          .gt('due_amount', 0)

        if (dueErr) {
          throw new Error(`Failed to filter customer due statuses: ${dueErr.message}`)
        }

        dueCustomerIds = new Set((dueInvoices || []).map((i: any) => i.customer_id).filter(Boolean))
      }

      let query = (supabase as any)
        .from('customers')
        .select('*', { count: 'exact' })
        .eq('company_id', companyId)

      if (options.search?.trim()) {
        const rawTerm = options.search.trim()
        const term = `%${rawTerm}%`
        const digits = rawTerm.replace(/\D/g, '')

        if (digits.length >= 4) {
          const phoneTerm = `%${digits}%`
          query = query.or(
            `name.ilike.${term},name_bn.ilike.${term},company_name.ilike.${term},contact_person.ilike.${term},mobile.ilike.${phoneTerm},whatsapp.ilike.${phoneTerm},area.ilike.${term}`
          )
        } else {
          query = query.or(
            `name.ilike.${term},name_bn.ilike.${term},company_name.ilike.${term},contact_person.ilike.${term},mobile.ilike.${term},whatsapp.ilike.${term},area.ilike.${term}`
          )
        }
      }

      if (options.customerType && options.customerType !== 'all') {
        query = query.eq('customer_type', options.customerType)
      }

      if (options.activeFilter === 'active') {
        query = query.eq('is_active', true)
      } else if (options.activeFilter === 'inactive') {
        query = query.eq('is_active', false)
      }

      // Pre-pagination database-level due filtering
      if (options.dueFilter === 'has_due' && dueCustomerIds) {
        const ids = Array.from(dueCustomerIds)
        if (ids.length === 0) {
          return buildPaginatedResponse([], 0, page, pageSize)
        }
        query = query.in('id', ids)
      } else if (options.dueFilter === 'no_due' && dueCustomerIds && dueCustomerIds.size > 0) {
        const ids = Array.from(dueCustomerIds)
        query = query.not('id', 'in', `(${ids.join(',')})`)
      }

      // Sort order
      if (options.sortBy === 'name') {
        query = query.order('name', { ascending: options.sortOrder === 'asc' })
      } else {
        query = query.order('created_at', { ascending: false })
      }

      query = query.range(offset, offset + pageSize - 1)

      const { data, count, error } = await query

      if (error) {
        throw new Error(`Failed to fetch paginated customers: ${error.message}`)
      }

      const customers = (data || []) as unknown as CustomerRecord[]

      if (customers.length === 0) {
        return buildPaginatedResponse([], count || 0, page, pageSize)
      }

      // BATCH AGGREGATION: Single O(3) database query set for all customer IDs on this page (Eliminates N+1)
      const customerIds = customers.map((c) => c.id)

      const [invoicesRes, paymentsRes, ordersRes] = await Promise.all([
        (supabase as any)
          .from('invoices')
          .select('id, invoice_number, invoice_date, customer_id, grand_total, paid_amount, due_amount, due_date, status, created_at')
          .eq('company_id', companyId)
          .in('customer_id', customerIds)
          .neq('status', 'cancelled')
          .order('invoice_date', { ascending: false })
          .order('created_at', { ascending: false }),

        (supabase as any)
          .from('payments')
          .select('id, customer_id, receipt_number, payment_date, amount, payment_method, created_at')
          .eq('company_id', companyId)
          .in('customer_id', customerIds)
          .order('payment_date', { ascending: false })
          .order('created_at', { ascending: false }),

        (supabase as any)
          .from('sales_orders')
          .select('order_number, customer_id, order_date, final_price, status, created_at')
          .eq('company_id', companyId)
          .in('customer_id', customerIds)
          .neq('status', 'cancelled')
          .order('order_date', { ascending: false })
          .order('created_at', { ascending: false }),
      ])

      const invoiceStatsMap = new Map<
        string,
        { count: number; totalBilled: number; totalPaid: number; totalDue: number; totalOverdue: number; lastInvoice: any }
      >()

      for (const inv of invoicesRes.data || []) {
        const cid = inv.customer_id
        if (!cid) continue
        const current = invoiceStatsMap.get(cid) || {
          count: 0,
          totalBilled: 0,
          totalPaid: 0,
          totalDue: 0,
          totalOverdue: 0,
          lastInvoice: null,
        }
        current.count++
        current.totalBilled += Number(inv.grand_total) || 0
        current.totalPaid += Number(inv.paid_amount) || 0
        const due = Number(inv.due_amount) || 0
        current.totalDue += due
        if (due > 0 && inv.due_date && inv.due_date.split('T')[0] < todayStr) {
          current.totalOverdue += due
        }
        if (!current.lastInvoice) {
          current.lastInvoice = inv
        }
        invoiceStatsMap.set(cid, current)
      }

      const lastPaymentMap = new Map<string, any>()
      for (const p of paymentsRes.data || []) {
        if (p.customer_id && !lastPaymentMap.has(p.customer_id)) {
          lastPaymentMap.set(p.customer_id, p)
        }
      }

      const lastOrderMap = new Map<string, any>()
      for (const o of ordersRes.data || []) {
        if (o.customer_id && !lastOrderMap.has(o.customer_id)) {
          lastOrderMap.set(o.customer_id, o)
        }
      }

      const enriched: CustomerRecord[] = customers.map((c) => {
        const invStat = invoiceStatsMap.get(c.id)
        const lastPay = lastPaymentMap.get(c.id)
        const lastOrd =
          lastOrderMap.get(c.id) ||
          (invStat?.lastInvoice
            ? {
                order_number: invStat.lastInvoice.invoice_number,
                order_date: invStat.lastInvoice.invoice_date || invStat.lastInvoice.created_at,
                final_price: invStat.lastInvoice.grand_total,
                status: invStat.lastInvoice.status,
              }
            : null)

        return {
          ...c,
          total_invoices_count: invStat?.count || 0,
          total_invoiced_amount: Math.round((invStat?.totalBilled || 0) * 100) / 100,
          total_paid_amount: Math.round((invStat?.totalPaid || 0) * 100) / 100,
          total_due_balance: Math.round((invStat?.totalDue || 0) * 100) / 100,
          last_payment_date: lastPay?.payment_date || lastPay?.created_at || null,
          last_payment_amount: lastPay ? Number(lastPay.amount) || 0 : null,
          last_order_date: lastOrd?.order_date || lastOrd?.created_at || null,
          last_order_number: lastOrd?.order_number || null,
        }
      })

      // Optional client-requested in-memory sorting by financial attributes
      if (options.sortBy === 'billed') {
        enriched.sort((a, b) => (b.total_invoiced_amount || 0) - (a.total_invoiced_amount || 0))
      } else if (options.sortBy === 'due') {
        enriched.sort((a, b) => (b.total_due_balance || 0) - (a.total_due_balance || 0))
      } else if (options.sortBy === 'latest_order') {
        enriched.sort((a, b) => {
          const timeA = a.last_order_date ? new Date(a.last_order_date).getTime() : 0
          const timeB = b.last_order_date ? new Date(b.last_order_date).getTime() : 0
          return timeB - timeA
        })
      }

      return buildPaginatedResponse(enriched, count || 0, page, pageSize)
    })
  }

  /**
   * Retrieves single customer by ID (Authoritative PostgreSQL)
   */
  static async getCustomerById(id: string, companyId: string): Promise<CustomerRecord | null> {
    if (isSupabaseConfigured()) {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('customers')
        .select('*')
        .eq('id', id)
        .eq('company_id', companyId)
        .maybeSingle()

      if (error) {
        throw new Error(`Failed to fetch customer ${id}: ${error.message}`)
      }

      if (data) {
        try {
          const fin = await this.getCustomerFinancialSummary(companyId, id)
          return {
            ...(data as CustomerRecord),
            total_invoices_count: fin.totalInvoices,
            total_invoiced_amount: fin.totalInvoiceAmount,
            total_paid_amount: fin.totalPaid,
            total_due_balance: fin.totalDue,
            last_payment_date: fin.lastPayment?.date || null,
            last_payment_amount: fin.lastPayment?.amount || null,
            last_order_date: fin.lastOrder?.date || null,
            last_order_number: fin.lastOrder?.orderNumber || null,
          }
        } catch {
          return data as unknown as CustomerRecord
        }
      }
      return null
    }

    if (isTestMode()) {
      return (PrintERPDataStore.get<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS) || []).find((c: CustomerRecord) => c.id === id && c.company_id === companyId) || null
    }

    throw new Error('Authoritative database connection is required to fetch customer profile.')
  }

  /**
   * Creates a customer profile (Authoritative PostgreSQL)
   */
  static async createCustomer(
    customer: Partial<CustomerRecord> & { company_id: string; name: string; mobile?: string }
  ): Promise<CustomerRecord> {
    if (!isSupabaseConfigured()) {
      if (isTestMode()) {
        const newRecord: any = {
          id: customer.id || `cust-${Date.now()}`,
          ...customer,
          is_active: customer.is_active !== undefined ? customer.is_active : true,
          created_at: customer.created_at || new Date().toISOString(),
          updated_at: customer.updated_at || new Date().toISOString(),
        }
        const existingList = PrintERPDataStore.get<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS) || []
        PrintERPDataStore.set(STORAGE_KEYS.CUSTOMERS, [...existingList, newRecord])
        return newRecord as CustomerRecord
      }
      throw new Error('Authoritative database connection is required to create a customer.')
    }

    const customerType = customer.customer_type || customer.customer_category || 'regular'
    const payload: any = {
      id: customer.id || `cust-${Date.now()}`,
      company_id: customer.company_id,
      name: customer.name.trim(),
      name_bn: customer.name_bn?.trim() || null,
      company_name: customer.company_name?.trim() || null,
      customer_type: customerType,
      contact_person: customer.contact_person?.trim() || null,
      mobile: customer.mobile?.trim() || '',
      whatsapp: customer.whatsapp?.trim() || null,
      email: customer.email?.trim().toLowerCase() || null,
      division_id: customer.division_id || null,
      district_id: customer.district_id || null,
      upazila_id: customer.upazila_id || null,
      area: customer.area?.trim() || null,
      address: customer.address?.trim() || null,
      address_bn: customer.address_bn?.trim() || null,
      bin_no: customer.bin_no?.trim() || null,
      tin_no: customer.tin_no?.trim() || null,
      credit_limit: typeof customer.credit_limit === 'number' ? customer.credit_limit : 0,
      payment_terms: customer.payment_terms || 'cash_on_delivery',
      notes: customer.notes?.trim() || null,
      tags: customer.tags || [],
      is_active: customer.is_active !== undefined ? customer.is_active : true,
      created_at: customer.created_at || new Date().toISOString(),
      updated_at: customer.updated_at || new Date().toISOString(),
    }

    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('customers')
      .insert(payload)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create customer: ${error.message}`)
    }
    const createdRecord = data as unknown as CustomerRecord
    return {
      ...createdRecord,
      customer_category: (createdRecord.customer_type as any) || 'regular',
    }
  }

  /**
   * Updates a customer profile (Authoritative PostgreSQL)
   */
  static async updateCustomer(
    id: string,
    updates: Partial<CustomerRecord>,
    companyId: string
  ): Promise<CustomerRecord> {
    if (!isSupabaseConfigured()) {
      if (isTestMode()) {
        const list = PrintERPDataStore.get<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS) || []
        const index = list.findIndex((c) => c.id === id && c.company_id === companyId)
        if (index === -1) {
          throw new Error(`Customer ${id} not found`)
        }
        const updated = { ...list[index], ...updates, updated_at: new Date().toISOString() }
        list[index] = updated as CustomerRecord
        PrintERPDataStore.set(STORAGE_KEYS.CUSTOMERS, list)
        return updated as CustomerRecord
      }
      throw new Error('Authoritative database connection is required to update a customer.')
    }

    const payload: any = { ...updates, updated_at: new Date().toISOString() }
    if (payload.customer_category && !payload.customer_type) {
      payload.customer_type = payload.customer_category
    }
    delete payload.customer_category
    delete payload.id
    delete payload.company_id

    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('customers')
      .update(payload)
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update customer: ${error.message}`)
    }
    const updatedRecord = data as unknown as CustomerRecord
    return {
      ...updatedRecord,
      customer_category: (updatedRecord.customer_type as any) || 'regular',
    }
  }

  /**
   * Deletes a customer profile (Authoritative PostgreSQL)
   * Prevents physical deletion if historical invoices, payments, quotes, or orders exist.
   */
  static async deleteCustomer(id: string, companyId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      if (isTestMode()) {
        const list = PrintERPDataStore.get<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS) || []
        PrintERPDataStore.set(
          STORAGE_KEYS.CUSTOMERS,
          list.filter((c) => !(c.id === id && c.company_id === companyId))
        )
        return true
      }
      throw new Error('Authoritative database connection is required to delete customer records.')
    }

    const supabase = await createClient()

    // 1. Check for historical business records
    const [invCheck, payCheck, quoCheck, ordCheck] = await Promise.all([
      (supabase as any).from('invoices').select('id').eq('company_id', companyId).eq('customer_id', id).limit(1),
      (supabase as any).from('payments').select('id').eq('company_id', companyId).eq('customer_id', id).limit(1),
      (supabase as any).from('quotations').select('id').eq('company_id', companyId).eq('customer_id', id).limit(1),
      (supabase as any).from('sales_orders').select('id').eq('company_id', companyId).eq('customer_id', id).limit(1),
    ])

    const hasHistory =
      (invCheck.data && invCheck.data.length > 0) ||
      (payCheck.data && payCheck.data.length > 0) ||
      (quoCheck.data && quoCheck.data.length > 0) ||
      (ordCheck.data && ordCheck.data.length > 0)

    if (hasHistory) {
      throw new Error(
        'Cannot permanently delete a customer with existing transaction history (invoices, payments, quotations, or orders). Please deactivate the customer profile instead to preserve accounting records.'
      )
    }

    const { error } = await (supabase as any)
      .from('customers')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId)

    if (error) {
      throw new Error(`Failed to delete customer: ${error.message}`)
    }
    return true
  }

  /**
   * Toggles customer active / inactive status (Deactivation)
   */
  static async toggleCustomerActive(id: string, companyId: string, isActive: boolean): Promise<CustomerRecord> {
    if (!isSupabaseConfigured()) {
      if (isTestMode()) {
        const list = PrintERPDataStore.get<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS) || []
        const index = list.findIndex((c) => c.id === id && c.company_id === companyId)
        if (index === -1) {
          throw new Error(`Customer ${id} not found`)
        }
        const updated = { ...list[index], is_active: isActive, updated_at: new Date().toISOString() }
        list[index] = updated as CustomerRecord
        PrintERPDataStore.set(STORAGE_KEYS.CUSTOMERS, list)
        return updated as CustomerRecord
      }
      throw new Error('Authoritative database connection is required to toggle customer active status.')
    }

    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('customers')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update customer active status: ${error.message}`)
    }
    return data as unknown as CustomerRecord
  }

  // ==============================================================================
  // CUSTOMER RATES & PRICING ENGINE (3-TIER PRIORITY RESOLUTION)
  // ==============================================================================

  /**
   * Fetches explicitly configured custom rates for a customer
   */
  static async getCustomerRates(companyId: string, customerId: string): Promise<CustomerRateRecord[]> {
    if (!isSupabaseConfigured()) {
      return []
    }
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('customer_rates')
      .select('*')
      .eq('company_id', companyId)
      .eq('customer_id', customerId)

    if (error) {
      return []
    }
    return (data || []) as CustomerRateRecord[]
  }

  /**
   * Upserts a customer-specific product rate
   * Critical Rule: This NEVER modifies historical invoice records.
   */
  static async upsertCustomerRate(
    companyId: string,
    customerId: string,
    productId: string,
    rate: number,
    notes?: string | null
  ): Promise<CustomerRateRecord> {
    const payload = {
      company_id: companyId,
      customer_id: customerId,
      product_id: productId,
      rate: Number(rate),
      notes: notes?.trim() || null,
      updated_at: new Date().toISOString(),
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient()
        const { data, error } = await (supabase as any)
          .from('customer_rates')
          .upsert(payload, { onConflict: 'company_id,customer_id,product_id' })
          .select()
          .single()

        if (error) {
          throw new Error(`Failed to save customer rate: ${error.message}`)
        }
        if (isTestMode()) {
          PrintERPDataStore.addItem(STORAGE_KEYS.CUSTOMER_RATES, data)
        }
        return data as CustomerRateRecord
      } catch (err: any) {
        if (isTestMode()) {
          const testItem: CustomerRateRecord = {
            id: `rate-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            created_at: new Date().toISOString(),
            ...payload,
          } as CustomerRateRecord
          PrintERPDataStore.addItem(STORAGE_KEYS.CUSTOMER_RATES, testItem)
          return testItem
        }
        throw err
      }
    }

    const testItem: CustomerRateRecord = {
      id: `rate-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      created_at: new Date().toISOString(),
      ...payload,
    } as CustomerRateRecord
    PrintERPDataStore.addItem(STORAGE_KEYS.CUSTOMER_RATES, testItem)
    return testItem
  }

  /**
   * Deletes / resets a custom rate override
   */
  static async deleteCustomerRate(companyId: string, customerId: string, productId: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient()
        const { error } = await (supabase as any)
          .from('customer_rates')
          .delete()
          .eq('company_id', companyId)
          .eq('customer_id', customerId)
          .eq('product_id', productId)

        if (error) {
          throw new Error(`Failed to remove customer rate: ${error.message}`)
        }
      } catch (err) {
        if (!isTestMode()) throw err
      }
    }
    if (isTestMode()) {
      const rates = PrintERPDataStore.get<any[]>(STORAGE_KEYS.CUSTOMER_RATES) || []
      PrintERPDataStore.set(
        STORAGE_KEYS.CUSTOMER_RATES,
        rates.filter(
          (r) => !(r.company_id === companyId && r.customer_id === customerId && r.product_id === productId)
        )
      )
    }
    return true
  }

  /**
   * Resolves rates for ALL active products for a specific customer
   *
   * Rate Priority Resolution Hierarchy:
   * 1. Customer-specific rate (from customer_rates)
   *      ↓
   * 2. Last valid invoice rate for this customer + exact product (from invoice_items + invoices, excluding cancelled)
   *      ↓
   * 3. Product catalog default rate (from products.selling_price)
   */
  static async resolveCustomerRates(companyId: string, customerId: string): Promise<ResolvedProductRate[]> {
    return measureAsync(`CustomerRepository.resolveCustomerRates(${customerId})`, async () => {
      // 1. Get all active products
      const products = await ProductRepository.getProducts(companyId, true)

      // 2. Get customer record & configured custom rates
      const customer = await this.getCustomerById(customerId, companyId)
      const customerType = customer?.customer_type || customer?.customer_category || 'retail'

      const pricingRules = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.PRICING_RULES) || []).filter(
        (r) => (!r.company_id || r.company_id === companyId) && r.customer_type === customerType && r.status === 'active'
      )

      const customRates = await this.getCustomerRates(companyId, customerId)
      const customRateMap = new Map<string, CustomerRateRecord>()
      for (const cr of customRates) {
        customRateMap.set(cr.product_id, cr)
      }

      // 3. Query most recent valid invoice items for this customer + products
      const lastInvoiceRateMap = new Map<
        string,
        { rate: number; invoiceNumber: string; invoiceDate: string }
      >()

      if (isSupabaseConfigured()) {
        const supabase = await createClient()
        const { data: validInvoices } = await (supabase as any)
          .from('invoices')
          .select(`
            id,
            invoice_number,
            invoice_date,
            status,
            created_at,
            items:invoice_items (
              product_id,
              item_description,
              unit_price
            )
          `)
          .eq('company_id', companyId)
          .eq('customer_id', customerId)
          .neq('status', 'cancelled')
          .order('invoice_date', { ascending: false })
          .order('created_at', { ascending: false })

        for (const inv of validInvoices || []) {
          for (const it of inv.items || []) {
            const unitPrice = Number(it.unit_price) || 0
            if (unitPrice > 0) {
              if (it.product_id && !lastInvoiceRateMap.has(it.product_id)) {
                lastInvoiceRateMap.set(it.product_id, {
                  rate: unitPrice,
                  invoiceNumber: inv.invoice_number,
                  invoiceDate: inv.invoice_date,
                })
              }
              if (it.item_description) {
                const descKey = it.item_description.trim().toLowerCase()
                if (!lastInvoiceRateMap.has(descKey)) {
                  lastInvoiceRateMap.set(descKey, {
                    rate: unitPrice,
                    invoiceNumber: inv.invoice_number,
                    invoiceDate: inv.invoice_date,
                  })
                }
              }
            }
          }
        }
      }

      // 4. Resolve rates according to 3-tier hierarchy
      const resolvedList: ResolvedProductRate[] = products.map((prod) => {
        const customEntry = customRateMap.get(prod.id)
        const customRate = customEntry !== undefined ? Number(customEntry.rate) : null

        const lastInvEntry =
          lastInvoiceRateMap.get(prod.id) ||
          lastInvoiceRateMap.get(prod.name.trim().toLowerCase()) ||
          null

        const lastInvoiceRate = lastInvEntry ? lastInvEntry.rate : null
        const defaultRate = Number(prod.selling_price) || 0

        const typeRule = pricingRules.find((r) => r.product_id === prod.id || (!r.product_id && r.category === prod.category))
        const typeRulePrice = typeRule && typeRule.calculated_price !== undefined ? Number(typeRule.calculated_price) : null

        let effectiveRate = defaultRate
        let source: 'custom' | 'last_invoice' | 'default' = 'default'

        if (customRate !== null && customRate !== undefined) {
          effectiveRate = customRate
          source = 'custom'
        } else if (typeRulePrice !== null && typeRulePrice !== undefined) {
          effectiveRate = typeRulePrice
          source = 'custom'
        } else if (lastInvoiceRate !== null && lastInvoiceRate !== undefined) {
          effectiveRate = lastInvoiceRate
          source = 'last_invoice'
        } else {
          effectiveRate = defaultRate
          source = 'default'
        }

        return {
          productId: prod.id,
          productName: prod.name,
          productNameBn: prod.name_bn,
          sku: prod.sku,
          unit: prod.unit,
          category: prod.category,
          customerRate: customRate,
          lastInvoiceRate,
          lastInvoiceNumber: lastInvEntry?.invoiceNumber || null,
          lastInvoiceDate: lastInvEntry?.invoiceDate || null,
          defaultRate,
          effectiveRate,
          source,
          hasCustomRate: customRate !== null,
        }
      })

      return resolvedList
    })
  }

  // ==============================================================================
  // FINANCIAL SUMMARY & CONSISTENCY (Authoritative PostgreSQL Calculations)
  // ==============================================================================

  /**
   * Authoritative calculation of financial metrics
   * Total Invoiced - Total Paid = Total Due
   * Calculates Total Due vs True Overdue, Credit Limit, and Available Credit
   */
  static async getCustomerFinancialSummary(
    companyId: string,
    customerId: string
  ): Promise<CustomerFinancialSummary> {
    return measureAsync(`CustomerRepository.getCustomerFinancialSummary(${customerId})`, async () => {
      const todayStr = getTodayDateString()

      if (!isSupabaseConfigured()) {
        const allInvs = PrintERPDataStore.get<any[]>(STORAGE_KEYS.INVOICES) || []
        const custInvs = allInvs.filter((i) => i.customer_id === customerId && i.status !== 'cancelled')

        let totalInvoices = 0
        let totalInvoiceAmount = 0
        let totalPaid = 0
        let totalDue = 0
        let totalOverdue = 0

        for (const inv of custInvs) {
          totalInvoices++
          totalInvoiceAmount += Number(inv.grand_total) || 0
          totalPaid += Number(inv.paid_amount) || 0
          const due = Number(inv.due_amount) || 0
          totalDue += due
          if (due > 0 && inv.due_date && inv.due_date.split('T')[0] < todayStr) {
            totalOverdue += due
          }
        }

        const allCusts = PrintERPDataStore.get<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS) || []
        const customer = allCusts.find((c) => c.id === customerId)
        const creditLimit = Number(customer?.credit_limit) || 0
        const availableCredit = Math.max(0, creditLimit - totalDue)

        return {
          totalInvoices,
          totalInvoiceAmount: Math.round(totalInvoiceAmount * 100) / 100,
          totalPaid: Math.round(totalPaid * 100) / 100,
          totalDue: Math.round(totalDue * 100) / 100,
          totalOverdue: Math.round(totalOverdue * 100) / 100,
          creditLimit,
          availableCredit: Math.round(availableCredit * 100) / 100,
          paymentTerms: customer?.payment_terms || 'cash_on_delivery',
          lastPayment: null,
          lastOrder: null,
        }
      }

      const supabase = await createClient()

      // 1. Fetch valid non-cancelled invoices
      const { data: invoices, error: invErr } = await (supabase as any)
        .from('invoices')
        .select('id, invoice_number, invoice_date, due_date, grand_total, paid_amount, due_amount, write_off_amount, status, created_at')
        .eq('company_id', companyId)
        .eq('customer_id', customerId)
        .neq('status', 'cancelled')
        .order('invoice_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (invErr) {
        throw new Error(`Failed to fetch customer invoices: ${invErr.message}`)
      }

      let totalInvoices = 0
      let totalInvoiceAmount = 0
      let totalPaid = 0
      let totalDue = 0
      let totalOverdue = 0

      for (const inv of invoices || []) {
        totalInvoices++
        totalInvoiceAmount += Number(inv.grand_total) || 0
        totalPaid += Number(inv.paid_amount) || 0
        const due = Number(inv.due_amount) || 0
        totalDue += due
        if (due > 0 && inv.due_date && inv.due_date.split('T')[0] < todayStr) {
          totalOverdue += due
        }
      }

      // 2. Fetch payments
      const { data: payments, error: payErr } = await (supabase as any)
        .from('payments')
        .select('id, receipt_number, payment_date, amount, payment_method, created_at')
        .eq('company_id', companyId)
        .eq('customer_id', customerId)
        .order('payment_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (payErr) {
        throw new Error(`Failed to fetch customer payments: ${payErr.message}`)
      }

      // Latest payment record
      let lastPayment: CustomerFinancialSummary['lastPayment'] = null
      if (payments && payments.length > 0) {
        const p = payments[0]
        lastPayment = {
          amount: Number(p.amount) || 0,
          date: p.payment_date || p.created_at,
          receiptNumber: p.receipt_number,
          paymentMethod: p.payment_method,
        }
      }

      // Latest order / invoice record
      let lastOrder: CustomerFinancialSummary['lastOrder'] = null

      const { data: orders } = await (supabase as any)
        .from('sales_orders')
        .select('order_number, order_date, final_price, status, created_at')
        .eq('company_id', companyId)
        .eq('customer_id', customerId)
        .neq('status', 'cancelled')
        .order('order_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)

      if (orders && orders.length > 0) {
        const o = orders[0]
        lastOrder = {
          orderNumber: o.order_number,
          date: o.order_date || o.created_at,
          amount: Number(o.final_price) || 0,
          status: o.status,
        }
      } else if (invoices && invoices.length > 0) {
        const inv = invoices[0]
        lastOrder = {
          orderNumber: inv.invoice_number,
          date: inv.invoice_date || inv.created_at,
          amount: Number(inv.grand_total) || 0,
          status: inv.status,
        }
      }

      // Customer credit limit & terms
      const { data: customer } = await (supabase as any)
        .from('customers')
        .select('credit_limit, payment_terms')
        .eq('id', customerId)
        .eq('company_id', companyId)
        .maybeSingle()

      const creditLimit = Number(customer?.credit_limit) || 0
      const availableCredit = Math.max(0, creditLimit - totalDue)
      const paymentTerms = customer?.payment_terms || 'cash_on_delivery'

      return {
        totalInvoices,
        totalInvoiceAmount: Math.round(totalInvoiceAmount * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        totalDue: Math.round(totalDue * 100) / 100,
        totalOverdue: Math.round(totalOverdue * 100) / 100,
        creditLimit,
        availableCredit: Math.round(availableCredit * 100) / 100,
        paymentTerms,
        lastPayment,
        lastOrder,
      }
    })
  }

  // ==============================================================================
  // PRODUCT PURCHASE ANALYTICS
  // ==============================================================================

  /**
   * Aggregates product purchase history from valid non-cancelled invoice lines
   */
  static async getCustomerProductPurchases(
    companyId: string,
    customerId: string,
    options: {
      timeframe?: 'week' | 'month' | 'year' | 'all' | 'custom'
      startDate?: string
      endDate?: string
      sortBy?: 'quantity' | 'amount' | 'recent' | 'name'
      sortOrder?: 'asc' | 'desc'
    } = {}
  ): Promise<CustomerProductPurchaseStat[]> {
    return measureAsync(`CustomerRepository.getCustomerProductPurchases(${customerId})`, async () => {
      if (!isSupabaseConfigured()) {
        return []
      }

      const supabase = await createClient()

      // 1. Calculate date boundaries
      let startFilter: string | null = null
      let endFilter: string | null = null

      const now = new Date()

      if (options.timeframe === 'week') {
        const d = new Date(now)
        d.setDate(d.getDate() - 7)
        startFilter = d.toISOString().split('T')[0]
      } else if (options.timeframe === 'month') {
        const d = new Date(now)
        d.setDate(d.getDate() - 30)
        startFilter = d.toISOString().split('T')[0]
      } else if (options.timeframe === 'year') {
        const d = new Date(now)
        d.setDate(d.getDate() - 365)
        startFilter = d.toISOString().split('T')[0]
      } else if (options.timeframe === 'custom' && options.startDate) {
        startFilter = options.startDate
        endFilter = options.endDate || null
      }

      // 2. Fetch valid invoices
      let query = (supabase as any)
        .from('invoices')
        .select(`
          id,
          invoice_number,
          invoice_date,
          status,
          items:invoice_items (
            product_id,
            item_description,
            quantity,
            unit,
            unit_price,
            total_price
          )
        `)
        .eq('company_id', companyId)
        .eq('customer_id', customerId)
        .neq('status', 'cancelled')

      if (startFilter) {
        query = query.gte('invoice_date', startFilter)
      }
      if (endFilter) {
        query = query.lte('invoice_date', endFilter)
      }

      const { data: invoices, error } = await query

      if (error) {
        throw new Error(`Failed to fetch product purchase analytics: ${error.message}`)
      }

      // 3. Aggregate by product / description
      const aggMap = new Map<string, CustomerProductPurchaseStat>()

      for (const inv of invoices || []) {
        for (const it of inv.items || []) {
          const key = it.product_id || it.item_description.trim().toLowerCase()
          const qty = Number(it.quantity) || 0
          const totalAmt = Number(it.total_price) || qty * (Number(it.unit_price) || 0)
          const unitRate = Number(it.unit_price) || 0
          const invDate = inv.invoice_date

          if (!aggMap.has(key)) {
            aggMap.set(key, {
              productId: it.product_id || key,
              productName: it.item_description || 'Custom Print Service',
              productNameBn: null,
              unit: it.unit || 'sft',
              totalQuantity: qty,
              totalAmount: totalAmt,
              lastRate: unitRate,
              lastPurchaseDate: invDate,
              invoiceCount: 1,
            })
          } else {
            const existing = aggMap.get(key)!
            existing.totalQuantity += qty
            existing.totalAmount += totalAmt
            existing.invoiceCount += 1
            if (new Date(invDate) >= new Date(existing.lastPurchaseDate)) {
              existing.lastPurchaseDate = invDate
              existing.lastRate = unitRate
            }
          }
        }
      }

      let results = Array.from(aggMap.values())

      // 4. Sort results
      const sortBy = options.sortBy || 'amount'
      const sortOrder = options.sortOrder || 'desc'
      const mul = sortOrder === 'asc' ? 1 : -1

      results.sort((a, b) => {
        if (sortBy === 'quantity') return (a.totalQuantity - b.totalQuantity) * mul
        if (sortBy === 'recent')
          return (new Date(a.lastPurchaseDate).getTime() - new Date(b.lastPurchaseDate).getTime()) * mul
        if (sortBy === 'name') return a.productName.localeCompare(b.productName) * mul
        return (a.totalAmount - b.totalAmount) * mul
      })

      return results
    })
  }

  // ==============================================================================
  // CUSTOMER TIMELINE / ACTIVITY (Unified chronological lifecycle feed)
  // ==============================================================================

  static async getCustomerTimeline(companyId: string, customerId: string): Promise<CustomerTimelineEvent[]> {
    return measureAsync(`CustomerRepository.getCustomerTimeline(${customerId})`, async () => {
      if (!isSupabaseConfigured()) {
        return []
      }

      const supabase = await createClient()
      const events: CustomerTimelineEvent[] = []

      // 1. Customer Creation & Update
      const { data: customer } = await (supabase as any)
        .from('customers')
        .select('name, created_at, updated_at')
        .eq('id', customerId)
        .eq('company_id', companyId)
        .maybeSingle()

      if (customer) {
        events.push({
          id: `evt-cust-created-${customerId}`,
          type: 'customer_created',
          title: 'Customer Profile Created',
          description: `Customer ${customer.name} was registered into the system.`,
          timestamp: customer.created_at,
          referenceType: 'customer',
          referenceId: customerId,
        })

        if (customer.updated_at && customer.updated_at !== customer.created_at) {
          events.push({
            id: `evt-cust-updated-${customerId}`,
            type: 'customer_updated',
            title: 'Customer Details Updated',
            description: 'Contact information or profile attributes were updated.',
            timestamp: customer.updated_at,
            referenceType: 'customer',
            referenceId: customerId,
          })
        }
      }

      // 2. Quotations
      const { data: quotes } = await (supabase as any)
        .from('quotations')
        .select('id, quotation_number, quotation_date, grand_total, status, salesperson_name, created_at')
        .eq('company_id', companyId)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(10)

      for (const q of quotes || []) {
        events.push({
          id: `evt-quo-${q.id}`,
          type: 'quotation_created',
          title: `Quotation ${q.quotation_number} Issued`,
          description: `Total: ৳${Number(q.grand_total).toLocaleString('en-IN')} (Status: ${q.status})`,
          timestamp: q.created_at || q.quotation_date,
          amount: Number(q.grand_total),
          referenceId: q.id,
          referenceNumber: q.quotation_number,
          referenceType: 'quotation',
          actorName: q.salesperson_name,
          status: q.status,
        })
      }

      // 3. Invoices
      const { data: invoices } = await (supabase as any)
        .from('invoices')
        .select('id, invoice_number, invoice_date, grand_total, status, created_by_name, created_at')
        .eq('company_id', companyId)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(15)

      for (const inv of invoices || []) {
        events.push({
          id: `evt-inv-${inv.id}`,
          type: 'invoice_created',
          title: `Invoice ${inv.invoice_number} Generated`,
          description: `Billed Amount: ৳${Number(inv.grand_total).toLocaleString('en-IN')} (Status: ${inv.status})`,
          timestamp: inv.created_at || inv.invoice_date,
          amount: Number(inv.grand_total),
          referenceId: inv.id,
          referenceNumber: inv.invoice_number,
          referenceType: 'invoice',
          actorName: inv.created_by_name,
          status: inv.status,
        })
      }

      // 4. Payments
      const { data: payments } = await (supabase as any)
        .from('payments')
        .select('id, receipt_number, payment_date, amount, payment_method, received_by_name, created_at')
        .eq('company_id', companyId)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(15)

      for (const p of payments || []) {
        events.push({
          id: `evt-pay-${p.id}`,
          type: 'payment_received',
          title: `Payment Received (MR #${p.receipt_number})`,
          description: `Collected ৳${Number(p.amount).toLocaleString('en-IN')} via ${p.payment_method.toUpperCase()}`,
          timestamp: p.created_at || p.payment_date,
          amount: Number(p.amount),
          referenceId: p.id,
          referenceNumber: p.receipt_number,
          referenceType: 'payment',
          actorName: p.received_by_name,
        })
      }

      // 5. Orders
      const { data: orders } = await (supabase as any)
        .from('sales_orders')
        .select('id, order_number, order_date, final_price, status, created_at')
        .eq('company_id', companyId)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(10)

      for (const o of orders || []) {
        events.push({
          id: `evt-ord-${o.id}`,
          type: 'order_created',
          title: `Sales Order ${o.order_number} Created`,
          description: `Order Total: ৳${Number(o.final_price).toLocaleString('en-IN')} (Status: ${o.status})`,
          timestamp: o.created_at || o.order_date,
          amount: Number(o.final_price),
          referenceId: o.id,
          referenceNumber: o.order_number,
          referenceType: 'order',
          status: o.status,
        })
      }

      // 6. Communications
      const { data: comms } = await (supabase as any)
        .from('customer_communications')
        .select('id, type, summary, details, created_at')
        .eq('company_id', companyId)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(10)

      for (const c of comms || []) {
        events.push({
          id: `evt-comm-${c.id}`,
          type: 'communication_logged',
          title: `Logged ${c.type.replace('_', ' ').toUpperCase()}`,
          description: c.summary,
          timestamp: c.created_at,
          referenceType: 'customer',
          referenceId: customerId,
        })
      }

      // Sort chronological descending
      events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      return events
    })
  }

  // ==============================================================================
  // COMMUNICATIONS
  // ==============================================================================

  static async getCommunications(customerId: string, companyId: string): Promise<CustomerCommunication[]> {
    if (!isSupabaseConfigured()) {
      return []
    }
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('customer_communications')
      .select('*')
      .eq('customer_id', customerId)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (error) {
      return []
    }
    return (data || []) as unknown as CustomerCommunication[]
  }

  static async addCommunication(comm: {
    company_id: string
    customer_id: string
    type: 'phone_call' | 'whatsapp_message' | 'email' | 'meeting' | 'site_visit'
    summary: string
    details?: string | null
    logged_by?: string | null
  }): Promise<CustomerCommunication> {
    if (!isSupabaseConfigured()) {
      return {
        id: `comm-${Date.now()}`,
        created_at: new Date().toISOString(),
        ...comm,
      } as CustomerCommunication
    }

    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('customer_communications')
      .insert(comm)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to log customer communication: ${error.message}`)
    }
    return data as unknown as CustomerCommunication
  }
}
