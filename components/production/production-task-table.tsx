'use client'

import React from 'react'
import {
  Play,
  Pause,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  MessageSquare,
  Printer,
  Cpu,
  User,
  Clock,
  Layers,
  Sparkles,
  ShieldAlert,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProductionTaskRecord, ProductionTaskStatus } from '@/types/production.types'
import { LogisticsService } from '@/services/logistics.service'
import { ProductionService } from '@/services/production.service'
import { useI18n } from '@/i18n/context'

export interface ProductionTaskTableProps {
  tasks: ProductionTaskRecord[]
  onStart: (task: ProductionTaskRecord) => void
  onPause: (task: ProductionTaskRecord) => void
  onComplete: (task: ProductionTaskRecord) => void
  onHold: (task: ProductionTaskRecord) => void
  onResume: (task: ProductionTaskRecord) => void
  onPrintTicket: (task: ProductionTaskRecord) => void
  companyName?: string
}

export function ProductionTaskTable({
  tasks,
  onStart,
  onPause,
  onComplete,
  onHold,
  onResume,
  onPrintTicket,
  companyName = 'InkFlow Digital & Offset Press',
}: ProductionTaskTableProps) {
  const { locale, tBilingual } = useI18n()
  const isBn = locale === 'bn'

  const handleSendWhatsApp = (task: ProductionTaskRecord) => {
    const rawMsg = ProductionService.generateBangladeshiFloorWhatsAppMessage(task, companyName)
    const encoded = encodeURIComponent(rawMsg)
    const phone = task.customer_phone?.replace(/[^0-9]/g, '') || ''
    const targetUrl = phone
      ? `https://api.whatsapp.com/send?phone=${phone.startsWith('88') ? phone : '88' + phone}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`
    window.open(targetUrl, '_blank')
  }

  const getStatusBadge = (status: ProductionTaskStatus, task: ProductionTaskRecord) => {
    switch (status) {
      case 'in_progress':
        return (
          <Badge className="bg-blue-600 text-white text-[10px] font-bold gap-1 animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            <span>{isBn ? 'মেশিনে চলমান' : 'Running'}</span>
          </Badge>
        )
      case 'ready':
      case 'scheduled':
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 text-[10px] font-bold">
            {isBn ? 'শিডিউল্ড' : 'Scheduled'}
          </Badge>
        )
      case 'on_hold':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] font-bold gap-1">
            <AlertTriangle className="h-3 w-3 text-amber-600" />
            <span>{isBn ? 'স্থগিতাদেশ' : 'On Hold'}</span>
          </Badge>
        )
      case 'rework':
        return (
          <Badge className="bg-rose-600 text-white text-[10px] font-bold">
            {isBn ? 'রি-ওয়ার্ক' : 'Rework'}
          </Badge>
        )
      case 'completed':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-bold gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            <span>{isBn ? 'সম্পন্ন' : 'Completed'}</span>
          </Badge>
        )
      case 'queued':
      default:
        return (
          <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 text-[10px]">
            {isBn ? 'কিউ' : 'Queued'}
          </Badge>
        )
    }
  }

  if (tasks.length === 0) {
    return (
      <div className="p-12 text-center text-xs text-slate-400">
        <Printer className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
        <p className="font-semibold text-slate-600 dark:text-slate-400">
          {isBn ? 'কোন প্রোডাকশন টাস্ক পাওয়া যায়নি।' : 'No production tasks matching filter criteria.'}
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-xs font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-3 px-4">{isBn ? 'টাস্ক ও জব নং' : 'Task & Job #'}</th>
              <th className="py-3 px-4">{isBn ? 'কাস্টমার ও বিবরণ' : 'Customer & Description'}</th>
              <th className="py-3 px-4">{isBn ? 'ডিপার্টমেন্ট ও মেশিন' : 'Department & Fleet'}</th>
              <th className="py-3 px-4">{isBn ? 'সাইজ ও মিডিয়া' : 'Size & Substrate'}</th>
              <th className="py-3 px-4">{isBn ? 'অবস্থা' : 'Status'}</th>
              <th className="py-3 px-4 text-right">{isBn ? 'অ্যাকশন' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {tasks.map((task) => {
              const sftArea = task.width && task.height
                ? ((task.width * task.height) / (task.dimension_unit === 'inch' ? 144 : 1)).toFixed(1)
                : null

              return (
                <tr key={task.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                  {/* Task & Job # */}
                  <td className="py-3 px-4">
                    <div className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      {task.task_number}
                    </div>
                    <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                      Job: {task.job_number || 'N/A'}
                    </div>
                    {task.priority === 'urgent' && (
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 mt-1">
                        URGENT
                      </span>
                    )}
                  </td>

                  {/* Customer & Description */}
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900 dark:text-white">
                      {task.task_name}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {task.customer_name || 'Direct Client'} • Qty: <strong>{task.quantity} {task.unit || 'pcs'}</strong>
                    </div>
                  </td>

                  {/* Department & Machine */}
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                      {task.department}
                    </div>
                    <div className="text-[11px] text-blue-600 dark:text-blue-400 font-mono mt-0.5 flex items-center gap-1">
                      <Cpu className="h-3 w-3 text-slate-400" />
                      <span>{task.assigned_machine_name || 'Floor Bench'}</span>
                    </div>
                  </td>

                  {/* Size & Substrate */}
                  <td className="py-3 px-4 font-mono">
                    {task.width && task.height ? (
                      <div>
                        {task.width} × {task.height} {task.unit || 'in'}
                        {sftArea && <span className="text-slate-400 ml-1">({sftArea} SFT)</span>}
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                    <div className="text-[10px] text-slate-500 font-sans truncate max-w-[140px] mt-0.5">
                      {task.required_material || 'Press Substrate'}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4">
                    {getStatusBadge(task.status, task)}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Job Card Ticket */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onPrintTicket(task)}
                        title={isBn ? 'জব কার্ড প্রিন্ট' : 'Print Job Card'}
                        className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900"
                      >
                        <FileCheck2 className="h-3.5 w-3.5" />
                      </Button>

                      {/* WhatsApp Notice */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSendWhatsApp(task)}
                        title={isBn ? 'হোয়াটসঅ্যাপ আপডেট' : 'WhatsApp Notice'}
                        className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </Button>

                      {/* Execution Action based on status */}
                      {task.status === 'in_progress' ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onPause(task)}
                            className="h-7 text-[11px] px-2 border-amber-300 text-amber-800 hover:bg-amber-50"
                          >
                            <Pause className="h-3 w-3 mr-1" />
                            {isBn ? 'পজ' : 'Pause'}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => onComplete(task)}
                            className="h-7 text-[11px] px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {isBn ? 'সম্পন্ন' : 'Done'}
                          </Button>
                        </>
                      ) : task.status === 'on_hold' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onResume(task)}
                          className="h-7 text-[11px] px-2 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                        >
                          <Play className="h-3 w-3 mr-1" />
                          {isBn ? 'রিজিউম' : 'Resume'}
                        </Button>
                      ) : task.status !== 'completed' ? (
                        <Button
                          size="sm"
                          onClick={() => onStart(task)}
                          className="h-7 text-[11px] px-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                        >
                          <Play className="h-3 w-3 mr-1" />
                          {isBn ? 'স্টার্ট' : 'Start'}
                        </Button>
                      ) : (
                        <span className="text-[11px] text-emerald-600 font-bold">
                          ✓ Complete
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
        {tasks.map((task) => (
          <div key={task.id} className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                {task.task_number}
              </span>
              {getStatusBadge(task.status, task)}
            </div>

            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">{task.task_name}</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                {task.customer_name} • Qty: {task.quantity} {task.unit}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 text-xs border border-slate-100 dark:border-slate-800 font-mono">
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">Machine</span>
                <strong>{task.assigned_machine_name || 'Floor Bench'}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">Substrate</span>
                <span className="truncate block">{task.required_material || 'Standard'}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 gap-2">
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onPrintTicket(task)}
                  className="h-8 text-xs gap-1"
                >
                  <FileCheck2 className="h-3.5 w-3.5 text-blue-600" />
                  <span>Ticket</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSendWhatsApp(task)}
                  className="h-8 text-xs gap-1 text-emerald-600 border-emerald-200"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>WA</span>
                </Button>
              </div>

              <div>
                {task.status === 'in_progress' ? (
                  <Button
                    size="sm"
                    onClick={() => onComplete(task)}
                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Complete
                  </Button>
                ) : task.status !== 'completed' ? (
                  <Button
                    size="sm"
                    onClick={() => onStart(task)}
                    className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  >
                    <Play className="h-3.5 w-3.5 mr-1" />
                    Start
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
