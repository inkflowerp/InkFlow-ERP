'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Boxes,
  DollarSign,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  HelpCircle,
  Building,
  Plus,
  Trash2,
  Check,
  RefreshCw,
  Maximize2,
  Calculator,
  Percent,
  TrendingUp,
  Tag,
  Warehouse,
  FileText,
  Info,
} from 'lucide-react'
import type { ProductRecord, MaterialConfiguration, UnitOfMeasure } from '@/types/product.types'
import type { ProductCategoryRecord } from '@/types/category.types'
import { formatBDT } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface MaterialConfigModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (materialData: Partial<ProductRecord>) => Promise<void>
  initialData?: ProductRecord | null
  categories?: ProductCategoryRecord[]
}

const COMMON_PURCHASE_UNITS: { value: string; label: string; defaultType: 'roll' | 'sheet' | 'liquid' | 'rigid' | 'accessory' }[] = [
  { value: 'roll', label: 'Continuous Roll (রোল - Media Substrate)', defaultType: 'roll' },
  { value: 'sheet', label: 'Rigid Sheet / Board (শীট / বোর্ড)', defaultType: 'sheet' },
  { value: 'bottle', label: 'Bottle / Can (বোতল - Ink/Chemical)', defaultType: 'liquid' },
  { value: 'liter', label: 'Liter (লিটার)', defaultType: 'liquid' },
  { value: 'box', label: 'Box / Pack (বক্স / প্যাকেট)', defaultType: 'accessory' },
  { value: 'piece', label: 'Piece (পিস)', defaultType: 'accessory' },
  { value: 'kg', label: 'Kilogram (কেজি)', defaultType: 'rigid' },
  { value: 'meter', label: 'Meter (মিটার)', defaultType: 'rigid' },
]

const COMMON_USAGE_UNITS: { value: UnitOfMeasure; label: string }[] = [
  { value: 'sft', label: 'Square Feet (sft) — স্কয়ার ফিট' },
  { value: 'sqin', label: 'Square Inch (sqin) — স্কয়ার ইঞ্চি' },
  { value: 'sqm', label: 'Square Meter (sqm) — বর্গমিটার' },
  { value: 'piece', label: 'Piece (পিস) — একক সংখ্যা' },
  { value: 'liter', label: 'Liter / ML (লিটার/মিলি)' },
  { value: 'rft', label: 'Running Feet (rft) — দৈর্ঘ্য' },
  { value: 'kg', label: 'Kilogram (কেজি)' },
]

