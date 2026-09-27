'use client'

import React, { useState, useEffect, useMemo } from 'react'
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
  Check,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { dispatchToast } from '@/components/shared/toast-feedback'
import {
  ProductionTaskRecord,
  UnifiedProductionJob,
  HOLD_REASON_LABELS,
} from '@/types/production.types'
import { ProductionTimerBadge } from './production-timer-badge'

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
  onSendToFinishing?: (job: UnifiedProductionJob) => void
  onSendToDelivery?: (job: UnifiedProductionJob) => void
}

interface MaterialStockItem {
  id: string
  name: string
  current_stock: number
  unit: string
}

const DEFAULT_PRINT_MATERIALS: MaterialStockItem[] = [
  { id: 'mat-1', name: 'Star Flex (320 GSM)', current_stock: 450, unit: 'sft' },
  { id: 'mat-2', name: 'Blackout Flex (340 GSM)', current_stock: 320, unit: 'sft' },
  { id: 'mat-3', name: 'PVC Vinyl Glossy (120 GSM)', current_stock: 500, unit: 'sft' },
  { id: 'mat-4', name: 'PVC Vinyl Matte (120 GSM)', current_stock: 280, unit: 'sft' },
  { id: 'mat-5', name: 'Reflective Sheeting Honeycomb', current_stock: 150, unit: 'sft' },
  { id: 'mat-6', name: 'Canvas Substrate (260 GSM)', current_stock: 200, unit: 'sft' },
  { id: 'mat-7', name: 'Backlit Film (180 GSM)', current_stock: 180, unit: 'sft' },
  { id: 'mat-8', name: 'One Way Vision Sticker', current_stock: 220, unit: 'sft' },
  { id: 'mat-9', name: 'Art Card 300 GSM', current_stock: 1200, unit: 'pcs' },
  { id: 'mat-10', name: 'Art Card 350 GSM', current_stock: 800, unit: 'pcs' },
  { id: 'mat-11', name: 'Swedish Board 300 GSM', current_stock: 650, unit: 'pcs' },
  { id: 'mat-12', name: 'Offset Paper 80 GSM', current_stock: 3500, unit: 'pcs' },
]

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
  onSendToFinishing,
  onSendToDelivery,
}: ProductionJobCardProps) {
  const pathname = usePathname() || ''
  const { company } = useTenant()
  const { locale } = useI18n()
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
  const finishingHref = getTenantNavHref(`/finishing`, pathname, tenantSlug)

  // Active task is the task currently running, or the first non-completed task
  const activeTask =
    job.activeTask ||
    job.tasks.find((t) => t.status === 'in_progress' || t.status === 'paused') ||
    job.tasks.find((t) => t.status !== 'completed' && t.status !== 'cancelled') ||
    job.tasks[0]

  const isAllTasksCompleted =
    job.tasks.length > 0 && job.tasks.every((t) => t.status === 'completed')

  const isPrintTask =
    !activeTask || activeTask.task_type === 'printing' || activeTask.department === 'printing'
  const isFinishingTask =
    activeTask?.task_type === 'finishing' || activeTask?.department === 'finishing'

  const isPrintingCompleted = job.tasks.some(
    (t) => (t.department === 'printing' || t.task_type === 'printing') && t.status === 'completed'
  )

  // Has finishing available check: if finishing is not 'None' and has items
  const hasFinishingAvailable = useMemo(() => {
    const fStr = (job.finishing || '').toLowerCase().trim()
    if (!fStr || fStr === 'none' || fStr === 'কোন ফিনিশিং নেই' || fStr === 'no') {
      return Boolean(job.selectedFinishing && job.selectedFinishing.length > 0)
    }
    return true
  }, [job.finishing, job.selectedFinishing])

  // Material selection & Wastage states
  const [selectedMaterial, setSelectedMaterial] = useState<string>(
    activeTask?.required_material || job.material || 'Star Flex (320 GSM)'
  )
  const [wastageQty, setWastageQty] = useState<number>(activeTask?.rejected_quantity || 0)
  const [wastageReason, setWastageReason] = useState<string>(
    activeTask?.defect_reason || 'banding'
  )

  // Stock inventory tracking for floor consumption
  const [materialStockList, setMaterialStockList] = useState<MaterialStockItem[]>(() => {
    try {
      const stored = PrintERPDataStore.get<any[]>(STORAGE_KEYS.MATERIALS) || []
      const map = new Map<string, MaterialStockItem>()

      DEFAULT_PRINT_MATERIALS.forEach((d) => map.set(d.name.toLowerCase(), { ...d }))
      stored.forEach((s) => {
        if (s.name) {
          const key = s.name.toLowerCase()
          map.set(key, {
            id: s.id || key,
            name: s.name,
            current_stock: Number(s.current_stock ?? 500),
            unit: s.unit || 'sft',
          })
        }
      })
      return Array.from(map.values())
    } catch {
      return DEFAULT_PRINT_MATERIALS
    }
  })

  // Live Elapsed Timer & Button Progression States
  const [startedAt, setStartedAt] = useState<string | null>(
    activeTask?.started_at || (job as any).started_at || null
  )
  const [completedAt, setCompletedAt] = useState<string | null>(
    activeTask?.completed_at || (job as any).completed_at || null
  )
  const [durationSeconds, setDurationSeconds] = useState<number | null>(
    activeTask?.duration_seconds || (job as any).duration_seconds || null
  )
  const [isPrintCompleted, setIsPrintCompleted] = useState<boolean>(() => {
    return Boolean(
      (job as any).is_print_completed ||
        (activeTask as any)?.is_print_completed ||
        (isPrintingCompleted &&
          (job.status === 'ready_delivery' ||
            job.status === 'finishing' ||
            job.status === 'completed'))
    )
  })
  const [isSent, setIsSent] = useState<boolean>(() => {
    return Boolean(
      job.status === 'ready_delivery' ||
        job.status === 'sent_to_delivery' ||
        job.status === 'sent_to_finishing' ||
        job.status === 'completed' ||
        (job as any).sent_to_delivery ||
        (job as any).sent_to_finishing
    )
  })
  const [isHold, setIsHold] = useState<boolean>(
    activeTask?.status === 'on_hold' || activeTask?.status === 'paused'
  )

  useEffect(() => {
    if (activeTask) {
      if (activeTask.required_material) {
        setSelectedMaterial(activeTask.required_material)
      } else if (job.material) {
        setSelectedMaterial(job.material)
      }
      if (activeTask.rejected_quantity !== undefined && activeTask.rejected_quantity !== null) {
        setWastageQty(activeTask.rejected_quantity)
      }
      if (activeTask.started_at && !startedAt) {
        setStartedAt(activeTask.started_at)
      }
      if (activeTask.status === 'in_progress' && !startedAt) {
        setStartedAt(new Date().toISOString())
      }
      if (activeTask.status === 'on_hold' || activeTask.status === 'paused') {
        setIsHold(true)
      }
    }
  }, [activeTask?.id, activeTask?.required_material, job.material])

  // Calculate Consumption Length/Area from Dimensions & Quantity
  const { consumedQty, unit: calculatedUnit } = useMemo(() => {
    const rawDim = job.dimensions || ''
    const match = rawDim.match(/(\d+(?:\.\d+)?)\s*[×x*X]\s*(\d+(?:\.\d+)?)/)
    const qty = Number(activeTask?.quantity || job.quantity) || 1
    if (match) {
      const num1 = parseFloat(match[1])
      const num2 = parseFloat(match[2])
      if (rawDim.toLowerCase().includes('in') || rawDim.toLowerCase().includes('inch')) {
        const sft = Math.round(((num1 * num2) / 144) * qty * 100) / 100
        return { consumedQty: sft, unit: 'sft' }
      }
      const sft = Math.round(num1 * num2 * qty * 100) / 100
      return { consumedQty: sft, unit: 'sft' }
    }
    return { consumedQty: qty, unit: job.unit || 'pcs' }
  }, [job.dimensions, job.quantity, activeTask?.quantity, job.unit])

  // Resolved production unit: same for production, consumption & wastage
  const productionUnit = useMemo(() => {
    if (job.dimensions) {
      const dimMatch = job.dimensions.match(/\b(sft|sqft|ft|feet|in|inch|pcs|piece|sheet)\b/i)
      if (dimMatch) {
        const u = dimMatch[1].toLowerCase()
        if (['sqft', 'sft', 'ft', 'feet', 'in', 'inch'].includes(u)) return 'sft'
        return u
      }
    }
    if (calculatedUnit) return calculatedUnit
    return activeTask?.unit || job.unit || 'sft'
  }, [job.dimensions, calculatedUnit, activeTask?.unit, job.unit])

  // Selected Material Stock Item
  const selectedMaterialStock = useMemo(() => {
    return (
      materialStockList.find(
        (m) => m.name.toLowerCase() === selectedMaterial.toLowerCase() || m.id === selectedMaterial
      ) || {
        id: 'default',
        name: selectedMaterial,
        current_stock: 500,
        unit: productionUnit,
      }
    )
  }, [materialStockList, selectedMaterial, productionUnit])

  const handleMaterialChange = (newMat: string) => {
    setSelectedMaterial(newMat)
    if (activeTask) {
      activeTask.required_material = newMat
      try {
        const tasks =
          PrintERPDataStore.get<ProductionTaskRecord[]>(STORAGE_KEYS.PRODUCTION_TASKS) || []
        const idx = tasks.findIndex((t) => t.id === activeTask.id)
        if (idx !== -1) {
          tasks[idx] = {
            ...tasks[idx],
            required_material: newMat,
            updated_at: new Date().toISOString(),
          }
          PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_TASKS, tasks)
        }
      } catch (_) {}
    }
  }

  // Timer running indicator: started, not completed, not paused/held, not sent
  const isTimerRunning = Boolean(
    startedAt && !isPrintCompleted && !isHold && !isSent && activeTask?.status !== 'completed'
  )

  // Auto-reduce material consumption & wastage
  const performMaterialDeduction = () => {
    const matName = selectedMaterial || job.material || 'Star Flex (320 GSM)'
    const totalDeduct = consumedQty + (Number(wastageQty) || 0)

    try {
      const materials = PrintERPDataStore.get<any[]>(STORAGE_KEYS.MATERIALS) || []
      const matchedIdx = materials.findIndex(
        (m) => m.name?.toLowerCase() === matName.toLowerCase() || m.id === matName
      )

      let remainingStock = 500
      if (matchedIdx !== -1) {
        const prev = Number(materials[matchedIdx].current_stock ?? 500)
        remainingStock = Math.max(0, prev - totalDeduct)
        materials[matchedIdx].current_stock = remainingStock
        materials[matchedIdx].updated_at = new Date().toISOString()
        PrintERPDataStore.set(STORAGE_KEYS.MATERIALS, materials)
      } else {
        remainingStock = Math.max(0, 500 - totalDeduct)
        materials.push({
          id: crypto.randomUUID(),
          name: matName,
          current_stock: remainingStock,
          unit: productionUnit,
          category: 'raw_materials',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        PrintERPDataStore.set(STORAGE_KEYS.MATERIALS, materials)
      }

      // Update local state list
      setMaterialStockList((prev) =>
        prev.map((m) =>
          m.name.toLowerCase() === matName.toLowerCase()
            ? { ...m, current_stock: remainingStock }
            : m
        )
      )

      // Record in Stock Ledger
      try {
        const ledger = PrintERPDataStore.get<any[]>(STORAGE_KEYS.STOCK_LEDGER) || []
        ledger.push({
          id: crypto.randomUUID(),
          material_name: matName,
          transaction_type: 'CONSUMPTION',
          quantity_change: -totalDeduct,
          unit: productionUnit,
          balance_after: remainingStock,
          reference_type: 'PRODUCTION_TASK',
          reference_id: activeTask?.id || job.id,
          notes: `Auto-deducted print run: ${consumedQty} ${productionUnit} + ${wastageQty || 0} ${productionUnit} scrap for #${job.jobNumber} (${job.title})`,
          created_at: new Date().toISOString(),
        })
        PrintERPDataStore.set(STORAGE_KEYS.STOCK_LEDGER, ledger)
      } catch (_) {}

      return isBn
        ? `মেটেরিয়াল স্টকে স্বয়ংক্রিয় কর্তন: ${consumedQty} ${productionUnit}${wastageQty > 0 ? ` + ${wastageQty} ${productionUnit} অপচয়` : ''}। অবশিষ্ট: ${remainingStock} ${productionUnit}`
        : `Auto-reduced ${consumedQty} ${productionUnit}${wastageQty > 0 ? ` + ${wastageQty} ${productionUnit} scrap` : ''} from ${matName}. Available stock: ${remainingStock} ${productionUnit}.`
    } catch (err: any) {
      console.error('Material deduction error:', err)
      return null
    }
  }

  // Linear Workflow Handler 1: Start Printing
  const handleStartPrinting = () => {
    const now = new Date().toISOString()
    setStartedAt(now)
    setIsHold(false)
    setIsPrintCompleted(false)

    if (activeTask) {
      activeTask.status = 'in_progress'
      activeTask.started_at = now
      try {
        const tasks =
          PrintERPDataStore.get<ProductionTaskRecord[]>(STORAGE_KEYS.PRODUCTION_TASKS) || []
        const idx = tasks.findIndex((t) => t.id === activeTask.id)
        if (idx !== -1) {
          tasks[idx] = {
            ...tasks[idx],
            status: 'in_progress',
            started_at: now,
            updated_at: now,
          }
          PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_TASKS, tasks)
        }
      } catch (_) {}
    }

    if (onStartTask && activeTask) {
      onStartTask({
        ...activeTask,
        status: 'in_progress',
        started_at: now,
        required_material: selectedMaterial || activeTask.required_material,
      })
    } else {
      dispatchToast({
        type: 'info',
        title: isBn ? 'প্রিন্ট শুরু হয়েছে' : 'Printing Started',
        message: isBn
          ? `টাইমার চালু হয়েছে: #${job.jobNumber}`
          : `Timer started for job #${job.jobNumber}`,
      })
    }
  }

  // Linear Workflow Handler 2: Hold Printing
  const handleHold = () => {
    setIsHold(true)
    if (activeTask) {
      activeTask.status = 'on_hold'
      try {
        const tasks =
          PrintERPDataStore.get<ProductionTaskRecord[]>(STORAGE_KEYS.PRODUCTION_TASKS) || []
        const idx = tasks.findIndex((t) => t.id === activeTask.id)
        if (idx !== -1) {
          tasks[idx] = {
            ...tasks[idx],
            status: 'on_hold',
            updated_at: new Date().toISOString(),
          }
          PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_TASKS, tasks)
        }
      } catch (_) {}
    }

    if (onHoldTask && activeTask) {
      onHoldTask(activeTask)
    } else {
      dispatchToast({
        type: 'warning',
        title: isBn ? 'কাজ স্থগিত (On Hold)' : 'Printing On Hold',
        message: isBn ? 'প্রিন্ট সাময়িকভাবে থামানো হয়েছে।' : 'Print job temporarily paused.',
      })
    }
  }

  // Linear Workflow Handler 2b: Resume Printing
  const handleResume = () => {
    setIsHold(false)
    if (activeTask) {
      activeTask.status = 'in_progress'
      try {
        const tasks =
          PrintERPDataStore.get<ProductionTaskRecord[]>(STORAGE_KEYS.PRODUCTION_TASKS) || []
        const idx = tasks.findIndex((t) => t.id === activeTask.id)
        if (idx !== -1) {
          tasks[idx] = {
            ...tasks[idx],
            status: 'in_progress',
            updated_at: new Date().toISOString(),
          }
          PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_TASKS, tasks)
        }
      } catch (_) {}
    }

    if (onResumeTask && activeTask) {
      onResumeTask(activeTask)
    } else {
      dispatchToast({
        type: 'info',
        title: isBn ? 'পুনরায় শুরু' : 'Printing Resumed',
        message: isBn ? 'প্রিন্ট রানিং চলমান।' : 'Print timer resumed.',
      })
    }
  }

  // Linear Workflow Handler 2c: Cancel Printing
  const handleCancel = () => {
    setStartedAt(null)
    setIsHold(false)
    setIsPrintCompleted(false)

    if (activeTask) {
      activeTask.status = 'queued'
      activeTask.started_at = null
      try {
        const tasks =
          PrintERPDataStore.get<ProductionTaskRecord[]>(STORAGE_KEYS.PRODUCTION_TASKS) || []
        const idx = tasks.findIndex((t) => t.id === activeTask.id)
        if (idx !== -1) {
          tasks[idx] = {
            ...tasks[idx],
            status: 'queued',
            started_at: null,
            updated_at: new Date().toISOString(),
          }
          PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_TASKS, tasks)
        }
      } catch (_) {}
    }

    dispatchToast({
      type: 'info',
      title: isBn ? 'বাতিল করা হয়েছে' : 'Print Cancelled',
      message: isBn ? 'কাজটি পুনরায় কিউতে ফেরত গেছে।' : 'Print run cancelled. Returned to queue.',
    })
  }

  // Linear Workflow Handler 3: Print Complete (Stops timer & auto reduces material)
  const handlePrintComplete = () => {
    const now = new Date().toISOString()
    setCompletedAt(now)
    setIsPrintCompleted(true)
    setIsHold(false)

    const sec = startedAt
      ? Math.max(1, Math.round((new Date(now).getTime() - new Date(startedAt).getTime()) / 1000))
      : 30
    setDurationSeconds(sec)

    // Run inventory auto-reduction
    const deductionNotice = performMaterialDeduction()

    if (activeTask) {
      activeTask.status = 'completed'
      activeTask.completed_at = now
      activeTask.duration_seconds = sec
      activeTask.rejected_quantity = wastageQty
      activeTask.defect_reason = wastageQty > 0 ? wastageReason : null
      ;(activeTask as any).is_print_completed = true
      try {
        const tasks =
          PrintERPDataStore.get<ProductionTaskRecord[]>(STORAGE_KEYS.PRODUCTION_TASKS) || []
        const idx = tasks.findIndex((t) => t.id === activeTask.id)
        if (idx !== -1) {
          tasks[idx] = {
            ...tasks[idx],
            status: 'completed',
            completed_at: now,
            duration_seconds: sec,
            rejected_quantity: wastageQty,
            defect_reason: wastageQty > 0 ? wastageReason : null,
            is_print_completed: true,
            updated_at: now,
          }
          PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_TASKS, tasks)
        }
      } catch (_) {}
    }
    ;(job as any).is_print_completed = true

    dispatchToast({
      type: 'success',
      title: isBn ? 'প্রিন্ট সম্পন্ন!' : 'Print Complete!',
      message:
        deductionNotice ||
        (isBn
          ? 'প্রিন্ট সফলভাবে শেষ হয়েছে। ফিনিশিং বা ডেলিভারিতে পাঠাতে পরবর্তী বাটনে ক্লিক করুন।'
          : 'Printing finished. Click Send to route job.'),
    })
  }

  // Linear Workflow Handler 4: Send to Finishing / Send to Delivery (Moves to Completed Tab)
  const handleSendToNextStage = () => {
    setIsSent(true)
    if (hasFinishingAvailable) {
      if (onSendToFinishing) {
        onSendToFinishing(job)
      } else {
        // Fallback local update
        markJobSent(true)
      }
    } else {
      if (onSendToDelivery) {
        onSendToDelivery(job)
      } else {
        // Fallback local update
        markJobSent(false)
      }
    }
  }

  const markJobSent = (toFinishing: boolean) => {
    const now = new Date().toISOString()
    try {
      const allTasks =
        PrintERPDataStore.get<ProductionTaskRecord[]>(STORAGE_KEYS.PRODUCTION_TASKS) || []
      const taskIds = new Set(job.tasks.map((t) => t.id))
      const nextTasks = allTasks.map((t) => {
        if (taskIds.has(t.id)) {
          if (t.department === 'printing' || t.task_type === 'printing') {
            return {
              ...t,
              status: 'completed' as const,
              completed_at: now,
              updated_at: now,
              sent_to_finishing: toFinishing,
              sent_to_delivery: !toFinishing,
            }
          }
          if (toFinishing && (t.department === 'finishing' || t.task_type === 'finishing')) {
            return { ...t, status: 'queued' as const, updated_at: now }
          }
        }
        return t
      })
      PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_TASKS, nextTasks)

      const allJobs = PrintERPDataStore.get<any[]>(STORAGE_KEYS.PRODUCTION_JOBS) || []
      const jIdx = allJobs.findIndex((j) => j.id === job.id || j.job_number === job.jobNumber)
      if (jIdx !== -1) {
        allJobs[jIdx] = {
          ...allJobs[jIdx],
          status: toFinishing ? 'finishing' : 'ready_delivery',
          sent_to_finishing: toFinishing,
          sent_to_delivery: !toFinishing,
          is_print_completed: true,
          updated_at: now,
        }
      } else {
        allJobs.push({
          id: job.id,
          job_number: job.jobNumber,
          invoice_number: job.invoiceNumber,
          status: toFinishing ? 'finishing' : 'ready_delivery',
          sent_to_finishing: toFinishing,
          sent_to_delivery: !toFinishing,
          is_print_completed: true,
          created_at: now,
          updated_at: now,
        })
      }
      PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_JOBS, allJobs)
    } catch (_) {}

    dispatchToast({
      type: 'success',
      title: isBn ? 'সম্পন্ন ট্যাবে প্রেরিত' : 'Moved to Completed Tab',
      message: toFinishing
        ? isBn
          ? `জব #${job.jobNumber} সফলভাবে ফিনিশিং ফ্লোরে প্রেরিত হয়েছে।`
          : `Job #${job.jobNumber} moved to Completed tab! Sent to Finishing.`
        : isBn
          ? `জব #${job.jobNumber} সফলভাবে ডেলিভারি ও ডিসপ্যাচে প্রেরিত হয়েছে।`
          : `Job #${job.jobNumber} moved to Completed tab! Sent to Delivery.`,
    })
  }

  const getStatusBadge = () => {
    if (
      isSent ||
      job.status === 'ready_delivery' ||
      job.status === 'sent_to_delivery' ||
      (job.status === 'completed' && !hasFinishingAvailable)
    ) {
      return (
        <span className="text-2xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-lg flex items-center gap-1 border border-emerald-300 dark:border-emerald-800">
          <Truck className="h-3 w-3 text-emerald-600" />
          <span>{isBn ? 'ডেলিভারি ও ডিসপ্যাচে প্রেরিত' : 'Sent to Delivery and Dispatch'}</span>
        </span>
      )
    }

    if (
      job.status === 'sent_to_finishing' ||
      job.status === 'finishing' ||
      (isPrintCompleted && hasFinishingAvailable)
    ) {
      return (
        <span className="text-2xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 px-2 py-0.5 rounded-lg flex items-center gap-1 border border-indigo-300 dark:border-indigo-800">
          <Scissors className="h-3 w-3 text-indigo-600" />
          <span>{isBn ? 'ফিনিশিং ফ্লোরে প্রেরিত' : 'Sent to Finishing Floor'}</span>
        </span>
      )
    }

    if (isTimerRunning) {
      return (
        <span className="text-2xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 px-2 py-0.5 rounded-lg flex items-center gap-1 border border-blue-300 dark:border-blue-800 animate-pulse">
          <Printer className="h-3 w-3 text-blue-600" />
          <span>{isBn ? 'প্রিন্ট রানিং' : 'Printing in Progress'}</span>
        </span>
      )
    }

    if (isHold) {
      return (
        <span className="text-2xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 rounded-lg flex items-center gap-1 border border-amber-300 dark:border-amber-800">
          <Pause className="h-3 w-3 text-amber-600" />
          <span>{isBn ? 'স্থগিতাদেশ (On Hold)' : 'On Hold'}</span>
        </span>
      )
    }

    if (activeTask?.status === 'scheduled') {
      return (
        <span className="text-2xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 px-2 py-0.5 rounded-lg flex items-center gap-1 border border-purple-300 dark:border-purple-800">
          <Calendar className="h-3 w-3 text-purple-600" />
          <span>{isBn ? 'শিডিউল্ড (Scheduled)' : 'Scheduled'}</span>
        </span>
      )
    }

    return (
      <span className="text-2xs font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 rounded-lg flex items-center gap-1 border border-slate-300 dark:border-slate-700">
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
        <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-transparent px-4 py-1.5 border-b border-amber-200/50 dark:border-amber-900/40 flex items-center justify-between text-2xs font-bold">
          <div className="flex items-center gap-2">
            {isWalkIn && (
              <span className="bg-orange-600 text-white px-2 py-0.5 rounded text-2xs uppercase tracking-wide">
                🏃 {isBn ? 'দোকানে বসা কাস্টমার (Walk-in)' : 'Walk-in Client'}
              </span>
            )}
            {isDueToday && (
              <span className="bg-rose-600 text-white px-2 py-0.5 rounded text-2xs uppercase tracking-wide">
                ⏰ {isBn ? 'আজকের ডেলিভারি (Due Today)' : 'Due Today'}
              </span>
            )}
            {isUrgent && !isDueToday && (
              <span className="bg-red-600 text-white px-2 py-0.5 rounded text-2xs uppercase tracking-wide">
                🚨 {isBn ? 'জরুরী কাজ (Urgent)' : 'Urgent Job'}
              </span>
            )}
          </div>
          <span className="text-slate-500 text-2xs font-mono">
            {job.deadline ? `টার্গেট: ${job.deadline.split('T')[0]}` : ''}
          </span>
        </div>
      )}

      {/* Main Card Body: 2-Column Split matching Design Studio */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Left Column: Job Info, Specifications & Sequential Stages (7 Cols) */}
        <div className="md:col-span-7 flex flex-col justify-between space-y-3">
          <div>
            {/* Header Badges: One clean Invoice/Job ID pill (duplicates removed!) */}
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Link
                  href={jobDetailHref}
                  className="font-mono text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors inline-flex items-center gap-1"
                >
                  <span>#{job.jobNumber}</span>
                  <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                </Link>

                {job.orderNumber && orderHref && job.orderNumber !== job.jobNumber && (
                  <Link
                    href={orderHref}
                    className="font-mono text-xs font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors"
                  >
                    Ord: #{job.orderNumber}
                  </Link>
                )}

                {/* Only display Inv pill if not identical to jobNumber and not duplicate */}
                {job.invoiceNumber &&
                  invoiceHref &&
                  job.invoiceNumber !== job.jobNumber &&
                  !job.jobNumber.startsWith('INV-') &&
                  !job.jobNumber.includes(job.invoiceNumber) && (
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
                  className="text-2xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
                >
                  <span>Floor View ➔</span>
                </Link>
                <span className="text-2xs font-mono text-slate-400">
                  {job.tasks.length} {isBn ? 'ধাপ' : 'steps'}
                </span>
              </div>
            </div>

            {/* Title & Customer Name */}
            <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1 leading-snug">
              <Link
                href={jobDetailHref}
                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
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
                  className="inline-flex items-center gap-1 text-2xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                  title="WhatsApp Update"
                >
                  <Phone className="h-3 w-3 text-emerald-600" />
                  <span>{job.customerPhone}</span>
                </button>
              )}
            </div>

            {/* Job Specifications Strip: Prominently Highlights Service Name, Size, Quantity, Material Name, Finishing, Add-on */}
            <div className="mt-2.5 bg-gradient-to-r from-slate-50 via-blue-50/20 to-slate-50 dark:from-slate-800/80 dark:via-blue-950/20 dark:to-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 text-2xs space-y-2.5 shadow-2xs">
              {/* Product Title Bar with HIGHLIGHTED Service Name */}
              <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-200/80 dark:border-slate-700/80">
                <div className="flex items-center gap-1.5 truncate max-w-[65%]">
                  <span className="text-2xs font-bold uppercase tracking-wider text-slate-400 shrink-0">
                    {isBn ? 'প্রোডাক্ট:' : 'Product:'}
                  </span>
                  <span
                    className="font-bold text-slate-900 dark:text-white truncate text-xs"
                    title={job.productName || job.title}
                  >
                    {job.productName || job.title}
                  </span>
                </div>

                {/* 1. HIGHLIGHTED Service Name */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-2xs font-semibold text-slate-400">
                    {isBn ? 'সার্ভিস:' : 'Service:'}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg font-bold text-2xs bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200 border border-blue-300 dark:border-blue-700 shadow-2xs">
                    <Layers className="h-3 w-3 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="truncate max-w-[150px]">
                      {job.serviceName || 'Commercial Printing'}
                    </span>
                  </span>
                </div>
              </div>

              {/* 5-Tile High-Visibility Specification Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {/* 1. SIZE / DIMENSIONS */}
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900/90 border border-amber-300/80 dark:border-amber-800/60 shadow-2xs flex flex-col justify-between">
                  <span className="text-2xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wide flex items-center gap-1">
                    <span>📐</span>
                    <span>{isBn ? 'সাইজ / মাপ:' : 'Size / Dimensions:'}</span>
                  </span>
                  <span
                    className="font-mono font-bold text-slate-900 dark:text-white text-xs mt-1 truncate"
                    title={job.dimensions || 'Standard Spec'}
                  >
                    {job.dimensions || 'Standard Spec'}
                  </span>
                </div>

                {/* 2. QUANTITY (QTY) */}
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900/90 border border-emerald-300/80 dark:border-emerald-800/60 shadow-2xs flex flex-col justify-between">
                  <span className="text-2xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wide flex items-center gap-1">
                    <Package className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{isBn ? 'পরিমাণ (Qty):' : 'Quantity (Qty):'}</span>
                  </span>
                  <span className="font-mono font-bold text-emerald-800 dark:text-emerald-300 text-xs mt-1">
                    {job.quantity} {job.unit || 'pcs'}
                  </span>
                </div>

                {/* 3. MATERIAL NAME */}
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900/90 border border-blue-300/80 dark:border-blue-800/60 shadow-2xs flex flex-col justify-between">
                  <span className="text-2xs font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wide flex items-center gap-1">
                    <Layers className="h-3 w-3 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>{isBn ? 'মেটেরিয়াল:' : 'Material Name:'}</span>
                  </span>
                  <span
                    className="font-bold text-blue-900 dark:text-blue-200 text-2xs mt-1 truncate block leading-tight"
                    title={selectedMaterial || job.material || 'Star Flex (320 GSM)'}
                  >
                    {selectedMaterial || job.material || 'Star Flex (320 GSM)'}
                  </span>
                </div>

                {/* 4. FINISHING */}
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900/90 border border-teal-300/80 dark:border-teal-800/60 shadow-2xs flex flex-col justify-between">
                  <span className="text-2xs font-bold text-teal-800 dark:text-teal-400 uppercase tracking-wide flex items-center gap-1">
                    <Scissors className="h-3 w-3 text-teal-600 dark:text-teal-400 shrink-0" />
                    <span>{isBn ? 'ফিনিশিং:' : 'Finishing:'}</span>
                  </span>
                  <div className="mt-1">
                    {job.finishing && job.finishing.toLowerCase() !== 'none' ? (
                      <span
                        className="font-bold text-teal-900 dark:text-teal-200 text-2xs truncate block leading-tight"
                        title={job.finishing}
                      >
                        {job.finishing}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-2xs italic">
                        {isBn ? 'কোন ফিনিশিং নেই' : 'None'}
                      </span>
                    )}
                  </div>
                </div>

                {/* 5. ADD-ON */}
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900/90 border border-purple-300/80 dark:border-purple-800/60 shadow-2xs flex flex-col justify-between">
                  <span className="text-2xs font-bold text-purple-800 dark:text-purple-400 uppercase tracking-wide flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-purple-600 dark:text-purple-400 shrink-0" />
                    <span>{isBn ? 'অ্যাড-অন:' : 'Add-on:'}</span>
                  </span>
                  <div className="mt-1">
                    {job.addOns ? (
                      <span
                        className="font-bold text-purple-900 dark:text-purple-200 text-2xs truncate block leading-tight"
                        title={job.addOns}
                      >
                        {job.addOns}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-2xs italic">
                        {isBn ? 'কোন অ্যাড-অন নেই' : 'None'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {job.instructions && (
                <div className="border-t border-slate-200/80 dark:border-slate-700/80 pt-1.5 text-slate-600 dark:text-slate-400">
                  <span className="text-2xs font-bold text-slate-500 block">
                    {isBn ? 'কাস্টমার নির্দেশনা:' : 'Instructions:'}
                  </span>
                  <p className="line-clamp-2 text-2xs italic">{job.instructions}</p>
                </div>
              )}
            </div>
          </div>

          {/* Sequential Production Stages Pipeline Strip */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-500">
                {isBn
                  ? 'প্রোডাকশন ধাপ ও ফ্লোর অগ্রগতি (Production Pipeline):'
                  : 'Production Stages & Progression:'}
              </span>
              <span className="text-2xs text-slate-400 font-mono">
                {job.tasks.filter((t) => t.status === 'completed').length}/{job.tasks.length}{' '}
                {isBn ? 'সম্পন্ন' : 'Done'}
              </span>
            </div>

            <div className="space-y-1.5">
              {job.tasks.map((task, idx) => {
                const isCurrentActive = activeTask?.id === task.id
                const isDone = task.status === 'completed'
                const isRunning = task.status === 'in_progress'
                const isHoldState = task.status === 'on_hold'

                return (
                  <div
                    key={task.id}
                    className={`p-2 rounded-lg text-2xs border transition-all flex items-center justify-between gap-2 ${
                      isRunning
                        ? 'bg-blue-50/80 border-blue-400 dark:bg-blue-950/40 dark:border-blue-700'
                        : isDone
                          ? 'bg-emerald-50/60 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-800 text-slate-600 dark:text-slate-400'
                          : isHoldState
                            ? 'bg-amber-50/60 border-amber-300 dark:bg-amber-950/20 dark:border-amber-800'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className={`h-5 w-5 rounded-full flex items-center justify-center text-2xs font-bold shrink-0 ${
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
                        <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                          {task.task_name}
                        </span>
                        <span className="text-slate-400 font-mono text-2xs">
                          {task.assigned_machine_name || 'Manual (No Machine)'} •{' '}
                          {task.estimated_duration_minutes || 30}m
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5">
                      {isDone ? (
                        <span className="text-2xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-mono">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Done</span>
                        </span>
                      ) : isRunning ? (
                        <span className="text-2xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 font-mono animate-pulse">
                          <Printer className="h-3 w-3" />
                          <span>Printing</span>
                        </span>
                      ) : (
                        <span className="text-2xs text-slate-400 font-mono">Queued</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Active Machine & Operator, Available Material, Floor Consumption & Actions (5 Cols) */}
        <div className="md:col-span-5 flex flex-col justify-between space-y-3">
          {/* Top of right col: Active Execution Box & Blocking Warnings */}
          <div className="space-y-2.5">
            {/* Active Machine & Operator Execution Card */}
            <div className="p-3 bg-gradient-to-br from-slate-50 to-blue-50/40 dark:from-slate-800/80 dark:to-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500 text-2xs uppercase font-bold tracking-wider">
                <span>{isBn ? 'বর্তমান সক্রিয় ধাপ ও মেশিন:' : 'Active Machine & Station:'}</span>
                {isTimerRunning && (
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
                    <span className="text-slate-400 block text-2xs">
                      {isBn ? 'মেশিনারি বহর:' : 'Assigned Machine:'}
                    </span>
                    <strong className="text-slate-800 dark:text-slate-200 truncate block text-2xs">
                      {activeTask?.assigned_machine_name || 'Manual Bench'}
                    </strong>
                  </div>
                </div>

                <div className="flex items-start gap-1.5">
                  <User className="h-3.5 w-3.5 text-indigo-600 mt-0.5 shrink-0" />
                  <div className="truncate">
                    <span className="text-slate-400 block text-2xs">
                      {isBn ? 'দায়িত্বপ্রাপ্ত অপারেটর:' : 'Operator:'}
                    </span>
                    <strong className="text-slate-800 dark:text-slate-200 truncate block text-2xs">
                      {activeTask?.assigned_operator_name || 'Unassigned'}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-2xs text-slate-500 font-mono">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-slate-400" />
                  <span>{activeTask?.estimated_duration_minutes || 30} mins</span>
                </div>
                <span>
                  {activeTask?.quantity || job.quantity} {productionUnit}
                </span>
              </div>

              {/* Printing Material Selection with Available Stock in Floor Consumption */}
              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                <div className="flex items-center justify-between text-2xs">
                  <span className="text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Layers className="h-3 w-3 text-blue-600 shrink-0" />
                    <span>{isBn ? 'প্রিন্টিং মেটেরিয়াল:' : 'Printing Material Selection:'}</span>
                  </span>
                  {selectedMaterial && (
                    <span className="text-2xs text-emerald-600 dark:text-emerald-400 font-bold">
                      Selected ✓
                    </span>
                  )}
                </div>
                <select
                  value={selectedMaterial || activeTask?.required_material || job.material || ''}
                  onChange={(e) => handleMaterialChange(e.target.value)}
                  className="w-full text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="">-- Choose Printing Material --</option>
                  {materialStockList.map((m) => (
                    <option key={m.id || m.name} value={m.name}>
                      {m.name} — {m.current_stock.toLocaleString()} {m.unit} available
                    </option>
                  ))}
                </select>

                {/* Available Material & Floor Consumption Status */}
                <div className="p-2 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-lg text-2xs flex items-center justify-between font-mono">
                  <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 truncate">
                    <Package className="h-3 w-3 text-blue-600 shrink-0" />
                    <span>{isBn ? 'মজুদ:' : 'In Stock:'}</span>
                    <strong className="text-blue-700 dark:text-blue-300">
                      {selectedMaterialStock?.current_stock?.toLocaleString() ?? 500}{' '}
                      {selectedMaterialStock?.unit || productionUnit}
                    </strong>
                  </div>
                  <div className="text-slate-500 shrink-0">
                    <span>{isBn ? 'প্রয়োজন:' : 'Required:'}</span>{' '}
                    <strong className="text-emerald-600 dark:text-emerald-400">
                      {consumedQty} {productionUnit}
                    </strong>
                    {wastageQty > 0 && (
                      <span className="text-amber-600 dark:text-amber-400 ml-1">
                        (+{wastageQty} {productionUnit})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Wastage / Scrap Field (Unit dynamically matches production unit) */}
              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 space-y-1.5 bg-amber-50/60 dark:bg-amber-950/30 p-2 rounded-xl border border-amber-200 dark:border-amber-800/50">
                <div className="flex items-center justify-between text-2xs">
                  <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                    <span>
                      {isBn ? 'ওয়েস্টেজ ও অপচয় (Wastage / Scrap):' : 'Wastage / Scrap Field:'}
                    </span>
                  </span>
                  <span className="text-2xs font-mono font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded">
                    {productionUnit}
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
                      placeholder={
                        isBn
                          ? `অপচয় পরিমাণ (${productionUnit})`
                          : `Wastage qty (${productionUnit})`
                      }
                      className="h-7 text-xs font-mono bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-700"
                    />
                  </div>
                  <div>
                    <select
                      value={wastageReason}
                      onChange={(e) => setWastageReason(e.target.value)}
                      className="h-7 w-full text-2xs rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 px-1 text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
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
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl text-2xs text-rose-900 dark:text-rose-200 flex items-start gap-2">
                <Lock className="h-3.5 w-3.5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">COMMERCIAL HOLD:</span>{' '}
                  {activeTask?.commercial_gate_reason ||
                    'Invoice required before production can start.'}
                </div>
              </div>
            )}

            {/* Design Hold Warning */}
            {activeTask?.is_blocked_by_design_gate &&
              !activeTask?.is_blocked_by_commercial_gate &&
              activeTask?.status !== 'completed' && (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-2xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                  <Lock className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">DESIGN HOLD:</span>{' '}
                    {activeTask?.design_gate_reason || 'Customer design approval required.'}
                  </div>
                </div>
              )}

            {/* Hold Reason Alert */}
            {isHold && activeTask?.hold_reason && (
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-2xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                <AlertOctagon className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">ON HOLD:</span>{' '}
                  {HOLD_REASON_LABELS[activeTask.hold_reason]?.labelEn || activeTask.hold_reason}
                  {activeTask.hold_notes && (
                    <p className="text-2xs opacity-90 mt-0.5">{activeTask.hold_notes}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action Controls Toolbar: Clean, Intuitive Linear Progression */}
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

            {/* Progression & Live Timer Actions */}
            <div className="flex flex-wrap items-center gap-1.5 ml-auto">
              {/* LIVE TIMER BADGE */}
              <ProductionTimerBadge
                startedAt={startedAt}
                completedAt={completedAt}
                durationSeconds={durationSeconds}
                isRunning={isTimerRunning}
              />

              {/* STAGE 4: SENT (To Delivery or Finishing) */}
              {isSent ||
              job.status === 'ready_delivery' ||
              job.status === 'sent_to_delivery' ||
              job.status === 'sent_to_finishing' ||
              (job.status === 'completed' && !hasFinishingAvailable) ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <div className="h-8 px-3 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5 border border-emerald-300 dark:border-emerald-800">
                    {hasFinishingAvailable ? (
                      <>
                        <Scissors className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>{isBn ? 'ফিনিশিং ফ্লোরে প্রেরিত' : 'Sent to Finishing Floor'}</span>
                      </>
                    ) : (
                      <>
                        <Truck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>
                          {isBn ? 'ডেলিভারি ও ডিসপ্যাচে প্রেরিত' : 'Sent to Delivery and Dispatch'}
                        </span>
                      </>
                    )}
                  </div>
                  <Link
                    href={hasFinishingAvailable ? finishingHref : deliveryHref}
                    className="h-8 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors shrink-0"
                  >
                    <span>
                      {hasFinishingAvailable ? 'View in Finishing ➔' : 'View in Dispatch ➔'}
                    </span>
                  </Link>
                </div>
              ) : isPrintCompleted ? (
                /* STAGE 3: PRINT COMPLETE -> DYNAMIC SEND BUTTON */
                <div className="flex items-center gap-1.5 flex-wrap">
                  {hasFinishingAvailable ? (
                    <Button
                      size="sm"
                      onClick={handleSendToNextStage}
                      className="h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Scissors className="h-3.5 w-3.5" />
                      <span>
                        {isBn ? 'ফিনিশিং এ পাঠান (Send to Finishing)' : 'Send to Finishing'}
                      </span>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={handleSendToNextStage}
                      className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Truck className="h-3.5 w-3.5" />
                      <span>
                        {isBn ? 'ডেলিভারিতে পাঠান (Send to Delivery)' : 'Send to Delivery'}
                      </span>
                    </Button>
                  )}
                </div>
              ) : isTimerRunning ? (
                /* STAGE 2: PRINTING RUNNING -> HOLD, PRINT COMPLETE, CANCEL */
                <div className="flex items-center gap-1.5 flex-wrap">
                  {isHold ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleResume}
                      className="h-8 text-xs font-bold border-amber-400 text-amber-800 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 rounded-xl cursor-pointer gap-1"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Resume</span>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleHold}
                      className="h-8 text-xs font-bold border-amber-300 text-amber-800 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 rounded-xl cursor-pointer gap-1"
                    >
                      <Pause className="h-3 w-3" />
                      <span>Hold</span>
                    </Button>
                  )}

                  <Button
                    size="sm"
                    onClick={handlePrintComplete}
                    className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{isBn ? 'প্রিন্ট সম্পন্ন (Print Complete)' : 'Print Complete'}</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancel}
                    className="h-8 text-xs font-semibold px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                /* STAGE 1: QUEUED & READY -> START PRINTING */
                <div className="flex items-center gap-1.5 flex-wrap">
                  {onScheduleTask && activeTask?.status === 'queued' && (
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

                  <Button
                    size="sm"
                    onClick={handleStartPrinting}
                    disabled={
                      activeTask?.is_blocked_by_dependency ||
                      activeTask?.is_blocked_by_commercial_gate ||
                      activeTask?.is_blocked_by_design_gate
                    }
                    className="h-8 text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-3.5 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>{isBn ? 'প্রিন্ট শুরু করুন' : 'Start Printing'}</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})
