'use client'

import React, { useState, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
 Building2,
 Store,
 MapPin,
 Phone,
 Plus,
 CreditCard,
 Receipt,
 Users,
 CheckCircle2,
 AlertCircle,
 Clock,
 TrendingUp,
 DollarSign,
 Layers,
 FileText,
 Printer,
 Share2,
 Search,
 RefreshCw,
 ShieldCheck,
 Lock,
 Eye,
 ExternalLink,
 Coins,
 PackageCheck,
 Sparkles,
 Info,
 Calendar,
 AlertTriangle,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { useTenant } from '@/hooks/use-tenant'
import { useAuth } from '@/hooks/use-auth'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { KpiCard, KpiGrid } from '@/components/shared/kpi-card'
import { SalesOrderRecord } from '@/types/order.types'
import { InvoiceRecord, PaymentRecord } from '@/types/billing.types'
import { ProductionTaskRecord } from '@/types/production.types'

interface BranchManagerDashboardProps {
 branch?: {
 id: string
 name: string
 name_bn?: string | null
 code?: string
 address?: string | null
 phone?: string | null
 is_main_branch?: boolean
  } | null
 orders: SalesOrderRecord[]
 invoices: InvoiceRecord[]
 payments: PaymentRecord[]
 tasks: ProductionTaskRecord[]
 onOpenNewWork: () => void
 onOpenPaymentModal: () => void
 onRefresh: () => void
}

export function BranchManagerDashboard({
 branch,
 orders,
 invoices,
 payments,
 tasks,
 onOpenNewWork,
 onOpenPaymentModal,
 onRefresh,
}: BranchManagerDashboardProps) {
 const { tBilingual } = useI18n()
 const router = useRouter()
 const pathname = usePathname()
 const { company } = useTenant()
 const { user } = useAuth()

 const tenantSlug = company?.slug || 'workspace'
 const currentBranchId = branch?.id || null
 const branchName = branch?.name || company?.name || 'Main Branch & Outlet'
 const branchNameBn = branch?.name_bn || 'মূল ব্রাঞ্চ ও আউটলেট'
 const userDisplayName = user?.profile?.full_name || user?.email || 'Branch Manager'

 const [searchQuery, setSearchQuery] = useState('')
 const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'pending' | 'in_production' | 'ready' | 'delivered'>('all')
 const [showRestrictionsDetail, setShowRestrictionsDetail] = useState(false)
 const [isRefreshing, setIsRefreshing] = useState(false)

 const handleRefresh = async () => {
 setIsRefreshing(true)
 onRefresh()
 setTimeout(() => setIsRefreshing(false), 800)
  }

  // 1. Strict Branch Data Scoping:
  // Branch Managers ONLY see orders, invoices, and payments belonging to their assigned branch.
 const branchOrders = useMemo(() => {
 if (!currentBranchId) return orders || []
 return (orders || []).filter((o) => !o.branch_id || o.branch_id === currentBranchId)
  }, [orders, currentBranchId])

 const branchInvoices = useMemo(() => {
 if (!currentBranchId) return invoices || []
 return (invoices || []).filter((i) => !i.branch_id || i.branch_id === currentBranchId)
  }, [invoices, currentBranchId])

 const branchPayments = useMemo(() => {
 if (!currentBranchId) return payments || []
 return (payments || []).filter((p) => !p.branch_id || p.branch_id === currentBranchId)
  }, [payments, currentBranchId])

  // 2. Branch-Scoped Financial Metrics
 const metrics = useMemo(() => {
 const todayStr = new Date().toISOString().slice(0, 10)

    // Today's Sales created at this branch
 const todaySalesTotal = branchInvoices
      .filter((inv) => inv.created_at && inv.created_at.slice(0, 10) === todayStr)
      .reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0)

    // Today's Payments collected at this branch
 const todayCollectionsTotal = branchPayments
      .filter((p) => (p.created_at && p.created_at.slice(0, 10) === todayStr) || (p.payment_date && p.payment_date.slice(0, 10) === todayStr))
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

    // Active Orders in Pipeline for this branch
 const activeOrdersCount = branchOrders.filter((o) =>
 o.status === 'confirmed' || o.status === 'in_production' || o.status === 'finishing' || (o.status as any) === 'processing'
    ).length

    // Ready for Delivery / Counter Pickup at this branch
 const readyForPickupCount = branchOrders.filter((o) =>
 o.status === 'ready_for_delivery' || o.status === 'partially_delivered' || (o as any).status === 'ready_for_pickup'
    ).length

    // Unpaid Branch Dues
 const totalBranchDue = branchInvoices
      .filter((inv) => inv.status === 'unpaid' || inv.status === 'partially_paid')
      .reduce((sum, inv) => sum + (Number(inv.due_amount || (Number(inv.grand_total) - Number(inv.paid_amount || 0))) || 0), 0)

 return {
 todaySalesTotal,
 todayCollectionsTotal,
 activeOrdersCount,
 readyForPickupCount,
 totalBranchDue,
    }
  }, [branchInvoices, branchPayments, branchOrders])

  // 3. Filtered Orders Table
 const filteredOrders = useMemo(() => {
 return branchOrders.filter((order) => {
 if (activeFilterTab === 'pending') {
 if (order.status !== 'draft' && order.status !== 'confirmed') return false
      } else if (activeFilterTab === 'in_production') {
 if (order.status !== 'in_production' && order.status !== 'finishing') return false
      } else if (activeFilterTab === 'ready') {
 if (order.status !== 'ready_for_delivery' && (order as any).status !== 'ready_for_pickup') return false
      } else if (activeFilterTab === 'delivered') {
 if (order.status !== 'delivered' && order.status !== 'completed') return false
      }

 if (searchQuery.trim()) {
 const q = searchQuery.toLowerCase()
 const matchesNum = (order.order_number || order.id || '')?.toLowerCase().includes(q)
 const matchesCust = (order.customer_name || '')?.toLowerCase().includes(q)
 const itemSummary = order.items?.map((i) => i.item_name).join(', ') || ''
 const matchesDesc = (itemSummary || (order as any).description || '')?.toLowerCase().includes(q)
 if (!matchesNum && !matchesCust && !matchesDesc) return false
      }

 return true
    })
  }, [branchOrders, activeFilterTab, searchQuery])

 const formatBDT = (amount: number) => `৳${Number(amount || 0).toLocaleString('en-IN')}`

 return (
    <div className="space-y-6">
      {/* Hero Banner: Branch Identity & Quick Actions */}
      <div className="rounded-xl bg-card border border-border shadow-xs p-5 sm:p-6">
        <div className="absolute -right-8 -top-8 w-64 h-64 bg-success/10 rounded-full blur-3xl pointer-events-none"/>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-success/20 text-success border-success-border/30 text-xs font-semibold backdrop-blur-sm flex items-center gap-1.5 px-2.5 py-0.5">
                <Store className="h-3.5 w-3.5 text-success"/>
                <span>{tBilingual('Branch Home', 'ব্রাঞ্চ কমান্ড সেন্টার')}</span>
              </Badge>
              <Badge className="bg-card/10 text-white border-border text-xs tabular-nums font-medium">
                {branch?.code || 'BR-01'}
              </Badge>
              <Badge className="bg-success/20 text-muted-foreground border-success-border/30 text-xs font-bold flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-success animate-pulse"/>
                {tBilingual('Branch Operational', 'ব্রাঞ্চ সক্রিয়')}
              </Badge>
            </div>

            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Building2 className="h-7 w-7 text-success shrink-0"/>
              <span>{tBilingual(`${branchName} — Overview`, `${branchNameBn} — ড্যাশবোর্ড`)}</span>
            </h1>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed flex flex-wrap items-center gap-x-3 gap-y-1">
              <span><strong>Manager:</strong> {userDisplayName}</span>
              {branch?.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-success"/>
                  {branch.address}
                </span>
              )}
              {branch?.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-success"/>
                  {branch.phone}
                </span>
              )}
            </p>
          </div>

          {/* Quick Counter Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
 onClick={onOpenNewWork}
 className="bg-card text-success hover:bg-success-surface font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center gap-2 h-10 px-4">
              <Plus className="h-4 w-4 text-success"/>
              <span>{tBilingual('New Counter Order', 'নতুন কাউন্টার অর্ডার')}</span>
            </Button>

            <Button
 onClick={onOpenPaymentModal}
 variant="outline"className="bg-success/60 hover:bg-success/80 text-white border-success-border/30 font-bold text-xs sm:text-sm transition-all flex items-center gap-2 h-10 px-4">
              <CreditCard className="h-4 w-4 text-success"/>
              <span>{tBilingual('Collect Payment', 'টাকা জমা নিন')}</span>
            </Button>

            <Button
 onClick={() => router.push(getTenantNavHref('/attendance', pathname, tenantSlug))}
 variant="outline"className="bg-success/60 hover:bg-success/80 text-white border-success-border/30 font-bold text-xs sm:text-sm transition-all flex items-center gap-2 h-10 px-4">
              <Users className="h-4 w-4 text-success"/>
              <span>{tBilingual('Staff Attendance', 'স্টাফ হাজিরা')}</span>
            </Button>

            <Button
 onClick={handleRefresh}
 variant="ghost"disabled={isRefreshing}
 className="h-10 w-10 p-0 text-muted-foreground hover:text-foreground hover:bg-card/10 rounded-xl"title="Refresh Queue">
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards: Strictly Branch-Scoped Metrics */}
      <KpiGrid columns={4}>
        <KpiCard
 titleEn="Today's Branch Sales"titleBn="আজকের ব্রাঞ্চ সেলস"value={metrics.todaySalesTotal}
 isCurrency={true}
 icon={TrendingUp}
 colorVariant="success"/>
        <KpiCard
 titleEn="Today's Cash Collection"titleBn="আজকের নগদ কালেকশন"value={metrics.todayCollectionsTotal}
 isCurrency={true}
 icon={DollarSign}
 colorVariant="cyan"/>
        <KpiCard
 titleEn="Branch Orders in Pipeline"titleBn="চলমান ব্রাঞ্চ অর্ডার"value={metrics.activeOrdersCount}
 icon={Layers}
 colorVariant="purple"/>
        <KpiCard
 titleEn="Ready for Counter Pickup"titleBn="কাউন্টারে ডেলিভারি প্রস্তুত"value={metrics.readyForPickupCount}
 icon={PackageCheck}
 colorVariant="warning"/>
      </KpiGrid>

      {/* Roles, Permissions, Restrictions & Limitations Callout Card */}
      <Card className="border border-border bg-card shadow-xs">
        <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-success/10 text-success text-success flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5"/>
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>{tBilingual('Branch Scope & Security Governance', 'ব্রাঞ্চ এক্সেস সীমা ও নিরাপত্তা পলিসি')}</span>
                <Badge variant="outline"className="text-xs uppercase font-bold text-success text-success border-success-border">
                  {branch?.name || 'Branch-Scoped'}
                </Badge>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {tBilingual(
                  'Full operational control over branch counter sales, POS invoices, receipts, and staff roster. Strictly isolated from other branches and global tenant governance.',
                  'ব্রাঞ্চের সকল সেলস, পেমেন্ট, চালান ও হাজিরা পরিচালনার সম্পূর্ণ ক্ষমতা। অন্য ব্রাঞ্চের তথ্য ও মূল কোম্পানির পলিসি পরিবর্তন সম্পূর্ণ সংরক্ষিত।'
                )}
              </p>
            </div>
          </div>

          <Button
 size="sm"variant="outline"onClick={() => setShowRestrictionsDetail(!showRestrictionsDetail)}
 className="text-xs font-bold text-success text-success border-success-border border-success-border hover:bg-success-surface/50 shrink-0">
            {showRestrictionsDetail ? tBilingual('Hide Details', 'বিবরণ লুকান') : tBilingual('View Permissions & Limits', 'অনুমোদন ও সীমাবদ্ধতা দেখুন')}
          </Button>
        </div>

        {/* Collapsible Perimeter Details */}
        {showRestrictionsDetail && (
          <div className="border-t border-success-border border-success-border/40 p-4 sm:p-5 bg-card/70 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs animate-in fade-in-50 duration-200">
            {/* Granted Authorities */}
            <div className="p-3.5 rounded-xl border border-success-border border-success-border/60 bg-success-surface/40 bg-success-surface space-y-2">
              <div className="flex items-center gap-2 font-bold text-success">
                <CheckCircle2 className="h-4 w-4 text-success"/>
                <span>{tBilingual('Branch Manager Permissions & Authorities', 'অনুমোদিত দায়িত্ব ও ক্ষমতা')}</span>
              </div>
              <ul className="space-y-1.5 text-foreground">
                <li className="flex items-start gap-1.5">
                  <span className="text-success font-bold">✓</span>
                  <span><strong>Counter Sales & Quotes:</strong> Create and approve walk-in client quotations and work orders for {branchName}.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-success font-bold">✓</span>
                  <span><strong>Invoicing & Collections:</strong> Issue VAT/POS invoices, print receipts, and accept cash/MFS counter payments.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-success font-bold">✓</span>
                  <span><strong>Petty Cash & Expenses:</strong> Record and track daily branch operational expenses and conveyance receipts.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-success font-bold">✓</span>
                  <span><strong>Branch Staff Roster:</strong> Log and verify attendance, daily shifts, and overtime for branch personnel.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-success font-bold">✓</span>
                  <span><strong>Inventory & Transfers:</strong> Record local floor stock consumption and request stock transfers from Central Store.</span>
                </li>
              </ul>
            </div>

            {/* Strict Restrictions & Limitations */}
            <div className="p-3.5 rounded-xl border border-danger-border border-danger-border/60 bg-danger-surface/40 bg-danger-surface space-y-2">
              <div className="flex items-center gap-2 font-bold text-destructive text-destructive">
                <Lock className="h-4 w-4 text-destructive"/>
                <span>{tBilingual('Security Safeguards & Governance Limitations', 'নিরাপত্তা নিয়ন্ত্রণ ও সিস্টেম সীমাবদ্ধতা')}</span>
              </div>
              <ul className="space-y-1.5 text-foreground">
                <li className="flex items-start gap-1.5">
                  <span className="text-destructive font-bold">🚫</span>
                  <span><strong>Cross-Branch Isolation:</strong> Cannot access or query customers, sales orders, invoices, or staff from other branches.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-destructive font-bold">🚫</span>
                  <span><strong>Invoice Voiding Locked:</strong> Cannot void, cancel, or delete finalized invoices without Business Owner approval.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-destructive font-bold">🚫</span>
                  <span><strong>Payment Deletion Prohibited:</strong> Payment records cannot be deleted once entered into the branch cash register.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-destructive font-bold">🚫</span>
                  <span><strong>Pricing Formulas Read-Only:</strong> Cannot modify master unit cost charts, paper grammage formulas, or global discounts.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-destructive font-bold">🚫</span>
                  <span><strong>Company Settings Locked:</strong> Cannot change company bank accounts, SaaS subscriptions, or system users.</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </Card>

      {/* Main Section: Branch Order Queue */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
 onClick={() => setActiveFilterTab('all')}
 className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
 activeFilterTab === 'all'
                  ? 'bg-success text-white shadow-sm'
                  : 'bg-muted hover:bg-muted text-foreground '
              }`}
            >
              {tBilingual('All Branch Orders', 'সকল অর্ডার')} ({branchOrders.length})
            </button>

            <button
 onClick={() => setActiveFilterTab('pending')}
 className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
 activeFilterTab === 'pending'
                  ? 'bg-warning text-white shadow-sm'
                  : 'bg-muted hover:bg-muted text-foreground '
              }`}
            >
              {tBilingual('Pending Confirmation', 'অনুমোদন বাকি')}
            </button>

            <button
 onClick={() => setActiveFilterTab('in_production')}
 className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
 activeFilterTab === 'in_production'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-muted hover:bg-muted text-foreground '
              }`}
            >
              {tBilingual('In Production', 'প্রিন্টিং চলছে')}
            </button>

            <button
 onClick={() => setActiveFilterTab('ready')}
 className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
 activeFilterTab === 'ready'
                  ? 'bg-success text-white shadow-sm'
                  : 'bg-muted hover:bg-muted text-foreground '
              }`}
            >
              {tBilingual('Ready for Pickup', 'কাউন্টারে প্রস্তুত')} ({metrics.readyForPickupCount})
            </button>

            <button
 onClick={() => setActiveFilterTab('delivered')}
 className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
 activeFilterTab === 'delivered'
                  ? 'bg-card-elevated text-foreground shadow-sm'
                  : 'bg-muted hover:bg-muted text-foreground '
              }`}
            >
              {tBilingual('Completed & Delivered', 'সম্পন্ন ও ডেলিভার্ড')}
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"/>
            <Input
 type="text"placeholder={tBilingual('Search orders, customers...', 'অর্ডার খুঁজুন...')}
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="pl-8 h-9 text-xs bg-card border-border"/>
          </div>
        </div>

        {/* Orders Table */}
        {filteredOrders.length === 0 ? (
          <Card className="border border-dashed border-input p-10 text-center bg-muted">
            <div className="flex flex-col items-center justify-center space-y-3 max-w-sm mx-auto">
              <div className="h-12 w-12 rounded-xl bg-success-surface text-success bg-success/40 text-success flex items-center justify-center">
                <FileText className="h-6 w-6"/>
              </div>
              <h3 className="text-sm font-bold text-foreground">
                {tBilingual('No orders found for this branch', 'এই ব্রাঞ্চে কোনো অর্ডার পাওয়া যায়নি')}
              </h3>
              <p className="text-xs text-muted-foreground">
                {tBilingual(
                  'Orders created for this branch will appear here. Click below to register a new counter work order.',
                  'ব্রাঞ্চে নতুন কোনো কাজের অর্ডার এন্ট্রি করতে নিচের বাটনে চাপ দিন।'
                )}
              </p>
              <Button
 onClick={onOpenNewWork}
 className="bg-success hover:bg-success text-white font-bold text-xs mt-2">
                <Plus className="h-3.5 w-3.5 mr-1.5"/>
                {tBilingual('Create First Branch Order', 'নতুন অর্ডার তৈরি করুন')}
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="border border-border overflow-hidden shadow-xs bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted text-muted-foreground border-b border-border uppercase text-xs font-bold">
                  <tr>
                    <th className="px-4 py-3">Order #</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Items & Specs</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Due</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-medium">
                  {filteredOrders.map((ord) => {
 const dueAmt = ord.due_amount !== undefined ? Number(ord.due_amount) : Math.max(0, Number(ord.final_price || 0) - Number(ord.advance_amount || 0))
 const isDue = dueAmt > 0
 const itemSummary = ord.items?.map((i) => i.item_name).join(', ') || 'Print Job'

 return (
                      <tr key={ord.id} className="hover:bg-muted dark:hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3 tabular-nums font-bold text-success text-success whitespace-nowrap">
                          #{ord.order_number || ord.id.slice(0, 8)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-foreground">{ord.customer_name || 'Walk-in Client'}</div>
                          <div className="text-xs text-muted-foreground tabular-nums">{ord.customer_phone || '—'}</div>
                        </td>
                        <td className="px-4 py-3 max-w-xs truncate text-foreground">
                          {itemSummary}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-bold text-foreground whitespace-nowrap">
                          {formatBDT(ord.final_price || 0)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                          {isDue ? (
                            <span className="font-bold text-destructive text-destructive">{formatBDT(dueAmt)}</span>
                          ) : (
                            <span className="text-success text-success font-bold">Paid</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <Badge
 className={`text-xs uppercase font-bold ${
 ord.status === 'ready_for_delivery' || (ord as any).status === 'ready_for_pickup'
                                ? 'bg-success-surface text-success bg-success-surface text-success border-success-border'
                                : ord.status === 'in_production' || ord.status === 'finishing'
                                ? 'bg-primary/10 text-primary bg-primary/10 text-primary border-primary/20'
                                : ord.status === 'delivered' || ord.status === 'completed'
                                ? 'bg-muted text-foreground '
                                : 'bg-warning-surface text-warning bg-warning-surface text-warning border-warning-border'
                            }`}
                          >
                            {ord.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
 size="sm"variant="ghost"onClick={() => router.push(getTenantNavHref(`/orders/${ord.id}`, pathname, tenantSlug))}
 className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground dark:hover:text-foreground"title="View Order">
                              <Eye className="h-3.5 w-3.5"/>
                            </Button>

                            <Button
 size="sm"variant="ghost"onClick={() => {
 const phone = (ord.customer_phone || '').replace(/\D/g, '')
 const clean = phone.startsWith('88') ? phone : phone.startsWith('0') ? `88${phone}` : `880${phone}`
 const msg = `সম্মানিত গ্রাহক, আপনার অর্ডার #${ord.order_number || ord.id.slice(0, 8)} (${branchName}) এ প্রক্রিয়াধীন রয়েছে। বর্তমান স্ট্যাটাস: ${ord.status}। ধন্যবাদ!`
 window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`, '_blank')
                              }}
 className="h-8 w-8 p-0 text-success hover:bg-success-surface dark:hover:bg-success-surface"title="WhatsApp Client">
                              <Share2 className="h-3.5 w-3.5"/>
                            </Button>
                          </div>
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
    </div>
  )
}
