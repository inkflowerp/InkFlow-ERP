// ==============================================================================
// PrintERP / InkFlow SaaS - Advanced Inventory Management Service (V3)
// Authoritative PostgreSQL persistence via InventoryRepository & AuditRepository
// ==============================================================================

import type {
  MaterialRecord,
  InventoryLocationRecord,
  InventoryStockBalanceRecord,
  TaskMaterialRequirementRecord,
  MaterialRequestRecord,
  MaterialIssueRecord,
  FloorConsumptionRecord,
  InventoryRemnantRecord,
  InventoryTransferRecord,
  InventoryAdjustmentRecord,
  StockLedgerRecord,
  InventoryRollRecord,
  InventorySummaryStats,
  IssueMasterRollParams,
  IssueMasterRollResult,
} from '../types/inventory.types.ts'
import { InventoryRepository, mergeRollSizesUnion } from '../lib/repositories/inventory.repository.ts'
import { AuditRepository } from '../lib/repositories/audit.repository.ts'
import { ProductRepository } from '../lib/repositories/product.repository.ts'
import type {
  PriceIntelligenceRecord,
  PriceIntelligenceSummary,
  MasterPhysicalClassification,
} from '../types/price-intelligence.types.ts'
import { PriceIntelligenceEngine } from '../lib/domain/price-intelligence-engine.ts'
import { getMaterialWarehouseStockBreakdown, isMaterialProduct, normalizeInventoryGroupAttributes, createInventoryGroupingKey } from '../lib/units.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../lib/db/data-store.ts'

export class InventoryService {
  // ==========================================
  // LOCATIONS
  // ==========================================

  static async getLocations(companyId: string, branchId?: string | null): Promise<InventoryLocationRecord[]> {
    if (!companyId) return []
    return await InventoryRepository.getLocations(companyId, branchId)
  }

  static async getLocationById(id: string, companyId: string): Promise<InventoryLocationRecord | null> {
    if (!id || !companyId) return null
    return await InventoryRepository.getLocationById(id, companyId)
  }

  static async createLocation(location: {
    company_id: string
    branch_id?: string | null
    location_code: string
    location_name: string
    location_type: string
    description?: string | null
  }): Promise<InventoryLocationRecord> {
    if (!location.company_id) {
      throw new Error('Company context is required to create an inventory location.')
    }
    const created = await InventoryRepository.createLocation(location)
    await AuditRepository.logEvent({
      companyId: location.company_id,
      userEmail: 'system',
      action: 'inventory.location_created',
      entity: 'inventory_location',
      entityId: created.id,
      newValue: created,
      description: `Created inventory location ${created.location_name} (${created.location_code})`,
    })
    return created
  }

  // ==========================================
  // MATERIALS MASTER
  // ==========================================

  static async getMaterials(
    companyId: string,
    options?: { branchId?: string | null; category?: string; search?: string; lowStockOnly?: boolean }
  ): Promise<MaterialRecord[]> {
    if (!companyId) return []
    return await InventoryRepository.getMaterials(companyId, options)
  }

  static async getMaterialById(id: string, companyId: string): Promise<MaterialRecord | null> {
    if (!id || !companyId) return null
    return await InventoryRepository.getMaterialById(id, companyId)
  }

  static async createMaterial(data: Partial<MaterialRecord> & {
    company_id: string
    sku: string
    name: string
    category: any
    unit: any
    actor_email?: string
  }): Promise<MaterialRecord> {
    if (!data.company_id) {
      throw new Error('Company context is required to create a material.')
    }
    const created = await InventoryRepository.createMaterial(data)

    await AuditRepository.logEvent({
      companyId: data.company_id,
      userEmail: data.actor_email || 'inventory@inkflow.com',
      action: 'inventory.material_created',
      entity: 'material',
      entityId: created.id,
      newValue: { sku: created.sku, name: created.name, unit: created.unit, category: created.category },
      description: `Created material master ${created.name} (${created.sku})`,
    })

    return created
  }

  static async updateMaterial(
    id: string,
    data: Partial<MaterialRecord>,
    companyId: string,
    actorEmail?: string
  ): Promise<MaterialRecord | null> {
    if (!id || !companyId) return null
    const updated = await InventoryRepository.updateMaterial(id, data, companyId)

    await AuditRepository.logEvent({
      companyId,
      userEmail: actorEmail || 'inventory@inkflow.com',
      action: 'inventory.material_updated',
      entity: 'material',
      entityId: id,
      newValue: data,
      description: `Updated material master ${updated.name} (${updated.sku})`,
    })

    return updated
  }

  // ==========================================
  // STOCK BALANCES & RECEIVING
  // ==========================================

  static async getStockBalances(companyId: string, options?: {
    locationId?: string
    materialId?: string
    branchId?: string | null
  }): Promise<InventoryStockBalanceRecord[]> {
    if (!companyId) return []
    return await InventoryRepository.getStockBalances(companyId, options)
  }

