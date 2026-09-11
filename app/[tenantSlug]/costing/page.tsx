'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Calculator,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  DollarSign,
  ShieldCheck,
  ShieldAlert,
  Percent,
  Layers,
  Sparkles,
  Eye,
  EyeOff,
  ExternalLink,
  ChevronRight,
  TrendingDown,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { PageHeader } from '@/components/shared/page-header'
import {
  calculateNegotiationMargin,
} from '@/services/costing.service'
import { JobCostingRecord } from '@/types/costing.types'
import { formatBDT } from '@/lib/formatters'
import { useDataStore } from '@/hooks/use-data-store'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { FeatureGate } from '@/components/subscriptions/feature-gate'

export default function JobCostingPage() {
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = company?.slug || 'my-company'

  const [costings, setCostings] = useDataStore<JobCostingRecord[]>(STORAGE_KEYS.JOB_COSTINGS, [])
  const [search, setSearch] = useState('')

  // Role Shielding State: Allows previewing "Sales Rep (Masked)" vs "Owner (Full Visibility)"
  const [isSalesRoleShielded, setIsSalesRoleShielded] = useState<boolean>(false)

  // Negotiation Simulator State
  const [negotiatingJob, setNegotiatingJob] = useState<JobCostingRecord | null>(null)
  const [discountPercent, setDiscountPercent] = useState<number>(5)

  // Update Actuals State
  const [editingJob, setEditingJob] = useState<JobCostingRecord | null>(null)
  const [actMaterial, setActMaterial] = useState<number>(0)
  const [actLabor, setActLabor] = useState<number>(0)
  const [actTransport, setActTransport] = useState<number>(0)
  const [notification, setNotification] = useState<string | null>(null)

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  // Filtered Costings
  const filteredCostings = costings.filter(
    (c: JobCostingRecord) =>
      c.job_number.toLowerCase().includes(search.toLowerCase()) ||
      c.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      c.item_title.toLowerCase().includes(search.toLowerCase())
  )

  // Executive Profitability Metrics
  const completedJobs = costings.filter((c: JobCostingRecord) => c.status === 'actualized')
  const totalRevenue = completedJobs.reduce((acc: number, c: JobCostingRecord) => acc + c.selling_price, 0)
  const totalActualCost = completedJobs.reduce((acc: number, c: JobCostingRecord) => acc + c.act.total_cost, 0)
  const totalActualProfit = totalRevenue - totalActualCost
  const avgMargin = totalRevenue > 0 ? (totalActualProfit / totalRevenue) * 100 : 0
  const overrunJobsCount = completedJobs.filter((c: JobCostingRecord) => c.variances.total_variance > 0).length
  const totalSavings = completedJobs
    .filter((c: JobCostingRecord) => c.variances.total_variance < 0)
    .reduce((acc: number, c: JobCostingRecord) => acc + Math.abs(c.variances.total_variance), 0)

  // Handle Save Actuals
  const handleSaveActuals = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingJob) return

    const newTotalCost =
      actMaterial +
      editingJob.act.ink_cost +
      editingJob.act.printing_cost +
      editingJob.act.finishing_cost +
      actLabor +
      editingJob.act.fabrication_cost +
      editingJob.act.installation_cost +
      actTransport +
      editingJob.act.other_cost

    const newProfit = editingJob.selling_price - newTotalCost
    const newMargin = (newProfit / editingJob.selling_price) * 100

    const matVar = actMaterial - editingJob.est.material_cost
    const labVar = actLabor - editingJob.est.labor_cost
    const trVar = actTransport - editingJob.est.transport_cost
    const totVar = newTotalCost - editingJob.est.total_cost

    PrintERPDataStore.updateItem<JobCostingRecord>(STORAGE_KEYS.JOB_COSTINGS, editingJob.id, {
      status: 'actualized',
      act: {
        ...editingJob.act,
        material_cost: actMaterial,
        labor_cost: actLabor,
        transport_cost: actTransport,
        total_cost: newTotalCost,
        profit: newProfit,
        margin_percentage: Number(newMargin.toFixed(1)),
      },
      variances: {
        material_variance: matVar,
        labor_variance: labVar,
        transport_variance: trVar,
        total_variance: totVar,
      },
      updated_at: new Date().toISOString(),
    })

    setEditingJob(null)
    showNotification(`Actual costs and post-production variance calculated for ${editingJob.job_number}.`)
  }

  // Negotiation Simulation Data
  const negotiationResult = negotiatingJob
    ? calculateNegotiationMargin(
        negotiatingJob.selling_price,
        negotiatingJob.act.total_cost || negotiatingJob.est.total_cost,
        discountPercent
      )
    : null

  return (
    <FeatureGate feature="job_costing">
      <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <PageHeader
        titleEn="Job Costing & Profitability Engine"
        titleBn="কস্টিং ও লাভ-মার্জিন ইঞ্জিন"
        descriptionEn="9-head cost tracking, pre vs post-production variance audits, and sensitive cost shielding during price negotiations."
        descriptionBn="৯টি খাতে ব্যয় ট্র্যাকিং, উৎপাদন-পূর্ব ও পরবর্তী খরচের তুলনা এবং দরদামের সময় গোপন ব্যয় সুরক্ষা।"
        icon={Calculator}
        iconColor="text-emerald-600"
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsSalesRoleShielded(!isSalesRoleShielded)}
            className={`text-xs h-9 bangla-text ${
              isSalesRoleShielded
                ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300'
                : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            {isSalesRoleShielded ? (
              <>
                <EyeOff className="mr-1.5 h-3.5 w-3.5 text-amber-600" />
                {tBilingual('Viewing as: Sales Rep (Costs Masked)', 'ভিউ: সেলস প্রতিনিধি (ব্যয় লুকানো)')}
              </>
            ) : (
              <>
                <ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                {tBilingual('Viewing as: Business Owner (Full Access)', 'ভিউ: প্রতিষ্ঠান মালিক (পূর্ণ ব্যয় দৃশ্যমান)')}
              </>
            )}
          </Button>
        }
      />

      {/* Notification */}
      {notification && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Executive Profitability Intelligence */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Realized Margin */}
        <Card className="p-4 border-l-4 border-l-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              Average Realized Margin
            </span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900">
              Target &gt; 35%
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
            {isSalesRoleShielded ? '•••• %' : `${avgMargin.toFixed(1)}%`}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">
            Across {completedJobs.length} completed production runs
          </span>
        </Card>

        {/* Net Production Profit */}
        <Card className="p-4 border-l-4 border-l-blue-600">
          <span className="text-xs font-semibold text-slate-500">Realized Job Profit (মোট লাভ)</span>
          <div className="text-2xl font-black text-blue-600 mt-1">
            {isSalesRoleShielded ? '৳ ••••••' : <CurrencyDisplay amount={totalActualProfit} />}
          </div>
          <span className="text-[11px] text-slate-400">Total Billed: ৳ {formatBDT(totalRevenue)}</span>
        </Card>

        {/* Cost Overruns Alert */}
        <Card className="p-4 border-l-4 border-l-amber-500">
          <span className="text-xs font-semibold text-slate-500">Budget Overrun Alerts</span>
          <div className="text-2xl font-black text-amber-600 mt-1">{overrunJobsCount} Jobs</div>
          <span className="text-[11px] text-amber-600 font-medium">Transport/Labor variance exceeded</span>
        </Card>

        {/* Material & Nesting Savings */}
        <Card className="p-4 border-l-4 border-l-purple-600">
          <span className="text-xs font-semibold text-slate-500">Material & Yield Savings</span>
          <div className="text-2xl font-black text-purple-600 mt-1">
            {isSalesRoleShielded ? '৳ ••••••' : `৳ ${formatBDT(totalSavings)}`}
          </div>
          <span className="text-[11px] text-purple-600 font-medium">Favorable pre-press nesting</span>
        </Card>
      </div>

      {/* Sensitive Cost Notice for Sales Mode */}
      {isSalesRoleShielded && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              <strong>Sales Representative Protection Active: </strong>
              Factory internal substrate purchase rates, machine electricity costs, and raw margin % are hidden.
            </span>
          </div>
          <span className="font-mono text-[10px] uppercase font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded shrink-0 self-start sm:self-auto">
            Role: Sales Executive
          </span>
        </div>
      )}

      {/* Main Costing Ledger */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Production Job Costings & Margins ({filteredCostings.length})</CardTitle>
              <CardDescription className="text-xs">
                Audited 9-head cost allocation from raw roll unwinding to final on-site installation.
              </CardDescription>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search job #, customer, or title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-white dark:bg-slate-950"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-900/80 font-semibold text-slate-500 border-b">
                <tr>
                  <th className="py-3 px-4">Job & Client</th>
                  <th className="py-3 px-4">Work Description</th>
                  <th className="py-3 px-4 font-mono">Selling Price</th>
                  <th className="py-3 px-4 font-mono">Estimated Cost</th>
                  <th className="py-3 px-4 font-mono">Actual Cost</th>
                  <th className="py-3 px-4 font-mono text-center">Realized Margin</th>
                  <th className="py-3 px-4">Variance Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCostings.map((cst: JobCostingRecord) => (
                  <tr key={cst.id} className="hover:bg-slate-50/50">
                    {/* Job & Customer */}
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/${slug}/costing/${cst.id}`}
                        className="font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 group"
                      >
                        <span>{cst.job_number}</span>
                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{cst.customer_name}</div>
                    </td>

                    {/* Work Description */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-700 dark:text-slate-300 max-w-[200px] truncate">
                        {cst.item_title}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">{cst.dimensions_spec}</div>
                    </td>

                    {/* Selling Price */}
                    <td className="py-3.5 px-4 font-mono font-black text-sm text-slate-900 dark:text-white">
                      ৳ {formatBDT(cst.selling_price)}
                    </td>

                    {/* Estimated Cost */}
                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      {isSalesRoleShielded ? '••••••' : `৳ ${formatBDT(cst.est.total_cost)}`}
                    </td>

                    {/* Actual Cost */}
                    <td className="py-3.5 px-4 font-mono font-bold">
                      {isSalesRoleShielded ? (
                        '••••••'
                      ) : cst.status === 'actualized' ? (
                        <span className="text-slate-900 dark:text-white">৳ {formatBDT(cst.act.total_cost)}</span>
                      ) : (
                        <span className="text-slate-400 italic">In progress</span>
                      )}
                    </td>

                    {/* Realized Margin */}
                    <td className="py-3.5 px-4 text-center font-mono">
                      {isSalesRoleShielded ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                          Shielded
                        </span>
                      ) : cst.status === 'actualized' ? (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-black ${
                            cst.act.margin_percentage >= 35
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : cst.act.margin_percentage >= 20
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {cst.act.margin_percentage}%
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Est: {cst.est.margin_percentage}%</span>
                      )}
                    </td>

                    {/* Variance Status */}
                    <td className="py-3.5 px-4">
                      {isSalesRoleShielded ? (
                        <span className="text-[10px] text-slate-400 font-mono">Active</span>
                      ) : cst.status === 'actualized' ? (
                        cst.variances.total_variance < 0 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <TrendingDown className="h-3 w-3 text-emerald-600" />
                            Saved ৳ {formatBDT(Math.abs(cst.variances.total_variance))}
                          </span>
                        ) : cst.variances.total_variance > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                            <TrendingUp className="h-3 w-3 text-red-600" />
                            Overrun +৳ {formatBDT(cst.variances.total_variance)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-mono">On Budget</span>
                        )
                      ) : (
                        <span className="text-[10px] text-blue-600 font-mono">In Production</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setNegotiatingJob(cst)
                            setDiscountPercent(5)
                          }}
                          className="h-7 text-[11px] px-2 text-slate-700 border-slate-300 hover:bg-slate-50"
                        >
                          Negotiate
                        </Button>

                        {!isSalesRoleShielded && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setEditingJob(cst)
                              setActMaterial(cst.act.material_cost || cst.est.material_cost)
                              setActLabor(cst.act.labor_cost || cst.est.labor_cost)
                              setActTransport(cst.act.transport_cost || cst.est.transport_cost)
                            }}
                            className="h-7 text-[11px] px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                          >
                            Actuals
                          </Button>
                        )}

                        <Link
                          href={`/${slug}/costing/${cst.id}`}
                          className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold text-blue-600 hover:bg-blue-50"
                        >
                          Details
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredCostings.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                      No job costings found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {filteredCostings.map((cst: JobCostingRecord) => (
              <div key={cst.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`/${slug}/costing/${cst.id}`}
                      className="font-mono font-bold text-xs text-blue-600 hover:underline"
                    >
                      {cst.job_number}
                    </Link>
                    <div className="font-semibold text-sm text-slate-900 dark:text-white mt-0.5">
                      {cst.customer_name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-black text-sm text-slate-900 dark:text-white">
                      ৳ {formatBDT(cst.selling_price)}
                    </div>
                    {isSalesRoleShielded ? (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600">
                        Shielded
                      </span>
                    ) : cst.status === 'actualized' ? (
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black ${
                          cst.act.margin_percentage >= 35
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : cst.act.margin_percentage >= 20
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {cst.act.margin_percentage}% Margin
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[10px]">Est: {cst.est.margin_percentage}%</span>
                    )}
                  </div>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/60">
                  <div className="font-medium text-slate-800 dark:text-slate-200">{cst.item_title}</div>
                  <div className="text-[11px] font-mono text-slate-400 mt-0.5">{cst.dimensions_spec}</div>
                </div>

                {/* Costs & Variance Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase">Est vs Act Cost</span>
                    <span className="font-mono font-semibold">
                      {isSalesRoleShielded ? '••••••' : `৳${formatBDT(cst.est.total_cost)} / ৳${cst.status === 'actualized' ? formatBDT(cst.act.total_cost) : '—'}`}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase">Variance</span>
                    {isSalesRoleShielded ? (
                      <span className="font-mono text-slate-400">••••</span>
                    ) : cst.status === 'actualized' ? (
                      cst.variances.total_variance < 0 ? (
                        <span className="text-[11px] font-bold text-emerald-600 font-mono">
                          Saved ৳{formatBDT(Math.abs(cst.variances.total_variance))}
                        </span>
                      ) : cst.variances.total_variance > 0 ? (
                        <span className="text-[11px] font-bold text-red-600 font-mono">
                          +৳{formatBDT(cst.variances.total_variance)}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-mono">On Budget</span>
                      )
                    ) : (
                      <span className="text-[11px] text-blue-600 font-mono">In Prod</span>
                    )}
                  </div>
                </div>

                {/* Mobile Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setNegotiatingJob(cst)
                      setDiscountPercent(5)
                    }}
                    className="flex-1 h-9 text-xs font-semibold"
                  >
                    Negotiate
                  </Button>

                  {!isSalesRoleShielded && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingJob(cst)
                        setActMaterial(cst.act.material_cost || cst.est.material_cost)
                        setActLabor(cst.act.labor_cost || cst.est.labor_cost)
                        setActTransport(cst.act.transport_cost || cst.est.transport_cost)
                      }}
                      className="flex-1 h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                      Actuals
                    </Button>
                  )}

                  <Link
                    href={`/${slug}/costing/${cst.id}`}
                    className="inline-flex items-center justify-center h-9 px-3 rounded-md text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Details
                  </Link>
                </div>
              </div>
            ))}
            {filteredCostings.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                No job costings found.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* =========================================================================
          MODAL: CUSTOMER PRICE NEGOTIATION WITH MARGIN GUARD
         ========================================================================= */}
      <ModalDialog
        open={Boolean(negotiatingJob)}
        onOpenChange={(open) => !open && setNegotiatingJob(null)}
        title="Customer Price Negotiation & Margin Guard"
        description="Simulate discount proposal and verify profitability before confirming quotation."
      >
        {negotiatingJob && negotiationResult && (
          <div className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto px-1">
            <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between font-bold">
                <span>Job: {negotiatingJob.job_number}</span>
                <span className="text-blue-600">{negotiatingJob.customer_name}</span>
              </div>
              <div className="text-slate-500">{negotiatingJob.item_title}</div>
            </div>

            {/* Discount Slider & Input */}
            <div className="space-y-2 p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-xl">
              <div className="flex justify-between items-center text-xs">
                <Label htmlFor="discSlider" className="font-bold text-blue-900 dark:text-blue-200">
                  Proposed Discount Percentage (%)
                </Label>
                <div className="flex items-center gap-1 font-mono font-black text-sm text-blue-700">
                  <Input
                    id="discSlider"
                    type="number"
                    min="0"
                    max="50"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                    className="w-16 h-7 text-xs text-right font-mono font-bold"
                  />
                  <span>%</span>
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="40"
                step="1"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            {/* Live Impact Waterfall */}
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Original List Price:</span>
                <span className="font-bold">৳ {formatBDT(negotiatingJob.selling_price)}</span>
              </div>

              <div className="flex justify-between text-red-600 font-bold">
                <span>(-) Proposed Discount:</span>
                <span>-৳ {formatBDT(negotiationResult.discountAmount)} ({discountPercent}%)</span>
              </div>

              <div className="flex justify-between pt-2 border-t font-black text-sm text-slate-900 dark:text-white">
                <span>Final Negotiated Price:</span>
                <span className="text-blue-600">৳ {formatBDT(negotiationResult.finalPrice)}</span>
              </div>

              {/* Sensitive Margin Display (Hidden if sales rep is shielded) */}
              <div className="flex justify-between pt-2 border-t items-center">
                <span className="text-slate-500">Resulting Profit Margin:</span>
                {isSalesRoleShielded ? (
                  <span className="font-bold text-slate-400">Shielded by Company Policy</span>
                ) : (
                  <span
                    className={`font-black text-sm px-2 py-0.5 rounded ${
                      negotiationResult.isSafeMargin
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800 animate-pulse'
                    }`}
                  >
                    {negotiationResult.finalMargin}%
                  </span>
                )}
              </div>
            </div>

            {/* Safety Threshold Alert */}
            {!negotiationResult.isSafeMargin && !isSalesRoleShielded && (
              <div className="p-3 bg-red-50 text-red-900 rounded-lg text-xs font-semibold flex items-center gap-2 border border-red-200">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                <span>
                  <strong>Margin Guard Triggered: </strong>
                  The proposed price yields a margin below 20%. Requires Managing Director authorization.
                </span>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setNegotiatingJob(null)} className="w-full sm:w-auto h-10 sm:h-9">
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  showNotification(
                    `Quotation updated with approved price of ৳ ${formatBDT(negotiationResult.finalPrice)}.`
                  )
                  setNegotiatingJob(null)
                }}
                className={`font-bold text-white w-full sm:w-auto h-10 sm:h-9 ${
                  negotiationResult.isSafeMargin ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                Apply Negotiated Price
              </Button>
            </div>
          </div>
        )}
      </ModalDialog>

      {/* =========================================================================
          MODAL: RECORD ACTUAL PRODUCTION COSTS
         ========================================================================= */}
      <ModalDialog
        open={Boolean(editingJob)}
        onOpenChange={(open) => !open && setEditingJob(null)}
        title="Record Post-Production Actual Costs"
        description="Update realized substrate consumption, machine operator hours, and delivery transit."
      >
        {editingJob && (
          <form onSubmit={handleSaveActuals} className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto px-1">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border text-xs">
              <strong>{editingJob.job_number}</strong>: {editingJob.item_title}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="actMat" required>Actual Material (৳)</Label>
                <Input
                  id="actMat"
                  type="number"
                  value={actMaterial}
                  onChange={(e) => setActMaterial(Number(e.target.value))}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="actLab" required>Actual Labor (৳)</Label>
                <Input
                  id="actLab"
                  type="number"
                  value={actLabor}
                  onChange={(e) => setActLabor(Number(e.target.value))}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="actTr" required>Actual Transport (৳)</Label>
                <Input
                  id="actTr"
                  type="number"
                  value={actTransport}
                  onChange={(e) => setActTransport(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setEditingJob(null)} className="w-full sm:w-auto h-10 sm:h-9">
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold w-full sm:w-auto h-10 sm:h-9">
                Compute Variance & Finalize Costing
              </Button>
            </div>
          </form>
        )}
      </ModalDialog>
      </div>
    </FeatureGate>
  )
}
