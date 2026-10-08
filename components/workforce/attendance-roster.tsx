'use client'

import React, { useState, useMemo } from 'react'
import { useI18n } from '@/i18n/context'
import {
 Calendar,
 Search,
 Filter,
 Clock,
 UserCheck,
 UserX,
 UserMinus,
 Activity,
 MapPin,
 QrCode,
 Edit2,
 CheckCircle2,
 AlertTriangle,
 ChevronLeft,
 ChevronRight,
 MoreVertical,
 Plus,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { computeAttendanceAnalytics } from '@/lib/attendance/attendance-analytics'
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import type {
 EmployeeRecord,
 AttendanceDailySummaryRecord,
 AttendanceDailyStatus,
} from '@/types/workforce.types'

export interface AttendanceRosterProps {
 employees: EmployeeRecord[]
 attendanceRecords: AttendanceDailySummaryRecord[]
 selectedDate: string
 onDateChange: (date: string) => void
 isLoading?: boolean
 tenantSlug: string
 branches?: Array<{ id: string; name: string }>
 onMarkAttendance: (employee: EmployeeRecord, status: AttendanceDailyStatus) => void
 onAdjustTime: (record: AttendanceDailySummaryRecord) => void
 onOpenManualEntry: () => void
 onOpenQrPunch: () => void
}

export function AttendanceRoster({
 employees,
 attendanceRecords,
 selectedDate,
 onDateChange,
 isLoading = false,
 tenantSlug,
 branches = [],
 onMarkAttendance,
 onAdjustTime,
 onOpenManualEntry,
 onOpenQrPunch,
}: AttendanceRosterProps) {
  const { tBilingual } = useI18n()
 const [searchTerm, setSearchTerm] = useState('')
 const [selectedDept, setSelectedDept] = useState('all')
 const [selectedBranch, setSelectedBranch] = useState('all')

  // Map employee with their attendance summary for this date
 const rosterItems = useMemo(() => {
 const recordMap = new Map<string, AttendanceDailySummaryRecord>()
 for (const rec of attendanceRecords) {
 recordMap.set(rec.employee_id, rec)
    }

 return employees.map((emp) => {
 const summary = recordMap.get(emp.id) || null
 return {
 employee: emp,
 summary,
 status: (summary?.status || 'absent') as AttendanceDailyStatus,
      }
    })
  }, [employees, attendanceRecords])

 const filteredRoster = useMemo(() => {
 return rosterItems.filter(({ employee, summary }) => {
 const query = searchTerm.toLowerCase().trim()
 if (query) {
 const matchesName = employee.name.toLowerCase().includes(query) || (employee.name_bn && employee.name_bn.toLowerCase().includes(query))
 const matchesId = employee.employee_id_number?.toLowerCase().includes(query)
 const matchesRole = employee.role?.toLowerCase().includes(query)
 if (!matchesName && !matchesId && !matchesRole) return false
      }

 if (selectedDept !== 'all' && employee.department?.toLowerCase() !== selectedDept.toLowerCase()) {
 return false
      }

 if (selectedBranch !== 'all' && employee.branch_id !== selectedBranch) {
 return false
      }

 return true
    })
  }, [rosterItems, searchTerm, selectedDept, selectedBranch])

  // Top KPIs
 const stats = useMemo(() => {
 return computeAttendanceAnalytics(attendanceRecords, employees.length)
 }, [attendanceRecords, employees.length])

 const getStatusBadge = (status: AttendanceDailyStatus) => {
 switch (status) {
 case 'present':
 case 'half_day':
 return 'bg-success-surface text-success border-success-border'
 case 'late':
 return 'bg-warning-surface text-warning border-warning-border'
 case 'absent':
 return 'bg-danger-surface text-destructive border-danger-border'
 case 'leave':
 return 'bg-primary/10 text-primary border-primary/20'
 case 'field_work':
 return 'bg-primary/10 text-primary border-primary/20'
 default:
 return 'bg-muted text-foreground border-border'
    }
  }

 const shiftDate = (days: number) => {
 const cur = new Date(selectedDate)
 cur.setDate(cur.getDate() + days)
 onDateChange(cur.toISOString().split('T')[0])
  }

 const isToday = selectedDate === new Date().toISOString().split('T')[0]

 return (
    <div className="space-y-4">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        <Card className="p-3 bg-card border-border shadow-xs rounded-xl">
          <span className="text-[12px] font-medium text-muted-foreground block">{tBilingual('Present', 'উপস্থিত')}</span>
          <span className="text-xl font-bold text-success tabular-nums">{stats.presentCount}</span>
        </Card>
        <Card className="p-3 bg-card border-border shadow-xs rounded-xl">
          <span className="text-[12px] font-medium text-muted-foreground block">{tBilingual('Late', 'দেরিতে আগমন')}</span>
          <span className="text-xl font-bold text-warning tabular-nums">{stats.lateCount}</span>
        </Card>
        <Card className="p-3 bg-card border-border shadow-xs rounded-xl">
          <span className="text-[12px] font-medium text-muted-foreground block">{tBilingual('Absent', 'অনুপস্থিত')}</span>
          <span className="text-xl font-bold text-destructive tabular-nums">{stats.absentCount}</span>
        </Card>
        <Card className="p-3 bg-card border-border shadow-xs rounded-xl">
          <span className="text-[12px] font-medium text-muted-foreground block flex items-center gap-1">
            <Clock className="w-3 h-3 text-primary" />
            <span>{tBilingual('Avg Check-In', 'গড় প্রবেশ')}</span>
          </span>
          <span className="text-sm font-bold text-foreground tabular-nums font-mono mt-0.5 block">{stats.avgCheckInTime}</span>
        </Card>
        <Card className="p-3 bg-card border-border shadow-xs rounded-xl">
          <span className="text-[12px] font-medium text-muted-foreground block flex items-center gap-1">
            <Clock className="w-3 h-3 text-warning" />
            <span>{tBilingual('Avg Check-Out', 'গড় প্রস্থান')}</span>
          </span>
          <span className="text-sm font-bold text-foreground tabular-nums font-mono mt-0.5 block">{stats.avgCheckOutTime}</span>
        </Card>
        <Card className="p-3 bg-card border-border shadow-xs rounded-xl">
          <span className="text-[12px] font-medium text-muted-foreground block flex items-center gap-1">
            <Activity className="w-3 h-3 text-primary" />
            <span>{tBilingual('Avg Duration', 'গড় কর্মকাল')}</span>
          </span>
          <span className="text-sm font-bold text-primary tabular-nums font-mono mt-0.5 block">{stats.avgWorkedFormatted}</span>
        </Card>
        <Card className="p-3 bg-card border-border shadow-xs rounded-xl">
          <span className="text-[12px] font-medium text-muted-foreground block">{tBilingual('On Floor Now', 'ফ্লোরে কর্মরত')}</span>
          <span className="text-xl font-bold text-primary tabular-nums">{stats.currentlyWorkingCount}</span>
        </Card>
      </div>

      {/* Date & Filter Toolbar */}
      <Card className="bg-card border-border shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-xl">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Date Selector */}
            <div className="flex items-center gap-2">
              <Button
 variant="outline"size="sm"onClick={() => shiftDate(-1)}
 className="h-8 w-8 p-0 border-border text-muted-foreground hover:bg-muted">
                <ChevronLeft className="w-4 h-4"/>
              </Button>

              <div className="relative">
                <Input
 type="date"value={selectedDate}
 onChange={(e) => onDateChange(e.target.value)}
 className="h-8 text-xs font-semibold bg-card border-border w-36 pl-3"/>
              </div>

              <Button
 variant="outline"size="sm"onClick={() => shiftDate(1)}
 className="h-8 w-8 p-0 border-border text-muted-foreground hover:bg-muted">
                <ChevronRight className="w-4 h-4"/>
              </Button>

              {!isToday && (
                <Button
 variant="ghost"size="sm"onClick={() => onDateChange(new Date().toISOString().split('T')[0])}
 className="h-8 text-xs text-primary hover:text-primary px-2 font-medium">
 Today
                </Button>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
 variant="outline"size="sm"onClick={onOpenQrPunch}
 className="h-8 text-xs border-border hover:bg-muted text-foreground min-h-[32px]">
                <QrCode className="w-3.5 h-3.5 mr-1.5 text-primary"/>
                <span>{tBilingual('QR Attendance', 'কিউআর হাজিরা')}</span>
              </Button>

              <Button
 size="sm"onClick={onOpenManualEntry}
 className="h-8 px-3 text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground min-h-[32px]">
                <Plus className="w-3.5 h-3.5 mr-1"/>
                <span>{tBilingual('Manual Punch', 'ম্যানুয়াল পাঞ্চ')}</span>
              </Button>
            </div>
          </div>

          {/* Search & Filter Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-border">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"/>
              <Input
 type="text"placeholder={tBilingual('Search roster...', 'রোস্টার খুঁজুন...')}value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="pl-8 h-8 text-xs bg-muted border-border"/>
            </div>

            <select
 value={selectedDept}
 onChange={(e) => setSelectedDept(e.target.value)}
 className="h-8 rounded-md border border-border bg-card px-2.5 text-xs text-foreground">
              <option value="all">{tBilingual('All Departments', 'সকল বিভাগ')}</option>
              <option value="printing">Printing</option>
              <option value="finishing">Finishing</option>
              <option value="fabrication">Fabrication</option>
              <option value="design">Design</option>
              <option value="installation">Installation</option>
              <option value="accounts">Accounts</option>
              <option value="sales">Sales</option>
              <option value="management">Management</option>
            </select>

            {branches.length > 0 && (
              <select
 value={selectedBranch}
 onChange={(e) => setSelectedBranch(e.target.value)}
 className="h-8 rounded-md border border-border bg-card px-2.5 text-xs text-foreground">
                <option value="all">{tBilingual('All Branches', 'সকল শাখা')}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}

            <span className="text-muted-foreground text-xs ml-auto shrink-0">
 {tBilingual(`Showing ${filteredRoster.length} staff`, `${filteredRoster.length} জন কর্মী প্রদর্শিত`)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Roster Table */}
      {isLoading ? (
        <Card className="bg-card border-border p-6">
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg"/>
            ))}
          </div>
        </Card>
      ) : filteredRoster.length === 0 ? (
        <Card className="bg-card border-border py-12 text-center">
          <p className="text-sm font-medium text-muted-foreground">{tBilingual('No attendance records for this date', 'এই তারিখের কোনো হাজিরার রেকর্ড নেই')}</p>
          <p className="text-xs text-muted-foreground mt-1">{tBilingual('Try selecting a different date or clearing your search.', 'ভিন্ন তারিখ নির্বাচন করুন অথবা সার্চ ফিল্টার রিসেট করুন।')}</p>
        </Card>
      ) : (
        <Card className="bg-card border-border shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-xl overflow-hidden">
          <div className="overflow-x-auto min-h-[160px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted border-b border-border text-muted-foreground uppercase tracking-wider font-semibold text-xs">
                <tr>
                  <th className="py-3 px-4">{tBilingual('Employee', 'কর্মী')}</th>
                  <th className="py-3 px-3">{tBilingual('Department', 'বিভাগ')}</th>
                  <th className="py-3 px-3">{tBilingual('Shift', 'শিফট')}</th>
                  <th className="py-3 px-3 text-center">{tBilingual('Status', 'অবস্থা')}</th>
                  <th className="py-3 px-3">{tBilingual('Check In', 'প্রবেশ')}</th>
                  <th className="py-3 px-3">{tBilingual('Check Out', 'প্রস্থান')}</th>
                  <th className="py-3 px-3">{tBilingual('Worked', 'কর্মকাল')}</th>
                  <th className="py-3 px-3">{tBilingual('Late', 'দেরি')}</th>
                  <th className="py-3 px-3">{tBilingual('OT', 'ওভারটাইম')}</th>
                  <th className="py-3 px-3">{tBilingual('Source', 'উৎস')}</th>
                  <th className="py-3 px-4 text-right">{tBilingual('Actions', 'অ্যাকশন')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRoster.map(({ employee, summary, status }) => {
 return (
                    <tr key={employee.id} className="hover:bg-muted transition-colors">
                      {/* Employee */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center font-bold text-xs text-foreground shrink-0 overflow-hidden">
                            {employee.profile_picture_url || (employee as any).avatar_url || (employee as any).photo_url ? (
                              <img
                                src={employee.profile_picture_url || (employee as any).avatar_url || (employee as any).photo_url}
                                alt={employee.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                  const parent = e.currentTarget.parentElement
                                  if (parent) parent.innerText = employee.name.slice(0, 2).toUpperCase()
                                }}
                              />
                            ) : (
                              <span>{employee.name.slice(0, 2).toUpperCase()}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground">{employee.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {employee.employee_id_number}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3 px-3 capitalize text-muted-foreground">
                        {employee.department}
                      </td>

                      {/* Shift */}
                      <td className="py-3 px-3 text-muted-foreground">
                        {summary?.shift_name || 'Standard Day'}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <Badge
 variant="outline"className={`text-xs font-semibold capitalize px-2 py-0.5 rounded-full ${getStatusBadge(
 status
                          )}`}
                        >
                          {status}
                        </Badge>
                      </td>

                      {/* Check In */}
                      <td className="py-3 px-3 font-mono font-medium text-foreground">
                        {summary?.check_in_time || '—'}
                      </td>

                      {/* Check Out */}
                      <td className="py-3 px-3 font-mono font-medium text-foreground">
                        {summary?.check_out_time || '—'}
                      </td>

                      {/* Worked */}
                      <td className="py-3 px-3 font-mono text-muted-foreground">
                        {summary?.worked_duration_formatted || (summary?.worked_minutes ? `${Math.floor(summary.worked_minutes / 60)}h ${summary.worked_minutes % 60}m` : '—')}
                      </td>

                      {/* Late */}
                      <td className="py-3 px-3 font-mono text-muted-foreground">
                        {summary && summary.late_minutes > 0 ? (
                          <span className="text-warning font-semibold">{summary.late_minutes}m</span>
                        ) : (
                          '0m'
                        )}
                      </td>

                      {/* OT */}
                      <td className="py-3 px-3 font-mono text-muted-foreground">
                        {summary && summary.approved_ot_minutes > 0 ? (
                          <span className="text-primary font-semibold">{Math.round((summary.approved_ot_minutes / 60) * 10) / 10}h</span>
                        ) : (
                          '0h'
                        )}
                      </td>

                      {/* Source */}
                      <td className="py-3 px-3 text-muted-foreground capitalize">
                        {summary?.attendance_source || 'manual'}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
 variant="ghost"size="sm"className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg min-h-[32px] min-w-[32px]">
                              <MoreVertical className="w-4 h-4"/>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end"className="w-44 text-xs font-medium">
                            <DropdownMenuItem onClick={() => onMarkAttendance(employee, 'present')}>
                              <UserCheck className="w-3.5 h-3.5 mr-2 text-success"/>
                              <span>Mark Present</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => onMarkAttendance(employee, 'late')}>
                              <Clock className="w-3.5 h-3.5 mr-2 text-warning"/>
                              <span>Mark Late</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => onMarkAttendance(employee, 'absent')}>
                              <UserX className="w-3.5 h-3.5 mr-2 text-destructive"/>
                              <span>Mark Absent</span>
                            </DropdownMenuItem>

                            {summary && (
                              <DropdownMenuItem onClick={() => onAdjustTime(summary)}>
                                <Edit2 className="w-3.5 h-3.5 mr-2 text-primary"/>
                                <span>Adjust Punch Times</span>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
