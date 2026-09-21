'use client'

import React, { useState, useEffect } from 'react'
import { CheckCircle2, AlertTriangle, Disc, Cpu, Scissors, Layers, Sparkles } from 'lucide-react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  ProductionTaskRecord,
  DefectReasonCode,
  DEFECT_REASON_LABELS,
} from '@/types/production.types'
import { InventoryRollRecord } from '@/types/inventory.types'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { formatBDT } from '@/lib/formatters'

interface CompleteTaskModalProps {
  isOpen: boolean
  onClose: () => void
  task: ProductionTaskRecord | null
  onComplete: (taskId: string, completionData: {
    good_quantity: number
    rejected_quantity: number
    defect_reason?: string | null
    scrap_notes?: string | null
    scrap_area_sft?: number
    mounted_roll_id?: string | null
    consumed_material_qty?: number
    machine_meter_after?: number
    notes?: string
  }) => Promise<void>
}

export function CompleteTaskModal({
  isOpen,
  onClose,
  task,
  onComplete,
}: CompleteTaskModalProps) {
  const [goodQty, setGoodQty] = useState<number>(1)
  const [hasScrap, setHasScrap] = useState(false)
  const [scrapQty, setScrapQty] = useState<number>(0)
  const [defectReason, setDefectReason] = useState<DefectReasonCode | ''>('')
  const [scrapNotes, setScrapNotes] = useState('')
  const [selectedRollId, setSelectedRollId] = useState<string>('')
  const [machineMeter, setMachineMeter] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load available mounted rolls
  const [availableRolls, setAvailableRolls] = useState<InventoryRollRecord[]>([])

  useEffect(() => {
    if (!task) return

    setGoodQty(task.quantity || 1)
    setHasScrap(false)
    setScrapQty(0)
    setDefectReason('')
    setScrapNotes('')
    setNotes('')

    try {
      const rolls = PrintERPDataStore.get<InventoryRollRecord[]>(STORAGE_KEYS.MOUNTED_ROLLS) || []
      setAvailableRolls(rolls.filter((r) => r.status === 'mounted' || r.status === 'available' || r.status === 'in_use'))

      // Pre-select roll if task or machine has active mounted roll
      const preSelected = rolls.find(
        (r) =>
          r.id === task.mounted_roll_id ||
          (task.assigned_machine_id && r.mounted_machine_id === task.assigned_machine_id)
      )
      if (preSelected) {
        setSelectedRollId(preSelected.id)
      } else if (rolls.length > 0) {
        setSelectedRollId(rolls[0].id)
      }
    } catch {}
  }, [task, isOpen])

  if (!task) return null

  const isSftUnit = task.unit === 'sft' || task.unit === 'sqft' || (task.width && task.height)
  const taskAreaSft = (task.width && task.height) ? Math.round(task.width * task.height * goodQty * 100) / 100 : (isSftUnit ? goodQty : 0)
  const scrapAreaSft = (task.width && task.height && scrapQty > 0) ? Math.round(task.width * task.height * scrapQty * 100) / 100 : scrapQty

  const selectedRoll = availableRolls.find((r) => r.id === selectedRollId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onComplete(task.id, {
        good_quantity: Number(goodQty) || 0,
        rejected_quantity: hasScrap ? Number(scrapQty) || 0 : 0,
        defect_reason: hasScrap && defectReason ? defectReason : null,
        scrap_notes: hasScrap && scrapNotes ? scrapNotes : null,
        scrap_area_sft: hasScrap ? scrapAreaSft : 0,
        mounted_roll_id: selectedRollId || null,
        consumed_material_qty: taskAreaSft > 0 ? taskAreaSft : Number(goodQty),
        machine_meter_after: machineMeter ? Number(machineMeter) : undefined,
        notes: notes || undefined,
      })
      onClose()
    } catch (err: any) {
      alert(`Failed to complete task: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ModalDialog
      open={isOpen}
      onOpenChange={(openVal) => {
        if (!openVal) onClose()
      }}
      title={`Complete Task: ${task.task_number}`}
      size="lg"
      hideFooter
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Task Summary Banner */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1 text-xs">
          <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
            <span className="text-sm font-black">{task.task_name}</span>
            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
              {task.department}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-slate-500 font-mono text-[11px] pt-1">
            <span>Job: <strong>{task.job_number || 'N/A'}</strong></span>
            <span>•</span>
            <span>Customer: <strong>{task.customer_name || 'Direct'}</strong></span>
            {task.width && task.height && (
              <>
                <span>•</span>
                <span>Size: <strong>{task.width} × {task.height} {task.unit || 'ft'} ({taskAreaSft} SFT)</strong></span>
              </>
            )}
            {task.assigned_machine_name && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                  <Cpu className="h-3 w-3" />
                  <strong>{task.assigned_machine_name}</strong>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Quantities Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Good Quantity Completed (সঠিক পরিমাণ)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0.01"
                step="any"
                value={goodQty}
                onChange={(e) => setGoodQty(Number(e.target.value))}
                className="font-mono font-bold text-base h-10"
                required
              />
              <span className="text-xs font-bold uppercase text-slate-500 shrink-0">
                {task.unit || 'pcs'}
              </span>
            </div>
            {taskAreaSft > 0 && (
              <p className="text-[11px] text-emerald-600 font-semibold font-mono">
                ✓ Total Yield: {taskAreaSft} Sq.Ft. Production
              </p>
            )}
          </div>

          {/* Mounted Roll Media Link */}
          {availableRolls.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Disc className="h-3.5 w-3.5 text-blue-600" />
                <span>Deduct from Mounted Roll (রোল ইনভেন্টরি)</span>
              </Label>
              <select
                value={selectedRollId}
                onChange={(e) => setSelectedRollId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono"
              >
                <option value="">-- No direct roll deduction --</option>
                {availableRolls.map((roll) => (
                  <option key={roll.id} value={roll.id}>
                    {roll.roll_code || roll.roll_tag} ({roll.width_ft}ft wide) • {roll.remaining_area_sft} SFT left {roll.mounted_machine_name ? `[${roll.mounted_machine_name}]` : ''}
                  </option>
                ))}
              </select>
              {selectedRoll && (
                <div className="text-[11px] text-slate-500 flex items-center justify-between font-mono">
                  <span>Available: {selectedRoll.remaining_area_sft} SFT</span>
                  {taskAreaSft > 0 && (
                    <span className="text-blue-600 font-bold">
                      After: {Math.max(0, Math.round((selectedRoll.remaining_area_sft - taskAreaSft) * 100) / 100)} SFT
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Scrap / Wastage Toggle */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hasScrap"
                checked={hasScrap}
                onChange={(e) => setHasScrap(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
              />
              <Label htmlFor="hasScrap" className="text-xs font-bold text-rose-700 dark:text-rose-400 cursor-pointer flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Log Defect / Scrap Wastage (নষ্ট / স্ক্র্যাপ রেকর্ড করুন)</span>
              </Label>
            </div>
            {hasScrap && (
              <span className="text-[11px] font-bold text-rose-600 animate-pulse">
                Scrap will be logged to inventory ledger
              </span>
            )}
          </div>

          {hasScrap && (
            <div className="mt-3 p-3.5 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 rounded-xl space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-rose-900 dark:text-rose-200">
                    Defective / Scrap Qty ({task.unit || 'pcs'})
                  </Label>
                  <Input
                    type="number"
                    min="0.1"
                    step="any"
                    value={scrapQty}
                    onChange={(e) => setScrapQty(Number(e.target.value))}
                    className="h-9 font-mono font-bold text-sm bg-white dark:bg-slate-900 border-rose-300 dark:border-rose-800"
                    placeholder="e.g. 1"
                    required={hasScrap}
                  />
                  {scrapAreaSft > 0 && (
                    <span className="text-[10px] text-rose-700 font-mono block">
                      = {scrapAreaSft} SFT Scrap Material
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-rose-900 dark:text-rose-200">
                    Defect Reason (ত্রুটির কারণ)
                  </Label>
                  <select
                    value={defectReason}
                    onChange={(e) => setDefectReason(e.target.value as any)}
                    className="w-full h-9 px-2.5 rounded-md border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 text-xs font-semibold"
                    required={hasScrap}
                  >
                    <option value="">-- Select Press Defect Reason --</option>
                    {Object.entries(DEFECT_REASON_LABELS).map(([code, labels]) => (
                      <option key={code} value={code}>
                        {labels.labelEn} ({labels.labelBn})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-rose-900 dark:text-rose-200">
                  Scrap Notes & Defect Description
                </Label>
                <Input
                  value={scrapNotes}
                  onChange={(e) => setScrapNotes(e.target.value)}
                  placeholder="e.g. Head scratched middle 4ft of banner / Lamination wrinkling on corner"
                  className="h-9 text-xs bg-white dark:bg-slate-900 border-rose-300"
                />
              </div>
            </div>
          )}
        </div>

        {/* Machine Running Meter Optional Reading */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Machine Meter Reading (মেশিন কাউন্টার - ঐচ্ছিক)
            </Label>
            <Input
              type="number"
              value={machineMeter}
              onChange={(e) => setMachineMeter(e.target.value)}
              placeholder="e.g. 14520"
              className="h-9 font-mono text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Operator Notes / Handover Remarks
            </Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Passed to Lamination table with extra 2 inch border"
              className="h-9 text-xs"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs h-9 px-4 cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="text-xs font-bold h-9 px-5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer gap-1.5"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{isSubmitting ? 'Completing...' : 'Complete & Update Flow'}</span>
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
