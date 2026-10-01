'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Search,
  Filter,
  UserPlus,
  MoreVertical,
  Eye,
  Edit,
  Clock,
  Wallet,
  Coins,
  Key,
  UserCheck,
  UserX,
  Phone,
  Mail,
  Building,
  Briefcase,
  ChevronDown,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import type { EmployeeRecord, EmploymentType, SalaryBasis } from '@/types/workforce.types'

export interface EmployeeTableProps {
  employees: EmployeeRecord[]
  isLoading?: boolean
  tenantSlug: string
  branches?: Array<{ id: string; name: string }>
  onAddEmployee: () => void
  onViewEmployee: (employee: EmployeeRecord) => void
  onEditEmployee: (employee: EmployeeRecord) => void
  onManageAccess?: (employee: EmployeeRecord) => void
  onToggleStatus?: (employee: EmployeeRecord) => void
}

const DEPARTMENTS = [
  { id: 'all', label: 'All Departments', labelBn: 'সকল বিভাগ' },
  { id: 'printing', label: 'Printing', labelBn: 'প্রিন্টিং' },
  { id: 'finishing', label: 'Finishing', labelBn: 'ফিনিশিং' },
  { id: 'fabrication', label: 'Fabrication', labelBn: 'ফ্যাব্রিকেশন' },
  { id: 'design', label: 'Design & Prepress', labelBn: 'ডিজাইন' },
  { id: 'installation', label: 'Installation', labelBn: 'ইনস্টলেশন' },
  { id: 'accounts', label: 'Accounts & Billing', labelBn: 'হিসাব শাখা' },
  { id: 'sales', label: 'Sales & Client Reps', labelBn: 'বিক্রয়' },
  { id: 'management', label: 'Management', labelBn: 'ম্যানেজমেন্ট' },
  { id: 'field_ops', label: 'Field Operations', labelBn: 'মাঠ পর্যায়' },
]

