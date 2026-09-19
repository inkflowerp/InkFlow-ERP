'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Printer,
  Play,
  Pause,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Clock,
  Layers,
  Wrench,
  Truck,
  RotateCcw,
  Sparkles,
  Search,
  ExternalLink,
  Users,
  AlertOctagon,
  TrendingUp,
  Scissors,
  Check,
  FileCheck,
  Cpu,
  Calendar,
  LayoutGrid,
  ListFilter,
  Plus,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { FeatureGate } from '@/components/subscriptions/feature-gate'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import {
  ProductionTaskRecord,
  MachineQueueGroup,
  ProductionDepartment,
  ProductionTaskStatus,
} from '@/types/production.types'
import {
  getProductionTasksAction,
  getMachineQueuesAction,
  startProductionTaskAction,
  pauseProductionTaskAction,
  completeProductionTaskAction,
  resumeProductionTaskAction,
} from '@/actions/production-planning.actions'
import { ProductionBoardCard } from '@/components/production/production-board-card'
import { MachineQueueView } from '@/components/production/machine-queue-view'
import { ScheduleTaskModal } from '@/components/production/schedule-task-modal'
import { HoldTaskModal } from '@/components/production/hold-task-modal'
import { ReworkTaskModal } from '@/components/production/rework-task-modal'

const DEPARTMENTS = [
  { id: 'all', label: 'All Operations', labelBn: 'সকল অপারেশন', icon: Printer },
  { id: 'printing', label: 'Wide & Flatbed Print', labelBn: 'প্রিন্টিং', icon: Printer },
  { id: 'finishing', label: 'Lamination & Die-cut', labelBn: 'ফিনিশিং', icon: Layers },
  { id: 'fabrication', label: 'Metal & Acrylic Fab', labelBn: 'ফেব্রিকেশন', icon: Wrench },
  { id: 'installation', label: 'On-Site Installation', labelBn: 'ইনস্টলেশন', icon: Truck },
]

