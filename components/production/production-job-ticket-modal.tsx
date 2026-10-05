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
 size="2xl"title={
        <div className="flex items-center gap-2">
          <FileCheck2 className="h-5 w-5 text-primary"/>
          <span className="text-base font-bold">
            {isBn ? 'প্রেস ফ্লোর জব কার্ড / কাজের নির্দেশিকা' : 'Press Floor Job Ticket / Work Order'}
          </span>
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        {/* Print Toolbar */}
        <div className="print:hidden flex items-center justify-between p-3 rounded-lg bg-muted border border-border">
          <div className="text-xs text-muted-foreground">
            {isBn
              ? 'মেশিন অপারেটরের ক্লিপবোর্ডে যুক্ত করার জন্য প্রিন্ট করুন'
              : 'Print official 1-page shop floor routing card for machine operator'}
          </div>
          <Button
 size="sm"onClick={handlePrint}
 className="bg-surface-inset hover:bg-card-elevated text-foreground font-bold text-xs h-8 gap-1.5 shadow-xs">
            <Printer className="h-3.5 w-3.5"/>
            <span>{isBn ? 'জব কার্ড প্রিন্ট' : 'Print Job Card'}</span>
          </Button>
        </div>

        {/* =========================================================================
 OFFICIAL PRINTABLE PRESS JOB TICKET (জব কার্ড)
           ========================================================================= */}
        <div className="bg-card text-foreground p-6 sm:p-8 rounded-xl border border-input text-xs space-y-4 shadow-xs print:border-none print:shadow-none print:p-0">
          {/* Header */}
          <div className="text-center space-y-1 pb-3 border-b-2 border-border relative">
            <div className="absolute right-0 top-0 text-xs tabular-nums px-2 py-0.5 rounded bg-muted font-bold border border-input">
 TASK: {task.task_number}
            </div>
            <h1 className="text-lg font-black tracking-tight uppercase">
              {company?.name || 'PrintFlow Digital Printing & Signage'}
            </h1>
            {company?.address && (
              <p className="text-muted-foreground text-xs">{company.address}</p>
            )}
            <div className="inline-block mt-1 px-4 py-0.5 rounded-full bg-surface-inset text-foreground font-black text-xs tracking-wider uppercase">
 PRODUCTION JOB TICKET • কারখানা কাজের নির্দেশিকা
            </div>
          </div>

          {/* Job & Client Meta Matrix */}
          <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-muted border border-input tabular-nums text-xs">
            <div className="space-y-1">
              <div>Job / Order No: <strong className="text-sm font-black text-primary">{task.job_number || 'JOB-0000'}</strong></div>
              <div>Customer Name: <strong className="font-sans font-bold">{task.customer_name || 'Direct Client'}</strong></div>
              <div>Department: <strong className="uppercase">{task.department}</strong></div>
              <div>Assigned Machine: <strong className="text-primary">{task.assigned_machine_name || 'Floor Bench / Unassigned'}</strong></div>
            </div>
            <div className="space-y-1 text-right">
              <div>Date Issued: <strong>{new Date().toISOString().split('T')[0]}</strong></div>
              <div>Delivery Target: <strong className="text-destructive">{task.scheduled_date || 'Urgent / Same Day'}</strong></div>
              <div>Priority Mode: <strong className="uppercase text-destructive font-bold">{task.priority || 'Normal'}</strong></div>
              <div>Responsible Operator: <strong>{task.operator_name || 'Assigned Lead'}</strong></div>
            </div>
          </div>

          {/* Core Technical Specifications Table */}
          <table className="w-full text-left border-collapse border border-input text-xs">
            <thead className="bg-muted font-bold text-xs">
              <tr>
                <th className="p-2 border border-input">Product / Job Item</th>
                <th className="p-2 border border-input text-center">Dimensions</th>
                <th className="p-2 border border-input text-center">Quantity</th>
                <th className="p-2 border border-input">Media / Substrate Specs</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2.5 border border-input font-bold">
                  {task.task_name}
                </td>
                <td className="p-2.5 border border-input text-center tabular-nums">
                  {task.width && task.height ? (
                    <div>
                      {task.width} × {task.height} {task.unit || 'inch'}
                      {sftArea && <div className="text-xs text-muted-foreground">({sftArea} SFT)</div>}
                    </div>
                  ) : (
                    'Standard Size'
                  )}
                </td>
                <td className="p-2.5 border border-input text-center tabular-nums font-black text-sm">
                  {task.quantity || 1} {task.unit || 'pcs'}
                </td>
                <td className="p-2.5 border border-input">
                  <div className="font-bold text-foreground">{task.required_material || 'Press Standard Material'}</div>
                  {task.notes && <div className="text-xs text-muted-foreground mt-0.5">Note: {task.notes}</div>}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Quality Assurance & Finishing Checklist */}
          <div className="p-3 bg-muted rounded-lg border border-input space-y-2">
            <span className="font-bold text-xs uppercase tracking-wider text-foreground block">
 Quality Assurance & Finishing Checklist (কোয়ালিটি চেক):
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded border border-input bg-card inline-block"/>
                <span>মিডিয়া ও সারফেস কোয়ালিটি চেক (No scratches/banding)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded border border-input bg-card inline-block"/>
                <span>সাইজ ও কাটিং ডাইমেনশন সঠিকতা (Exact Cut Check)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded border border-input bg-card inline-block"/>
                <span>লেমিনেশন / ফিনিশিং নিখুঁত (No bubble/crease)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded border border-input bg-card inline-block"/>
                <span>প্যাকেজিং ও চালান হস্তান্তর রেডি (Packaged & Sealed)</span>
              </div>
            </div>
          </div>

          {/* Dual Signatures Block */}
          <div className="pt-8 flex justify-between items-end text-xs">
            <div className="text-center space-y-1">
              <div className="tabular-nums text-muted-foreground text-xs">{task.operator_name || 'Machine Operator'}</div>
              <div className="border-t border-input w-48 pt-1 font-bold">
                মেশিন অপারেটরের স্বাক্ষর
                <div className="text-xs font-normal text-muted-foreground">(Operator Signature)</div>
              </div>
            </div>

            <div className="text-center space-y-1">
              <div className="tabular-nums text-muted-foreground text-xs">Production Manager</div>
              <div className="border-t border-input w-48 pt-1 font-bold">
                ফ্লোর ইন-চার্জ / কিউসি স্বাক্ষর
                <div className="text-xs font-normal text-muted-foreground">(QC & Floor Supervisor)</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModalDialog>
  )
}
