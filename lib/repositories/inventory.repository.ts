import { createClient } from '../supabase/server.ts'
import type {
  MaterialRecord,
  InventoryLocationRecord,
  InventoryStockBalanceRecord,
  TaskMaterialRequirementRecord,
  MaterialRequestRecord,
  MaterialRequestItemRecord,
  MaterialIssueRecord,
  MaterialIssueItemRecord,
  InventoryRemnantRecord,
  InventoryTransferRecord,
  InventoryAdjustmentRecord,
  StockLedgerRecord,
  InventoryRollRecord,
  InventoryTransactionType,
  MaterialUnit,
  MaterialWastageRecord,
  FloorConsumptionRecord,
  IssueMasterRollParams,
  IssueMasterRollResult,
} from '../../types/inventory.types.ts'
import type { PriceIntelligenceRecord } from '../../types/price-intelligence.types.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../db/data-store.ts'
import { measureAsync } from '../performance/logger.ts'
import { MachineryRepository } from './machinery.repository.ts'
import type { ProductRecord } from '../../types/product.types.ts'
import { isMaterialProduct, getMaterialWarehouseStockBreakdown } from '../units.ts'

export class InventoryRepository {
  // ==========================================
  // LOCATIONS
  // ==========================================

  static async getLocations(companyId: string, branchId?: string | null): Promise<InventoryLocationRecord[]> {
    const supabase = await createClient()
    let query = (supabase as any)
      .from('inventory_locations')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('location_name', { ascending: true })

    if (branchId) {
      query = query.or(`branch_id.eq.${branchId},branch_id.is.null`)
    }

    const { data, error } = await query
    if (error) {
      throw new Error(`Failed to fetch inventory locations: ${error.message}`)
    }
    return (data || []) as unknown as InventoryLocationRecord[]
  }

