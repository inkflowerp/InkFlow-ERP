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
  FileCheck2,
  Cpu,
  Calendar,
  LayoutGrid,
  ListFilter,
  Plus,
  ArrowRight,
  ShieldAlert,
  MessageSquare,
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
import { PromptDialog } from '@/components/shared/prompt-dialog'
import { dispatchToast } from '@/components/shared/toast-feedback'
import { ProductionBoardCard } from '@/components/production/production-board-card'
import { MachineQueueView } from '@/components/production/machine-queue-view'
import { ScheduleTaskModal } from '@/components/production/schedule-task-modal'
import { HoldTaskModal } from '@/components/production/hold-task-modal'
import { ReworkTaskModal } from '@/components/production/rework-task-modal'
import { CompleteTaskModal } from '@/components/production/complete-task-modal'
import { ProductionKpiBar } from '@/components/production/production-kpi-bar'
import {
  ProductionFilterToolbar,
  ProductionViewMode,
} from '@/components/production/production-filter-toolbar'
import { ProductionTaskTable } from '@/components/production/production-task-table'
import { JobTicketPrintModal } from '@/components/production/production-job-ticket-modal'
import { ProductionService } from '@/services/production.service'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'

export default function AdvancedProductionPage() {
  const params = useParams()
  const pathname = usePathname() || ''
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'
  const isBn = locale === 'bn'

  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<ProductionViewMode>('board')
  const [tasks, setTasks] = useState<ProductionTaskRecord[]>([])
  const [machineQueues, setMachineQueues] = useState<MachineQueueGroup[]>([])
  const [selectedDept, setSelectedDept] = useState<string>('all')
  const [selectedKpiFilter, setSelectedKpiFilter] = useState<string>('all')
  const [urgentOnly, setUrgentOnly] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState<string | null>(null)

  // Interactive Modals State
  const [scheduleTaskTarget, setScheduleTaskTarget] = useState<ProductionTaskRecord | null>(null)
  const [holdTaskTarget, setHoldTaskTarget] = useState<ProductionTaskRecord | null>(null)
  const [reworkTaskTarget, setReworkTaskTarget] = useState<ProductionTaskRecord | null>(null)
  const [completeTaskTarget, setCompleteTaskTarget] = useState<ProductionTaskRecord | null>(null)
  const [jobTicketTarget, setJobTicketTarget] = useState<ProductionTaskRecord | null>(null)
  const [taskToPause, setTaskToPause] = useState<ProductionTaskRecord | null>(null)
  const [isPausePromptOpen, setIsPausePromptOpen] = useState(false)
  const [isPausing, setIsPausing] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const showNotification = (msg: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification(msg)
    dispatchToast({
      type,
      title: type === 'error' ? 'Error' : type === 'info' ? 'Notice' : 'Success',
      titleBn: type === 'error' ? 'ত্রুটি' : type === 'info' ? 'বিজ্ঞপ্তি' : 'সফল হয়েছে',
      message: msg,
    })
    setTimeout(() => setNotification(null), 3500)
  }

  const loadData = async (isBackground = false) => {
    if (!isBackground && tasks.length === 0) {
      setLoading(true)
    }
    try {
      const effCompany = company?.id || (slug !== 'my-company' ? slug : 'default')
      const [taskRes, queueRes] = await Promise.all([
        getProductionTasksAction({ department: selectedDept }, effCompany),
        getMachineQueuesAction(undefined, effCompany),
      ])

      // Get local tasks from store as well
      const localStoreTasks = PrintERPDataStore.get<ProductionTaskRecord[]>(STORAGE_KEYS.PRODUCTION_TASKS) || []
      const taskMap = new Map<string, ProductionTaskRecord>()

      // 1. Populate from local datastore
      for (const t of localStoreTasks) {
        if (t?.id) taskMap.set(t.id, t)
      }

      // 2. Merge server-resolved tasks
      if (taskRes.success && taskRes.data) {
        for (const t of taskRes.data) {
          if (t?.id) taskMap.set(t.id, t)
        }
      }

      // 3. Scan local approved design jobs to auto-materialize tasks if missing
      const localDesignJobs = PrintERPDataStore.get<any[]>(STORAGE_KEYS.DESIGN_JOBS) || []
      const now = new Date().toISOString()
      let addedAnyLocal = false

      for (const dj of localDesignJobs) {
        const isApproved =
          dj.status === 'approved' ||
          dj.is_locked ||
          dj.workflow_routing === 'ready_production' ||
          dj.workflow_routing === 'design_ok' ||
          (dj.versions && dj.versions.some((v: any) => v.is_approved)) ||
          dj.customer_approval_required === false

        if (isApproved && dj.workflow_routing !== 'ready_product') {
          const baseNum = (dj.design_number || '001').replace('DSN-', '')
          const taskNum1 = `TSK-${baseNum}-1`
          const taskNum2 = `TSK-${baseNum}-2`

          const hasExisting = Array.from(taskMap.values()).some(
            (t) =>
              (dj.job_order_id && t.job_order_id === dj.job_order_id) ||
              t.task_number === taskNum1 ||
              t.task_number === taskNum2 ||
              (t.customer_name === dj.customer_name && (t.product_name === dj.title || t.task_name?.includes(dj.title)))
          )

          if (!hasExisting) {
            const hasInvoice = Boolean(dj.invoice_id) || Boolean(dj.invoice_number) || dj.commercial_status === 'invoice_created'
            const task1: any = {
              id: crypto.randomUUID(),
              company_id: effCompany,
              job_order_id: dj.job_order_id || crypto.randomUUID(),
              task_number: taskNum1,
              task_name: `Print: ${dj.title}`,
              customer_name: dj.customer_name,
              product_name: dj.product_name || dj.title,
              job_number: dj.invoice_number || dj.design_number,
              job_deadline: dj.deadline,
              task_type: 'printing',
              department: 'printing',
              sequence_order: 1,
              quantity: dj.quantity || 1,
              unit: dj.unit || 'pcs',
              priority: dj.priority || 'normal',
              status: 'queued',
              is_blocked_by_commercial_gate: !hasInvoice,
              is_blocked_by_design_gate: false,
              created_at: now,
              updated_at: now,
            }
            const task2: any = {
              id: crypto.randomUUID(),
              company_id: effCompany,
              job_order_id: task1.job_order_id,
              task_number: taskNum2,
              task_name: `Finishing & QC: ${dj.title}`,
              customer_name: dj.customer_name,
              product_name: dj.product_name || dj.title,
              job_number: dj.invoice_number || dj.design_number,
              job_deadline: dj.deadline,
              task_type: 'finishing',
              department: 'finishing',
              sequence_order: 2,
              quantity: dj.quantity || 1,
              unit: dj.unit || 'pcs',
              priority: dj.priority || 'normal',
              status: 'queued',
              is_blocked_by_commercial_gate: !hasInvoice,
              is_blocked_by_design_gate: false,
              created_at: now,
              updated_at: now,
            }
            taskMap.set(task1.id, task1)
            taskMap.set(task2.id, task2)
            addedAnyLocal = true
          }
        }
      }

      const mergedTasks = Array.from(taskMap.values())
      setTasks(mergedTasks)

      if (addedAnyLocal || taskRes.success) {
        try {
          PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_TASKS, mergedTasks, false)
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
  const filteredTasks = React.useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0]

    return tasks.filter((task) => {
      // 1. Department match
      if (selectedDept !== 'all' && task.department !== selectedDept) {
        return false
      }

      // 2. Urgent priority toggle
      if (urgentOnly && task.priority !== 'urgent' && task.priority !== 'very_urgent') {
        return false
      }

      // 3. Search query
      if (search.trim()) {
        const q = search.toLowerCase()
        const matches =
          task.task_number.toLowerCase().includes(q) ||
          task.task_name.toLowerCase().includes(q) ||
          (task.customer_name && task.customer_name.toLowerCase().includes(q)) ||
          (task.job_number && task.job_number.toLowerCase().includes(q)) ||
          (task.required_material && task.required_material.toLowerCase().includes(q)) ||
          (task.assigned_machine_name && task.assigned_machine_name.toLowerCase().includes(q))
        if (!matches) return false
      }

      // 4. KPI Bar filter
      if (selectedKpiFilter === 'running' && task.status !== 'in_progress') {
        return false
      }
      if (
        selectedKpiFilter === 'queued' &&
        task.status !== 'queued' &&
        task.status !== 'scheduled' &&
        task.status !== 'ready'
      ) {
        return false
      }
      if (selectedKpiFilter === 'urgent' && task.priority !== 'urgent' && task.priority !== 'very_urgent') {
        return false
      }
      if (
        selectedKpiFilter === 'on_hold' &&
        task.status !== 'on_hold' &&
        !task.hold_reason &&
        task.status !== 'rework'
      ) {
        return false
      }
      if (selectedKpiFilter === 'completed' && task.status !== 'completed') {
        return false
      }

      return true
    })
  }, [tasks, selectedDept, urgentOnly, search, selectedKpiFilter])

  // Executive KPI Counts
  const kpiMetrics = React.useMemo(() => {
    return ProductionService.calculateProductionKpis(tasks, machineQueues)
  }, [tasks, machineQueues])

  // Quick Card Handlers
  const handleStartTask = async (task: ProductionTaskRecord) => {
    try {
      const res = await startProductionTaskAction(task.id, false, undefined, task)
      if (res.success) {
        showNotification(isBn ? `কাজ শুরু হয়েছে: ${task.task_name}` : `Started task: ${task.task_name}`)
        loadData()
      } else {
        showNotification(`Error: ${res.error}`)
      }
    } catch (err: any) {
      showNotification(`Error: ${err.message}`)
    }
  }

  const handlePauseTask = (task: ProductionTaskRecord) => {
    setTaskToPause(task)
    setIsPausePromptOpen(true)
  }

  const confirmPauseTask = async (reason: string) => {
    if (!taskToPause) return
    setIsPausing(true)
    try {
      const res = await pauseProductionTaskAction(taskToPause.id, reason || 'Operator paused', undefined, taskToPause)
      if (res.success) {
        showNotification(isBn ? `কাজ সাময়িক স্থগিত: ${taskToPause.task_name}` : `Paused task: ${taskToPause.task_name}`, 'info')
        setIsPausePromptOpen(false)
        setTaskToPause(null)
        loadData()
      } else {
        showNotification(`Error: ${res.error}`, 'error')
      }
    } catch (err: any) {
      showNotification(`Error: ${err.message}`, 'error')
    } finally {
      setIsPausing(false)
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
        showNotification(
          isBn
            ? `টাস্ক সম্পন্ন হয়েছে! কাঁচামাল স্টক থেকে কর্তন করা হয়েছে।`
            : `Task completed! Material deducted & workflow advanced.`
        )
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
        showNotification(
          isBn
            ? `টাস্ক ${task.task_number} পুনরায় চালু করা হয়েছে।`
            : `Task ${task.task_number} resumed from hold.`
        )
        loadData()
      } else {
        showNotification(`Error: ${res.error}`)
      }
    } catch (err: any) {
      showNotification(`Error: ${err.message}`)
    }
  }

  const handleSendWhatsAppNotice = (task: ProductionTaskRecord) => {
    const rawMsg = ProductionService.generateBangladeshiFloorWhatsAppMessage(
      task,
      company?.name || 'InkFlow Digital & Offset Press'
    )
    const encoded = encodeURIComponent(rawMsg)
    const phone = task.customer_phone?.replace(/[^0-9]/g, '') || ''
    const targetUrl = phone
      ? `https://api.whatsapp.com/send?phone=${phone.startsWith('88') ? phone : '88' + phone}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`
    window.open(targetUrl, '_blank')
  }

  // Kanban Columns Definition
  const kanbanColumns: { id: string; title: string; titleBn: string; statuses: ProductionTaskStatus[] }[] = [
    { id: 'queued', title: 'QUEUED', titleBn: 'অপেক্ষারত', statuses: ['queued'] },
    { id: 'scheduled', title: 'SCHEDULED', titleBn: 'শিডিউল্ড', statuses: ['scheduled', 'ready'] },
    { id: 'in_progress', title: 'IN PROGRESS', titleBn: 'মেশিনে চলমান', statuses: ['in_progress', 'paused'] },
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

    const order = activeOrders.find(
      (o) => o.id === selectedOrderForGen || o.order_number === selectedOrderForGen || o.job_number === selectedOrderForGen
    )
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
        showNotification(
          isBn
            ? `${order.order_number || order.job_number || 'অর্ডার'} এর জন্য ${res.data?.length || 0} টি প্রোডাকশন টাস্ক তৈরি হয়েছে!`
            : `Auto-generated ${res.data?.length || 0} sequential production tasks for ${order.order_number || order.job_number || 'Order'}!`
        )
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

  if (!mounted) {
    return (
      <div className="space-y-6 max-w-7xl pb-12 p-4 sm:p-6 animate-pulse">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/3" />
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-20 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          ))}
        </div>
        <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

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

        {/* Notifications Toast */}
        {notification && (
          <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* Interactive KPI Command Bar */}
        <ProductionKpiBar
          metrics={kpiMetrics}
          selectedFilter={selectedKpiFilter}
          onSelectFilter={setSelectedKpiFilter}
        />

        {/* Modern Filter Toolbar */}
        <ProductionFilterToolbar
          viewMode={activeTab}
          onViewModeChange={setActiveTab}
          selectedDept={selectedDept}
          onSelectDept={setSelectedDept}
          search={search}
          onSearchChange={setSearch}
          urgentOnly={urgentOnly}
          onToggleUrgentOnly={setUrgentOnly}
          onAutoGenerateClick={() => setIsGenerateModalOpen(true)}
        />

        {/* TAB 1: KANBAN PRODUCTION BOARD */}
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
                      {isBn ? col.titleBn : col.title}
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
                        onPrintTicket={(t) => setJobTicketTarget(t)}
                        onSendWhatsApp={handleSendWhatsAppNotice}
                      />
                    ))}

                    {colTasks.length === 0 && (
                      <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                        {isBn ? 'এই ধাপে কোন কাজ নেই।' : 'No tasks in this stage.'}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* TAB 2: SHOP FLOOR OPERATOR TERMINAL */}
        {activeTab === 'terminal' && (
          <div className="space-y-6">
            {/* Active Floor Overview & In-Progress Tasks */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    {isBn
                      ? `লাইভ কারখানা অপারেশন • চলমান মেশিনারি টাস্ক (${terminalRunningTasks.length})`
                      : `Live Floor Operations • Active Machine Tasks (${terminalRunningTasks.length})`}
                  </h3>
                </div>
                <span className="text-xs text-slate-500 font-mono hidden sm:inline">
                  {isBn
                    ? 'সহজে টাচ করে স্টার্ট, পজ বা কমপ্লিট করুন'
                    : 'Touch cards to start, pause, or complete with automated roll deduction'}
                </span>
              </div>

              {terminalRunningTasks.length === 0 ? (
                <Card className="p-8 text-center border-dashed border-slate-200 dark:border-slate-800">
                  <Printer className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isBn ? 'এই মুহূর্তে মেশিনে কোন কাজ চলমান নেই।' : 'No active running jobs on floor right now.'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {isBn ? 'নিচের কিউ থেকে কাজ শুরু করুন।' : 'Start a job from the scheduled queue below to allocate machine.'}
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
                          ● {isBn ? 'চলমান' : 'RUNNING'}
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
                          <span className="text-slate-500">{isBn ? 'মেশিন:' : 'Machine:'}</span>
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            {task.assigned_machine_name || 'Floor Bench'}
                          </span>
                        </div>
                        {task.width && task.height && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">{isBn ? 'সাইজ:' : 'Dimensions:'}</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {task.width} × {task.height} {task.unit || 'ft'} ({task.width * task.height * task.quantity} SFT)
                            </span>
                          </div>
                        )}
                        {task.required_material && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">{isBn ? 'মিডিয়া:' : 'Substrate:'}</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[160px]">
                              {task.required_material}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePauseTask(task)}
                          className="h-10 text-xs font-bold border-amber-300 text-amber-800 dark:text-amber-300 hover:bg-amber-50 cursor-pointer gap-1.5"
                        >
                          <Pause className="h-4 w-4" />
                          <span>{isBn ? 'পজ করুন' : 'Pause'}</span>
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleCompleteTask(task)}
                          className="h-10 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer gap-1.5"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{isBn ? 'সম্পন্ন ও কর্তন' : 'Complete & Deduct'}</span>
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
                {isBn
                  ? `মাউন্টিং ও স্টার্ট প্রস্তুত কিউ (${terminalQueueTasks.length})`
                  : `Queue Ready to Dispatch (${terminalQueueTasks.length})`}
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
                      <Badge variant="outline" className="text-[10px] capitalize">
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
                        <span>{isBn ? 'কাজ শুরু করুন' : 'Start Floor Job'}</span>
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MACHINE QUEUES TIMELINE */}
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

        {/* TAB 4: HIGH-DENSITY TASK TABLE LIST */}
        {activeTab === 'table' && (
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{isBn ? 'প্রোডাকশন টাস্ক তালিকা' : 'Production Work Order Tasks'}</span>
                  <Badge variant="secondary" className="text-[11px] font-mono font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    {filteredTasks.length}
                  </Badge>
                </CardTitle>
                <span className="text-xs text-slate-500 hidden sm:inline">
                  {isBn ? 'কারখানা টাস্ক অগ্রগতি ও কাঁচামাল ট্র্যাকিং' : 'Real-time task progression & substrate status'}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ProductionTaskTable
                tasks={filteredTasks}
                onStart={handleStartTask}
                onPause={handlePauseTask}
                onComplete={handleCompleteTask}
                onHold={(t) => setHoldTaskTarget(t)}
                onResume={handleResumeTask}
                onPrintTicket={(t) => setJobTicketTarget(t)}
                companyName={company?.name || 'InkFlow Digital & Offset Press'}
              />
            </CardContent>
          </Card>
        )}

        {/* MODAL: Auto-Generate Tasks from Order */}
        <ModalDialog
          open={isGenerateModalOpen}
          onOpenChange={(open) => !open && setIsGenerateModalOpen(false)}
          title={isBn ? 'অর্ডার থেকে স্বয়ংক্রিয় টাস্ক জেনারেটর' : 'Auto-Generate Sequential Production Tasks'}
          hideFooter={true}
        >
          <form onSubmit={handleGenerateTasksFromOrder} className="space-y-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-900 dark:text-blue-200 space-y-1">
              <p className="font-bold">{isBn ? 'মাল্টি-স্টেজ প্রোডাকশন রাউটিং' : 'Automated Multi-Stage Production Routing'}</p>
              <p className="text-[11px] opacity-90">
                {isBn
                  ? 'অর্ডার নির্বাচন করলে সিস্টেম স্বয়ংক্রিয়ভাবে প্রি-প্রেস, প্রিন্টিং, লেমিনেশন/ফিনিশিং এবং কিউসি টাস্ক তৈরি করবে।'
                  : 'Select an active order or job. The engine will inspect item specifications and auto-create sequential tasks.'}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                {isBn ? 'সেলস অর্ডার / জব অর্ডার নির্বাচন করুন' : 'Select Sales Order / Job Order'}
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
                {isBn ? 'বাতিল' : 'Cancel'}
              </Button>
              <Button
                type="submit"
                variant="default"
                size="sm"
                disabled={isGenerating || !selectedOrderForGen}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {isGenerating ? (isBn ? 'জেনারেট হচ্ছে...' : 'Generating Tasks...') : (isBn ? 'টাস্ক তৈরি করুন' : 'Generate Tasks Now')}
              </Button>
            </div>
          </form>
        </ModalDialog>

        {/* MODAL: Job Work Order Ticket Print Slip */}
        <JobTicketPrintModal
          isOpen={!!jobTicketTarget}
          onClose={() => setJobTicketTarget(null)}
          task={jobTicketTarget}
        />

        {/* MODAL: Complete Task Modal with Scrap Logging */}
        <CompleteTaskModal
          isOpen={!!completeTaskTarget}
          onClose={() => setCompleteTaskTarget(null)}
          task={completeTaskTarget}
          onComplete={handleCompleteModalSubmit}
        />

        {/* MODAL: Hold Task */}
        <HoldTaskModal
          isOpen={!!holdTaskTarget}
          onClose={() => setHoldTaskTarget(null)}
          task={holdTaskTarget}
          onSuccess={() => {
            showNotification(isBn ? 'টাস্ক স্থগিতাদেশে রাখা হয়েছে।' : 'Task placed on hold.')
            loadData()
          }}
        />

        {/* MODAL: Rework Task */}
        <ReworkTaskModal
          isOpen={!!reworkTaskTarget}
          onClose={() => setReworkTaskTarget(null)}
          task={reworkTaskTarget}
          onSuccess={() => {
            showNotification(isBn ? 'রি-ওয়ার্ক টিকেট লগ করা হয়েছে!' : 'Rework ticket logged and queued!')
            loadData()
          }}
        />

        {/* MODAL: Schedule Task Target */}
        {scheduleTaskTarget && (
          <ScheduleTaskModal
            isOpen={!!scheduleTaskTarget}
            onClose={() => setScheduleTaskTarget(null)}
            task={scheduleTaskTarget}
            onSuccess={() => {
              showNotification(isBn ? 'শিডিউল আপডেট হয়েছে।' : 'Schedule updated.')
              loadData()
            }}
          />
        )}

        {/* Pause Task Prompt Modal */}
        <PromptDialog
          open={isPausePromptOpen}
          onOpenChange={setIsPausePromptOpen}
          title={isBn ? `কাজ সাময়িক স্থগিত (Pause)` : `Pause Task: ${taskToPause?.task_name || ''}`}
          titleBn={`কাজ সাময়িক স্থগিত (Pause)`}
          message={isBn ? 'পজ করার কারণ লিখুন (যেমনঃ শিফট পরিবর্তন / মিডিয়া চেঞ্জ / লাঞ্চ ব্রেক):' : 'Enter pause reason (e.g. Break / Shift change / QC inspection / Media reloading):'}
          messageBn="পজ করার কারণ লিখুন (যেমনঃ শিফট পরিবর্তন / মিডিয়া চেঞ্জ / লাঞ্চ ব্রেক):"
          placeholder="e.g. Shift change, break, loading roll..."
          placeholderBn="যেমনঃ শিফট পরিবর্তন, মিডিয়া লোডিং ইত্যাদি..."
          confirmText="Pause Task"
          confirmTextBn="স্থগিত করুন"
          isLoading={isPausing}
          onConfirm={confirmPauseTask}
        />
      </div>
    </FeatureGate>
  )
}

