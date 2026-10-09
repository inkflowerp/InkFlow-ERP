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
import { formatFloorPieceDisplay, isUserSku } from '@/lib/units'
import { Badge } from '@/components/ui/badge'
import { PrintFlowDataStore, STORAGE_KEYS } from '@/lib/db/data-store'

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
  const [consumedQty, setConsumedQty] = useState<number>(1)
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
      const len = Number(r.current_length_ft ?? r.remaining_area_sft ?? r.initial_length_ft ?? 0)
      return matchMat && matchStatus && len > 0
    })
  }, [rolls, materialId])

  // Identify matching roll if selectedFloorRecord is linked to a roll or is a roll record
  const matchingRollForFloorRecord = useMemo(() => {
    if (!selectedFloorRecord) return null
    if (
      (selectedFloorRecord as any).width_ft ||
      (selectedFloorRecord as any).roll_code ||
      (selectedFloorRecord as any).initial_length_ft
    ) {
      return selectedFloorRecord as unknown as InventoryRollRecord
    }
    if (selectedFloorRecord.roll_id) {
      const byRollId = (rolls || []).find((r) => r.id === selectedFloorRecord.roll_id)
      if (byRollId) return byRollId
    }
    if (selectedFloorRecord.roll_code) {
      const byRollCode = (rolls || []).find(
        (r) => r.roll_code === selectedFloorRecord.roll_code || r.roll_tag === selectedFloorRecord.roll_code
      )
      if (byRollCode) return byRollCode
    }
    const byId = (rolls || []).find((r) => r.id === selectedFloorRecord.id)
    if (byId) return byId
    return null
  }, [selectedFloorRecord, rolls])

  const selectedActiveRoll = useMemo(() => {
    if (rollId) return (rolls || []).find((r) => r.id === rollId) || null
    if (matchingRollForFloorRecord) return matchingRollForFloorRecord
    return null
  }, [rolls, rollId, matchingRollForFloorRecord])

  // Exact linear length calculation in feet
  const availableLength = useMemo(() => {
    if (!selectedActiveRoll) return 0
    if (selectedActiveRoll.current_length_ft != null && Number(selectedActiveRoll.current_length_ft) > 0) {
      return Math.round(Number(selectedActiveRoll.current_length_ft) * 100) / 100
    }
    if (selectedActiveRoll.remaining_length_ft != null && Number(selectedActiveRoll.remaining_length_ft) > 0) {
      return Math.round(Number(selectedActiveRoll.remaining_length_ft) * 100) / 100
    }
    const width = Number(selectedActiveRoll.width_ft) || 1
    if (selectedActiveRoll.remaining_area_sft != null && Number(selectedActiveRoll.remaining_area_sft) > 0) {
      return Math.round((Number(selectedActiveRoll.remaining_area_sft) / width) * 100) / 100
    }
    return Number(selectedActiveRoll.initial_length_ft || 164)
  }, [selectedActiveRoll])

  // Sync state when floor record is passed
  useEffect(() => {
    if (selectedFloorRecord) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMaterialId(selectedFloorRecord.material_id)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setJobRef(selectedFloorRecord.job_reference || '')
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOperatorName(selectedFloorRecord.operator_name || '')
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReturnedQty(0)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWastageQty(0)

      const rollMatch =
        (selectedFloorRecord as any).width_ft || (selectedFloorRecord as any).roll_code || (selectedFloorRecord as any).initial_length_ft
          ? (selectedFloorRecord as unknown as InventoryRollRecord)
          : (selectedFloorRecord.roll_id ? (rolls || []).find((r) => r.id === selectedFloorRecord.roll_id) : null) ||
            (selectedFloorRecord.roll_code
              ? (rolls || []).find((r) => r.roll_code === selectedFloorRecord.roll_code || r.roll_tag === selectedFloorRecord.roll_code)
              : null)

      if (rollMatch) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRollId(rollMatch.id)
        const rollLen =
          rollMatch.current_length_ft != null && Number(rollMatch.current_length_ft) > 0
            ? Number(rollMatch.current_length_ft)
            : rollMatch.remaining_length_ft != null && Number(rollMatch.remaining_length_ft) > 0
            ? Number(rollMatch.remaining_length_ft)
            : (rollMatch.remaining_area_sft && rollMatch.width_ft)
            ? Number(rollMatch.remaining_area_sft) / Number(rollMatch.width_ft)
            : Number(rollMatch.initial_length_ft || 164)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setConsumedQty(Math.min(rollLen, 10))
      } else {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRollId('')
        const initialRemaining = Number(selectedFloorRecord.remaining_floor_balance) || 1
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setConsumedQty(Math.min(initialRemaining, Math.max(1, initialRemaining)))
      }
    } else if (selectedRollId) {
      const r = (rolls || []).find((x) => x.id === selectedRollId)
      if (r) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRollId(r.id)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMaterialId(r.material_id)
        const rollLen =
          r.current_length_ft != null && Number(r.current_length_ft) > 0
            ? Number(r.current_length_ft)
            : r.remaining_length_ft != null && Number(r.remaining_length_ft) > 0
            ? Number(r.remaining_length_ft)
            : (r.remaining_area_sft && r.width_ft)
            ? Number(r.remaining_area_sft) / Number(r.width_ft)
            : Number(r.initial_length_ft || 164)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setConsumedQty(Math.min(rollLen, 10))
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setReturnedQty(0)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setWastageQty(0)
      }
    } else if (selectedMaterialId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMaterialId(selectedMaterialId)
    }
  }, [selectedFloorRecord, selectedMaterialId, selectedRollId, rolls])

  const activeMat =
    materials.find((m) => m.id === materialId) ||
    (selectedFloorRecord?.material ? (selectedFloorRecord.material as MaterialRecord) : undefined)
  const floorUnit = selectedActiveRoll ? 'ft' : (activeMat?.unit || selectedFloorRecord?.unit || 'pcs')
  const floorMaxBalance = selectedActiveRoll
    ? availableLength
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

        // Sync local client store for instant reactivity across floor views
        if (res.data?.roll) {
          try {
            PrintFlowDataStore.updateItem(STORAGE_KEYS.MOUNTED_ROLLS, res.data.roll.id, res.data.roll)
            if (companyId) {
              PrintFlowDataStore.updateItem(STORAGE_KEYS.MOUNTED_ROLLS, res.data.roll.id, res.data.roll, companyId)
            }
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('printflow_table_synced:mounted_rolls', { detail: { roll: res.data.roll } }))
              window.dispatchEvent(new CustomEvent('printflow_table_synced:floor_consumption', { detail: { roll: res.data.roll } }))
              window.dispatchEvent(new CustomEvent('printflow_data_sync', { detail: { table: STORAGE_KEYS.MOUNTED_ROLLS } }))
            }
          } catch (syncErr) {
            console.warn('[LogConsumptionModal] Client store sync warning:', syncErr)
          }
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
      title={selectedActiveRoll ? 'Print Floor Piece Consumption Sign-Off' : selectedFloorRecord ? 'Print Floor Material Consumption Sign-Off' : 'Production Consumption & Scrap Sign-Off'}
      description="Record actual substrate used, return unused stock, log scrap reasons, and register reusable remnants."
      hideFooter
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto px-1">
        {error && (
          <div className="p-3 bg-danger-surface text-destructive rounded-lg text-xs font-semibold border border-danger-border">
            {error}
          </div>
        )}

        {/* Selected Active Floor Piece Card */}
        {selectedActiveRoll && (
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-primary tabular-nums">
                <Disc className="w-4 h-4 text-primary" />
                <span>Piece: {selectedActiveRoll.roll_code || selectedActiveRoll.roll_tag}</span>
              </div>
              <Badge variant="outline" className="bg-primary/10 text-primary font-bold uppercase text-xs">
                {selectedActiveRoll.status} (1 Pcs)
              </Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-primary/20 text-foreground">
              <div>
                <span className="text-muted-foreground block text-xs">Substrate</span>
                <span className="font-semibold truncate block">
                  {selectedActiveRoll.material?.name || activeMat?.name || 'Roll Substrate'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Roll Width</span>
                <span className="font-bold block">{selectedActiveRoll.width_ft} ft</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Initial Spec</span>
                <span className="font-semibold block">{selectedActiveRoll.initial_length_ft || 164} ft</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Available Length</span>
                <span className="font-black text-success block">
                  {availableLength.toFixed(2)} ft — 1 Pcs
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Floor Record Context Card */}
        {!selectedActiveRoll && selectedFloorRecord && (
          <div className="p-3 bg-warning-surface border border-warning-border rounded-lg space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-warning">
                <Printer className="w-4 h-4 text-warning" />
                <span>Issue: {selectedFloorRecord.issue_number || selectedFloorRecord.id.slice(0, 8)}</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-warning/20 text-warning font-bold uppercase tracking-wider text-xs">
                {selectedFloorRecord.status.replace('_', ' ')}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-warning-border/20 text-foreground">
              <div>
                <span className="text-muted-foreground block text-xs">Material</span>
                <span className="font-semibold truncate block">{selectedFloorRecord.material_name}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Workstation</span>
                <span className="font-semibold block">{selectedFloorRecord.machine_name || 'Floor General'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Total Issued</span>
                <span className="font-semibold block">{selectedFloorRecord.issued_quantity} {selectedFloorRecord.unit}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Floor Balance</span>
                <span className="font-black text-warning block">
                  {selectedFloorRecord.remaining_floor_balance} {selectedFloorRecord.unit}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Active Floor Piece Selection Dropdown */}
        {availableRollsOnFloor.length > 0 && (
          <div className="space-y-1.5 p-3 bg-muted rounded-xl border border-border">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Disc className="w-3.5 h-3.5 text-primary" />
              Select Active Piece on Print Floor ({availableRollsOnFloor.length} active pieces)
            </Label>
            <select
              value={rollId || selectedActiveRoll?.id || ''}
              onChange={(e) => setRollId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-input bg-card text-xs tabular-nums font-semibold text-foreground cursor-pointer"
            >
              {!selectedActiveRoll && (
                <option value="">-- No specific piece (use floor balance) --</option>
              )}
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
                className="w-full h-10 px-3 rounded-md border border-input bg-card text-xs font-semibold cursor-pointer"
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
                className="bg-muted font-semibold text-xs"
              />
            ) : selectedActiveRoll ? (
              <Input
                value={`${selectedActiveRoll.material?.name || activeMat?.name || 'Roll Substrate'} (${selectedActiveRoll.width_ft}ft Wide • Piece #${selectedActiveRoll.roll_code || selectedActiveRoll.roll_tag})`}
                disabled
                className="bg-muted font-semibold text-xs"
              />
            ) : (
              <select
                id="cMat"
                value={materialId}
                onChange={(e) => setMaterialId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-card text-xs font-semibold cursor-pointer"
                required
              >
                <option value="">-- Choose Material --</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}{isUserSku(m.sku) ? ` [SKU: ${m.sku}]` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Consumption & Return Breakdown */}
        <div className="space-y-3 p-3 bg-muted rounded-lg border border-border text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

          {/* Quick Cut Length Presets for Piece Consumption */}
          {selectedActiveRoll && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border">
              <span className="text-xs text-muted-foreground mr-1">Quick Presets:</span>
              {[5, 10, 20, 50].map((presetLen) => (
                <Button
                  key={presetLen}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={presetLen > availableLength}
                  onClick={() => setConsumedQty(presetLen)}
                  className="h-6 px-2 text-xs font-semibold border-input hover:bg-muted text-foreground cursor-pointer"
                >
                  {presetLen} ft
                </Button>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const fullAvailable = Math.max(0, Math.round((availableLength - bleedFt - Number(wastageQty || 0)) * 100) / 100)
                  setConsumedQty(fullAvailable)
                }}
                className="h-6 px-2 text-xs font-bold border-primary/30 text-primary hover:bg-primary/10 cursor-pointer"
              >
                Full Piece ({availableLength.toFixed(1)} ft)
              </Button>
            </div>
          )}
        </div>

        {/* Live Balance Calculation Alert */}
        {floorMaxBalance !== null && (
          <div
            className={`p-3 rounded-xl border text-xs space-y-1.5 ${
              isOverFloorBalance
                ? 'bg-destructive/10 border-danger-border/30 text-destructive'
                : 'bg-muted border-border text-foreground'
            }`}
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 font-medium">
                <Info className="w-4 h-4 text-primary" />
                <span>
                  Deducting: <strong>{totalActionQty.toFixed(2)}</strong> {floorUnit}
                  {selectedActiveRoll && (
                    <span className="text-muted-foreground ml-1 tabular-nums">
                      ({Math.round(totalActionQty * (selectedActiveRoll.width_ft || 3) * 100) / 100} sqft)
                    </span>
                  )}
                </span>
              </div>
              <div className="font-bold text-foreground">
                Remaining Length: {Math.max(0, floorMaxBalance - totalActionQty).toFixed(2)} {floorUnit} — 1 Pcs
              </div>
            </div>

            {selectedActiveRoll && (
              <div className="pt-1 border-t border-border flex items-center justify-between text-xs text-muted-foreground tabular-nums">
                <span>
                  Physical Spec: {selectedActiveRoll.width_ft}ft × {Math.max(0, floorMaxBalance - totalActionQty).toFixed(2)}ft
                </span>
                <span className="font-bold text-success">
                  Derived Area: {Math.round(Math.max(0, floorMaxBalance - totalActionQty) * (selectedActiveRoll.width_ft || 3) * 100) / 100} sqft
                </span>
              </div>
            )}
          </div>
        )}

        {returnedQty > 0 && (
          <div className="space-y-1.5 p-2.5 bg-success-surface rounded-lg border border-success-border text-xs">
            <Label required className="text-success">
              Return Store Location
            </Label>
            <select
              value={returnLocationId}
              onChange={(e) => setReturnLocationId(e.target.value)}
              className="w-full h-9 px-2 rounded border border-success-border bg-card text-xs font-semibold cursor-pointer"
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
          <div className="space-y-1.5 p-2.5 bg-danger-surface rounded-lg border border-danger-border text-xs">
            <Label required className="text-destructive">
              Wastage Root Cause Reason
            </Label>
            <select
              value={wastageReason}
              onChange={(e) => setWastageReason(e.target.value)}
              className="w-full h-9 px-2 rounded border border-danger-border bg-card text-xs font-semibold mb-1 cursor-pointer"
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
        <div className="space-y-2 pt-1 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Scissors className="h-4 w-4 text-primary" />
              <span className="font-bold text-xs text-foreground">
                Discrete Reusable Remnants ({remnants.length})
              </span>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={handleAddRemnant} className="h-7 text-xs cursor-pointer">
              <Plus className="h-3 w-3 mr-1" /> Add Remnant
            </Button>
          </div>

          {remnants.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              No usable offcuts. Click &quot;Add Remnant&quot; to catalog usable roll/sheet leftovers for future small jobs.
            </p>
          ) : (
            <div className="space-y-2">
              {remnants.map((r, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-primary/10 rounded-lg border border-primary/20 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary">
                      Remnant #{idx + 1} ({r.width} × {r.length} {r.dimension_unit} ={' '}
                      <strong>{r.width * r.length} SFT</strong>)
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveRemnant(idx)}
                      className="h-6 w-6 p-0 text-destructive cursor-pointer"
                      aria-label="Remove remnant"
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
                        className="w-full h-8 px-2 rounded border border-input bg-card text-xs cursor-pointer"
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
                        className="w-full h-8 px-2 rounded border border-input bg-card text-xs font-semibold capitalize cursor-pointer"
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

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-border">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto min-h-10 cursor-pointer">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || Boolean(isOverFloorBalance)}
            className="w-full sm:w-auto min-h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-bold cursor-pointer"
          >
            {loading ? 'Submitting...' : 'Sign-Off Consumption & Remnants'}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
