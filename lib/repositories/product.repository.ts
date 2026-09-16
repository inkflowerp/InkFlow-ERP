import { createClient } from '../supabase/server.ts'
import type {
  ProductRecord,
  ProductVariantRecord,
  ProductFormulaRecord,
  PriceListRecord,
  PriceListItemRecord,
  PriceHistoryRecord,
  ProductUsageStats,
  ResolvedProductPrice,
} from '../../types/product.types.ts'
import { measureAsync } from '../performance/logger.ts'
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

export class ProductRepository {
  /**
   * Retrieves products for a tenant (PostgreSQL Authoritative)
   */
  static async getProducts(
    companyId: string,
    activeOnly: boolean = false,
    category?: string,
    search?: string
  ): Promise<ProductRecord[]> {
    return measureAsync(`ProductRepository.getProducts(${companyId})`, async () => {
      if (!isSupabaseConfigured() || isTestMode()) {
        const prods = PrintERPDataStore.get<ProductRecord[]>(STORAGE_KEYS.PRODUCTS) || []
        let filtered = prods.filter((p) => !p.company_id || p.company_id === companyId)
        if (activeOnly) filtered = filtered.filter((p) => p.is_active !== false)
        if (category && category !== 'all') filtered = filtered.filter((p) => p.category === category || p.product_type === category)
        if (search && search.trim()) {
          const q = search.trim().toLowerCase()
          filtered = filtered.filter(
            (p) =>
              p.name.toLowerCase().includes(q) ||
              (p.name_bn && p.name_bn.includes(q)) ||
              p.sku.toLowerCase().includes(q) ||
              (p.material_spec && p.material_spec.toLowerCase().includes(q))
          )
        }
        return filtered
      }

      try {
        const supabase = await createClient()
        let query = (supabase as any)
          .from('products')
          .select('*, variants:product_variants(*), formulas:product_formulas(*)')
          .eq('company_id', companyId)
          .order('name', { ascending: true })

        if (activeOnly) {
          query = query.eq('is_active', true)
        }

        if (category && category !== 'all') {
          query = query.or(`category.eq.${category},product_type.eq.${category}`)
        }

        if (search && search.trim()) {
          const q = search.trim()
          query = query.or(`name.ilike.%${q}%,name_bn.ilike.%${q}%,sku.ilike.%${q}%,material_spec.ilike.%${q}%`)
        }

        const { data, error } = await query

        if (error) {
          throw new Error(`Failed to load products: ${error.message}`)
        }

        return (data || []) as ProductRecord[]
      } catch (err: any) {
        throw new Error(`Database error fetching products: ${err.message}`)
      }
    })
  }

  /**
   * Retrieves single product by ID or SKU with variants, formulas and usage statistics
   */
  static async getProductById(id: string, companyId: string): Promise<ProductRecord | null> {
    return measureAsync(`ProductRepository.getProductById(${id})`, async () => {
      if (!isSupabaseConfigured() || isTestMode()) {
        const prods = await this.getProducts(companyId, false)
        const found = prods.find((p) => (p.id === id || p.sku === id) && (!p.company_id || p.company_id === companyId)) || null
        if (found) {
          const variants = await this.getProductVariants(found.id, companyId)
          const formulas = await this.getProductFormulas(found.id, companyId)
          const stats = await this.getProductUsageStats(found.id, companyId)
          return { ...found, variants, formulas, usage_stats: stats }
        }
        return null
      }

      try {
        const supabase = await createClient()
        const { data, error } = await (supabase as any)
          .from('products')
          .select('*, variants:product_variants(*), formulas:product_formulas(*)')
          .or(`id.eq.${id},sku.eq.${id}`)
          .eq('company_id', companyId)
          .maybeSingle()

        if (error) {
          throw new Error(`Failed to fetch product: ${error.message}`)
        }

        if (!data) return null

        const prod = data as ProductRecord
        const stats = await this.getProductUsageStats(prod.id, companyId)
        return { ...prod, usage_stats: stats }
      } catch (err: any) {
        throw new Error(`Database error fetching product: ${err.message}`)
      }
    })
  }

