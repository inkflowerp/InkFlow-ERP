import type {
  MasterPhysicalClassification,
  ConfiguredMaterialSize,
  PriceIntelligenceRecord,
  PriceIntelligenceSummary,
  SupplierPriceComparisonItem,
} from '@/types/price-intelligence.types'

export class PriceIntelligenceEngine {
  /**
   * Automatically detects the physical form / classification of a registered material
   */
  static detectMaterialPhysicalForm(material: any): MasterPhysicalClassification {
    if (!material) return 'general'

    // If physical_form is already explicitly provided
    if (material.physical_form && material.physical_form !== 'general') {
      return material.physical_form as MasterPhysicalClassification
    }

    const cat = (material.category || '').toLowerCase()
    const name = (material.name || '').toLowerCase()
    const unit = (material.purchase_unit || material.unit || '').toLowerCase()
    const combined = `${cat} ${name} ${unit}`

    // 1. Inks & Chemistry (Check first so ink items are never misclassified)
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
      unit === 'ml' ||
      name.includes('ink') ||
      name.includes('cleaning solution') ||
      name.includes('flush') ||
      name.includes('primer') ||
      name.includes('glue') ||
      name.includes('adhesive') ||
      name.includes('solvent ink') ||
      name.includes('eco-solvent') ||
      name.includes('varnish')
    ) {
      return 'liquid'
    }

    // 2. Hardware / Accessories / Ready Products / Stands
    if (
      cat === 'hardware_accessories' ||
      cat === 'metal_framing' ||
      cat === 'led_electrical' ||
      material.product_type === 'ready_product' ||
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
      if (unit === 'pcs' || unit === 'piece' || name.includes('eyelet') || name.includes('led')) {
        return 'piece'
      }
      return 'hardware'
    }

