'use client'

import React, { useState, use } from 'react'
import Link from 'next/link'
import {
  Printer,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Users,
  Layers,
  Wrench,
  RotateCcw,
  Scissors,
  CheckSquare,
  Square,
  AlertOctagon,
  FileSpreadsheet,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProductionJobRecord, FinishingTask, FabricationTask } from '@/types/production.types'
import { useDataStore } from '@/hooks/use-data-store'
import { STORAGE_KEYS } from '@/lib/db/data-store'

interface ProductionDetailPageProps {
  params: Promise<{ tenantSlug: string; id: string }>
}

const ALL_FINISHING_TASKS: FinishingTask[] = [
  'lamination',
  'cutting',
  'mounting',
  'eyelet',
  'binding',
  'folding',
  'other',
]

const ALL_FABRICATION_TASKS: FabricationTask[] = [
  'welding',
  'painting',
  'frame_making',
  'acrylic_work',
  'led_installation',
]

export default function ProductionJobDetailPage({ params }: ProductionDetailPageProps) {
  const resolvedParams = use(params)
  const jobId = resolvedParams.id
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = company?.slug || 'my-company'

  const [jobs] = useDataStore<ProductionJobRecord[]>(STORAGE_KEYS.PRODUCTION_JOBS, [])
  const job = jobs.find((j) => j.id === jobId || j.production_job_number === jobId)
  const [completedTasks, setCompletedTasks] = useState<string[]>([])

  const toggleTask = (task: string) => {
    if (completedTasks.includes(task)) {
      setCompletedTasks(completedTasks.filter((t) => t !== task))
    } else {
      setCompletedTasks([...completedTasks, task])
    }
  }

  if (!job) {
    return (
      <div className="space-y-6 max-w-6xl">
        <Link
          href={`/${slug}/production`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Production Terminal
        </Link>
        <Card className="p-12 text-center border-dashed">
          <Printer className="h-10 w-10 text-slate-400 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Production Job Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            The production job record you are looking for does not exist in your queue.
          </p>
          <Button asChild className="mt-4" size="sm">
            <Link href={`/${slug}/production`}>View All Production Jobs</Link>
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header & Back Link */}
      <div>
        <Link
          href={`/${slug}/production`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Production Terminal
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white font-mono">
                {job.production_job_number}
              </h1>
              <span className="capitalize px-2.5 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300">
                {job.department}
              </span>
              <span className="capitalize px-2.5 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {job.status.replace('_', ' ')}
              </span>
            </div>
            <div className="text-base font-bold text-slate-800 dark:text-slate-200">
              {job.product_name}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-0.5">
              <span>Customer: <strong>{job.customer_name}</strong></span>
              <span>•</span>
              <span>Deadline: <strong className="text-red-600">{job.deadline}</strong></span>
              <span>•</span>
              <span>Qty: <strong>{job.quantity}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => window.print()}
              className="bg-slate-900 hover:bg-slate-800 text-xs text-white"
            >
              <Printer className="h-3.5 w-3.5 mr-1" />
              Print Traveler Bag
            </Button>
          </div>
        </div>
      </div>

      {/* Rework Alert if active */}
      {job.has_rework && (
        <div className="p-4 rounded-xl bg-red-50 border-2 border-red-500 dark:bg-red-950/40 dark:border-red-600 text-red-950 dark:text-red-100 flex items-start gap-3">
          <AlertOctagon className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-red-900 dark:text-red-200">
              Active Rework Ticket Logged ({job.reworks?.[0]?.rework_number})
            </h3>
            <p className="text-xs text-red-800 dark:text-red-300">
              Reason: <strong>{job.reworks?.[0]?.reason}</strong>
            </p>
            <div className="text-[11px] text-red-700 dark:text-red-400 font-mono">
              Wastage: {job.reworks?.[0]?.material_wastage} • Extra Labor: {job.reworks?.[0]?.extra_labor_hours} hrs • Delay: +{job.reworks?.[0]?.additional_time_hours} hrs
            </div>
          </div>
        </div>
      )}

      {/* Main Specs & Routing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <span className="text-xs font-semibold text-slate-500">Dimensions & Specs</span>
          <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
            {job.dimensions_spec}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Substrate: {job.material_spec}</span>
        </Card>

        <Card className="p-4">
          <span className="text-xs font-semibold text-slate-500">Assigned Machine Crew</span>
          <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
            {job.assigned_workers.join(', ')}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Department: {job.department}</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-blue-500">
          <span className="text-xs font-semibold text-slate-500">Current Production Stage</span>
          <div className="text-lg font-bold text-blue-600 capitalize mt-1">
            {job.stage.replace('_', ' ')}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Status: {job.status}</span>
        </Card>
      </div>

      {/* Department Checklists */}
      {job.department === 'finishing' && (
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Scissors className="h-4 w-4 text-blue-600" />
              Post-Print Finishing Tasks Checklist
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {ALL_FINISHING_TASKS.map((task) => {
                const isChecked = completedTasks.includes(task)
                const isApplicable = job.finishing_tasks?.includes(task)

                return (
                  <button
                    key={task}
                    onClick={() => toggleTask(task)}
                    className={`flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all ${
                      isChecked
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800'
                        : isApplicable
                        ? 'bg-blue-50/50 border-blue-200 text-slate-900 dark:bg-blue-950/20 dark:text-white'
                        : 'border-slate-200 text-slate-400 opacity-60'
                    }`}
                  >
                    {isChecked ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Square className="h-4 w-4 text-slate-400 shrink-0" />
                    )}
                    <div className="text-xs">
                      <div className="font-bold capitalize">{task}</div>
                      <div className="text-[10px]">{isApplicable ? 'Required' : 'Optional'}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {job.department === 'fabrication' && (
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Wrench className="h-4 w-4 text-purple-600" />
              Workshop Fabrication & Assembly Checklist
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ALL_FABRICATION_TASKS.map((task) => {
                const isChecked = completedTasks.includes(task)
                const isApplicable = job.fabrication_tasks?.includes(task)

                return (
                  <button
                    key={task}
                    onClick={() => toggleTask(task)}
                    className={`flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all ${
                      isChecked
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800'
                        : isApplicable
                        ? 'bg-purple-50/50 border-purple-200 text-slate-900 dark:bg-purple-950/20 dark:text-white'
                        : 'border-slate-200 text-slate-400 opacity-60'
                    }`}
                  >
                    {isChecked ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Square className="h-4 w-4 text-slate-400 shrink-0" />
                    )}
                    <div className="text-xs">
                      <div className="font-bold capitalize">{task.replace('_', ' ')}</div>
                      <div className="text-[10px]">{isApplicable ? 'Required' : 'Optional'}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {job.production_instructions && (
        <Card className="p-4 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Machine Operator & Shop Floor Instructions
          </span>
          <p className="text-xs text-slate-800 dark:text-slate-200 mt-1 leading-relaxed font-medium">
            {job.production_instructions}
          </p>
        </Card>
      )}

      {/* Rework History Log */}
      {job.reworks && job.reworks.length > 0 && (
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-red-600" />
              Rework & Material Wastage Audit Log
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-900/80 font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Rework #</th>
                  <th className="py-2.5 px-3">Defect Reason</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Scrapped Material</th>
                  <th className="py-2.5 px-3">Extra Labor</th>
                  <th className="py-2.5 px-3">Delivery Delay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {job.reworks.map((r) => (
                  <tr key={r.id}>
                    <td className="py-3 px-3 font-mono font-bold text-red-600">{r.rework_number}</td>
                    <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">{r.reason}</td>
                    <td className="py-3 px-3 capitalize">{r.responsible_department}</td>
                    <td className="py-3 px-3 font-mono">{r.material_wastage}</td>
                    <td className="py-3 px-3 font-mono">+{r.extra_labor_hours} hrs</td>
                    <td className="py-3 px-3 font-mono text-red-600">+{r.additional_time_hours} hrs</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
