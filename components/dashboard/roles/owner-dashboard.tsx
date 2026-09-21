'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  TrendingUp,
  DollarSign,
  AlertTriangle,
  AlertCircle,
  Package,
  Truck,
  Printer,
  Users,
  ShieldCheck,
  Plus,
  ArrowUpRight,
  ArrowRight,
  Receipt,
  Building,
  Clock,
  Calendar,
  CheckCircle2,
  Layers,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  FileText,
  Play,
  Pause,
  AlertOctagon,
  MoreHorizontal,
  RefreshCw,
  Sparkles,
  Phone,
  BarChart3,
  Check,
  X,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { useTenant } from '@/hooks/use-tenant'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { KpiCard, KpiGrid } from '@/components/shared/kpi-card'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { LiveDhakaClock } from '@/components/shared/live-dhaka-clock'
import { QuickActionsBar } from '@/components/dashboard/quick-actions-bar'
import { formatBDT, toBengaliNumerals } from '@/lib/formatters'
import { getBangladeshGreeting, formatBangladeshDate, getBangladeshTodayDateString } from '@/lib/utils/business-date'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import type { OwnerDashboardSnapshot } from '@/services/dashboard.service'
import type { EvaluatedJobRisk, NeedsAttentionItem } from '@/lib/dashboard/job-risk-engine'
import type { OverdueReceivableSummary } from '@/lib/finance/canonical-finance'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'

interface OwnerDashboardProps {
  data: OwnerDashboardSnapshot
  onOpenNewWork: () => void
  onOpenPaymentModal: (invoiceId?: string) => void
  onRefresh: () => void
  isUpdating?: boolean
}