  /**
   * Checks if SKU is unique within tenant
   */
  static async checkSkuUnique(companyId: string, sku: string, excludeProductId?: string): Promise<boolean> {
    const normalizedSku = sku.trim().toUpperCase()
    if (!normalizedSku) return false

    if (!isSupabaseConfigured()) {
      if (isTestMode()) {
        const prods = PrintERPDataStore.get<ProductRecord[]>(STORAGE_KEYS.PRODUCTS) || []
        const match = prods.find(
          (p) =>
            (!p.company_id || p.company_id === companyId) &&
            p.sku.toUpperCase() === normalizedSku &&
            p.id !== excludeProductId
        )
        return !match
      }
      return true
    }

    try {
      const supabase = await createClient()
      let query = (supabase as any)
        .from('products')
        .select('id')
        .eq('company_id', companyId)
        .ilike('sku', normalizedSku)

      if (excludeProductId) {
        query = query.neq('id', excludeProductId)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`SKU uniqueness check failed: ${error.message}`)
      }

      return !data || data.length === 0
    } catch (err: any) {
      if (isTestMode()) {
        const prods = PrintERPDataStore.get<ProductRecord[]>(STORAGE_KEYS.PRODUCTS) || []
        const match = prods.find(
          (p) =>
            (!p.company_id || p.company_id === companyId) &&
            p.sku.toUpperCase() === normalizedSku &&
            p.id !== excludeProductId
        )
        return !match
      }
      throw err
    }
  }

  /**
   * Creates a new Product/Service catalog item (Strict PostgreSQL Authority)
   */
  static async createProduct(product: Partial<ProductRecord> & {
    company_id: string
    name: string
    sku: string
    unit: any
    selling_price: number
  }): Promise<ProductRecord> {
    return measureAsync(`ProductRepository.createProduct(${product.name})`, async () => {
      const normalizedSku = product.sku.trim().toUpperCase()
      const isUnique = await this.checkSkuUnique(product.company_id, normalizedSku)
      if (!isUnique) {
        throw new Error(`Product with SKU '${normalizedSku}' already exists in your company catalog.`)
      }

      const payload: any = {
        company_id: product.company_id,
        branch_id: product.branch_id || null,
        name: product.name.trim(),
        name_bn: product.name_bn?.trim() || null,
        sku: normalizedSku,
        category: product.category || 'general_print',
        product_type: product.product_type || 'print_service',
        unit: product.unit,
        material_spec: product.material_spec?.trim() || null,
        description: product.description?.trim() || null,
        description_bn: product.description_bn?.trim() || null,
        dimensions_spec: product.dimensions_spec?.trim() || null,
        base_cost: Math.max(0, Number(product.base_cost) || 0),
        selling_price: Math.max(0, Number(product.selling_price) || 0),
        min_price: Math.max(0, Number(product.min_price) || 0),
        tax_rate: product.tax_rate !== undefined ? Number(product.tax_rate) : 7.5,
        pricing_formula: product.pricing_formula || null,
        requires_design: Boolean(product.requires_design),
        requires_approval: Boolean(product.requires_approval),
        requires_production: product.requires_production !== undefined ? Boolean(product.requires_production) : true,
        requires_fabrication: Boolean(product.requires_fabrication),
        requires_finishing: Boolean(product.requires_finishing),
        requires_installation: Boolean(product.requires_installation),
        requires_delivery: Boolean(product.requires_delivery),
        default_department: product.default_department || 'printing',
        estimated_production_time_hours: Number(product.estimated_production_time_hours) || 4.0,
        default_finishing: product.default_finishing?.trim() || null,
        production_instructions: product.production_instructions?.trim() || null,
        internal_notes: product.internal_notes?.trim() || null,
        is_active: product.is_active !== undefined ? product.is_active : true,
        created_by: product.created_by || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      if (!isSupabaseConfigured()) {
        if (isTestMode()) {
          const testRecord: ProductRecord = {
            id: product.id || `prd-test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            ...payload,
          }
          PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCTS, testRecord)
          return testRecord
        }
        throw new Error('Authoritative database connection is required to create a product.')
      }

      try {
        const supabase = await createClient()
        const { data, error } = await (supabase as any)
          .from('products')
          .insert(payload)
          .select()
          .single()

        if (error) {
          throw new Error(`Failed to save product in database: ${error.message}`)
        }

        if (!data) {
          throw new Error('Database insert succeeded but returned no record.')
        }

        // In test mode keep store synced
        if (isTestMode()) {
          PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCTS, data)
        }

        return data as ProductRecord
      } catch (err: any) {
        if (isTestMode() && !err.message.includes('already exists')) {
          const testRecord: ProductRecord = {
            id: product.id || `prd-test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            ...payload,
          }
          PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCTS, testRecord)
          return testRecord
        }
        throw err
      }
    })
  }

  /**
   * Updates an existing Product/Service catalog item
   */
  static async updateProduct(id: string, updates: Partial<ProductRecord>, companyId: string): Promise<ProductRecord> {
    return measureAsync(`ProductRepository.updateProduct(${id})`, async () => {
      if (updates.sku) {
        const normalizedSku = updates.sku.trim().toUpperCase()
        const isUnique = await this.checkSkuUnique(companyId, normalizedSku, id)
        if (!isUnique) {
          throw new Error(`SKU '${normalizedSku}' is already assigned to another product in your catalog.`)
        }
        updates.sku = normalizedSku
      }

      const payload: any = {
        ...updates,
        updated_at: new Date().toISOString(),
      }
      delete payload.id
      delete payload.company_id
      delete payload.variants
      delete payload.formulas
      delete payload.usage_stats

      if (payload.base_cost !== undefined) payload.base_cost = Math.max(0, Number(payload.base_cost))
      if (payload.selling_price !== undefined) payload.selling_price = Math.max(0, Number(payload.selling_price))
      if (payload.min_price !== undefined) payload.min_price = Math.max(0, Number(payload.min_price))
      if (payload.tax_rate !== undefined) payload.tax_rate = Number(payload.tax_rate)

      if (!isSupabaseConfigured()) {
        if (isTestMode()) {
          const prods = PrintERPDataStore.get<ProductRecord[]>(STORAGE_KEYS.PRODUCTS) || []
          const existing = prods.find((p) => p.id === id && (!p.company_id || p.company_id === companyId))
          if (!existing) throw new Error(`Product ${id} not found in tenant catalog.`)
          const updated = PrintERPDataStore.updateItem<ProductRecord>(STORAGE_KEYS.PRODUCTS, id, payload)
          if (!updated) throw new Error(`Product ${id} not found in test store`)
          return updated
        }
        throw new Error('Authoritative database connection is required to update a product.')
      }

      try {
        const supabase = await createClient()
        const { data, error } = await (supabase as any)
          .from('products')
          .update(payload)
          .eq('id', id)
          .eq('company_id', companyId)
          .select()
          .single()

        if (error) {
          throw new Error(`Failed to update product in database: ${error.message}`)
        }

        if (!data) {
          throw new Error(`Product ${id} not found in tenant catalog.`)
        }

        if (isTestMode()) {
          PrintERPDataStore.updateItem<ProductRecord>(STORAGE_KEYS.PRODUCTS, id, data)
        }

        return data as ProductRecord
      } catch (err: any) {
        if (isTestMode() && !err.message.includes('already assigned')) {
          const prods = PrintERPDataStore.get<ProductRecord[]>(STORAGE_KEYS.PRODUCTS) || []
          const existing = prods.find((p) => p.id === id && (!p.company_id || p.company_id === companyId))
          if (!existing) throw new Error(`Product ${id} not found in tenant catalog.`)
          const updated = PrintERPDataStore.updateItem<ProductRecord>(STORAGE_KEYS.PRODUCTS, id, payload)
          if (updated) return updated
        }
        throw err
      }
    })
  }

  /**
   * Archives or unarchives a product (sets is_active)
   */
  static async archiveProduct(id: string, isArchived: boolean, companyId: string): Promise<ProductRecord> {
    return this.updateProduct(id, { is_active: !isArchived }, companyId)
  }

  /**
   * Restores an archived product back to active status
   */
  static async restoreProduct(id: string, companyId: string): Promise<ProductRecord> {
    return this.archiveProduct(id, false, companyId)
  }

  /**
   * Checks if a product has active historical references preventing physical deletion
   */
  static async checkProductDeletionSafety(
    productId: string,
    companyId: string
  ): Promise<{
    isSafe: boolean
    references: { quotations: number; invoices: number; jobs: number; customerRates: number }
    reason?: string
  }> {
    if (!isSupabaseConfigured()) {
      if (isTestMode()) {
        const quotes = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.QUOTATIONS) || []).filter(
          (q) => (!q.company_id || q.company_id === companyId) && q.items?.some((i: any) => i.product_id === productId)
        )
        const invoices = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.INVOICES) || []).filter(
          (inv) => (!inv.company_id || inv.company_id === companyId) && inv.items?.some((i: any) => i.product_id === productId)
        )
        const jobs = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.PRODUCTION_TASKS) || []).filter(
          (t) => (!t.company_id || t.company_id === companyId) && t.product_id === productId
        )
        const customerRates = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.CUSTOMER_RATES) || []).filter(
          (r) => (!r.company_id || r.company_id === companyId) && r.product_id === productId
        )

        const totalRefs = quotes.length + invoices.length + jobs.length + customerRates.length
        return {
          isSafe: totalRefs === 0,
          references: {
            quotations: quotes.length,
            invoices: invoices.length,
            jobs: jobs.length,
            customerRates: customerRates.length,
          },
          reason:
            totalRefs > 0
              ? `This product is referenced in ${quotes.length} quotation(s), ${invoices.length} invoice(s), ${jobs.length} job(s), and ${customerRates.length} custom rate(s). Archiving is required to preserve financial records.`
              : undefined,
        }
      }
      return { isSafe: true, references: { quotations: 0, invoices: 0, jobs: 0, customerRates: 0 } }
    }

    try {
      const supabase = await createClient()

      const [qRes, invRes, jobRes, rateRes] = await Promise.all([
        (supabase as any).from('quotation_items').select('id', { count: 'exact', head: true }).eq('product_id', productId),
        (supabase as any).from('invoice_items').select('id', { count: 'exact', head: true }).eq('product_id', productId),
        (supabase as any).from('job_costings').select('id', { count: 'exact', head: true }).eq('product_id', productId),
        (supabase as any).from('customer_rates').select('id', { count: 'exact', head: true }).eq('product_id', productId),
      ])

      const quoteCount = qRes.count || 0
      const invoiceCount = invRes.count || 0
      const jobCount = jobRes.count || 0
      const rateCount = rateRes.count || 0

      const totalRefs = quoteCount + invoiceCount + jobCount + rateCount
      return {
        isSafe: totalRefs === 0,
        references: {
          quotations: quoteCount,
          invoices: invoiceCount,
          jobs: jobCount,
          customerRates: rateCount,
        },
        reason:
          totalRefs > 0
            ? `Protected product cannot be permanently deleted because it is referenced in ${quoteCount} quotation item(s), ${invoiceCount} invoice item(s), ${jobCount} job costing(s), and ${rateCount} customer rate(s). Archive instead.`
            : undefined,
      }
    } catch {
      return { isSafe: false, references: { quotations: 1, invoices: 0, jobs: 0, customerRates: 0 }, reason: 'Database reference verification failed. Archiving recommended.' }
    }
  }

  /**
   * Deletes a product or safely archives if referenced
   */
  static async deleteProduct(id: string, companyId: string): Promise<{ deleted: boolean; archived: boolean; message: string }> {
    return measureAsync(`ProductRepository.deleteProduct(${id})`, async () => {
      const safety = await this.checkProductDeletionSafety(id, companyId)

      if (!safety.isSafe) {
        // Automatically archive to protect financial integrity
        await this.archiveProduct(id, true, companyId)
        return {
          deleted: false,
          archived: true,
          message: safety.reason || 'Product has historical references and was safely deactivated/archived.',
        }
      }

      if (!isSupabaseConfigured()) {
        if (isTestMode()) {
          const prods = PrintERPDataStore.get<ProductRecord[]>(STORAGE_KEYS.PRODUCTS) || []
          const existing = prods.find((p) => p.id === id && (!p.company_id || p.company_id === companyId))
          if (!existing) throw new Error(`Product ${id} not found in tenant catalog.`)
          PrintERPDataStore.set(STORAGE_KEYS.PRODUCTS, prods.filter((p) => p.id !== id))
          return { deleted: true, archived: false, message: 'Product permanently deleted.' }
        }
        throw new Error('Authoritative database connection is required to delete a product.')
      }

      try {
        const supabase = await createClient()
        const { error } = await (supabase as any)
          .from('products')
          .delete()
          .eq('id', id)
          .eq('company_id', companyId)

        if (error) {
          throw new Error(`Database error during deletion: ${error.message}`)
        }

        if (isTestMode()) {
          const prods = PrintERPDataStore.get<ProductRecord[]>(STORAGE_KEYS.PRODUCTS) || []
          const existing = prods.find((p) => p.id === id && (!p.company_id || p.company_id === companyId))
          if (!existing) throw new Error(`Product ${id} not found in tenant catalog.`)
          PrintERPDataStore.set(STORAGE_KEYS.PRODUCTS, prods.filter((p) => p.id !== id))
        }

        return { deleted: true, archived: false, message: 'Product permanently deleted from catalog.' }
      } catch (err: any) {
        if (isTestMode()) {
          const prods = PrintERPDataStore.get<ProductRecord[]>(STORAGE_KEYS.PRODUCTS) || []
          const existing = prods.find((p) => p.id === id && (!p.company_id || p.company_id === companyId))
          if (!existing) throw new Error(`Product ${id} not found in tenant catalog.`)
          PrintERPDataStore.set(STORAGE_KEYS.PRODUCTS, prods.filter((p) => p.id !== id))
          return { deleted: true, archived: false, message: 'Product permanently deleted.' }
        }
        throw err
      }
    })
  }

  /**
   * Computes live usage statistics for product
   */
  static async getProductUsageStats(productId: string, companyId: string): Promise<ProductUsageStats> {
    if (!isSupabaseConfigured()) {
      if (isTestMode()) {
        const quotes = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.QUOTATIONS) || []).filter(
          (q) => (!q.company_id || q.company_id === companyId) && q.items?.some((i: any) => i.product_id === productId)
        )
        const invoices = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.INVOICES) || []).filter(
          (inv) => (!inv.company_id || inv.company_id === companyId) && inv.items?.some((i: any) => i.product_id === productId)
        )
        const jobs = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.PRODUCTION_TASKS) || []).filter(
          (t) => (!t.company_id || t.company_id === companyId) && t.product_id === productId
        )

        let totalRev = 0
        let lastDate: string | null = null
        for (const inv of invoices) {
          for (const it of inv.items || []) {
            if (it.product_id === productId) {
              totalRev += (Number(it.unit_price) || 0) * (Number(it.quantity) || 1)
              if (!lastDate || inv.invoice_date > lastDate) lastDate = inv.invoice_date
            }
          }
        }

        return {
          quotationCount: quotes.length,
          invoiceCount: invoices.length,
          jobCount: jobs.length,
          totalRevenueBDT: totalRev,
          lastSoldDate: lastDate,
          isReferenced: quotes.length + invoices.length + jobs.length > 0,
        }
      }
      return { quotationCount: 0, invoiceCount: 0, jobCount: 0, totalRevenueBDT: 0, isReferenced: false }
    }

    try {
      const supabase = await createClient()

      const [qCountRes, invDataRes, jobCountRes] = await Promise.all([
        (supabase as any).from('quotation_items').select('id', { count: 'exact', head: true }).eq('product_id', productId),
        (supabase as any).from('invoice_items').select('unit_price, quantity, created_at').eq('product_id', productId),
        (supabase as any).from('job_costings').select('id', { count: 'exact', head: true }).eq('product_id', productId),
      ])

      const quotationCount = qCountRes.count || 0
      const jobCount = jobCountRes.count || 0
      const invoiceItems = invDataRes.data || []
      const invoiceCount = invoiceItems.length

      let totalRevenueBDT = 0
      let lastSoldDate: string | null = null

      for (const item of invoiceItems) {
        totalRevenueBDT += (Number(item.unit_price) || 0) * (Number(item.quantity) || 1)
        if (!lastSoldDate || item.created_at > lastSoldDate) {
          lastSoldDate = item.created_at
        }
      }

      return {
        quotationCount,
        invoiceCount,
        jobCount,
        totalRevenueBDT: Math.round(totalRevenueBDT),
        lastSoldDate: lastSoldDate ? lastSoldDate.split('T')[0] : null,
        isReferenced: quotationCount + invoiceCount + jobCount > 0,
      }
    } catch {
      return { quotationCount: 0, invoiceCount: 0, jobCount: 0, totalRevenueBDT: 0, isReferenced: false }
    }
  }

  // ============================================================================
  // PRICE HISTORY
  // ============================================================================

  static async recordPriceChange(
    productId: string,
    oldPrice: number,
    newPrice: number,
    reason: string,
    companyId: string,
    changedByUserId?: string | null,
    changedByName?: string
  ): Promise<PriceHistoryRecord> {
    const entry: PriceHistoryRecord = {
      id: `ph-${Date.now()}`,
      company_id: companyId,
      product_id: productId,
      old_price: oldPrice,
      new_price: newPrice,
      reason: reason.trim() || 'Manual price adjustment',
      changed_by: changedByUserId || null,
      changed_by_name: changedByName || 'Current User',
      created_at: new Date().toISOString(),
    }

    if (!isSupabaseConfigured()) {
      if (isTestMode()) {
        PrintERPDataStore.addItem(STORAGE_KEYS.PRICE_HISTORY, entry)
        return entry
      }
      throw new Error('Authoritative database connection is required to record price history.')
    }

    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('product_price_history')
        .insert({
          company_id: companyId,
          product_id: productId,
          old_price: oldPrice,
          new_price: newPrice,
          reason: entry.reason,
          changed_by: changedByUserId || null,
          created_at: entry.created_at,
        })
        .select()
        .single()

      if (error) {
        if (isTestMode()) {
          PrintERPDataStore.addItem(STORAGE_KEYS.PRICE_HISTORY, entry)
          return entry
        }
        throw new Error(`Failed to record price history: ${error.message}`)
      }

      return { ...entry, id: data.id }
    } catch (err: any) {
      if (isTestMode()) {
        PrintERPDataStore.addItem(STORAGE_KEYS.PRICE_HISTORY, entry)
        return entry
      }
      throw err
    }
  }

  static async getProductPriceHistory(productId?: string, companyId?: string): Promise<PriceHistoryRecord[]> {
    if (!isSupabaseConfigured()) {
      if (isTestMode()) {
        const history = PrintERPDataStore.get<PriceHistoryRecord[]>(STORAGE_KEYS.PRICE_HISTORY) || []
        return history.filter(
          (h) => (!productId || h.product_id === productId) && (!companyId || !h.company_id || h.company_id === companyId)
        )
      }
      return []
    }

    try {
      const supabase = await createClient()
      let query = (supabase as any)
        .from('product_price_history')
        .select('*')
        .order('created_at', { ascending: false })

      if (companyId) query = query.eq('company_id', companyId)
      if (productId) query = query.eq('product_id', productId)

      const { data, error } = await query
      if (error) return []
      return (data || []) as PriceHistoryRecord[]
    } catch {
      return []
    }
  }

  // ============================================================================
  // VARIANTS
  // ============================================================================

  static async getProductVariants(productId: string, companyId: string): Promise<ProductVariantRecord[]> {
    if (!isSupabaseConfigured()) {
      if (isTestMode()) {
        const vars = PrintERPDataStore.get<ProductVariantRecord[]>(STORAGE_KEYS.PRODUCT_VARIANTS) || []
        return vars.filter((v) => v.product_id === productId && (!v.company_id || v.company_id === companyId))
      }
      return []
    }

    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('product_variants')
        .select('*')
        .eq('company_id', companyId)
        .eq('product_id', productId)
        .eq('is_active', true)
        .order('created_at', { ascending: true })

      if (!error && data && data.length > 0) return data as ProductVariantRecord[]
      if (isTestMode()) {
        const vars = PrintERPDataStore.get<ProductVariantRecord[]>(STORAGE_KEYS.PRODUCT_VARIANTS) || []
        return vars.filter((v) => v.product_id === productId && (!v.company_id || v.company_id === companyId))
      }
      return []
    } catch {
      if (isTestMode()) {
        const vars = PrintERPDataStore.get<ProductVariantRecord[]>(STORAGE_KEYS.PRODUCT_VARIANTS) || []
        return vars.filter((v) => v.product_id === productId && (!v.company_id || v.company_id === companyId))
      }
      return []
    }
  }

  static async createProductVariant(data: Partial<ProductVariantRecord> & {
    company_id: string
    product_id: string
    variant_name: string
  }): Promise<ProductVariantRecord> {
    const record: any = {
      company_id: data.company_id,
      product_id: data.product_id,
      variant_name: data.variant_name.trim(),
      sku_suffix: data.sku_suffix?.trim() || null,
      thickness_mm: data.thickness_mm ? Number(data.thickness_mm) : null,
      gsm: data.gsm ? Number(data.gsm) : null,
      finish: data.finish?.trim() || null,
      color: data.color?.trim() || null,
      size_spec: data.size_spec?.trim() || null,
      cost_adjustment: Number(data.cost_adjustment) || 0,
      price_adjustment: Number(data.price_adjustment) || 0,
      is_active: data.is_active !== undefined ? data.is_active : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (!isSupabaseConfigured()) {
      if (isTestMode()) {
        const testVar: ProductVariantRecord = {
          id: `var-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          ...record,
        }
        PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCT_VARIANTS, testVar)
        return testVar
      }
      throw new Error('Authoritative database connection is required to create a variant.')
    }

    try {
      const supabase = await createClient()
      const { data: inserted, error } = await (supabase as any)
        .from('product_variants')
        .insert(record)
        .select()
        .single()

      if (error) throw new Error(`Database error saving variant: ${error.message}`)
      if (isTestMode() && inserted) {
        PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCT_VARIANTS, inserted)
      }
      return inserted as ProductVariantRecord
    } catch (err: any) {
      if (isTestMode()) {
        const testVar: ProductVariantRecord = {
          id: `var-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          ...record,
        }
        PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCT_VARIANTS, testVar)
        return testVar
      }
      throw err
    }
  }

  static async deleteProductVariant(variantId: string, companyId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      if (isTestMode()) {
        return PrintERPDataStore.removeItem(STORAGE_KEYS.PRODUCT_VARIANTS, variantId)
      }
      throw new Error('Authoritative database connection is required to delete a variant.')
    }

    try {
      const supabase = await createClient()
      const { error } = await (supabase as any)
        .from('product_variants')
        .delete()
        .eq('id', variantId)
        .eq('company_id', companyId)

      if (error) throw new Error(`Failed to delete variant: ${error.message}`)
      if (isTestMode()) {
        PrintERPDataStore.removeItem(STORAGE_KEYS.PRODUCT_VARIANTS, variantId)
      }
      return true
    } catch (err: any) {
      if (isTestMode()) {
        return PrintERPDataStore.removeItem(STORAGE_KEYS.PRODUCT_VARIANTS, variantId)
      }
      throw err
    }
  }

  // ============================================================================
  // FORMULAS
  // ============================================================================

  static async getProductFormulas(productId: string, companyId: string): Promise<ProductFormulaRecord[]> {
    if (!isSupabaseConfigured()) {
      if (isTestMode()) {
        const forms = PrintERPDataStore.get<ProductFormulaRecord[]>(STORAGE_KEYS.PRODUCT_FORMULAS) || []
        return forms.filter((f) => f.product_id === productId && (!f.company_id || f.company_id === companyId))
      }
      return []
    }

    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('product_formulas')
        .select('*')
        .eq('company_id', companyId)
        .eq('product_id', productId)
        .order('version', { ascending: false })

      if (!error && data && data.length > 0) return data as ProductFormulaRecord[]
      if (isTestMode()) {
        const forms = PrintERPDataStore.get<ProductFormulaRecord[]>(STORAGE_KEYS.PRODUCT_FORMULAS) || []
        return forms.filter((f) => f.product_id === productId && (!f.company_id || f.company_id === companyId))
      }
      return []
    } catch {
      if (isTestMode()) {
        const forms = PrintERPDataStore.get<ProductFormulaRecord[]>(STORAGE_KEYS.PRODUCT_FORMULAS) || []
        return forms.filter((f) => f.product_id === productId && (!f.company_id || f.company_id === companyId))
      }
      return []
    }
  }

  static async createProductFormula(data: Partial<ProductFormulaRecord> & {
    company_id: string
    product_id: string
    model: any
  }): Promise<ProductFormulaRecord> {
    const existing = await this.getProductFormulas(data.product_id, data.company_id)
    const nextVersion = existing.length > 0 ? Math.max(...existing.map((e) => e.version)) + 1 : 1

    const record: any = {
      company_id: data.company_id,
      product_id: data.product_id,
      formula_name: data.formula_name || `Formula V${nextVersion}`,
      version: nextVersion,
      model: data.model || 'dimensional_area',
      waste_factor_percent: data.waste_factor_percent !== undefined ? Number(data.waste_factor_percent) : 5.0,
      material_requirements: data.material_requirements || [],
      machine_operations: data.machine_operations || [],
      labor_operations: data.labor_operations || [],
      finishing_operations: data.finishing_operations || [],
      other_costs: data.other_costs || [],
      target_margin_percent: data.target_margin_percent !== undefined ? Number(data.target_margin_percent) : 35.0,
      min_margin_percent: data.min_margin_percent !== undefined ? Number(data.min_margin_percent) : 15.0,
      is_active: data.is_active !== undefined ? data.is_active : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (!isSupabaseConfigured()) {
      if (isTestMode()) {
        const testForm: ProductFormulaRecord = { id: `form-${Date.now()}`, ...record }
        PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCT_FORMULAS, testForm)
        return testForm
      }
      throw new Error('Authoritative database connection is required to create a formula.')
    }

    try {
      const supabase = await createClient()
      const { data: inserted, error } = await (supabase as any)
        .from('product_formulas')
        .insert(record)
        .select()
        .single()

      if (error) throw new Error(`Database error creating formula: ${error.message}`)
      return inserted as ProductFormulaRecord
    } catch (err: any) {
      if (isTestMode()) {
        const testForm: ProductFormulaRecord = { id: `form-${Date.now()}`, ...record }
        PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCT_FORMULAS, testForm)
        return testForm
      }
      throw err
    }
  }

  // ============================================================================
  // PRICE LISTS
  // ============================================================================

  static async getPriceLists(companyId: string): Promise<PriceListRecord[]> {
    if (!isSupabaseConfigured()) {
      if (isTestMode()) {
        const lists = PrintERPDataStore.get<PriceListRecord[]>(STORAGE_KEYS.PRICE_LISTS) || []
        const filtered = lists.filter((l) => !l.company_id || l.company_id === companyId)
        if (filtered.length > 0) return filtered

        const defaults: PriceListRecord[] = [
          {
            id: `pl-ret-${companyId}`,
            company_id: companyId,
            name: 'Standard Retail Price List',
            code: 'RETAIL',
            tier_type: 'retail',
            description: 'Standard retail walk-in customer pricing',
            default_markup_percent: 0,
            is_default: true,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: `pl-corp-${companyId}`,
            company_id: companyId,
            name: 'Corporate Contract Rates',
            code: 'CORPORATE',
            tier_type: 'corporate',
            description: 'Discounted contract rates for corporate accounts',
            default_markup_percent: -10,
            is_default: false,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: `pl-who-${companyId}`,
            company_id: companyId,
            name: 'Wholesale / Agency Rates',
            code: 'WHOLESALE',
            tier_type: 'wholesale',
            description: 'High volume wholesale and advertising agency partner pricing',
            default_markup_percent: -20,
            is_default: false,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]
        return defaults
      }
      return []
    }

    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('price_lists')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true })

      if (!error && data && data.length > 0) return data as PriceListRecord[]
      return []
    } catch {
      return []
    }
  }

  static async createPriceList(data: Partial<PriceListRecord> & {
    company_id: string
    name: string
    code: string
  }): Promise<PriceListRecord> {
    const record: any = {
      company_id: data.company_id,
      name: data.name.trim(),
      code: data.code.trim().toUpperCase(),
      tier_type: data.tier_type || 'retail',
      description: data.description?.trim() || null,
      default_markup_percent: Number(data.default_markup_percent) || 0,
      is_default: Boolean(data.is_default),
      is_active: data.is_active !== undefined ? data.is_active : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (!isSupabaseConfigured()) {
      if (isTestMode()) {
        const testList: PriceListRecord = { id: `pl-${Date.now()}`, ...record }
        PrintERPDataStore.addItem(STORAGE_KEYS.PRICE_LISTS, testList)
        return testList
      }
      throw new Error('Authoritative database connection is required to create a price list.')
    }

    try {
      const supabase = await createClient()
      const { data: inserted, error } = await (supabase as any)
        .from('price_lists')
        .insert(record)
        .select()
        .single()

      if (error) throw new Error(`Database error creating price list: ${error.message}`)
      return inserted as PriceListRecord
    } catch (err: any) {
      if (isTestMode()) {
        const testList: PriceListRecord = { id: `pl-${Date.now()}`, ...record }
        PrintERPDataStore.addItem(STORAGE_KEYS.PRICE_LISTS, testList)
        return testList
      }
      throw err
    }
  }

  // ============================================================================
  // 5-TIER DETERMINISTIC CUSTOMER PRICING HIERARCHY
  // ============================================================================

  /**
   * Resolves exact unit price for a given customer & product according to:
   * Tier 1: Customer-Specific Custom Rate (`customer_rates`)
   * Tier 2: Customer Price List Item (`price_list_items` via assigned Price List)
   * Tier 3: Customer Tier Markup (`price_lists` default markup % for customer category)
   * Tier 4: Standard Catalog Selling Price (`products.selling_price`)
   * Tier 5: Minimum Safety Floor Protection
   */
  static async resolveCustomerProductPrice(
    productId: string,
    customerId: string | undefined,
    companyId: string,
    options?: {
      allowFloorOverride?: boolean
      overrideReason?: string
      authorizedBy?: string
    }
  ): Promise<ResolvedProductPrice> {
    return measureAsync(`ProductRepository.resolveCustomerProductPrice(${productId})`, async () => {
      const product = await this.getProductById(productId, companyId)
      if (!product) {
        throw new Error(`Product ${productId} not found in catalog.`)
      }

      const defaultRate = Number(product.selling_price) || 0
      const minPrice = Number(product.min_price) || 0
      const baseCost = Number(product.base_cost) || 0

      let resolved: ResolvedProductPrice = {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        unit: product.unit,
        sellingPrice: defaultRate,
        effectiveRate: defaultRate,
        minPrice,
        baseCost,
        source: 'default',
        sourceLabel: 'Standard Catalog Rate',
        sourceDetails: `Standard rate ৳${defaultRate}/${product.unit}`,
      }

      if (customerId) {
        let foundCustomRate = false

        // Tier 1: Check Customer-Specific Rate (customer_rates)
        if (isTestMode()) {
          const rates = PrintERPDataStore.get<any[]>(STORAGE_KEYS.CUSTOMER_RATES) || []
          const match = rates.find(
            (r) => (!r.company_id || r.company_id === companyId) && r.customer_id === customerId && r.product_id === productId
          )
          if (match && match.rate !== undefined) {
            const rate = Number(match.rate)
            resolved = {
              productId: product.id,
              productName: product.name,
              sku: product.sku,
              unit: product.unit,
              sellingPrice: defaultRate,
              effectiveRate: rate,
              minPrice,
              baseCost,
              source: 'custom',
              sourceLabel: 'Customer Specific Rate',
              sourceDetails: match.notes ? `Contract Rate: ${match.notes}` : `Dedicated customer price ৳${rate}/${product.unit}`,
            }
            foundCustomRate = true
          }
        }

        if (!foundCustomRate && isSupabaseConfigured()) {
          try {
            const supabase = await createClient()
            const { data: custRate } = await (supabase as any)
              .from('customer_rates')
              .select('rate, notes')
              .eq('company_id', companyId)
              .eq('customer_id', customerId)
              .eq('product_id', productId)
              .maybeSingle()

            if (custRate && custRate.rate !== null && custRate.rate !== undefined) {
              const rate = Number(custRate.rate)
              resolved = {
                productId: product.id,
                productName: product.name,
                sku: product.sku,
                unit: product.unit,
                sellingPrice: defaultRate,
                effectiveRate: rate,
                minPrice,
                baseCost,
                source: 'custom',
                sourceLabel: 'Customer Specific Rate',
                sourceDetails: custRate.notes ? `Contract Rate: ${custRate.notes}` : `Dedicated customer price ৳${rate}/${product.unit}`,
              }
              foundCustomRate = true
            }
          } catch {}
        }

        // Tier 2 & 3: Check Customer Price List and Tier Markup
        if (!foundCustomRate) {
          try {
            let customerCategory = 'retail'
            let assignedPriceListId: string | null = null

            if (isSupabaseConfigured()) {
              const supabase = await createClient()
              const { data: cust } = await (supabase as any)
                .from('customers')
                .select('customer_type, customer_category, price_list_id')
                .eq('id', customerId)
                .maybeSingle()

              if (cust) {
                customerCategory = cust.customer_type || cust.customer_category || 'retail'
                assignedPriceListId = cust.price_list_id || null
              }
            } else if (isTestMode()) {
              const customers = PrintERPDataStore.get<any[]>(STORAGE_KEYS.CUSTOMERS) || []
              const cust = customers.find((c) => c.id === customerId)
              if (cust) {
                customerCategory = cust.customer_type || cust.customer_category || 'retail'
                assignedPriceListId = cust.price_list_id || null
              }
            }

            // Check specific item in assigned price list
            let foundPriceListItem = false
            if (assignedPriceListId && isSupabaseConfigured()) {
              const supabase = await createClient()
              const { data: plItem } = await (supabase as any)
                .from('price_list_items')
                .select('custom_rate, discount_percent')
                .eq('price_list_id', assignedPriceListId)
                .eq('product_id', productId)
                .maybeSingle()

              if (plItem) {
                if (plItem.custom_rate !== null && plItem.custom_rate !== undefined) {
                  const rate = Number(plItem.custom_rate)
                  resolved = {
                    productId: product.id,
                    productName: product.name,
                    sku: product.sku,
                    unit: product.unit,
                    sellingPrice: defaultRate,
                    effectiveRate: rate,
                    minPrice,
                    baseCost,
                    source: 'price_list',
                    sourceLabel: 'Price List Custom Rate',
                    sourceDetails: `Assigned Price List Rate ৳${rate}/${product.unit}`,
                  }
                  foundPriceListItem = true
                } else if (plItem.discount_percent > 0) {
                  const discounted = Math.round(defaultRate * (1 - plItem.discount_percent / 100) * 100) / 100
                  resolved = {
                    productId: product.id,
                    productName: product.name,
                    sku: product.sku,
                    unit: product.unit,
                    sellingPrice: defaultRate,
                    effectiveRate: discounted,
                    minPrice,
                    baseCost,
                    source: 'price_list',
                    sourceLabel: `Price List (${plItem.discount_percent}% Disc)`,
                    sourceDetails: `Price List Item discount: ${plItem.discount_percent}% off`,
                  }
                  foundPriceListItem = true
                }
              }
            }

            // Tier 3: Category Price List Markup
            if (!foundPriceListItem) {
              const priceLists = await this.getPriceLists(companyId)
              const matchingPl = priceLists.find(
                (pl) =>
                  pl.tier_type?.toLowerCase() === customerCategory?.toLowerCase() ||
                  pl.code?.toLowerCase() === customerCategory?.toLowerCase()
              )

              if (matchingPl && matchingPl.default_markup_percent !== 0) {
                const adjustedRate = Math.round(defaultRate * (1 + matchingPl.default_markup_percent / 100) * 100) / 100
                resolved = {
                  productId: product.id,
                  productName: product.name,
                  sku: product.sku,
                  unit: product.unit,
                  sellingPrice: defaultRate,
                  effectiveRate: adjustedRate,
                  minPrice,
                  baseCost,
                  source: 'customer_tier',
                  sourceLabel: `${matchingPl.name} (${matchingPl.default_markup_percent > 0 ? '+' : ''}${matchingPl.default_markup_percent}%)`,
                  sourceDetails: `Tier markup applied: ${matchingPl.name}`,
                  priceListCode: matchingPl.code,
                }
              }
            }
          } catch {}
        }
      }

      // ========================================================================
      // TIER 5 / PHASE 8: MINIMUM PRICE SAFETY FLOOR ENFORCEMENT
      // ========================================================================
      const originalRate = resolved.effectiveRate
      if (minPrice > 0 && originalRate < minPrice) {
        resolved.isBelowMinimum = true
        resolved.originalRequestedRate = originalRate

        if (options?.allowFloorOverride && options.overrideReason?.trim()) {
          // Authorized price override
          resolved.isFloorEnforced = false
          resolved.effectiveRate = originalRate
          resolved.overrideReason = options.overrideReason.trim()
          resolved.authorizedBy = options.authorizedBy || 'Authorized Manager'
          resolved.sourceDetails = (resolved.sourceDetails || '') + ` [Floor Override: ৳${originalRate}/${product.unit}, Reason: ${options.overrideReason}]`
        } else {
          // Enforce minimum floor strictly: max(calculated/resolved rate, minimum allowed price)
          resolved.isFloorEnforced = true
          resolved.effectiveRate = minPrice
          resolved.sourceDetails = (resolved.sourceDetails || '') + ` [Floor Enforced: min ৳${minPrice}/${product.unit}]`
        }
      } else {
        resolved.isBelowMinimum = false
        resolved.isFloorEnforced = false
      }

      return resolved
    })
  }
}
