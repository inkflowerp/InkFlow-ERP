'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import {
  Scissors,
  Layers,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Search,
  Check,
  Cpu,
  Truck,
  ShieldCheck,
  Printer,
  FileCheck,
  AlertOctagon,
  Flame,
  Activity,
  Plus,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Zap,
  Tag,
  Boxes,
  HelpCircle,
  LayoutGrid,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
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
  ProductionTaskStatus,
  DEFECT_REASON_LABELS,
  DefectReasonCode,
} from '@/types/production.types'
import {
  getProductionTasksAction,
  startProductionTaskAction,
  pauseProductionTaskAction,
  completeProductionTaskAction,
} from '@/actions/production-planning.actions'
import { HoldTaskModal } from '@/components/production/hold-task-modal'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'

// Station Categories
type StationCategory =
  | 'all'
  | 'digital_finishing'
  | 'offset_binding'
  | 'signage_fabrication'
  | 'qc_inspection'

const STATION_CATEGORIES: { id: StationCategory; labelEn: string; labelBn: string; icon: React.ElementType }[] = [
  { id: 'all', labelEn: 'All Stations', labelBn: 'সকল স্টেশন', icon: Layers },
  { id: 'digital_finishing', labelEn: 'Digital Wide Finishing', labelBn: 'ডিজিটাল ফিনিশিং', icon: Scissors },
  { id: 'offset_binding', labelEn: 'Offset Post-Press & Binding', labelBn: 'অফসেট ও বাইন্ডিং', icon: Layers },
  { id: 'signage_fabrication', labelEn: 'Signage & Acrylic Fab', labelBn: 'সাইনেজ ও এক্রিলিক', icon: Wrench },
  { id: 'qc_inspection', labelEn: 'QC & Packaging', labelBn: 'কিউসি ও প্যাকিং', icon: ShieldCheck },
]

