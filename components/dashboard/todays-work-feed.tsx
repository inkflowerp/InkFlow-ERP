'use client'

import React, { useState } from 'react'
import {
  Clock,
  Play,
  Pause,
  CheckCircle2,
  AlertOctagon,
  Printer,
  Layers,
  Truck,
  Sparkles,
  ChevronRight,
  Filter,
  Check,
  User,
  Calendar,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ReportProblemModal } from '@/components/production/report-problem-modal'
import { ProductionTaskRecord } from '@/types/production.types'
import {
  startProductionTaskAction,
  pauseProductionTaskAction,
  completeProductionTaskAction,
} from '@/actions/production-planning.actions'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface TodaysWorkItem {
  id: string
  time: string
  jobNumber: string
  customerName: string
  workTitle: string
  dimensionsSpec: string
  materialSpec: string
  quantity: number
  unit: string
  stage: 'design' | 'printing' | 'finishing' | 'delivery'
  status: 'queued' | 'in_progress' | 'paused' | 'completed'
  priority?: 'normal' | 'urgent' | 'very_urgent'
  assignedMachine?: string
}

interface TodaysWorkFeedProps {
  tasks?: ProductionTaskRecord[]
  onRefresh?: () => void
  onOpenNewWork?: () => void
}

export function TodaysWorkFeed({ tasks = [], onRefresh, onOpenNewWork }: TodaysWorkFeedProps) {
  const { tBilingual } = useI18n()
  const [filter, setFilter] = useState<'all' | 'running' | 'queued' | 'urgent'>('all')
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [problemTask, setProblemTask] = useState<ProductionTaskRecord | null>(null)

  // Completion modal state
  const [completingTask, setCompletingTask] = useState<ProductionTaskRecord | null>(null)
  const [goodQty, setGoodQty] = useState(1)
  const [scrapQty, setScrapQty] = useState(0)
  const [isSubmittingComplete, setIsSubmittingComplete] = useState(false)

  const handleStart = async (task: ProductionTaskRecord) => {
    setActionLoadingId(task.id)
    try {
      await startProductionTaskAction(task.id, false, undefined, task)
      onRefresh?.()
    } finally {
      setActionLoadingId(null)
    }
  }

  const handlePause = async (task: ProductionTaskRecord) => {
    setActionLoadingId(task.id)
    try {
      await pauseProductionTaskAction(task.id, 'Operator Pause', undefined, task)
      onRefresh?.()
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleOpenComplete = (task: ProductionTaskRecord) => {
    setCompletingTask(task)
    setGoodQty(task.quantity)
    setScrapQty(0)
  }

  const handleConfirmComplete = async () => {
    if (!completingTask) return
    setIsSubmittingComplete(true)
    try {
      await completeProductionTaskAction(
        completingTask.id,
        {
          good_quantity: goodQty,
          rejected_quantity: scrapQty,
        },
        undefined,
        completingTask
      )
      setCompletingTask(null)
      onRefresh?.()
    } finally {
      setIsSubmittingComplete(false)
    }
  }

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'running') return t.status === 'in_progress' || t.status === 'paused'
    if (filter === 'queued') return t.status === 'queued' || t.status === 'scheduled' || t.status === 'ready'
    if (filter === 'urgent') return t.priority === 'urgent' || t.priority === 'very_urgent'
    return true
  })

  return (
    <div className="space-y-4">
      {/* Header & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            <span>{tBilingual("Today's Schedule & Actionable Work", 'আজকের কাজ (Today’s Work)')}</span>
          </h2>
          <Badge variant="outline" className="text-xs font-mono font-bold bg-blue-50 text-blue-700 border-blue-200">
            {tasks.length}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5">
          {(['all', 'running', 'queued', 'urgent'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                filter === f
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {f === 'all' && tBilingual('All', 'সব')}
              {f === 'running' && tBilingual('Running', 'চলমান')}
              {f === 'queued' && tBilingual('Queued', 'কিউতে')}
              {f === 'urgent' && tBilingual('Urgent', 'জরুরি')}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <Card className="border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <CardContent className="p-8 text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {tBilingual('No active work in this filter', 'এই ফিল্টারে কোনো কাজ নেই')}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {tBilingual('All caught up or ready to take a new job order.', 'সব কাজ সম্পন্ন হয়েছে বা নতুন কাজ শুরু করতে পারেন।')}
              </p>
            </div>
            {onOpenNewWork && (
              <Button
                type="button"
                size="sm"
                onClick={onOpenNewWork}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
              >
                + {tBilingual('Create New Work', 'নতুন কাজ যোগ করুন')}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const isRunning = task.status === 'in_progress'
            const isPaused = task.status === 'paused'
            const isCompleted = task.status === 'completed'
            const isUrgent = task.priority === 'urgent' || task.priority === 'very_urgent'

            return (
              <Card
                key={task.id}
                className={`transition-all ${
                  isRunning
                    ? 'border-2 border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 shadow-sm'
                    : isPaused
                    ? 'border-2 border-amber-500 bg-amber-50/20 dark:bg-amber-950/20'
                    : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                }`}
              >
                <CardContent className="p-4 space-y-3">
                  {/* Top Bar: Job #, Status, Customer */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          className={`text-xs font-bold uppercase tracking-wider ${
                            isRunning
                              ? 'bg-blue-600 text-white'
                              : isPaused
                              ? 'bg-amber-600 text-white'
                              : isCompleted
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-700 text-white'
                          }`}
                        >
                          #{task.job_number || task.task_number}
                        </Badge>
                        {isUrgent && (
                          <Badge className="bg-rose-600 text-white text-[10px] font-bold animate-pulse">
                            {tBilingual('URGENT', 'জরুরি')}
                          </Badge>
                        )}
                        <span className="text-xs font-semibold text-slate-500">{(task as any).stage_name || task.department || task.task_type}</span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 pt-0.5 truncate">
                        {task.task_name}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {task.customer_name} • {task.product_name}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-base font-bold font-mono text-slate-900 dark:text-slate-100">
                        {task.quantity} <span className="text-xs font-normal text-slate-500">{task.unit}</span>
                      </div>
                      {task.assigned_machine_name && (
                        <div className="text-[11px] text-slate-500 flex items-center justify-end gap-1">
                          <Printer className="h-3 w-3" />
                          <span className="truncate max-w-[120px]">{task.assigned_machine_name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Operational Large Touch Actions */}
                  <div className="pt-1 flex items-center justify-end gap-2">
                    {task.status === 'queued' || task.status === 'scheduled' || task.status === 'ready' ? (
                      <Button
                        type="button"
                        size="sm"
                        disabled={actionLoadingId === task.id}
                        onClick={() => handleStart(task)}
                        className="h-10 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-5 shadow-xs"
                      >
                        <Play className="h-4 w-4 mr-1.5 fill-current" />
                        {tBilingual('START (শুরু করুন)', 'শুরু করুন')}
                      </Button>
                    ) : isRunning ? (
                      <div className="flex items-center gap-2 w-full justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={actionLoadingId === task.id}
                            onClick={() => handlePause(task)}
                            className="h-10 text-xs font-bold border-amber-300 text-amber-800 hover:bg-amber-50"
                          >
                            <Pause className="h-4 w-4 mr-1" />
                            {tBilingual('Pause', 'স্থগিত')}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setProblemTask(task)}
                            className="h-10 text-xs font-bold border-rose-300 text-rose-800 hover:bg-rose-50"
                          >
                            <AlertOctagon className="h-4 w-4 mr-1 text-rose-600" />
                            {tBilingual('⚠ Issue (সমস্যা)', '⚠ সমস্যা')}
                          </Button>
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          disabled={actionLoadingId === task.id}
                          onClick={() => handleOpenComplete(task)}
                          className="h-10 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-6 shadow-sm"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1.5" />
                          {tBilingual('COMPLETE (সম্পন্ন)', 'সম্পন্ন')}
                        </Button>
                      </div>
                    ) : isPaused ? (
                      <div className="flex items-center gap-2 w-full justify-between">
                        <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 truncate">
                          স্থগিত: {task.hold_reason || 'Operator Pause'}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setProblemTask(task)}
                            className="h-9 text-xs font-semibold border-rose-200 text-rose-700"
                          >
                            <AlertOctagon className="h-3.5 w-3.5 mr-1" />
                            {tBilingual('Report Issue', 'সমস্যা')}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={actionLoadingId === task.id}
                            onClick={() => handleStart(task)}
                            className="h-9 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-4"
                          >
                            <Play className="h-3.5 w-3.5 mr-1 fill-current" />
                            {tBilingual('Resume', 'পুনরায় শুরু')}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Problem Modal */}
      {problemTask && (
        <ReportProblemModal
          isOpen={true}
          task={problemTask}
          onClose={() => setProblemTask(null)}
          onSuccess={() => {
            setProblemTask(null)
            onRefresh?.()
          }}
        />
      )}

      {/* Completion Sign-Off Modal */}
      {completingTask && (
        <ModalDialog
          open={true}
          onOpenChange={(open) => !open && setCompletingTask(null)}
          title={tBilingual('Sign Off & Complete Production', 'কাজ সম্পন্ন ও সাইন অফ')}
          hideFooter={true}
        >
          <div className="space-y-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-900">
              <div className="font-bold text-emerald-900 dark:text-emerald-100 text-sm">
                {completingTask.task_name}
              </div>
              <div className="text-xs text-emerald-700 dark:text-emerald-300">
                Customer: {completingTask.customer_name} • Target Qty: {completingTask.quantity} {completingTask.unit}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-emerald-700">
                  {tBilingual('Good Quantity (সঠিক মাল)', 'সঠিক তৈরি পরিমাণ *')}
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={goodQty}
                  onChange={(e) => setGoodQty(parseInt(e.target.value, 10) || 0)}
                  className="h-11 text-base font-bold font-mono text-center text-emerald-700"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-rose-700">
                  {tBilingual('Scrap / Wastage (নষ্ট / অপচয়)', 'অপচয় / স্ক্র্যাপ')}
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={scrapQty}
                  onChange={(e) => setScrapQty(parseInt(e.target.value, 10) || 0)}
                  className="h-11 text-base font-bold font-mono text-center text-rose-700"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={() => setCompletingTask(null)} className="text-xs">
                {tBilingual('Cancel', 'বাতিল')}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isSubmittingComplete}
                onClick={handleConfirmComplete}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-10 px-6 shadow-sm"
              >
                {isSubmittingComplete ? tBilingual('Saving...', 'সংরক্ষণ হচ্ছে...') : tBilingual('Confirm Complete', 'সম্পন্ন নিশ্চিত করুন')}
              </Button>
            </div>
          </div>
        </ModalDialog>
      )}
    </div>
  )
}
