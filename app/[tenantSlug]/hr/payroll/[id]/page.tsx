'use client'

// ==============================================================================
// InkFlow ERP - Official Printable Monthly Employee Pay Slip (বেতন রসিদ)
// ==============================================================================

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  Printer,
  FileText,
  Building,
  User,
  CheckCircle2,
  Calendar,
  CreditCard,
  RefreshCw,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatBDT, numberToWordsBDT, formatDate } from '@/lib/formatters'
import type { PayrollPeriodRecord, PayrollItemRecord } from '@/types/workforce.types'
import { getPayrollPeriodDetailAction } from '@/actions/workforce.actions'

export default function PayrollDetailPage() {
  const params = useParams()
  const periodId = (params?.id as string) || ''
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'

  const [period, setPeriod] = useState<PayrollPeriodRecord | null>(null)
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    async function loadPeriod() {
      setIsLoading(true)
      try {
        const res = await getPayrollPeriodDetailAction(periodId)
        if (res.success && res.data) {
          setPeriod(res.data)
        } else {
          setErrorMsg(res.error || 'Payroll period not found.')
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load payroll period.')
      } finally {
        setIsLoading(false)
      }
    }
    if (periodId) loadPeriod()
  }, [periodId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16 text-slate-500 text-xs">
        <RefreshCw className="h-5 w-5 animate-spin mr-2" />
        Loading pay slip details...
      </div>
    )
  }

  if (!period || !period.items || period.items.length === 0) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Link
          href={`/${slug}/hr/payroll`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Payroll & Salary
        </Link>
        <Card className="p-12 text-center border-dashed">
          <FileText className="h-10 w-10 text-slate-400 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Payroll Period Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {errorMsg || 'The payroll period record you are looking for does not exist in your organization.'}
          </p>
          <Button asChild className="mt-4" size="sm">
            <Link href={`/${slug}/hr/payroll`}>View All Payroll Periods</Link>
          </Button>
        </Card>
      </div>
    )
  }

  const currentItem: PayrollItemRecord = period.items[selectedItemIndex] || period.items[0]

  return (
    <div className="space-y-6 max-w-4xl mx-auto print:max-w-none print:w-full print:bg-white print:text-slate-900 print:dark:bg-white print:dark:text-slate-900 print:m-0 print:p-0">
      {/* Non-Print Action & Selector Bar */}
      <div className="print:hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <Link
          href={`/${slug}/hr/payroll`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Payroll & Salary
        </Link>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {period.items.length > 1 && (
            <select
              value={selectedItemIndex}
              onChange={(e) => setSelectedItemIndex(Number(e.target.value))}
              aria-label="Select employee pay slip"
              className="h-8 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-medium"
            >
              {period.items.map((it, idx) => (
                <option key={it.id} value={idx}>
                  {it.employee_name} ({it.role}) — ৳ {formatBDT(it.net_salary)}
                </option>
              ))}
            </select>
          )}

          <Button
            size="sm"
            onClick={() => window.print()}
            className="bg-slate-900 hover:bg-slate-800 text-xs text-white"
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print Official Pay Slip
          </Button>
        </div>
      </div>

      {/* =========================================================================
          PRINTABLE OFFICIAL MONTHLY PAY SLIP (বেতন রসিদ)
         ========================================================================= */}
      <div className="bg-white dark:bg-slate-950 print:bg-white print:dark:bg-white text-slate-900 dark:text-white print:text-slate-900 print:dark:text-slate-900 p-8 sm:p-12 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs print:border-none print:shadow-none print:p-0 text-xs space-y-6">
        {/* Header */}
        <div className="text-center space-y-1 pb-4 border-b-2 border-slate-900 dark:border-slate-100 print:border-slate-900">
          <h1 className="text-xl font-black tracking-tight">{company?.name || 'InkFlow Print & Signage'}</h1>
          {company?.address && <p className="text-slate-500 text-[11px]">{company.address}</p>}
          <div className="inline-block mt-2 px-5 py-1 rounded-full bg-slate-100 dark:bg-slate-900 font-black text-xs tracking-wider uppercase border border-slate-300 dark:border-slate-700">
            EMPLOYEE PAY SLIP (কর্মচারী বেতন রসিদ)
          </div>
          <div className="text-slate-500 font-mono text-[11px] mt-1">
            Period: <strong>{period.period_name}</strong> ({period.start_date} to {period.end_date})
          </div>
        </div>

        {/* Employee Particulars */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Employee Details:</span>
            <div className="font-bold text-sm text-slate-900 dark:text-white">
              {currentItem.employee_name} {currentItem.employee_name_bn && `(${currentItem.employee_name_bn})`}
            </div>
            <div className="text-slate-600 dark:text-slate-300 font-mono">
              ID: <strong>{currentItem.employee_id_number || currentItem.employee_id}</strong> • Role: <strong>{currentItem.role}</strong>
            </div>
            <div className="text-slate-500 capitalize">
              Department: {currentItem.department} • Basis: {currentItem.salary_basis.replace('_', ' ')}
            </div>
          </div>

          <div className="space-y-1 text-right font-mono text-[11px]">
            <div>Pay Slip No: <strong>PS-{period.id.slice(-6).toUpperCase()}</strong></div>
            <div>Days Present: <strong>{currentItem.days_present} / {period.working_days_count}</strong></div>
            <div>
              Status:{' '}
              <strong className="text-emerald-600 uppercase font-black">
                {currentItem.payment_status === 'paid' ? 'PAID / DISBURSED' : 'PAYABLE'}
              </strong>
            </div>
          </div>
        </div>

        {/* Earnings & Deductions Breakdown Grid */}
        <div className="grid grid-cols-2 gap-6">
          {/* Earnings Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="bg-slate-100 dark:bg-slate-900 p-2.5 font-bold text-[11px] border-b border-slate-200 dark:border-slate-800">
              EARNINGS & ALLOWANCES (আয় ও ভাতাসমূহ)
            </div>
            <table className="w-full text-left text-xs font-mono">
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr>
                  <td className="p-2.5">Basic Salary (মূল বেতন)</td>
                  <td className="p-2.5 text-right font-bold">
                    ৳ {formatBDT(currentItem.allowances_breakdown?.basic || currentItem.base_salary * 0.6)}
                  </td>
                </tr>
                {currentItem.allowances_breakdown?.house_allowance > 0 && (
                  <tr>
                    <td className="p-2.5">House Allowance (বাড়ি ভাড়া)</td>
                    <td className="p-2.5 text-right">৳ {formatBDT(currentItem.allowances_breakdown.house_allowance)}</td>
                  </tr>
                )}
                {currentItem.allowances_breakdown?.transport_allowance > 0 && (
                  <tr>
                    <td className="p-2.5">Transport Allowance (যাতায়াত)</td>
                    <td className="p-2.5 text-right">৳ {formatBDT(currentItem.allowances_breakdown.transport_allowance)}</td>
                  </tr>
                )}
                {currentItem.allowances_breakdown?.medical_allowance > 0 && (
                  <tr>
                    <td className="p-2.5">Medical Allowance (চিকিৎসা)</td>
                    <td className="p-2.5 text-right">৳ {formatBDT(currentItem.allowances_breakdown.medical_allowance)}</td>
                  </tr>
                )}
                <tr>
                  <td className="p-2.5">Overtime ({currentItem.overtime_hours} hrs)</td>
                  <td className="p-2.5 text-right text-amber-600 font-bold">৳ {formatBDT(currentItem.overtime_amount)}</td>
                </tr>
                {currentItem.bonuses > 0 && (
                  <tr>
                    <td className="p-2.5">Bonus / Incentive</td>
                    <td className="p-2.5 text-right text-emerald-600">৳ {formatBDT(currentItem.bonuses)}</td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-900 font-bold border-t border-slate-200 dark:border-slate-800">
                <tr>
                  <td className="p-2.5">GROSS EARNINGS (মোট আয়)</td>
                  <td className="p-2.5 text-right text-sm text-slate-900 dark:text-white">
                    ৳ {formatBDT(currentItem.gross_salary)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Deductions Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="bg-slate-100 dark:bg-slate-900 p-2.5 font-bold text-[11px] border-b border-slate-200 dark:border-slate-800">
              DEDUCTIONS (কর্তনসমূহ)
            </div>
            <table className="w-full text-left text-xs font-mono">
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr>
                  <td className="p-2.5">Salary Advance Deducted (অগ্রিম কর্তন)</td>
                  <td className="p-2.5 text-right text-purple-600 font-bold">
                    ৳ {formatBDT(currentItem.advance_salary_deducted)}
                  </td>
                </tr>
                {currentItem.late_fine > 0 && (
                  <tr>
                    <td className="p-2.5">Late Attendance Fine (দেরি জরিমানা)</td>
                    <td className="p-2.5 text-right text-rose-600">৳ {formatBDT(currentItem.late_fine)}</td>
                  </tr>
                )}
                {currentItem.absence_deduction > 0 && (
                  <tr>
                    <td className="p-2.5">Absence Deduction (অনুপস্থিতি)</td>
                    <td className="p-2.5 text-right text-rose-600">৳ {formatBDT(currentItem.absence_deduction)}</td>
                  </tr>
                )}
                {currentItem.loan_deduction > 0 && (
                  <tr>
                    <td className="p-2.5">Loan / Equipment Fine</td>
                    <td className="p-2.5 text-right">৳ {formatBDT(currentItem.loan_deduction)}</td>
                  </tr>
                )}
                {currentItem.other_deductions > 0 && (
                  <tr>
                    <td className="p-2.5">Other Deductions</td>
                    <td className="p-2.5 text-right">৳ {formatBDT(currentItem.other_deductions)}</td>
                  </tr>
                )}
                {currentItem.advance_salary_deducted === 0 && currentItem.late_fine === 0 && currentItem.absence_deduction === 0 && (
                  <tr>
                    <td className="p-2.5 text-slate-400 italic">No deductions applied</td>
                    <td className="p-2.5 text-right text-slate-400">৳ 0</td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-900 font-bold border-t border-slate-200 dark:border-slate-800">
                <tr>
                  <td className="p-2.5">TOTAL DEDUCTIONS (মোট কর্তন)</td>
                  <td className="p-2.5 text-right text-sm text-rose-600">
                    ৳ {formatBDT(
                      currentItem.advance_salary_deducted +
                        currentItem.late_fine +
                        currentItem.absence_deduction +
                        currentItem.loan_deduction +
                        currentItem.other_deductions
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Net Payable Highlight Banner */}
        <div className="p-5 rounded-2xl bg-slate-900 text-white dark:bg-slate-900 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              NET PAYABLE SALARY (প্রদেয় সর্বমোট বেতন)
            </span>
            <div className="text-xs text-slate-300 capitalize mt-0.5">
              In Words: <strong>{numberToWordsBDT(currentItem.net_salary)}</strong>
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-black text-emerald-400 font-mono">
              ৳ {formatBDT(currentItem.net_salary)}
            </div>
            <span className="text-[10px] text-slate-400">
              {currentItem.payment_status === 'paid' ? 'Paid in Full' : 'Amount Due'}
            </span>
          </div>
        </div>

        {/* Advance Balance Notification */}
        {currentItem.advance_remaining_balance > 0 && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300 text-[11px] border border-amber-200 dark:border-amber-800 flex items-center justify-between">
            <span>Remaining Salary Advance Balance carried forward to next month:</span>
            <strong className="font-mono text-xs">৳ {formatBDT(currentItem.advance_remaining_balance)}</strong>
          </div>
        )}

        {/* Signature Blocks */}
        <div className="pt-16 grid grid-cols-3 gap-8 text-center text-xs text-slate-500 font-medium">
          <div>
            <div className="border-t border-slate-400 dark:border-slate-600 pt-2 font-bold text-slate-800 dark:text-slate-200">
              Employee Signature
            </div>
            <span className="text-[10px] text-slate-400">গ্রহীতার স্বাক্ষর</span>
          </div>

          <div>
            <div className="border-t border-slate-400 dark:border-slate-600 pt-2 font-bold text-slate-800 dark:text-slate-200">
              Prepared by Accounts
            </div>
            <span className="text-[10px] text-slate-400">হিসাবরক্ষক</span>
          </div>

          <div>
            <div className="border-t border-slate-400 dark:border-slate-600 pt-2 font-bold text-slate-800 dark:text-slate-200">
              Authorized Managing Director
            </div>
            <span className="text-[10px] text-slate-400">কর্তৃপক্ষের স্বাক্ষর</span>
          </div>
        </div>
      </div>
    </div>
  )
}
