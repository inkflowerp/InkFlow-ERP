'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  X,
  Phone,
  Mail,
  Building,
  Calendar,
  Wallet,
  Clock,
  Coins,
  FileText,
  Key,
  ShieldCheck,
  Send,
  ExternalLink,
  MapPin,
  HeartPulse,
  Briefcase,
  Layers,
  CheckCircle2,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import type { EmployeeRecord } from '@/types/workforce.types'

export interface EmployeeProfileDialogProps {
  employee: EmployeeRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  tenantSlug: string
  onEdit?: (employee: EmployeeRecord) => void
  onSendInvitation?: (employeeId: string) => Promise<void>
}

export function EmployeeProfileDialog({
  employee,
  open,
  onOpenChange,
  tenantSlug,
  onEdit,
  onSendInvitation,
}: EmployeeProfileDialogProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [isSendingInvite, setIsSendingInvite] = useState(false)
  const [inviteSent, setInviteSent] = useState(false)

  if (!employee) return null

  const handleInvite = async () => {
    if (!onSendInvitation) return
    setIsSendingInvite(true)
    try {
      await onSendInvitation(employee.id)
      setInviteSent(true)
      setTimeout(() => setInviteSent(false), 3000)
    } finally {
      setIsSendingInvite(false)
    }
  }

  const getStatusBadge = (status: string) => {
    if (status === 'active') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    if (status === 'on_leave') return 'bg-amber-50 text-amber-700 border-amber-200'
    return 'bg-red-50 text-red-700 border-red-200'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-card border-border shadow-xl rounded-2xl">
        {/* Header Profile Bar */}
        <div className="bg-muted border-b border-border p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-bold text-lg flex items-center justify-center shadow-sm shrink-0">
              {employee.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-foreground leading-tight">
                  {employee.name}
                </h2>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${getStatusBadge(
                    employee.status
                  )}`}
                >
                  {employee.status}
                </Badge>
              </div>

              {employee.name_bn && (
                <div className="text-xs text-muted-foreground font-normal mt-0.5">
                  {employee.name_bn}
                </div>
              )}

              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                <span className="font-mono bg-card px-2 py-0.5 rounded border border-border font-semibold text-foreground">
                  {employee.employee_id_number}
                </span>
                <span className="capitalize">{employee.role || employee.designation || 'Staff Member'}</span>
                <span>•</span>
                <span className="capitalize">{employee.department}</span>
                {employee.branch_name && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Building className="w-3 h-3" />
                      {employee.branch_name}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false)
                  onEdit(employee)
                }}
                className="h-8 text-xs border-border hover:bg-muted min-h-[32px]"
              >
                Edit Profile
              </Button>
            )}
          </div>
        </div>

        {/* 360-Degree Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b border-border px-6 bg-card">
            <TabsList className="bg-transparent h-10 p-0 space-x-6 justify-start">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none bg-transparent px-1 pb-2 pt-2 text-xs font-medium text-muted-foreground shadow-none"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="compensation"
                className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none bg-transparent px-1 pb-2 pt-2 text-xs font-medium text-muted-foreground shadow-none"
              >
                Compensation
              </TabsTrigger>
              <TabsTrigger
                value="duty"
                className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none bg-transparent px-1 pb-2 pt-2 text-xs font-medium text-muted-foreground shadow-none"
              >
                Duty & Shifts
              </TabsTrigger>
              <TabsTrigger
                value="advances"
                className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none bg-transparent px-1 pb-2 pt-2 text-xs font-medium text-muted-foreground shadow-none"
              >
                Advances
              </TabsTrigger>
              <TabsTrigger
                value="access"
                className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none bg-transparent px-1 pb-2 pt-2 text-xs font-medium text-muted-foreground shadow-none"
              >
                Login Access
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {/* 1. Overview Tab */}
            <TabsContent value="overview" className="m-0 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl border border-border bg-muted space-y-2">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-blue-600" />
                    <span>Contact Info</span>
                  </div>
                  <div className="space-y-1 text-muted-foreground">
                    <div>
                      <span className="text-muted-foreground">Mobile:</span> {employee.mobile}
                    </div>
                    {employee.email && (
                      <div>
                        <span className="text-muted-foreground">Email:</span> {employee.email}
                      </div>
                    )}
                    {employee.address && (
                      <div>
                        <span className="text-muted-foreground">Address:</span> {employee.address}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-muted space-y-2">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                    <span>Employment Terms</span>
                  </div>
                  <div className="space-y-1 text-muted-foreground">
                    <div>
                      <span className="text-muted-foreground">Joining Date:</span> {employee.joining_date || 'N/A'}
                    </div>
                    <div className="capitalize">
                      <span className="text-muted-foreground">Employment Type:</span>{' '}
                      {(employee.employee_type || 'permanent').replace('_', ' ')}
                    </div>
                    <div className="capitalize">
                      <span className="text-muted-foreground">Salary Basis:</span>{' '}
                      {(employee.salary_basis || 'monthly').replace('_', ' ')}
                    </div>
                    <div className="capitalize">
                      <span className="text-muted-foreground">Payment Method:</span>{' '}
                      {employee.payment_method || 'Cash'}
                    </div>
                  </div>
                </div>

                {employee.emergency_contact_name && (
                  <div className="p-3.5 rounded-xl border border-border bg-muted space-y-2 col-span-full">
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <HeartPulse className="w-3.5 h-3.5 text-rose-600" />
                      <span>Emergency Contact</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-muted-foreground">
                      <div>
                        <span className="text-muted-foreground">Name:</span> {employee.emergency_contact_name}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Relation:</span> {employee.emergency_contact_relation || 'Family'}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Phone:</span> {employee.emergency_contact_phone || '—'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* 2. Compensation Tab */}
            <TabsContent value="compensation" className="m-0 space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-border bg-card">
                  <span className="text-[11px] text-muted-foreground block font-medium">Base Salary</span>
                  <span className="text-lg font-bold text-foreground tabular-nums">
                    ৳ {(employee.base_salary || 0).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-card">
                  <span className="text-[11px] text-muted-foreground block font-medium">Overtime Rate</span>
                  <span className="text-lg font-bold text-foreground tabular-nums">
                    ৳ {(employee.overtime_hourly_rate || 0).toLocaleString('en-IN')}/hr
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-card">
                  <span className="text-[11px] text-muted-foreground block font-medium">Daily Rate</span>
                  <span className="text-lg font-bold text-foreground tabular-nums">
                    ৳ {(employee.daily_rate || 0).toLocaleString('en-IN')}/day
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-card">
                  <span className="text-[11px] text-muted-foreground block font-medium">Hourly Rate</span>
                  <span className="text-lg font-bold text-foreground tabular-nums">
                    ৳ {(employee.hourly_rate || 0).toLocaleString('en-IN')}/hr
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-card col-span-2">
                  <span className="text-[11px] text-muted-foreground block font-medium">Current Advance Balance</span>
                  <span className="text-lg font-bold text-amber-600 tabular-nums">
                    ৳ {(employee.current_advance_balance || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {employee.salary_structure && (
                <div className="mt-4 p-4 rounded-xl border border-border bg-muted space-y-2">
                  <h4 className="font-semibold text-foreground text-xs">Allowances Breakdown</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-muted-foreground">
                    <div>House: ৳ {employee.salary_structure.house_allowance || 0}</div>
                    <div>Transport: ৳ {employee.salary_structure.transport_allowance || 0}</div>
                    <div>Food: ৳ {employee.salary_structure.food_allowance || 0}</div>
                    <div>Medical: ৳ {employee.salary_structure.medical_allowance || 0}</div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* 3. Duty & Shifts Tab */}
            <TabsContent value="duty" className="m-0 space-y-4 text-xs">
              <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-muted-foreground block">Office Start Time</span>
                    <span className="font-semibold text-foreground text-sm">
                      {employee.duty_settings?.office_start_time || '09:00 AM'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Office End Time</span>
                    <span className="font-semibold text-foreground text-sm">
                      {employee.duty_settings?.office_end_time || '06:00 PM'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Grace Period</span>
                    <span className="font-semibold text-foreground text-sm">
                      {employee.duty_settings?.late_grace_minutes || 15} minutes
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Weekly Off Day</span>
                    <span className="font-semibold text-foreground text-sm">
                      {employee.duty_settings?.weekly_off_day || 'Friday'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Overtime Rule</span>
                    <span className="font-semibold text-foreground text-sm capitalize">
                      {employee.duty_settings?.ot_calc_type || '1.5x Standard'}
                    </span>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* 4. Advances Tab */}
            <TabsContent value="advances" className="m-0 space-y-4 text-xs">
              <div className="p-4 rounded-xl border border-border bg-card flex items-center justify-between">
                <div>
                  <span className="text-muted-foreground block">Outstanding Advance</span>
                  <span className="text-2xl font-bold text-amber-600 tabular-nums">
                    ৳ {(employee.current_advance_balance || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <Button asChild size="sm" className="h-8 text-xs bg-blue-600 text-white hover:bg-blue-700">
                  <Link href={`/${tenantSlug}/hr/advances?employee=${employee.id}`}>
                    <span>Manage Advances</span>
                    <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                  </Link>
                </Button>
              </div>
            </TabsContent>

            {/* 5. Access Tab */}
            <TabsContent value="access" className="m-0 space-y-4 text-xs">
              <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-blue-600" />
                    <span>Portal Credentials & Access</span>
                  </div>
                  <Badge variant="outline" className="bg-muted text-foreground text-[10px]">
                    {employee.portal_credentials?.create_login ? 'Portal Active' : 'No Login'}
                  </Badge>
                </div>

                <div className="space-y-2 text-muted-foreground">
                  <div>
                    <span className="text-muted-foreground">Username / Phone:</span>{' '}
                    <span className="font-mono font-medium text-foreground">
                      {employee.portal_credentials?.username || employee.mobile}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Portal Role:</span>{' '}
                    <span className="capitalize font-medium text-foreground">
                      {employee.portal_credentials?.role || 'Staff Operator'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Password:</span>{' '}
                    <span className="font-mono text-muted-foreground">•••••••• (Masked for Security)</span>
                  </div>
                </div>

                {onSendInvitation && (
                  <div className="pt-3 border-t border-border flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      Send login instructions via SMS / WhatsApp
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleInvite}
                      disabled={isSendingInvite || inviteSent}
                      className="h-8 text-xs border-border hover:bg-muted min-h-[32px]"
                    >
                      {inviteSent ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                          <span>Invitation Sent</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5 mr-1 text-blue-600" />
                          <span>{isSendingInvite ? 'Sending...' : 'Send Invitation'}</span>
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
