'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import {
  Printer,
  Play,
  Pause,
  CheckCircle2,
  AlertTriangle,
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
  Trash2,
  RefreshCw,
  X,
  Package,
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
import { WorkOrderModal } from '@/components/shared/work-order-modal'
import {
  ProductionTaskRecord,
  UnifiedProductionJob,
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
import { ProductionJobCard } from '@/components/production/production-job-card'
import {
  ProductionInvoiceGroupCard,
  ProductionInvoiceGroup,
} from '@/components/production/production-invoice-group-card'
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
  const [viewMode, setViewMode] = useState<ProductionViewMode>('board')
  const [activeTab, setActiveTab] = useState<string>('all')
  const [tasks, setTasks] = useState<ProductionTaskRecord[]>([])
  const [machineQueues, setMachineQueues] = useState<MachineQueueGroup[]>([])
  const [selectedDept, setSelectedDept] = useState<string>('all')
  const [selectedKpiFilter, setSelectedKpiFilter] = useState<string>('all')
  const [quickFilter, setQuickFilter] = useState<string>('all')
  const [urgentOnly, setUrgentOnly] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [notification, setNotification] = useState<{
    msg: string
    type: 'success' | 'warning' | 'info' | 'error'
  } | null>(null)

  // Work Order Modal State (same as Design Studio & Commercial Orders Hub)
  const [isWorkOrderModalOpen, setIsWorkOrderModalOpen] = useState(false)

  // Interactive Modals State
  const [scheduleTaskTarget, setScheduleTaskTarget] = useState<ProductionTaskRecord | null>(null)
  const [holdTaskTarget, setHoldTaskTarget] = useState<ProductionTaskRecord | null>(null)
  const [reworkTaskTarget, setReworkTaskTarget] = useState<ProductionTaskRecord | null>(null)
  const [completeTaskTarget, setCompleteTaskTarget] = useState<ProductionTaskRecord | null>(null)
  const [jobTicketTarget, setJobTicketTarget] = useState<ProductionTaskRecord | null>(null)
  const [taskToPause, setTaskToPause] = useState<ProductionTaskRecord | null>(null)
  const [isPausePromptOpen, setIsPausePromptOpen] = useState(false)
  const [isPausing, setIsPausing] = useState(false)

  // Auto-Generate Tasks Modal
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
  const [selectedOrderForGen, setSelectedOrderForGen] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const showNotification = useCallback(
    (msg: string, type: 'success' | 'warning' | 'info' | 'error' = 'success') => {
      setNotification({ msg, type })
      dispatchToast({
        type: type === 'warning' ? 'error' : type,
        title: type === 'error' ? 'Error' : type === 'info' ? 'Notice' : 'Success',
        titleBn: type === 'error' ? 'ত্রুটি' : type === 'info' ? 'বিজ্ঞপ্তি' : 'সফল হয়েছে',
        message: msg,
      })
      setTimeout(() => setNotification(null), 4000)
    },
    []
  )

  const loadData = useCallback(
    async (isBackground = false) => {
      if (!isBackground && tasks.length === 0) {
        setLoading(true)
      }
      try {
        const effCompany = company?.id || (slug !== 'my-company' ? slug : 'default')
        const [taskRes, queueRes] = await Promise.all([
          getProductionTasksAction({ department: selectedDept }, effCompany),
          getMachineQueuesAction(undefined, effCompany),
        ])

        // Get local tasks from store
        const localStoreTasks =
          PrintERPDataStore.get<ProductionTaskRecord[]>(STORAGE_KEYS.PRODUCTION_TASKS) || []
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

        // 3. Scan local approved design jobs to auto-materialize production tasks if missing
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
                (t.customer_name === dj.customer_name &&
                  (t.product_name === dj.title || t.task_name?.includes(dj.title)))
            )

            if (!hasExisting) {
              const hasInvoice =
                Boolean(dj.invoice_id) ||
                Boolean(dj.invoice_number) ||
                dj.commercial_status === 'invoice_created'
              const task1: any = {
                id: crypto.randomUUID(),
                company_id: effCompany,
                job_order_id: dj.job_order_id || crypto.randomUUID(),
                task_number: taskNum1,
                task_name: `Print: ${dj.title}`,
                customer_name: dj.customer_name,
                customer_phone: dj.customer_phone || dj.mobile,
                product_name: dj.product_name || dj.title,
                job_number: dj.invoice_number || dj.design_number,
                invoice_number: dj.invoice_number,
                invoice_id: dj.invoice_id,
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
                customer_phone: dj.customer_phone || dj.mobile,
                product_name: dj.product_name || dj.title,
                job_number: dj.invoice_number || dj.design_number,
                invoice_number: dj.invoice_number,
                invoice_id: dj.invoice_id,
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
        setIsRefreshing(false)
      }
    },
    [company?.id, slug, selectedDept, tasks.length]
  )

  useEffect(() => {
    loadData(false)

    const handleRealtimeSync = () => {
      loadData(true)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('printerp_table_synced:production_tasks', handleRealtimeSync)
      window.addEventListener('printerp_table_synced:production_jobs', handleRealtimeSync)
      window.addEventListener('printerp_table_synced:machines', handleRealtimeSync)
      window.addEventListener('printerp_table_synced:design_jobs', handleRealtimeSync)
      window.addEventListener('printerp_table_synced', handleRealtimeSync)
      window.addEventListener('printerp_data_sync', handleRealtimeSync)
      window.addEventListener('storage', handleRealtimeSync)

      return () => {
        window.removeEventListener('printerp_table_synced:production_tasks', handleRealtimeSync)
        window.removeEventListener('printerp_table_synced:production_jobs', handleRealtimeSync)
        window.removeEventListener('printerp_table_synced:machines', handleRealtimeSync)
        window.removeEventListener('printerp_table_synced:design_jobs', handleRealtimeSync)
        window.removeEventListener('printerp_table_synced', handleRealtimeSync)
        window.removeEventListener('printerp_data_sync', handleRealtimeSync)
        window.removeEventListener('storage', handleRealtimeSync)
      }
    }
  }, [loadData])

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true)
    loadData(false)
  }, [loadData])

  // Filter Tasks by Search, Dept, Urgent, KPI, Quick Filter
  const filteredTasks = useMemo(() => {
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
          (task.invoice_number && task.invoice_number.toLowerCase().includes(q)) ||
          (task.required_material && task.required_material.toLowerCase().includes(q)) ||
          (task.assigned_machine_name && task.assigned_machine_name.toLowerCase().includes(q))
        if (!matches) return false
      }

      // 4. Quick filter chips
      if (quickFilter === 'due_today') {
        if (!task.job_deadline?.includes(todayStr) && !task.scheduled_start?.includes(todayStr)) {
          return false
        }
      } else if (quickFilter === 'running') {
        if (task.status !== 'in_progress' && task.status !== 'paused') return false
      } else if (quickFilter === 'walk_in') {
        const isWalk =
          task.customer_name?.toLowerCase().includes('walk') ||
          task.customer_name?.toLowerCase().includes('counter') ||
          task.customer_name?.toLowerCase().includes('দোকান')
        if (!isWalk) return false
      } else if (quickFilter === 'on_hold') {
        if (task.status !== 'on_hold' && task.status !== 'rework' && !task.hold_reason) return false
      }

      // 5. KPI Bar filter
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
      if (selectedKpiFilter === 'finishing' && task.department !== 'finishing') {
        return false
      }
      if (
        selectedKpiFilter === 'urgent' &&
        task.priority !== 'urgent' &&
        task.priority !== 'very_urgent'
      ) {
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
  }, [tasks, selectedDept, urgentOnly, search, quickFilter, selectedKpiFilter])

  // ==============================================================================
  // CRITICAL REQUIREMENT: Group tasks into Unified Single Jobs (Same as Design Job Card)
  // Instead of showing separate cards for Print & Finishing for the same job,
  // consolidate them into ONE card with sequential stages and specs!
  // ==============================================================================
  const unifiedJobs = useMemo(() => {
    const jobMap = new Map<string, UnifiedProductionJob>()

    for (const t of filteredTasks) {
      // Grouping key: by job_order_id OR (job_number + customer + product)
      const cleanJobNum = t.job_number || t.task_number.replace(/-[0-9]+$/, '')
      const groupKey =
        t.job_order_id ||
        t.production_job_id ||
        `${cleanJobNum}___${t.customer_name || 'anon'}___${t.product_name || t.task_name.replace(/^(Print|Finishing & QC|Printing):\s*/, '')}`

      if (!jobMap.has(groupKey)) {
        const title =
          t.product_name ||
          t.task_name.replace(/^(Print|Finishing & QC|Printing):\s*/, '') ||
          'Commercial Print Job'

        jobMap.set(groupKey, {
          id: groupKey,
          jobNumber: cleanJobNum,
          orderNumber: (t as any).order_number || (cleanJobNum.startsWith('ORD-') ? cleanJobNum : null),
          invoiceNumber: t.invoice_number || (cleanJobNum.startsWith('INV-') ? cleanJobNum : null),
          invoiceId: t.invoice_id,
          salesOrderId: (t as any).sales_order_id,
          title,
          productName: t.product_name || title,
          customerName: t.customer_name || 'Direct Client',
          customerPhone: t.customer_phone,
          priority: t.priority,
          deadline: t.job_deadline,
          dimensions:
            t.width && t.height
              ? `${t.width} × ${t.height} ${t.dimension_unit || t.unit || 'in'}`
              : null,
          quantity: t.quantity || 1,
          unit: t.unit || 'pcs',
          material: t.required_material,
          instructions: t.description || t.notes,
          status: t.status,
          tasks: [t],
          assignedMachineName: t.assigned_machine_name,
          assignedOperatorName: t.assigned_operator_name,
          isBlockedByCommercialGate: t.is_blocked_by_commercial_gate,
          commercialGateReason: t.commercial_gate_reason,
          isBlockedByDesignGate: t.is_blocked_by_design_gate,
          designGateReason: t.design_gate_reason,
          isBlockedByDependency: t.is_blocked_by_dependency,
          blockingDependencyTaskName: t.blocking_dependency_task_name,
          created_at: t.created_at,
        })
      } else {
        const existing = jobMap.get(groupKey)!
        existing.tasks.push(t)
        // Keep earliest deadline and highest priority
        if (t.priority === 'very_urgent' || t.priority === 'urgent') {
          existing.priority = t.priority
        }
        if (t.customer_phone && !existing.customerPhone) {
          existing.customerPhone = t.customer_phone
        }
        if (t.required_material && !existing.material) {
          existing.material = t.required_material
        }
        if (t.invoice_number && !existing.invoiceNumber) {
          existing.invoiceNumber = t.invoice_number
          existing.invoiceId = t.invoice_id
        }
      }
    }

    // Sort tasks in each job by sequence order and determine overall job status & active task
    return Array.from(jobMap.values()).map((job) => {
      job.tasks.sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0))

      const allCompleted = job.tasks.length > 0 && job.tasks.every((t) => t.status === 'completed')
      const runningTask = job.tasks.find((t) => t.status === 'in_progress')
      const pausedTask = job.tasks.find((t) => t.status === 'paused')
      const holdTask = job.tasks.find((t) => t.status === 'on_hold')
      const reworkTask = job.tasks.find((t) => t.status === 'rework')
      const scheduledTask = job.tasks.find((t) => t.status === 'scheduled')

      // Check if print is done and finishing is active/queued
      const hasPrintDone = job.tasks.some(
        (t) => t.department === 'printing' && t.status === 'completed'
      )
      const hasFinishingPending = job.tasks.some(
        (t) => t.department === 'finishing' && t.status !== 'completed'
      )

      let overallStatus: any = 'queued'
      if (allCompleted) {
        overallStatus = 'completed'
      } else if (runningTask) {
        overallStatus = 'in_progress'
      } else if (pausedTask) {
        overallStatus = 'paused'
      } else if (holdTask) {
        overallStatus = 'on_hold'
      } else if (reworkTask) {
        overallStatus = 'rework'
      } else if (hasPrintDone && hasFinishingPending) {
        overallStatus = 'finishing'
      } else if (scheduledTask) {
        overallStatus = 'scheduled'
      }

      // Active task is the running/paused task, or first uncompleted task
      const activeTask =
        runningTask ||
        pausedTask ||
        job.tasks.find((t) => t.status !== 'completed' && t.status !== 'cancelled') ||
        job.tasks[0]

      return {
        ...job,
        status: overallStatus,
        activeTask,
        assignedMachineName: activeTask?.assigned_machine_name || job.assignedMachineName,
        assignedOperatorName: activeTask?.assigned_operator_name || job.assignedOperatorName,
        isBlockedByCommercialGate: job.tasks.some((t) => t.is_blocked_by_commercial_gate),
        isBlockedByDesignGate: job.tasks.some((t) => t.is_blocked_by_design_gate),
      }
    })
  }, [filteredTasks])

  // Filter Unified Jobs by the 4 Practical Tabs
  const tabFilteredJobs = useMemo(() => {
    return unifiedJobs.filter((job) => {
      if (activeTab === 'queued') {
        return (
          job.status === 'queued' ||
          job.status === 'scheduled' ||
          job.status === 'ready'
        )
      }
      if (activeTab === 'running') {
        return job.status === 'in_progress' || job.status === 'paused'
      }
      if (activeTab === 'finishing') {
        return (
          job.status === 'finishing' ||
          job.activeTask?.department === 'finishing'
        )
      }
      if (activeTab === 'completed') {
        return job.status === 'completed'
      }
      return true
    })
  }, [unifiedJobs, activeTab])

  // Group by Invoices for Clean Card View (Matching Design Studio & Pre-Press Panel)
  const { invoiceGroups, standaloneJobs } = useMemo(() => {
    const invMap = new Map<string, ProductionInvoiceGroup>()
    const standalones: UnifiedProductionJob[] = []

    tabFilteredJobs.forEach((job) => {
      if (job.invoiceNumber || job.invoiceId) {
        const invKey = job.invoiceId || job.invoiceNumber || 'inv-unknown'
        if (!invMap.has(invKey)) {
          invMap.set(invKey, {
            invoiceId: job.invoiceId || invKey,
            invoiceNumber: job.invoiceNumber || 'N/A',
            customerName: job.customerName,
            customerPhone: job.customerPhone,
            jobs: [job],
            allInvoiceItems: job.allInvoiceItems || [],
          })
        } else {
          invMap.get(invKey)!.jobs.push(job)
        }
      } else {
        standalones.push(job)
      }
    })

    return {
      invoiceGroups: Array.from(invMap.values()),
      standaloneJobs: standalones,
    }
  }, [tabFilteredJobs])

  // Practical Tabs Counter Metrics
  const tabMetrics = useMemo(() => {
    let queued = 0
    let running = 0
    let finishing = 0
    let completed = 0

    unifiedJobs.forEach((j) => {
      if (j.status === 'completed') {
        completed++
      } else if (j.status === 'in_progress' || j.status === 'paused') {
        running++
      } else if (j.status === 'finishing' || j.activeTask?.department === 'finishing') {
        finishing++
      } else {
        queued++
      }
    })

    return { queued, running, finishing, completed }
  }, [unifiedJobs])

  // Executive KPI Counts
  const kpiMetrics = useMemo(() => {
    const base = ProductionService.calculateProductionKpis(tasks, machineQueues)
    const finishingCount = tasks.filter(
      (t) => t.department === 'finishing' && t.status !== 'completed'
    ).length
    return {
      ...base,
      finishingCount,
    }
  }, [tasks, machineQueues])

  // Quick Card Handlers
  const handleStartTask = async (task: ProductionTaskRecord) => {
    try {
      const res = await startProductionTaskAction(task.id, false, undefined, task)
      if (res.success) {
        showNotification(
          isBn ? `কাজ শুরু হয়েছে: ${task.task_name}` : `Started task: ${task.task_name}`,
          'success'
        )
        loadData(true)
      } else {
        showNotification(`Error: ${res.error}`, 'error')
      }
    } catch (err: any) {
      showNotification(`Error: ${err.message}`, 'error')
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
      const res = await pauseProductionTaskAction(
        taskToPause.id,
        reason || 'Operator paused',
        undefined,
        taskToPause
      )
      if (res.success) {
        showNotification(
          isBn
            ? `কাজ সাময়িক স্থগিত: ${taskToPause.task_name}`
            : `Paused task: ${taskToPause.task_name}`,
          'info'
        )
        setIsPausePromptOpen(false)
        setTaskToPause(null)
        loadData(true)
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
            : `Task completed! Material deducted & workflow advanced.`,
          'success'
        )
        loadData(true)
      } else {
        showNotification(`Error: ${res.error}`, 'error')
      }
    } catch (err: any) {
      showNotification(`Error: ${err.message}`, 'error')
    }
  }

  const handleResumeTask = async (task: ProductionTaskRecord) => {
    try {
      const res = await resumeProductionTaskAction(task.id, undefined, task)
      if (res.success) {
        showNotification(
          isBn
            ? `টাস্ক ${task.task_number} পুনরায় চালু করা হয়েছে।`
            : `Task ${task.task_number} resumed from hold.`,
          'success'
        )
        loadData(true)
      } else {
        showNotification(`Error: ${res.error}`, 'error')
      }
    } catch (err: any) {
      showNotification(`Error: ${err.message}`, 'error')
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

  const activeOrders = useMemo(() => {
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
      (o) =>
        o.id === selectedOrderForGen ||
        o.order_number === selectedOrderForGen ||
        o.job_number === selectedOrderForGen
    )
    if (!order) return

    setIsGenerating(true)
    try {
      const { generateProductionTasksFromOrderAction } = await import(
        '@/actions/production-planning.actions'
      )
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
        material_spec:
          lineItem.media_type || order.material_spec || 'Vinyl Sticker with Gloss Finish',
        printing_method: 'Eco-Solvent',
        finishing_tasks: ['Lamination', 'Edge Trimming'],
      })

      if (res.success) {
        showNotification(
          isBn
            ? `${order.order_number || order.job_number || 'অর্ডার'} এর জন্য ${res.data?.length || 0} টি প্রোডাকশন টাস্ক তৈরি হয়েছে!`
            : `Auto-generated ${res.data?.length || 0} sequential production tasks for ${order.order_number || order.job_number || 'Order'}!`,
          'success'
        )
        setIsGenerateModalOpen(false)
        setSelectedOrderForGen('')
        loadData(true)
      } else {
        showNotification(`Error: ${res.error}`, 'error')
      }
    } catch (err: any) {
      showNotification(`Error: ${err.message}`, 'error')
    } finally {
      setIsGenerating(false)
    }
  }

  // Active Running and Scheduled Tasks for Terminal
  const terminalRunningTasks = filteredTasks.filter(
    (t) => t.status === 'in_progress' || t.status === 'paused'
  )
  const terminalQueueTasks = filteredTasks.filter(
    (t) => t.status === 'scheduled' || t.status === 'ready' || t.status === 'queued'
  )

  const tabsConfig = [
    {
      id: 'all',
      label: isBn ? 'সকল প্রোডাকশন জব' : 'All Production Jobs',
      count: unifiedJobs.length,
      icon: Layers,
    },
    {
      id: 'queued',
      label: isBn ? '১. অপেক্ষমাণ কিউ' : '1. Queued & Ready',
      count: tabMetrics.queued,
      icon: Clock,
    },
    {
      id: 'running',
      label: isBn ? '২. মেশিনে প্রিন্টিং চলমান' : '2. Printing & Running',
      count: tabMetrics.running,
      icon: Printer,
    },
    {
      id: 'finishing',
      label: isBn ? '৩. ফিনিশিং ও কোয়ালিটি' : '3. Finishing & QC',
      count: tabMetrics.finishing,
      icon: Scissors,
    },
    {
      id: 'completed',
      label: isBn ? '৪. সম্পন্ন কাজ' : '4. Completed Jobs',
      count: tabMetrics.completed,
      icon: CheckCircle2,
    },
  ]

  if (!mounted) {
    return (
      <div className="space-y-4 max-w-7xl pb-16 mx-auto animate-pulse p-4">
        <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="h-14 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
      </div>
    )
  }

  return (
    <FeatureGate feature="production">
      <div className="space-y-4 pb-16 max-w-7xl mx-auto">
        {/* =========================================================================
            1. HEADER BANNER (Matching Quotation & Billing / Design Studio UI)
           ========================================================================= */}
        <div className="bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30 dark:from-slate-900 dark:via-slate-900/80 dark:to-slate-800/40 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs relative overflow-hidden">
          {/* Decorative ambient blur orbs */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-700 text-white flex items-center justify-center shadow-sm shadow-blue-500/20">
                  <Printer className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <span>
                      {isBn
                        ? 'প্রোডাকশন প্ল্যানিং ও শপ ফ্লোর টার্মিনাল'
                        : 'Production Planning & Shop Floor Terminal'}
                    </span>
                    <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 text-[10px] font-bold py-0.5">
                      Shop Floor Hub
                    </Badge>
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isBn
                      ? 'টাস্ক শিডিউলিং, মেশিনে রানিং কাজের পর্যবেক্ষণ, ফিনিশিং ফেব্রিকেশন এবং অপারেটর ফ্লোর এক্সিকিউশন'
                      : 'Live machine dispatching, multi-stage task progression, finishing floor, and shop floor terminal execution.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link href={getTenantNavHref('/trash?tab=production', pathname, slug)}>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold shadow-xs h-9 gap-1.5 cursor-pointer text-slate-600 dark:text-slate-300 rounded-xl"
                >
                  <Trash2 className="h-3.5 w-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Trash Bin</span>
                </Button>
              </Link>

              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold shadow-xs h-9 gap-1.5 cursor-pointer text-slate-600 dark:text-slate-300 rounded-xl"
                title="Refresh Production Jobs"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </Button>

              <Link href={getTenantNavHref('/finishing', pathname, slug)}>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs font-semibold h-9 px-3 gap-1.5 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl cursor-pointer"
                >
                  <Scissors className="h-3.5 w-3.5 text-indigo-600" />
                  <span className="hidden sm:inline">{isBn ? 'ফিনিশিং ফ্লোর' : 'Finishing Floor'}</span>
                </Button>
              </Link>

              <Link href={getTenantNavHref('/production/machineries', pathname, slug)}>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs font-semibold h-9 px-3 gap-1.5 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl cursor-pointer"
                >
                  <Cpu className="h-3.5 w-3.5 text-blue-600" />
                  <span className="hidden sm:inline">{isBn ? 'মেশিন বহর' : 'Machinery Fleet'}</span>
                </Button>
              </Link>

              {/* Primary Action Button: Work Order (Opens WorkOrderModal, identical to Commercial Orders Hub & Design Studio) */}
              <Button
                size="sm"
                onClick={() => setIsWorkOrderModalOpen(true)}
                className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white text-xs font-bold shadow-sm shadow-blue-500/20 h-9 px-4 gap-1.5 cursor-pointer rounded-xl transition-transform active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" />
                <span>{tBilingual('Work Order', 'ওয়ার্ক অর্ডার')}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            2. TOP METRICS KPI BAR (Modernized glassmorphism cards)
           ========================================================================= */}
        <ProductionKpiBar
          metrics={kpiMetrics}
          selectedFilter={selectedKpiFilter}
          onSelectFilter={(filterId) => {
            setSelectedKpiFilter(filterId)
            if (filterId === 'queued') setActiveTab('queued')
            else if (filterId === 'running') setActiveTab('running')
            else if (filterId === 'finishing') setActiveTab('finishing')
            else if (filterId === 'completed') setActiveTab('completed')
            else setActiveTab('all')
          }}
        />

        {/* =========================================================================
            3. PRACTICAL PRESS / SHOP FLOOR TABS (Matching Design Studio Tabs)
           ========================================================================= */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
          {tabsConfig.map((t) => {
            const Icon = t.icon
            const isActive = activeTab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setActiveTab(t.id)
                  setSelectedKpiFilter('all')
                }}
                className={`p-2.5 rounded-xl text-left transition-all flex items-center justify-between cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold border border-slate-200/80 dark:border-slate-700/80'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
                    }`}
                  />
                  <span className="text-xs truncate font-semibold">{t.label}</span>
                </div>
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {t.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* =========================================================================
            4. SEARCH & FILTER TOOLBAR (Modernized matching DesignFilterToolbar)
           ========================================================================= */}
        <ProductionFilterToolbar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          selectedDept={selectedDept}
          onSelectDept={setSelectedDept}
          search={search}
          onSearchChange={setSearch}
          urgentOnly={urgentOnly}
          onToggleUrgentOnly={setUrgentOnly}
          quickFilter={quickFilter}
          onSelectQuickFilter={setQuickFilter}
          onAutoGenerateClick={() => setIsGenerateModalOpen(true)}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />

        {/* =========================================================================
            5. MAIN CONTENT RENDERING
           ========================================================================= */}
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
            <span>{isBn ? 'প্রোডাকশন ডেটা লোড হচ্ছে...' : 'Loading production data...'}</span>
          </div>
        ) : viewMode === 'board' ? (
          /* =======================================================================
             VIEW 1: SINGLE JOB CARDS (MATCHING DESIGN STUDIO JOB CARDS)
             Shows each job as a SINGLE consolidated card (No fragmented duplicates!)
             ======================================================================= */
          <div className="space-y-4">
            {/* Invoice Group Cards */}
            {invoiceGroups.map((group) => (
              <ProductionInvoiceGroupCard
                key={group.invoiceId}
                group={group}
                activeTab={activeTab}
                onStartTask={handleStartTask}
                onPauseTask={handlePauseTask}
                onCompleteTask={handleCompleteTask}
                onHoldTask={(t) => setHoldTaskTarget(t)}
                onResumeTask={handleResumeTask}
                onScheduleTask={(t) => setScheduleTaskTarget(t)}
                onReworkTask={(t) => setReworkTaskTarget(t)}
                onPrintTicket={(t) => setJobTicketTarget(t)}
                onSendWhatsApp={handleSendWhatsAppNotice}
              />
            ))}

            {/* Standalone Single Job Cards */}
            {standaloneJobs.length > 0 && (
              <div className="space-y-3">
                {standaloneJobs.map((job) => (
                  <ProductionJobCard
                    key={job.id}
                    job={job}
                    activeTab={activeTab}
                    onStartTask={handleStartTask}
                    onPauseTask={handlePauseTask}
                    onCompleteTask={handleCompleteTask}
                    onHoldTask={(t) => setHoldTaskTarget(t)}
                    onResumeTask={handleResumeTask}
                    onScheduleTask={(t) => setScheduleTaskTarget(t)}
                    onReworkTask={(t) => setReworkTaskTarget(t)}
                    onPrintTicket={(t) => setJobTicketTarget(t)}
                    onSendWhatsApp={handleSendWhatsAppNotice}
                  />
                ))}
              </div>
            )}

            {invoiceGroups.length === 0 && standaloneJobs.length === 0 && (
              <div className="p-16 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <Printer className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {isBn ? 'এই ফিল্টারে কোন কাজ পাওয়া যায়নি।' : 'No production jobs found in this view.'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {isBn
                    ? 'নতুন কাজ শুরু করতে উপরের "ওয়ার্ক অর্ডার" বাটনে ক্লিক করুন অথবা ফিল্টার পরিবর্তন করুন।'
                    : 'Click "Work Order" above to dispatch a new production job or reset your active filters.'}
                </p>
                <Button
                  size="sm"
                  onClick={() => setIsWorkOrderModalOpen(true)}
                  className="mt-4 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  <span>{tBilingual('Add Work Order', 'ওয়ার্ক অর্ডার তৈরি করুন')}</span>
                </Button>
              </div>
            )}
          </div>
        ) : viewMode === 'terminal' ? (
          /* =======================================================================
             VIEW 2: SHOP FLOOR OPERATOR TERMINAL (TOUCH-FRIENDLY MACHINE DISPATCH)
             ======================================================================= */
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
                <Card className="p-8 text-center border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <Printer className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isBn ? 'এই মুহূর্তে মেশিনে কোন কাজ চলমান নেই।' : 'No active running jobs on floor right now.'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {isBn
                      ? 'নিচের কিউ থেকে কাজ শুরু করুন।'
                      : 'Start a job from the scheduled queue below to allocate machine.'}
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {terminalRunningTasks.map((task) => (
                    <Card
                      key={task.id}
                      className="p-4 bg-white dark:bg-slate-900 border-2 border-blue-500 dark:border-blue-600 rounded-2xl shadow-md space-y-3"
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
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs space-y-1 font-mono">
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
                          className="h-10 text-xs font-bold border-amber-300 text-amber-800 dark:text-amber-300 hover:bg-amber-50 rounded-xl cursor-pointer gap-1.5"
                        >
                          <Pause className="h-4 w-4" />
                          <span>{isBn ? 'পজ করুন' : 'Pause'}</span>
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleCompleteTask(task)}
                          className="h-10 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs cursor-pointer gap-1.5"
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
                    className="p-3.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl space-y-2.5"
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
                        className="h-8 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3.5 rounded-xl cursor-pointer gap-1"
                      >
                        <Play className="h-3.5 w-3.5 fill-white" />
                        <span>{isBn ? 'কাজ শুরু করুন' : 'Start Floor Job'}</span>
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        ) : viewMode === 'machine_queues' ? (
          /* =======================================================================
             VIEW 3: MACHINE QUEUES TIMELINE (NOW / NEXT / LATER)
             ======================================================================= */
          <MachineQueueView
            queues={machineQueues}
            tenantSlug={slug}
            onScheduleClick={(mId) => {
              if (tasks.length > 0) {
                setScheduleTaskTarget(tasks[0])
              }
            }}
          />
        ) : (
          /* =======================================================================
             VIEW 4: HIGH-DENSITY TASK TABLE LIST
             ======================================================================= */
          <Card className="border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            <CardHeader className="py-3.5 px-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{isBn ? 'প্রোডাকশন টাস্ক তালিকা' : 'Production Work Order Tasks'}</span>
                  <Badge
                    variant="secondary"
                    className="text-[11px] font-mono font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                  >
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

        {/* =========================================================================
            6. MODALS & POPUPS
           ========================================================================= */}

        {/* MODAL: Work Order Modal (Unified shared component) */}
        <WorkOrderModal
          isOpen={isWorkOrderModalOpen}
          onClose={() => setIsWorkOrderModalOpen(false)}
          companyId={company?.id || slug}
          onSuccess={() => {
            showNotification(
              isBn ? 'ওয়ার্ক অর্ডার সফলভাবে তৈরি হয়েছে!' : 'Work order created successfully!',
              'success'
            )
            loadData(true)
          }}
        />

        {/* MODAL: Auto-Generate Tasks from Order */}
        <ModalDialog
          open={isGenerateModalOpen}
          onOpenChange={(open) => !open && setIsGenerateModalOpen(false)}
          title={isBn ? 'অর্ডার থেকে স্বয়ংক্রিয় টাস্ক জেনারেটর' : 'Auto-Generate Sequential Production Tasks'}
          hideFooter={true}
        >
          <form onSubmit={handleGenerateTasksFromOrder} className="space-y-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-900 dark:text-blue-200 space-y-1">
              <p className="font-bold">
                {isBn ? 'মাল্টি-স্টেজ প্রোডাকশন রাউটিং' : 'Automated Multi-Stage Production Routing'}
              </p>
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
                className="w-full text-xs rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-xs focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="">-- Choose Order / Job --</option>
                {activeOrders.map((o) => (
                  <option key={o.id} value={o.id}>
                    #{o.order_number || o.job_number || o.id} — {o.customer_name || 'Client'} (
                    {o.items?.[0]?.item_name || o.product_name || 'Print Order'})
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
                className="text-xs rounded-xl"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </Button>
              <Button
                type="submit"
                variant="default"
                size="sm"
                disabled={isGenerating || !selectedOrderForGen}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 rounded-xl"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {isGenerating
                  ? isBn
                    ? 'জেনারেট হচ্ছে...'
                    : 'Generating Tasks...'
                  : isBn
                  ? 'টাস্ক তৈরি করুন'
                  : 'Generate Tasks Now'}
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
            showNotification(isBn ? 'টাস্ক স্থগিতাদেশে রাখা হয়েছে।' : 'Task placed on hold.', 'info')
            loadData(true)
          }}
        />

        {/* MODAL: Rework Task */}
        <ReworkTaskModal
          isOpen={!!reworkTaskTarget}
          onClose={() => setReworkTaskTarget(null)}
          task={reworkTaskTarget}
          onSuccess={() => {
            showNotification(
              isBn ? 'রি-ওয়ার্ক টিকেট লগ করা হয়েছে!' : 'Rework ticket logged and queued!',
              'info'
            )
            loadData(true)
          }}
        />

        {/* MODAL: Schedule Task Target */}
        {scheduleTaskTarget && (
          <ScheduleTaskModal
            isOpen={!!scheduleTaskTarget}
            onClose={() => setScheduleTaskTarget(null)}
            task={scheduleTaskTarget}
            onSuccess={() => {
              showNotification(isBn ? 'শিডিউল আপডেট হয়েছে।' : 'Schedule updated.', 'success')
              loadData(true)
            }}
          />
        )}

        {/* Pause Task Prompt Modal */}
        <PromptDialog
          open={isPausePromptOpen}
          onOpenChange={setIsPausePromptOpen}
          title={isBn ? `কাজ সাময়িক স্থগিত (Pause)` : `Pause Task: ${taskToPause?.task_name || ''}`}
          titleBn={`কাজ সাময়িক স্থগিত (Pause)`}
          message={
            isBn
              ? 'পজ করার কারণ লিখুন (যেমনঃ শিফট পরিবর্তন / মিডিয়া চেঞ্জ / লাঞ্চ ব্রেক):'
              : 'Enter pause reason (e.g. Break / Shift change / QC inspection / Media reloading):'
          }
          messageBn="পজ করার কারণ লিখুন (যেমনঃ শিফট পরিবর্তন / মিডিয়া চেঞ্জ / লাঞ্চ ব্রেক):"
          placeholder="e.g. Shift change, break, loading roll..."
          placeholderBn="যেমনঃ শিফট পরিবর্তন, মিডিয়া লোডিং ইত্যাদি..."
          confirmText="Pause Task"
          confirmTextBn="স্থগিত করুন"
          isLoading={isPausing}
          onConfirm={confirmPauseTask}
        />

        {/* =========================================================================
            7. FLOATING TOAST NOTIFICATION (Matching Design Studio)
           ========================================================================= */}
        {notification && (
          <div
            className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-xl border flex items-center gap-3 backdrop-blur-md transition-all animate-in slide-in-from-bottom-5 duration-300 max-w-md ${
              notification.type === 'error'
                ? 'bg-rose-50/95 border-rose-300 text-rose-900 dark:bg-rose-950/90 dark:border-rose-800 dark:text-rose-200'
                : notification.type === 'warning'
                ? 'bg-amber-50/95 border-amber-300 text-amber-900 dark:bg-amber-950/90 dark:border-amber-800 dark:text-amber-200'
                : notification.type === 'info'
                ? 'bg-blue-50/95 border-blue-300 text-blue-900 dark:bg-blue-950/90 dark:border-blue-800 dark:text-blue-200'
                : 'bg-emerald-50/95 border-emerald-300 text-emerald-900 dark:bg-emerald-950/90 dark:border-emerald-800 dark:text-emerald-200'
            }`}
          >
            {notification.type === 'error' ? (
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
            ) : notification.type === 'warning' ? (
              <AlertOctagon className="h-5 w-5 text-amber-600 shrink-0" />
            ) : notification.type === 'info' ? (
              <Clock className="h-5 w-5 text-blue-600 shrink-0" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            )}
            <p className="text-xs font-semibold leading-relaxed">{notification.msg}</p>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="ml-auto text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </FeatureGate>
  )
}
