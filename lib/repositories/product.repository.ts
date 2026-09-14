import { createClient } from '../supabase/server.ts'
import type {
  ProductRecord,
  ProductVariantRecord,
  ProductFormulaRecord,
  PriceListRecord,
  PriceListItemRecord,
} from '../../types/product.types.ts'
import { measureAsync } from '../performance/logger.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../db/data-store.ts'

export const DEFAULT_PRINT_PRODUCTS: Omit<ProductRecord, 'id' | 'company_id' | 'created_at' | 'updated_at'>[] = [
  {
    name: 'Star Flex Banner (Frontlit 280 GSM)',
    name_bn: 'স্টার ফ্লেক্স ব্যানার (ফ্রন্টলিট)',
    sku: 'PRD-FLX-01',
    category: 'flex_banner',
    product_type: 'print_service',
    unit: 'sft',
    material_spec: '280 GSM Chinese Star Flex Media',
    description: 'High durability outdoor solvent/eco-solvent banner for marketing campaigns & billboards.',
    base_cost: 11.5,
    selling_price: 18.0,
    min_price: 15.0,
    tax_rate: 7.5,
    is_active: true,
  },
  {
    name: 'Panaflex Backlit Signage Print',
    name_bn: 'প্যানাফ্লেক্স ব্যাকলিট সাইনবোর্ড প্রিন্ট',
    sku: 'PRD-PANA-01',
    category: 'backlit_flex',
    product_type: 'print_service',
    unit: 'sft',
    material_spec: '440 GSM Backlit Translucent Media',
    description: 'High-luminance translucent printing for illuminated light boxes and shop fascias.',
    base_cost: 22.0,
    selling_price: 35.0,
    min_price: 28.0,
    tax_rate: 7.5,
    is_active: true,
  },
  {
    name: 'Eco-Solvent Vinyl Sticker (Glossy / Matte)',
    name_bn: 'ভিনাইল স্টিকার (গ্লসি / ম্যাট)',
    sku: 'PRD-VIN-01',
    category: 'vinyl_sticker',
    product_type: 'print_service',
    unit: 'sft',
    material_spec: '100 Micron PVC Vinyl with permanent adhesive',
    description: 'Photo-quality vinyl sticker with UV coating for indoor and outdoor branding.',
    base_cost: 18.0,
    selling_price: 32.0,
    min_price: 26.0,
    tax_rate: 7.5,
    is_active: true,
  },
  {
    name: 'PVC Foam Board Mount (3mm / 5mm)',
    name_bn: 'পিভিসি ফোম বোর্ড মাউন্টিং (৩মিমি/৫মিমি)',
    sku: 'PRD-PVC-01',
    category: 'rigid_board',
    product_type: 'fabrication_service',
    unit: 'sft',
    material_spec: 'High-density rigid PVC sheet mounted with laminated vinyl',
    description: 'Rigid photo-mounted display boards for exhibitions, retail point-of-sale, and directional signage.',
    base_cost: 45.0,
    selling_price: 75.0,
    min_price: 60.0,
    tax_rate: 7.5,
    is_active: true,
  },
  {
    name: 'Acrylic 3D LED Raised Letter Signage',
    name_bn: 'এক্রিলিক ৩ডি এলইডি লেটার সাইন',
    sku: 'PRD-ACR-01',
    category: 'signage_3d',
    product_type: 'fabrication_service',
    unit: 'inch',
    material_spec: '3mm Cast Acrylic with Samsung LED module & Korean SMPS',
    description: 'Premium laser-cut 3D illuminated letters for corporate receptions and retail storefronts.',
    base_cost: 65.0,
    selling_price: 120.0,
    min_price: 95.0,
    tax_rate: 7.5,
    is_active: true,
  },
  {
    name: 'Roll-Up Banner Standee (3ft x 6.5ft)',
    name_bn: 'রোল-আপ ব্যানার স্ট্যান্ডি (৩ x ৬.৫ ফুট)',
    sku: 'PRD-STN-01',
    category: 'display_stand',
    product_type: 'finished_product',
    unit: 'pcs',
    material_spec: 'Aluminum teardrop base with synthetic non-tearable banner',
    description: 'Portable retractable banner stand for seminars, fairs, and corporate activations.',
    base_cost: 1100.0,
    selling_price: 1850.0,
    min_price: 1500.0,
    tax_rate: 7.5,
    is_active: true,
  },
  {
    name: 'Premium Corporate Visiting Cards (300 GSM Matte)',
    name_bn: 'ভিজিটিং কার্ড (৩০০ জিএসএম ম্যাট লেমিনেশন)',
    sku: 'PRD-CRD-01',
    category: 'commercial_print',
    product_type: 'print_service',
    unit: 'pcs',
    material_spec: '300 GSM Art Card with Thermal Double-side Matte & Spot UV',
    description: 'Offset printed executive business cards with velvet lamination (Box of 100 pcs).',
    base_cost: 220.0,
    selling_price: 450.0,
    min_price: 350.0,
    tax_rate: 7.5,
    is_active: true,
  },
  {
    name: 'Full Color Promotional Leaflet / Flyer (A4 / A5)',
    name_bn: 'রঙিন লিফলেট / ফ্লায়ার (এ৪ / এ৫)',
    sku: 'PRD-FLY-01',
    category: 'commercial_print',
    product_type: 'print_service',
    unit: 'pcs',
    material_spec: '120 GSM Art Paper, 4-color high resolution offset printing',
    description: 'Marketing handouts and distribution brochures (Per 1,000 pcs unit).',
    base_cost: 1400.0,
    selling_price: 2400.0,
    min_price: 2000.0,
    tax_rate: 7.5,
    is_active: true,
  },
]

