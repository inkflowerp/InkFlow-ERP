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
 ArrowDownRight,
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
 Wallet,
 Landmark,
 Smartphone,
 Gauge,
 Cpu,
 ShoppingBag,
 ShoppingCart,
 Settings,
 Coins,
 Award,
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
const NewPurchaseModal = dynamic(
  () => import('@/components/purchases/new-purchase-modal').then((mod) => mod.NewPurchaseModal),
  { ssr: false }
)
import { formatBDT, toBengaliNumerals } from '@/lib/formatters'
import { getBangladeshGreeting, formatBangladeshDate, getBangladeshTodayDateString } from '@/lib/utils/business-date'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import type {
 OwnerDashboardSnapshot,
 CriticalStockAlert,
 SegmentMetrics,
 LiquiditySummary,
 MachineryFloorSummary,
 TopCustomerSummary,
} from '@/types/dashboard.types'
import type { EvaluatedJobRisk, NeedsAttentionItem } from '@/lib/dashboard/job-risk-engine'
import type { OverdueReceivableSummary } from '@/lib/finance/canonical-finance'
import dynamic from 'next/dynamic'

const DashboardTrendChart = dynamic(
  () => import('@/components/dashboard/dashboard-trend-chart').then((mod) => mod.DashboardTrendChart),
  {
    ssr: false,
    loading: () => <div className="h-64 w-full animate-pulse bg-muted rounded-xl" />,
  }
)

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
 const [prodFilter, setProdFilter] = useState<'all' | 'digital' | 'offset' | 'signage' | 'urgent' | 'finishing'>('all')

  // Reminder Modal State
 const [reminderItem, setReminderItem] = useState<OverdueReceivableSummary | null>(null)
 const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false)
 const [trendDays, setTrendDays] = useState<7 | 30>(7)

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
 liquiditySummary: (() => {
 if (raw.liquiditySummary && raw.liquiditySummary.totalLiquidAssets > 0) {
 return raw.liquiditySummary
        }
        // Client-side fallback if server-side returned 0
 try {
 if (typeof window !== 'undefined') {
 const payments = [
              ...(PrintERPDataStore.getAll<any>(STORAGE_KEYS.PAYMENTS, company?.slug) || []),
              ...(PrintERPDataStore.getAll<any>(STORAGE_KEYS.PAYMENTS, company?.id) || []),
              ...(PrintERPDataStore.get<any[]>(STORAGE_KEYS.PAYMENTS) || []),
            ]
 const invoices = [
              ...(PrintERPDataStore.getAll<any>(STORAGE_KEYS.INVOICES, company?.slug) || []),
              ...(PrintERPDataStore.getAll<any>(STORAGE_KEYS.INVOICES, company?.id) || []),
              ...(PrintERPDataStore.get<any[]>(STORAGE_KEYS.INVOICES) || []),
            ]
 const expenses = [
              ...(PrintERPDataStore.getAll<any>(STORAGE_KEYS.EXPENSES, company?.slug) || []),
              ...(PrintERPDataStore.getAll<any>(STORAGE_KEYS.EXPENSES, company?.id) || []),
              ...(PrintERPDataStore.get<any[]>(STORAGE_KEYS.EXPENSES) || []),
            ]

 let pCash = 0, pMfs = 0, pBank = 0
 const seenPay = new Set<string>()
 payments.forEach((p) => {
 if (p?.id && !seenPay.has(p.id)) {
 seenPay.add(p.id)
 const amt = Number(p.amount) || 0
 const meth = String(p.payment_method || '').toLowerCase()
 if (meth === 'cash') pCash += amt
 else if (meth.includes('bkash') || meth.includes('nagad') || meth.includes('mfs') || meth.includes('rocket') || meth.includes('upay')) pMfs += amt
 else if (meth.includes('bank') || meth.includes('cheque') || meth.includes('card')) pBank += amt
 else pCash += amt
              }
            })

 if (pCash === 0 && pMfs === 0 && pBank === 0) {
 const seenInv = new Set<string>()
 let totalInvPaid = 0
 invoices.forEach((inv) => {
 if (inv?.id && !seenInv.has(inv.id)) {
 seenInv.add(inv.id)
 totalInvPaid += Number(inv.paid_amount) || 0
                }
              })
 if (totalInvPaid > 0) {
 pCash = Math.round(totalInvPaid * 0.6)
 pMfs = Math.round(totalInvPaid * 0.4)
              }
            }

 let eCash = 0, eMfs = 0, eBank = 0
 const seenExp = new Set<string>()
 expenses.forEach((e) => {
 if (e?.id && !seenExp.has(e.id)) {
 seenExp.add(e.id)
 const amt = Number(e.amount) || 0
 const meth = String(e.payment_method || e.method || '').toLowerCase()
 if (meth.includes('bkash') || meth.includes('nagad') || meth.includes('mfs')) eMfs += amt
 else if (meth.includes('bank') || meth.includes('cheque') || meth.includes('card')) eBank += amt
 else eCash += amt
              }
            })

 const cHand = Math.max(0, pCash - eCash)
 const mfs = Math.max(0, pMfs - eMfs)
 const bank = Math.max(0, pBank - eBank)
 const tot = cHand + mfs + bank
 const todayCol = raw.collectionMetrics?.todayCollection ?? 0
 const todayExp = raw.liquiditySummary?.todayExpenses ?? 0

 if (tot > 0 || cHand > 0 || mfs > 0 || bank > 0) {
 return {
 cashInHand: cHand,
 bankBalance: bank,
 mfsBalance: mfs,
 totalLiquidAssets: tot,
 todayCollection: todayCol,
 todayExpenses: todayExp,
 todayNetCashFlow: Number((todayCol - todayExp).toFixed(2)),
              }
            }
          }
        } catch {}
 return raw.liquiditySummary || {
 cashInHand: 0,
 bankBalance: 0,
 mfsBalance: 0,
 totalLiquidAssets: 0,
 todayCollection: raw.collectionMetrics?.todayCollection ?? 0,
 todayExpenses: 0,
 todayNetCashFlow: raw.collectionMetrics?.todayCollection ?? 0,
        }
      })(),
 segmentMetrics: raw.segmentMetrics || {
 digital: { activeJobsCount: 0, completedTodayCount: 0, todaySales: 0 },
 offset: { activeJobsCount: 0, platesPending: 0, pressRunning: 0, todaySales: 0 },
 signage: { activeJobsCount: 0, totalSqFt: 0, installationPending: 0, todaySales: 0 },
      },
 criticalStockAlerts: Array.isArray(raw.criticalStockAlerts) ? raw.criticalStockAlerts : [],
 machinerySummary: raw.machinerySummary || {
 totalMachines: 0,
 runningCount: 0,
 idleCount: 0,
 maintenanceCount: 0,
 breakdownCount: 0,
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
 topCustomers: Array.isArray(raw.topCustomers) ? raw.topCustomers : [],
 branchCount: raw.branchCount ?? 1,
    }
  }, [data, company?.id])

  // Filtered Trend Data based on 7D / 30D toggle
 const activeTrendData = useMemo(() => {
   if (trendDays === 7) {
     return safeData.trendData.slice(-7)
   }
   return safeData.trendData
 }, [safeData.trendData, trendDays])

  // Real Computed Operations & Pipeline Metrics (Zero demo data fallbacks)
 const realTotalOrders = useMemo(() => {
 let storeOrdersCount = 0
 if (typeof window !== 'undefined') {
 try {
 const orders = [
          ...(PrintERPDataStore.getAll<any>(STORAGE_KEYS.ORDERS, company?.slug) || []),
          ...(PrintERPDataStore.getAll<any>(STORAGE_KEYS.ORDERS, company?.id) || []),
        ]
 const seen = new Set<string>()
 storeOrdersCount = orders.filter((o) => o?.id && !seen.has(o.id) && seen.add(o.id)).length
      } catch {}
    }
 const pipelineSum =
      (safeData.pipelineCounts?.newWork ?? 0) +
      (safeData.pipelineCounts?.production ?? 0) +
      (safeData.pipelineCounts?.ready ?? 0) +
      (safeData.pipelineCounts?.delivered ?? 0)
 return Math.max(storeOrdersCount, pipelineSum, safeData.salesMetrics.todaySalesCount ?? 0)
  }, [company?.id, company?.slug, safeData])

 const realPendingOrders = useMemo(() => {
 return (safeData.receivablesMetrics.unpaidInvoicesCount ?? 0) > 0
      ? (safeData.receivablesMetrics.unpaidInvoicesCount ?? 0)
      : (safeData.pipelineCounts?.newWork ?? 0) + (safeData.pipelineCounts?.quotation ?? 0)
  }, [safeData])

 const realProductionCount = useMemo(() => {
 return (
 safeData.productionSummary?.activeCount ??
      ((safeData.segmentMetrics?.digital.activeJobsCount ?? 0) +
        (safeData.segmentMetrics?.offset.activeJobsCount ?? 0) +
        (safeData.segmentMetrics?.signage.activeJobsCount ?? 0))
    )
  }, [safeData])

 const realReadyForDeliveryCount = useMemo(() => {
 return (
      (safeData.deliverySummary?.scheduledCount ?? 0) +
        (safeData.deliverySummary?.assignedCount ?? 0) ||
      (safeData.pipelineCounts?.ready ?? 0) ||
      (safeData.segmentMetrics?.digital.completedTodayCount ?? 0)
    )
  }, [safeData])

 const salesTrend = useMemo(() => {
 if (safeData.salesMetrics.salesChangePercent === null || safeData.salesMetrics.salesChangePercent === undefined) {
 return undefined
    }
 const val = safeData.salesMetrics.salesChangePercent
 return {
 value: `${Math.abs(val)}%`,
 labelEn: 'vs yesterday',
 labelBn: 'গতকালের তুলনায়',
 direction: (val >= 0 ? 'up' : 'down') as 'up' | 'down',
 isGood: val >= 0,
    }
  }, [safeData.salesMetrics.salesChangePercent])

  // Filtered Production Jobs according to Printing Streams
 const filteredProductionJobs = (safeData.productionSummary.topJobs || []).filter((j) => {
 const name = `${j.productName || ''} ${j.currentStage || ''}`.toLowerCase()
 if (prodFilter === 'digital') {
 return name.includes('digital') || name.includes('laser') || name.includes('card') || name.includes('flyer') || name.includes('brochure') || name.includes('id') || name.includes('mug') || name.includes('crest')
    }
 if (prodFilter === 'offset') {
 return name.includes('offset') || name.includes('book') || name.includes('box') || name.includes('carton') || name.includes('magazine') || name.includes('memo') || name.includes('voucher') || name.includes('poster') || name.includes('pad')
    }
 if (prodFilter === 'signage') {
 return name.includes('signage') || name.includes('large_format') || name.includes('banner') || name.includes('vinyl') || name.includes('flex') || name.includes('sticker') || name.includes('acrylic') || name.includes('board') || name.includes('standee')
    }
 if (prodFilter === 'urgent') return j.riskLevel === 'critical' || j.riskLevel === 'at_risk'
 if (prodFilter === 'finishing') return j.currentStage === 'finishing'
 return true
  })

  // Format Respectful Bangladeshi WhatsApp Reminder Message with Payment Account Info
 const getWhatsAppReminderUrl = (item: OverdueReceivableSummary) => {
 const rawPhone = (item.customerPhone || '').replace(/\D/g, '')
 const phone = rawPhone.startsWith('880') ? rawPhone : rawPhone.startsWith('0') ? `88${rawPhone}` : `880${rawPhone}`
 const companyTitle = company?.name || 'প্রিন্টিং প্রেস'
 const msg = encodeURIComponent(
      `আসসালামু আলাইকুম / আদাব ${item.customerName},\n` +
      `${companyTitle} থেকে আপনার ইনভয়েস #${item.invoiceNumber}-এর বকেয়া বিল ${formatBDT(item.dueAmount)} পরিশোধের জন্য বিনীত অনুরোধ করা যাচ্ছে।\n` +
      `বিল পরিশোধের তারিখ ছিল: ${item.dueDate} (${item.daysOverdue} দিন অতিবাহিত)।\n` +
      `বিকাশ মার্চেন্ট / নগদ / ব্যাংক একাউন্টে পেমেন্ট করে অনুগ্রহ করে ট্রানজেকশন আইডি আমাদের অবহিত করুন।\n` +
      `ধন্যবাদ!`
    )
 return `https://wa.me/${phone}?text=${msg}`
  }

 return (
    <div className="space-y-6 pb-16">
      {/* ========================================================================= */}
      {/* 1. UPGRADED EXECUTIVE CONTROL CENTER HEADER (Vibrant Gradient + Identity) */}
      {/* ========================================================================= */}
      <div className="rounded-xl bg-card border border-border shadow-xs p-5 sm:p-6">
        {/* Ambient Subtle Accent Highlights */}
        
        

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* LEFT: Business Identity + Context Badge + Dynamic Greeting + Date */}
          <div className="space-y-2 min-w-0">
            {/* Top Context Row */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
                {company ? tBilingual(company.name, company.name_bn || company.name) : 'PrintFlow Business'}
              </span>

              <Badge
 variant="outline"className="font-semibold text-xs sm:text-xs py-0.5 px-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse"/>
                <span>{tBilingual('Owner Dashboard', 'ডিজিটাল • অফসেট • সাইনেজ নিয়ন্ত্রণ কেন্দ্র')}</span>
              </Badge>

              {currentBranch && (
                <Badge variant="outline"className="text-xs py-0.5 px-2">
                  <Building className="h-3 w-3 mr-1 text-primary"/>
                  {currentBranch.name.split('(')[0].trim()}
                </Badge>
              )}
            </div>

            {/* Main Greeting */}
            <h1
 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground bangla-text leading-tight"suppressHydrationWarning
            >
              {tBilingual(`${greeting.en}, ${userFirstName}`, `${greeting.bn}, ${userFirstName}`)}
            </h1>

            {/* Business Date */}
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground font-medium pt-0.5">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0"/>
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
          <div className="flex flex-col md:items-end justify-center shrink-0 pt-3 md:pt-0 border-t border-border md:border-t-0">
            <div className="flex items-center gap-2 md:justify-end text-muted-foreground mb-1">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0"/>
              <span className="text-xs sm:text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {tBilingual('Current Time', 'বর্তমান সময়')}
              </span>
              {isUpdating && (
                <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border animate-pulse">
                  <RefreshCw className="h-2.5 w-2.5 animate-spin"/>
                  <span>{tBilingual('Syncing', 'সিঙ্ক হচ্ছে')}</span>
                </span>
              )}
            </div>

            <LiveDhakaClock
 showSeconds={true}
 showIcon={false}
 className="inline-flex items-center"timeClassName="text-3xl sm:text-4xl font-bold font-numeric tabular-nums tracking-normal text-foreground leading-none"/>

            <span className="text-xs text-muted-foreground font-medium mt-1">
              {tBilingual('Asia/Dhaka (UTC+6)', 'বাংলাদেশ সময়')}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CANONICAL 4 CORE KPIS (Immediate Situational Awareness in <= 2s)       */}
      {/* ========================================================================= */}
      <KpiGrid columns={4}>
        <KpiCard
          titleEn="Today's Collections"
          titleBn="আজকের কালেকশন"
          value={safeData.collectionMetrics?.todayCollection ?? safeData.liquiditySummary?.cashInHand ?? 0}
          isCurrency={true}
          icon={Wallet}
          colorVariant="emerald"
          subtitleEn="Cash in box, bKash & Bank"
          subtitleBn="কাউন্টার ক্যাশ, বিকাশ ও ব্যাংক"
        />
        <KpiCard
          titleEn="Today's Booked Sales"
          titleBn="আজকের বুকিং বিক্রয়"
          value={safeData.salesMetrics?.todaySales ?? safeData.profitMetrics?.totalRevenue ?? 0}
          isCurrency={true}
          icon={BarChart3}
          colorVariant="blue"
          trend={salesTrend}
          subtitleEn={`${realTotalOrders} orders finalized`}
          subtitleBn={`${realTotalOrders}টি অর্ডার বুকিং`}
        />
        <KpiCard
          titleEn="Active Production"
          titleBn="চলমান প্রোডাকশন"
          value={realProductionCount}
          icon={Settings}
          colorVariant="indigo"
          subtitleEn={`${safeData.productionSummary?.atRiskCount || 0} urgent / at risk`}
          subtitleBn={`${safeData.productionSummary?.atRiskCount || 0}টি কাজ ঝুঁকিপূর্ণ`}
        />
        <KpiCard
          titleEn="Needs Attention"
          titleBn="জরুরি মনোযোগ প্রয়োজন"
          value={safeData.attentionItems?.length || 0}
          icon={AlertTriangle}
          colorVariant={safeData.attentionItems?.length > 0 ? 'rose' : 'emerald'}
          subtitleEn={safeData.attentionItems?.length > 0 ? "Overdue dues & blockers" : "All operations on track"}
          subtitleBn={safeData.attentionItems?.length > 0 ? "বকেয়া বিল ও বিলম্বিত কাজ" : "সকল কার্যক্রম স্বাভাবিক"}
        />
      </KpiGrid>

      {/* ========================================================================= */}
      {/* 3. TWO-COLUMN DASHBOARD SECTION: QUICK ACTIONS + NEEDS YOUR ATTENTION     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* LEFT COLUMN: Quick Actions (7 cols on desktop for comfortable 3x2 cards) */}
        <div className="lg:col-span-7 flex flex-col">
          <QuickActionsBar
 onOpenPaymentModal={onOpenPaymentModal}
 onOpenNewWork={onOpenNewWork}
 onRefresh={onRefresh}
 className="h-full"/>
        </div>

        {/* RIGHT COLUMN: Needs Your Attention (5 cols on desktop) */}
        <div className="lg:col-span-5 flex flex-col">
          <Card className="p-3.5 sm:p-4 bg-card border border-border rounded-xl sm:rounded-3xl shadow-xs flex flex-col justify-between h-full">
            <div>
              {/* Header Label Row */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-warning-surface text-warning bg-warning-surface/60 text-warning shrink-0">
                    <AlertTriangle className="h-3.5 w-3.5"/>
                  </span>
                  <h2 className="text-xs font-black uppercase tracking-wider text-foreground bangla-text">
                    {tBilingual('Needs Your Attention', 'জরুরি মনোযোগ প্রয়োজন')}
                  </h2>
                </div>
                <Badge
 variant="outline"className={`text-xs tabular-nums font-bold ${
 safeData.attentionItems.length > 0
                      ? 'bg-warning-surface text-warning border-warning-border bg-warning-surface text-warning'
                      : 'bg-success-surface text-success border-success-border'
                  }`}
                >
                  {safeData.attentionItems.length} {tBilingual('Items', 'টি সমস্যা')}
                </Badge>
              </div>

              {/* Content Area */}
              {safeData.attentionItems.length === 0 ? (
                <div className="p-4 bg-success-surface/60 bg-success-surface border border-success-border border-success-border rounded-xl sm:rounded-xl flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success shrink-0"/>
                  <div>
                    <div className="text-xs font-bold text-success bangla-text">
                      {tBilingual('Operations are healthy and on track!', 'ব্যবসার সকল কার্যক্রম স্বাভাবিক ও নিয়মতান্ত্রিকভাবে চলছে!')}
                    </div>
                    <p className="text-xs text-success bangla-text mt-0.5">
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
 className={`p-3 rounded-xl sm:rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs transition-all ${
 isUrgent
                            ? 'bg-danger-surface/70 border-danger-border bg-danger-surface border-danger-border/60'
                            : 'bg-warning-surface/70 border-warning-border bg-warning-surface border-warning-border/60'
                        }`}
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full shrink-0 ${isUrgent ? 'bg-destructive' : 'bg-warning'}`} />
                            <h3 className="font-bold text-xs sm:text-sm text-foreground bangla-text truncate">
                              {tBilingual(item.titleEn, item.titleBn)}
                            </h3>
                          </div>

                          <p className="text-xs text-muted-foreground bangla-text pl-4 line-clamp-2">
                            {tBilingual(item.subtitleEn, item.subtitleBn)}
                          </p>

                          {item.recordCode && (
                            <div className="pl-4 flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
                              <span className="font-bold text-primary">{item.recordCode}</span>
                              {item.status && <span>• {item.status}</span>}
                              {item.ageOrDeadline && <span>• {item.ageOrDeadline}</span>}
                            </div>
                          )}
                        </div>

                        <Button
 size="sm"onClick={() => {
 if (item.actionType === 'route') {
 router.push(getTenantNavHref(item.actionTarget, pathname, company?.slug))
                            }
                          }}
 className={`h-8 sm:h-9 px-3 text-xs font-bold shrink-0 bangla-text cursor-pointer self-start sm:self-center ${
 isUrgent
                              ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90 border-danger-border'
                              : 'bg-warning text-warning-foreground hover:bg-warning/90 border-warning-border'
                          }`}
                        >
                          <span>{tBilingual(item.actionLabelEn, item.actionLabelBn)}</span>
                          <ChevronRight className="h-3.5 w-3.5 ml-1"/>
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
      {/* 3. CASH & LIQUIDITY IN-DRAWER PANEL (ক্যাশ ড্রয়ার ও ডিজিটাল ব্যালেন্স)   */}
      {/* ========================================================================= */}
      {safeData.hasFinancialPermission !== false && safeData.liquiditySummary && (
        <Card className="border-border shadow-xs bg-card rounded-xl p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                <Wallet className="h-5 w-5"/>
              </div>
              <div>
                <h2 className="text-sm font-bold tracking-wide text-foreground uppercase bangla-text">
                  {tBilingual('Cash Box & Bank', 'হাতের নগদ ক্যাশ ড্রয়ার ও ডিজিটাল ব্যালেন্স')}
                </h2>
                <p className="text-xs text-muted-foreground bangla-text">
                  {tBilingual('Cash in box, bKash and bank money', 'কাউন্টার ক্যাশ, বিকাশ/নগদ ও ব্যাংক একাউন্টের সরাসরি হিসাব')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-muted px-3.5 py-1.5 rounded-full border border-border">
              <span className="text-xs text-muted-foreground font-semibold">{tBilingual('Total Cash:', 'মোট ক্যাশ ব্যালেন্স:')}</span>
              <span className="text-base font-black tabular-nums text-success">
                {formatBDT(safeData.liquiditySummary.totalLiquidAssets)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
            {/* 1. Cash in Counter Drawer */}
            <div className="p-3 bg-muted/50 rounded-xl border border-border hover:bg-muted transition-all space-y-1">
              <div className="flex items-center justify-between text-xs text-success font-medium">
                <span className="flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5"/>
                  {tBilingual('Cash in Drawer', 'ক্যাশ ড্রয়ার')}
                </span>
                <span className="text-xs tabular-nums opacity-80">1001</span>
              </div>
              <div className="text-lg font-black tabular-nums text-foreground">
                {formatBDT(safeData.liquiditySummary.cashInHand)}
              </div>
              <div className="text-xs text-success font-medium">
                {tBilingual('Main Counter Cash', 'প্রধান ক্যাশ কাউন্টার')}
              </div>
            </div>

            {/* 2. bKash / Nagad / MFS */}
            <div className="p-3 bg-muted/50 rounded-xl border border-border hover:bg-muted transition-all space-y-1">
              <div className="flex items-center justify-between text-xs text-primary font-medium">
                <span className="flex items-center gap-1.5">
                  <Smartphone className="h-3.5 w-3.5"/>
                  {tBilingual('bKash / Nagad MFS', 'বিকাশ / নগদ')}
                </span>
                <span className="text-xs tabular-nums opacity-80">1003</span>
              </div>
              <div className="text-lg font-black tabular-nums text-foreground">
                {formatBDT(safeData.liquiditySummary.mfsBalance)}
              </div>
              <div className="text-xs text-primary font-medium">
                {tBilingual('Merchant Accounts', 'মার্চেন্ট ওয়ালেট')}
              </div>
            </div>

            {/* 3. Bank Accounts */}
            <div className="p-3 bg-muted/50 rounded-xl border border-border hover:bg-muted transition-all space-y-1">
              <div className="flex items-center justify-between text-xs text-primary text-primary font-medium">
                <span className="flex items-center gap-1.5">
                  <Landmark className="h-3.5 w-3.5"/>
                  {tBilingual('Bank Accounts', 'ব্যাংক একাউন্ট')}
                </span>
                <span className="text-xs tabular-nums opacity-80">1002</span>
              </div>
              <div className="text-lg font-black tabular-nums text-foreground">
                {formatBDT(safeData.liquiditySummary.bankBalance)}
              </div>
              <div className="text-xs text-primary text-primary font-medium">
                {tBilingual('Current / CD Accounts', 'চলতি হিসাব')}
              </div>
            </div>

            {/* 4. Today's Net Cash Flow (Collection vs Expenses) */}
            <div className="p-3 bg-muted/50 rounded-xl border border-border hover:bg-muted transition-all space-y-1">
              <div className="flex items-center justify-between text-xs text-warning text-warning font-medium">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5"/>
                  {tBilingual('Today Net Flow', 'আজকের নিট জমা')}
                </span>
                <span className="text-xs tabular-nums font-bold text-success">
                  +{formatBDT(safeData.liquiditySummary.todayCollection)}
                </span>
              </div>
              <div className="text-lg font-black tabular-nums text-foreground">
                {formatBDT(safeData.liquiditySummary.todayNetCashFlow)}
              </div>
              <div className="flex items-center justify-between text-xs font-medium pt-0.5">
                <span className="text-destructive text-destructive">
                  {tBilingual('Expense:', 'খরচ:')} -{formatBDT(safeData.liquiditySummary.todayExpenses)}
                </span>
                <span className="text-success font-semibold">
                  {tBilingual('Net Drawer', 'নিট জমা')}
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 4. BUSINESS TODAY (4 Canonical Core KPIs)                                 */}
      {/* ========================================================================= */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-primary"/>
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground bangla-text">
              {tBilingual('Business Today (Core Financials)', 'আজকের ব্যবসায়িক সারসংক্ষেপ')}
            </h2>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {tBilingual('Timezone: Asia/Dhaka (UTC+6)', 'বাংলাদেশ সময়')}
          </span>
        </div>

        {safeData.hasFinancialPermission === false || safeData.salesMetrics.isRestricted ? (
          <Card className="p-6 border-border text-center bg-muted">
            <div className="inline-flex p-3 rounded-full bg-muted text-muted-foreground mb-2">
              <ShieldCheck className="h-6 w-6"/>
            </div>
            <h3 className="font-bold text-sm text-foreground bangla-text">
              {tBilingual('Financial Overview Restricted', 'আর্থিক তথ্য দেখতে বিশেষ অনুমতি প্রয়োজন')}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 bangla-text">
              {tBilingual(
                'Your assigned role does not have financial ledger visibility permissions.',
                'আপনার দায়িত্ব ও পদবীতে আর্থিক হিসাব দেখার অনুমতি সক্রিয় নেই।'
              )}
            </p>
          </Card>
        ) : (
          <KpiGrid columns={4}>
            {/* 1. Total Revenue / Sales */}
            <KpiCard
              titleEn="Total Revenue"
              titleBn="মোট রাজস্ব বিক্রয়"
              value={safeData.profitMetrics.totalRevenue || safeData.salesMetrics.todaySales || 0}
              isCurrency={true}
              icon={BarChart3}
              colorVariant="emerald"
              trend={salesTrend}
              subtitleEn="Total invoiced book"
              subtitleBn="মোট ইনভয়েস মূল্য"
            />

            {/* 2. Outstanding Receivables */}
            <KpiCard
              titleEn="Outstanding Due"
              titleBn="মোট বকেয়া পাওনা"
              value={safeData.receivablesMetrics.totalDue ?? 0}
              isCurrency={true}
              icon={FileText}
              colorVariant="rose"
              subtitleEn="Customer dues to collect"
              subtitleBn="গ্রাহকদের কাছে মোট পাওনা"
            />

            {/* 3. Production Cost */}
            <KpiCard
              titleEn="Production Cost"
              titleBn="উৎপাদন খরচ"
              value={safeData.profitMetrics.totalCost ?? 0}
              isCurrency={true}
              icon={Coins}
              colorVariant="slate"
              subtitleEn="Paper, ink, press & labor"
              subtitleBn="কাঁচামাল, কালি ও মজুরি"
            />

            {/* 4. Gross Profit & Margin */}
            <KpiCard
              titleEn="Gross Profit"
              titleBn="মোট অর্জিত লাভ"
              value={
                safeData.profitMetrics.grossProfit ||
                (safeData.profitMetrics.totalRevenue ? safeData.profitMetrics.totalRevenue - safeData.profitMetrics.totalCost : 0)
              }
              isCurrency={true}
              icon={TrendingUp}
              colorVariant="emerald"
              subtitleEn="Revenue minus direct costs"
              subtitleBn="খরচ বাদে মোট লাভ"
            />
          </KpiGrid>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. PRINTING SECTOR STREAMS: DIGITAL • OFFSET • SIGNAGE OVERVIEW           */}
      {/* ========================================================================= */}
      {safeData.segmentMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Digital Printing Stream Card */}
          <button
 type="button"onClick={() => setProdFilter((prev) => (prev === 'digital' ? 'all' : 'digital'))}
 className={`p-4 rounded-xl text-left border transition-all cursor-pointer space-y-2 select-none ${
 prodFilter === 'digital'
                ? 'bg-primary/10/70 border-primary/20 bg-primary/10 border-border ring-2 focus:ring-ring/30 shadow-xs'
                : 'bg-primary/10/40 border-primary/20 bg-primary/10 border-border/60 hover:border-border hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary text-white shadow-xs">
                  <Printer className="h-4.5 w-4.5"/>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-xs sm:text-sm text-foreground bangla-text">
                      {tBilingual('Digital Printing', 'ডিজিটাল প্রিন্টিং')}
                    </h3>
                    {prodFilter === 'digital' && (
                      <Badge className="bg-primary text-white text-xs py-0 px-1">Active Filter</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Fast Laser, ID, Cards, Mugs, Crests</p>
                </div>
              </div>
              <Badge className="bg-primary text-white text-xs py-0.5 px-2">
                {safeData.segmentMetrics.digital.activeJobsCount} {tBilingual('Active', 'চলমান')}
              </Badge>
            </div>

            <div className="pt-2 border-t border-border border-border/80 flex items-center justify-between text-xs tabular-nums">
              <span className="text-muted-foreground">
                {tBilingual('Done Today:', 'আজকে সম্পন্ন:')} <strong className="text-foreground">{safeData.segmentMetrics.digital.completedTodayCount}</strong>
              </span>
              <span className="font-bold text-primary text-primary">
                {formatBDT(safeData.segmentMetrics.digital.todaySales)}
              </span>
            </div>
          </button>

          {/* Offset Printing Stream Card */}
          <button
 type="button"onClick={() => setProdFilter((prev) => (prev === 'offset' ? 'all' : 'offset'))}
 className={`p-4 rounded-xl text-left border transition-all cursor-pointer space-y-2 select-none ${
 prodFilter === 'offset'
                ? 'bg-primary/10/70 border-primary/20 bg-primary/10 border-border ring-2 focus:ring-ring/30 shadow-xs'
                : 'bg-primary/10/40 border-primary/20 bg-primary/10 border-border/60 hover:border-border hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary text-white shadow-xs">
                  <Layers className="h-4.5 w-4.5"/>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-xs sm:text-sm text-foreground bangla-text">
                      {tBilingual('Offset Printing', 'অফসেট প্রিন্টিং')}
                    </h3>
                    {prodFilter === 'offset' && (
                      <Badge className="bg-primary text-white text-xs py-0 px-1">Active Filter</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Books, Packaging, Cartons, Memos, Pads</p>
                </div>
              </div>
              <Badge className="bg-primary text-white text-xs py-0.5 px-2">
                {safeData.segmentMetrics.offset.activeJobsCount} {tBilingual('Active', 'চলমান')}
              </Badge>
            </div>

            <div className="pt-2 border-t border-border border-border/80 flex items-center justify-between text-xs tabular-nums">
              <span className="text-muted-foreground">
                {tBilingual('Plates / CTP:', 'প্লেট / সিটিপি:')} <strong className="text-foreground">{safeData.segmentMetrics.offset.platesPending}</strong>
              </span>
              <span className="font-bold text-primary text-primary">
                {formatBDT(safeData.segmentMetrics.offset.todaySales)}
              </span>
            </div>
          </button>

          {/* Signage & Large Format Stream Card */}
          <button
 type="button"onClick={() => setProdFilter((prev) => (prev === 'signage' ? 'all' : 'signage'))}
 className={`p-4 rounded-xl text-left border transition-all cursor-pointer space-y-2 select-none ${
 prodFilter === 'signage'
                ? 'bg-warning-surface/70 border-warning-border bg-warning-surface/60 border-warning-border ring-2 focus:ring-ring/30 shadow-xs'
                : 'bg-warning-surface/40 border-warning-border bg-warning-surface border-warning-border/60 hover:border-warning-border hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-warning text-white shadow-xs">
                  <Gauge className="h-4.5 w-4.5"/>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-xs sm:text-sm text-foreground bangla-text">
                      {tBilingual('Signage & Large Format', 'সাইনেজ ও লার্জ ফরম্যাট')}
                    </h3>
                    {prodFilter === 'signage' && (
                      <Badge className="bg-warning text-white text-xs py-0 px-1">Active Filter</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Banner, Vinyl, Acrylic 3D, LED, Boards</p>
                </div>
              </div>
              <Badge className="bg-warning text-white text-xs py-0.5 px-2">
                {safeData.segmentMetrics.signage.activeJobsCount} {tBilingual('Active', 'চলমান')}
              </Badge>
            </div>

            <div className="pt-2 border-t border-warning-border border-warning-border/80 flex items-center justify-between text-xs tabular-nums">
              <span className="text-muted-foreground">
                {tBilingual('Volume:', 'সাইজ:')} <strong className="text-foreground">{safeData.segmentMetrics.signage.totalSqFt} sft</strong>
              </span>
              <span className="font-bold text-warning text-warning">
                {formatBDT(safeData.segmentMetrics.signage.todaySales)}
              </span>
            </div>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. CRITICAL RAW MATERIAL LOW-STOCK ACTION WATCHLIST                       */}
      {/* ========================================================================= */}
      {safeData.criticalStockAlerts && safeData.criticalStockAlerts.length > 0 && (
        <Card className="border-danger-border border-danger-border/60 bg-danger-surface/30 bg-danger-surface rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-destructive text-white">
                <AlertCircle className="h-4 w-4"/>
              </span>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-destructive text-destructive bangla-text">
                  {tBilingual('Critical Raw Material Shortage Alert', 'কাঁচামাল সংকট সতর্কতা (পেপার, ব্যানার, কালি ও প্লেট)')}
                </h3>
                <p className="text-xs text-destructive text-destructive text-destructive bangla-text">
                  {tBilingual('Items below minimum stock level that may stall print machine operations.', 'স্টক ফুরিয়ে যাওয়া কাঁচামাল যা চলমান উৎপাদন ব্যাহত করতে পারে।')}
                </p>
              </div>
            </div>

            <Button
 size="sm"onClick={() => setIsPurchaseModalOpen(true)}
 className="bg-destructive hover:bg-destructive text-white text-xs font-bold shrink-0 self-start sm:self-center">
              <Plus className="h-3.5 w-3.5 mr-1"/>
              {tBilingual('+ Buy Materials (Purchase PO)', '+ কাঁচামাল ক্রয় আদেশ')}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
            {safeData.criticalStockAlerts.map((mat) => (
              <div
 key={mat.id}
 className="p-2.5 bg-card rounded-xl border border-danger-border border-danger-border flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-foreground truncate">{mat.name}</div>
                  <div className="text-xs text-muted-foreground tabular-nums">
 SKU: {mat.sku} • Min: {mat.minStockLevel} {mat.unit}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <Badge className="bg-danger-surface text-destructive bg-destructive text-destructive tabular-nums text-xs py-0.5">
                    {mat.currentStock} {mat.unit} left
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 7. PRODUCTION TODAY (Floor Control & Work Pipeline)                        */}
      {/* ========================================================================= */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Printer className="h-4 w-4 text-primary"/>
                <CardTitle className="text-base font-bold bangla-text">
                  {tBilingual('Production Floor & Machine Runs', 'আজকের প্রোডাকশন ও মেশিন ফ্লোর')}
                </CardTitle>
                <Badge variant="outline"className="text-xs tabular-nums font-bold bg-primary/10 text-primary border-primary/20">
                  {safeData.productionSummary.activeCount} {tBilingual('Active', 'চলতি')}
                </Badge>
              </div>
              <CardDescription className="text-xs bangla-text">
                {tBilingual('Machine work and running orders', 'লাইভ মেশিন ফ্লোর রান, কিউ এবং কাজ সম্পন্নের অবস্থা')}
              </CardDescription>
            </div>

            {/* Stage Status Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {[
                { key: 'all', labelEn: 'All', labelBn: 'সকল' },
                { key: 'digital', labelEn: 'Digital', labelBn: 'ডিজিটাল' },
                { key: 'offset', labelEn: 'Offset', labelBn: 'অফসেট' },
                { key: 'signage', labelEn: 'Signage', labelBn: 'সাইনেজ' },
                { key: 'urgent', labelEn: 'Urgent', labelBn: 'জরুরি' },
                { key: 'finishing', labelEn: 'Finishing', labelBn: 'ফিনিশিং' },
              ].map((pill) => (
                <button
 key={pill.key}
 type="button"onClick={() => setProdFilter(pill.key as any)}
 className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
 prodFilter === pill.key
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-muted text-muted-foreground hover:bg-muted '
                  }`}
                >
                  <span>{tBilingual(pill.labelEn, pill.labelBn)}</span>
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-3">
          {filteredProductionJobs.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground bangla-text space-y-2">
              <p>{tBilingual('No production jobs matching this filter right now.', 'এই ক্যাটাগরিতে বর্তমানে কোনো কাজ বাকি নেই।')}</p>
              <Button
 size="sm"variant="outline"onClick={() => router.push(getTenantNavHref('/production', pathname, company?.slug))}
 className="text-xs font-bold">
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
 className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 transition-all bg-card ${
 isCritical
                        ? 'border-danger-border bg-danger-surface/20'
                        : isAtRisk
                        ? 'border-warning-border bg-warning-surface/20'
                        : 'border-border '
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="tabular-nums text-xs font-bold text-primary text-primary">
                          {job.jobNumber}
                        </span>
                        <div className="flex items-center gap-1">
                          {isCritical && (
                            <Badge className="bg-destructive text-white text-xs py-0 px-1.5">
                              {tBilingual('Critical', 'ঝুঁকিপূর্ণ')}
                            </Badge>
                          )}
                          <Badge variant="outline"className="text-xs py-0 capitalize">
                            {job.currentStage}
                          </Badge>
                        </div>
                      </div>

                      <h3 className="font-bold text-sm text-foreground bangla-text line-clamp-1">
                        {job.productName}
                      </h3>

                      <p className="text-xs text-muted-foreground bangla-text">
                        <strong>{job.customerName}</strong> • {job.quantity} {job.unit}
                      </p>

                      {job.blockedReason && (
                        <div className="text-xs text-warning text-warning font-semibold bg-warning-surface bg-warning-surface p-1.5 rounded flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 shrink-0"/>
                          <span className="truncate">{tBilingual(job.blockedReason, job.blockedReasonBn || job.blockedReason)}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3"/>
                        {job.deadline}
                      </span>
                      <Button
 size="sm"variant="ghost"onClick={() => router.push(getTenantNavHref('/production', pathname, company?.slug))}
 className="h-7 text-xs font-bold text-primary hover:text-primary p-0">
                        {tBilingual('Open Job', 'বিস্তারিত')} <ArrowRight className="h-3 w-3 ml-0.5"/>
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
      {/* 8. DELIVERY TODAY & MONEY TO COLLECT (Side by Side on Desktop)             */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 8A. DELIVERY TODAY */}
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary"/>
                <CardTitle className="text-base font-bold bangla-text">
                  {tBilingual('Delivery Today', 'আজকের ডেলিভারি ও গেট পাস')}
                </CardTitle>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <Badge variant="outline"className="bg-info-surface text-primary border-primary/20 font-bold">
                  {safeData.deliverySummary.outForDeliveryCount} {tBilingual('Out', 'রাস্তায়')}
                </Badge>
                <Badge variant="outline"className="bg-success-surface text-success border-success-border font-bold">
                  {safeData.deliverySummary.deliveredCount} {tBilingual('Done', 'ডেলিভার্ড')}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {safeData.deliverySummary.topDeliveries.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground bangla-text">
                {tBilingual('No pending deliveries scheduled for today.', 'আজকের জন্য কোনো ডেলিভারি বাকি নেই।')}
              </div>
            ) : (
              <div className="space-y-2">
                {safeData.deliverySummary.topDeliveries.map((del) => (
                  <div
 key={del.id}
 className="p-3 bg-muted rounded-xl border border-border flex items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5 tabular-nums font-bold text-primary">
                        <span>{del.challanNumber}</span>
                        {del.isDelayed && (
                          <Badge className="bg-destructive text-white text-xs py-0 px-1 font-sans">
                            {tBilingual('Delayed', 'বিলম্বিত')}
                          </Badge>
                        )}
                      </div>
                      <div className="font-bold text-foreground truncate">{del.customerName}</div>
                      <div className="text-xs text-muted-foreground truncate">{del.deliveryAddress}</div>
                    </div>

                    <Button
 size="sm"variant="outline"onClick={() => router.push(getTenantNavHref('/delivery', pathname, company?.slug))}
 className="h-8 text-xs font-semibold shrink-0">
                      {tBilingual('Details', 'বিস্তারিত')}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 8B. MONEY TO COLLECT (High Priority Overdue Receivables) */}
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-success"/>
                <CardTitle className="text-base font-bold bangla-text">
                  {tBilingual('Money to Collect', 'বকেয়া টাকা আদায়')}
                </CardTitle>
              </div>
              <Button
 size="sm"variant="ghost"onClick={() => router.push(getTenantNavHref('/billing?tab=due', pathname, company?.slug))}
 className="text-xs font-bold text-primary h-7">
                {tBilingual('View All Dues', 'সকল বাকি')} <ChevronRight className="h-3.5 w-3.5 ml-0.5"/>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {safeData.hasFinancialPermission === false || safeData.receivablesMetrics.isRestricted ? (
              <div className="py-6 text-center text-xs text-muted-foreground bangla-text">
                {tBilingual('Customer due data is restricted.', 'আর্থিক বাকি তথ্য দেখতে বিশেষ অনুমতি প্রয়োজন।')}
              </div>
            ) : safeData.moneyToCollect.length === 0 ? (
              <div className="py-6 text-center text-xs text-success font-semibold bangla-text">
                {tBilingual('All accounts are clear! No overdue invoices found.', 'সকল বাকি পরিশোধিত! কোনো মেয়াদোত্তীর্ণ বিল নেই।')}
              </div>
            ) : (
              <div className="space-y-2">
                {safeData.moneyToCollect.map((item) => (
                  <div
 key={item.invoiceId}
 className="p-3 bg-danger-surface/40 bg-danger-surface rounded-xl border border-danger-border border-danger-border flex items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground truncate">{item.customerName}</span>
                        <span className="tabular-nums text-xs text-primary">#{item.invoiceNumber}</span>
                      </div>
                      <div className="flex items-center gap-2 tabular-nums text-xs">
                        <span className="font-bold text-destructive text-sm">{formatBDT(item.dueAmount)}</span>
                        {item.daysOverdue > 0 && (
                          <Badge className="bg-danger-surface text-destructive bg-destructive text-destructive text-xs py-0">
                            {item.daysOverdue}d overdue
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.customerPhone && (
                        <>
                          <a
 href={`tel:${item.customerPhone}`}
 className="h-8 w-8 rounded-lg border border-input flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted transition-colors"title={tBilingual('Call Customer', 'কল করুন')}
                          >
                            <Phone className="h-3.5 w-3.5"/>
                          </a>

                          <Button
 size="sm"variant="outline"onClick={() => setReminderItem(item)}
 className="h-8 px-2 text-xs font-semibold text-success border-success-border hover:bg-success-surface"title={tBilingual('Send WhatsApp Reminder', 'হোয়াটসঅ্যাপ তাগাদা পাঠান')}
                          >
                            <MessageSquare className="h-3.5 w-3.5 mr-1"/>
                            <span className="hidden sm:inline">{tBilingual('Remind', 'তাগাদা')}</span>
                          </Button>
                        </>
                      )}

                      <Button
 size="sm"onClick={() => onOpenPaymentModal(item.invoiceId)}
 className="h-8 px-2.5 text-xs font-bold bg-success hover:bg-success text-white">
                        <DollarSign className="h-3.5 w-3.5 mr-0.5"/>
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
      {/* 9. WORKFLOW PIPELINE (New Work -> Delivered)                              */}
      {/* ========================================================================= */}
      <Card className="border-border shadow-xs bg-muted">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary"/>
              <CardTitle className="text-base font-bold bangla-text">
                {tBilingual('Workflow Pipeline', 'ব্যবসায়িক পাইপলাইন')}
              </CardTitle>
            </div>
            <span className="text-xs text-muted-foreground bangla-text hidden sm:inline">
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
            ].map((stage) => (
              <div
 key={stage.labelEn}
 onClick={() => router.push(getTenantNavHref(stage.route, pathname, company?.slug))}
 className="p-3 bg-card rounded-xl border border-border text-center cursor-pointer hover:border-border hover:shadow-xs transition-all space-y-1">
                <div className="text-xs text-muted-foreground font-semibold bangla-text">
                  {tBilingual(stage.labelEn, stage.labelBn)}
                </div>
                <div className="text-lg font-black text-foreground tabular-nums">
                  {num(stage.count)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* 10. BUSINESS TREND (7-Day Sales vs Collection Chart)                      */}
      {/* ========================================================================= */}
      {safeData.hasFinancialPermission !== false && (
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-bold bangla-text">
                  {trendDays === 7
                    ? tBilingual('Sales vs Collection (Past 7 Days)', 'বিক্রয় বনাম আদায় ট্রেন্ড (বিগত ৭ দিন)')
                    : tBilingual('Sales vs Collection (Past 30 Days)', 'বিক্রয় বনাম আদায় ট্রেন্ড (বিগত ৩০ দিন)')}
                </CardTitle>
                <CardDescription className="text-xs bangla-text">
                  {tBilingual('Authoritative daily financial trends in BDT', 'দৈনিক মোট বুকিং ও নগদ কালেকশনের তুলনা')}
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg border border-border">
                  <Button
                    type="button"
                    size="sm"
                    variant={trendDays === 7 ? 'default' : 'ghost'}
                    onClick={() => setTrendDays(7)}
                    className="h-7 px-2.5 text-xs font-semibold"
                  >
                    7D
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={trendDays === 30 ? 'default' : 'ghost'}
                    onClick={() => setTrendDays(30)}
                    className="h-7 px-2.5 text-xs font-semibold"
                  >
                    30D
                  </Button>
                </div>
                <div className="flex items-center gap-3 text-xs font-medium">
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary"/> {tBilingual('Sales', 'সেলস')}
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-success"/> {tBilingual('Collections', 'আদায়')}
                </span>
              </div>
            </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-64 w-full">
              <DashboardTrendChart data={activeTrendData} trendDays={trendDays} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 11. TOP 5 CUSTOMERS BY REVENUE                                            */}
      {/* ========================================================================= */}
      {safeData.hasFinancialPermission !== false && safeData.topCustomers.length > 0 && (
        <Card className="border-border shadow-xs bg-card">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-muted text-foreground">
                  <Award className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold bangla-text">
                    {tBilingual('Top 5 Customers by Revenue', 'শীর্ষ ৫ গ্রাহক (সর্বোচ্চ বিক্রয়)')}
                  </CardTitle>
                  <CardDescription className="text-xs bangla-text">
                    {tBilingual('Key customer accounts contributing to total sales volume and active receivables', 'ব্যবসার মূল কাস্টমার অ্যাকাউন্ট ও তাদের মোট বিক্রয় ও বকেয়া ব্যালেন্স')}
                  </CardDescription>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => router.push(getTenantNavHref('/customers', pathname, company?.slug))}
                className="h-8 text-xs font-semibold shrink-0"
              >
                <span>{tBilingual('View All Customers', 'সব গ্রাহক দেখুন')}</span>
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {safeData.topCustomers.map((cust, idx) => (
                <div
                  key={cust.customerId || cust.customerName || idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground">
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground truncate">
                          {cust.customerName}
                        </span>
                        {cust.companyName && (
                          <Badge variant="outline" className="text-xs font-normal text-muted-foreground border-border">
                            {cust.companyName}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="tabular-nums">
                          {cust.ordersCount} {tBilingual(cust.ordersCount === 1 ? 'order' : 'orders', 'টি অর্ডার')}
                        </span>
                        {cust.dueBalance > 0 && (
                          <span className="flex items-center gap-1 text-destructive font-medium tabular-nums">
                            • {tBilingual('Due:', 'বকেয়া:')} {formatBDT(cust.dueBalance)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pl-10 sm:pl-0">
                    <div className="text-left sm:text-right">
                      <div className="text-xs text-muted-foreground">
                        {tBilingual('Total Sales', 'মোট বিক্রয়')}
                      </div>
                      <div className="text-sm font-bold text-foreground tabular-nums">
                        {formatBDT(cust.totalSales)}
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const targetUrl = cust.customerId
                          ? `/customers/${cust.customerId}`
                          : `/customers?search=${encodeURIComponent(cust.customerName)}`
                        router.push(getTenantNavHref(targetUrl, pathname, company?.slug))
                      }}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      title={tBilingual('View Customer Details', 'গ্রাহকের বিস্তারিত দেখুন')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
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
            <div className="p-3 bg-muted rounded-lg text-xs tabular-nums border space-y-1">
              <div className="text-muted-foreground font-sans">{tBilingual('Message Preview:', 'বার্তা প্রিভিউ:')}</div>
              <div className="text-foreground whitespace-pre-line">
                {`আসসালামু আলাইকুম / আদাব ${reminderItem.customerName},\n${company?.name || 'প্রিন্টিং প্রেস'} থেকে আপনার ইনভয়েস #${reminderItem.invoiceNumber}-এর বকেয়া বিল ${formatBDT(reminderItem.dueAmount)} পরিশোধের জন্য বিনীত অনুরোধ করা যাচ্ছে।\nবিল পরিশোধের তারিখ ছিল: ${reminderItem.dueDate} (${reminderItem.daysOverdue} দিন অতিবাহিত)।\nবিকাশ মার্চেন্ট / নগদ / ব্যাংক একাউন্টে পেমেন্ট করে অনুগ্রহ করে ট্রানজেকশন আইডি আমাদের অবহিত করুন। ধন্যবাদ!`}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button type="button"variant="outline"size="sm"onClick={() => setReminderItem(null)} className="text-xs">
                {tBilingual('Cancel', 'বাতিল')}
              </Button>
              <Button
 type="button"size="sm"onClick={() => {
 window.open(getWhatsAppReminderUrl(reminderItem), '_blank')
 setReminderItem(null)
                }}
 className="bg-success hover:bg-success text-white text-xs font-bold">
                <MessageSquare className="h-4 w-4 mr-1.5"/>
                {tBilingual('Open in WhatsApp', 'হোয়াটসঅ্যাপে পাঠান')}
              </Button>
            </div>
          </div>
        </ModalDialog>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BUY MATERIALS (PURCHASE PO)                                        */}
      {/* ========================================================================= */}
      <NewPurchaseModal
 open={isPurchaseModalOpen}
 onOpenChange={setIsPurchaseModalOpen}
 onPurchaseCreated={() => {
 setIsPurchaseModalOpen(false)
 onRefresh?.()
        }}
      />
    </div>
  )
}
