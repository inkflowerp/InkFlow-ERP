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
  Printer,
  Copy,
  Check,
  Sparkles,
  Smartphone,
  Landmark,
  Shield,
  CreditCard,
  User,
  AlertCircle,
  QrCode,
  BadgeCheck,
  DollarSign,
  GraduationCap,
  Eye,
  Download,
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
import type { EmployeeRecord, DocumentAttachment } from '@/types/workforce.types'
import { useI18n } from '@/i18n/context'
import { useTenant } from '@/hooks/use-tenant'

export interface EmployeeProfileDialogProps {
  employee: EmployeeRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  tenantSlug: string
  onEdit?: (employee: EmployeeRecord) => void
  onSendInvitation?: (employeeId: string) => Promise<void>
}

const ROLE_SCOPES: Record<string, { title: string; badge: string; scopes: string[]; limitations: string[] }> = {
  operator: {
    title: 'Production Machine Operator (মেশিন অপারেটর)',
    badge: 'Machine Operator',
    scopes: [
      'View assigned job orders & machine print queue',
      'Start/Stop press run timers & log speed',
      'Log waste & scrap roll consumption',
      'Personal attendance & shift check-in / check-out',
    ],
    limitations: [
      'No access to customer financial ledgers or pricing formulas',
      'Job queue limited to assigned printing machines only',
      'Cannot edit or delete job orders once completed',
      'Geofenced attendance: Shop-floor punch only',
    ],
  },
  designer: {
    title: 'Graphic Designer & Pre-press (ডিজাইনার)',
    badge: 'Pre-Press Studio',
    scopes: [
      'Customer design asset library & vector proofs',
      'Color separation & plate generation',
      'Proof generation & approval workflow',
      'Design stage progress tracking & status updates',
    ],
    limitations: [
      'Cannot modify billing invoices or payment status',
      'File uploads restricted to vector and PDF print specs',
      'Proof watermarking applied before client sign-off',
    ],
  },
  production_manager: {
    title: 'Production Manager (উৎপাদন ব্যবস্থাপক)',
    badge: 'Production In-Charge',
    scopes: [
      'Full factory production scheduling & routing',
      'Raw material requisition & roll allocation',
      'Overtime & shift attendance adjustments approval',
      'Machine maintenance scheduling & downtime logs',
    ],
    limitations: [
      'Limited to production, machine and inventory modules',
      'Cannot disburse final payroll bank transactions',
      'Restricted to factory branch operations',
    ],
  },
  manager: {
    title: 'Floor Manager / Supervisor (সুপারভাইজার)',
    badge: 'Supervisory',
    scopes: [
      'Full production scheduling & routing',
      'Attendance & overtime review & approval',
      'Machine maintenance scheduling',
      'Staff task delegation & job tracking',
    ],
    limitations: [
      'Cannot modify company-wide legal or financial accounts',
      'Branch-level data scope: isolated from other facilities',
      'Advance approvals limited to standard monthly thresholds',
    ],
  },
  branch_manager: {
    title: 'Branch Manager & In-Charge (শাখা প্রধান)',
    badge: 'Branch In-Charge',
    scopes: [
      'Branch daily turnover & order oversight',
      'Staff attendance & local roster control',
      'Customer account verification & delivery dispatch',
      'Branch cash drawer reconciliation',
    ],
    limitations: [
      'Branch-scoped data isolation',
      'No platform owner or global settings configuration',
    ],
  },
  store_manager: {
    title: 'Store & Inventory Keeper (স্টোর কিপার)',
    badge: 'Inventory Keeper',
    scopes: [
      'Raw material stock check-in & verification',
      'Master roll barcode issue to press',
      'Scrap & waste material tracking',
      'Stock replenishment low-level alerts',
    ],
    limitations: [
      'Cannot create sales orders or change sales quotes',
      'Requires PO verification for all stock inward receipts',
    ],
  },
  sales_rep: {
    title: 'Sales & Counter Executive (কাউন্টার সেলস)',
    badge: 'Front Desk',
    scopes: [
      'Counter POS order creation & instant quotes',
      'Customer directory & balance checks',
      'Invoice printing & payment receipt',
      'Counter POS terminal & cash collection',
    ],
    limitations: [
      'Cannot view factory labor rates or supplier purchase costs',
      'Cannot approve discounts beyond authorized 5% threshold',
      'Cash drawer access locked to logged-in user shifts',
    ],
  },
  sales_manager: {
    title: 'Sales & Commercial Manager (বিক্রয় ব্যবস্থাপক)',
    badge: 'Commercial Sales',
    scopes: [
      'Commercial pipeline & corporate quotations',
      'Customer credit limit authorization',
      'Sales rep performance metrics & targets',
      'Client relationship & statement export',
    ],
    limitations: [
      'Cannot modify machine maintenance or technician wages',
      'Discount approvals beyond policy require Director sign-off',
    ],
  },
  delivery_coordinator: {
    title: 'Delivery & Logistics Coordinator (ডেলিভারি সমন্বয়কারী)',
    badge: 'Logistics Desk',
    scopes: [
      'Challan dispatch generation & tracking',
      'Courier parcel tracking & manifest log',
      'Client delivery address confirmation',
      'Customer digital receipt capture',
    ],
    limitations: [
      'Cannot modify sales order pricing or specification items',
      'Must record proof of delivery for completed orders',
    ],
  },
  field_staff: {
    title: 'Field Installation & Delivery (মাঠকর্মী)',
    badge: 'Field Operations',
    scopes: [
      'Site delivery check-in & photos',
      'Installation task checklist',
      'Customer sign-off capture',
      'GPS location ping on job start',
    ],
    limitations: [
      'Mobile-only simplified interface',
      'No access to internal company cost sheets or inventory stock',
    ],
  },
  accounts: {
    title: 'Accounts & Billing Executive (হিসাবরক্ষণ)',
    badge: 'Finance Desk',
    scopes: [
      'Payroll generation & payment disbursement',
      'Salary advances recording',
      'Vendor & material payment logging',
      'Ledger & daily cash register reconciliation',
    ],
    limitations: [
      'Dual-approval required for payments exceeding ৳ 50,000',
      'Audit log recorded on all ledger adjustments and refunds',
    ],
  },
  accountant: {
    title: 'Senior Accountant (প্রধান হিসাবরক্ষক)',
    badge: 'Senior Accounts',
    scopes: [
      'Full chart of accounts & profit/loss statements',
      'Bank reconciliation & tax/VAT registers',
      'Staff payroll final approval & disbursements',
      'Vendor credit lines & ledger verification',
    ],
    limitations: [
      'Cannot modify past closed fiscal year records without audit lock release',
    ],
  },
  general_staff: {
    title: 'General Factory Staff (সাধারণ কর্মী)',
    badge: 'General Staff',
    scopes: [
      'Personal attendance & shift check-in',
      'View personal payslip & advances balance',
      'Submit leave and overtime requests',
      'View company announcements',
    ],
    limitations: [
      'Read-only personal self-service portal access only',
      'Cannot access shop-floor production management or finances',
    ],
  },
}