export class ProductRepository {
  static async getProducts(companyId: string, activeOnly: boolean = false): Promise<ProductRecord[]> {
    return measureAsync(`ProductRepository.getProducts(${companyId})`, async () => {
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

        const { data, error } = await query

        if (error) {
          throw new Error(error.message)
        }

        const list = (data || []) as ProductRecord[]
        if (list.length > 0) return list
      } catch {
        // Fallback to DataStore
      }

      const prods = PrintERPDataStore.get<ProductRecord[]>(STORAGE_KEYS.PRODUCTS) || []
      const filtered = prods.filter((p) => !p.company_id || p.company_id === companyId)
      if (filtered.length > 0) return filtered

      return DEFAULT_PRINT_PRODUCTS.map((p, idx) => ({
        ...p,
        id: `seed-prd-${companyId}-${idx + 1}`,
        company_id: companyId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })) as ProductRecord[]
    })
  }

  static async getProductById(id: string, companyId: string): Promise<ProductRecord | null> {
    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('products')
        .select('*, variants:product_variants(*), formulas:product_formulas(*)')
        .or(`id.eq.${id},sku.eq.${id}`)
        .eq('company_id', companyId)
        .maybeSingle()

      if (!error && data) {
        return data as ProductRecord
      }
    } catch {
      // Fallback
    }

    const prods = await this.getProducts(companyId)
    return prods.find((p) => p.id === id || p.sku === id) || null
  }

  static async createProduct(product: Partial<ProductRecord> & {
    company_id: string
    name: string
    sku: string
    unit: any
    selling_price: number
  }): Promise<ProductRecord> {
    const payload: any = {
      id: product.id || `prd-${Date.now()}`,
      company_id: product.company_id,
      name: product.name.trim(),
      name_bn: product.name_bn?.trim() || null,
      sku: product.sku.trim().toUpperCase(),
      category: product.category || 'general_print',
      product_type: product.product_type || 'print_service',
      unit: product.unit,
      material_spec: product.material_spec?.trim() || null,
      description: product.description?.trim() || null,
      description_bn: product.description_bn?.trim() || null,
      dimensions_spec: product.dimensions_spec || null,
      base_cost: product.base_cost || 0,
      selling_price: product.selling_price || 0,
      min_price: product.min_price || 0,
      tax_rate: product.tax_rate !== undefined ? product.tax_rate : 7.5,
      pricing_formula: product.pricing_formula || null,
      is_active: product.is_active !== undefined ? product.is_active : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('products')
        .insert(payload)
        .select()
        .single()

      if (!error && data) {
        PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCTS, data)
        return data as ProductRecord
      }
    } catch {
      // DataStore fallback
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCTS, payload)
    return payload as ProductRecord
  }

  static async updateProduct(id: string, updates: Partial<ProductRecord>, companyId: string): Promise<ProductRecord> {
    const payload: any = { ...updates, updated_at: new Date().toISOString() }
    delete payload.id
    delete payload.company_id

    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('products')
        .update(payload)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single()

      if (!error && data) {
        PrintERPDataStore.updateItem<ProductRecord>(STORAGE_KEYS.PRODUCTS, id, data)
        return data as ProductRecord
      }
    } catch {
      // Fallback
    }

    const updated = PrintERPDataStore.updateItem<ProductRecord>(STORAGE_KEYS.PRODUCTS, id, payload)
    if (!updated) throw new Error(`Product ${id} not found`)
    return updated
  }

  static async deleteProduct(id: string, companyId: string): Promise<boolean> {
    try {
      const supabase = await createClient()
      await (supabase as any)
        .from('products')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId)
    } catch {
      // Fallback
    }

    return PrintERPDataStore.removeItem(STORAGE_KEYS.PRODUCTS, id)
  }

  // ============================================================================
  // PRODUCT VARIANTS REPOSITORY
  // ============================================================================

  static async getProductVariants(productId: string, companyId: string): Promise<ProductVariantRecord[]> {
    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('product_variants')
        .select('*')
        .eq('company_id', companyId)
        .eq('product_id', productId)
        .eq('is_active', true)
        .order('created_at', { ascending: true })

      if (!error && data) return data as ProductVariantRecord[]
    } catch {}

    const vars = PrintERPDataStore.get<ProductVariantRecord[]>(STORAGE_KEYS.PRODUCT_VARIANTS) || []
    return vars.filter((v) => v.product_id === productId && (!v.company_id || v.company_id === companyId))
  }

  static async createProductVariant(data: Partial<ProductVariantRecord> & {
    company_id: string
    product_id: string
    variant_name: string
  }): Promise<ProductVariantRecord> {
    const record: ProductVariantRecord = {
      id: data.id || `var-${Date.now()}`,
      company_id: data.company_id,
      product_id: data.product_id,
      variant_name: data.variant_name.trim(),
      sku_suffix: data.sku_suffix || null,
      thickness_mm: data.thickness_mm || null,
      gsm: data.gsm || null,
      finish: data.finish || null,
      color: data.color || null,
      size_spec: data.size_spec || null,
      cost_adjustment: data.cost_adjustment || 0,
      price_adjustment: data.price_adjustment || 0,
      is_active: data.is_active !== undefined ? data.is_active : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    try {
      const supabase = await createClient()
      const { data: inserted, error } = await (supabase as any)
        .from('product_variants')
        .insert(record)
        .select()
        .single()
      if (!error && inserted) {
        PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCT_VARIANTS, inserted)
        return inserted as ProductVariantRecord
      }
    } catch {}

    PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCT_VARIANTS, record)
    return record
  }

  // ============================================================================
  // PRODUCT FORMULAS REPOSITORY
  // ============================================================================

  static async getProductFormulas(productId: string, companyId: string): Promise<ProductFormulaRecord[]> {
    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('product_formulas')
        .select('*')
        .eq('company_id', companyId)
        .eq('product_id', productId)
        .order('version', { ascending: false })

      if (!error && data) return data as ProductFormulaRecord[]
    } catch {}

    const forms = PrintERPDataStore.get<ProductFormulaRecord[]>(STORAGE_KEYS.PRODUCT_FORMULAS) || []
    return forms.filter((f) => f.product_id === productId && (!f.company_id || f.company_id === companyId))
  }

  static async createProductFormula(data: Partial<ProductFormulaRecord> & {
    company_id: string
    product_id: string
    model: any
  }): Promise<ProductFormulaRecord> {
    const existing = await this.getProductFormulas(data.product_id, data.company_id)
    const nextVersion = existing.length > 0 ? Math.max(...existing.map((e) => e.version)) + 1 : 1

    const record: ProductFormulaRecord = {
      id: data.id || `form-${Date.now()}`,
      company_id: data.company_id,
      product_id: data.product_id,
      formula_name: data.formula_name || `Formula V${nextVersion}`,
      version: nextVersion,
      model: data.model || 'dimensional_area',
      waste_factor_percent: data.waste_factor_percent !== undefined ? data.waste_factor_percent : 5.0,
      material_requirements: data.material_requirements || [],
      machine_operations: data.machine_operations || [],
      labor_operations: data.labor_operations || [],
      finishing_operations: data.finishing_operations || [],
      other_costs: data.other_costs || [],
      target_margin_percent: data.target_margin_percent !== undefined ? data.target_margin_percent : 35.0,
      min_margin_percent: data.min_margin_percent !== undefined ? data.min_margin_percent : 15.0,
      is_active: data.is_active !== undefined ? data.is_active : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    try {
      const supabase = await createClient()
      const { data: inserted, error } = await (supabase as any)
        .from('product_formulas')
        .insert(record)
        .select()
        .single()
      if (!error && inserted) {
        PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCT_FORMULAS, inserted)
        return inserted as ProductFormulaRecord
      }
    } catch {}

    PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCT_FORMULAS, record)
    return record
  }

  // ============================================================================
  // PRICE LISTS REPOSITORY
  // ============================================================================

  static async getPriceLists(companyId: string): Promise<PriceListRecord[]> {
    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('price_lists')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true })

      if (!error && data) return data as PriceListRecord[]
    } catch {}

    const lists = PrintERPDataStore.get<PriceListRecord[]>(STORAGE_KEYS.PRICE_LISTS) || []
    const filtered = lists.filter((l) => !l.company_id || l.company_id === companyId)
    if (filtered.length > 0) return filtered

    // Default Price Lists for Print Shop
    const defaultLists: PriceListRecord[] = [
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

    return defaultLists
  }

  static async createPriceList(data: Partial<PriceListRecord> & {
    company_id: string
    name: string
    code: string
  }): Promise<PriceListRecord> {
    const record: PriceListRecord = {
      id: data.id || `pl-${Date.now()}`,
      company_id: data.company_id,
      name: data.name.trim(),
      code: data.code.trim().toUpperCase(),
      tier_type: data.tier_type || 'retail',
      description: data.description || null,
      default_markup_percent: data.default_markup_percent || 0,
      is_default: data.is_default || false,
      is_active: data.is_active !== undefined ? data.is_active : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    try {
      const supabase = await createClient()
      const { data: inserted, error } = await (supabase as any)
        .from('price_lists')
        .insert(record)
        .select()
        .single()
      if (!error && inserted) {
        PrintERPDataStore.addItem(STORAGE_KEYS.PRICE_LISTS, inserted)
        return inserted as PriceListRecord
      }
    } catch {}

    PrintERPDataStore.addItem(STORAGE_KEYS.PRICE_LISTS, record)
    return record
  }
}
