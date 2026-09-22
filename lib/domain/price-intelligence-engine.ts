import {
  MasterPhysicalClassification,
  ConfiguredMaterialSize,
  PriceIntelligenceRecord,
  PriceIntelligenceSummary,
  SupplierPriceComparisonItem,
} from '../../types/price-intelligence.types'

export class PriceIntelligenceEngine {
  /**
   * Automatically detects the physical form / classification of a registered material
   */
  static detectMaterialPhysicalForm(material: any): MasterPhysicalClassification {
    if (!material) return 'general'

    const cat = (material.category || '').toLowerCase()
    const name = (material.name || '').toLowerCase()
    const unit = (material.purchase_unit || material.unit || '').toLowerCase()
    const combined = `${cat} ${name} ${unit}`

    // 1. Explicit Flags & Category Checks
    if (
      material.is_roll === true ||
      cat === 'roll_media' ||
      cat === 'flex' ||
      cat === 'vinyl' ||
      cat === 'sticker_paper' ||
      cat === 'lamination_film' ||
      cat === 'banner' ||
      cat === 'fabric' ||
      unit === 'roll' ||
      (Array.isArray(material.available_widths_ft) && material.available_widths_ft.length > 0) ||
      (Array.isArray(material.roll_sizes) && material.roll_sizes.length > 0)
    ) {
      return 'roll'
    }

    if (
      cat === 'rigid_sheet' ||
      cat === 'pvc' ||
      cat === 'acrylic' ||
      cat === 'acp' ||
      cat === 'foam_board' ||
      cat === 'paper' ||
      cat === 'wood' ||
      unit === 'sheet' ||
      (Array.isArray(material.available_sheet_sizes) && material.available_sheet_sizes.length > 0) ||
      (Array.isArray(material.sheet_sizes) && material.sheet_sizes.length > 0)
    ) {
      return 'sheet'
    }

    if (
      cat === 'ink_chemistry' ||
      cat === 'ink' ||
      cat === 'adhesive' ||
      unit === 'ltr' ||
      unit === 'liter' ||
      unit === 'litre' ||
      unit === 'bottle' ||
      unit === 'can' ||
      unit === 'gallon' ||
      unit === 'ml'
    ) {
      return 'liquid'
    }

    if (
      cat === 'hardware_accessories' ||
      cat === 'metal_framing' ||
      cat === 'led_electrical' ||
      material.product_type === 'ready_product'
    ) {
      if (unit === 'pcs' || unit === 'piece' || name.includes('eyelet') || name.includes('led')) {
        return 'piece'
      }
      return 'hardware'
    }

    // 2. Keyword Heuristics for Roll Media
    if (
      name.includes('flex') ||
      name.includes('vinyl') ||
      name.includes('banner') ||
      name.includes('canvas') ||
      name.includes('backlit') ||
      name.includes('frontlit') ||
      name.includes('sticker') ||
      name.includes('frosted') ||
      name.includes('mesh') ||
      name.includes('one way vision') ||
      name.includes('one-way') ||
      name.includes('lamination') ||
      name.includes('tarpaulin') ||
      name.includes('roll')
    ) {
      return 'roll'
    }

    // 3. Keyword Heuristics for Rigid Sheet
    if (
      name.includes('sheet') ||
      name.includes('pvc board') ||
      name.includes('pvc sheet') ||
      name.includes('acrylic') ||
      name.includes('acp') ||
      name.includes('foam board') ||
      name.includes('forex') ||
      name.includes('art card') ||
      name.includes('offset paper') ||
      name.includes('swedish') ||
      name.includes('box board') ||
      name.includes('kraft') ||
      name.includes('sunboard')
    ) {
      return 'sheet'
    }

    // 4. Keyword Heuristics for Liquid / Inks & Chemistry
    if (
      name.includes('ink') ||
      name.includes('cleaning solution') ||
      name.includes('flush') ||
      name.includes('primer') ||
      name.includes('glue') ||
      name.includes('adhesive') ||
      name.includes('solvent ink') ||
      name.includes('eco-solvent ink') ||
      name.includes('varnish')
    ) {
      return 'liquid'
    }

    // 5. Hardware / Stand / Piece Items
    if (
      name.includes('stand') ||
      name.includes('roll-up') ||
      name.includes('rollup') ||
      name.includes('x-banner') ||
      name.includes('x-stand') ||
      name.includes('pop-up') ||
      name.includes('popup') ||
      name.includes('snap frame') ||
      name.includes('grommet') ||
      name.includes('standoff') ||
      name.includes('screw') ||
      name.includes('power supply')
    ) {
      return 'hardware'
    }

    if (
      name.includes('eyelet') ||
      name.includes('led module') ||
      name.includes('led') ||
      unit === 'pcs' ||
      unit === 'piece' ||
      unit === 'item'
    ) {
      return 'piece'
    }

    // 6. Box / Pack
    if (unit === 'box' || unit === 'pack' || unit === 'packet' || unit === 'bundle' || unit === 'set' || unit === 'pair') {
      return 'box_pack'
    }

    // 7. Weight
    if (unit === 'kg' || unit === 'gram' || unit === 'ton' || cat === 'metal') {
      return 'weight'
    }

    return 'general'
  }