  /**
   * Receive physical stock or enter opening balance into location with Discrete Roll Creation & Price Intelligence
   */
  static async receiveStock(params: {
    company_id: string
    branch_id?: string | null
    material_id: string
    location_id: string
    quantity: number
    unit_cost?: number
    is_opening_balance?: boolean
    supplier_reference?: string | null
    supplier_id?: string | null
    supplier_name?: string | null
    size_label?: string | null
    width_ft?: number | null
    length_ft?: number | null
    allowance_ft?: number | null
    gsm?: number | null
    finishing?: string | null
    physical_form?: MasterPhysicalClassification
    purchase_unit?: string | null
    challan_number?: string | null
    supplier_invoice_number?: string | null
    batch_lot_number?: string | null
    purchase_date?: string | null
    notes?: string | null
    performed_by_id?: string | null
    performed_by_name: string
    actor_email?: string
    variant_id?: string | null
    variant_name?: string | null
  }): Promise<{ material: MaterialRecord; ledgerEntry: StockLedgerRecord; rollsCreated?: InventoryRollRecord[] }> {
    if (params.quantity <= 0) {
      throw new Error('Stock receiving rejected: Quantity must be greater than zero.')
    }

    const material = await InventoryRepository.getMaterialById(params.material_id, params.company_id)
    if (!material) {
      throw new Error(`Material with ID ${params.material_id} not found.`)
    }

    const physicalForm = params.physical_form || PriceIntelligenceEngine.detectMaterialPhysicalForm(material)
    const isRoll = physicalForm === 'roll' || material.is_roll
    const matCat = (material.category || '').toLowerCase()
    const pUnit = (params.purchase_unit || material.purchase_unit || material.unit || 'pcs').toLowerCase()
    const isSheet = physicalForm === 'sheet' || pUnit === 'sheet' || ['rigid_sheet', 'rigid_sheets', 'acrylic', 'pvc_board', 'foam_board', 'acp'].some(c => matCat.includes(c))
    const isFluid = physicalForm === 'liquid' || ['bottle', 'can', 'liter', 'ltr', 'gallon', 'ml'].includes(pUnit) || ['ink', 'fluid', 'solvent', 'chemical', 'liquid', 'dye', 'pigment'].some(c => matCat.includes(c) || material.name.toLowerCase().includes(c))

    const rawRollSizes: any[] = Array.isArray(material.roll_sizes) && material.roll_sizes.length > 0
      ? material.roll_sizes
      : Array.isArray((material.material_config as any)?.roll_sizes) && (material.material_config as any).roll_sizes.length > 0
      ? (material.material_config as any).roll_sizes
      : []

    const globalAllowance = Number(
      material.production_width_allowance ??
      (material.material_config as any)?.extra_width_allowance_ft ??
      (material.material_config as any)?.production_width_allowance ??
      (material.pricing_formula as any)?.extra_width_allowance_ft ??
      (material.pricing_formula as any)?.production_width_allowance ??
      0
    )

    // Robust Width & Length extraction with configured roll/sheet size resolution
    let nominalWidthFt = Number(params.width_ft || 0)
    let lengthFt = Number(params.length_ft || 0)

    const dimSource = `${params.size_label || ''} ${params.notes || ''}`
    if ((!nominalWidthFt || !lengthFt) && dimSource.trim()) {
      const pairMatch = dimSource.match(/(\d+(?:\.\d+)?)\s*(?:ft|'|ft\.)?\s*[xX*×]\s*(\d+(?:\.\d+)?)\s*(?:ft|'|ft\.)?/i)
      if (pairMatch) {
        if (!nominalWidthFt) nominalWidthFt = Number(pairMatch[1])
        if (!lengthFt) lengthFt = Number(pairMatch[2])
      }
    }

    if (!nominalWidthFt && params.size_label) {
      const matchW = params.size_label.match(/^(\d+(?:\.\d+)?)\s*(?:ft|')?/i) || params.size_label.match(/(\d+(?:\.\d+)?)\s*(?:ft|')/i)
      if (matchW) nominalWidthFt = Number(matchW[1])
    }
    if (!nominalWidthFt && params.notes) {
      const matchW = params.notes.match(/(\d+(?:\.\d+)?)\s*(?:ft|')/i)
      if (matchW) nominalWidthFt = Number(matchW[1])
    }

    if (!lengthFt && params.size_label) {
      const matchL = params.size_label.match(/[x×]\s*(\d+(?:\.\d+)?)/i)
      if (matchL) lengthFt = Number(matchL[1])
    }
    if (!lengthFt && params.notes) {
      const matchL = params.notes.match(/[x×]\s*(\d+(?:\.\d+)?)/i)
      if (matchL) lengthFt = Number(matchL[1])
    }

    if (!lengthFt) {
      if (isSheet) {
        lengthFt = Number(material.sheet_length_ft || material.length || 4)
      } else {
        lengthFt = Number(material.standard_roll_length_ft || material.roll_length_ft || material.length || 164)
      }
    }

    // Check if allowance 0 is specified in label/notes
    const isZeroAllowanceExplicit = Boolean(
      (params.size_label && /allowance\s*0|\(\+0|\+0ft|\+0\s*ft|0\s*allowance|allowance:\s*0/i.test(params.size_label)) ||
      (params.notes && /allowance\s*0|\(\+0|\+0ft|\+0\s*ft|0\s*allowance|allowance:\s*0/i.test(params.notes))
    )

    // Check if this matches a specific configured roll size
    let widthFt = Number(params.width_ft || nominalWidthFt)
    let matchedConfigAllowance = params.allowance_ft !== undefined
      ? Number(params.allowance_ft)
      : (isZeroAllowanceExplicit ? 0 : globalAllowance)
    let hasExplicitConfig = false
    let matchingConfigSize: any = null

    if (rawRollSizes.length > 0 && (nominalWidthFt > 0 || widthFt > 0)) {
      const searchNominal = nominalWidthFt || widthFt
      const searchEffective = widthFt || nominalWidthFt
      matchingConfigSize = rawRollSizes.find((sz: any) => {
        const szNominal = Number(sz.nominal_width_ft || sz.width || sz.size || 0)
        const szEffective = Number(sz.width_ft || sz.width || sz.size || 0)
        const szLen = Number(sz.length || sz.length_ft || 0)
        const wMatch = szNominal === searchNominal || szEffective === searchEffective ||
                       szNominal === searchEffective || szEffective === searchNominal ||
                       (Math.abs(szEffective - searchEffective) < 0.1) || (Math.abs(szNominal - searchNominal) < 0.1)
        const lMatch = !szLen || !lengthFt || Math.abs(szLen - lengthFt) <= 5
        return wMatch && lMatch
      })

      if (matchingConfigSize) {
        hasExplicitConfig = true
        const szAllowance = matchingConfigSize.extra_allowance !== undefined
          ? Number(matchingConfigSize.extra_allowance)
          : matchingConfigSize.allowance !== undefined
          ? Number(matchingConfigSize.allowance)
          : matchingConfigSize.allowance_ft !== undefined
          ? Number(matchingConfigSize.allowance_ft)
          : undefined

        matchedConfigAllowance = params.allowance_ft !== undefined
          ? Number(params.allowance_ft)
          : (isZeroAllowanceExplicit ? 0 : (szAllowance !== undefined ? szAllowance : globalAllowance))
        nominalWidthFt = Number(matchingConfigSize.nominal_width_ft || matchingConfigSize.width || matchingConfigSize.size || nominalWidthFt)
        
        if (params.width_ft && Number(params.width_ft) > 0) {
          widthFt = Number(params.width_ft)
        } else if (matchingConfigSize.width_ft !== undefined && Number(matchingConfigSize.width_ft) > 0 && !isZeroAllowanceExplicit) {
          widthFt = Number(matchingConfigSize.width_ft)
        } else if (matchedConfigAllowance > 0 && Math.floor(nominalWidthFt) === nominalWidthFt) {
          widthFt = Math.round((nominalWidthFt + matchedConfigAllowance) * 100) / 100
        } else {
          widthFt = nominalWidthFt
        }
        lengthFt = Number(matchingConfigSize.length || matchingConfigSize.length_ft || lengthFt)
      }
    }

    if (!widthFt) {
      widthFt = Number(
        (isSheet ? material.sheet_width_ft : material.roll_width_ft) ||
        (rawRollSizes.length > 0 ? (rawRollSizes[0].width || rawRollSizes[0].width_ft || rawRollSizes[0].size) : 0) ||
        material.width ||
        (isSheet ? 8 : 4)
      )
      nominalWidthFt = widthFt
    }

    const areaPerUnitSft = isRoll ? Math.round(widthFt * lengthFt * 100) / 100 : (isSheet ? Math.round(widthFt * lengthFt * 100) / 100 : 1)

    // Quantity conversion: If purchase unit is Roll and material stock is kept in SFT, convert quantity
    let stockChangeQty = params.quantity
    let effectiveUnitCost = params.unit_cost
    const matUnit = (material.unit || 'pcs').toLowerCase()
    if (isRoll && (matUnit === 'sft' || matUnit === 'sqft') && (pUnit === 'roll' || pUnit === 'rolls') && areaPerUnitSft > 0) {
      stockChangeQty = Math.round(params.quantity * areaPerUnitSft * 100) / 100
      if (effectiveUnitCost && effectiveUnitCost > 150) {
        effectiveUnitCost = Math.round((effectiveUnitCost / areaPerUnitSft) * 100) / 100
      }
    } else if (isSheet && (pUnit === 'sheet' || pUnit === 'sheets') && (matUnit === 'sft' || matUnit === 'sqft')) {
      const sheetArea = (widthFt && lengthFt) ? widthFt * lengthFt : 32
      stockChangeQty = Math.round(params.quantity * sheetArea * 100) / 100
      if (effectiveUnitCost && effectiveUnitCost > 150 && sheetArea > 0) {
        effectiveUnitCost = Math.round((effectiveUnitCost / sheetArea) * 100) / 100
      }
    }

    const transactionType = params.is_opening_balance ? 'opening_stock' : 'RECEIPT'
    const result = await InventoryRepository.recordStockAdjustment({
      company_id: params.company_id,
      branch_id: params.branch_id || null,
      material_id: params.material_id,
      location_id: params.location_id,
      quantity_change: Math.abs(stockChangeQty),
      transaction_type: transactionType,
      unit_cost: effectiveUnitCost,
      reference_type: params.is_opening_balance ? 'OPENING_BALANCE' : 'STOCK_RECEIPT',
      reference_id: params.challan_number || params.supplier_invoice_number || params.supplier_reference || null,
      notes: params.notes || (params.is_opening_balance ? 'Opening balance recorded' : 'Stock received'),
      performed_by_id: params.performed_by_id || null,
      performed_by_name: params.performed_by_name,
    })

    // Discrete Physical Rolls Creation in Warehouse with Canonical 7-Attribute Metadata
    const incomingUnitCost = params.unit_cost
      ? (isRoll
          ? (pUnit === 'roll' ? params.unit_cost : params.unit_cost * areaPerUnitSft)
          : (isSheet
              ? (pUnit === 'sheet' || pUnit === 'pcs' || pUnit === 'piece' ? params.unit_cost : (params.unit_cost > 150 ? params.unit_cost : params.unit_cost * areaPerUnitSft))
              : params.unit_cost))
      : (material.average_cost ?? material.last_purchase_price ?? 0)

    const incomingAllowance = params.allowance_ft !== undefined
      ? Number(params.allowance_ft)
      : (widthFt > nominalWidthFt) ? Math.round((widthFt - nominalWidthFt) * 100) / 100 : (matchingConfigSize ? Number(matchingConfigSize.allowance_ft ?? matchingConfigSize.allowance ?? 0) : 0)
    const incomingGsm = Number((params as any)?.gsm ?? (material as any)?.gsm ?? (material as any)?.weight_gsm ?? (material as any)?.thickness_mm ?? 0)
    const incomingFinishing = String((params as any)?.finishing ?? (material as any)?.default_finishing ?? (material as any)?.finish ?? 'none')

    const incomingCanonicalAttrs = normalizeInventoryGroupAttributes({
      name: material.name,
      width_ft: widthFt,
      nominal_width_ft: nominalWidthFt,
      length_ft: lengthFt,
      allowance_ft: incomingAllowance,
      purchase_price: incomingUnitCost,
      gsm: incomingGsm,
      finishing: incomingFinishing,
      specification: material.specification,
      material_spec: (material as any)?.material_spec,
    })
    const incomingGroupKey = createInventoryGroupingKey(incomingCanonicalAttrs)

    const rollsCreated: InventoryRollRecord[] = []
    if (isRoll && (pUnit === 'roll' || params.quantity >= 1)) {
      const numRolls = Math.max(1, Math.round(params.quantity))
      const cleanSku = (material.sku || 'MAT').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
      const lot = params.batch_lot_number?.trim() || Date.now().toString().slice(-4)

      for (let i = 1; i <= numRolls; i++) {
        const rollCode = numRolls === 1
          ? `ROL-${cleanSku}-${widthFt}FT-${lot}`
          : `ROL-${cleanSku}-${widthFt}FT-${lot}-${String(i).padStart(2, '0')}`

        try {
          const rollRecord = await InventoryRepository.createPhysicalRoll({
            company_id: params.company_id,
            branch_id: params.branch_id || null,
            material_id: material.id,
            location_id: params.location_id,
            roll_code: rollCode,
            width_ft: incomingCanonicalAttrs.width_ft,
            initial_length_ft: incomingCanonicalAttrs.length_ft,
            current_length_ft: incomingCanonicalAttrs.length_ft,
            unit_cost: incomingCanonicalAttrs.purchase_price,
            allowance_ft: incomingCanonicalAttrs.allowance_ft,
            gsm: incomingCanonicalAttrs.gsm,
            finishing: incomingCanonicalAttrs.finishing,
            supplier_id: params.supplier_id || null,
            batch_lot_number: params.batch_lot_number || null,
            status: 'in_warehouse',
            notes: `Direct Intake: ${params.supplier_name || params.supplier_reference || 'Supplier'} [${params.challan_number ? `Challan ${params.challan_number}` : ''}]`,
          } as any)
          rollRecord.status = 'in_warehouse'
          rollsCreated.push(rollRecord)
        } catch {}
      }
    }

    // 1. Update material.roll_sizes with discrete quantity counts strictly per canonical 7-attribute grouping
    if (isRoll) {
      try {
        const freshMaterial = (await InventoryRepository.getMaterialById(material.id, params.company_id)) || material
        const existingRollSizes: any[] = mergeRollSizesUnion(
          Array.isArray(freshMaterial.roll_sizes) ? freshMaterial.roll_sizes : (freshMaterial.material_config as any)?.roll_sizes,
          Array.isArray(material.roll_sizes) ? material.roll_sizes : (material.material_config as any)?.roll_sizes
        )

        const availWidths: number[] = Array.isArray(freshMaterial.available_widths_ft) && freshMaterial.available_widths_ft.length > 0
          ? freshMaterial.available_widths_ft
          : Array.isArray(material.available_widths_ft) && material.available_widths_ft.length > 0
          ? material.available_widths_ft
          : []
        
        for (const w of availWidths) {
          const numW = Number(w)
          if (numW > 0) {
            const hasW = existingRollSizes.some((s: any) => {
              const szW = Number(s.nominal_width_ft || s.width || s.width_ft || s.size || 0)
              return Math.abs(szW - numW) < 0.05
            })
            if (!hasW) {
              const stdLen = Number(freshMaterial.standard_roll_length_ft || material.standard_roll_length_ft || 164)
              const allow = Number(freshMaterial.production_width_allowance || material.production_width_allowance || 0)
              existingRollSizes.push({
                width: numW,
                nominal_width_ft: numW,
                width_ft: numW + allow,
                length: stdLen,
                length_ft: stdLen,
                allowance_ft: allow,
                extra_allowance: allow,
                quantity: 0,
                roll_count: 0,
                stock: 0,
                stock_qty: 0,
              })
            }
          }
        }

        let matched = false
        const updatedSizes = existingRollSizes.map((sz: any) => {
          const szBaseW = Number(sz.nominal_width_ft || sz.width || sz.width_ft || sz.size || 0)
          const szAllowance = sz.extra_allowance !== undefined
            ? Number(sz.extra_allowance)
            : sz.allowance !== undefined
            ? Number(sz.allowance)
            : sz.allowance_ft !== undefined
            ? Number(sz.allowance_ft)
            : 0
          const szW = sz.width_ft !== undefined && Number(sz.width_ft) > 0
            ? Number(sz.width_ft)
            : ((szAllowance > 0 && Math.floor(szBaseW) === szBaseW) ? Math.round((szBaseW + szAllowance) * 100) / 100 : szBaseW)
          const szL = Number(sz.length || sz.length_ft || 0)
          const szPrice = Number(sz.price ?? sz.unit_cost ?? sz.purchase_price ?? incomingUnitCost ?? 0)
          const szGsm = Number(sz.gsm ?? material.gsm ?? 0)
          const szFin = String(sz.finishing ?? sz.finish ?? material.default_finishing ?? 'none')

          const szCanonicalAttrs = normalizeInventoryGroupAttributes({
            name: material.name,
            width_ft: szW,
            nominal_width_ft: szBaseW,
            length_ft: szL,
            allowance_ft: szAllowance,
            purchase_price: szPrice,
            gsm: szGsm,
            finishing: szFin,
            specification: material.specification,
            material_spec: (material as any)?.material_spec,
          })
          const szKey = createInventoryGroupingKey(szCanonicalAttrs)

          // Strict 7-attribute canonical comparison or exact matching spec match
          const incomingNominalW = incomingCanonicalAttrs.width_ft - incomingCanonicalAttrs.allowance_ft
          const isFullCanonicalMatch = szKey === incomingGroupKey
          const isCompatibleSpecMatch = !matched &&
            (Math.abs(szW - incomingCanonicalAttrs.width_ft) < 0.05 || (szBaseW > 0 && Math.abs(szBaseW - incomingNominalW) < 0.05 && Math.abs(szAllowance - incomingCanonicalAttrs.allowance_ft) < 0.05)) &&
            (!szL || !incomingCanonicalAttrs.length_ft || Math.abs(szL - incomingCanonicalAttrs.length_ft) <= 5) &&
            (szPrice === 0 || szPrice === incomingCanonicalAttrs.purchase_price) &&
            (szGsm === 0 || szGsm === incomingCanonicalAttrs.gsm) &&
            (szFin === 'none' || szFin === incomingCanonicalAttrs.finishing)

          if ((isFullCanonicalMatch || isCompatibleSpecMatch) && !matched) {
            matched = true
            const curQty = Number(sz.quantity ?? sz.stock_qty ?? sz.stock ?? sz.roll_count ?? 0)
            const newQty = curQty + params.quantity
            const effW = szW || incomingCanonicalAttrs.width_ft
            const effL = szL || incomingCanonicalAttrs.length_ft
            return {
              ...sz,
              name: incomingCanonicalAttrs.name,
              width: szBaseW || nominalWidthFt || widthFt,
              nominal_width_ft: szBaseW || nominalWidthFt || widthFt,
              width_ft: effW,
              allowance_ft: szAllowance,
              extra_allowance: szAllowance,
              length: effL,
              length_ft: effL,
              price: incomingCanonicalAttrs.purchase_price > 0 ? incomingCanonicalAttrs.purchase_price : szPrice,
              unit_cost: incomingCanonicalAttrs.purchase_price > 0 ? incomingCanonicalAttrs.purchase_price : szPrice,
              purchase_price: incomingCanonicalAttrs.purchase_price > 0 ? incomingCanonicalAttrs.purchase_price : szPrice,
              gsm: incomingCanonicalAttrs.gsm,
              finishing: incomingCanonicalAttrs.finishing,
              quantity: newQty,
              roll_count: newQty,
              stock_qty: newQty,
              stock: newQty,
              total_sft: Math.round(newQty * effW * effL * 100) / 100,
            }
          }
          return sz
        })

        if (!matched && (existingRollSizes.length > 0 || params.quantity > 0)) {
          updatedSizes.push({
            name: incomingCanonicalAttrs.name,
            width: nominalWidthFt || widthFt,
            nominal_width_ft: nominalWidthFt || widthFt,
            width_ft: incomingCanonicalAttrs.width_ft,
            allowance_ft: incomingCanonicalAttrs.allowance_ft,
            extra_allowance: incomingCanonicalAttrs.allowance_ft,
            length: incomingCanonicalAttrs.length_ft,
            length_ft: incomingCanonicalAttrs.length_ft,
            price: incomingCanonicalAttrs.purchase_price,
            unit_cost: incomingCanonicalAttrs.purchase_price,
            purchase_price: incomingCanonicalAttrs.purchase_price,
            gsm: incomingCanonicalAttrs.gsm,
            finishing: incomingCanonicalAttrs.finishing,
            quantity: params.quantity,
            roll_count: params.quantity,
            stock_qty: params.quantity,
            stock: params.quantity,
            total_sft: Math.round(params.quantity * incomingCanonicalAttrs.width_ft * incomingCanonicalAttrs.length_ft * 100) / 100,
          })
        }

        // If there was previously existing unallocated stock on other configured sizes and no sizes had explicit stock, preserve legacy stock count
        const hadAnyExplicitRollsBefore = existingRollSizes.some((sz: any) => Number(sz.quantity ?? sz.stock_qty ?? sz.stock ?? sz.roll_count ?? 0) > 0)
        const prevStockBeforeIntake = Math.max(0, Number(freshMaterial.current_stock || 0) - stockChangeQty)
        if (!hadAnyExplicitRollsBefore && prevStockBeforeIntake > 0) {
          const zeroSizes = updatedSizes.filter((sz: any) => Number(sz.quantity ?? sz.stock_qty ?? sz.stock ?? sz.roll_count ?? 0) === 0)
          if (zeroSizes.length > 0) {
            const exactPrevMatchIdx = zeroSizes.findIndex((sz: any) => {
              const szW = Number(sz.width_ft || sz.width || sz.nominal_width_ft || 4)
              const szL = Number(sz.length_ft || sz.length || 164)
              const szArea = szW * szL
              return szArea > 0 && Math.abs(prevStockBeforeIntake % szArea) < 0.5
            })
            if (exactPrevMatchIdx !== -1) {
              const targetZero = zeroSizes[exactPrevMatchIdx]
              const szW = Number(targetZero.width_ft || targetZero.width || targetZero.nominal_width_ft || 4)
              const szL = Number(targetZero.length_ft || targetZero.length || 164)
              const szArea = szW * szL
              const prevCount = Math.max(1, Math.round(prevStockBeforeIntake / szArea))
              targetZero.quantity = prevCount
              targetZero.roll_count = prevCount
              targetZero.stock_qty = prevCount
              targetZero.stock = prevCount
              targetZero.total_sft = prevCount * szArea
            }
          }
        }

        await InventoryRepository.updateMaterial(
          material.id,
          {
            roll_sizes: updatedSizes,
            material_config: {
              ...(material.material_config as any),
              roll_sizes: updatedSizes,
            },
          },
          params.company_id
        )

        try {
          PrintERPDataStore.updateItem<any>(
            STORAGE_KEYS.PRODUCTS,
            (p: any) => p && (p.id === material.id || (!!material.sku && p.sku === material.sku)),
            (p: any) => ({
              ...p,
              roll_sizes: updatedSizes,
              material_config: {
                ...(p?.material_config || {}),
                roll_sizes: updatedSizes,
              },
              pricing_formula: {
                ...(p?.pricing_formula || {}),
                roll_sizes: updatedSizes,
              },
            }),
            params.company_id
          )
        } catch {}
      } catch {}
    }

    // 2. Update material.sheet_sizes with discrete quantity counts for Rigid Sheets
    if (isSheet) {
      try {
        const freshMaterial = (await InventoryRepository.getMaterialById(material.id, params.company_id)) || material
        const rawSheetSizes: any[] = (Array.isArray(freshMaterial.sheet_sizes) && freshMaterial.sheet_sizes.length > 0)
          ? [...freshMaterial.sheet_sizes]
          : (Array.isArray(freshMaterial.available_sheet_sizes) && freshMaterial.available_sheet_sizes.length > 0)
          ? [...freshMaterial.available_sheet_sizes]
          : ((freshMaterial.material_config as any)?.available_sheet_sizes && Array.isArray((freshMaterial.material_config as any).available_sheet_sizes) && (freshMaterial.material_config as any).available_sheet_sizes.length > 0)
          ? [...(freshMaterial.material_config as any).available_sheet_sizes]
          : ((freshMaterial.material_config as any)?.sheet_sizes && Array.isArray((freshMaterial.material_config as any).sheet_sizes) && (freshMaterial.material_config as any).sheet_sizes.length > 0)
          ? [...(freshMaterial.material_config as any).sheet_sizes]
          : []

        const sheetW = nominalWidthFt || Number(material.sheet_width_ft || material.width || 8)
        const sheetL = lengthFt || Number(material.sheet_length_ft || material.length || 4)
        const sheetArea = sheetW * sheetL > 0 ? sheetW * sheetL : 32

        let matched = false
        const updatedSizes = rawSheetSizes.map((sz: any) => {
          let szW = sheetW
          let szL = sheetL
          let szLabel = typeof sz === 'string' ? sz : sz.label || `${sheetW}ft × ${sheetL}ft`
          let szPrice = typeof sz === 'object' && sz ? Number(sz.purchase_price ?? sz.unit_cost ?? sz.default_supplier_price ?? sz.price ?? incomingUnitCost) : incomingUnitCost
          let szQty = typeof sz === 'object' && sz ? Number(sz.quantity ?? sz.stock_qty ?? sz.stock ?? sz.sheet_count ?? sz.count ?? 0) : 0
          let szGsm = typeof sz === 'object' && sz ? Number(sz.gsm ?? sz.thickness_mm ?? incomingGsm) : incomingGsm
          let szFin = typeof sz === 'object' && sz ? String(sz.finishing ?? sz.finish ?? incomingFinishing) : incomingFinishing

          if (typeof sz === 'string') {
            const match = sz.match(/(\d+(?:\.\d+)?)\s*(?:ft|')?\s*[xX*×]\s*(\d+(?:\.\d+)?)/)
            if (match) {
              szW = Number(match[1])
              szL = Number(match[2])
            }
          } else if (typeof sz === 'object' && sz !== null) {
            szW = Number(sz.width || sz.width_ft || sheetW)
            szL = Number(sz.length || sz.length_ft || sheetL)
          }

          const szCanonical = normalizeInventoryGroupAttributes({
            name: freshMaterial.name,
            width_ft: szW,
            length_ft: szL,
            allowance_ft: 0,
            purchase_price: szPrice,
            gsm: szGsm,
            finishing: szFin,
            specification: freshMaterial.specification,
            material_spec: (freshMaterial as any)?.material_spec,
          })
          const szKey = createInventoryGroupingKey(szCanonical)

          const isExactMatch = szKey === incomingGroupKey || (Math.abs(szW - sheetW) < 0.1 && Math.abs(szL - sheetL) < 0.1)

          if (isExactMatch && !matched) {
            matched = true
            const newQty = szQty + params.quantity
            return {
              ...(typeof sz === 'object' ? sz : {}),
              id: typeof sz === 'object' && sz.id ? sz.id : `sz-${sheetW}x${sheetL}`,
              label: `${sheetW}ft × ${sheetL}ft`,
              width: sheetW,
              width_ft: sheetW,
              length: sheetL,
              length_ft: sheetL,
              quantity: newQty,
              stock: newQty,
              stock_qty: newQty,
              sheet_count: newQty,
              unit_cost: incomingUnitCost,
              purchase_price: incomingUnitCost,
              price: incomingUnitCost,
              default_supplier_price: incomingUnitCost,
              gsm: incomingGsm,
              finishing: incomingFinishing,
              total_sft: newQty * sheetArea,
            }
          }

          return typeof sz === 'object' ? sz : {
            id: `sz-${szW}x${szL}`,
            label: szLabel,
            width: szW,
            width_ft: szW,
            length: szL,
            length_ft: szL,
            quantity: szQty,
            stock: szQty,
            stock_qty: szQty,
            unit_cost: szPrice,
            purchase_price: szPrice,
          }
        })

        if (!matched) {
          updatedSizes.push({
            id: `sz-${sheetW}x${sheetL}`,
            label: `${sheetW}ft × ${sheetL}ft`,
            width: sheetW,
            width_ft: sheetW,
            length: sheetL,
            length_ft: sheetL,
            quantity: params.quantity,
            stock: params.quantity,
            stock_qty: params.quantity,
            sheet_count: params.quantity,
            unit_cost: incomingUnitCost,
            purchase_price: incomingUnitCost,
            price: incomingUnitCost,
            default_supplier_price: incomingUnitCost,
            gsm: incomingGsm,
            finishing: incomingFinishing,
            total_sft: params.quantity * sheetArea,
          })
        }

        await InventoryRepository.updateMaterial(
          freshMaterial.id,
          {
            sheet_sizes: updatedSizes,
            available_sheet_sizes: updatedSizes,
            material_config: {
              ...(freshMaterial.material_config as any),
              sheet_sizes: updatedSizes,
              available_sheet_sizes: updatedSizes,
            },
          },
          params.company_id
        )

        try {
          PrintERPDataStore.updateItem<any>(
            STORAGE_KEYS.PRODUCTS,
            (p: any) => p && (p.id === freshMaterial.id || (!!freshMaterial.sku && p.sku === freshMaterial.sku)),
            {
              available_sheet_sizes: updatedSizes,
              sheet_sizes: updatedSizes,
            },
            params.company_id
          )
        } catch {}
      } catch {}
    }

    // 3. Update material.variants for Liquids, Hardware, Packs, and Ready Products
    if (isFluid || (!isRoll && !isSheet)) {
      try {
        const freshMaterial = (await InventoryRepository.getMaterialById(material.id, params.company_id)) || material
        const existingVariants: any[] = Array.isArray(freshMaterial.variants) && freshMaterial.variants.length > 0
          ? [...freshMaterial.variants]
          : Array.isArray((freshMaterial.material_config as any)?.variants) && (freshMaterial.material_config as any).variants.length > 0
          ? [...(freshMaterial.material_config as any).variants]
          : []

        const incomingVariantId = params.variant_id
        const incomingVariantName = params.variant_name || params.size_label || params.notes
        const targetCost = incomingUnitCost

        if (existingVariants.length > 0) {
          let matched = false
          const updatedVariants = existingVariants.map((v: any) => {
            const vId = v.id || v.variant_id
            const vName = v.variant_name || v.name || v.color || v.size_spec || ''
            const vQty = Number(v.quantity ?? v.stock ?? v.stock_qty ?? v.count ?? 0)

            const isMatch =
              (incomingVariantId && (vId === incomingVariantId || `variant-${vId}` === incomingVariantId)) ||
              (incomingVariantName && (
                vName.toLowerCase() === incomingVariantName.toLowerCase() ||
                incomingVariantName.toLowerCase().includes(vName.toLowerCase()) ||
                vName.toLowerCase().includes(incomingVariantName.toLowerCase())
              )) ||
              (!matched && existingVariants.length === 1 && !incomingVariantId)

            if (isMatch && !matched) {
              matched = true
              const newQty = vQty + params.quantity
              return {
                ...v,
                quantity: newQty,
                stock: newQty,
                stock_qty: newQty,
                count: newQty,
                unit_cost: targetCost,
                purchase_price: targetCost,
                price: targetCost,
              }
            }
            return v
          })

          if (!matched && params.variant_name) {
            updatedVariants.push({
              id: `var-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              variant_name: params.variant_name,
              quantity: params.quantity,
              stock: params.quantity,
              stock_qty: params.quantity,
              unit_cost: targetCost,
              purchase_price: targetCost,
            })
          }

          await InventoryRepository.updateMaterial(
            freshMaterial.id,
            {
              variants: updatedVariants,
              material_config: {
                ...(freshMaterial.material_config as any),
                variants: updatedVariants,
              },
            },
            params.company_id
          )

          try {
            PrintERPDataStore.updateItem<any>(
              STORAGE_KEYS.PRODUCTS,
              (p: any) => p && (p.id === freshMaterial.id || (!!freshMaterial.sku && p.sku === freshMaterial.sku)),
              {
                variants: updatedVariants,
              },
              params.company_id
            )
          } catch {}
        }
      } catch {}
    }

    // Record Inward Price Intelligence
    const unitPrice = Number(params.unit_cost || material.last_purchase_price || material.average_cost || 0)
    const normalizedEconomics = PriceIntelligenceEngine.calculateNormalizedUnitEconomics({
      physical_form: physicalForm,
      width_ft: widthFt,
      length_ft: lengthFt,
      standard_area_sft: areaPerUnitSft,
      unit_purchase_price: unitPrice,
      purchase_unit: pUnit,
    })

    try {
      await InventoryRepository.recordPriceIntelligence({
        company_id: params.company_id,
        branch_id: params.branch_id || null,
        material_id: material.id,
        material_name: material.name,
        material_sku: material.sku,
        physical_form: physicalForm,
        size_label: params.size_label || `${widthFt} ft × ${lengthFt === 164 ? '50 m' : `${lengthFt} ft`}`,
        width_ft: widthFt,
        length_ft: lengthFt,
        area_sft: areaPerUnitSft,
        purchase_unit: pUnit,
        supplier_id: params.supplier_id || null,
        supplier_name: params.supplier_name || params.supplier_reference || 'Spot Supplier',
        unit_purchase_price: unitPrice,
        quantity_received: params.quantity,
        total_amount: Math.round(params.quantity * unitPrice),
        normalized_area_sft: areaPerUnitSft,
        normalized_price_per_sft: normalizedEconomics.normalized_cost_per_sft,
        normalized_price_per_linear_ft: normalizedEconomics.normalized_cost_per_linear_ft,
        normalized_price_per_unit: normalizedEconomics.normalized_cost_per_unit,
        challan_number: params.challan_number || null,
        supplier_invoice_number: params.supplier_invoice_number || null,
        batch_lot_number: params.batch_lot_number || null,
        location_id: params.location_id,
        purchase_date: params.purchase_date || new Date().toISOString().split('T')[0],
      })
    } catch {}

    await AuditRepository.logEvent({
      companyId: params.company_id,
      userEmail: params.actor_email || params.performed_by_name,
      action: params.is_opening_balance ? 'inventory.opening_stock' : 'inventory.receive',
      entity: 'inventory',
      entityId: params.material_id,
      newValue: {
        sku: result.material.sku,
        quantity: params.quantity,
        location_id: params.location_id,
        new_stock: result.material.current_stock,
        rolls_created: rollsCreated.length,
      },
      description: `${params.is_opening_balance ? 'Recorded opening stock' : 'Received stock'} for ${result.material.name} (${result.material.sku}): +${params.quantity} ${pUnit} (${stockChangeQty} ${result.material.unit})`,
    })

    return { ...result, rollsCreated }
  }

  /**
   * Generates a dynamic Price Intelligence Summary for a material and configured size
   */
  static async getPriceIntelligence(
    materialId: string,
    companyId: string,
    sizeLabel?: string,
    currentPrice?: number,
    supplierId?: string | null
  ): Promise<PriceIntelligenceSummary | null> {
    if (!materialId || !companyId) return null
    const material = await InventoryRepository.getMaterialById(materialId, companyId)
    if (!material) return null

    const history = await InventoryRepository.getPriceIntelligenceHistory(companyId, materialId)
    return PriceIntelligenceEngine.buildPriceIntelligenceSummary({
      material,
      size_label: sizeLabel,
      current_unit_price: currentPrice || Number(material.last_purchase_price || material.average_cost || 0),
      current_supplier_id: supplierId,
      history,
    })
  }

  // ==========================================
  // TASK MATERIAL REQUIREMENTS
  // ==========================================

  static async getTaskRequirements(taskId: string, companyId: string): Promise<TaskMaterialRequirementRecord[]> {
    if (!taskId || !companyId) return []
    return await InventoryRepository.getTaskRequirements(taskId, companyId)
  }

  static async addTaskRequirement(requirement: {
    company_id: string
    production_task_id: string
    material_id: string
    estimated_quantity: number
    unit: string
    notes?: string | null
  }): Promise<TaskMaterialRequirementRecord> {
    return await InventoryRepository.addTaskRequirement(requirement)
  }

  static async removeTaskRequirement(id: string, companyId: string): Promise<boolean> {
    return await InventoryRepository.removeTaskRequirement(id, companyId)
  }

  // ==========================================
  // MATERIAL REQUESTS & APPROVALS
  // ==========================================

  static async getRequests(companyId: string, options?: {
    taskId?: string
    status?: string
    priority?: string
  }): Promise<MaterialRequestRecord[]> {
    if (!companyId) return []
    return await InventoryRepository.getRequests(companyId, options)
  }

  static async getRequestById(id: string, companyId: string): Promise<MaterialRequestRecord | null> {
    if (!id || !companyId) return null
    return await InventoryRepository.getRequestById(id, companyId)
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
    actor_email?: string
  }): Promise<MaterialRequestRecord> {
    const created = await InventoryRepository.createRequest(params)

    await AuditRepository.logEvent({
      companyId: params.company_id,
      userEmail: params.actor_email || params.requested_by_name,
      action: 'inventory.request_created',
      entity: 'material_request',
      entityId: created.id,
      newValue: { request_number: created.request_number, items_count: params.items.length },
      description: `Created material request ${created.request_number} by ${params.requested_by_name}`,
    })

    return created
  }

  static async approveRequest(
    id: string,
    companyId: string,
    approver: { id?: string | null; name: string; email?: string }
  ): Promise<MaterialRequestRecord> {
    const req = await InventoryRepository.getRequestById(id, companyId)
    if (!req) {
      throw new Error(`Material request ${id} not found.`)
    }
    if (req.status !== 'requested' && req.status !== 'draft') {
      throw new Error(`Cannot approve material request in '${req.status}' state.`)
    }

    const updated = await InventoryRepository.updateRequestStatus(id, 'approved', companyId, {
      approved_by_id: approver.id,
      approved_by_name: approver.name,
    })

    await AuditRepository.logEvent({
      companyId,
      userEmail: approver.email || approver.name,
      action: 'inventory.request_approved',
      entity: 'material_request',
      entityId: id,
      description: `Approved material request ${req.request_number} by ${approver.name}`,
    })

    return updated
  }

  static async rejectRequest(
    id: string,
    companyId: string,
    rejector: { id?: string | null; name: string; reason: string; email?: string }
  ): Promise<MaterialRequestRecord> {
    const req = await InventoryRepository.getRequestById(id, companyId)
    if (!req) {
      throw new Error(`Material request ${id} not found.`)
    }

    const updated = await InventoryRepository.updateRequestStatus(id, 'rejected', companyId, {
      approved_by_id: rejector.id,
      approved_by_name: rejector.name,
      rejection_reason: rejector.reason,
    })

    await AuditRepository.logEvent({
      companyId,
      userEmail: rejector.email || rejector.name,
      action: 'inventory.request_rejected',
      entity: 'material_request',
      entityId: id,
      description: `Rejected material request ${req.request_number}. Reason: ${rejector.reason}`,
    })

    return updated
  }

  // ==========================================
  // MATERIAL ISSUES
  // ==========================================

  static async getIssues(companyId: string, options?: {
    taskId?: string
    requestId?: string
  }): Promise<MaterialIssueRecord[]> {
    if (!companyId) return []
    return await InventoryRepository.getIssues(companyId, options)
  }

  static async getIssueById(id: string, companyId: string): Promise<MaterialIssueRecord | null> {
    if (!id || !companyId) return null
    return await InventoryRepository.getIssueById(id, companyId)
  }

  static async issueMaterial(params: {
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
    actor_email?: string
  }): Promise<MaterialIssueRecord> {
    if (!params.items || params.items.length === 0) {
      throw new Error('Issue rejected: At least one item is required to issue material.')
    }

    const created = await InventoryRepository.createIssue(params)

    await AuditRepository.logEvent({
      companyId: params.company_id,
      userEmail: params.actor_email || params.issued_by_name,
      action: 'inventory.material_issued',
      entity: 'material_issue',
      entityId: created.id,
      newValue: {
        issue_number: created.issue_number,
        source_location: params.source_location_id,
        items_count: params.items.length,
      },
      description: `Issued materials under ${created.issue_number} to Task ${params.production_task_id || 'Direct'}`,
    })

    return created
  }

  // ==========================================
  // CONSUMPTION & SCRAP SIGN-OFF
  // ==========================================

  /**
   * Records production consumption sign-off:
   * Consumed stock, scrap/wastage with reason, reusable remnants ($W \times L$), and unused return to store
   */
  static async logProductionConsumption(params: {
    company_id: string
    branch_id?: string | null
    production_task_id: string
    material_id: string
    consumed_quantity: number
    unit: string
    location_id?: string | null
    returned_quantity?: number
    return_location_id?: string | null
    wastage_quantity?: number
    wastage_reason?: string | null
    remnants?: Array<{
      width: number
      length: number
      dimension_unit?: string
      quantity?: number
      location_id: string
      condition?: 'excellent' | 'usable' | 'minor_defect'
      notes?: string | null
    }>
    actor_id?: string | null
    actor_name: string
    actor_email?: string
  }): Promise<{ success: boolean; remnantsCreated: number }> {
    const material = await InventoryRepository.getMaterialById(params.material_id, params.company_id)
    if (!material) {
      throw new Error(`Material ${params.material_id} not found.`)
    }

    // 1. Log Consumption in Stock Ledger
    if (params.consumed_quantity > 0) {
      await InventoryRepository.recordStockAdjustment({
        company_id: params.company_id,
        branch_id: params.branch_id || null,
        material_id: params.material_id,
        location_id: params.location_id || null,
        quantity_change: 0, // Already deducted at issue stage; logs consumption audit
        transaction_type: 'CONSUMPTION',
        reference_type: 'PRODUCTION_CONSUMPTION',
        production_task_id: params.production_task_id,
        notes: `Production Task ${params.production_task_id} consumed ${params.consumed_quantity} ${params.unit}`,
        performed_by_id: params.actor_id,
        performed_by_name: params.actor_name,
      })
    }

    // 2. Unused Material Return to Store Location
    if (params.returned_quantity && params.returned_quantity > 0 && params.return_location_id) {
      await InventoryRepository.recordStockAdjustment({
        company_id: params.company_id,
        branch_id: params.branch_id || null,
        material_id: params.material_id,
        location_id: params.return_location_id,
        quantity_change: Math.abs(params.returned_quantity),
        transaction_type: 'RETURN',
        reference_type: 'PRODUCTION_RETURN',
        production_task_id: params.production_task_id,
        notes: `Unused material returned from Task ${params.production_task_id}: +${params.returned_quantity} ${params.unit}`,
        performed_by_id: params.actor_id,
        performed_by_name: params.actor_name,
      })
    }

    // 3. Scrap / Wastage Logging
    if (params.wastage_quantity && params.wastage_quantity > 0) {
      await InventoryRepository.recordStockAdjustment({
        company_id: params.company_id,
        branch_id: params.branch_id || null,
        material_id: params.material_id,
        location_id: params.location_id || null,
        quantity_change: 0,
        transaction_type: 'WASTAGE',
        reference_type: 'PRODUCTION_WASTAGE',
        production_task_id: params.production_task_id,
        notes: `Production Scrap logged: ${params.wastage_quantity} ${params.unit}. Reason: ${params.wastage_reason || 'Cutting/Print Loss'}`,
        performed_by_id: params.actor_id,
        performed_by_name: params.actor_name,
      })
    }

    // 4. Create Reusable Remnants
    let remnantsCount = 0
    if (params.remnants && params.remnants.length > 0) {
      for (const rem of params.remnants) {
        await InventoryRepository.createRemnant({
          company_id: params.company_id,
          branch_id: params.branch_id || null,
          parent_material_id: params.material_id,
          production_task_id: params.production_task_id,
          location_id: rem.location_id,
          width: rem.width,
          length: rem.length,
          dimension_unit: rem.dimension_unit || 'ft',
          quantity: rem.quantity || 1,
          condition: rem.condition || 'usable',
          notes: rem.notes || null,
          created_by_name: params.actor_name,
        })
        remnantsCount++
      }
    }

    await AuditRepository.logEvent({
      companyId: params.company_id,
      userEmail: params.actor_email || params.actor_name,
      action: 'inventory.consumption_logged',
      entity: 'production_task',
      entityId: params.production_task_id,
      newValue: {
        material_id: params.material_id,
        consumed: params.consumed_quantity,
        returned: params.returned_quantity || 0,
        wastage: params.wastage_quantity || 0,
        remnants_created: remnantsCount,
      },
      description: `Logged consumption for ${material.name} on Task ${params.production_task_id}`,
    })

    return { success: true, remnantsCreated: remnantsCount }
  }

  // ==========================================
  // PRINT FLOOR CONSUMPTION UNIT
  // ==========================================

  static async getFloorConsumptions(
    companyId: string,
    options?: { machineId?: string; status?: string; search?: string }
  ): Promise<FloorConsumptionRecord[]> {
    if (!companyId) return []
    return await InventoryRepository.getFloorConsumptions(companyId, options)
  }

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
    actor_email?: string
  }): Promise<{ success: boolean; floorRecord: FloorConsumptionRecord; remnantsCreated?: number }> {
    const res = await InventoryRepository.logFloorConsumption(params)

    await AuditRepository.logEvent({
      companyId: params.company_id,
      userEmail: params.actor_email || params.operator_name || 'operator',
      action: 'inventory.floor_consumption_logged',
      entity: 'floor_consumption',
      entityId: res.floorRecord.id,
      newValue: {
        material_id: params.material_id,
        consumed: params.consumed_quantity,
        wastage: params.wastage_quantity || 0,
        returned: params.returned_quantity || 0,
        machine: params.machine_name,
      },
      description: `Logged floor consumption for ${res.floorRecord.material_name}: Consumed ${params.consumed_quantity} ${params.unit}, Scrap: ${params.wastage_quantity || 0} ${params.unit}`,
    })

    return res
  }

  static async returnFloorStockToStore(params: {
    company_id: string
    issue_id: string
    material_id: string
    quantity: number
    return_location_id: string
    operator_name?: string
    notes?: string | null
    actor_email?: string
  }): Promise<{ success: boolean; remainingFloorBalance: number }> {
    const res = await InventoryRepository.returnFloorStockToStore(params)

    await AuditRepository.logEvent({
      companyId: params.company_id,
      userEmail: params.actor_email || params.operator_name || 'store_keeper',
      action: 'inventory.floor_stock_returned',
      entity: 'material_issue',
      entityId: params.issue_id,
      newValue: {
        material_id: params.material_id,
        returned_quantity: params.quantity,
        remaining_floor_balance: res.remainingFloorBalance,
      },
      description: `Returned ${params.quantity} units of floor stock to store location`,
    })

    return res
  }

  // ==========================================
  // REMNANTS & TRANSFERS & ADJUSTMENTS
  // ==========================================

  static async getRemnants(companyId: string, options?: {
    materialId?: string
    status?: string
    locationId?: string
  }): Promise<InventoryRemnantRecord[]> {
    if (!companyId) return []
    return await InventoryRepository.getRemnants(companyId, options)
  }

  static async getRemnantById(id: string, companyId: string): Promise<InventoryRemnantRecord | null> {
    if (!id || !companyId) return null
    return await InventoryRepository.getRemnantById(id, companyId)
  }

  static async createRemnant(params: {
    company_id: string
    branch_id?: string | null
    parent_material_id: string
    production_task_id?: string | null
    location_id: string
    width: number
    length: number
    dimension_unit?: string
    quantity?: number
    unit?: string
    condition?: 'excellent' | 'usable' | 'minor_defect'
    notes?: string | null
    created_by_name: string
  }): Promise<InventoryRemnantRecord> {
    return await InventoryRepository.createRemnant(params)
  }

  static async updateRemnantStatus(
    id: string,
    status: 'available' | 'reserved' | 'consumed' | 'scrapped',
    companyId: string
  ): Promise<InventoryRemnantRecord> {
    return await InventoryRepository.updateRemnantStatus(id, status, companyId)
  }

  static async getTransfers(companyId: string): Promise<InventoryTransferRecord[]> {
    if (!companyId) return []
    return await InventoryRepository.getTransfers(companyId)
  }

  static async transferStock(params: {
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
    actor_email?: string
  }): Promise<InventoryTransferRecord> {
    const created = await InventoryRepository.createTransfer(params)

    await AuditRepository.logEvent({
      companyId: params.company_id,
      userEmail: params.actor_email || params.transferred_by_name,
      action: 'inventory.stock_transfer',
      entity: 'inventory_transfer',
      entityId: created.id,
      newValue: {
        transfer_number: created.transfer_number,
        quantity: params.quantity,
        source: params.source_location_id,
        destination: params.destination_location_id,
      },
      description: `Transferred ${params.quantity} ${params.unit} via ${created.transfer_number}`,
    })

    return created
  }

  static async getAdjustments(companyId: string): Promise<InventoryAdjustmentRecord[]> {
    if (!companyId) return []
    return await InventoryRepository.getAdjustments(companyId)
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
    actor_email?: string
  }): Promise<InventoryAdjustmentRecord> {
    const created = await InventoryRepository.createAdjustment(params)

    await AuditRepository.logEvent({
      companyId: params.company_id,
      userEmail: params.actor_email || params.authorized_by_name,
      action: 'inventory.stock_adjustment',
      entity: 'inventory_adjustment',
      entityId: created.id,
      newValue: {
        adjustment_number: created.adjustment_number,
        previous_quantity: created.previous_quantity,
        new_quantity: created.new_quantity,
        variance: created.variance_quantity,
        reason: params.reason,
      },
      description: `Stock adjusted via ${created.adjustment_number}: ${created.variance_quantity > 0 ? '+' : ''}${created.variance_quantity} ${created.unit}. Reason: ${params.reason}`,
    })

    return created
  }

  // ==========================================
  // STOCK LEDGER & KPIS
  // ==========================================

  static async getStockLedger(companyId: string, materialId?: string): Promise<StockLedgerRecord[]> {
    if (!companyId) return []
    return await InventoryRepository.getStockLedger(companyId, materialId)
  }

  static async getInventoryRolls(
    companyId: string,
    options?: { materialId?: string; status?: string; locationId?: string },
    preloadedMaterials?: MaterialRecord[]
  ): Promise<InventoryRollRecord[]> {
    if (!companyId) return []
    return await InventoryRepository.getInventoryRolls(companyId, options, preloadedMaterials)
  }

  static async mountRollToMachine(params: {
    company_id: string
    roll_id: string
    machine_id: string
    machine_name: string
    operator_name?: string
  }): Promise<InventoryRollRecord> {
    return await InventoryRepository.mountRollToMachine(params)
  }

  static async unmountRollFromMachine(params: {
    company_id: string
    roll_id: string
    machine_id?: string
  }): Promise<InventoryRollRecord> {
    return await InventoryRepository.unmountRollFromMachine(params)
  }

  static async createPhysicalRoll(params: {
    company_id: string
    branch_id?: string | null
    material_id: string
    roll_code?: string
    roll_tag?: string
    width_ft: number
    initial_length_ft: number
    unit_cost?: number
    location_name?: string
    notes?: string | null
  }): Promise<InventoryRollRecord> {
    const created = await InventoryRepository.createPhysicalRoll(params)
    await AuditRepository.logEvent({
      companyId: params.company_id,
      userEmail: 'inventory',
      action: 'inventory.roll_created',
      entity: 'inventory_roll',
      entityId: created.id,
      newValue: { roll_code: created.roll_code, width_ft: created.width_ft, initial_length_ft: created.initial_length_ft },
      description: `Created physical roll ${created.roll_code} (${created.width_ft}ft × ${created.initial_length_ft}ft)`,
    })
    return created
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
    actor_email?: string
  }): Promise<{ roll: InventoryRollRecord; remnant?: InventoryRemnantRecord | null; totalDeductedFt: number }> {
    const result = await InventoryRepository.consumeFromPhysicalRoll(params)

    await AuditRepository.logEvent({
      companyId: params.company_id,
      userEmail: params.actor_email || params.operator_name || 'operator',
      action: 'inventory.roll_consumed',
      entity: 'inventory_roll',
      entityId: params.roll_id,
      newValue: {
        total_deducted_ft: result.totalDeductedFt,
        good_feed_ft: params.linear_length_consumed_ft,
        bleed_ft: params.bleed_allowance_ft || 0,
        wastage_ft: params.wastage_length_ft || 0,
        wastage_reason: params.wastage_reason || null,
        remaining_length_ft: result.roll.current_length_ft,
        status: result.roll.status,
      },
      description: `Consumed ${result.totalDeductedFt}ft from Roll ${result.roll.roll_code || result.roll.roll_tag}. Remaining: ${result.roll.current_length_ft}ft (Task: ${params.production_task_id || 'Direct'})`,
    })

    return result
  }

  static async issueMasterRollsBatch(params: IssueMasterRollParams): Promise<IssueMasterRollResult> {
    const result = await InventoryRepository.issueMasterRollsBatch(params)

    await AuditRepository.logEvent({
      companyId: params.company_id || '',
      userEmail: params.actor_email || params.operator_name || 'operator',
      action: 'inventory.roll_issued_floor',
      entity: 'inventory_roll',
      entityId: result.roll.id,
      newValue: {
        roll_tag: result.roll.roll_tag,
        width_ft: result.roll.width_ft,
        initial_length_ft: result.roll.initial_length_ft,
        quantity_issued: result.quantity_issued,
        total_area_sft: result.total_area_sft,
        total_valuation: result.total_valuation,
        machine_name: params.machine_name || null,
        location_id: params.location_id || null,
      },
      description: `Requisitioned and issued ${result.quantity_issued} Roll(s) (${result.roll.width_ft}ft × ${result.roll.initial_length_ft}ft, total ${result.total_area_sft} SFT) to Print Floor`,
    })

    return result
  }

  static async requestAndIssueNewRollToFloor(params: IssueMasterRollParams): Promise<InventoryRollRecord> {
    const res = await this.issueMasterRollsBatch(params)
    return res.roll
  }


  static async recordStockAdjustment(params: {
    company_id: string
    branch_id?: string | null
    material_id: string
    location_id?: string | null
    quantity_change: number
    reason?: string
    notes?: string
    performed_by_name: string
    entry_type?: any
    cost_per_unit?: number
    reference_id?: string
  }): Promise<StockLedgerRecord> {
    const result = await InventoryRepository.recordStockAdjustment({
      company_id: params.company_id,
      branch_id: params.branch_id || null,
      material_id: params.material_id,
      location_id: params.location_id || null,
      quantity_change: params.quantity_change,
      transaction_type: params.quantity_change >= 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
      unit_cost: params.cost_per_unit,
      reference_id: params.reference_id,
      notes: params.notes || params.reason,
      performed_by_name: params.performed_by_name,
    })
    return result.ledgerEntry
  }

  static async getInventorySummary(
    companyId: string,
    preloadedMaterials?: MaterialRecord[],
    preloadedProducts?: any[]
  ): Promise<InventorySummaryStats> {
    if (!companyId) {
      return {
        totalMaterials: 0,
        totalAvailableStockValue: 0,
        lowStockCount: 0,
        pendingRequestsCount: 0,
        totalRemnantsCount: 0,
        totalWastageRecordsCount: 0,
      }
    }

    const [materials, requests, remnants, ledger, readyProducts] = await Promise.all([
      preloadedMaterials && preloadedMaterials.length > 0
        ? Promise.resolve(preloadedMaterials)
        : InventoryRepository.getMaterials(companyId).catch(() => []),
      InventoryRepository.getRequests(companyId, { status: 'requested' }).catch(() => []),
      InventoryRepository.getRemnants(companyId, { status: 'available' }).catch(() => []),
      InventoryRepository.getStockLedger(companyId).catch(() => []),
      preloadedProducts && preloadedProducts.length > 0
        ? Promise.resolve(preloadedProducts)
        : ProductRepository.getProducts(companyId, false, 'all', undefined, 'product').catch(() => []),
    ])

    const lowStockCount = materials.filter((m) => {
      const threshold = Number(m.reorder_level || m.min_stock_level || 0)
      return threshold > 0 && Number(m.current_stock || 0) <= threshold
    }).length

    const materialsValue = materials.reduce((sum, m) => {
      const breakdown = getMaterialWarehouseStockBreakdown(m)
      return sum + (breakdown.total_valuation || 0)
    }, 0)

    const matIds = new Set(materials.map((m) => m.id))
    const matSkus = new Set(materials.map((m) => (m.sku || '').toLowerCase()).filter(Boolean))
    const productsValue = readyProducts.reduce((sum, p) => {
      if (matIds.has(p.id)) return sum
      if (p.sku && matSkus.has(p.sku.toLowerCase())) return sum
      if (isMaterialProduct(p) || p.entity_type === 'material' || p.product_type === 'material') return sum
      const rawFormula = (p as any).pricing_formula
      const formula =
        typeof rawFormula === 'object' && rawFormula !== null
          ? rawFormula
          : typeof rawFormula === 'string' && rawFormula.trim()
          ? (() => {
              try {
                return JSON.parse(rawFormula)
              } catch {
                return {}
              }
            })()
          : {}

      const candidateStocks = [
        Number((p as any).current_stock),
        Number((p as any).stock),
        Number((p as any).opening_stock),
        Number(formula.current_stock),
        Number(formula.stock),
        Number(formula.opening_stock),
        Number((p as any).material_config?.opening_stock),
        Number((p as any).material_config?.current_stock),
      ]
      const positiveStock = candidateStocks.find((v) => !isNaN(v) && v > 0)
      const stock = positiveStock !== undefined ? positiveStock : (Number((p as any).current_stock) || Number((p as any).stock) || 0)
      const cost = Number(p.base_cost || p.purchase_price || (p as any).cost_per_unit || formula.base_cost || formula.purchase_price || (p as any).material_config?.purchase_price || 0)
      return sum + (stock > 0 ? stock * cost : 0)
    }, 0)

    const totalValue = materialsValue + productsValue

    const wastageCount = ledger.filter((l) => l.transaction_type === 'WASTAGE' || l.transaction_type === 'wastage').length

    return {
      totalMaterials: materials.length + readyProducts.length,
      totalAvailableStockValue: totalValue,
      lowStockCount,
      pendingRequestsCount: requests.length,
      totalRemnantsCount: remnants.length,
      totalWastageRecordsCount: wastageCount,
    }
  }
}