export function OwnerDashboard({
  data,
  onOpenNewWork,
  onOpenPaymentModal,
  onRefresh,
  isUpdating = false,
}: OwnerDashboardProps) {
  const { tBilingual, locale } = useI18n()
  const { company, currentBranch, currentUser } = useTenant()
  const router = useRouter()
  const pathname = usePathname()
  const num = (v: number | string) => (typeof v === 'number' ? v.toLocaleString() : v)

  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const greeting = getBangladeshGreeting(locale as 'en' | 'bn')
  const userFirstName = currentUser?.profile?.full_name?.split(' ')[0] || (locale === 'bn' ? 'মালিক' : 'Owner')

  // Production Filter State
  const [prodFilter, setProdFilter] = useState<'all' | 'running' | 'queued' | 'at_risk' | 'finishing'>('all')

  // Reminder Modal State
  const [reminderItem, setReminderItem] = useState<OverdueReceivableSummary | null>(null)
  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false)

  // Fail-Safe Data Normalization
  const safeData = useMemo(() => {
    const raw = data || ({} as Partial<OwnerDashboardSnapshot>)
    return {
      timestamp: raw.timestamp || new Date().toISOString(),
      companyId: raw.companyId || company?.id || '',
      branchId: raw.branchId || null,
      businessDate: raw.businessDate || getBangladeshTodayDateString(),
      hasFinancialPermission: raw.hasFinancialPermission !== false,
      salesMetrics: {
        isRestricted: Boolean(raw.salesMetrics?.isRestricted),
        todaySales: raw.salesMetrics?.todaySales ?? 0,
        todaySalesCount: raw.salesMetrics?.todaySalesCount ?? 0,
        yesterdaySales: raw.salesMetrics?.yesterdaySales ?? 0,
        yesterdaySalesCount: raw.salesMetrics?.yesterdaySalesCount ?? 0,
        salesChangePercent: raw.salesMetrics?.salesChangePercent ?? null,
        currency: 'BDT' as const,
      },
      collectionMetrics: {
        isRestricted: Boolean(raw.collectionMetrics?.isRestricted),
        todayCollection: raw.collectionMetrics?.todayCollection ?? 0,
        todayCollectionCount: raw.collectionMetrics?.todayCollectionCount ?? 0,
        yesterdayCollection: raw.collectionMetrics?.yesterdayCollection ?? 0,
        yesterdayCollectionCount: raw.collectionMetrics?.yesterdayCollectionCount ?? 0,
        collectionChangePercent: raw.collectionMetrics?.collectionChangePercent ?? null,
        currency: 'BDT' as const,
      },
      receivablesMetrics: {
        isRestricted: Boolean(raw.receivablesMetrics?.isRestricted),
        totalDue: raw.receivablesMetrics?.totalDue ?? 0,
        overdueCount: raw.receivablesMetrics?.overdueCount ?? 0,
        overdueTotal: raw.receivablesMetrics?.overdueTotal ?? 0,
        unpaidInvoicesCount: raw.receivablesMetrics?.unpaidInvoicesCount ?? 0,
        currency: 'BDT' as const,
      },
      profitMetrics: {
        isRestricted: Boolean(raw.profitMetrics?.isRestricted),
        hasReliableCostData: Boolean(raw.profitMetrics?.hasReliableCostData),
        totalRevenue: raw.profitMetrics?.totalRevenue ?? 0,
        totalCost: raw.profitMetrics?.totalCost ?? 0,
        grossProfit: raw.profitMetrics?.grossProfit ?? 0,
        marginPercent: raw.profitMetrics?.marginPercent ?? 0,
        currency: 'BDT' as const,
        costBreakdown: raw.profitMetrics?.costBreakdown ?? {
          materialCost: 0,
          laborCost: 0,
          machineCost: 0,
          otherCost: 0,
        },
      },
      attentionItems: Array.isArray(raw.attentionItems) ? raw.attentionItems : [],
      blockedWorkItems: Array.isArray(raw.blockedWorkItems) ? raw.blockedWorkItems : [],
      productionSummary: {
        activeCount: raw.productionSummary?.activeCount ?? 0,
        runningCount: raw.productionSummary?.runningCount ?? 0,
        queuedCount: raw.productionSummary?.queuedCount ?? 0,
        waitingCount: raw.productionSummary?.waitingCount ?? 0,
        finishingCount: raw.productionSummary?.finishingCount ?? 0,
        atRiskCount: raw.productionSummary?.atRiskCount ?? 0,
        completedTodayCount: raw.productionSummary?.completedTodayCount ?? 0,
        topJobs: Array.isArray(raw.productionSummary?.topJobs) ? raw.productionSummary.topJobs : [],
      },
      deliverySummary: {
        scheduledCount: raw.deliverySummary?.scheduledCount ?? 0,
        assignedCount: raw.deliverySummary?.assignedCount ?? 0,
        outForDeliveryCount: raw.deliverySummary?.outForDeliveryCount ?? 0,
        deliveredCount: raw.deliverySummary?.deliveredCount ?? 0,
        delayedCount: raw.deliverySummary?.delayedCount ?? 0,
        topDeliveries: Array.isArray(raw.deliverySummary?.topDeliveries) ? raw.deliverySummary.topDeliveries : [],
      },
      moneyToCollect: Array.isArray(raw.moneyToCollect) ? raw.moneyToCollect : [],
      pipelineCounts: {
        newWork: raw.pipelineCounts?.newWork ?? 0,
        quotation: raw.pipelineCounts?.quotation ?? 0,
        approved: raw.pipelineCounts?.approved ?? 0,
        design: raw.pipelineCounts?.design ?? 0,
        production: raw.pipelineCounts?.production ?? 0,
        ready: raw.pipelineCounts?.ready ?? 0,
        delivered: raw.pipelineCounts?.delivered ?? 0,
      },
      trendData: Array.isArray(raw.trendData) ? raw.trendData : [],
      branchCount: raw.branchCount ?? 1,
    }
  }, [data, company?.id])

  // Filtered Production Jobs
  const filteredProductionJobs = (safeData.productionSummary.topJobs || []).filter((j) => {
    if (prodFilter === 'running') return j.currentStage === 'printing'
    if (prodFilter === 'queued') return j.currentStage !== 'printing' && j.currentStage !== 'finishing'
    if (prodFilter === 'at_risk') return j.riskLevel === 'critical' || j.riskLevel === 'at_risk'
    if (prodFilter === 'finishing') return j.currentStage === 'finishing'
    return true
  })

  // Format WhatsApp Reminder Message
  const getWhatsAppReminderUrl = (item: OverdueReceivableSummary) => {
    const rawPhone = (item.customerPhone || '').replace(/\D/g, '')
    const phone = rawPhone.startsWith('880') ? rawPhone : rawPhone.startsWith('0') ? `88${rawPhone}` : `880${rawPhone}`
    const msg = encodeURIComponent(
      `নমস্কার ${item.customerName},\nInkFlow থেকে জানাচ্ছি আপনার ইনভয়েস #${item.invoiceNumber}-এর বকেয়া বিল ৳${item.dueAmount.toLocaleString()} পরিশোধের জন্য অনুরোধ করা যাচ্ছে।\nবিল পরিশোধের শেষ তারিখ ছিল: ${item.dueDate} (${item.daysOverdue} দিন পূর্বের)।\nকোনো প্রশ্ন থাকলে অনুগ্রহ করে আমাদের জানান। ধন্যবাদ!`
    )
    return `https://wa.me/${phone}?text=${msg}`
  }

  return (
    <div className="space-y-6 pb-16">
      {/* ========================================================================= */}
      {/* 1. UPGRADED EXECUTIVE CONTROL CENTER HEADER (Vibrant Gradient + Identity) */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-blue-400/20 dark:border-blue-500/20 bg-gradient-to-r from-[#1E5AF6] via-[#1642B5] to-[#0A1633] p-6 sm:p-7 md:p-8 shadow-md text-white">
        {/* Ambient Subtle Accent Highlights */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-60 w-60 rounded-full bg-blue-400/5 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-60 w-60 rounded-full bg-blue-300/15 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* LEFT: Business Identity + Context Badge + Dynamic Greeting + Date */}
          <div className="space-y-2 min-w-0">
            {/* Top Context Row */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-white drop-shadow-2xs">
                {company ? tBilingual(company.name, company.name_bn || company.name) : 'InkFlow Business'}
              </span>

              <Badge
                variant="outline"
                className="bg-white/15 text-white border-white/25 backdrop-blur-xs font-bold text-[11px] sm:text-xs py-0.5 px-2.5 rounded-full flex items-center gap-1.5 shadow-2xs"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{tBilingual('Business Control Center', 'ব্যবসায়িক নিয়ন্ত্রণ কেন্দ্র')}</span>
              </Badge>

              {currentBranch && (
                <Badge variant="outline" className="bg-white/10 text-blue-100 border-white/20 text-[11px] py-0.5 px-2 rounded-full">
                  <Building className="h-3 w-3 mr-1 text-blue-200" />
                  {currentBranch.name.split('(')[0].trim()}
                </Badge>
              )}
            </div>

            {/* Main Greeting */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white bangla-text leading-tight drop-shadow-2xs">
              {tBilingual(`${greeting.en}, ${userFirstName}`, `${greeting.bn}, ${userFirstName}`)}
            </h1>

            {/* Business Date */}
            <div className="flex items-center gap-2 text-xs sm:text-sm text-blue-100/90 font-medium pt-0.5">
              <Calendar className="h-4 w-4 text-blue-200 shrink-0" />
              <span suppressHydrationWarning>
                {formatBangladeshDate(new Date(), locale as 'en' | 'bn', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>

          {/* RIGHT: Time/Status Focal Area (Large Clock + Current Time) */}
          <div className="flex flex-col md:items-end justify-center shrink-0 pt-3 md:pt-0 border-t border-white/10 md:border-t-0">
            <div className="flex items-center gap-2 md:justify-end text-blue-100/90 mb-1">
              <Clock className="h-4 w-4 text-blue-200 shrink-0" />
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-blue-200">
                {tBilingual('Current Time', 'বর্তমান সময়')}
              </span>
              {isUpdating && (
                <span className="flex items-center gap-1 text-[11px] font-bold text-cyan-200 bg-white/20 px-2 py-0.5 rounded-full border border-white/25 animate-pulse">
                  <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                  <span>{tBilingual('Syncing', 'সিঙ্ক হচ্ছে')}</span>
                </span>
              )}
            </div>

            <LiveDhakaClock
              showSeconds={true}
              showIcon={false}
              className="inline-flex items-center"
              timeClassName="text-3xl sm:text-4xl lg:text-5xl font-bold font-numeric tabular-nums tracking-normal text-white drop-shadow-sm leading-none"
            />

            <span className="text-[11px] text-blue-200/80 font-semibold mt-1">
              {tBilingual('Asia/Dhaka (UTC+6)', 'বাংলাদেশ সময় (Asia/Dhaka)')}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TWO-COLUMN DASHBOARD SECTION: QUICK ACTIONS + NEEDS YOUR ATTENTION     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* LEFT COLUMN: Quick Actions (7 cols on desktop for comfortable 3x2 cards) */}
        <div className="lg:col-span-7 flex flex-col">
          <QuickActionsBar
            onOpenPaymentModal={onOpenPaymentModal}
            onOpenNewWork={onOpenNewWork}
            onRefresh={onRefresh}
            className="h-full"
          />
        </div>

        {/* RIGHT COLUMN: Needs Your Attention (5 cols on desktop) */}
        <div className="lg:col-span-5 flex flex-col">
          <Card className="p-3.5 sm:p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-xs flex flex-col justify-between h-full">
            <div>
              {/* Header Label Row */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 shrink-0">
                    <AlertTriangle className="h-3.5 w-3.5" />
                  </span>
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 bangla-text">
                    {tBilingual('Needs Your Attention', 'জরুরি মনোযোগ প্রয়োজন')}
                  </h2>
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs font-mono font-bold ${
                    safeData.attentionItems.length > 0
                      ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  }`}
                >
                  {safeData.attentionItems.length} {tBilingual('Items', 'টি সমস্যা')}
                </Badge>
              </div>

              {/* Content Area */}
              {safeData.attentionItems.length === 0 ? (
                <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-xl sm:rounded-2xl flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-emerald-900 dark:text-emerald-100 bangla-text">
                      {tBilingual('Operations are healthy and on track!', 'ব্যবসার সকল কার্যক্রম স্বাভাবিক ও নিয়মতান্ত্রিকভাবে চলছে!')}
                    </div>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300 bangla-text mt-0.5">
                      {tBilingual('No overdue invoices, delayed jobs, or pending customer proof blocks.', 'কোনো বিলম্বিত কাজ, বকেয়া বিল বা আটকে থাকা আর্টওয়ার্ক নেই।')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-0.5">
                  {safeData.attentionItems.map((item) => {
                  const isUrgent = item.severity === 'urgent'
                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl sm:rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs transition-all ${
                        isUrgent
                          ? 'bg-rose-50/70 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/60'
                          : 'bg-amber-50/70 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/60'
                      }`}
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full shrink-0 ${isUrgent ? 'bg-rose-600' : 'bg-amber-500'}`} />
                          <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 bangla-text truncate">
                            {tBilingual(item.titleEn, item.titleBn)}
                          </h3>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 bangla-text pl-4 line-clamp-2">
                          {tBilingual(item.subtitleEn, item.subtitleBn)}
                        </p>

                        {item.recordCode && (
                          <div className="pl-4 flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                            <span className="font-bold text-blue-600">{item.recordCode}</span>
                            {item.status && <span>• {item.status}</span>}
                            {item.ageOrDeadline && <span>• {item.ageOrDeadline}</span>}
                          </div>
                        )}
                      </div>

                      <Button
                        size="sm"
                        onClick={() => {
                          if (item.actionType === 'route') {
                            router.push(getTenantNavHref(item.actionTarget, pathname, company?.slug))
                          }
                        }}
                        className={`h-8 sm:h-9 px-3 text-xs font-bold shrink-0 bangla-text cursor-pointer self-start sm:self-center ${
                          isUrgent
                            ? 'bg-rose-600 text-white hover:bg-rose-700 border-rose-600'
                            : 'bg-amber-600 text-white hover:bg-amber-700 border-amber-600'
                        }`}
                      >
                        <span>{tBilingual(item.actionLabelEn, item.actionLabelBn)}</span>
                        <ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Card>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. BUSINESS TODAY (4 Canonical Core KPIs)                                 */}
      {/* ========================================================================= */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 bangla-text">
              {tBilingual('Business Today', 'আজকের ব্যবসায়িক হিসাব')}
            </h2>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {tBilingual('Timezone: Asia/Dhaka (UTC+6)', 'বাংলাদেশ সময়')}
          </span>
        </div>

        {safeData.hasFinancialPermission === false || safeData.salesMetrics.isRestricted ? (
          <Card className="p-6 border-slate-200 dark:border-slate-800 text-center bg-slate-50/50 dark:bg-slate-900/40">
            <div className="inline-flex p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 mb-2">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 bangla-text">
              {tBilingual('Financial Overview Restricted', 'আর্থিক তথ্য দেখতে বিশেষ অনুমতি প্রয়োজন')}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 bangla-text">
              {tBilingual(
                'Your assigned role does not have financial ledger visibility permissions.',
                'আপনার দায়িত্ব ও পদবীতে আর্থিক হিসাব দেখার অনুমতি সক্রিয় নেই।'
              )}
            </p>
          </Card>
        ) : (
          <KpiGrid columns={4}>
            {/* KPI 1: Sales Today */}
            <KpiCard
              titleEn="Sales Today"
              titleBn="আজকের বিক্রয়"
              value={safeData.salesMetrics.todaySales}
              isCurrency={true}
              icon={TrendingUp}
              colorVariant="primary"
              badge={
                (safeData.salesMetrics.todaySalesCount ?? 0) > 0
                  ? `${num(safeData.salesMetrics.todaySalesCount ?? 0)} ${tBilingual('Orders', 'টি অর্ডার')}`
                  : undefined
              }
              trend={
                safeData.salesMetrics.salesChangePercent !== null
                  ? {
                      value: `${safeData.salesMetrics.salesChangePercent >= 0 ? '+' : ''}${safeData.salesMetrics.salesChangePercent}% vs yesterday`,
                      direction: safeData.salesMetrics.salesChangePercent >= 0 ? 'up' : 'down',
                    }
                  : undefined
              }
              subtitleEn={
                safeData.salesMetrics.salesChangePercent === null && safeData.salesMetrics.todaySalesCount !== null
                  ? `${safeData.salesMetrics.todaySalesCount} booked order(s)`
                  : undefined
              }
            />

            {/* KPI 2: Collection Today */}
            <KpiCard
              titleEn="Collection Today"
              titleBn="আজকের নগদ আদায়"
              value={safeData.collectionMetrics.todayCollection}
              isCurrency={true}
              icon={DollarSign}
              colorVariant="success"
              badge={
                (safeData.collectionMetrics.todayCollectionCount ?? 0) > 0
                  ? `${num(safeData.collectionMetrics.todayCollectionCount ?? 0)} ${tBilingual('Entries', 'টি মানি রিসিট')}`
                  : undefined
              }
              trend={
                safeData.collectionMetrics.collectionChangePercent !== null
                  ? {
                      value: `${safeData.collectionMetrics.collectionChangePercent >= 0 ? '+' : ''}${safeData.collectionMetrics.collectionChangePercent}% vs yesterday`,
                      direction: safeData.collectionMetrics.collectionChangePercent >= 0 ? 'up' : 'down',
                    }
                  : undefined
              }
              subtitleEn={
                safeData.collectionMetrics.collectionChangePercent === null && safeData.collectionMetrics.todayCollectionCount !== null
                  ? `${safeData.collectionMetrics.todayCollectionCount} payments received`
                  : undefined
              }
            />

            {/* KPI 3: Customer Due */}
            <KpiCard
              titleEn="Customer Due (বাকি টাকা)"
              titleBn="মোট বকেয়া বাকি"
              value={safeData.receivablesMetrics.totalDue}
              isCurrency={true}
              icon={Receipt}
              colorVariant={(safeData.receivablesMetrics.totalDue ?? 0) > 0 ? 'danger' : 'success'}
              badge={
                (safeData.receivablesMetrics.overdueCount ?? 0) > 0
                  ? `${num(safeData.receivablesMetrics.overdueCount ?? 0)} ${tBilingual('Overdue', 'টি মেয়াদোত্তীর্ণ')}`
                  : undefined
              }
              subtitleEn={`${safeData.receivablesMetrics.unpaidInvoicesCount ?? 0} unpaid invoices`}
              subtitleBn={`${safeData.receivablesMetrics.unpaidInvoicesCount ?? 0}টি বকেয়া ইনভয়েস`}
            />

            {/* KPI 4: Profit / Margin */}
            {safeData.profitMetrics.hasReliableCostData ? (
              <KpiCard
                titleEn="Gross Profit & Margin"
                titleBn="লাভের মার্জিন"
                value={safeData.profitMetrics.grossProfit}
                isCurrency={true}
                icon={BarChart3}
                colorVariant="info"
                badge={`${safeData.profitMetrics.marginPercent}%`}
                subtitleEn={`Revenue: ${formatBDT(safeData.profitMetrics.totalRevenue ?? 0)} • Cost: ${formatBDT(safeData.profitMetrics.totalCost ?? 0)}`}
              />
            ) : (
              <Card className="p-4 border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bangla-text">
                    {tBilingual('Gross Profit / Margin', 'লাভের হিসাব ও মার্জিন')}
                  </span>
                  <div className="text-sm font-bold text-slate-700 dark:text-slate-300 pt-1">
                    {tBilingual('Costing Data Required', 'কস্টিং ডাটা প্রয়োজন')}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    {tBilingual(
                      'Add material & labor cost sheets to orders to calculate true margin.',
                      'প্রকৃত লাভ দেখতে অর্ডারে কাঁচামাল ও শ্রম খরচের বিবরণ দিন।'
                    )}
                  </p>
                </div>
                <div className="pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(getTenantNavHref('/costing', pathname, company?.slug))}
                    className="h-7 text-[11px] font-bold text-blue-600 border-blue-200"
                  >
                    {tBilingual('View Costing', 'কস্টিং দেখুন')}
                  </Button>
                </div>
              </Card>
            )}
          </KpiGrid>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. PRODUCTION TODAY (Floor Control & Work Pipeline)                        */}
      {/* ========================================================================= */}
      <Card className="border-slate-200/90 dark:border-slate-800 shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Printer className="h-4 w-4 text-purple-600" />
                <CardTitle className="text-base font-bold bangla-text">
                  {tBilingual('Production Today', 'আজকের প্রোডাকশন ও প্রিন্টিং')}
                </CardTitle>
                <Badge variant="outline" className="text-xs font-mono font-bold bg-purple-50 text-purple-700 border-purple-200">
                  {safeData.productionSummary.activeCount} {tBilingual('Active', 'চলতি')}
                </Badge>
              </div>
              <CardDescription className="text-xs bangla-text">
                {tBilingual('Real-time machine floor runs, queues, and task completions', 'লাইভ মেশিন ফ্লোর রান, কিউ এবং কাজ সম্পন্নের অবস্থা')}
              </CardDescription>
            </div>

            {/* Stage Status Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {[
                { key: 'all', labelEn: 'All', count: safeData.productionSummary.activeCount },
                { key: 'running', labelEn: 'Running', count: safeData.productionSummary.runningCount },
                { key: 'queued', labelEn: 'Queued', count: safeData.productionSummary.queuedCount },
                { key: 'finishing', labelEn: 'Finishing', count: safeData.productionSummary.finishingCount },
                { key: 'at_risk', labelEn: 'At Risk', count: safeData.productionSummary.atRiskCount },
              ].map((pill) => (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => setProdFilter(pill.key as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    prodFilter === pill.key
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  <span>{pill.labelEn}</span>
                  <span className="ml-1.5 opacity-80 font-mono">({pill.count})</span>
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-3">
          {filteredProductionJobs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 bangla-text space-y-2">
              <p>{tBilingual('No production jobs matching this status.', 'এই স্ট্যাটাসে কোনো কাজ নেই।')}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push(getTenantNavHref('/production', pathname, company?.slug))}
                className="text-xs font-bold"
              >
                {tBilingual('Open Production Board', 'প্রোডাকশন বোর্ড দেখুন')}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredProductionJobs.map((job) => {
                const isCritical = job.riskLevel === 'critical'
                const isAtRisk = job.riskLevel === 'at_risk'

                return (
                  <div
                    key={job.jobId}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 transition-all bg-white dark:bg-slate-900 ${
                      isCritical
                        ? 'border-rose-400 bg-rose-50/20'
                        : isAtRisk
                        ? 'border-amber-300 bg-amber-50/20'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                          {job.jobNumber}
                        </span>
                        <div className="flex items-center gap-1">
                          {isCritical && (
                            <Badge className="bg-rose-600 text-white text-[10px] py-0 px-1.5">
                              {tBilingual('Critical', 'ঝুঁকিপূর্ণ')}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[11px] py-0 capitalize">
                            {job.currentStage}
                          </Badge>
                        </div>
                      </div>

                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 bangla-text line-clamp-1">
                        {job.productName}
                      </h3>

                      <p className="text-xs text-slate-600 dark:text-slate-300 bangla-text">
                        <strong>{job.customerName}</strong> • {job.quantity} {job.unit}
                      </p>

                      {job.blockedReason && (
                        <div className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold bg-amber-50 dark:bg-amber-950/40 p-1.5 rounded flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          <span className="truncate">{tBilingual(job.blockedReason, job.blockedReasonBn || job.blockedReason)}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {job.deadline}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => router.push(getTenantNavHref('/production', pathname, company?.slug))}
                        className="h-7 text-xs font-bold text-blue-600 hover:text-blue-700 p-0"
                      >
                        {tBilingual('Open Job', 'বিস্তারিত')} <ArrowRight className="h-3 w-3 ml-0.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* 5. DELIVERY TODAY & MONEY TO COLLECT (Side by Side on Desktop)             */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 5A. DELIVERY TODAY */}
        <Card className="border-slate-200/90 dark:border-slate-800 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-cyan-600" />
                <CardTitle className="text-base font-bold bangla-text">
                  {tBilingual('Delivery Today', 'আজকের ডেলিভারি')}
                </CardTitle>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <Badge variant="outline" className="bg-cyan-50 text-cyan-800 border-cyan-200 font-bold">
                  {safeData.deliverySummary.outForDeliveryCount} {tBilingual('Out', 'রাস্তায়')}
                </Badge>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 font-bold">
                  {safeData.deliverySummary.deliveredCount} {tBilingual('Done', 'ডেলিভার্ড')}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {safeData.deliverySummary.topDeliveries.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 bangla-text">
                {tBilingual('No pending deliveries scheduled for today.', 'আজকের জন্য কোনো ডেলিভারি বাকি নেই।')}
              </div>
            ) : (
              <div className="space-y-2">
                {safeData.deliverySummary.topDeliveries.map((del) => (
                  <div
                    key={del.id}
                    className="p-3 bg-slate-50/70 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5 font-mono font-bold text-blue-600">
                        <span>{del.challanNumber}</span>
                        {del.isDelayed && (
                          <Badge className="bg-rose-600 text-white text-[10px] py-0 px-1 font-sans">
                            {tBilingual('Delayed', 'বিলম্বিত')}
                          </Badge>
                        )}
                      </div>
                      <div className="font-bold text-slate-900 dark:text-slate-100 truncate">{del.customerName}</div>
                      <div className="text-[11px] text-slate-500 truncate">{del.deliveryAddress}</div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(getTenantNavHref('/delivery', pathname, company?.slug))}
                      className="h-8 text-xs font-semibold shrink-0"
                    >
                      {tBilingual('Details', 'বিস্তারিত')}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 5B. MONEY TO COLLECT (High Priority Overdue Receivables) */}
        <Card className="border-slate-200/90 dark:border-slate-800 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-emerald-600" />
                <CardTitle className="text-base font-bold bangla-text">
                  {tBilingual('Money to Collect', 'বকেয়া টাকা আদায়')}
                </CardTitle>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => router.push(getTenantNavHref('/billing?tab=due', pathname, company?.slug))}
                className="text-xs font-bold text-blue-600 h-7"
              >
                {tBilingual('View All Dues', 'সকল বাকি')} <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {safeData.hasFinancialPermission === false || safeData.receivablesMetrics.isRestricted ? (
              <div className="py-6 text-center text-xs text-slate-500 bangla-text">
                {tBilingual('Financial receivables data restricted by permissions.', 'আর্থিক বাকি তথ্য দেখতে বিশেষ অনুমতি প্রয়োজন।')}
              </div>
            ) : safeData.moneyToCollect.length === 0 ? (
              <div className="py-6 text-center text-xs text-emerald-600 font-semibold bangla-text">
                {tBilingual('All accounts are clear! No overdue invoices found.', 'সকল বাকি পরিশোধিত! কোনো মেয়াদোত্তীর্ণ বিল নেই।')}
              </div>
            ) : (
              <div className="space-y-2">
                {safeData.moneyToCollect.map((item) => (
                  <div
                    key={item.invoiceId}
                    className="p-3 bg-rose-50/40 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-900 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100 truncate">{item.customerName}</span>
                        <span className="font-mono text-[11px] text-blue-600">#{item.invoiceNumber}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="font-bold text-rose-600 text-sm">৳ {formatBDT(item.dueAmount)}</span>
                        {item.daysOverdue > 0 && (
                          <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200 text-[10px] py-0">
                            {item.daysOverdue}d overdue
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.customerPhone && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setReminderItem(item)}
                          className="h-8 px-2 text-xs font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                          title={tBilingual('Send WhatsApp Reminder', 'হোয়াটসঅ্যাপ তাগাদা পাঠান')}
                        >
                          <MessageSquare className="h-3.5 w-3.5 mr-1" />
                          <span className="hidden sm:inline">{tBilingual('Remind', 'তাগাদা')}</span>
                        </Button>
                      )}

                      <Button
                        size="sm"
                        onClick={() => onOpenPaymentModal(item.invoiceId)}
                        className="h-8 px-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <DollarSign className="h-3.5 w-3.5 mr-0.5" />
                        {tBilingual('Collect', 'আদায়')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 6. WORKFLOW PIPELINE (New Work -> Delivered)                              */}
      {/* ========================================================================= */}
      <Card className="border-slate-200/90 dark:border-slate-800 shadow-xs bg-slate-50/50 dark:bg-slate-900/50">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-600" />
              <CardTitle className="text-base font-bold bangla-text">
                {tBilingual('Workflow Pipeline', 'ব্যবসায়িক পাইপলাইন')}
              </CardTitle>
            </div>
            <span className="text-xs text-slate-500 bangla-text hidden sm:inline">
              {tBilingual('Click any stage to inspect filtered records', 'যেকোনো ধাপে ক্লিক করে বিস্তারিত দেখুন')}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {[
              { labelEn: 'New Work', labelBn: 'নতুন কাজ', count: safeData.pipelineCounts.newWork, route: '/orders', color: 'blue' },
              { labelEn: 'Quotation', labelBn: 'কোটেশন', count: safeData.pipelineCounts.quotation, route: '/quotations', color: 'purple' },
              { labelEn: 'Approved', labelBn: 'অনুমোদিত', count: safeData.pipelineCounts.approved, route: '/orders', color: 'indigo' },
              { labelEn: 'Design', labelBn: 'ডিজাইন', count: safeData.pipelineCounts.design, route: '/design', color: 'cyan' },
              { labelEn: 'Production', labelBn: 'প্রোডাকশন', count: safeData.pipelineCounts.production, route: '/production', color: 'amber' },
              { labelEn: 'Ready', labelBn: 'প্রস্তুত', count: safeData.pipelineCounts.ready, route: '/delivery', color: 'emerald' },
              { labelEn: 'Delivered', labelBn: 'ডেলিভার্ড', count: safeData.pipelineCounts.delivered, route: '/delivery', color: 'teal' },
            ].map((stage, idx) => (
              <div
                key={stage.labelEn}
                onClick={() => router.push(getTenantNavHref(stage.route, pathname, company?.slug))}
                className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center cursor-pointer hover:border-blue-400 hover:shadow-xs transition-all space-y-1"
              >
                <div className="text-[11px] text-slate-500 font-semibold bangla-text">
                  {tBilingual(stage.labelEn, stage.labelBn)}
                </div>
                <div className="text-lg font-black text-slate-900 dark:text-slate-100 font-mono">
                  {num(stage.count)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* 7. BUSINESS TREND (7-Day Sales vs Collection Chart)                       */}
      {/* ========================================================================= */}
      {safeData.hasFinancialPermission !== false && (
        <Card className="border-slate-200/90 dark:border-slate-800 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-bold bangla-text">
                  {tBilingual('Sales vs Collection (Past 7 Days)', 'বিক্রয় বনাম আদায় ট্রেন্ড (বিগত ৭ দিন)')}
                </CardTitle>
                <CardDescription className="text-xs bangla-text">
                  {tBilingual('Authoritative daily financial trends in BDT', 'দৈনিক মোট বুকিং ও নগদ কালেকশনের তুলনা')}
                </CardDescription>
              </div>
              <div className="flex items-center gap-3 text-xs font-medium">
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> {tBilingual('Sales', 'সেলস')}
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> {tBilingual('Collections', 'আদায়')}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-64 w-full">
              {isMounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={safeData.trendData}>
                    <defs>
                      <linearGradient id="ownerSalesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="ownerColGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                    <XAxis dataKey="dayLabelEn" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={(val) => `৳${val / 1000}k`} />
                    <Tooltip formatter={(value: any) => [`৳ ${formatBDT(Number(value))}`, '']} />
                    <Area type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#ownerSalesGrad)" name="Sales" />
                    <Area type="monotone" dataKey="collections" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#ownerColGrad)" name="Collections" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full animate-pulse bg-slate-100 dark:bg-slate-800 rounded-lg" />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SEND PAYMENT REMINDER                                              */}
      {/* ========================================================================= */}
      {reminderItem && (
        <ModalDialog
          open={true}
          onOpenChange={(open) => !open && setReminderItem(null)}
          title={tBilingual('Send Due Payment Reminder', 'বকেয়া বিলের তাগাদা বার্তা পাঠান')}
          description={`${reminderItem.customerName} • Invoice #${reminderItem.invoiceNumber} (${formatBDT(reminderItem.dueAmount)})`}
        >
          <div className="space-y-4 pt-2">
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs font-mono border space-y-1">
              <div className="text-slate-500 font-sans">{tBilingual('Message Preview:', 'বার্তা প্রিভিউ:')}</div>
              <div className="text-slate-800 dark:text-slate-200">
                নমস্কার {reminderItem.customerName}, InkFlow থেকে জানাচ্ছি আপনার ইনভয়েস #{reminderItem.invoiceNumber}-এর বকেয়া বিল ৳{reminderItem.dueAmount.toLocaleString()} পরিশোধের জন্য অনুরোধ করা যাচ্ছে।
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setReminderItem(null)} className="text-xs">
                {tBilingual('Cancel', 'বাতিল')}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  window.open(getWhatsAppReminderUrl(reminderItem), '_blank')
                  setReminderItem(null)
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
              >
                <MessageSquare className="h-4 w-4 mr-1.5" />
                {tBilingual('Open in WhatsApp', 'হোয়াটসঅ্যাপে পাঠান')}
              </Button>
            </div>
          </div>
        </ModalDialog>
      )}
    </div>
  )
}
