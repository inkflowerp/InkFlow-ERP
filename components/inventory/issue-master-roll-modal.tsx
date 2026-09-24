'use client'

import React, { useState, useMemo, useEffect } from 'react'
import {
  Disc,
  Layers,
  Printer,
  Cpu,
  User,
  Plus,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Barcode,
  Sparkles,
  Building,
  Tag,
  Clock,
  HelpCircle,
  Package,
  ArrowRight,
} from 'lucide-react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  MaterialRecord,
  InventoryLocationRecord,
  InventoryRollRecord,
  MaterialRequestRecord,
  IssueMasterRollParams,
  IssueMasterRollResult,
} from '@/types/inventory.types'
import { useI18n } from '@/i18n/context'
import { cn } from '@/lib/utils'
import { issueMasterRollsBatchAction } from '@/actions/inventory.actions'
import { getMaterialWarehouseStockBreakdown } from '@/lib/units'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'

export interface IssueMasterRollModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  materials: MaterialRecord[]
  locations?: InventoryLocationRecord[]
  initialMaterialId?: string
  selectedMaterialId?: string
  initialWidthFt?: number
  initialLengthFt?: number
  initialMachineId?: string | null
  initialMachineName?: string | null
  request?: MaterialRequestRecord | null
  requests?: MaterialRequestRecord[]
  rolls?: InventoryRollRecord[]
  onSuccess?: (result?: IssueMasterRollResult) => void
  companyId?: string
}

const DEFAULT_PRODUCTION_MACHINES = [
  { id: 'roland', name: 'Roland Eco-Solvent Press (64")' },
  { id: 'flora', name: 'Flora Large Format Flex Press (10.5ft)' },
  { id: 'mimaki', name: 'Mimaki UV Flatbed 2513' },
  { id: 'hp', name: 'HP Latex 570 (64")' },
  { id: 'laser', name: 'Laser Cutting & Engraving Bay' },
  { id: 'cnc', name: 'CNC Router Workstation' },
  { id: 'screen', name: 'Screen Print Table' },
  { id: 'finishing', name: 'Finishing & Eyelet Workstation' },
]

export function formatUnitPlural(count: number, unit: string): string {
  if (!unit) return ''
  const lower = unit.trim().toLowerCase()
  if (count <= 1) {
    if (lower === 'rolls') return 'Roll'
    if (lower === 'boxes') return 'Box'
    if (lower === 'sheets') return 'Sheet'
    if (lower === 'packs' || lower === 'packets') return 'Pack'
    if (lower === 'bottles') return 'Bottle'
    if (lower === 'pieces') return 'Pcs'
    return unit.charAt(0).toUpperCase() + unit.slice(1).toLowerCase()
  }
  if (lower === 'roll') return 'Rolls'
  if (lower === 'box') return 'Boxes'
  if (lower === 'sheet') return 'Sheets'
  if (lower === 'pack' || lower === 'packet') return 'Packs'
  if (lower === 'bottle') return 'Bottles'
  if (lower === 'pcs' || lower === 'piece' || lower === 'pieces') return 'Pcs'
  if (lower === 'sft' || lower === 'sqft') return 'SFT'
  if (lower === 'kg') return 'Kg'
  if (lower === 'ltr' || lower === 'liter') return 'Ltr'
  if (lower === 'ml') return 'ML'
  return `${unit}s`
}

