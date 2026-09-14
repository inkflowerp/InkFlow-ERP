'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
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
import { GitBranch, RefreshCw, BarChart3, TrendingUp, Layers } from 'lucide-react'

export default function MultiBranchReportingPage() {
  const { currentBranch, company } = useTenant()
  const { tBilingual } = useI18n()

  const [branches, setBranches] = useState<BranchMasterRecord[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'kpi' | 'comparison' | 'consolidated'>('kpi')
  const [kpis, setKpis] = useState<BranchKPIs | null>(null)
  const [comparisonData, setComparisonData] = useState<BranchComparisonData | null>(null)
  const [consolidatedData, setConsolidatedData] = useState<ConsolidatedCompanyDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadData = async () => {
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
        const cRes = await getConsolidatedDashboardAction('this_month')
        if (cRes.success && cRes.data) {
          setConsolidatedData(cRes.data as ConsolidatedCompanyDashboardData)
        }
      }

      const compRes = await getBranchComparisonAction('this_month')
      if (compRes.success && compRes.data) {
        setComparisonData(compRes.data as BranchComparisonData)
      }
    } catch (err) {
      console.error('Error loading branch telemetry:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedBranchId])

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      <PageHeader
        titleEn="Multi-Branch Management & Analytics"
        titleBn="মাল্টি-ব্রাঞ্চ ব্যবস্থাপনা ও অ্যানালিটিক্স"
        descriptionEn="Live telemetry, performance KPIs, branch comparison matrix and cross-branch logistics."
        descriptionBn="শাখা সমূহের লাইভ টেলিমেট্রি, পারফরম্যান্স তুলনা এবং সমন্বিত ব্যবসায়িক ড্যাশবোর্ড।"
        icon={GitBranch}
        iconColor="text-blue-600"
        actions={
          <div className="flex items-center space-x-3">
            <BranchSwitcher
              branches={branches}
              selectedBranchId={selectedBranchId}
              onSelectBranch={(bId) => setSelectedBranchId(bId)}
            />
            <button
              onClick={loadData}
              disabled={isLoading}
              className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors min-h-[44px]"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('kpi')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center space-x-2 min-h-[44px] ${
            activeTab === 'kpi'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>{selectedBranchId ? 'Branch KPIs' : 'Branch Overview'}</span>
        </button>

        <button
          onClick={() => setActiveTab('comparison')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center space-x-2 min-h-[44px] ${
            activeTab === 'comparison'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Branch Comparison Matrix</span>
        </button>

        <button
          onClick={() => setActiveTab('consolidated')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center space-x-2 min-h-[44px] ${
            activeTab === 'consolidated'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Consolidated Company View</span>
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
          <p className="text-sm text-slate-500">Loading multi-branch telemetry...</p>
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
                <div>
                  <span className="text-xs text-slate-400 font-semibold uppercase">Total Revenue</span>
                  <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
                    ৳{consolidatedData.kpis.revenue.toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-semibold uppercase">Gross Profit</span>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    ৳{consolidatedData.kpis.gross_profit.toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-semibold uppercase">Net Receivables</span>
                  <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                    ৳{consolidatedData.kpis.receivables.toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-semibold uppercase">Total Stock Valuation</span>
                  <div className="text-2xl font-black text-primary-600 dark:text-primary-400">
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
