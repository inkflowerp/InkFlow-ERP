'use client'

import { useState } from 'react'
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Sales & Revenue */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Sales & Invoicing</span>
            <span className="text-lg">💼</span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
            ৳{kpis.sales.invoice_value.toLocaleString('en-IN')}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
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
        </div>

        {/* Card 2: Production Floor */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Production Floor</span>
            <span className="text-lg">🖨️</span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
              {kpis.production.in_progress_tasks} Active
            </span>
            <span className="text-xs text-slate-400">
              / {kpis.production.completed_tasks} done
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
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
        </div>

        {/* Card 3: Inventory & Transfers */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Inventory & Stock</span>
            <span className="text-lg">📦</span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
            ৳{kpis.inventory.total_stock_value.toLocaleString('en-IN')}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-slate-400">Low Stock Alert: </span>
              <span className={`font-semibold ${kpis.inventory.low_stock_item_count > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
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
        </div>

        {/* Card 4: Finance & Cash Flow */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Branch Cash Balance</span>
            <span className="text-lg">💵</span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
            ৳{kpis.finance.cash_balance.toLocaleString('en-IN')}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-slate-400">Expenses: </span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                ৳{kpis.finance.total_expenses.toLocaleString('en-IN')}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Net Flow: </span>
              <span className={`font-semibold ${kpis.finance.net_cash_flow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                ৳{kpis.finance.net_cash_flow.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Card 5: Workforce Attendance */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Workforce & Staff</span>
            <span className="text-lg">👥</span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {kpis.workforce.present_today} Present
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
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
        </div>
      </div>
    </div>
  )
}
