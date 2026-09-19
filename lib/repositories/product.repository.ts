import { createClient } from '../supabase/server.ts'
import type {
  ProductRecord,
  ProductVariantRecord,
  ProductFormulaRecord,
  PriceListRecord,
  PriceListItemRecord,
  PriceHistoryRecord,
  PriceOverrideRecord,
  ProductUsageStats,
  ResolvedProductPrice,
  ProductSupplierPriceRecord,
  ProductComponent,
  ProductCostBreakdown,
  ProductPriceTiers,
  PricingMethod,
  PriceTierKey,
} from '../../types/product.types.ts'
import { measureAsync } from '../performance/logger.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../db/data-store.ts'
import {
  calculateEffectiveUnitCost,
  calculateGrossMargin,
  calculateSuggestedSellingPrice,
  applyMinimumCharge,
  validateUnitConversion,
  normalizeUnitCode,
  calculateCommercialPricing,
  normalizePricingMethod,
  validateCircularBOM,
} from '../units.ts'

export function sanitizeProductDbPayload(raw: Record<string, any>): Record<string, any> {
  const allowed = new Set([
    'id',
    'company_id',
    'branch_id',
    'category_id',
    'name',
    'name_bn',
    'sku',
    'category',
    'product_type',
    'commercial_type',
    'entity_type',
    'measurement_type',
    'unit',
    'selling_unit',
    'purchase_unit',
    'production_unit',
    'purchase_price',
    'conversion_ratio',
    'base_cost',
    'selling_price',
    'min_price',
    'tax_rate',
    'default_wastage_percentage',
    'target_margin_percentage',
    'minimum_charge',
    'min_order_quantity',
    'min_billable_quantity',
    'min_allowed_margin_percent',
    'pricing_method',
    'allow_manual_override',
    'price_tiers',
    'cost_breakdown',
    'components',
    'pricing_formula',
    'material_config',
    'service_config',
    'vat_applicable',
    'is_tax_inclusive',
    'roll_width_ft',
    'roll_length_ft',
    'sheet_width_ft',
    'sheet_length_ft',
    'material_spec',
    'description',
    'description_bn',
    'dimensions_spec',
    'internal_notes',
    'production_instructions',
    'default_finishing',
    'default_department',
    'estimated_production_time_hours',
    'requires_design',
    'requires_approval',
    'requires_production',
    'requires_fabrication',
    'requires_finishing',
    'requires_installation',
    'requires_delivery',
    'is_active',
    'created_by',
    'created_at',
    'updated_at',
  ])

  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (allowed.has(k) && v !== undefined) {
      out[k] = v
    }
  }
  return out
}

