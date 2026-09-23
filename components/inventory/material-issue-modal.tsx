'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  MaterialRecord,
  InventoryLocationRecord,
  MaterialRequestRecord,
  InventoryRollRecord,
} from '@/types/inventory.types'
import { issueMaterialAction } from '@/actions/inventory.actions'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import {
  Send,
  Package,
  ShieldCheck,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Plus,
  Trash2,
  Building,
  Layers,
  Wrench,
  HardHat,
  User,
  Loader2,
  AlertCircle,
  Hash,
  CheckCheck,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { formatBDT } from '@/lib/formatters'
import { useI18n } from '@/i18n/context'
import { cn } from '@/lib/utils'
import { getMaterialWarehouseStockBreakdown } from '@/lib/units'

export interface MaterialIssueModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  materials: MaterialRecord[]
  locations: InventoryLocationRecord[]
  request?: MaterialRequestRecord | null
  requests?: MaterialRequestRecord[]
  rolls?: InventoryRollRecord[]
  selectedMaterialId?: string
  onSuccess?: () => void
  companyId?: string
}

export interface IssueItemFormState {
  id: string
  request_item_id?: string | null
  material_id: string
  material_name: string
  category?: string

  // Purchase Unit and Consumption Unit
  purchase_unit: string
  consumption_unit: string

  // Selected roll size / dimension (for roll or sheet media)
  selected_size_label?: string
  selected_width_ft?: number
  selected_length_ft?: number
  area_per_purchase_unit?: number

  // Quantities
  requested_quantity?: number
  issued_quantity: number // In Purchase Unit! e.g. 1 Roll, 2 Sheets, 1 Box
  consumption_quantity: number // In Stock / Consumption Unit! e.g. 492 sft, 1000 pcs

  // Unit costs
  unit_cost: number // Cost per Purchase Unit (৳ / Roll or ৳ / Box)
  cost_per_consumption_unit: number // Cost per Consumption Unit (৳ / SFT)
  total_cost: number

  // Roll identity tag
  roll_id?: string | null
  notes?: string
}

const PRODUCTION_MACHINES = [
  { id: 'press-roland-1', name: 'Roland TrueVIS Eco-Solvent (64")' },
  { id: 'press-mimaki-uv', name: 'Mimaki UV Flatbed 2513' },
  { id: 'press-hp-latex', name: 'HP Latex 570 (64")' },
  { id: 'laser-cutter-1', name: 'Laser Cutting & Engraving Bay' },
  { id: 'cnc-router-1', name: 'Heavy CNC Routing Workstation' },
  { id: 'press-screen-1', name: 'Commercial Screen Printing Table' },
  { id: 'finishing-bay', name: 'Manual Finishing & Grommeting Line' },
  { id: 'general-floor', name: 'General Production Floor' },
]

