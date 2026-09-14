'use client'

import type { BranchComparisonData } from '../../types/branch.types.ts'

interface BranchComparisonViewProps {
  data: BranchComparisonData
}

export function BranchComparisonView({ data }: BranchComparisonViewProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Branch Comparison Matrix / শাখা সমূহের পারফরম্যান্স তুলনা
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Executive comparative breakdown of revenue, gross profit, margin %, job completion, and rework rates
        </p>
      </div>

      {/* Summary Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 bg-gradient-to-r from-primary-900/20 via-slate-900/40 to-emerald-900/20 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div>
          <div className="text-xs font-semibold uppercase text-slate-400">Total Company Revenue</div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
            ৳{data.totals.total_revenue.toLocaleString('en-IN')}
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase text-slate-400">Total Gross Profit</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            ৳{data.totals.total_gross_profit.toLocaleString('en-IN')}
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase text-slate-400">Avg Gross Margin</div>
          <div className="text-2xl font-black text-primary-600 dark:text-primary-400">
            {data.totals.average_gross_margin_percent}%
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase text-slate-400">Total Net Profit</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            ৳{data.totals.total_net_profit.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Branch</th>
                <th className="px-6 py-4 text-right">Revenue (৳)</th>
                <th className="px-6 py-4 text-right">COGS (৳)</th>
                <th className="px-6 py-4 text-right">Gross Profit (৳)</th>
                <th className="px-6 py-4 text-right">Gross Margin</th>
                <th className="px-6 py-4 text-right">Opex (৳)</th>
                <th className="px-6 py-4 text-right">Net Profit (৳)</th>
                <th className="px-6 py-4 text-right">Jobs Completed</th>
                <th className="px-6 py-4 text-right">Rework %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.branches.map((b) => (
                <tr
                  key={b.branch_id}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900 dark:text-slate-100">
                      {b.branch_name}
                    </div>
                    <div className="text-xs text-slate-400 font-mono font-semibold">
                      {b.branch_code}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-slate-900 dark:text-slate-100">
                    ৳{b.revenue.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-500">
                    ৳{b.cost_of_goods_sold.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                    ৳{b.gross_profit.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                      {b.gross_margin_percent}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-slate-500">
                    ৳{b.operating_expenses.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                    ৳{b.net_profit.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 text-right font-medium">
                    {b.completed_jobs_count} / {b.jobs_count}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span
                      className={`text-xs font-bold ${
                        b.rework_rate > 5 ? 'text-rose-600' : 'text-slate-500'
                      }`}
                    >
                      {b.rework_rate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 dark:bg-slate-800/80 font-bold text-slate-900 dark:text-slate-100 border-t-2 border-slate-200 dark:border-slate-700">
              <tr>
                <td className="px-6 py-4">Total / মোট</td>
                <td className="px-6 py-4 text-right">
                  ৳{data.totals.total_revenue.toLocaleString('en-IN')}
                </td>
                <td className="px-6 py-4 text-right">
                  ৳{data.totals.total_cogs.toLocaleString('en-IN')}
                </td>
                <td className="px-6 py-4 text-right text-emerald-600 dark:text-emerald-400">
                  ৳{data.totals.total_gross_profit.toLocaleString('en-IN')}
                </td>
                <td className="px-6 py-4 text-right">
                  {data.totals.average_gross_margin_percent}%
                </td>
                <td className="px-6 py-4 text-right">
                  ৳{data.totals.total_operating_expenses.toLocaleString('en-IN')}
                </td>
                <td className="px-6 py-4 text-right text-emerald-600 dark:text-emerald-400">
                  ৳{data.totals.total_net_profit.toLocaleString('en-IN')}
                </td>
                <td className="px-6 py-4 text-right">
                  {data.totals.total_completed_jobs} / {data.totals.total_jobs}
                </td>
                <td className="px-6 py-4 text-right">—</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
