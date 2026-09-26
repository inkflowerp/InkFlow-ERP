'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, Scissors, Printer, Info, Disc } from 'lucide-react'
import { MaterialRecord, InventoryLocationRecord, FloorConsumptionRecord, InventoryRollRecord } from '@/types/inventory.types'
import { ProductionTaskRecord } from '@/types/production.types'
import {
  logProductionConsumptionAction,
  logFloorConsumptionAction,
  consumeRollWithBleedAndWastageAction,
} from '@/actions/inventory.actions'
import { formatFloorPieceDisplay } from '@/lib/units'
import { Badge } from '@/components/ui/badge'

interface LogConsumptionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  materials: MaterialRecord[]
  locations: InventoryLocationRecord[]
  tasks?: ProductionTaskRecord[]
  rolls?: InventoryRollRecord[]
  selectedTaskId?: string
  selectedMaterialId?: string
  selectedRollId?: string
  selectedFloorRecord?: FloorConsumptionRecord | null
  onSuccess?: () => void
  companyId?: string
}

export function LogConsumptionModal({
  open,
  onOpenChange,
  materials,
  locations,
  tasks = [],
  rolls = [],
  selectedTaskId,
  selectedMaterialId,
  selectedRollId,
  selectedFloorRecord,
  onSuccess,
  companyId,
}: LogConsumptionModalProps) {
  const [taskId, setTaskId] = useState(selectedTaskId || (tasks[0]?.id || ''))
  const [materialId, setMaterialId] = useState(
    selectedFloorRecord?.material_id || selectedMaterialId || (materials[0]?.id || '')
  )
  const [rollId, setRollId] = useState<string>(selectedRollId || '')
  const [bleedAllowanceIn, setBleedAllowanceIn] = useState<number>(3)
  const [consumedQty, setConsumedQty] = useState<number>(() => {
    if (selectedFloorRecord) {
      const initialRemaining = Number(selectedFloorRecord.remaining_floor_balance) || 1
      return Math.min(initialRemaining, Math.max(1, initialRemaining))
    }
    return 1
  })
  const [returnedQty, setReturnedQty] = useState<number>(0)
  const [returnLocationId, setReturnLocationId] = useState(locations[0]?.id || '')
  const [wastageQty, setWastageQty] = useState<number>(0)
  const [wastageReason, setWastageReason] = useState('')
  const [jobRef, setJobRef] = useState(selectedFloorRecord?.job_reference || '')
  const [operatorName, setOperatorName] = useState(selectedFloorRecord?.operator_name || '')
  const [notes, setNotes] = useState('')

  // Discrete Remnants List
  const [remnants, setRemnants] = useState<
    Array<{
      width: number
      length: number
      dimension_unit: string
      location_id: string
      condition: 'excellent' | 'usable' | 'minor_defect'
      notes: string
    }>
  >([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Matching active rolls/pieces on floor
  const availableRollsOnFloor = useMemo(() => {
    return (rolls || []).filter((r) => {
      const matchMat = !materialId || r.material_id === materialId
      const matchStatus =
        r.status === 'mounted' ||
        r.status === 'available' ||
        r.status === 'in_use' ||
        r.status === 'on_floor' ||
        r.location_name === 'Print Floor' ||
        Boolean(r.mounted_machine_id) ||
        Boolean(r.mounted_machine_name)
      const len = Number(r.current_length_ft ?? r.remaining_area_sft)
      return matchMat && matchStatus && len > 0
    })
  }, [rolls, materialId])

  const selectedActiveRoll = useMemo(() => {
    if (rollId) return (rolls || []).find((r) => r.id === rollId) || null
    if (selectedFloorRecord?.id) {
      const byId = (rolls || []).find((r) => r.id === selectedFloorRecord.id)
      if (byId) return byId
    }
    return availableRollsOnFloor[0] || null
  }, [rolls, rollId, selectedFloorRecord, availableRollsOnFloor])

  // Sync state when floor record is passed
  useEffect(() => {
    if (selectedFloorRecord) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMaterialId(selectedFloorRecord.material_id)
      setJobRef(selectedFloorRecord.job_reference || '')
      setOperatorName(selectedFloorRecord.operator_name || '')
      const initialRemaining = Number(selectedFloorRecord.remaining_floor_balance) || 1
      setConsumedQty(Math.min(initialRemaining, Math.max(1, initialRemaining)))
      setReturnedQty(0)
      setWastageQty(0)
    } else if (selectedRollId) {
      const r = (rolls || []).find((x) => x.id === selectedRollId)
      if (r) {
        setRollId(r.id)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMaterialId(r.material_id)
        setConsumedQty(1)
      }
    } else if (selectedMaterialId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMaterialId(selectedMaterialId)
    }
  }, [selectedFloorRecord, selectedMaterialId, selectedRollId, rolls])

  const activeMat = materials.find((m) => m.id === materialId) || (selectedFloorRecord?.material ? (selectedFloorRecord.material as MaterialRecord) : undefined)
  const floorUnit = selectedActiveRoll ? 'ft' : (activeMat?.unit || selectedFloorRecord?.unit || 'pcs')
  const floorMaxBalance = selectedActiveRoll
    ? Number(selectedActiveRoll.current_length_ft ?? (selectedActiveRoll.remaining_area_sft / (selectedActiveRoll.width_ft || 1)))
    : (selectedFloorRecord ? Number(selectedFloorRecord.remaining_floor_balance) : null)

  const bleedFt = selectedActiveRoll ? (Number(bleedAllowanceIn) || 0) / 12 : 0
  const totalActionQty = Number(consumedQty || 0) + Number(returnedQty || 0) + Number(wastageQty || 0) + bleedFt
  const isOverFloorBalance = floorMaxBalance !== null && totalActionQty > floorMaxBalance + 0.001

  const handleAddRemnant = () => {
    const remLocation = locations.find((l) => l.location_type === 'remnant_rack') || locations[0]
    setRemnants([
      ...remnants,
      {
        width: 10,
        length: 5,
        dimension_unit: 'ft',
        location_id: remLocation?.id || '',
        condition: 'usable',
        notes: '',
      },
    ])
  }

  const handleRemoveRemnant = (idx: number) => {
    setRemnants(remnants.filter((_, i) => i !== idx))
  }

  const handleRemnantChange = (idx: number, field: string, val: any) => {
    const updated = [...remnants]
    updated[idx] = { ...updated[idx], [field]: val }
    setRemnants(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!materialId && !selectedFloorRecord && !selectedActiveRoll) {
      setError('Please select a material substrate.')
      return
    }

    if (isOverFloorBalance) {
      setError(`Total Quantity (${totalActionQty.toFixed(2)} ${floorUnit}) exceeds remaining floor balance (${floorMaxBalance?.toFixed(2)} ${floorUnit}).`)
      return
    }

    setLoading(true)

    try {
      if (selectedActiveRoll) {
        // Direct Active Physical Piece Consumption
        const res = await consumeRollWithBleedAndWastageAction(
          {
            roll_id: selectedActiveRoll.id,
            linear_length_consumed_ft: Number(consumedQty) || 0,
            bleed_allowance_ft: (Number(bleedAllowanceIn) || 0) / 12,
            wastage_length_ft: Number(wastageQty) || 0,
            wastage_reason: wastageQty > 0 ? wastageReason.trim() : null,
            production_task_id: taskId || null,
            job_order_id: null,
            notes: notes.trim() || `Consumed ${consumedQty} ft from ${selectedActiveRoll.roll_code || selectedActiveRoll.roll_tag}`,
          },
          companyId
        )

        if (!res.success) {
          setError(res.error || 'Failed to consume from active roll.')
          return
        }
      } else if (selectedFloorRecord) {
        // Direct Floor Consumption Sign-off
        const res = await logFloorConsumptionAction(
          {
            issue_id: selectedFloorRecord.issue_id,
            issue_item_id: selectedFloorRecord.issue_item_id,
            material_id: materialId || selectedFloorRecord.material_id,
            consumed_quantity: Number(consumedQty) || 0,
            unit: floorUnit,
            wastage_quantity: Number(wastageQty) || 0,
            wastage_reason: wastageQty > 0 ? wastageReason.trim() : null,
            returned_quantity: Number(returnedQty) || 0,
            return_location_id: returnedQty > 0 ? returnLocationId : null,
            machine_id: selectedFloorRecord.machine_id,
            machine_name: selectedFloorRecord.machine_name,
            job_reference: jobRef || selectedFloorRecord.job_reference,
            operator_name: operatorName || selectedFloorRecord.operator_name,
            remnants: remnants.map((r) => ({
              width: Number(r.width),
              length: Number(r.length),
              dimension_unit: r.dimension_unit,
              quantity: 1,
              location_id: r.location_id,
              condition: r.condition,
              notes: r.notes.trim() || null,
            })),
            notes: notes.trim() || null,
          },
          companyId
        )

        if (!res.success) {
          setError(res.error || 'Failed to log floor consumption.')
          return
        }
      } else {
        // Standard Task Consumption Sign-off
        if (!taskId && tasks.length > 0) {
          setError('Please select a production task.')
          return
        }

        const res = await logProductionConsumptionAction(
          {
            production_task_id: taskId || 'general_floor_task',
            material_id: materialId,
            consumed_quantity: Number(consumedQty) || 0,
            unit: floorUnit,
            returned_quantity: Number(returnedQty) || 0,
            return_location_id: returnedQty > 0 ? returnLocationId : null,
            wastage_quantity: Number(wastageQty) || 0,
            wastage_reason: wastageQty > 0 ? wastageReason.trim() : null,
            remnants: remnants.map((r) => ({
              width: Number(r.width),
              length: Number(r.length),
              dimension_unit: r.dimension_unit,
              quantity: 1,
              location_id: r.location_id,
              condition: r.condition,
              notes: r.notes.trim() || null,
            })),
          },
          companyId
        )

        if (!res.success) {
          setError(res.error || 'Failed to log production consumption.')
          return
        }
      }

      onSuccess?.()
      onOpenChange(false)
      setRemnants([])
      setWastageQty(0)
      setReturnedQty(0)
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      title={selectedActiveRoll ? "Print Floor Piece Consumption Sign-Off" : selectedFloorRecord ? "Print Floor Material Consumption Sign-Off" : "Production Consumption & Scrap Sign-Off"}
      description="Record actual substrate used, return unused stock, log scrap reasons, and register reusable remnants."
      hideFooter
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto px-1">
        {error && (
          <div className="p-3 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 rounded-lg text-xs font-semibold border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        {/* Selected Active Floor Piece Card */}
        {selectedActiveRoll && (
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-blue-900 dark:text-blue-200 font-mono">
                <Disc className="w-4 h-4 text-blue-600" />
                <span>Piece: {selectedActiveRoll.roll_code || selectedActiveRoll.roll_tag}</span>
              </div>
              <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold uppercase text-2xs">
                {selectedActiveRoll.status} (1 Pcs)
              </Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-blue-500/10 text-slate-700 dark:text-slate-300">
              <div>
                <span className="text-slate-400 block text-2xs">Substrate</span>
                <span className="font-semibold truncate block">{selectedActiveRoll.material?.name || activeMat?.name || 'Roll Substrate'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-2xs">Roll Width</span>
                <span className="font-bold block">{selectedActiveRoll.width_ft} ft</span>
              </div>
              <div>
                <span className="text-slate-400 block text-2xs">Initial Spec</span>
                <span className="font-semibold block">{selectedActiveRoll.initial_length_ft} ft</span>
              </div>
              <div>
                <span className="text-slate-400 block text-2xs">Available Length</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 block">
                  {Number(selectedActiveRoll.current_length_ft ?? 0).toFixed(2)} ft — 1 Pcs
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Floor Record Context Card */}
        {!selectedActiveRoll && selectedFloorRecord && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
                <Printer className="w-4 h-4 text-amber-600" />
                <span>Issue: {selectedFloorRecord.issue_number || selectedFloorRecord.id.slice(0, 8)}</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold uppercase tracking-wider text-2xs">
                {selectedFloorRecord.status.replace('_', ' ')}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-amber-500/10 text-slate-700 dark:text-slate-300">
              <div>
                <span className="text-slate-400 block text-2xs">Material</span>
                <span className="font-semibold truncate block">{selectedFloorRecord.material_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-2xs">Workstation</span>
                <span className="font-semibold block">{selectedFloorRecord.machine_name || 'Floor General'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-2xs">Total Issued</span>
                <span className="font-semibold block">{selectedFloorRecord.issued_quantity} {selectedFloorRecord.unit}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-2xs">Floor Balance</span>
                <span className="font-black text-amber-600 dark:text-amber-400 block">
                  {selectedFloorRecord.remaining_floor_balance} {selectedFloorRecord.unit}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Active Floor Piece Selection Dropdown */}
        {availableRollsOnFloor.length > 0 && (
          <div className="space-y-1.5 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Disc className="w-3.5 h-3.5 text-blue-600" />
              Select Active Piece on Print Floor ({availableRollsOnFloor.length} active pieces)
            </Label>
            <select
              value={rollId || selectedActiveRoll?.id || ''}
              onChange={(e) => setRollId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-semibold text-slate-900 dark:text-white"
            >
              {availableRollsOnFloor.map((r: InventoryRollRecord) => (
                <option key={r.id} value={r.id}>
                  {formatFloorPieceDisplay(r)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {!selectedFloorRecord && !selectedActiveRoll && (
            <div className="space-y-1.5">
              <Label htmlFor="cTask" required>
                Production Task
              </Label>
              <select
                id="cTask"
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                required
              >
                <option value="">-- Choose Task --</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.task_number || t.id.slice(0, 8)} - {t.task_name || 'Task'}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className={`space-y-1.5 ${selectedFloorRecord || selectedActiveRoll ? 'col-span-1 sm:col-span-2' : ''}`}>
            <Label htmlFor="cMat" required>
              Material Substrate
            </Label>
            {selectedFloorRecord ? (
              <Input
                value={`${selectedFloorRecord.material_name} (${selectedFloorRecord.sku || selectedFloorRecord.material_id.slice(0, 8)})`}
                disabled
                className="bg-slate-100 dark:bg-slate-800 font-semibold text-xs"
              />
            ) : selectedActiveRoll ? (
              <Input
                value={`${selectedActiveRoll.material?.name || activeMat?.name || 'Roll Substrate'} (${selectedActiveRoll.width_ft}ft Wide • Piece #${selectedActiveRoll.roll_code || selectedActiveRoll.roll_tag})`}
                disabled
                className="bg-slate-100 dark:bg-slate-800 font-semibold text-xs"
              />
            ) : (
              <select
                id="cMat"
                value={materialId}
                onChange={(e) => setMaterialId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                required
              >
                <option value="">-- Choose Material --</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} [SKU: {m.sku}]
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Consumption & Return Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border text-xs">
          <div className="space-y-1">
            <Label required>Actual Consumed ({floorUnit})</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={consumedQty}
              onChange={(e) => setConsumedQty(Number(e.target.value))}
              required
            />
          </div>

          {selectedActiveRoll ? (
            <div className="space-y-1">
              <Label>Bleed Margin (inches)</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={bleedAllowanceIn}
                onChange={(e) => setBleedAllowanceIn(Number(e.target.value))}
              />
            </div>
          ) : (
            <div className="space-y-1">
              <Label>Return Unused ({floorUnit})</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={returnedQty}
                onChange={(e) => setReturnedQty(Number(e.target.value))}
              />
            </div>
          )}

          <div className="space-y-1">
            <Label>Scrap / Wastage ({floorUnit})</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={wastageQty}
              onChange={(e) => setWastageQty(Number(e.target.value))}
            />
          </div>
        </div>


        {/* Live Balance Calculation Alert */}
        {floorMaxBalance !== null && (
          <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${
            isOverFloorBalance 
              ? 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300' 
              : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
          }`}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 font-medium">
                <Info className="w-4 h-4 text-blue-600" />
                <span>
                  Deducting: <strong>{totalActionQty.toFixed(2)}</strong> {floorUnit}
                  {selectedActiveRoll && (
                    <span className="text-slate-500 ml-1 font-mono">
                      ({Math.round(totalActionQty * (selectedActiveRoll.width_ft || 3) * 100) / 100} sqft)
                    </span>
                  )}
                </span>
              </div>
              <div className="font-bold text-slate-900 dark:text-white">
                Remaining Length: {Math.max(0, floorMaxBalance - totalActionQty).toFixed(2)} {floorUnit} — 1 Pcs
              </div>
            </div>

            {selectedActiveRoll && (
              <div className="pt-1 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-2xs text-slate-500 dark:text-slate-400 font-mono">
                <span>
                  Physical Spec: {selectedActiveRoll.width_ft}ft × {Math.max(0, floorMaxBalance - totalActionQty).toFixed(2)}ft
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  Derived Area: {Math.round(Math.max(0, floorMaxBalance - totalActionQty) * (selectedActiveRoll.width_ft || 3) * 100) / 100} sqft
                </span>
              </div>
            )}
          </div>
        )}

        {returnedQty > 0 && (
          <div className="space-y-1.5 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800 text-xs">
            <Label required className="text-emerald-900 dark:text-emerald-200">
              Return Store Location
            </Label>
            <select
              value={returnLocationId}
              onChange={(e) => setReturnLocationId(e.target.value)}
              className="w-full h-9 px-2 rounded border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              required
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.location_name} ({loc.location_code})
                </option>
              ))}
            </select>
          </div>
        )}

        {wastageQty > 0 && (
          <div className="space-y-1.5 p-2.5 bg-red-50 dark:bg-red-950/40 rounded-lg border border-red-200 dark:border-red-800 text-xs">
            <Label required className="text-red-900 dark:text-red-200">
              Wastage Root Cause Reason
            </Label>
            <select
              value={wastageReason}
              onChange={(e) => setWastageReason(e.target.value)}
              className="w-full h-9 px-2 rounded border border-red-300 dark:border-red-700 bg-white dark:bg-slate-900 text-xs font-semibold mb-1"
              required
            >
              <option value="">-- Select Root Cause --</option>
              <option value="Cutting & Margin Loss">Cutting & Margin Loss</option>
              <option value="Print Head Banding / Machine Error">Print Head Banding / Machine Error</option>
              <option value="Color Calibration Strips">Color Calibration Strips</option>
              <option value="Substrate Wrinkle / Feed Jam">Substrate Wrinkle / Feed Jam</option>
              <option value="Artwork / Layout Discrepancy">Artwork / Layout Discrepancy</option>
              <option value="Lamination Bubble / Crease">Lamination Bubble / Crease</option>
              <option value="Installation Handling Damage">Installation Handling Damage</option>
            </select>
            <Input
              placeholder="Additional details / machine notes..."
              value={wastageReason}
              onChange={(e) => setWastageReason(e.target.value)}
            />
          </div>
        )}

        {/* Reusable Remnants Section */}
        <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Scissors className="h-4 w-4 text-purple-600" />
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                Discrete Reusable Remnants ({remnants.length})
              </span>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={handleAddRemnant} className="h-7 text-xs">
              <Plus className="h-3 w-3 mr-1" /> Add Remnant
            </Button>
          </div>

          {remnants.length === 0 ? (
            <p className="text-2xs text-slate-400 italic">
              No usable offcuts. Click &quot;Add Remnant&quot; to catalog usable roll/sheet leftovers for future small jobs.
            </p>
          ) : (
            <div className="space-y-2">
              {remnants.map((r, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-purple-50/60 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-900 dark:text-purple-300">
                      Remnant #{idx + 1} ({r.width} × {r.length} {r.dimension_unit} ={' '}
                      <strong>{r.width * r.length} SFT</strong>)
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveRemnant(idx)}
                      className="h-6 w-6 p-0 text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <Label>Width</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={r.width}
                        onChange={(e) => handleRemnantChange(idx, 'width', Number(e.target.value))}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label>Length</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={r.length}
                        onChange={(e) => handleRemnantChange(idx, 'length', Number(e.target.value))}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label>Location Rack</Label>
                      <select
                        value={r.location_id}
                        onChange={(e) => handleRemnantChange(idx, 'location_id', e.target.value)}
                        className="w-full h-8 px-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      >
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.location_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Condition</Label>
                      <select
                        value={r.condition}
                        onChange={(e) => handleRemnantChange(idx, 'condition', e.target.value)}
                        className="w-full h-8 px-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold capitalize"
                      >
                        <option value="excellent">Excellent</option>
                        <option value="usable">Usable</option>
                        <option value="minor_defect">Minor Defect</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <Label>Remarks / Sign-Off Notes</Label>
          <Input
            placeholder="Any production notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="h-9 text-xs"
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto min-h-[40px]">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || Boolean(isOverFloorBalance)}
            className="w-full sm:w-auto min-h-[40px] bg-purple-600 hover:bg-purple-700 text-white font-bold"
          >
            {loading ? 'Submitting...' : 'Sign-Off Consumption & Remnants'}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
