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
  QrCode,
  Barcode,
  Sparkles,
  DollarSign,
  Building,
  Tag,
  Clock,
  Printer as PrintIcon,
  HelpCircle,
  ShieldCheck,
  RotateCcw,
  ArrowRight,
  Package,
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
  IssueMasterRollParams,
  IssueMasterRollResult,
} from '@/types/inventory.types'
import { formatBDT } from '@/lib/formatters'
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
  initialWidthFt?: number
  initialLengthFt?: number
  initialMachineId?: string | null
  initialMachineName?: string | null
  onSuccess?: (result: IssueMasterRollResult) => void
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
  initialWidthFt = 3,
  initialLengthFt = 164,
  initialMachineId = 'roland',
  initialMachineName,
  onSuccess,
  companyId,
}: IssueMasterRollModalProps) {
  const { locale, tBilingual } = useI18n()

  // 1. Show ALL available inventory materials (not strictly filtered)
  const availableMaterials = useMemo(() => {
    return materials.filter((m) => m && m.is_active !== false)
  }, [materials])

  // Material Selection
  const [materialId, setMaterialId] = useState<string>(() => {
    if (initialMaterialId && availableMaterials.some((m) => m.id === initialMaterialId)) {
      return initialMaterialId
    }
    return availableMaterials[0]?.id || ''
  })

  const selectedMaterial = useMemo(() => {
    return availableMaterials.find((m) => m.id === materialId) || materials.find((m) => m.id === materialId) || null
  }, [availableMaterials, materials, materialId])

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
    return getMaterialWarehouseStockBreakdown(selectedMaterial)
  }, [selectedMaterial])

  // Auto-inferred dimensions
  const widthFt = useMemo(() => {
    if (!selectedMaterial) return initialWidthFt || 3
    if (warehouseBreakdown.roll_items && warehouseBreakdown.roll_items.length > 0) {
      return warehouseBreakdown.roll_items[0].width_ft
    }
    return Number(
      selectedMaterial.roll_width_ft ||
        selectedMaterial.width ||
        (Array.isArray(selectedMaterial.available_widths_ft) && selectedMaterial.available_widths_ft.length === 1
          ? selectedMaterial.available_widths_ft[0]
          : 0) ||
        3
    )
  }, [selectedMaterial, warehouseBreakdown, initialWidthFt])

  const lengthFt = useMemo(() => {
    if (!selectedMaterial) return initialLengthFt || 164
    if (warehouseBreakdown.roll_items && warehouseBreakdown.roll_items.length > 0) {
      return warehouseBreakdown.roll_items[0].length_ft
    }
    return Number(
      selectedMaterial.standard_roll_length_ft ||
        selectedMaterial.roll_length_ft ||
        selectedMaterial.length ||
        164
    )
  }, [selectedMaterial, warehouseBreakdown, initialLengthFt])

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

  // Notes & Operator
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
      if (initialMaterialId && availableMaterials.some((m) => m.id === initialMaterialId)) {
        setMaterialId(initialMaterialId)
      } else if (availableMaterials.length > 0 && !availableMaterials.some((m) => m.id === materialId)) {
        setMaterialId(availableMaterials[0].id)
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
  }, [open, initialMaterialId, initialMachineId, availableMaterials, effectiveLocations])

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
    if (warehouseBreakdown.total_rolls > 0) {
      return warehouseBreakdown.total_rolls
    }
    if (singleUnitQuantity <= 0) return 0
    return Math.floor(currentStoreStock / singleUnitQuantity)
  }, [warehouseBreakdown, currentStoreStock, singleUnitQuantity])

  const projectedRemainingUnits = useMemo(() => {
    return Math.max(0, currentAvailablePurchaseUnits - quantityRolls)
  }, [currentAvailablePurchaseUnits, quantityRolls])

  const projectedStoreBalance = useMemo(() => {
    return currentStoreStock - totalBatchQuantity
  }, [currentStoreStock, totalBatchQuantity])

  const isStoreShortage =
    currentStoreStock < totalBatchQuantity || currentAvailablePurchaseUnits < quantityRolls

  // Robust Pricing & Total Valuation Resolver
  const { unitCostPerPurchaseUnit, costPerConsumptionUnit } = useMemo(() => {
    if (!selectedMaterial) {
      return { unitCostPerPurchaseUnit: 0, costPerConsumptionUnit: 0 }
    }

    if (warehouseBreakdown.cost_per_purchase_unit > 0 && warehouseBreakdown.cost_per_consumption_unit > 0) {
      return {
        unitCostPerPurchaseUnit: warehouseBreakdown.cost_per_purchase_unit,
        costPerConsumptionUnit: warehouseBreakdown.cost_per_consumption_unit,
      }
    }

    const explicitPerSft = Number(
      selectedMaterial.purchase_price_per_sft ||
      (selectedMaterial.material_config as any)?.purchase_price_per_sft ||
      (selectedMaterial.pricing_formula as any)?.purchase_price_per_sft ||
      (selectedMaterial.pricing_formula as any)?.material_config?.purchase_price_per_sft ||
      0
    )

    const rawCostCandidates = [
      warehouseBreakdown.cost_per_purchase_unit,
      warehouseBreakdown.cost_per_consumption_unit,
      selectedMaterial.cost_per_unit,
      selectedMaterial.average_cost,
      selectedMaterial.last_purchase_price,
      selectedMaterial.manual_cost,
      (selectedMaterial as any).purchase_price_per_sft,
      (selectedMaterial as any).unit_cost,
      (selectedMaterial as any).purchase_price,
      (selectedMaterial as any).base_cost,
      (selectedMaterial as any).cost_price,
      (selectedMaterial as any).cost,
      (selectedMaterial.material_config as any)?.purchase_price_per_sft,
      (selectedMaterial.material_config as any)?.cost_per_unit,
      (selectedMaterial.material_config as any)?.purchase_price,
      (selectedMaterial.material_config as any)?.average_cost,
      (selectedMaterial.material_config as any)?.last_purchase_price,
      (selectedMaterial.material_config as any)?.base_cost,
      (selectedMaterial.pricing_formula as any)?.material_rate,
      (selectedMaterial.pricing_formula as any)?.base_cost,
      (selectedMaterial.pricing_formula as any)?.base_rate,
      (selectedMaterial.pricing_formula as any)?.cost_breakdown?.material,
      (selectedMaterial.pricing_formula as any)?.cost_breakdown?.material_cost,
      (selectedMaterial.pricing_formula as any)?.material_config?.purchase_price,
      (selectedMaterial.pricing_formula as any)?.material_config?.purchase_price_per_sft,
      (selectedMaterial as any).cost_breakdown?.material,
      (selectedMaterial as any).cost_breakdown?.material_cost,
      (selectedMaterial as any).selling_price,
    ]

    let resolvedRaw = 0
    for (const c of rawCostCandidates) {
      const val = Number(c)
      if (!isNaN(val) && val > 0) {
        resolvedRaw = val
        break
      }
    }

    let costPerPur = 0
    let costPerCons = 0

    if (explicitPerSft > 0) {
      costPerCons = explicitPerSft
      costPerPur = Math.round(explicitPerSft * singleUnitQuantity * 100) / 100
    } else if (resolvedRaw > 0) {
      if (isRollMedia && singleUnitQuantity > 1) {
        if (resolvedRaw > 100) {
          costPerPur = resolvedRaw
          costPerCons = Math.round((resolvedRaw / singleUnitQuantity) * 100) / 100
        } else {
          costPerCons = resolvedRaw
          costPerPur = Math.round(resolvedRaw * singleUnitQuantity * 100) / 100
        }
      } else if (isRigidSheet && singleUnitQuantity > 1) {
        if (resolvedRaw > 150) {
          costPerPur = resolvedRaw
          costPerCons = Math.round((resolvedRaw / singleUnitQuantity) * 100) / 100
        } else {
          costPerCons = resolvedRaw
          costPerPur = Math.round(resolvedRaw * singleUnitQuantity * 100) / 100
        }
      } else if (isPackBox && singleUnitQuantity > 1) {
        if (resolvedRaw > 50) {
          costPerPur = resolvedRaw
          costPerCons = Math.round((resolvedRaw / singleUnitQuantity) * 100) / 100
        } else {
          costPerCons = resolvedRaw
          costPerPur = Math.round(resolvedRaw * singleUnitQuantity * 100) / 100
        }
      } else {
        costPerPur = resolvedRaw
        costPerCons = singleUnitQuantity > 1 ? Math.round((resolvedRaw / singleUnitQuantity) * 100) / 100 : resolvedRaw
      }
    }

    return {
      unitCostPerPurchaseUnit: costPerPur,
      costPerConsumptionUnit: costPerCons,
    }
  }, [selectedMaterial, warehouseBreakdown, singleUnitQuantity, isRollMedia, isRigidSheet, isPackBox])

  const totalValuation = useMemo(() => {
    return Math.round(unitCostPerPurchaseUnit * quantityRolls * 100) / 100
  }, [unitCostPerPurchaseUnit, quantityRolls])

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
        notes:
          notes.trim() ||
          `Requisitioned ${quantityRolls} ${formatUnitPlural(quantityRolls, purchaseUnitName)} for Print Floor`,
        unit_cost: costPerConsumptionUnit > 0 ? costPerConsumptionUnit : (singleUnitQuantity > 0 ? Math.round((unitCostPerPurchaseUnit / singleUnitQuantity) * 100) / 100 : unitCostPerPurchaseUnit),
      }

      const res = await issueMasterRollsBatchAction(payload, companyId)

      if (!res.success || !res.data) {
        setError(res.error || 'Failed to issue material to floor.')
        return
      }

      const result = res.data
      setSuccess(
        `Successfully issued ${quantityRolls} ${formatUnitPlural(quantityRolls, purchaseUnitName)} (${result.total_area_sft || totalBatchQuantity} ${consumptionUnitName.toUpperCase()}, ${formatBDT(totalValuation)}) to Print Floor!`
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
      size="3xl"
      hideFooter={true}
      title={
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shrink-0">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <div className="text-base font-bold text-slate-900 dark:text-white leading-tight">
              {tBilingual(
                'Issue / Requisition materials to Print Floor',
                'প্রিন্ট ফ্লোরে কাঁচামাল ইস্যু ও বরাদ্দ'
              )}
            </div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {tBilingual(
                'Directly requisition and issue raw materials or roll substrates from warehouse stock to machines or staging.',
                'গুদাম স্টক থেকে সরাসরি প্রিন্টিং মেশিনে কাঁচামাল বা মাস্টার রোল বরাদ্দ ও মাউন্ট করুন।'
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
        {/* STEP 1: SUBSTRATE MATERIAL & SOURCE WAREHOUSE */}
        {/* ========================================================= */}
        <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="font-bold text-xs uppercase text-slate-700 dark:text-slate-300 tracking-wider flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              1. {tBilingual('Material Substrate & Warehouse Source', 'কাঁচামাল ও সোর্স গুদাম')}
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
                Store Stock: {warehouseBreakdown.purchase_unit_display} • {currentStoreStock.toLocaleString()}{' '}
                {consumptionUnitName.toUpperCase()} Available
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Substrate Select (Shows ALL Available Materials) */}
            <div>
              <Label className="text-xs font-semibold mb-1.5 flex items-center justify-between">
                <span>
                  {tBilingual('Inventory Material Item', 'গুদামের কাঁচামাল')}{' '}
                  <span className="text-rose-500">*</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  ({availableMaterials.length} Available Materials)
                </span>
              </Label>
              <select
                value={materialId}
                onChange={(e) => setMaterialId(e.target.value)}
                className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium focus:ring-2 focus:ring-blue-500 shadow-2xs"
                required
              >
                <option value="">-- Select Inventory Material --</option>
                {availableMaterials.map((m) => {
                  const bd = getMaterialWarehouseStockBreakdown(m)
                  return (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.sku || 'No SKU'}) — {bd.purchase_unit_display} ({m.current_stock} {m.unit})
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
        {/* STEP 2: REQUISITION QUANTITY & DESTINATION */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Multi-Unit Quantity in Purchase Units */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold block">
                {tBilingual(
                  `Requisition Quantity (${purchaseUnitName.toUpperCase()})`,
                  `ইস্যুকৃত পরিমাণ (${purchaseUnitName})`
                )}
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

          {/* Machine Mount or Floor Staging */}
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
        {/* STEP 3: SMART IDENTIFIER TAG AUTO-GENERATOR */}
        {/* ========================================================= */}
        <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-200 dark:border-indigo-900/60 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span className="font-bold text-xs text-indigo-950 dark:text-indigo-200">
                {tBilingual('Auto-Generated Identifier Tag', 'স্বয়ংক্রিয় ট্র্যাকিং ট্যাগ আইডি')}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvancedTag(!showAdvancedTag)}
              className="h-6 text-[11px] text-indigo-700 dark:text-indigo-300 font-semibold px-2 cursor-pointer"
            >
              {showAdvancedTag ? 'Hide Custom Lot' : 'Customize Lot / Tag'}
            </Button>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Badge className="bg-indigo-600 text-white font-mono text-xs px-3 py-1 font-bold shadow-xs">
              {generatedRollCode}
              {quantityRolls > 1 && ` (to ...-${String(quantityRolls).padStart(2, '0')})`}
            </Badge>
            <span className="text-[11px] text-slate-500 font-medium font-mono">
              Unit Rate: {formatBDT(unitCostPerPurchaseUnit)} / {purchaseUnitName}
              {costPerConsumptionUnit > 0 && ` (${formatBDT(costPerConsumptionUnit)} / ${consumptionUnitName.toUpperCase()})`}
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
        {/* STEP 4: LIVE TELEMETRY, VALUATION & STORE IMPACT */}
        {/* ========================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <Card className="p-3 bg-white dark:bg-slate-900 border shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Unit Size / Measure</span>
            <span className="text-sm font-black text-slate-900 dark:text-white font-mono truncate block" title={unitMeasureDisplay}>
              {unitMeasureDisplay}
            </span>
            <span className="text-[10px] text-slate-500 block">per {purchaseUnitName}</span>
          </Card>

          <Card className="p-3 bg-white dark:bg-slate-900 border shadow-xs">
            <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 block">
              Requisition Batch
            </span>
            <span className="text-sm font-black text-blue-600 dark:text-blue-400 font-mono">
              {quantityRolls} {formatUnitPlural(quantityRolls, purchaseUnitName)}
            </span>
            <span className="text-[10px] text-slate-500 block">
              {totalBatchQuantity.toLocaleString()} {consumptionUnitName.toUpperCase()} total
            </span>
          </Card>

          <Card className="p-3 bg-white dark:bg-slate-900 border shadow-xs">
            <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">
              Total Valuation
            </span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {formatBDT(totalValuation)}
            </span>
            <span className="text-[10px] text-slate-500 block">
              @{formatBDT(unitCostPerPurchaseUnit)} / {purchaseUnitName}
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
            <span className="text-[10px] text-slate-500 block">
              {isStoreShortage ? `⚠️ Stock Shortage (${Math.abs(projectedStoreBalance).toLocaleString()} ${consumptionUnitName.toUpperCase()} deficit)` : `Remaining in ${sourceLocationName}`}
            </span>
          </Card>
        </div>

        {/* ========================================================= */}
        {/* STEP 5: PRINTABLE INDUSTRIAL TAG PREVIEW */}
        {/* ========================================================= */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
          <div className="p-3 bg-slate-100 dark:bg-slate-800/80 flex items-center justify-between">
            <span className="font-bold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Barcode className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              {tBilingual('Printable Industrial Physical Tag Preview', 'প্রিন্টযোগ্য ট্যাগ / বারকোড প্রিভিউ')}
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

        {/* Operator & Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <Label className="text-xs font-semibold mb-1 block">Requisitioned By / Operator</Label>
            <Input
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              placeholder="Operator Name"
              className="h-9 text-xs font-medium"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1 block">Requisition Notes / Job Reference</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Urgent run for Job #1042"
              className="h-9 text-xs font-medium"
            />
          </div>
        </div>
      </div>

      {/* FIXED DEDICATED MODAL FOOTER */}
      <div className="px-5 py-3.5 bg-slate-100/90 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2.5">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-mono text-xs font-bold py-1 px-2.5">
            {quantityRolls} {formatUnitPlural(quantityRolls, purchaseUnitName)} ({totalBatchQuantity.toLocaleString()} {consumptionUnitName.toUpperCase()})
          </Badge>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
            {formatBDT(totalValuation)}
          </span>
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