export function MaterialConfigModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  categories = [],
}: MaterialConfigModalProps) {
  // 1. Material Identity
  const [name, setName] = useState('')
  const [nameBn, setNameBn] = useState('')
  const [sku, setSku] = useState('')
  const [category, setCategory] = useState('materials')
  const [materialType, setMaterialType] = useState<'roll' | 'sheet' | 'liquid' | 'rigid' | 'hardware' | 'accessory'>('roll')
  const [isActive, setIsActive] = useState(true)
  const [description, setDescription] = useState('')

  // 2. Measurement & Physical Dimensions
  const [purchaseUnit, setPurchaseUnit] = useState('roll')
  const [usageUnit, setUsageUnit] = useState<UnitOfMeasure>('sft')
  const [dimensionUnit, setDimensionUnit] = useState<'ft' | 'inch' | 'mm' | 'm'>('ft')
  
  // Roll Geometry
  const [availableWidths, setAvailableWidths] = useState<number[]>([10])
  const [standardRollLength, setStandardRollLength] = useState<number | string>(164)
  const [extraWidthAllowance, setExtraWidthAllowance] = useState<number | string>(0.25)
  const [newWidthInput, setNewWidthInput] = useState<string>('10')

  // Sheet Geometry
  const [availableSheetSizes, setAvailableSheetSizes] = useState<Array<{ width: number; length: number; label?: string }>>([
    { width: 4, length: 8, label: '4ft × 8ft' },
  ])
  const [newSheetWidthInput, setNewSheetWidthInput] = useState<string>('4')
  const [newSheetLengthInput, setNewSheetLengthInput] = useState<string>('8')
  const [thicknessMm, setThicknessMm] = useState<number | ''>('')

  // Liquid & Accessory Specs
  const [packQuantity, setPackQuantity] = useState<number | ''>(1000)
  const [liquidVolumeMl, setLiquidVolumeMl] = useState<number | ''>(1000)

  // 3. Purchasing, Costing & Reorder (Direct SFT & Package Rate)
  const [purchasePricePerSft, setPurchasePricePerSft] = useState<number | ''>('')
  const [purchasePrice, setPurchasePrice] = useState<number | ''>('')
  const [wastePercent, setWastePercent] = useState<number>(5)
  const [reorderLevel, setReorderLevel] = useState<number>(5)
  const [storageLocation, setStorageLocation] = useState('Main Store - Media Rack')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Derived total package area or count
  // Derived total package area or count
  const totalUnitArea = useMemo(() => {
    if (materialType === 'roll' || purchaseUnit === 'roll') {
      const parsedInput = parseFloat(newWidthInput)
      const currentW = !isNaN(parsedInput) && parsedInput > 0
        ? parsedInput
        : (availableWidths.length > 0 ? availableWidths[0] : 10)
      const parsedAllowance = typeof extraWidthAllowance === 'number' ? extraWidthAllowance : (parseFloat(extraWidthAllowance) || 0)
      const allowance = isNaN(parsedAllowance) || parsedAllowance < 0 ? 0 : parsedAllowance
      const effectiveW = currentW + allowance
      const parsedLen = typeof standardRollLength === 'number' ? standardRollLength : (parseFloat(standardRollLength) || 164)
      return Number((effectiveW * parsedLen).toFixed(2))
    }
    if (materialType === 'sheet' || purchaseUnit === 'sheet') {
      const parsedW = parseFloat(newSheetWidthInput)
      const parsedL = parseFloat(newSheetLengthInput)
      const firstSheet = availableSheetSizes[0] || {
        width: !isNaN(parsedW) && parsedW > 0 ? parsedW : 4,
        length: !isNaN(parsedL) && parsedL > 0 ? parsedL : 8,
      }
      return (firstSheet.width || 4) * (firstSheet.length || 8)
    }
    if (purchaseUnit === 'box' || purchaseUnit === 'pack') {
      return Number(packQuantity) || 1000
    }
    return 1
  }, [materialType, purchaseUnit, availableWidths, newWidthInput, extraWidthAllowance, standardRollLength, availableSheetSizes, newSheetWidthInput, newSheetLengthInput, packQuantity])

  useEffect(() => {
    if (initialData && isOpen) {
      setName(initialData.name || '')
      setNameBn(initialData.name_bn || '')
      setSku(initialData.sku || '')
      setCategory(initialData.category || 'materials')
      setIsActive(initialData.is_active !== false)
      setDescription(initialData.description || '')
      setPurchaseUnit(initialData.purchase_unit || 'roll')

      const matCfg: MaterialConfiguration = initialData.material_config || {}
      setMaterialType(matCfg.material_type || (initialData.purchase_unit === 'roll' ? 'roll' : initialData.purchase_unit === 'sheet' ? 'sheet' : 'roll'))
      
      const stdLen = matCfg.standard_roll_length_ft || initialData.standard_roll_length_ft || 164
      const widths = matCfg.available_widths_ft || initialData.available_widths_ft || [10]
      const sheets = matCfg.available_sheet_sizes || [
        { width: 4, length: 8, label: '4ft × 8ft' },
      ]
      setStandardRollLength(stdLen)
      setAvailableWidths(widths)
      if (widths.length > 0) {
        setNewWidthInput(widths[widths.length - 1].toString())
      }
      setAvailableSheetSizes(sheets)
      if (sheets.length > 0) {
        setNewSheetWidthInput(sheets[sheets.length - 1].width.toString())
        setNewSheetLengthInput(sheets[sheets.length - 1].length.toString())
      }
      setExtraWidthAllowance(matCfg.extra_width_allowance_ft ?? (initialData.production_width_allowance ?? 0.25))
      setUsageUnit((matCfg.usage_unit as any) || initialData.unit || 'sft')
      setWastePercent(matCfg.waste_percent ?? (initialData.default_wastage_percentage ?? 5))
      setReorderLevel(matCfg.reorder_level || initialData.min_order_quantity || 5)
      setThicknessMm(matCfg.thickness_mm || '')
      setStorageLocation(matCfg.storage_location || 'Main Store - Media Rack')
      setPackQuantity(matCfg.pack_quantity || 1000)

      // Calculate initial purchase price and purchase price per SFT
      const parsedStdLen = typeof stdLen === 'number' ? stdLen : (parseFloat(stdLen) || 164)
      const rawAllowance = matCfg.extra_width_allowance_ft ?? (initialData.production_width_allowance ?? 0.25)
      const parsedAllowance = typeof rawAllowance === 'number' ? rawAllowance : (parseFloat(rawAllowance) || 0)
      const allowance = isNaN(parsedAllowance) || parsedAllowance < 0 ? 0 : parsedAllowance
      const currentW = widths.length > 0 ? widths[widths.length - 1] : 10
      const effectiveW = currentW + allowance
      const area = (matCfg.material_type === 'sheet' || initialData.purchase_unit === 'sheet')
        ? ((sheets[0]?.width || 4) * (sheets[0]?.length || 8))
        : Number((effectiveW * parsedStdLen).toFixed(2))

      const rawPurPrice = initialData.purchase_price || matCfg.purchase_price || ''
      const rawBaseCost = initialData.base_cost || matCfg.effective_unit_cost || ''

      if (rawPurPrice !== '' && Number(rawPurPrice) > 0) {
        setPurchasePrice(rawPurPrice)
        if (area > 0) {
          setPurchasePricePerSft(Number((Number(rawPurPrice) / area).toFixed(2)))
        }
      } else if (rawBaseCost !== '' && Number(rawBaseCost) > 0) {
        setPurchasePricePerSft(rawBaseCost)
        setPurchasePrice(Number((Number(rawBaseCost) * area).toFixed(2)))
      } else {
        setPurchasePrice('')
        setPurchasePricePerSft('')
      }
    } else {
      setName('')
      setNameBn('')
      setSku(`MAT-${Date.now().toString().slice(-5)}`)
      setCategory('materials')
      setMaterialType('roll')
      setIsActive(true)
      setDescription('')
      setPurchaseUnit('roll')
      setPurchasePrice('')
      setPurchasePricePerSft('')
      setStandardRollLength(164)
      setAvailableWidths([10])
      setNewWidthInput('10')
      setAvailableSheetSizes([
        { width: 4, length: 8, label: '4ft × 8ft' },
      ])
      setNewSheetWidthInput('4')
      setNewSheetLengthInput('8')
      setExtraWidthAllowance(0.25)
      setUsageUnit('sft')
      setWastePercent(5)
      setReorderLevel(5)
      setThicknessMm('')
      setStorageLocation('Main Store - Media Rack')
      setPackQuantity(1000)
      setLiquidVolumeMl(1000)
    }
    setErrorMessage(null)
  }, [initialData, isOpen])

  // Two-way interactive price syncing
  const handlePricePerSftChange = (val: string) => {
    if (val === '') {
      setPurchasePricePerSft('')
      setPurchasePrice('')
      return
    }
    const num = parseFloat(val)
    setPurchasePricePerSft(isNaN(num) ? '' : num)
    if (!isNaN(num) && totalUnitArea > 0) {
      setPurchasePrice(Number((num * totalUnitArea).toFixed(2)))
    }
  }

  const handleTotalPurchasePriceChange = (val: string) => {
    if (val === '') {
      setPurchasePrice('')
      setPurchasePricePerSft('')
      return
    }
    const num = parseFloat(val)
    setPurchasePrice(isNaN(num) ? '' : num)
    if (!isNaN(num) && totalUnitArea > 0) {
      setPurchasePricePerSft(Number((num / totalUnitArea).toFixed(2)))
    }
  }

  // Roll Width Handlers
  const handleAddCustomWidth = () => {
    const val = parseFloat(newWidthInput)
    const parsedLen = typeof standardRollLength === 'number' ? standardRollLength : (parseFloat(standardRollLength) || 164)
    const parsedAllowance = typeof extraWidthAllowance === 'number' ? extraWidthAllowance : (parseFloat(extraWidthAllowance) || 0)
    const allowance = isNaN(parsedAllowance) || parsedAllowance < 0 ? 0 : parsedAllowance
    if (!isNaN(val) && val > 0) {
      if (!availableWidths.includes(val)) {
        const nextWidths = [...availableWidths, val].sort((a, b) => a - b)
        setAvailableWidths(nextWidths)
        if (purchasePricePerSft !== '' && Number(purchasePricePerSft) > 0) {
          const effectiveW = val + allowance
          setPurchasePrice(Number((Number(purchasePricePerSft) * effectiveW * parsedLen).toFixed(2)))
        }
      }
    }
  }

  const handleRemoveWidth = (w: number) => {
    const nextWidths = availableWidths.filter((x) => x !== w)
    const parsedLen = typeof standardRollLength === 'number' ? standardRollLength : (parseFloat(standardRollLength) || 164)
    const parsedAllowance = typeof extraWidthAllowance === 'number' ? extraWidthAllowance : (parseFloat(extraWidthAllowance) || 0)
    const allowance = isNaN(parsedAllowance) || parsedAllowance < 0 ? 0 : parsedAllowance
    setAvailableWidths(nextWidths)
    if (purchasePricePerSft !== '' && Number(purchasePricePerSft) > 0 && nextWidths.length > 0) {
      const activeW = parseFloat(newWidthInput)
      const currentW = nextWidths.includes(activeW) ? activeW : nextWidths[0]
      setNewWidthInput(currentW.toString())
      const effectiveW = currentW + allowance
      setPurchasePrice(Number((Number(purchasePricePerSft) * effectiveW * parsedLen).toFixed(2)))
    }
  }

  // Sheet Size Handlers
  const handleAddCustomSheetSize = () => {
    const w = parseFloat(newSheetWidthInput)
    const l = parseFloat(newSheetLengthInput)
    if (!isNaN(w) && w > 0 && !isNaN(l) && l > 0) {
      const exists = availableSheetSizes.some((x) => x.width === w && x.length === l)
      if (!exists) {
        const nextSheets = [...availableSheetSizes, { width: w, length: l, label: `${w}ft × ${l}ft` }]
        setAvailableSheetSizes(nextSheets)
        if (purchasePricePerSft !== '' && Number(purchasePricePerSft) > 0) {
          const firstSheet = nextSheets[0] || { width: w, length: l }
          setPurchasePrice(Number((Number(purchasePricePerSft) * firstSheet.width * firstSheet.length).toFixed(2)))
        }
      }
    }
  }

  const handleRemoveSheetSize = (index: number) => {
    const nextSheets = availableSheetSizes.filter((_, i) => i !== index)
    setAvailableSheetSizes(nextSheets)
    if (purchasePricePerSft !== '' && Number(purchasePricePerSft) > 0 && nextSheets.length > 0) {
      const firstSheet = nextSheets[0]
      setPurchasePrice(Number((Number(purchasePricePerSft) * firstSheet.width * firstSheet.length).toFixed(2)))
    }
  }

  // Real-Time Cost Economics Calculations
  const calculatedEconomics = useMemo(() => {
    const perSftCost = Number(purchasePricePerSft) || 0
    const totalPkgCost = Number(purchasePrice) || 0

    if (perSftCost <= 0 && totalPkgCost <= 0) {
      return {
        unitCost: 0,
        effectiveCost: 0,
        yieldLabel: '0 sft',
        formulaText: 'Enter Purchase Price (Sft) or Total Package Price to calculate unit cost',
      }
    }

    if (materialType === 'roll' || purchaseUnit === 'roll') {
      const parsedInput = parseFloat(newWidthInput)
      const currentW = !isNaN(parsedInput) && parsedInput > 0
        ? parsedInput
        : (availableWidths.length > 0 ? availableWidths[0] : 10)
      const parsedLen = typeof standardRollLength === 'number' ? standardRollLength : (parseFloat(standardRollLength) || 164)
      const parsedAllowance = typeof extraWidthAllowance === 'number' ? extraWidthAllowance : (parseFloat(extraWidthAllowance) || 0)
      const allowance = isNaN(parsedAllowance) || parsedAllowance < 0 ? 0 : parsedAllowance

      // Nominal Area (WITHOUT extra allowance) -> Usable & Sellable square footage for active roll width
      const nominalRollArea = Number((currentW * parsedLen).toFixed(2))

      // Physical Area (WITH extra allowance) -> Purchased substrate package area for active roll width
      const effectiveW = currentW + allowance
      const physicalRollArea = Number((effectiveW * parsedLen).toFixed(2))

      // Effective Package Cost for active roll width
      const effectivePkgCost = perSftCost > 0
        ? Number((perSftCost * physicalRollArea).toFixed(2))
        : (totalPkgCost > 0 ? totalPkgCost : 0)

      // Direct Base Cost (৳ / SFT) calculated WITHOUT extra allowance:
      // Package Cost divided by Nominal Usable Area
      const baseUnitCost = nominalRollArea > 0 && effectivePkgCost > 0
        ? effectivePkgCost / nominalRollArea
        : (perSftCost > 0 ? perSftCost : 0)

      const effCost = baseUnitCost * (1 + (wastePercent || 0) / 100)

      return {
        unitCost: baseUnitCost,
        effectiveCost: effCost,
        yieldLabel: `${nominalRollArea.toLocaleString()} sft (${currentW}ft × ${parsedLen}ft roll)`,
        formulaText: effectivePkgCost > 0 && nominalRollArea > 0
          ? `৳${effectivePkgCost.toLocaleString()} (${currentW}ft roll) ÷ ${nominalRollArea.toLocaleString()} sft (nominal yield) = ৳${baseUnitCost.toFixed(2)}/sft (+ ${wastePercent}% waste = ৳${effCost.toFixed(2)}/sft)`
          : `৳${baseUnitCost.toFixed(2)}/sft × ${nominalRollArea.toLocaleString()} sft = ৳${(baseUnitCost * nominalRollArea).toFixed(0)}/roll (+ ${wastePercent}% waste = ৳${effCost.toFixed(2)}/sft)`,
      }
    }

    const baseUnitCost = perSftCost > 0 ? perSftCost : (totalUnitArea > 0 ? totalPkgCost / totalUnitArea : 0)
    const effCost = baseUnitCost * (1 + (wastePercent || 0) / 100)

    if (materialType === 'sheet' || purchaseUnit === 'sheet') {
      const firstSheet = availableSheetSizes[0] || { width: 4, length: 8 }
      const sheetArea = firstSheet.width * firstSheet.length
      return {
        unitCost: baseUnitCost,
        effectiveCost: effCost,
        yieldLabel: `${sheetArea} sft (${firstSheet.width}ft × ${firstSheet.length}ft)`,
        formulaText: `৳${baseUnitCost.toFixed(2)}/sft × ${sheetArea} sft = ৳${(baseUnitCost * sheetArea).toFixed(0)}/sheet (+ ${wastePercent}% waste = ৳${effCost.toFixed(2)}/sft)`,
      }
    }

    if (purchaseUnit === 'box' || purchaseUnit === 'pack') {
      const count = Number(packQuantity) || 1000
      return {
        unitCost: baseUnitCost,
        effectiveCost: effCost,
        yieldLabel: `${count.toLocaleString()} pcs / ${purchaseUnit}`,
        formulaText: `৳${(baseUnitCost * count).toFixed(0)} ÷ ${count.toLocaleString()} pcs = ৳${baseUnitCost.toFixed(2)}/pc`,
      }
    }

    // Default 1:1
    return {
      unitCost: baseUnitCost,
      effectiveCost: effCost,
      yieldLabel: `1 ${usageUnit}`,
      formulaText: `৳${baseUnitCost.toFixed(2)} per ${usageUnit}`,
    }
  }, [purchasePricePerSft, purchasePrice, totalUnitArea, materialType, purchaseUnit, availableWidths, newWidthInput, extraWidthAllowance, standardRollLength, availableSheetSizes, wastePercent, packQuantity, usageUnit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrorMessage('Material name is required.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const pp = purchasePrice !== '' ? Number(purchasePrice) : 0
      const baseDirectCost = calculatedEconomics.unitCost > 0 ? Number(calculatedEconomics.unitCost.toFixed(2)) : (pp > 0 ? pp : 0)
      
      const parsedInput = parseFloat(newWidthInput)
      const finalWidths = availableWidths.length > 0 
        ? availableWidths 
        : (!isNaN(parsedInput) && parsedInput > 0 ? [parsedInput] : [10])

      const parsedAllowance = typeof extraWidthAllowance === 'number' ? extraWidthAllowance : parseFloat(extraWidthAllowance)
      const finalAllowance = isNaN(parsedAllowance) ? 0.25 : parsedAllowance

      const parsedLength = typeof standardRollLength === 'number' ? standardRollLength : parseFloat(standardRollLength)
      const finalLength = isNaN(parsedLength) || parsedLength <= 0 ? 164 : parsedLength

      const materialConfig: MaterialConfiguration = {
        material_type: materialType,
        available_widths_ft: (materialType === 'roll' || purchaseUnit === 'roll') ? finalWidths : undefined,
        standard_roll_length_ft: (materialType === 'roll' || purchaseUnit === 'roll') ? finalLength : undefined,
        available_sheet_sizes: (materialType === 'sheet' || purchaseUnit === 'sheet') ? availableSheetSizes : undefined,
        extra_width_allowance_ft: (materialType === 'roll' || purchaseUnit === 'roll') ? finalAllowance : undefined,
        purchase_unit: purchaseUnit,
        purchase_price: pp,
        usage_unit: usageUnit,
        waste_percent: wastePercent,
        effective_unit_cost: calculatedEconomics.effectiveCost,
        thickness_mm: thicknessMm !== '' ? Number(thicknessMm) : undefined,
        storage_location: storageLocation.trim() || undefined,
        pack_quantity: (purchaseUnit === 'box' || purchaseUnit === 'pack') ? Number(packQuantity) || 1000 : undefined,
        reorder_level: reorderLevel,
      }

      await onSave({
        name: name.trim(),
        name_bn: nameBn.trim() || undefined,
        sku: sku.trim() || `MAT-${Date.now().toString().slice(-5)}`,
        category: category || 'materials',
        product_type: 'material',
        entity_type: 'material',
        commercial_type: 'material',
        is_service: false,
        is_ready_product: false,
        unit: usageUnit,
        selling_unit: usageUnit,
        purchase_unit: purchaseUnit,
        purchase_price: pp,
        base_cost: baseDirectCost,
        selling_price: 0,
        default_wastage_percentage: wastePercent,
        target_margin_percentage: 35.0,
        min_allowed_margin_percent: 15.0,
        pricing_method: 'per_piece',
        cost_basis_type: 'direct_cost',
        is_active: isActive,
        description: description.trim() || undefined,
        available_widths_ft: (materialType === 'roll' || purchaseUnit === 'roll') ? finalWidths : undefined,
        standard_roll_length_ft: (materialType === 'roll' || purchaseUnit === 'roll') ? finalLength : undefined,
        production_width_allowance: (materialType === 'roll' || purchaseUnit === 'roll') ? finalAllowance : undefined,
        material_config: materialConfig,
        requires_production: false,
      })
      onClose()
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save material configuration.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ModalDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      size="5xl"
      title={
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-600/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 font-bold shrink-0">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900 dark:text-white">
                {initialData ? `Edit Material: ${initialData.name}` : 'New Raw Material Master'}
              </span>
              <Badge variant="outline" className="text-[10px] uppercase font-mono py-0.5 px-1.5 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300">
                Inventory Stock
              </Badge>
              <Badge variant="outline" className="text-[10px] uppercase font-mono py-0.5 px-1.5 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300">
                {materialType.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Purchased raw printing substrate & consumables tracked by physical dimensions and consumed in production.
            </p>
          </div>
        </div>
      }
      hideFooter={true}
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1">
        {errorMessage && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2 font-medium shadow-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ======================================================== */}
        {/* SECTION 1: MATERIAL IDENTITY & PHYSICAL FORM */}
        {/* ======================================================== */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300 flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Material Identity & Physical Classification
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Bilingual naming & substrate category</span>
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Material Name (English) <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="e.g. Star Frontlit Flex Banner 280 GSM, Glossy Self-Adhesive Vinyl 100 Micron..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-9 text-xs font-medium"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col justify-between">
                <div className="h-6 flex items-center mb-1">
                  <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    Bengali Name (বাংলা নাম - ঐচ্ছিক)
                  </Label>
                </div>
                <Input
                  placeholder="যেমন: স্টার ফ্রন্টলিট ফ্লেক্স ব্যানার"
                  value={nameBn}
                  onChange={(e) => setNameBn(e.target.value)}
                  className="h-9 text-xs font-bengali"
                />
              </div>

              <div className="flex flex-col justify-between">
                <div className="h-6 flex items-center mb-1">
                  <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    Material SKU / Stock Code
                  </Label>
                </div>
                <Input
                  placeholder="e.g. MAT-FLEX-STAR-280"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="h-9 text-xs font-mono uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col justify-between">
                <div className="h-6 flex items-center mb-1">
                  <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    Physical Form / Classification <span className="text-rose-500">*</span>
                  </Label>
                </div>
                <select
                  value={materialType}
                  onChange={(e) => {
                    const t = e.target.value as any
                    setMaterialType(t)
                    if (t === 'roll') {
                      setPurchaseUnit('roll')
                      setUsageUnit('sft')
                    } else if (t === 'sheet') {
                      setPurchaseUnit('sheet')
                      setUsageUnit('sft')
                    } else if (t === 'liquid') {
                      setPurchaseUnit('bottle')
                      setUsageUnit('liter')
                    } else if (t === 'accessory') {
                      setPurchaseUnit('box')
                      setUsageUnit('piece')
                    }
                  }}
                  className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-medium"
                >
                  <option value="roll">Continuous Roll Media (Vinyl, Flex, Paper, Canvas)</option>
                  <option value="sheet">Rigid Sheet / Board (PVC Board, Acrylic, Foam Board)</option>
                  <option value="liquid">Liquid Consumable (Solvent / UV / Dye Ink, Cleaning Fluid)</option>
                  <option value="rigid">Framing & Metal Profile (MS Pipe, Aluminum Channel)</option>
                  <option value="accessory">Hardware & Accessory (Eyelet, Double Tape, Standee, Rope)</option>
                </select>
              </div>

              <div className="flex flex-col justify-between">
                <div className="h-6 flex items-center mb-1">
                  <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    Catalog Category
                  </Label>
                </div>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-medium"
                >
                  <option value="materials">Raw Materials & Substrates</option>
                  <option value="roll_media">Roll Media</option>
                  <option value="rigid_sheets">Rigid Sheets & Boards</option>
                  <option value="inks">Inks & Chemical Consumables</option>
                  <option value="hardware_stock">Hardware & Fabrication Stock</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.slug || c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Technical Specification & Description
              </Label>
              <textarea
                rows={2}
                placeholder="e.g. 280 GSM heavy duty PVC substrate, matte finish, solvent/eco-solvent compatible, 1-year outdoor UV resistance..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-blue-500 outline-none resize-none"
              />
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SECTION 2: MEASUREMENT UNITS & PHYSICAL DIMENSIONS */}
        {/* ======================================================== */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Measurement Units & Physical Dimensions
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Purchase units, roll widths & sheet boards</span>
          </div>

          <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-xl space-y-3.5">
            {/* Units Selection Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col justify-between">
                <div className="h-6 flex items-center mb-1">
                  <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    Purchase Unit (ক্রয় একক) <span className="text-rose-500">*</span>
                  </Label>
                </div>
                <select
                  value={purchaseUnit}
                  onChange={(e) => {
                    const u = e.target.value
                    setPurchaseUnit(u)
                    const match = COMMON_PURCHASE_UNITS.find((x) => x.value === u)
                    if (match) setMaterialType(match.defaultType)
                  }}
                  className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-medium"
                >
                  {COMMON_PURCHASE_UNITS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col justify-between">
                <div className="h-6 flex items-center mb-1">
                  <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    Usage Unit (খরচ হিসাব একক) <span className="text-rose-500">*</span>
                  </Label>
                </div>
                <select
                  value={usageUnit}
                  onChange={(e) => setUsageUnit(e.target.value as any)}
                  className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-medium"
                >
                  {COMMON_USAGE_UNITS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col justify-between">
                <div className="h-6 flex items-center mb-1">
                  <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    Dimension Unit (পরিমাপ একক)
                  </Label>
                </div>
                <select
                  value={dimensionUnit}
                  onChange={(e) => setDimensionUnit(e.target.value as any)}
                  className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-medium"
                >
                  <option value="ft">Feet (ft) — Standard Media</option>
                  <option value="inch">Inches (in)</option>
                  <option value="mm">Millimeters (mm)</option>
                  <option value="m">Meters (m)</option>
                </select>
              </div>
            </div>

            {/* Geometry Case A: Roll Physical Dimensions: Roll Width [ ] + [ ]    Roll Length [ ]  Add */}
            {(materialType === 'roll' || purchaseUnit === 'roll') && (
              <div className="pt-3 border-t border-blue-200/60 dark:border-blue-800/60 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  {/* Roll Width [ ] + [ ] */}
                  <div className="sm:col-span-6">
                    <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                      Roll Width (Feet) + Extra Allowance
                    </Label>
                    <div className="flex items-center gap-1.5">
                      <div className="relative flex-1">
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="e.g. 10"
                          value={newWidthInput}
                          onChange={(e) => {
                            const val = e.target.value
                            setNewWidthInput(val)
                            const w = parseFloat(val)
                            const parsedLen = typeof standardRollLength === 'number' ? standardRollLength : (parseFloat(standardRollLength) || 164)
                            const parsedAllowance = typeof extraWidthAllowance === 'number' ? extraWidthAllowance : (parseFloat(extraWidthAllowance) || 0)
                            const allowance = isNaN(parsedAllowance) || parsedAllowance < 0 ? 0 : parsedAllowance
                            if (!isNaN(w) && w > 0 && purchasePricePerSft !== '' && Number(purchasePricePerSft) > 0) {
                              const effectiveW = w + allowance
                              setPurchasePrice(Number((Number(purchasePricePerSft) * effectiveW * parsedLen).toFixed(2)))
                            }
                          }}
                          className="h-9 text-xs font-mono font-bold pr-7"
                        />
                        <span className="absolute right-2.5 top-2 text-[11px] font-bold text-slate-400">ft</span>
                      </div>
                      <span className="text-sm font-bold text-slate-400">+</span>
                      <div className="relative w-24">
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0.25"
                          value={extraWidthAllowance}
                          onChange={(e) => {
                            const val = e.target.value
                            setExtraWidthAllowance(val)
                            const parsedAllowance = parseFloat(val)
                            const allowance = isNaN(parsedAllowance) || parsedAllowance < 0 ? 0 : parsedAllowance
                            const parsedInput = parseFloat(newWidthInput)
                            const w = availableWidths.length > 0 
                              ? Math.max(...availableWidths) 
                              : (!isNaN(parsedInput) && parsedInput > 0 ? parsedInput : 10)
                            const parsedLen = typeof standardRollLength === 'number' ? standardRollLength : (parseFloat(standardRollLength) || 164)
                            const effectiveW = w + allowance
                            if (purchasePricePerSft !== '' && Number(purchasePricePerSft) > 0) {
                              setPurchasePrice(Number((Number(purchasePricePerSft) * effectiveW * parsedLen).toFixed(2)))
                            } else if (purchasePrice !== '' && Number(purchasePrice) > 0) {
                              const totalArea = effectiveW * parsedLen
                              if (totalArea > 0) {
                                setPurchasePricePerSft(Number((Number(purchasePrice) / totalArea).toFixed(2)))
                              }
                            }
                          }}
                          className="h-9 text-xs font-mono font-bold pr-7"
                        />
                        <span className="absolute right-2 top-2 text-[10px] font-bold text-slate-400">ft</span>
                      </div>
                    </div>
                  </div>

                  {/* Roll Length [ ] */}
                  <div className="sm:col-span-4">
                    <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                      Roll Length (Feet)
                    </Label>
                    <div className="flex items-center gap-1.5">
                      <div className="relative flex-1">
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="e.g. 164"
                          value={standardRollLength}
                          onChange={(e) => {
                            const val = e.target.value
                            setStandardRollLength(val)
                            const parsedLen = parseFloat(val)
                            const parsedInput = parseFloat(newWidthInput)
                            const w = availableWidths.length > 0 
                              ? Math.max(...availableWidths) 
                              : (!isNaN(parsedInput) && parsedInput > 0 ? parsedInput : 10)
                            const parsedAllowance = typeof extraWidthAllowance === 'number' ? extraWidthAllowance : (parseFloat(extraWidthAllowance) || 0)
                            const allowance = isNaN(parsedAllowance) || parsedAllowance < 0 ? 0 : parsedAllowance
                            const effectiveW = w + allowance
                            if (!isNaN(parsedLen) && parsedLen > 0 && purchasePricePerSft !== '' && Number(purchasePricePerSft) > 0) {
                              setPurchasePrice(Number((Number(purchasePricePerSft) * effectiveW * parsedLen).toFixed(2)))
                            }
                          }}
                          className="h-9 text-xs font-mono font-bold pr-7"
                        />
                        <span className="absolute right-2.5 top-2 text-[11px] font-bold text-slate-400">ft</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setStandardRollLength('100')
                          const parsedInput = parseFloat(newWidthInput)
                          const w = availableWidths.length > 0 
                            ? Math.max(...availableWidths) 
                            : (!isNaN(parsedInput) && parsedInput > 0 ? parsedInput : 10)
                          const parsedAllowance = typeof extraWidthAllowance === 'number' ? extraWidthAllowance : (parseFloat(extraWidthAllowance) || 0)
                          const allowance = isNaN(parsedAllowance) || parsedAllowance < 0 ? 0 : parsedAllowance
                          const effectiveW = w + allowance
                          if (purchasePricePerSft !== '' && Number(purchasePricePerSft) > 0) {
                            setPurchasePrice(Number((Number(purchasePricePerSft) * effectiveW * 100).toFixed(2)))
                          }
                        }}
                        className={cn(
                          'h-9 px-2 rounded-md text-[11px] font-bold border transition-colors cursor-pointer shrink-0',
                          Number(standardRollLength) === 100
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        )}
                      >
                        100ft
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStandardRollLength('164')
                          const parsedInput = parseFloat(newWidthInput)
                          const w = availableWidths.length > 0 
                            ? Math.max(...availableWidths) 
                            : (!isNaN(parsedInput) && parsedInput > 0 ? parsedInput : 10)
                          const parsedAllowance = typeof extraWidthAllowance === 'number' ? extraWidthAllowance : (parseFloat(extraWidthAllowance) || 0)
                          const allowance = isNaN(parsedAllowance) || parsedAllowance < 0 ? 0 : parsedAllowance
                          const effectiveW = w + allowance
                          if (purchasePricePerSft !== '' && Number(purchasePricePerSft) > 0) {
                            setPurchasePrice(Number((Number(purchasePricePerSft) * effectiveW * 164).toFixed(2)))
                          }
                        }}
                        className={cn(
                          'h-9 px-2 rounded-md text-[11px] font-bold border transition-colors cursor-pointer shrink-0',
                          Number(standardRollLength) === 164
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        )}
                      >
                        164ft
                      </button>
                    </div>
                  </div>

                  {/* Add Button */}
                  <div className="sm:col-span-2">
                    <Button
                      type="button"
                      onClick={handleAddCustomWidth}
                      className="w-full h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add
                    </Button>
                  </div>
                </div>

                {/* Configured Roll Sizes List */}
                {availableWidths.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mr-1">
                      Configured Roll Sizes:
                    </span>
                    {availableWidths.map((w) => {
                      const parsedLen = typeof standardRollLength === 'number' ? standardRollLength : (parseFloat(standardRollLength) || 164)
                      const parsedAllowance = typeof extraWidthAllowance === 'number' ? extraWidthAllowance : (parseFloat(extraWidthAllowance) || 0)
                      const allowance = isNaN(parsedAllowance) || parsedAllowance < 0 ? 0 : parsedAllowance
                      const effectiveW = w + allowance
                      const rollArea = effectiveW * parsedLen
                      const perSftCost = Number(purchasePricePerSft) || 0
                      const rollPrice = perSftCost > 0 ? Number((perSftCost * rollArea).toFixed(0)) : null
                      const isCurrentActive = parseFloat(newWidthInput) === w

                      return (
                        <span
                          key={w}
                          onClick={() => {
                            setNewWidthInput(w.toString())
                            if (perSftCost > 0) {
                              setPurchasePrice(Number((perSftCost * effectiveW * parsedLen).toFixed(2)))
                            }
                          }}
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer shadow-2xs',
                            isCurrentActive
                              ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300 ring-1 ring-blue-400'
                              : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white hover:border-blue-400'
                          )}
                          title="Click to view & edit price for this roll width"
                        >
                          <span>{w}ft {allowance > 0 ? `(+${allowance}ft)` : ''} × {standardRollLength}ft</span>
                          {rollPrice !== null && (
                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-900/60 px-1.5 py-0.2 rounded font-sans">
                              ৳{rollPrice.toLocaleString()}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveWidth(w)
                            }}
                            className="ml-0.5 text-slate-400 hover:text-rose-600 cursor-pointer text-sm font-bold"
                            title="Remove width"
                          >
                            ×
                          </button>
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Geometry Case B: Sheet Physical Dimensions */}
            {(materialType === 'sheet' || purchaseUnit === 'sheet') && (
              <div className="pt-3 border-t border-blue-200/60 dark:border-blue-800/60 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  {/* Sheet Width [ ] */}
                  <div className="sm:col-span-3">
                    <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                      Sheet Width (Feet)
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="e.g. 4"
                        value={newSheetWidthInput}
                        onChange={(e) => {
                          const val = e.target.value
                          setNewSheetWidthInput(val)
                          const w = parseFloat(val)
                          const l = parseFloat(newSheetLengthInput) || 8
                          if (!isNaN(w) && w > 0 && purchasePricePerSft !== '' && Number(purchasePricePerSft) > 0) {
                            setPurchasePrice(Number((Number(purchasePricePerSft) * w * l).toFixed(2)))
                          }
                        }}
                        className="h-9 text-xs font-mono font-bold pr-7"
                      />
                      <span className="absolute right-2.5 top-2 text-[11px] font-bold text-slate-400">ft</span>
                    </div>
                  </div>

                  {/* Sheet Length [ ] */}
                  <div className="sm:col-span-3">
                    <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                      Sheet Length (Feet)
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="e.g. 8"
                        value={newSheetLengthInput}
                        onChange={(e) => {
                          const val = e.target.value
                          setNewSheetLengthInput(val)
                          const l = parseFloat(val)
                          const w = parseFloat(newSheetWidthInput) || 4
                          if (!isNaN(l) && l > 0 && purchasePricePerSft !== '' && Number(purchasePricePerSft) > 0) {
                            setPurchasePrice(Number((Number(purchasePricePerSft) * w * l).toFixed(2)))
                          }
                        }}
                        className="h-9 text-xs font-mono font-bold pr-7"
                      />
                      <span className="absolute right-2.5 top-2 text-[11px] font-bold text-slate-400">ft</span>
                    </div>
                  </div>

                  {/* Board Thickness */}
                  <div className="sm:col-span-4">
                    <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                      Board Thickness (mm / gsm)
                    </Label>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 3mm or 5mm Board"
                      value={thicknessMm}
                      onChange={(e) => setThicknessMm(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  {/* Add Button */}
                  <div className="sm:col-span-2">
                    <Button
                      type="button"
                      onClick={handleAddCustomSheetSize}
                      className="w-full h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add
                    </Button>
                  </div>
                </div>

                {/* Configured Sheet Sizes List */}
                {availableSheetSizes.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mr-1">
                      Configured Sheet Sizes:
                    </span>
                    {availableSheetSizes.map((s, index) => (
                      <span
                        key={`${s.width}x${s.length}-${index}`}
                        onClick={() => {
                          setNewSheetWidthInput(s.width.toString())
                          setNewSheetLengthInput(s.length.toString())
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white shadow-2xs hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 cursor-pointer transition-colors"
                        title="Click to edit this sheet size"
                      >
                        <span>{s.width}ft × {s.length}ft</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveSheetSize(index)
                          }}
                          className="ml-1 text-slate-400 hover:text-rose-600 cursor-pointer text-sm font-bold"
                          title="Remove sheet size"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Geometry Case C: Box / Pack Quantity */}
            {(purchaseUnit === 'box' || purchaseUnit === 'pack') && (
              <div className="pt-3 border-t border-blue-200/60 dark:border-blue-800/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold mb-1 block">Items / Pieces per {purchaseUnit}</Label>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    placeholder="e.g. 1000 Eyelets"
                    value={packQuantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 1000
                      setPackQuantity(val)
                      if (purchasePricePerSft !== '' && Number(purchasePricePerSft) > 0) {
                        setPurchasePrice(Number((Number(purchasePricePerSft) * val).toFixed(2)))
                      }
                    }}
                    className="h-9 text-xs font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-500">Auto-converts purchase pack price to piece cost</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* SECTION 3: PURCHASING, DIRECT COSTING & INVENTORY REORDER */}
        {/* ======================================================== */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Purchasing, Direct Costing & Inventory Reorder
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Purchase rate & automatic unit cost calculation</span>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Usage Unit Purchase Rate Input */}
              <div className="flex flex-col justify-between">
                <div className="h-6 flex items-center justify-between mb-1">
                  <Label className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    Purchase Price (৳/{usageUnit.toUpperCase()}) <span className="text-rose-500">*</span>
                  </Label>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded shrink-0">
                    {usageUnit.toUpperCase()} Rate
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">৳</span>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 5.20"
                    value={purchasePricePerSft}
                    onChange={(e) => handlePricePerSftChange(e.target.value)}
                    className="pl-7 h-9 text-xs font-mono font-bold bg-blue-50/20 border-blue-200 dark:border-blue-800 focus:border-blue-500"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block truncate">Direct material cost per {usageUnit}</span>
              </div>

              {/* Package Purchase Price Input */}
              <div className="flex flex-col justify-between">
                <div className="h-6 flex items-center justify-between mb-1">
                  <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    Purchase Price (৳/{purchaseUnit})
                  </Label>
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
                    {materialType === 'roll' || purchaseUnit === 'roll'
                      ? `${parseFloat(newWidthInput) || 10}ft roll`
                      : `Total ${purchaseUnit}`}
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">৳</span>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 8500"
                    value={purchasePrice}
                    onChange={(e) => handleTotalPurchasePriceChange(e.target.value)}
                    className="pl-7 h-9 text-xs font-mono font-bold"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block truncate">
                  {materialType === 'roll' || purchaseUnit === 'roll'
                    ? `Package price for ${parseFloat(newWidthInput) || 10}ft roll`
                    : 'Supplier invoice package price'}
                </span>
              </div>

              {/* Wastage Factor */}
              <div className="flex flex-col justify-between">
                <div className="h-6 flex items-center justify-between mb-1">
                  <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    Expected Wastage (%)
                  </Label>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    max="100"
                    value={wastePercent}
                    onChange={(e) => setWastePercent(parseFloat(e.target.value) || 0)}
                    className="pr-7 h-9 text-xs font-mono"
                  />
                  <span className="absolute right-3 top-2.5 text-slate-400 font-bold text-xs">%</span>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block truncate">Production scrap margin</span>
              </div>

              {/* Reorder Level */}
              <div className="flex flex-col justify-between">
                <div className="h-6 flex items-center justify-between mb-1">
                  <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    Reorder Alert Level ({purchaseUnit}s)
                  </Label>
                </div>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(parseInt(e.target.value, 10) || 0)}
                  className="h-9 text-xs font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block truncate">Min stock warning threshold</span>
              </div>
            </div>

            {/* Live Real-Time Cost Economics Card */}
            <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 uppercase tracking-wider">
                    Calculated Production Direct Cost
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900 dark:text-emerald-200">
                  Total Yield: {calculatedEconomics.yieldLabel}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/60 border border-emerald-100 dark:border-emerald-900/60">
                  <span className="text-[11px] font-medium text-slate-500 block">Direct Base Cost (৳ / {usageUnit})</span>
                  <span className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-300">
                    ৳{calculatedEconomics.unitCost.toFixed(2)} / {usageUnit}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/60 border border-emerald-100 dark:border-emerald-900/60">
                  <span className="text-[11px] font-medium text-slate-500 block">Effective Cost with {wastePercent}% Wastage</span>
                  <span className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                    ৳{calculatedEconomics.effectiveCost.toFixed(2)} / {usageUnit}
                  </span>
                </div>
              </div>

              <div className="text-[11px] font-mono text-emerald-800 dark:text-emerald-300 bg-emerald-100/60 dark:bg-emerald-900/40 px-2.5 py-1 rounded-md">
                {calculatedEconomics.formulaText}
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Warehouse / Storage Location
              </Label>
              <Input
                placeholder="e.g. Main Warehouse - Rack B2 / Shelf 4"
                value={storageLocation}
                onChange={(e) => setStorageLocation(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Active in Raw Material Inventory & Production Consumption</span>
              </label>
            </div>
          </div>
        </div>

        {/* Standardized Bottom Action Bar */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto h-10 px-4 rounded-xl font-bold border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto h-10 px-5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Saving Material...</span>
              </>
            ) : (
              <>
                <Boxes className="h-4 w-4" />
                <span>{initialData ? 'Update Raw Material' : 'Save Raw Material Master'}</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
