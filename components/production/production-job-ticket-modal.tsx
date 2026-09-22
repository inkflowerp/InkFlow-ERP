'use client'

import React from 'react'
import {
  Printer,
  FileCheck2,
  Calendar,
  Clock,
  Cpu,
  User,
  MapPin,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Scissors,
  Layers,
  Sparkles,
} from 'lucide-react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProductionTaskRecord } from '@/types/production.types'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'

export interface JobTicketPrintModalProps {
  isOpen: boolean
  onClose: () => void
  task: ProductionTaskRecord | null
}

export function JobTicketPrintModal({
  isOpen,
  onClose,
  task,
}: JobTicketPrintModalProps) {
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const isBn = locale === 'bn'

  if (!task) return null

  const handlePrint = () => {
    window.print()
  }

  const sftArea = task.width && task.height
    ? ((task.width * task.height) / (task.dimension_unit === 'inch' ? 144 : 1)).toFixed(2)
    : null

  return (
    <ModalDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      size="2xl"
      title={
        <div className="flex items-center gap-2">
          <FileCheck2 className="h-5 w-5 text-blue-600" />
          <span className="text-base font-bold">
            {isBn ? 'প্রেস ফ্লোর জব কার্ড / কাজের নির্দেশিকা' : 'Press Floor Job Ticket / Work Order'}
          </span>
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        {/* Print Toolbar */}
        <div className="print:hidden flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500">
            {isBn
              ? 'মেশিন অপারেটরের ক্লিপবোর্ডে যুক্ত করার জন্য প্রিন্ট করুন'
              : 'Print official 1-page shop floor routing card for machine operator'}
          </div>
          <Button
            size="sm"
            onClick={handlePrint}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs h-8 gap-1.5 shadow-xs"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>{isBn ? 'জব কার্ড প্রিন্ট' : 'Print Job Card'}</span>
          </Button>
        </div>

        {/* =========================================================================
            OFFICIAL PRINTABLE PRESS JOB TICKET (জব কার্ড)
           ========================================================================= */}
        <div className="bg-white text-slate-900 p-6 sm:p-8 rounded-xl border border-slate-300 dark:border-slate-700 text-xs space-y-4 shadow-xs print:border-none print:shadow-none print:p-0">
          {/* Header */}
          <div className="text-center space-y-1 pb-3 border-b-2 border-slate-900 relative">
            <div className="absolute right-0 top-0 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 font-bold border border-slate-400">
              TASK: {task.task_number}
            </div>
            <h1 className="text-lg font-black tracking-tight uppercase">
              {company?.name || 'InkFlow Digital Printing & Signage'}
            </h1>
            {company?.address && (
              <p className="text-slate-600 text-[11px]">{company.address}</p>
            )}
            <div className="inline-block mt-1 px-4 py-0.5 rounded-full bg-slate-900 text-white font-black text-xs tracking-wider uppercase">
              PRODUCTION JOB TICKET • কারখানা কাজের নির্দেশিকা
            </div>
          </div>

          {/* Job & Client Meta Matrix */}
          <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-slate-50 border border-slate-300 font-mono text-xs">
            <div className="space-y-1">
              <div>Job / Order No: <strong className="text-sm font-black text-blue-700">{task.job_number || 'JOB-0000'}</strong></div>
              <div>Customer Name: <strong className="font-sans font-bold">{task.customer_name || 'Direct Client'}</strong></div>
              <div>Department: <strong className="uppercase">{task.department}</strong></div>
              <div>Assigned Machine: <strong className="text-blue-800">{task.assigned_machine_name || 'Floor Bench / Unassigned'}</strong></div>
            </div>
            <div className="space-y-1 text-right">
              <div>Date Issued: <strong>{new Date().toISOString().split('T')[0]}</strong></div>
              <div>Delivery Target: <strong className="text-rose-700">{task.scheduled_date || 'Urgent / Same Day'}</strong></div>
              <div>Priority Mode: <strong className="uppercase text-rose-600 font-bold">{task.priority || 'Normal'}</strong></div>
              <div>Responsible Operator: <strong>{task.operator_name || 'Assigned Lead'}</strong></div>
            </div>
          </div>

          {/* Core Technical Specifications Table */}
          <table className="w-full text-left border-collapse border border-slate-300 text-xs">
            <thead className="bg-slate-100 font-bold text-[11px]">
              <tr>
                <th className="p-2 border border-slate-300">Product / Job Item</th>
                <th className="p-2 border border-slate-300 text-center">Dimensions</th>
                <th className="p-2 border border-slate-300 text-center">Quantity</th>
                <th className="p-2 border border-slate-300">Media / Substrate Specs</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2.5 border border-slate-300 font-bold">
                  {task.task_name}
                </td>
                <td className="p-2.5 border border-slate-300 text-center font-mono">
                  {task.width && task.height ? (
                    <div>
                      {task.width} × {task.height} {task.unit || 'inch'}
                      {sftArea && <div className="text-[10px] text-slate-500">({sftArea} SFT)</div>}
                    </div>
                  ) : (
                    'Standard Size'
                  )}
                </td>
                <td className="p-2.5 border border-slate-300 text-center font-mono font-black text-sm">
                  {task.quantity || 1} {task.unit || 'pcs'}
                </td>
                <td className="p-2.5 border border-slate-300">
                  <div className="font-bold text-slate-800">{task.required_material || 'Press Standard Material'}</div>
                  {task.notes && <div className="text-[10px] text-slate-500 mt-0.5">Note: {task.notes}</div>}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Quality Assurance & Finishing Checklist */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-300 space-y-2">
            <span className="font-bold text-[11px] uppercase tracking-wider text-slate-700 block">
              Quality Assurance & Finishing Checklist (কোয়ালিটি চেক):
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded border border-slate-400 bg-white inline-block" />
                <span>মিডিয়া ও সারফেস কোয়ালিটি চেক (No scratches/banding)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded border border-slate-400 bg-white inline-block" />
                <span>সাইজ ও কাটিং ডাইমেনশন সঠিকতা (Exact Cut Check)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded border border-slate-400 bg-white inline-block" />
                <span>লেমিনেশন / ফিনিশিং নিখুঁত (No bubble/crease)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded border border-slate-400 bg-white inline-block" />
                <span>প্যাকেজিং ও চালান হস্তান্তর রেডি (Packaged & Sealed)</span>
              </div>
            </div>
          </div>

          {/* Dual Signatures Block */}
          <div className="pt-8 flex justify-between items-end text-xs">
            <div className="text-center space-y-1">
              <div className="font-mono text-slate-500 text-[10px]">{task.operator_name || 'Machine Operator'}</div>
              <div className="border-t border-slate-400 w-48 pt-1 font-bold">
                মেশিন অপারেটরের স্বাক্ষর
                <div className="text-[10px] font-normal text-slate-500">(Operator Signature)</div>
              </div>
            </div>

            <div className="text-center space-y-1">
              <div className="font-mono text-slate-500 text-[10px]">Production Manager</div>
              <div className="border-t border-slate-400 w-48 pt-1 font-bold">
                ফ্লোর ইন-চার্জ / কিউসি স্বাক্ষর
                <div className="text-[10px] font-normal text-slate-500">(QC & Floor Supervisor)</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModalDialog>
  )
}
