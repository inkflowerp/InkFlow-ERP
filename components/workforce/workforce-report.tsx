'use client'

import React, { useState, useMemo } from 'react'
import {
  FileSpreadsheet,
  Calendar,
  Printer,
  Download,
  Search,
  Filter,
  Users,
  Wallet,
  Clock,
  Clock4,
  Coins,
  TrendingUp,
  Building,
  CheckCircle2,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import type {
  EmployeeRecord,
  PayrollPeriodRecord,
  PayrollItemRecord,
  SalaryAdvanceRecord,
  OvertimeRecord,
} from '@/types/workforce.types'

export interface WorkforceReportProps {
  employees: EmployeeRecord[]
  payrollPeriods: PayrollPeriodRecord[]
  advances: SalaryAdvanceRecord[]
  overtimeRecords: OvertimeRecord[]
  isLoading?: boolean
  tenantSlug: string
}

export function WorkforceReport({
  employees,
  payrollPeriods,
  advances,
  overtimeRecords,
  isLoading = false,
  tenantSlug,
}: WorkforceReportProps) {
  const [activeTab, setActiveTab] = useState<'attendance' | 'salary' | 'overtime' | 'advances' | 'cost'>('salary')
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(
    payrollPeriods[0]?.id || ''
  )
  const [searchTerm, setSearchTerm] = useState('')
  const [deptFilter, setDeptFilter] = useState('ALL')

  const selectedPeriod = useMemo(() => {
    return payrollPeriods.find((p) => p.id === selectedPeriodId) || payrollPeriods[0] || null
  }, [payrollPeriods, selectedPeriodId])

  // Filtered Items for Salary Report
  const filteredItems = useMemo(() => {
    if (!selectedPeriod || !selectedPeriod.items) return []
    return selectedPeriod.items.filter((item) => {
      const q = searchTerm.toLowerCase().trim()
      if (q && !item.employee_name.toLowerCase().includes(q) && !item.role?.toLowerCase().includes(q)) {
        return false
      }
      if (deptFilter !== 'ALL' && item.department?.toLowerCase() !== deptFilter.toLowerCase()) {
        return false
      }
      return true
    })
  }, [selectedPeriod, searchTerm, deptFilter])

  // Export to CSV Function
  const handleExportCSV = () => {
    if (filteredItems.length === 0) return
    const headers = [
      'Employee Name',
      'Employee ID',
      'Department',
      'Role',
      'Base Salary',
      'Present Days',
      'OT Hours',
      'OT Amount',
      'Bonuses',
      'Advance Deducted',
      'Net Salary',
      'Paid Amount',
      'Due Amount',
    ]

    const rows = filteredItems.map((it) => [
      `"${it.employee_name}"`,
      `"${it.employee_id_number || ''}"`,
      `"${it.department || ''}"`,
      `"${it.role || ''}"`,
      it.base_salary || 0,
      it.days_present || 0,
      it.overtime_hours || 0,
      it.overtime_amount || 0,
      it.bonuses || 0,
      it.advance_salary_deducted || 0,
      it.net_salary || 0,
      it.paid_amount || 0,
      it.due_amount || 0,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `workforce-salary-report-${selectedPeriod?.period_name || 'sheet'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Cost Metrics
  const costBreakdown = useMemo(() => {
    const gross = payrollPeriods.reduce((acc, p) => acc + Number(p.total_gross_salary || 0), 0)
    const otTotal = overtimeRecords
      .filter((o) => o.status === 'approved' || o.status === 'paid')
      .reduce((acc, o) => acc + Number(o.calculated_amount || 0), 0)
    const advOutstanding = advances
      .filter((a) => !a.is_settled)
      .reduce((acc, a) => acc + Number(a.remaining_amount || a.amount || 0), 0)

    return {
      grossSalaries: gross,
      totalOvertime: otTotal,
      advancesOutstanding: advOutstanding,
      totalCommittedCost: gross + otTotal,
    }
  }, [payrollPeriods, overtimeRecords, advances])

  if (isLoading) {
    return (
      <Card className="bg-card border-border p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      {/* Top Report Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab as any} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-2">
          <TabsList className="bg-muted p-1 h-9 rounded-lg">
            <TabsTrigger value="salary" className="text-xs px-3 py-1 font-medium">
              Salary Report
            </TabsTrigger>
            <TabsTrigger value="attendance" className="text-xs px-3 py-1 font-medium">
              Attendance Report
            </TabsTrigger>
            <TabsTrigger value="overtime" className="text-xs px-3 py-1 font-medium">
              Overtime Report
            </TabsTrigger>
            <TabsTrigger value="advances" className="text-xs px-3 py-1 font-medium">
              Advances Report
            </TabsTrigger>
            <TabsTrigger value="cost" className="text-xs px-3 py-1 font-medium">
              Workforce Cost
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="h-8 px-2.5 text-xs text-foreground bg-card border-border hover:bg-muted min-h-[32px]"
            >
              <Download className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
              <span>Export CSV</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="h-8 px-2.5 text-xs text-foreground bg-card border-border hover:bg-muted min-h-[32px]"
            >
              <Printer className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
              <span>Print</span>
            </Button>
          </div>
        </div>

        {/* 1. SALARY REPORT TAB */}
        <TabsContent value="salary" className="pt-4 space-y-4">
          {/* Period & Department Selector */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3.5 rounded-xl border border-border">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground shrink-0">Payroll Period:</span>
              <select
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                className="h-8 rounded-lg border border-border bg-card px-3 text-xs text-foreground font-medium"
              >
                {payrollPeriods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.period_name} ({p.status.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Filter by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-xs w-44 bg-muted border-border"
                />
              </div>

              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground"
              >
                <option value="ALL">All Departments</option>
                <option value="printing">Printing</option>
                <option value="finishing">Finishing</option>
                <option value="fabrication">Fabrication</option>
                <option value="design">Design</option>
                <option value="accounts">Accounts</option>
                <option value="management">Management</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {filteredItems.length === 0 ? (
            <Card className="bg-card border-border py-12 text-center">
              <p className="text-sm font-medium text-muted-foreground">No data for selected period</p>
              <p className="text-xs text-muted-foreground mt-1">Generate a payroll period draft to view salary reports.</p>
            </Card>
          ) : (
            <Card className="bg-card border-border shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted border-b border-border text-muted-foreground uppercase tracking-wider font-semibold text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-3">Department</th>
                      <th className="py-3 px-3 text-right">Base Salary</th>
                      <th className="py-3 px-3 text-center">Days</th>
                      <th className="py-3 px-3 text-right">OT Amount</th>
                      <th className="py-3 px-3 text-right">Bonuses</th>
                      <th className="py-3 px-3 text-right">Advance Ded.</th>
                      <th className="py-3 px-3 text-right">Net Payable</th>
                      <th className="py-3 px-3 text-right">Paid</th>
                      <th className="py-3 px-3 text-right">Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-muted transition-colors">
                        <td className="py-3 px-4 font-semibold text-foreground">{item.employee_name}</td>
                        <td className="py-3 px-3 capitalize text-muted-foreground">{item.department}</td>
                        <td className="py-3 px-3 text-right tabular-nums text-foreground">
                          ৳ {Number(item.base_salary || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3 text-center tabular-nums text-foreground">
                          {item.days_present || 0}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums text-indigo-600">
                          ৳ {Number(item.overtime_amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums text-emerald-600">
                          ৳ {Number(item.bonuses || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums text-amber-600">
                          ৳ {Number(item.advance_salary_deducted || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3 text-right font-bold tabular-nums text-foreground">
                          ৳ {Number(item.net_salary || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3 text-right font-bold tabular-nums text-emerald-600">
                          ৳ {Number(item.paid_amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3 text-right font-bold tabular-nums text-rose-600">
                          ৳ {Number(item.due_amount || 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* 2. ATTENDANCE REPORT TAB */}
        <TabsContent value="attendance" className="pt-4 space-y-4">
          <Card className="bg-card border-border p-5 rounded-xl">
            <h3 className="text-sm font-bold text-foreground mb-1">Attendance Analytics</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Historical presence, late minutes, and field work counts across employees
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-muted rounded-lg border border-border">
                <span className="text-[11px] text-muted-foreground block">Total Staff Tracked</span>
                <span className="text-lg font-bold text-foreground">{employees.length}</span>
              </div>
              <div className="p-3 bg-muted rounded-lg border border-border">
                <span className="text-[11px] text-muted-foreground block">Active Status</span>
                <span className="text-lg font-bold text-emerald-600">
                  {employees.filter((e) => e.status === 'active').length}
                </span>
              </div>
              <div className="p-3 bg-muted rounded-lg border border-border">
                <span className="text-[11px] text-muted-foreground block">On Leave</span>
                <span className="text-lg font-bold text-amber-600">
                  {employees.filter((e) => e.status === 'on_leave').length}
                </span>
              </div>
              <div className="p-3 bg-muted rounded-lg border border-border">
                <span className="text-[11px] text-muted-foreground block">Daily Labor</span>
                <span className="text-lg font-bold text-blue-600">
                  {employees.filter((e) => e.salary_basis === 'daily_rate' || e.is_daily_worker).length}
                </span>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* 3. OVERTIME REPORT TAB */}
        <TabsContent value="overtime" className="pt-4 space-y-4">
          <Card className="bg-card border-border p-5 rounded-xl">
            <h3 className="text-sm font-bold text-foreground mb-1">Overtime Breakdown</h3>
            <p className="text-xs text-muted-foreground mb-4">Total overtime volume and expenditures</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-muted rounded-lg border border-border">
                <span className="text-[11px] text-muted-foreground block">Approved Overtime Hours</span>
                <span className="text-lg font-bold text-indigo-600">
                  {overtimeRecords
                    .filter((o) => o.status === 'approved')
                    .reduce((sum, o) => sum + (o.duration_hours || 0), 0)}{' '}
                  hrs
                </span>
              </div>
              <div className="p-3 bg-muted rounded-lg border border-border">
                <span className="text-[11px] text-muted-foreground block">Approved OT Amount</span>
                <span className="text-lg font-bold text-foreground tabular-nums">
                  ৳{' '}
                  {overtimeRecords
                    .filter((o) => o.status === 'approved')
                    .reduce((sum, o) => sum + Number(o.calculated_amount || 0), 0)
                    .toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-3 bg-muted rounded-lg border border-border">
                <span className="text-[11px] text-muted-foreground block">Pending Requests</span>
                <span className="text-lg font-bold text-amber-600">
                  {overtimeRecords.filter((o) => o.status === 'pending_approval').length}
                </span>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* 4. ADVANCES REPORT TAB */}
        <TabsContent value="advances" className="pt-4 space-y-4">
          <Card className="bg-card border-border p-5 rounded-xl">
            <h3 className="text-sm font-bold text-foreground mb-1">Advance Disbursement & Recovery</h3>
            <p className="text-xs text-muted-foreground mb-4">Cumulative loan vouchers and payroll deductions</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-muted rounded-lg border border-border">
                <span className="text-[11px] text-muted-foreground block">Total Disbursed</span>
                <span className="text-lg font-bold text-foreground tabular-nums">
                  ৳{' '}
                  {advances
                    .reduce((sum, a) => sum + Number(a.amount || 0), 0)
                    .toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-3 bg-muted rounded-lg border border-border">
                <span className="text-[11px] text-muted-foreground block">Total Recovered</span>
                <span className="text-lg font-bold text-emerald-600 tabular-nums">
                  ৳{' '}
                  {advances
                    .reduce((sum, a) => sum + Number(a.deducted_amount || 0), 0)
                    .toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-3 bg-muted rounded-lg border border-border">
                <span className="text-[11px] text-muted-foreground block">Current Outstanding</span>
                <span className="text-lg font-bold text-amber-600 tabular-nums">
                  ৳{' '}
                  {advances
                    .filter((a) => !a.is_settled)
                    .reduce((sum, a) => sum + Number(a.remaining_amount || a.amount || 0), 0)
                    .toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* 5. WORKFORCE COST TAB */}
        <TabsContent value="cost" className="pt-4 space-y-4">
          <Card className="bg-card border-border p-5 rounded-xl">
            <h3 className="text-sm font-bold text-foreground mb-1">Total Workforce Cost Analysis</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Comprehensive internal labor commitment (Salaries + Overtime + Advance exposures)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-muted rounded-lg border border-border">
                <span className="text-[11px] text-muted-foreground block">Gross Payroll Base</span>
                <span className="text-lg font-bold text-foreground tabular-nums">
                  ৳ {costBreakdown.grossSalaries.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-3 bg-muted rounded-lg border border-border">
                <span className="text-[11px] text-muted-foreground block">Approved Overtime Cost</span>
                <span className="text-lg font-bold text-indigo-600 tabular-nums">
                  ৳ {costBreakdown.totalOvertime.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-3 bg-muted rounded-lg border border-border">
                <span className="text-[11px] text-muted-foreground block">Advance Exposure</span>
                <span className="text-lg font-bold text-amber-600 tabular-nums">
                  ৳ {costBreakdown.advancesOutstanding.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <span className="text-[11px] text-blue-700 block font-semibold">Total Labor Cost</span>
                <span className="text-lg font-bold text-blue-900 tabular-nums">
                  ৳ {costBreakdown.totalCommittedCost.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
