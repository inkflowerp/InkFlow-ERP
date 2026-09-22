'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
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
import { Label } from '@/components/ui/label'
import { ModalDialog } from '@/components/shared/modal-dialog'
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
import { CompleteTaskModal } from '@/components/production/complete-task-modal'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'

const DEPARTMENTS = [
  { id: 'all', label: 'All Operations', labelBn: 'সকল অপারেশন', icon: Printer },
  { id: 'printing', label: 'Wide & Flatbed Print', labelBn: 'প্রিন্টিং', icon: Printer },
  { id: 'finishing', label: 'Lamination & Die-cut', labelBn: 'ফিনিশিং', icon: Layers },
  { id: 'fabrication', label: 'Metal & Acrylic Fab', labelBn: 'ফেব্রিকেশন', icon: Wrench },
  { id: 'installation', label: 'On-Site Installation', labelBn: 'ইনস্টলেশন', icon: Truck },
]

export default function AdvancedProductionPage() {
  const params = useParams()
  const pathname = usePathname() || ''
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'

  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<'board' | 'terminal' | 'machine_queues' | 'table'>('board')
  const [tasks, setTasks] = useState<ProductionTaskRecord[]>([])
  const [machineQueues, setMachineQueues] = useState<MachineQueueGroup[]>([])
  const [selectedDept, setSelectedDept] = useState<string>('all')
  const [selectedMachineFilter, setSelectedMachineFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Interactive Modals State
  const [scheduleTaskTarget, setScheduleTaskTarget] = useState<ProductionTaskRecord | null>(null)
  const [holdTaskTarget, setHoldTaskTarget] = useState<ProductionTaskRecord | null>(null)
  const [reworkTaskTarget, setReworkTaskTarget] = useState<ProductionTaskRecord | null>(null)
  const [completeTaskTarget, setCompleteTaskTarget] = useState<ProductionTaskRecord | null>(null)

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 4000)
  }

  const loadData = async (isBackground = false) => {
    if (!isBackground && tasks.length === 0) {
      setLoading(true)
    }
    try {
      const [taskRes, queueRes] = await Promise.all([
        getProductionTasksAction({ department: selectedDept }),
        getMachineQueuesAction(),
      ])

      if (taskRes.success && taskRes.data) {
        setTasks(taskRes.data)
        try {
          PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_TASKS, taskRes.data, false)
        } catch {}
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
    loadData(false)

    const handleRealtimeSync = () => {
      loadData(true)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('printerp_table_synced:production_tasks', handleRealtimeSync)
      window.addEventListener('printerp_table_synced:production_jobs', handleRealtimeSync)
      window.addEventListener('printerp_table_synced:machines', handleRealtimeSync)
      window.addEventListener('printerp_table_synced', handleRealtimeSync)
      window.addEventListener('printerp_data_sync', handleRealtimeSync)
      window.addEventListener('storage', handleRealtimeSync)

      return () => {
        window.removeEventListener('printerp_table_synced:production_tasks', handleRealtimeSync)
        window.removeEventListener('printerp_table_synced:production_jobs', handleRealtimeSync)
        window.removeEventListener('printerp_table_synced:machines', handleRealtimeSync)
        window.removeEventListener('printerp_table_synced', handleRealtimeSync)
        window.removeEventListener('printerp_data_sync', handleRealtimeSync)
        window.removeEventListener('storage', handleRealtimeSync)
      }
    }
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
    setCompleteTaskTarget(task)
  }

  const handleCompleteModalSubmit = async (taskId: string, completionData: any) => {
    try {
      const res = await completeProductionTaskAction(
        taskId,
        completionData,
        undefined,
        completeTaskTarget || undefined
      )
      if (res.success) {
        showNotification(`Task completed! Material deducted & workflow advanced. ${res.data?.nextReadyTask ? `Next: ${res.data.nextReadyTask.task_name}` : ''}`)
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

  // Auto-Generate Tasks Modal
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
  const [selectedOrderForGen, setSelectedOrderForGen] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)

  const activeOrders = React.useMemo(() => {
    try {
      const orders = PrintERPDataStore.get<any[]>(STORAGE_KEYS.ORDERS) || []
      const jobOrders = PrintERPDataStore.get<any[]>(STORAGE_KEYS.JOB_ORDERS) || []
      return [...orders, ...jobOrders]
    } catch {
      return []
    }
  }, [tasks])

  const handleGenerateTasksFromOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOrderForGen) return

    const order = activeOrders.find((o) => o.id === selectedOrderForGen || o.order_number === selectedOrderForGen || o.job_number === selectedOrderForGen)
    if (!order) return

    setIsGenerating(true)
    try {
      const { generateProductionTasksFromOrderAction } = await import('@/actions/production-planning.actions')
      const lineItem = (order.items && order.items[0]) || {}

      const res = await generateProductionTasksFromOrderAction({
        job_order_id: order.id,
        production_job_id: order.id,
        product_name: lineItem.item_name || order.product_name || 'Commercial Print Job',
        customer_name: order.customer_name || 'Direct Client',
        quantity: lineItem.quantity || order.quantity || 1,
        unit: lineItem.unit || order.unit || 'pcs',
        width: lineItem.width || order.width || 48,
        height: lineItem.height || order.height || 36,
        dimension_unit: lineItem.dimension_unit || 'inch',
        material_spec: lineItem.media_type || order.material_spec || 'Vinyl Sticker with Gloss Finish',
        printing_method: 'Eco-Solvent',
        finishing_tasks: ['Lamination', 'Edge Trimming'],
      })

      if (res.success) {
        showNotification(`Auto-generated ${res.data?.length || 0} sequential production tasks for ${order.order_number || order.job_number || 'Order'}!`)
        setIsGenerateModalOpen(false)
        setSelectedOrderForGen('')
        loadData()
      } else {
        showNotification(`Error: ${res.error}`)
      }
    } catch (err: any) {
      showNotification(`Error: ${err.message}`)
    } finally {
      setIsGenerating(false)
    }
  }

  // Active Running and Scheduled Tasks for Terminal
  const terminalRunningTasks = filteredTasks.filter((t) => t.status === 'in_progress' || t.status === 'paused')
  const terminalQueueTasks = filteredTasks.filter((t) => t.status === 'scheduled' || t.status === 'ready' || t.status === 'queued')

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
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsGenerateModalOpen(true)}
                className="text-xs bangla-text flex items-center gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300"
              >
                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                {tBilingual('Auto-Generate Tasks from Order', 'অর্ডার থেকে টাস্ক জেনারেট')}
              </Button>
              <Link href={getTenantNavHref('/finishing', pathname, slug)}>
                <Button variant="default" size="sm" className="text-xs bangla-text flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs">
                  <Scissors className="h-3.5 w-3.5 text-white" />
                  {tBilingual('Finishing & Fabrication Floor', 'ফিনিশিং ও ফেব্রিকেশন')}
                </Button>
              </Link>
              <Link href={getTenantNavHref('/production/machineries', pathname, slug)}>
                <Button variant="outline" size="sm" className="text-xs bangla-text flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5 text-blue-600" />
                  {tBilingual('Machinery Fleet', 'মেশিনারি বহর')}
                </Button>
              </Link>
            </div>
          }
        />

        {/* Generate Tasks Modal */}
        <ModalDialog
          open={isGenerateModalOpen}
          onOpenChange={(open) => !open && setIsGenerateModalOpen(false)}
          title={tBilingual('Auto-Generate Sequential Production Tasks', 'অটো-টাস্ক জেনারেটর')}
          hideFooter={true}
        >
          <form onSubmit={handleGenerateTasksFromOrder} className="space-y-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-900 dark:text-blue-200 space-y-1">
              <p className="font-bold">Automated Multi-Stage Production Routing</p>
              <p className="text-[11px] opacity-90">
                Select an active order or job. The engine will inspect item specifications (dimensions, media substrate, printing method, finishing) and auto-create Prepress, Primary Print on Fleet Machine, Finishing, and QC tasks with sequential dependencies.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                {tBilingual('Select Sales Order / Job Order', 'অর্ডার বা জব নির্বাচন করুন')}
              </Label>
              <select
                required
                value={selectedOrderForGen}
                onChange={(e) => setSelectedOrderForGen(e.target.value)}
                className="w-full text-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-xs focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="">-- Choose Order / Job --</option>
                {activeOrders.map((o) => (
                  <option key={o.id} value={o.id}>
                    #{o.order_number || o.job_number || o.id} — {o.customer_name || 'Client'} ({o.items?.[0]?.item_name || o.product_name || 'Print Order'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsGenerateModalOpen(false)}
                disabled={isGenerating}
                className="text-xs"
              >
                {tBilingual('Cancel', 'বাতিল')}
              </Button>
              <Button
                type="submit"
                variant="default"
                size="sm"
                disabled={isGenerating || !selectedOrderForGen}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {isGenerating ? tBilingual('Generating Tasks...', 'জেনারেট হচ্ছে...') : tBilingual('Generate Tasks Now', 'টাস্ক তৈরি করুন')}
              </Button>
            </div>
          </form>
        </ModalDialog>

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
              onClick={() => setActiveTab('terminal')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'terminal'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Printer className="h-3.5 w-3.5" />
              {tBilingual('Shop Floor Terminal', 'শপ ফ্লোর টার্মিনাল')}
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

        {/* Tab 2: SHOP FLOOR OPERATOR TERMINAL */}
        {activeTab === 'terminal' && (
          <div className="space-y-6">
            {/* Active Floor Overview & In-Progress Tasks */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Live Floor Operations • Active Machine Tasks ({terminalRunningTasks.length})
                  </h3>
                </div>
                <span className="text-xs text-slate-500 font-mono">
                  Touch cards to start, pause, or complete with automated roll deduction & scrap logging
                </span>
              </div>

              {terminalRunningTasks.length === 0 ? (
                <Card className="p-8 text-center border-dashed border-slate-200 dark:border-slate-800">
                  <Printer className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    No active running jobs on floor right now.
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Start a job from the scheduled queue below to allocate machine and mount media.
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {terminalRunningTasks.map((task) => (
                    <Card
                      key={task.id}
                      className="p-4 bg-white dark:bg-slate-900 border-2 border-blue-500 dark:border-blue-600 shadow-md space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <Badge className="bg-blue-600 text-white font-mono text-[10px]">
                          {task.task_number}
                        </Badge>
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">
                          ● RUNNING
                        </Badge>
                      </div>

                      <div>
                        <h4 className="font-black text-sm text-slate-900 dark:text-white">
                          {task.task_name}
                        </h4>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">
                          Job: <strong>{task.job_number}</strong> • Client: {task.customer_name}
                        </div>
                      </div>

                      {/* Specs & Machine */}
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg text-xs space-y-1 font-mono">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Machine:</span>
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            {task.assigned_machine_name || 'Floor Bench'}
                          </span>
                        </div>
                        {task.width && task.height && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Dimensions:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {task.width} × {task.height} {task.unit || 'ft'} ({task.width * task.height * task.quantity} SFT)
                            </span>
                          </div>
                        )}
                        {task.required_material && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Substrate:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[160px]">
                              {task.required_material}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Large Touch Actions */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePauseTask(task)}
                          className="h-10 text-xs font-bold border-amber-300 text-amber-800 dark:text-amber-300 hover:bg-amber-50 cursor-pointer gap-1.5"
                        >
                          <Pause className="h-4 w-4" />
                          <span>Pause</span>
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleCompleteTask(task)}
                          className="h-10 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer gap-1.5"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Complete & Deduct</span>
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Scheduled Queue Ready for Start */}
            <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Queue Ready to Dispatch ({terminalQueueTasks.length})
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {terminalQueueTasks.map((task) => (
                  <Card
                    key={task.id}
                    className="p-3.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-500">
                        {task.task_number}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {task.department}
                      </Badge>
                    </div>

                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                        {task.task_name}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {task.customer_name} • Qty: {task.quantity} {task.unit}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-500 font-mono">
                        {task.assigned_machine_name || 'Unassigned Machine'}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => handleStartTask(task)}
                        className="h-8 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 cursor-pointer gap-1"
                      >
                        <Play className="h-3.5 w-3.5" />
                        <span>Start Floor Job</span>
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: MACHINE QUEUES TIMELINE */}
        {activeTab === 'machine_queues' && (
          <MachineQueueView
            queues={machineQueues}
            tenantSlug={slug}
            onScheduleClick={(mId) => {
              if (tasks.length > 0) {
                setScheduleTaskTarget(tasks[0])
              }
            }}
          />
        )}

        {/* Complete Task Modal */}
        <CompleteTaskModal
          isOpen={!!completeTaskTarget}
          onClose={() => setCompleteTaskTarget(null)}
          task={completeTaskTarget}
          onComplete={handleCompleteModalSubmit}
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
