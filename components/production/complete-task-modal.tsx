'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
 CheckCircle2,
 AlertTriangle,
 Disc,
 Cpu,
 Scissors,
 Layers,
 Sparkles,
 RotateCw,
 Plus,
 ArrowRight,
 AlertOctagon,
 HelpCircle,
 TrendingDown,
 Info,
 Truck,
} from 'lucide-react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { dispatchToast } from '@/components/shared/toast-feedback'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { NumericKeypadModal } from '@/components/shared/numeric-keypad'
import { useI18n } from '@/i18n/context'
import {
 ProductionTaskRecord,
 DefectReasonCode,
 DEFECT_REASON_LABELS,
} from '@/types/production.types'
import { InventoryRollRecord, RollFeedCalculationResult } from '@/types/inventory.types'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import {
 RollConsumptionEngine,
 parseTaskDimensions,
 type ParsedJobDimensions,
} from '@/lib/domain/roll-consumption-engine'
import {
 requestAndIssueFloorRollAction,
 getInventoryRollsAction,
} from '@/actions/inventory.actions'
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
 linear_feed_ft?: number
 bleed_allowance_ft?: number
 wastage_length_ft?: number
 wastage_reason?: string | null
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
 const { locale, tBilingual } = useI18n()
 const isBn = locale === 'bn'

 const [goodQty, setGoodQty] = useState<number>(1)
 const [hasScrap, setHasScrap] = useState(false)
 const [scrapQty, setScrapQty] = useState<number>(0)
 const [defectReason, setDefectReason] = useState<DefectReasonCode | ''>('')
 const [scrapNotes, setScrapNotes] = useState('')
 const [selectedRollId, setSelectedRollId] = useState<string>('')
 const [machineMeter, setMachineMeter] = useState<string>('')
 const [notes, setNotes] = useState('')
 const [isSubmitting, setIsSubmitting] = useState(false)
  const [keypadTarget, setKeypadTarget] = useState<'goodQty' | 'scrapQty' | 'bleedInches' | null>(null)

  // Dimensional Roll Feed States
 const [orientation, setOrientation] = useState<'normal' | 'rotated'>('normal')
 const [bleedInches, setBleedInches] = useState<number>(3) // Default 3 inches bleed
 const [scrapWastageLengthFt, setScrapWastageLengthFt] = useState<number>(0)
 const [scrapWastageReason, setScrapWastageReason] = useState<string>('banding')

  // Roll Requisitioning States
 const [isRequestingRoll, setIsRequestingRoll] = useState(false)
 const [requestRollError, setRequestRollError] = useState<string | null>(null)
 const [requestRollSuccess, setRequestRollSuccess] = useState<string | null>(null)

 const hasNextFinishing = useMemo(() => {
 if (!task) return false
 const isPrintTask = task.department === 'printing' || task.task_type === 'printing'
 if (!isPrintTask) return false

 const hasFinishingSpec = Boolean(
      (task.finishing && task.finishing !== 'None' && task.finishing !== 'none') ||
      (task as any).selected_finishing?.length ||
      (task as any).add_ons ||
      (task as any).selected_add_ons?.length
    )
 if (hasFinishingSpec) return true

 const allTasks = PrintERPDataStore.get<ProductionTaskRecord[]>(STORAGE_KEYS.PRODUCTION_TASKS) || []
 return allTasks.some(
      (t) =>
 t.id !== task.id &&
        (t.department === 'finishing' || t.task_type === 'finishing') &&
        (t.job_order_id === task.job_order_id || (task.job_number && t.job_number === task.job_number)) &&
 t.status !== 'completed'
    )
  }, [task])

  // Load available mounted rolls
 const [availableRolls, setAvailableRolls] = useState<InventoryRollRecord[]>([])

 const loadRolls = async () => {
 try {
 const res = await getInventoryRollsAction()
 if (res.success && res.data) {
 const filtered = res.data.filter((r) => r.status === 'mounted' || r.status === 'available' || r.status === 'in_use')
 setAvailableRolls(filtered)
 return filtered
      }
    } catch {}

 const cached = PrintERPDataStore.get<InventoryRollRecord[]>(STORAGE_KEYS.MOUNTED_ROLLS) || []
 const filtered = cached.filter((r) => r.status === 'mounted' || r.status === 'available' || r.status === 'in_use')
 setAvailableRolls(filtered)
 return filtered
  }

  // Parse task dimensions cleanly (converts inches to feet if needed)
 const parsedDims = useMemo(() => parseTaskDimensions(task), [task])
 const jobWidthFt = parsedDims.widthFt
 const jobLengthFt = parsedDims.lengthFt
 const singleUnitAreaSft = parsedDims.areaSft

 useEffect(() => {
 if (!task) return

 const initialGood = task.good_quantity ?? (task.quantity !== undefined ? Math.max(0, task.quantity - (task.rejected_quantity || 0)) : 1)
 const initScrap = Boolean(task.rejected_quantity && task.rejected_quantity > 0)

 setGoodQty(initialGood)
 setHasScrap(initScrap)
 setScrapQty(task.rejected_quantity || 0)
 setDefectReason((task.defect_reason as DefectReasonCode) || (initScrap ? 'banding' : ''))
 setScrapNotes(task.scrap_notes || '')
 setNotes(task.notes || '')
 setOrientation('normal')
 setBleedInches(3)
 setScrapWastageLengthFt(task.rejected_quantity || 0)
 setScrapWastageReason((task.defect_reason as string) || 'banding')
 setRequestRollError(null)
 setRequestRollSuccess(null)

 loadRolls().then((rolls) => {
      // Check if machine or task is sheet-fed / offset / laser (non-roll)
 const machineName = (task.assigned_machine_name || '').toLowerCase()
 const taskDept = (task.department || task.task_type || '').toLowerCase()
 const isSheetFed =
 machineName.includes('heidelberg') ||
 machineName.includes('sm74') ||
 machineName.includes('speedmaster') ||
 machineName.includes('bizhub') ||
 machineName.includes('offset') ||
 machineName.includes('xerox') ||
 machineName.includes('ricoh') ||
 machineName.includes('canon') ||
 machineName.includes('screen') ||
 machineName.includes('manual') ||
 taskDept === 'finishing'

 if (isSheetFed && !task.mounted_roll_id) {
 setSelectedRollId('')
 return
      }

      // 1. Task specifically has a mounted roll
 const byTaskId = rolls.find((r) => r.id === task.mounted_roll_id)
 if (byTaskId) {
 setSelectedRollId(byTaskId.id)
 return
      }

      // 2. Machine has a mounted roll
 if (task.assigned_machine_id) {
 const byMachine = rolls.find((r) => r.mounted_machine_id === task.assigned_machine_id)
 if (byMachine) {
 setSelectedRollId(byMachine.id)
 return
        }
      }

      // 3. Roll matching required material
 if (task.required_material) {
 const matLower = task.required_material.toLowerCase()
 const byMaterial = rolls.find((r) =>
          (r.material?.name && r.material.name.toLowerCase().includes(matLower)) ||
          ((r as any).material_name && (r as any).material_name.toLowerCase().includes(matLower)) ||
          (r.roll_tag && r.roll_tag.toLowerCase().includes(matLower)) ||
          (r.roll_code && r.roll_code.toLowerCase().includes(matLower))
        )
 if (byMaterial) {
 setSelectedRollId(byMaterial.id)
 return
        }
      }

      // 4. Default: If wide format / roll job, pick the best fitting roll, else allow no deduction
 const fittingRoll = rolls.find((r) => r.width_ft >= parsedDims.widthFt || r.width_ft >= parsedDims.lengthFt)
 if (fittingRoll) {
 setSelectedRollId(fittingRoll.id)
      } else if (rolls.length > 0 && !isSheetFed) {
 setSelectedRollId(rolls[0].id)
      } else {
 setSelectedRollId('')
      }
    })
  }, [task, isOpen, parsedDims])

 const selectedRoll = availableRolls.find((r) => r.id === selectedRollId)

  // Deterministic Roll Feed Calculation
 const rollCalc: RollFeedCalculationResult | null = useMemo(() => {
 if (!task || !selectedRoll) return null
 return RollConsumptionEngine.calculateRollLinearFeed({
 roll_width_ft: selectedRoll.width_ft,
 roll_current_length_ft: Number(selectedRoll.current_length_ft ?? (selectedRoll.remaining_area_sft / selectedRoll.width_ft)),
 job_width_ft: jobWidthFt,
 job_length_ft: jobLengthFt,
 quantity: Number(goodQty) >= 0 ? Number(goodQty) : 1,
 orientation,
 bleed_allowance_in: Number(bleedInches) || 0,
 wastage_length_ft: hasScrap ? Number(scrapWastageLengthFt) || 0 : 0,
 wastage_reason: hasScrap && defectReason ? defectReason : undefined,
    })
  }, [task, selectedRoll, jobWidthFt, jobLengthFt, goodQty, orientation, bleedInches, hasScrap, scrapWastageLengthFt, defectReason])

 if (!task) return null

 const taskAreaSft = Math.round(singleUnitAreaSft * (Number(goodQty) || 0) * 100) / 100

 const scrapAreaSft = hasScrap
    ? (rollCalc
        ? rollCalc.wastage_area_sft
        : Math.round(singleUnitAreaSft * (Number(scrapQty) || 0) * 100) / 100)
    : 0

  // 1-Click Request New Roll from Warehouse to Print Floor
 const handleRequestNewRoll = async () => {
 if (!selectedRoll && !task.required_material) return
 setIsRequestingRoll(true)
 setRequestRollError(null)
 setRequestRollSuccess(null)

 try {
 const matId = selectedRoll?.material_id || task.required_material || 'mat-pvc-banner'
 const widthFt = selectedRoll?.width_ft || (jobWidthFt <= 3 ? 3 : jobWidthFt <= 5 ? 5 : 3)
 const res = await requestAndIssueFloorRollAction({
 material_id: matId,
 width_ft: widthFt,
 length_ft: 164, // Standard 50m / 164ft master roll
 machine_id: task.assigned_machine_id || null,
 machine_name: task.assigned_machine_name || 'Print Press',
 notes: `Requisitioned during Job #${task.job_number || task.task_number} due to shortage`,
      })

 if (!res.success || !res.data) {
 setRequestRollError(res.error || 'Failed to request new roll.')
 return
      }

 setRequestRollSuccess(`New Roll ${res.data.roll_code || res.data.roll_tag} (${res.data.width_ft}ft × 164ft) issued & mounted!`)
 const updatedList = await loadRolls()
 setSelectedRollId(res.data.id)
    } catch (err: any) {
 setRequestRollError(err.message || 'Error requisitioning roll.')
    } finally {
 setIsRequestingRoll(false)
    }
  }

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault()
 setIsSubmitting(true)
 try {
 await onComplete(task.id, {
 good_quantity: Number(goodQty) >= 0 ? Number(goodQty) : 0,
 rejected_quantity: hasScrap ? Number(scrapQty || (rollCalc ? rollCalc.wastage_length_ft : 0)) : 0,
 defect_reason: hasScrap && defectReason ? defectReason : null,
 scrap_notes: hasScrap && scrapNotes ? scrapNotes : null,
 scrap_area_sft: scrapAreaSft,
 mounted_roll_id: selectedRollId || null,
 linear_feed_ft: rollCalc?.linear_feed_ft,
 bleed_allowance_ft: rollCalc?.bleed_allowance_ft,
 wastage_length_ft: hasScrap ? (rollCalc?.wastage_length_ft || Number(scrapWastageLengthFt)) : 0,
 wastage_reason: hasScrap ? (defectReason || scrapWastageReason) : null,
 consumed_material_qty: rollCalc?.total_utilized_area_sft || (taskAreaSft > 0 ? taskAreaSft : Number(goodQty)),
 machine_meter_after: machineMeter ? Number(machineMeter) : undefined,
 notes: notes || undefined,
      })
 onClose()
    } catch (err: any) {
 dispatchToast({
 type: 'error',
 title: 'Task Completion Failed',
 titleBn: 'টাস্ক সম্পন্নকরণ ব্যর্থ হয়েছে',
 message: err.message || 'Failed to complete task.',
      })
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
 title={`Complete Print Job: ${task.task_number}`}
 size="lg"hideFooter
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Task Summary Banner */}
        <div className="p-3.5 bg-card border border-border rounded-xl space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2 flex-wrap font-bold text-foreground">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black tracking-tight">{task.task_name}</span>
              <Badge className="border-border text-foreground">
                {task.department}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline"className="text-xs tabular-nums font-bold">
                {task.task_number}
              </Badge>
              <Badge className={
 task.status === 'in_progress' ? 'bg-success-surface text-success border border-border' : task.status === 'paused' ? 'bg-warning-surface text-warning border border-border' : task.status === 'on_hold' ? 'bg-destructive/10 text-destructive border border-border' : 'bg-muted text-foreground'
              }>
                {task.status.toUpperCase()}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1 border-t border-border">
            <div className="space-y-0.5">
              <span className="text-muted-foreground font-semibold uppercase tracking-wider block">Job / Invoice:</span>
              <strong className="text-foreground tabular-nums text-xs">{task.job_number || task.invoice_number || 'N/A'}</strong>
            </div>

            <div className="space-y-0.5">
              <span className="text-muted-foreground font-semibold uppercase tracking-wider block">Customer:</span>
              <strong className="text-foreground truncate block text-xs"title={task.customer_name || 'Direct Client'}>
                {task.customer_name || 'Direct Client'}
              </strong>
            </div>

            <div className="space-y-0.5">
              <span className="text-muted-foreground font-semibold uppercase tracking-wider block">Print Size / Specs:</span>
              <strong className="text-foreground block text-xs">
                {parsedDims.displayStr}
              </strong>
            </div>

            <div className="space-y-0.5">
              <span className="text-muted-foreground font-semibold uppercase tracking-wider block">Station / Machine:</span>
              <strong className="text-foreground truncate block text-xs">
                {task.assigned_machine_name || 'Floor Station'}
              </strong>
            </div>
          </div>

          {(task.required_material || (task as any).service_name) && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 border-t border-border /60 flex-wrap">
              {task.required_material && (
                <span className="flex items-center gap-1">
                  <span className="font-semibold text-muted-foreground">Material:</span>
                  <strong className="text-foreground">{task.required_material}</strong>
                </span>
              )}
              {(task as any).service_name && (
                <span className="flex items-center gap-1">
                  <span className="font-semibold text-muted-foreground">Service:</span>
                  <strong className="text-primary text-primary">{(task as any).service_name}</strong>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Next Workflow Destination Indicator */}
        {task && (task.department === 'printing' || task.task_type === 'printing') && (
          <div className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 flex-wrap ${
 hasNextFinishing
              ? 'bg-primary/10/70 bg-primary/10 border-primary/20 border-border text-primary text-primary'
              : 'bg-success-surface/70 bg-success-surface border-success-border border-success-border text-success text-success'
          }`}>
            <div className="flex items-center gap-2">
              {hasNextFinishing ? (
                <>
                  <Scissors className="h-4 w-4 text-primary shrink-0"/>
                  <span>
                    <strong>{isBn ? 'পরবর্তী গন্তব্য:' : 'Next Step:'}</strong>{' '}
                    {isBn
                      ? 'প্রিন্ট সম্পন্নের সাথে সাথে কাজটি স্বয়ংক্রিয়ভাবে ফিনিশিং ও ফেব্রিকেশন ফ্লোরে প্রেরিত হবে।'
                      : 'On print complete, this job will automatically route to the Finishing & Fabrication Floor.'}
                  </span>
                </>
              ) : (
                <>
                  <Truck className="h-4 w-4 text-success shrink-0"/>
                  <span>
                    <strong>{isBn ? 'পরবর্তী গন্তব্য:' : 'Next Step:'}</strong>{' '}
                    {isBn
                      ? 'ফিনিশিং প্রয়োজন না থাকায় কাজটি সরাসরি ডেলিভারি ও ডিসপ্যাচে প্রেরিত হবে।'
                      : 'No finishing required. Job will be sent directly to Delivery and Dispatch.'}
                  </span>
                </>
              )}
            </div>
            <Badge className={hasNextFinishing ? 'bg-primary hover:bg-primary text-white text-xs' : 'bg-success hover:bg-success text-white text-xs'}>
              {hasNextFinishing ? (isBn ? 'ফিনিশিং ও ফেব্রিকেশন ফ্লোর' : 'Finishing & Fabrication Floor') : (isBn ? 'ডেলিভারি ও ডিসপ্যাচ' : 'Delivery & Dispatch')}
            </Badge>
          </div>
        )}

        {/* Quantities Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground">
                Good Quantity Completed (সঠিক পরিমাণ)
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setKeypadTarget('goodQty')}
                className="h-7 px-2 text-xs font-bold border-border text-foreground hover:bg-muted shrink-0 cursor-pointer"
                title="Open Glove-friendly Keypad"
              >
                🔢 কিপ্যাড
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                step="any"
                value={goodQty}
                onChange={(e) => setGoodQty(Number(e.target.value))}
                className="tabular-nums font-bold text-base h-10"
                required
              />
              <span className="text-xs font-bold uppercase text-muted-foreground shrink-0">
                {task.unit || 'pcs'}
              </span>
            </div>
            {taskAreaSft > 0 && (
              <p className="text-xs text-success font-semibold tabular-nums">
                ✓ Total Net Print Area: {taskAreaSft} Sq.Ft.
              </p>
            )}
          </div>

          {/* Mounted Roll Media Link & Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Disc className="h-3.5 w-3.5 text-primary"/>
                <span>Select Print Roll (রোল নির্বাচন)</span>
              </Label>
              <button
 type="button"onClick={handleRequestNewRoll}
 disabled={isRequestingRoll}
 className="text-xs text-primary hover:text-primary text-primary font-bold flex items-center gap-1 cursor-pointer">
                <Plus className="h-3 w-3"/>
                <span>Request New Roll</span>
              </button>
            </div>
            <select
 value={selectedRollId}
 onChange={(e) => setSelectedRollId(e.target.value)}
 className="w-full h-10 px-3 rounded-lg border border-border bg-card text-xs tabular-nums font-bold">
              <option value="">-- No roll deduction (Sheet-fed / Pre-cut / Manual) --</option>
              {availableRolls.map((roll) => (
                <option key={roll.id} value={roll.id}>
                  {roll.roll_code || roll.roll_tag} ({roll.width_ft}ft wide) • {roll.current_length_ft ?? (roll.remaining_area_sft / roll.width_ft)}ft left ({roll.remaining_area_sft} SFT)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Requisition Status Notifications */}
        {requestRollSuccess && (
          <div className="p-2.5 bg-success-surface text-success bg-success-surface text-success rounded-lg text-xs font-bold flex items-center gap-2 border border-success-border border-success-border">
            <CheckCircle2 className="h-4 w-4 text-success shrink-0"/>
            <span>{requestRollSuccess}</span>
          </div>
        )}
        {requestRollError && (
          <div className="p-2.5 bg-danger-surface text-destructive bg-danger-surface text-destructive rounded-lg text-xs font-bold flex items-center gap-2 border border-danger-border border-danger-border">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0"/>
            <span>{requestRollError}</span>
          </div>
        )}

        {/* ========================================================= */}
        {/* DIMENSIONAL ROLL CONSUMPTION & ORIENTATION CALCULATOR */}
        {/* ========================================================= */}
        {selectedRoll && (
          <div className="p-3.5 bg-card border border-border rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-foreground tracking-wider flex items-center gap-1.5">
                <Scissors className="h-3.5 w-3.5 text-primary"/>
                <span>Dimensional Roll Feed Engine ({selectedRoll.width_ft}ft Roll)</span>
              </span>
              <span className="text-xs tabular-nums font-bold text-primary text-primary">
 Available: {selectedRoll.current_length_ft ?? (selectedRoll.remaining_area_sft / selectedRoll.width_ft)} ft
              </span>
            </div>

            {/* Orientation & Bleed Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Orientation Switcher */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Print Orientation</span>
                  {rollCalc && (
                    <Badge variant={rollCalc.is_fit_across_width ? 'outline' : 'destructive'} className="text-xs py-0">
                      {rollCalc.is_fit_across_width ? '✓ Fits Roll Width' : 'Multi-Panel / Tiling'}
                    </Badge>
                  )}
                </Label>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
 type="button"size="sm"variant={orientation === 'normal' ? 'default' : 'outline'}
 onClick={() => setOrientation('normal')}
 className="h-8 text-xs font-bold cursor-pointer">
 Normal ({jobWidthFt}ft W)
                  </Button>
                  <Button
 type="button"size="sm"variant={orientation === 'rotated' ? 'default' : 'outline'}
 onClick={() => setOrientation('rotated')}
 className="h-8 text-xs font-bold cursor-pointer gap-1">
                    <RotateCw className="h-3 w-3"/>
 Rotated 90° ({jobLengthFt}ft W)
                  </Button>
                </div>
              </div>

              {/* Bleed / Lead-in Allowance */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Bleed / Lead-in Allowance</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    = {(bleedInches / 12).toFixed(2)} ft
                  </span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
 type="number"min="0"step="0.5"value={bleedInches}
 onChange={(e) => setBleedInches(Number(e.target.value))}
 className="h-8 tabular-nums text-xs font-bold"placeholder="e.g. 3"/>
                  <span className="text-xs font-bold text-muted-foreground shrink-0">inches</span>
                </div>
              </div>
            </div>

            {/* Warning if job exceeds single roll width — Informative, not blocking! */}
            {rollCalc && !rollCalc.is_fit_across_width && (
              <div className="p-2.5 bg-warning-surface bg-warning-surface border border-warning-border border-warning-border rounded-lg text-xs font-medium text-warning text-warning flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5"/>
                <div>
                  <span className="font-bold">Exceeds Single Roll Width ({orientation === 'normal' ? jobWidthFt : jobLengthFt}ft &gt; {selectedRoll.width_ft}ft):</span>
                  <p className="text-xs text-warning text-warning mt-0.5">
 Job will proceed as multi-panel tiling or manual custom feed. Full roll length deduction will still be logged.
                  </p>
                </div>
              </div>
            )}

            {/* LIVE TELEMETRY CALCULATION HUD */}
            {rollCalc && (
              <div className="p-2.5 bg-card rounded-lg border border-border border-border/40 text-xs space-y-1.5">
                <div className="flex items-center justify-between tabular-nums text-xs text-muted-foreground">
                  <span>Good Linear Feed:</span>
                  <strong className="text-foreground">{rollCalc.linear_feed_ft} ft</strong>
                </div>
                {rollCalc.bleed_allowance_ft > 0 && (
                  <div className="flex items-center justify-between tabular-nums text-xs text-muted-foreground">
                    <span>+ Bleed Allowance ({bleedInches}&quot;):</span>
                    <strong className="text-primary">+{rollCalc.bleed_allowance_ft} ft</strong>
                  </div>
                )}
                {rollCalc.wastage_length_ft > 0 && (
                  <div className="flex items-center justify-between tabular-nums text-xs text-destructive">
                    <span>+ Scrap Wastage Run:</span>
                    <strong>+{rollCalc.wastage_length_ft} ft</strong>
                  </div>
                )}
                <div className="pt-1.5 border-t border-border flex items-center justify-between tabular-nums text-xs">
                  <span className="font-bold text-foreground">Total Linear Deduction:</span>
                  <span className="font-black text-destructive text-destructive text-sm">
                    -{rollCalc.total_linear_deduction_ft} ft ({rollCalc.total_utilized_area_sft} SFT)
                  </span>
                </div>
                <div className="flex items-center justify-between tabular-nums text-xs pt-0.5">
                  <span className="font-bold text-foreground">Remaining Roll Length:</span>
                  <span className="font-black text-success text-success">
                    {rollCalc.roll_current_length_ft} ft ➔ {rollCalc.new_remaining_length_ft} ft
                  </span>
                </div>
              </div>
            )}

            {/* SHORTAGE WARNING & 1-CLICK REQUISITION TRIGGER */}
            {rollCalc?.is_shortage && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl space-y-2">
                <div className="flex items-start gap-2">
                  <AlertOctagon className="h-4 w-4 text-destructive shrink-0 mt-0.5"/>
                  <div className="text-xs">
                    <strong className="text-destructive font-black block">
 Roll Length Shortage Detected! (রোলে পর্যাপ্ত দৈর্ঘ্য নেই)
                    </strong>
                    <p className="text-destructive tabular-nums mt-0.5">
 Required: <strong>{rollCalc.total_linear_deduction_ft}ft</strong> | Available: <strong>{rollCalc.roll_current_length_ft}ft</strong> (Shortage of <strong>{rollCalc.shortage_amount_ft}ft</strong>)
                    </p>
                  </div>
                </div>

                <Button
 type="button"onClick={handleRequestNewRoll}
 disabled={isRequestingRoll}
 className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-bold h-9 cursor-pointer shadow-xs gap-1.5">
                  <Plus className="h-4 w-4"/>
                  <span>{isRequestingRoll ? 'Requisitioning Roll...' : `Request & Mount New ${selectedRoll.width_ft}ft Roll (164ft Master)`}</span>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Scrap / Wastage Toggle */}
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
 type="checkbox"id="hasScrap"checked={hasScrap}
 onChange={(e) => setHasScrap(e.target.checked)}
 className="h-4 w-4 rounded border-input text-destructive focus:ring-ring cursor-pointer"/>
              <Label htmlFor="hasScrap"className="text-xs font-bold text-destructive text-destructive cursor-pointer flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5"/>
                <span>Log Defect / Scrap Wastage (নষ্ট / স্ক্র্যাপ রেকর্ড করুন)</span>
              </Label>
            </div>
            {hasScrap && (
              <span className="text-xs font-bold text-destructive animate-pulse">
 Wastage will be logged to inventory ledger
              </span>
            )}
          </div>

          {hasScrap && (
            <div className="mt-3 p-3.5 bg-destructive/10 border border-destructive/20 rounded-xl space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Scrap Quantity / Linear Length */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-destructive">
                      {selectedRoll
                        ? 'Scrap Wastage Length (Linear Feet)'
                        : `Scrap / Defective Quantity (${task.unit || 'pcs'})`}
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setKeypadTarget('scrapQty')}
                      className="h-7 px-2 text-xs font-bold border-border text-foreground hover:bg-muted shrink-0 cursor-pointer"
                    >
                      🔢 কিপ্যাড
                    </Button>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={selectedRoll ? (scrapWastageLengthFt || '') : (scrapQty || '')}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0
                      setScrapWastageLengthFt(val)
                      setScrapQty(val)
                    }}
                    className="h-9 tabular-nums font-bold text-sm bg-card border-border"
                    placeholder={selectedRoll ? 'e.g. 2.5 ft' : 'e.g. 5'}
                    required={hasScrap}
                  />
                  {scrapAreaSft > 0 && (
                    <span className="text-xs text-destructive tabular-nums block">
                      = {scrapAreaSft} SFT Scrap Material
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-destructive text-destructive">
 Defect Reason (ত্রুটির কারণ)
                  </Label>
                  <select
 value={defectReason}
 onChange={(e) => {
 setDefectReason(e.target.value as any)
 setScrapWastageReason(e.target.value)
                    }}
 className="w-full h-9 px-2.5 rounded-md border border-danger-border border-danger-border bg-card text-xs font-semibold"required={hasScrap}
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
                <Label className="text-xs font-semibold text-destructive text-destructive">
 Scrap Notes & Defect Description
                </Label>
                <Input
 value={scrapNotes}
 onChange={(e) => setScrapNotes(e.target.value)}
 placeholder="e.g. Head scratched middle 4ft of banner / Color banding during roll end"className="h-9 text-xs bg-card border-danger-border"/>
              </div>
            </div>
          )}
        </div>

        {/* Machine Running Meter Optional Reading */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-muted-foreground">
 Machine Meter Reading (মেশিন কাউন্টার - ঐচ্ছিক)
            </Label>
            <Input
 type="number"value={machineMeter}
 onChange={(e) => setMachineMeter(e.target.value)}
 placeholder="e.g. 14520"className="h-9 tabular-nums text-xs"/>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-muted-foreground">
 Operator Notes / Handover Remarks
            </Label>
            <Input
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 placeholder="e.g. Clean print run; passed to Finishing/Dispatch"className="h-9 text-xs"/>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs min-h-[48px] h-12 px-4 cursor-pointer"
          >
            {isBn ? 'বাতিল' : 'Cancel'}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="text-xs font-bold min-h-[48px] h-12 px-5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer gap-1.5 transition-all"
          >
            {isSubmitting ? (
              <>
                <RotateCw className="h-4 w-4 animate-spin" />
                <span>{isBn ? 'সম্পন্ন হচ্ছে...' : 'Completing...'}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>{isBn ? 'সম্পন্ন ও আপডেট করুন' : 'Complete & Update Flow'}</span>
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Glove-friendly Numeric Keypad Modal */}
      <NumericKeypadModal
        isOpen={keypadTarget !== null}
        onClose={() => setKeypadTarget(null)}
        initialValue={
          keypadTarget === 'goodQty' ? goodQty :
          keypadTarget === 'scrapQty' ? (selectedRoll ? scrapWastageLengthFt : scrapQty) :
          bleedInches
        }
        title={
          keypadTarget === 'goodQty' ? 'Enter Good Quantity' :
          keypadTarget === 'scrapQty' ? 'Enter Scrap Quantity' :
          'Enter Bleed Allowance (Inches)'
        }
        titleBn={
          keypadTarget === 'goodQty' ? 'সঠিক পরিমাণ লিখুন' :
          keypadTarget === 'scrapQty' ? 'নষ্টের পরিমাণ লিখুন' :
          'ব্লিড এলাউন্স (ইঞ্চি)'
        }
        unit={keypadTarget === 'bleedInches' ? 'in' : (task?.unit || 'pcs')}
        onConfirm={(val) => {
          if (keypadTarget === 'goodQty') setGoodQty(val)
          else if (keypadTarget === 'scrapQty') {
            setScrapQty(val)
            setScrapWastageLengthFt(val)
          } else if (keypadTarget === 'bleedInches') setBleedInches(val)
        }}
      />
    </ModalDialog>
  )
}
