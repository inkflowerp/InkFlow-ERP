'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTenant } from '@/hooks/use-tenant'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import { useI18n } from '@/i18n/context'
import {
  Printer,
  Scissors,
  Layers,
  Phone,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  ExternalLink,
  MessageSquare,
  FileCheck2,
  Cpu,
  User,
  AlertOctagon,
  Lock,
  Calendar,
  Sparkles,
  ChevronRight,
  Package,
  Truck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import {
  ProductionTaskRecord,
  UnifiedProductionJob,
  HOLD_REASON_LABELS,
} from '@/types/production.types'

export interface ProductionJobCardProps {
  job: UnifiedProductionJob
  activeTab?: string
  onStartTask?: (task: ProductionTaskRecord) => void
  onPauseTask?: (task: ProductionTaskRecord) => void
  onCompleteTask?: (task: ProductionTaskRecord) => void
  onHoldTask?: (task: ProductionTaskRecord) => void
  onResumeTask?: (task: ProductionTaskRecord) => void
  onScheduleTask?: (task: ProductionTaskRecord) => void
  onReworkTask?: (task: ProductionTaskRecord) => void
  onPrintTicket?: (task: ProductionTaskRecord) => void
  onSendWhatsApp?: (task: ProductionTaskRecord) => void
}

export const ProductionJobCard = React.memo(function ProductionJobCard({
  job,
  activeTab,
  onStartTask,
  onPauseTask,
  onCompleteTask,
  onHoldTask,
  onResumeTask,
  onScheduleTask,
  onReworkTask,
  onPrintTicket,
  onSendWhatsApp,
}: ProductionJobCardProps) {
  const pathname = usePathname() || ''
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const isBn = locale === 'bn'
  const tenantSlug = company?.slug || 'my-company'

  const isUrgent = job.priority === 'urgent' || job.priority === 'very_urgent'
  const isWalkIn =
    job.customerName?.toLowerCase().includes('walk') ||
    job.customerName?.toLowerCase().includes('counter') ||
    job.customerName?.toLowerCase().includes('দোকান')
  const isDueToday = job.deadline?.includes(new Date().toISOString().split('T')[0])

  const jobDetailHref = getTenantNavHref(`/production/${job.id}`, pathname, tenantSlug)
  const invoiceHref = job.invoiceNumber
    ? getTenantNavHref(`/billing/${job.invoiceId || job.invoiceNumber}`, pathname, tenantSlug)
    : null
  const orderHref = job.orderNumber
    ? getTenantNavHref(`/orders`, pathname, tenantSlug)
    : null
  const deliveryHref = getTenantNavHref(`/delivery`, pathname, tenantSlug)

  // Active task is the task currently running, or the first non-completed task
  const activeTask =
    job.activeTask ||
    job.tasks.find((t) => t.status === 'in_progress' || t.status === 'paused') ||
    job.tasks.find((t) => t.status !== 'completed' && t.status !== 'cancelled') ||
    job.tasks[0]

  const isAllTasksCompleted =
    job.tasks.length > 0 && job.tasks.every((t) => t.status === 'completed')

  const isPrintTask = activeTask?.task_type === 'printing' || activeTask?.department === 'printing'
  const isFinishingTask = activeTask?.task_type === 'finishing' || activeTask?.department === 'finishing'

  const hasFinishingTask = job.tasks.some(
    (t) => t.department === 'finishing' || t.task_type === 'finishing'
  )
  const hasFinishingPending = job.tasks.some(
    (t) => (t.department === 'finishing' || t.task_type === 'finishing') && t.status !== 'completed'
  )
  const isPrintingCompleted = job.tasks.some(
    (t) => (t.department === 'printing' || t.task_type === 'printing') && t.status === 'completed'
  )

  // Material selection & Wastage states
  const [selectedMaterial, setSelectedMaterial] = React.useState<string>(
    activeTask?.required_material || job.material || ''
  )
  const [wastageQty, setWastageQty] = React.useState<number>(activeTask?.rejected_quantity || 0)
  const [wastageReason, setWastageReason] = React.useState<string>(activeTask?.defect_reason || 'banding')

  React.useEffect(() => {
    if (activeTask) {
      if (activeTask.required_material) {
        setSelectedMaterial(activeTask.required_material)
      } else if (job.material) {
        setSelectedMaterial(job.material)
      }
      if (activeTask.rejected_quantity) {
        setWastageQty(activeTask.rejected_quantity)
      }
    }
  }, [activeTask?.id, activeTask?.required_material, job.material])

  const handleMaterialChange = (newMat: string) => {
    setSelectedMaterial(newMat)
    if (activeTask) {
      activeTask.required_material = newMat
      try {
        const tasks = PrintERPDataStore.get<ProductionTaskRecord[]>(STORAGE_KEYS.PRODUCTION_TASKS) || []
        const idx = tasks.findIndex((t) => t.id === activeTask.id)
        if (idx !== -1) {
          tasks[idx] = { ...tasks[idx], required_material: newMat, updated_at: new Date().toISOString() }
          PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_TASKS, tasks)
        }
      } catch (_) {}
    }
  }

  const getStatusBadge = () => {
    if (job.status === 'ready_delivery' || (isPrintingCompleted && !hasFinishingTask) || isAllTasksCompleted || job.status === 'completed') {
      return (
        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-lg flex items-center gap-1 border border-emerald-300 dark:border-emerald-800">
          <Truck className="h-3 w-3 text-emerald-600" />
          <span>{isBn ? 'ডেলিভারি ও ডিসপ্যাচে প্রেরিত' : 'Sent to Delivery and Dispatch'}</span>
        </span>
      )
    }

    if (activeTask?.department === 'finishing' || job.status === 'finishing' || (isPrintingCompleted && hasFinishingPending)) {
      return (
        <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 px-2 py-0.5 rounded-lg flex items-center gap-1 border border-indigo-300 dark:border-indigo-800">
          <Scissors className="h-3 w-3 text-indigo-600" />
          <span>{isBn ? 'ফিনিশিংয়ে প্রেরিত (Sent to Finishing)' : 'Sent to Finishing'}</span>
        </span>
      )
    }

    if (activeTask?.status === 'in_progress') {
      return (
        <span className="text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 px-2 py-0.5 rounded-lg flex items-center gap-1 border border-blue-300 dark:border-blue-800 animate-pulse">
          {isPrintTask ? <Printer className="h-3 w-3 text-blue-600" /> : <Play className="h-3 w-3 text-blue-600" />}
          <span>{isPrintTask ? (isBn ? 'প্রিন্ট রানিং' : 'Printing in Progress') : (isBn ? 'ফ্লোরে রানিং' : 'Running on Floor')}</span>
        </span>
      )
    }

    if (activeTask?.status === 'paused') {
      return (
        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 rounded-lg flex items-center gap-1 border border-amber-300 dark:border-amber-800">
          <Pause className="h-3 w-3 text-amber-600" />
          <span>{isBn ? 'সাময়িক স্থগিত (Paused)' : 'Paused'}</span>
        </span>
      )
    }

    if (activeTask?.status === 'on_hold') {
      return (
        <span className="text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 rounded-lg flex items-center gap-1 border border-amber-300 dark:border-amber-800">
          <AlertOctagon className="h-3 w-3 text-amber-600" />
          <span>{isBn ? 'স্থগিতাদেশ (On Hold)' : 'On Hold'}</span>
        </span>
      )
    }

    if (activeTask?.status === 'scheduled') {
      return (
        <span className="text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 px-2 py-0.5 rounded-lg flex items-center gap-1 border border-purple-300 dark:border-purple-800">
          <Calendar className="h-3 w-3 text-purple-600" />
          <span>{isBn ? 'শিডিউল্ড (Scheduled)' : 'Scheduled'}</span>
        </span>
      )
    }

    return (
      <span className="text-[10px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 rounded-lg flex items-center gap-1 border border-slate-300 dark:border-slate-700">
        <Clock className="h-3 w-3 text-slate-500" />
        <span>{isBn ? 'অপেক্ষমাণ কিউ (Queued)' : 'Queued'}</span>
      </span>
    )
  }

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm shadow-xs ${
        isUrgent
          ? 'border-rose-300 dark:border-rose-900/60 ring-1 ring-rose-400/20'
          : 'border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      {/* Top Banner for Urgent / Walk-in / Due Today */}
      {(isUrgent || isWalkIn || isDueToday) && (
        <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-transparent px-4 py-1.5 border-b border-amber-200/50 dark:border-amber-900/40 flex items-center justify-between text-[11px] font-bold">
          <div className="flex items-center gap-2">
            {isWalkIn && (
              <span className="bg-orange-600 text-white px-2 py-0.5 rounded text-[10px] uppercase tracking-wide">
                🏃 {isBn ? 'দোকানে বসা কাস্টমার (Walk-in)' : 'Walk-in Client'}
              </span>
            )}
            {isDueToday && (
              <span className="bg-rose-600 text-white px-2 py-0.5 rounded text-[10px] uppercase tracking-wide">
                ⏰ {isBn ? 'আজকের ডেলিভারি (Due Today)' : 'Due Today'}
              </span>
            )}
            {isUrgent && !isDueToday && (
              <span className="bg-red-600 text-white px-2 py-0.5 rounded text-[10px] uppercase tracking-wide">
                🚨 {isBn ? 'জরুরী কাজ (Urgent)' : 'Urgent Job'}
              </span>
            )}
          </div>
          <span className="text-slate-500 text-[10px] font-mono">
            {job.deadline ? `টার্গেট: ${job.deadline.split('T')[0]}` : ''}
          </span>
        </div>
      )}

      {/* Main Card Body: 2-Column Split matching Design Studio */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Left Column: Job Info, Specifications & Sequential Stages (7 Cols) */}
        <div className="md:col-span-7 flex flex-col justify-between space-y-3">
          <div>
            {/* Header Badges */}
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Link
                  href={jobDetailHref}
                  className="font-mono text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors inline-flex items-center gap-1"
                >
                  <span>#{job.jobNumber}</span>
                  <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                </Link>

                {job.orderNumber && orderHref && (
                  <Link
                    href={orderHref}
                    className="font-mono text-xs font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors"
                  >
                    Ord: #{job.orderNumber}
                  </Link>
                )}

                {job.invoiceNumber && invoiceHref && (
                  <Link
                    href={invoiceHref}
                    className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Inv: #{job.invoiceNumber}
                  </Link>
                )}

                {getStatusBadge()}
              </div>

              <div className="flex items-center gap-1.5">
                <Link
                  href={jobDetailHref}
                  className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
                >
                  <span>Floor View ➔</span>
                </Link>
                <span className="text-[11px] font-mono text-slate-400">
                  {job.tasks.length} {isBn ? 'ধাপ' : 'steps'}
                </span>
              </div>
            </div>

            {/* Title & Customer Name */}
            <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1 leading-snug">
              <Link href={jobDetailHref} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                {job.title}
              </Link>
            </h3>

            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mt-1">
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                {job.customerName}
              </span>
              {job.customerPhone && onSendWhatsApp && activeTask && (
                <button
                  type="button"
                  onClick={() => onSendWhatsApp(activeTask)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                  title="WhatsApp Update"
                >
                  <Phone className="h-3 w-3 text-emerald-600" />
                  <span>{job.customerPhone}</span>
                </button>
              )}
            </div>

            {/* Job Specifications Strip: Prominently Highlighted Service, Size, Quantity, Finishing, Add-on */}
            <div className="mt-2.5 bg-gradient-to-r from-slate-50 via-blue-50/20 to-slate-50 dark:from-slate-800/80 dark:via-blue-950/20 dark:to-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 text-[11px] space-y-2.5 shadow-2xs">
              {/* Product Title Bar with HIGHLIGHTED Service Name */}
              <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-200/80 dark:border-slate-700/80">
                <div className="flex items-center gap-1.5 truncate max-w-[65%]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
                    {isBn ? 'প্রোডাক্ট:' : 'Product:'}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white truncate text-xs" title={job.productName || job.title}>
                    {job.productName || job.title}
                  </span>
                </div>

                {/* 1. HIGHLIGHTED Service Name */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-semibold text-slate-400">{isBn ? 'সার্ভিস:' : 'Service:'}</span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg font-bold text-[11px] bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200 border border-blue-300 dark:border-blue-700 shadow-2xs">
                    <Layers className="h-3 w-3 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="truncate max-w-[150px]">{job.serviceName || 'Commercial Print'}</span>
                  </span>
                </div>
              </div>

              {/* 4-Tile High-Visibility Specification Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* 2. HIGHLIGHTED Size / Dimensions */}
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900/90 border border-amber-300/80 dark:border-amber-800/60 shadow-2xs flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wide flex items-center gap-1">
                    <span>📐</span>
                    <span>{isBn ? 'সাইজ / মাপ:' : 'Size / Dimensions:'}</span>
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white text-xs mt-1 truncate" title={job.dimensions || 'Standard Spec'}>
                    {job.dimensions || 'Standard Spec'}
                  </span>
                </div>

                {/* 3. HIGHLIGHTED Quantity (Qty) */}
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900/90 border border-emerald-300/80 dark:border-emerald-800/60 shadow-2xs flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wide flex items-center gap-1">
                    <Package className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{isBn ? 'পরিমাণ (Qty):' : 'Quantity (Qty):'}</span>
                  </span>
                  <span className="font-mono font-bold text-emerald-800 dark:text-emerald-300 text-xs mt-1">
                    {job.quantity} {job.unit || 'pcs'}
                  </span>
                </div>

                {/* 4. HIGHLIGHTED Finishing */}
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900/90 border border-teal-300/80 dark:border-teal-800/60 shadow-2xs flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-teal-800 dark:text-teal-400 uppercase tracking-wide flex items-center gap-1">
                    <Scissors className="h-3 w-3 text-teal-600 dark:text-teal-400 shrink-0" />
                    <span>{isBn ? 'ফিনিশিং:' : 'Finishing:'}</span>
                  </span>
                  <div className="mt-1">
                    {job.finishing ? (
                      <span className="font-bold text-teal-900 dark:text-teal-200 text-[11px] truncate block leading-tight" title={job.finishing}>
                        {job.finishing}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[10px] italic">{isBn ? 'কোন ফিনিশিং নেই' : 'None'}</span>
                    )}
                  </div>
                </div>

                {/* 5. HIGHLIGHTED Add-on */}
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900/90 border border-purple-300/80 dark:border-purple-800/60 shadow-2xs flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-purple-800 dark:text-purple-400 uppercase tracking-wide flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-purple-600 dark:text-purple-400 shrink-0" />
                    <span>{isBn ? 'অ্যাড-অন:' : 'Add-on:'}</span>
                  </span>
                  <div className="mt-1">
                    {job.addOns ? (
                      <span className="font-bold text-purple-900 dark:text-purple-200 text-[11px] truncate block leading-tight" title={job.addOns}>
                        {job.addOns}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[10px] italic">{isBn ? 'কোন অ্যাড-অন নেই' : 'None'}</span>
                    )}
                  </div>
                </div>
              </div>

              {job.instructions && (
                <div className="border-t border-slate-200/80 dark:border-slate-700/80 pt-1.5 text-slate-600 dark:text-slate-400">
                  <span className="text-[10px] font-bold text-slate-500 block">{isBn ? 'কাস্টমার নির্দেশনা:' : 'Instructions:'}</span>
                  <p className="line-clamp-2 text-[10px] italic">{job.instructions}</p>
                </div>
              )}
            </div>
          </div>

          {/* Sequential Production Stages Pipeline Strip */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {isBn ? 'প্রোডাকশন ধাপ ও ফ্লোর অগ্রগতি (Production Pipeline):' : 'Production Stages & Progression:'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {job.tasks.filter((t) => t.status === 'completed').length}/{job.tasks.length} {isBn ? 'সম্পন্ন' : 'Done'}
              </span>
            </div>

            <div className="space-y-1.5">
              {job.tasks.map((task, idx) => {
                const isCurrentActive = activeTask?.id === task.id
                const isDone = task.status === 'completed'
                const isRunning = task.status === 'in_progress'
                const isHold = task.status === 'on_hold'

                return (
                  <div
                    key={task.id}
                    className={`p-2 rounded-lg text-[11px] border transition-all flex items-center justify-between gap-2 ${
                      isRunning
                        ? 'bg-blue-50/80 border-blue-400 dark:bg-blue-950/40 dark:border-blue-700'
                        : isDone
                        ? 'bg-emerald-50/60 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-800 text-slate-600 dark:text-slate-400'
                        : isHold
                        ? 'bg-amber-50/60 border-amber-300 dark:bg-amber-950/20 dark:border-amber-800'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          isDone
                            ? 'bg-emerald-600 text-white'
                            : isRunning
                            ? 'bg-blue-600 text-white animate-pulse'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {isDone ? '✓' : idx + 1}
                      </span>
                      <div className="truncate">
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                          {task.task_name}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                          <span>{task.assigned_machine_name || 'Manual (No Machine)'}</span>
                          {task.assigned_operator_name && (
                            <>
                              <span>•</span>
                              <span>{task.assigned_operator_name}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>{task.estimated_duration_minutes || 30}m</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isDone && (
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded">
                          Done
                        </span>
                      )}
                      {isRunning && (
                        <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-950 px-2 py-0.5 rounded animate-pulse">
                          Running
                        </span>
                      )}
                      {isHold && (
                        <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded">
                          Hold
                        </span>
                      )}
                      {!isDone && !isRunning && !isHold && (
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded capitalize">
                          {task.status}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Active Machine & Operator, Warnings & Action Controls (5 Cols) */}
        <div className="md:col-span-5 flex flex-col justify-between space-y-3">
          {/* Top of right col: Active Execution Box & Blocking Warnings */}
          <div className="space-y-2.5">
            {/* Active Machine & Operator Execution Card */}
            <div className="p-3 bg-gradient-to-br from-slate-50 to-blue-50/40 dark:from-slate-800/80 dark:to-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                <span>{isBn ? 'বর্তমান সক্রিয় ধাপ ও মেশিন:' : 'Active Machine & Station:'}</span>
                {activeTask?.status === 'in_progress' && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 animate-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    LIVE
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-start gap-1.5">
                  <Cpu className="h-3.5 w-3.5 text-blue-600 mt-0.5 shrink-0" />
                  <div className="truncate">
                    <span className="text-slate-400 block text-[9px]">{isBn ? 'মেশিনারি বহর:' : 'Assigned Machine:'}</span>
                    <strong className="text-slate-800 dark:text-slate-200 truncate block text-[11px]">
                      {activeTask?.assigned_machine_name || 'Manual Bench'}
                    </strong>
                  </div>
                </div>

                <div className="flex items-start gap-1.5">
                  <User className="h-3.5 w-3.5 text-indigo-600 mt-0.5 shrink-0" />
                  <div className="truncate">
                    <span className="text-slate-400 block text-[9px]">{isBn ? 'দায়িত্বপ্রাপ্ত অপারেটর:' : 'Operator:'}</span>
                    <strong className="text-slate-800 dark:text-slate-200 truncate block text-[11px]">
                      {activeTask?.assigned_operator_name || 'Unassigned'}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-slate-400" />
                  <span>{activeTask?.estimated_duration_minutes || 30} mins</span>
                </div>
                <span>
                  {activeTask?.quantity || job.quantity} {activeTask?.unit || job.unit || 'pcs'}
                </span>
              </div>

              {/* Printing Material Selection */}
              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Layers className="h-3 w-3 text-blue-600 shrink-0" />
                    <span>{isBn ? 'প্রিন্টিং মেটেরিয়াল:' : 'Printing Material Selection:'}</span>
                  </span>
                  {selectedMaterial && (
                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">Selected ✓</span>
                  )}
                </div>
                <select
                  value={selectedMaterial || activeTask?.required_material || job.material || ''}
                  onChange={(e) => handleMaterialChange(e.target.value)}
                  className="w-full text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="">-- Choose Printing Material --</option>
                  <option value="Star Flex (320 GSM)">Star Flex (320 GSM)</option>
                  <option value="Blackout Flex (340 GSM)">Blackout Flex (340 GSM)</option>
                  <option value="PVC Vinyl Glossy (120 GSM)">PVC Vinyl Glossy (120 GSM)</option>
                  <option value="PVC Vinyl Matte (120 GSM)">PVC Vinyl Matte (120 GSM)</option>
                  <option value="Reflective Sheeting Honeycomb">Reflective Sheeting Honeycomb</option>
                  <option value="Canvas Substrate (260 GSM)">Canvas Substrate (260 GSM)</option>
                  <option value="Backlit Film (180 GSM)">Backlit Film (180 GSM)</option>
                  <option value="One Way Vision Sticker">One Way Vision Sticker</option>
                  <option value="Art Card 300 GSM">Art Card 300 GSM</option>
                  <option value="Art Card 350 GSM">Art Card 350 GSM</option>
                  <option value="Swedish Board 300 GSM">Swedish Board 300 GSM</option>
                  <option value="Offset Paper 80 GSM">Offset Paper 80 GSM</option>
                </select>
              </div>

              {/* Wastage / Scrap Field */}
              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 space-y-1.5 bg-amber-50/60 dark:bg-amber-950/30 p-2 rounded-xl border border-amber-200 dark:border-amber-800/50">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                    <span>{isBn ? 'ওয়েস্টেজ ও অপচয় (Wastage / Scrap):' : 'Wastage / Scrap Field:'}</span>
                  </span>
                  <span className="text-[9px] font-mono text-amber-700 dark:text-amber-400">
                    {activeTask?.unit || job.unit || 'pcs'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={wastageQty || ''}
                      onChange={(e) => setWastageQty(Number(e.target.value))}
                      placeholder={isBn ? 'অপচয় পরিমাণ' : 'Wastage qty (অপচয়)'}
                      className="h-7 text-xs font-mono bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-700"
                    />
                  </div>
                  <div>
                    <select
                      value={wastageReason}
                      onChange={(e) => setWastageReason(e.target.value)}
                      className="h-7 w-full text-[10px] rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 px-1 text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
                    >
                      <option value="banding">Color Banding (ব্যান্ডিং)</option>
                      <option value="head_strike">Head Strike (হেড স্ট্রাইক)</option>
                      <option value="media_wrinkle">Media Wrinkle (মিডিয়া কুঁচকানো)</option>
                      <option value="color_mismatch">Color Mismatch (কালার অমিল)</option>
                      <option value="cutting_misalignment">Cutting Error (কাটিং ভুল)</option>
                      <option value="operator_error">Operator Mistake (অপারেটর ভুল)</option>
                      <option value="material_defect">Defective Roll (ত্রুটিযুক্ত রোল)</option>
                      <option value="other">Other Scrap (অন্যান্য)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Commercial Hold Warning */}
            {activeTask?.is_blocked_by_commercial_gate && activeTask?.status !== 'completed' && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl text-[11px] text-rose-900 dark:text-rose-200 flex items-start gap-2">
                <Lock className="h-3.5 w-3.5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">COMMERCIAL HOLD:</span>{' '}
                  {activeTask?.commercial_gate_reason || 'Invoice required before production can start.'}
                </div>
              </div>
            )}

            {/* Design Hold Warning */}
            {activeTask?.is_blocked_by_design_gate && !activeTask?.is_blocked_by_commercial_gate && activeTask?.status !== 'completed' && (
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
                <Lock className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">DESIGN HOLD:</span>{' '}
                  {activeTask?.design_gate_reason || 'Customer design approval required.'}
                </div>
              </div>
            )}

            {/* Hold Reason Alert */}
            {activeTask?.status === 'on_hold' && activeTask?.hold_reason && (
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
                <AlertOctagon className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">ON HOLD:</span>{' '}
                  {HOLD_REASON_LABELS[activeTask.hold_reason]?.labelEn || activeTask.hold_reason}
                  {activeTask.hold_notes && <p className="text-[10px] opacity-90 mt-0.5">{activeTask.hold_notes}</p>}
                </div>
              </div>
            )}
          </div>

          {/* Action Controls Toolbar - Clean wrap and NO overflow! */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            {/* Quick Action Icons */}
            <div className="flex items-center gap-1">
              {onPrintTicket && activeTask && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onPrintTicket(activeTask)}
                  title="Print Job Work Order Slip"
                  className="h-8 w-8 p-0 text-slate-600 dark:text-slate-300 hover:text-slate-900 rounded-lg cursor-pointer"
                >
                  <FileCheck2 className="h-4 w-4" />
                </Button>
              )}
              {onSendWhatsApp && activeTask && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onSendWhatsApp(activeTask)}
                  title="Send Floor WhatsApp Update"
                  className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg cursor-pointer"
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Context Stage Progression Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 ml-auto">
              {activeTask?.status === 'on_hold' && onResumeTask && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onResumeTask(activeTask)}
                  className="h-8 text-xs font-semibold px-2.5 text-amber-800 border-amber-300 hover:bg-amber-50 dark:text-amber-300 dark:border-amber-700 rounded-xl cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  <span>Resume</span>
                </Button>
              )}

              {activeTask && activeTask.status !== 'completed' && activeTask.status !== 'cancelled' && activeTask.status !== 'on_hold' && onHoldTask && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onHoldTask(activeTask)}
                  className="h-8 text-xs font-semibold px-2 text-slate-500 hover:text-amber-600 rounded-xl cursor-pointer"
                >
                  Hold
                </Button>
              )}

              {activeTask?.status === 'queued' && onScheduleTask && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onScheduleTask(activeTask)}
                  className="h-8 text-xs font-semibold px-2.5 text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 rounded-xl cursor-pointer"
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  <span>Schedule</span>
                </Button>
              )}

              {/* Primary Action Button: Start Printing / Complete / Sent to Delivery */}
              {isAllTasksCompleted || job.status === 'ready_delivery' || (isPrintingCompleted && !hasFinishingTask) ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <div className="h-8 px-3 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5 border border-emerald-300 dark:border-emerald-800">
                    <Truck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>{isBn ? 'ডেলিভারি ও ডিসপ্যাচে প্রেরিত' : 'Sent to Delivery and Dispatch'}</span>
                  </div>
                  <Link
                    href={deliveryHref}
                    className="h-8 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors shrink-0"
                  >
                    <span>{isBn ? 'ডিসপ্যাচ দেখুন ➔' : 'View in Dispatch ➔'}</span>
                  </Link>
                </div>
              ) : activeTask?.status === 'in_progress' ? (
                <div className="flex items-center gap-1.5">
                  {onPauseTask && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onPauseTask(activeTask)}
                      className="h-8 text-xs font-bold border-amber-300 text-amber-800 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 rounded-xl cursor-pointer gap-1"
                    >
                      <Pause className="h-3 w-3" />
                      <span>{isBn ? 'পজ' : 'Pause'}</span>
                    </Button>
                  )}
                  {onCompleteTask && (
                    <Button
                      size="sm"
                      onClick={() =>
                        onCompleteTask({
                          ...activeTask,
                          rejected_quantity: wastageQty,
                          defect_reason: wastageQty > 0 ? wastageReason : null,
                          scrap_notes: wastageQty > 0 ? wastageReason : null,
                        })
                      }
                      className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs cursor-pointer gap-1.5"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>
                        {isPrintTask
                          ? isBn ? 'প্রিন্ট সম্পন্ন করুন' : 'Complete Printing'
                          : isBn ? 'ফিনিশিং সম্পন্ন করুন' : 'Complete Finishing'}
                      </span>
                    </Button>
                  )}
                </div>
              ) : (
                activeTask && onStartTask && (
                  <Button
                    size="sm"
                    onClick={() =>
                      onStartTask({
                        ...activeTask,
                        required_material: selectedMaterial || activeTask.required_material,
                      })
                    }
                    disabled={
                      activeTask.is_blocked_by_dependency ||
                      activeTask.is_blocked_by_commercial_gate ||
                      activeTask.is_blocked_by_design_gate
                    }
                    className="h-8 text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-3.5 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPrintTask ? (
                      <>
                        <Printer className="h-3.5 w-3.5" />
                        <span>{isBn ? 'প্রিন্ট শুরু করুন' : 'Start Printing'}</span>
                      </>
                    ) : isFinishingTask ? (
                      <>
                        <Scissors className="h-3.5 w-3.5" />
                        <span>{isBn ? 'ফিনিশিং শুরু করুন' : 'Start Finishing'}</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3 fill-white" />
                        <span>{isBn ? 'কাজ শুরু করুন' : 'Start Task'}</span>
                      </>
                    )}
                  </Button>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})