function getDynamicRoleMeta(employee: EmployeeRecord) {
  const roleName = employee.role || employee.designation || 'Staff'
  const dept = employee.department || 'General'
  return {
    title: `${roleName} (${dept})`,
    badge: roleName,
    scopes: [
      `Assigned ${dept} operations and workflow tasks`,
      'Personal attendance and duty check-in logging',
      'Personal payslip, overtime and advances records',
      'Task progress logging and completion updates',
    ],
    limitations: [
      `Access limited to assigned ${dept} department scope`,
      'Cannot modify billing, payments or system configuration',
      'Operational advances subject to company payroll limits',
    ],
  }
}

function calculateTenure(joiningDateStr?: string | null): string {
  if (!joiningDateStr) return 'Not recorded'
  try {
    const start = new Date(joiningDateStr)
    const now = new Date()
    if (isNaN(start.getTime())) return joiningDateStr
    const diffMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
    if (diffMonths < 1) return 'Newly Joined (< 1 mo)'
    const years = Math.floor(diffMonths / 12)
    const months = diffMonths % 12
    if (years === 0) return `${months} mo${months > 1 ? 's' : ''}`
    if (months === 0) return `${years} yr${years > 1 ? 's' : ''}`
    return `${years} yr${years > 1 ? 's' : ''} ${months} mo${months > 1 ? 's' : ''}`
  } catch {
    return joiningDateStr
  }
}