export function enrichProductRecord(p: any): ProductRecord {
  if (!p) return p
  const formula = (typeof p.pricing_formula === 'object' && p.pricing_formula !== null ? p.pricing_formula : {}) as any

  const purchasePrice = Number(p.purchase_price) || 0
  const conversionRatio = Math.max(0.0001, Number(p.conversion_ratio) || 1.0)
  const defaultWastage = Math.max(0, Number(p.default_wastage_percentage) || 0)
  const targetMargin = p.target_margin_percentage !== undefined && p.target_margin_percentage !== null && !isNaN(Number(p.target_margin_percentage)) ? Number(p.target_margin_percentage) : 35.0
  const minAllowedMargin = p.min_allowed_margin_percent !== undefined && p.min_allowed_margin_percent !== null && !isNaN(Number(p.min_allowed_margin_percent)) ? Number(p.min_allowed_margin_percent) : 15.0
  const sellingPrice = Number(p.selling_price) || 0

  let effectiveCost = Number(p.base_cost) || 0
  if (purchasePrice > 0 && conversionRatio > 0) {
    const costCalc = calculateEffectiveUnitCost({
      purchasePrice,
      conversionRatio,
      defaultWastagePercent: defaultWastage,
    })
    effectiveCost = costCalc.effectiveCostPerSellingUnit
  }

  // Component Cost Rollup (BOM / Recipe)
  const components: ProductComponent[] = Array.isArray(p.components) ? p.components : []
  let componentCostTotal = 0
  if (components.length > 0) {
    componentCostTotal = components.reduce((sum, c) => {
      const cCost = Number(c.cost_contribution) || 0
      const cQty = Number(c.quantity) || 1
      const cWaste = Math.max(0, Number(c.waste_percent) || 0)
      const wasteMultiplier = 1 + cWaste / 100
      return sum + cCost * cQty * wasteMultiplier
    }, 0)
  }

  // Multi-Component Direct Cost Breakdown
  const cb = p.cost_breakdown || p.service_config?.cost_breakdown || formula.cost_breakdown || {}
  const matCost = cb.material_cost !== undefined ? Number(cb.material_cost) : (cb.material !== undefined ? Number(cb.material) : effectiveCost)
  const inkCost = Number(cb.ink_cost) || Number(cb.ink) || Number(p.ink_cost) || Number(p.service_config?.ink_cost) || Number(p.service_config?.ink_cost_per_unit) || 0
  const machCost = Number(cb.machine_cost) || Number(cb.machine) || 0
  const labCost = Number(cb.labor_cost) || Number(cb.labor) || 0
  const finCost = Number(cb.finishing_cost) || Number(cb.finishing) || 0
  const fabCost = Number(cb.fabrication_cost) || Number(cb.fabrication) || 0
  const instCost = Number(cb.installation_cost) || Number(cb.installation) || 0
  const delCost = Number(cb.delivery_cost) || Number(cb.delivery) || 0
  const othCost = Number(cb.other_direct_cost) || Number(cb.other_direct) || 0

  const directCostSum = matCost + inkCost + machCost + labCost + finCost + fabCost + instCost + delCost + othCost
  const estimatedDirectCost = directCostSum > matCost ? directCostSum : (componentCostTotal > 0 ? effectiveCost + componentCostTotal : effectiveCost)
  const estimatedMaterialCost = effectiveCost

  let costBasisType: 'material_cost' | 'direct_cost' | 'none' = 'none'
  let activeCostBasis = 0
  if (estimatedDirectCost > estimatedMaterialCost) {
    costBasisType = 'direct_cost'
    activeCostBasis = estimatedDirectCost
  } else if (estimatedMaterialCost > 0) {
    costBasisType = 'material_cost'
    activeCostBasis = estimatedMaterialCost
  }

  const suggestedPrice = calculateSuggestedSellingPrice(activeCostBasis || effectiveCost, targetMargin)
  const marginCalc = calculateGrossMargin(activeCostBasis || effectiveCost, sellingPrice)

  const pricingMethod = (normalizePricingMethod(p.pricing_method) ||
    (p.measurement_type === 'area'
      ? 'per_area'
      : p.measurement_type === 'length'
      ? 'per_length'
      : p.measurement_type === 'job'
      ? 'per_job'
      : p.measurement_type === 'time'
      ? 'per_hour'
      : 'per_piece')) as PricingMethod

  const serviceConfig = p.service_config || formula.service_config || null
  const materialConfig = p.material_config || formula.material_config || null
  const availableWidths = p.available_widths_ft || materialConfig?.available_widths_ft || formula.available_widths_ft || null
  const rollSizes = p.roll_sizes || materialConfig?.roll_sizes || formula.roll_sizes || null
  const standardRollLength = p.standard_roll_length_ft || materialConfig?.standard_roll_length_ft || formula.standard_roll_length_ft || null
  const availableSheetSizes = p.available_sheet_sizes || materialConfig?.available_sheet_sizes || formula.available_sheet_sizes || null
  const allowanceUnit = p.allowance_unit || formula.allowance_unit || 'ft'
  const prodWidthAllowance = p.production_width_allowance !== null && p.production_width_allowance !== undefined
    ? Number(p.production_width_allowance)
    : (materialConfig?.extra_width_allowance_ft !== undefined ? Number(materialConfig.extra_width_allowance_ft) : (Number(formula.production_width_allowance) || 0))
  const prodLengthAllowance = p.production_length_allowance !== null && p.production_length_allowance !== undefined
    ? Number(p.production_length_allowance)
    : Number(formula.production_length_allowance) || 0

  const entityType =
    p.entity_type ||
    formula.entity_type ||
    (p.product_type === 'ready_product'
      ? 'product'
      : p.product_type === 'material'
      ? 'material'
      : p.product_type === 'finishing'
      ? 'finishing'
      : p.product_type === 'additional'
      ? 'additional'
      : p.product_type === 'installation'
      ? 'installation'
      : p.commercial_type === 'service' || p.product_type === 'print_service'
      ? 'service'
      : 'product')

  return {
    ...p,
    entity_type: entityType,
    service_config: serviceConfig,
    material_config: materialConfig,
    roll_sizes: rollSizes,
    available_widths_ft: availableWidths,
    standard_roll_length_ft: standardRollLength,
    available_sheet_sizes: availableSheetSizes,
    is_service: p.is_service !== undefined ? Boolean(p.is_service) : entityType === 'service',
    is_ready_product: p.is_ready_product !== undefined ? Boolean(p.is_ready_product) : entityType === 'product',
    commercial_type: p.commercial_type || (p.product_type === 'print_service' || p.category?.includes('flex') ? 'production_product' : 'service'),
    measurement_type: p.measurement_type || 'area',
    pricing_method: pricingMethod,
    selling_unit: p.selling_unit || p.unit,
    purchase_unit: p.purchase_unit || (p.product_type === 'print_service' || p.category?.includes('flex') ? 'roll' : p.unit),
    purchase_price: purchasePrice,
    conversion_ratio: conversionRatio,
    production_unit: p.production_unit || p.unit,
    default_wastage_percentage: defaultWastage,
    target_margin_percentage: targetMargin,
    min_allowed_margin_percent: minAllowedMargin,
    minimum_charge: Number(p.minimum_charge) || 0,
    min_billable_quantity: p.min_billable_quantity !== null && p.min_billable_quantity !== undefined ? Math.max(0, Number(p.min_billable_quantity)) : 0,
    min_order_quantity: p.min_order_quantity !== null && p.min_order_quantity !== undefined ? Math.max(0, Number(p.min_order_quantity)) : 1.0,
    allow_manual_override: p.allow_manual_override !== undefined ? Boolean(p.allow_manual_override) : true,
    production_width_allowance: prodWidthAllowance,
    production_length_allowance: prodLengthAllowance,
    allowance_unit: allowanceUnit,
    price_tiers: p.price_tiers || {},
    cost_breakdown: {
      material_cost: matCost,
      ink_cost: inkCost,
      machine_cost: machCost,
      labor_cost: labCost,
      finishing_cost: finCost,
      fabrication_cost: fabCost,
      installation_cost: instCost,
      delivery_cost: delCost,
      other_direct_cost: othCost,
      total_direct_cost: estimatedDirectCost,
    },
    linked_ink_id: p.linked_ink_id || serviceConfig?.linked_ink_id || formula.linked_ink_id || null,
    linked_ink_name: p.linked_ink_name || serviceConfig?.linked_ink_name || formula.linked_ink_name || null,
    ink_cost: inkCost,
    components,
    supplier_prices: p.supplier_prices || [],
    vat_applicable: Boolean(p.vat_applicable),
    is_tax_inclusive: Boolean(p.is_tax_inclusive),
    effective_unit_cost: effectiveCost,
    estimated_material_cost: estimatedMaterialCost,
    estimated_direct_cost: estimatedDirectCost,
    cost_basis_type: costBasisType,
    suggested_selling_price: suggestedPrice,
    gross_margin_percent: marginCalc.grossMarginPercent,
  }
}

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
    search?: string,
    entityType?: string
  ): Promise<ProductRecord[]> {
    return measureAsync(`ProductRepository.getProducts(${companyId})`, async () => {
      if (!isSupabaseConfigured() || isTestMode()) {
        const prods = PrintERPDataStore.get<ProductRecord[]>(STORAGE_KEYS.PRODUCTS) || []
        let filtered = prods.filter((p) => !p.company_id || p.company_id === companyId)
        if (activeOnly) filtered = filtered.filter((p) => p.is_active !== false)
        if (entityType && entityType !== 'all') {
          filtered = filtered.filter((p) => p.entity_type === entityType)
        }
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

        let enriched = ((data || []) as ProductRecord[]).map(enrichProductRecord)
        if (entityType && entityType !== 'all') {
          enriched = enriched.filter((p) => p.entity_type === entityType)
        }
        return enriched
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

        const prod = enrichProductRecord(data as ProductRecord)
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

      const purchasePrice = Math.max(0, Number(product.purchase_price) || 0)
      const conversionRatio = Math.max(0.0001, Number(product.conversion_ratio) || 1.0)
      const defaultWastage = Math.max(0, Number(product.default_wastage_percentage) || 0)
      const targetMargin = product.target_margin_percentage !== undefined && product.target_margin_percentage !== null && !isNaN(Number(product.target_margin_percentage))
        ? Number(product.target_margin_percentage)
        : 35.0

      // Calculate effective base cost if purchase economics are provided
      let calculatedBaseCost = Math.max(0, Number(product.base_cost) || 0)
      if (purchasePrice > 0 && conversionRatio > 0) {
        const costCalc = calculateEffectiveUnitCost({
          purchasePrice,
          conversionRatio,
          defaultWastagePercent: defaultWastage,
        })
        if (calculatedBaseCost === 0) {
          calculatedBaseCost = costCalc.effectiveCostPerSellingUnit
        }
      }

      // Validate against circular BOM reference
      if (product.components && Array.isArray(product.components)) {
        const circularCheck = validateCircularBOM(product.id, product.components)
        if (circularCheck.hasCycle) {
          throw new Error(circularCheck.error)
        }
      }

      const payload: any = {
        company_id: product.company_id,
        branch_id: product.branch_id || null,
        name: product.name.trim(),
        name_bn: product.name_bn?.trim() || null,
        sku: normalizedSku,
        category: product.category || 'general_print',
        product_type: product.product_type || 'print_service',
        commercial_type: product.commercial_type || 'production_product',
        measurement_type: product.measurement_type || (product.selling_unit === 'sft' || product.unit === 'sft' || product.category?.includes('flex') ? 'area' : 'piece'),
        pricing_method: normalizePricingMethod(
          product.pricing_method ||
            (product.measurement_type === 'area' || product.selling_unit === 'sft' || product.unit === 'sft' || product.category?.includes('flex') || product.category?.includes('banner')
              ? 'per_area'
              : product.measurement_type === 'length' || product.selling_unit === 'rft' || product.unit === 'rft'
              ? 'per_length'
              : product.measurement_type === 'job'
              ? 'per_job'
              : product.measurement_type === 'time'
              ? 'per_hour'
              : product.measurement_type === 'weight'
              ? 'per_weight'
              : product.measurement_type === 'volume'
              ? 'per_volume'
              : 'per_piece')
        ),
        unit: product.unit,
        selling_unit: product.selling_unit || product.unit,
        purchase_unit: product.purchase_unit || (product.product_type === 'print_service' ? 'roll' : product.unit),
        purchase_price: purchasePrice,
        conversion_ratio: conversionRatio,
        production_unit: product.production_unit || product.unit,
        default_wastage_percentage: defaultWastage,
        target_margin_percentage: targetMargin,
        min_allowed_margin_percent: product.min_allowed_margin_percent !== undefined && product.min_allowed_margin_percent !== null && !isNaN(Number(product.min_allowed_margin_percent))
          ? Number(product.min_allowed_margin_percent)
          : 15.0,
        minimum_charge: Math.max(0, Number(product.minimum_charge) || 0),
        min_billable_quantity: product.min_billable_quantity !== undefined && product.min_billable_quantity !== null ? Math.max(0, Number(product.min_billable_quantity)) : 0,
        min_order_quantity: product.min_order_quantity !== undefined && product.min_order_quantity !== null ? Math.max(0.01, Number(product.min_order_quantity)) : 1.0,
        allow_manual_override: product.allow_manual_override !== undefined ? Boolean(product.allow_manual_override) : true,
        price_tiers: product.price_tiers || {},
        cost_breakdown: product.cost_breakdown || {},
        components: product.components || [],
        vat_applicable: Boolean(product.vat_applicable),
        is_tax_inclusive: Boolean(product.is_tax_inclusive),
        roll_width_ft: product.roll_width_ft !== undefined && product.roll_width_ft !== null ? Number(product.roll_width_ft) : null,
        roll_length_ft: product.roll_length_ft !== undefined && product.roll_length_ft !== null ? Number(product.roll_length_ft) : null,
        sheet_width_ft: product.sheet_width_ft !== undefined && product.sheet_width_ft !== null ? Number(product.sheet_width_ft) : null,
        sheet_length_ft: product.sheet_length_ft !== undefined && product.sheet_length_ft !== null ? Number(product.sheet_length_ft) : null,
        available_widths_ft: product.available_widths_ft || product.material_config?.available_widths_ft || null,
        standard_roll_length_ft: product.standard_roll_length_ft || product.material_config?.standard_roll_length_ft || null,
        available_sheet_sizes: product.available_sheet_sizes || product.material_config?.available_sheet_sizes || null,
        production_width_allowance: product.production_width_allowance !== undefined && product.production_width_allowance !== null ? Number(product.production_width_allowance) : 0,
        production_length_allowance: product.production_length_allowance !== undefined && product.production_length_allowance !== null ? Number(product.production_length_allowance) : 0,
        allowance_unit: product.allowance_unit || 'ft',
        material_spec: product.material_spec?.trim() || null,
        description: product.description?.trim() || null,
        description_bn: product.description_bn?.trim() || null,
        dimensions_spec: product.dimensions_spec?.trim() || null,
        base_cost: calculatedBaseCost,
        selling_price: Math.max(0, Number(product.selling_price) || 0),
        min_price: Math.max(0, Number(product.min_price) || 0),
        tax_rate: product.tax_rate !== undefined && product.tax_rate !== null && !isNaN(Number(product.tax_rate)) ? Number(product.tax_rate) : 7.5,
        pricing_formula: {
          ...(typeof product.pricing_formula === 'object' && product.pricing_formula !== null ? product.pricing_formula : {}),
          entity_type: product.entity_type || (product.product_type === 'print_service' ? 'service' : product.product_type === 'material' ? 'material' : 'product'),
          service_config: product.service_config || null,
          material_config: product.material_config || null,
          available_widths_ft: product.available_widths_ft || product.material_config?.available_widths_ft || null,
          standard_roll_length_ft: product.standard_roll_length_ft || product.material_config?.standard_roll_length_ft || null,
          available_sheet_sizes: product.available_sheet_sizes || product.material_config?.available_sheet_sizes || null,
          purchase_price_per_sft: product.material_config?.purchase_price_per_sft || null,
          allowance_unit: product.allowance_unit || 'ft',
          production_width_allowance: product.production_width_allowance !== undefined && product.production_width_allowance !== null ? Number(product.production_width_allowance) : (product.material_config?.extra_width_allowance_ft ?? 0),
          production_length_allowance: product.production_length_allowance !== undefined && product.production_length_allowance !== null ? Number(product.production_length_allowance) : 0,
        },
        requires_design: Boolean(product.requires_design),
        requires_approval: Boolean(product.requires_approval),
        requires_production: product.requires_production !== undefined ? Boolean(product.requires_production) : true,
        requires_fabrication: Boolean(product.requires_fabrication),
        requires_finishing: Boolean(product.requires_finishing),
        requires_installation: Boolean(product.requires_installation),
        requires_delivery: Boolean(product.requires_delivery),
        entity_type: product.entity_type || (product.product_type === 'print_service' ? 'service' : product.product_type === 'material' ? 'material' : 'product'),
        service_config: product.service_config || {},
        material_config: product.material_config || {},
        is_service: product.is_service !== undefined ? Boolean(product.is_service) : (product.entity_type === 'service' || product.product_type === 'print_service'),
        is_ready_product: product.is_ready_product !== undefined ? Boolean(product.is_ready_product) : (product.entity_type === 'product' || product.product_type === 'ready_product'),
        default_department: product.default_department || 'printing',
        estimated_production_time_hours: product.estimated_production_time_hours !== undefined && product.estimated_production_time_hours !== null && !isNaN(Number(product.estimated_production_time_hours)) ? Number(product.estimated_production_time_hours) : 4.0,
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
          const testRecord: ProductRecord = enrichProductRecord({
            id: product.id || `prd-test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            ...payload,
          })
          PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCTS, testRecord)
          return testRecord
        }
        throw new Error('Authoritative database connection is required to create a product.')
      }

      try {
        const dbPayload = sanitizeProductDbPayload(payload)
        const supabase = await createClient()
        const { data, error } = await (supabase as any)
          .from('products')
          .insert(dbPayload)
          .select()
          .single()

        if (error) {
          throw new Error(`Failed to save product in database: ${error.message}`)
        }

        if (!data) {
          throw new Error('Database insert succeeded but returned no record.')
        }

        // In test mode keep store synced
        const enriched = enrichProductRecord(data as ProductRecord)
        if (isTestMode()) {
          PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCTS, enriched)
        }

        return enriched
      } catch (err: any) {
        if (isTestMode() && !err.message.includes('already exists')) {
          const testRecord: ProductRecord = enrichProductRecord({
            id: product.id || `prd-test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            ...payload,
          })
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

      if (updates.components && Array.isArray(updates.components)) {
        const circularCheck = validateCircularBOM(id, updates.components)
        if (circularCheck.hasCycle) {
          throw new Error(circularCheck.error)
        }
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

      if (payload.base_cost !== undefined) payload.base_cost = !isNaN(Number(payload.base_cost)) ? Math.max(0, Number(payload.base_cost)) : 0
      if (payload.selling_price !== undefined) payload.selling_price = !isNaN(Number(payload.selling_price)) ? Math.max(0, Number(payload.selling_price)) : 0
      if (payload.min_price !== undefined) payload.min_price = !isNaN(Number(payload.min_price)) ? Math.max(0, Number(payload.min_price)) : 0
      if (payload.tax_rate !== undefined) payload.tax_rate = !isNaN(Number(payload.tax_rate)) ? Number(payload.tax_rate) : 7.5
      if (payload.purchase_price !== undefined) payload.purchase_price = !isNaN(Number(payload.purchase_price)) ? Math.max(0, Number(payload.purchase_price)) : 0
      if (payload.conversion_ratio !== undefined) payload.conversion_ratio = !isNaN(Number(payload.conversion_ratio)) ? Math.max(0.0001, Number(payload.conversion_ratio)) : 1.0
      if (payload.default_wastage_percentage !== undefined) payload.default_wastage_percentage = !isNaN(Number(payload.default_wastage_percentage)) ? Math.max(0, Number(payload.default_wastage_percentage)) : 0
      if (payload.target_margin_percentage !== undefined) payload.target_margin_percentage = !isNaN(Number(payload.target_margin_percentage)) ? Number(payload.target_margin_percentage) : 35.0
      if (payload.minimum_charge !== undefined) payload.minimum_charge = !isNaN(Number(payload.minimum_charge)) ? Math.max(0, Number(payload.minimum_charge)) : 0
      if (payload.min_order_quantity !== undefined) payload.min_order_quantity = !isNaN(Number(payload.min_order_quantity)) ? Math.max(0.01, Number(payload.min_order_quantity)) : 1.0
      if (payload.min_billable_quantity !== undefined) payload.min_billable_quantity = !isNaN(Number(payload.min_billable_quantity)) ? Math.max(0, Number(payload.min_billable_quantity)) : 0
      if (payload.min_allowed_margin_percent !== undefined) payload.min_allowed_margin_percent = !isNaN(Number(payload.min_allowed_margin_percent)) ? Number(payload.min_allowed_margin_percent) : 15.0
      if (payload.allow_manual_override !== undefined) payload.allow_manual_override = Boolean(payload.allow_manual_override)
      if (payload.pricing_method !== undefined) payload.pricing_method = normalizePricingMethod(payload.pricing_method)
      if (payload.production_width_allowance !== undefined) payload.production_width_allowance = !isNaN(Number(payload.production_width_allowance)) ? Number(payload.production_width_allowance) : 0
      if (payload.production_length_allowance !== undefined) payload.production_length_allowance = !isNaN(Number(payload.production_length_allowance)) ? Number(payload.production_length_allowance) : 0
      if (payload.allowance_unit !== undefined) payload.allowance_unit = String(payload.allowance_unit)

      // Merge extension fields into pricing_formula
      const existingFormula = typeof updates.pricing_formula === 'object' && updates.pricing_formula !== null ? updates.pricing_formula : {}
      const formulaUpdates: Record<string, any> = { ...existingFormula }
      if (updates.entity_type !== undefined) {
        payload.entity_type = updates.entity_type
        formulaUpdates.entity_type = updates.entity_type
      }
      if (updates.service_config !== undefined) {
        payload.service_config = updates.service_config || {}
        formulaUpdates.service_config = updates.service_config || {}
      }
      if (updates.material_config !== undefined) {
        payload.material_config = updates.material_config || {}
        formulaUpdates.material_config = updates.material_config || {}
      }
      if (updates.available_widths_ft !== undefined) {
        payload.available_widths_ft = updates.available_widths_ft
        formulaUpdates.available_widths_ft = updates.available_widths_ft
      }
      if (updates.standard_roll_length_ft !== undefined) {
        payload.standard_roll_length_ft = updates.standard_roll_length_ft
        formulaUpdates.standard_roll_length_ft = updates.standard_roll_length_ft
      }
      if (updates.available_sheet_sizes !== undefined) {
        payload.available_sheet_sizes = updates.available_sheet_sizes
        formulaUpdates.available_sheet_sizes = updates.available_sheet_sizes
      }
      if (updates.material_config?.purchase_price_per_sft !== undefined) {
        formulaUpdates.purchase_price_per_sft = updates.material_config.purchase_price_per_sft
      }
      if (updates.production_width_allowance !== undefined) {
        payload.production_width_allowance = updates.production_width_allowance
        formulaUpdates.production_width_allowance = updates.production_width_allowance
      }
      if (updates.production_length_allowance !== undefined) {
        payload.production_length_allowance = updates.production_length_allowance
        formulaUpdates.production_length_allowance = updates.production_length_allowance
      }

      if (Object.keys(formulaUpdates).length > 0) {
        payload.pricing_formula = formulaUpdates
      }

      if (!isSupabaseConfigured()) {
        if (isTestMode()) {
          const prods = PrintERPDataStore.get<ProductRecord[]>(STORAGE_KEYS.PRODUCTS) || []
          const existing = prods.find((p) => p.id === id && (!p.company_id || p.company_id === companyId))
          if (!existing) throw new Error(`Product ${id} not found in tenant catalog.`)
          const updated = PrintERPDataStore.updateItem<ProductRecord>(STORAGE_KEYS.PRODUCTS, id, payload)
          if (!updated) throw new Error(`Product ${id} not found in test store`)
          return enrichProductRecord(updated)
        }
        throw new Error('Authoritative database connection is required to update a product.')
      }

      try {
        const dbPayload = sanitizeProductDbPayload(payload)
        const supabase = await createClient()
        const { data, error } = await (supabase as any)
          .from('products')
          .update(dbPayload)
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

        const enriched = enrichProductRecord(data as ProductRecord)
        if (isTestMode()) {
          PrintERPDataStore.updateItem<ProductRecord>(STORAGE_KEYS.PRODUCTS, id, enriched)
        }

        return enriched
      } catch (err: any) {
        if (isTestMode() && !err.message.includes('already assigned')) {
          const prods = PrintERPDataStore.get<ProductRecord[]>(STORAGE_KEYS.PRODUCTS) || []
          const existing = prods.find((p) => p.id === id && (!p.company_id || p.company_id === companyId))
          if (!existing) throw new Error(`Product ${id} not found in tenant catalog.`)
          const updated = PrintERPDataStore.updateItem<ProductRecord>(STORAGE_KEYS.PRODUCTS, id, payload)
          if (updated) return enrichProductRecord(updated)
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
    changedByName?: string,
    commercialDetails?: {
      oldPurchasePrice?: number
      newPurchasePrice?: number
      oldMarginPercent?: number
      newMarginPercent?: number
      oldWastagePercent?: number
      newWastagePercent?: number
    }
  ): Promise<PriceHistoryRecord> {
    const entry: PriceHistoryRecord = {
      id: `ph-${Date.now()}`,
      company_id: companyId,
      product_id: productId,
      old_price: oldPrice,
      new_price: newPrice,
      old_purchase_price: commercialDetails?.oldPurchasePrice,
      new_purchase_price: commercialDetails?.newPurchasePrice,
      old_margin_percent: commercialDetails?.oldMarginPercent,
      new_margin_percent: commercialDetails?.newMarginPercent,
      old_wastage_percent: commercialDetails?.oldWastagePercent,
      new_wastage_percent: commercialDetails?.newWastagePercent,
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
          old_purchase_price: commercialDetails?.oldPurchasePrice || null,
          new_purchase_price: commercialDetails?.newPurchasePrice || null,
          old_margin_percent: commercialDetails?.oldMarginPercent || null,
          new_margin_percent: commercialDetails?.newMarginPercent || null,
          old_wastage_percent: commercialDetails?.oldWastagePercent || null,
          new_wastage_percent: commercialDetails?.newWastagePercent || null,
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
    options?:
      | {
          allowFloorOverride?: boolean
          overrideReason?: string
          authorizedBy?: string
          tier?: string
        }
      | string
  ): Promise<ResolvedProductPrice> {
    return measureAsync(`ProductRepository.resolveCustomerProductPrice(${productId})`, async () => {
      const product = await this.getProductById(productId, companyId)
      if (!product) {
        throw new Error(`Product ${productId} not found in catalog.`)
      }

      const defaultRate = Number(product.selling_price) || 0
      const minPrice = Number(product.min_price) || 0
      const baseCost = Number(product.base_cost) || 0

      const parsedOptions = typeof options === 'string' ? { tier: options } : options
      const requestedTier = parsedOptions?.tier?.toLowerCase() as PriceTierKey | undefined

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

      // Check explicit tier override if provided
      if (requestedTier && product.price_tiers && (product.price_tiers as any)[requestedTier] !== undefined) {
        const tierRate = Number((product.price_tiers as any)[requestedTier])
        if (tierRate > 0) {
          resolved = {
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            unit: product.unit,
            sellingPrice: defaultRate,
            effectiveRate: tierRate,
            minPrice,
            baseCost,
            source: 'customer_tier',
            sourceLabel: `${requestedTier.toUpperCase()} Tier Rate`,
            sourceDetails: `Product ${requestedTier} tier price ৳${tierRate}/${product.unit}`,
            appliedTier: requestedTier,
            tier: requestedTier,
          }
        }
      }

      if (customerId && resolved.source === 'default') {
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
            let customerCategory = requestedTier || 'retail'
            let assignedPriceListId: string | null = null

            if (isSupabaseConfigured()) {
              const supabase = await createClient()
              const { data: cust } = await (supabase as any)
                .from('customers')
                .select('customer_type, price_list_id')
                .eq('id', customerId)
                .maybeSingle()

              if (cust) {
                customerCategory = requestedTier || cust.customer_type || cust.customer_category || 'retail'
                assignedPriceListId = cust.price_list_id || null
              }
            } else if (isTestMode()) {
              const customers = PrintERPDataStore.get<any[]>(STORAGE_KEYS.CUSTOMERS) || []
              const cust = customers.find((c) => c.id === customerId)
              if (cust) {
                customerCategory = requestedTier || cust.customer_type || cust.customer_category || 'retail'
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

            // Tier 2.4: Check Pricing Rules (pricing_rules)
            if (!foundPriceListItem) {
              const pricingRules = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.PRICING_RULES) || []).filter(
                (r) => (!r.company_id || r.company_id === companyId) && r.customer_type === customerCategory && r.status === 'active'
              )
              const match = pricingRules.find((r) => r.product_id === productId || (!r.product_id && r.category === product.category))
              if (match && match.calculated_price !== undefined) {
                resolved = {
                  productId: product.id,
                  productName: product.name,
                  sku: product.sku,
                  unit: product.unit,
                  sellingPrice: defaultRate,
                  effectiveRate: Number(match.calculated_price),
                  minPrice,
                  baseCost,
                  source: 'customer_tier',
                  sourceLabel: `${customerCategory.toUpperCase()} Pricing`,
                  sourceDetails: match.notes || `${customerCategory} pricing rate ৳${match.calculated_price}/${product.unit}`,
                }
                foundPriceListItem = true
              }
            }

            // Tier 2.5: Product Direct Price Tiers (retail, corporate, dealer, wholesale, custom)
            if (!foundPriceListItem && product.price_tiers) {
              const tierKey = customerCategory.toLowerCase() as PriceTierKey
              if (product.price_tiers[tierKey] && Number(product.price_tiers[tierKey]) > 0) {
                const tierRate = Number(product.price_tiers[tierKey])
                resolved = {
                  productId: product.id,
                  productName: product.name,
                  sku: product.sku,
                  unit: product.unit,
                  sellingPrice: defaultRate,
                  effectiveRate: tierRate,
                  minPrice,
                  baseCost,
                  source: 'customer_tier',
                  sourceLabel: `${customerCategory.toUpperCase()} Tier Rate`,
                  sourceDetails: `Product ${customerCategory} tier price ৳${tierRate}/${product.unit}`,
                }
                foundPriceListItem = true
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

      // Calculate commercial economics
      const purchasePrice = Number(product.purchase_price) || 0
      const conversionRatio = Math.max(0.0001, Number(product.conversion_ratio) || 1.0)
      const defaultWastage = Math.max(0, Number(product.default_wastage_percentage) || 0)
      const targetMargin = product.target_margin_percentage !== undefined && product.target_margin_percentage !== null && !isNaN(Number(product.target_margin_percentage))
        ? Number(product.target_margin_percentage)
        : 35.0
      const minAllowedMargin = product.min_allowed_margin_percent !== undefined && product.min_allowed_margin_percent !== null && !isNaN(Number(product.min_allowed_margin_percent))
        ? Number(product.min_allowed_margin_percent)
        : 15.0
      const minimumCharge = Number(product.minimum_charge) || 0
      const minOrderQty = Number(product.min_order_quantity) || 1.0
      const minBillableQty = product.min_billable_quantity !== undefined && product.min_billable_quantity !== null ? Math.max(0, Number(product.min_billable_quantity)) : 0

      let effectiveUnitCost = Number(product.base_cost) || 0
      if (purchasePrice > 0 && conversionRatio > 0) {
        const costCalc = calculateEffectiveUnitCost({
          purchasePrice,
          conversionRatio,
          defaultWastagePercent: defaultWastage,
        })
        effectiveUnitCost = costCalc.effectiveCostPerSellingUnit
      }

      const suggestedPrice = calculateSuggestedSellingPrice(effectiveUnitCost, targetMargin)

      // ========================================================================
      // TIER 5 / PHASE 8: MINIMUM PRICE SAFETY FLOOR & LOW-MARGIN PROTECTION
      // ========================================================================
      const originalRate = resolved.effectiveRate
      const preMarginCalc = calculateGrossMargin(effectiveUnitCost, originalRate)
      const isBelowFloor = minPrice > 0 && originalRate < minPrice
      const isLowMargin = minAllowedMargin > 0 && preMarginCalc.grossMarginPercent < minAllowedMargin

      if (isBelowFloor || isLowMargin) {
        resolved.isBelowMinimum = isBelowFloor
        resolved.isBelowMinimumMargin = isLowMargin
        resolved.originalRequestedRate = originalRate

        if (parsedOptions?.allowFloorOverride && parsedOptions.overrideReason?.trim()) {
          // Authorized price override
          resolved.isFloorEnforced = false
          resolved.effectiveRate = originalRate
          resolved.overrideReason = parsedOptions.overrideReason.trim()
          resolved.authorizedBy = parsedOptions.authorizedBy || 'Authorized Manager'
          resolved.sourceDetails = (resolved.sourceDetails || '') + ` [Floor Override: ৳${originalRate}/${product.unit}, Reason: ${parsedOptions.overrideReason}]`

          // Log price override
          ProductRepository.logPriceOverride(companyId, {
            product_id: product.id,
            product_name: product.name,
            original_price: defaultRate,
            override_price: originalRate,
            overridden_price: originalRate,
            original_margin_percent: calculateGrossMargin(effectiveUnitCost, defaultRate).grossMarginPercent,
            override_margin_percent: preMarginCalc.grossMarginPercent,
            overridden_margin_percent: preMarginCalc.grossMarginPercent,
            reason: parsedOptions.overrideReason.trim(),
            authorized_by_name: parsedOptions.authorizedBy || 'Authorized User',
          }).catch(() => {})
        } else {
          // Enforce minimum floor strictly if below minPrice
          resolved.isFloorEnforced = true
          if (isBelowFloor) {
            resolved.effectiveRate = minPrice
            resolved.sourceDetails = (resolved.sourceDetails || '') + ` [Floor Enforced: min ৳${minPrice}/${product.unit}]`
          } else {
            resolved.sourceDetails = (resolved.sourceDetails || '') + ` [Low Margin: ${preMarginCalc.grossMarginPercent}% < min ${minAllowedMargin}%]`
          }
        }
      } else {
        resolved.isBelowMinimum = false
        resolved.isBelowMinimumMargin = false
        resolved.isFloorEnforced = false
      }

      const finalMarginCalc = calculateGrossMargin(effectiveUnitCost, resolved.effectiveRate)

      resolved.pricingMethod = product.pricing_method
      resolved.minBillableQuantity = minBillableQty
      resolved.minAllowedMarginPercent = minAllowedMargin
      resolved.costBasisType = product.cost_basis_type
      resolved.estimatedDirectCost = product.estimated_direct_cost
      resolved.priceTiers = product.price_tiers
      resolved.purchaseUnit = product.purchase_unit || product.unit
      resolved.purchasePrice = purchasePrice
      resolved.conversionRatio = conversionRatio
      resolved.defaultWastagePercent = defaultWastage
      resolved.targetMarginPercent = targetMargin
      resolved.minimumCharge = minimumCharge
      resolved.minOrderQuantity = minOrderQty
      resolved.effectiveUnitCost = effectiveUnitCost
      resolved.suggestedSellingPrice = suggestedPrice
      resolved.grossProfitPerUnit = finalMarginCalc.grossProfit
      resolved.grossMarginPercent = finalMarginCalc.grossMarginPercent
      resolved.production_width_allowance = product.production_width_allowance
      resolved.production_length_allowance = product.production_length_allowance
      resolved.allowance_unit = product.allowance_unit

      return resolved
    })
  }

  // ============================================================================
  // SUPPLIER PURCHASE ECONOMICS METHODS
  // ============================================================================

  static async getProductSupplierPrices(
    productId: string,
    companyId: string
  ): Promise<ProductSupplierPriceRecord[]> {
    return measureAsync(`ProductRepository.getProductSupplierPrices(${productId})`, async () => {
      if (!isSupabaseConfigured() || isTestMode()) {
        const prices = PrintERPDataStore.get<ProductSupplierPriceRecord[]>(STORAGE_KEYS.PRODUCT_SUPPLIER_PRICES) || []
        return prices.filter((p) => (!p.company_id || p.company_id === companyId) && p.product_id === productId)
      }

      try {
        const supabase = await createClient()
        const { data, error } = await (supabase as any)
          .from('product_supplier_prices')
          .select('*')
          .eq('company_id', companyId)
          .eq('product_id', productId)
          .order('purchase_price', { ascending: true })

        if (error) throw error
        return (data || []) as ProductSupplierPriceRecord[]
      } catch (err: any) {
        if (isTestMode()) {
          const prices = PrintERPDataStore.get<ProductSupplierPriceRecord[]>(STORAGE_KEYS.PRODUCT_SUPPLIER_PRICES) || []
          return prices.filter((p) => (!p.company_id || p.company_id === companyId) && p.product_id === productId)
        }
        throw err
      }
    })
  }

  static async saveProductSupplierPrice(
    companyId: string,
    data: Partial<ProductSupplierPriceRecord> & { product_id: string; supplier_name: string; purchase_price: number }
  ): Promise<ProductSupplierPriceRecord> {
    return measureAsync(`ProductRepository.saveProductSupplierPrice`, async () => {
      const record: ProductSupplierPriceRecord = {
        id: data.id || `psp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        company_id: companyId,
        product_id: data.product_id,
        supplier_id: data.supplier_id || null,
        supplier_name: data.supplier_name.trim(),
        purchase_unit: data.purchase_unit || 'roll',
        conversion_ratio: Math.max(0.0001, Number(data.conversion_ratio) || 1.0),
        purchase_price: Math.max(0, Number(data.purchase_price) || 0),
        moq: Math.max(0.01, Number(data.moq) || 1.0),
        lead_time_days: Math.max(1, Number(data.lead_time_days) || 1),
        last_purchase_date: data.last_purchase_date || null,
        is_preferred: Boolean(data.is_preferred),
        notes: data.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      if (!isSupabaseConfigured() || isTestMode()) {
        const prices = PrintERPDataStore.get<ProductSupplierPriceRecord[]>(STORAGE_KEYS.PRODUCT_SUPPLIER_PRICES) || []
        const existingIdx = prices.findIndex((p) => p.id === record.id)
        if (existingIdx >= 0) {
          prices[existingIdx] = record
        } else {
          prices.push(record)
        }
        PrintERPDataStore.set(STORAGE_KEYS.PRODUCT_SUPPLIER_PRICES, prices)
        return record
      }

      const supabase = await createClient()
      const { data: saved, error } = await (supabase as any)
        .from('product_supplier_prices')
        .upsert(record)
        .select()
        .single()

      if (error) throw new Error(`Failed to save supplier price: ${error.message}`)
      return saved as ProductSupplierPriceRecord
    })
  }

  static async deleteProductSupplierPrice(id: string, companyId: string): Promise<boolean> {
    return measureAsync(`ProductRepository.deleteProductSupplierPrice(${id})`, async () => {
      if (!isSupabaseConfigured() || isTestMode()) {
        const prices = PrintERPDataStore.get<ProductSupplierPriceRecord[]>(STORAGE_KEYS.PRODUCT_SUPPLIER_PRICES) || []
        PrintERPDataStore.set(
          STORAGE_KEYS.PRODUCT_SUPPLIER_PRICES,
          prices.filter((p) => p.id !== id || (p.company_id && p.company_id !== companyId))
        )
        return true
      }

      const supabase = await createClient()
      const { error } = await (supabase as any)
        .from('product_supplier_prices')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId)

      if (error) throw error
      return true
    })
  }

  // ============================================================================
  // PRICE OVERRIDES AUDITING METHODS
  // ============================================================================

  static async logPriceOverride(
    companyId: string,
    data: Partial<PriceOverrideRecord> & {
      original_price: number
      override_price?: number
      overridden_price?: number
      reason: string
    }
  ): Promise<PriceOverrideRecord> {
    const overridePrice = Number(data.overridden_price ?? data.override_price) || 0
    const entry: PriceOverrideRecord = {
      id: data.id || `ovr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      company_id: companyId,
      product_id: data.product_id || null,
      product_name: data.product_name || null,
      document_type: data.document_type || 'quotation',
      document_code: data.document_code || null,
      document_id: data.document_id || null,
      original_price: Number(data.original_price) || 0,
      override_price: overridePrice,
      overridden_price: overridePrice,
      original_margin_percent: data.original_margin_percent || null,
      override_margin_percent: data.override_margin_percent || data.overridden_margin_percent || null,
      overridden_margin_percent: data.override_margin_percent || data.overridden_margin_percent || null,
      reason: data.reason.trim(),
      authorized_by: data.authorized_by || data.authorized_by_name || null,
      authorized_by_id: data.authorized_by_id || null,
      authorized_by_name: data.authorized_by_name || data.authorized_by || 'Manager',
      tenant_slug: data.tenant_slug || null,
      created_at: new Date().toISOString(),
    }

    if (!isSupabaseConfigured() || isTestMode()) {
      PrintERPDataStore.addItem(STORAGE_KEYS.PRICE_OVERRIDES, entry)
      return entry
    }

    try {
      const supabase = await createClient()
      const { data: saved, error } = await (supabase as any)
        .from('price_overrides')
        .insert(entry)
        .select()
        .single()

      if (error) {
        PrintERPDataStore.addItem(STORAGE_KEYS.PRICE_OVERRIDES, entry)
        return entry
      }
      return saved as PriceOverrideRecord
    } catch {
      PrintERPDataStore.addItem(STORAGE_KEYS.PRICE_OVERRIDES, entry)
      return entry
    }
  }

  static async getPriceOverrides(
    companyId: string,
    productId?: string,
    limit: number = 50
  ): Promise<PriceOverrideRecord[]> {
    if (!isSupabaseConfigured() || isTestMode()) {
      let entries = PrintERPDataStore.get<PriceOverrideRecord[]>(STORAGE_KEYS.PRICE_OVERRIDES) || []
      entries = entries.filter((e) => !e.company_id || e.company_id === companyId)
      if (productId) entries = entries.filter((e) => e.product_id === productId)
      return entries.slice(0, limit)
    }

    try {
      const supabase = await createClient()
      let query = (supabase as any)
        .from('price_overrides')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (productId) {
        query = query.eq('product_id', productId)
      }

      const { data, error } = await query
      if (error) throw error
      return (data || []) as PriceOverrideRecord[]
    } catch {
      let entries = PrintERPDataStore.get<PriceOverrideRecord[]>(STORAGE_KEYS.PRICE_OVERRIDES) || []
      entries = entries.filter((e) => !e.company_id || e.company_id === companyId)
      if (productId) entries = entries.filter((e) => e.product_id === productId)
      return entries.slice(0, limit)
    }
  }

  // Ergonomic static aliases for seamless multi-tenant calling
  static async upsertSupplierPrice(data: Partial<ProductSupplierPriceRecord> & { company_id: string; product_id: string; supplier_name: string; purchase_price: number }): Promise<ProductSupplierPriceRecord> {
    return ProductRepository.saveProductSupplierPrice(data.company_id, data)
  }

  static async getSupplierPrices(productId: string, companyId: string): Promise<ProductSupplierPriceRecord[]> {
    return ProductRepository.getProductSupplierPrices(productId, companyId)
  }

  static async recordPriceOverride(data: Partial<PriceOverrideRecord> & { company_id: string; original_price?: number; standard_price?: number; overridden_price?: number; override_price?: number; reason: string }): Promise<PriceOverrideRecord> {
    return ProductRepository.logPriceOverride(data.company_id, {
      ...data,
      original_price: Number(data.original_price ?? data.standard_price) || 0,
      overridden_price: Number(data.overridden_price ?? data.override_price) || 0,
    })
  }
}
