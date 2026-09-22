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

const DEFAULT_WIDTH_PRESETS = [
  { label: '3 ft (36")', value: 3 },
  { label: '3.2 ft (1m)', value: 3.28 },
  { label: '4 ft (48")', value: 4 },
  { label: '5 ft (60")', value: 5 },
  { label: '6 ft (72")', value: 6 },
  { label: '10 ft (120")', value: 10 },
]

const DEFAULT_LENGTH_PRESETS = [
  { label: '164 ft (50m)', value: 164 },
  { label: '328 ft (100m)', value: 328 },
  { label: '100 ft', value: 100 },
  { label: '50 ft', value: 50 },
]

const DEFAULT_PRODUCTION_MACHINES = [
  { id: 'roland', name: 'Roland Eco-Solvent (64")' },
  { id: 'mimaki', name: 'Mimaki UV Flatbed 2513' },
  { id: 'hp', name: 'HP Latex 570 (64")' },
  { id: 'laser', name: 'Laser Cutting & Engraving Bay' },
  { id: 'cnc', name: 'CNC Router Workstation' },
  { id: 'screen', name: 'Screen Print Table' },
  { id: 'finishing', name: 'Finishing & Grommeting Station' },
]

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
  const isBn = locale === 'bn'

  // Substrate Material
  const [materialId, setMaterialId] = useState<string>(initialMaterialId || materials[0]?.id || '')
  const selectedMaterial = useMemo(() => {
    return materials.find((m) => m.id === materialId) || null
  }, [materials, materialId])

  // Source Location
  const [sourceLocationId, setSourceLocationId] = useState<string>(locations[0]?.id || '')

  // Dimensions
  const [isCustomWidth, setIsCustomWidth] = useState<boolean>(false)
  const [widthFt, setWidthFt] = useState<number>(initialWidthFt)
  const [isCustomLength, setIsCustomLength] = useState<boolean>(false)
  const [lengthFt, setLengthFt] = useState<number>(initialLengthFt)

  // Batch Quantity
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
  const [operatorName, setOperatorName] = useState<string>('Press Operator')

  // UI Feedback States
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPrintLabel, setShowPrintLabel] = useState<boolean>(false)

  // Reset or Sync when opened or initialMaterialId changes
  useEffect(() => {
    if (open) {
      if (initialMaterialId) setMaterialId(initialMaterialId)
      if (initialWidthFt) setWidthFt(initialWidthFt)
      if (initialLengthFt) setLengthFt(initialLengthFt)
      if (initialMachineId) {
        setMachineId(initialMachineId)
        setDestination('machine')
      }
      setError(null)
      setSuccess(null)
      setLoading(false)
    }
  }, [open, initialMaterialId, initialWidthFt, initialLengthFt, initialMachineId])

  // Auto-Generated Roll Code Preview
  const generatedRollCode = useMemo(() => {
    if (customRollTag.trim()) {
      return quantityRolls > 1 ? `${customRollTag.trim()}-01` : customRollTag.trim()
    }
    const cleanSku = (selectedMaterial?.sku || 'MAT').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    const lot = lotNumber.trim() || 'LOT'
    const tag = `ROL-${cleanSku}-${widthFt}FT-${lot}`
    return quantityRolls > 1 ? `${tag}-01` : tag
  }, [selectedMaterial, widthFt, lotNumber, customRollTag, quantityRolls])

  // Calculated Telemetry
  const singleRollAreaSft = useMemo(() => {
    return Math.round(widthFt * lengthFt * 100) / 100
  }, [widthFt, lengthFt])

  const totalBatchAreaSft = useMemo(() => {
    return Math.round(singleRollAreaSft * quantityRolls * 100) / 100
  }, [singleRollAreaSft, quantityRolls])

  const unitCost = useMemo(() => {
    if (!selectedMaterial) return 0
    return Number(
      (selectedMaterial as any).unit_cost ||
        selectedMaterial.average_cost ||
        selectedMaterial.last_purchase_price ||
        0
    )
  }, [selectedMaterial])

  const totalValuation = useMemo(() => {
    return Math.round(totalBatchAreaSft * unitCost * 100) / 100
  }, [totalBatchAreaSft, unitCost])

  // Store Stock Check
  const currentStoreStock = useMemo(() => {
    return Number(selectedMaterial?.current_stock || 0)
  }, [selectedMaterial])

  const projectedStoreBalance = useMemo(() => {
    return currentStoreStock - totalBatchAreaSft
  }, [currentStoreStock, totalBatchAreaSft])

  const isStoreShortage = projectedStoreBalance < 0

  const handleWidthSelect = (val: number) => {
    setWidthFt(val)
    setIsCustomWidth(false)
  }

  const handleLengthSelect = (val: number) => {
    setLengthFt(val)
    setIsCustomLength(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!materialId) {
      setError('Please select a material substrate from warehouse inventory.')
      return
    }
    if (widthFt <= 0 || lengthFt <= 0) {
      setError('Roll width and length must be positive numbers.')
      return
    }
    if (quantityRolls <= 0) {
      setError('Quantity of rolls must be at least 1.')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const targetMachine = DEFAULT_PRODUCTION_MACHINES.find((m) => m.id === machineId)
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
          `Requisitioned ${quantityRolls} Master Roll(s) (${widthFt}ft × ${lengthFt}ft) for Print Floor`,
        unit_cost: unitCost,
      }

      const res = await issueMasterRollsBatchAction(payload, companyId)

      if (!res.success || !res.data) {
        setError(res.error || 'Failed to issue master roll(s) to floor.')
        return
      }

      const result = res.data
      setSuccess(
        `Successfully issued ${result.quantity_issued} roll(s) (${result.total_area_sft} SFT, ${formatBDT(result.total_valuation)}) to Print Floor!`
      )

      if (onSuccess) {
        onSuccess(result)
      }

      setTimeout(() => {
        onOpenChange(false)
      }, 900)
    } catch (err: any) {
      setError(err.message || 'Error occurred while issuing master roll.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      title={tBilingual(
        'Issue / Requisition Master Roll to Print Floor',
        'প্রিন্ট ফ্লোরে মাস্টার রোল ইস্যু ও মাউন্টিং'
      )}
      description={tBilingual(
        'Mount or issue master rolls directly to production workstations or floor staging with live inventory ledger sync.',
        'গুদাম স্টক থেকে সরাসরি প্রিন্টিং মেশিনে নতুন মাস্টার রোল বরাদ্দ ও মাউন্ট করুন।'
      )}
      onSubmit={handleSubmit}
      className="max-w-2xl max-h-[90vh] overflow-y-auto"
    >
      <div className="space-y-4 pt-1 text-xs">
        {/* Success Alert */}
        {success && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 rounded-xl border border-emerald-300 dark:border-emerald-800 flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold">{success}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 rounded-xl border border-rose-300 dark:border-rose-800 flex items-center gap-2.5 animate-in fade-in">
            <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 1: SUBSTRATE MATERIAL & SOURCE WAREHOUSE */}
        {/* ========================================================= */}
        <div className="space-y-3 p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs uppercase text-slate-700 dark:text-slate-300 tracking-wider flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              1. {tBilingual('Material Substrate & Warehouse Source', 'কাঁচামাল ও সোর্স গুদাম')}
            </span>
            {selectedMaterial && (
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] font-mono font-bold py-0.5',
                  currentStoreStock > 500
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                )}
              >
                Store Stock: {currentStoreStock.toLocaleString()} {selectedMaterial.unit}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Substrate Select */}
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Material Substrate', 'কাঁচামাল সাবস্ট্রেট')}{' '}
                <span className="text-rose-500">*</span>
              </Label>
              <select
                value={materialId}
                onChange={(e) => setMaterialId(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">-- Select Material Substrate --</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.sku || 'No SKU'}) • {m.current_stock} {m.unit} avail
                  </option>
                ))}
              </select>
            </div>

            {/* Source Warehouse Location */}
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Source Store Location', 'উৎস স্টোর লোকেশন')}
              </Label>
              <select
                value={sourceLocationId}
                onChange={(e) => setSourceLocationId(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
              >
                {locations.length === 0 ? (
                  <option value="">Main Warehouse Store</option>
                ) : (
                  locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.location_name} ({loc.location_code})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* STEP 2: ROLL DIMENSIONS (WIDTH & LENGTH PRESETS) */}
        {/* ========================================================= */}
        <div className="space-y-3 p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="font-bold text-xs uppercase text-slate-700 dark:text-slate-300 tracking-wider flex items-center gap-1.5">
            <Disc className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            2. {tBilingual('Master Roll Dimensions', 'মাস্টার রোলের সাইজ ও মাপ')}
          </span>

          {/* Width Section */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs font-semibold">
                {tBilingual('Roll Width (Feed Axis)', 'রোলের প্রস্থ')} <span className="text-rose-500">*</span>
              </Label>
              <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400">
                Current: {widthFt} ft ({Math.round(widthFt * 12)}&quot;)
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-7 gap-1.5">
              {DEFAULT_WIDTH_PRESETS.map((p) => (
                <Button
                  key={p.label}
                  type="button"
                  size="sm"
                  variant={!isCustomWidth && widthFt === p.value ? 'default' : 'outline'}
                  onClick={() => handleWidthSelect(p.value)}
                  className="h-8 text-xs font-bold px-1"
                >
                  {p.label}
                </Button>
              ))}
              <Button
                type="button"
                size="sm"
                variant={isCustomWidth ? 'default' : 'outline'}
                onClick={() => setIsCustomWidth(true)}
                className="h-8 text-xs font-bold px-1"
              >
                Custom
              </Button>
            </div>
            {isCustomWidth && (
              <div className="mt-2 flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0.1"
                  value={widthFt}
                  onChange={(e) => setWidthFt(Number(e.target.value))}
                  placeholder="Width in feet (e.g. 5.5)"
                  className="h-8 text-xs font-mono font-bold"
                  required
                />
                <span className="text-xs text-slate-500 whitespace-nowrap font-medium">feet</span>
              </div>
            )}
          </div>

          {/* Length Section */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs font-semibold">
                {tBilingual('Nominal Master Length', 'রোলের দৈর্ঘ্য')} <span className="text-rose-500">*</span>
              </Label>
              <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400">
                Current: {lengthFt} ft ({(lengthFt * 0.3048).toFixed(1)}m)
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {DEFAULT_LENGTH_PRESETS.map((p) => (
                <Button
                  key={p.label}
                  type="button"
                  size="sm"
                  variant={!isCustomLength && lengthFt === p.value ? 'default' : 'outline'}
                  onClick={() => handleLengthSelect(p.value)}
                  className="h-8 text-xs font-bold px-1"
                >
                  {p.label}
                </Button>
              ))}
              <Button
                type="button"
                size="sm"
                variant={isCustomLength ? 'default' : 'outline'}
                onClick={() => setIsCustomLength(true)}
                className="h-8 text-xs font-bold px-1"
              >
                Custom
              </Button>
            </div>
            {isCustomLength && (
              <div className="mt-2 flex items-center gap-2">
                <Input
                  type="number"
                  step="0.1"
                  min="1"
                  value={lengthFt}
                  onChange={(e) => setLengthFt(Number(e.target.value))}
                  placeholder="Length in feet (e.g. 150)"
                  className="h-8 text-xs font-mono font-bold"
                  required
                />
                <span className="text-xs text-slate-500 whitespace-nowrap font-medium">feet</span>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* STEP 3: MULTI-ROLL BATCH QUANTITY & DESTINATION */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Multi-Roll Quantity */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <Label className="text-xs font-semibold block">
              {tBilingual('Requisition Quantity (Number of Rolls)', 'ইস্যুকৃত রোলের সংখ্যা')}
            </Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setQuantityRolls((q) => Math.max(1, q - 1))}
                className="h-8 w-8 p-0"
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <Input
                type="number"
                min="1"
                max="50"
                value={quantityRolls}
                onChange={(e) => setQuantityRolls(Math.max(1, parseInt(e.target.value) || 1))}
                className="h-8 text-center font-mono font-black text-sm"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setQuantityRolls((q) => q + 1)}
                className="h-8 w-8 p-0"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex items-center gap-1.5 justify-center pt-1">
              {[1, 2, 3, 5].map((q) => (
                <Button
                  key={q}
                  type="button"
                  size="sm"
                  variant={quantityRolls === q ? 'secondary' : 'ghost'}
                  onClick={() => setQuantityRolls(q)}
                  className="h-6 text-[11px] px-2 font-bold"
                >
                  {q} {q === 1 ? 'Roll' : 'Rolls'}
                </Button>
              ))}
            </div>
          </div>

          {/* Machine Mount or Floor Staging */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <Label className="text-xs font-semibold block">
              {tBilingual('Workstation Destination', 'ফ্লোর গন্তব্য ও মাউন্টিং')}
            </Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={destination === 'machine' ? 'default' : 'outline'}
                onClick={() => setDestination('machine')}
                className="h-8 flex-1 text-xs font-bold gap-1"
              >
                <Cpu className="h-3.5 w-3.5" />
                <span>Mount to Press</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant={destination === 'floor_staging' ? 'default' : 'outline'}
                onClick={() => setDestination('floor_staging')}
                className="h-8 flex-1 text-xs font-bold gap-1"
              >
                <Building className="h-3.5 w-3.5" />
                <span>Floor Staging</span>
              </Button>
            </div>

            {destination === 'machine' && (
              <select
                value={machineId}
                onChange={(e) => setMachineId(e.target.value)}
                className="w-full h-8 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs font-semibold mt-1"
              >
                {DEFAULT_PRODUCTION_MACHINES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* STEP 4: SMART ROLL TAG AUTO-GENERATOR */}
        {/* ========================================================= */}
        <div className="p-3 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-xl border border-indigo-200 dark:border-indigo-900/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span className="font-bold text-xs text-indigo-950 dark:text-indigo-200">
                {tBilingual('Auto-Generated Roll Identifier Tag', 'স্বয়ংক্রিয় রোল ট্যাগ আইডি')}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvancedTag(!showAdvancedTag)}
              className="h-6 text-[10px] text-indigo-700 dark:text-indigo-300 font-semibold px-1.5"
            >
              {showAdvancedTag ? 'Hide Custom Tag' : 'Edit Lot / Tag'}
            </Button>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
            <Badge className="bg-indigo-600 text-white font-mono text-xs px-2.5 py-1 font-bold shadow-xs">
              {generatedRollCode}
              {quantityRolls > 1 && ` (to ...-${String(quantityRolls).padStart(2, '0')})`}
            </Badge>
            <span className="text-[11px] text-slate-500 font-medium">
              Format: ROL-[SKU]-[WIDTH]-[LOT]
            </span>
          </div>

          {showAdvancedTag && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3 pt-2.5 border-t border-indigo-200 dark:border-indigo-900/60">
              <div>
                <Label className="text-[11px] font-semibold mb-1 block">Batch / Lot Number</Label>
                <Input
                  placeholder="e.g. LOT-2026-B8"
                  value={lotNumber}
                  onChange={(e) => setLotNumber(e.target.value)}
                  className="h-7 text-xs font-mono"
                />
              </div>
              <div>
                <Label className="text-[11px] font-semibold mb-1 block">Custom Tag Override</Label>
                <Input
                  placeholder="e.g. ROL-CUSTOM-001"
                  value={customRollTag}
                  onChange={(e) => setCustomRollTag(e.target.value)}
                  className="h-7 text-xs font-mono"
                />
              </div>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* STEP 5: LIVE TELEMETRY, VALUATION & STORE STOCK IMPACT */}
        {/* ========================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <Card className="p-2.5 bg-white dark:bg-slate-900 border shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Single Roll Area</span>
            <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
              {singleRollAreaSft} SFT
            </span>
            <span className="text-[9px] text-slate-400 block">{widthFt}ft × {lengthFt}ft</span>
          </Card>

          <Card className="p-2.5 bg-white dark:bg-slate-900 border shadow-xs">
            <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 block">
              Total Batch Area
            </span>
            <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono">
              {totalBatchAreaSft} SFT
            </span>
            <span className="text-[9px] text-slate-400 block">{quantityRolls} roll(s) total</span>
          </Card>

          <Card className="p-2.5 bg-white dark:bg-slate-900 border shadow-xs">
            <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">
              Valuation (BDT)
            </span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {formatBDT(totalValuation)}
            </span>
            <span className="text-[9px] text-slate-400 block">@{formatBDT(unitCost)}/SFT</span>
          </Card>

          <Card
            className={cn(
              'p-2.5 border shadow-xs',
              isStoreShortage
                ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-300 dark:border-rose-900'
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
              {projectedStoreBalance.toLocaleString()} SFT
            </span>
            <span className="text-[9px] text-slate-400 block">
              {isStoreShortage ? '⚠️ Shortage Warning' : 'Stock Sufficient'}
            </span>
          </Card>
        </div>

        {/* ========================================================= */}
        {/* STEP 6: PRINTABLE INDUSTRIAL ROLL LABEL / TICKET BADGE */}
        {/* ========================================================= */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
          <div className="p-2.5 bg-slate-100 dark:bg-slate-800/80 flex items-center justify-between">
            <span className="font-bold text-[11px] text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Barcode className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              {tBilingual('Printable Industrial Physical Tag Preview', 'প্রিন্টযোগ্য রোল স্টিকার / বারকোড প্রিভিউ')}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPrintLabel(!showPrintLabel)}
              className="h-6 text-[10px] font-bold px-2"
            >
              {showPrintLabel ? 'Hide Label' : 'Show Label'}
            </Button>
          </div>

          {showPrintLabel && (
            <div className="p-4 bg-slate-50 dark:bg-slate-950/50 flex flex-col items-center">
              <div className="w-full max-w-sm p-4 bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-xl shadow-md space-y-2 text-slate-900 dark:text-slate-100">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="font-black text-xs tracking-wider">INKFLOW ERP ROLL TICKET</div>
                  <Badge variant="outline" className="font-mono text-[9px] font-bold">
                    MASTER ROLL
                  </Badge>
                </div>

                <div className="text-center py-1">
                  <div className="font-mono font-black text-base tracking-wider">{generatedRollCode}</div>
                  <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    {selectedMaterial?.name || 'Raw Material Media'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono border-t border-b py-2">
                  <div>
                    <span className="text-slate-400 block">WIDTH:</span>
                    <strong>{widthFt} FT ({Math.round(widthFt * 12)}&quot;)</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">INITIAL LENGTH:</span>
                    <strong>{lengthFt} FT</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">TOTAL AREA:</span>
                    <strong>{singleRollAreaSft} SFT</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">DESTINATION:</span>
                    <strong className="truncate block">
                      {destination === 'machine'
                        ? DEFAULT_PRODUCTION_MACHINES.find((m) => m.id === machineId)?.name || 'Machine'
                        : 'Floor Staging'}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1">
                  <span>DATE: {new Date().toLocaleDateString('en-GB')}</span>
                  <span>OPERATOR: {operatorName}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Operator & Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-semibold mb-1 block">Requisitioned By / Operator</Label>
            <Input
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              placeholder="Operator Name"
              className="h-8 text-xs font-medium"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1 block">Requisition Notes</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Urgent banner run for Job #1042"
              className="h-8 text-xs font-medium"
            />
          </div>
        </div>

        {/* Modal Submit Footer */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
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
            disabled={loading || !materialId}
            className="h-9 px-5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md cursor-pointer gap-1.5"
          >
            {loading ? (
              <span>Issuing Roll(s)...</span>
            ) : (
              <>
                <Disc className="h-4 w-4" />
                <span>
                  {tBilingual(
                    `Confirm Issue (${quantityRolls} ${quantityRolls === 1 ? 'Roll' : 'Rolls'})`,
                    `ইস্যু নিশ্চিত করুন (${quantityRolls}টি রোল)`
                  )}
                </span>
              </>
            )}
          </Button>
        </div>
      </div>
    </ModalDialog>
  )
}