function buildIssueItemFromMaterial(
  mat: MaterialRecord,
  rowId: string,
  initialQty: number = 1,
  requestId?: string | null
): IssueItemFormState {
  const breakdown = getMaterialWarehouseStockBreakdown(mat)
  const isRoll = breakdown.is_roll

  let selectedWidth = 3
  let selectedLength = 164
  let selectedLabel = '3ft × 164ft'
  let areaPerUnit = 492

  if (isRoll) {
    if (breakdown.roll_items && breakdown.roll_items.length > 0) {
      const preferredSize = breakdown.roll_items.find((r) => r.roll_count > 0) || breakdown.roll_items[0]
      selectedWidth = preferredSize.width_ft
      selectedLength = preferredSize.length_ft
      selectedLabel = preferredSize.label || `${selectedWidth}ft × ${selectedLength}ft`
      areaPerUnit = selectedWidth * selectedLength
    } else {
      selectedWidth = Number(mat.roll_width_ft || 3)
      selectedLength = Number(mat.standard_roll_length_ft || 164)
      selectedLabel = `${selectedWidth}ft × ${selectedLength}ft`
      areaPerUnit = selectedWidth * selectedLength
    }
  } else if (
    ['sheet', 'rigid_sheet', 'pvc_board', 'acrylic', 'foam_board', 'acp'].includes(String(mat.category).toLowerCase()) ||
    breakdown.purchase_unit === 'sheet'
  ) {
    selectedWidth = Number((mat as any).sheet_width_ft || mat.width || 4)
    selectedLength = Number((mat as any).sheet_length_ft || mat.length || 8)
    areaPerUnit = selectedWidth * selectedLength
    selectedLabel = `${selectedWidth}ft × ${selectedLength}ft Sheet`
  } else if (['box', 'pack', 'carton'].includes(breakdown.purchase_unit)) {
    areaPerUnit = Number((mat as any).pack_quantity || (mat.material_config as any)?.pack_quantity || 1)
    selectedLabel = `${areaPerUnit} ${breakdown.consumption_unit}/${breakdown.purchase_unit}`
  } else {
    areaPerUnit = 1
    selectedLabel = breakdown.purchase_unit
  }

  const pUnit = breakdown.purchase_unit || mat.purchase_unit || 'pcs'
  const cUnit = breakdown.consumption_unit || mat.unit || 'pcs'

  const costPerPurchaseUnit =
    breakdown.cost_per_purchase_unit ||
    breakdown.cost_per_consumption_unit * areaPerUnit ||
    Number(mat.average_cost || mat.last_purchase_price || 0)
  const costPerConsumptionUnit =
    breakdown.cost_per_consumption_unit ||
    (areaPerUnit > 0 ? costPerPurchaseUnit / areaPerUnit : costPerPurchaseUnit)

  const qtyPurchase = Math.max(1, initialQty)
  const qtyConsumption = isRoll
    ? qtyPurchase * areaPerUnit
    : ['box', 'pack', 'carton', 'sheet'].includes(pUnit) && areaPerUnit > 1
    ? qtyPurchase * areaPerUnit
    : qtyPurchase
  const totalCost = Math.round(qtyPurchase * costPerPurchaseUnit)

  return {
    id: rowId,
    request_item_id: requestId || null,
    material_id: mat.id,
    material_name: mat.name,
    category: mat.category,
    purchase_unit: pUnit,
    consumption_unit: cUnit,
    selected_size_label: selectedLabel,
    selected_width_ft: selectedWidth,
    selected_length_ft: selectedLength,
    area_per_purchase_unit: areaPerUnit,
    issued_quantity: qtyPurchase,
    consumption_quantity: qtyConsumption,
    unit_cost: costPerPurchaseUnit,
    cost_per_consumption_unit: costPerConsumptionUnit,
    total_cost: totalCost,
  }
}

