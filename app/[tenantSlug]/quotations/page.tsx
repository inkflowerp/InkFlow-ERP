'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useParams, usePathname, useSearchParams } from 'next/navigation'
import {
 FileSpreadsheet,
 Plus,
 Search,
 CheckCircle2,
 AlertTriangle,
 Clock,
 DollarSign,
 TrendingUp,
 ArrowRight,
 Sparkles,
 ExternalLink,
 ShieldCheck,
 AlertOctagon,
 Printer,
 Send,
 MessageSquare,
 Calendar,
 RefreshCw,
 SlidersHorizontal,
 Trash2,
 Phone,
 ArrowUpRight,
 Activity,
 X,
 FileCheck2,
 Building,
 Calculator,
 Layers,
 ChevronRight,
 ChevronDown,
 Sliders,
 AlertCircle,
 HelpCircle,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useSubscription } from '@/hooks/use-subscription'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { FeatureGate } from '@/components/shared/feature-gate'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'
import { PageHeader } from '@/components/shared/page-header'
import { KpiCard, KpiGrid } from '@/components/shared/kpi-card'
import {
 QuotationRecord,
 QuotationStatus,
 normalizeQuotationRecord,
 extractQuotationsFromAny,
 deduplicateQuotations,
 isPurgedQuotation,
 PURGED_QUOTATION_IDENTIFIERS,
} from '@/types/quotation.types'
import * as QuotationService from '@/lib/quotations/quotation-utils'
import {
 getQuotationsAction,
 deleteQuotationAction,
 convertQuotationToJobOrderAction,
 convertQuotationToInvoiceAction,
} from '@/actions/quotation.actions'
import { moveToTrashAction } from '@/actions/trash.actions'
import { QuotationTable } from '@/components/quotations/quotation-table'
import { FollowUpModal } from '@/components/quotations/follow-up-modal'
import { NewQuotationModal } from '@/components/quotations/new-quotation-modal'
import { PrintFlowDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import { formatBDT } from '@/lib/formatters'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { dispatchToast } from '@/components/shared/toast-feedback'
import { cn } from '@/lib/utils'

export type QuotationPeriod = 'this_month' | 'this_week' | 'today' | 'all_time' | 'custom'
export type QuotationTab = 'quotations' | 'attention'
export type PipelinePriorityTab = 'all' | 'expiring' | 'follow_up' | 'high_value'

export interface QuotationOverviewMetrics {
 period: QuotationPeriod
 periodLabel: string
 startDate: string
 endDate: string
 totalPipelineValue: number
 totalCount: number
 wonValue: number
 wonCount: number
 pendingValue: number
 pendingCount: number
 expiringValue: number
 expiringCount: number
 avgDealValue: number
 avgMargin: number
 winRate: number
 expectedAdvance: number
 activeCount: number
}

export interface QuotationPriorityItem {
 id: string
 quotationNumber: string
 customerId?: string
 customerName: string
 customerCompany?: string
 customerPhone?: string
 quotationDate: string
 validUntil: string
 grandTotal: number
 urgency: 'critical' | 'warning' | 'high_value' | 'follow_up'
 urgencyLabel: string
 daysLeft?: number
 itemsSummary: string
 status: QuotationStatus
 quotation: QuotationRecord
}

function getTodayDateStr(): string {
 try {
 return new Intl.DateTimeFormat('en-CA', {
 timeZone: 'Asia/Dhaka',
 year: 'numeric',
 month: '2-digit',
 day: '2-digit',
    }).format(new Date())
  } catch {
 return new Date().toISOString().split('T')[0]
  }
}

/**
 * Resilient multi-tier extraction of local quotation records.
 * Scans candidate storage keys, wildcard localStorage, and DataStore partitions.
 */
function getLocalQuotations(slug?: string, companySlug?: string, companyId?: string): QuotationRecord[] {
 if (typeof window === 'undefined') return []
 const rawList: any[] = []

 const candidateKeys = [
 slug ? `${STORAGE_KEYS.QUOTATIONS}__${slug}` : null,
 companySlug && companySlug !== slug ? `${STORAGE_KEYS.QUOTATIONS}__${companySlug}` : null,
 companyId ? `${STORAGE_KEYS.QUOTATIONS}__${companyId}` : null,
  ].filter(Boolean) as string[]

 candidateKeys.forEach((key) => {
 try {
 const raw = localStorage.getItem(key)
 if (raw) {
 const extracted = extractQuotationsFromAny(raw)
 if (extracted.length > 0) rawList.push(...extracted)
      }
    } catch {}
  })

  // Direct DataStore reads strictly scoped to tenant
 const storeItems = [
    ...(slug ? (PrintFlowDataStore.getAll<QuotationRecord>(STORAGE_KEYS.QUOTATIONS, slug) || []) : []),
    ...(companySlug && companySlug !== slug ? (PrintFlowDataStore.getAll<QuotationRecord>(STORAGE_KEYS.QUOTATIONS, companySlug) || []) : []),
    ...(companyId ? (PrintFlowDataStore.getAll<QuotationRecord>(STORAGE_KEYS.QUOTATIONS, companyId) || []) : []),
  ]
 rawList.push(...storeItems)

 return deduplicateQuotations(rawList, companyId, slug)
}

/**
 * Removes a quotation from tenant-scoped localStorage keys and local DataStore caches
 */
function removeLocalQuotation(id: string, quotationNumber?: string, slug?: string, companySlug?: string, companyId?: string) {
 if (typeof window === 'undefined') return
 try {
  if (id) PURGED_QUOTATION_IDENTIFIERS.add(String(id).toUpperCase())
  if (quotationNumber) PURGED_QUOTATION_IDENTIFIERS.add(String(quotationNumber).toUpperCase())
 const candidateKeys = [
 slug ? `${STORAGE_KEYS.QUOTATIONS}__${slug}` : null,
 companySlug && companySlug !== slug ? `${STORAGE_KEYS.QUOTATIONS}__${companySlug}` : null,
 companyId ? `${STORAGE_KEYS.QUOTATIONS}__${companyId}` : null,
    ].filter(Boolean) as string[]

 candidateKeys.forEach((key) => {
 try {
 const raw = localStorage.getItem(key)
 if (raw) {
 const parsed = JSON.parse(raw)
 if (Array.isArray(parsed)) {
 const filtered = parsed.filter(
              (q: any) => q?.id !== id && (!quotationNumber || q?.quotation_number !== quotationNumber)
            )
 localStorage.setItem(key, JSON.stringify(filtered))
          }
        }
      } catch {}
    })

  PrintFlowDataStore.removeItem(STORAGE_KEYS.QUOTATIONS, id)
  if (slug) PrintFlowDataStore.removeItem(STORAGE_KEYS.QUOTATIONS, id, slug)
  if (companySlug && companySlug !== slug) PrintFlowDataStore.removeItem(STORAGE_KEYS.QUOTATIONS, id, companySlug)
  if (companyId) PrintFlowDataStore.removeItem(STORAGE_KEYS.QUOTATIONS, id, companyId)

  // Filter out any matching records by quotation number as well
  const unpartitioned = (PrintFlowDataStore.get<any[]>(STORAGE_KEYS.QUOTATIONS) || []).filter(
   (q) => q.id !== id && (!quotationNumber || q.quotation_number !== quotationNumber)
  )
  PrintFlowDataStore.set(STORAGE_KEYS.QUOTATIONS, unpartitioned)

  if (slug) {
   const pList = (PrintFlowDataStore.get<any[]>(STORAGE_KEYS.QUOTATIONS, slug) || []).filter(
    (q) => q.id !== id && (!quotationNumber || q.quotation_number !== quotationNumber)
   )
   PrintFlowDataStore.set(STORAGE_KEYS.QUOTATIONS, pList, true, slug)
  }
  if (companySlug && companySlug !== slug) {
   const pList = (PrintFlowDataStore.get<any[]>(STORAGE_KEYS.QUOTATIONS, companySlug) || []).filter(
    (q) => q.id !== id && (!quotationNumber || q.quotation_number !== quotationNumber)
   )
   PrintFlowDataStore.set(STORAGE_KEYS.QUOTATIONS, pList, true, companySlug)
  }
  if (companyId) {
   const pList = (PrintFlowDataStore.get<any[]>(STORAGE_KEYS.QUOTATIONS, companyId) || []).filter(
    (q) => q.id !== id && (!quotationNumber || q.quotation_number !== quotationNumber)
   )
   PrintFlowDataStore.set(STORAGE_KEYS.QUOTATIONS, pList, true, companyId)
  }
 } catch {}
}

/**
 * Reactive calculation of commercial sales metrics, priority items, and sector distribution
 */
function calculateQuotationOverview(
 quotations: QuotationRecord[],
 period: QuotationPeriod,
 customRange?: { start: string; end: string }
): {
 metrics: QuotationOverviewMetrics
 priorityItems: QuotationPriorityItem[]
 sectorBreakdown: Array<{ id: string; labelEn: string; labelBn: string; count: number; value: number; icon: string }>
} {
 const todayStr = getTodayDateStr()
 let startDate = todayStr
 let endDate = todayStr
 let periodLabel = 'This Month'

 if (period === 'today') {
 startDate = todayStr
 endDate = todayStr
 periodLabel = 'Today'
  } else if (period === 'this_week') {
 const d = new Date()
 const day = d.getDay()
 const diff = d.getDate() - day + (day === 0 ? -6 : 1)
 const monday = new Date(new Date().setDate(diff))
 try {
 startDate = new Intl.DateTimeFormat('en-CA', {
 timeZone: 'Asia/Dhaka',
 year: 'numeric',
 month: '2-digit',
 day: '2-digit',
      }).format(monday)
    } catch {
 startDate = monday.toISOString().split('T')[0]
    }
 endDate = todayStr
 periodLabel = 'This Week'
  } else if (period === 'this_month') {
 startDate = `${todayStr.slice(0, 7)}-01`
 endDate = todayStr
 periodLabel = 'This Month'
  } else if (period === 'all_time') {
 startDate = '2000-01-01'
 endDate = todayStr
 periodLabel = 'All Time'
  } else if (period === 'custom' && customRange) {
 startDate = customRange.start || `${todayStr.slice(0, 7)}-01`
 endDate = customRange.end || todayStr
 periodLabel = 'Custom Date'
  }

  // Filter quotations created in this period
 const periodQuotations = quotations.filter((q) => {
 if (period === 'all_time') return true
 const qDate = q.quotation_date || q.created_at?.slice(0, 10) || todayStr
 return qDate >= startDate && qDate <= endDate
  })

 const totalCount = periodQuotations.length

  // Active proposals: in negotiation, sent, approved, draft, etc. (excluding rejected/expired/converted)
 const activePeriodQuotes = periodQuotations.filter(
    (q) => q.status !== 'converted' && q.status !== 'rejected' && q.status !== 'expired'
  )
 const totalPipelineValue = activePeriodQuotes.reduce((sum, q) => sum + (Number(q.grand_total) || 0), 0)
 const activeCount = activePeriodQuotes.length

  // Converted / Won
 const wonQuotes = periodQuotations.filter((q) => q.status === 'converted' || q.status === 'approved')
 const wonValue = wonQuotes.reduce((sum, q) => sum + (Number(q.grand_total) || 0), 0)
 const wonCount = wonQuotes.length

  // Pending reply
 const pendingQuotes = periodQuotations.filter(
    (q) => q.status === 'sent' || q.status === 'viewed' || q.status === 'negotiation' || q.status === 'draft'
  )
 const pendingValue = pendingQuotes.reduce((sum, q) => sum + (Number(q.grand_total) || 0), 0)
 const pendingCount = pendingQuotes.length

  // Expiring soon in active pipeline
 const expiringQuotes = quotations.filter((q) => {
 if (q.status === 'converted' || q.status === 'rejected' || q.status === 'expired') return false
 const exp = QuotationService.calculateExpiryUrgency(q.valid_until)
 return exp.urgency === 'critical' || exp.urgency === 'warning'
  })
 const expiringValue = expiringQuotes.reduce((sum, q) => sum + (Number(q.grand_total) || 0), 0)
 const expiringCount = expiringQuotes.length

  // Averages
 const avgDealValue = totalCount > 0
    ? Math.round(periodQuotations.reduce((sum, q) => sum + (Number(q.grand_total) || 0), 0) / totalCount)
    : 0

 const avgMargin = periodQuotations.length > 0
    ? Math.round(periodQuotations.reduce((sum, q) => sum + (q.margin_percent || 40), 0) / periodQuotations.length)
    : 40

 const winRate = totalCount > 0 ? Math.min(100, Math.round((wonCount / totalCount) * 100)) : 0
 const expectedAdvance = Math.round(totalPipelineValue * 0.5)

 const metrics: QuotationOverviewMetrics = {
 period,
 periodLabel,
 startDate,
 endDate,
 totalPipelineValue,
 totalCount,
 wonValue,
 wonCount,
 pendingValue,
 pendingCount,
 expiringValue,
 expiringCount,
 avgDealValue,
 avgMargin,
 winRate,
 expectedAdvance,
 activeCount,
  }

  // Priority Action Hub Items across all active quotations
 const priorityItems: QuotationPriorityItem[] = []
 const seenIds = new Set<string>()

  // 1. Critical Expiry (Expires today or tomorrow)
 const criticalExpiring = quotations.filter((q) => {
 if (q.status === 'converted' || q.status === 'rejected' || q.status === 'expired') return false
 const exp = QuotationService.calculateExpiryUrgency(q.valid_until)
 return exp.urgency === 'critical'
  })

 criticalExpiring.forEach((q) => {
 if (!seenIds.has(q.id)) {
 seenIds.add(q.id)
 const exp = QuotationService.calculateExpiryUrgency(q.valid_until)
 const itemsSummary = Array.isArray(q.items) && q.items.length > 0
        ? q.items.map((it) => it.description).slice(0, 2).join(', ') + (q.items.length > 2 ? ` (+${q.items.length - 2} items)` : '')
        : 'Commercial Proposal'
 priorityItems.push({
 id: q.id,
 quotationNumber: q.quotation_number,
 customerId: q.customer_id || undefined,
 customerName: q.customer_name,
 customerCompany: q.customer_company || undefined,
 customerPhone: q.customer_whatsapp || q.customer_phone || undefined,
 quotationDate: q.quotation_date,
 validUntil: q.valid_until,
 grandTotal: Number(q.grand_total) || 0,
 urgency: 'critical',
 urgencyLabel: exp.label.toUpperCase(),
 daysLeft: exp.daysLeft,
 itemsSummary,
 status: q.status,
 quotation: q,
      })
    }
  })

  // 2. Scheduled Follow-up Today or Overdue
 const todayDate = new Date()
 todayDate.setHours(0, 0, 0, 0)
 const followUpDue = quotations.filter((q) => {
 if (q.status === 'converted' || q.status === 'rejected' || q.status === 'expired') return false
 if (q.follow_up_date) {
 const d = QuotationService.parseDateSafe(q.follow_up_date)
 d.setHours(0, 0, 0, 0)
 return d <= todayDate
    }
 return false
  })

 followUpDue.forEach((q) => {
 if (!seenIds.has(q.id)) {
 seenIds.add(q.id)
 const itemsSummary = Array.isArray(q.items) && q.items.length > 0
        ? q.items.map((it) => it.description).slice(0, 2).join(', ') + (q.items.length > 2 ? ` (+${q.items.length - 2} items)` : '')
        : 'Commercial Proposal'
 priorityItems.push({
 id: q.id,
 quotationNumber: q.quotation_number,
 customerId: q.customer_id || undefined,
 customerName: q.customer_name,
 customerCompany: q.customer_company || undefined,
 customerPhone: q.customer_whatsapp || q.customer_phone || undefined,
 quotationDate: q.quotation_date,
 validUntil: q.valid_until,
 grandTotal: Number(q.grand_total) || 0,
 urgency: 'follow_up',
 urgencyLabel: 'FOLLOW-UP SCHEDULED',
 itemsSummary,
 status: q.status,
 quotation: q,
      })
    }
  })

  // 3. High Value Active Proposals (>= ৳25,000)
 const highValue = quotations
    .filter((q) => {
 if (q.status === 'converted' || q.status === 'rejected' || q.status === 'expired') return false
 return Number(q.grand_total || 0) >= 25000
    })
    .sort((a, b) => Number(b.grand_total || 0) - Number(a.grand_total || 0))

 highValue.forEach((q) => {
 if (!seenIds.has(q.id)) {
 seenIds.add(q.id)
 const itemsSummary = Array.isArray(q.items) && q.items.length > 0
        ? q.items.map((it) => it.description).slice(0, 2).join(', ') + (q.items.length > 2 ? ` (+${q.items.length - 2} items)` : '')
        : 'Commercial Proposal'
 priorityItems.push({
 id: q.id,
 quotationNumber: q.quotation_number,
 customerId: q.customer_id || undefined,
 customerName: q.customer_name,
 customerCompany: q.customer_company || undefined,
 customerPhone: q.customer_whatsapp || q.customer_phone || undefined,
 quotationDate: q.quotation_date,
 validUntil: q.valid_until,
 grandTotal: Number(q.grand_total) || 0,
 urgency: 'high_value',
 urgencyLabel: 'HIGH VALUE DEAL',
 itemsSummary,
 status: q.status,
 quotation: q,
      })
    }
  })

  // 4. Warning Expiry (Expires in 2-3 days)
 const warningExpiring = quotations.filter((q) => {
 if (q.status === 'converted' || q.status === 'rejected' || q.status === 'expired') return false
 const exp = QuotationService.calculateExpiryUrgency(q.valid_until)
 return exp.urgency === 'warning'
  })

 warningExpiring.forEach((q) => {
 if (!seenIds.has(q.id)) {
 seenIds.add(q.id)
 const exp = QuotationService.calculateExpiryUrgency(q.valid_until)
 const itemsSummary = Array.isArray(q.items) && q.items.length > 0
        ? q.items.map((it) => it.description).slice(0, 2).join(', ') + (q.items.length > 2 ? ` (+${q.items.length - 2} items)` : '')
        : 'Commercial Proposal'
 priorityItems.push({
 id: q.id,
 quotationNumber: q.quotation_number,
 customerId: q.customer_id || undefined,
 customerName: q.customer_name,
 customerCompany: q.customer_company || undefined,
 customerPhone: q.customer_whatsapp || q.customer_phone || undefined,
 quotationDate: q.quotation_date,
 validUntil: q.valid_until,
 grandTotal: Number(q.grand_total) || 0,
 urgency: 'warning',
 urgencyLabel: exp.label.toUpperCase(),
 daysLeft: exp.daysLeft,
 itemsSummary,
 status: q.status,
 quotation: q,
      })
    }
  })

  // Sector breakdown
 const sectorMap: Record<string, { count: number; value: number }> = {
 digital_print: { count: 0, value: 0 },
 offset_print: { count: 0, value: 0 },
 signage_fabrication: { count: 0, value: 0 },
 ready_merchandise: { count: 0, value: 0 },
  }

 periodQuotations.forEach((q) => {
 const sec = QuotationService.getSectorForQuotation(q)
 const val = Number(q.grand_total) || 0
 if (sectorMap[sec]) {
 sectorMap[sec].count++
 sectorMap[sec].value += val
    } else {
 sectorMap.digital_print.count++
 sectorMap.digital_print.value += val
    }
  })

 const sectorBreakdown = [
    {
 id: 'digital_print',
 labelEn: 'Digital Flex / Vinyl',
 labelBn: 'ডিজিটাল ব্যানার ও স্টিকার',
 count: sectorMap.digital_print.count,
 value: sectorMap.digital_print.value,
 icon: '🎨',
    },
    {
 id: 'offset_print',
 labelEn: 'Offset Press',
 labelBn: 'অফসেট প্রিন্টিং ও প্রকাশনা',
 count: sectorMap.offset_print.count,
 value: sectorMap.offset_print.value,
 icon: '📑',
    },
    {
 id: 'signage_fabrication',
 labelEn: '3D Signage & Fabrication',
 labelBn: '৩ডি সাইনেজ ও ফেব্রিকেশন',
 count: sectorMap.signage_fabrication.count,
 value: sectorMap.signage_fabrication.value,
 icon: '💡',
    },
    {
 id: 'ready_merchandise',
 labelEn: 'Gift & Merchandise',
 labelBn: 'কাস্টম উপহার ও মার্চেন্ডাইজ',
 count: sectorMap.ready_merchandise.count,
 value: sectorMap.ready_merchandise.value,
 icon: '🎁',
    },
  ]

 return { metrics, priorityItems, sectorBreakdown }
}

export default function QuotationsPage() {
 const params = useParams()
 const pathname = usePathname()
 const searchParams = useSearchParams()
 const { company } = useTenant()
 const { checkCanCreate, openLimitExceededModal } = useSubscription()
 const { tBilingual, locale } = useI18n()
 const slug = (params?.tenantSlug as string) || company?.slug || 'classic-printer'

 const [isMounted, setIsMounted] = useState(false)

  // Primary dataset & state
 const [quotations, setQuotations] = useState<QuotationRecord[]>([])
 const [isLoading, setIsLoading] = useState(true)
 const [isRefreshing, setIsRefreshing] = useState(false)
 const [error, setError] = useState<string | null>(null)
 const [notification, setNotification] = useState<string | null>(null)

  // Navigation tab
 const [activeTab, setActiveTab] = useState<QuotationTab>('quotations')

  // Date period filters (URL-synced)
  const [selectedPeriod, setSelectedPeriod] = useState<QuotationPeriod>(() => {
    const p = searchParams?.get('period') as QuotationPeriod
    return p && ['today', 'this_week', 'this_month', 'all_time', 'custom'].includes(p) ? p : 'this_month'
  })
  const [customStartDate, setCustomStartDate] = useState<string>(() => `${getTodayDateStr().slice(0, 7)}-01`)
  const [customEndDate, setCustomEndDate] = useState<string>(() => getTodayDateStr())

  // Overview Action Hub priority tab
  const [priorityTab, setPriorityTab] = useState<PipelinePriorityTab>('all')

  // Directory search & filters (URL-synced)
  const [search, setSearch] = useState(() => searchParams?.get('q') || searchParams?.get('search') || '')
  const [selectedFilter, setSelectedFilter] = useState<string>(() => searchParams?.get('status') || 'all')
  const [sectorFilter, setSectorFilter] = useState<'all' | 'digital_print' | 'offset_print' | 'signage_fabrication' | 'ready_merchandise'>('all')

  // Modals state
 const [isNewOpen, setIsNewOpen] = useState(false)
 const [followUpQuote, setFollowUpQuote] = useState<QuotationRecord | null>(null)
 const [isFollowUpOpen, setIsFollowUpOpen] = useState(false)

  // Trash confirm modal
 const [quoteToTrash, setQuoteToTrash] = useState<QuotationRecord | null>(null)
 const [isTrashConfirmOpen, setIsTrashConfirmOpen] = useState(false)
 const [isTrashing, setIsTrashing] = useState(false)

  // Auto-open modal if arrived with ?new=true
 useEffect(() => {
 if (searchParams?.get('new') === 'true') {
 setIsNewOpen(true)
    }
  }, [searchParams])

 const showNotification = (msg: string, type: 'success' | 'info' | 'error' = 'success') => {
 setNotification(msg)
 dispatchToast({
 type,
 title: type === 'error' ? 'Error' : type === 'info' ? 'Notice' : 'Success',
 titleBn: type === 'error' ? 'ত্রুটি' : type === 'info' ? 'বিজ্ঞপ্তি' : 'সফল হয়েছে',
 message: msg,
    })
 setTimeout(() => setNotification(null), 4000)
  }

  // Resilient data loading with zero ৳ 0 flicker and no disappearing records
 const loadQuotationsData = useCallback(async (isSilent = false) => {
 if (!isSilent) setIsLoading(true)
 setIsRefreshing(true)
 setError(null)

 try {
      // 1. Instantly populate from local storage so UI never waits
 const localList = getLocalQuotations(slug, company?.slug, company?.id)
 if (localList.length > 0) {
 setQuotations((prev) => deduplicateQuotations([...prev, ...localList], company?.id, slug))
      }

      // 2. Fetch authoritative data from server
      const res = await getQuotationsAction(company?.id, slug)
      if (res.success && Array.isArray(res.data)) {
        try {
          for (const serverQuote of res.data) {
            if (slug) PrintFlowDataStore.addItem(STORAGE_KEYS.QUOTATIONS, serverQuote, slug, false)
            if (company?.slug && company.slug !== slug) PrintFlowDataStore.addItem(STORAGE_KEYS.QUOTATIONS, serverQuote, company.slug, false)
            if (company?.id) PrintFlowDataStore.addItem(STORAGE_KEYS.QUOTATIONS, serverQuote, company.id, false)
          }
        } catch {}

        // Authoritative server records take precedence. Only retain unsynced offline drafts from local storage.
        const serverIds = new Set(res.data.map((q) => q.id))
        const serverNums = new Set(res.data.map((q) => q.quotation_number).filter(Boolean))
        const unsyncedDrafts = localList.filter((q) => {
          if (isPurgedQuotation(q)) return false
          if (serverIds.has(q.id)) return false
          if (q.quotation_number && serverNums.has(q.quotation_number)) return false
          return String(q.id).startsWith('temp-') || String(q.id).startsWith('draft-') || Boolean((q as any).is_offline)
        })

        setQuotations(deduplicateQuotations([...res.data, ...unsyncedDrafts], company?.id, slug))
      } else if (res.error) {
        console.warn('[Quotations] Server fetch notice:', res.error)
      }
    } catch (err: any) {
 console.warn('[Quotations] Server fetch exception:', err)
    } finally {
 setIsLoading(false)
 setIsRefreshing(false)
    }
  }, [company?.id, company?.slug, slug])

 useEffect(() => {
 setIsMounted(true)
 loadQuotationsData(false)

 const handleSync = () => {
 loadQuotationsData(true)
    }

 if (typeof window !== 'undefined') {
 window.addEventListener('storage', handleSync)
 window.addEventListener('printflow_datastore_sync', handleSync)
 window.addEventListener('printflow_drafts_updated', handleSync)
 window.addEventListener('printflow_table_synced:quotations', handleSync)
 window.addEventListener('printflow_table_synced', handleSync)
 window.addEventListener('printflow_data_sync', handleSync)

 return () => {
 window.removeEventListener('storage', handleSync)
 window.removeEventListener('printflow_datastore_sync', handleSync)
 window.removeEventListener('printflow_drafts_updated', handleSync)
 window.removeEventListener('printflow_table_synced:quotations', handleSync)
 window.removeEventListener('printflow_table_synced', handleSync)
 window.removeEventListener('printflow_data_sync', handleSync)
      }
    }
  }, [loadQuotationsData])

  // Reactive calculations for the selected period
 const overviewData = useMemo(() => {
 return calculateQuotationOverview(quotations, selectedPeriod, {
 start: customStartDate,
 end: customEndDate,
    })
  }, [quotations, selectedPeriod, customStartDate, customEndDate])

 const { metrics: effectiveMetrics, priorityItems, sectorBreakdown } = overviewData

  // Filtered priority items in Action Hub
 const filteredPriorityItems = useMemo(() => {
 if (priorityTab === 'all') return priorityItems
 if (priorityTab === 'expiring') {
 return priorityItems.filter((it) => it.urgency === 'critical' || it.urgency === 'warning')
    }
 if (priorityTab === 'follow_up') {
 return priorityItems.filter((it) => it.urgency === 'follow_up')
    }
 if (priorityTab === 'high_value') {
 return priorityItems.filter((it) => it.urgency === 'high_value' || it.grandTotal >= 25000)
    }
 return priorityItems
  }, [priorityItems, priorityTab])

  // Sector Counts for Tab Badges
 const sectorCounts = useMemo(() => {
 const counts = {
 all: quotations.length,
 digital_print: 0,
 offset_print: 0,
 signage_fabrication: 0,
 ready_merchandise: 0,
    }
 quotations.forEach((q) => {
 const sec = QuotationService.getSectorForQuotation(q)
 if (sec === 'digital_print') counts.digital_print++
 else if (sec === 'offset_print') counts.offset_print++
 else if (sec === 'signage_fabrication') counts.signage_fabrication++
 else if (sec === 'ready_merchandise') counts.ready_merchandise++
 else counts.digital_print++
    })
 return counts
  }, [quotations])

  // Filtered quotations in the Directory table
 const filteredQuotations = useMemo(() => {
 const today = new Date()
 today.setHours(0, 0, 0, 0)

 return quotations.filter((q) => {
      // 1. Search filter
 const term = search.toLowerCase().trim()
 const qNum = (q.quotation_number || '').toLowerCase()
 const qCust = (q.customer_name || '').toLowerCase()
 const qComp = (q.customer_company || '').toLowerCase()
 const qSales = (q.salesperson_name || '').toLowerCase()
 const qPhone = q.customer_phone || ''
 const matchSearch =
        !term ||
 qNum.includes(term) ||
 qCust.includes(term) ||
 qComp.includes(term) ||
 qSales.includes(term) ||
 qPhone.includes(term) ||
        (Array.isArray(q.items) && q.items.some((it) => (it?.description || '').toLowerCase().includes(term)))

 if (!matchSearch) return false

      // 3. Status filter
 if (selectedFilter === 'all') return true
 if (selectedFilter === 'active') {
 return q.status !== 'converted' && q.status !== 'rejected' && q.status !== 'expired'
      }
 if (selectedFilter === 'follow_up_today') {
 if (q.follow_up_date) {
 const d = QuotationService.parseDateSafe(q.follow_up_date)
 d.setHours(0, 0, 0, 0)
 return d <= today
        }
 return false
      }
 if (selectedFilter === 'expiring_soon') {
 const exp = QuotationService.calculateExpiryUrgency(q.valid_until)
 return exp.urgency === 'critical' || exp.urgency === 'warning'
      }
 if (selectedFilter === 'awaiting_reply') {
 return q.status === 'sent' || q.status === 'viewed'
      }

 return q.status === selectedFilter
    })
  }, [quotations, search, selectedFilter, sectorFilter])

  // Actions
 const handleOpenFollowUp = (quote: QuotationRecord) => {
 setFollowUpQuote(quote)
 setIsFollowUpOpen(true)
  }

 const handleFollowUpSaved = (updatedQuote: QuotationRecord) => {
 showNotification(`Follow-up logged for #${updatedQuote.quotation_number}.`, 'success')
 setQuotations((prev) => {
 const list = [...prev]
 const idx = list.findIndex((q) => q.id === updatedQuote.id || q.quotation_number === updatedQuote.quotation_number)
 if (idx >= 0) list[idx] = updatedQuote
 else list.unshift(updatedQuote)
 return list
    })
 loadQuotationsData(true)
  }

 const handleQuotationCreated = (quote: QuotationRecord) => {
 showNotification(`Quotation #${quote.quotation_number} created successfully.`, 'success')
 setQuotations((prev) => {
 const list = [...prev]
 const idx = list.findIndex((q) => q.id === quote.id || q.quotation_number === quote.quotation_number)
 if (idx >= 0) list[idx] = quote
 else list.unshift(quote)
 return list
    })
 loadQuotationsData(true)
  }

 const handleTrashQuotation = (quote: QuotationRecord) => {
 setQuoteToTrash(quote)
 setIsTrashConfirmOpen(true)
  }

  const confirmTrashQuotation = async () => {
    if (!quoteToTrash) return
    setIsTrashing(true)
    const targetQuote = quoteToTrash
    const targetId = targetQuote.id
    const targetNum = targetQuote.quotation_number

    try {
      // 1. Purge from browser localStorage and client DataStore across all keys immediately
      removeLocalQuotation(targetId, targetNum, slug, company?.slug, company?.id)

      // 2. Update local state immediately so UI updates without lag
      setQuotations((prev) =>
        prev.filter((q) => q.id !== targetId && (!targetNum || q.quotation_number !== targetNum))
      )

      // 3. Move to Trash / Recycle Bin on server
      const res = await moveToTrashAction('quotations', targetQuote, company?.id, slug)

      // 4. Explicitly invoke deleteQuotationAction to ensure deletion from active DB
      const delRes = await deleteQuotationAction(targetId, targetNum, company?.id, slug).catch((err: any) => ({
        success: false,
        error: err?.message,
      }))

      if (!res.success && !delRes.success) {
        showNotification(res.error || delRes.error || 'Error deleting quotation.', 'error')
        loadQuotationsData(true)
        return
      }

      // 5. Sync to client TRASH_ITEMS so Trash page sees it immediately
      if (res.success && res.record) {
        const localTrash = PrintFlowDataStore.get<any[]>(STORAGE_KEYS.TRASH_ITEMS) || []
        PrintFlowDataStore.set(STORAGE_KEYS.TRASH_ITEMS, [res.record, ...localTrash.filter((t: any) => t.id !== res.record.id)])
      }

      setIsTrashConfirmOpen(false)
      setQuoteToTrash(null)
      showNotification(`Quotation #${targetNum} moved to Trash.`, 'success')

      // 6. Silently reload to ensure sync
      loadQuotationsData(true)
    } catch (err: any) {
      showNotification(err.message || 'Error moving quotation to trash.', 'error')
    } finally {
      setIsTrashing(false)
    }
  }

 const handleSendWhatsApp = (quote: QuotationRecord) => {
 const phone = quote.customer_whatsapp || quote.customer_phone
 if (!phone) {
 showNotification('Customer phone number is missing.', 'error')
 return
    }
 const msg = QuotationService.generateBangladeshiQuotationWhatsAppMessage(quote, company?.name || 'PrintFlow')
 const cleanPhone = phone.replace(/\D/g, '')
 const formattedPhone = cleanPhone.startsWith('880')
      ? cleanPhone
      : cleanPhone.startsWith('0')
      ? `88${cleanPhone}`
      : `880${cleanPhone}`
 window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`, '_blank')
 showNotification(`WhatsApp proposal opened for #${quote.quotation_number}.`, 'info')
  }

 const handleConvertToOrder = async (quote: QuotationRecord) => {
 try {
 showNotification('Converting quotation to Job Order...')
 const res = await convertQuotationToJobOrderAction(quote.id, undefined, company?.id)
 if (res.success && res.data) {
 showNotification(`Converted to Job Order #${res.data.order_number}!`, 'success')
 loadQuotationsData(true)
      } else {
 showNotification(res.error || 'Failed to convert quotation.', 'error')
      }
    } catch (err: any) {
 showNotification(err.message || 'Error converting quotation.', 'error')
    }
  }

  // Calculate health tier from win rate
 const winRateNum = Number(effectiveMetrics?.winRate || 0)
 const healthTier =
    winRateNum >= 50
      ? { labelEn: 'Optimal Flow', labelBn: 'চমৎকার অগ্রগতি', color: 'text-success', bar: 'bg-success' }
      : winRateNum >= 25
      ? { labelEn: 'Steady Pace', labelBn: 'স্থিতিশীল গতি', color: 'text-primary', bar: 'bg-primary' }
      : { labelEn: 'Needs Follow-up', labelBn: 'অনুসরণ প্রয়োজন', color: 'text-warning', bar: 'bg-warning' }

  // Directory filter tabs
 const directoryFilterTabs = [
    { id: 'all', labelEn: 'All', labelBn: 'সকল কোটেশন', count: quotations.length },
    { id: 'active', labelEn: 'Active Pipeline', labelBn: 'চলতি পাইপলাইন', count: effectiveMetrics.activeCount },
    {
 id: 'follow_up_today',
 labelEn: 'Follow-Up Today',
 labelBn: 'আজকের ফলো-আপ',
 count: priorityItems.filter((it) => it.urgency === 'follow_up').length,
 badgeColor: 'bg-warning-surface text-warning font-bold',
    },
    {
 id: 'expiring_soon',
 labelEn: 'Expiring Soon',
 labelBn: 'মেয়াদ শেষের পথে',
 count: effectiveMetrics.expiringCount,
 badgeColor: 'bg-danger-surface text-destructive font-bold',
    },
    { id: 'draft', labelEn: 'Draft', labelBn: 'খসড়া', count: quotations.filter((q) => q.status === 'draft').length },
    { id: 'sent', labelEn: 'Sent', labelBn: 'পাঠানো হয়েছে', count: quotations.filter((q) => q.status === 'sent').length },
    { id: 'negotiation', labelEn: 'Negotiation', labelBn: 'দরকষাকষি', count: quotations.filter((q) => q.status === 'negotiation').length },
    { id: 'approved', labelEn: 'Approved', labelBn: 'অনুমোদিত', count: quotations.filter((q) => q.status === 'approved').length },
    { id: 'converted', labelEn: 'Converted', labelBn: 'অর্ডারে রূপান্তর', count: effectiveMetrics.wonCount },
    { id: 'rejected', labelEn: 'Rejected', labelBn: 'বাতিল', count: quotations.filter((q) => q.status === 'rejected').length },
    { id: 'expired', labelEn: 'Expired', labelBn: 'মেয়াদোত্তীর্ণ', count: quotations.filter((q) => q.status === 'expired').length },
  ]

 const urgentAlertCount = priorityItems.length

 return (
    <PanelAccessGuard
 module="quotations"action="view"panelTitle="Quotations"panelTitleBn="কোটেশন">
      <FeatureGate feature="quotation_pdf">
        <div className="space-y-6 mx-auto pb-20">
        {/* NOTIFICATION TOAST */}
        {notification && (
          <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-surface-inset text-foreground backdrop-blur-md rounded-xl shadow-lg border border-border flex items-center gap-3 text-xs font-semibold animate-in slide-in-">
            <Sparkles className="h-4 w-4 text-success shrink-0"/>
            <span>{notification}</span>
            <button
 onClick={() => setNotification(null)}
 className="p-1 text-muted-foreground hover:text-foreground dark:hover:text-foreground cursor-pointer ml-1">
              <X className="h-3.5 w-3.5"/>
            </button>
          </div>
        )}

        {/* =========================================================================
            1. HEADER & PRIMARY WORKSPACE ACTIONS
           ========================================================================= */}
        <PageHeader
 titleEn="Quotations"titleBn="কোটেশন"descriptionEn="Commercial sales-control center: track active proposals, urgent follow-ups, margins & conversions"descriptionBn="বাণিজ্যিক সেলস কন্ট্রোল সেন্টার: চলতি কোটেশন, দ্রুত ফলো-আপ, মার্জিন ও অর্ডার কনভার্সন"icon={FileSpreadsheet}
 badge={
            <Badge className="bg-primary/10 text-primary border border-primary/20 border-border text-xs font-bold py-0.5">
 Live BDT ৳
            </Badge>
          }
 actions={
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
 size="sm"onClick={() => {
 const check = checkCanCreate('monthly_orders')
 if (!check.allowed) {
 openLimitExceededModal('monthly_orders')
 return
                  }
 setIsNewOpen(true)
                }}
 className="gap-1.5">
                <Plus className="h-4 w-4"/>
                <span>{tBilingual('New Quotation', 'নতুন কোটেশন')}</span>
              </Button>
            </div>
          }
        />

        {/* =========================================================================
            2. CANONICAL 4-KPI ROW & PRIORITIZED ATTENTION QUEUE
           ========================================================================= */}
        <div className="space-y-4">
          {/* Canonical 4 Executive Metric Cards */}
          <KpiGrid columns={4}>
            {/* 1. Active Pipeline Value */}
            <KpiCard
              titleEn="Active Pipeline"
              titleBn="চলতি পাইপলাইন"
              value={effectiveMetrics?.pendingValue || 0}
              isCurrency
              icon={Clock}
              colorVariant="amber"
              subtitleEn={`${effectiveMetrics?.pendingCount || 0} Proposals Awaiting Decision`}
              subtitleBn={`${effectiveMetrics?.pendingCount || 0}টি সিদ্ধান্তের অপেক্ষায়`}
            />

            {/* 2. Won / Accepted */}
            <KpiCard
              titleEn="Accepted / Won"
              titleBn="অনুমোদিত ও সফল"
              value={effectiveMetrics?.wonValue || 0}
              isCurrency
              icon={FileCheck2}
              colorVariant="emerald"
              subtitleEn={`${effectiveMetrics?.wonCount || 0} converted (${effectiveMetrics?.winRate || 0}% win rate)`}
              subtitleBn={`${effectiveMetrics?.wonCount || 0}টি কনভার্সন (${effectiveMetrics?.winRate || 0}% জয়ের হার)`}
            />

            {/* 3. Expiring Soon */}
            <KpiCard
              titleEn="Expiring Soon"
              titleBn="মেয়াদোত্তীর্ণের পথে"
              value={effectiveMetrics?.expiringValue || 0}
              isCurrency
              icon={AlertTriangle}
              colorVariant="danger"
              badge={(effectiveMetrics?.expiringCount || 0) > 0 ? 'Urgent' : undefined}
              badgeColor="bg-danger-surface text-destructive border-danger-border"
              subtitleEn={`${effectiveMetrics?.expiringCount || 0} critical near expiry`}
              subtitleBn={`${effectiveMetrics?.expiringCount || 0}টি দ্রুত ফলো-আপ প্রয়োজন`}
            />

            {/* 4. Follow-Up Needed Today */}
            <KpiCard
              titleEn="Follow-Up Today"
              titleBn="আজকের ফলো-আপ"
              value={priorityItems.filter((it) => it.urgency === 'follow_up').length}
              icon={Phone}
              colorVariant="blue"
              subtitleEn="Client calls & WhatsApp due"
              subtitleBn="গ্রাহকের সাথে জরুরি যোগাযোগ"
            />
          </KpiGrid>

          {/* PRIORITIZED WORK LIST: "What needs my attention now?" */}
          {priorityItems.length > 0 ? (
            <Card className="border-border p-4 bg-card rounded-xl shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-md bg-warning-surface text-warning">
                    <AlertTriangle className="h-4 w-4" />
                  </span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground bangla-text">
                    {tBilingual('Needs Your Attention Now (Prioritized Action Queue)', 'জরুরি মনোযোগের তালিকা (অগ্রাধিকার প্রাপ্ত কাজ)')}
                  </h3>
                </div>
                <Badge variant="outline" className="bg-warning-surface text-warning border-warning-border font-bold text-xs">
                  {priorityItems.length} {tBilingual('Urgent Actions', 'টি জরুরি')}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-3">
                {priorityItems.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg border border-border bg-muted/40 hover:bg-muted/80 transition-colors flex flex-col justify-between space-y-2.5"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-mono text-xs font-bold text-primary">
                          {item.quotationNumber}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs font-bold py-0 h-5',
                            item.urgency === 'critical'
                              ? 'bg-danger-surface text-destructive border-danger-border'
                              : 'bg-warning-surface text-warning border-warning-border'
                          )}
                        >
                          {item.urgencyLabel}
                        </Badge>
                      </div>
                      <div className="font-semibold text-xs text-foreground mt-1 truncate">
                        {item.customerName}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {item.itemsSummary}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className="font-bold text-xs tabular-nums text-foreground">
                        {formatBDT(item.grandTotal)}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenFollowUp(item.quotation)}
                          className="h-7 px-2 text-xs font-semibold cursor-pointer border-border"
                        >
                          {tBilingual('Follow Up', 'ফলো-আপ')}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleConvertToOrder(item.quotation)}
                          className="h-7 px-2 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
                        >
                          {tBilingual('Convert', 'অর্ডার')}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <div className="px-4 py-3 rounded-xl border border-border bg-card/60 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span>{tBilingual('All active proposals are on track • No urgent follow-ups overdue', 'সকল কোটেশন স্বাভাবিক গতিতে রয়েছে • কোনো বিলম্বিত জরুরি ফলো-আপ নেই')}</span>
              </span>
              <span className="font-semibold text-primary">
                {tBilingual('Active Pipeline:', 'চলতি পাইপলাইন:')} {formatBDT(effectiveMetrics?.pendingValue || 0)}
              </span>
            </div>
          )}
        </div>

        {/* =========================================================================
            3. QUOTATIONS DIRECTORY
           ========================================================================= */}
        <div className="space-y-4">
          <div className="space-y-4">

              {/* Unified Single Row Toolbar: Search | Status Filter (Dropdown) | Selected Date | Date filter (dropdown) | Refresh */}
              <Card className="p-2.5 sm:p-3 shadow-xs border-border rounded-xl bg-card/80 backdrop-blur-md">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                  {/* Left: Search & Status Filter Dropdown */}
                  <div className="flex flex-1 flex-wrap items-center gap-2.5 min-w-0">
                    {/* 1. Search */}
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/>
                      <Input
 placeholder={tBilingual('Search quote #, customer, phone, item...', 'কোটেশন নং, গ্রাহক, ফোন বা আইটেম দিয়ে খুঁজুন...')} value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="pl-9 pr-8 text-xs h-9 font-medium rounded-xl border-border bg-card shadow-2xs"/>
                      {search && (
                        <button
 type="button"onClick={() => setSearch('')}
 className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-muted-foreground cursor-pointer">
                          <X className="h-4 w-4"/>
                        </button>
                      )}
                    </div>

                    {/* 2. Status Filter (Dropdown) */}
                    <div className="relative shrink-0">
                      <select
 value={selectedFilter}
 onChange={(e) => setSelectedFilter(e.target.value)}
 className="h-9 pl-3 pr-8 rounded-xl border border-border bg-card text-xs font-semibold text-foreground shadow-2xs focus:ring-1 focus:ring-ring outline-none cursor-pointer appearance-none">
                        {directoryFilterTabs.map((tab) => (
                          <option key={tab.id} value={tab.id}>
                            {tBilingual(tab.labelEn, tab.labelBn)} ({tab.count})
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground">
                        <ChevronDown className="h-3.5 w-3.5"/>
                      </div>
                    </div>
                  </div>

                  {/* Right: Selected Date, Date Filter (Dropdown) & Refresh */}
                  <div className="flex flex-wrap items-center gap-2.5 shrink-0 justify-end">
                    {/* 3. Selected Date */}
                    {selectedPeriod === 'custom' ? (
                      <div className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded-xl border border-border text-xs shadow-2xs">
                        <Calendar className="h-3.5 w-3.5 text-primary shrink-0"/>
                        <input
 type="date"value={customStartDate}
 onChange={(e) => setCustomStartDate(e.target.value)}
 className="px-2 py-0.5 rounded-lg bg-card border border-input text-foreground tabular-nums text-xs focus:ring-1 focus:ring-ring outline-none h-7"title="From Date"/>
                        <span className="text-muted-foreground font-bold px-0.5 text-xs bangla-text">{tBilingual('to', 'থেকে')}</span>
                        <input
 type="date"value={customEndDate}
 onChange={(e) => setCustomEndDate(e.target.value)}
 className="px-2 py-0.5 rounded-lg bg-card border border-input text-foreground tabular-nums text-xs focus:ring-1 focus:ring-ring outline-none h-7"title="To Date"/>
                        <Button
 size="sm"onClick={() => loadQuotationsData(false)}
 className="h-7 px-2 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer rounded-lg bangla-text">
 {tBilingual('Apply', 'প্রয়োগ')}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-xl border border-border/60 text-xs font-semibold text-muted-foreground tabular-nums whitespace-nowrap">
                        <Calendar className="h-3.5 w-3.5 text-primary shrink-0"/>
                        <span>
                          {effectiveMetrics?.startDate} {tBilingual('to', 'থেকে')} {effectiveMetrics?.endDate}
                        </span>
                      </div>
                    )}

                    {/* 4. Date filter (dropdown) */}
                    <div className="relative shrink-0">
                      <select
 value={selectedPeriod}
 onChange={(e) => setSelectedPeriod(e.target.value as QuotationPeriod)}
 className="h-9 pl-3 pr-8 rounded-xl border border-border bg-card text-xs font-semibold text-foreground shadow-2xs focus:ring-1 focus:ring-ring outline-none cursor-pointer appearance-none">
                        <option value="today">{tBilingual('Today', 'আজ')}</option>
                        <option value="this_week">{tBilingual('This Week', 'এই সপ্তাহ')}</option>
                        <option value="this_month">{tBilingual('This Month', 'এই মাস')}</option>
                        <option value="all_time">{tBilingual('All Time', 'সর্বমোট')}</option>
                        <option value="custom">{tBilingual('Custom Date', 'কাস্টম তারিখ')}</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground">
                        <ChevronDown className="h-3.5 w-3.5"/>
                      </div>
                    </div>

                    {/* 5. Refresh */}
                    <button
 type="button"onClick={() => loadQuotationsData(false)}
 className="h-9 w-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground bg-card border border-border hover:bg-muted transition-colors shadow-2xs cursor-pointer shrink-0"title={tBilingual('Refresh quotations data', 'কোটেশন ডেটা রিফ্রেশ করুন')}>
                      <RefreshCw className={cn('h-3.5 w-3.5', (isLoading || isRefreshing) && 'animate-spin text-primary')} />
                    </button>
                  </div>
                </div>
              </Card>

              {/* Quotation Directory Table */}
              <Card className="shadow-xs border-border overflow-hidden rounded-xl bg-card/80 backdrop-blur-md">
                <CardHeader className="py-3 px-4 border-b border-border flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-bold text-foreground bangla-text">
 {tBilingual('Quotation Directory', 'কোটেশন ডিরেক্টরি')}
                    </CardTitle>
                    <Badge variant="outline"className="text-xs tabular-nums bangla-text">
                      {filteredQuotations.length} {tBilingual('records', 'টি রেকর্ড')}
                    </Badge>
                  </div>
                  {selectedFilter !== 'all' && (
                    <button
 type="button"onClick={() => setSelectedFilter('all')}
 className="text-xs text-primary hover:underline font-semibold cursor-pointer bangla-text">
 {tBilingual('Clear Filter', 'ফিল্টার মুছুন')}
                    </button>
                  )}
                </CardHeader>

                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="p-12 text-center space-y-3">
                      <RefreshCw className="h-7 w-7 animate-spin text-primary mx-auto"/>
                      <p className="text-xs text-muted-foreground font-medium bangla-text">{tBilingual('Loading quotations pipeline...', 'কোটেশন পাইপলাইন লোড হচ্ছে...')}</p>
                    </div>
                  ) : filteredQuotations.length === 0 ? (
                    <div className="p-12 text-center space-y-3">
                      <div className="h-12 w-12 rounded-xl bg-muted text-muted-foreground flex items-center justify-center mx-auto">
                        <FileSpreadsheet className="h-6 w-6"/>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground bangla-text">
                          {search || selectedFilter !== 'all'
                            ? tBilingual('No quotations match current filter', 'ফিল্টারের সাথে কোনো কোটেশন মিলছে না')
                            : tBilingual('No quotations created yet', 'কোনো কোটেশন এখনও তৈরি করা হয়নি')}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto bangla-text">
                          {search || selectedFilter !== 'all'
                            ? tBilingual('Try clearing the search query or changing active filter tabs.', 'সার্চ মুছুন অথবা ফিল্টার পরিবর্তন করে চেষ্টা করুন।')
                            : tBilingual('Generate formal commercial proposals with custom rates and dimensional pricing in under 60 seconds.', 'কাস্টম রেট এবং সাইজ অনুযায়ী ১ মিনিটের মধ্যে নির্ভুল কোটেশন তৈরি করুন।')}
                        </p>
                      </div>
                      {!search && selectedFilter === 'all' && (
                        <Button
 size="sm"onClick={() => setIsNewOpen(true)}
 className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold mt-2 rounded-xl">
                          <Plus className="h-3.5 w-3.5 mr-1"/>
 {tBilingual('Create First Quotation', 'প্রথম কোটেশন তৈরি করুন')}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <QuotationTable
 quotations={filteredQuotations}
 tenantSlug={slug}
 companyName={company?.name || 'PrintFlow'}
 onOpenFollowUp={handleOpenFollowUp}
 onTrash={handleTrashQuotation}
                    />
                  )}
                </CardContent>
              </Card>
            </div>
        </div>

        {/* =========================================================================
            4. SHARED MODALS
           ========================================================================= */}
        {/* Create Commercial Quotation Modal (Strictly UNTOUCHED) */}
        <NewQuotationModal
 open={isNewOpen}
 onOpenChange={setIsNewOpen}
 onQuotationCreated={handleQuotationCreated}
 companyId={company?.id}
 tenantSlug={slug}
        />

        {/* Follow-up Logging Modal */}
        <FollowUpModal
 open={isFollowUpOpen}
 onOpenChange={setIsFollowUpOpen}
 quotation={followUpQuote}
 onFollowUpRecorded={handleFollowUpSaved}
 companyId={company?.id || 'c-01'}
        />

        {/* Quotation Trash Confirm Dialog */}
        <ConfirmDialog
 open={isTrashConfirmOpen}
 onOpenChange={setIsTrashConfirmOpen}
 title={`Move Quotation #${quoteToTrash?.quotation_number || ''} to Trash?`}
 titleBn={`কোটেশন #${quoteToTrash?.quotation_number || ''} ট্র্যাশে স্থানান্তর করবেন?`}
 message="Are you sure you want to move this quotation to Trash / Recycle Bin? It can be restored from system settings later."messageBn="আপনি কি এই কোটেশনটি রিসাইকেল বিনে সরাতে চান? পরবর্তীতে সেটিংস থেকে এটি রিস্টোর করা যাবে।"confirmText="Move to Trash"confirmTextBn="ট্র্যাশে সরান"cancelText="Cancel"cancelTextBn="বাতিল"isDestructive={true}
 isLoading={isTrashing}
 onConfirm={confirmTrashQuotation}
        />
      </div>
    </FeatureGate>
    </PanelAccessGuard>
  )
}
