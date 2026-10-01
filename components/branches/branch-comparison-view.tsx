'use client'

import type { BranchComparisonData } from '../../types/branch.types.ts'

interface BranchComparisonViewProps {
  data: BranchComparisonData
}

export function BranchComparisonView({ data }: BranchComparisonViewProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground dark:text-foreground">
          Branch Comparison Matrix / শাখা সমূহের পারফরম্যান্স তুলনা
        </h2>
        <p className="text-sm text-muted-foreground dark:text-muted-foreground">
          Executive comparative breakdown of revenue, gross profit, margin %, job completion, and rework rates
        </p>
      </div>

      {/* Summary Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 bg-gradient-to-r from-primary-900/20 via-slate-900/40 to-emerald-900/20 rounded-2xl border border-border dark:border-border">
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">Total Company Revenue</div>
          <div className="text-2xl font-black text-foreground dark:text-foreground">
            ৳{data.totals.total_revenue.toLocaleString('en-IN')}
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">Total Gross Profit</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            ৳{data.totals.total_gross_profit.toLocaleString('en-IN')}
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">Avg Gross Margin</div>
          <div className="text-2xl font-black text-primary-600 dark:text-primary-400">
            {data.totals.average_gross_margin_percent}%
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">Total Net Profit</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            ৳{data.totals.total_net_profit.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-muted-foreground dark:text-muted-foreground">
            <thead className="bg-muted text-xs uppercase font-semibold text-muted-foreground border-b border-border dark:border-border">
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
            <tbody className="divide-y divide-border dark:divide-border">
              {data.branches.map((b) => (
                <tr
                  key={b.branch_id}
                  className="hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="font-bold text-foreground dark:text-foreground">
                      {b.branch_name}
                    </div>
                    <div className="text-xs text-muted-foreground tabular-nums font-semibold">
                      {b.branch_code}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-foreground dark:text-foreground">
                    ৳{b.revenue.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 text-right text-muted-foreground">
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
                  <td className="px-6 py-4 text-right text-muted-foreground">
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
                        b.rework_rate > 5 ? 'text-rose-600' : 'text-muted-foreground'
                      }`}
                    >
                      {b.rework_rate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted font-bold text-foreground border-t-2 border-border dark:border-border">
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