export function IssueMasterRollModal({
  open,
  onOpenChange,
  materials = [],
  locations = [],
  initialMaterialId,
  selectedMaterialId,
  initialWidthFt = 3,
  initialLengthFt = 164,
  initialMachineId = 'roland',
  initialMachineName,
  request,
  requests,
  rolls,
  onSuccess,
  companyId,
}: IssueMasterRollModalProps) {
  const { tBilingual } = useI18n()

  // 1. Show ALL available inventory materials (including fallback discovery from storage & inventory products)
  const availableMaterials = useMemo(() => {
    let all: MaterialRecord[] = []

    if (Array.isArray(materials) && materials.length > 0) {
      all = [...materials]
    }

    if (all.length === 0 && companyId) {
      try {
        const stored = PrintERPDataStore.getAll<MaterialRecord>(STORAGE_KEYS.MATERIALS, companyId) || []
        if (stored.length > 0) all = stored
      } catch {}
    }
    if (all.length === 0) {
      try {
        const storedGlobal = PrintERPDataStore.get<MaterialRecord[]>(STORAGE_KEYS.MATERIALS) || []
        if (storedGlobal.length > 0) all = storedGlobal
      } catch {}
    }

    // Also include any stocked items / products registered in inventory
    try {
      const allProds = companyId
        ? PrintERPDataStore.getAll<any>(STORAGE_KEYS.PRODUCTS, companyId) || []
        : PrintERPDataStore.get<any[]>(STORAGE_KEYS.PRODUCTS) || []
      for (const p of allProds) {
        if (!all.some((m) => m.id === p.id || (p.sku && m.sku && m.sku.toLowerCase() === p.sku.toLowerCase()))) {
          all.push({
            id: p.id,
            company_id: p.company_id || companyId || '',
            sku: p.sku || 'PROD',
            name: p.name,
            name_bn: p.name_bn || null,
            category: p.category || 'raw_material',
            unit: p.unit || p.selling_unit || 'pcs',
            current_stock: Number(p.current_stock ?? p.stock ?? p.opening_stock ?? 0),
            average_cost: Number(p.cost_per_unit ?? p.base_cost ?? p.purchase_price ?? 0),
            last_purchase_price: Number(p.purchase_price ?? p.cost_per_unit ?? p.base_cost ?? 0),
            is_roll: Boolean(p.is_roll || ['roll', 'flex', 'vinyl', 'banner', 'canvas', 'mesh', 'pvc', 'sticker'].some((c) => String(p.category || '').toLowerCase().includes(c))),
            roll_width_ft: p.roll_width_ft || p.width || null,
            standard_roll_length_ft: p.standard_roll_length_ft || p.length || 164,
            is_active: p.is_active !== false,
            created_at: p.created_at || new Date().toISOString(),
            updated_at: p.updated_at || new Date().toISOString(),
          } as MaterialRecord)
        }
      }
    } catch {}

    return all.filter((m) => m && m.is_active !== false && !(m as any).is_deleted)
  }, [materials, companyId])

  // Material Selection
  const effectiveInitialMatId = initialMaterialId || selectedMaterialId || request?.items?.[0]?.material_id || (request as any)?.material_id
  const [materialId, setMaterialId] = useState<string>(() => {
    if (effectiveInitialMatId && availableMaterials.some((m) => m.id === effectiveInitialMatId)) {
      return effectiveInitialMatId
    }
    return availableMaterials[0]?.id || ''
  })

  const selectedMaterial = useMemo(() => {
    return availableMaterials.find((m) => m.id === materialId) || materials.find((m) => m.id === materialId) || null
  }, [availableMaterials, materials, materialId])

  // Effective rolls fallback if rolls prop is not provided
  const effectiveRolls = useMemo(() => {
    if (Array.isArray(rolls) && rolls.length > 0) return rolls
    if (companyId) {
      try {
        const stored = PrintERPDataStore.getAll<InventoryRollRecord>(STORAGE_KEYS.MOUNTED_ROLLS, companyId) || []
        if (stored.length > 0) return stored
      } catch {}
    }
    try {
      const storedGlobal = PrintERPDataStore.get<InventoryRollRecord[]>(STORAGE_KEYS.MOUNTED_ROLLS) || []
      if (storedGlobal.length > 0) return storedGlobal
    } catch {}
    return []
  }, [rolls, companyId])

  // Effective Locations with fallback and auto discovery
  const effectiveLocations = useMemo(() => {
    let list = Array.isArray(locations) && locations.length > 0 ? [...locations] : []
    if (list.length === 0 && companyId) {
      try {
        const stored = PrintERPDataStore.getAll<InventoryLocationRecord>(STORAGE_KEYS.LOCATIONS, companyId) || []
        if (stored.length > 0) list = stored
      } catch {}
    }
    if (list.length === 0) {
      try {
        const storedGlobal = PrintERPDataStore.get<InventoryLocationRecord[]>(STORAGE_KEYS.LOCATIONS) || []
        if (storedGlobal.length > 0) list = storedGlobal
      } catch {}
    }
    if (list.length === 0) {
      list = [
        {
          id: 'loc-main-warehouse',
          company_id: companyId || '',
          location_code: 'WH-MAIN',
          location_name: 'Main Material Warehouse',
          location_type: 'raw_material_store',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]
    }
    return list
  }, [locations, companyId])

  // Source Store Location (Auto-selected)
  const [sourceLocationId, setSourceLocationId] = useState<string>(() => {
    const pref = locations.find(
      (l) =>
        l.location_type === 'raw_material_store' ||
        l.location_type === 'main_store' ||
        (l as any).is_default ||
        l.location_code?.toUpperCase().includes('RAW') ||
        l.location_code?.toUpperCase().includes('MAIN')
    )
    return pref ? pref.id : locations[0]?.id || ''
  })

  // Warehouse Stock Breakdown in Purchase Units
  const warehouseBreakdown = useMemo(() => {
    return getMaterialWarehouseStockBreakdown(selectedMaterial, effectiveRolls)
  }, [selectedMaterial, effectiveRolls])

  // Active Available Options for Selected Material (Sizes, Dimensions, Variants)
  const configuredSizeOptions = useMemo(() => {
    if (!selectedMaterial) return []

    const list: {
      key: string
      label: string
      width_ft: number
      length_ft: number
      allowance_ft: number
      purchase_price: number
      gsm: number
      finishing: string
      roll_count: number
      total_sft: number
      unit_cost: number
      stock_display: string
      option_display: string
      is_custom?: boolean
    }[] = []

    const baseCost = Number(
      selectedMaterial.average_cost ||
      selectedMaterial.last_purchase_price ||
      selectedMaterial.cost_per_unit ||
      0
    )

    if (warehouseBreakdown.is_roll) {
      if (warehouseBreakdown.roll_items && warehouseBreakdown.roll_items.length > 0) {
        for (const item of warehouseBreakdown.roll_items) {
          const w = Number(item.width_ft || 0)
          const l = Number(item.length_ft || 0)
          const singleArea = Math.round(w * l * 100) / 100
          const area = Number(item.total_sft || (singleArea * (item.roll_count || 0)))
          const itemPrice = Number(item.purchase_price ?? 0)
          const price = itemPrice > 0 ? itemPrice : baseCost
          const pricePerRoll = price > 150 ? price : (price > 0 && singleArea > 0 ? Math.round(price * singleArea * 100) / 100 : 0)

          const stockDisp = `${item.roll_count} ${item.roll_count === 1 ? 'Roll' : 'Rolls'} (${area.toLocaleString()} SFT)`
          const optDisp = `${w}ft × ${l}ft (${singleArea} SFT/Roll) — Available: ${stockDisp}`

          list.push({
            key: item.key || `${w}x${l}|p:${price}|gsm:${item.gsm || 0}|f:${item.finishing || 'none'}`,
            label: `${w}ft × ${l}ft (${singleArea} SFT/Roll)`,
            width_ft: w,
            length_ft: l,
            allowance_ft: Number(item.allowance_ft ?? 0),
            purchase_price: price,
            gsm: Number(item.gsm ?? selectedMaterial.gsm ?? 0),
            finishing: String(item.finishing ?? selectedMaterial.default_finishing ?? 'none'),
            roll_count: Number(item.roll_count || 0),
            total_sft: area,
            unit_cost: pricePerRoll,
            stock_display: stockDisp,
            option_display: optDisp,
          })
        }
      } else {
        const defW = Number(selectedMaterial.roll_width_ft || selectedMaterial.width || 4)
        const defL = Number(selectedMaterial.standard_roll_length_ft || selectedMaterial.roll_length_ft || selectedMaterial.length || 164)
        const singleArea = Math.round(defW * defL * 100) / 100
        const stockRolls = singleArea > 0 ? Math.floor(Number(selectedMaterial.current_stock || 0) / singleArea) : 0
        const pricePerRoll = baseCost > 150 ? baseCost : (baseCost > 0 && singleArea > 0 ? Math.round(baseCost * singleArea * 100) / 100 : 0)

        const stockDisp = `${stockRolls} Rolls (${Number(selectedMaterial.current_stock || 0).toLocaleString()} SFT)`
        const optDisp = `${defW}ft × ${defL}ft (${singleArea} SFT/Roll) — Available: ${stockDisp}`

        list.push({
          key: `${defW}x${defL}`,
          label: `${defW}ft × ${defL}ft (${singleArea} SFT/Roll)`,
          width_ft: defW,
          length_ft: defL,
          allowance_ft: 0,
          purchase_price: baseCost,
          gsm: Number(selectedMaterial.gsm || 0),
          finishing: String(selectedMaterial.default_finishing || 'none'),
          roll_count: stockRolls,
          total_sft: Number(selectedMaterial.current_stock || 0),
          unit_cost: pricePerRoll,
          stock_display: stockDisp,
          option_display: optDisp,
        })
      }
    } else {
      const unitName = (selectedMaterial.purchase_unit || selectedMaterial.unit || 'pcs').toUpperCase()
      const stock = Number(selectedMaterial.current_stock || 0)
      const stockDisp = `${stock.toLocaleString()} ${unitName}`
      const optDisp = `Standard Unit (${unitName}) — Available: ${stockDisp}`

      list.push({
        key: 'standard',
        label: `Standard ${unitName}`,
        width_ft: 0,
        length_ft: 0,
        allowance_ft: 0,
        purchase_price: baseCost,
        gsm: Number(selectedMaterial.gsm || 0),
        finishing: String(selectedMaterial.default_finishing || 'none'),
        roll_count: stock,
        total_sft: stock,
        unit_cost: baseCost,
        stock_display: stockDisp,
        option_display: optDisp,
      })
    }

    return list
  }, [selectedMaterial, warehouseBreakdown])

  // Active Selected Size & Custom Dimensions State
  const [selectedSizeKey, setSelectedSizeKey] = useState<string>('')
  const [customWidthFt, setCustomWidthFt] = useState<number | undefined>(initialWidthFt && initialWidthFt > 0 ? initialWidthFt : undefined)
  const [customLengthFt, setCustomLengthFt] = useState<number | undefined>(initialLengthFt && initialLengthFt > 0 ? initialLengthFt : undefined)

  const activeSelectedSizeOption = useMemo(() => {
    return configuredSizeOptions.find((o) => o.key === selectedSizeKey) || configuredSizeOptions[0] || null
  }, [configuredSizeOptions, selectedSizeKey])

  // Effective dimensions for issue
  const widthFt = useMemo(() => {
    if (customWidthFt !== undefined && customWidthFt > 0) {
      return customWidthFt
    }
    if (activeSelectedSizeOption && activeSelectedSizeOption.width_ft > 0) {
      return activeSelectedSizeOption.width_ft
    }
    if (!selectedMaterial) return 3
    return Number(
      selectedMaterial.roll_width_ft ||
        selectedMaterial.width ||
        (Array.isArray(selectedMaterial.available_widths_ft) && selectedMaterial.available_widths_ft.length === 1
          ? selectedMaterial.available_widths_ft[0]
          : 0) ||
        3
    )
  }, [customWidthFt, activeSelectedSizeOption, selectedMaterial])

  const lengthFt = useMemo(() => {
    if (customLengthFt !== undefined && customLengthFt > 0) {
      return customLengthFt
    }
    if (activeSelectedSizeOption && activeSelectedSizeOption.length_ft > 0) {
      return activeSelectedSizeOption.length_ft
    }
    if (!selectedMaterial) return 164
    return Number(
      selectedMaterial.standard_roll_length_ft ||
        selectedMaterial.roll_length_ft ||
        selectedMaterial.length ||
        164
    )
  }, [customLengthFt, activeSelectedSizeOption, selectedMaterial])

  // Batch Quantity (Number of purchase units / rolls to issue)
  const [quantityRolls, setQuantityRolls] = useState<number>(1)

  // Destination & Machine Mounting
  const [destination, setDestination] = useState<'machine' | 'floor_staging'>(
    initialMachineId ? 'machine' : 'floor_staging'
  )
  const [machineId, setMachineId] = useState<string>(initialMachineId || 'roland')

  // Roll Tag / Lot Number Customization
  const [lotNumber, setLotNumber] = useState<string>('')
  const [customRollTag, setCustomRollTag] = useState<string>('')
  const [showAdvancedTag, setShowAdvancedTag] = useState<boolean>(false)

  // Request by / Operator & Remarks
  const [notes, setNotes] = useState<string>('')
  const [operatorName, setOperatorName] = useState<string>('Floor Operator')

  // UI Feedback States
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPrintLabel, setShowPrintLabel] = useState<boolean>(false)

  // Dynamic Machinery list
  const machineryList = useMemo(() => {
    if (!companyId) return DEFAULT_PRODUCTION_MACHINES
    try {
      const stored = PrintERPDataStore.getAll<any>(STORAGE_KEYS.MACHINERIES, companyId) || []
      if (stored.length > 0) {
        return stored.map((m) => ({ id: m.id, name: m.name || m.machinery_name }))
      }
    } catch {}
    return DEFAULT_PRODUCTION_MACHINES
  }, [companyId])

  // Reset or Sync when modal opens or initial props change
  useEffect(() => {
    if (open) {
      const targetMatId = initialMaterialId || selectedMaterialId || request?.items?.[0]?.material_id || (request as any)?.material_id
      if (targetMatId && availableMaterials.some((m) => m.id === targetMatId)) {
        setMaterialId(targetMatId)
      } else if (availableMaterials.length > 0 && !availableMaterials.some((m) => m.id === materialId)) {
        setMaterialId(availableMaterials[0].id)
      }

      if (initialWidthFt && initialWidthFt > 0) {
        setCustomWidthFt(initialWidthFt)
      }
      if (initialLengthFt && initialLengthFt > 0) {
        setCustomLengthFt(initialLengthFt)
      }

      if (request) {
        const reqQty = Number(request.items?.[0]?.requested_quantity || (request as any)?.requested_quantity || 1)
        if (reqQty > 0) {
          setQuantityRolls(reqQty)
        }
        if (request.notes) {
          setNotes(request.notes)
        } else if (request.request_number) {
          setNotes(`Requisition #${request.request_number}`)
        }
      }

      // Auto-select source location
      if (!sourceLocationId || !effectiveLocations.some((l) => l.id === sourceLocationId)) {
        const pref = effectiveLocations.find(
          (l) =>
            l.location_type === 'raw_material_store' ||
            l.location_type === 'main_store' ||
            (l as any).is_default ||
            l.location_code?.toUpperCase().includes('RAW') ||
            l.location_code?.toUpperCase().includes('MAIN')
        )
        setSourceLocationId(pref ? pref.id : effectiveLocations[0]?.id || '')
      }

      if (initialMachineId) {
        setMachineId(initialMachineId)
        setDestination('machine')
      }
      setError(null)
      setSuccess(null)
      setLoading(false)
    }
  }, [open, initialMaterialId, selectedMaterialId, initialMachineId, initialWidthFt, initialLengthFt, request, availableMaterials, effectiveLocations])

  // Sync selected size key when material changes or configuredSizeOptions update
  useEffect(() => {
    if (configuredSizeOptions.length > 0) {
      const matched = configuredSizeOptions.find((o) =>
        (customWidthFt && customLengthFt && o.width_ft === customWidthFt && o.length_ft === customLengthFt) ||
        (initialWidthFt && initialLengthFt && o.width_ft === initialWidthFt && o.length_ft === initialLengthFt)
      )
      if (matched) {
        setSelectedSizeKey(matched.key)
      } else {
        setSelectedSizeKey(configuredSizeOptions[0].key)
        setCustomWidthFt(configuredSizeOptions[0].width_ft)
        setCustomLengthFt(configuredSizeOptions[0].length_ft)
      }
    }
  }, [materialId, configuredSizeOptions])

  // Material Physical Form & Unit Classifications
  const isRollMedia = Boolean(warehouseBreakdown.is_roll)
  const rawPurchaseUnit = (
    warehouseBreakdown.purchase_unit ||
    selectedMaterial?.purchase_unit ||
    (selectedMaterial?.material_config as any)?.purchase_unit ||
    'pcs'
  ).toLowerCase()

  const purchaseUnitName = formatUnitPlural(1, rawPurchaseUnit)
  const consumptionUnitName = (
    warehouseBreakdown.consumption_unit ||
    selectedMaterial?.unit ||
    (selectedMaterial as any)?.selling_unit ||
    'pcs'
  ).toLowerCase()

  const isRigidSheet =
    rawPurchaseUnit === 'sheet' ||
    ['rigid_sheet', 'rigid_sheets', 'acrylic', 'pvc_board', 'foam_board', 'acp'].some((c) =>
      (selectedMaterial?.category || '').toLowerCase().includes(c)
    )

  const isPackBox = ['box', 'pack', 'carton', 'set'].includes(rawPurchaseUnit)

  const isFluid =
    ['bottle', 'can', 'liter', 'ltr'].includes(rawPurchaseUnit) ||
    ['ink', 'fluid', 'solvent'].some((c) => (selectedMaterial?.category || '').toLowerCase().includes(c))

  // Single unit quantity / area in consumption units & human-friendly measure string
  const { singleUnitQuantity, unitMeasureDisplay } = useMemo(() => {
    if (isRollMedia) {
      const area = Math.round(widthFt * lengthFt * 100) / 100
      return {
        singleUnitQuantity: area,
        unitMeasureDisplay: `${widthFt}ft × ${lengthFt}ft (${area.toLocaleString()} SFT)`,
      }
    }

    if (isRigidSheet) {
      const sheetW = Number((selectedMaterial as any)?.sheet_width_ft || selectedMaterial?.width || 4)
      const sheetL = Number((selectedMaterial as any)?.sheet_length_ft || selectedMaterial?.length || 8)
      const sheetArea = sheetW * sheetL > 0 ? sheetW * sheetL : 32
      const isSft = ['sft', 'sqft'].includes(consumptionUnitName)
      return {
        singleUnitQuantity: isSft ? sheetArea : 1,
        unitMeasureDisplay: isSft ? `${sheetW}ft × ${sheetL}ft (${sheetArea} SFT)` : `1 Sheet`,
      }
    }

    if (isPackBox) {
      const packQty = Number(
        (selectedMaterial as any)?.pack_quantity ||
          (selectedMaterial?.material_config as any)?.pack_quantity ||
          (selectedMaterial as any)?.conversion_factor ||
          (selectedMaterial as any)?.conversion_ratio ||
          1
      )
      const effectiveQty = packQty > 1 ? packQty : 1
      return {
        singleUnitQuantity: effectiveQty,
        unitMeasureDisplay: `${effectiveQty.toLocaleString()} ${consumptionUnitName.toUpperCase()}`,
      }
    }

    if (isFluid) {
      const isMl = consumptionUnitName === 'ml'
      const vol = Number(
        (selectedMaterial as any)?.liquid_volume_capacity
          ? String((selectedMaterial as any).liquid_volume_capacity).replace(/[^0-9.]/g, '')
          : (selectedMaterial?.material_config as any)?.liquid_volume_ml || 1000
      )
      const effectiveVol = isMl ? (vol > 0 ? vol : 1000) : 1
      return {
        singleUnitQuantity: effectiveVol,
        unitMeasureDisplay: isMl ? `${effectiveVol.toLocaleString()} ML` : `1 LTR`,
      }
    }

    return {
      singleUnitQuantity: 1,
      unitMeasureDisplay: `1 ${consumptionUnitName.toUpperCase()}`,
    }
  }, [isRollMedia, widthFt, lengthFt, isRigidSheet, isPackBox, isFluid, selectedMaterial, consumptionUnitName])

  const totalBatchQuantity = useMemo(() => {
    return Math.round(singleUnitQuantity * quantityRolls * 100) / 100
  }, [singleUnitQuantity, quantityRolls])

  // Store Stock Check
  const currentStoreStock = useMemo(() => {
    return Number(selectedMaterial?.current_stock ?? (selectedMaterial as any)?.stock ?? 0)
  }, [selectedMaterial])

  const currentAvailablePurchaseUnits = useMemo(() => {
    if (activeSelectedSizeOption && activeSelectedSizeOption.roll_count > 0) {
      return activeSelectedSizeOption.roll_count
    }
    if (warehouseBreakdown.total_rolls > 0) {
      return warehouseBreakdown.total_rolls
    }
    if (singleUnitQuantity <= 0) return 0
    return Math.floor(currentStoreStock / singleUnitQuantity)
  }, [activeSelectedSizeOption, warehouseBreakdown, currentStoreStock, singleUnitQuantity])

  const projectedRemainingUnits = useMemo(() => {
    return Math.max(0, currentAvailablePurchaseUnits - quantityRolls)
  }, [currentAvailablePurchaseUnits, quantityRolls])

  const projectedStoreBalance = useMemo(() => {
    return currentStoreStock - totalBatchQuantity
  }, [currentStoreStock, totalBatchQuantity])

  const isStoreShortage =
    currentStoreStock < totalBatchQuantity || currentAvailablePurchaseUnits < quantityRolls

  // Source Warehouse Name
  const sourceLocationName = useMemo(() => {
    return effectiveLocations.find((l) => l.id === sourceLocationId)?.location_name || 'Warehouse Store'
  }, [effectiveLocations, sourceLocationId])

  // Auto-Generated Identifier Tag
  const generatedRollCode = useMemo(() => {
    if (customRollTag.trim()) {
      return quantityRolls > 1 ? `${customRollTag.trim()}-01` : customRollTag.trim()
    }
    const cleanSku = (selectedMaterial?.sku || 'MAT').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    const lot = lotNumber.trim() || new Date().toISOString().slice(2, 10).replace(/-/g, '')
    const tagPrefix = isRollMedia ? `ROL-${cleanSku}-${widthFt}FT` : `MAT-${cleanSku}`
    const tag = `${tagPrefix}-${lot}`
    return quantityRolls > 1 ? `${tag}-01` : tag
  }, [selectedMaterial, isRollMedia, widthFt, lotNumber, customRollTag, quantityRolls])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!materialId) {
      setError('Please select a valid inventory material from warehouse.')
      return
    }
    if (quantityRolls <= 0) {
      setError('Quantity must be at least 1.')
      return
    }
    if (isStoreShortage || currentStoreStock < totalBatchQuantity) {
      setError(
        `Insufficient Warehouse Stock: Current available stock is ${currentStoreStock} ${consumptionUnitName.toUpperCase()} (${currentAvailablePurchaseUnits} ${formatUnitPlural(currentAvailablePurchaseUnits, purchaseUnitName)}). Please receive stock into the warehouse before issuing.`
      )
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const targetMachine = machineryList.find((m) => m.id === machineId)
      const machineName =
        destination === 'machine'
          ? initialMachineName || targetMachine?.name || 'Production Workstation'
          : null

      const payload: IssueMasterRollParams = {
        material_id: materialId,
        width_ft: Number(widthFt),
        length_ft: Number(lengthFt),
        quantity_rolls: Number(quantityRolls),
        location_id: sourceLocationId || null,
        destination,
        machine_id: destination === 'machine' ? machineId : null,
        machine_name: machineName,
        lot_number: lotNumber.trim() || undefined,
        roll_code_custom: customRollTag.trim() || undefined,
        operator_name: operatorName.trim() || 'Floor Operator',
        request_id: request?.id || null,
        production_task_id: request?.production_task_id || null,
        notes:
          notes.trim() ||
          (request?.request_number
            ? `Issued against Requisition ${request.request_number} (${quantityRolls} ${formatUnitPlural(quantityRolls, purchaseUnitName)}) to Print Floor`
            : `Requisitioned ${quantityRolls} ${formatUnitPlural(quantityRolls, purchaseUnitName)} for Print Floor`),
        unit_cost: 0,
      }

      const res = await issueMasterRollsBatchAction(payload, companyId)

      if (!res.success || !res.data) {
        setError(res.error || 'Failed to issue material to floor.')
        return
      }

      const result = res.data
      setSuccess(
        `Successfully issued ${quantityRolls} ${formatUnitPlural(quantityRolls, purchaseUnitName)} (${result.total_area_sft || totalBatchQuantity} ${consumptionUnitName.toUpperCase()}) to Print Floor!`
      )

      if (onSuccess) {
        onSuccess(result)
      }

      setTimeout(() => {
        onOpenChange(false)
      }, 700)
    } catch (err: any) {
      setError(err.message || 'Error occurred while issuing material.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      size="2xl"
      hideFooter={true}
      title={
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shrink-0">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <div className="text-base font-bold text-slate-900 dark:text-white leading-tight">
              {tBilingual(
                'Direct Material Issue & Print Floor Requisition',
                'সরাসরি ফ্লোরে কাঁচামাল প্রদান ও চাহিদা পূরণ'
              )}
            </div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {tBilingual(
                'Issue materials, rolls, sheets, or supplies directly from warehouse inventory to production floor.',
                'গুদাম স্টক থেকে সরাসরি ফ্লোরে কাঁচামাল বা মাস্টার রোল বরাদ্দ ও মাউন্ট করুন।'
              )}
            </div>
          </div>
        </div>
      }
      onSubmit={handleSubmit}
      className="p-0 overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800"
    >
      <div className="p-4 sm:p-5 space-y-4 text-xs max-h-[calc(85vh-4rem)] overflow-y-auto pr-2">
        {/* Success Alert */}
        {success && (
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 rounded-xl border border-emerald-300 dark:border-emerald-800 flex items-center gap-3 animate-in fade-in shadow-xs">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold text-xs">{success}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 text-rose-900 dark:text-rose-200 rounded-xl border border-rose-300 dark:border-rose-800 flex items-center gap-3 animate-in fade-in shadow-xs">
            <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" />
            <span className="font-semibold text-xs">{error}</span>
          </div>
        )}

        {/* ========================================================= */}
        {/* FIELD 1: MATERIAL NAME & SOURCE STORE */}
        {/* ========================================================= */}
        <div className="space-y-3.5 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="font-bold text-xs uppercase text-slate-700 dark:text-slate-300 tracking-wider flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              1. {tBilingual('Material Name & Source Location', 'কাঁচামালের নাম ও সোর্স গুদাম')}
            </span>
            {selectedMaterial && (
              <Badge
                variant="outline"
                className={cn(
                  'text-[11px] font-mono font-bold py-1 px-2.5 shadow-2xs',
                  currentStoreStock > 0
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300'
                )}
              >
                Stock: {warehouseBreakdown.purchase_unit_display} ({currentStoreStock.toLocaleString()}{' '}
                {consumptionUnitName.toUpperCase()})
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Material Name Selector */}
            <div>
              <Label className="text-xs font-semibold mb-1.5 flex items-center justify-between">
                <span>
                  {tBilingual('Material Name', 'কাঁচামালের নাম')} (e.g. Black PVC, PVC){' '}
                  <span className="text-rose-500">*</span>
                </span>
              </Label>
              <select
                value={materialId}
                onChange={(e) => {
                  setMaterialId(e.target.value)
                  setCustomWidthFt(undefined)
                  setCustomLengthFt(undefined)
                }}
                className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 shadow-2xs"
                required
              >
                <option value="">-- Select Material Name --</option>
                {availableMaterials.map((m) => {
                  const bd = getMaterialWarehouseStockBreakdown(m, effectiveRolls)
                  return (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.sku || 'No SKU'}) • Stock: {bd.purchase_unit_display}
                    </option>
                  )
                })}
              </select>
            </div>

            {/* Source Warehouse Location */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs font-semibold block">
                  {tBilingual('Source Store Location', 'উৎস স্টোর লোকেশন')}
                </Label>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                  <Sparkles className="h-3 w-3" /> Auto
                </span>
              </div>
              <select
                value={sourceLocationId}
                onChange={(e) => setSourceLocationId(e.target.value)}
                className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium focus:ring-2 focus:ring-blue-500 shadow-2xs"
              >
                {effectiveLocations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.location_name} ({loc.location_code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* FIELD 2: SELECTED MATERIAL'S AVAILABLE OPTIONS (SIZES/VARIANTS) */}
        {/* ========================================================= */}
        {configuredSizeOptions.length > 0 && (
          <div className="p-4 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/60 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <Label className="text-xs font-bold text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                <Disc className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>
                  2. {tBilingual("Selected Material's Available Options", 'নির্বাচিত কাঁচামালের উপলব্ধ সাইজ ও অপশন')} (e.g. 2ft x 164ft, 3.25ft x 164ft)
                </span>
                <span className="text-rose-500">*</span>
              </Label>
              <Badge variant="outline" className="text-[11px] font-mono font-medium border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300 bg-blue-100/50 dark:bg-blue-900/50">
                {configuredSizeOptions.length} {configuredSizeOptions.length === 1 ? 'Option Available' : 'Options Available'}
              </Badge>
            </div>

            <select
              value={selectedSizeKey}
              onChange={(e) => {
                const k = e.target.value
                setSelectedSizeKey(k)
                const opt = configuredSizeOptions.find((o) => o.key === k)
                if (opt) {
                  setCustomWidthFt(opt.width_ft)
                  setCustomLengthFt(opt.length_ft)
                }
              }}
              className="w-full h-10 rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 px-3 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 shadow-2xs font-mono"
            >
              {configuredSizeOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {selectedMaterial?.name}: {opt.option_display}
                </option>
              ))}
            </select>

            {/* Quick-Select Chips for Options */}
            {configuredSizeOptions.length > 1 && (
              <div className="flex items-center gap-2 flex-wrap pt-0.5">
                {configuredSizeOptions.map((opt) => {
                  const isSelected = selectedSizeKey === opt.key
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        setSelectedSizeKey(opt.key)
                        setCustomWidthFt(opt.width_ft)
                        setCustomLengthFt(opt.length_ft)
                      }}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer border shadow-2xs text-left',
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-700 ring-2 ring-blue-400 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/40'
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{opt.label}</span>
                        <span className={cn('text-[10px] font-normal opacity-90', isSelected ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400')}>
                          • {opt.stock_display}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* FIELD 3: QUANTITY (UNIT BASED ON SELECTED MATERIAL) */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold block">
                3. {tBilingual(
                  `Quantity (${purchaseUnitName})`,
                  `পরিমাণ (${purchaseUnitName})`
                )} (e.g. Roll, Bottle, Sheet) <span className="text-rose-500">*</span>
              </Label>
              <Badge variant="secondary" className="text-[10px] font-mono font-bold">
                {quantityRolls} {formatUnitPlural(quantityRolls, purchaseUnitName)}
                {(purchaseUnitName.toLowerCase() !== consumptionUnitName.toLowerCase() || singleUnitQuantity > 1) &&
                  ` = ${totalBatchQuantity.toLocaleString()} ${consumptionUnitName.toUpperCase()}`}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setQuantityRolls((q) => Math.max(1, q - 1))}
                className="h-9 w-9 p-0 cursor-pointer"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                min="1"
                max="1000"
                value={quantityRolls}
                onChange={(e) => setQuantityRolls(Math.max(1, parseInt(e.target.value) || 1))}
                className="h-9 text-center font-mono font-black text-sm"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setQuantityRolls((q) => q + 1)}
                className="h-9 w-9 p-0 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-1.5 justify-center pt-1 flex-wrap">
              {[1, 2, 3, 5, 10].map((q) => (
                <Button
                  key={q}
                  type="button"
                  size="sm"
                  variant={quantityRolls === q ? 'default' : 'outline'}
                  onClick={() => setQuantityRolls(q)}
                  className="h-7 text-[11px] px-2.5 font-bold cursor-pointer"
                >
                  {q} {formatUnitPlural(q, purchaseUnitName)}
                </Button>
              ))}
            </div>
          </div>

          {/* Destination & Machine Assignment */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-2xs">
            <Label className="text-xs font-semibold block">
              {tBilingual('Workstation Destination & Assignment', 'ফ্লোর গন্তব্য ও মাউন্টিং')}
            </Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={destination === 'machine' ? 'default' : 'outline'}
                onClick={() => setDestination('machine')}
                className="h-9 flex-1 text-xs font-bold gap-1.5 cursor-pointer"
              >
                <Cpu className="h-4 w-4" />
                <span>Mount to Press</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant={destination === 'floor_staging' ? 'default' : 'outline'}
                onClick={() => setDestination('floor_staging')}
                className="h-9 flex-1 text-xs font-bold gap-1.5 cursor-pointer"
              >
                <Building className="h-4 w-4" />
                <span>Floor Staging</span>
              </Button>
            </div>

            {destination === 'machine' && (
              <select
                value={machineId}
                onChange={(e) => setMachineId(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-semibold mt-1"
              >
                {machineryList.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* FIELD 4 & 5: REQUEST BY / OPERATOR & REMARK */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <Label className="text-xs font-semibold mb-1.5 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-slate-500" />
              <span>4. {tBilingual('Request by / Operator', 'অনুরোধকারী / অপারেটরের নাম')}</span>
              <span className="text-rose-500">*</span>
            </Label>
            <Input
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              placeholder="e.g. Kamal Hossain / Floor Operator"
              className="h-10 text-xs font-medium"
              required
            />
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1.5 flex items-center gap-1.5">
              <HelpCircle className="h-3.5 w-3.5 text-slate-500" />
              <span>5. {tBilingual('Remark', 'মন্তব্য / রিমার্ক')}</span>
            </Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Urgent run for Job #1042 / Banner Printing"
              className="h-10 text-xs font-medium"
            />
          </div>
        </div>

        {/* ========================================================= */}
        {/* SMART IDENTIFIER TAG & BARCODE TRACKING */}
        {/* ========================================================= */}
        <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-200 dark:border-indigo-900/60 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span className="font-bold text-xs text-indigo-950 dark:text-indigo-200">
                {tBilingual('Tracking Identifier Tag', 'ট্র্যাকিং ট্যাগ আইডি')}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvancedTag(!showAdvancedTag)}
              className="h-6 text-[11px] text-indigo-700 dark:text-indigo-300 font-semibold px-2 cursor-pointer"
            >
              {showAdvancedTag ? 'Hide Custom Tag' : 'Customize Tag / Lot'}
            </Button>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Badge className="bg-indigo-600 text-white font-mono text-xs px-3 py-1 font-bold shadow-xs">
              {generatedRollCode}
              {quantityRolls > 1 && ` (to ...-${String(quantityRolls).padStart(2, '0')})`}
            </Badge>
            <span className="text-[11px] text-slate-500 font-medium font-mono">
              Auto-tracked for Factory Floor Consumption
            </span>
          </div>

          {showAdvancedTag && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2.5 border-t border-indigo-200 dark:border-indigo-900/60">
              <div>
                <Label className="text-[11px] font-semibold mb-1 block">Batch / Lot Number</Label>
                <Input
                  placeholder="e.g. LOT-2026-B8"
                  value={lotNumber}
                  onChange={(e) => setLotNumber(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div>
                <Label className="text-[11px] font-semibold mb-1 block">Custom Tag Override</Label>
                <Input
                  placeholder="e.g. TAG-CUSTOM-001"
                  value={customRollTag}
                  onChange={(e) => setCustomRollTag(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* SUMMARY TELEMETRY & WAREHOUSE IMPACT CARDS */}
        {/* ========================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <Card className="p-3 bg-white dark:bg-slate-900 border shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Unit Measure</span>
            <span className="text-sm font-black text-slate-900 dark:text-white font-mono truncate block" title={unitMeasureDisplay}>
              {unitMeasureDisplay}
            </span>
            <span className="text-[10px] text-slate-500 block">per {purchaseUnitName}</span>
          </Card>

          <Card className="p-3 bg-white dark:bg-slate-900 border shadow-xs">
            <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 block">
              Issue Quantity
            </span>
            <span className="text-sm font-black text-blue-600 dark:text-blue-400 font-mono">
              {quantityRolls} {formatUnitPlural(quantityRolls, purchaseUnitName)}
            </span>
            <span className="text-[10px] text-slate-500 block">
              {totalBatchQuantity.toLocaleString()} {consumptionUnitName.toUpperCase()} total
            </span>
          </Card>

          <Card className="p-3 bg-white dark:bg-slate-900 border shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
              Destination
            </span>
            <span className="text-sm font-black text-slate-800 dark:text-slate-200 font-mono truncate block">
              {destination === 'machine'
                ? machineryList.find((m) => m.id === machineId)?.name || 'Machine Press'
                : 'Floor Staging'}
            </span>
            <span className="text-[10px] text-slate-500 block">
              {destination === 'machine' ? 'Mounted to Press' : 'Floor Staging Area'}
            </span>
          </Card>

          <Card
            className={cn(
              'p-3 border shadow-xs',
              isStoreShortage
                ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-900'
                : 'bg-white dark:bg-slate-900'
            )}
          >
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Projected Store Stock</span>
            <span
              className={cn(
                'text-sm font-black font-mono',
                isStoreShortage ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
              )}
            >
              {projectedRemainingUnits} {formatUnitPlural(projectedRemainingUnits, purchaseUnitName)} ({Math.max(0, projectedStoreBalance).toLocaleString()}{' '}
              {consumptionUnitName.toUpperCase()})
            </span>
            <span className="text-[10px] text-slate-500 block truncate">
              {isStoreShortage ? `⚠️ Deficit (${Math.abs(projectedStoreBalance).toLocaleString()} ${consumptionUnitName.toUpperCase()})` : `in ${sourceLocationName}`}
            </span>
          </Card>
        </div>

        {/* Printable Industrial Tag Preview */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
          <div className="p-3 bg-slate-100 dark:bg-slate-800/80 flex items-center justify-between">
            <span className="font-bold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Barcode className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              {tBilingual('Printable Ticket Preview', 'প্রিন্টযোগ্য ট্যাগ প্রিভিউ')}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPrintLabel(!showPrintLabel)}
              className="h-7 text-[11px] font-bold px-2.5 cursor-pointer"
            >
              {showPrintLabel ? 'Hide Label' : 'Show Ticket'}
            </Button>
          </div>

          {showPrintLabel && (
            <div className="p-4 bg-slate-50 dark:bg-slate-950/50 flex flex-col items-center animate-in fade-in">
              <div className="w-full max-w-sm p-4 bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-xl shadow-md space-y-2.5 text-slate-900 dark:text-slate-100">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="font-black text-xs tracking-wider">INKFLOW ERP MATERIAL TICKET</div>
                  <Badge variant="outline" className="font-mono text-[9px] font-bold uppercase">
                    {purchaseUnitName}
                  </Badge>
                </div>

                <div className="text-center py-1">
                  <div className="font-mono font-black text-base tracking-wider">{generatedRollCode}</div>
                  <div className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    {selectedMaterial?.name || 'Raw Material Item'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono border-t border-b py-2">
                  <div>
                    <span className="text-slate-400 block">UNIT MEASURE:</span>
                    <strong>{unitMeasureDisplay}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">QUANTITY:</span>
                    <strong>
                      {quantityRolls} {formatUnitPlural(quantityRolls, purchaseUnitName).toUpperCase()}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">TOTAL STOCK:</span>
                    <strong>
                      {totalBatchQuantity.toLocaleString()} {consumptionUnitName.toUpperCase()}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">DESTINATION:</span>
                    <strong className="truncate block">
                      {destination === 'machine'
                        ? machineryList.find((m) => m.id === machineId)?.name || 'Machine'
                        : 'Floor Staging'}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span>DATE: {new Date().toLocaleDateString('en-GB')}</span>
                  <span>OPERATOR: {operatorName}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FIXED DEDICATED MODAL FOOTER */}
      <div className="px-5 py-3.5 bg-slate-100/90 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2.5">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-mono text-xs font-bold py-1 px-2.5">
            {quantityRolls} {formatUnitPlural(quantityRolls, purchaseUnitName)} ({totalBatchQuantity.toLocaleString()} {consumptionUnitName.toUpperCase()})
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="h-9 px-4 text-xs font-semibold cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || !materialId || isStoreShortage}
            className="h-9 px-5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md cursor-pointer gap-2"
          >
            {loading ? (
              <span>Issuing Material...</span>
            ) : (
              <>
                <Package className="h-4 w-4" />
                <span>
                  {tBilingual(
                    `Confirm Issue (${quantityRolls} ${formatUnitPlural(quantityRolls, purchaseUnitName)})`,
                    `ইস্যু নিশ্চিত করুন (${quantityRolls} ${formatUnitPlural(quantityRolls, purchaseUnitName)})`
                  )}
                </span>
                <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </ModalDialog>
  )
}

export const MaterialIssueModal = IssueMasterRollModal
export type MaterialIssueModalProps = IssueMasterRollModalProps
export const FloorIssueModal = IssueMasterRollModal
export type FloorIssueModalProps = IssueMasterRollModalProps
