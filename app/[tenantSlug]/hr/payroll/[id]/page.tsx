'use client'

import React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  Printer,
  FileText,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useDataStore } from '@/hooks/use-data-store'
import { STORAGE_KEYS } from '@/lib/db/data-store'
import { formatBDT, numberToWordsBDT, formatDate } from '@/lib/formatters'
import { PayrollPeriodRecord } from '@/types/hr.types'

export default function PayrollDetailPage() {
  const params = useParams()
  const periodId = (params?.id as string) || ''
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'

  const [payrollPeriods] = useDataStore<PayrollPeriodRecord[]>(STORAGE_KEYS.PAYROLL_PERIODS, [])
  const period = payrollPeriods.find(
    (p) => p.id === periodId || p.period_name.toLowerCase().includes(periodId.toLowerCase())
  )

  if (!period) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Link
          href={`/${slug}/hr`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to HR & Payroll
        </Link>
        <Card className="p-12 text-center border-dashed">
          <FileText className="h-10 w-10 text-slate-400 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Payroll Period Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            The payroll period record you are looking for does not exist in your organization.
          </p>
          <Button asChild className="mt-4" size="sm">
            <Link href={`/${slug}/hr`}>View All Payroll Periods</Link>
          </Button>
        </Card>
      </div>
    )
  }

  const sampleItem = period.items?.[0]

  if (!sampleItem) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Link
          href={`/${slug}/hr`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to HR & Payroll
        </Link>
        <Card className="p-12 text-center border-dashed">
          <FileText className="h-10 w-10 text-slate-400 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">No Employees in Payroll Period</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            There are no finalized employee salary records in this payroll run.
          </p>
          <Button asChild className="mt-4" size="sm">
            <Link href={`/${slug}/hr`}>Back to HR Dashboard</Link>
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl print:max-w-none print:m-0 print:p-0">
      {/* Non-Print Action Bar */}
      <div className="print:hidden flex items-center justify-between">
        <Link
          href={`/${slug}/hr`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to HR & Payroll
        </Link>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => window.print()}
            className="bg-slate-900 hover:bg-slate-800 text-xs text-white"
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print Pay Slip
          </Button>
        </div>
      </div>

      {/* =========================================================================
          PRINTABLE OFFICIAL MONTHLY PAY SLIP (বেতন রসিদ)
         ========================================================================= */}
      <div className="bg-white dark:bg-slate-950 p-8 sm:p-12 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs print:border-none print:shadow-none print:p-0 text-xs text-slate-900 dark:text-white space-y-6">
        {/* Header */}
        <div className="text-center space-y-1 pb-4 border-b-2 border-slate-900 dark:border-slate-100">
          <h1 className="text-xl font-black tracking-tight">{company?.name || 'Company Name'}</h1>
          {company?.address && <p className="text-slate-500 text-[11px]">{company.address}</p>}
          <div className="inline-block mt-2 px-5 py-1 rounded-full bg-slate-100 dark:bg-slate-900 font-black text-sm tracking-wider uppercase border border-slate-300 dark:border-slate-700">
            EMPLOYEE PAY SLIP (কর্মচারী বেতন রসিদ)
          </div>
          <div className="text-slate-500 font-mono text-[11px] mt-1">Period: {period.period_name}</div>
        </div>

        {/* Employee Particulars */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Employee Details:</span>
            <div className="font-bold text-sm text-slate-900 dark:text-white">
              {sampleItem.employee_name}
            </div>
            <div className="text-slate-600 dark:text-slate-300 font-mono">
              ID: <strong>{sampleItem.employee_id}</strong> • Role: <strong>{sampleItem.role}</strong>
            </div>
            <div className="text-slate-500 capitalize">Department: {sampleItem.department}</div>
          </div>

          <div className="space-y-1 text-right font-mono">
            <div>Pay Slip No: <strong>PS-{period.id.slice(-6)}</strong></div>
            <div>Payment Mode: <strong>Cash / Bank</strong></div>
            <div>Status: <strong className="text-emerald-600 uppercase font-black">{period.status === 'locked' || period.status === 'disbursed' ? 'Disbursed' : 'Draft'}</strong></div>
          </div>
        </div>

        {/* Earnings & Deductions Breakdown Grid */}
        <div className="grid grid-cols-2 gap-6">
          {/* Earnings */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="bg-slate-100 dark:bg-slate-900 p-2.5 font-bold text-[11px] border-b border-slate-200 dark:border-slate-800">
              EARNINGS (আয়)
            </div>
            <table className="w-full text-left text-xs font-mono">
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr>
                  <td className="p-2.5">Monthly Base Salary</td>
                  <td className="p-2.5 text-right font-bold">৳ {formatBDT(sampleItem.base_salary)}</td>
                </tr>
                <tr>
                  <td className="p-2.5">Overtime ({sampleItem.overtime_hours} hrs)</td>
                  <td className="p-2.5 text-right font-bold">৳ {formatBDT(sampleItem.overtime_amount)}</td>
                </tr>
                <tr>
                  <td className="p-2.5">Allowances</td>
                  <td className="p-2.5 text-right font-bold">৳ {formatBDT(sampleItem.allowances)}</td>
                </tr>
                <tr className="bg-slate-50 dark:bg-slate-900 font-black">
                  <td className="p-2.5">Gross Earnings</td>
                  <td className="p-2.5 text-right text-blue-600">৳ {formatBDT(sampleItem.gross_salary)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Deductions */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="bg-slate-100 dark:bg-slate-900 p-2.5 font-bold text-[11px] border-b border-slate-200 dark:border-slate-800">
              DEDUCTIONS & OFFSETS (কর্তন)
            </div>
            <table className="w-full text-left text-xs font-mono">
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr className="bg-red-50/40 dark:bg-red-950/20">
                  <td className="p-2.5 font-bold text-red-700">Salary Advance Deducted</td>
                  <td className="p-2.5 text-right font-bold text-red-600">-৳ {formatBDT(sampleItem.advance_salary_deducted)}</td>
                </tr>
                <tr className="bg-slate-50 dark:bg-slate-900 font-black">
                  <td className="p-2.5">Total Deductions</td>
                  <td className="p-2.5 text-right text-red-600">-৳ {formatBDT(sampleItem.advance_salary_deducted)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Net Salary Payable Callout */}
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500 flex justify-between items-center text-sm font-black">
          <div>
            <div className="text-emerald-900 dark:text-emerald-200 uppercase tracking-wider text-xs">
              NET REMAINING SALARY DISBURSED (পরিশোধিত অবশিষ্ট বেতন)
            </div>
            <div className="text-slate-600 dark:text-slate-400 font-mono text-[11px] font-normal mt-0.5">
              In Words: {numberToWordsBDT(sampleItem.net_salary)}
            </div>
          </div>
          <div className="text-2xl font-mono text-emerald-700 dark:text-emerald-300">
            ৳ {formatBDT(sampleItem.net_salary)}
          </div>
        </div>

        {/* Dual Signatures */}
        <div className="pt-12 flex justify-between items-end text-xs">
          <div className="text-center space-y-2">
            <div className="font-mono text-slate-400">Date: {formatDate(new Date())}</div>
            <div className="border-t border-slate-400 w-52 pt-1 font-bold">
              কর্মচারীর স্বাক্ষর (Employee Signature)
            </div>
          </div>

          <div className="text-center space-y-2">
            <div className="font-mono text-slate-400">Authorized Officer</div>
            <div className="border-t border-slate-400 w-60 pt-1 font-bold">
              অনুমোদনকারী ও ক্যাশিয়ারের সিল (Cashier Seal)
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