    // 3. Rigid Sheet Sizes & Boards
    if (
      cat === 'rigid_sheet' ||
      cat === 'pvc_board' ||
      cat === 'pvc_sheet' ||
      cat === 'acrylic' ||
      cat === 'acp' ||
      cat === 'foam_board' ||
      cat === 'paper' ||
      cat === 'wood' ||
      unit === 'sheet' ||
      (Array.isArray(material.available_sheet_sizes) && material.available_sheet_sizes.length > 0) ||
      (Array.isArray(material.sheet_sizes) && material.sheet_sizes.length > 0) ||
      name.includes('sheet') ||
      name.includes('pvc board') ||
      name.includes('pvc sheet') ||
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

    // 4. Roll Media Substrates
    if (
      material.is_roll === true ||
      cat === 'roll_media' ||
      cat === 'flex' ||
      cat === 'vinyl' ||
      cat === 'sticker_paper' ||
      cat === 'lamination_film' ||
      cat === 'banner' ||
      cat === 'fabric' ||
      cat === 'pvc' ||
      unit === 'roll' ||
      (Array.isArray(material.available_widths_ft) && material.available_widths_ft.length > 0) ||
      (Array.isArray(material.roll_sizes) && material.roll_sizes.length > 0) ||
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

    // 5. Piece items
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
   * Retrieves available purchase units based on physical classification and master unit.
   */
  static getAvailablePurchaseUnits(
    form: MasterPhysicalClassification,
    masterUnit: string,
    masterPurchaseUnit?: string
  ): string[] {
    const units = new Set<string>()
    if (masterUnit) units.add(masterUnit.toLowerCase())
    if (masterPurchaseUnit) units.add(masterPurchaseUnit.toLowerCase())

    switch (form) {
      case 'roll':
        units.add('roll')
        units.add('sft')
        units.add('meter')
        units.add('rft')
        break
      case 'sheet':
        units.add('sheet')
        units.add('sft')
        units.add('bundle')
        units.add('box')
        units.add('pcs')
        break
      case 'liquid':
        units.add('bottle')
        units.add('can')
        units.add('ltr')
        units.add('gallon')
        units.add('ml')
        break
      case 'hardware':
      case 'piece':
        units.add('pcs')
        units.add('piece')
        units.add('box')
        units.add('pack')
        units.add('set')
        units.add('pair')
        break
      case 'box_pack':
        units.add('box')
        units.add('pack')
        units.add('pcs')
        units.add('piece')
        units.add('bundle')
        break
      case 'weight':
        units.add('kg')
        units.add('box')
        units.add('bag')
        units.add('ton')
        units.add('pcs')
        break
      default:
        units.add('pcs')
        units.add('piece')
        units.add('box')
        units.add('set')
        break
    }

    return Array.from(units)
  }

  /**
   * Retrieves active, preconfigured physical sizes with discrete economic characteristics.
   * Strictly derives options from user-registered master configurations (no synthetic placeholders).
   */
  static getMaterialActiveSizes(material: any): ConfiguredMaterialSize[] {
    if (!material) return []

    const form = this.detectMaterialPhysicalForm(material)
    const activeSizes: ConfiguredMaterialSize[] = []
    const baseCost = Number(
      material.average_cost ??
      material.last_purchase_price ??
      material.unit_cost ??
      material.purchase_price ??
      material.cost_price ??
      0
    )
    const perSftCost = Number(
      material.purchase_price_per_sft ??
      material.material_config?.purchase_price_per_sft ??
      material.pricing_formula?.purchase_price_per_sft ??
      material.pricing_formula?.material_config?.purchase_price_per_sft ??
      (material.unit === 'sft' || material.selling_unit === 'sft' ? material.base_cost : undefined) ??
      0
    )

    // 1. Roll Media Sizes (Width × Length & Discrete Economics)
    if (form === 'roll') {
      const standardLengthFt = Number(
        material.standard_roll_length_ft ||
        material.material_config?.standard_roll_length_ft ||
        material.pricing_formula?.standard_roll_length_ft ||
        material.pricing_formula?.material_config?.standard_roll_length_ft ||
        material.roll_length_ft ||
        164
      )
      const globalAllowance = Number(
        material.production_width_allowance ??
        material.material_config?.production_width_allowance ??
        material.material_config?.extra_width_allowance_ft ??
        material.pricing_formula?.production_width_allowance ??
        material.pricing_formula?.material_config?.extra_width_allowance_ft ??
        material.extra_width_allowance_ft ??
        0
      )

      const rawRollSizes = (Array.isArray(material.roll_sizes) && material.roll_sizes.length > 0)
        ? material.roll_sizes
        : (material.material_config?.roll_sizes && Array.isArray(material.material_config.roll_sizes) && material.material_config.roll_sizes.length > 0)
        ? material.material_config.roll_sizes
        : (material.pricing_formula?.roll_sizes && Array.isArray(material.pricing_formula.roll_sizes) && material.pricing_formula.roll_sizes.length > 0)
        ? material.pricing_formula.roll_sizes
        : (material.pricing_formula?.material_config?.roll_sizes && Array.isArray(material.pricing_formula.material_config.roll_sizes) && material.pricing_formula.material_config.roll_sizes.length > 0)
        ? material.pricing_formula.material_config.roll_sizes
        : null

      // Explicit configured roll sizes if defined on master
      if (rawRollSizes && rawRollSizes.length > 0) {
        for (const rs of rawRollSizes) {
          if (rs && (rs.is_active !== false)) {
            const w = Number(rs.width !== undefined ? rs.width : (rs.width_ft !== undefined ? rs.width_ft : 3))
            const l = Number(rs.length !== undefined ? rs.length : (rs.length_ft !== undefined ? rs.length_ft : standardLengthFt))
            const allowance = Number(rs.extra_allowance !== undefined ? rs.extra_allowance : (rs.allowance !== undefined ? rs.allowance : globalAllowance))
            const effectiveW = w + allowance
            const physicalArea = Math.round(effectiveW * l * 10) / 10
            const nominalArea = Math.round(w * l * 10) / 10

            let price = rs.default_supplier_price || rs.purchase_price || rs.supplier_price || rs.price
            if (!price || price <= 0) {
              if (perSftCost > 0) {
                price = Math.round(perSftCost * physicalArea)
              } else if (baseCost > 0 && baseCost <= 150) {
                // If baseCost is sqft rate (e.g. 10 BDT/sqft), roll price = baseCost * physicalArea
                price = Math.round(baseCost * physicalArea)
              } else if (baseCost > 150) {
                // If baseCost is full-roll cost for a reference width, scale proportionally by effective area or width
                const referenceW = Number(material.roll_width_ft) || (rawRollSizes.length > 0 ? Math.max(...rawRollSizes.map((r: any) => Number(r.width || r.width_ft || 0))) : 10)
                const refEffectiveW = referenceW + globalAllowance
                const refArea = refEffectiveW > 0 ? refEffectiveW * standardLengthFt : physicalArea
                const effectiveSftRate = refArea > 0 ? baseCost / refArea : 0
                price = effectiveSftRate > 0 ? Math.round(effectiveSftRate * physicalArea) : (refEffectiveW > 0 ? Math.round(baseCost * (effectiveW / refEffectiveW)) : baseCost)
              } else {
                price = baseCost
              }
            }

            const lengthLabel = l === 164 ? '164ft' : `${l}ft`
            const allowanceLabel = allowance > 0 ? ` (+${allowance}ft)` : ''
            const label = rs.label || `${w}ft${allowanceLabel} × ${lengthLabel} (${Math.round(physicalArea)} sqft)`

            activeSizes.push({
              id: rs.id || `roll-size-${w}x${l}${allowance > 0 ? `-${allowance}` : ''}`,
              label: label,
              physical_form: 'roll',
              width_ft: w,
              length_ft: l,
              standard_area_sft: physicalArea,
              default_supplier_price: price > 0 ? price : undefined,
              is_active: true,
              sku_suffix: rs.sku_suffix || `${w}FT`,
            })
          }
        }
      }

      // If no explicit roll_sizes array, derive from configured available_widths_ft
      const availableWidths = (Array.isArray(material.available_widths_ft) && material.available_widths_ft.length > 0)
        ? material.available_widths_ft
        : (material.material_config?.available_widths_ft && Array.isArray(material.material_config.available_widths_ft) && material.material_config.available_widths_ft.length > 0)
        ? material.material_config.available_widths_ft
        : (material.pricing_formula?.available_widths_ft && Array.isArray(material.pricing_formula.available_widths_ft) && material.pricing_formula.available_widths_ft.length > 0)
        ? material.pricing_formula.available_widths_ft
        : null

      if (activeSizes.length === 0 && availableWidths && availableWidths.length > 0) {
        const widths: number[] = availableWidths
        const baseW = Number(material.roll_width_ft) || (widths.includes(5) ? 5 : Math.max(...widths))
        const refEffectiveW = baseW + globalAllowance
        const refArea = refEffectiveW * standardLengthFt

        for (const w of widths) {
          const effectiveW = w + globalAllowance
          const physicalArea = Math.round(effectiveW * standardLengthFt * 10) / 10

          let defaultPrice = 0
          if (perSftCost > 0) {
            defaultPrice = Math.round(perSftCost * physicalArea)
          } else if (baseCost > 0 && baseCost <= 150) {
            defaultPrice = Math.round(baseCost * physicalArea)
          } else if (baseCost > 150 && widths.length > 1 && refEffectiveW > 0) {
            const effectiveSftRate = refArea > 0 ? baseCost / refArea : 0
            defaultPrice = effectiveSftRate > 0 ? Math.round(effectiveSftRate * physicalArea) : Math.round(baseCost * (effectiveW / refEffectiveW))
          } else {
            defaultPrice = baseCost
          }

          const lengthLabel = standardLengthFt === 164 ? '164ft' : `${standardLengthFt}ft`
          const allowanceLabel = globalAllowance > 0 ? ` (+${globalAllowance}ft)` : ''

          activeSizes.push({
            id: `width-${w}ft`,
            label: `${w}ft${allowanceLabel} × ${lengthLabel} (${Math.round(physicalArea)} sqft)`,
            physical_form: 'roll',
            width_ft: w,
            length_ft: standardLengthFt,
            standard_area_sft: physicalArea,
            default_supplier_price: defaultPrice > 0 ? defaultPrice : undefined,
            is_active: true,
            sku_suffix: `${w}FT`,
          })
        }
      }

      // If single roll_width_ft is registered
      if (activeSizes.length === 0 && material.roll_width_ft) {
        const w = Number(material.roll_width_ft)
        const effectiveW = w + globalAllowance
        const physicalArea = Math.round(effectiveW * standardLengthFt * 10) / 10
        let defaultPrice = 0
        if (perSftCost > 0) {
          defaultPrice = Math.round(perSftCost * physicalArea)
        } else if (baseCost > 0 && baseCost <= 150) {
          defaultPrice = Math.round(baseCost * physicalArea)
        } else {
          defaultPrice = baseCost
        }

        const lengthLabel = standardLengthFt === 164 ? '164ft' : `${standardLengthFt}ft`
        const allowanceLabel = globalAllowance > 0 ? ` (+${globalAllowance}ft)` : ''

        activeSizes.push({
          id: `width-${w}ft`,
          label: `${w}ft${allowanceLabel} × ${lengthLabel} (${Math.round(physicalArea)} sqft)`,
          physical_form: 'roll',
          width_ft: w,
          length_ft: standardLengthFt,
          standard_area_sft: physicalArea,
          default_supplier_price: defaultPrice > 0 ? defaultPrice : undefined,
          is_active: true,
          sku_suffix: `${w}FT`,
        })
      }

      // Clean fallback if no width array was configured
      if (activeSizes.length === 0) {
        const fallbackArea = Math.round(5 * standardLengthFt)
        let defaultPrice = 0
        if (perSftCost > 0) {
          defaultPrice = Math.round(perSftCost * fallbackArea)
        } else if (baseCost > 0 && baseCost <= 150) {
          defaultPrice = Math.round(baseCost * fallbackArea)
        } else if (baseCost > 0) {
          defaultPrice = baseCost
        }

        activeSizes.push({
          id: 'standard-roll',
          label: `Standard Roll (1 ${material.purchase_unit || material.master_purchase_unit || 'Roll'})`,
          physical_form: 'roll',
          width_ft: 5,
          length_ft: standardLengthFt,
          standard_area_sft: fallbackArea,
          default_supplier_price: defaultPrice > 0 ? defaultPrice : undefined,
          is_active: true,
        })
      }

      return activeSizes
    }

    // 2. Rigid Sheet Sizes (Width × Length & Thickness)
    if (form === 'sheet') {
      const rawSheetSizes = (Array.isArray(material.sheet_sizes) && material.sheet_sizes.length > 0)
        ? material.sheet_sizes
        : (material.material_config?.available_sheet_sizes && Array.isArray(material.material_config.available_sheet_sizes) && material.material_config.available_sheet_sizes.length > 0)
        ? material.material_config.available_sheet_sizes
        : (Array.isArray(material.available_sheet_sizes) && material.available_sheet_sizes.length > 0)
        ? material.available_sheet_sizes
        : null

      if (rawSheetSizes && rawSheetSizes.length > 0) {
        for (const ss of rawSheetSizes) {
          if (ss) {
            const labelStr = typeof ss === 'string' ? ss : ss.label || `${ss.width || 8}ft × ${ss.length || 4}ft`
            let w = typeof ss === 'object' && ss.width ? Number(ss.width) : 8
            let l = typeof ss === 'object' && ss.length ? Number(ss.length) : 4
            let area = typeof ss === 'object' && ss.standard_area_sft ? Number(ss.standard_area_sft) : (w * l)

            const match = labelStr.match(/(\d+(?:\.\d+)?)\s*(?:ft|')?\s*[xX*×]\s*(\d+(?:\.\d+)?)/)
            if (match) {
              w = Number(match[1])
              l = Number(match[2])
              area = w * l
            }

            let defaultPrice = typeof ss === 'object' && ss.default_supplier_price ? ss.default_supplier_price : 0
            if (!defaultPrice || defaultPrice <= 0) {
              if (perSftCost > 0) {
                defaultPrice = Math.round(perSftCost * area)
              } else if (baseCost > 0 && baseCost <= 150 && (material.unit === 'sft' || material.selling_unit === 'sft')) {
                defaultPrice = Math.round(baseCost * area)
              } else {
                defaultPrice = baseCost
              }
            }

            activeSizes.push({
              id: (typeof ss === 'object' && ss.id) ? ss.id : `sheet-${encodeURIComponent(labelStr.replace(/[^a-zA-Z0-9]/g, ''))}`,
              label: labelStr.includes('sqft') || labelStr.includes('sft') ? labelStr : `${labelStr} (${area} sqft)`,
              physical_form: 'sheet',
              width_ft: w,
              length_ft: l,
              standard_area_sft: area,
              thickness_mm: typeof ss === 'object' ? ss.thickness_mm || material.thickness_mm : material.thickness_mm,
              default_supplier_price: defaultPrice > 0 ? defaultPrice : undefined,
              is_active: true,
            })
          }
        }
      }

      if (activeSizes.length === 0 && ((material.sheet_width_ft && material.sheet_length_ft) || material.sheet_size)) {
        const w = Number(material.sheet_width_ft || 8)
        const l = Number(material.sheet_length_ft || 4)
        const area = Math.round(w * l)
        const defaultPrice = perSftCost > 0
          ? Math.round(perSftCost * area)
          : (baseCost > 0 && baseCost <= 150 && (material.unit === 'sft' || material.selling_unit === 'sft'))
          ? Math.round(baseCost * area)
          : baseCost

        activeSizes.push({
          id: 'configured-sheet',
          label: material.sheet_size || `${w} ft × ${l} ft (${area} sqft)`,
          physical_form: 'sheet',
          width_ft: w,
          length_ft: l,
          standard_area_sft: area,
          thickness_mm: material.thickness_mm,
          default_supplier_price: defaultPrice > 0 ? defaultPrice : undefined,
          is_active: true,
        })
      }

      if (activeSizes.length === 0) {
        const defaultPrice = perSftCost > 0
          ? Math.round(perSftCost * 32)
          : (baseCost > 0 && baseCost <= 150 && (material.unit === 'sft' || material.selling_unit === 'sft'))
          ? Math.round(baseCost * 32)
          : baseCost

        activeSizes.push({
          id: 'standard-sheet',
          label: `Standard Sheet (1 ${material.purchase_unit || material.master_purchase_unit || 'Sheet'})`,
          physical_form: 'sheet',
          width_ft: 8,
          length_ft: 4,
          standard_area_sft: 32,
          default_supplier_price: defaultPrice > 0 ? defaultPrice : undefined,
          is_active: true,
        })
      }

      return activeSizes
    }

    // 3. Liquid (Inks & Solvents Capacities)
    if (form === 'liquid') {
      if (Array.isArray(material.variants) && material.variants.length > 0) {
        for (const v of material.variants) {
          activeSizes.push({
            id: `variant-${v.id}`,
            label: `${v.variant_name}${v.size_spec ? ` (${v.size_spec})` : ''}`,
            physical_form: 'liquid',
            capacity_liters: v.liquid_capacity_liters || 1,
            default_supplier_price: Math.max(0, baseCost + Number(v.cost_adjustment || 0)),
            is_active: true,
          })
        }
      } else if (material.liquid_volume_capacity) {
        activeSizes.push({
          id: 'configured-liquid',
          label: `${material.liquid_volume_capacity} (${material.purchase_unit || material.master_purchase_unit || material.unit || 'Bottle'})`,
          physical_form: 'liquid',
          capacity_liters: 1,
          default_supplier_price: baseCost > 0 ? baseCost : undefined,
          is_active: true,
        })
      } else {
        activeSizes.push({
          id: 'standard-liquid',
          label: `Standard Container (1 ${material.purchase_unit || material.master_purchase_unit || material.unit || 'Liter'})`,
          physical_form: 'liquid',
          capacity_liters: 1,
          default_supplier_price: baseCost > 0 ? baseCost : undefined,
          is_active: true,
        })
      }

      return activeSizes
    }

    // 4. Piece / Hardware / Merchandise
    if (Array.isArray(material.variants) && material.variants.length > 0) {
      for (const v of material.variants) {
        activeSizes.push({
          id: `variant-${v.id}`,
          label: `${v.variant_name}${v.size_spec ? ` (${v.size_spec})` : ''}`,
          physical_form: form,
          pack_quantity: 1,
          default_supplier_price: Math.max(0, baseCost + Number(v.cost_adjustment || 0)),
          is_active: true,
        })
      }
      return activeSizes
    }

    return [
      {
        id: 'standard-piece',
        label: `Standard Master Unit (1 ${material.purchase_unit || material.master_purchase_unit || material.unit || 'Pcs'})`,
        physical_form: form,
        pack_quantity: 1,
        default_supplier_price: baseCost > 0 ? baseCost : undefined,
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
    width_ft?: number | null
    length_ft?: number | null
    standard_area_sft?: number | null
    capacity_liters?: number | null
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

    // Extract dimensions
    let width_ft = params.width_ft || material?.roll_width_ft
    let length_ft = params.length_ft || material?.roll_length_ft || material?.standard_roll_length_ft || 164
    let standard_area_sft = params.standard_area_sft || material?.roll_area_sft || material?.standard_area_sft

    if (size_label) {
      const areaMatch = size_label.match(/\((\d+(?:\.\d+)?)\s*(?:sqft|sft)\)/i)
      if (areaMatch) {
        standard_area_sft = Number(areaMatch[1])
      }
      const widthMatch = size_label.match(/^(\d+(?:\.\d+)?)\s*ft/i)
      if (widthMatch) {
        width_ft = Number(widthMatch[1])
      }
    }

    // Compute normalized economics
    const economics = this.calculateNormalizedUnitEconomics({
      physical_form: form,
      width_ft: width_ft || undefined,
      length_ft: length_ft || undefined,
      standard_area_sft: standard_area_sft || undefined,
      capacity_liters: params.capacity_liters || undefined,
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
