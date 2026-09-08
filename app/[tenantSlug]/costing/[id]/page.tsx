'use client'

import React, { useState, use } from 'react'
import Link from 'next/link'
import {
  Calculator,
  ArrowLeft,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShieldCheck,
  ShieldAlert,
  Percent,
  Layers,
  Sparkles,
  Eye,
  EyeOff,
  Wrench,
  Truck,
  Users,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { JobCostingRecord } from '@/types/costing.types'
import { formatBDT } from '@/lib/formatters'
import { useDataStore } from '@/hooks/use-data-store'
import { STORAGE_KEYS } from '@/lib/db/data-store'

interface CostingDetailPageProps {
  params: Promise<{ tenantSlug: string; id: string }>
}

export default function JobCostingDetailPage({ params }: CostingDetailPageProps) {
  const resolvedParams = use(params)
  const cstId = resolvedParams.id
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = company?.slug || 'my-company'

  const [isSalesRoleShielded, setIsSalesRoleShielded] = useState<boolean>(false)
  const [costings] = useDataStore<JobCostingRecord[]>(STORAGE_KEYS.JOB_COSTINGS, [])
  const costing = costings.find((c: JobCostingRecord) => c.id === cstId || c.job_number === cstId)

  if (!costing) {
    return (
      <div className="space-y-6 max-w-5xl">
        <Link
          href={`/${slug}/costing`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Costing Ledger
        </Link>
        <Card className="p-12 text-center border-dashed">
          <Calculator className="h-10 w-10 text-slate-400 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Job Costing Sheet Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            The job costing calculation sheet you are looking for does not exist in your organization.
          </p>
          <Button asChild className="mt-4" size="sm">
            <Link href={`/${slug}/costing`}>View All Costings</Link>
          </Button>
        </Card>
      </div>
    )
  }

  const costHeadsList = [
    { label: '1. Raw Material Substrate (মিডিয়া/বোর্ড)', est: costing.est.material_cost, act: costing.act.material_cost },
    { label: '2. Ink Consumption (কালি/ইঙ্ক)', est: costing.est.ink_cost, act: costing.act.ink_cost },
    { label: '3. Machine Printing Running (প্রিন্ট পাওয়ার)', est: costing.est.printing_cost, act: costing.act.printing_cost },
    { label: '4. Finishing & Lamination (ফিনিশিং/আইলেট)', est: costing.est.finishing_cost, act: costing.act.finishing_cost },
    { label: '5. Direct Factory Labor (মজুরি/অপারেটর)', est: costing.est.labor_cost, act: costing.act.labor_cost },
    { label: '6. Workshop Fabrication (ওয়েল্ডিং/কাঠামো)', est: costing.est.fabrication_cost, act: costing.act.fabrication_cost },
    { label: '7. On-Site Installation (সাইট ফিটিং/ক্রেন)', est: costing.est.installation_cost, act: costing.act.installation_cost },
    { label: '8. Transport & Fuel (পরিবহন/ভাড়া)', est: costing.est.transport_cost, act: costing.act.transport_cost },
    { label: '9. Other Contingencies (অন্যান্য/প্যাকেজিং)', est: costing.est.other_cost, act: costing.act.other_cost },
  ]

  return (
    <div className="space-y-6 max-w-5xl print:max-w-none print:m-0 print:p-0">
      {/* Non-Print Action Bar */}
      <div className="print:hidden flex items-center justify-between">
        <Link
          href={`/${slug}/costing`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Costing Ledger
        </Link>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsSalesRoleShielded(!isSalesRoleShielded)}
            className="text-xs h-8"
          >
            {isSalesRoleShielded ? (
              <>
                <EyeOff className="mr-1.5 h-3.5 w-3.5 text-amber-600" />
                Sales View (Masked)
              </>
            ) : (
              <>
                <ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                Owner View (Full)
              </>
            )}
          </Button>

          <Button
            size="sm"
            onClick={() => window.print()}
            className="bg-slate-900 hover:bg-slate-800 text-xs text-white"
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print Cost Traveler
          </Button>
        </div>
      </div>

      {/* =========================================================================
          PRINTABLE JOB COST TRAVELER & PROFIT AUDIT
         ========================================================================= */}
      <div className="bg-white dark:bg-slate-950 p-8 sm:p-12 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs print:border-none print:shadow-none print:p-0 text-xs text-slate-900 dark:text-white space-y-6">
        {/* Letterhead */}
        <div className="text-center space-y-1 pb-4 border-b-2 border-slate-900 dark:border-slate-100">
          <h1 className="text-xl font-black tracking-tight">{company?.name || 'Padma Digital Printing & Signage'}</h1>
          <p className="text-slate-500 text-[11px]">42/1 Motijheel Commercial Area, Dhaka-1000 • Phone: +8801712000000</p>
          <div className="inline-block mt-2 px-5 py-1 rounded-full bg-slate-100 dark:bg-slate-900 font-black text-sm tracking-wider uppercase border border-slate-300 dark:border-slate-700">
            JOB COST TRAVELER & MARGIN AUDIT (কস্টিং ও লাভ নিরীক্ষা)
          </div>
        </div>

        {/* Job Meta Box */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Job Particulars:</span>
            <div className="font-black text-sm text-slate-900 dark:text-white">{costing.job_number}</div>
            <div className="font-bold text-blue-600">{costing.customer_name}</div>
            <div className="text-slate-700 dark:text-slate-300 font-semibold">{costing.item_title}</div>
            <div className="text-slate-500 font-mono">Specs: {costing.dimensions_spec || 'Custom dimensions'}</div>
          </div>

          <div className="space-y-1 text-right font-mono">
            <div>Selling Price (Revenue): <strong className="text-base font-black text-slate-900 dark:text-white">৳ {formatBDT(costing.selling_price)}</strong></div>
            <div>Labor Mode: <strong className="uppercase">{costing.labor_cost_mode.replace('_', ' ')}</strong></div>
            <div>Status: <strong className="uppercase text-blue-600">{costing.status}</strong></div>
            <div className="text-slate-400 text-[11px]">Audited on: {costing.updated_at.split('T')[0]}</div>
          </div>
        </div>

        {/* 9-HEAD COMPARISON TABLE: ESTIMATED VS ACTUAL VS VARIANCE */}
        <div className="border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-100 dark:bg-slate-900 font-bold border-b border-slate-300 dark:border-slate-700">
              <tr>
                <th className="p-3">Cost Head (খরচ খাত)</th>
                <th className="p-3 text-right">Pre-Production Est.</th>
                <th className="p-3 text-right">Post-Production Act.</th>
                <th className="p-3 text-right">Variance (৳)</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {costHeadsList.map((h, idx) => {
                const variance = h.act - h.est

                return (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{h.label}</td>

                    {/* Pre-Production Estimate */}
                    <td className="p-3 text-right text-slate-600 dark:text-slate-400">
                      {isSalesRoleShielded ? '••••' : `৳ ${formatBDT(h.est)}`}
                    </td>

                    {/* Post-Production Actual */}
                    <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                      {isSalesRoleShielded ? '••••' : `৳ ${formatBDT(h.act)}`}
                    </td>

                    {/* Variance */}
                    <td className="p-3 text-right">
                      {isSalesRoleShielded ? (
                        '••••'
                      ) : variance < 0 ? (
                        <span className="text-emerald-600 font-bold">-৳ {formatBDT(Math.abs(variance))}</span>
                      ) : variance > 0 ? (
                        <span className="text-red-600 font-bold">+৳ {formatBDT(variance)}</span>
                      ) : (
                        <span className="text-slate-400">৳ 0</span>
                      )}
                    </td>

                    {/* Badge */}
                    <td className="p-3 text-center">
                      {isSalesRoleShielded ? (
                        <span className="text-slate-400 text-[10px]">Shielded</span>
                      ) : variance < 0 ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Savings
                        </span>
                      ) : variance > 0 ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
                          Overrun
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] text-slate-500 bg-slate-100">
                          Exact
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-slate-100 dark:bg-slate-900 font-black text-xs border-t-2 border-slate-300 dark:border-slate-700">
              <tr>
                <td className="p-3">TOTAL PRODUCTION COST</td>
                <td className="p-3 text-right text-slate-600">
                  {isSalesRoleShielded ? '••••••' : `৳ ${formatBDT(costing.est.total_cost)}`}
                </td>
                <td className="p-3 text-right text-slate-900 dark:text-white">
                  {isSalesRoleShielded ? '••••••' : `৳ ${formatBDT(costing.act.total_cost)}`}
                </td>
                <td className="p-3 text-right">
                  {isSalesRoleShielded ? (
                    '••••••'
                  ) : costing.variances.total_variance < 0 ? (
                    <span className="text-emerald-700 font-black">-৳ {formatBDT(Math.abs(costing.variances.total_variance))}</span>
                  ) : (
                    <span className="text-red-700 font-black">+৳ {formatBDT(costing.variances.total_variance)}</span>
                  )}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* PROFIT & MARGIN RECONCILIATION */}
        <div className="grid grid-cols-2 gap-4">
          {/* Estimated Margins */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border space-y-1 font-mono">
            <span className="text-[10px] uppercase font-bold text-slate-400">Pre-Production Estimate:</span>
            <div className="flex justify-between">
              <span>Estimated Profit:</span>
              <strong className="text-blue-600">{isSalesRoleShielded ? '••••••' : `৳ ${formatBDT(costing.est.profit)}`}</strong>
            </div>
            <div className="flex justify-between">
              <span>Estimated Margin:</span>
              <strong className="text-blue-600">{isSalesRoleShielded ? '••••' : `${costing.est.margin_percentage}%`}</strong>
            </div>
          </div>

          {/* Actual Margins */}
          <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-300 space-y-1 font-mono">
            <span className="text-[10px] uppercase font-bold text-emerald-700">Realized Post-Production Margin:</span>
            <div className="flex justify-between">
              <span>Actual Realized Profit:</span>
              <strong className="text-emerald-700 text-sm">
                {isSalesRoleShielded ? '••••••' : `৳ ${formatBDT(costing.act.profit)}`}
              </strong>
            </div>
            <div className="flex justify-between">
              <span>Realized Margin %:</span>
              <strong className="text-emerald-700 text-sm">
                {isSalesRoleShielded ? '••••' : `${costing.act.margin_percentage}%`}
              </strong>
            </div>
          </div>
        </div>

        {/* Dual Signatures */}
        <div className="pt-12 flex justify-between items-end text-xs">
          <div className="text-center space-y-2">
            <div className="font-mono text-slate-400">Audited By: Floor Production Supervisor</div>
            <div className="border-t border-slate-400 w-52 pt-1 font-bold">
              প্রোডাকশন অডিটর (Auditor)
            </div>
          </div>

          <div className="text-center space-y-2">
            <div className="font-mono text-slate-400">Authorized: Managing Director</div>
            <div className="border-t border-slate-400 w-60 pt-1 font-bold">
              ব্যবস্থাপনা পরিচালকের স্বাক্ষর ও সিল (Approval)
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
