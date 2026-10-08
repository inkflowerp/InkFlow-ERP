'use client'

import React, { useState, useEffect, useMemo, useTransition } from 'react'
import { useI18n } from '@/i18n/context'
import {
  FileSpreadsheet,
  Printer,
  Download,
  Search,
  Filter,
  Users,
  Clock,
  Clock4,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  RefreshCw,
  Building,
  UserCheck,
  UserX,
  ExternalLink,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useTenant } from '@/hooks/use-tenant'
import { getDailyAttendanceAction } from '@/actions/workforce.actions'
import {
  computeAttendanceAnalytics,
  formatMinutesToDuration,
} from '@/lib/attendance/attendance-analytics'
import type {
  EmployeeRecord,
  AttendanceDailySummaryRecord,
  AttendanceDailyStatus,
} from '@/types/workforce.types'

export interface AttendanceReportViewProps {
  employees: EmployeeRecord[]
  initialDate?: string
  tenantSlug: string
  onViewEmployeeProfile?: (employee: EmployeeRecord) => void
}

export function AttendanceReportView({
  employees = [],
  initialDate,
  tenantSlug,
  onViewEmployeeProfile,
}: AttendanceReportViewProps) {
  const { tBilingual } = useI18n()
  const { company } = useTenant()
  const [selectedDate, setSelectedDate] = useState(
    () => initialDate || new Date().toISOString().split('T')[0]
  )
  const [departmentFilter, setDepartmentFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [records, setRecords] = useState<AttendanceDailySummaryRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [isPrinting, setIsPrinting] = useState(false)

  // Fetch Attendance Records for the chosen date
  const loadDailyRecords = async (dateStr: string) => {
    setIsLoading(true)
    try {
      const res = await getDailyAttendanceAction({ date: dateStr })
      if (res.success && res.data) {
        setRecords(res.data)
      } else {
        setRecords([])
      }
    } catch {
      setRecords([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDailyRecords(selectedDate)
  }, [selectedDate])

  // Map employee map for quick lookup
  const employeeMap = useMemo(() => {
    const map = new Map<string, EmployeeRecord>()
    employees.forEach((emp) => map.set(emp.id, emp))
    return map
  }, [employees])

  // Unified items (active employees merged with daily attendance records)
  const mergedItems = useMemo(() => {
    return employees.map((emp) => {
      const rec = records.find((r) => r.employee_id === emp.id)
      const status: AttendanceDailyStatus = rec?.status || 'absent'
      const checkIn = rec?.check_in_time || null
      const checkOut = rec?.check_out_time || null
      const lateMins = rec?.late_minutes || 0
      const workedMins = rec?.worked_minutes || 0
      const otMins = rec?.approved_ot_minutes || rec?.potential_ot_minutes || 0
      const source = rec?.attendance_source || 'unrecorded'

      return {
        employee: emp,
        record: rec || null,
        status,
        checkIn,
        checkOut,
        lateMins,
        workedMins,
        otMins,
        source,
      }
    })
  }, [employees, records])

  // Filtered items
  const filteredItems = useMemo(() => {
    return mergedItems.filter(({ employee, status }) => {
      // Department Filter
      if (departmentFilter !== 'ALL') {
        const empDept = employee.department?.toLowerCase() || ''
        if (empDept !== departmentFilter.toLowerCase()) return false
      }

      // Status Filter
      if (statusFilter !== 'ALL') {
        if (status !== statusFilter) return false
      }

      // Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim()
        const name = employee.name.toLowerCase()
        const empId = (employee.employee_id_number || '').toLowerCase()
        const role = (employee.role || '').toLowerCase()
        if (!name.includes(q) && !empId.includes(q) && !role.includes(q)) {
          return false
        }
      }

      return true
    })
  }, [mergedItems, departmentFilter, statusFilter, searchTerm])

  // Compute analytics
  const analytics = useMemo(() => {
    return computeAttendanceAnalytics(records, employees.length)
  }, [records, employees.length])

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Employee ID',
      'Name',
      'Department',
      'Role',
      'Status',
      'Check-In Time',
      'Check-Out Time',
      'Late (Mins)',
      'Worked Duration',
      'Overtime (Mins)',
      'Source',
      'Date',
    ]

    const rows = filteredItems.map(({ employee, status, checkIn, checkOut, lateMins, workedMins, otMins, source }) => [
      `"${employee.employee_id_number || ''}"`,
      `"${employee.name}"`,
      `"${employee.department || 'General'}"`,
      `"${employee.role || 'Staff'}"`,
      `"${status.toUpperCase()}"`,
      `"${checkIn || '—'}"`,
      `"${checkOut || '—'}"`,
      lateMins,
      `"${formatMinutesToDuration(workedMins)}"`,
      otMins,
      `"${source}"`,
      `"${selectedDate}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Attendance_Report_${selectedDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Print Report Handler
  const handlePrint = () => {
    setIsPrinting(true)
    setTimeout(() => {
      window.print()
      setTimeout(() => setIsPrinting(false), 800)
    }, 200)
  }

  const statusBadge = (status: AttendanceDailyStatus) => {
    switch (status) {
      case 'present':
        return (
          <Badge variant="outline" className="text-xs bg-success-surface text-success border-success-border font-medium">
            {tBilingual('Present', 'উপস্থিত')}
          </Badge>
        )
      case 'late':
        return (
          <Badge variant="outline" className="text-xs bg-warning-surface text-warning border-warning-border font-medium">
            {tBilingual('Late', 'বিলম্বে')}
          </Badge>
        )
      case 'half_day':
        return (
          <Badge variant="outline" className="text-xs bg-warning-surface text-warning border-warning-border font-medium">
            {tBilingual('Half Day', 'অর্ধদিবস')}
          </Badge>
        )
      case 'leave':
        return (
          <Badge variant="outline" className="text-xs bg-muted text-muted-foreground border-border font-medium">
            {tBilingual('Leave', 'ছুটি')}
          </Badge>
        )
      case 'field_work':
        return (
          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20 font-medium">
            {tBilingual('Field Work', 'ফিল্ড ডিউটি')}
          </Badge>
        )
      case 'absent':
      default:
        return (
          <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20 font-medium">
            {tBilingual('Absent', 'অনুপস্থিত')}
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. TOP ANALYTICS & AVERAGE TIME KPI RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Average Check In */}
        <Card className="bg-card border-border shadow-xs">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold uppercase tracking-wider">{tBilingual('Avg Check-In', 'গড় ইন সময়')}</span>
              <Clock className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="text-lg sm:text-xl font-bold tabular-nums text-foreground">
              {analytics.avgCheckInTime}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {analytics.presentCount + analytics.lateCount} {tBilingual('punched today', 'পাঞ্চ রেকর্ড')}
            </p>
          </CardContent>
        </Card>

        {/* Average Check Out */}
        <Card className="bg-card border-border shadow-xs">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold uppercase tracking-wider">{tBilingual('Avg Check-Out', 'গড় আউট সময়')}</span>
              <Clock4 className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="text-lg sm:text-xl font-bold tabular-nums text-foreground">
              {analytics.avgCheckOutTime}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {analytics.currentlyWorkingCount > 0
                ? `${analytics.currentlyWorkingCount} ${tBilingual('on floor', 'ফ্লোরে আছেন')}`
                : tBilingual('Shifts closed', 'শিফট সম্পন্ন')}
            </p>
          </CardContent>
        </Card>

        {/* Average Worked Duration */}
        <Card className="bg-card border-border shadow-xs">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold uppercase tracking-wider">{tBilingual('Avg Hours', 'গড় কর্মঘণ্টা')}</span>
              <Clock className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="text-lg sm:text-xl font-bold tabular-nums text-foreground">
              {analytics.avgWorkedFormatted}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {tBilingual('Daily work shift', 'দৈনিক কর্ম শিফট')}
            </p>
          </CardContent>
        </Card>

        {/* On-Time Rate */}
        <Card className="bg-card border-border shadow-xs">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold uppercase tracking-wider">{tBilingual('On-Time Rate', 'সময়ানুবর্তিতা')}</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
            </div>
            <div className="text-lg sm:text-xl font-bold tabular-nums text-success">
              {analytics.onTimeRate}%
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {analytics.lateCount} {tBilingual('late arrivals', 'বিলম্বে আগমন')}
            </p>
          </CardContent>
        </Card>

        {/* Present Count */}
        <Card className="bg-card border-border shadow-xs">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold uppercase tracking-wider">{tBilingual('Present Staff', 'উপস্থিত কর্মী')}</span>
              <UserCheck className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="text-lg sm:text-xl font-bold tabular-nums text-foreground">
              {analytics.presentCount + analytics.lateCount}{' '}
              <span className="text-xs font-normal text-muted-foreground">/ {employees.length}</span>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {analytics.attendanceRate}% {tBilingual('attendance', 'হাজিরা হার')}
            </p>
          </CardContent>
        </Card>

        {/* Total Overtime */}
        <Card className="bg-card border-border shadow-xs">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold uppercase tracking-wider">{tBilingual('Overtime Logged', 'ওভারটাইম')}</span>
              <Clock4 className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="text-lg sm:text-xl font-bold tabular-nums text-foreground">
              {formatMinutesToDuration(analytics.totalOvertimeMinutes)}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {tBilingual('Approved / Potential OT', 'মোট অনুমোদিত ও সম্ভাব্য')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 2. FILTER & ACTION TOOLBAR */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Selector */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-8 text-xs w-36 bg-muted border-border font-medium"
            />
          </div>

          {/* Quick Date Buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className={`h-8 px-2.5 text-xs ${
              selectedDate === new Date().toISOString().split('T')[0]
                ? 'bg-primary text-primary-foreground font-semibold'
                : 'bg-card text-foreground border-border hover:bg-muted'
            }`}
          >
            {tBilingual('Today', 'আজ')}
          </Button>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground font-medium"
          >
            <option value="ALL">{tBilingual('All Departments', 'সকল বিভাগ')}</option>
            <option value="printing">{tBilingual('Printing', 'প্রিন্টিং')}</option>
            <option value="finishing">{tBilingual('Finishing', 'ফিনিশিং')}</option>
            <option value="fabrication">{tBilingual('Fabrication', 'ফ্যাব্রিকেশন')}</option>
            <option value="design">{tBilingual('Design', 'ডিজাইন')}</option>
            <option value="accounts">{tBilingual('Accounts', 'হিসাব বিভাগ')}</option>
            <option value="management">{tBilingual('Management', 'ব্যবস্থাপনা')}</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground font-medium"
          >
            <option value="ALL">{tBilingual('All Statuses', 'সকল অবস্থা')}</option>
            <option value="present">{tBilingual('Present', 'উপস্থিত')}</option>
            <option value="late">{tBilingual('Late', 'বিলম্বে')}</option>
            <option value="half_day">{tBilingual('Half Day', 'অর্ধদিবস')}</option>
            <option value="leave">{tBilingual('Leave', 'ছুটি')}</option>
            <option value="absent">{tBilingual('Absent', 'অনুপস্থিত')}</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 sm:w-52">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={tBilingual('Search employee...', 'কর্মী খুঁজুন...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs bg-muted border-border w-full"
            />
          </div>

          {/* Export CSV */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-8 px-2.5 text-xs text-foreground bg-card border-border hover:bg-muted shrink-0"
          >
            <Download className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
            <span>{tBilingual('CSV', 'সিএসভি')}</span>
          </Button>

          {/* Print Report */}
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-8 px-2.5 text-xs text-foreground bg-card border-border hover:bg-muted shrink-0"
          >
            <Printer className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
            <span>{tBilingual('Print', 'প্রিন্ট')}</span>
          </Button>
        </div>
      </div>

      {/* 3. ATTENDANCE REPORT TABLE */}
      {isLoading ? (
        <Card className="bg-card border-border p-6 space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card className="bg-card border-border p-12 text-center">
          <p className="text-sm font-semibold text-foreground">
            {tBilingual('No attendance records match your filter criteria.', 'ফিল্টারের সাথে মেলে এমন কোনো হাজিরা তথ্য পাওয়া যায়নি।')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {tBilingual('Try clearing your search query or selecting a different date.', 'অনুসন্ধান রিসেট করুন অথবা অন্য তারিখ নির্বাচন করুন।')}
          </p>
        </Card>
      ) : (
        <Card className="bg-card border-border shadow-xs rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted border-b border-border text-muted-foreground uppercase tracking-wider font-semibold text-xs">
                <tr>
                  <th className="py-3 px-4">{tBilingual('Employee', 'কর্মী')}</th>
                  <th className="py-3 px-3">{tBilingual('Department', 'বিভাগ')}</th>
                  <th className="py-3 px-3">{tBilingual('Status', 'অবস্থা')}</th>
                  <th className="py-3 px-3">{tBilingual('Check-In', 'প্রবেশ')}</th>
                  <th className="py-3 px-3">{tBilingual('Check-Out', 'প্রস্থান')}</th>
                  <th className="py-3 px-3">{tBilingual('Duration', 'কর্মকাল')}</th>
                  <th className="py-3 px-3">{tBilingual('Overtime', 'ওভারটাইম')}</th>
                  <th className="py-3 px-3">{tBilingual('Source', 'উৎস')}</th>
                  <th className="py-3 px-4 text-right">{tBilingual('Actions', 'পদক্ষেপ')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredItems.map(({ employee, status, checkIn, checkOut, lateMins, workedMins, otMins, source }) => {
                  const photo = employee.profile_picture_url || (employee as any).avatar_url || (employee as any).photo_url || null

                  return (
                    <tr key={employee.id} className="hover:bg-muted/60 transition-colors">
                      {/* Employee Info with Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={photo}
                            fallback={employee.name}
                            className="w-9 h-9 rounded-full border border-border shrink-0 text-xs font-semibold"
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground truncate text-xs">
                              {employee.name}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {employee.employee_id_number || 'EMP'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Department & Role */}
                      <td className="py-3 px-3">
                        <div className="text-xs font-medium text-foreground capitalize">
                          {employee.department || 'General'}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {employee.role || 'Staff'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        {statusBadge(status)}
                      </td>

                      {/* Check-In */}
                      <td className="py-3 px-3">
                        {checkIn ? (
                          <div className="space-y-0.5">
                            <span className="font-mono font-semibold text-foreground text-xs">{checkIn}</span>
                            {lateMins > 0 && (
                              <div className="text-xs text-warning font-medium">
                                +{lateMins}m {tBilingual('late', 'লেট')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground font-mono">—</span>
                        )}
                      </td>

                      {/* Check-Out */}
                      <td className="py-3 px-3">
                        {checkOut ? (
                          <span className="font-mono font-semibold text-foreground text-xs">{checkOut}</span>
                        ) : checkIn ? (
                          <Badge variant="outline" className="text-xs border-border bg-card text-muted-foreground">
                            {tBilingual('On Floor', 'অন-ফ্লোর')}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground font-mono">—</span>
                        )}
                      </td>

                      {/* Duration */}
                      <td className="py-3 px-3">
                        <span className="font-mono font-medium text-foreground text-xs">
                          {workedMins > 0 ? formatMinutesToDuration(workedMins) : '—'}
                        </span>
                      </td>

                      {/* Overtime */}
                      <td className="py-3 px-3">
                        {otMins > 0 ? (
                          <span className="text-primary font-mono font-semibold text-xs">
                            +{formatMinutesToDuration(otMins)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground font-mono">—</span>
                        )}
                      </td>

                      {/* Source */}
                      <td className="py-3 px-3">
                        <Badge variant="outline" className="text-xs border-border text-muted-foreground uppercase font-mono">
                          {source}
                        </Badge>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        {onViewEmployeeProfile && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewEmployeeProfile(employee)}
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="w-3.5 h-3.5 mr-1" />
                            <span>{tBilingual('Profile', 'প্রোফাইল')}</span>
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 4. ISOLATED PRINT DOCUMENT (FOR CLEAN A4 PAPER OUTPUT) */}
      {isPrinting && (
        <div data-print-isolate="true" className="p-8 bg-card text-foreground space-y-6">
          <div className="border-b border-border pb-4 flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {company?.name || 'Factory'} - {tBilingual('Staff Daily Attendance Report', 'দৈনিক কর্মী হাজিরা রিপোর্ট')}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {tBilingual('Date:', 'তারিখ:')} {selectedDate} • {tBilingual('Total Workforce:', 'মোট কর্মী:')} {employees.length}
              </p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <div>{tBilingual('Generated:', 'তৈরি:')} {new Date().toLocaleTimeString()}</div>
              <div>{tBilingual('Department Filter:', 'ফিল্টার:')} {departmentFilter}</div>
            </div>
          </div>

          {/* Print KPI Summary */}
          <div className="grid grid-cols-4 gap-4 border border-border p-3 rounded-lg text-xs">
            <div>
              <span className="text-muted-foreground">{tBilingual('Average Check-In:', 'গড় প্রবেশ:')}</span>{' '}
              <strong className="text-foreground">{analytics.avgCheckInTime}</strong>
            </div>
            <div>
              <span className="text-muted-foreground">{tBilingual('Average Check-Out:', 'গড় প্রস্থান:')}</span>{' '}
              <strong className="text-foreground">{analytics.avgCheckOutTime}</strong>
            </div>
            <div>
              <span className="text-muted-foreground">{tBilingual('Average Hours:', 'গড় কর্মঘণ্টা:')}</span>{' '}
              <strong className="text-foreground">{analytics.avgWorkedFormatted}</strong>
            </div>
            <div>
              <span className="text-muted-foreground">{tBilingual('On-Time Rate:', 'সময়ানুবর্তিতা:')}</span>{' '}
              <strong className="text-foreground">{analytics.onTimeRate}%</strong>
            </div>
          </div>

          {/* Print Table */}
          <table className="w-full text-xs text-left border border-border divide-y divide-border">
            <thead className="bg-muted font-bold text-muted-foreground">
              <tr>
                <th className="py-2 px-3">EMP ID</th>
                <th className="py-2 px-3">Name</th>
                <th className="py-2 px-3">Department</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Check-In</th>
                <th className="py-2 px-3">Check-Out</th>
                <th className="py-2 px-3">Worked Duration</th>
                <th className="py-2 px-3">Overtime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredItems.map(({ employee, status, checkIn, checkOut, workedMins, otMins }) => (
                <tr key={employee.id}>
                  <td className="py-1.5 px-3 font-mono">{employee.employee_id_number || 'EMP'}</td>
                  <td className="py-1.5 px-3 font-medium">{employee.name}</td>
                  <td className="py-1.5 px-3 capitalize">{employee.department || 'General'}</td>
                  <td className="py-1.5 px-3 uppercase font-semibold">{status}</td>
                  <td className="py-1.5 px-3 font-mono">{checkIn || '—'}</td>
                  <td className="py-1.5 px-3 font-mono">{checkOut || '—'}</td>
                  <td className="py-1.5 px-3 font-mono">{workedMins > 0 ? formatMinutesToDuration(workedMins) : '—'}</td>
                  <td className="py-1.5 px-3 font-mono">{otMins > 0 ? `+${formatMinutesToDuration(otMins)}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Signature Footer */}
          <div className="pt-12 grid grid-cols-3 gap-6 text-center text-xs text-muted-foreground">
            <div className="border-t border-border pt-1">Floor Supervisor</div>
            <div className="border-t border-border pt-1">HR & Attendance Manager</div>
            <div className="border-t border-border pt-1">Authorized Signatory</div>
          </div>
        </div>
      )}
    </div>
  )
}
