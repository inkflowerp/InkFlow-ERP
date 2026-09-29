'use client'

import { useState } from 'react'
import { Briefcase, Printer, Package, Banknote, Users } from 'lucide-react'
import { KpiCard, KpiGrid } from '@/components/shared/kpi-card'
import type { BranchKPIs } from '../../types/branch.types.ts'

interface BranchPerformanceDashboardProps {
  kpis: BranchKPIs
  onRefresh?: () => void
}

export function BranchPerformanceDashboard({
  kpis,
  onRefresh,
}: BranchPerformanceDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('this_month')

  return (
    <div className="space-y-6">
      {/* Header & Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {kpis.branch_name} ({kpis.branch_code})
            </h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time branch operational & financial telemetry
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
          >
            <option value="today">Today / আজ</option>
            <option value="this_week">This Week / এই সপ্তাহ</option>
            <option value="this_month">This Month / এই মাস</option>
            <option value="this_quarter">This Quarter / এই কোয়ার্টার</option>
          </select>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium transition-colors"
            >
              🔄 Refresh
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <KpiGrid columns={3}>
        {/* Card 1: Sales & Revenue */}
        <KpiCard
          titleEn="Sales & Invoicing"
          titleBn="বিক্রি ও ইনভয়েসিং"
          value={kpis.sales.invoice_value}
          isCurrency
          icon={Briefcase}
          colorVariant="primary"
          footer={
            <div className="grid grid-cols-2 gap-2 text-xs pt-2">
              <div>
                <span className="text-slate-400">Invoices: </span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {kpis.sales.invoice_count}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Collection: </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  ৳{kpis.sales.collection_amount.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Due/Outstanding: </span>
                <span className="font-semibold text-rose-600 dark:text-rose-400">
                  ৳{kpis.sales.outstanding_amount.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Quotes: </span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {kpis.sales.quotation_count}
                </span>
              </div>
            </div>
          }
        />

        {/* Card 2: Production Floor */}
        <KpiCard
          titleEn="Production Floor"
          titleBn="উৎপাদন ফ্লোর"
          value={`${kpis.production.in_progress_tasks} Active`}
          subtitleEn={`/ ${kpis.production.completed_tasks} done`}
          subtitleBn={`/ ${kpis.production.completed_tasks} সম্পন্ন`}
          icon={Printer}
          colorVariant="blue"
          footer={
            <div className="grid grid-cols-2 gap-2 text-xs pt-2">
              <div>
                <span className="text-slate-400">Queued: </span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  {kpis.production.queued_tasks}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Utilization: </span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {kpis.production.machine_utilization_rate}%
                </span>
              </div>
              <div>
                <span className="text-slate-400">Reworks: </span>
                <span className="font-semibold text-rose-600 dark:text-rose-400">
                  {kpis.production.rework_tasks}
                </span>
              </div>
            </div>
          }
        />

        {/* Card 3: Inventory & Stock */}
        <KpiCard
          titleEn="Inventory & Stock"
          titleBn="ইনভেন্টরি ও স্টক"
          value={kpis.inventory.total_stock_value}
          isCurrency
          icon={Package}
          colorVariant="emerald"
          badge={kpis.inventory.low_stock_item_count > 0 ? `${kpis.inventory.low_stock_item_count} Low Stock` : undefined}
          badgeColor="rose"
          footer={
            <div className="grid grid-cols-2 gap-2 text-xs pt-2">
              <div>
                <span className="text-slate-400">Low Stock Alert: </span>
                <span className={`font-semibold ${kpis.inventory.low_stock_item_count > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                  {kpis.inventory.low_stock_item_count} items
                </span>
              </div>
              <div>
                <span className="text-slate-400">Inbound Transfers: </span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {kpis.inventory.pending_inbound_transfers}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Outbound Transfers: </span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {kpis.inventory.pending_outbound_transfers}
                </span>
              </div>
            </div>
          }
        />

        {/* Card 4: Finance & Cash Flow */}
        <KpiCard
          titleEn="Branch Cash Balance"
          titleBn="ব্রাঞ্চ ক্যাশ ব্যালেন্স"
          value={kpis.finance.cash_balance}
          isCurrency
          icon={Banknote}
          colorVariant="teal"
          footer={
            <div className="grid grid-cols-2 gap-2 text-xs pt-2">
              <div>
                <span className="text-slate-400">Expenses: </span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  ৳{kpis.finance.total_expenses.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Net Flow: </span>
                <span className={`font-semibold ${kpis.finance.net_cash_flow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  ৳{kpis.finance.net_cash_flow.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          }
        />

        {/* Card 5: Workforce Attendance */}
        <KpiCard
          titleEn="Workforce & Staff"
          titleBn="কর্মী ও স্টাফ"
          value={`${kpis.workforce.present_today} Present`}
          subtitleEn={`of ${kpis.workforce.total_employees} staff`}
          subtitleBn={`মোট ${kpis.workforce.total_employees} জনের`}
          icon={Users}
          colorVariant="purple"
          footer={
            <div className="grid grid-cols-2 gap-2 text-xs pt-2">
              <div>
                <span className="text-slate-400">Total Staff: </span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {kpis.workforce.total_employees}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Cross-Assigned: </span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {kpis.workforce.on_temporary_assignment}
                </span>
              </div>
            </div>
          }
        />
      </KpiGrid>
    </div>
  )
}
