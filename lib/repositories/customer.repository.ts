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

export class CustomerRepository {
  /**
   * Retrieves all customers for a tenant
   */
  static async getCustomers(companyId: string): Promise<CustomerRecord[]> {
    return measureAsync(`CustomerRepository.getCustomers(${companyId})`, async () => {
      try {
        const supabase = await createClient()
        const { data, error } = await (supabase as any)
          .from('customers')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })

        if (!error && data && data.length > 0) {
          return data as unknown as CustomerRecord[]
        }
      } catch {}

      const all = PrintERPDataStore.get<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS) || []
      return all.filter((c) => !c.company_id || c.company_id === companyId)
    })
  }

  /**
   * Summary KPI Statistics for the Customers List
   */
  static async getCustomersSummary(companyId: string): Promise<CustomerSummaryStatistics> {
    return measureAsync(`CustomerRepository.getCustomersSummary(${companyId})`, async () => {
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
   * Paginated & Filterable Customer Search
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
    } = {}
  ): Promise<PaginatedResult<CustomerRecord>> {
    return measureAsync(`CustomerRepository.getPaginatedCustomers(${companyId})`, async () => {
      const page = Math.max(1, options.page || 1)
      const pageSize = Math.min(100, Math.max(1, options.pageSize || 25))
      const offset = (page - 1) * pageSize

      const supabase = await createClient()

      // If filtering by due, first fetch customer IDs with outstanding due
      let dueCustomerIds: Set<string> | null = null
      if (options.dueFilter === 'has_due' || options.dueFilter === 'no_due') {
        const { data: dueInvoices } = await (supabase as any)
          .from('invoices')
          .select('customer_id, due_amount')
          .eq('company_id', companyId)
          .neq('status', 'cancelled')
          .gt('due_amount', 0)

        dueCustomerIds = new Set((dueInvoices || []).map((i: any) => i.customer_id).filter(Boolean))
      }

      let query = (supabase as any)
        .from('customers')
        .select('*', { count: 'exact' })
        .eq('company_id', companyId)

      if (options.search?.trim()) {
        const term = `%${options.search.trim()}%`
        query = query.or(`name.ilike.${term},name_bn.ilike.${term},contact_person.ilike.${term},mobile.ilike.${term},whatsapp.ilike.${term},area.ilike.${term}`)
      }

      if (options.customerType && options.customerType !== 'all') {
        query = query.eq('customer_type', options.customerType)
      }

      if (options.activeFilter === 'active') {
        query = query.eq('is_active', true)
      } else if (options.activeFilter === 'inactive') {
        query = query.eq('is_active', false)
      }

      if (options.dueFilter === 'has_due' && dueCustomerIds) {
        const ids = Array.from(dueCustomerIds)
        if (ids.length === 0) {
          return buildPaginatedResponse([], 0, page, pageSize)
        }
        query = query.in('id', ids)
      }

      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1)

      const { data, count, error } = await query

      if (error) {
        throw new Error(`Failed to fetch paginated customers: ${error.message}`)
      }

      let customers = (data || []) as unknown as CustomerRecord[]

      // If filtering for "no_due", apply post-filter
      if (options.dueFilter === 'no_due' && dueCustomerIds) {
        customers = customers.filter((c) => !dueCustomerIds!.has(c.id))
      }

      // Enrich customers with live due balances and last order/payment info
      const enriched = await Promise.all(
        customers.map(async (c) => {
          try {
            const fin = await this.getCustomerFinancialSummary(companyId, c.id)
            return {
              ...c,
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
            return c
          }
        })
      )

      return buildPaginatedResponse(enriched, count || 0, page, pageSize)
    })
  }

  /**
   * Retrieves single customer by ID
   */
  static async getCustomerById(id: string, companyId: string): Promise<CustomerRecord | null> {
    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('customers')
        .select('*')
        .eq('id', id)
        .eq('company_id', companyId)
        .maybeSingle()

      if (!error && data) {
        // Enrich with authoritative financial summary
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
    } catch {}

    const all = PrintERPDataStore.get<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS) || []
    return all.find((c) => c.id === id && (!c.company_id || c.company_id === companyId)) || null
  }

  /**
   * Creates a customer
   */
  static async createCustomer(customer: Partial<CustomerRecord> & { company_id: string; name: string; mobile?: string }): Promise<CustomerRecord> {
    const payload: any = {
      id: customer.id || `cust-${Date.now()}`,
      company_id: customer.company_id,
      name: customer.name.trim(),
      name_bn: customer.name_bn?.trim() || null,
      company_name: customer.company_name?.trim() || null,
      customer_type: customer.customer_type || customer.customer_category || 'regular',
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

    try {
      const supabase = await createClient()
      let { data, error } = await (supabase as any)
        .from('customers')
        .insert(payload)
        .select()
        .single()

      if (!error && data) {
        PrintERPDataStore.addItem(STORAGE_KEYS.CUSTOMERS, data)
        return data as unknown as CustomerRecord
      }
    } catch {}

    PrintERPDataStore.addItem(STORAGE_KEYS.CUSTOMERS, payload)
    return payload as CustomerRecord
  }

  /**
   * Updates a customer
   */
  static async updateCustomer(id: string, updates: Partial<CustomerRecord>, companyId: string): Promise<CustomerRecord> {
    const payload: any = { ...updates, updated_at: new Date().toISOString() }
    delete payload.id
    delete payload.company_id

    try {
      const supabase = await createClient()
      let { data, error } = await (supabase as any)
        .from('customers')
        .update(payload)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single()

      if (!error && data) {
        PrintERPDataStore.updateItem<CustomerRecord>(STORAGE_KEYS.CUSTOMERS, id, data)
        return data as unknown as CustomerRecord
      }
    } catch {}

    const updated = PrintERPDataStore.updateItem<CustomerRecord>(STORAGE_KEYS.CUSTOMERS, id, payload)
    if (updated) return updated
    return { id, company_id: companyId, ...payload } as CustomerRecord
  }

  /**
   * Deletes a customer
   */
  static async deleteCustomer(id: string, companyId: string): Promise<boolean> {
    const supabase = await createClient()
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

  // ==============================================================================
  // CUSTOMER RATES & PRICING ENGINE (3-TIER PRIORITY RESOLUTION)
  // ==============================================================================

  /**
   * Fetches explicitly configured custom rates for a customer
   */
  static async getCustomerRates(companyId: string, customerId: string): Promise<CustomerRateRecord[]> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('customer_rates')
      .select('*')
      .eq('company_id', companyId)
      .eq('customer_id', customerId)

    if (error) {
      // Table might not exist in some mocked environments, return empty array safely
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
    const supabase = await createClient()
    const payload = {
      company_id: companyId,
      customer_id: customerId,
      product_id: productId,
      rate: Number(rate),
      notes: notes?.trim() || null,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await (supabase as any)
      .from('customer_rates')
      .upsert(payload, { onConflict: 'company_id,customer_id,product_id' })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to save customer rate: ${error.message}`)
    }

    return data as CustomerRateRecord
  }

  /**
   * Deletes / resets a custom rate override
   */
  static async deleteCustomerRate(companyId: string, customerId: string, productId: string): Promise<boolean> {
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

      // 2. Get configured custom rates
      const customRates = await this.getCustomerRates(companyId, customerId)
      const customRateMap = new Map<string, CustomerRateRecord>()
      for (const cr of customRates) {
        customRateMap.set(cr.product_id, cr)
      }

      // 3. Query most recent valid invoice items for this customer + products
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

      // Build map of last valid invoice rate per product ID / name
      const lastInvoiceRateMap = new Map<
        string,
        { rate: number; invoiceNumber: string; invoiceDate: string }
      >()

      for (const inv of validInvoices || []) {
        for (const it of inv.items || []) {
          const unitPrice = Number(it.unit_price) || 0
          if (unitPrice > 0) {
            // Match by product_id if present
            if (it.product_id && !lastInvoiceRateMap.has(it.product_id)) {
              lastInvoiceRateMap.set(it.product_id, {
                rate: unitPrice,
                invoiceNumber: inv.invoice_number,
                invoiceDate: inv.invoice_date,
              })
            }
            // Also match by product description / name for invoices created before product_id linkage
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

        let effectiveRate = defaultRate
        let source: 'custom' | 'last_invoice' | 'default' = 'default'

        if (customRate !== null && customRate !== undefined) {
          effectiveRate = customRate
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
   */
  static async getCustomerFinancialSummary(
    companyId: string,
    customerId: string
  ): Promise<CustomerFinancialSummary> {
    return measureAsync(`CustomerRepository.getCustomerFinancialSummary(${customerId})`, async () => {
      const supabase = await createClient()

      // 1. Fetch valid non-cancelled invoices
      const { data: invoices, error: invErr } = await (supabase as any)
        .from('invoices')
        .select('id, invoice_number, invoice_date, grand_total, paid_amount, due_amount, write_off_amount, status, created_at')
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

      for (const inv of invoices || []) {
        totalInvoices++
        totalInvoiceAmount += Number(inv.grand_total) || 0
        totalPaid += Number(inv.paid_amount) || 0
        totalDue += Number(inv.due_amount) || 0
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

      // Check sales_orders first
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

      return {
        totalInvoices,
        totalInvoiceAmount: Math.round(totalInvoiceAmount * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        totalDue: Math.round(totalDue * 100) / 100,
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
          const totalAmt = Number(it.total_price) || (qty * (Number(it.unit_price) || 0))
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
        if (sortBy === 'recent') return (new Date(a.lastPurchaseDate).getTime() - new Date(b.lastPurchaseDate).getTime()) * mul
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
        })

        if (customer.updated_at && customer.updated_at !== customer.created_at) {
          events.push({
            id: `evt-cust-updated-${customerId}`,
            type: 'customer_updated',
            title: 'Customer Details Updated',
            description: 'Contact information or profile attributes were updated.',
            timestamp: customer.updated_at,
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
          actorName: p.received_by_name,
        })
      }

      // 5. Communications
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
