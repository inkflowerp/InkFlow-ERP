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

const STANDARD_ROLL_WIDTHS: number[] = [
  2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0, 10.0, 10.5, 12.0
]

const STANDARD_SHEET_SIZES: { width: number; length: number; label: string }[] = [
  { width: 4, length: 8, label: '4ft × 8ft (Standard Sheet Board)' },
  { width: 4, length: 6, label: '4ft × 6ft' },
  { width: 3, length: 6, label: '3ft × 6ft' },
  { width: 2, length: 4, label: '2ft × 4ft' },
  { width: 4, length: 4, label: '4ft × 4ft' },
  { width: 2, length: 2, label: '2ft × 2ft' },
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
  const [availableWidths, setAvailableWidths] = useState<number[]>([2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8, 9, 10])
  const [standardRollLength, setStandardRollLength] = useState<number>(164)
  const [extraWidthAllowance, setExtraWidthAllowance] = useState<number>(0.25)
  const [newWidthInput, setNewWidthInput] = useState<string>('')

  // Sheet Geometry
  const [availableSheetSizes, setAvailableSheetSizes] = useState<Array<{ width: number; length: number; label?: string }>>([
    { width: 4, length: 8, label: '4ft × 8ft (Standard Sheet Board)' },
    { width: 4, length: 6, label: '4ft × 6ft' },
    { width: 3, length: 6, label: '3ft × 6ft' },
    { width: 2, length: 4, label: '2ft × 4ft' },
  ])
  const [newSheetWidthInput, setNewSheetWidthInput] = useState<string>('')
  const [newSheetLengthInput, setNewSheetLengthInput] = useState<string>('')
  const [newSheetLabelInput, setNewSheetLabelInput] = useState<string>('')
  const [thicknessMm, setThicknessMm] = useState<number | ''>('')

  // Liquid & Accessory Specs
  const [packQuantity, setPackQuantity] = useState<number | ''>(1000)
  const [liquidVolumeMl, setLiquidVolumeMl] = useState<number | ''>(1000)

  // 3. Purchasing, Costing & Reorder
  const [purchasePrice, setPurchasePrice] = useState<number | ''>('')
  const [wastePercent, setWastePercent] = useState<number>(5)
  const [reorderLevel, setReorderLevel] = useState<number>(5)
  const [storageLocation, setStorageLocation] = useState('Main Store - Media Rack')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '')
      setNameBn(initialData.name_bn || '')
      setSku(initialData.sku || '')
      setCategory(initialData.category || 'materials')
      setIsActive(initialData.is_active !== false)
      setDescription(initialData.description || '')
      setPurchaseUnit(initialData.purchase_unit || 'roll')
      setPurchasePrice(initialData.purchase_price || '')

      const matCfg: MaterialConfiguration = initialData.material_config || {}
      setMaterialType(matCfg.material_type || (initialData.purchase_unit === 'roll' ? 'roll' : initialData.purchase_unit === 'sheet' ? 'sheet' : 'roll'))
      setStandardRollLength(matCfg.standard_roll_length_ft || initialData.standard_roll_length_ft || 164)
      setAvailableWidths(matCfg.available_widths_ft || initialData.available_widths_ft || [2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8, 9, 10])
      setAvailableSheetSizes(matCfg.available_sheet_sizes || [
        { width: 4, length: 8, label: '4ft × 8ft (Standard Sheet Board)' },
        { width: 4, length: 6, label: '4ft × 6ft' },
        { width: 3, length: 6, label: '3ft × 6ft' },
        { width: 2, length: 4, label: '2ft × 4ft' },
      ])
      setExtraWidthAllowance(matCfg.extra_width_allowance_ft ?? (initialData.production_width_allowance ?? 0.25))
      setUsageUnit((matCfg.usage_unit as any) || initialData.unit || 'sft')
      setWastePercent(matCfg.waste_percent ?? (initialData.default_wastage_percentage ?? 5))
      setReorderLevel(matCfg.reorder_level || initialData.min_order_quantity || 5)
      setThicknessMm(matCfg.thickness_mm || '')
      setStorageLocation(matCfg.storage_location || 'Main Store - Media Rack')
      setPackQuantity(matCfg.pack_quantity || 1000)
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
      setStandardRollLength(164)
      setAvailableWidths([2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8, 9, 10])
      setAvailableSheetSizes([
        { width: 4, length: 8, label: '4ft × 8ft (Standard Sheet Board)' },
        { width: 4, length: 6, label: '4ft × 6ft' },
        { width: 3, length: 6, label: '3ft × 6ft' },
        { width: 2, length: 4, label: '2ft × 4ft' },
      ])
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

  // Roll Width Handlers
  const handleToggleRollWidth = (w: number) => {
    if (availableWidths.includes(w)) {
      setAvailableWidths(availableWidths.filter((x) => x !== w))
    } else {
      setAvailableWidths([...availableWidths, w].sort((a, b) => a - b))
    }
  }

  const handleSelectAllRollWidths = () => {
    setAvailableWidths([...STANDARD_ROLL_WIDTHS])
  }

  const handleClearRollWidths = () => {
    setAvailableWidths([])
  }

  const handleAddCustomWidth = () => {
    const val = parseFloat(newWidthInput)
    if (!isNaN(val) && val > 0 && !availableWidths.includes(val)) {
      setAvailableWidths([...availableWidths, val].sort((a, b) => a - b))
      setNewWidthInput('')
    }
  }

  const handleRemoveWidth = (w: number) => {
    setAvailableWidths(availableWidths.filter((x) => x !== w))
  }

  // Sheet Size Handlers
  const handleToggleSheetSize = (s: { width: number; length: number; label: string }) => {
    const exists = availableSheetSizes.some((x) => x.width === s.width && x.length === s.length)
    if (exists) {
      setAvailableSheetSizes(availableSheetSizes.filter((x) => !(x.width === s.width && x.length === s.length)))
    } else {
      setAvailableSheetSizes([...availableSheetSizes, s])
    }
  }

  const handleAddCustomSheetSize = () => {
    const w = parseFloat(newSheetWidthInput)
    const l = parseFloat(newSheetLengthInput)
    if (!isNaN(w) && w > 0 && !isNaN(l) && l > 0) {
      const exists = availableSheetSizes.some((x) => x.width === w && x.length === l)
      if (!exists) {
        const label = newSheetLabelInput.trim() || `${w}ft × ${l}ft Sheet`
        setAvailableSheetSizes([...availableSheetSizes, { width: w, length: l, label }])
        setNewSheetWidthInput('')
        setNewSheetLengthInput('')
        setNewSheetLabelInput('')
      }
    }
  }

  const handleRemoveSheetSize = (idx: number) => {
    setAvailableSheetSizes(availableSheetSizes.filter((_, i) => i !== idx))
  }

  // Cost & Economics Calculations
  const calculatedEconomics = useMemo(() => {
    const pp = Number(purchasePrice) || 0
    if (pp <= 0) {
      return {
        unitCost: 0,
        effectiveCost: 0,
        yieldLabel: '0 sft',
        formulaText: 'Enter purchase price to calculate unit cost',
      }
    }

    if (materialType === 'roll' || purchaseUnit === 'roll') {
      const maxW = availableWidths.length > 0 ? Math.max(...availableWidths) : 10
      const rollArea = maxW * standardRollLength
      const baseUnitCost = rollArea > 0 ? pp / rollArea : 0
      const effCost = baseUnitCost * (1 + (wastePercent || 0) / 100)
      return {
        unitCost: baseUnitCost,
        effectiveCost: effCost,
        yieldLabel: `${rollArea.toLocaleString()} sft (${maxW}ft × ${standardRollLength}ft)`,
        formulaText: `৳${pp.toLocaleString()} ÷ ${rollArea.toLocaleString()} sft = ৳${baseUnitCost.toFixed(2)}/sft (+ ${wastePercent}% waste = ৳${effCost.toFixed(2)}/sft)`,
      }
    }

    if (materialType === 'sheet' || purchaseUnit === 'sheet') {
      const firstSheet = availableSheetSizes[0] || { width: 4, length: 8 }
      const sheetArea = firstSheet.width * firstSheet.length
      const baseUnitCost = sheetArea > 0 ? pp / sheetArea : 0
      const effCost = baseUnitCost * (1 + (wastePercent || 0) / 100)
      return {
        unitCost: baseUnitCost,
        effectiveCost: effCost,
        yieldLabel: `${sheetArea} sft (${firstSheet.width}ft × ${firstSheet.length}ft)`,
        formulaText: `৳${pp.toLocaleString()} ÷ ${sheetArea} sft = ৳${baseUnitCost.toFixed(2)}/sft (+ ${wastePercent}% waste = ৳${effCost.toFixed(2)}/sft)`,
      }
    }

    if (purchaseUnit === 'box' || purchaseUnit === 'pack') {
      const count = Number(packQuantity) || 1000
      const baseUnitCost = count > 0 ? pp / count : 0
      const effCost = baseUnitCost * (1 + (wastePercent || 0) / 100)
      return {
        unitCost: baseUnitCost,
        effectiveCost: effCost,
        yieldLabel: `${count.toLocaleString()} pcs / ${purchaseUnit}`,
        formulaText: `৳${pp.toLocaleString()} ÷ ${count.toLocaleString()} pcs = ৳${baseUnitCost.toFixed(2)}/pc`,
      }
    }

    // Default 1:1
    const effCost = pp * (1 + (wastePercent || 0) / 100)
    return {
      unitCost: pp,
      effectiveCost: effCost,
      yieldLabel: `1 ${usageUnit}`,
      formulaText: `৳${pp.toLocaleString()} per ${purchaseUnit}`,
    }
  }, [purchasePrice, materialType, purchaseUnit, availableWidths, standardRollLength, availableSheetSizes, wastePercent, packQuantity, usageUnit])

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
      const materialConfig: MaterialConfiguration = {
        material_type: materialType,
        available_widths_ft: (materialType === 'roll' || purchaseUnit === 'roll') ? availableWidths : undefined,
        standard_roll_length_ft: (materialType === 'roll' || purchaseUnit === 'roll') ? standardRollLength : undefined,
        available_sheet_sizes: (materialType === 'sheet' || purchaseUnit === 'sheet') ? availableSheetSizes : undefined,
        extra_width_allowance_ft: (materialType === 'roll' || purchaseUnit === 'roll') ? Number(extraWidthAllowance) || 0.25 : undefined,
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
        base_cost: calculatedEconomics.unitCost > 0 ? Number(calculatedEconomics.unitCost.toFixed(2)) : pp,
        selling_price: 0,
        default_wastage_percentage: wastePercent,
        target_margin_percentage: 35.0,
        min_allowed_margin_percent: 15.0,
        pricing_method: 'per_piece',
        cost_basis_type: 'direct_cost',
        is_active: isActive,
        description: description.trim() || undefined,
        available_widths_ft: (materialType === 'roll' || purchaseUnit === 'roll') ? availableWidths : undefined,
        standard_roll_length_ft: (materialType === 'roll' || purchaseUnit === 'roll') ? standardRollLength : undefined,
        production_width_allowance: (materialType === 'roll' || purchaseUnit === 'roll') ? Number(extraWidthAllowance) || 0.25 : undefined,
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
              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  Bengali Name (বাংলা নাম - ঐচ্ছিক)
                </Label>
                <Input
                  placeholder="যেমন: স্টার ফ্রন্টলিট ফ্লেক্স ব্যানার"
                  value={nameBn}
                  onChange={(e) => setNameBn(e.target.value)}
                  className="h-9 text-xs font-bengali"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  Material SKU / Stock Code
                </Label>
                <Input
                  placeholder="e.g. MAT-FLEX-STAR-280"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="h-9 text-xs font-mono uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  Physical Form / Classification <span className="text-rose-500">*</span>
                </Label>
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

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  Catalog Category
                </Label>
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
              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  Purchase / Supplier Unit (ক্রয় একক) <span className="text-rose-500">*</span>
                </Label>
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

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  Stock / Production Usage Unit (খরচ হিসাব একক) <span className="text-rose-500">*</span>
                </Label>
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

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  Dimension Unit (পরিমাপ একক)
                </Label>
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

            {/* Geometry Case A: Roll Physical Dimensions */}
            {(materialType === 'roll' || purchaseUnit === 'roll') && (
              <div className="pt-3 border-t border-blue-200/60 dark:border-blue-800/60 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Available Stock Roll Widths (Feet)
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200">
                      {availableWidths.length} Widths Available
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllRollWidths}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300 dark:text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={handleClearRollWidths}
                      className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {STANDARD_ROLL_WIDTHS.map((w) => {
                    const isSelected = availableWidths.includes(w)
                    return (
                      <button
                        key={w}
                        type="button"
                        onClick={() => handleToggleRollWidth(w)}
                        className={cn(
                          'text-xs px-2.5 py-1 rounded-md font-mono font-medium transition-all flex items-center gap-1 cursor-pointer',
                          isSelected
                            ? 'bg-blue-600 text-white font-bold shadow-2xs ring-1 ring-blue-400'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:border-blue-400'
                        )}
                      >
                        {isSelected ? <Check className="w-3 h-3 text-white" /> : <Plus className="w-3 h-3 text-slate-400" />}
                        <span>{w} ft</span>
                      </button>
                    )
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      Standard Roll Length (Feet)
                    </Label>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        step="any"
                        value={standardRollLength}
                        onChange={(e) => setStandardRollLength(parseFloat(e.target.value) || 164)}
                        className="h-8 text-xs font-mono font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => setStandardRollLength(100)}
                        className={cn(
                          'h-8 px-2 rounded-md text-[11px] font-bold border transition-colors cursor-pointer shrink-0',
                          standardRollLength === 100
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        )}
                      >
                        100ft
                      </button>
                      <button
                        type="button"
                        onClick={() => setStandardRollLength(164)}
                        className={cn(
                          'h-8 px-2 rounded-md text-[11px] font-bold border transition-colors cursor-pointer shrink-0',
                          standardRollLength === 164
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        )}
                      >
                        164ft (50m)
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      Extra Width Allowance (Feet)
                    </Label>
                    <Input
                      type="number"
                      step="0.05"
                      value={extraWidthAllowance}
                      onChange={(e) => setExtraWidthAllowance(parseFloat(e.target.value) || 0.25)}
                      className="h-8 text-xs font-mono"
                    />
                    <span className="text-[10px] text-slate-500">Roll width + 0.25ft machine grip</span>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      Add Custom Roll Width (Feet)
                    </Label>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        step="any"
                        placeholder="e.g. 3.25"
                        value={newWidthInput}
                        onChange={(e) => setNewWidthInput(e.target.value)}
                        className="h-8 text-xs font-mono"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddCustomWidth}
                        className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5 mr-0.5" /> Add
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Geometry Case B: Sheet Physical Dimensions */}
            {(materialType === 'sheet' || purchaseUnit === 'sheet') && (
              <div className="pt-3 border-t border-blue-200/60 dark:border-blue-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Standard Rigid Sheet / Board Dimensions
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200">
                    {availableSheetSizes.length} Sheet Sizes Configured
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {STANDARD_SHEET_SIZES.map((s) => {
                    const isSelected = availableSheetSizes.some((x) => x.width === s.width && x.length === s.length)
                    return (
                      <button
                        key={`${s.width}x${s.length}`}
                        type="button"
                        onClick={() => handleToggleSheetSize(s)}
                        className={cn(
                          'text-xs px-2.5 py-1 rounded-md font-mono font-medium transition-all flex items-center gap-1 cursor-pointer',
                          isSelected
                            ? 'bg-blue-600 text-white font-bold shadow-2xs ring-1 ring-blue-400'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:border-blue-400'
                        )}
                      >
                        {isSelected ? <Check className="w-3 h-3 text-white" /> : <Plus className="w-3 h-3 text-slate-400" />}
                        <span>{s.width}ft × {s.length}ft</span>
                      </button>
                    )
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-2">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">Width (ft)</Label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="e.g. 4"
                      value={newSheetWidthInput}
                      onChange={(e) => setNewSheetWidthInput(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">Length (ft)</Label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="e.g. 8"
                      value={newSheetLengthInput}
                      onChange={(e) => setNewSheetLengthInput(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">Label (Optional)</Label>
                    <Input
                      placeholder="e.g. 4x8ft Board"
                      value={newSheetLabelInput}
                      onChange={(e) => setNewSheetLabelInput(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddCustomSheetSize}
                      className="w-full h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add Sheet Size
                    </Button>
                  </div>
                </div>

                <div className="pt-2">
                  <Label className="text-xs font-semibold mb-1 block">Board Thickness (mm / gsm)</Label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="e.g. 3mm or 5mm Acrylic / PVC Board"
                    value={thicknessMm}
                    onChange={(e) => setThicknessMm(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="h-8 text-xs font-mono max-w-xs"
                  />
                </div>
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
                    onChange={(e) => setPackQuantity(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                    className="h-9 text-xs font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-500">Auto-converts purchase pack price to piece cost</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* SECTION 3: PURCHASING, COSTING & INVENTORY REORDER */}
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  Purchase Price (৳ per {purchaseUnit}) <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">৳</span>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 8500"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="pl-7 h-9 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  Expected Wastage Factor (%)
                </Label>
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
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  Reorder Alert Level ({purchaseUnit}s)
                </Label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(parseInt(e.target.value, 10) || 0)}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            {/* Live Real-Time Cost Economics Card */}
            <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 uppercase tracking-wider">
                    Calculated Production Substrate Cost
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