export function EmployeeProfileDialog({
  employee,
  open,
  onOpenChange,
  tenantSlug,
  onEdit,
  onSendInvitation,
}: EmployeeProfileDialogProps) {
  const { tBilingual } = useI18n()
  const { company } = useTenant()
  const [activeTab, setActiveTab] = useState('overview')
  const [isSendingInvite, setIsSendingInvite] = useState(false)
  const [inviteSent, setInviteSent] = useState(false)
  const [copiedId, setCopiedId] = useState(false)
  const [printMode, setPrintMode] = useState<'none' | 'dossier' | 'id_badge'>('none')
  const [badgeSide, setBadgeSide] = useState<'both' | 'front' | 'back'>('both')
  const [imgError, setImgError] = useState(false)

  // Listen to afterprint to reset printMode cleanly
  React.useEffect(() => {
    const handleAfterPrint = () => setPrintMode('none')
    window.addEventListener('afterprint', handleAfterPrint)
    return () => window.removeEventListener('afterprint', handleAfterPrint)
  }, [])

  if (!employee) return null

  const companyName = company?.name || company?.legal_name || 'PrintFlow Commercial Press'
  const companyAddress = company?.address || 'Main Press Facility & Factory'
  const companyPhone = company?.phone || '+880 1700-000000'
  const photoUrl = employee.profile_picture_url || (employee as any).avatar_url || (employee as any).photo_url || null

  const handleCopyId = () => {
    navigator.clipboard.writeText(employee.employee_id_number)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

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

  const triggerPrint = (mode: 'dossier' | 'id_badge') => {
    setPrintMode(mode)
    setTimeout(() => {
      window.print()
      setTimeout(() => {
        setPrintMode('none')
      }, 800)
    }, 150)
  }

  const getStatusBadge = (status: string) => {
    if (status === 'active') return 'bg-success-surface text-success border-border'
    if (status === 'on_leave') return 'bg-warning-surface text-warning border-border'
    return 'bg-destructive/10 text-destructive border-border'
  }

  const roleKey = (employee.portal_credentials?.role || employee.role || 'operator').toLowerCase()
  const roleMeta = ROLE_SCOPES[roleKey] || getDynamicRoleMeta(employee)

  const bloodGroup = (employee as any).blood_group || null
  const nidNumber = (employee as any).nid_number || null
  const dob = (employee as any).date_of_birth || null
  const altPhone = (employee as any).phone || null
  const permAddress = (employee as any).permanent_address || null

  return (
    <Dialog open={open} onOpenChange={onOpenChange} maxWidth="max-w-5xl">
      <DialogContent className="p-0 overflow-hidden bg-card border border-border shadow-xs rounded-xl flex flex-col max-h-[92vh]">
        {/* ==================================================================== */}
        {/* 1. Header Profile Banner & Quick Identity Bar */}
        {/* ==================================================================== */}
        <div className="bg-muted border-b border-border p-4 sm:p-5 shrink-0 space-y-3.5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              {/* Avatar with Status Ring */}
              <div className="relative shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-muted font-bold text-xl flex items-center justify-center shadow-xs border border-border overflow-hidden">
                  {photoUrl && !imgError ? (
                    <img
                      src={photoUrl}
                      alt={employee.name}
                      className="w-full h-full object-cover"
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <span className="text-foreground">{employee.name.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div
                  className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card ${
                    employee.status === 'active'
                      ? 'bg-success'
                      : employee.status === 'on_leave'
                      ? 'bg-warning'
                      : 'bg-destructive'
                  }`}
                  title={`Status: ${employee.status}`}
                />
              </div>

              {/* Identity & Department Hierarchy */}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-bold text-foreground leading-tight truncate">
                    {employee.name}
                  </h2>
                  <Badge variant="outline" className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-full ${getStatusBadge(employee.status)}`}>
                    {employee.status.replace('_', ' ')}
                  </Badge>
                  {bloodGroup && (
                    <Badge variant="outline" className="text-xs font-semibold px-1.5 py-0 border-border bg-card text-destructive flex items-center gap-1">
                      <HeartPulse className="w-3 h-3" />
                      <span>{bloodGroup}</span>
                    </Badge>
                  )}
                </div>

                {employee.name_bn && (
                  <p className="text-xs text-muted-foreground font-normal mt-0.5">
                    {employee.name_bn}
                  </p>
                )}

                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                  <button
                    type="button"
                    onClick={handleCopyId}
                    title="Click to copy employee ID"
                    className="font-mono bg-card px-2 py-0.5 rounded border border-border font-semibold text-foreground hover:bg-muted flex items-center gap-1 transition-colors"
                  >
                    <span>{employee.employee_id_number}</span>
                    {copiedId ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                  </button>
                  <span className="capitalize font-medium text-foreground">{employee.role || employee.designation || 'Staff'}</span>
                  <span>•</span>
                  <Badge variant="secondary" className="text-xs px-2 py-0 capitalize">
                    {employee.department}
                  </Badge>
                  {employee.branch_name && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Building className="w-3 h-3" />
                        <span>{employee.branch_name}</span>
                      </span>
                    </>
                  )}
                  <span>•</span>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>Tenure: {calculateTenure(employee.joining_date)}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center gap-2 self-start sm:self-center shrink-0 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => triggerPrint('dossier')}
                className="h-8 text-xs border-border bg-card hover:bg-muted"
                title="Print 360° Profile Dossier"
              >
                <Printer className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                <span>Print Dossier</span>
              </Button>

              {onEdit && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false)
                    onEdit(employee)
                  }}
                  className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Edit Profile
                </Button>
              )}
            </div>
          </div>

          {/* Top 360° KPI Metric Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="p-2.5 rounded-lg border border-border bg-card">
              <span className="text-[12px] text-muted-foreground block font-medium">Base Salary Basis</span>
              <span className="text-sm font-bold text-foreground tabular-nums">
                ৳ {(employee.base_salary || 0).toLocaleString('en-IN')}
              </span>
              <span className="text-[12px] text-muted-foreground block capitalize mt-0.5">
                {(employee.salary_basis || 'monthly').replace('_', ' ')}
              </span>
            </div>

            <div className="p-2.5 rounded-lg border border-border bg-card">
              <span className="text-[12px] text-muted-foreground block font-medium">Overtime Rate</span>
              <span className="text-sm font-bold text-primary tabular-nums">
                ৳ {(employee.overtime_hourly_rate || 0).toLocaleString('en-IN')}/hr
              </span>
              <span className="text-[12px] text-muted-foreground block capitalize mt-0.5">
                {employee.duty_settings?.ot_calc_type?.replace('_', ' ') || '1.5x Standard'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg border border-border bg-card">
              <span className="text-[12px] text-muted-foreground block font-medium">Advance Balance</span>
              <span className={`text-sm font-bold tabular-nums ${employee.current_advance_balance > 0 ? 'text-warning' : 'text-foreground'}`}>
                ৳ {(employee.current_advance_balance || 0).toLocaleString('en-IN')}
              </span>
              <span className="text-[12px] text-muted-foreground block mt-0.5">
                {employee.current_advance_balance > 0 ? 'Outstanding Due' : 'Zero Debt'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg border border-border bg-card">
              <span className="text-[12px] text-muted-foreground block font-medium">Shift Timings</span>
              <span className="text-sm font-bold text-foreground font-mono">
                {employee.duty_settings?.office_start_time || '09:00'} – {employee.duty_settings?.office_end_time || '18:00'}
              </span>
              <span className="text-[12px] text-muted-foreground block mt-0.5">
                Off: {employee.duty_settings?.weekly_off_day || 'Friday'}
              </span>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* 2. 360-Degree Deep Information Tabs */}
        {/* ==================================================================== */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0">
          <div className="border-b border-border px-4 sm:px-6 bg-card shrink-0 overflow-x-auto scrollbar-none">
            <TabsList className="bg-transparent h-10 p-0 space-x-4 sm:space-x-6 justify-start">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent px-1 pb-2 pt-2 text-xs font-medium text-muted-foreground shadow-none"
              >
                360° Overview
              </TabsTrigger>
              <TabsTrigger
                value="compensation"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent px-1 pb-2 pt-2 text-xs font-medium text-muted-foreground shadow-none"
              >
                Compensation & Payroll
              </TabsTrigger>
              <TabsTrigger
                value="duty"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent px-1 pb-2 pt-2 text-xs font-medium text-muted-foreground shadow-none"
              >
                Duty & Attendance Rules
              </TabsTrigger>
              <TabsTrigger
                value="advances"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent px-1 pb-2 pt-2 text-xs font-medium text-muted-foreground shadow-none"
              >
                Advances & Financials
              </TabsTrigger>
              <TabsTrigger
                value="access"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent px-1 pb-2 pt-2 text-xs font-medium text-muted-foreground shadow-none"
              >
                Portal Login & Scope
              </TabsTrigger>
              <TabsTrigger
                value="documents"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent px-1 pb-2 pt-2 text-xs font-medium text-muted-foreground shadow-none"
              >
                Documents ({employee.document_attachments?.length || 0})
              </TabsTrigger>
              <TabsTrigger
                value="id_card"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent px-1 pb-2 pt-2 text-xs font-medium text-muted-foreground shadow-none"
              >
                Printable ID Badge
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
            {/* ---------------------------------------------------------------- */}
            {/* TAB 1: 360° Overview */}
            {/* ---------------------------------------------------------------- */}
            <TabsContent value="overview" className="m-0 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1.1 Personal Identity & Official Record */}
                <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                  <div className="font-semibold text-foreground flex items-center justify-between pb-2 border-b border-border">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-primary" />
                      <span>{tBilingual('Personal Identity & Bio', 'ব্যক্তিগত তথ্য ও পরিচয়')}</span>
                    </span>
                    <Badge variant="outline" className="text-[12px] font-mono border-border bg-muted">
                      {employee.employee_id_number}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-muted-foreground">
                    <div>
                      <span className="text-[12px] text-muted-foreground block">Full Name (English)</span>
                      <span className="font-semibold text-foreground">{employee.name}</span>
                    </div>
                    <div>
                      <span className="text-[12px] text-muted-foreground block">Name in Bengali</span>
                      <span className="font-medium text-foreground">{employee.name_bn || '—'}</span>
                    </div>

                    <div>
                      <span className="text-[12px] text-muted-foreground block">National ID / Birth Cert No</span>
                      <span className="font-mono font-medium text-foreground">{nidNumber || 'Not provided'}</span>
                    </div>
                    <div>
                      <span className="text-[12px] text-muted-foreground block">Blood Group</span>
                      <span className="font-semibold text-foreground">{bloodGroup || 'Not recorded'}</span>
                    </div>

                    <div>
                      <span className="text-[12px] text-muted-foreground block">Date of Birth</span>
                      <span className="font-medium text-foreground">{dob || 'Not provided'}</span>
                    </div>
                    <div>
                      <span className="text-[12px] text-muted-foreground block">Education / Qualification</span>
                      <span className="font-medium text-foreground">{employee.educational_qualification || 'Technical Trade Experience'}</span>
                    </div>
                  </div>
                </div>

                {/* 1.2 Contact & Address */}
                <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                  <div className="font-semibold text-foreground flex items-center justify-between pb-2 border-b border-border">
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-primary" />
                      <span>{tBilingual('Contact & Addresses', 'যোগাযোগ ও ঠিকানা')}</span>
                    </span>
                  </div>

                  <div className="space-y-2.5 text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[12px] text-muted-foreground block">Primary Mobile Phone</span>
                        <a href={`tel:${employee.mobile}`} className="font-mono font-semibold text-primary hover:underline">
                          {employee.mobile}
                        </a>
                      </div>
                      {altPhone && (
                        <div>
                          <span className="text-[12px] text-muted-foreground block">Alt Phone / WhatsApp</span>
                          <span className="font-mono font-medium text-foreground">{altPhone}</span>
                        </div>
                      )}
                    </div>

                    {employee.email && (
                      <div>
                        <span className="text-[12px] text-muted-foreground block">Email Address</span>
                        <a href={`mailto:${employee.email}`} className="font-medium text-primary hover:underline">
                          {employee.email}
                        </a>
                      </div>
                    )}

                    <div className="pt-2 border-t border-border space-y-1.5">
                      <div>
                        <span className="text-[12px] text-muted-foreground block flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-primary" />
                          <span>Present Address:</span>
                        </span>
                        <span className="text-foreground">{employee.address || 'Not provided'}</span>
                      </div>
                      {permAddress && (
                        <div>
                          <span className="text-[12px] text-muted-foreground block flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-muted-foreground" />
                            <span>Permanent Address:</span>
                          </span>
                          <span className="text-foreground">{permAddress}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 1.3 Emergency Contact */}
                {employee.emergency_contact_name && (
                  <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                    <div className="font-semibold text-foreground flex items-center gap-1.5 pb-2 border-b border-border">
                      <HeartPulse className="w-3.5 h-3.5 text-destructive" />
                      <span>{tBilingual('Emergency Contact Guardian', 'জরুরি যোগাযোগের অভিভাবক')}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-muted-foreground">
                      <div>
                        <span className="text-[12px] text-muted-foreground block">Guardian Name</span>
                        <span className="font-semibold text-foreground">{employee.emergency_contact_name}</span>
                      </div>
                      <div>
                        <span className="text-[12px] text-muted-foreground block">Relationship</span>
                        <span className="font-medium text-foreground capitalize">{employee.emergency_contact_relation || 'Family'}</span>
                      </div>
                      <div>
                        <span className="text-[12px] text-muted-foreground block">Emergency Phone</span>
                        <a href={`tel:${employee.emergency_contact_phone}`} className="font-mono font-semibold text-primary hover:underline">
                          {employee.emergency_contact_phone || '—'}
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* 1.4 Organizational Placement */}
                <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                  <div className="font-semibold text-foreground flex items-center gap-1.5 pb-2 border-b border-border">
                    <Briefcase className="w-3.5 h-3.5 text-primary" />
                    <span>{tBilingual('Organizational Placement', 'সাংগঠনিক পদায়ন')}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-muted-foreground">
                    <div>
                      <span className="text-[12px] text-muted-foreground block">Department</span>
                      <span className="font-semibold text-foreground capitalize">{employee.department}</span>
                    </div>
                    <div>
                      <span className="text-[12px] text-muted-foreground block">Designation / Role</span>
                      <span className="font-semibold text-foreground">{employee.role || 'Staff'}</span>
                    </div>
                    <div>
                      <span className="text-[12px] text-muted-foreground block">Joining Date</span>
                      <span className="font-medium text-foreground">{employee.joining_date || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[12px] text-muted-foreground block">Employment Agreement</span>
                      <span className="font-medium text-foreground capitalize">{(employee.employee_type || 'permanent').replace('_', ' ')}</span>
                    </div>
                    {employee.contract_end_date && (
                      <div className="col-span-2">
                        <span className="text-[12px] text-muted-foreground block">Contract Expiry Date</span>
                        <span className="font-medium text-warning">{employee.contract_end_date}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ---------------------------------------------------------------- */}
            {/* TAB 2: Compensation & Payroll */}
            {/* ---------------------------------------------------------------- */}
            <TabsContent value="compensation" className="m-0 space-y-4 text-xs">
              <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-primary" />
                    <span>{tBilingual('Base Pay & Live Economics Breakdown', 'বেতন কাঠামো ও রেটের হিসাব')}</span>
                  </div>
                  <Badge variant="secondary" className="text-[12px] font-mono">
                    26 Days / 208 Working Hours Model
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg border border-border bg-muted/40">
                    <span className="text-[12px] text-muted-foreground block">Base Payout</span>
                    <span className="text-base font-bold text-foreground tabular-nums">
                      ৳ {(employee.base_salary || 0).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[12px] text-muted-foreground block capitalize mt-0.5">
                      {(employee.salary_basis || 'monthly').replace('_', ' ')}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg border border-border bg-muted/40">
                    <span className="text-[12px] text-muted-foreground block">Daily Rate (Base / 26)</span>
                    <span className="text-base font-bold text-foreground tabular-nums">
                      ৳ {(employee.daily_rate || 0).toLocaleString('en-IN')}/day
                    </span>
                    <span className="text-[12px] text-muted-foreground block mt-0.5">Standard daily wage</span>
                  </div>

                  <div className="p-3 rounded-lg border border-border bg-muted/40">
                    <span className="text-[12px] text-muted-foreground block">Hourly Rate (Daily / 8)</span>
                    <span className="text-base font-bold text-foreground tabular-nums">
                      ৳ {(employee.hourly_rate || 0).toLocaleString('en-IN')}/hr
                    </span>
                    <span className="text-[12px] text-muted-foreground block mt-0.5">Regular working hour</span>
                  </div>

                  <div className="p-3 rounded-lg border border-border bg-muted/40">
                    <span className="text-[12px] text-muted-foreground block">Overtime Rate</span>
                    <span className="text-base font-bold text-primary tabular-nums">
                      ৳ {(employee.overtime_hourly_rate || 0).toLocaleString('en-IN')}/hr
                    </span>
                    <span className="text-[12px] text-muted-foreground block mt-0.5">Approved overtime</span>
                  </div>
                </div>

                {/* Detailed Allowances Breakdown */}
                {employee.salary_structure && (
                  <div className="pt-3 border-t border-border space-y-2">
                    <h4 className="font-semibold text-foreground text-xs">Allowances & Earnings Structure</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-muted-foreground">
                      <div className="p-2.5 rounded-lg border border-border bg-background">
                        <span className="text-[12px] text-muted-foreground block">Basic Pay</span>
                        <span className="font-semibold text-foreground tabular-nums">৳ {employee.salary_structure.basic || 0}</span>
                      </div>
                      <div className="p-2.5 rounded-lg border border-border bg-background">
                        <span className="text-[12px] text-muted-foreground block">House Rent</span>
                        <span className="font-semibold text-foreground tabular-nums">৳ {employee.salary_structure.house_allowance || 0}</span>
                      </div>
                      <div className="p-2.5 rounded-lg border border-border bg-background">
                        <span className="text-[12px] text-muted-foreground block">Medical Allowance</span>
                        <span className="font-semibold text-foreground tabular-nums">৳ {employee.salary_structure.medical_allowance || 0}</span>
                      </div>
                      <div className="p-2.5 rounded-lg border border-border bg-background">
                        <span className="text-[12px] text-muted-foreground block">Transport / Conveyance</span>
                        <span className="font-semibold text-foreground tabular-nums">৳ {employee.salary_structure.transport_allowance || 0}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Method Details */}
              <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-primary" />
                    <span>{tBilingual('Disbursement Channel & Account Details', 'পেমেন্ট পদ্ধতি ও ব্যাংক/ওয়ালেট বিবরণ')}</span>
                  </div>
                  <Badge variant="outline" className="text-xs uppercase bg-background font-mono">
                    {employee.payment_method || 'Cash'}
                  </Badge>
                </div>

                {employee.payment_method === 'bank' && employee.bank_payment_info ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-muted-foreground">
                    <div>
                      <span className="text-[12px] text-muted-foreground block">Bank Name</span>
                      <span className="font-semibold text-foreground">{employee.bank_payment_info.bank_name || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[12px] text-muted-foreground block">Branch Name</span>
                      <span className="font-medium text-foreground">{employee.bank_payment_info.branch_name || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[12px] text-muted-foreground block">Account Holder</span>
                      <span className="font-medium text-foreground">{employee.bank_payment_info.account_name || employee.name}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-[12px] text-muted-foreground block">Account Number</span>
                      <span className="font-mono font-semibold text-foreground text-sm">{employee.bank_payment_info.account_number || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[12px] text-muted-foreground block">Routing Code</span>
                      <span className="font-mono text-foreground">{employee.bank_payment_info.routing_number || '—'}</span>
                    </div>
                  </div>
                ) : (employee.payment_method === 'bkash' || employee.payment_method === 'nagad' || employee.payment_method === 'rocket') && employee.mfs_payment_info ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-muted-foreground">
                    <div>
                      <span className="text-[12px] text-muted-foreground block">Provider</span>
                      <span className="font-semibold text-foreground uppercase">{employee.mfs_payment_info.provider || employee.payment_method}</span>
                    </div>
                    <div>
                      <span className="text-[12px] text-muted-foreground block">Wallet Mobile Number</span>
                      <span className="font-mono font-semibold text-foreground text-sm">{employee.mfs_payment_info.wallet_number || employee.mobile}</span>
                    </div>
                    <div>
                      <span className="text-[12px] text-muted-foreground block">Account Type</span>
                      <span className="font-medium text-foreground capitalize">{employee.mfs_payment_info.account_type || 'Personal'}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Coins className="w-4 h-4 text-primary" />
                    <span>Cash on Hand / Factory Counter Handover at month-end payroll settlement.</span>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ---------------------------------------------------------------- */}
            {/* TAB 3: Duty & Attendance Rules */}
            {/* ---------------------------------------------------------------- */}
            <TabsContent value="duty" className="m-0 space-y-4 text-xs">
              <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                <div className="font-semibold text-foreground flex items-center gap-1.5 pb-2 border-b border-border">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>{tBilingual('Shift Timings & Work Hours', 'শিফট সময়সূচি ও কাজের সময়')}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-muted-foreground">
                  <div className="p-3 rounded-lg border border-border bg-muted/40">
                    <span className="text-[12px] text-muted-foreground block">Shift Start Time</span>
                    <span className="font-semibold text-foreground text-sm font-mono">
                      {employee.duty_settings?.office_start_time || '09:00'}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg border border-border bg-muted/40">
                    <span className="text-[12px] text-muted-foreground block">Shift End Time</span>
                    <span className="font-semibold text-foreground text-sm font-mono">
                      {employee.duty_settings?.office_end_time || '18:00'}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg border border-border bg-muted/40">
                    <span className="text-[12px] text-muted-foreground block">Daily Duty Hours</span>
                    <span className="font-semibold text-foreground text-sm">
                      {employee.duty_settings?.daily_duty_hours || 9} Hours
                    </span>
                  </div>

                  <div className="p-3 rounded-lg border border-border bg-muted/40">
                    <span className="text-[12px] text-muted-foreground block">Weekly Off Day</span>
                    <span className="font-semibold text-foreground text-sm">
                      {employee.duty_settings?.weekly_off_day || 'Friday'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Attendance & Fine Policies */}
              <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                <div className="font-semibold text-foreground flex items-center gap-1.5 pb-2 border-b border-border">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  <span>{tBilingual('Attendance Rules & Deduction Policies', 'হাজিরা ও বেতন কর্তন নীতি')}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-muted-foreground">
                  <div>
                    <span className="text-[12px] text-muted-foreground block">Late Grace Period</span>
                    <span className="font-semibold text-foreground">
                      {employee.duty_settings?.late_grace_minutes ?? 15} Minutes
                    </span>
                    <p className="text-[12px] text-muted-foreground mt-0.5">Check-in within this period is not penalized</p>
                  </div>

                  <div>
                    <span className="text-[12px] text-muted-foreground block">Late Deduction Policy</span>
                    <span className="font-semibold text-foreground">
                      {employee.duty_settings?.late_fine_policy === '3_late_1_day_salary'
                        ? '3 Late = 1 Day Salary Deduction'
                        : employee.duty_settings?.late_fine_policy === 'fixed_amount'
                        ? 'Fixed Fine per Late'
                        : 'Warning Only'}
                    </span>
                    <p className="text-[12px] text-muted-foreground mt-0.5">Standard factory HR rule</p>
                  </div>

                  <div>
                    <span className="text-[12px] text-muted-foreground block">Allowed Monthly Leaves</span>
                    <span className="font-semibold text-foreground">
                      {employee.allowed_monthly_leaves ?? 2} Days / Month
                    </span>
                    <p className="text-[12px] text-muted-foreground mt-0.5">Paid casual & sick leaves quota</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ---------------------------------------------------------------- */}
            {/* TAB 4: Advances & Financials */}
            {/* ---------------------------------------------------------------- */}
            <TabsContent value="advances" className="m-0 space-y-4 text-xs">
              <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-primary" />
                    <span>{tBilingual('Outstanding Salary Advance Balance', 'চলতি বেতন অগ্রিম ব্যালেন্স')}</span>
                  </div>
                  <Badge variant="outline" className={`text-xs ${employee.current_advance_balance > 0 ? 'bg-warning-surface text-warning' : 'bg-muted text-foreground'}`}>
                    {employee.current_advance_balance > 0 ? 'Active Advance' : 'Settled'}
                  </Badge>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
                  <div>
                    <span className="text-xs text-muted-foreground block">Current Outstanding Balance</span>
                    <span className="text-3xl font-extrabold text-foreground tabular-nums">
                      ৳ {(employee.current_advance_balance || 0).toLocaleString('en-IN')}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      {employee.current_advance_balance > 0
                        ? 'This amount will be automatically deducted from next payroll cycle.'
                        : 'No active advances currently owed by this employee.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button asChild size="sm" className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                      <Link href={`/${tenantSlug}/hr/advances?employee=${employee.id}`}>
                        <span>Manage Advances</span>
                        <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="h-8 text-xs border-border bg-card hover:bg-muted">
                      <Link href={`/${tenantSlug}/hr/payroll`}>
                        <span>View Payroll Register</span>
                        <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ---------------------------------------------------------------- */}
            {/* TAB 5: Portal Login & Scope */}
            {/* ---------------------------------------------------------------- */}
            <TabsContent value="access" className="m-0 space-y-4 text-xs">
              <div className="p-4 rounded-xl border border-border bg-card space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-primary" />
                    <span>{tBilingual('PrintFlow Portal Login & Role Scope', 'পোর্টাল লগইন ও দায়িত্বের পরিধি')}</span>
                  </div>
                  <Badge variant="outline" className={`text-xs ${employee.portal_credentials?.create_login ? 'bg-success-surface text-success' : 'bg-muted text-muted-foreground'}`}>
                    {employee.portal_credentials?.create_login ? 'Portal Active' : 'No App Access'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-muted-foreground">
                  <div>
                    <span className="text-[12px] text-muted-foreground block">Login Username</span>
                    <span className="font-mono font-bold text-foreground text-sm">
                      {employee.portal_credentials?.username || employee.mobile}
                    </span>
                  </div>
                  <div>
                    <span className="text-[12px] text-muted-foreground block">Portal Email</span>
                    <span className="font-medium text-foreground">
                      {employee.portal_credentials?.email || employee.email || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[12px] text-muted-foreground block">Role Scope</span>
                    <span className="font-semibold text-foreground capitalize">
                      {roleMeta.badge} ({employee.portal_credentials?.role || employee.role || 'operator'})
                    </span>
                  </div>
                </div>

                {/* Role Capabilities Checklist */}
                <div className="p-3.5 rounded-lg border border-border bg-muted/40 space-y-2">
                  <div className="flex items-center gap-1.5 text-foreground font-semibold">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <span>Dynamic Capabilities & Permissions for this Role:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground">
                    {roleMeta.scopes.map((scope, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                        <span className="text-foreground">{scope}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dynamic Access Control & Security Restrictions */}
                <div className="p-3.5 rounded-lg border border-border bg-card space-y-3">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <div className="flex items-center gap-1.5 text-foreground font-semibold">
                      <Shield className="w-4 h-4 text-warning" />
                      <span>Access Control, Operational Limits & Restrictions:</span>
                    </div>
                    <Badge variant="outline" className="text-xs bg-muted border-border font-mono">
                      Security Enforced
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-muted-foreground text-xs">
                    <div className="p-2.5 rounded-md border border-border bg-muted/30 space-y-1">
                      <span className="font-semibold text-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-primary" />
                        <span>Geofence & Location Enforcement:</span>
                      </span>
                      <p className="text-muted-foreground">
                        {employee.branch_name ? `Restricted to ${employee.branch_name} premises. Remote punches require supervisor bypass.` : 'Factory shop-floor premises only.'}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-md border border-border bg-muted/30 space-y-1">
                      <span className="font-semibold text-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3 text-primary" />
                        <span>Shift Punch Window Limits:</span>
                      </span>
                      <p className="text-muted-foreground">
                        Grace period {employee.duty_settings?.late_grace_minutes ?? 15}m. Check-in permitted 30 mins before {employee.duty_settings?.office_start_time || '09:00'}.
                      </p>
                    </div>

                    <div className="p-2.5 rounded-md border border-border bg-muted/30 space-y-1">
                      <span className="font-semibold text-foreground flex items-center gap-1">
                        <Wallet className="w-3 h-3 text-primary" />
                        <span>Financial Advance Ceiling:</span>
                      </span>
                      <p className="text-muted-foreground">
                        Max advance cap ৳ {(employee.base_salary || 0).toLocaleString('en-IN')} (1 month base).
                      </p>
                    </div>
                  </div>

                  {roleMeta.limitations && roleMeta.limitations.length > 0 && (
                    <div className="pt-2 border-t border-border">
                      <span className="text-xs font-semibold text-foreground block mb-1">
                        Role Security Restrictions:
                      </span>
                      <ul className="space-y-1">
                        {roleMeta.limitations.map((limit, idx) => (
                          <li key={idx} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                            <span>{limit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Dispatch Invitation */}
                {onSendInvitation && (
                  <div className="pt-3 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-semibold text-foreground block">
                        Invite Staff Member via SMS / WhatsApp
                      </span>
                      <span className="text-xs text-muted-foreground block">
                        Sends mobile login portal URL, username and credential verification link.
                      </span>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleInvite}
                      disabled={isSendingInvite || inviteSent}
                      className="h-8 text-xs border-border bg-card hover:bg-muted shrink-0"
                    >
                      {inviteSent ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-success" />
                          <span className="text-success">Invitation Sent!</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5 mr-1 text-primary" />
                          <span>{isSendingInvite ? 'Sending...' : 'Send Portal Invitation'}</span>
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ---------------------------------------------------------------- */}
            {/* TAB 6: Documents & Attachments */}
            {/* ---------------------------------------------------------------- */}
            <TabsContent value="documents" className="m-0 space-y-4 text-xs">
              <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    <span>{tBilingual('Employee Documents & Verification Attachments', 'নথিপত্র ও সনদ সংযুক্তি')}</span>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono bg-muted">
                    {employee.document_attachments?.length || 0} Files
                  </Badge>
                </div>

                {employee.document_attachments && employee.document_attachments.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {employee.document_attachments.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-3 rounded-lg border border-border bg-muted/40 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-foreground truncate max-w-[160px]">{doc.name}</span>
                              <Badge variant="outline" className="text-xs px-1.5 py-0 border-border bg-background capitalize">
                                {doc.type.replace('_', ' ')}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground block mt-0.5">
                              {doc.size || 'Attachment'} • {new Date(doc.uploaded_at || Date.now()).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {doc.url && (
                          <div className="flex items-center gap-1 shrink-0">
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-md hover:bg-muted text-primary transition-colors"
                              title="View Document"
                              aria-label="View document"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            <a
                              href={doc.url}
                              download={doc.name}
                              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              title="Download Document"
                              aria-label="Download document"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-xl">
                    <FileText className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-xs font-medium text-foreground">No documents attached yet</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      National ID, appointment letters, resumes or trade certificates can be uploaded by clicking &quot;Edit Profile&quot;.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ---------------------------------------------------------------- */}
            {/* TAB 7: Printable Factory Staff ID Badge (55mm x 85mm) */}
            {/* ---------------------------------------------------------------- */}
            <TabsContent value="id_card" className="m-0 space-y-4 text-xs">
              <div className="p-4 rounded-xl border border-border bg-card space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border gap-3">
                  <div>
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <BadgeCheck className="w-4 h-4 text-primary" />
                      <span>{tBilingual('Printable Factory Staff ID Badge', 'কারখানা কর্মী পরিচয়পত্র')}</span>
                    </div>
                    <span className="text-xs text-muted-foreground block mt-0.5">
                      Standard CR80 PVC Size: 55mm × 85mm • Dynamic Company Name & Photo
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="inline-flex rounded-lg border border-border bg-muted p-0.5">
                      <button
                        type="button"
                        onClick={() => setBadgeSide('both')}
                        className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                          badgeSide === 'both' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Both Sides
                      </button>
                      <button
                        type="button"
                        onClick={() => setBadgeSide('front')}
                        className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                          badgeSide === 'front' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Front
                      </button>
                      <button
                        type="button"
                        onClick={() => setBadgeSide('back')}
                        className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                          badgeSide === 'back' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Back
                      </button>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => triggerPrint('id_badge')}
                      className="h-8 text-xs border-border bg-card hover:bg-muted"
                    >
                      <Printer className="w-3.5 h-3.5 mr-1" />
                      <span>Print ID Badge</span>
                    </Button>
                  </div>
                </div>

                {/* ID Badge Preview Canvas: 55mm x 85mm */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-6 bg-muted/30 rounded-xl border border-border overflow-x-auto p-4">
                  {/* Front Side: 55mm x 85mm */}
                  {(badgeSide === 'both' || badgeSide === 'front') && (
                    <div
                      style={{ width: '55mm', height: '85mm', boxSizing: 'border-box' }}
                      className="rounded-xl border-2 border-border bg-card p-3 shadow-xs text-center flex flex-col justify-between relative overflow-hidden shrink-0 select-none"
                    >
                      {/* Top Header */}
                      <div className="border-b border-border pb-1">
                        <span className="font-black text-xs uppercase tracking-wider text-primary block truncate">
                          {companyName}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono block truncate">
                          {employee.branch_name || 'Main Press Facility'}
                        </span>
                      </div>

                      {/* Photo Box */}
                      <div className="w-20 h-22 mx-auto rounded-xl border-2 border-border bg-muted overflow-hidden flex items-center justify-center shrink-0">
                        {photoUrl && !imgError ? (
                          <img
                            src={photoUrl}
                            alt={employee.name}
                            className="w-full h-full object-cover"
                            onError={() => setImgError(true)}
                          />
                        ) : (
                          <span className="font-bold text-xl text-foreground">
                            {employee.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Identity Details */}
                      <div className="space-y-0.5">
                        <h3 className="font-bold text-xs text-foreground leading-tight truncate">
                          {employee.name}
                        </h3>
                        {employee.name_bn && (
                          <p className="text-xs text-muted-foreground truncate">{employee.name_bn}</p>
                        )}
                        <p className="text-xs text-primary font-semibold capitalize truncate">
                          {employee.role || employee.designation || 'Staff'}
                        </p>
                        <Badge variant="outline" className="text-xs uppercase font-mono px-1.5 py-0">
                          {employee.department}
                        </Badge>
                      </div>

                      {/* Bottom ID Bar */}
                      <div className="border-t border-border pt-1 flex items-center justify-between text-xs font-mono text-muted-foreground">
                        <span className="font-bold text-foreground">ID: {employee.employee_id_number}</span>
                        <span className="font-bold text-destructive">BLOOD: {bloodGroup || 'O+'}</span>
                      </div>
                    </div>
                  )}

                  {/* Back Side: 55mm x 85mm */}
                  {(badgeSide === 'both' || badgeSide === 'back') && (
                    <div
                      style={{ width: '55mm', height: '85mm', boxSizing: 'border-box' }}
                      className="rounded-xl border-2 border-border bg-card p-3 shadow-xs text-left flex flex-col justify-between relative overflow-hidden shrink-0 select-none"
                    >
                      {/* Top Header */}
                      <div className="border-b border-border pb-1 text-center">
                        <span className="font-bold text-xs uppercase tracking-wider text-foreground block">
                          Official Staff ID Card
                        </span>
                        <span className="text-xs text-muted-foreground block truncate">
                          {companyName}
                        </span>
                      </div>

                      {/* Emergency & Details */}
                      <div className="space-y-1 text-xs text-muted-foreground leading-tight">
                        <div>
                          <span className="font-semibold text-foreground">Mobile:</span> {employee.mobile}
                        </div>
                        <div>
                          <span className="font-semibold text-foreground">Emergency:</span>{' '}
                          {employee.emergency_contact_phone || employee.mobile}
                        </div>
                        <div>
                          <span className="font-semibold text-foreground">NID No:</span> {nidNumber || 'Verified'}
                        </div>
                        <div>
                          <span className="font-semibold text-foreground">Joined:</span>{' '}
                          {employee.joining_date || 'N/A'}
                        </div>
                        <div className="pt-1 text-xs leading-tight text-muted-foreground/90 border-t border-border">
                          This identity badge is the property of {companyName}. Return upon cessation of employment. If found, return to {companyAddress}.
                        </div>
                      </div>

                      {/* Barcode & Signature */}
                      <div className="border-t border-border pt-1 text-center">
                        <div className="font-mono text-xs tracking-widest text-muted-foreground">
                          ||| | |||| | ||||| | |||
                        </div>
                        <span className="text-xs text-muted-foreground block mt-0.5">
                          Authorized Signatory
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>

      {/* ==================================================================== */}
      {/* 3. ISOLATED PRINT DOCUMENT: 360° PROFILE DOSSIER */}
      {/* ==================================================================== */}
      {printMode === 'dossier' && (
        <div
          data-print-isolate="true"
          className="bg-card text-foreground print:bg-white print:text-black p-8 max-w-4xl mx-auto space-y-6 text-xs"
        >
          {/* Letterhead */}
          <div className="border-b-2 border-border pb-4 flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight uppercase">{companyName}</h1>
              <p className="text-xs text-muted-foreground print:text-black/70">
                {companyAddress} • Phone: {companyPhone}
              </p>
              <span className="inline-block mt-2 px-2 py-0.5 rounded bg-muted text-foreground font-mono text-xs font-semibold uppercase tracking-wider border border-border">
                Confidential • Employee 360° Profile & Service Dossier
              </span>
            </div>
            <div className="text-right text-xs font-mono text-muted-foreground print:text-black/70">
              <div>DOC ID: PF-DOS-{employee.employee_id_number}</div>
              <div>DATE: {new Date().toLocaleDateString('en-GB')}</div>
            </div>
          </div>

          {/* Section 1: Bio & Identity */}
          <div className="border border-border rounded-lg p-4 flex gap-4 items-start">
            <div className="w-24 h-28 border border-border rounded-md overflow-hidden bg-muted flex items-center justify-center shrink-0">
              {photoUrl && !imgError ? (
                <img src={photoUrl} alt={employee.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold">{employee.name.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-y-2 gap-x-4 flex-1">
              <div>
                <span className="text-muted-foreground block text-xs uppercase">Full Name</span>
                <span className="font-bold text-sm">{employee.name}</span>
                {employee.name_bn && <div className="text-xs text-muted-foreground">{employee.name_bn}</div>}
              </div>
              <div>
                <span className="text-muted-foreground block text-xs uppercase">Employee ID</span>
                <span className="font-mono font-bold">{employee.employee_id_number}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs uppercase">Employment Status</span>
                <span className="font-semibold capitalize">{employee.status}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs uppercase">Role / Designation</span>
                <span className="font-semibold">{employee.role || 'Staff'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs uppercase">Department & Branch</span>
                <span className="font-semibold capitalize">{employee.department} • {employee.branch_name || 'Main Press'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs uppercase">Joining Date / Tenure</span>
                <span className="font-semibold">{employee.joining_date || 'N/A'} ({calculateTenure(employee.joining_date)})</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs uppercase">National ID / NID</span>
                <span className="font-mono font-semibold">{nidNumber || 'Not recorded'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs uppercase">Blood Group</span>
                <span className="font-bold">{bloodGroup || 'Not recorded'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs uppercase">Date of Birth</span>
                <span className="font-semibold">{dob || 'Not recorded'}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Contact & Emergency */}
          <div className="border border-border rounded-lg p-4 space-y-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-foreground border-b border-border pb-1">
              Contact & Emergency Guardian Details
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <span className="text-muted-foreground block text-xs uppercase">Primary Mobile</span>
                <span className="font-mono font-semibold">{employee.mobile}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs uppercase">Emergency Guardian</span>
                <span className="font-semibold">{employee.emergency_contact_name || 'Family Guardian'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs uppercase">Emergency Phone</span>
                <span className="font-mono font-semibold">{employee.emergency_contact_phone || employee.mobile}</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground block text-xs uppercase">Present Address</span>
                <span>{employee.address || 'Factory staff quarter / Local'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs uppercase">Permanent Address</span>
                <span>{permAddress || 'On file'}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Compensation & Duty Rules */}
          <div className="border border-border rounded-lg p-4 space-y-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-foreground border-b border-border pb-1">
              Compensation Structure & Duty Shift Timings
            </h3>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <span className="text-muted-foreground block text-xs uppercase">Base Salary</span>
                <span className="font-bold">৳ {(employee.base_salary || 0).toLocaleString('en-IN')} / {(employee.salary_basis || 'monthly')}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs uppercase">Overtime Rate</span>
                <span className="font-semibold">৳ {(employee.overtime_hourly_rate || 0).toLocaleString('en-IN')} / hr</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs uppercase">Shift Schedule</span>
                <span className="font-mono">{employee.duty_settings?.office_start_time || '09:00'} - {employee.duty_settings?.office_end_time || '18:00'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs uppercase">Weekly Off</span>
                <span className="font-semibold">{employee.duty_settings?.weekly_off_day || 'Friday'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs uppercase">Payment Method</span>
                <span className="font-semibold capitalize">{employee.payment_method || 'Cash'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs uppercase">Advance Balance</span>
                <span className="font-bold">৳ {(employee.current_advance_balance || 0).toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs uppercase">Late Grace Window</span>
                <span>{employee.duty_settings?.late_grace_minutes ?? 15} mins</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs uppercase">Monthly Leave Quota</span>
                <span>{employee.allowed_monthly_leaves ?? 2} days / month</span>
              </div>
            </div>
          </div>

          {/* Section 4: Role Capabilities & Access Restrictions */}
          <div className="border border-border rounded-lg p-4 space-y-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-foreground border-b border-border pb-1">
              Authorized Operational Scope & Security Restrictions
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-semibold text-success block text-xs mb-1">Permitted Operational Capabilities:</span>
                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                  {roleMeta.scopes.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
              <div>
                <span className="font-semibold text-destructive block text-xs mb-1">System Limitations & Access Controls:</span>
                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                  {roleMeta.limitations.map((l, i) => <li key={i}>{l}</li>)}
                </ul>
              </div>
            </div>
          </div>

          {/* Section 5: Official Signatures */}
          <div className="pt-8 border-t border-border grid grid-cols-3 gap-6 text-center text-xs">
            <div>
              <div className="border-t border-border pt-1">
                <span className="font-semibold block">{employee.name}</span>
                <span className="text-muted-foreground">Employee Signature & Date</span>
              </div>
            </div>
            <div>
              <div className="border-t border-border pt-1">
                <span className="font-semibold block">HR & Compliance In-Charge</span>
                <span className="text-muted-foreground">Verified & Recorded</span>
              </div>
            </div>
            <div>
              <div className="border-t border-border pt-1">
                <span className="font-semibold block">Authorized Managing Authority</span>
                <span className="text-muted-foreground">{companyName}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 4. ISOLATED PRINT DOCUMENT: 55mm x 85mm FACTORY STAFF ID BADGE */}
      {/* ==================================================================== */}
      {printMode === 'id_badge' && (
        <div
          data-print-isolate="true"
          className="bg-card text-foreground print:bg-white print:text-black p-4 flex flex-row flex-wrap items-center justify-center gap-8"
        >
          {/* FRONT SIDE (Exact 55mm x 85mm) */}
          <div
            style={{ width: '55mm', height: '85mm', boxSizing: 'border-box' }}
            className="border border-border rounded-xl p-3 flex flex-col justify-between text-center bg-card text-foreground print:bg-white print:text-black shadow-none break-inside-avoid relative overflow-hidden text-xs"
          >
            <div className="border-b border-border pb-1">
              <span className="font-black text-xs uppercase tracking-wider block text-primary truncate">
                {companyName}
              </span>
              <span className="text-xs text-muted-foreground font-mono block">
                {employee.branch_name || 'Main Press Facility'}
              </span>
            </div>

            <div className="w-20 h-22 mx-auto rounded-lg border border-border overflow-hidden bg-muted flex items-center justify-center shrink-0">
              {photoUrl && !imgError ? (
                <img src={photoUrl} alt={employee.name} className="w-full h-full object-cover" />
              ) : (
                <span className="font-bold text-lg">{employee.name.slice(0, 2).toUpperCase()}</span>
              )}
            </div>

            <div className="space-y-0.5">
              <h3 className="font-bold text-xs truncate leading-tight">{employee.name}</h3>
              {employee.name_bn && <p className="text-xs text-muted-foreground truncate">{employee.name_bn}</p>}
              <span className="text-xs font-semibold text-primary capitalize block truncate">
                {employee.role || 'Factory Staff'}
              </span>
              <span className="inline-block px-1.5 py-0 rounded text-xs uppercase font-mono bg-muted border border-border">
                {employee.department}
              </span>
            </div>

            <div className="border-t border-border pt-1 flex items-center justify-between text-xs font-mono">
              <span className="font-bold">ID: {employee.employee_id_number}</span>
              <span className="font-bold text-destructive">BLOOD: {bloodGroup || 'O+'}</span>
            </div>
          </div>

          {/* BACK SIDE (Exact 55mm x 85mm) */}
          <div
            style={{ width: '55mm', height: '85mm', boxSizing: 'border-box' }}
            className="border border-border rounded-xl p-3 flex flex-col justify-between text-left bg-muted/30 text-foreground print:bg-white print:text-black shadow-none break-inside-avoid relative overflow-hidden text-xs"
          >
            <div className="border-b border-border pb-1 text-center">
              <span className="font-bold text-xs uppercase tracking-wider block">
                Official Staff Identity Card
              </span>
              <span className="text-xs text-muted-foreground block truncate">
                {companyName}
              </span>
            </div>

            <div className="space-y-1 text-xs text-muted-foreground leading-tight">
              <div>
                <span className="font-semibold text-foreground">Mobile:</span> {employee.mobile}
              </div>
              <div>
                <span className="font-semibold text-foreground">Emergency:</span>{' '}
                {employee.emergency_contact_phone || employee.mobile}
              </div>
              <div>
                <span className="font-semibold text-foreground">NID No:</span> {nidNumber || 'Recorded'}
              </div>
              <div>
                <span className="font-semibold text-foreground">Joined:</span>{' '}
                {employee.joining_date || 'N/A'}
              </div>
              <div className="pt-1 text-xs leading-tight text-muted-foreground border-t border-border">
                This card is the property of {companyName}. Return upon cessation of employment or if found, hand over to {companyAddress}.
              </div>
            </div>

            <div className="border-t border-border pt-1 text-center">
              <div className="font-mono text-xs tracking-widest text-muted-foreground">
                * {employee.employee_id_number} *
              </div>
              <span className="text-xs text-muted-foreground block mt-0.5">Authorized Signatory</span>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  )
}
