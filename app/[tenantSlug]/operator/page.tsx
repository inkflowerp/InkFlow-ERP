'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Printer,
  CheckCircle2,
  Play,
  Pause,
  Layers,
  Scissors,
  Clock,
  Cpu,
  RotateCcw,
  AlertOctagon,
  AlertTriangle,
  FileCheck,
  Check,
  ChevronRight,
  User,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { useTenant } from '@/hooks/use-tenant'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { PageHeader } from '@/components/shared/page-header'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ProductionTaskRecord } from '@/types/production.types'
import {
  getProductionTasksAction,
  startProductionTaskAction,
  pauseProductionTaskAction,
  completeProductionTaskAction,
} from '@/actions/production-planning.actions'
import { HoldTaskModal } from '@/components/production/hold-task-modal'

export default function MobileOperatorPanelPage() {
  const { tBilingual } = useI18n()
  const { company } = useTenant()
  const slug = company?.slug || 'my-company'

  const [tasks, setTasks] = useState<ProductionTaskRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState<string | null>(null)

  // Completion Modal State
  const [selectedTaskForComplete, setSelectedTaskForComplete] = useState<ProductionTaskRecord | null>(null)
  const [goodQty, setGoodQty] = useState<number>(1)
  const [rejectedQty, setRejectedQty] = useState<number>(0)
  const [notes, setNotes] = useState<string>('')
  const [isSubmittingComplete, setIsSubmittingComplete] = useState(false)

  // Problem / Hold Modal
  const [selectedTaskForHold, setSelectedTaskForHold] = useState<ProductionTaskRecord | null>(null)

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  const loadTasks = async () => {
    setLoading(true)
    try {
      const res = await getProductionTasksAction()
      if (res.success && res.data) {
        setTasks(res.data)
      }
    } catch (_) {
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [])

  const handleStartTask = async (task: ProductionTaskRecord) => {
    try {
      const res = await startProductionTaskAction(task.id)
      if (res.success) {
        showNotification(`Started production for ${task.task_name}`)
        loadTasks()
      } else {
        showNotification(`Error: ${res.error}`)
      }
    } catch (err: any) {
      showNotification(`Error: ${err.message}`)
    }
  }

  const handlePauseTask = async (task: ProductionTaskRecord) => {
    const reason = prompt('Enter pause reason (e.g. Break / Maintenance / Media change):')
    if (reason === null) return

    try {
      const res = await pauseProductionTaskAction(task.id, reason || 'Operator paused')
      if (res.success) {
        showNotification(`Production paused.`)
        loadTasks()
      } else {
        showNotification(`Error: ${res.error}`)
      }
    } catch (err: any) {
      showNotification(`Error: ${err.message}`)
    }
  }

  const handleOpenCompleteModal = (task: ProductionTaskRecord) => {
    setSelectedTaskForComplete(task)
    setGoodQty(task.quantity)
    setRejectedQty(0)
    setNotes('')
  }

  const handleConfirmComplete = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTaskForComplete) return

    setIsSubmittingComplete(true)
    try {
      const res = await completeProductionTaskAction(selectedTaskForComplete.id, {
        good_quantity: goodQty,
        rejected_quantity: rejectedQty,
        notes: notes.trim() || undefined,
      })

      if (res.success) {
        showNotification(`Production completed & signed off! Good: ${goodQty}, Scrap: ${rejectedQty}`)
        setSelectedTaskForComplete(null)
        loadTasks()
      } else {
        showNotification(`Error: ${res.error}`)
      }
    } catch (err: any) {
      showNotification(`Error: ${err.message}`)
    } finally {
      setIsSubmittingComplete(false)
    }
  }

  // Active / Ready Tasks first
  const activeTasks = tasks.filter((t) => t.status === 'in_progress' || t.status === 'paused')
  const upcomingTasks = tasks.filter((t) => t.status === 'scheduled' || t.status === 'ready' || t.status === 'queued')
  const completedTasks = tasks.filter((t) => t.status === 'completed').slice(0, 5)

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-12">
      {/* Header */}
      <PageHeader
        titleEn="My Floor Queue & Operator Terminal"
        titleBn="আমার প্রোডাকশন কিউ ও অপারেটর টার্মিনাল"
        descriptionEn="Touch-optimized terminal to run production, log scrap, report issues, and sign off completed tasks."
        descriptionBn="সহজ ও দ্রুত টার্মিনাল: কাজ শুরু করুন, অপচয় হিসাব রাখুন এবং কাজ সম্পন্ন করুন।"
        icon={Printer}
        iconColor="text-blue-600"
        badge={
          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300">
            {tBilingual('Role: Press Operator', 'প্রেস অপারেটর')}
          </Badge>
        }
      />

      {/* Notifications */}
      {notification && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* ACTIVE RUNNING TASKS SECTION */}
      {activeTasks.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            {tBilingual('CURRENTLY RUNNING', 'বর্তমানে চলমান কাজ')} ({activeTasks.length})
          </div>

          <div className="space-y-3">
            {activeTasks.map((task) => (
              <Card
                key={task.id}
                className="border-2 border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 shadow-md"
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-600 text-white text-xs font-bold uppercase tracking-wider">
                          Job #{task.job_number || 'N/A'}
                        </Badge>
                        <span className="text-xs font-mono text-slate-500">{task.task_number}</span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                        {task.task_name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {task.customer_name} • {task.product_name}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                        {task.quantity} <span className="text-xs font-normal text-slate-500">{task.unit}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 justify-end">
                        <Clock className="h-3 w-3" />
                        <span>{task.estimated_duration_minutes}m est.</span>
                      </div>
                    </div>
                  </div>

                  {/* Machine & Operator Info */}
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Cpu className="h-4 w-4 text-blue-600" />
                      {task.assigned_machine_name || 'Manual (No Machine)'}
                    </span>
                    <span className="text-slate-500">
                      Started: {task.actual_start ? new Date(task.actual_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                    </span>
                  </div>

                  {/* Large Operator Touch Targets */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => handlePauseTask(task)}
                      className="h-12 text-xs font-bold border-amber-300 text-amber-800 hover:bg-amber-50"
                    >
                      <Pause className="h-4 w-4 mr-1.5" />
                      {tBilingual('Pause', 'স্থগিত')}
                    </Button>

                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => setSelectedTaskForHold(task)}
                      className="h-12 text-xs font-bold border-rose-300 text-rose-800 hover:bg-rose-50"
                    >
                      <AlertOctagon className="h-4 w-4 mr-1.5" />
                      {tBilingual('Report Issue', 'সমস্যা')}
                    </Button>

                    <Button
                      size="lg"
                      variant="default"
                      onClick={() => handleOpenCompleteModal(task)}
                      className="h-12 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1.5" />
                      {tBilingual('Complete', 'সম্পন্ন')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* UPCOMING QUEUE SECTION */}
      <div className="space-y-2">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          {tBilingual('UPCOMING IN QUEUE', 'পরবর্তী কিউ')} ({upcomingTasks.length})
        </div>

        <div className="space-y-2.5">
          {upcomingTasks.map((task) => (
            <Card
              key={task.id}
              className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            >
              <CardContent className="p-3.5 flex items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-mono">
                      #{task.job_number || task.task_number}
                    </Badge>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {task.task_name}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2">
                    <span>{task.customer_name}</span>
                    <span>•</span>
                    <span>{task.quantity} {task.unit}</span>
                    <span>•</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {task.assigned_machine_name || 'Manual'}
                    </span>
                  </div>
                </div>

                <div className="shrink-0">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleStartTask(task)}
                    disabled={task.is_blocked_by_dependency}
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 font-semibold h-9 px-3"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    {tBilingual('Start', 'শুরু')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {upcomingTasks.length === 0 && activeTasks.length === 0 && (
            <Card className="p-8 text-center border-dashed">
              <Printer className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {tBilingual('No active jobs in your queue!', 'আপনার কিউতে কোনো কাজ অপেক্ষমাণ নেই!')}
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* COMPLETE PRODUCTION TASK MODAL */}
      <ModalDialog
        open={!!selectedTaskForComplete}
        onOpenChange={(open) => !open && setSelectedTaskForComplete(null)}
        title={tBilingual('Sign Off Production Task', 'কাজ সম্পন্ন ও পরিমাণ নিশ্চিতকরণ')}
        hideFooter={true}
      >
        <form onSubmit={handleConfirmComplete} className="space-y-4">
          <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800 space-y-1">
            <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
              {selectedTaskForComplete?.task_name}
            </span>
            <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80">
              Confirm quantities produced. Downstream tasks (e.g. Lamination or Cutting) will automatically be marked READY.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                {tBilingual('Good Quantity Produced', 'সঠিক পরিমাণ')}
              </Label>
              <Input
                type="number"
                min={0}
                required
                value={goodQty}
                onChange={(e) => setGoodQty(parseInt(e.target.value) || 0)}
                className="text-xs font-bold text-emerald-800 dark:text-emerald-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-rose-700 dark:text-rose-400">
                {tBilingual('Rejected / Scrap Qty', 'নষ্ট / অপচয়')}
              </Label>
              <Input
                type="number"
                min={0}
                value={rejectedQty}
                onChange={(e) => setRejectedQty(parseInt(e.target.value) || 0)}
                className="text-xs font-bold text-rose-800 dark:text-rose-200"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              {tBilingual('Operator Notes (Optional)', 'অপারেটর মন্তব্য')}
            </Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Finished with high quality color profile..."
              className="text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedTaskForComplete(null)}
              disabled={isSubmittingComplete}
              className="text-xs"
            >
              {tBilingual('Cancel', 'বাতিল')}
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={isSubmittingComplete}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {isSubmittingComplete ? tBilingual('Completing...', 'সম্পন্ন হচ্ছে...') : tBilingual('Sign Off & Finish', 'সম্পন্ন নিশ্চিত করুন')}
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* PROBLEM / HOLD MODAL */}
      <HoldTaskModal
        isOpen={!!selectedTaskForHold}
        onClose={() => setSelectedTaskForHold(null)}
        task={selectedTaskForHold}
        onSuccess={() => {
          showNotification('Problem reported and task placed on hold.')
          loadTasks()
        }}
      />
    </div>
  )
}
