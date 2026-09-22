'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useParams, usePathname, useSearchParams } from 'next/navigation'
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
  Filter,
  Sparkles,
  Flame,
  Activity,
  Wrench,
  Search,
  LayoutGrid,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { useTenant } from '@/hooks/use-tenant'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { PageHeader } from '@/components/shared/page-header'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ProductionTaskRecord,
  DEFECT_REASON_LABELS,
  DefectReasonCode,
} from '@/types/production.types'
import { MachineryRecord } from '@/types/machinery.types'
import {
  getProductionTasksAction,
  startProductionTaskAction,
  pauseProductionTaskAction,
  completeProductionTaskAction,
} from '@/actions/production-planning.actions'
import {
  getMachineriesAction,
  reportBreakdownAction,
} from '@/actions/machinery.actions'
import { HoldTaskModal } from '@/components/production/hold-task-modal'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'

function MobileOperatorPanelContent() {
  const { tBilingual } = useI18n()
  const { company } = useTenant()
  const params = useParams()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'

  // Hydration protection guard
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const [tasks, setTasks] = useState<ProductionTaskRecord[]>(() => {
    try {
      return PrintERPDataStore.get<ProductionTaskRecord[]>(STORAGE_KEYS.PRODUCTION_TASKS) || []
    } catch {
      return []
    }
  })
  const [machineries, setMachineries] = useState<MachineryRecord[]>(() => {
    try {
      return PrintERPDataStore.get<MachineryRecord[]>(STORAGE_KEYS.MACHINERIES) || []
    } catch {
      return []
    }
  })
  const [selectedStationMachineId, setSelectedStationMachineId] = useState<string>(
    searchParams?.get('machine') || 'all'
  )
  const [selectedDepartment, setSelectedDepartment] = useState<'all' | 'printing' | 'finishing' | 'fabrication'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(() => {
    try {
      const cached = PrintERPDataStore.get(STORAGE_KEYS.PRODUCTION_TASKS)
      return !cached || (cached as any[]).length === 0
    } catch {
      return true
    }
  })
  const [notification, setNotification] = useState<string | null>(null)
  const [actionInProgressTaskId, setActionInProgressTaskId] = useState<string | null>(null)

  // Live timer tick for running jobs
  const [timerTick, setTimerTick] = useState<number>(0)
  useEffect(() => {
    if (!mounted) return
    const interval = setInterval(() => {
      setTimerTick((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [mounted])

  // Completion Modal State
  const [selectedTaskForComplete, setSelectedTaskForComplete] = useState<ProductionTaskRecord | null>(null)
  const [goodQty, setGoodQty] = useState<number>(1)
  const [rejectedQty, setRejectedQty] = useState<number>(0)
  const [defectReason, setDefectReason] = useState<string>('banding')
  const [scrapNotes, setScrapNotes] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [isSubmittingComplete, setIsSubmittingComplete] = useState(false)

  // Problem / Hold Modal
  const [selectedTaskForHold, setSelectedTaskForHold] = useState<ProductionTaskRecord | null>(null)

  // Quick Breakdown Modal
  const [breakdownTask, setBreakdownTask] = useState<ProductionTaskRecord | null>(null)
  const [breakdownTitle, setBreakdownTitle] = useState('')
  const [breakdownDesc, setBreakdownDesc] = useState('')
  const [isSubmittingBreakdown, setIsSubmittingBreakdown] = useState(false)

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  const loadData = async (isBackground = false) => {
    if (!isBackground && tasks.length === 0) {
      setLoading(true)
    }
    try {
      const [taskRes, machRes] = await Promise.all([
        getProductionTasksAction(),
        getMachineriesAction({ status: 'all' }),
      ])
      if (taskRes.success && taskRes.data) {
        setTasks(taskRes.data)
        try {
          PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_TASKS, taskRes.data, false)
        } catch {}
      }
      if (machRes.success && machRes.data) {
        setMachineries(machRes.data)
        try {
          PrintERPDataStore.set(STORAGE_KEYS.MACHINERIES, machRes.data, false)
        } catch {}
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
      window.addEventListener('printerp_table_synced:machines', handleRealtimeSync)
      window.addEventListener('printerp_table_synced:mounted_rolls', handleRealtimeSync)
      window.addEventListener('printerp_table_synced', handleRealtimeSync)
      window.addEventListener('printerp_data_sync', handleRealtimeSync)
      window.addEventListener('storage', handleRealtimeSync)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('printerp_table_synced:production_tasks', handleRealtimeSync)
        window.removeEventListener('printerp_table_synced:machines', handleRealtimeSync)
        window.removeEventListener('printerp_table_synced:mounted_rolls', handleRealtimeSync)
        window.removeEventListener('printerp_table_synced', handleRealtimeSync)
        window.removeEventListener('printerp_data_sync', handleRealtimeSync)
        window.removeEventListener('storage', handleRealtimeSync)
      }
    }
  }, [])

  const handleStartTask = async (task: ProductionTaskRecord) => {
    if (actionInProgressTaskId) return
    setActionInProgressTaskId(task.id)
    try {
      const res = await startProductionTaskAction(task.id, false, undefined, task)
      if (res.success) {
        showNotification(`Started production for ${task.task_name}`)
        loadData()
      } else {
        showNotification(`Error: ${res.error}`)
      }
    } catch (err: any) {
      showNotification(`Error: ${err.message}`)
    } finally {
      setActionInProgressTaskId(null)
    }
  }

  const handlePauseTask = (task: ProductionTaskRecord) => {
    if (actionInProgressTaskId) return
    setSelectedTaskForHold(task)
  }

  const handleOpenCompleteModal = (task: ProductionTaskRecord) => {
    setSelectedTaskForComplete(task)
    setGoodQty(task.quantity)
    setRejectedQty(0)
    setDefectReason('banding')
    setScrapNotes('')
    setNotes('')
  }

  const handleConfirmComplete = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTaskForComplete) return

    setIsSubmittingComplete(true)
    try {
      const res = await completeProductionTaskAction(
        selectedTaskForComplete.id,
        {
          good_quantity: goodQty,
          rejected_quantity: rejectedQty,
          defect_reason: rejectedQty > 0 ? defectReason : null,
          scrap_notes: rejectedQty > 0 ? scrapNotes : null,
          notes: notes.trim() || undefined,
        },
        undefined,
        selectedTaskForComplete
      )

      if (res.success) {
        showNotification(`Production signed off! Good: ${goodQty}, Scrap: ${rejectedQty}`)
        setSelectedTaskForComplete(null)
        loadData()
      } else {
        showNotification(`Error: ${res.error}`)
      }
    } catch (err: any) {
      showNotification(`Error: ${err.message}`)
    } finally {
      setIsSubmittingComplete(false)
    }
  }

  const handleReportMachineBreakdown = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!breakdownTask || !breakdownTask.assigned_machine_id) return

    setIsSubmittingBreakdown(true)
    try {
      const res = await reportBreakdownAction({
        machine_id: breakdownTask.assigned_machine_id,
        problem_title: breakdownTitle.trim() || 'Floor Machine Failure',
        problem_description: breakdownDesc.trim() || 'Machine stopped operating during active job execution.',
        severity: 'high',
        production_impact: 'job_stalled',
        reported_by_name: 'Floor Operator',
        affected_job_order_id: breakdownTask.job_order_id,
        affected_production_job_id: breakdownTask.production_job_id,
      })

      if (res.success) {
        showNotification('Machine breakdown logged! Machine set to Breakdown and task placed on Hold.')
        setBreakdownTask(null)
        setBreakdownTitle('')
        setBreakdownDesc('')
        loadData()
      } else {
        showNotification(`Error: ${res.error}`)
      }
    } catch (err: any) {
      showNotification(`Error: ${err.message}`)
    } finally {
      setIsSubmittingBreakdown(false)
    }
  }

  // Filter tasks based on selected station & search query
  const filteredTasks = tasks.filter((task) => {
    const matchDept =
      selectedDepartment === 'all' ||
      task.department === selectedDepartment ||
      (selectedDepartment === 'finishing' && (task.department === 'finishing' || task.task_type === 'lamination' || task.task_type === 'cutting' || task.task_type === 'finishing')) ||
      (selectedDepartment === 'fabrication' && (task.department === 'fabrication' || task.task_type === 'fabrication' || task.task_type === 'mounting')) ||
      (selectedDepartment === 'printing' && (task.department === 'printing' || task.task_type === 'printing'))

    const matchStation =
      selectedStationMachineId === 'all' ||
      task.assigned_machine_id === selectedStationMachineId ||
      (!task.assigned_machine_id && selectedStationMachineId === 'manual')

    const matchSearch =
      !searchQuery ||
      task.task_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.task_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.customer_name && task.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (task.job_number && task.job_number.toLowerCase().includes(searchQuery.toLowerCase()))

    return matchDept && matchStation && matchSearch
  })

  const activeTasks = filteredTasks.filter((t) => t.status === 'in_progress' || t.status === 'paused')
  const upcomingTasks = filteredTasks.filter((t) => t.status === 'scheduled' || t.status === 'ready' || t.status === 'queued')
  const heldTasks = filteredTasks.filter((t) => t.status === 'on_hold')

  // Helper to format elapsed duration
  const getElapsedTimeString = (actualStart?: string | null) => {
    if (!actualStart) return '00:00'
    const startMs = new Date(actualStart).getTime()
    const nowMs = Date.now()
    const diffSec = Math.max(0, Math.floor((nowMs - startMs) / 1000))
    const hrs = Math.floor(diffSec / 3600)
    const mins = Math.floor((diffSec % 3600) / 60)
    const secs = diffSec % 60
    if (hrs > 0) {
      return `${hrs}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const selectedStationMachine = machineries.find((m) => m.id === selectedStationMachineId)

  if (!mounted) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto pb-12 p-4 sm:p-6 animate-pulse">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/3" />
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-full" />
        <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl w-full" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-12 p-4 sm:p-6">
      {/* Header */}
      <PageHeader
        titleEn="Shop Floor Terminal"
        titleBn="শপ ফ্লোর টার্মিনাল ও মেশিন কিউ"
        descriptionEn="Live touch-optimized terminal: Select machine station, execute jobs, monitor runtime, and sign off scrap."
        descriptionBn="সহজ ও দ্রুত টার্মিনাল: মেশিন স্টেশন সিলেক্ট করুন, কাজ পরিচালনা করুন এবং মান যাচাই সম্পন্ন করুন।"
        icon={Printer}
        iconColor="text-blue-600"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={getTenantNavHref('/production', pathname, slug)}>
              <Button variant="outline" size="sm" className="text-xs bangla-text flex items-center gap-1.5 border-slate-200 dark:border-slate-800">
                <LayoutGrid className="h-3.5 w-3.5 text-indigo-600" />
                {tBilingual('Production Board', 'প্রোডাকশন বোর্ড')}
              </Button>
            </Link>
            <Link href={getTenantNavHref('/production/machineries', pathname, slug)}>
              <Button variant="outline" size="sm" className="text-xs bangla-text flex items-center gap-1.5 border-slate-200 dark:border-slate-800">
                <Cpu className="h-3.5 w-3.5 text-blue-600" />
                {tBilingual('Machinery Fleet', 'মেশিন বহর')}
              </Button>
            </Link>
          </div>
        }
      />

      {/* Notifications */}
      {notification && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* DEPARTMENT / STATION TABS & QUICK SHORTCUTS */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg overflow-x-auto">
          {[
            { id: 'all', label: 'All Operations', labelBn: 'সকল কাজ' },
            { id: 'printing', label: 'Printing Floor', labelBn: 'প্রিন্টিং' },
            { id: 'finishing', label: 'Finishing Floor', labelBn: 'ফিনিশিং' },
            { id: 'fabrication', label: 'Signage Fabrication', labelBn: 'ফেব্রিকেশন' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedDepartment(tab.id as any)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${
                selectedDepartment === tab.id
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tBilingual(tab.label, tab.labelBn)}
            </button>
          ))}
        </div>

        <Link
          href={getTenantNavHref('/finishing', pathname, slug)}
          className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 flex items-center gap-1.5 transition-colors"
        >
          <Scissors className="h-3.5 w-3.5" />
          <span>{tBilingual('Finishing & Fabrication Floor ➔', 'ফিনিশিং ও ফেব্রিকেশন ফ্লোর ➔')}</span>
        </Link>
      </div>

      {/* MACHINE STATION SELECTOR & SEARCH */}
      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <CardContent className="p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Cpu className="h-4 w-4 text-blue-600" />
              {tBilingual('Active Workstation / Machine Station', 'বর্তমান মেশিন স্টেশন')}
            </Label>
            {selectedStationMachine && (
              <Badge className={`text-[10px] uppercase font-semibold ${
                selectedStationMachine.status === 'in_use'
                  ? 'bg-blue-600 text-white'
                  : selectedStationMachine.status === 'available'
                  ? 'bg-emerald-600 text-white'
                  : selectedStationMachine.status === 'breakdown'
                  ? 'bg-rose-600 text-white'
                  : 'bg-amber-600 text-white'
              }`}>
                {selectedStationMachine.status}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select
              value={selectedStationMachineId}
              onChange={(e) => setSelectedStationMachineId(e.target.value)}
              className="w-full text-xs font-medium rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 shadow-xs focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="all">⚡ All Machines & Stations (সকল স্টেশন)</option>
              <option value="manual">✋ Manual / Hand Work Stations</option>
              {machineries.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.code}) — [{m.status.toUpperCase()}]
                </option>
              ))}
            </select>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={tBilingual('Search Job #, task, customer...', 'জব নম্বর, টাস্ক খুঁজুন...')}
                className="pl-8 text-xs h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ACTIVE RUNNING TASKS SECTION */}
      {activeTasks.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
              </span>
              {tBilingual('CURRENTLY RUNNING', 'বর্তমানে চলমান কাজ')} ({activeTasks.length})
            </span>
            <span className="text-[11px] text-blue-600 font-mono">Live Telemetry Active</span>
          </div>

          <div className="space-y-3">
            {activeTasks.map((task) => {
              const elapsedTime = getElapsedTimeString(task.actual_start)
              const estMinutes = task.estimated_duration_minutes || 30

              return (
                <Card
                  key={task.id}
                  className="border-2 border-blue-500 bg-blue-50/30 dark:bg-blue-950/30 shadow-md"
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={getTenantNavHref(`/production/${task.job_order_id || task.job_number || task.id}`, pathname, slug)}
                          >
                            <Badge className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors">
                              Job #{task.job_number || 'N/A'}
                            </Badge>
                          </Link>
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
                        {task.width && task.height && (
                          <div className="text-[11px] text-slate-500">
                            {task.width} × {task.height} in
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Machine & Live Runtime Ticker */}
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-blue-200 dark:border-blue-900/50 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-blue-600 shrink-0" />
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {task.assigned_machine_name || 'Manual Station'}
                          </span>
                          <span className="text-slate-400 block text-[10px]">
                            {task.required_material ? `Media: ${task.required_material}` : 'Direct Execution'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1 justify-end">
                          <Activity className="h-3.5 w-3.5 animate-spin text-emerald-500" />
                          <span>{elapsedTime}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Target: {estMinutes} mins
                        </span>
                      </div>
                    </div>

                    {/* Touch Buttons */}
                    <div className="grid grid-cols-4 gap-2 pt-1">
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => handlePauseTask(task)}
                        disabled={!!actionInProgressTaskId}
                        className="h-12 text-xs font-bold border-amber-300 text-amber-800 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300"
                      >
                        <Pause className="h-4 w-4 mr-1" />
                        {tBilingual('Pause', 'স্থগিত')}
                      </Button>

                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => setSelectedTaskForHold(task)}
                        disabled={!!actionInProgressTaskId}
                        className="h-12 text-xs font-bold border-rose-300 text-rose-800 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300"
                      >
                        <AlertOctagon className="h-4 w-4 mr-1" />
                        {tBilingual('Hold', 'হোল্ড')}
                      </Button>

                      {task.assigned_machine_id && (
                        <Button
                          size="lg"
                          variant="outline"
                          onClick={() => {
                            setBreakdownTask(task)
                            setBreakdownTitle(`Breakdown during #${task.task_number}`)
                            setBreakdownDesc(`Machine failure on ${task.assigned_machine_name} while processing ${task.task_name}.`)
                          }}
                          className="h-12 text-xs font-bold border-rose-400 text-rose-700 hover:bg-rose-50 dark:border-rose-800"
                        >
                          <Wrench className="h-4 w-4 mr-1 text-rose-600" />
                          {tBilingual('Breakdown', 'নষ্ট')}
                        </Button>
                      )}

                      <Button
                        size="lg"
                        variant="default"
                        onClick={() => handleOpenCompleteModal(task)}
                        disabled={!!actionInProgressTaskId}
                        className="h-12 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm col-span-1"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        {tBilingual('Complete', 'সম্পন্ন')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* UPCOMING QUEUE SECTION */}
      <div className="space-y-2">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center justify-between">
          <span>{tBilingual('UPCOMING IN QUEUE', 'পরবর্তী কিউ')} ({upcomingTasks.length})</span>
          <span className="text-[11px] text-slate-500">Tap Start to begin production</span>
        </div>

        <div className="space-y-2.5">
          {upcomingTasks.map((task) => (
            <Card
              key={task.id}
              className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            >
              <CardContent className="p-3.5 flex items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={getTenantNavHref(`/production/${task.job_order_id || task.job_number || task.id}`, pathname, slug)}
                    >
                      <Badge variant="outline" className="text-[10px] font-mono hover:bg-indigo-100 dark:hover:bg-indigo-950/50 hover:text-indigo-700 cursor-pointer transition-colors">
                        #{task.job_number || task.task_number}
                      </Badge>
                    </Link>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {task.task_name}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                    <span>{task.customer_name}</span>
                    <span>•</span>
                    <span>{task.quantity} {task.unit}</span>
                    {task.width && task.height && (
                      <>
                        <span>•</span>
                        <span>{task.width} × {task.height} in</span>
                      </>
                    )}
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
                    disabled={task.is_blocked_by_dependency || !!actionInProgressTaskId}
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 font-semibold h-9 px-3.5"
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

      {/* HELD TASKS SECTION (IF ANY) */}
      {heldTasks.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
            <AlertOctagon className="h-3.5 w-3.5" />
            {tBilingual('ON HOLD / PROBLEM TASKS', 'হোল্ড কৃত কাজ')} ({heldTasks.length})
          </div>

          <div className="space-y-2">
            {heldTasks.map((task) => (
              <Card key={task.id} className="border border-amber-200 dark:border-amber-900 bg-amber-50/30 dark:bg-amber-950/20 p-3">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <Link
                      href={getTenantNavHref(`/production/${task.job_order_id || task.job_number || task.id}`, pathname, slug)}
                    >
                      <span className="font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer">
                        #{task.job_number}: {task.task_name}
                      </span>
                    </Link>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                      Reason: {task.hold_reason || 'Under inspection'} {task.hold_notes ? `(${task.hold_notes})` : ''}
                    </p>
                  </div>
                  <Badge variant="outline" className="border-amber-300 text-amber-800 dark:text-amber-300 text-[10px]">
                    On Hold
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* COMPLETE PRODUCTION TASK MODAL WITH DEFECT REASONS */}
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

          {/* Defect Reason Selection if rejected > 0 */}
          {rejectedQty > 0 && (
            <div className="p-3 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-lg space-y-2">
              <Label className="text-xs font-bold text-rose-800 dark:text-rose-300">
                {tBilingual('Primary Scrap / Defect Reason', 'অপচয় বা ত্রুটির প্রধান কারণ')}
              </Label>
              <select
                value={defectReason}
                onChange={(e) => setDefectReason(e.target.value)}
                className="w-full text-xs rounded-md border border-rose-300 bg-white px-3 py-2 text-rose-900 dark:border-rose-800 dark:bg-slate-950 dark:text-rose-100"
              >
                {Object.entries(DEFECT_REASON_LABELS).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label.labelEn} ({label.labelBn})
                  </option>
                ))}
              </select>

              <Input
                value={scrapNotes}
                onChange={(e) => setScrapNotes(e.target.value)}
                placeholder="Detailed defect explanation (e.g. 5 sqft vinyl damaged due to media jam)..."
                className="text-xs"
              />
            </div>
          )}

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

      {/* QUICK MACHINE BREAKDOWN MODAL */}
      <ModalDialog
        open={!!breakdownTask}
        onOpenChange={(open) => !open && setBreakdownTask(null)}
        title={tBilingual('Report Active Machine Breakdown', 'মেশিন নষ্ট / মেরামত রিপোর্ট')}
        hideFooter={true}
      >
        <form onSubmit={handleReportMachineBreakdown} className="space-y-4">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg text-xs text-rose-900 dark:text-rose-200 space-y-1">
            <p className="font-bold">
              Machine: {breakdownTask?.assigned_machine_name}
            </p>
            <p className="text-[11px] opacity-90">
              Logging this breakdown will transition the machine to <strong>Breakdown</strong> status and automatically hold current task #{breakdownTask?.task_number}.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              {tBilingual('Problem Headline', 'সমস্যার শিরোনাম')}
            </Label>
            <Input
              required
              value={breakdownTitle}
              onChange={(e) => setBreakdownTitle(e.target.value)}
              placeholder="e.g. Printhead error / Motor driver malfunction..."
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              {tBilingual('Problem Description', 'সমস্যার বিস্তারিত বিবরণ')}
            </Label>
            <Input
              required
              value={breakdownDesc}
              onChange={(e) => setBreakdownDesc(e.target.value)}
              placeholder="Explain the symptom observed..."
              className="text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBreakdownTask(null)}
              disabled={isSubmittingBreakdown}
              className="text-xs"
            >
              {tBilingual('Cancel', 'বাতিল')}
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={isSubmittingBreakdown}
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              {isSubmittingBreakdown ? tBilingual('Reporting...', 'রিপোর্ট হচ্ছে...') : tBilingual('Confirm Breakdown', 'ব্রেকডাউন নিশ্চিত করুন')}
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
          setSelectedTaskForHold(null)
          loadData()
        }}
      />
    </div>
  )
}

export default function MobileOperatorPanelPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading operator workstation...</div>}>
      <MobileOperatorPanelContent />
    </Suspense>
  )
}
