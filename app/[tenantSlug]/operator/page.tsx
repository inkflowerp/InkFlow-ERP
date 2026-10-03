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
 MoreVertical,
 Eye,
 RefreshCw,
 Copy,
 ExternalLink,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { useTenant } from '@/hooks/use-tenant'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { PageHeader } from '@/components/shared/page-header'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'
import { KpiCard, KpiGrid } from '@/components/shared/kpi-card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
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
import { CompleteTaskModal } from '@/components/production/complete-task-modal'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'

function MobileOperatorPanelContent() {
 const { locale, tBilingual } = useI18n()
 const isBn = locale === 'bn'
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
 const all = PrintERPDataStore.get<MachineryRecord[]>(STORAGE_KEYS.MACHINERIES) || []
 const presetKeys = ['heidelberg_sm74', 'roland_truevis', 'polar_115x', 'fuji_xerox_c1000i', 'manual_finishing']
 return all.filter((m) => !presetKeys.includes(m.id) && (!m.company_id || m.company_id === (company?.id || slug)))
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
 const [activeMenuTaskId, setActiveMenuTaskId] = useState<string | null>(null)

  // Live timer tick for running jobs
 const [timerTick, setTimerTick] = useState<number>(0)
 useEffect(() => {
 if (!mounted) return
 const interval = setInterval(() => {
 setTimerTick((prev) => prev + 1)
    }, 1000)
 return () => clearInterval(interval)
  }, [mounted])

  // Close 3-dot dropdown menu on outside click
 useEffect(() => {
 const handleDocClick = (e: MouseEvent) => {
 const target = e.target as HTMLElement | null
 if (!target?.closest('[data-operator-queue-menu]')) {
 setActiveMenuTaskId(null)
      }
    }
 if (typeof window !== 'undefined') {
 window.addEventListener('click', handleDocClick)
    }
 return () => {
 if (typeof window !== 'undefined') {
 window.removeEventListener('click', handleDocClick)
      }
    }
  }, [])

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
 const effCompany = company?.id || (slug !== 'my-company' ? slug : 'default')
 const [taskRes, machRes] = await Promise.all([
 getProductionTasksAction(undefined, effCompany),
 getMachineriesAction({ status: 'all' }, effCompany),
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
 taskMap.set(task1.id, task1)
 const hasFinishing = Boolean(
              (dj.finishing &&
 dj.finishing.toLowerCase().trim() !== 'none' &&
 dj.finishing.trim() !== 'কোন ফিনিশিং নেই' &&
 dj.finishing.trim() !== 'no' &&
 dj.finishing.trim() !== '') ||
              (dj.selected_finishing && dj.selected_finishing.length > 0)
            )
 if (hasFinishing) {
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
 taskMap.set(task2.id, task2)
            }
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

 if (machRes.success && machRes.data) {
 const presetKeys = ['heidelberg_sm74', 'roland_truevis', 'polar_115x', 'fuji_xerox_c1000i', 'manual_finishing']
 const cleanedMachineries = machRes.data.filter((m) => !presetKeys.includes(m.id))
 setMachineries(cleanedMachineries)
 try {
 PrintERPDataStore.set(STORAGE_KEYS.MACHINERIES, cleanedMachineries, false)
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
 showNotification(tBilingual(`Started production for ${task.task_name}`, `${task.task_name} এর উৎপাদন শুরু হয়েছে`))
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

 const handlePauseTask = async (task: ProductionTaskRecord) => {
 if (actionInProgressTaskId) return
 setActionInProgressTaskId(task.id)
 try {
 const res = await pauseProductionTaskAction(task.id, 'Operator paused task from terminal', undefined, task)
 if (res.success) {
 showNotification(tBilingual(`Task #${task.task_number} paused.`, `টাস্ক #${task.task_number} সাময়িক স্থগিত করা হয়েছে।`))
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

 const handleResumeTask = async (task: ProductionTaskRecord) => {
 if (actionInProgressTaskId) return
 setActionInProgressTaskId(task.id)
 try {
 const res = await startProductionTaskAction(task.id, false, undefined, task)
 if (res.success) {
 showNotification(tBilingual(`Task #${task.task_number} resumed.`, `টাস্ক #${task.task_number} পুনরায় চালু হয়েছে।`))
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

 const handleCopyTaskInfo = (task: ProductionTaskRecord) => {
 if (typeof navigator !== 'undefined' && navigator.clipboard) {
 navigator.clipboard.writeText(`${task.task_number} - ${task.task_name} (Job: #${task.job_number || 'N/A'}, Qty: ${task.quantity} ${task.unit})`)
 showNotification(tBilingual('Task info copied to clipboard!', 'টাস্ক তথ্য কপি করা হয়েছে!'))
    }
 setActiveMenuTaskId(null)
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
 const nextTask = res.data?.nextReadyTask
 if (nextTask && (nextTask.department === 'finishing' || nextTask.task_type === 'finishing')) {
 showNotification(
 isBn
              ? `প্রিন্ট সম্পন্ন! কাজটি সফলভাবে ফিনিশিং ও ফেব্রিকেশন ফ্লোরে প্রেরিত হয়েছে (Sent to Finishing & Fabrication Floor)।`
              : `Printing completed! Sent to Finishing & Fabrication Floor.`
          )
        } else {
 showNotification(
 isBn
              ? `প্রিন্ট সম্পন্ন! ফিনিশিং প্রয়োজন না থাকায় সরাসরি ডেলিভারি ও ডিসপ্যাচে প্রেরিত হয়েছে (Sent to Delivery & Dispatch)।`
              : `Printing completed! Sent directly to Delivery and Dispatch.`
          )
        }
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
 showNotification(tBilingual('Machine breakdown logged! Station placed in Breakdown.', 'মেশিন নষ্টের তথ্য লিপিবদ্ধ হয়েছে এবং স্টেশন ডাউন করা হয়েছে।'))
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

  // Department counts for filter badges
 const departmentCounts = {
 all: tasks.length,
 printing: tasks.filter((t) => t.department === 'printing' || t.task_type === 'printing').length,
 finishing: tasks.filter((t) => t.department === 'finishing' || t.task_type === 'finishing' || t.task_type === 'lamination' || t.task_type === 'cutting').length,
 fabrication: tasks.filter((t) => t.department === 'fabrication' || t.task_type === 'fabrication' || t.task_type === 'mounting').length,
  }

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
      <div className="space-y-6 max-w-[1600px] mx-auto pb-12 p-4 sm:p-6 lg:p-8 animate-pulse">
        <div className="h-12 bg-muted rounded-xl w-1/3"/>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-xl"/>
          ))}
        </div>
        <div className="h-16 bg-muted rounded-xl w-full"/>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-xl"/>
          ))}
        </div>
      </div>
    )
  }

 return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <PageHeader
 titleEn="Shop Floor Terminal"titleBn="শপ ফ্লোর টার্মিনাল ও মেশিন কিউ"descriptionEn="Live touch-optimized terminal: Select machine station, execute jobs, monitor runtime, and sign off scrap."descriptionBn="সহজ ও দ্রুত টার্মিনাল: মেশিন স্টেশন সিলেক্ট করুন, কাজ পরিচালনা করুন এবং মান যাচাই সম্পন্ন করুন।"icon={Printer}
 iconColor="text-blue-600"actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
 variant="outline"size="sm"onClick={() => loadData()}
 disabled={loading}
 className="text-xs bangla-text flex items-center gap-1.5 border-border cursor-pointer">
              <RefreshCw className={cn('h-3.5 w-3.5 text-muted-foreground ', loading && 'animate-spin')} />
              <span>{tBilingual('Refresh', 'রিফ্রেশ')}</span>
            </Button>
            <Link href={getTenantNavHref('/production', pathname, slug)}>
              <Button variant="outline"size="sm"className="text-xs bangla-text flex items-center gap-1.5 border-border">
                <LayoutGrid className="h-3.5 w-3.5 text-indigo-600"/>
                {tBilingual('Production Board', 'প্রোডাকশন বোর্ড')}
              </Button>
            </Link>
            <Link href={getTenantNavHref('/production/machineries', pathname, slug)}>
              <Button variant="outline"size="sm"className="text-xs bangla-text flex items-center gap-1.5 border-border">
                <Cpu className="h-3.5 w-3.5 text-blue-600"/>
                {tBilingual('Machinery Fleet', 'মেশিন বহর')}
              </Button>
            </Link>
          </div>
        }
      />

      {/* Notifications */}
      {notification && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0"/>
          <span>{notification}</span>
        </div>
      )}

      {/* KPI FLOOR OVERVIEW CARDS */}
      <KpiGrid columns={5}>
        {/* Running Now */}
        <KpiCard
 titleEn="Running Now"titleBn="চলমান কাজ"value={activeTasks.filter((t) => t.status === 'in_progress').length}
 subtitleEn="Active on stations"subtitleBn="স্টেশনে কর্মরত"colorVariant="emerald"isLive={true}
        />

        {/* Paused Tasks */}
        <KpiCard
 titleEn="Paused"titleBn="স্থগিত"value={activeTasks.filter((t) => t.status === 'paused').length}
 subtitleEn="Temporarily halted"subtitleBn="সাময়িকভাবে বন্ধ"icon={Pause}
 colorVariant="amber"/>

        {/* Upcoming In Queue */}
        <KpiCard
 titleEn="In Queue"titleBn="কিউতে অপেক্ষমাণ"value={upcomingTasks.length}
 subtitleEn="Ready to execute"subtitleBn="উৎপাদনের জন্য প্রস্তুত"icon={Layers}
 colorVariant="blue"/>

        {/* On Hold */}
        <KpiCard
 titleEn="On Hold"titleBn="হোল্ড কৃত"value={heldTasks.length}
 subtitleEn="Needs attention"subtitleBn="পর্যালোচনা প্রয়োজন"icon={AlertOctagon}
 colorVariant="rose"/>

        {/* Machinery Fleet */}
        <KpiCard
 titleEn="Fleet In-Use"titleBn="সচল মেশিন"value={machineries.filter((m) => m.status === 'in_use').length}
 unit={`/ ${machineries.length} total`}
 subtitleEn="Active workstations"subtitleBn="কর্মরত মেশিন"icon={Cpu}
 colorVariant="indigo"className="col-span-2 sm:col-span-4 lg:col-span-1"/>
      </KpiGrid>

      {/* DEPARTMENT / STATION TABS & QUICK SHORTCUTS */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 p-1 bg-muted rounded-lg overflow-x-auto">
          {[
            { id: 'all', label: 'All Operations', labelBn: 'সকল কাজ' },
            { id: 'printing', label: 'Printing Floor', labelBn: 'প্রিন্টিং' },
            { id: 'finishing', label: 'Finishing Floor', labelBn: 'ফিনিশিং' },
            { id: 'fabrication', label: 'Signage Fabrication', labelBn: 'ফেব্রিকেশন' },
          ].map((tab) => (
            <button
 key={tab.id}
 onClick={() => setSelectedDepartment(tab.id as any)}
 className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
 selectedDepartment === tab.id
                  ? 'bg-card text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground dark:hover:text-foreground'
              }`}
            >
              <span>{tBilingual(tab.label, tab.labelBn)}</span>
              <span
 className={`text-2xs px-1.5 py-0.5 rounded-full tabular-nums ${
 selectedDepartment === tab.id
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
                    : 'bg-muted/80 text-muted-foreground '
                }`}
              >
                {departmentCounts[tab.id as keyof typeof departmentCounts] || 0}
              </span>
            </button>
          ))}
        </div>

        <Link
 href={getTenantNavHref('/finishing', pathname, slug)}
 className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-3.5 py-2 rounded-lg border border-blue-200 dark:border-blue-800 flex items-center gap-1.5 transition-colors">
          <Scissors className="h-3.5 w-3.5"/>
          <span>{tBilingual('Finishing & Fabrication Floor ➔', 'ফিনিশিং ও ফেব্রিকেশন ফ্লোর ➔')}</span>
        </Link>
      </div>

      {/* MACHINE STATION SELECTOR & SEARCH */}
      <Card className="border border-border bg-card shadow-xs">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Cpu className="h-4 w-4 text-blue-600"/>
              {tBilingual('Active Workstation / Machine Station', 'বর্তমান মেশিন স্টেশন')}
            </Label>
            {selectedStationMachine && (
              <Badge
 className={`text-2xs uppercase font-semibold ${
 selectedStationMachine.status === 'in_use'
                    ? 'bg-blue-600 text-white'
                    : selectedStationMachine.status === 'available'
                    ? 'bg-emerald-600 text-white'
                    : selectedStationMachine.status === 'breakdown'
                    ? 'bg-rose-600 text-white'
                    : 'bg-amber-600 text-white'
                }`}
              >
                {selectedStationMachine.status}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
 value={selectedStationMachineId}
 onChange={(e) => setSelectedStationMachineId(e.target.value)}
 className="w-full text-xs font-medium rounded-md border border-input bg-muted px-3 py-2 text-foreground shadow-xs focus:border-blue-500 focus:outline-hidden">
              <option value="all">{tBilingual("⚡ All Machines & Stations", "⚡ সকল মেশিন ও স্টেশন")}</option>
              <option value="manual">{tBilingual('✋ Manual / Hand Work Stations', '✋ ম্যানুয়াল / হাতের কাজের স্টেশন')}</option>
              {machineries.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.code}) — [{m.status.toUpperCase()}]
                </option>
              ))}
            </select>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground"/>
              <Input
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder={tBilingual('Search Job #, task, customer...', 'জব নম্বর, টাস্ক খুঁজুন...')}
 className="pl-8 text-xs h-9"/>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ACTIVE RUNNING TASKS SECTION */}
      {activeTasks.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span>{tBilingual('CURRENTLY ACTIVE TASKS', 'বর্তমানে সক্রিয় কাজ')} ({activeTasks.length})</span>
            </span>
            <span className="text-2xs text-emerald-600 dark:text-emerald-400 tabular-nums font-semibold">Live Telemetry Active</span>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {activeTasks.map((task) => {
 const elapsedTime = getElapsedTimeString(task.actual_start)
 const estMinutes = task.estimated_duration_minutes || 30
 const isPaused = task.status === 'paused'

 return (
                <Card
 key={task.id}
 className={cn(
                    'transition-all shadow-xs',
 isPaused
                      ? 'border-2 border-amber-500 bg-amber-50/30 dark:bg-amber-950/20'
                      : 'border-2 border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20'
                  )}
                >
                  <CardContent className="p-4 space-y-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
 href={getTenantNavHref(`/production/${task.job_order_id || task.job_number || task.id}`, pathname, slug)}
                          >
                            <Badge className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors">
 Job #{task.job_number || 'N/A'}
                            </Badge>
                          </Link>
                          <span className="text-xs tabular-nums text-muted-foreground">{task.task_number}</span>
                          <Badge
 className={cn(
                              'text-2xs uppercase font-bold tracking-wider',
 isPaused ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'
                            )}
                          >
                            {isPaused ? tBilingual('PAUSED', 'স্থগিত') : tBilingual('RUNNING', 'চলমান')}
                          </Badge>
                        </div>
                        <h3 className="text-base font-bold text-foreground mt-1 truncate">
                          {task.task_name}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate">
                          {task.customer_name} • {task.product_name}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xl font-bold text-foreground">
                          {task.quantity} <span className="text-xs font-normal text-muted-foreground">{task.unit}</span>
                        </div>
                        {task.width && task.height && (
                          <div className="text-2xs text-muted-foreground font-medium">
                            {task.width} × {task.height} in
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Machine & Live Runtime Ticker */}
                    <div
 className={cn(
                        'p-3 rounded-lg border flex items-center justify-between text-xs',
 isPaused
                          ? 'bg-amber-100/60 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
                          : 'bg-card border-border '
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Cpu className={cn('h-4 w-4 shrink-0', isPaused ? 'text-amber-600' : 'text-blue-600')} />
                        <div>
                          <span className="font-bold text-foreground">
                            {task.assigned_machine_name || 'Manual Station'}
                          </span>
                          <span className="text-muted-foreground block text-2xs">
                            {task.required_material ? `Media: ${task.required_material}` : 'Direct Execution'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        {isPaused ? (
                          <div className="text-sm font-bold tabular-nums text-amber-700 dark:text-amber-400 flex items-center gap-1.5 justify-end">
                            <Pause className="h-3.5 w-3.5"/>
                            <span>Paused at {elapsedTime}</span>
                          </div>
                        ) : (
                          <div className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 justify-end">
                            <Activity className="h-3.5 w-3.5 animate-spin text-emerald-500"/>
                            <span>{elapsedTime}</span>
                          </div>
                        )}
                        <span className="text-2xs text-muted-foreground">
 Target: {estMinutes} mins
                        </span>
                      </div>
                    </div>

                    {/* Touch Buttons */}
                    <div
 className={cn(
                        'grid gap-2 pt-1',
 task.assigned_machine_id ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'
                      )}
                    >
                      {/* 1. Pause or Resume Button */}
                      {isPaused ? (
                        <Button
 size="lg"variant="default"onClick={() => handleResumeTask(task)}
 disabled={!!actionInProgressTaskId}
 className="min-h-[48px] h-12 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer">
                          <Play className="h-4 w-4 mr-1.5 fill-current"/>
                          {tBilingual('Resume', 'চালু করুন')}
                        </Button>
                      ) : (
                        <Button
 size="lg"variant="outline"onClick={() => handlePauseTask(task)}
 disabled={!!actionInProgressTaskId}
 className="min-h-[48px] h-12 text-xs font-bold border-amber-300 text-amber-800 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 cursor-pointer">
                          <Pause className="h-4 w-4 mr-1.5"/>
                          {tBilingual('Pause', 'স্থগিত')}
                        </Button>
                      )}

                      {/* 2. Hold / Problem Button */}
                      <Button
 size="lg"variant="outline"onClick={() => setSelectedTaskForHold(task)}
 disabled={!!actionInProgressTaskId}
 className="min-h-[48px] h-12 text-xs font-bold border-rose-300 text-rose-800 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 cursor-pointer">
                        <AlertOctagon className="h-4 w-4 mr-1.5"/>
                        {tBilingual('Hold', 'হোল্ড')}
                      </Button>

                      {/* 3. Breakdown Button (If Machine is Assigned) */}
                      {task.assigned_machine_id && (
                        <Button
 size="lg"variant="outline"onClick={() => {
 setBreakdownTask(task)
 setBreakdownTitle(`Breakdown during #${task.task_number}`)
 setBreakdownDesc(`Machine failure on ${task.assigned_machine_name} while processing ${task.task_name}.`)
                          }}
 className="min-h-[48px] h-12 text-xs font-bold border-rose-400 text-rose-700 hover:bg-rose-50 dark:border-rose-800 cursor-pointer">
                          <Wrench className="h-4 w-4 mr-1.5 text-rose-600"/>
                          {tBilingual('Breakdown', 'নষ্ট')}
                        </Button>
                      )}

                      {/* 4. Complete Button */}
                      <Button
 size="lg"variant="default"onClick={() => handleOpenCompleteModal(task)}
 disabled={!!actionInProgressTaskId}
 className="min-h-[48px] h-12 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer">
                        <CheckCircle2 className="h-4 w-4 mr-1.5"/>
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
      <div className="space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-blue-600"/>
            <span>{tBilingual('UPCOMING IN QUEUE', 'পরবর্তী কিউ')} ({upcomingTasks.length})</span>
          </span>
          <span className="text-2xs text-muted-foreground font-medium">{tBilingual("Tap Start to begin production or use 3-dot menu for actions", "কাজ শুরু করতে স্টার্ট চাপুন বা অন্যান্য অ্যাকশনের জন্য ৩-ডট মেনু ব্যবহার করুন")}</span>
        </div>

        <div className="space-y-2.5">
          {upcomingTasks.map((task, idx) => (
            <Card
 key={task.id}
 className="border border-border bg-card hover:border-input transition-colors shadow-xs">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
 href={getTenantNavHref(`/production/${task.job_order_id || task.job_number || task.id}`, pathname, slug)}
                    >
                      <Badge variant="outline"className="text-2xs tabular-nums font-bold hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-700 cursor-pointer transition-colors border-input">
                        #{task.job_number || task.task_number}
                      </Badge>
                    </Link>
                    <span className="text-sm font-bold text-foreground truncate">
                      {task.task_name}
                    </span>
                    {task.priority === 'urgent' || task.priority === 'very_urgent' ? (
                      <Badge className="bg-rose-50 text-rose-700 border border-rose-200 text-2xs font-semibold">
                        {tBilingual('Urgent', 'জরুরি')}
                      </Badge>
                    ) : null}
                  </div>

                  <div className="text-xs text-muted-foreground flex items-center gap-2.5 flex-wrap">
                    <span className="font-medium text-foreground">{task.customer_name}</span>
                    <span>•</span>
                    <span className="font-semibold text-foreground tabular-nums">
                      {task.quantity} {task.unit}
                    </span>
                    {task.width && task.height && (
                      <>
                        <span>•</span>
                        <span>{task.width} × {task.height} in</span>
                      </>
                    )}
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400">
                      <Cpu className="h-3.5 w-3.5"/>
                      {task.assigned_machine_name || 'Manual Station'}
                    </span>
                    {task.required_material && (
                      <>
                        <span>•</span>
                        <span className="text-muted-foreground">Media: {task.required_material}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Primary Action Button + 3-Dot Dropdown Menu */}
                <div className="shrink-0 flex items-center gap-2"data-operator-queue-menu>
                  <Button
 size="sm"variant="default"onClick={() => handleStartTask(task)}
 disabled={task.is_blocked_by_dependency || !!actionInProgressTaskId}
 className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-1.5 font-bold min-h-[44px] h-11 px-4 shadow-xs cursor-pointer">
                    <Play className="h-4 w-4 fill-current"/>
                    <span>{tBilingual('Start', 'শুরু')}</span>
                  </Button>

                  <div className="relative">
                    <Button
 size="sm"variant="outline"onClick={(e) => {
 e.stopPropagation()
 setActiveMenuTaskId(activeMenuTaskId === task.id ? null : task.id)
                      }}
 className={cn(
                        'min-h-[44px] h-11 w-11 p-0 rounded-md border-border transition-colors cursor-pointer flex items-center justify-center',
 activeMenuTaskId === task.id
                          ? 'bg-muted text-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-muted'
                      )}
 title={tBilingual('Actions', 'অ্যাকশন')}
 aria-label="Queue Task Actions">
                      <MoreVertical className="h-4 w-4"/>
                    </Button>

                    {activeMenuTaskId === task.id && (
                      <div
 className={cn(
                          'absolute right-0 w-52 bg-card border border-border rounded-xl shadow-xs z-50 py-1.5 text-xs animate-in fade-in-0 zoom-in-95 duration-100',
 idx >= upcomingTasks.length - 2 && upcomingTasks.length >= 3
                            ? 'bottom-full mb-1'
                            : 'top-full mt-1'
                        )}
                      >
                        {/* 1. View Job Details */}
                        <Link
 href={getTenantNavHref(`/production/${task.job_order_id || task.job_number || task.id}`, pathname, slug)}
 onClick={() => setActiveMenuTaskId(null)}
 className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2.5 text-foreground transition-colors">
                          <Eye className="h-3.5 w-3.5 text-blue-500 shrink-0"/>
                          <span className="font-medium">{tBilingual('View Job Details', 'জব বিস্তারিত দেখুন')}</span>
                        </Link>

                        {/* 2. Place on Hold */}
                        <button
 type="button"onClick={() => {
 setActiveMenuTaskId(null)
 setSelectedTaskForHold(task)
                          }}
 className="w-full text-left px-3 py-2 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-2.5 text-amber-700 dark:text-amber-400 transition-colors cursor-pointer">
                          <AlertOctagon className="h-3.5 w-3.5 shrink-0"/>
                          <span>{tBilingual('Place Task on Hold', 'টাস্ক হোল্ড করুন')}</span>
                        </button>

                        {/* 3. Report Machine Breakdown */}
                        {task.assigned_machine_id && (
                          <button
 type="button"onClick={() => {
 setActiveMenuTaskId(null)
 setBreakdownTask(task)
 setBreakdownTitle(`Breakdown for queue task #${task.task_number}`)
 setBreakdownDesc(`Machine issue on ${task.assigned_machine_name} before starting ${task.task_name}.`)
                            }}
 className="w-full text-left px-3 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 text-rose-700 dark:text-rose-400 transition-colors cursor-pointer">
                            <Wrench className="h-3.5 w-3.5 shrink-0"/>
                            <span>{tBilingual('Report Station Breakdown', 'মেশিন নষ্ট রিপোর্ট')}</span>
                          </button>
                        )}

                        {/* 4. Copy Task Info */}
                        <button
 type="button"onClick={() => handleCopyTaskInfo(task)}
 className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2.5 text-muted-foreground transition-colors border-t border-border cursor-pointer">
                          <Copy className="h-3.5 w-3.5 shrink-0"/>
                          <span>{tBilingual('Copy Task Info', 'টাস্ক তথ্য কপি করুন')}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {upcomingTasks.length === 0 && activeTasks.length === 0 && (
            <Card className="p-10 text-center border-dashed border-border">
              <Printer className="h-10 w-10 text-muted-foreground mx-auto mb-2.5 opacity-60"/>
              <p className="text-sm font-semibold text-foreground">
                {tBilingual('No active jobs in your queue!', 'আপনার কিউতে কোনো কাজ অপেক্ষমাণ নেই!')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {tBilingual('Jobs approved from design or scheduled from production board will appear here.', 'ডিজাইন অনুমোদিত বা প্রোডাকশন বোর্ড থেকে নির্ধারিত কাজ এখানে প্রদর্শিত হবে।')}
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* HELD TASKS SECTION (IF ANY) */}
      {heldTasks.length > 0 && (
        <div className="space-y-3 pt-3 border-t border-border">
          <div className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-2">
            <AlertOctagon className="h-4 w-4"/>
            <span>{tBilingual('ON HOLD / PROBLEM TASKS', 'হোল্ড কৃত কাজ')} ({heldTasks.length})</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {heldTasks.map((task) => (
              <Card key={task.id} className="border border-rose-200 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-950/20 p-4">
                <div className="flex items-center justify-between text-xs gap-3">
                  <div className="min-w-0">
                    <Link
 href={getTenantNavHref(`/production/${task.job_order_id || task.job_number || task.id}`, pathname, slug)}
                    >
                      <span className="font-bold text-foreground hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer block truncate">
                        #{task.job_number || task.task_number}: {task.task_name}
                      </span>
                    </Link>
                    <p className="text-2xs text-rose-800 dark:text-rose-300 mt-1">
 Reason: <span className="font-semibold">{task.hold_reason || 'Under inspection'}</span>{' '}
                      {task.hold_notes ? `(${task.hold_notes})` : ''}
                    </p>
                  </div>
                  <Badge variant="outline"className="border-rose-300 text-rose-800 dark:text-rose-300 text-2xs shrink-0">
 On Hold
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* COMPLETE PRODUCTION TASK MODAL WITH DEFECT REASONS & DIMENSIONAL ROLL ENGINE */}
      <CompleteTaskModal
 isOpen={!!selectedTaskForComplete}
 onClose={() => setSelectedTaskForComplete(null)}
 task={selectedTaskForComplete}
 onComplete={async (taskId, completionData) => {
 const res = await completeProductionTaskAction(
 taskId,
 completionData,
 undefined,
 selectedTaskForComplete || undefined
          )
 if (res.success) {
 showNotification(
 tBilingual(
                `Production signed off! Good: ${completionData.good_quantity}, Scrap: ${completionData.rejected_quantity}`,
                `উৎপাদন সম্পন্ন! ভালো পণ্য: ${completionData.good_quantity}, নষ্ট: ${completionData.rejected_quantity}`
              )
            )
 setSelectedTaskForComplete(null)
 loadData()
          } else {
 showNotification(`Error: ${res.error}`)
 throw new Error(res.error || 'Failed to complete task.')
          }
        }}
      />

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
            <p className="text-2xs opacity-90">
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
 placeholder={tBilingual("e.g. Printhead error / Motor driver malfunction...", "যেমন: প্রিন্টহেড সমস্যা / মোটর ড্রাইভার ত্রুটি...")}className="text-xs"/>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              {tBilingual('Problem Description', 'সমস্যার বিস্তারিত বিবরণ')}
            </Label>
            <Input
 required
 value={breakdownDesc}
 onChange={(e) => setBreakdownDesc(e.target.value)}
 placeholder={tBilingual("Explain the symptom observed...", "কী সমস্যা দেখা যাচ্ছে তা লিখুন...")}className="text-xs"/>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
 type="button"variant="outline"size="sm"onClick={() => setBreakdownTask(null)}
 disabled={isSubmittingBreakdown}
 className="text-xs">
              {tBilingual('Cancel', 'বাতিল')}
            </Button>
            <Button
 type="submit"variant="default"size="sm"disabled={isSubmittingBreakdown}
 className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold">
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
 showNotification(tBilingual('Problem reported and task placed on hold.', 'সমস্যা রিপোর্ট করা হয়েছে এবং টাস্ক হোল্ডে রাখা হয়েছে।'))
 setSelectedTaskForHold(null)
 loadData()
        }}
      />
    </div>
  )
}

export default function MobileOperatorPanelPage() {
 return (
    <PanelAccessGuard
 module="production"action="view"panelTitle="Shop Floor Terminal"panelTitleBn="অপারেটর টার্মিনাল">
      <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading operator workstation...</div>}>
        <MobileOperatorPanelContent />
      </Suspense>
    </PanelAccessGuard>
  )
}