export function EmployeeTable({
  employees,
  isLoading = false,
  tenantSlug,
  branches = [],
  onAddEmployee,
  onViewEmployee,
  onEditEmployee,
  onManageAccess,
  onToggleStatus,
}: EmployeeTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDept, setSelectedDept] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('active')
  const [selectedBranch, setSelectedBranch] = useState('all')

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // Search match
      const query = searchTerm.toLowerCase().trim()
      if (query) {
        const matchesName = emp.name.toLowerCase().includes(query) || (emp.name_bn && emp.name_bn.toLowerCase().includes(query))
        const matchesId = emp.employee_id_number?.toLowerCase().includes(query)
        const matchesPhone = emp.mobile?.toLowerCase().includes(query) || emp.phone?.toLowerCase().includes(query)
        const matchesRole = emp.role?.toLowerCase().includes(query) || emp.designation?.toLowerCase().includes(query)
        if (!matchesName && !matchesId && !matchesPhone && !matchesRole) return false
      }

      // Department filter
      if (selectedDept !== 'all' && emp.department?.toLowerCase() !== selectedDept.toLowerCase()) {
        return false
      }

      // Employment type filter
      if (selectedType !== 'all' && emp.employee_type !== selectedType) {
        return false
      }

      // Status filter
      if (selectedStatus !== 'all' && emp.status !== selectedStatus) {
        return false
      }

      // Branch filter
      if (selectedBranch !== 'all' && emp.branch_id !== selectedBranch) {
        return false
      }

      return true
    })
  }, [employees, searchTerm, selectedDept, selectedType, selectedStatus, selectedBranch])

  const getDepartmentBadge = (dept: string) => {
    const d = dept?.toLowerCase() || ''
    if (d === 'printing') return 'bg-cyan-50 text-cyan-700 border-cyan-200'
    if (d === 'finishing') return 'bg-amber-50 text-amber-700 border-amber-200'
    if (d === 'fabrication') return 'bg-orange-50 text-orange-700 border-orange-200'
    if (d === 'design') return 'bg-purple-50 text-purple-700 border-purple-200'
    if (d === 'installation') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    if (d === 'accounts') return 'bg-emerald-50 text-emerald-800 border-emerald-200'
    if (d === 'sales') return 'bg-blue-50 text-blue-700 border-blue-200'
    return 'bg-muted text-foreground border-border'
  }

  const getStatusBadge = (status: string) => {
    if (status === 'active') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    if (status === 'on_leave') return 'bg-amber-50 text-amber-700 border-amber-200'
    return 'bg-red-50 text-red-700 border-red-200'
  }

  const getSalaryDisplay = (emp: EmployeeRecord) => {
    if (emp.salary_basis === 'daily_rate' || emp.is_daily_worker) {
      return `৳ ${(emp.daily_rate || 0).toLocaleString('en-IN')}/day`
    }
    if (emp.salary_basis === 'hourly_rate') {
      return `৳ ${(emp.hourly_rate || 0).toLocaleString('en-IN')}/hr`
    }
    return `৳ ${(emp.base_salary || 0).toLocaleString('en-IN')}`
  }

  return (
    <div className="space-y-4">
      {/* Top Filter and Actions Toolbar */}
      <Card className="bg-card border-border shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-xl">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search by name, ID, phone, role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs bg-muted border-border focus:bg-card transition-colors"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* [+ Add Employee] CTA */}
            <Button
              onClick={onAddEmployee}
              size="sm"
              className="h-9 px-4 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm shrink-0 min-h-[36px]"
            >
              <UserPlus className="w-4 h-4 mr-1.5" />
              <span>Add Employee</span>
            </Button>
          </div>

          {/* Filters Row */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 text-xs">
            {/* Department */}
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground focus:border-blue-500 focus:outline-none"
            >
              {DEPARTMENTS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>

            {/* Employment Type */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Employment Types</option>
              <option value="permanent">Permanent Staff</option>
              <option value="contract">Contract Worker</option>
              <option value="daily_worker">Daily Labor</option>
              <option value="hourly_worker">Hourly Worker</option>
            </select>

            {/* Status */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="on_leave">On Leave</option>
              <option value="terminated">Deactivated</option>
            </select>

            {/* Branch */}
            {branches.length > 0 && (
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground focus:border-blue-500 focus:outline-none"
              >
                <option value="all">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}

            <span className="text-muted-foreground text-xs ml-auto shrink-0 pl-2">
              Showing {filteredEmployees.length} of {employees.length}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Main Table / Mobile Cards */}
      {isLoading ? (
        <Card className="bg-card border-border p-6">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        </Card>
      ) : filteredEmployees.length === 0 ? (
        <Card className="bg-card border-border py-16 px-4 text-center">
          <div className="max-w-sm mx-auto flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-3">
              <UserPlus className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              {employees.length === 0 ? 'No employees yet' : 'No matching employees found'}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 mb-5">
              {employees.length === 0
                ? 'Get started by creating your first employee profile with attendance and salary details.'
                : 'Try adjusting your search query or filters to find what you are looking for.'}
            </p>
            {employees.length === 0 ? (
              <Button
                onClick={onAddEmployee}
                size="sm"
                className="h-9 px-4 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground min-h-[36px]"
              >
                <UserPlus className="w-4 h-4 mr-1.5" />
                <span>Add Employee</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('')
                  setSelectedDept('all')
                  setSelectedType('all')
                  setSelectedStatus('all')
                  setSelectedBranch('all')
                }}
                className="h-8 text-xs border-border"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <Card className="bg-card border-border shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-xl overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted border-b border-border text-muted-foreground uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-3">ID</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3">Role / Responsibility</th>
                  <th className="py-3 px-3">Employment Type</th>
                  <th className="py-3 px-3">Salary Basis</th>
                  <th className="py-3 px-3 text-right">Current Salary</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEmployees.map((emp) => {
                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-muted transition-colors group cursor-pointer"
                      onClick={() => onViewEmployee(emp)}
                    >
                      {/* Employee Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center font-bold text-xs text-foreground shrink-0">
                            {emp.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground group-hover:text-blue-600 transition-colors">
                              {emp.name}
                            </div>
                            {emp.name_bn && (
                              <div className="text-[11px] text-muted-foreground font-normal">
                                {emp.name_bn}
                              </div>
                            )}
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              <span>{emp.mobile}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* ID */}
                      <td className="py-3 px-3 font-mono text-[11px] text-muted-foreground">
                        {emp.employee_id_number || '—'}
                      </td>

                      {/* Department */}
                      <td className="py-3 px-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded-md ${getDepartmentBadge(
                            emp.department
                          )}`}
                        >
                          {emp.department || 'General'}
                        </Badge>
                      </td>

                      {/* Role */}
                      <td className="py-3 px-3 text-foreground font-medium max-w-[180px] truncate" title={emp.role}>
                        {emp.role || emp.designation || 'Staff Member'}
                      </td>

                      {/* Employment Type */}
                      <td className="py-3 px-3 text-muted-foreground capitalize">
                        {(emp.employee_type || 'permanent').replace('_', ' ')}
                      </td>

                      {/* Salary Basis */}
                      <td className="py-3 px-3 text-muted-foreground capitalize">
                        {(emp.salary_basis || 'monthly').replace('_', ' ')}
                      </td>

                      {/* Current Salary */}
                      <td className="py-3 px-3 text-right font-bold text-foreground tabular-nums">
                        {getSalaryDisplay(emp)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-medium capitalize px-2 py-0.5 rounded-full ${getStatusBadge(
                            emp.status
                          )}`}
                        >
                          {emp.status}
                        </Badge>
                      </td>

                      {/* 3-Dot Action Menu */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg min-h-[32px] min-w-[32px]"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 text-xs font-medium">
                            <DropdownMenuItem onClick={() => onViewEmployee(emp)} className="cursor-pointer">
                              <Eye className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                              <span>View 360° Profile</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => onEditEmployee(emp)} className="cursor-pointer">
                              <Edit className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                              <span>Edit Details</span>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem asChild className="cursor-pointer">
                              <Link href={`/${tenantSlug}/hr/attendance?employee=${emp.id}`}>
                                <Clock className="w-3.5 h-3.5 mr-2 text-blue-600" />
                                <span>Attendance Roster</span>
                              </Link>
                            </DropdownMenuItem>

                            <DropdownMenuItem asChild className="cursor-pointer">
                              <Link href={`/${tenantSlug}/hr/payroll?employee=${emp.id}`}>
                                <Wallet className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                                <span>Payroll & Slips</span>
                              </Link>
                            </DropdownMenuItem>

                            <DropdownMenuItem asChild className="cursor-pointer">
                              <Link href={`/${tenantSlug}/hr/advances?employee=${emp.id}`}>
                                <Coins className="w-3.5 h-3.5 mr-2 text-amber-600" />
                                <span>Salary Advance</span>
                              </Link>
                            </DropdownMenuItem>

                            {onManageAccess && (
                              <DropdownMenuItem onClick={() => onManageAccess(emp)} className="cursor-pointer">
                                <Key className="w-3.5 h-3.5 mr-2 text-indigo-600" />
                                <span>Login Access</span>
                              </DropdownMenuItem>
                            )}

                            {onToggleStatus && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => onToggleStatus(emp)}
                                  className={`cursor-pointer ${
                                    emp.status === 'active' ? 'text-red-600 hover:text-red-700' : 'text-emerald-600 hover:text-emerald-700'
                                  }`}
                                >
                                  {emp.status === 'active' ? (
                                    <>
                                      <UserX className="w-3.5 h-3.5 mr-2" />
                                      <span>Deactivate</span>
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="w-3.5 h-3.5 mr-2" />
                                      <span>Activate</span>
                                    </>
                                  )}
                                </DropdownMenuItem>
                              </>
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

          {/* Mobile Cards View (< 768px) */}
          <div className="md:hidden divide-y divide-border">
            {filteredEmployees.map((emp) => (
              <div
                key={emp.id}
                className="p-4 hover:bg-muted transition-colors space-y-3"
                onClick={() => onViewEmployee(emp)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center font-bold text-xs text-foreground shrink-0">
                      {emp.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground text-sm">{emp.name}</div>
                      <div className="text-xs text-muted-foreground">{emp.role || 'Staff Member'}</div>
                      <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                        {emp.employee_id_number}
                      </div>
                    </div>
                  </div>

                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg min-h-[36px] min-w-[36px]"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 text-xs font-medium">
                        <DropdownMenuItem onClick={() => onViewEmployee(emp)}>
                          <Eye className="w-3.5 h-3.5 mr-2" />
                          <span>View Profile</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEditEmployee(emp)}>
                          <Edit className="w-3.5 h-3.5 mr-2" />
                          <span>Edit</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/${tenantSlug}/hr/attendance?employee=${emp.id}`}>
                            <Clock className="w-3.5 h-3.5 mr-2 text-blue-600" />
                            <span>Attendance</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/${tenantSlug}/hr/payroll?employee=${emp.id}`}>
                            <Wallet className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                            <span>Payroll</span>
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-50">
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-medium uppercase px-2 py-0.5 ${getDepartmentBadge(
                      emp.department
                    )}`}
                  >
                    {emp.department || 'General'}
                  </Badge>
                  <span className="font-bold text-foreground tabular-nums">
                    {getSalaryDisplay(emp)}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-medium capitalize px-2 py-0.5 ${getStatusBadge(
                      emp.status
                    )}`}
                  >
                    {emp.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