export default function AdvancedProductionPage() {
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = company?.slug || 'my-company'

  const [activeTab, setActiveTab] = useState<'board' | 'machine_queues' | 'table'>('board')
  const [tasks, setTasks] = useState<ProductionTaskRecord[]>([])
  const [machineQueues, setMachineQueues] = useState<MachineQueueGroup[]>([])
  const [selectedDept, setSelectedDept] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState<string | null>(null)

  // Interactive Modals State
  const [scheduleTaskTarget, setScheduleTaskTarget] = useState<ProductionTaskRecord | null>(null)
  const [holdTaskTarget, setHoldTaskTarget] = useState<ProductionTaskRecord | null>(null)
  const [reworkTaskTarget, setReworkTaskTarget] = useState<ProductionTaskRecord | null>(null)

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 4000)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [taskRes, queueRes] = await Promise.all([
        getProductionTasksAction({ department: selectedDept }),
        getMachineQueuesAction(),
      ])

      if (taskRes.success && taskRes.data) {
        setTasks(taskRes.data)
      }
      if (queueRes.success && queueRes.data) {
        setMachineQueues(queueRes.data)
      }
    } catch (_) {
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedDept])

  // Filter Tasks
  const filteredTasks = tasks.filter((task) => {
    const matchDept = selectedDept === 'all' || task.department === selectedDept
    const matchSearch =
      task.task_number.toLowerCase().includes(search.toLowerCase()) ||
      task.task_name.toLowerCase().includes(search.toLowerCase()) ||
      (task.customer_name && task.customer_name.toLowerCase().includes(search.toLowerCase())) ||
      (task.job_number && task.job_number.toLowerCase().includes(search.toLowerCase()))

    return matchDept && matchSearch
  })

  // Executive KPI Counts
  const totalTasks = tasks.length
  const countQueued = tasks.filter((t) => t.status === 'queued' || t.status === 'scheduled').length
  const countInProgress = tasks.filter((t) => t.status === 'in_progress').length
  const countOnHold = tasks.filter((t) => t.status === 'on_hold' || t.hold_reason).length
  const countCompleted = tasks.filter((t) => t.status === 'completed').length
  const countMachinesInUse = machineQueues.filter((m) => m.operating_status === 'in_use' || m.now !== null).length

  // Quick Card Handlers
  const handleStartTask = async (task: ProductionTaskRecord) => {
    try {
      const res = await startProductionTaskAction(task.id, false, undefined, task)
      if (res.success) {
        showNotification(`Started task: ${task.task_name}`)
        loadData()
      } else {
        showNotification(`Error: ${res.error}`)
      }
    } catch (err: any) {
      showNotification(`Error: ${err.message}`)
    }
  }

  const handlePauseTask = async (task: ProductionTaskRecord) => {
    const reason = prompt('Enter pause reason (e.g. Break / Shift change / QC inspection):')
    if (reason === null) return

    try {
      const res = await pauseProductionTaskAction(task.id, reason || 'Operator paused', undefined, task)
      if (res.success) {
        showNotification(`Paused task: ${task.task_name}`)
        loadData()
      } else {
        showNotification(`Error: ${res.error}`)
      }
    } catch (err: any) {
      showNotification(`Error: ${err.message}`)
    }
  }

  const handleCompleteTask = async (task: ProductionTaskRecord) => {
    try {
      const res = await completeProductionTaskAction(
        task.id,
        {
          good_quantity: task.quantity,
          rejected_quantity: 0,
        },
        undefined,
        task
      )
      if (res.success) {
        showNotification(`Task completed! ${res.data?.nextReadyTask ? `Next task (${res.data.nextReadyTask.task_name}) is now READY.` : ''}`)
        loadData()
      } else {
        showNotification(`Error: ${res.error}`)
      }
    } catch (err: any) {
      showNotification(`Error: ${err.message}`)
    }
  }

  const handleResumeTask = async (task: ProductionTaskRecord) => {
    try {
      const res = await resumeProductionTaskAction(task.id, undefined, task)
      if (res.success) {
        showNotification(`Task ${task.task_number} resumed from hold.`)
        loadData()
      } else {
        showNotification(`Error: ${res.error}`)
      }
    } catch (err: any) {
      showNotification(`Error: ${err.message}`)
    }
  }

  // Kanban Columns Definition
  const kanbanColumns: { id: string; title: string; titleBn: string; statuses: ProductionTaskStatus[] }[] = [
    { id: 'queued', title: 'QUEUED', titleBn: 'অপেক্ষারত', statuses: ['queued'] },
    { id: 'scheduled', title: 'SCHEDULED', titleBn: 'শিডিউল্ড', statuses: ['scheduled', 'ready'] },
    { id: 'in_progress', title: 'IN PROGRESS', titleBn: 'চলমান', statuses: ['in_progress', 'paused'] },
    { id: 'on_hold', title: 'ON HOLD / REWORK', titleBn: 'স্থগিত / রি-ওয়ার্ক', statuses: ['on_hold', 'rework'] },
    { id: 'completed', title: 'COMPLETED', titleBn: 'সম্পন্ন', statuses: ['completed'] },
  ]

  return (
    <FeatureGate feature="production">
      <div className="space-y-6 max-w-7xl">
        {/* Header */}
        <PageHeader
          titleEn="Production Planning & Shop Floor Terminal"
          titleBn="প্রোডাকশন প্ল্যানিং ও শপ ফ্লোর টার্মিনাল"
          descriptionEn="Dispatch tasks, sequence multi-machine job orders, monitor machine queues, and manage floor execution."
          descriptionBn="টাস্ক শিডিউলিং, একাধিক মেশিনের কাজ বণ্টন, মেশিন কিউ পর্যবেক্ষণ এবং ফ্লোর কার্যক্রম পরিচালনা করুন।"
          icon={Printer}
          iconColor="text-blue-600"
          actions={
            <div className="flex items-center gap-2">
              <Link href={`/${slug}/production/machineries`}>
                <Button variant="outline" size="sm" className="text-xs bangla-text flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5 text-blue-600" />
                  {tBilingual('Machinery Fleet', 'মেশিনারি বহর')}
                </Button>
              </Link>
              <Link href={`/${slug}/operator`}>
                <Button variant="default" size="sm" className="text-xs bangla-text bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-xs">
                  <Printer className="h-3.5 w-3.5" />
                  {tBilingual('Operator Terminal', 'অপারেটর টার্মিনাল')}
                </Button>
              </Link>
            </div>
          }
        />

        {/* Notifications Toast */}
        {notification && (
          <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="p-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              {tBilingual('Tasks Total', 'মোট কাজ')}
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {totalTasks}
            </div>
          </Card>

          <Card className="p-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider">
              {tBilingual('Queued / Sched.', 'কিউ / শিডিউল')}
            </div>
            <div className="text-xl font-bold text-purple-700 dark:text-purple-300 mt-1">
              {countQueued}
            </div>
          </Card>

          <Card className="p-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">
              {tBilingual('Running Now', 'চলমান কাজ')}
            </div>
            <div className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-1 flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-blue-600 animate-pulse" />
              {countInProgress}
            </div>
          </Card>

          <Card className="p-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">
              {tBilingual('On Hold / Blocked', 'স্থগিতাদেশ')}
            </div>
            <div className="text-xl font-bold text-amber-700 dark:text-amber-300 mt-1">
              {countOnHold}
            </div>
          </Card>

          <Card className="p-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">
              {tBilingual('Completed', 'সম্পন্ন')}
            </div>
            <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
              {countCompleted}
            </div>
          </Card>

          <Card className="p-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              {tBilingual('Machines Active', 'সক্রিয় মেশিন')}
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-1">
              <Cpu className="h-4 w-4 text-blue-600" />
              {countMachinesInUse} / {machineQueues.length}
            </div>
          </Card>
        </div>

        {/* View Switcher & Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('board')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'board'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              {tBilingual('Production Board', 'প্রোডাকশন বোর্ড')}
            </button>
            <button
              onClick={() => setActiveTab('machine_queues')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'machine_queues'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Cpu className="h-3.5 w-3.5" />
              {tBilingual('Machine Queues (NOW/NEXT)', 'মেশিন কিউ')}
            </button>
          </div>

          {/* Department Pills & Search */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-48">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search job, task, client..."
                className="text-xs pl-8 h-8"
              />
            </div>

            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="text-xs h-8 rounded-md border border-slate-300 bg-white px-2.5 text-slate-900 shadow-xs dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              {DEPARTMENTS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab 1: KANBAN PRODUCTION BOARD */}
        {activeTab === 'board' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5 items-start">
            {kanbanColumns.map((col) => {
              const colTasks = filteredTasks.filter((t) => col.statuses.includes(t.status))

              return (
                <div
                  key={col.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-3 space-y-3 min-h-[500px]"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      {tBilingual(col.title, col.titleBn)}
                    </span>
                    <Badge variant="outline" className="text-[11px] font-mono">
                      {colTasks.length}
                    </Badge>
                  </div>

                  <div className="space-y-2.5">
                    {colTasks.map((task) => (
                      <ProductionBoardCard
                        key={task.id}
                        task={task}
                        onSchedule={(t) => setScheduleTaskTarget(t)}
                        onStart={handleStartTask}
                        onPause={handlePauseTask}
                        onComplete={handleCompleteTask}
                        onHold={(t) => setHoldTaskTarget(t)}
                        onResume={handleResumeTask}
                        onRework={(t) => setReworkTaskTarget(t)}
                      />
                    ))}

                    {colTasks.length === 0 && (
                      <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                        No tasks in this stage.
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Tab 2: MACHINE QUEUES TIMELINE */}
        {activeTab === 'machine_queues' && (
          <MachineQueueView
            queues={machineQueues}
            tenantSlug={slug}
            onScheduleClick={(mId) => {
              // Open scheduler for first queued task or prompt
              if (tasks.length > 0) {
                setScheduleTaskTarget(tasks[0])
              }
            }}
          />
        )}

        {/* Modals */}
        <ScheduleTaskModal
          isOpen={!!scheduleTaskTarget}
          onClose={() => setScheduleTaskTarget(null)}
          task={scheduleTaskTarget}
          onSuccess={() => {
            showNotification('Task scheduled successfully!')
            loadData()
          }}
        />

        <HoldTaskModal
          isOpen={!!holdTaskTarget}
          onClose={() => setHoldTaskTarget(null)}
          task={holdTaskTarget}
          onSuccess={() => {
            showNotification('Task placed on hold.')
            loadData()
          }}
        />

        <ReworkTaskModal
          isOpen={!!reworkTaskTarget}
          onClose={() => setReworkTaskTarget(null)}
          task={reworkTaskTarget}
          onSuccess={() => {
            showNotification('Rework ticket logged and queued!')
            loadData()
          }}
        />
      </div>
    </FeatureGate>
  )
}