  /**
   * Retrieves active, preconfigured physical sizes with discrete economic characteristics
   */
  static getMaterialActiveSizes(material: any): ConfiguredMaterialSize[] {
    if (!material) return []

    const form = this.detectMaterialPhysicalForm(material)
    const activeSizes: ConfiguredMaterialSize[] = []

    // 1. Roll Media Sizes (Width × Length & Discrete Economics)
    if (form === 'roll') {
      const standardLengthFt = Number(material.standard_roll_length_ft || material.roll_length_ft || 164)
      const baseCost = Number(material.average_cost || material.last_purchase_price || material.unit_cost || 0)

      // Explicit configured roll sizes if defined on master
      if (Array.isArray(material.roll_sizes) && material.roll_sizes.length > 0) {
        for (const rs of material.roll_sizes) {
          if (rs.is_active !== false) {
            const w = Number(rs.width_ft || 3)
            const l = Number(rs.length_ft || standardLengthFt)
            const area = Math.round(w * l * 10) / 10
            activeSizes.push({
              id: rs.id || `roll-size-${w}x${l}`,
              label: rs.label || `${w} ft × ${l === 164 ? '50 m' : `${l} ft`} (${area.toLocaleString()} sqft)`,
              physical_form: 'roll',
              width_ft: w,
              length_ft: l,
              standard_area_sft: area,
              default_supplier_price: rs.default_supplier_price || (baseCost > 0 && baseCost < 100 ? Math.round(baseCost * area) : baseCost),
              is_active: true,
              sku_suffix: rs.sku_suffix || `${w}FT`,
            })
          }
        }
      }

      // If no explicit roll_sizes array, derive from configured available_widths_ft
      if (activeSizes.length === 0) {
        const widths: number[] =
          Array.isArray(material.available_widths_ft) && material.available_widths_ft.length > 0
            ? material.available_widths_ft
            : material.roll_width_ft
            ? [material.roll_width_ft]
            : [2.5, 3.2, 5]

        for (const w of widths) {
          const area = Math.round(w * standardLengthFt * 10) / 10
          const lengthDisplay = standardLengthFt === 164 ? '50 m' : `${standardLengthFt} ft`

          // Discrete economic heuristic: if material cost is stored per sqft (e.g. ৳6.50/sqft), scale by area
          let defaultPrice = baseCost
          if (baseCost > 0 && baseCost < 100) {
            defaultPrice = Math.round(baseCost * area)
          } else if (baseCost >= 100) {
            // Proportional to 5ft roll
            defaultPrice = Math.round(baseCost * (w / 5))
          }

          activeSizes.push({
            id: `width-${w}ft`,
            label: `${w} ft × ${lengthDisplay} (${area.toLocaleString()} sqft)`,
            physical_form: 'roll',
            width_ft: w,
            length_ft: standardLengthFt,
            standard_area_sft: area,
            default_supplier_price: defaultPrice > 0 ? defaultPrice : undefined,
            is_active: true,
            sku_suffix: `${w}FT`,
          })
        }
      }

      return activeSizes
    }

    // 2. Rigid Sheet Sizes (Width × Length & Thickness)
    if (form === 'sheet') {
      const baseCost = Number(material.average_cost || material.last_purchase_price || material.unit_cost || 0)

      if (Array.isArray(material.sheet_sizes) && material.sheet_sizes.length > 0) {
        for (const ss of material.sheet_sizes) {
          if (ss.is_active !== false) {
            activeSizes.push({
              id: ss.id || `sheet-size-${ss.label}`,
              label: ss.label,
              physical_form: 'sheet',
              width_ft: ss.width_ft || 4,
              length_ft: ss.length_ft || 8,
              standard_area_sft: ss.standard_area_sft || (ss.width_ft && ss.length_ft ? ss.width_ft * ss.length_ft : 32),
              thickness_mm: ss.thickness_mm,
              default_supplier_price: ss.default_supplier_price || baseCost,
              is_active: true,
            })
          }
        }
      }

      if (activeSizes.length === 0) {
        const sheetLabels =
          Array.isArray(material.available_sheet_sizes) && material.available_sheet_sizes.length > 0
            ? material.available_sheet_sizes
            : ['8 ft × 4 ft (32 sqft)', '6 ft × 4 ft (24 sqft)', '4 ft × 4 ft (16 sqft)']

        for (const raw of sheetLabels) {
          const labelStr = typeof raw === 'string' ? raw : raw?.label || '8 ft × 4 ft (32 sqft)'
          let area = 32
          const match = labelStr.match(/(\d+(?:\.\d+)?)\s*(?:ft|')?\s*[xX*×]\s*(\d+(?:\.\d+)?)/)
          if (match) {
            area = Number(match[1]) * Number(match[2])
          }

          let defaultPrice = baseCost
          if (baseCost > 0 && baseCost < 100) {
            defaultPrice = Math.round(baseCost * area)
          }

          activeSizes.push({
            id: `sheet-${encodeURIComponent(labelStr.replace(/[^a-zA-Z0-9]/g, ''))}`,
            label: labelStr,
            physical_form: 'sheet',
            width_ft: match ? Number(match[1]) : 8,
            length_ft: match ? Number(match[2]) : 4,
            standard_area_sft: area,
            default_supplier_price: defaultPrice > 0 ? defaultPrice : undefined,
            is_active: true,
          })
        }
      }

      return activeSizes
    }

    // 3. Liquid (Inks & Solvents Capacities)
    if (form === 'liquid') {
      const baseCost = Number(material.average_cost || material.last_purchase_price || material.unit_cost || 0)
      const options = [
        { label: '1 Liter Bottle', capacity_liters: 1, multiplier: 1 },
        { label: '5 Liter Can / Gallon', capacity_liters: 5, multiplier: 5 },
        { label: '20 Liter Drum', capacity_liters: 20, multiplier: 20 },
      ]

      return options.map((opt) => ({
        id: `liquid-${opt.capacity_liters}L`,
        label: opt.label,
        physical_form: 'liquid',
        capacity_liters: opt.capacity_liters,
        default_supplier_price: baseCost > 0 ? Math.round(baseCost * opt.multiplier) : undefined,
        is_active: true,
      }))
    }

    // 4. Piece / Hardware
    return [
      {
        id: 'standard-piece',
        label: `${material.name || 'Standard'} (1 ${material.purchase_unit || material.unit || 'Pcs'})`,
        physical_form: form,
        pack_quantity: 1,
        default_supplier_price: Number(material.average_cost || material.last_purchase_price || material.unit_cost || 0),
        is_active: true,
      },
    ]
  }

  /**
   * Normalizes unit economics (e.g., Price per sqft, Price per linear ft, Price per liter)
   */
  static calculateNormalizedUnitEconomics(params: {
    physical_form: MasterPhysicalClassification
    width_ft?: number
    length_ft?: number
    standard_area_sft?: number
    capacity_liters?: number
    unit_purchase_price: number
    purchase_unit: string
  }): {
    normalized_cost_per_sft?: number
    normalized_cost_per_linear_ft?: number
    normalized_cost_per_liter?: number
    normalized_cost_per_unit?: number
    standard_area_sft?: number
  } {
    const { physical_form, width_ft, length_ft, capacity_liters, unit_purchase_price, purchase_unit } = params
    if (unit_purchase_price <= 0) return {}

    if (physical_form === 'roll') {
      const w = width_ft || 3
      const l = length_ft || 164
      const area = params.standard_area_sft || Math.round(w * l * 10) / 10

      const pricePerSft = area > 0 ? Number((unit_purchase_price / area).toFixed(2)) : undefined
      const pricePerLinearFt = l > 0 ? Number((unit_purchase_price / l).toFixed(2)) : undefined

      return {
        normalized_cost_per_sft: pricePerSft,
        normalized_cost_per_linear_ft: pricePerLinearFt,
        standard_area_sft: area,
        normalized_cost_per_unit: unit_purchase_price,
      }
    }

    if (physical_form === 'sheet') {
      const area = params.standard_area_sft || (width_ft && length_ft ? width_ft * length_ft : 32)
      const pricePerSft = area > 0 ? Number((unit_purchase_price / area).toFixed(2)) : undefined

      return {
        normalized_cost_per_sft: pricePerSft,
        standard_area_sft: area,
        normalized_cost_per_unit: unit_purchase_price,
      }
    }

    if (physical_form === 'liquid') {
      const liters = capacity_liters || (purchase_unit === 'can' ? 5 : 1)
      const pricePerLiter = liters > 0 ? Number((unit_purchase_price / liters).toFixed(2)) : undefined

      return {
        normalized_cost_per_liter: pricePerLiter,
        normalized_cost_per_unit: unit_purchase_price,
      }
    }

    return {
      normalized_cost_per_unit: unit_purchase_price,
    }
  }

  /**
   * Generates a complete Price Intelligence Summary across suppliers and historical transactions
   */
  static buildPriceIntelligenceSummary(params: {
    material: any
    size_label?: string
    current_unit_price: number
    current_supplier_id?: string | null
    history: PriceIntelligenceRecord[]
  }): PriceIntelligenceSummary {
    const { material, size_label, current_unit_price, current_supplier_id, history } = params
    const form = this.detectMaterialPhysicalForm(material)
    const pUnit = material?.purchase_unit || material?.unit || (form === 'roll' ? 'Roll' : form === 'sheet' ? 'Sheet' : 'Pcs')

    // Filter relevant history entries
    const relevant = (history || []).filter((h) => {
      const matchMat = h.material_id === material?.id || h.material_sku?.toLowerCase() === material?.sku?.toLowerCase()
      const matchSize = !size_label || !h.size_label || h.size_label === size_label || h.size_label.includes(size_label)
      return matchMat && matchSize
    })

    // Sort descending by purchase date
    relevant.sort((a, b) => new Date(b.purchase_date || b.created_at).getTime() - new Date(a.purchase_date || a.created_at).getTime())

    const allPrices = relevant.map((r) => Number(r.unit_purchase_price)).filter((p) => p > 0)
    if (current_unit_price > 0 && !allPrices.includes(current_unit_price)) {
      allPrices.unshift(current_unit_price)
    }

    const latestCost = current_unit_price > 0 ? current_unit_price : relevant[0]?.unit_purchase_price || Number(material?.average_cost || 0)
    const previousCost = relevant[0]?.unit_purchase_price || material?.last_purchase_price || material?.average_cost || latestCost

    let lowestCost = latestCost
    let lowestSupplier = relevant[0]?.supplier_name || 'Standard Supplier'
    let highestCost = latestCost
    let highestSupplier = relevant[0]?.supplier_name || 'Standard Supplier'

    if (relevant.length > 0) {
      let min = Infinity
      let max = -Infinity
      for (const r of relevant) {
        if (r.unit_purchase_price < min) {
          min = r.unit_purchase_price
          lowestSupplier = r.supplier_name
        }
        if (r.unit_purchase_price > max) {
          max = r.unit_purchase_price
          highestSupplier = r.supplier_name
        }
      }
      lowestCost = min < Infinity ? min : latestCost
      highestCost = max > -Infinity ? max : latestCost
    }

    const avgCost = allPrices.length > 0 ? Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length) : latestCost

    // Trend %
    let deltaPercent = 0
    let trend: 'up' | 'down' | 'stable' = 'stable'
    if (previousCost > 0 && latestCost !== previousCost) {
      deltaPercent = Number((((latestCost - previousCost) / previousCost) * 100).toFixed(1))
      if (deltaPercent > 0.5) trend = 'up'
      else if (deltaPercent < -0.5) trend = 'down'
    }

    // Group by supplier for comparison table
    const supplierMap = new Map<string, SupplierPriceComparisonItem>()
    for (const r of relevant) {
      const supKey = r.supplier_id || r.supplier_name || 'Unknown Supplier'
      if (!supplierMap.has(supKey)) {
        supplierMap.set(supKey, {
          supplier_id: r.supplier_id || null,
          supplier_name: r.supplier_name || 'Spot Supplier',
          latest_price: r.unit_purchase_price,
          lowest_price: r.unit_purchase_price,
          highest_price: r.unit_purchase_price,
          average_price: r.unit_purchase_price,
          last_purchase_date: r.purchase_date,
          last_invoice_number: r.supplier_invoice_number || r.challan_number,
          total_purchases_count: 1,
          normalized_price_per_sft: r.normalized_price_per_sft,
        })
      } else {
        const item = supplierMap.get(supKey)!
        item.lowest_price = Math.min(item.lowest_price, r.unit_purchase_price)
        item.highest_price = Math.max(item.highest_price, r.unit_purchase_price)
        item.total_purchases_count += 1
        item.average_price = Math.round((item.average_price + r.unit_purchase_price) / 2)
      }
    }

    // Compute normalized economics
    const economics = this.calculateNormalizedUnitEconomics({
      physical_form: form,
      unit_purchase_price: latestCost,
      purchase_unit: pUnit,
    })

    return {
      material_id: material?.id || '',
      material_name: material?.name || 'Substrate',
      material_sku: material?.sku || 'MAT',
      physical_form: form,
      size_label: size_label || 'Standard Size',
      purchase_unit: pUnit,
      latest_cost: latestCost,
      average_cost: avgCost,
      lowest_cost: lowestCost,
      lowest_supplier_name: lowestSupplier,
      highest_cost: highestCost,
      highest_supplier_name: highestSupplier,
      price_change_percent: deltaPercent,
      trend,
      previous_cost: previousCost,
      normalized_cost_per_sft: economics.normalized_cost_per_sft,
      normalized_cost_per_linear_ft: economics.normalized_cost_per_linear_ft,
      standard_area_sft: economics.standard_area_sft,
      history: relevant,
      supplier_comparison: Array.from(supplierMap.values()),
      total_records_count: relevant.length,
    }
  }
}