export function MaterialIssueModal({
  open,
  onOpenChange,
  materials,
  locations = [],
  request,
  requests = [],
  rolls = [],
  selectedMaterialId,
  onSuccess,
  companyId,
}: MaterialIssueModalProps) {
  const { tBilingual } = useI18n()

  // Mode: 'requisition' (Fulfill Floor Request) or 'direct' (Direct Machine/Floor Dispatch)
  const [mode, setMode] = useState<'requisition' | 'direct'>('direct')
  const [selectedRequestId, setSelectedRequestId] = useState<string>('')

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
        {
          id: 'loc-prod-floor-buf',
          company_id: companyId || '',
          location_code: 'FL-MAIN',
          location_name: 'Production Floor Buffer',
          location_type: 'production_floor',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]
    }
    return list
  }, [locations, companyId])

  // Helper to determine the best source location automatically
  const getAutoSourceLocationId = (matId?: string) => {
    if (matId) {
      const mat = materials.find((m) => m.id === matId)
      if (mat) {
        const matLocId = (mat as any).primary_location_id || (mat as any).location_id
        if (matLocId && effectiveLocations.some((l) => l.id === matLocId)) {
          return matLocId
        }
      }
    }
    const preferred = effectiveLocations.find(
      (l) =>
        l.location_type === 'raw_material_store' ||
        l.location_type === 'main_store' ||
        (l as any).is_default ||
        l.location_code?.toUpperCase().includes('RAW') ||
        l.location_code?.toUpperCase().includes('MAIN')
    )
    return preferred ? preferred.id : effectiveLocations[0]?.id || ''
  }

  // Location & Logistics
  const [sourceLocationId, setSourceLocationId] = useState<string>('')
  const [destinationLocationId, setDestinationLocationId] = useState<string>('')
  const [receivedByName, setReceivedByName] = useState<string>('')
  const [assignedMachine, setAssignedMachine] = useState<string>('press-roland-1')
  const [jobReference, setJobReference] = useState<string>('')
  const [issueVoucherNo, setIssueVoucherNo] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  // Multi-item issue rows
  const [items, setItems] = useState<IssueItemFormState[]>([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Initialize and populate state when modal opens
  useEffect(() => {
    if (open) {
      setError(null)
      setSuccessMsg(null)
      setLoading(false)

      // Auto-select source location
      const autoSrc = getAutoSourceLocationId(selectedMaterialId || items[0]?.material_id)
      if (!sourceLocationId || !effectiveLocations.some((l) => l.id === sourceLocationId)) {
        setSourceLocationId(autoSrc)
      }

      // Auto-select destination location (Floor/Buffer)
      const autoDest =
        effectiveLocations.find(
          (l) => l.location_type === 'production_floor' || l.location_type === 'branch_store'
        ) ||
        effectiveLocations[1] ||
        effectiveLocations[0]
      if (!destinationLocationId && autoDest) {
        setDestinationLocationId(autoDest.id)
      }

      // Auto-generate issue voucher #
      setIssueVoucherNo(`VOUCH-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`)

      // Check if launched for a specific requisition
      const targetReq = request || requests.find((r) => r.id === selectedRequestId)
      if (targetReq) {
        setMode('requisition')
        setSelectedRequestId(targetReq.id)
        populateFromRequest(targetReq)
      } else if (requests.length > 0 && mode === 'requisition' && !selectedRequestId) {
        const firstPending = requests.find((r) => r.status === 'approved' || r.status === 'requested') || requests[0]
        if (firstPending) {
          setSelectedRequestId(firstPending.id)
          populateFromRequest(firstPending)
        }
      } else {
        // Direct Mode setup
        const initialMat = materials.find((m) => m.id === selectedMaterialId) || materials[0]
        if (initialMat) {
          setItems([buildIssueItemFromMaterial(initialMat, `iss-item-${Date.now()}-1`, 1)])
        }
      }
    }
  }, [open, request, selectedMaterialId, companyId, effectiveLocations])

  const populateFromRequest = (req: MaterialRequestRecord) => {
    setReceivedByName(req.requested_by_name || '')
    if (req.production_task?.title) {
      setJobReference(req.production_task.title)
    }
    if (req.source_location_id) {
      setSourceLocationId(req.source_location_id)
    }
    if (req.destination_location_id) {
      setDestinationLocationId(req.destination_location_id)
    }

    if (req.items && req.items.length > 0) {
      const rows: IssueItemFormState[] = req.items.map((it, idx) => {
        const mat = materials.find((m) => m.id === it.material_id) || {
          id: it.material_id,
          name: it.material?.name || 'Material Item',
          sku: (it.material as any)?.sku || 'MAT',
          unit: (it.unit || 'pcs') as any,
          current_stock: 0,
          category: 'roll_media' as any,
          is_roll: true,
          company_id: companyId || '',
        }
        const remaining = Math.max(0, it.requested_quantity - (it.issued_quantity || 0))
        return buildIssueItemFromMaterial(mat as MaterialRecord, `iss-req-item-${Date.now()}-${idx}`, remaining, it.id)
      })
      setItems(rows)
    } else {
      setItems([])
    }
  }

  const handleRequestChange = (reqId: string) => {
    setSelectedRequestId(reqId)
    const found = requests.find((r) => r.id === reqId)
    if (found) {
      populateFromRequest(found)
    } else {
      setItems([])
    }
  }

  const handleMaterialSelect = (index: number, newMatId: string) => {
    const mat = materials.find((m) => m.id === newMatId)
    if (!mat) return
    setItems((prev) => {
      const updated = [...prev]
      const currentQty = updated[index]?.issued_quantity || 1
      updated[index] = buildIssueItemFromMaterial(mat, updated[index]?.id || `iss-item-${Date.now()}-${index}`, currentQty)
      return updated
    })
  }

  const handleSizeChange = (index: number, sizeItem: { width_ft: number; length_ft: number; label?: string }) => {
    setItems((prev) => {
      const updated = [...prev]
      const cur = { ...updated[index] }
      cur.selected_width_ft = sizeItem.width_ft
      cur.selected_length_ft = sizeItem.length_ft
      cur.selected_size_label = sizeItem.label || `${sizeItem.width_ft}ft × ${sizeItem.length_ft}ft`
      const areaPerUnit = sizeItem.width_ft * sizeItem.length_ft
      cur.area_per_purchase_unit = areaPerUnit
      cur.consumption_quantity = cur.issued_quantity * areaPerUnit

      const mat = materials.find((m) => m.id === cur.material_id)
      const breakdown = mat ? getMaterialWarehouseStockBreakdown(mat) : null
      const costPerSft = breakdown?.cost_per_consumption_unit || cur.cost_per_consumption_unit || 0
      cur.cost_per_consumption_unit = costPerSft
      cur.unit_cost = Math.round(costPerSft * areaPerUnit)
      cur.total_cost = Math.round(cur.issued_quantity * cur.unit_cost)

      updated[index] = cur
      return updated
    })
  }

  const handleIssuedQuantityChange = (index: number, val: number) => {
    setItems((prev) => {
      const updated = [...prev]
      const cur = { ...updated[index] }
      const qty = Number(val) || 0
      cur.issued_quantity = qty
      const area = cur.area_per_purchase_unit || 1
      cur.consumption_quantity =
        cur.purchase_unit !== cur.consumption_unit && area > 1 ? Math.round(qty * area * 100) / 100 : qty
      cur.total_cost = Math.round(qty * (cur.unit_cost || 0))
      updated[index] = cur
      return updated
    })
  }

  const handleRollTagSelect = (index: number, rollId: string | null) => {
    setItems((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], roll_id: rollId }
      return updated
    })
  }

  const handleAddItem = () => {
    const firstMat = materials[0]
    if (!firstMat) return
    setItems((prev) => [
      ...prev,
      buildIssueItemFromMaterial(firstMat, `iss-item-${Date.now()}-${prev.length + 1}`, 1),
    ])
  }

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  // Active requisition object
  const activeRequest = requests.find((r) => r.id === selectedRequestId) || request

  // Calculations
  const totalValuation = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.total_cost) || 0), 0)
  }, [items])

  const totalQuantitySum = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.issued_quantity) || 0), 0)
  }, [items])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    if (!sourceLocationId) {
      setError('Please select a source store location.')
      return
    }

    if (items.length === 0) {
      setError('Please specify at least one material to issue.')
      return
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (!it.material_id) {
        setError(`Item #${i + 1} material is required.`)
        return
      }
      if (Number(it.issued_quantity) <= 0) {
        setError(`Item #${i + 1} (${it.material_name}) issued quantity must be greater than zero.`)
        return
      }
    }

    setLoading(true)

    try {
      const fullNotes = [
        notes.trim(),
        issueVoucherNo ? `Voucher: ${issueVoucherNo}` : null,
        assignedMachine
          ? `Machine: ${PRODUCTION_MACHINES.find((m) => m.id === assignedMachine)?.name || assignedMachine}`
          : null,
        jobReference ? `Job Ref: ${jobReference}` : null,
      ]
        .filter(Boolean)
        .join(' | ')

      const res = await issueMaterialAction(
        {
          request_id: mode === 'requisition' ? activeRequest?.id || null : null,
          production_task_id: mode === 'requisition' ? activeRequest?.production_task_id || null : null,
          source_location_id: sourceLocationId,
          destination_location_id: destinationLocationId || null,
          received_by_name: receivedByName.trim() || null,
          notes: fullNotes || null,
          items: items.map((it) => ({
            request_item_id: it.request_item_id || null,
            material_id: it.material_id,
            issued_quantity: it.consumption_quantity || it.issued_quantity,
            unit: it.consumption_unit,
            purchase_unit: it.purchase_unit,
            purchase_quantity: it.issued_quantity,
            width_ft: it.selected_width_ft,
            length_ft: it.selected_length_ft,
            unit_cost:
              it.cost_per_consumption_unit ||
              (it.consumption_quantity > 0 ? it.total_cost / it.consumption_quantity : it.unit_cost),
            roll_id: it.roll_id || null,
          })),
        },
        companyId
      )

      if (!res.success) {
        setError(res.error || 'Failed to issue material.')
        return
      }

      setSuccessMsg('Materials dispatched and inventory ledger deducted successfully in purchase units!')
      setTimeout(() => {
        onSuccess?.()
        onOpenChange(false)
        setNotes('')
      }, 800)
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  const eligibleRequests = requests.filter((r) => r.status === 'requested' || r.status === 'approved')

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      size="4xl"
      onSubmit={handleSubmit}
      title={
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-linear-to-br from-indigo-500 to-indigo-700 text-white shadow-md flex items-center justify-center font-bold shrink-0">
            <Send className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {mode === 'requisition'
                  ? tBilingual('Fulfill Floor Requisition', 'রিকুইজিশন অনুযায়ী মাল ইস্যু')
                  : tBilingual('Direct Material Issue to Production', 'সরাসরি প্রিন্টিং ফ্লোরে মাল প্রদান')}
              </h2>
              <Badge
                variant="outline"
                className="text-[10px] uppercase font-mono py-0.5 px-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700"
              >
                Dispatch Gate
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {tBilingual(
                'Deduct stock from store and allocate rolls/sheets to print press or workstation',
                'গোডাউন থেকে স্টক কর্তন করে মেশিন বা কারিগরকে কাঁচামাল বুঝিয়ে দিন'
              )}
            </p>
          </div>
        </div>
      }
      footer={
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 w-full">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto min-h-[40px] text-xs font-semibold cursor-pointer"
          >
            {tBilingual('Cancel', 'বাতিল')}
          </Button>

          <Button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto min-h-[40px] text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-7 shadow-md cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                <span>Processing Dispatch...</span>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                <span>
                  {mode === 'requisition'
                    ? tBilingual('Confirm Requisition Issue', 'রিকুইজিশন ছাড় করুন')
                    : tBilingual('Dispatch to Production Floor', 'ফ্লোরে মাল প্রদান সম্পন্ন করুন')}
                </span>
              </div>
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 pt-1 pb-2">
        {/* Success Alert */}
        {successMsg && (
          <div className="p-3.5 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200 rounded-xl border border-emerald-300 dark:border-emerald-800 text-xs flex items-center gap-2 animate-in fade-in-0">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-rose-50 text-rose-900 dark:bg-rose-950/50 dark:text-rose-200 rounded-xl border border-rose-300 dark:border-rose-800 text-xs flex items-center gap-2 animate-in fade-in-0">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* 2-WAY DISPATCH MODE SELECTOR */}
        <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-900/90 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setMode('requisition')}
            className={cn(
              'flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-bold transition-all text-center cursor-pointer',
              mode === 'requisition'
                ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span className="truncate">{tBilingual('Fulfill Floor Requisition', 'রিকুইজিশন ছাড়')}</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('direct')}
            className={cn(
              'flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-bold transition-all text-center cursor-pointer',
              mode === 'direct'
                ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            <Send className="h-4 w-4 shrink-0" />
            <span className="truncate">{tBilingual('Direct Machine / Floor Dispatch', 'সরাসরি ফ্লোর ইস্যু')}</span>
          </button>
        </div>

        {/* REQUISITION PICKER (When Mode === Requisition) */}
        {mode === 'requisition' && (
          <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20 p-4 space-y-3 shadow-xs animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  {tBilingual('Select Floor Requisition Order', 'ফ্লোর রিকুইজিশন নির্বাচন')}
                </h3>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Pending / Approved Requisition', 'অনুমোদিত রিকুইজিশন')} <span className="text-rose-500">*</span>
              </Label>
              <select
                value={selectedRequestId || activeRequest?.id || ''}
                onChange={(e) => handleRequestChange(e.target.value)}
                className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
                required
              >
                <option value="">-- Choose Requisition to Fulfill --</option>
                {eligibleRequests.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.request_number} — {r.requested_by_name} ({r.priority.toUpperCase()}) —{' '}
                    {r.production_task?.title || 'General Task'}
                  </option>
                ))}
              </select>
            </div>

            {/* Requisition Intel Card */}
            {activeRequest && (
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-indigo-200 dark:border-indigo-800 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Requested By:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                    {activeRequest.requested_by_name}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Target Production Task:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                    {activeRequest.production_task?.title || 'Floor Stock Allocation'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Priority:</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[9px] uppercase font-bold mt-0.5',
                      activeRequest.priority === 'urgent'
                        ? 'bg-rose-50 text-rose-700 border-rose-300'
                        : activeRequest.priority === 'high'
                        ? 'bg-amber-50 text-amber-700 border-amber-300'
                        : 'bg-slate-50 text-slate-700'
                    )}
                  >
                    {activeRequest.priority}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        )}

        {/* LOGISTICS, LOCATIONS & HANDOVER BAR */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {tBilingual('Store Location, Handover & Machine Assignment', 'উৎস গোডাউন ও মেশিন বরাদ্দ')}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Source Warehouse (Auto Selected) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs font-semibold block">
                  {tBilingual('Source Store (Deduct Stock)', 'উৎস গোডাউন')} <span className="text-rose-500">*</span>
                </Label>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                  <Sparkles className="h-3 w-3" /> Auto
                </span>
              </div>
              <select
                value={sourceLocationId || (effectiveLocations[0]?.id ?? '')}
                onChange={(e) => setSourceLocationId(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                required
              >
                {effectiveLocations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.location_name} ({loc.location_code})
                  </option>
                ))}
              </select>
            </div>

            {/* Destination Buffer */}
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Destination Floor / Buffer', 'গন্তব্য ফ্লোর / বাফার')}
              </Label>
              <select
                value={destinationLocationId}
                onChange={(e) => setDestinationLocationId(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
              >
                <option value="">-- Direct Machine / Floor (Default) --</option>
                {effectiveLocations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.location_name} ({loc.location_code})
                  </option>
                ))}
              </select>
            </div>

            {/* Target Machine */}
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Target Press / Workstation', 'বরাদ্দকৃত মেশিন')}
              </Label>
              <select
                value={assignedMachine}
                onChange={(e) => setAssignedMachine(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
              >
                {PRODUCTION_MACHINES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Received By Operator */}
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Handover to (Operator / Lead)', 'গ্রহণকারী অপারেটর')} <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="e.g. Rahim (Head Pressman)"
                value={receivedByName}
                onChange={(e) => setReceivedByName(e.target.value)}
                className="text-xs h-9"
                required
              />
            </div>

            {/* Job Order / Task Link */}
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Job Order / Task Ref (Optional)', 'জব অর্ডার বা টাস্ক')}
              </Label>
              <Input
                placeholder="e.g. JOB-2026-1042 / Banner Print"
                value={jobReference}
                onChange={(e) => setJobReference(e.target.value)}
                className="text-xs h-9 font-mono"
              />
            </div>

            {/* Issue Voucher # */}
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Issue Voucher / Gate Pass #', 'ভাউচার নং')}
              </Label>
              <Input
                value={issueVoucherNo}
                onChange={(e) => setIssueVoucherNo(e.target.value)}
                className="text-xs h-9 font-mono bg-slate-50 dark:bg-slate-900"
              />
            </div>
          </div>
        </div>

        {/* ITEMS RELEASE & PURCHASE UNIT QUANTITY BUILDER */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {tBilingual('Materials, Roll Allocations & Release Quantities', 'কাঁচামাল ও প্রদানের পরিমাণ')}
              </h3>
            </div>

            {mode === 'direct' && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddItem}
                className="h-7 text-xs font-bold text-indigo-700 border-indigo-300 hover:bg-indigo-50 dark:text-indigo-300 dark:border-indigo-700 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                {tBilingual('Add Material Line', 'নতুন আইটেম')}
              </Button>
            )}
          </div>

          <div className="space-y-3 max-h-[42vh] overflow-y-auto pr-1">
            {items.map((item, idx) => {
              const liveMat = materials.find((m) => m.id === item.material_id)
              const breakdown = liveMat ? getMaterialWarehouseStockBreakdown(liveMat) : null

              const availableRollsCount = breakdown?.total_rolls ?? 0
              const availableStockSft = Number(liveMat?.current_stock || 0)

              // Insufficient check in purchase units and consumption units
              const isInsufficient = breakdown?.is_roll
                ? availableRollsCount < item.issued_quantity || availableStockSft < item.consumption_quantity
                : availableStockSft < item.consumption_quantity

              // Filter physical rolls available in warehouse for this material
              const matchingRolls = rolls.filter((r) => {
                const matchMat =
                  r.material_id === item.material_id ||
                  (liveMat?.sku && r.material?.sku && r.material.sku.toLowerCase() === liveMat.sku.toLowerCase())
                const matchStatus = r.status === 'available' || r.status === 'in_warehouse' || !r.status
                const matchWidth = item.selected_width_ft ? Number(r.width_ft) === item.selected_width_ft : true
                return matchMat && matchStatus && matchWidth
              })

              return (
                <div
                  key={item.id || idx}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-2.5 text-xs shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="h-5 w-5 rounded-md bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200 font-mono font-bold flex items-center justify-center text-[10px]">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {liveMat?.name || item.material_name}
                      </span>
                      {liveMat?.sku && (
                        <Badge variant="outline" className="text-[9px] font-mono py-0 px-1.5">
                          {liveMat.sku}
                        </Badge>
                      )}
                      <Badge
                        variant="secondary"
                        className="text-[9px] font-semibold uppercase bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200 py-0 px-1.5"
                      >
                        Purchase Unit: {item.purchase_unit}
                      </Badge>
                    </div>

                    {mode === 'direct' && items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                        title="Remove line"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    {/* Material Selector */}
                    <div className={cn(breakdown?.is_roll ? 'sm:col-span-4' : 'sm:col-span-5')}>
                      <Label className="text-[11px] text-slate-500 mb-0.5 block">
                        Material Substrate <span className="text-rose-500">*</span>
                      </Label>
                      {mode === 'direct' ? (
                        <select
                          value={item.material_id}
                          onChange={(e) => handleMaterialSelect(idx, e.target.value)}
                          className="w-full h-8.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs font-medium"
                          required
                        >
                          <option value="">-- Choose Material Item --</option>
                          {materials.map((m) => {
                            const b = getMaterialWarehouseStockBreakdown(m)
                            return (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.sku}) — Stock: {b.purchase_unit_display}
                              </option>
                            )
                          })}
                        </select>
                      ) : (
                        <div className="h-8.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {item.material_name}
                        </div>
                      )}
                    </div>

                    {/* Roll Size / Dimension Selector (if Roll Substrate) */}
                    {breakdown?.is_roll && (
                      <div className="sm:col-span-3">
                        <Label className="text-[11px] text-slate-500 mb-0.5 block">
                          Roll Dimension <span className="text-rose-500">*</span>
                        </Label>
                        <select
                          value={`${item.selected_width_ft}x${item.selected_length_ft}`}
                          onChange={(e) => {
                            const [w, l] = e.target.value.split('x').map(Number)
                            const foundSize = breakdown.roll_items.find(
                              (r) => r.width_ft === w && r.length_ft === l
                            ) || {
                              width_ft: w || 3,
                              length_ft: l || 164,
                              label: `${w}ft × ${l}ft`,
                            }
                            handleSizeChange(idx, {
                              width_ft: foundSize.width_ft,
                              length_ft: foundSize.length_ft,
                              label: foundSize.label || `${foundSize.width_ft}ft × ${foundSize.length_ft}ft`,
                            })
                          }}
                          className="w-full h-8.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs font-medium"
                        >
                          {breakdown.roll_items.length > 0 ? (
                            breakdown.roll_items.map((r, sIdx) => (
                              <option key={sIdx} value={`${r.width_ft}x${r.length_ft}`}>
                                {r.label} ({r.width_ft * r.length_ft} sft/roll) — {r.roll_count} In Stock
                              </option>
                            ))
                          ) : (
                            <option value="3x164">3ft × 164ft (492 sft/roll)</option>
                          )}
                        </select>
                      </div>
                    )}

                    {/* Issue Quantity in PURCHASE UNIT */}
                    <div className={cn(breakdown?.is_roll ? 'sm:col-span-2' : 'sm:col-span-2')}>
                      <Label className="text-[11px] text-slate-500 mb-0.5 block truncate">
                        Issue Qty ({item.purchase_unit.toUpperCase()}) <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        type="number"
                        step="any"
                        min="1"
                        value={item.issued_quantity}
                        onChange={(e) => handleIssuedQuantityChange(idx, Number(e.target.value))}
                        className={cn(
                          'h-8.5 text-xs font-bold font-mono',
                          isInsufficient ? 'border-rose-500 text-rose-600 focus:ring-rose-500' : ''
                        )}
                        required
                      />
                      {item.purchase_unit !== item.consumption_unit && (
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-bold block mt-0.5">
                          (= {item.consumption_quantity.toLocaleString()} {item.consumption_unit})
                        </span>
                      )}
                    </div>

                    {/* Unit Rate (৳ / Purchase Unit) */}
                    <div className={cn(breakdown?.is_roll ? 'sm:col-span-3' : 'sm:col-span-2')}>
                      <Label className="text-[11px] text-slate-500 mb-0.5 block">
                        Unit Rate (৳ / {item.purchase_unit})
                      </Label>
                      <div className="h-8.5 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center font-mono text-slate-700 dark:text-slate-300 truncate text-[11px]">
                        <span>{formatBDT(item.unit_cost)}</span>
                        {item.purchase_unit !== item.consumption_unit && item.cost_per_consumption_unit > 0 && (
                          <span className="text-[10px] text-slate-400 ml-1 truncate">
                            ({formatBDT(item.cost_per_consumption_unit)}/{item.consumption_unit})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Physical Roll Tag (Optional) - full row or span */}
                    {!breakdown?.is_roll && (
                      <div className="sm:col-span-3">
                        <Label className="text-[11px] text-slate-500 mb-0.5 block">
                          Physical Tag / Lot # (Optional)
                        </Label>
                        <select
                          value={item.roll_id || ''}
                          onChange={(e) => handleRollTagSelect(idx, e.target.value || null)}
                          className="w-full h-8.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-[11px] font-mono"
                        >
                          <option value="">-- Bulk Store Allocation --</option>
                          {matchingRolls.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.roll_code || r.roll_tag} ({r.width_ft}ft × {r.current_length_ft ?? r.initial_length_ft}ft)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Stock Availability & Insufficient Warning */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                      <span>
                        On-Hand in Store:{' '}
                        <strong className="text-slate-800 dark:text-slate-200">
                          {breakdown?.formatted_summary || `${availableStockSft} ${item.consumption_unit}`}
                          {breakdown?.is_roll && (
                            <span className="text-indigo-600 dark:text-indigo-400 font-semibold ml-1">
                              [Total: {breakdown.purchase_unit_display} / {breakdown.consumption_unit_display}]
                            </span>
                          )}
                        </strong>
                      </span>
                      {item.requested_quantity !== undefined && (
                        <span>
                          | Requisitioned:{' '}
                          <strong className="text-indigo-600">
                            {item.requested_quantity} {item.purchase_unit}
                          </strong>
                        </span>
                      )}
                      {isInsufficient && (
                        <span className="text-rose-600 font-bold flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Insufficient Store Balance!
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span>Valuation:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {formatBDT(item.total_cost)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Issue Summary Banner */}
          <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex justify-between items-center text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Total Material Releases:</span>
              <div className="font-mono text-slate-700 dark:text-slate-300 font-bold">
                {items.length} line item(s) configured ({totalQuantitySum} purchase units)
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Stock Valuation</span>
              <div className="text-xl font-black text-indigo-700 dark:text-indigo-400 font-mono">
                {formatBDT(totalValuation)}
              </div>
            </div>
          </div>
        </div>

        {/* REMARKS & HANDLING INSTRUCTIONS */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-2 shadow-xs">
          <Label className="text-xs font-semibold block">
            {tBilingual('Handling Notes & Handover Remarks (Optional)', 'হস্তান্তর মন্তব্য ও বিশেষ নির্দেশনা')}
          </Label>
          <textarea
            rows={2}
            placeholder="e.g. Delivered full roll to Roland Press #1; handle vinyl film with protective wrap..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>
    </ModalDialog>
  )
}