export default function FinishingAndFabricationPage() {
  const { company } = useTenant()
  const { tBilingual } = useI18n()
  const params = useParams()
  const pathname = usePathname()
  const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'
  const companyId = company?.id

  // Client mounting hydration guard
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // State with Zero-Latency SWR Cache Hydration
  const [tasks, setTasks] = useState<ProductionTaskRecord[]>(() => {
    try {
      return PrintERPDataStore.get<ProductionTaskRecord[]>(STORAGE_KEYS.PRODUCTION_TASKS) || []
    } catch {
      return []
    }
  })
  const [loading, setLoading] = useState(() => {
    try {
      const cached = PrintERPDataStore.get(STORAGE_KEYS.PRODUCTION_TASKS)
      return !cached || (cached as any[]).length === 0
    } catch {
      return true
    }
  })

  const [selectedStation, setSelectedStation] = useState<StationCategory>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [actionInProgressTaskId, setActionInProgressTaskId] = useState<string | null>(null)

  // Modals State
  const [selectedTaskForQC, setSelectedTaskForQC] = useState<ProductionTaskRecord | null>(null)
  const [selectedTaskForHold, setSelectedTaskForHold] = useState<ProductionTaskRecord | null>(null)

  // QC Checklist State
  const [qcSizeChecked, setQcSizeChecked] = useState(true)
  const [qcEdgeClean, setQcEdgeClean] = useState(true)
  const [qcHardwareChecked, setQcHardwareChecked] = useState(true)
  const [qcElectricalTested, setQcElectricalTested] = useState(true)
  const [qcPackagingClean, setQcPackagingClean] = useState(true)
  const [goodQty, setGoodQty] = useState<number>(1)
  const [rejectedQty, setRejectedQty] = useState<number>(0)
  const [defectReason, setDefectReason] = useState<string>('cutting_misalignment')
  const [scrapNotes, setScrapNotes] = useState<string>('')
  const [inspectorName, setInspectorName] = useState<string>('')
  const [isSubmittingQC, setIsSubmittingQC] = useState(false)

  // Consumables quick log tracking state per task ID
  const [consumablesLog, setConsumablesLog] = useState<Record<string, { eyelets?: number; glueTubes?: number; ledModules?: number; powerUnits?: number }>>({})

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4000)
  }, [])

  // Load Data
  const loadData = useCallback(async (isBackground = false) => {
    if (!isBackground && tasks.length === 0) {
      setLoading(true)
    }
    try {
      const res = await getProductionTasksAction()
      if (res.success && res.data) {
        setTasks(res.data)
        try {
          PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_TASKS, res.data, false)
        } catch {}
      }
    } catch (err: any) {
      if (!isBackground && tasks.length === 0) {
        showToast(err.message || 'Failed to load finishing tasks.', 'error')
      }
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    loadData(false)

    const handleRealtimeSync = () => {
      loadData(true)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('printerp_table_synced:production_tasks', handleRealtimeSync)
      window.addEventListener('printerp_table_synced:delivery_challans', handleRealtimeSync)
      window.addEventListener('printerp_table_synced:machines', handleRealtimeSync)
      window.addEventListener('printerp_table_synced', handleRealtimeSync)
      window.addEventListener('printerp_data_sync', handleRealtimeSync)
      window.addEventListener('storage', handleRealtimeSync)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('printerp_table_synced:production_tasks', handleRealtimeSync)
        window.removeEventListener('printerp_table_synced:delivery_challans', handleRealtimeSync)
        window.removeEventListener('printerp_table_synced:machines', handleRealtimeSync)
        window.removeEventListener('printerp_table_synced', handleRealtimeSync)
        window.removeEventListener('printerp_data_sync', handleRealtimeSync)
        window.removeEventListener('storage', handleRealtimeSync)
      }
    }
  }, [loadData])

  // Categorize task into Station
  const getTaskStationCategory = useCallback((task: ProductionTaskRecord): StationCategory => {
    const name = (task.task_name || '').toLowerCase()
    const type = (task.task_type || '').toLowerCase()
    const dept = (task.department || '').toLowerCase()

    if (
      dept === 'fabrication' ||
      type === 'fabrication' ||
      name.includes('acrylic') ||
      name.includes('৩ডি') ||
      name.includes('neon') ||
      name.includes('নিয়ন') ||
      name.includes('led') ||
      name.includes('acp') ||
      name.includes('welding') ||
      name.includes('frame') ||
      name.includes('letter')
    ) {
      return 'signage_fabrication'
    }

    if (
      name.includes('eyelet') ||
      name.includes('আইলেট') ||
      name.includes('hemming') ||
      name.includes('সেলাই') ||
      name.includes('pocket') ||
      name.includes('পকেট') ||
      name.includes('standee') ||
      name.includes('স্ট্যান্ডি') ||
      name.includes('banner') ||
      name.includes('flex') ||
      name.includes('vinyl') ||
      name.includes('sticker')
    ) {
      return 'digital_finishing'
    }

    if (
      dept === 'finishing' ||
      type === 'lamination' ||
      type === 'cutting' ||
      type === 'finishing' ||
      name.includes('lamination') ||
      name.includes('লেমিনেশন') ||
      name.includes('die-cut') ||
      name.includes('ডাই কাটিং') ||
      name.includes('foil') ||
      name.includes('ফয়েল') ||
      name.includes('binding') ||
      name.includes('বাইন্ডিং') ||
      name.includes('folding') ||
      name.includes('creasing')
    ) {
      return 'offset_binding'
    }

    return 'digital_finishing'
  }, [])

  // Filter Tasks for Finishing & Fabrication Floor
  const finishingTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Exclude prepress-only and purely printing tasks unless they involve finishing
      const type = task.task_type
      const isFinishingOrFab =
        task.department === 'finishing' ||
        task.department === 'fabrication' ||
        task.department === 'installation' ||
        type === 'lamination' ||
        type === 'cutting' ||
        type === 'fabrication' ||
        type === 'finishing' ||
        type === 'mounting' ||
        type === 'manual' ||
        (task.task_name && (
          task.task_name.toLowerCase().includes('finish') ||
          task.task_name.toLowerCase().includes('cut') ||
          task.task_name.toLowerCase().includes('lam') ||
          task.task_name.toLowerCase().includes('eyelet') ||
          task.task_name.toLowerCase().includes('seam') ||
          task.task_name.toLowerCase().includes('bind') ||
          task.task_name.toLowerCase().includes('fab') ||
          task.task_name.toLowerCase().includes('led') ||
          task.task_name.toLowerCase().includes('acrylic')
        ))

      if (!isFinishingOrFab) return false

      // Station category filter
      if (selectedStation !== 'all') {
        if (selectedStation === 'qc_inspection') {
          if (task.status !== 'completed' && task.status !== 'in_progress') return false
        } else {
          const category = getTaskStationCategory(task)
          if (category !== selectedStation) return false
        }
      }

      // Status filter
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'ready' && !['ready', 'scheduled', 'queued'].includes(task.status)) return false
        if (selectedStatus === 'in_progress' && !['in_progress', 'paused'].includes(task.status)) return false
        if (selectedStatus === 'on_hold' && task.status !== 'on_hold') return false
        if (selectedStatus === 'completed' && task.status !== 'completed') return false
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matches =
          task.task_number.toLowerCase().includes(q) ||
          task.task_name.toLowerCase().includes(q) ||
          (task.customer_name && task.customer_name.toLowerCase().includes(q)) ||
          (task.job_number && task.job_number.toLowerCase().includes(q)) ||
          (task.product_name && task.product_name.toLowerCase().includes(q)) ||
          (task.required_material && task.required_material.toLowerCase().includes(q))
        if (!matches) return false
      }

      return true
    })
  }, [tasks, selectedStation, selectedStatus, searchQuery, getTaskStationCategory])

  // Station Queue Counters
  const stationMetrics = useMemo(() => {
    let digitalCount = 0
    let offsetCount = 0
    let signageCount = 0
    let inProgressCount = 0
    let qcReadyCount = 0

    tasks.forEach((t) => {
      const cat = getTaskStationCategory(t)
      if (t.status === 'in_progress') inProgressCount++
      if (t.status === 'completed') qcReadyCount++

      if (['scheduled', 'ready', 'queued', 'in_progress'].includes(t.status)) {
        if (cat === 'digital_finishing') digitalCount++
        else if (cat === 'offset_binding') offsetCount++
        else if (cat === 'signage_fabrication') signageCount++
      }
    })

    return { digitalCount, offsetCount, signageCount, inProgressCount, qcReadyCount }
  }, [tasks, getTaskStationCategory])

  // Handlers for Task Progression
  const handleStartTask = async (task: ProductionTaskRecord) => {
    if (actionInProgressTaskId) return
    setActionInProgressTaskId(task.id)
    try {
      const res = await startProductionTaskAction(task.id, false, undefined, task)
      if (res.success) {
        showToast(`Started ${task.task_name} at finishing bench!`, 'success')
        loadData(true)
      } else {
        showToast(res.error || 'Failed to start task.', 'error')
      }
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setActionInProgressTaskId(null)
    }
  }

  const handlePauseTask = (task: ProductionTaskRecord) => {
    if (actionInProgressTaskId) return
    setSelectedTaskForHold(task)
  }

  const handleOpenQCModal = (task: ProductionTaskRecord) => {
    setSelectedTaskForQC(task)
    setGoodQty(task.quantity || 1)
    setRejectedQty(0)
    setDefectReason('cutting_misalignment')
    setScrapNotes('')
    setInspectorName(task.assigned_operator_name || 'Finishing Master')
    setQcSizeChecked(true)
    setQcEdgeClean(true)
    setQcHardwareChecked(true)
    setQcElectricalTested(true)
    setQcPackagingClean(true)
  }

  const handleConfirmQCSignOff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTaskForQC) return

    setIsSubmittingQC(true)
    try {
      const res = await completeProductionTaskAction(
        selectedTaskForQC.id,
        {
          good_quantity: goodQty,
          rejected_quantity: rejectedQty,
          defect_reason: rejectedQty > 0 ? defectReason : null,
          scrap_notes: rejectedQty > 0 ? scrapNotes : null,
          notes: `QC Inspected by ${inspectorName}. Checklist verified.`,
        },
        undefined,
        selectedTaskForQC
      )

      if (res.success) {
        showToast(`QC Passed & Completed! Sent to Delivery queue.`, 'success')
        setSelectedTaskForQC(null)
        loadData(true)
      } else {
        showToast(res.error || 'Failed to sign off task.', 'error')
      }
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setIsSubmittingQC(false)
    }
  }

  // Quick Consumable Increment
  const handleUpdateConsumable = (taskId: string, key: 'eyelets' | 'glueTubes' | 'ledModules' | 'powerUnits', delta: number) => {
    setConsumablesLog((prev) => {
      const current = prev[taskId] || { eyelets: 0, glueTubes: 0, ledModules: 0, powerUnits: 0 }
      const nextVal = Math.max(0, (current[key] || 0) + delta)
      return {
        ...prev,
        [taskId]: {
          ...current,
          [key]: nextVal,
        },
      }
    })
  }

  if (!mounted) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-pulse p-4 sm:p-6">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/3" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          ))}
        </div>
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-full" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <FeatureGate feature="production">
      <div className="space-y-5 max-w-7xl mx-auto pb-16 p-4 sm:p-6">
        {/* Header */}
        <PageHeader
          titleEn="Finishing & Fabrication Floor"
          titleBn="ফিনিশিং ও সাইনেজ ফেব্রিকেশন ফ্লোর"
          descriptionEn="Post-press operations, binding, acrylic 3D fabrication, neon wiring, electrical testing, and QC inspection."
          descriptionBn="পোস্ট-প্রেস ফিনিশিং, বাইন্ডিং, এক্রিলিক ৩ডি ও নিয়ন ফেব্রিকেশন, ইলেকট্রিক্যাল টেস্ট ও কিউসি ইন্সপেকশন।"
          icon={Scissors}
          iconColor="text-indigo-600"
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={getTenantNavHref('/production', pathname, slug)}>
                <Button variant="outline" size="sm" className="text-xs bangla-text flex items-center gap-1.5 border-slate-200 dark:border-slate-800">
                  <LayoutGrid className="h-3.5 w-3.5 text-indigo-600" />
                  {tBilingual('Production Board', 'প্রোডাকশন বোর্ড')}
                </Button>
              </Link>
              <Link href={getTenantNavHref('/operator', pathname, slug)}>
                <Button variant="outline" size="sm" className="text-xs bangla-text flex items-center gap-1.5">
                  <Printer className="h-3.5 w-3.5 text-blue-600" />
                  {tBilingual('Operator Terminal', 'অপারেটর টার্মিনাল')}
                </Button>
              </Link>
              <Link href={getTenantNavHref('/delivery', pathname, slug)}>
                <Button variant="outline" size="sm" className="text-xs bangla-text flex items-center gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300">
                  <Truck className="h-3.5 w-3.5 text-emerald-600" />
                  {tBilingual('Delivery & Challan ➔', 'ডেলিভারি ও চালান ➔')}
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => loadData(false)}
                className="text-xs h-9 px-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          }
        />

        {/* Toast Notification */}
        {notification && (
          <div
            className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 border shadow-xs animate-in fade-in-0 ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        )}

        {/* TOP STATION KPI METRICS BAR */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border border-indigo-100 dark:border-indigo-950/50 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-600/10 dark:bg-indigo-400/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <Scissors className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-2xs font-bold text-indigo-900/70 dark:text-indigo-300/70 uppercase truncate">
                  {tBilingual('Digital Finishing', 'ডিজিটাল ফিনিশিং')}
                </div>
                <div className="text-xl font-extrabold text-indigo-900 dark:text-indigo-100">
                  {stationMetrics.digitalCount} <span className="text-xs font-normal text-slate-500">jobs</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-blue-100 dark:border-blue-950/50 bg-blue-50/40 dark:bg-blue-950/20 shadow-xs">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600/10 dark:bg-blue-400/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <Layers className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-2xs font-bold text-blue-900/70 dark:text-blue-300/70 uppercase truncate">
                  {tBilingual('Offset Binding', 'অফসেট ও বাইন্ডিং')}
                </div>
                <div className="text-xl font-extrabold text-blue-900 dark:text-blue-100">
                  {stationMetrics.offsetCount} <span className="text-xs font-normal text-slate-500">jobs</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-amber-100 dark:border-amber-950/50 bg-amber-50/40 dark:bg-amber-950/20 shadow-xs">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-600/10 dark:bg-amber-400/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                <Wrench className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-2xs font-bold text-amber-900/70 dark:text-amber-300/70 uppercase truncate">
                  {tBilingual('Signage & Acrylic', 'সাইনেজ ও এক্রিলিক')}
                </div>
                <div className="text-xl font-extrabold text-amber-900 dark:text-amber-100">
                  {stationMetrics.signageCount} <span className="text-xs font-normal text-slate-500">jobs</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-emerald-100 dark:border-emerald-950/50 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-600/10 dark:bg-emerald-400/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-2xs font-bold text-emerald-900/70 dark:text-emerald-300/70 uppercase truncate">
                  {tBilingual('Active On Bench', 'বেঞ্চে চলমান')}
                </div>
                <div className="text-xl font-extrabold text-emerald-900 dark:text-emerald-100">
                  {stationMetrics.inProgressCount} <span className="text-xs font-normal text-slate-500">active</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* STATION CATEGORIES TABS & SEARCH BAR */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl overflow-x-auto">
            {STATION_CATEGORIES.map((cat) => {
              const Icon = cat.icon
              const isSelected = selectedStation === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedStation(cat.id)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    isSelected
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tBilingual(cat.labelEn, cat.labelBn)}</span>
                </button>
              )
            })}
          </div>

          {/* Search & Status Filter */}
          <div className="flex items-center gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs font-semibold rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 shadow-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="all">⚡ All Statuses</option>
              <option value="ready">Ready for Floor</option>
              <option value="in_progress">In Progress</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed Today</option>
            </select>

            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={tBilingual('Search Job #, task, customer...', 'জব নম্বর, টাস্ক খুঁজুন...')}
                className="pl-8 text-xs h-9 bg-white dark:bg-slate-900"
              />
            </div>
          </div>
        </div>

        {/* FINISHING TASKS LIST */}
        <div className="space-y-3">
          {finishingTasks.map((task) => {
            const category = getTaskStationCategory(task)
            const isRunning = task.status === 'in_progress'
            const isPaused = task.status === 'paused'
            const isCompleted = task.status === 'completed'
            const isOnHold = task.status === 'on_hold'
            const taskConsumables = consumablesLog[task.id] || { eyelets: 0, glueTubes: 0, ledModules: 0, powerUnits: 0 }

            return (
              <Card
                key={task.id}
                className={`border transition-all ${
                  isRunning
                    ? 'border-indigo-300 bg-indigo-50/20 dark:border-indigo-800 dark:bg-indigo-950/20 shadow-xs'
                    : isCompleted
                    ? 'border-emerald-200 bg-emerald-50/10 dark:border-emerald-900/40'
                    : isOnHold
                    ? 'border-amber-200 bg-amber-50/20 dark:border-amber-900/40'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                }`}
              >
                <CardContent className="p-4 space-y-3">
                  {/* Card Header Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={getTenantNavHref(`/production/${task.job_order_id || task.job_number || task.id}`, pathname, slug)}
                        >
                          <Badge variant="outline" className="font-mono text-2xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 hover:text-indigo-700 cursor-pointer transition-colors">
                            #{task.job_number || task.task_number}
                          </Badge>
                        </Link>
                        <Badge
                          className={`text-2xs font-bold uppercase ${
                            category === 'digital_finishing'
                              ? 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300'
                              : category === 'signage_fabrication'
                              ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300'
                          }`}
                        >
                          {category === 'digital_finishing' ? 'Digital Finishing' : category === 'signage_fabrication' ? 'Signage Fab' : 'Offset Binding'}
                        </Badge>
                        <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                          {task.task_name}
                        </span>
                        {task.priority === 'urgent' && (
                          <Badge className="bg-rose-600 text-white text-2xs font-bold">
                            <Flame className="h-3 w-3 mr-1" /> URGENT
                          </Badge>
                        )}
                      </div>

                      <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{task.customer_name || 'Client'}</span>
                        <span>•</span>
                        <span>Product: <strong>{task.product_name || 'Custom Print Work'}</strong></span>
                        <span>•</span>
                        <span>Qty: <strong>{task.quantity} {task.unit || 'pcs'}</strong></span>
                        {task.width && task.height && (
                          <>
                            <span>•</span>
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                              {task.width} × {task.height} in ({((task.width * task.height) / 144).toFixed(1)} sqft)
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      <Badge
                        className={`text-xs px-2.5 py-0.5 font-bold uppercase ${
                          isRunning
                            ? 'bg-indigo-600 text-white animate-pulse'
                            : isPaused
                            ? 'bg-amber-600 text-white'
                            : isCompleted
                            ? 'bg-emerald-600 text-white'
                            : isOnHold
                            ? 'bg-rose-600 text-white'
                            : 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>

                  {/* Bangladeshi Press Domain Specifications Bar */}
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 text-xs flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-3 flex-wrap text-2xs text-slate-600 dark:text-slate-400">
                      {task.required_material && (
                        <span>Substrate: <strong className="text-slate-800 dark:text-slate-200">{task.required_material}</strong></span>
                      )}
                      {task.assigned_operator_name && (
                        <span>Craftsman: <strong className="text-slate-800 dark:text-slate-200">{task.assigned_operator_name}</strong></span>
                      )}
                      {task.assigned_machine_name && (
                        <span>Bench/Tool: <strong className="text-slate-800 dark:text-slate-200">{task.assigned_machine_name}</strong></span>
                      )}
                    </div>

                    {/* Hardware & Consumables Counter for Bangladeshi Craftsmen */}
                    <div className="flex items-center gap-2 text-2xs">
                      {category === 'digital_finishing' && (
                        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          <span className="text-slate-500">আইলেট (Eyelets):</span>
                          <button
                            onClick={() => handleUpdateConsumable(task.id, 'eyelets', -1)}
                            className="px-1 font-bold text-slate-600 hover:text-slate-900"
                          >
                            -
                          </button>
                          <span className="font-bold text-indigo-600">{taskConsumables.eyelets || 4}</span>
                          <button
                            onClick={() => handleUpdateConsumable(task.id, 'eyelets', 1)}
                            className="px-1 font-bold text-slate-600 hover:text-slate-900"
                          >
                            +
                          </button>
                        </div>
                      )}

                      {category === 'signage_fabrication' && (
                        <>
                          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                            <span className="text-slate-500">LED Modules:</span>
                            <button
                              onClick={() => handleUpdateConsumable(task.id, 'ledModules', -5)}
                              className="px-1 font-bold text-slate-600"
                            >
                              -
                            </button>
                            <span className="font-bold text-amber-600">{taskConsumables.ledModules || 20}</span>
                            <button
                              onClick={() => handleUpdateConsumable(task.id, 'ledModules', 5)}
                              className="px-1 font-bold text-slate-600"
                            >
                              +
                            </button>
                          </div>
                          <Badge variant="outline" className="text-2xs bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300">
                            ⚡ 12V DC Verified
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Action Controls */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-2xs text-slate-500">
                      {task.actual_start ? (
                        <span>Started: {new Date(task.actual_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      ) : (
                        <span>Awaiting floor start</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!isRunning && !isCompleted && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleStartTask(task)}
                          disabled={!!actionInProgressTaskId}
                          className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold h-9 px-3.5 flex items-center gap-1.5 shadow-xs"
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                          <span>{tBilingual('Start Bench Work', 'কাজ শুরু করুন')}</span>
                        </Button>
                      )}

                      {isRunning && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePauseTask(task)}
                            disabled={!!actionInProgressTaskId}
                            className="text-xs text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-300 dark:border-amber-800 h-9 px-3 flex items-center gap-1.5"
                          >
                            <Pause className="h-3.5 w-3.5" />
                            <span>{tBilingual('Pause / Hold', 'স্থগিত')}</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleOpenQCModal(task)}
                            disabled={!!actionInProgressTaskId}
                            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-9 px-3.5 flex items-center gap-1.5 shadow-xs"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            <span>{tBilingual('QC Sign-Off & Complete', 'কিউসি পাস ও সম্পন্ন')}</span>
                          </Button>
                        </>
                      )}

                      {isCompleted && (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 text-xs px-2.5 py-1 font-bold flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" />
                          <span>{tBilingual('QC Passed & Ready for Delivery', 'কিউসি পাস ও ডেলিভারির জন্য প্রস্তুত')}</span>
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}

          {finishingTasks.length === 0 && (
            <Card className="p-12 text-center border-dashed">
              <Scissors className="h-10 w-10 text-slate-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {tBilingual('No finishing or fabrication tasks in this station!', 'এই স্টেশনে কোনো কাজ অপেক্ষমাণ নেই!')}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {tBilingual('All post-press, lamination, and signage jobs are up to date.', 'সকল পোস্ট-প্রেস, লেমিনেশন ও সাইনেজ কাজ সম্পন্ন হয়েছে।')}
              </p>
            </Card>
          )}
        </div>

        {/* HOLD / PAUSE TASK MODAL */}
        <HoldTaskModal
          isOpen={!!selectedTaskForHold}
          onClose={() => setSelectedTaskForHold(null)}
          task={selectedTaskForHold}
          onSuccess={() => {
            showToast(tBilingual('Task placed on hold.', 'কাজ সাময়িক স্থগিত করা হয়েছে।'), 'success')
            setSelectedTaskForHold(null)
            loadData(true)
          }}
        />

        {/* QC SIGN-OFF & COMPLETION MODAL */}
        <ModalDialog
          open={!!selectedTaskForQC}
          onOpenChange={(open) => !open && setSelectedTaskForQC(null)}
          title={tBilingual('Finishing Quality Control (QC) Sign-Off', 'কোয়ালিটি কন্ট্রোল (কিউসি) ও ডেলিভারি গেট')}
          hideFooter={true}
        >
          <form onSubmit={handleConfirmQCSignOff} className="space-y-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
              <p className="font-bold">
                {selectedTaskForQC?.task_name} — #{selectedTaskForQC?.job_number}
              </p>
              <p className="text-2xs opacity-90">
                Verify all 5 quality checkpoints before releasing to the delivery dock. Passing QC automatically advances the job to <strong>Ready for Delivery</strong>.
              </p>
            </div>

            {/* 5-Point QC Inspection Checklist */}
            <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
              <Label className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide text-2xs">
                Bangladeshi Press Quality Checkpoints (৫-দফা মান যাচাই)
              </Label>
              <div className="space-y-1.5 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={qcSizeChecked}
                    onChange={(e) => setQcSizeChecked(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>1. Dimensions & Finished Size (W × H) verified against job order</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={qcEdgeClean}
                    onChange={(e) => setQcEdgeClean(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>2. Clean edges, burr-free trimming, and scratch-free surface</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={qcHardwareChecked}
                    onChange={(e) => setQcHardwareChecked(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>3. Eyelets firmly punched / Binding glue & lamination bubble-free</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={qcElectricalTested}
                    onChange={(e) => setQcElectricalTested(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>4. Electrical & 12V DC LED power continuity tested (for signage)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={qcPackagingClean}
                    onChange={(e) => setQcPackagingClean(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>5. Bubble-wrap / Cardboard packaging applied for safe dispatch</span>
                </label>
              </div>
            </div>

            {/* Quantities */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  {tBilingual('Good Quantity (QC Passed)', 'সঠিক পরিমাণ (পাস)')}
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
                  {tBilingual('Defect / Rework Qty', 'ত্রুটি / রি-ওয়ার্ক')}
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

            {/* Defect Reason if rejected > 0 */}
            {rejectedQty > 0 && (
              <div className="p-3 bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-lg space-y-2">
                <Label className="text-xs font-bold text-rose-800 dark:text-rose-300">
                  {tBilingual('Primary Defect Reason', 'ত্রুটির প্রধান কারণ')}
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
                  placeholder="Defect details (e.g. eyelet torn during punch, lamination wrinkled)..."
                  className="text-xs"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                {tBilingual('Inspector / Craftsman Name', 'পরিদর্শক বা কারিগরের নাম')}
              </Label>
              <Input
                required
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value)}
                placeholder="Name of QC inspector"
                className="text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedTaskForQC(null)}
                disabled={isSubmittingQC}
                className="text-xs"
              >
                {tBilingual('Cancel', 'বাতিল')}
              </Button>
              <Button
                type="submit"
                variant="default"
                size="sm"
                disabled={isSubmittingQC}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {isSubmittingQC ? tBilingual('Approving QC...', 'অনুমোদন হচ্ছে...') : tBilingual('Approve QC & Release to Delivery', 'কিউসি পাস ও ডেলিভারি ছাড়পত্র')}
              </Button>
            </div>
          </form>
        </ModalDialog>
      </div>
    </FeatureGate>
  )
}
