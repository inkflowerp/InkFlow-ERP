'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter, usePathname } from 'next/navigation'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
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
  Building,
  FileText,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FeatureGate } from '@/components/shared/feature-gate'
import { JobCostingRecord } from '@/types/costing.types'
import { formatBDT } from '@/lib/formatters'
import { useDataStore } from '@/hooks/use-data-store'
import { STORAGE_KEYS } from '@/lib/db/data-store'

export default function JobCostingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const cstId = (params?.id as string) || ''
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const [isSalesRoleShielded, setIsSalesRoleShielded] = useState<boolean>(false)
  const [costings] = useDataStore<JobCostingRecord[]>(STORAGE_KEYS.JOB_COSTINGS, [])
  const costing = costings.find((c: JobCostingRecord) => c.id === cstId || c.job_number === cstId)

  if (!mounted) {
    return (
      <div className="space-y-6 max-w-5xl pb-20 animate-pulse">
        <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-xl w-40" />
        <div className="h-96 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
      </div>
    )
  }

  if (!costing) {
    return (
      <FeatureGate feature="job_costing">
        <div className="space-y-6 max-w-5xl pb-20">
          <Link
            href={getTenantNavHref('/costing', pathname, slug)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{tBilingual('Back to Costing Ledger', 'কস্টিং তালিকায় ফিরুন')}</span>
          </Link>
          <Card className="p-12 text-center border-dashed rounded-2xl">
            <Calculator className="h-10 w-10 text-slate-400 mx-auto mb-3" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {tBilingual('Job Costing Sheet Not Found', 'জব কস্টিং শিট পাওয়া যায়নি')}
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              The job costing calculation sheet you are looking for does not exist in your organization.
            </p>
            <Button asChild className="mt-4 rounded-xl" size="sm">
              <Link href={getTenantNavHref('/costing', pathname, slug)}>
                {tBilingual('View All Costings', 'সব কস্টিং দেখুন')}
              </Link>
            </Button>
          </Card>
        </div>
      </FeatureGate>
    )
  }

  const costHeadsList = [
    { labelEn: '1. Raw Material Substrate', labelBn: 'কাঁচামাল / মিডিয়া / বোর্ড', est: costing.est.material_cost, act: costing.act.material_cost },
    { labelEn: '2. Ink & Chemical Consumables', labelBn: 'কালি / ইঙ্ক / কেমিক্যাল', est: costing.est.ink_cost, act: costing.act.ink_cost },
    { labelEn: '3. Machine Printing Running & Power', labelBn: 'মেশিন রানিং ও ডেসকো বিদ্যুৎ', est: costing.est.machine_cost, act: costing.act.machine_cost },
    { labelEn: '4. Post-Press Finishing & Lamination', labelBn: 'ফিনিশিং / ল্যামিনেশন / আইলেট', est: costing.est.finishing_cost, act: costing.act.finishing_cost },
    { labelEn: '5. Direct Factory Labor & Helpers', labelBn: 'মজুরি / অপারেটর ও হেল্পার', est: costing.est.labor_cost, act: costing.act.labor_cost },
    { labelEn: '6. Workshop Fabrication & Welding', labelBn: 'কাঠামো তৈরি / পাইপ ওয়েল্ডিং', est: costing.est.fabrication_cost, act: costing.act.fabrication_cost },
    { labelEn: '7. On-Site Rigging & Installation', labelBn: 'সাইট ফিটিং / ক্রেন / মই', est: costing.est.installation_cost, act: costing.act.installation_cost },
    { labelEn: '8. Transport, Van & Logistics', labelBn: 'পরিবহন / পিকআপ ভ্যান / সিএনজি', est: costing.est.transport_cost, act: costing.act.transport_cost },
    { labelEn: '9. Packaging & Contingency Buffer', labelBn: 'প্যাকেজিং ও অন্যান্য বাফার', est: costing.est.other_cost, act: costing.act.other_cost },
  ]

  const totalEffectiveCost = costing.status === 'actualized' ? costing.act.total_cost : costing.est.total_cost

  return (
    <FeatureGate feature="job_costing">
      <div className="space-y-6 max-w-5xl pb-20 print:max-w-none print:w-full print:bg-white print:text-slate-900 print:dark:bg-white print:dark:text-slate-900 print:m-0 print:p-0">
        {/* Non-Print Action Bar */}
        <div className="print:hidden flex flex-wrap items-center justify-between gap-3">
          <Link
            href={getTenantNavHref('/costing', pathname, slug)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{tBilingual('Back to Costing Ledger', 'কস্টিং তালিকায় ফিরুন')}</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsSalesRoleShielded(!isSalesRoleShielded)}
              className={`text-xs h-9 rounded-xl font-semibold ${
                isSalesRoleShielded
                  ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              {isSalesRoleShielded ? (
                <>
                  <EyeOff className="mr-1.5 h-3.5 w-3.5 text-amber-600" />
                  <span>{tBilingual('Sales View (Masked)', 'সেলস ভিউ')}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                  <span>{tBilingual('Owner View (Full)', 'মালিক ভিউ')}</span>
                </>
              )}
            </Button>

            <Button
              size="sm"
              onClick={() => window.print()}
              className="bg-slate-900 hover:bg-slate-800 text-xs text-white h-9 px-4 rounded-xl shadow-xs font-semibold flex items-center gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>{tBilingual('Print Cost Traveler', 'প্রিন্ট কস্ট ট্রাভেলার')}</span>
            </Button>
          </div>
        </div>

        {/* =========================================================================
            PRINTABLE JOB COST TRAVELER & PROFIT AUDIT
           ========================================================================= */}
        <div className="bg-white dark:bg-slate-950 print:bg-white print:dark:bg-white text-slate-900 dark:text-white print:text-slate-900 print:dark:text-slate-900 p-6 sm:p-10 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs print:border-none print:shadow-none print:p-0 text-xs space-y-6">
          {/* Letterhead */}
          <div className="text-center space-y-1 pb-4 border-b-2 border-slate-900 dark:border-slate-100 print:border-slate-900">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">{company?.name || 'Industrial Printing & Signage Solutions'}</h1>
            <p className="text-slate-500 text-2xs">Commercial Printing • Large-Format Signage • 4-Color Offset • Dhaka, Bangladesh</p>
            <div className="inline-block mt-2 px-5 py-1 rounded-full bg-slate-100 dark:bg-slate-900 font-black text-xs sm:text-sm tracking-wider uppercase border border-slate-300 dark:border-slate-700">
              JOB COST TRAVELER & MARGIN AUDIT (কস্টিং ও লাভ নিরীক্ষা)
            </div>
          </div>

          {/* Job Meta Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
            <div className="space-y-1">
              <span className="text-2xs uppercase font-bold text-slate-400">Job Particulars:</span>
              <div className="font-black text-base text-slate-900 dark:text-white font-mono">{costing.job_number}</div>
              <div className="font-bold text-blue-600 dark:text-blue-400">{costing.customer_name}</div>
              <div className="text-slate-700 dark:text-slate-300 font-semibold">{costing.item_title}</div>
              <div className="text-slate-500 font-mono text-2xs">Specs: {costing.dimensions_spec || 'Custom dimensions'}</div>
            </div>

            <div className="space-y-1 text-left sm:text-right font-mono">
              <div>
                Selling Price (Revenue):{' '}
                <strong className="text-base font-black text-slate-900 dark:text-white">
                  {formatBDT(costing.selling_price)}
                </strong>
              </div>
              <div>Labor Mode: <strong className="uppercase">{costing.labor_cost_mode.replace('_', ' ')}</strong></div>
              <div>
                Status:{' '}
                <strong className={`uppercase ${costing.status === 'actualized' ? 'text-emerald-600' : 'text-blue-600'}`}>
                  {costing.status}
                </strong>
              </div>
              <div className="text-slate-400 text-2xs">Audited on: {costing.updated_at.split('T')[0]}</div>
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
                  const variance = h.act > 0 ? h.act - h.est : 0

                  return (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-800 dark:text-slate-200 font-sans">
                        <div>{h.labelEn}</div>
                        <div className="text-2xs text-slate-500 font-normal">{h.labelBn}</div>
                      </td>

                      {/* Pre-Production Estimate */}
                      <td className="p-3 text-right text-slate-600 dark:text-slate-400">
                        {isSalesRoleShielded ? '••••' : formatBDT(h.est)}
                      </td>

                      {/* Post-Production Actual */}
                      <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                        {isSalesRoleShielded ? (
                          '••••'
                        ) : costing.status === 'actualized' ? (
                          formatBDT(h.act)
                        ) : (
                          <span className="text-slate-400 italic">In progress</span>
                        )}
                      </td>

                      {/* Variance */}
                      <td className="p-3 text-right">
                        {isSalesRoleShielded ? (
                          '••••'
                        ) : costing.status === 'actualized' ? (
                          variance < 0 ? (
                            <span className="text-emerald-600 font-bold">-{formatBDT(Math.abs(variance))}</span>
                          ) : variance > 0 ? (
                            <span className="text-red-600 font-bold">+{formatBDT(variance)}</span>
                          ) : (
                            <span className="text-slate-400">৳ 0</span>
                          )
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Badge */}
                      <td className="p-3 text-center">
                        {isSalesRoleShielded ? (
                          <span className="text-slate-400 text-2xs">Shielded</span>
                        ) : costing.status === 'actualized' ? (
                          <Badge
                            className={
                              variance < 0
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                                : variance > 0
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                : 'bg-slate-100 text-slate-800'
                            }
                          >
                            {variance < 0 ? 'Under Budget' : variance > 0 ? 'Cost Overrun' : 'On Target'}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
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
                    {isSalesRoleShielded ? '••••••' : formatBDT(costing.est.total_cost)}
                  </td>
                  <td className="p-3 text-right text-slate-900 dark:text-white">
                    {isSalesRoleShielded
                      ? '••••••'
                      : costing.status === 'actualized'
                      ? formatBDT(costing.act.total_cost)
                      : '—'}
                  </td>
                  <td className="p-3 text-right">
                    {isSalesRoleShielded ? (
                      '••••••'
                    ) : costing.status === 'actualized' ? (
                      (costing.variances?.total_variance || 0) < 0 ? (
                        <span className="text-emerald-700 font-black">
                          -{formatBDT(Math.abs(costing.variances?.total_variance || 0))}
                        </span>
                      ) : (
                        <span className="text-red-700 font-black">
                          +{formatBDT(costing.variances?.total_variance || 0)}
                        </span>
                      )
                    ) : (
                      '—'
                    )}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* PROFIT & MARGIN RECONCILIATION */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Estimated Margins */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border space-y-1 font-mono text-xs">
              <span className="text-2xs uppercase font-bold text-slate-400">Pre-Production Estimate:</span>
              <div className="flex justify-between">
                <span>Estimated Profit:</span>
                <strong className="text-blue-600 font-bold">
                  {isSalesRoleShielded ? '••••••' : formatBDT(costing.est.profit)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Estimated Margin:</span>
                <strong className="text-blue-600 font-bold">
                  {isSalesRoleShielded ? '••••' : `${costing.est.margin_percentage}%`}
                </strong>
              </div>
            </div>

            {/* Actual Margins */}
            <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-800 space-y-1 font-mono text-xs">
              <span className="text-2xs uppercase font-bold text-emerald-700 dark:text-emerald-300">
                Realized Post-Production Margin:
              </span>
              <div className="flex justify-between">
                <span>Actual Realized Profit:</span>
                <strong className="text-emerald-700 dark:text-emerald-300 text-sm font-bold">
                  {isSalesRoleShielded
                    ? '••••••'
                    : costing.status === 'actualized'
                    ? formatBDT(costing.act.profit)
                    : 'In Production'}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Realized Margin %:</span>
                <strong className="text-emerald-700 dark:text-emerald-300 text-sm font-bold">
                  {isSalesRoleShielded
                    ? '••••'
                    : costing.status === 'actualized'
                    ? `${costing.act.margin_percentage}%`
                    : 'Pending'}
                </strong>
              </div>
            </div>
          </div>

          {/* Dual Signatures for Official Traveler */}
          <div className="pt-12 flex justify-between items-end text-xs page-break-inside-avoid print-avoid-break">
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
    </FeatureGate>
  )
}
