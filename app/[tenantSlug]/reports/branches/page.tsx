'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { PageHeader } from '@/components/shared/page-header'
import { BranchPerformanceDashboard } from '@/components/branches/branch-performance-dashboard'
import { BranchComparisonView } from '@/components/branches/branch-comparison-view'
import { BranchSwitcher } from '@/components/branches/branch-switcher'
import {
  getBranchKPIsAction,
  getBranchComparisonAction,
  getConsolidatedDashboardAction,
} from '@/actions/branch-analytics.actions'
import { listBranchesAction } from '@/actions/branch.actions'
import type {
  BranchMasterRecord,
  BranchKPIs,
  BranchComparisonData,
  ConsolidatedCompanyDashboardData,
} from '@/types/branch.types'
import {
  GitBranch,
  RefreshCw,
  BarChart3,
  TrendingUp,
  Layers,
  ArrowLeft,
  FileText,
  Calculator,
  Building,
  Printer,
  FileSpreadsheet,
  Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { exportToCsv } from '@/services/reports.service'

export default function MultiBranchReportingPage() {
  const { currentBranch, company } = useTenant()
  const { tBilingual } = useI18n()
  const params = useParams()
  const pathname = usePathname()
  const router = useRouter()
  const tenantSlug = (params?.tenantSlug as string) || 'rangao'

  const [mounted, setMounted] = useState(false)
  const [branches, setBranches] = useState<BranchMasterRecord[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'kpi' | 'comparison' | 'consolidated'>('kpi')
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'this_week' | 'this_month' | 'this_quarter' | 'all'>('this_month')
  const [kpis, setKpis] = useState<BranchKPIs | null>(null)
  const [comparisonData, setComparisonData] = useState<BranchComparisonData | null>(null)
  const [consolidatedData, setConsolidatedData] = useState<ConsolidatedCompanyDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setMounted(true)
  }, [])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const bRes = await listBranchesAction({ includeInactive: false })
      if (bRes.success && bRes.data) {
        setBranches(bRes.data as BranchMasterRecord[])
      }

      if (selectedBranchId) {
        const kRes = await getBranchKPIsAction(selectedBranchId)
        if (kRes.success && kRes.data) {
          setKpis(kRes.data as BranchKPIs)
        }
      } else {
        const cRes = await getConsolidatedDashboardAction(selectedPeriod === 'all' ? 'this_month' : selectedPeriod)
        if (cRes.success && cRes.data) {
          setConsolidatedData(cRes.data as ConsolidatedCompanyDashboardData)
        }
      }

      const compRes = await getBranchComparisonAction(selectedPeriod === 'all' ? 'this_month' : selectedPeriod)
      if (compRes.success && compRes.data) {
        setComparisonData(compRes.data as BranchComparisonData)
      }
    } catch (err) {
      console.error('Error loading branch telemetry:', err)
    } finally {
      setIsLoading(false)
    }
  }, [selectedBranchId, selectedPeriod])

  useEffect(() => {
    if (mounted) {
      loadData()
    }
  }, [mounted, loadData])

  // Real-time synchronization listeners
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleDataSync = () => {
      loadData()
    }

    window.addEventListener('printerp_table_synced:branches', handleDataSync)
    window.addEventListener('printerp_table_synced:orders', handleDataSync)
    window.addEventListener('printerp_table_synced:payments', handleDataSync)
    window.addEventListener('printerp_table_synced:materials', handleDataSync)
    window.addEventListener('printerp_data_sync', handleDataSync)

    return () => {
      window.removeEventListener('printerp_table_synced:branches', handleDataSync)
      window.removeEventListener('printerp_table_synced:orders', handleDataSync)
      window.removeEventListener('printerp_table_synced:payments', handleDataSync)
      window.removeEventListener('printerp_table_synced:materials', handleDataSync)
      window.removeEventListener('printerp_data_sync', handleDataSync)
    }
  }, [loadData])

  // Export Branch Comparison CSV
  const handleExportComparison = () => {
    if (!comparisonData || !comparisonData.branches || comparisonData.branches.length === 0) return

    const headers = [
      'Branch Name',
      'Branch Code',
      'Revenue (BDT)',
      'COGS (BDT)',
      'Gross Profit (BDT)',
      'Gross Margin %',
      'OPEX (BDT)',
      'Net Profit (BDT)',
      'Net Margin %',
      'Total Jobs',
      'Completed Jobs',
      'Completion Rate %',
      'Rework Rate %',
    ]

    const rows = comparisonData.branches.map((b) => [
      b.branch_name,
      b.branch_code,
      b.revenue,
      b.cost_of_goods_sold,
      b.gross_profit,
      `${b.gross_margin_percent}%`,
      b.operating_expenses,
      b.net_profit,
      `${b.net_margin_percent}%`,
      b.jobs_count,
      b.completed_jobs_count,
      `${b.on_time_delivery_rate}%`,
      `${b.rework_rate}%`,
    ])

    exportToCsv(
      `Branch_Comparison_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.csv`,
      headers,
      rows
    )
  }

  if (!mounted) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 animate-pulse">
        <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
        <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-xl w-3/4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 print:p-0 print:max-w-none">
      {/* Navigation shortcuts / Breadcrumbs */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm print:hidden">
        <div className="flex items-center gap-2">
          <Link
            href={getTenantNavHref('/reports', pathname, tenantSlug)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm hover:border-primary-300 transition-all min-h-[36px]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{tBilingual('Back to BI Reports', 'মূল বিআই রিপোর্টে ফিরে যান')}</span>
          </Link>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1">
            <GitBranch className="w-3.5 h-3.5 text-blue-600" />
            {tBilingual('Multi-Branch Telemetry', 'মাল্টি-ব্রাঞ্চ টেলিমেট্রি')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={getTenantNavHref('/costing', pathname, tenantSlug)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
          >
            <Calculator className="w-3 h-3" />
            <span>{tBilingual('Job Costing', 'কস্টিং')}</span>
          </Link>
          <Link
            href={getTenantNavHref('/accounting', pathname, tenantSlug)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
          >
            <FileText className="w-3 h-3" />
            <span>{tBilingual('OPEX Accounting', 'হিসাবরক্ষণ')}</span>
          </Link>
          <Link
            href={getTenantNavHref('/hr/salary-report', pathname, tenantSlug)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
          >
            <Building className="w-3 h-3" />
            <span>{tBilingual('Salary Reports', 'বেতন রিপোর্ট')}</span>
          </Link>
        </div>
      </div>

      <PageHeader
        titleEn="Multi-Branch Management & Analytics"
        titleBn="মাল্টি-ব্রাঞ্চ ব্যবস্থাপনা ও অ্যানালিটিক্স"
        descriptionEn="Live telemetry, performance KPIs, branch comparison matrix and cross-branch logistics across Dhaka printing hubs."
        descriptionBn="আরামবাগ, নীলক্ষেত, তেজগাঁও ও নয়াবাজার শাখা সমূহের লাইভ টেলিমেট্রি, পারফরম্যান্স তুলনা এবং সমন্বিত ড্যাশবোর্ড।"
        icon={GitBranch}
        iconColor="text-blue-600"
        actions={
          <div className="flex flex-wrap items-center gap-2.5 print:hidden">
            <BranchSwitcher
              branches={branches}
              selectedBranchId={selectedBranchId}
              onSelectBranch={(bId) => setSelectedBranchId(bId)}
            />

            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
              <Calendar className="w-3.5 h-3.5 ml-2 text-slate-400" />
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as any)}
                className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 py-1.5 px-2 focus:outline-none cursor-pointer"
              >
                <option value="today">{tBilingual('Today', 'আজ')}</option>
                <option value="this_week">{tBilingual('This Week', 'এই সপ্তাহ')}</option>
                <option value="this_month">{tBilingual('This Month', 'এই মাস')}</option>
                <option value="this_quarter">{tBilingual('This Quarter', 'এই কোয়ার্টার')}</option>
                <option value="all">{tBilingual('All Time', 'সর্বকাল')}</option>
              </select>
            </div>

            {comparisonData && comparisonData.branches?.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportComparison}
                className="h-10 text-xs font-semibold gap-1.5 border-slate-300 dark:border-slate-700"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">{tBilingual('Export CSV', 'এক্সপোর্ট')}</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="h-10 text-xs font-semibold gap-1.5 border-slate-300 dark:border-slate-700"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              <span className="hidden sm:inline">{tBilingual('Print', 'প্রিন্ট')}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={isLoading}
              className="h-10 px-3 border-slate-300 dark:border-slate-700"
              title={tBilingual('Refresh Data', 'রিফ্রেশ করুন')}
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 dark:text-slate-300 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto print:hidden">
        <button
          onClick={() => setActiveTab('kpi')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center space-x-2 shrink-0 min-h-[44px] ${
            activeTab === 'kpi'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>{selectedBranchId ? tBilingual('Branch KPIs', 'শাখার কেপিআই') : tBilingual('Branch Overview', 'শাখা ওভারভিউ')}</span>
        </button>

        <button
          onClick={() => setActiveTab('comparison')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center space-x-2 shrink-0 min-h-[44px] ${
            activeTab === 'comparison'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>{tBilingual('Branch Comparison Matrix', 'শাখা তুলনা ম্যাট্রিক্স')}</span>
        </button>

        <button
          onClick={() => setActiveTab('consolidated')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center space-x-2 shrink-0 min-h-[44px] ${
            activeTab === 'consolidated'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>{tBilingual('Consolidated Company View', 'সমন্বিত কোম্পানি ভিউ')}</span>
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
          <p className="text-sm font-medium text-slate-500">
            {tBilingual('Loading multi-branch telemetry...', 'মাল্টি-ব্রাঞ্চ টেলিমেট্রি লোড হচ্ছে...')}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeTab === 'kpi' && kpis && (
            <BranchPerformanceDashboard kpis={kpis} onRefresh={loadData} />
          )}

          {activeTab === 'kpi' && !selectedBranchId && comparisonData && (
            <BranchComparisonView data={comparisonData} />
          )}

          {activeTab === 'comparison' && comparisonData && (
            <BranchComparisonView data={comparisonData} />
          )}

          {activeTab === 'consolidated' && consolidatedData && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                  <span className="text-xs text-slate-400 font-semibold uppercase block">
                    {tBilingual('Total Revenue', 'মোট বিক্রয়')}
                  </span>
                  <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                    ৳{consolidatedData.kpis.revenue.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold uppercase block">
                    {tBilingual('Gross Profit', 'মোট লাভ')}
                  </span>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    ৳{consolidatedData.kpis.gross_profit.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl">
                  <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold uppercase block">
                    {tBilingual('Net Receivables (Due)', 'বাকি পাওনা')}
                  </span>
                  <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                    ৳{consolidatedData.kpis.receivables.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase block">
                    {tBilingual('Stock Valuation', 'স্টক মূল্যায়ন')}
                  </span>
                  <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                    ৳{consolidatedData.kpis.inventory_value.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {comparisonData && <BranchComparisonView data={comparisonData} />}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