  static async getLocationById(id: string, companyId: string): Promise<InventoryLocationRecord | null> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('inventory_locations')
      .select('*')
      .eq('id', id)
      .eq('company_id', companyId)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to fetch inventory location ${id}: ${error.message}`)
    }
    return (data as unknown as InventoryLocationRecord) || null
  }

  static async createLocation(location: {
    company_id: string
    branch_id?: string | null
    location_code: string
    location_name: string
    location_type: string
    description?: string | null
  }): Promise<InventoryLocationRecord> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('inventory_locations')
      .insert({
        company_id: location.company_id,
        branch_id: location.branch_id || null,
        location_code: location.location_code.trim().toUpperCase(),
        location_name: location.location_name.trim(),
        location_type: location.location_type,
        description: location.description?.trim() || null,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create inventory location: ${error.message}`)
    }
    return data as unknown as InventoryLocationRecord
  }

  // ==========================================
  // MATERIALS MASTER
  // ==========================================

  static async getMaterials(companyId: string, options?: {
    branchId?: string | null
    category?: string
    search?: string
    lowStockOnly?: boolean
  }): Promise<MaterialRecord[]> {
    return measureAsync(`InventoryRepository.getMaterials(${companyId})`, async () => {
      const list: MaterialRecord[] = []
      const seenIds = new Set<string>()
      const seenSkus = new Set<string>()

      const normTarget = companyId ? companyId.toLowerCase() : ''
      const cleanTarget = normTarget.replace(/^comp-/, '').replace(/^co-/, '')

      const matchesTenant = (cId?: string | null) => {
        if (!companyId) return true
        if (!cId) return true
        const c = cId.toLowerCase()
        return c === normTarget || c === cleanTarget || c === `comp-${cleanTarget}` || c === `co-${cleanTarget}`
      }

      try {
        const supabase = await createClient()

        // 1. Fetch materials from materials table
        let query = (supabase as any)
          .from('materials')
          .select('*')
          .eq('company_id', companyId)
          .order('name', { ascending: true })

        if (options?.category && options.category !== 'all') {
          query = query.eq('category', options.category)
        }

        const { data: matData } = await query
        if (matData && Array.isArray(matData)) {
          for (const m of matData) {
            if (m && m.id && !seenIds.has(m.id)) {
              seenIds.add(m.id)
              if (m.sku) seenSkus.add(m.sku.toLowerCase())
              list.push(m as MaterialRecord)
            }
          }
        }

        // 2. Fetch raw materials from products table in Supabase
        let prodQuery = (supabase as any)
          .from('products')
          .select('*, variants:product_variants(*)')
          .eq('company_id', companyId)

        const { data: prodData } = await prodQuery
        if (prodData && Array.isArray(prodData)) {
          for (const p of prodData) {
            if (!p || !p.id) continue

            const isMat =
              isMaterialProduct(p) ||
              p.entity_type === 'material' ||
              p.product_type === 'material' ||
              (p.product_type as any) === 'raw_material' ||
              p.commercial_type === 'material' ||
              ['materials', 'roll_media', 'rigid_sheets', 'inks', 'raw_materials'].includes(p.category || '') ||
              (p.sku && (p.sku.startsWith('MAT-') || p.sku.startsWith('RM-')))

            if (!isMat) continue

            const cost = Number(p.purchase_price || p.base_cost || 0)
            const isRoll = Boolean(p.roll_width_ft || p.is_roll || (p.category && p.category.includes('roll')) || (p.material_config as any)?.material_type === 'roll' || p.purchase_unit === 'roll')
            const rawPurchaseUnit = p.purchase_unit || (p.material_config as any)?.purchase_unit || (p.pricing_formula as any)?.material_config?.purchase_unit
            const computedPurchaseUnit = isRoll
              ? (rawPurchaseUnit && !['sft', 'sqft'].includes(rawPurchaseUnit.toLowerCase()) ? rawPurchaseUnit : 'roll')
              : rawPurchaseUnit || p.unit

            const existingIndex = list.findIndex((m) => m.id === p.id || (p.sku && m.sku && m.sku.toLowerCase() === p.sku.toLowerCase()))

            if (existingIndex >= 0) {
              const existing = list[existingIndex]
              list[existingIndex] = {
                ...existing,
                name: p.name || existing.name,
                name_bn: p.name_bn || existing.name_bn,
                category: p.category || existing.category,
                unit: (p.selling_unit || p.unit || existing.unit || 'pcs') as MaterialUnit,
                purchase_unit: computedPurchaseUnit || existing.purchase_unit,
                master_purchase_unit: computedPurchaseUnit || existing.master_purchase_unit,
                average_cost: cost > 0 ? cost : existing.average_cost,
                last_purchase_price: cost > 0 ? cost : existing.last_purchase_price,
                cost_per_unit: cost > 0 ? cost : existing.cost_per_unit,
                is_roll: isRoll || existing.is_roll,
                roll_width_ft: p.roll_width_ft ? Number(p.roll_width_ft) : existing.roll_width_ft,
                roll_length_ft: p.roll_length_ft ? Number(p.roll_length_ft) : existing.roll_length_ft,
                available_widths_ft: p.available_widths_ft || (p.material_config as any)?.available_widths_ft || existing.available_widths_ft || (p.roll_width_ft ? [Number(p.roll_width_ft)] : undefined),
                standard_roll_length_ft: p.standard_roll_length_ft ? Number(p.standard_roll_length_ft) : ((p.material_config as any)?.standard_roll_length_ft ? Number((p.material_config as any).standard_roll_length_ft) : existing.standard_roll_length_ft),
                available_sheet_sizes: p.available_sheet_sizes || (p.material_config as any)?.available_sheet_sizes || existing.available_sheet_sizes,
                roll_sizes: p.roll_sizes || (p.material_config as any)?.roll_sizes || (p.pricing_formula as any)?.roll_sizes || existing.roll_sizes,
                material_config: p.material_config || (p.pricing_formula as any)?.material_config || existing.material_config || null,
                purchase_price_per_sft: (p.material_config as any)?.purchase_price_per_sft || (p.pricing_formula as any)?.purchase_price_per_sft || existing.purchase_price_per_sft || null,
                production_width_allowance: p.production_width_allowance || (p.material_config as any)?.extra_width_allowance_ft || (p.pricing_formula as any)?.production_width_allowance || existing.production_width_allowance || 0,
                liquid_volume_capacity: (p as any).liquid_volume_capacity || (p.material_config as any)?.liquid_volume_ml ? `${(p.material_config as any).liquid_volume_ml}ml` : existing.liquid_volume_capacity,
                pack_quantity: (p as any).pack_quantity || (p.material_config as any)?.pack_quantity || existing.pack_quantity,
                variants: (p.variants && p.variants.length > 0) ? p.variants : existing.variants,
                thickness: (p as any).thickness || (p as any).thickness_mm ? `${(p as any).thickness || (p as any).thickness_mm}mm` : existing.thickness,
              }
              continue
            }

            seenIds.add(p.id)
            if (p.sku) seenSkus.add(p.sku.toLowerCase())

            const matRec: MaterialRecord = {
              id: p.id,
              company_id: p.company_id || companyId,
              branch_id: p.branch_id || null,
              sku: p.sku || `MAT-${p.id.substring(0, 6).toUpperCase()}`,
              name: p.name,
              name_bn: p.name_bn || null,
              category: p.category || 'raw_materials',
              unit: (p.selling_unit || p.unit || 'pcs') as MaterialUnit,
              purchase_unit: computedPurchaseUnit,
              master_purchase_unit: computedPurchaseUnit,
              current_stock: Number(p.current_stock ?? p.stock ?? (p.pricing_formula as any)?.current_stock ?? (p.pricing_formula as any)?.opening_stock ?? p.opening_stock ?? 0),
              min_stock_level: Number(p.min_stock_level ?? p.reorder_level ?? (p.pricing_formula as any)?.min_stock_level ?? (p.pricing_formula as any)?.reorder_level ?? 0),
              average_cost: cost,
              last_purchase_price: cost,
              cost_per_unit: cost,
              is_roll: isRoll,
              roll_width_ft: p.roll_width_ft ? Number(p.roll_width_ft) : null,
              roll_length_ft: p.roll_length_ft ? Number(p.roll_length_ft) : null,
              available_widths_ft: p.available_widths_ft || (p.material_config as any)?.available_widths_ft || (p.roll_width_ft ? [Number(p.roll_width_ft)] : undefined),
              standard_roll_length_ft: p.standard_roll_length_ft ? Number(p.standard_roll_length_ft) : ((p.material_config as any)?.standard_roll_length_ft ? Number((p.material_config as any).standard_roll_length_ft) : undefined),
              available_sheet_sizes: p.available_sheet_sizes || (p.material_config as any)?.available_sheet_sizes,
              roll_sizes: p.roll_sizes || (p.material_config as any)?.roll_sizes || (p.pricing_formula as any)?.roll_sizes,
              material_config: p.material_config || (p.pricing_formula as any)?.material_config || null,
              purchase_price_per_sft: (p.material_config as any)?.purchase_price_per_sft || (p.pricing_formula as any)?.purchase_price_per_sft || null,
              production_width_allowance: p.production_width_allowance || (p.material_config as any)?.extra_width_allowance_ft || (p.pricing_formula as any)?.production_width_allowance || 0,
              liquid_volume_capacity: (p as any).liquid_volume_capacity || (p.material_config as any)?.liquid_volume_ml ? `${(p.material_config as any).liquid_volume_ml}ml` : null,
              pack_quantity: (p as any).pack_quantity || (p.material_config as any)?.pack_quantity || null,
              variants: p.variants || [],
              thickness: (p as any).thickness || (p as any).thickness_mm ? `${(p as any).thickness || (p as any).thickness_mm}mm` : undefined,
              is_active: p.is_active !== false,
              created_at: p.created_at || new Date().toISOString(),
              updated_at: p.updated_at || new Date().toISOString(),
            }
            list.push(matRec)
          }
        }
      } catch {}

      // 3. Merge Local DataStore items (materials & material products)
      const localMats: MaterialRecord[] = [
        ...(PrintERPDataStore.getAll<MaterialRecord>(STORAGE_KEYS.MATERIALS, companyId) || []),
        ...(PrintERPDataStore.getAll<MaterialRecord>(STORAGE_KEYS.MATERIALS) || []),
        ...(PrintERPDataStore.get<MaterialRecord[]>(STORAGE_KEYS.MATERIALS, companyId) || []),
        ...(PrintERPDataStore.get<MaterialRecord[]>(STORAGE_KEYS.MATERIALS) || []),
      ]

      for (const m of localMats) {
        if (!m || !m.id) continue
        if (!matchesTenant(m.company_id)) continue

        const existingIndex = list.findIndex((x) => x.id === m.id || (m.sku && x.sku && x.sku.toLowerCase() === m.sku.toLowerCase()))
        if (existingIndex >= 0) {
          const existing = list[existingIndex]
          list[existingIndex] = {
            ...existing,
            ...m,
            roll_sizes: m.roll_sizes || (m as any).material_config?.roll_sizes || existing.roll_sizes,
            material_config: (m as any).material_config || existing.material_config,
            available_widths_ft: m.available_widths_ft || (m as any).material_config?.available_widths_ft || existing.available_widths_ft,
            purchase_price_per_sft: m.purchase_price_per_sft || (m as any).material_config?.purchase_price_per_sft || existing.purchase_price_per_sft,
            production_width_allowance: m.production_width_allowance || (m as any).material_config?.extra_width_allowance_ft || existing.production_width_allowance,
          }
          continue
        }

        seenIds.add(m.id)
        if (m.sku) seenSkus.add(m.sku.toLowerCase())
        list.push(m)
      }

      const localProds: ProductRecord[] = [
        ...(PrintERPDataStore.getAll<ProductRecord>(STORAGE_KEYS.PRODUCTS, companyId) || []),
        ...(PrintERPDataStore.getAll<ProductRecord>(STORAGE_KEYS.PRODUCTS) || []),
        ...(PrintERPDataStore.get<ProductRecord[]>(STORAGE_KEYS.PRODUCTS, companyId) || []),
        ...(PrintERPDataStore.get<ProductRecord[]>(STORAGE_KEYS.PRODUCTS) || []),
      ]

      const allLocalVars = [
        ...(PrintERPDataStore.getAll<any>(STORAGE_KEYS.PRODUCT_VARIANTS, companyId) || []),
        ...(PrintERPDataStore.get<any[]>(STORAGE_KEYS.PRODUCT_VARIANTS, companyId) || []),
        ...(PrintERPDataStore.get<any[]>(STORAGE_KEYS.PRODUCT_VARIANTS) || []),
      ]

      for (const p of localProds) {
        if (!p || !p.id) continue
        if (!matchesTenant(p.company_id)) continue

        const isMat =
          isMaterialProduct(p) ||
          p.entity_type === 'material' ||
          p.product_type === 'material' ||
          (p.product_type as any) === 'raw_material' ||
          p.commercial_type === 'material' ||
          ['materials', 'roll_media', 'rigid_sheets', 'inks', 'raw_materials'].includes(p.category || '') ||
          (p.sku && (p.sku.startsWith('MAT-') || p.sku.startsWith('RM-')))

        if (!isMat) continue

        const cost = Number(p.purchase_price ?? p.base_cost ?? 0)
        const itemVars = (p.variants && p.variants.length > 0) ? p.variants : allLocalVars.filter((v) => v.product_id === p.id)
        const isRoll = Boolean(p.roll_width_ft || (p as any).is_roll || (p.category && p.category.includes('roll')) || (p.material_config as any)?.material_type === 'roll' || p.purchase_unit === 'roll')
        const rawPurchaseUnit = p.purchase_unit || (p.material_config as any)?.purchase_unit || (p.pricing_formula as any)?.material_config?.purchase_unit
        const computedPurchaseUnit = isRoll
          ? (rawPurchaseUnit && !['sft', 'sqft'].includes(rawPurchaseUnit.toLowerCase()) ? rawPurchaseUnit : 'roll')
          : rawPurchaseUnit || p.unit

        const existingIndex = list.findIndex((m) => m.id === p.id || (p.sku && m.sku && m.sku.toLowerCase() === p.sku.toLowerCase()))
        if (existingIndex >= 0) {
          const existing = list[existingIndex]
          list[existingIndex] = {
            ...existing,
            name: p.name || existing.name,
            name_bn: p.name_bn || existing.name_bn,
            category: p.category || existing.category,
            unit: (p.selling_unit || p.unit || existing.unit || 'pcs') as MaterialUnit,
            purchase_unit: computedPurchaseUnit || existing.purchase_unit,
            master_purchase_unit: computedPurchaseUnit || existing.master_purchase_unit,
            average_cost: cost > 0 ? cost : existing.average_cost,
            last_purchase_price: cost > 0 ? cost : existing.last_purchase_price,
            cost_per_unit: cost > 0 ? cost : existing.cost_per_unit,
            is_roll: isRoll || existing.is_roll,
            roll_width_ft: p.roll_width_ft ? Number(p.roll_width_ft) : existing.roll_width_ft,
            roll_length_ft: p.roll_length_ft ? Number(p.roll_length_ft) : existing.roll_length_ft,
            available_widths_ft: p.available_widths_ft || (p.material_config as any)?.available_widths_ft || existing.available_widths_ft || (p.roll_width_ft ? [Number(p.roll_width_ft)] : undefined),
            standard_roll_length_ft: p.standard_roll_length_ft ? Number(p.standard_roll_length_ft) : ((p.material_config as any)?.standard_roll_length_ft ? Number((p.material_config as any).standard_roll_length_ft) : existing.standard_roll_length_ft),
            available_sheet_sizes: Array.isArray(p.available_sheet_sizes)
              ? p.available_sheet_sizes.map((s: any) =>
                  typeof s === 'string'
                    ? s
                    : s && typeof s === 'object' && s.label
                    ? s.label
                    : s && typeof s === 'object' && s.width && s.length
                    ? `${s.width}x${s.length} ft`
                    : String(s)
                )
              : (p.material_config as any)?.available_sheet_sizes || existing.available_sheet_sizes,
            roll_sizes: p.roll_sizes || (p.material_config as any)?.roll_sizes || (p.pricing_formula as any)?.roll_sizes || existing.roll_sizes,
            material_config: p.material_config || (p.pricing_formula as any)?.material_config || existing.material_config || null,
            purchase_price_per_sft: (p.material_config as any)?.purchase_price_per_sft || (p.pricing_formula as any)?.purchase_price_per_sft || existing.purchase_price_per_sft || null,
            production_width_allowance: p.production_width_allowance || (p.material_config as any)?.extra_width_allowance_ft || (p.pricing_formula as any)?.production_width_allowance || existing.production_width_allowance || 0,
            liquid_volume_capacity: (p as any).liquid_volume_capacity || (p.material_config as any)?.liquid_volume_ml ? `${(p.material_config as any).liquid_volume_ml}ml` : existing.liquid_volume_capacity,
            pack_quantity: (p as any).pack_quantity || (p.material_config as any)?.pack_quantity || existing.pack_quantity,
            variants: itemVars.length > 0 ? itemVars : existing.variants,
            thickness: (p as any).thickness || (p as any).thickness_mm ? `${(p as any).thickness || (p as any).thickness_mm}mm` : existing.thickness,
          }
          continue
        }

        seenIds.add(p.id)
        if (p.sku) seenSkus.add(p.sku.toLowerCase())

        list.push({
          id: p.id,
          company_id: p.company_id || companyId,
          branch_id: p.branch_id || null,
          sku: p.sku || `MAT-${p.id.substring(0, 6).toUpperCase()}`,
          name: p.name,
          name_bn: p.name_bn || null,
          category: p.category || 'raw_materials',
          unit: (p.selling_unit || p.unit || 'pcs') as MaterialUnit,
          purchase_unit: computedPurchaseUnit,
          master_purchase_unit: computedPurchaseUnit,
          current_stock: Number(p.current_stock ?? (p as any).stock ?? 0),
          min_stock_level: Number((p as any).min_stock_level ?? 0),
          average_cost: cost,
          last_purchase_price: cost,
          cost_per_unit: cost,
          is_roll: isRoll,
          roll_width_ft: p.roll_width_ft ? Number(p.roll_width_ft) : null,
          roll_length_ft: p.roll_length_ft ? Number(p.roll_length_ft) : null,
          available_widths_ft: p.available_widths_ft || (p.material_config as any)?.available_widths_ft || (p.roll_width_ft ? [Number(p.roll_width_ft)] : undefined),
          standard_roll_length_ft: p.standard_roll_length_ft ? Number(p.standard_roll_length_ft) : ((p.material_config as any)?.standard_roll_length_ft ? Number((p.material_config as any).standard_roll_length_ft) : undefined),
          available_sheet_sizes: Array.isArray(p.available_sheet_sizes)
            ? p.available_sheet_sizes.map((s: any) =>
                typeof s === 'string'
                  ? s
                  : s && typeof s === 'object' && s.label
                  ? s.label
                  : s && typeof s === 'object' && s.width && s.length
                  ? `${s.width}x${s.length} ft`
                  : String(s)
              )
            : (p.material_config as any)?.available_sheet_sizes,
          roll_sizes: p.roll_sizes || (p.material_config as any)?.roll_sizes || (p.pricing_formula as any)?.roll_sizes,
          material_config: p.material_config || (p.pricing_formula as any)?.material_config || null,
          purchase_price_per_sft: (p.material_config as any)?.purchase_price_per_sft || (p.pricing_formula as any)?.purchase_price_per_sft || null,
          production_width_allowance: p.production_width_allowance || (p.material_config as any)?.extra_width_allowance_ft || (p.pricing_formula as any)?.production_width_allowance || 0,
          liquid_volume_capacity: (p as any).liquid_volume_capacity || (p.material_config as any)?.liquid_volume_ml ? `${(p.material_config as any).liquid_volume_ml}ml` : null,
          pack_quantity: (p as any).pack_quantity || (p.material_config as any)?.pack_quantity || null,
          variants: itemVars,
          thickness: (p as any).thickness || (p as any).thickness_mm ? `${(p as any).thickness || (p as any).thickness_mm}mm` : undefined,
          is_active: p.is_active !== false,
          created_at: p.created_at || new Date().toISOString(),
          updated_at: p.updated_at || new Date().toISOString(),
        })
      }

      // Apply Filters
      let results = list

      if (options?.category && options.category !== 'all') {
        const cat = options.category.toLowerCase()
        results = results.filter((m) => (m.category || '').toLowerCase() === cat)
      }

      if (options?.search && options.search.trim()) {
        const q = options.search.trim().toLowerCase()
        results = results.filter(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            (m.name_bn && m.name_bn.toLowerCase().includes(q)) ||
            (m.sku && m.sku.toLowerCase().includes(q)) ||
            (m.brand && m.brand.toLowerCase().includes(q)) ||
            (m.specification && m.specification.toLowerCase().includes(q))
        )
      }

      if (options?.lowStockOnly) {
        results = results.filter((m) => {
          const threshold = Number(m.reorder_level || m.min_stock_level || 0)
          return threshold > 0 && Number(m.current_stock || 0) <= threshold
        })
      }

      return results.sort((a, b) => a.name.localeCompare(b.name))
    })
  }

  static async getMaterialById(id: string, companyId: string): Promise<MaterialRecord | null> {
    if (!id) return null
    const cleanId = String(id).trim()

    try {
      const supabase = await createClient()
      
      // 1. Try materials table with tenant company_id
      let { data: matData } = await (supabase as any)
        .from('materials')
        .select('*')
        .or(`id.eq.${cleanId},sku.eq.${cleanId}`)
        .eq('company_id', companyId)
        .maybeSingle()

      // 1b. Fallback: try materials table without company_id filter
      if (!matData) {
        const { data: globalMat } = await (supabase as any)
          .from('materials')
          .select('*')
          .or(`id.eq.${cleanId},sku.eq.${cleanId}`)
          .maybeSingle()
        if (globalMat) matData = globalMat
      }

      if (matData) {
        return matData as unknown as MaterialRecord
      }

      // 2. Try products table (Commercial Masters) in Supabase
      let { data: prodData } = await (supabase as any)
        .from('products')
        .select('*')
        .or(`id.eq.${cleanId},sku.eq.${cleanId}`)
        .eq('company_id', companyId)
        .maybeSingle()

      // 2b. Fallback: try products table without company_id filter
      if (!prodData) {
        const { data: globalProd } = await (supabase as any)
          .from('products')
          .select('*')
          .or(`id.eq.${cleanId},sku.eq.${cleanId}`)
          .maybeSingle()
        if (globalProd) prodData = globalProd
      }

      if (prodData) {
        const isRoll = Boolean(prodData.roll_width_ft || prodData.is_roll || (prodData.category && prodData.category.includes('roll')) || (prodData.material_config as any)?.material_type === 'roll' || prodData.purchase_unit === 'roll')
        const rawPurchaseUnit = prodData.purchase_unit || (prodData.material_config as any)?.purchase_unit || (prodData.pricing_formula as any)?.material_config?.purchase_unit
        const computedPurchaseUnit = isRoll
          ? (rawPurchaseUnit && !['sft', 'sqft'].includes(rawPurchaseUnit.toLowerCase()) ? rawPurchaseUnit : 'roll')
          : rawPurchaseUnit || prodData.unit

        const bridgedObj: MaterialRecord = {
          id: prodData.id,
          company_id: prodData.company_id || companyId,
          sku: prodData.sku || `PRD-${cleanId.substring(0, 8).toUpperCase()}`,
          name: prodData.name,
          name_bn: prodData.name_bn || null,
          category: prodData.category || 'ready_product',
          unit: (prodData.selling_unit || prodData.unit || 'pcs') as MaterialUnit,
          purchase_unit: computedPurchaseUnit,
          master_purchase_unit: computedPurchaseUnit,
          current_stock: Number(prodData.current_stock ?? prodData.stock ?? 0),
          average_cost: Number(prodData.purchase_price ?? prodData.base_cost ?? 0),
          last_purchase_price: Number(prodData.purchase_price ?? prodData.base_cost ?? 0),
          cost_per_unit: Number(prodData.purchase_price ?? prodData.base_cost ?? 0),
          selling_price: Number(prodData.selling_price) || 0,
          is_roll: isRoll,
          roll_width_ft: prodData.roll_width_ft ? Number(prodData.roll_width_ft) : null,
          roll_length_ft: prodData.roll_length_ft ? Number(prodData.roll_length_ft) : null,
          available_widths_ft: prodData.available_widths_ft || (prodData.material_config as any)?.available_widths_ft || (prodData.roll_width_ft ? [Number(prodData.roll_width_ft)] : undefined),
          standard_roll_length_ft: prodData.standard_roll_length_ft ? Number(prodData.standard_roll_length_ft) : ((prodData.material_config as any)?.standard_roll_length_ft ? Number((prodData.material_config as any).standard_roll_length_ft) : undefined),
          available_sheet_sizes: prodData.available_sheet_sizes || (prodData.material_config as any)?.available_sheet_sizes,
          roll_sizes: prodData.roll_sizes || (prodData.material_config as any)?.roll_sizes || (prodData.pricing_formula as any)?.roll_sizes,
          material_config: prodData.material_config || (prodData.pricing_formula as any)?.material_config || null,
          purchase_price_per_sft: (prodData.material_config as any)?.purchase_price_per_sft || (prodData.pricing_formula as any)?.purchase_price_per_sft || null,
          production_width_allowance: prodData.production_width_allowance || (prodData.material_config as any)?.extra_width_allowance_ft || (prodData.pricing_formula as any)?.production_width_allowance || 0,
          variants: prodData.variants || [],
          is_active: prodData.is_active !== false,
        } as unknown as MaterialRecord

        // Ensure product has a corresponding row in materials table for foreign key integrity
        try {
          const { data: bridgedMat } = await (supabase as any)
            .from('materials')
            .upsert(
              {
                id: prodData.id,
                company_id: prodData.company_id || companyId,
                branch_id: prodData.branch_id || null,
                sku: prodData.sku || `PRD-${cleanId.substring(0, 8).toUpperCase()}`,
                name: prodData.name,
                name_bn: prodData.name_bn || null,
                category: prodData.category || 'ready_product',
                unit: prodData.selling_unit || prodData.unit || 'pcs',
                current_stock: Number(prodData.current_stock ?? prodData.stock ?? 0),
                average_cost: Number(prodData.purchase_price ?? prodData.base_cost ?? 0),
                last_purchase_price: Number(prodData.purchase_price ?? prodData.base_cost ?? 0),
                is_active: prodData.is_active !== false,
              },
              { onConflict: 'id' }
            )
            .select()
            .maybeSingle()

          if (bridgedMat) {
            return {
              ...bridgedObj,
              ...(bridgedMat as any),
              roll_sizes: bridgedObj.roll_sizes,
              material_config: bridgedObj.material_config,
              available_widths_ft: bridgedObj.available_widths_ft,
              purchase_price_per_sft: bridgedObj.purchase_price_per_sft,
              production_width_allowance: bridgedObj.production_width_allowance,
              purchase_unit: bridgedObj.purchase_unit,
              master_purchase_unit: bridgedObj.master_purchase_unit,
            } as unknown as MaterialRecord
          }
        } catch {}

        return bridgedObj as unknown as MaterialRecord
      }
    } catch {}

    // 3. Fallback: Check PrintERPDataStore (Local Cache & Offline Memory)
    const normTarget = companyId ? companyId.toLowerCase() : ''
    const cleanTarget = normTarget.replace(/^comp-/, '').replace(/^co-/, '')

    const allMaterials: MaterialRecord[] = [
      ...(PrintERPDataStore.getAll<MaterialRecord>(STORAGE_KEYS.MATERIALS, companyId) || []),
      ...(PrintERPDataStore.getAll<MaterialRecord>(STORAGE_KEYS.MATERIALS) || []),
      ...(PrintERPDataStore.get<MaterialRecord[]>(STORAGE_KEYS.MATERIALS, companyId) || []),
      ...(PrintERPDataStore.get<MaterialRecord[]>(STORAGE_KEYS.MATERIALS) || []),
    ]

    const foundMat = allMaterials.find((m) => {
      if (!m) return false
      const matchesId = String(m.id).toLowerCase() === cleanId.toLowerCase() || String(m.sku || '').toLowerCase() === cleanId.toLowerCase()
      if (!matchesId) return false
      if (!companyId || !m.company_id) return true
      const cId = (m.company_id || '').toLowerCase()
      return cId === normTarget || cId === cleanTarget || cId.includes(cleanTarget)
    })
    if (foundMat) return foundMat

    // 4. Fallback: Check Products in PrintERPDataStore
    const allProducts: any[] = [
      ...(PrintERPDataStore.getAll<any>(STORAGE_KEYS.PRODUCTS, companyId) || []),
      ...(PrintERPDataStore.getAll<any>(STORAGE_KEYS.PRODUCTS) || []),
      ...(PrintERPDataStore.get<any[]>(STORAGE_KEYS.PRODUCTS, companyId) || []),
      ...(PrintERPDataStore.get<any[]>(STORAGE_KEYS.PRODUCTS) || []),
    ]

    const foundProd = allProducts.find((p) => {
      if (!p) return false
      const matchesId = String(p.id).toLowerCase() === cleanId.toLowerCase() || String(p.sku || '').toLowerCase() === cleanId.toLowerCase()
      if (!matchesId) return false
      if (!companyId || !p.company_id) return true
      const cId = (p.company_id || '').toLowerCase()
      return cId === normTarget || cId === cleanTarget || cId.includes(cleanTarget)
    })

    if (foundProd) {
      const isRoll = Boolean(foundProd.roll_width_ft || foundProd.is_roll || (foundProd.category && String(foundProd.category).includes('roll')) || (foundProd.material_config as any)?.material_type === 'roll' || foundProd.purchase_unit === 'roll')
      const rawPurchaseUnit = foundProd.purchase_unit || (foundProd.material_config as any)?.purchase_unit || (foundProd.pricing_formula as any)?.material_config?.purchase_unit
      const computedPurchaseUnit = isRoll
        ? (rawPurchaseUnit && !['sft', 'sqft'].includes(rawPurchaseUnit.toLowerCase()) ? rawPurchaseUnit : 'roll')
        : rawPurchaseUnit || foundProd.unit

      const bridged: MaterialRecord = {
        id: foundProd.id,
        company_id: foundProd.company_id || companyId,
        sku: foundProd.sku || `PRD-${cleanId.substring(0, 8).toUpperCase()}`,
        name: foundProd.name,
        name_bn: foundProd.name_bn || null,
        category: foundProd.category || 'ready_product',
        unit: (foundProd.selling_unit || foundProd.unit || 'pcs') as MaterialUnit,
        purchase_unit: computedPurchaseUnit,
        master_purchase_unit: computedPurchaseUnit,
        current_stock: Number(foundProd.current_stock ?? foundProd.stock ?? 0),
        average_cost: Number(foundProd.purchase_price ?? foundProd.base_cost ?? foundProd.cost_price ?? 0),
        last_purchase_price: Number(foundProd.purchase_price ?? foundProd.base_cost ?? foundProd.cost_price ?? 0),
        cost_per_unit: Number(foundProd.purchase_price ?? foundProd.base_cost ?? foundProd.cost_price ?? 0),
        selling_price: Number(foundProd.selling_price) || 0,
        is_roll: isRoll,
        roll_width_ft: foundProd.roll_width_ft ? Number(foundProd.roll_width_ft) : null,
        roll_length_ft: foundProd.roll_length_ft ? Number(foundProd.roll_length_ft) : null,
        available_widths_ft: foundProd.available_widths_ft || (foundProd.material_config as any)?.available_widths_ft || (foundProd.roll_width_ft ? [Number(foundProd.roll_width_ft)] : undefined),
        standard_roll_length_ft: foundProd.standard_roll_length_ft ? Number(foundProd.standard_roll_length_ft) : ((foundProd.material_config as any)?.standard_roll_length_ft ? Number((foundProd.material_config as any).standard_roll_length_ft) : undefined),
        available_sheet_sizes: foundProd.available_sheet_sizes || (foundProd.material_config as any)?.available_sheet_sizes,
        roll_sizes: foundProd.roll_sizes || (foundProd.material_config as any)?.roll_sizes || (foundProd.pricing_formula as any)?.roll_sizes,
        material_config: foundProd.material_config || (foundProd.pricing_formula as any)?.material_config || null,
        purchase_price_per_sft: (foundProd.material_config as any)?.purchase_price_per_sft || (foundProd.pricing_formula as any)?.purchase_price_per_sft || null,
        production_width_allowance: foundProd.production_width_allowance || (foundProd.material_config as any)?.extra_width_allowance_ft || (foundProd.pricing_formula as any)?.production_width_allowance || 0,
        is_active: foundProd.is_active !== false,
      } as unknown as MaterialRecord

      // Sync into materials collection for fast subsequent lookups
      try {
        PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, bridged)
      } catch {}

      return bridged
    }

    return null
  }

  static async createMaterial(material: Partial<MaterialRecord> & {
    company_id: string
    sku: string
    name: string
    category: any
    unit: any
  }): Promise<MaterialRecord> {
    const payload: any = {
      company_id: material.company_id,
      branch_id: material.branch_id || null,
      sku: material.sku.trim().toUpperCase(),
      name: material.name.trim(),
      name_bn: material.name_bn?.trim() || null,
      category: material.category,
      material_type: material.material_type || null,
      description: material.description?.trim() || null,
      brand: material.brand?.trim() || null,
      specification: material.specification?.trim() || null,
      color: material.color?.trim() || null,
      thickness: material.thickness?.trim() || null,
      width: material.width !== undefined ? material.width : null,
      length: material.length !== undefined ? material.length : null,
      dimension_unit: material.dimension_unit || null,
      unit: material.unit,
      base_unit: material.base_unit || material.unit,
      conversion_factor: material.conversion_factor || 1,
      is_roll:
        material.is_roll !== undefined
          ? Boolean(material.is_roll)
          : Boolean(
              material.roll_width_ft ||
              material.purchase_unit === 'roll' ||
              material.master_purchase_unit === 'roll' ||
              ['sft', 'sqft'].includes(String(material.unit || '').toLowerCase()) ||
              ['flex', 'vinyl', 'banner', 'pvc', 'canvas', 'mesh', 'roll'].some((c) =>
                String(material.category || '').toLowerCase().includes(c) ||
                String(material.name || '').toLowerCase().includes(c)
              )
            ),
      roll_width_ft: material.roll_width_ft || material.width || null,
      roll_length_ft: material.roll_length_ft || material.length || null,
      total_roll_area_sft:
        material.roll_width_ft && material.roll_length_ft
          ? material.roll_width_ft * material.roll_length_ft
          : material.width && material.length
          ? material.width * material.length
          : null,
      current_stock: Number(material.current_stock) || 0,
      reorder_level: Number(material.reorder_level) || Number(material.min_stock_level) || 0,
      min_stock_level: Number(material.min_stock_level) || Number(material.reorder_level) || 0,
      coverage_rate_sft_per_unit: material.coverage_rate_sft_per_unit || null,
      last_purchase_price: Number(material.last_purchase_price) || 0,
      average_cost: Number(material.average_cost) || 0,
      manual_cost: Number(material.manual_cost) || 0,
      valuation_method: material.valuation_method || 'average_cost',
      purchase_unit: material.purchase_unit || material.master_purchase_unit || null,
      master_purchase_unit: material.master_purchase_unit || material.purchase_unit || null,
      roll_sizes: material.roll_sizes || (material.material_config as any)?.roll_sizes || null,
      material_config: material.material_config || null,
      variants: material.variants || null,
      production_width_allowance: material.production_width_allowance ?? (material.material_config as any)?.extra_width_allowance_ft ?? (material.material_config as any)?.production_width_allowance ?? 0,
      purchase_price_per_sft: material.purchase_price_per_sft || (material.material_config as any)?.purchase_price_per_sft || null,
      available_widths_ft: material.available_widths_ft || (material.material_config as any)?.available_widths_ft || null,
      standard_roll_length_ft: material.standard_roll_length_ft || (material.material_config as any)?.standard_roll_length_ft || null,
      location: material.location?.trim() || null,
      is_active: material.is_active !== undefined ? material.is_active : true,
      notes: material.notes?.trim() || null,
    }

    payload.id = material.id || crypto.randomUUID()

    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('materials')
        .insert(payload)
        .select()
        .single()

      if (!error && data) {
        PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, data)
        return data as unknown as MaterialRecord
      }
    } catch {}

    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, payload)
    return payload as unknown as MaterialRecord
  }

  static async updateMaterial(
    id: string,
    updates: Partial<MaterialRecord>,
    companyId: string
  ): Promise<MaterialRecord> {
    const payload: any = { ...updates, updated_at: new Date().toISOString() }
    delete payload.id
    delete payload.company_id

    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('materials')
        .update(payload)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single()

      if (!error && data) {
        PrintERPDataStore.updateItem<MaterialRecord>(STORAGE_KEYS.MATERIALS, id, data, companyId)
        return data as unknown as MaterialRecord
      }
    } catch {}

    const updated = PrintERPDataStore.updateItem<MaterialRecord>(STORAGE_KEYS.MATERIALS, id, payload, companyId)
    return (updated || { id, company_id: companyId, ...payload }) as MaterialRecord
  }

  // ==========================================
  // STOCK BALANCES & ATOMIC MUTATIONS
  // ==========================================

  static async getStockBalances(companyId: string, options?: {
    locationId?: string
    materialId?: string
    branchId?: string | null
  }): Promise<InventoryStockBalanceRecord[]> {
    try {
      const supabase = await createClient()
      let query = (supabase as any)
        .from('inventory_stock_balances')
        .select('*, material:materials(id, name, sku, unit, min_stock_level, reorder_level), location:inventory_locations(id, location_name, location_code)')
        .eq('company_id', companyId)

      if (options?.locationId) {
        query = query.eq('location_id', options.locationId)
      }
      if (options?.materialId) {
        query = query.eq('material_id', options.materialId)
      }

      const { data, error } = await query
      if (!error && data) {
        return data as unknown as InventoryStockBalanceRecord[]
      }
    } catch {}

    const localBalances = PrintERPDataStore.get<InventoryStockBalanceRecord[]>(STORAGE_KEYS.INVENTORY_STOCK_BALANCES, companyId) || []
    let filtered = localBalances
    if (options?.locationId) {
      filtered = filtered.filter((b) => b.location_id === options.locationId)
    }
    if (options?.materialId) {
      filtered = filtered.filter((b) => b.material_id === options.materialId)
    }
    return filtered
  }

  /**
   * Atomic Inventory Mutation & Stock Ledger Insertion
   * Uses stored procedure with SELECT ... FOR UPDATE row locks or fallback transactional execution
   */
  static async recordStockAdjustment(params: {
    company_id: string
    branch_id?: string | null
    material_id: string
    location_id?: string | null
    quantity_change: number
    transaction_type: InventoryTransactionType
    unit_cost?: number
    reference_type?: string | null
    reference_id?: string | null
    production_task_id?: string | null
    notes?: string | null
    performed_by_id?: string | null
    performed_by_name: string
  }): Promise<{ material: MaterialRecord; ledgerEntry: StockLedgerRecord }> {
    // 1. Fetch live material under tenant isolation
    const material = await this.getMaterialById(params.material_id, params.company_id)
    if (!material) {
      throw new Error(`Material with ID ${params.material_id} not found.`)
    }

    const currentStock = Number(material.current_stock ?? (material as any).stock ?? 0) || 0
    const newStock = currentStock + params.quantity_change

    // 2. Strict non-negative stock verification
    if (newStock < 0) {
      throw new Error(
        `Inventory integrity violation: Operation rejected. Requested change (${params.quantity_change} ${material.unit}) would result in negative stock (${newStock} ${material.unit}). Current available stock is ${currentStock} ${material.unit}.`
      )
    }

    const unitCost = params.unit_cost !== undefined ? params.unit_cost : Number(material.average_cost) || 0
    const totalCost = Math.abs(params.quantity_change) * unitCost

    // Try Supabase RPC or Direct Mutation
    try {
      const supabase = await createClient()
      const { data: rpcResult, error: rpcError } = await (supabase as any).rpc('mutate_inventory_stock_atomic', {
        p_company_id: params.company_id,
        p_branch_id: params.branch_id || null,
        p_material_id: params.material_id,
        p_location_id: params.location_id || null,
        p_quantity_change: params.quantity_change,
        p_transaction_type: params.transaction_type,
        p_unit_cost: params.unit_cost || 0,
        p_reference_type: params.reference_type || null,
        p_reference_id: params.reference_id || null,
        p_production_task_id: params.production_task_id || null,
        p_notes: params.notes || null,
        p_performed_by_id: params.performed_by_id || null,
        p_performed_by_name: params.performed_by_name,
      })

      if (!rpcError && rpcResult) {
        const mat = await this.getMaterialById(params.material_id, params.company_id)
        return {
          material: mat!,
          ledgerEntry: rpcResult as unknown as StockLedgerRecord,
        }
      }

      // 3. Direct DB Ledger Insert & Multi-Table Sync
      // Ensure material row exists in Supabase materials table
      try {
        await (supabase as any).from('materials').upsert({
          id: material.id,
          company_id: params.company_id,
          branch_id: params.branch_id || null,
          sku: material.sku,
          name: material.name,
          category: material.category || 'general',
          unit: material.unit || 'pcs',
          current_stock: newStock,
          average_cost: unitCost > 0 ? unitCost : material.average_cost,
          last_purchase_price: unitCost > 0 ? unitCost : material.last_purchase_price,
          is_active: material.is_active !== false,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' })
      } catch {}

      const { data: ledgerEntry, error: ledgerErr } = await (supabase as any)
        .from('stock_ledger')
        .insert({
          company_id: params.company_id,
          branch_id: params.branch_id || null,
          material_id: material.id,
          location_id: params.location_id || null,
          transaction_type: params.transaction_type,
          quantity_change: params.quantity_change,
          unit: material.unit,
          balance_after: newStock,
          unit_cost: unitCost,
          total_cost: totalCost,
          reference_type: params.reference_type || null,
          reference_id: params.reference_id || null,
          production_task_id: params.production_task_id || null,
          notes: params.notes || null,
          performed_by_id: params.performed_by_id || null,
          performed_by_name: params.performed_by_name,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      // Also update products table if product exists (by id or sku)
      try {
        const prodPayload: any = {
          updated_at: new Date().toISOString(),
        }
        if (unitCost > 0) {
          prodPayload.purchase_price = unitCost
          prodPayload.base_cost = unitCost
        }

        const { data: existingProd } = await (supabase as any)
          .from('products')
          .select('pricing_formula')
          .or(`id.eq.${material.id},sku.eq.${material.sku}`)
          .maybeSingle()

        if (existingProd) {
          const formula = (typeof existingProd.pricing_formula === 'object' && existingProd.pricing_formula !== null ? existingProd.pricing_formula : {}) as any
          prodPayload.pricing_formula = {
            ...formula,
            current_stock: newStock,
            stock: newStock,
          }
        }

        await (supabase as any)
          .from('products')
          .update(prodPayload)
          .or(`id.eq.${material.id},sku.eq.${material.sku}`)
      } catch {}

      // Update location stock balance if location specified
      if (params.location_id) {
        try {
          const { data: existingBal } = await (supabase as any)
            .from('inventory_stock_balances')
            .select('*')
            .eq('company_id', params.company_id)
            .eq('material_id', material.id)
            .eq('location_id', params.location_id)
            .maybeSingle()

          const prevLocQty = Number(existingBal?.quantity || 0)
          const newLocQty = Math.max(0, prevLocQty + params.quantity_change)

          await (supabase as any).from('inventory_stock_balances').upsert({
            id: existingBal?.id || `bal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            company_id: params.company_id,
            branch_id: params.branch_id || null,
            material_id: material.id,
            location_id: params.location_id,
            quantity: newLocQty,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' })
        } catch {}
      }

      if (!ledgerErr && ledgerEntry) {
        return {
          material: { ...material, current_stock: newStock, average_cost: unitCost > 0 ? unitCost : material.average_cost },
          ledgerEntry: ledgerEntry as unknown as StockLedgerRecord,
        }
      }
    } catch {}

    // 4. DataStore Fallback Execution
    const updatedMaterial = PrintERPDataStore.updateItem<MaterialRecord>(STORAGE_KEYS.MATERIALS, material.id, {
      current_stock: newStock,
      average_cost: unitCost > 0 ? unitCost : material.average_cost,
      last_purchase_price: unitCost > 0 ? unitCost : material.last_purchase_price,
    }) || { ...material, current_stock: newStock }

    if (params.company_id) {
      try {
        PrintERPDataStore.updateItem<MaterialRecord>(STORAGE_KEYS.MATERIALS, material.id, {
          current_stock: newStock,
          average_cost: unitCost > 0 ? unitCost : material.average_cost,
          last_purchase_price: unitCost > 0 ? unitCost : material.last_purchase_price,
        }, params.company_id)
      } catch {}
    }

    const prodUpdatePayload = {
      current_stock: newStock,
      stock: newStock,
      base_cost: unitCost > 0 ? unitCost : undefined,
      purchase_price: unitCost > 0 ? unitCost : undefined,
    }

    PrintERPDataStore.updateItem<any>(STORAGE_KEYS.PRODUCTS, (p: any) => p && (p.id === material.id || (!!material.sku && p.sku === material.sku)), prodUpdatePayload)
    PrintERPDataStore.updateItem<any>(STORAGE_KEYS.PRODUCTS, material.id, prodUpdatePayload)

    if (params.company_id) {
      try {
        PrintERPDataStore.updateItem<any>(STORAGE_KEYS.PRODUCTS, (p: any) => p && (p.id === material.id || (!!material.sku && p.sku === material.sku)), prodUpdatePayload, params.company_id)
        PrintERPDataStore.updateItem<any>(STORAGE_KEYS.PRODUCTS, material.id, prodUpdatePayload, params.company_id)
      } catch {}
    }

    if (params.location_id) {
      try {
        const allBalances = PrintERPDataStore.get<any[]>(STORAGE_KEYS.INVENTORY_STOCK_BALANCES, params.company_id) || []
        const existingIdx = allBalances.findIndex(
          (b) => (b.material_id === material.id || (material.sku && b.sku === material.sku)) && b.location_id === params.location_id
        )
        if (existingIdx >= 0) {
          const prevQ = Number(allBalances[existingIdx].quantity || 0)
          allBalances[existingIdx].quantity = Math.max(0, prevQ + params.quantity_change)
          allBalances[existingIdx].updated_at = new Date().toISOString()
        } else {
          allBalances.push({
            id: `bal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            company_id: params.company_id,
            branch_id: params.branch_id || null,
            material_id: material.id,
            location_id: params.location_id,
            quantity: Math.max(0, params.quantity_change),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        }
        PrintERPDataStore.set(STORAGE_KEYS.INVENTORY_STOCK_BALANCES, allBalances, false, params.company_id)
      } catch {}
    }

    const localLedgerEntry: StockLedgerRecord = {
      id: `led-${Date.now()}`,
      company_id: params.company_id,
      branch_id: params.branch_id || null,
      material_id: material.id,
      location_id: params.location_id || null,
      transaction_type: params.transaction_type,
      quantity_change: params.quantity_change,
      unit: material.unit,
      balance_after: newStock,
      unit_cost: unitCost,
      total_cost: totalCost,
      reference_type: params.reference_type || null,
      reference_id: params.reference_id || null,
      production_task_id: params.production_task_id || null,
      notes: params.notes || null,
      performed_by_id: params.performed_by_id || null,
      performed_by_name: params.performed_by_name,
      created_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.STOCK_LEDGER, localLedgerEntry)

    return {
      material: updatedMaterial,
      ledgerEntry: localLedgerEntry,
    }
  }

  // ==========================================
  // PRODUCTION TASK MATERIAL REQUIREMENTS
  // ==========================================

  static async getTaskRequirements(taskId: string, companyId: string): Promise<TaskMaterialRequirementRecord[]> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('production_task_material_requirements')
      .select('*, material:materials(id, name, sku, unit, current_stock)')
      .eq('production_task_id', taskId)
      .eq('company_id', companyId)
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch task material requirements: ${error.message}`)
    }
    return (data || []) as unknown as TaskMaterialRequirementRecord[]
  }

  static async addTaskRequirement(requirement: {
    company_id: string
    production_task_id: string
    material_id: string
    estimated_quantity: number
    unit: string
    notes?: string | null
  }): Promise<TaskMaterialRequirementRecord> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('production_task_material_requirements')
      .insert({
        company_id: requirement.company_id,
        production_task_id: requirement.production_task_id,
        material_id: requirement.material_id,
        estimated_quantity: requirement.estimated_quantity,
        unit: requirement.unit,
        notes: requirement.notes?.trim() || null,
      })
      .select('*, material:materials(id, name, sku, unit, current_stock)')
      .single()

    if (error) {
      throw new Error(`Failed to add task material requirement: ${error.message}`)
    }
    return data as unknown as TaskMaterialRequirementRecord
  }

  static async removeTaskRequirement(id: string, companyId: string): Promise<boolean> {
    const supabase = await createClient()
    const { error } = await (supabase as any)
      .from('production_task_material_requirements')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId)

    if (error) {
      throw new Error(`Failed to remove task material requirement: ${error.message}`)
    }
    return true
  }

  // ==========================================
  // MATERIAL REQUESTS
  // ==========================================

  static async getRequests(companyId: string, options?: {
    taskId?: string
    status?: string
    priority?: string
  }): Promise<MaterialRequestRecord[]> {
    const supabase = await createClient()
    let query = (supabase as any)
      .from('material_requests')
      .select('*, items:material_request_items(*, material:materials(id, name, sku, unit, current_stock)), production_task:production_tasks(id, title, task_code, status)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (options?.taskId) {
      query = query.eq('production_task_id', options.taskId)
    }
    if (options?.status && options.status !== 'all') {
      query = query.eq('status', options.status)
    }
    if (options?.priority && options.priority !== 'all') {
      query = query.eq('priority', options.priority)
    }

    const { data, error } = await query
    if (error) {
      throw new Error(`Failed to fetch material requests: ${error.message}`)
    }
    return (data || []) as unknown as MaterialRequestRecord[]
  }

  static async getRequestById(id: string, companyId: string): Promise<MaterialRequestRecord | null> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('material_requests')
      .select('*, items:material_request_items(*, material:materials(id, name, sku, unit, current_stock)), production_task:production_tasks(id, title, task_code, status)')
      .eq('id', id)
      .eq('company_id', companyId)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to fetch material request ${id}: ${error.message}`)
    }
    return (data as unknown as MaterialRequestRecord) || null
  }

  static async createRequest(params: {
    company_id: string
    branch_id?: string | null
    production_task_id?: string | null
    destination_location_id?: string | null
    source_location_id?: string | null
    priority?: 'low' | 'normal' | 'high' | 'urgent'
    requested_by_id?: string | null
    requested_by_name: string
    notes?: string | null
    items: Array<{
      material_id: string
      requested_quantity: number
      unit: string
      notes?: string | null
    }>
  }): Promise<MaterialRequestRecord> {
    const supabase = await createClient()
    const reqNumber = `MRQ-${Date.now().toString().slice(-6)}`

    const { data: request, error: reqErr } = await (supabase as any)
      .from('material_requests')
      .insert({
        company_id: params.company_id,
        branch_id: params.branch_id || null,
        request_number: reqNumber,
        production_task_id: params.production_task_id || null,
        destination_location_id: params.destination_location_id || null,
        source_location_id: params.source_location_id || null,
        status: 'requested',
        priority: params.priority || 'normal',
        requested_by_id: params.requested_by_id || null,
        requested_by_name: params.requested_by_name,
        notes: params.notes?.trim() || null,
      })
      .select()
      .single()

    if (reqErr) {
      throw new Error(`Failed to create material request: ${reqErr.message}`)
    }

    if (params.items && params.items.length > 0) {
      const itemsPayload = params.items.map((it) => ({
        request_id: request.id,
        material_id: it.material_id,
        requested_quantity: it.requested_quantity,
        issued_quantity: 0,
        unit: it.unit,
        notes: it.notes?.trim() || null,
      }))

      const { error: itemErr } = await (supabase as any)
        .from('material_request_items')
        .insert(itemsPayload)

      if (itemErr) {
        throw new Error(`Failed to create material request items: ${itemErr.message}`)
      }
    }

    return await this.getRequestById(request.id, params.company_id) as MaterialRequestRecord
  }

  static async updateRequestStatus(
    id: string,
    status: 'draft' | 'requested' | 'approved' | 'rejected' | 'partially_issued' | 'issued' | 'cancelled',
    companyId: string,
    meta?: {
      approved_by_id?: string | null
      approved_by_name?: string | null
      rejection_reason?: string | null
    }
  ): Promise<MaterialRequestRecord> {
    const supabase = await createClient()
    const payload: any = {
      status,
      updated_at: new Date().toISOString(),
    }
    if (meta?.approved_by_name) {
      payload.approved_by_id = meta.approved_by_id || null
      payload.approved_by_name = meta.approved_by_name
    }
    if (meta?.rejection_reason) {
      payload.rejection_reason = meta.rejection_reason
    }

    const { error } = await (supabase as any)
      .from('material_requests')
      .update(payload)
      .eq('id', id)
      .eq('company_id', companyId)

    if (error) {
      throw new Error(`Failed to update request status: ${error.message}`)
    }
    return (await this.getRequestById(id, companyId)) as MaterialRequestRecord
  }

  // ==========================================
  // MATERIAL ISSUES
  // ==========================================

  static async getIssues(companyId: string, options?: {
    taskId?: string
    requestId?: string
  }): Promise<MaterialIssueRecord[]> {
    const normTarget = companyId ? companyId.toLowerCase() : ''
    const cleanTarget = normTarget.replace(/^comp-/, '').replace(/^co-/, '')
    let list: MaterialIssueRecord[] = []
    const seenIds = new Set<string>()

    try {
      const supabase = await createClient()
      let query = (supabase as any)
        .from('material_issues')
        .select('*, items:material_issue_items(*, material:materials(id, name, sku, unit))')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (options?.taskId) {
        query = query.eq('production_task_id', options.taskId)
      }
      if (options?.requestId) {
        query = query.eq('request_id', options.requestId)
      }

      const { data, error } = await query
      if (!error && data && Array.isArray(data)) {
        for (const item of data) {
          if (item && item.id) {
            seenIds.add(item.id)
            list.push(item as unknown as MaterialIssueRecord)
          }
        }
      }
    } catch {}

    // Merge DataStore material issues
    const localIssues = [
      ...(PrintERPDataStore.getAll<MaterialIssueRecord>(STORAGE_KEYS.MATERIAL_ISSUES, companyId) || []),
      ...(PrintERPDataStore.getAll<MaterialIssueRecord>(STORAGE_KEYS.MATERIAL_ISSUES) || []),
      ...(PrintERPDataStore.get<MaterialIssueRecord[]>(STORAGE_KEYS.MATERIAL_ISSUES, companyId) || []),
      ...(PrintERPDataStore.get<MaterialIssueRecord[]>(STORAGE_KEYS.MATERIAL_ISSUES) || []),
    ]

    for (const iss of localIssues) {
      if (!iss || !iss.id || seenIds.has(iss.id)) continue
      if (companyId && iss.company_id) {
        const c = iss.company_id.toLowerCase()
        if (c !== normTarget && c !== cleanTarget && !c.includes(cleanTarget)) continue
      }
      if (options?.taskId && iss.production_task_id !== options.taskId) continue
      if (options?.requestId && iss.request_id !== options.requestId) continue
      seenIds.add(iss.id)
      list.push(iss)
    }

    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  static async getIssueById(id: string, companyId: string): Promise<MaterialIssueRecord | null> {
    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('material_issues')
        .select('*, items:material_issue_items(*, material:materials(id, name, sku, unit))')
        .eq('id', id)
        .eq('company_id', companyId)
        .maybeSingle()

      if (!error && data) {
        return data as unknown as MaterialIssueRecord
      }
    } catch {}

    const all = await this.getIssues(companyId)
    return all.find((iss) => iss.id === id) || null
  }

  static async createIssue(params: {
    company_id: string
    branch_id?: string | null
    request_id?: string | null
    production_task_id?: string | null
    source_location_id: string
    destination_location_id?: string | null
    issued_by_id?: string | null
    issued_by_name: string
    received_by_name?: string | null
    notes?: string | null
    items: Array<{
      request_item_id?: string | null
      material_id: string
      issued_quantity: number
      unit: string
      unit_cost?: number
    }>
  }): Promise<MaterialIssueRecord> {
    const issueId = `iss-${Date.now()}`
    const issueNumber = `ISS-${Date.now().toString().slice(-6)}`

    // Parse assigned machine and job ref from notes if structured
    let assignedMach = (params as any).assigned_machine || null
    let jobRef = (params as any).job_reference || null
    if (params.notes) {
      const machMatch = params.notes.match(/Machine:\s*([^|]+)/i)
      if (machMatch && machMatch[1]) assignedMach = machMatch[1].trim()
      const jobMatch = params.notes.match(/Job Ref:\s*([^|]+)/i)
      if (jobMatch && jobMatch[1]) jobRef = jobMatch[1].trim()
    }

    let createdIssue: MaterialIssueRecord = {
      id: issueId,
      company_id: params.company_id,
      branch_id: params.branch_id || null,
      issue_number: issueNumber,
      request_id: params.request_id || null,
      production_task_id: params.production_task_id || null,
      source_location_id: params.source_location_id,
      destination_location_id: params.destination_location_id || null,
      issued_by_id: params.issued_by_id || null,
      issued_by_name: params.issued_by_name,
      received_by_name: params.received_by_name || null,
      assigned_machine: assignedMach,
      job_reference: jobRef,
      status: (params as any).status || 'completed',
      notes: params.notes?.trim() || null,
      created_at: new Date().toISOString(),
      items: params.items.map((it) => {
        const cost = it.unit_cost || 0
        const qty = Number(it.issued_quantity) || 0
        return {
          id: `isi-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          issue_id: issueId,
          request_item_id: it.request_item_id || null,
          material_id: it.material_id,
          issued_quantity: qty,
          consumed_quantity: 0,
          returned_quantity: 0,
          wastage_quantity: 0,
          wastage_reason: null,
          remaining_floor_balance: qty,
          unit: it.unit as any,
          unit_cost: cost,
          total_cost: qty * cost,
          machine_name: assignedMach,
          job_reference: jobRef,
          status: 'on_floor',
          created_at: new Date().toISOString(),
        }
      }),
    }

    try {
      const supabase = await createClient()
      const { data: issue, error: issueErr } = await (supabase as any)
        .from('material_issues')
        .insert({
          company_id: params.company_id,
          branch_id: params.branch_id || null,
          issue_number: issueNumber,
          request_id: params.request_id || null,
          production_task_id: params.production_task_id || null,
          source_location_id: params.source_location_id,
          destination_location_id: params.destination_location_id || null,
          issued_by_id: params.issued_by_id || null,
          issued_by_name: params.issued_by_name,
          received_by_name: params.received_by_name || null,
          status: 'completed',
          notes: params.notes?.trim() || null,
        })
        .select()
        .single()

      if (!issueErr && issue) {
        createdIssue.id = issue.id
        for (const it of params.items) {
          const unitCost = it.unit_cost || 0
          const totalCost = it.issued_quantity * unitCost

          await (supabase as any)
            .from('material_issue_items')
            .insert({
              issue_id: issue.id,
              request_item_id: it.request_item_id || null,
              material_id: it.material_id,
              issued_quantity: it.issued_quantity,
              unit: it.unit,
              unit_cost: unitCost,
              total_cost: totalCost,
            })
        }
      }
    } catch {}

    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIAL_ISSUES, createdIssue, params.company_id)
    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIAL_ISSUES, createdIssue)

    // Deduct stock and log ledger entry
    for (const it of params.items) {
      await this.recordStockAdjustment({
        company_id: params.company_id,
        branch_id: params.branch_id || null,
        material_id: it.material_id,
        location_id: params.source_location_id,
        quantity_change: -Math.abs(it.issued_quantity),
        transaction_type: 'ISSUE',
        unit_cost: it.unit_cost || 0,
        reference_type: 'MATERIAL_ISSUE',
        reference_id: createdIssue.id,
        production_task_id: params.production_task_id || null,
        notes: `Material issued via ${issueNumber} to Task ${params.production_task_id || 'Direct'}`,
        performed_by_id: params.issued_by_id,
        performed_by_name: params.issued_by_name,
      })

      // Decrement roll size groups on material and transition physical rolls if applicable
      try {
        const targetMat = await this.getMaterialById(it.material_id, params.company_id)
        if (targetMat) {
          const itemWidth = Number((it as any).width_ft) || (targetMat.roll_width_ft ? Number(targetMat.roll_width_ft) : null)
          const itemLength = Number((it as any).length_ft) || (targetMat.standard_roll_length_ft ? Number(targetMat.standard_roll_length_ft) : 164)
          const purchaseQty = Number((it as any).purchase_quantity) || 1

          if (targetMat.roll_sizes && Array.isArray(targetMat.roll_sizes) && itemWidth) {
            let matched = false
            const updatedSizes = targetMat.roll_sizes.map((sz: any) => {
              if (Number(sz.width_ft) === itemWidth && (!sz.length_ft || Number(sz.length_ft) === itemLength || !matched)) {
                matched = true
                const currentCount = Number(sz.roll_count ?? sz.count ?? sz.quantity ?? 1)
                const newCount = Math.max(0, currentCount - purchaseQty)
                return { ...sz, roll_count: newCount, count: newCount, quantity: newCount }
              }
              return sz
            })
            targetMat.roll_sizes = updatedSizes
            if (targetMat.material_config) {
              (targetMat.material_config as any).roll_sizes = updatedSizes
            }
            PrintERPDataStore.updateItem(STORAGE_KEYS.MATERIALS, targetMat.id, targetMat, params.company_id)
            PrintERPDataStore.updateItem(STORAGE_KEYS.MATERIALS, targetMat.id, targetMat)
          }

          if ((it as any).roll_id) {
            const roll = await this.getInventoryRollById((it as any).roll_id, params.company_id)
            if (roll) {
              const updatedRoll: InventoryRollRecord = {
                ...roll,
                status: assignedMach ? 'mounted' : 'available',
                location_name: 'Print Floor',
                mounted_machine_id: assignedMach ? assignedMach : roll.mounted_machine_id,
                mounted_machine_name: assignedMach ? assignedMach : roll.mounted_machine_name,
                mounted_press_name: assignedMach ? assignedMach : roll.mounted_press_name,
                mounted_at: assignedMach ? new Date().toISOString() : roll.mounted_at,
                mounted_by_name: params.received_by_name || params.issued_by_name,
                updated_at: new Date().toISOString(),
              }
              PrintERPDataStore.updateItem(STORAGE_KEYS.MOUNTED_ROLLS, updatedRoll.id, updatedRoll, params.company_id)
              PrintERPDataStore.updateItem(STORAGE_KEYS.MOUNTED_ROLLS, updatedRoll.id, updatedRoll)
            }
          }
        }
      } catch {}
    }

    return createdIssue
  }

  // ==========================================
  // PRINT FLOOR CONSUMPTION & DISPATCH TRACKING
  // ==========================================

  static async getFloorConsumptions(
    companyId: string,
    options?: { machineId?: string; status?: string; search?: string }
  ): Promise<FloorConsumptionRecord[]> {
    const normTarget = companyId ? companyId.toLowerCase() : ''
    const cleanTarget = normTarget.replace(/^comp-/, '').replace(/^co-/, '')

    // 1. Load all material issues (from Supabase & DataStore)
    const allIssues = await this.getIssues(companyId)

    // Deduplicate issues by ID
    const uniqueIssuesMap = new Map<string, MaterialIssueRecord>()
    for (const iss of allIssues) {
      if (iss && iss.id && !uniqueIssuesMap.has(iss.id)) {
        uniqueIssuesMap.set(iss.id, iss)
      }
    }

    // 2. Load all explicit floor consumption records
    const explicitConsumptions = [
      ...(PrintERPDataStore.getAll<FloorConsumptionRecord>(STORAGE_KEYS.FLOOR_CONSUMPTIONS, companyId) || []),
      ...(PrintERPDataStore.getAll<FloorConsumptionRecord>(STORAGE_KEYS.FLOOR_CONSUMPTIONS) || []),
      ...(PrintERPDataStore.get<FloorConsumptionRecord[]>(STORAGE_KEYS.FLOOR_CONSUMPTIONS, companyId) || []),
      ...(PrintERPDataStore.get<FloorConsumptionRecord[]>(STORAGE_KEYS.FLOOR_CONSUMPTIONS) || []),
    ].filter((c) => {
      if (!c) return false
      if (!companyId || !c.company_id) return true
      const cId = (c.company_id || '').toLowerCase()
      return cId === normTarget || cId === cleanTarget || cId.includes(cleanTarget)
    })

    // 3. Load active mounted rolls & floor substrates from DataStore
    const floorRolls = [
      ...(PrintERPDataStore.getAll<InventoryRollRecord>(STORAGE_KEYS.MOUNTED_ROLLS, companyId) || []),
      ...(PrintERPDataStore.getAll<InventoryRollRecord>(STORAGE_KEYS.MOUNTED_ROLLS) || []),
      ...(PrintERPDataStore.get<InventoryRollRecord[]>(STORAGE_KEYS.MOUNTED_ROLLS, companyId) || []),
      ...(PrintERPDataStore.get<InventoryRollRecord[]>(STORAGE_KEYS.MOUNTED_ROLLS) || []),
    ].filter((r) => {
      if (!r) return false
      if (companyId && r.company_id) {
        const cId = (r.company_id || '').toLowerCase()
        if (cId !== normTarget && cId !== cleanTarget && !cId.includes(cleanTarget)) return false
      }
      return r.location_name === 'Print Floor' || r.status === 'mounted' || r.status === 'in_use' || Boolean(r.mounted_machine_id) || Boolean(r.mounted_machine_name)
    })

    const results: FloorConsumptionRecord[] = []
    const processedItemKeys = new Set<string>()

    // Merge synthesized floor records from material issue items
    for (const iss of Array.from(uniqueIssuesMap.values())) {
      let machName = iss.assigned_machine || null
      let jobRef = iss.job_reference || null
      if (iss.notes) {
        if (!machName) {
          const mMatch = iss.notes.match(/Machine:\s*([^|]+)/i)
          if (mMatch && mMatch[1]) machName = mMatch[1].trim()
        }
        if (!jobRef) {
          const jMatch = iss.notes.match(/Job Ref:\s*([^|]+)/i)
          if (jMatch && jMatch[1]) jobRef = jMatch[1].trim()
        }
      }

      for (const item of iss.items || []) {
        const itemKey = `${iss.id}_${item.id || item.roll_id || item.material_id}`
        processedItemKeys.add(itemKey)
        if (item.roll_id) processedItemKeys.add(item.roll_id)
        if (item.roll_code) processedItemKeys.add(item.roll_code.toLowerCase())

        const mat = await this.getMaterialById(item.material_id, companyId)
        const unitCost = Number(item.unit_cost || mat?.average_cost || mat?.last_purchase_price || 0)
        const issuedQty = Number(item.issued_quantity) || 0
        const consumedQty = Number(item.consumed_quantity) || 0
        const wastageQty = Number(item.wastage_quantity) || 0
        const returnedQty = Number(item.returned_quantity) || 0
        const remaining = Math.max(0, issuedQty - consumedQty - wastageQty - returnedQty)

        let status: 'on_floor' | 'partially_consumed' | 'fully_consumed' | 'returned' = 'on_floor'
        if (remaining <= 0) {
          status = returnedQty >= issuedQty ? 'returned' : 'fully_consumed'
        } else if (consumedQty > 0 || wastageQty > 0 || returnedQty > 0) {
          status = 'partially_consumed'
        }

        results.push({
          id: `fc-${iss.id}-${item.id || item.material_id}`,
          company_id: companyId,
          branch_id: iss.branch_id || null,
          issue_id: iss.id,
          issue_number: iss.issue_number,
          issue_item_id: item.id,
          material_id: item.material_id,
          material_name: item.material_name || mat?.name || 'Raw Material',
          sku: mat?.sku || 'MAT',
          roll_id: item.roll_id || null,
          roll_code: item.roll_code || null,
          machine_id: item.machine_id || null,
          machine_name: item.machine_name || machName || 'General Production Floor',
          job_order_id: null,
          job_reference: item.job_reference || jobRef || iss.production_task_id || null,
          production_task_id: iss.production_task_id || null,
          operator_id: iss.issued_by_id || null,
          operator_name: iss.received_by_name || iss.issued_by_name || 'Floor Operator',
          issued_quantity: issuedQty,
          consumed_quantity: consumedQty,
          unit: (item.unit || mat?.unit || 'pcs') as MaterialUnit,
          unit_cost: unitCost,
          total_cost: issuedQty * unitCost,
          wastage_quantity: wastageQty,
          wastage_reason: item.wastage_reason || null,
          wastage_cost: wastageQty * unitCost,
          returned_quantity: returnedQty,
          return_location_id: null,
          return_location_name: null,
          remnants_count: 0,
          remaining_floor_balance: remaining,
          status,
          notes: iss.notes || null,
          created_at: iss.created_at || new Date().toISOString(),
          updated_at: item.last_consumption_at || iss.created_at || new Date().toISOString(),
          material: mat || undefined,
        })
      }
    }

    // Add any standalone explicit consumption records not mapped to issues
    for (const exp of explicitConsumptions) {
      if (!results.some((r) => r.id === exp.id || (exp.issue_id && r.issue_id === exp.issue_id))) {
        results.push(exp)
        if (exp.roll_id) processedItemKeys.add(exp.roll_id)
        if (exp.roll_code) processedItemKeys.add(exp.roll_code.toLowerCase())
      }
    }

    // Synthesize floor records from any active floor rolls/substrates not yet in results
    for (const roll of floorRolls) {
      if (processedItemKeys.has(roll.id) || (roll.roll_code && processedItemKeys.has(roll.roll_code.toLowerCase()))) {
        continue
      }
      const mat = await this.getMaterialById(roll.material_id, companyId)
      const unitCost = Number(roll.unit_cost || mat?.average_cost || mat?.last_purchase_price || 0)
      const initialQty = Number(roll.initial_area_sft ?? roll.initial_length_ft ?? 1)
      const currentQty = Number(roll.remaining_area_sft ?? roll.current_length_ft ?? initialQty)
      const consumed = Math.max(0, initialQty - currentQty)

      results.push({
        id: `fc-roll-${roll.id}`,
        company_id: companyId,
        branch_id: roll.branch_id || null,
        issue_id: null,
        issue_number: roll.roll_code || 'ROLL-FLOOR',
        issue_item_id: null,
        material_id: roll.material_id,
        material_name: roll.material?.name || mat?.name || 'Raw Material Roll',
        sku: roll.material?.sku || mat?.sku || 'MAT',
        roll_id: roll.id,
        roll_code: roll.roll_code || roll.roll_tag,
        machine_id: roll.mounted_machine_id || null,
        machine_name: roll.mounted_machine_name || roll.location_name || 'General Production Floor',
        job_order_id: null,
        job_reference: roll.notes || null,
        production_task_id: null,
        operator_id: null,
        operator_name: roll.mounted_by_name || 'Floor Operator',
        issued_quantity: initialQty,
        consumed_quantity: consumed,
        unit: (mat?.unit || 'sft') as MaterialUnit,
        unit_cost: unitCost,
        total_cost: initialQty * unitCost,
        wastage_quantity: 0,
        wastage_reason: null,
        wastage_cost: 0,
        returned_quantity: 0,
        return_location_id: null,
        return_location_name: null,
        remnants_count: 0,
        remaining_floor_balance: currentQty,
        status: currentQty <= 0 ? 'fully_consumed' : consumed > 0 ? 'partially_consumed' : 'on_floor',
        notes: roll.notes || null,
        created_at: roll.created_at || new Date().toISOString(),
        updated_at: roll.updated_at || new Date().toISOString(),
        material: mat || undefined,
      })
    }

    // Apply filtering
    let filtered = results
    if (options?.machineId && options.machineId !== 'all') {
      const mId = options.machineId.toLowerCase()
      filtered = filtered.filter(
        (r) =>
          (r.machine_id && r.machine_id.toLowerCase().includes(mId)) ||
          (r.machine_name && r.machine_name.toLowerCase().includes(mId))
      )
    }

    if (options?.status && options.status !== 'all') {
      filtered = filtered.filter((r) => r.status === options.status)
    }

    if (options?.search) {
      const q = options.search.trim().toLowerCase()
      filtered = filtered.filter(
        (r) =>
          r.material_name.toLowerCase().includes(q) ||
          (r.sku && r.sku.toLowerCase().includes(q)) ||
          (r.issue_number && r.issue_number.toLowerCase().includes(q)) ||
          (r.operator_name && r.operator_name.toLowerCase().includes(q)) ||
          (r.machine_name && r.machine_name.toLowerCase().includes(q)) ||
          (r.job_reference && r.job_reference.toLowerCase().includes(q))
      )
    }

    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  /**
   * Log consumption against an issued floor item or direct production floor run
   */
  static async logFloorConsumption(params: {
    company_id: string
    branch_id?: string | null
    issue_id?: string | null
    issue_item_id?: string | null
    material_id: string
    consumed_quantity: number
    unit: string
    wastage_quantity?: number
    wastage_reason?: string | null
    returned_quantity?: number
    return_location_id?: string | null
    machine_id?: string | null
    machine_name?: string | null
    job_reference?: string | null
    production_task_id?: string | null
    operator_name?: string
    operator_id?: string | null
    remnants?: Array<{
      width: number
      length: number
      dimension_unit?: string
      quantity?: number
      location_id: string
      condition?: 'excellent' | 'usable' | 'minor_defect'
      notes?: string | null
    }>
    notes?: string | null
  }): Promise<{ success: boolean; floorRecord: FloorConsumptionRecord; remnantsCreated?: number }> {
    const mat = await this.getMaterialById(params.material_id, params.company_id)
    if (!mat) {
      throw new Error(`Material with ID ${params.material_id} not found.`)
    }

    const unitCost = Number(mat.average_cost || mat.last_purchase_price || 0)
    const consumedQty = Number(params.consumed_quantity) || 0
    const wastageQty = Number(params.wastage_quantity) || 0
    const returnedQty = Number(params.returned_quantity) || 0
    const wastageCost = wastageQty * unitCost

    let totalIssued = consumedQty + wastageQty + returnedQty
    let cumulativeConsumed = consumedQty
    let cumulativeWastage = wastageQty
    let cumulativeReturned = returnedQty
    let remainingBalance = 0
    let floorStatus: FloorConsumptionRecord['status'] = 'fully_consumed'
    let targetIssueItem: MaterialIssueItemRecord | undefined

    // 1. Update Material Issue in DataStore if issue_id is supplied
    if (params.issue_id) {
      const allIssues = [
        ...(PrintERPDataStore.get<MaterialIssueRecord[]>(STORAGE_KEYS.MATERIAL_ISSUES, params.company_id) || []),
        ...(PrintERPDataStore.get<MaterialIssueRecord[]>(STORAGE_KEYS.MATERIAL_ISSUES) || []),
      ]
      const targetIssue = allIssues.find((iss) => iss.id === params.issue_id)
      if (targetIssue && targetIssue.items) {
        for (const item of targetIssue.items) {
          if (!params.issue_item_id || item.id === params.issue_item_id || item.material_id === params.material_id) {
            item.consumed_quantity = (Number(item.consumed_quantity) || 0) + consumedQty
            item.wastage_quantity = (Number(item.wastage_quantity) || 0) + wastageQty
            if (params.wastage_reason) item.wastage_reason = params.wastage_reason
            item.returned_quantity = (Number(item.returned_quantity) || 0) + returnedQty
            const issued = Number(item.issued_quantity) || 0
            const rem = Math.max(0, issued - (item.consumed_quantity || 0) - (item.wastage_quantity || 0) - (item.returned_quantity || 0))
            item.remaining_floor_balance = rem
            item.status = rem <= 0 ? (item.returned_quantity >= issued ? 'returned' : 'fully_consumed') : ((item.consumed_quantity || 0) > 0 || (item.wastage_quantity || 0) > 0 ? 'partially_consumed' : 'on_floor')
            item.last_consumption_at = new Date().toISOString()
            targetIssueItem = item
          }
        }
        PrintERPDataStore.set(STORAGE_KEYS.MATERIAL_ISSUES, allIssues, true, params.company_id)
        PrintERPDataStore.set(STORAGE_KEYS.MATERIAL_ISSUES, allIssues, false)
      }
    }

    if (targetIssueItem) {
      totalIssued = Number(targetIssueItem.issued_quantity) || 0
      cumulativeConsumed = Number(targetIssueItem.consumed_quantity) || 0
      cumulativeWastage = Number(targetIssueItem.wastage_quantity) || 0
      cumulativeReturned = Number(targetIssueItem.returned_quantity) || 0
      remainingBalance = Number(targetIssueItem.remaining_floor_balance) || 0
      floorStatus = targetIssueItem.status as FloorConsumptionRecord['status']
    } else {
      remainingBalance = Math.max(0, totalIssued - consumedQty - wastageQty - returnedQty)
      floorStatus = remainingBalance <= 0 ? (returnedQty >= totalIssued ? 'returned' : 'fully_consumed') : (consumedQty > 0 || wastageQty > 0 ? 'partially_consumed' : 'on_floor')
    }

    // 2. Log Consumption in Stock Ledger
    if (consumedQty > 0) {
      const ledgerEntry: StockLedgerRecord = {
        id: `led-cons-${Date.now()}`,
        company_id: params.company_id,
        branch_id: params.branch_id || null,
        material_id: mat.id,
        location_id: null,
        transaction_type: 'CONSUMPTION',
        quantity_change: 0,
        unit: (params.unit || mat.unit) as MaterialUnit,
        balance_after: Number(mat.current_stock || 0),
        unit_cost: unitCost,
        total_cost: consumedQty * unitCost,
        reference_type: 'PRINT_FLOOR_CONSUMPTION',
        reference_id: params.issue_id || null,
        production_task_id: params.production_task_id || null,
        notes: `Print Floor consumed ${consumedQty} ${params.unit} on ${params.machine_name || 'Press Machine'} ${params.job_reference ? `[Job: ${params.job_reference}]` : ''}`,
        performed_by_id: params.operator_id || null,
        performed_by_name: params.operator_name || 'Floor Operator',
        created_at: new Date().toISOString(),
      }
      PrintERPDataStore.addItem(STORAGE_KEYS.STOCK_LEDGER, ledgerEntry)
    }

    // 3. Log Scrap / Wastage in Stock Ledger
    if (wastageQty > 0) {
      const wastageEntry: StockLedgerRecord = {
        id: `led-wst-${Date.now()}`,
        company_id: params.company_id,
        branch_id: params.branch_id || null,
        material_id: mat.id,
        location_id: null,
        transaction_type: 'WASTAGE',
        quantity_change: 0,
        unit: (params.unit || mat.unit) as MaterialUnit,
        balance_after: Number(mat.current_stock || 0),
        unit_cost: unitCost,
        total_cost: wastageCost,
        reference_type: 'PRINT_FLOOR_SCRAP',
        reference_id: params.issue_id || null,
        production_task_id: params.production_task_id || null,
        notes: `Print Floor Scrap logged: ${wastageQty} ${params.unit}. Reason: ${params.wastage_reason || 'Cutting/Head Error'} (৳${Number(wastageCost || 0).toLocaleString('en-IN')})`,
        performed_by_id: params.operator_id || null,
        performed_by_name: params.operator_name || 'Floor Operator',
        created_at: new Date().toISOString(),
      }
      PrintERPDataStore.addItem(STORAGE_KEYS.STOCK_LEDGER, wastageEntry)
    }

    // 4. Return Unused Material back to Warehouse Store
    if (returnedQty > 0 && params.return_location_id) {
      await this.recordStockAdjustment({
        company_id: params.company_id,
        branch_id: params.branch_id || null,
        material_id: mat.id,
        location_id: params.return_location_id,
        quantity_change: Math.abs(returnedQty),
        transaction_type: 'RETURN',
        unit_cost: unitCost,
        reference_type: 'FLOOR_RETURN_TO_STORE',
        reference_id: params.issue_id || null,
        production_task_id: params.production_task_id || null,
        notes: `Unused floor material returned to store: +${returnedQty} ${params.unit}`,
        performed_by_id: params.operator_id || null,
        performed_by_name: params.operator_name || 'Floor Operator',
      })
    }

    // 5. Register Reusable Remnants
    let remnantsCount = 0
    let remnantsArea = 0
    if (params.remnants && params.remnants.length > 0) {
      for (const rem of params.remnants) {
        await this.createRemnant({
          company_id: params.company_id,
          branch_id: params.branch_id || null,
          parent_material_id: mat.id,
          production_task_id: params.production_task_id || null,
          location_id: rem.location_id,
          width: rem.width,
          length: rem.length,
          dimension_unit: rem.dimension_unit || 'ft',
          quantity: rem.quantity || 1,
          condition: rem.condition || 'usable',
          notes: rem.notes || `Salvaged from Floor Run [${params.machine_name || 'Press'}]`,
          created_by_name: params.operator_name || 'Floor Operator',
        })
        remnantsCount++
        remnantsArea += (Number(rem.width) || 0) * (Number(rem.length) || 0)
      }
    }

    // Construct response record
    const floorRecord: FloorConsumptionRecord = {
      id: `fc-run-${Date.now()}`,
      company_id: params.company_id,
      branch_id: params.branch_id || null,
      issue_id: params.issue_id || null,
      issue_item_id: params.issue_item_id || null,
      material_id: mat.id,
      material_name: mat.name,
      sku: mat.sku,
      machine_id: params.machine_id || null,
      machine_name: params.machine_name || 'General Production Floor',
      job_reference: params.job_reference || null,
      production_task_id: params.production_task_id || null,
      operator_id: params.operator_id || null,
      operator_name: params.operator_name || 'Floor Operator',
      issued_quantity: totalIssued,
      consumed_quantity: cumulativeConsumed,
      unit: (params.unit || mat.unit) as MaterialUnit,
      unit_cost: unitCost,
      total_cost: (cumulativeConsumed + cumulativeWastage) * unitCost,
      wastage_quantity: cumulativeWastage,
      wastage_reason: params.wastage_reason || null,
      wastage_cost: cumulativeWastage * unitCost,
      returned_quantity: cumulativeReturned,
      return_location_id: params.return_location_id || null,
      remnants_count: remnantsCount,
      remnants_area_sft: remnantsArea,
      remaining_floor_balance: remainingBalance,
      status: floorStatus,
      notes: params.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      material: mat,
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.FLOOR_CONSUMPTIONS, floorRecord)

    return { success: true, floorRecord, remnantsCreated: remnantsCount }
  }

  static async returnFloorStockToStore(params: {
    company_id: string
    issue_id: string
    material_id: string
    quantity: number
    return_location_id: string
    operator_name?: string
    notes?: string | null
  }): Promise<{ success: boolean; remainingFloorBalance: number; floorRecord: FloorConsumptionRecord }> {
    const mat = await this.getMaterialById(params.material_id, params.company_id)
    if (!mat) throw new Error('Material not found.')

    const allIssues = [
      ...(PrintERPDataStore.get<MaterialIssueRecord[]>(STORAGE_KEYS.MATERIAL_ISSUES, params.company_id) || []),
      ...(PrintERPDataStore.get<MaterialIssueRecord[]>(STORAGE_KEYS.MATERIAL_ISSUES) || []),
    ]
    const targetIssue = allIssues.find((iss) => iss.id === params.issue_id)
    let remaining = 0
    let totalIssued = Number(params.quantity)
    let totalConsumed = 0
    let totalWastage = 0
    let totalReturned = Number(params.quantity)
    let status: FloorConsumptionRecord['status'] = 'returned'

    if (targetIssue && targetIssue.items) {
      for (const item of targetIssue.items) {
        if (item.material_id === params.material_id) {
          item.returned_quantity = (Number(item.returned_quantity) || 0) + Number(params.quantity)
          const issued = Number(item.issued_quantity) || 0
          totalIssued = issued
          totalConsumed = Number(item.consumed_quantity) || 0
          totalWastage = Number(item.wastage_quantity) || 0
          totalReturned = Number(item.returned_quantity) || 0
          remaining = Math.max(0, issued - totalConsumed - totalWastage - totalReturned)
          item.remaining_floor_balance = remaining
          status = remaining <= 0 ? 'returned' : 'partially_consumed'
          item.status = status
          item.last_consumption_at = new Date().toISOString()
        }
      }
      PrintERPDataStore.set(STORAGE_KEYS.MATERIAL_ISSUES, allIssues, true, params.company_id)
      PrintERPDataStore.set(STORAGE_KEYS.MATERIAL_ISSUES, allIssues, false)
    }

    // Add stock back to store location
    await this.recordStockAdjustment({
      company_id: params.company_id,
      material_id: mat.id,
      location_id: params.return_location_id,
      quantity_change: Math.abs(params.quantity),
      transaction_type: 'RETURN',
      unit_cost: Number(mat.average_cost || mat.last_purchase_price || 0),
      reference_type: 'FLOOR_RETURN_TO_STORE',
      reference_id: params.issue_id,
      notes: `Floor leftover stock returned to warehouse: +${params.quantity} ${mat.unit} ${params.notes ? `(${params.notes})` : ''}`,
      performed_by_name: params.operator_name || 'Store Keeper',
    })

    const unitCost = Number(mat.average_cost || mat.last_purchase_price || 0)
    const floorRecord: FloorConsumptionRecord = {
      id: `fc-ret-${Date.now()}`,
      company_id: params.company_id,
      issue_id: params.issue_id,
      material_id: mat.id,
      material_name: mat.name,
      sku: mat.sku,
      operator_name: params.operator_name || 'Store Keeper',
      issued_quantity: totalIssued,
      consumed_quantity: totalConsumed,
      unit: mat.unit as MaterialUnit,
      unit_cost: unitCost,
      total_cost: (totalConsumed + totalWastage) * unitCost,
      wastage_quantity: totalWastage,
      wastage_cost: totalWastage * unitCost,
      returned_quantity: totalReturned,
      return_location_id: params.return_location_id,
      remnants_count: 0,
      remaining_floor_balance: remaining,
      status: status,
      notes: params.notes || 'Unused material returned to store',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      material: mat,
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.FLOOR_CONSUMPTIONS, floorRecord)

    return { success: true, remainingFloorBalance: remaining, floorRecord }
  }



  // ==========================================
  // INVENTORY REMNANTS
  // ==========================================

  static async getRemnants(
    companyId: string,
    options?: { materialId?: string; status?: string; locationId?: string }
  ): Promise<InventoryRemnantRecord[]> {
    try {
      const supabase = await createClient()
      let query = (supabase as any)
        .from('inventory_remnants')
        .select('*, parent_material:materials(id, name, sku, unit), location:inventory_locations(id, location_name, location_code)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (options?.materialId) {
        query = query.eq('parent_material_id', options.materialId)
      }
      if (options?.status && options.status !== 'all') {
        query = query.eq('status', options.status)
      }
      if (options?.locationId) {
        query = query.eq('location_id', options.locationId)
      }

      const { data, error } = await query
      if (error) {
        throw new Error(`Failed to fetch inventory remnants: ${error.message}`)
      }
      return (data || []) as unknown as InventoryRemnantRecord[]
    } catch {
      const all = PrintERPDataStore.get<InventoryRemnantRecord[]>(STORAGE_KEYS.REMNANTS) || []
      let filtered = all.filter((r) => !r.company_id || r.company_id === companyId)
      if (options?.materialId) {
        filtered = filtered.filter((r) => r.parent_material_id === options.materialId)
      }
      if (options?.status && options.status !== 'all') {
        filtered = filtered.filter((r) => r.status === options.status)
      }
      return filtered
    }
  }

  static async getRemnantById(id: string, companyId: string): Promise<InventoryRemnantRecord | null> {
    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('inventory_remnants')
        .select('*, parent_material:materials(id, name, sku, unit), location:inventory_locations(id, location_name, location_code)')
        .eq('id', id)
        .eq('company_id', companyId)
        .maybeSingle()

      if (error) {
        throw new Error(`Failed to fetch inventory remnant ${id}: ${error.message}`)
      }
      return (data as unknown as InventoryRemnantRecord) || null
    } catch {
      const all = PrintERPDataStore.get<InventoryRemnantRecord[]>(STORAGE_KEYS.REMNANTS) || []
      return all.find((r) => r.id === id && (!r.company_id || r.company_id === companyId)) || null
    }
  }

  static async createRemnant(params: {
    company_id: string
    branch_id?: string | null
    parent_material_id?: string
    material_id?: string
    production_task_id?: string | null
    issue_item_id?: string | null
    source_roll_id?: string | null
    location_id?: string
    location?: string
    width?: number
    width_ft?: number
    length?: number
    length_ft?: number
    area_sqft?: number
    dimension_unit?: string
    quantity?: number
    unit?: string
    condition?: 'excellent' | 'usable' | 'minor_defect'
    status?: string
    notes?: string | null
    created_by_name?: string
  }): Promise<InventoryRemnantRecord> {
    const parentMatId = params.parent_material_id || params.material_id || ''
    const widthVal = Number(params.width ?? params.width_ft) || 1.0
    const lengthVal = Number(params.length ?? params.length_ft) || 1.0
    const locId = params.location_id || params.location || 'loc-main'
    const creatorName = params.created_by_name || 'Production Operator'
    const remnantCode = (params as any).remnant_code || `REM-${Date.now().toString().slice(-6)}`
    const dimUnit = params.dimension_unit || 'ft'
    const areaSft = params.area_sqft ?? (dimUnit === 'ft' ? widthVal * lengthVal : (widthVal * lengthVal) / 144)

    const remnantRecord: InventoryRemnantRecord = {
      id: `rem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      company_id: params.company_id,
      branch_id: params.branch_id || null,
      remnant_code: remnantCode,
      parent_material_id: parentMatId,
      production_task_id: params.production_task_id || null,
      issue_item_id: params.issue_item_id || null,
      location_id: locId,
      width: widthVal,
      length: lengthVal,
      dimension_unit: dimUnit,
      area_sft: areaSft,
      quantity: params.quantity || 1,
      unit: params.unit || 'pcs',
      condition: params.condition || 'usable',
      status: (params.status as any) || 'available',
      notes: params.notes?.trim() || null,
      created_by_name: creatorName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('inventory_remnants')
        .insert({
          company_id: params.company_id,
          branch_id: params.branch_id || null,
          remnant_code: remnantCode,
          parent_material_id: params.parent_material_id,
          production_task_id: params.production_task_id || null,
          issue_item_id: params.issue_item_id || null,
          location_id: params.location_id,
          width: params.width,
          length: params.length,
          dimension_unit: dimUnit,
          area_sft: areaSft,
          quantity: params.quantity || 1,
          unit: params.unit || 'pcs',
          condition: params.condition || 'usable',
          status: 'available',
          notes: params.notes?.trim() || null,
          created_by_name: params.created_by_name,
        })
        .select('*, parent_material:materials(id, name, sku, unit), location:inventory_locations(id, location_name, location_code)')
        .single()

      if (!error && data) {
        // Ledger audit entry for remnant creation
        await (supabase as any).from('stock_ledger').insert({
          company_id: params.company_id,
          branch_id: params.branch_id || null,
          material_id: params.parent_material_id,
          location_id: params.location_id,
          transaction_type: 'REMNANT',
          quantity_change: params.quantity || 1,
          unit: params.unit || 'pcs',
          balance_after: 0,
          unit_cost: 0,
          total_cost: 0,
          reference_type: 'INVENTORY_REMNANT',
          reference_id: data.id,
          production_task_id: params.production_task_id || null,
          notes: `Reusable remnant logged: ${remnantCode} (${params.width}x${params.length} ${dimUnit})`,
          performed_by_name: params.created_by_name,
          created_at: new Date().toISOString(),
        })
        PrintERPDataStore.addItem(STORAGE_KEYS.REMNANTS, data)
        return data as unknown as InventoryRemnantRecord
      }
    } catch {}

    PrintERPDataStore.addItem(STORAGE_KEYS.REMNANTS, remnantRecord)
    return remnantRecord
  }

  static async updateRemnantStatus(
    id: string,
    status: 'available' | 'reserved' | 'consumed' | 'scrapped',
    companyId: string
  ): Promise<InventoryRemnantRecord> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('inventory_remnants')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('company_id', companyId)
      .select('*, parent_material:materials(id, name, sku, unit), location:inventory_locations(id, location_name, location_code)')
      .single()

    if (error) {
      throw new Error(`Failed to update remnant status: ${error.message}`)
    }
    return data as unknown as InventoryRemnantRecord
  }

  // ==========================================
  // INVENTORY TRANSFERS
  // ==========================================

  static async getTransfers(companyId: string): Promise<InventoryTransferRecord[]> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('inventory_transfers')
      .select('*, material:materials(id, name, sku, unit), source_location:inventory_locations!source_location_id(id, location_name), destination_location:inventory_locations!destination_location_id(id, location_name)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch inventory transfers: ${error.message}`)
    }
    return (data || []) as unknown as InventoryTransferRecord[]
  }

  static async createTransfer(params: {
    company_id: string
    source_branch_id?: string | null
    source_location_id: string
    destination_branch_id?: string | null
    destination_location_id: string
    material_id: string
    quantity: number
    unit: string
    reason?: string | null
    transferred_by_name: string
  }): Promise<InventoryTransferRecord> {
    if (params.source_location_id === params.destination_location_id) {
      throw new Error('Transfer rejected: Source and destination locations cannot be the same.')
    }
    if (params.quantity <= 0) {
      throw new Error('Transfer rejected: Quantity must be greater than zero.')
    }

    const supabase = await createClient()
    const transferNumber = `TRF-${Date.now().toString().slice(-6)}`

    // 1. Create Transfer Record
    const { data: transfer, error: trfErr } = await (supabase as any)
      .from('inventory_transfers')
      .insert({
        company_id: params.company_id,
        transfer_number: transferNumber,
        source_branch_id: params.source_branch_id || null,
        source_location_id: params.source_location_id,
        destination_branch_id: params.destination_branch_id || null,
        destination_location_id: params.destination_location_id,
        material_id: params.material_id,
        quantity: params.quantity,
        unit: params.unit,
        status: 'completed',
        transferred_by_name: params.transferred_by_name,
        reason: params.reason?.trim() || null,
      })
      .select()
      .single()

    if (trfErr) {
      throw new Error(`Failed to create inventory transfer: ${trfErr.message}`)
    }

    // 2. TRANSFER_OUT from source location
    await this.recordStockAdjustment({
      company_id: params.company_id,
      branch_id: params.source_branch_id || null,
      material_id: params.material_id,
      location_id: params.source_location_id,
      quantity_change: -Math.abs(params.quantity),
      transaction_type: 'TRANSFER_OUT',
      reference_type: 'INVENTORY_TRANSFER',
      reference_id: transfer.id,
      notes: `Transfer Out via ${transferNumber} to Destination Location`,
      performed_by_name: params.transferred_by_name,
    })

    // 3. TRANSFER_IN to destination location
    await this.recordStockAdjustment({
      company_id: params.company_id,
      branch_id: params.destination_branch_id || null,
      material_id: params.material_id,
      location_id: params.destination_location_id,
      quantity_change: Math.abs(params.quantity),
      transaction_type: 'TRANSFER_IN',
      reference_type: 'INVENTORY_TRANSFER',
      reference_id: transfer.id,
      notes: `Transfer In via ${transferNumber} from Source Location`,
      performed_by_name: params.transferred_by_name,
    })

    return transfer as unknown as InventoryTransferRecord
  }

  // ==========================================
  // INVENTORY ADJUSTMENTS
  // ==========================================

  static async getAdjustments(companyId: string): Promise<InventoryAdjustmentRecord[]> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('inventory_adjustments')
      .select('*, material:materials(id, name, sku, unit), location:inventory_locations(id, location_name, location_code)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch inventory adjustments: ${error.message}`)
    }
    return (data || []) as unknown as InventoryAdjustmentRecord[]
  }

  static async createAdjustment(params: {
    company_id: string
    branch_id?: string | null
    location_id: string
    material_id: string
    adjustment_type: 'physical_count' | 'damage_discovered' | 'data_correction' | 'opening_balance' | 'other'
    new_quantity: number
    reason: string
    authorized_by_name: string
  }): Promise<InventoryAdjustmentRecord> {
    const supabase = await createClient()
    const material = await this.getMaterialById(params.material_id, params.company_id)
    if (!material) {
      throw new Error(`Material ${params.material_id} not found.`)
    }

    // Get current stock balance at location or overall
    const balances = await this.getStockBalances(params.company_id, {
      locationId: params.location_id,
      materialId: params.material_id,
    })
    const prevQty = balances.length > 0 ? Number(balances[0].available_quantity) : Number(material.current_stock) || 0
    const variance = params.new_quantity - prevQty
    const adjNumber = `ADJ-${Date.now().toString().slice(-6)}`

    const { data: adjustment, error: adjErr } = await (supabase as any)
      .from('inventory_adjustments')
      .insert({
        company_id: params.company_id,
        branch_id: params.branch_id || null,
        adjustment_number: adjNumber,
        location_id: params.location_id,
        material_id: params.material_id,
        adjustment_type: params.adjustment_type,
        previous_quantity: prevQty,
        new_quantity: params.new_quantity,
        variance_quantity: variance,
        unit: material.unit,
        reason: params.reason.trim(),
        authorized_by_name: params.authorized_by_name,
      })
      .select('*, material:materials(id, name, sku, unit), location:inventory_locations(id, location_name, location_code)')
      .single()

    if (adjErr) {
      throw new Error(`Failed to record stock adjustment: ${adjErr.message}`)
    }

    if (variance !== 0) {
      await this.recordStockAdjustment({
        company_id: params.company_id,
        branch_id: params.branch_id || null,
        material_id: params.material_id,
        location_id: params.location_id,
        quantity_change: variance,
        transaction_type: variance > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
        reference_type: 'INVENTORY_ADJUSTMENT',
        reference_id: adjustment.id,
        notes: `Physical Stock Adjustment: ${params.reason} (${variance > 0 ? '+' : ''}${variance} ${material.unit})`,
        performed_by_name: params.authorized_by_name,
      })
    }

    return adjustment as unknown as InventoryAdjustmentRecord
  }

  // ==========================================
  // STOCK LEDGER
  // ==========================================

  static async getStockLedger(companyId: string, materialId?: string): Promise<StockLedgerRecord[]> {
    try {
      const supabase = await createClient()
      let query = (supabase as any)
        .from('stock_ledger')
        .select('*, material:materials(name, sku), location:inventory_locations(location_name, location_code)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (materialId) {
        query = query.eq('material_id', materialId)
      }

      const { data, error } = await query
      if (error) {
        throw new Error(`Failed to fetch stock ledger: ${error.message}`)
      }
      return (data || []) as unknown as StockLedgerRecord[]
    } catch {
      const all = PrintERPDataStore.get<StockLedgerRecord[]>(STORAGE_KEYS.STOCK_LEDGER) || []
      let filtered = all.filter((l) => !l.company_id || l.company_id === companyId)
      if (materialId) {
        filtered = filtered.filter((l) => l.material_id === materialId)
      }
      return filtered
    }
  }

  // ==========================================
  // PHYSICAL ROLLS MANAGEMENT (V3 ARCHITECTURE)
  // ==========================================

  static async getInventoryRolls(
    companyId: string,
    options?: { materialId?: string; status?: string; locationId?: string },
    preloadedMaterials?: MaterialRecord[]
  ): Promise<InventoryRollRecord[]> {
    let rolls: InventoryRollRecord[] = []
    let supabaseClient: any = null

    // 1. Fetch from Supabase
    try {
      supabaseClient = await createClient()
      let query = (supabaseClient as any)
        .from('inventory_rolls')
        .select('*, material:materials(id, name, sku, unit)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (options?.materialId) {
        query = query.eq('material_id', options.materialId)
      }
      if (options?.status && options.status !== 'all') {
        if (options.status === 'available') {
          query = query.in('status', ['available', 'in_warehouse'])
        } else if (options.status === 'mounted') {
          query = query.in('status', ['mounted', 'in_use', 'on_floor'])
        } else {
          query = query.eq('status', options.status)
        }
      }
      if (options?.locationId) {
        query = query.eq('location_id', options.locationId)
      }

      const { data, error } = await query
      if (!error && data && Array.isArray(data) && data.length > 0) {
        rolls = data as unknown as InventoryRollRecord[]
      }
    } catch {}

    // 2. Fallback to Local Store if Supabase returned no rolls
    if (!rolls || rolls.length === 0) {
      const allLocal = [
        ...(PrintERPDataStore.getAll<InventoryRollRecord>(STORAGE_KEYS.MOUNTED_ROLLS, companyId) || []),
        ...(PrintERPDataStore.get<InventoryRollRecord[]>(STORAGE_KEYS.MOUNTED_ROLLS, companyId) || []),
        ...(PrintERPDataStore.get<InventoryRollRecord[]>(STORAGE_KEYS.MOUNTED_ROLLS) || []),
        ...(PrintERPDataStore.getAll<InventoryRollRecord>(STORAGE_KEYS.MOUNTED_ROLLS) || []),
      ]
      const uniqueMap = new Map<string, InventoryRollRecord>()
      for (const r of allLocal) {
        if (r && r.id && !uniqueMap.has(r.id)) {
          uniqueMap.set(r.id, r)
        }
      }
      const all = Array.from(uniqueMap.values())
      rolls = all.filter((r) => {
        if (r.company_id && r.company_id !== companyId) return false
        if (options?.materialId && r.material_id !== options.materialId) return false
        if (options?.status && options.status !== 'all') {
          if (options.status === 'available' && (r.status === 'available' || r.status === 'in_warehouse' || !r.status)) return true
          if (options.status === 'mounted' && (r.status === 'mounted' || r.status === 'in_use' || r.status === 'on_floor')) return true
          if (options.status === 'depleted' && (r.status === 'depleted' || (r.remaining_length_ft != null && r.remaining_length_ft <= 0.5))) return true
          if (r.status !== options.status) return false
        }
        if (options?.locationId && r.location_id !== options.locationId) return false
        return true
      })
    }

    // 3. Auto-populate / Synchronize Physical Rolls for roll materials that don't have roll records yet
    let materialsList: MaterialRecord[] = preloadedMaterials || []
    try {
      if (materialsList.length === 0) {
        materialsList = await this.getMaterials(companyId)
      }

      // Filter out stale auto-generated synthetic rolls (rol-init-) when real physical rolls exist or stock is 0
      if (rolls.length > 0 && materialsList.length > 0) {
        const matStockMap = new Map<string, number>()
        for (const m of materialsList) {
          matStockMap.set(m.id, Number(m.current_stock || 0))
          if (m.sku) matStockMap.set(m.sku.toLowerCase(), Number(m.current_stock || 0))
        }

        const realPhysicalRollMats = new Set(
          rolls.filter((r) => r && r.id && !r.id.startsWith('rol-init-')).map((r) => r.material_id)
        )

        rolls = rolls.filter((r) => {
          if (r.id && r.id.startsWith('rol-init-')) {
            if (realPhysicalRollMats.has(r.material_id)) {
              return false
            }
            const stock = matStockMap.get(r.material_id) ?? (r.material?.sku ? matStockMap.get(r.material.sku.toLowerCase()) : undefined)
            if (stock !== undefined && stock <= 0) {
              return false
            }
          }
          return true
        })
      }

      const existingMaterialIdsWithRolls = new Set(rolls.map((r) => r.material_id))

      const isRollMaterial = (m: MaterialRecord) => {
        const cat = String(m.category || '').toLowerCase()
        const name = String(m.name || '').toLowerCase()
        const pUnit = String(m.purchase_unit || m.master_purchase_unit || '').toLowerCase()
        const unit = String(m.unit || '').toLowerCase()

        return Boolean(
          m.is_roll ||
          pUnit === 'roll' ||
          unit === 'roll' ||
          ['sft', 'sqft'].includes(unit) ||
          (m.roll_width_ft && Number(m.roll_width_ft) > 0) ||
          ['flex', 'vinyl', 'banner', 'sticker', 'canvas', 'mesh', 'paper_roll', 'fabric', 'film', 'roll_media', 'roll', 'pvc', 'flex_banner'].some((c) => cat.includes(c)) ||
          ['flex', 'vinyl', 'banner', 'sticker', 'canvas', 'mesh', 'roll', 'sav', 'pvc'].some((c) => name.includes(c))
        )
      }

      const rollMaterials = materialsList.filter(isRollMaterial)

      for (const m of rollMaterials) {
        if (options?.materialId && m.id !== options.materialId) continue

        // If rolls already exist for this material, do not duplicate
        if (existingMaterialIdsWithRolls.has(m.id)) continue

        const lengthFt = Number(m.roll_length_ft || m.length || m.standard_roll_length_ft || 164)
        const stockNum = Number(m.current_stock || 0)
        if (stockNum <= 0) continue

        const rawRollSizes: any[] = Array.isArray(m.roll_sizes) && m.roll_sizes.length > 0
          ? m.roll_sizes
          : Array.isArray((m.material_config as any)?.roll_sizes) && (m.material_config as any).roll_sizes.length > 0
          ? (m.material_config as any).roll_sizes
          : Array.isArray((m.pricing_formula as any)?.roll_sizes) && (m.pricing_formula as any).roll_sizes.length > 0
          ? (m.pricing_formula as any).roll_sizes
          : Array.isArray((m.pricing_formula as any)?.material_config?.roll_sizes) && (m.pricing_formula as any).material_config.roll_sizes.length > 0
          ? (m.pricing_formula as any).material_config.roll_sizes
          : Array.isArray(m.variants) && m.variants.length > 0
          ? m.variants
          : []

        const matName = String(m.name || '').toLowerCase()
        let widthFt = Number(
          m.roll_width_ft ||
          (rawRollSizes.length > 0 ? (rawRollSizes[0].width || rawRollSizes[0].width_ft || rawRollSizes[0].size) : 0) ||
          m.width ||
          (Array.isArray(m.available_widths_ft) && m.available_widths_ft.length === 1 ? m.available_widths_ft[0] : 0) ||
          (matName.includes('10ft') || matName.includes('10 ft') ? 10 :
           matName.includes('8ft') || matName.includes('8 ft') ? 8 :
           matName.includes('7ft') || matName.includes('7 ft') ? 7 :
           matName.includes('6ft') || matName.includes('6 ft') ? 6 :
           matName.includes('5ft') || matName.includes('5 ft') ? 5 :
           matName.includes('4ft') || matName.includes('4 ft') ? 4 :
           matName.includes('3.2ft') || matName.includes('3.2 ft') ? 3.2 : 0)
        )

        if (!widthFt && stockNum > 0 && lengthFt > 0) {
          const ratio = stockNum / lengthFt
          if (stockNum % lengthFt === 0 || [3, 3.2, 3.25, 4, 4.25, 5, 6, 7, 8, 10, 10.5, 12, 12.5].includes(ratio)) {
            widthFt = ratio
          } else {
            widthFt = Math.max(3.2, Math.round(ratio * 10) / 10)
          }
        }
        if (!widthFt) widthFt = 4

        const cleanSku = (m.sku || 'MAT').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
        const lot = Date.now().toString().slice(-4)
        const rawCost = Number(m.average_cost || m.last_purchase_price || m.cost_per_unit || 0)

        const globalAllowance = Number(
          m.production_width_allowance ??
          (m.material_config as any)?.extra_width_allowance_ft ??
          (m.material_config as any)?.production_width_allowance ??
          (m.pricing_formula as any)?.extra_width_allowance_ft ??
          (m.pricing_formula as any)?.production_width_allowance ??
          0
        )

        if (rawRollSizes.length > 0) {
          // Check if explicit stock counts exist on configured sizes
          const sizesWithQty = rawRollSizes.filter(
            (rs) => Number(rs.quantity ?? rs.stock_qty ?? rs.stock ?? rs.roll_count ?? rs.count ?? 0) > 0
          )

          if (sizesWithQty.length > 0) {
            let rollCounter = 1
            for (const rs of sizesWithQty) {
              const baseW = Number(rs.nominal_width_ft || rs.width || rs.width_ft || rs.size || widthFt || 4)
              const allowance = rs.extra_allowance !== undefined
                ? Number(rs.extra_allowance)
                : rs.allowance !== undefined
                ? Number(rs.allowance)
                : rs.allowance_ft !== undefined
                ? Number(rs.allowance_ft)
                : globalAllowance
              const w = rs.width_ft !== undefined && Number(rs.width_ft) > 0
                ? Number(rs.width_ft)
                : ((allowance > 0 && Math.floor(baseW) === baseW) ? Math.round((baseW + allowance) * 100) / 100 : baseW)
              const l = Number(rs.length || rs.length_ft || lengthFt)
              const count = Number(rs.quantity ?? rs.stock_qty ?? rs.stock ?? rs.roll_count ?? rs.count ?? 1)
              const rollArea = Math.round(w * l * 100) / 100
              const rollCost = rs.price || rs.purchase_price || (rawCost > 100 ? rawCost : (rawCost > 0 && rollArea > 0 ? rawCost * rollArea : rawCost))

              for (let i = 1; i <= count; i++) {
                const rollCode = count === 1
                  ? `ROL-${cleanSku}-${w}FT`
                  : `ROL-${cleanSku}-${w}FT-${String(i).padStart(2, '0')}`

                const rollPayload: InventoryRollRecord = {
                  id: `rol-init-${m.id.slice(0, 8)}-${rollCounter}-${lot}`,
                  company_id: companyId,
                  branch_id: m.branch_id || null,
                  location_id: null,
                  location_name: m.location || 'Main Warehouse',
                  material_id: m.id,
                  roll_code: rollCode,
                  roll_tag: rollCode,
                  width_ft: w,
                  initial_length_ft: l,
                  current_length_ft: l,
                  original_length_ft: l,
                  remaining_length_ft: l,
                  initial_area_sft: rollArea,
                  consumed_area_sft: 0,
                  remaining_area_sft: rollArea,
                  current_area_sft: rollArea,
                  status: 'available',
                  unit_cost: rollCost,
                  total_cost: rollCost,
                  material: {
                    id: m.id,
                    name: m.name,
                    sku: m.sku,
                    unit: m.unit,
                    name_bn: m.name_bn || null,
                  } as any,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                }

                if (supabaseClient) {
                  try {
                    const dbInsert = { ...rollPayload }
                    delete (dbInsert as any).material
                    await (supabaseClient as any).from('inventory_rolls').insert(dbInsert)
                  } catch {}
                }

                PrintERPDataStore.addItem(STORAGE_KEYS.MOUNTED_ROLLS, rollPayload, companyId)
                PrintERPDataStore.addItem(STORAGE_KEYS.MOUNTED_ROLLS, rollPayload)
                rolls.push(rollPayload)
                rollCounter++
              }
            }
          } else {
            // Sizes are configured types (without explicit item quantities): distribute stockNum across all configured sizes
            const configuredList = rawRollSizes.map((rs: any) => {
              const baseW = Number(rs.nominal_width_ft || rs.width || rs.width_ft || rs.size || widthFt || 4)
              const allowance = rs.extra_allowance !== undefined
                ? Number(rs.extra_allowance)
                : rs.allowance !== undefined
                ? Number(rs.allowance)
                : rs.allowance_ft !== undefined
                ? Number(rs.allowance_ft)
                : globalAllowance
              const w = rs.width_ft !== undefined && Number(rs.width_ft) > 0
                ? Number(rs.width_ft)
                : ((allowance > 0 && Math.floor(baseW) === baseW) ? Math.round((baseW + allowance) * 100) / 100 : baseW)
              const l = Number(rs.length || rs.length_ft || lengthFt)
              const area = Math.round(w * l * 100) / 100
              const rollCost = rs.price || rs.purchase_price || (rawCost > 100 ? rawCost : (rawCost > 0 && area > 0 ? rawCost * area : rawCost))
              return { baseW, w, l, area, rollCost, allowance }
            })

            const sumSetArea = configuredList.reduce((sum, item) => sum + item.area, 0)
            let rollCounter = 1

            if (configuredList.length > 1 && sumSetArea > 0) {
              const sets = Math.floor(stockNum / sumSetArea)
              const remainder = stockNum - (sets * sumSetArea)

              if (sets > 0) {
                let remainderTargetIdx = -1
                if (remainder > 0) {
                  remainderTargetIdx = configuredList.findIndex(
                    (item) => item.area > 0 && Math.abs(remainder % item.area) < 1
                  )
                  if (remainderTargetIdx === -1) {
                    let minDiff = Infinity
                    for (let i = 0; i < configuredList.length; i++) {
                      const diff = Math.abs(configuredList[i].area - remainder)
                      if (diff < minDiff) {
                        minDiff = diff
                        remainderTargetIdx = i
                      }
                    }
                  }
                }

                for (let idx = 0; idx < configuredList.length; idx++) {
                  const item = configuredList[idx]
                  const extra = (idx === remainderTargetIdx && remainder > (item.area / 4))
                    ? Math.max(1, Math.round(remainder / item.area))
                    : 0
                  const count = sets + extra

                  for (let i = 1; i <= count; i++) {
                    const rollCode = count === 1
                      ? `ROL-${cleanSku}-${item.w}FT`
                      : `ROL-${cleanSku}-${item.w}FT-${String(i).padStart(2, '0')}`

                    const rollPayload: InventoryRollRecord = {
                      id: `rol-init-${m.id.slice(0, 8)}-${rollCounter}-${lot}`,
                      company_id: companyId,
                      branch_id: m.branch_id || null,
                      location_id: null,
                      location_name: m.location || 'Main Warehouse',
                      material_id: m.id,
                      roll_code: rollCode,
                      roll_tag: rollCode,
                      width_ft: item.w,
                      initial_length_ft: item.l,
                      current_length_ft: item.l,
                      original_length_ft: item.l,
                      remaining_length_ft: item.l,
                      initial_area_sft: item.area,
                      consumed_area_sft: 0,
                      remaining_area_sft: item.area,
                      current_area_sft: item.area,
                      status: 'available',
                      unit_cost: item.rollCost,
                      total_cost: item.rollCost,
                      material: {
                        id: m.id,
                        name: m.name,
                        sku: m.sku,
                        unit: m.unit,
                        name_bn: m.name_bn || null,
                      } as any,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    }

                    if (supabaseClient) {
                      try {
                        const dbInsert = { ...rollPayload }
                        delete (dbInsert as any).material
                        await (supabaseClient as any).from('inventory_rolls').insert(dbInsert)
                      } catch {}
                    }

                    PrintERPDataStore.addItem(STORAGE_KEYS.MOUNTED_ROLLS, rollPayload, companyId)
                    PrintERPDataStore.addItem(STORAGE_KEYS.MOUNTED_ROLLS, rollPayload)
                    rolls.push(rollPayload)
                    rollCounter++
                  }
                }
              } else {
                // sets === 0: stockNum is smaller than total of all configured sizes
                // Allocate ONLY to the single best matching configured size
                let bestIdx = configuredList.findIndex(
                  (item) => item.area > 0 && (Math.abs(stockNum % item.area) < 1 || Math.abs(item.area - stockNum) < 1)
                )
                if (bestIdx === -1) {
                  let minDiff = Infinity
                  for (let i = 0; i < configuredList.length; i++) {
                    const diff = Math.abs(configuredList[i].area - stockNum)
                    if (diff < minDiff) {
                      minDiff = diff
                      bestIdx = i
                    }
                  }
                }
                if (bestIdx === -1) bestIdx = 0

                const item = configuredList[bestIdx]
                const count = item.area > 0 ? Math.max(1, Math.round(stockNum / item.area)) : 1

                for (let i = 1; i <= count; i++) {
                  const rollCode = count === 1
                    ? `ROL-${cleanSku}-${item.w}FT`
                    : `ROL-${cleanSku}-${item.w}FT-${String(i).padStart(2, '0')}`

                  const rollPayload: InventoryRollRecord = {
                    id: `rol-init-${m.id.slice(0, 8)}-${rollCounter}-${lot}`,
                    company_id: companyId,
                    branch_id: m.branch_id || null,
                    location_id: null,
                    location_name: m.location || 'Main Warehouse',
                    material_id: m.id,
                    roll_code: rollCode,
                    roll_tag: rollCode,
                    width_ft: item.w,
                    initial_length_ft: item.l,
                    current_length_ft: item.l,
                    original_length_ft: item.l,
                    remaining_length_ft: item.l,
                    initial_area_sft: item.area,
                    consumed_area_sft: 0,
                    remaining_area_sft: item.area,
                    current_area_sft: item.area,
                    status: 'available',
                    unit_cost: item.rollCost,
                    total_cost: item.rollCost,
                    material: {
                      id: m.id,
                      name: m.name,
                      sku: m.sku,
                      unit: m.unit,
                      name_bn: m.name_bn || null,
                    } as any,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  }

                  if (supabaseClient) {
                    try {
                      const dbInsert = { ...rollPayload }
                      delete (dbInsert as any).material
                      await (supabaseClient as any).from('inventory_rolls').insert(dbInsert)
                    } catch {}
                  }

                  PrintERPDataStore.addItem(STORAGE_KEYS.MOUNTED_ROLLS, rollPayload, companyId)
                  PrintERPDataStore.addItem(STORAGE_KEYS.MOUNTED_ROLLS, rollPayload)
                  rolls.push(rollPayload)
                  rollCounter++
                }
              }
            } else if (configuredList.length > 0) {
              const item = configuredList[0]
              const numRolls = item.area > 0 ? Math.max(1, Math.round(stockNum / item.area)) : Math.max(1, Math.round(stockNum))
              for (let i = 1; i <= numRolls; i++) {
                const rollCode = numRolls === 1
                  ? `ROL-${cleanSku}-${item.w}FT`
                  : `ROL-${cleanSku}-${item.w}FT-${String(i).padStart(2, '0')}`

                const rollPayload: InventoryRollRecord = {
                  id: `rol-init-${m.id.slice(0, 8)}-${i}-${lot}`,
                  company_id: companyId,
                  branch_id: m.branch_id || null,
                  location_id: null,
                  location_name: m.location || 'Main Warehouse',
                  material_id: m.id,
                  roll_code: rollCode,
                  roll_tag: rollCode,
                  width_ft: item.w,
                  initial_length_ft: item.l,
                  current_length_ft: item.l,
                  original_length_ft: item.l,
                  remaining_length_ft: item.l,
                  initial_area_sft: item.area,
                  consumed_area_sft: 0,
                  remaining_area_sft: item.area,
                  current_area_sft: item.area,
                  status: 'available',
                  unit_cost: item.rollCost,
                  total_cost: item.rollCost,
                  material: {
                    id: m.id,
                    name: m.name,
                    sku: m.sku,
                    unit: m.unit,
                    name_bn: m.name_bn || null,
                  } as any,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                }

                if (supabaseClient) {
                  try {
                    const dbInsert = { ...rollPayload }
                    delete (dbInsert as any).material
                    await (supabaseClient as any).from('inventory_rolls').insert(dbInsert)
                  } catch {}
                }

                PrintERPDataStore.addItem(STORAGE_KEYS.MOUNTED_ROLLS, rollPayload, companyId)
                PrintERPDataStore.addItem(STORAGE_KEYS.MOUNTED_ROLLS, rollPayload)
                rolls.push(rollPayload)
              }
            }
          }
          existingMaterialIdsWithRolls.add(m.id)
        } else {
          // Standard single-size inferred roll auto-generation
          const effectiveWidthFt = (globalAllowance > 0 && Math.floor(widthFt) === widthFt) ? Math.round((widthFt + globalAllowance) * 100) / 100 : widthFt
          const rollArea = Math.round(effectiveWidthFt * lengthFt * 100) / 100

          let numRolls = 1
          if (m.unit === 'roll') {
            numRolls = Math.max(1, Math.round(stockNum))
          } else if (rollArea > 0) {
            numRolls = Math.max(1, Math.round(stockNum / rollArea))
          } else if (m.purchase_unit === 'roll') {
            numRolls = Math.max(1, Math.round(stockNum))
          }

          const rollCost = rawCost > 100 ? rawCost : (rawCost > 0 && rollArea > 0 ? rawCost * rollArea : rawCost)

          for (let i = 1; i <= numRolls; i++) {
            const rollCode = numRolls === 1
              ? `ROL-${cleanSku}-${effectiveWidthFt}FT`
              : `ROL-${cleanSku}-${effectiveWidthFt}FT-${String(i).padStart(2, '0')}`

            const rollPayload: InventoryRollRecord = {
              id: `rol-init-${m.id.slice(0, 8)}-${i}-${lot}`,
              company_id: companyId,
              branch_id: m.branch_id || null,
              location_id: null,
              location_name: m.location || 'Main Warehouse',
              material_id: m.id,
              roll_code: rollCode,
              roll_tag: rollCode,
              width_ft: effectiveWidthFt,
              initial_length_ft: lengthFt,
              current_length_ft: lengthFt,
              original_length_ft: lengthFt,
              remaining_length_ft: lengthFt,
              initial_area_sft: rollArea,
              consumed_area_sft: 0,
              remaining_area_sft: rollArea,
              current_area_sft: rollArea,
              status: 'available',
              unit_cost: rollCost,
              total_cost: rollCost,
              material: {
                id: m.id,
                name: m.name,
                sku: m.sku,
                unit: m.unit,
                name_bn: m.name_bn || null,
              } as any,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }

            if (supabaseClient) {
              try {
                const dbInsert = { ...rollPayload }
                delete (dbInsert as any).material
                await (supabaseClient as any).from('inventory_rolls').insert(dbInsert)
              } catch {}
            }

            PrintERPDataStore.addItem(STORAGE_KEYS.MOUNTED_ROLLS, rollPayload, companyId)
            PrintERPDataStore.addItem(STORAGE_KEYS.MOUNTED_ROLLS, rollPayload)
            rolls.push(rollPayload)
          }
          existingMaterialIdsWithRolls.add(m.id)
        }
      }
    } catch {}

    // 4. Enrich Material metadata on all rolls
    try {
      const matMap = new Map<string, MaterialRecord>()
      for (const m of materialsList) {
        matMap.set(m.id, m)
        if (m.sku) matMap.set(m.sku.toLowerCase(), m)
      }

      for (const r of rolls) {
        if (!r.material || !r.material.name || r.material.name === 'Roll Media') {
          const mat = matMap.get(r.material_id) || (r.roll_code ? matMap.get(r.roll_code.toLowerCase()) : undefined)
          if (mat) {
            r.material = {
              id: mat.id,
              name: mat.name,
              sku: mat.sku,
              unit: mat.unit,
              name_bn: mat.name_bn || null,
            } as any
          }
        }
        if (r.current_length_ft == null) {
          r.current_length_ft = Number(r.remaining_length_ft ?? (r.remaining_area_sft / (r.width_ft || 1)))
        }
        if (r.remaining_area_sft == null) {
          r.remaining_area_sft = Number(r.current_area_sft ?? ((r.current_length_ft || 0) * (r.width_ft || 1)))
        }
      }
    } catch {}

    // 5. Final Filter pass
    return rolls.filter((r) => {
      if (r.company_id && r.company_id !== companyId) return false
      if (options?.materialId && r.material_id !== options.materialId) return false
      if (options?.status && options.status !== 'all') {
        if (options.status === 'available' && (r.status === 'available' || r.status === 'in_warehouse' || !r.status)) return true
        if (options.status === 'mounted' && (r.status === 'mounted' || r.status === 'in_use' || r.status === 'on_floor')) return true
        if (options.status === 'depleted' && (r.status === 'depleted' || (r.remaining_length_ft != null && r.remaining_length_ft <= 0.5))) return true
        if (r.status !== options.status) return false
      }
      if (options?.locationId && r.location_id !== options.locationId) return false
      return true
    })
  }

  static async getInventoryRollById(id: string, companyId?: string): Promise<InventoryRollRecord | null> {
    let roll: InventoryRollRecord | null = null
    try {
      const supabase = await createClient()
      let query = (supabase as any)
        .from('inventory_rolls')
        .select('*, material:materials(id, name, sku, unit)')
        .eq('id', id)

      if (companyId) {
        query = query.eq('company_id', companyId)
      }

      const { data, error } = await query.maybeSingle()

      if (!error && data) {
        roll = data as unknown as InventoryRollRecord
      }
    } catch {}

    if (!roll) {
      const all = PrintERPDataStore.get<InventoryRollRecord[]>(STORAGE_KEYS.MOUNTED_ROLLS) || []
      roll = all.find((r) => (r.id === id || r.roll_code === id || r.roll_tag === id) && (!companyId || !r.company_id || r.company_id === companyId)) || null
    }

    if (roll && (!roll.material || !roll.material.name || roll.material.name === 'Roll Media')) {
      try {
        const mat = await this.getMaterialById(roll.material_id, companyId || roll.company_id || '')
        if (mat) {
          roll.material = {
            id: mat.id,
            name: mat.name,
            sku: mat.sku,
            unit: mat.unit,
            name_bn: mat.name_bn || null,
          } as any
        }
      } catch {}
    }

    return roll
  }

  static async getPhysicalRollById(id: string, companyId: string): Promise<InventoryRollRecord | null> {
    return this.getInventoryRollById(id, companyId)
  }

  static async createPhysicalRoll(params: {
    id?: string
    company_id: string
    branch_id?: string | null
    location_id?: string | null
    material_id: string
    roll_code?: string
    roll_tag?: string
    width_ft: number
    initial_length_ft: number
    unit_cost?: number
    purchase_order_id?: string | null
    grn_id?: string | null
    supplier_id?: string | null
    batch_lot_number?: string | null
    location_name?: string
    notes?: string | null
  }): Promise<InventoryRollRecord> {
    const rollId = params.id || crypto.randomUUID()
    const rollCode = params.roll_code || params.roll_tag || `ROLL-${Date.now().toString().slice(-6)}`
    const rollTag = params.roll_tag || params.roll_code || rollCode
    const initialArea = Math.round(params.width_ft * params.initial_length_ft * 100) / 100
    const unitCost = Number(params.unit_cost) || 0
    const totalCost = unitCost > 0 ? unitCost : 0

    const payload: InventoryRollRecord = {
      id: rollId,
      company_id: params.company_id,
      branch_id: params.branch_id || null,
      location_id: params.location_id || null,
      material_id: params.material_id,
      roll_code: rollCode,
      roll_tag: rollTag,
      width_ft: params.width_ft,
      initial_length_ft: params.initial_length_ft,
      current_length_ft: params.initial_length_ft,
      original_length_ft: params.initial_length_ft,
      remaining_length_ft: params.initial_length_ft,
      initial_area_sft: initialArea,
      consumed_area_sft: 0,
      remaining_area_sft: initialArea,
      current_area_sft: initialArea,
      status: (params as any).status || 'available',
      location_name: params.location_name || 'Main Store',
      unit_cost: unitCost,
      total_cost: totalCost,
      purchase_order_id: params.purchase_order_id || null,
      grn_id: params.grn_id || null,
      supplier_id: params.supplier_id || null,
      batch_lot_number: params.batch_lot_number || null,
      notes: params.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('inventory_rolls')
        .insert(payload)
        .select()
        .single()

      if (!error && data) {
        PrintERPDataStore.addItem(STORAGE_KEYS.MOUNTED_ROLLS, payload, params.company_id)
        PrintERPDataStore.addItem(STORAGE_KEYS.MOUNTED_ROLLS, payload)
        return payload
      }
    } catch {}

    PrintERPDataStore.addItem(STORAGE_KEYS.MOUNTED_ROLLS, payload, params.company_id)
    PrintERPDataStore.addItem(STORAGE_KEYS.MOUNTED_ROLLS, payload)
    return payload
  }

  static async consumeFromPhysicalRoll(params: {
    company_id: string
    roll_id: string
    linear_length_consumed_ft: number
    bleed_allowance_ft?: number
    wastage_length_ft?: number
    wastage_reason?: string | null
    production_task_id?: string | null
    job_order_id?: string | null
    operator_name?: string
    notes?: string | null
    offcut_remnant?: {
      create_remnant: boolean
      width_ft?: number
      length_ft?: number
      location_id?: string
      condition?: 'excellent' | 'usable' | 'minor_defect'
      notes?: string | null
    }
  }): Promise<{ roll: InventoryRollRecord; remnant?: InventoryRemnantRecord | null; totalDeductedFt: number }> {
    const roll = await this.getInventoryRollById(params.roll_id, params.company_id)
    if (!roll) {
      throw new Error(`Physical Roll ${params.roll_id} not found.`)
    }

    const currentLen = Number(roll.current_length_ft ?? roll.remaining_area_sft / (roll.width_ft || 1))
    const goodLen = Math.max(0, Number(params.linear_length_consumed_ft) || 0)
    const bleedLen = Math.max(0, Number(params.bleed_allowance_ft) || 0)
    const wastageLen = Math.max(0, Number(params.wastage_length_ft) || 0)

    const totalToDeduct = Math.round((goodLen + bleedLen + wastageLen) * 100) / 100
    const actualDeducted = Math.min(currentLen, totalToDeduct)

    const goodConsumedArea = Math.round((goodLen + bleedLen) * roll.width_ft * 100) / 100
    const wastageArea = Math.round(wastageLen * roll.width_ft * 100) / 100
    const totalDeductedArea = Math.round(actualDeducted * roll.width_ft * 100) / 100

    const newRemainingLen = Math.max(0, Math.round((currentLen - actualDeducted) * 100) / 100)
    const newRemainingArea = Math.round(newRemainingLen * roll.width_ft * 100) / 100
    const newConsumedArea = (Number(roll.consumed_area_sft) || 0) + totalDeductedArea

    const isDepleted = newRemainingLen <= 0.5 // less than 6 inches is considered depleted
    const newStatus: any = isDepleted ? 'depleted' : 'in_use'

    const updatedRollPayload: Partial<InventoryRollRecord> = {
      current_length_ft: newRemainingLen,
      remaining_area_sft: newRemainingArea,
      current_area_sft: newRemainingArea,
      consumed_area_sft: newConsumedArea,
      status: newStatus,
      updated_at: new Date().toISOString(),
    }

    let updatedRoll: InventoryRollRecord = { ...roll, ...updatedRollPayload }

    try {
      const supabase = await createClient()
      const { data } = await (supabase as any)
        .from('inventory_rolls')
        .update(updatedRollPayload)
        .eq('id', roll.id)
        .select()
        .single()

      if (data) updatedRoll = data as unknown as InventoryRollRecord
    } catch {}

    PrintERPDataStore.updateItem(STORAGE_KEYS.MOUNTED_ROLLS, roll.id, updatedRoll, params.company_id)
    PrintERPDataStore.updateItem(STORAGE_KEYS.MOUNTED_ROLLS, roll.id, updatedRoll)

    // Log Stock Ledger Entry for Good Job Run (+ Bleed)
    if (goodConsumedArea > 0) {
      await this.recordStockAdjustment({
        company_id: params.company_id,
        branch_id: roll.branch_id || null,
        material_id: roll.material_id,
        location_id: roll.location_id || null,
        quantity_change: -goodConsumedArea,
        transaction_type: 'CONSUMPTION',
        unit_cost: roll.unit_cost || 0,
        reference_type: 'INVENTORY_ROLL',
        reference_id: roll.id,
        production_task_id: params.production_task_id || null,
        notes: `Roll Print Feed: ${goodLen}ft + Bleed: ${bleedLen}ft (${goodConsumedArea} sqft) from Roll ${roll.roll_code || roll.roll_tag}. Remaining: ${newRemainingLen}ft.`,
        performed_by_name: params.operator_name || 'Production Operator',
      })
    }

    // Log Stock Ledger Entry for Wastage/Scrap if logged
    if (wastageArea > 0) {
      await this.recordStockAdjustment({
        company_id: params.company_id,
        branch_id: roll.branch_id || null,
        material_id: roll.material_id,
        location_id: roll.location_id || null,
        quantity_change: -wastageArea,
        transaction_type: 'WASTAGE',
        unit_cost: roll.unit_cost || 0,
        reference_type: 'INVENTORY_ROLL_SCRAP',
        reference_id: roll.id,
        production_task_id: params.production_task_id || null,
        notes: `Roll Print Scrap: ${wastageLen}ft (${wastageArea} sqft). Reason: ${params.wastage_reason || 'Print Head/Banding Defect'} [Roll: ${roll.roll_code || roll.roll_tag}]`,
        performed_by_name: params.operator_name || 'Production Operator',
      })
    }

    // Create Remnant ONLY if:
    // 1. Explicitly requested with offcut dimensions, OR
    // 2. The roll has reached end-of-roll depletion state AND the remaining offcut piece satisfies physical reusability criteria (width >= 2ft, length >= 2ft, area >= 4 SFT)
    let remnant: InventoryRemnantRecord | null = null
    const shouldCreateExplicitRemnant = params.offcut_remnant?.create_remnant
    const shouldCreateDepletedRemnant = isDepleted && newRemainingLen >= 2.0 && (roll.width_ft * newRemainingLen >= 4.0)

    if (shouldCreateExplicitRemnant || shouldCreateDepletedRemnant) {
      const remWidth = params.offcut_remnant?.width_ft || roll.width_ft
      const remLength = params.offcut_remnant?.length_ft || newRemainingLen
      const remCondition = params.offcut_remnant?.condition || 'usable'
      const remLoc = params.offcut_remnant?.location_id || roll.location_id || 'loc-main'

      try {
        remnant = await this.createRemnant({
          company_id: params.company_id,
          branch_id: roll.branch_id || null,
          parent_material_id: roll.material_id,
          production_task_id: params.production_task_id || null,
          source_roll_id: roll.id,
          location_id: remLoc,
          width: remWidth,
          length: remLength,
          dimension_unit: 'ft',
          condition: remCondition,
          notes: params.offcut_remnant?.notes || `Offcut from roll ${roll.roll_code || roll.roll_tag}`,
          created_by_name: params.operator_name || 'Production Operator',
        })
      } catch {}
    }

    return { roll: updatedRoll, remnant, totalDeductedFt: actualDeducted }
  }

  static async issueMasterRollsBatch(params: IssueMasterRollParams): Promise<IssueMasterRollResult> {
    const companyId = params.company_id || ''
    const mat = await this.getMaterialById(params.material_id, companyId)
    if (!mat) {
      throw new Error(`Material with ID ${params.material_id} not found.`)
    }

    const breakdown = getMaterialWarehouseStockBreakdown(mat)
    const isRollMedia = Boolean(breakdown.is_roll)
    const rawPurchaseUnit = String(
      breakdown.purchase_unit ||
      mat.purchase_unit ||
      (mat.material_config as any)?.purchase_unit ||
      'pcs'
    ).toLowerCase()
    const consumptionUnit = String(
      breakdown.consumption_unit ||
      mat.unit ||
      (mat as any).selling_unit ||
      'pcs'
    ).toLowerCase()

    const isSheet =
      rawPurchaseUnit === 'sheet' ||
      ['rigid_sheet', 'rigid_sheets', 'acrylic', 'pvc_board', 'foam_board', 'acp'].some((c) =>
        (mat.category || '').toLowerCase().includes(c)
      )

    const isPackBox = ['box', 'pack', 'carton', 'set'].includes(rawPurchaseUnit)

    const isFluid =
      ['bottle', 'can', 'liter', 'ltr'].includes(rawPurchaseUnit) ||
      ['ink', 'fluid', 'solvent'].some((c) => (mat.category || '').toLowerCase().includes(c))

    const widthFt = Number(params.width_ft) || (isRollMedia ? Number(mat.roll_width_ft || mat.width || 3) : 1)
    const lengthFt = Number(params.length_ft) || (isRollMedia ? Number(mat.standard_roll_length_ft || mat.roll_length_ft || mat.length || 164) : 1)
    const numRolls = Math.max(1, Number(params.quantity_rolls) || 1)

    let singleUnitConsumptionQuantity = 1
    if (isRollMedia) {
      singleUnitConsumptionQuantity = Math.round(widthFt * lengthFt * 100) / 100
    } else if (isSheet) {
      const sheetW = Number((mat as any).sheet_width_ft || mat.width || 4)
      const sheetL = Number((mat as any).sheet_length_ft || mat.length || 8)
      const sheetArea = sheetW * sheetL > 0 ? sheetW * sheetL : 32
      const isSft = ['sft', 'sqft'].includes(consumptionUnit)
      singleUnitConsumptionQuantity = isSft ? sheetArea : 1
    } else if (isPackBox) {
      const packQty = Number(
        (mat as any).pack_quantity ||
          (mat.material_config as any)?.pack_quantity ||
          (mat as any).conversion_factor ||
          (mat as any).conversion_ratio ||
          1
      )
      singleUnitConsumptionQuantity = packQty > 1 ? packQty : 1
    } else if (isFluid) {
      const isMl = consumptionUnit === 'ml'
      const vol = Number(
        (mat as any).liquid_volume_capacity
          ? String((mat as any).liquid_volume_capacity).replace(/[^0-9.]/g, '')
          : (mat.material_config as any)?.liquid_volume_ml || 1000
      )
      singleUnitConsumptionQuantity = isMl ? (vol > 0 ? vol : 1000) : 1
    } else {
      singleUnitConsumptionQuantity = 1
    }

    const totalConsumptionQuantity = Math.round(singleUnitConsumptionQuantity * numRolls * 100) / 100
    const unitCost = Number(
      params.unit_cost ??
        (mat as any).unit_cost ??
        mat.average_cost ??
        mat.last_purchase_price ??
        (mat as any).purchase_price ??
        0
    )
    const totalValuation = Math.round(totalConsumptionQuantity * unitCost * 100) / 100

    const isMountedToMachine = params.destination !== 'floor_staging' && Boolean(params.machine_id)
    const machineId = isMountedToMachine ? params.machine_id || null : null
    const machineName = isMountedToMachine ? params.machine_name || null : null

    const timestamp = Date.now()
    const cleanSku = (mat.sku || 'MAT').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    const baseLot = params.lot_number?.trim() || timestamp.toString().slice(-4)

    // Check for existing warehouse rolls matching this material and width_ft
    const allStoreRolls = [
      ...(PrintERPDataStore.getAll<InventoryRollRecord>(STORAGE_KEYS.MOUNTED_ROLLS, companyId) || []),
      ...(PrintERPDataStore.get<InventoryRollRecord[]>(STORAGE_KEYS.MOUNTED_ROLLS, companyId) || []),
      ...(PrintERPDataStore.get<InventoryRollRecord[]>(STORAGE_KEYS.MOUNTED_ROLLS) || []),
      ...(PrintERPDataStore.getAll<InventoryRollRecord>(STORAGE_KEYS.MOUNTED_ROLLS) || []),
    ]
    const uniqueStoreRollsMap = new Map<string, InventoryRollRecord>()
    for (const r of allStoreRolls) {
      if (r && r.id && !uniqueStoreRollsMap.has(r.id)) {
        uniqueStoreRollsMap.set(r.id, r)
      }
    }
    const storeRolls = Array.from(uniqueStoreRollsMap.values())
    const matchingWarehouseRolls = isRollMedia
      ? storeRolls.filter(
          (r) =>
            (r.material_id === mat.id || (mat.sku && r.material?.sku && r.material.sku.toLowerCase() === mat.sku.toLowerCase())) &&
            Number(r.width_ft) === widthFt &&
            (r.status === 'in_warehouse' || r.status === 'available' || !r.status) &&
            r.location_name !== 'Print Floor' &&
            !r.mounted_machine_id &&
            !r.mounted_machine_name &&
            Number(r.initial_length_ft ?? r.current_length_ft ?? 0) >= lengthFt * 0.9
        )
      : []

    const createdRolls: InventoryRollRecord[] = []

    if (isRollMedia) {
      for (let i = 1; i <= numRolls; i++) {
        let rollRecord: InventoryRollRecord
        const rollStatus: 'mounted' | 'available' = (i === 1 && isMountedToMachine) ? 'mounted' : 'available'
        const rollMachineId = (i === 1 && isMountedToMachine) ? machineId : null
        const rollMachineName = (i === 1 && isMountedToMachine) ? machineName : null

        if (matchingWarehouseRolls.length >= i) {
          // Transition existing warehouse roll to floor / machine
          const existingRoll = matchingWarehouseRolls[i - 1]
          rollRecord = {
            ...existingRoll,
            status: rollStatus,
            location_name: 'Print Floor',
            mounted_machine_id: rollMachineId,
            mounted_machine_name: rollMachineName,
            mounted_press_name: rollMachineName,
            mounted_at: rollStatus === 'mounted' ? new Date().toISOString() : null,
            mounted_by_name: params.operator_name || 'Floor Operator',
            updated_at: new Date().toISOString(),
          }

          try {
            const supabase = await createClient()
            await (supabase as any)
              .from('inventory_rolls')
              .update({
                status: rollRecord.status,
                location_name: 'Print Floor',
                mounted_machine_id: rollMachineId,
                mounted_machine_name: rollMachineName,
                updated_at: rollRecord.updated_at,
              })
              .eq('id', rollRecord.id)
          } catch {}

          PrintERPDataStore.updateItem(STORAGE_KEYS.MOUNTED_ROLLS, rollRecord.id, rollRecord, companyId)
          PrintERPDataStore.updateItem(STORAGE_KEYS.MOUNTED_ROLLS, rollRecord.id, rollRecord)
        } else {
          // Create new discrete physical roll on floor
          const rollId = `roll-${timestamp}-${i}-${Math.random().toString(36).substring(2, 6)}`
          let rollTag: string
          if (params.roll_code_custom && params.roll_code_custom.trim()) {
            rollTag = numRolls === 1
              ? params.roll_code_custom.trim()
              : `${params.roll_code_custom.trim()}-${String(i).padStart(2, '0')}`
          } else {
            rollTag = numRolls === 1
              ? `ROL-${cleanSku}-${widthFt}FT-${baseLot}`
              : `ROL-${cleanSku}-${widthFt}FT-${baseLot}-${String(i).padStart(2, '0')}`
          }

          rollRecord = {
            id: rollId,
            company_id: companyId,
            branch_id: params.branch_id || null,
            location_id: params.location_id || null,
            location_name: 'Print Floor',
            material_id: mat.id,
            roll_code: rollTag,
            roll_tag: rollTag,
            width_ft: widthFt,
            initial_length_ft: lengthFt,
            current_length_ft: lengthFt,
            initial_area_sft: singleUnitConsumptionQuantity,
            consumed_area_sft: 0,
            remaining_area_sft: singleUnitConsumptionQuantity,
            current_area_sft: singleUnitConsumptionQuantity,
            status: rollStatus,
            mounted_machine_id: rollMachineId,
            mounted_machine_name: rollMachineName,
            mounted_press_name: rollMachineName,
            mounted_at: rollStatus === 'mounted' ? new Date().toISOString() : null,
            mounted_by_name: params.operator_name || 'Floor Operator',
            unit_cost: unitCost,
            total_cost: Math.round(singleUnitConsumptionQuantity * unitCost * 100) / 100,
            notes: params.notes || `Requisitioned for Print Floor Workstation [${machineName || 'Floor Staging'}]`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            material: mat,
          }

          try {
            const supabase = await createClient()
            await (supabase as any).from('inventory_rolls').insert({
              id: rollRecord.id,
              company_id: companyId,
              branch_id: params.branch_id || null,
              material_id: mat.id,
              roll_tag: rollRecord.roll_tag,
              roll_code: rollRecord.roll_code,
              width_ft: widthFt,
              initial_length_ft: lengthFt,
              current_length_ft: lengthFt,
              initial_area_sft: singleUnitConsumptionQuantity,
              remaining_area_sft: singleUnitConsumptionQuantity,
              consumed_area_sft: 0,
              status: rollRecord.status,
              mounted_machine_id: rollMachineId,
              mounted_machine_name: rollMachineName,
              unit_cost: rollRecord.unit_cost,
              total_cost: rollRecord.total_cost,
              notes: rollRecord.notes,
            })
          } catch {}

          PrintERPDataStore.addItem(STORAGE_KEYS.MOUNTED_ROLLS, rollRecord, companyId)
          PrintERPDataStore.addItem(STORAGE_KEYS.MOUNTED_ROLLS, rollRecord)
        }

        createdRolls.push(rollRecord)
      }
    } else {
      // Non-roll substrate / discrete piece / sheet / fluid allocated to floor
      const tagPrefix = isSheet ? 'SHT' : isPackBox ? 'BOX' : isFluid ? 'FLUID' : 'MAT'
      const rollTag = params.roll_code_custom?.trim() || `${tagPrefix}-${cleanSku}-${baseLot}`
      const rollId = `floor-item-${timestamp}-${Math.random().toString(36).substring(2, 6)}`

      const floorRecord: InventoryRollRecord = {
        id: rollId,
        company_id: companyId,
        branch_id: params.branch_id || null,
        location_id: params.location_id || null,
        location_name: 'Print Floor',
        material_id: mat.id,
        roll_code: rollTag,
        roll_tag: rollTag,
        width_ft: isSheet ? Number((mat as any).sheet_width_ft || mat.width || 4) : 1,
        initial_length_ft: isSheet ? Number((mat as any).sheet_length_ft || mat.length || 8) : totalConsumptionQuantity,
        current_length_ft: isSheet ? Number((mat as any).sheet_length_ft || mat.length || 8) : totalConsumptionQuantity,
        initial_area_sft: totalConsumptionQuantity,
        remaining_area_sft: totalConsumptionQuantity,
        consumed_area_sft: 0,
        current_area_sft: totalConsumptionQuantity,
        status: isMountedToMachine ? 'mounted' : 'available',
        mounted_machine_id: isMountedToMachine ? machineId : null,
        mounted_machine_name: isMountedToMachine ? machineName : null,
        mounted_press_name: isMountedToMachine ? machineName : null,
        mounted_at: isMountedToMachine ? new Date().toISOString() : null,
        mounted_by_name: params.operator_name || 'Floor Operator',
        unit_cost: unitCost,
        total_cost: Math.round(totalConsumptionQuantity * unitCost * 100) / 100,
        notes: params.notes || `Requisitioned ${numRolls} ${rawPurchaseUnit}(s) for Print Floor`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        material: mat,
      }

      try {
        const supabase = await createClient()
        await (supabase as any).from('inventory_rolls').insert({
          id: floorRecord.id,
          company_id: companyId,
          branch_id: params.branch_id || null,
          material_id: mat.id,
          roll_tag: floorRecord.roll_tag,
          roll_code: floorRecord.roll_code,
          width_ft: floorRecord.width_ft,
          initial_length_ft: floorRecord.initial_length_ft,
          current_length_ft: floorRecord.current_length_ft,
          initial_area_sft: floorRecord.initial_area_sft,
          remaining_area_sft: floorRecord.remaining_area_sft,
          consumed_area_sft: 0,
          status: floorRecord.status,
          mounted_machine_id: floorRecord.mounted_machine_id,
          mounted_machine_name: floorRecord.mounted_machine_name,
          unit_cost: floorRecord.unit_cost,
          total_cost: floorRecord.total_cost,
          notes: floorRecord.notes,
        })
      } catch {}

      PrintERPDataStore.addItem(STORAGE_KEYS.MOUNTED_ROLLS, floorRecord, companyId)
      PrintERPDataStore.addItem(STORAGE_KEYS.MOUNTED_ROLLS, floorRecord)
      createdRolls.push(floorRecord)
    }

    const primaryRoll = createdRolls[0]

    // Synchronize machinery if primary roll mounted
    if (machineId && primaryRoll.status === 'mounted') {
      try {
        await MachineryRepository.updateActiveMountedRoll(machineId, companyId, {
          id: primaryRoll.id,
          tag: primaryRoll.roll_code || primaryRoll.roll_tag || `Item #${primaryRoll.id.slice(0, 8)}`,
        })
      } catch {}
    }

    // Decrement specific size group count in material.roll_sizes or material_config.roll_sizes
    if (isRollMedia) {
      try {
        const allMats = [
          ...(PrintERPDataStore.getAll<MaterialRecord>(STORAGE_KEYS.MATERIALS, companyId) || []),
          ...(PrintERPDataStore.get<MaterialRecord[]>(STORAGE_KEYS.MATERIALS, companyId) || []),
          ...(PrintERPDataStore.get<MaterialRecord[]>(STORAGE_KEYS.MATERIALS) || []),
          ...(PrintERPDataStore.getAll<MaterialRecord>(STORAGE_KEYS.MATERIALS) || []),
        ]
        const matIdx = allMats.findIndex((m) => m && m.id === mat.id)
        if (matIdx >= 0) {
          const targetMat = allMats[matIdx]
          const rawSizes = targetMat.roll_sizes || (targetMat.material_config as any)?.roll_sizes || []
          if (Array.isArray(rawSizes) && rawSizes.length > 0) {
            const updatedSizes = rawSizes.map((s: any) => {
              if (Number(s.width || s.width_ft) === widthFt) {
                const prevCount = Number(s.quantity ?? s.stock_qty ?? s.stock ?? s.roll_count ?? 1)
                const newCount = Math.max(0, prevCount - numRolls)
                return {
                  ...s,
                  quantity: newCount,
                  stock_qty: newCount,
                  stock: newCount,
                  roll_count: newCount,
                }
              }
              return s
            })
            targetMat.roll_sizes = updatedSizes
            if (targetMat.material_config) {
              targetMat.material_config.roll_sizes = updatedSizes
            }
            PrintERPDataStore.updateItem(STORAGE_KEYS.MATERIALS, targetMat.id, targetMat, companyId)
            PrintERPDataStore.updateItem(STORAGE_KEYS.MATERIALS, targetMat.id, targetMat)
          }
        }
      } catch {}
    }

    // Deduct raw material master balance from warehouse store & log ISSUE transaction
    await this.recordStockAdjustment({
      company_id: companyId,
      branch_id: params.branch_id || null,
      material_id: mat.id,
      location_id: params.location_id || null,
      quantity_change: -totalConsumptionQuantity,
      transaction_type: 'ISSUE',
      unit_cost: unitCost,
      reference_type: 'PRINT_FLOOR_ROLL_ISSUE',
      reference_id: primaryRoll.id,
      notes: `${numRolls} ${rawPurchaseUnit.toUpperCase()}(s) [${primaryRoll.roll_code}${numRolls > 1 && isRollMedia ? ` ... (${numRolls} rolls)` : ''}] (${totalConsumptionQuantity} ${consumptionUnit.toUpperCase()}) issued to Print Floor`,
      performed_by_name: params.operator_name || 'Store Keeper',
    })

    // Create synchronized MaterialIssueRecord and FloorConsumptionRecords so the item appears in floor consumption
    const issueId = `iss-${timestamp}`
    const issueNumber = `ISS-${timestamp.toString().slice(-6)}`
    const issueRecord: MaterialIssueRecord = {
      id: issueId,
      company_id: companyId,
      branch_id: params.branch_id || null,
      issue_number: issueNumber,
      request_id: null,
      production_task_id: null,
      source_location_id: params.location_id || 'loc-main',
      destination_location_id: null,
      issued_by_id: null,
      issued_by_name: params.operator_name || 'Store Keeper',
      received_by_name: params.operator_name || 'Floor Operator',
      assigned_machine: machineName || null,
      job_reference: params.lot_number || null,
      status: 'completed',
      notes: params.notes || `Requisitioned ${numRolls} ${rawPurchaseUnit}(s) for Print Floor [${machineName || 'Floor Staging'}]`,
      created_at: new Date().toISOString(),
      items: createdRolls.map((roll, idx) => {
        const itemQty = isRollMedia
          ? Number(roll.initial_area_sft ?? roll.remaining_area_sft ?? singleUnitConsumptionQuantity)
          : totalConsumptionQuantity
        const itemUnit = isRollMedia ? ((mat.unit || 'sft') as MaterialUnit) : ((mat.unit || 'pcs') as MaterialUnit)
        const itemUnitCost = unitCost
        const itemTotalCost = Math.round(itemQty * itemUnitCost * 100) / 100

        return {
          id: `isi-${timestamp}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
          issue_id: issueId,
          request_item_id: null,
          material_id: mat.id,
          material_name: mat.name,
          roll_id: roll.id,
          roll_code: roll.roll_code || roll.roll_tag,
          machine_id: roll.mounted_machine_id || machineId || null,
          machine_name: roll.mounted_machine_name || machineName || 'General Production Floor',
          job_reference: params.lot_number || null,
          issued_quantity: itemQty,
          consumed_quantity: 0,
          returned_quantity: 0,
          wastage_quantity: 0,
          wastage_reason: null,
          remaining_floor_balance: itemQty,
          unit: itemUnit,
          unit_cost: itemUnitCost,
          total_cost: itemTotalCost,
          status: 'on_floor',
          created_at: new Date().toISOString(),
        }
      }),
    }

    try {
      const supabase = await createClient()
      const { data: dbIssue } = await (supabase as any)
        .from('material_issues')
        .insert({
          id: issueRecord.id,
          company_id: companyId,
          branch_id: params.branch_id || null,
          issue_number: issueRecord.issue_number,
          source_location_id: issueRecord.source_location_id,
          issued_by_name: issueRecord.issued_by_name,
          received_by_name: issueRecord.received_by_name,
          assigned_machine: issueRecord.assigned_machine,
          status: 'completed',
          notes: issueRecord.notes,
        })
        .select()
        .single()

      if (dbIssue) {
        for (const it of issueRecord.items || []) {
          await (supabase as any).from('material_issue_items').insert({
            issue_id: dbIssue.id,
            material_id: it.material_id,
            issued_quantity: it.issued_quantity,
            unit: it.unit,
            unit_cost: it.unit_cost,
            total_cost: it.total_cost,
          })
        }
      }
    } catch {}

    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIAL_ISSUES, issueRecord, companyId)
    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIAL_ISSUES, issueRecord)

    // Also register in FLOOR_CONSUMPTIONS for instantaneous zero-latency UI rendering
    for (const item of issueRecord.items || []) {
      const floorRecord: FloorConsumptionRecord = {
        id: `fc-${issueId}-${item.id || item.roll_id || mat.id}`,
        company_id: companyId,
        branch_id: params.branch_id || null,
        issue_id: issueId,
        issue_number: issueNumber,
        issue_item_id: item.id,
        material_id: mat.id,
        material_name: mat.name,
        sku: mat.sku,
        roll_id: item.roll_id || null,
        roll_code: item.roll_code || null,
        machine_id: item.machine_id || null,
        machine_name: item.machine_name || machineName || 'General Production Floor',
        job_order_id: null,
        job_reference: params.lot_number || null,
        production_task_id: null,
        operator_id: null,
        operator_name: params.operator_name || 'Floor Operator',
        issued_quantity: item.issued_quantity,
        consumed_quantity: 0,
        unit: item.unit,
        unit_cost: item.unit_cost || 0,
        total_cost: item.total_cost || 0,
        wastage_quantity: 0,
        wastage_reason: null,
        wastage_cost: 0,
        returned_quantity: 0,
        return_location_id: null,
        return_location_name: null,
        remnants_count: 0,
        remnants_area_sft: 0,
        remaining_floor_balance: item.issued_quantity,
        status: 'on_floor',
        notes: issueRecord.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        material: mat,
      }

      PrintERPDataStore.addItem(STORAGE_KEYS.FLOOR_CONSUMPTIONS, floorRecord, companyId)
      PrintERPDataStore.addItem(STORAGE_KEYS.FLOOR_CONSUMPTIONS, floorRecord)
    }

    return {
      roll: primaryRoll,
      rolls: createdRolls,
      total_area_sft: totalConsumptionQuantity,
      total_valuation: totalValuation,
      quantity_issued: numRolls,
    }
  }

  static async requestAndIssueNewRollToFloor(params: IssueMasterRollParams): Promise<InventoryRollRecord> {
    const result = await this.issueMasterRollsBatch(params)
    return result.roll
  }

  static async mountRollToMachine(params: {
    company_id: string
    roll_id: string
    machine_id: string
    machine_name: string
    operator_name?: string
  }): Promise<InventoryRollRecord> {
    const roll = await this.getInventoryRollById(params.roll_id, params.company_id)
    if (!roll) {
      throw new Error(`Physical Roll ${params.roll_id} not found.`)
    }

    const payload: Partial<InventoryRollRecord> = {
      status: 'mounted',
      mounted_machine_id: params.machine_id,
      mounted_machine_name: params.machine_name,
      mounted_press_name: params.machine_name,
      mounted_at: new Date().toISOString(),
      mounted_by_name: params.operator_name || 'Operator',
      updated_at: new Date().toISOString(),
    }

    let updated: InventoryRollRecord = { ...roll, ...payload }

    try {
      const supabase = await createClient()
      const { data } = await (supabase as any)
        .from('inventory_rolls')
        .update(payload)
        .eq('id', roll.id)
        .select()
        .single()
      if (data) updated = data as unknown as InventoryRollRecord
    } catch {}

    PrintERPDataStore.updateItem(STORAGE_KEYS.MOUNTED_ROLLS, roll.id, updated, params.company_id)
    PrintERPDataStore.updateItem(STORAGE_KEYS.MOUNTED_ROLLS, roll.id, updated)

    // Synchronize Machinery active mounted roll
    try {
      await MachineryRepository.updateActiveMountedRoll(params.machine_id, params.company_id, {
        id: roll.id,
        tag: roll.roll_code || roll.roll_tag || `Roll #${roll.id.slice(0, 8)}`,
      })
    } catch {}

    return updated
  }

  static async unmountRollFromMachine(params: {
    company_id: string
    roll_id: string
    machine_id?: string
  }): Promise<InventoryRollRecord> {
    const roll = await this.getInventoryRollById(params.roll_id, params.company_id)
    if (!roll) {
      throw new Error(`Physical Roll ${params.roll_id} not found.`)
    }

    const machineId = params.machine_id || roll.mounted_machine_id

    const payload: Partial<InventoryRollRecord> = {
      status: 'available',
      mounted_machine_id: null,
      mounted_machine_name: null,
      mounted_press_name: null,
      mounted_at: null,
      mounted_by_name: null,
      updated_at: new Date().toISOString(),
    }

    let updated: InventoryRollRecord = { ...roll, ...payload }

    try {
      const supabase = await createClient()
      const { data } = await (supabase as any)
        .from('inventory_rolls')
        .update(payload)
        .eq('id', roll.id)
        .select()
        .single()
      if (data) updated = data as unknown as InventoryRollRecord
    } catch {}

    PrintERPDataStore.updateItem(STORAGE_KEYS.MOUNTED_ROLLS, roll.id, updated)

    // Synchronize Machinery unmount
    if (machineId) {
      try {
        await MachineryRepository.updateActiveMountedRoll(machineId, params.company_id, null)
      } catch {}
    }

    return updated
  }

  static async findCompatibleRemnants(
    companyId: string,
    materialId: string,
    minWidthFt: number,
    minLengthFt: number
  ): Promise<InventoryRemnantRecord[]> {
    const allRemnants = await this.getRemnants(companyId, { materialId, status: 'available' })
    return allRemnants.filter(
      (r) =>
        (Number(r.width) >= minWidthFt && Number(r.length) >= minLengthFt) ||
        (Number(r.width) >= minLengthFt && Number(r.length) >= minWidthFt)
    )
  }

  static async recordWastage(params: {
    company_id: string
    material_id: string
    material_name?: string
    job_order_id?: string | null
    production_task_id?: string | null
    expected_usage?: number
    actual_usage?: number
    wastage_quantity: number
    unit?: string
    wastage_reason: string
    estimated_cost?: number
    operator_name?: string
  }): Promise<MaterialWastageRecord> {
    const wastageId = crypto.randomUUID()
    const payload: MaterialWastageRecord = {
      id: wastageId,
      company_id: params.company_id,
      material_id: params.material_id,
      material_name: params.material_name,
      job_order_id: params.job_order_id || null,
      production_task_id: params.production_task_id || null,
      expected_usage: params.expected_usage || 0,
      actual_usage: params.actual_usage || 0,
      wastage_quantity: params.wastage_quantity,
      unit: (params.unit || 'sft') as MaterialUnit,
      wastage_reason: params.wastage_reason,
      estimated_cost: params.estimated_cost || 0,
      created_at: new Date().toISOString(),
    }

    try {
      const supabase = await createClient()
      await (supabase as any).from('material_wastages').insert(payload)
    } catch {}

    // Ledger Entry for Wastage
    await this.recordStockAdjustment({
      company_id: params.company_id,
      material_id: params.material_id,
      quantity_change: -Math.abs(params.wastage_quantity),
      transaction_type: 'WASTAGE',
      reference_type: 'MATERIAL_WASTAGE',
      reference_id: wastageId,
      production_task_id: params.production_task_id || null,
      notes: `Production Wastage: ${params.wastage_reason} (${params.wastage_quantity} ${params.unit || 'sft'})`,
      performed_by_name: params.operator_name || 'Production Operator',
    })

    return payload
  }

  // Convenience Aliases for Clean Domain / Scenario Testing
  static async createRoll(params: any): Promise<InventoryRollRecord> {
    return this.createPhysicalRoll(params)
  }

  static async getRollsByMaterial(materialId: string, companyId: string): Promise<InventoryRollRecord[]> {
    return this.getInventoryRolls(companyId, { materialId })
  }

  static async consumeRollLinearLength(
    rollId: string,
    linearLengthFt: number,
    taskId?: string,
    operatorName?: string,
    notes?: string
  ): Promise<InventoryRollRecord> {
    const roll = await this.getInventoryRollById(rollId, '')
    const res = await this.consumeFromPhysicalRoll({
      company_id: roll?.company_id || '',
      roll_id: rollId,
      linear_length_consumed_ft: linearLengthFt,
      production_task_id: taskId,
      operator_name: operatorName,
      notes,
    })
    return res.roll
  }

  static async recordScrapWaste(params: any): Promise<any> {
    const res = await this.recordWastage({
      company_id: params.company_id,
      material_id: params.material_id,
      wastage_quantity: (Number(params.width_ft) || 1) * (Number(params.length_ft) || 1),
      unit: 'sft',
      wastage_reason: params.reason || 'Scrapped Offcut',
      operator_name: params.operator_name,
    })
    return { ...res, status: 'scrapped', is_reusable: false }
  }

  // ==========================================
  // PRICE INTELLIGENCE & INTAKE HISTORY
  // ==========================================
  static async recordPriceIntelligence(
    entry: Omit<PriceIntelligenceRecord, 'id' | 'created_at'>
  ): Promise<PriceIntelligenceRecord> {
    const payload: PriceIntelligenceRecord = {
      ...entry,
      id: `pi-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      created_at: new Date().toISOString(),
    }

    try {
      const supabase = await createClient()
      await (supabase as any).from('supplier_prices').insert(payload)
    } catch {}

    PrintERPDataStore.addItem(STORAGE_KEYS.SUPPLIER_PRICES, payload, entry.company_id)
    PrintERPDataStore.addItem(STORAGE_KEYS.SUPPLIER_PRICES, payload)
    return payload
  }

  static async getPriceIntelligenceHistory(
    companyId: string,
    materialId?: string
  ): Promise<PriceIntelligenceRecord[]> {
    try {
      const supabase = await createClient()
      let query = (supabase as any)
        .from('supplier_prices')
        .select('*')
        .eq('company_id', companyId)
        .order('purchase_date', { ascending: false })

      if (materialId) {
        query = query.eq('material_id', materialId)
      }

      const { data, error } = await query
      if (!error && data && data.length > 0) {
        return data as PriceIntelligenceRecord[]
      }
    } catch {}

    const local = PrintERPDataStore.getAll<PriceIntelligenceRecord>(STORAGE_KEYS.SUPPLIER_PRICES, companyId) || []
    if (materialId) {
      return local.filter((x) => x.material_id === materialId)
    }
    return local
  }
}

