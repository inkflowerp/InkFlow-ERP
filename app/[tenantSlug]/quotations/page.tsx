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
import {
  QuotationRecord,
  QuotationStatus,
  normalizeQuotationRecord,
  extractQuotationsFromAny,
  deduplicateQuotations,
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
import { NeedsAttentionPanel } from '@/components/quotations/needs-attention-panel'
import { FollowUpModal } from '@/components/quotations/follow-up-modal'
import { NewQuotationModal } from '@/components/quotations/new-quotation-modal'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import { formatBDT } from '@/lib/formatters'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { dispatchToast } from '@/components/shared/toast-feedback'
import { cn } from '@/lib/utils'

export type QuotationPeriod = 'this_month' | 'this_week' | 'today' | 'all_time' | 'custom'
export type QuotationTab = 'overview' | 'quotations' | 'attention'
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
    STORAGE_KEYS.QUOTATIONS,
    slug ? `${STORAGE_KEYS.QUOTATIONS}__${slug}` : null,
    companySlug ? `${STORAGE_KEYS.QUOTATIONS}__${companySlug}` : null,
    companyId ? `${STORAGE_KEYS.QUOTATIONS}__${companyId}` : null,
    `${STORAGE_KEYS.QUOTATIONS}__rangao`,
    `${STORAGE_KEYS.QUOTATIONS}__quotations`,
    `${STORAGE_KEYS.QUOTATIONS}__default`,
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

  // Deep scan localStorage for any quotation-related keys
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (
        k &&
        (k.startsWith('printerp_tenant_quotations') ||
          k.startsWith('printerp_quotations') ||
          k.startsWith(STORAGE_KEYS.QUOTATIONS) ||
          k.includes('quotation') ||
          k.includes('quotes') ||
          k.includes('draft') ||
          k.includes('outbox') ||
          k.includes('inkflow'))
      ) {
        try {
          const raw = localStorage.getItem(k)
          if (raw) {
            const extracted = extractQuotationsFromAny(raw)
            if (extracted.length > 0) rawList.push(...extracted)
          }
        } catch {}
      }
    }
  } catch {}

  // Direct DataStore reads
  const storeItems = [
    ...(PrintERPDataStore.getAll<QuotationRecord>(STORAGE_KEYS.QUOTATIONS, slug) || []),
    ...(PrintERPDataStore.getAll<QuotationRecord>(STORAGE_KEYS.QUOTATIONS, companySlug) || []),
    ...(PrintERPDataStore.get<QuotationRecord[]>(STORAGE_KEYS.QUOTATIONS) || []),
    ...(PrintERPDataStore.get<QuotationRecord[]>(STORAGE_KEYS.QUOTATIONS, 'default') || []),
  ]
  rawList.push(...storeItems)

  return deduplicateQuotations(rawList, companyId, slug)
}

/**
 * Removes a quotation from all localStorage keys and local DataStore caches
 */
function removeLocalQuotation(id: string, quotationNumber?: string, slug?: string, companySlug?: string, companyId?: string) {
  if (typeof window === 'undefined') return
  try {
    const candidateKeys = [
      STORAGE_KEYS.QUOTATIONS,
      slug ? `${STORAGE_KEYS.QUOTATIONS}__${slug}` : null,
      companySlug ? `${STORAGE_KEYS.QUOTATIONS}__${companySlug}` : null,
      companyId ? `${STORAGE_KEYS.QUOTATIONS}__${companyId}` : null,
      `${STORAGE_KEYS.QUOTATIONS}__rangao`,
      `${STORAGE_KEYS.QUOTATIONS}__quotations`,
      `${STORAGE_KEYS.QUOTATIONS}__default`,
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

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (
        k &&
        (k.startsWith('printerp_tenant_quotations') ||
          k.startsWith('printerp_quotations') ||
          k.includes('quotation') ||
          k.includes('quotes'))
      ) {
        try {
          const raw = localStorage.getItem(k)
          if (raw && (raw.includes(id) || (quotationNumber && raw.includes(quotationNumber)))) {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed)) {
              const filtered = parsed.filter(
                (q: any) => q?.id !== id && (!quotationNumber || q?.quotation_number !== quotationNumber)
              )
              localStorage.setItem(k, JSON.stringify(filtered))
            }
          }
        } catch {}
      }
    }

    PrintERPDataStore.removeItem(STORAGE_KEYS.QUOTATIONS, id)
    if (slug) PrintERPDataStore.removeItem(STORAGE_KEYS.QUOTATIONS, id, slug)
    if (companySlug) PrintERPDataStore.removeItem(STORAGE_KEYS.QUOTATIONS, id, companySlug)
    if (companyId) PrintERPDataStore.removeItem(STORAGE_KEYS.QUOTATIONS, id, companyId)
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
  const [activeTab, setActiveTab] = useState<QuotationTab>('overview')

  // Date period filters
  const [selectedPeriod, setSelectedPeriod] = useState<QuotationPeriod>('this_month')
  const [customStartDate, setCustomStartDate] = useState<string>(() => `${getTodayDateStr().slice(0, 7)}-01`)
  const [customEndDate, setCustomEndDate] = useState<string>(() => getTodayDateStr())

  // Overview Action Hub priority tab
  const [priorityTab, setPriorityTab] = useState<PipelinePriorityTab>('all')

  // Directory search & filters
  const [search, setSearch] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<string>('all')
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
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setQuotations((prev) => deduplicateQuotations([...res.data!, ...prev, ...localList], company?.id, slug))
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
      window.addEventListener('printerp_datastore_sync', handleSync)
      window.addEventListener('printerp_drafts_updated', handleSync)
      window.addEventListener('printerp_table_synced:quotations', handleSync)
      window.addEventListener('printerp_table_synced', handleSync)
      window.addEventListener('printerp_data_sync', handleSync)

      return () => {
        window.removeEventListener('storage', handleSync)
        window.removeEventListener('printerp_datastore_sync', handleSync)
        window.removeEventListener('printerp_drafts_updated', handleSync)
        window.removeEventListener('printerp_table_synced:quotations', handleSync)
        window.removeEventListener('printerp_table_synced', handleSync)
        window.removeEventListener('printerp_data_sync', handleSync)
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
      // 1. Sector filter
      if (sectorFilter !== 'all') {
        const sec = QuotationService.getSectorForQuotation(q)
        if (sec !== sectorFilter) return false
      }

      // 2. Search filter
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
      // 1. Move to Trash / Recycle Bin on server
      const res = await moveToTrashAction('quotations', targetQuote, company?.id)

      // 2. Explicitly invoke deleteQuotationAction to ensure deletion from active DB
      await deleteQuotationAction(targetId, targetNum, company?.id, slug).catch(() => {})

      // 3. Purge from browser localStorage and client DataStore across all keys
      removeLocalQuotation(targetId, targetNum, slug, company?.slug, company?.id)

      // 4. Update local state immediately
      setQuotations((prev) =>
        prev.filter((q) => q.id !== targetId && (!targetNum || q.quotation_number !== targetNum))
      )
      setIsTrashConfirmOpen(false)
      setQuoteToTrash(null)
      showNotification(`Quotation #${targetNum} moved to Trash.`, 'success')

      // 5. Silently reload to ensure sync
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
    const msg = QuotationService.generateBangladeshiQuotationWhatsAppMessage(quote, company?.name || 'InkFlow')
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
      ? { label: 'Optimal Flow', color: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500' }
      : winRateNum >= 25
      ? { label: 'Steady Pace', color: 'text-blue-600 dark:text-blue-400', bar: 'bg-blue-500' }
      : { label: 'Needs Follow-up', color: 'text-amber-600 dark:text-amber-400', bar: 'bg-amber-500' }

  // Directory filter tabs
  const directoryFilterTabs = [
    { id: 'all', labelEn: 'All', labelBn: 'সকল কোটেশন', count: quotations.length },
    { id: 'active', labelEn: 'Active Pipeline', labelBn: 'চলতি পাইপলাইন', count: effectiveMetrics.activeCount },
    {
      id: 'follow_up_today',
      labelEn: 'Follow-Up Today',
      labelBn: 'আজকের ফলো-আপ',
      count: priorityItems.filter((it) => it.urgency === 'follow_up').length,
      badgeColor: 'bg-amber-100 text-amber-900 font-bold dark:bg-amber-950 dark:text-amber-200',
    },
    {
      id: 'expiring_soon',
      labelEn: 'Expiring Soon',
      labelBn: 'মেয়াদ শেষের পথে',
      count: effectiveMetrics.expiringCount,
      badgeColor: 'bg-rose-100 text-rose-900 font-bold dark:bg-rose-950 dark:text-rose-200',
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
    <FeatureGate feature="quotation_pdf">
      <div className="space-y-6 max-w-7xl mx-auto pb-20">
        {/* NOTIFICATION TOAST */}
        {notification && (
          <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-slate-900/95 text-white dark:bg-slate-100 dark:text-slate-900 backdrop-blur-md rounded-2xl shadow-2xl border border-white/10 dark:border-black/10 flex items-center gap-3 text-xs font-semibold animate-in slide-in-from-bottom-5">
            <Sparkles className="h-4 w-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
            <span>{notification}</span>
            <button
              onClick={() => setNotification(null)}
              className="p-1 text-slate-400 hover:text-white dark:hover:text-black cursor-pointer ml-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* =========================================================================
            1. HEADER & PRIMARY WORKSPACE ACTIONS
           ========================================================================= */}
        <div className="bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30 dark:from-slate-900 dark:via-slate-900/80 dark:to-slate-800/40 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs relative overflow-hidden">
          {/* Subtle decorative glow */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-sm shadow-blue-500/20">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <span>{locale === 'bn' ? 'কোটেশন ও সেলস পাইপলাইন' : 'Quotations & Sales Pipeline'}</span>
                    <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 text-[10px] font-bold py-0.5">
                      Live BDT ৳
                    </Badge>
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {locale === 'bn'
                      ? 'বাণিজ্যিক সেলস কন্ট্রোল সেন্টার: চলতি কোটেশন, দ্রুত ফলো-আপ, মার্জিন ও অর্ডার কনভার্সন'
                      : 'Commercial sales-control center: track active proposals, urgent follow-ups, margins & conversions'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link href={getTenantNavHref('/trash?tab=quotations', pathname, slug)}>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold shadow-xs h-9 gap-1.5 cursor-pointer text-slate-600 dark:text-slate-300 rounded-xl"
                >
                  <Trash2 className="h-3.5 w-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Trash Bin</span>
                </Button>
              </Link>

              <Link href={getTenantNavHref('/pricing?tab=calculator', pathname, slug)}>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold shadow-xs h-9 gap-1.5 cursor-pointer text-slate-600 dark:text-slate-300 rounded-xl"
                >
                  <Calculator className="h-3.5 w-3.5 text-blue-600" />
                  <span className="hidden sm:inline">{tBilingual('Estimator', 'ক্যালকুলেটর')}</span>
                </Button>
              </Link>

              <Button
                variant="outline"
                size="sm"
                onClick={() => loadQuotationsData(false)}
                disabled={isRefreshing}
                className="border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold shadow-xs h-9 gap-1.5 cursor-pointer text-slate-600 dark:text-slate-300 rounded-xl"
                title="Refresh Quotations"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin text-blue-600')} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  const check = checkCanCreate('monthly_orders')
                  if (!check.allowed) {
                    openLimitExceededModal('monthly_orders')
                    return
                  }
                  setIsNewOpen(true)
                }}
                className="bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-sm shadow-blue-500/20 h-9 px-4 gap-1.5 cursor-pointer rounded-xl transition-transform active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" />
                <span>{tBilingual('New Quotation', 'নতুন কোটেশন')}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            2. KPI SUMMARY CARDS (TOTAL QUOTED, WON, PENDING, EXPIRING, AVG DEAL, WIN RATE)
           ========================================================================= */}
        <div className="space-y-3">
          {/* Period Selector & Custom Date-to-Date Range Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-bold">
                {(['today', 'this_week', 'this_month', 'all_time', 'custom'] as QuotationPeriod[]).map((p) => {
                  const labels: Record<QuotationPeriod, string> = {
                    today: 'Today',
                    this_week: 'This Week',
                    this_month: 'This Month',
                    all_time: 'All Time',
                    custom: 'Custom Date',
                  }
                  const isSelected = selectedPeriod === p
                  return (
                    <button
                      key={p}
                      onClick={() => setSelectedPeriod(p)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold',
                        isSelected
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      )}
                    >
                      {labels[p]}
                    </button>
                  )
                })}
              </div>

              {/* Date-to-Date Range Inputs */}
              {selectedPeriod === 'custom' && (
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs animate-in fade-in slide-in-from-left-2">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-mono text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                    title="From Date"
                  />
                  <span className="text-slate-400 font-bold px-0.5 text-xs">to</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-mono text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                    title="To Date"
                  />
                  <Button
                    size="sm"
                    onClick={() => loadQuotationsData(false)}
                    className="h-7 px-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer rounded-lg"
                  >
                    Apply
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5 text-xs text-slate-500 font-mono">
              <div className="flex items-center gap-1.5 bg-slate-100/60 dark:bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                <Calendar className="h-3.5 w-3.5 text-blue-500" />
                <span>
                  {effectiveMetrics?.startDate} to {effectiveMetrics?.endDate}
                </span>
              </div>
              <button
                onClick={() => loadQuotationsData(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Refresh financial metrics"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin text-blue-600')} />
              </button>
            </div>
          </div>

          {/* 6 Executive Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* 1. Total Quoted / Pipeline Value */}
            <Card className="p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <span>Total Quoted</span>
                <FileSpreadsheet className="h-3.5 w-3.5 text-blue-500 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-lg sm:text-xl font-black font-numeric tabular-nums text-slate-900 dark:text-white mt-1.5">
                {formatBDT(effectiveMetrics?.totalPipelineValue || 0)}
              </div>
              <div className="text-[11px] text-slate-500 font-numeric tabular-nums mt-1 flex items-center gap-1">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{effectiveMetrics?.totalCount || 0}</span>
                <span>Proposals Created</span>
              </div>
            </Card>

            {/* 2. Won / Accepted */}
            <Card className="p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-emerald-200/80 dark:border-emerald-900/40 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-800 transition-all rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
              <div className="flex items-center justify-between text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                <span>Accepted / Won</span>
                <FileCheck2 className="h-3.5 w-3.5 text-emerald-500 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-lg sm:text-xl font-black font-numeric tabular-nums text-emerald-600 dark:text-emerald-400 mt-1.5">
                {formatBDT(effectiveMetrics?.wonValue || 0)}
              </div>
              <div className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 font-numeric tabular-nums mt-1 flex items-center gap-1">
                <span className="font-semibold">{effectiveMetrics?.wonCount || 0}</span>
                <span>Converted to Orders</span>
              </div>
            </Card>

            {/* 3. Pending / Sent */}
            <Card className="p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-amber-200/80 dark:border-amber-900/40 shadow-xs hover:border-amber-300 dark:hover:border-amber-800 transition-all rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
              <div className="flex items-center justify-between text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                <span>Active Pipeline</span>
                <Clock className="h-3.5 w-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-lg sm:text-xl font-black font-numeric tabular-nums text-amber-600 dark:text-amber-400 mt-1.5">
                {formatBDT(effectiveMetrics?.pendingValue || 0)}
              </div>
              <div className="text-[11px] text-amber-700/80 dark:text-amber-400/80 font-numeric tabular-nums mt-1 flex items-center gap-1">
                <span className="font-semibold">{effectiveMetrics?.pendingCount || 0}</span>
                <span>Awaiting Decision</span>
              </div>
            </Card>

            {/* 4. Expiring Soon */}
            <Card className="p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-rose-300/80 dark:border-rose-900/50 shadow-xs hover:border-rose-400 dark:hover:border-rose-800 transition-all rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-600" />
              <div className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center justify-between">
                <span>Expiring Soon</span>
                {(effectiveMetrics?.expiringCount || 0) > 0 ? (
                  <span className="h-2 w-2 rounded-full bg-rose-600 animate-ping" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
                )}
              </div>
              <div className="text-lg sm:text-xl font-black font-numeric tabular-nums text-rose-600 dark:text-rose-400 mt-1.5">
                {formatBDT(effectiveMetrics?.expiringValue || 0)}
              </div>
              <div className="text-[11px] text-rose-600/90 font-numeric tabular-nums mt-1 flex items-center gap-1">
                <span className="font-semibold">{effectiveMetrics?.expiringCount || 0}</span>
                <span>Critical / Warning</span>
              </div>
            </Card>

            {/* 5. Avg. Deal Value */}
            <Card className="p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-violet-500" />
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <span>Avg Deal Value</span>
                <Building className="h-3.5 w-3.5 text-purple-500 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-lg sm:text-xl font-black font-numeric tabular-nums text-slate-900 dark:text-white mt-1.5">
                {formatBDT(effectiveMetrics?.avgDealValue || 0)}
              </div>
              <div className="text-[11px] text-slate-500 font-numeric tabular-nums mt-1">
                Avg Margin: <strong className="text-slate-700 dark:text-slate-300">{effectiveMetrics?.avgMargin || 40}%</strong>
              </div>
            </Card>

            {/* 6. Win Rate % */}
            <Card className="p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-blue-200/80 dark:border-blue-900/40 shadow-xs hover:border-blue-300 dark:hover:border-blue-800 transition-all rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 to-blue-600" />
              <div className="flex items-center justify-between text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                <span>Win Rate</span>
                <Activity className="h-3.5 w-3.5 text-blue-500 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-lg sm:text-xl font-black font-numeric tabular-nums text-blue-600 dark:text-blue-400 mt-1.5 flex items-baseline gap-1">
                <span>{effectiveMetrics?.winRate || 0}%</span>
                <span className={cn('text-[10px] font-bold', healthTier.color)}>({healthTier.label})</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', healthTier.bar)}
                  style={{ width: `${Math.min(100, Math.max(0, winRateNum))}%` }}
                />
              </div>
            </Card>
          </div>
        </div>

        {/* =========================================================================
            3. MAIN NAVIGATION TABS (OVERVIEW / QUOTATIONS / ATTENTION HUB)
           ========================================================================= */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <button
              onClick={() => setActiveTab('overview')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer',
                activeTab === 'overview'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('quotations')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer',
                activeTab === 'quotations'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Quotations Directory</span>
              <Badge
                className={cn(
                  'text-[10px] py-0 px-1.5 font-bold',
                  activeTab === 'quotations'
                    ? 'bg-blue-800 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                )}
              >
                {quotations.length}
              </Badge>
            </button>

            <button
              onClick={() => setActiveTab('attention')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer',
                activeTab === 'attention'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <AlertCircle className="h-4 w-4" />
              <span>Attention Hub</span>
              {urgentAlertCount > 0 ? (
                <Badge
                  className={cn(
                    'text-[10px] py-0 px-1.5 font-bold',
                    activeTab === 'attention'
                      ? 'bg-amber-800 text-white'
                      : 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 animate-pulse'
                  )}
                >
                  {urgentAlertCount} Urgent
                </Badge>
              ) : (
                <Badge
                  className={cn(
                    'text-[10px] py-0 px-1.5 font-bold',
                    activeTab === 'attention'
                      ? 'bg-amber-800 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  )}
                >
                  0
                </Badge>
              )}
            </button>
          </div>

          {/* -------------------------------------------------------------------------
              TAB 1: OVERVIEW & PIPELINE PRIORITIES ACTION HUB
             ------------------------------------------------------------------------- */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Urgent Commercial Follow-up Alert Banner */}
              {urgentAlertCount > 0 && (
                <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold text-base shrink-0">
                      ⚠️
                    </div>
                    <div>
                      <div className="text-xs font-bold text-amber-950 dark:text-amber-200 flex items-center gap-2">
                        <span>Commercial Follow-up Alert</span>
                        <Badge className="bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/30 text-[10px] py-0 font-bold">
                          {urgentAlertCount} Proposals Needing Action
                        </Badge>
                      </div>
                      <div className="text-[11px] text-amber-800/90 dark:text-amber-300/80">
                        Proposals expiring soon, scheduled for customer outreach today, or requiring immediate order conversion.
                      </div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => setActiveTab('attention')}
                    className="h-8 px-3.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs shrink-0 cursor-pointer gap-1.5 rounded-xl"
                  >
                    <span>Review Attention Hub</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              {/* Pipeline Priorities — Action Hub */}
              <Card className="border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
                <CardHeader className="p-4 bg-slate-50/70 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xs">
                        !
                      </div>
                      <CardTitle className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                        Pipeline Priorities — Action Hub
                      </CardTitle>
                    </div>
                    <CardDescription className="text-xs text-slate-500">
                      Active proposals requiring immediate customer outreach, price negotiation, or order conversion
                    </CardDescription>
                  </div>

                  {/* Priority Filter Pills */}
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold">
                    {[
                      { id: 'all', label: 'All Urgent' },
                      { id: 'expiring', label: 'Expiring Soon' },
                      { id: 'follow_up', label: 'Follow-up Due' },
                      { id: 'high_value', label: 'High Value' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setPriorityTab(tab.id as any)}
                        className={cn(
                          'px-2.5 py-1 rounded-lg transition-all cursor-pointer',
                          priorityTab === tab.id
                            ? 'bg-rose-600 text-white shadow-xs font-bold'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  {filteredPriorityItems.length === 0 ? (
                    <div className="p-10 text-center space-y-2">
                      <CheckCircle2 className="h-9 w-9 text-emerald-500 mx-auto" />
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        All commercial proposals are on track!
                      </p>
                      <p className="text-xs text-slate-500">No overdue follow-ups or expiring quotes in this view.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto">
                      {filteredPriorityItems.map((item) => (
                        <div
                          key={item.id}
                          className="p-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors"
                        >
                          {/* Left info */}
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-slate-900 dark:text-white text-sm">
                                {item.customerName}
                              </span>
                              {item.customerCompany && (
                                <span className="text-slate-500 text-[11px] font-medium">({item.customerCompany})</span>
                              )}
                              <span className="font-mono text-blue-600 dark:text-blue-400 font-bold bg-blue-500/10 px-1.5 py-0.5 rounded-md">
                                #{item.quotationNumber}
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono">
                              <span>
                                Phone:{' '}
                                {item.customerPhone ? (
                                  <a
                                    href={`tel:${item.customerPhone}`}
                                    className="text-slate-700 dark:text-slate-300 font-bold hover:text-blue-600 dark:hover:text-blue-400 hover:underline inline-flex items-center gap-1"
                                    title="Call Customer"
                                  >
                                    <Phone className="h-3 w-3 text-slate-400" />
                                    <span>{item.customerPhone}</span>
                                  </a>
                                ) : (
                                  <strong className="text-slate-400">—</strong>
                                )}
                              </span>
                              <span>Valid Until: {item.validUntil}</span>
                              <span className="text-slate-400 truncate max-w-xs">{item.itemsSummary}</span>
                            </div>
                          </div>

                          {/* Right: Grand total prominence & Action buttons */}
                          <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                            <div className="text-right">
                              <div className="font-numeric tabular-nums font-black text-slate-900 dark:text-white text-base">
                                {formatBDT(item.grandTotal)}
                              </div>
                              <span
                                className={cn(
                                  'text-[10px] font-bold uppercase tracking-wider block',
                                  item.urgency === 'critical'
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : item.urgency === 'follow_up'
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-blue-600 dark:text-blue-400'
                                )}
                              >
                                {item.urgencyLabel}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSendWhatsApp(item.quotation)}
                                className="h-8 text-xs font-bold border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700/60 dark:text-emerald-300 gap-1 rounded-xl"
                                title="Send WhatsApp Quotation Proposal"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                                <span>WhatsApp</span>
                              </Button>

                              <Button
                                size="sm"
                                onClick={() => handleOpenFollowUp(item.quotation)}
                                className="h-8 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs gap-1 cursor-pointer rounded-xl"
                              >
                                <Clock className="h-3.5 w-3.5" />
                                <span>Follow-Up</span>
                              </Button>

                              <Link href={getTenantNavHref(`/quotations/${item.id}`, pathname, slug)}>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white px-2 rounded-xl"
                                  title="View Quotation Cockpit"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Supplementary Overview Grids: Sector Breakdown & Commercial Performance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sector Stream Distribution */}
                <Card className="p-4 border-slate-200/80 dark:border-slate-800/80 shadow-xs rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                        📊
                      </div>
                      <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                        Sector Streams (This Period)
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">
                      Total: {formatBDT(effectiveMetrics.totalPipelineValue)}
                    </span>
                  </div>

                  <div className="space-y-3 pt-1">
                    {sectorBreakdown.map((sec) => {
                      const pct =
                        effectiveMetrics.totalPipelineValue > 0
                          ? Math.round((sec.value / effectiveMetrics.totalPipelineValue) * 100)
                          : 0
                      return (
                        <div key={sec.id} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              <span>{sec.icon}</span>
                              <span>{locale === 'bn' ? sec.labelBn : sec.labelEn}</span>
                            </span>
                            <div className="flex items-center gap-2 font-mono">
                              <span className="text-slate-400 text-[11px]">{sec.count} quotes</span>
                              <span className="font-bold text-slate-900 dark:text-white">{formatBDT(sec.value)}</span>
                              <span className="text-blue-600 font-bold text-[10px] w-8 text-right">({pct}%)</span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-blue-600 h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Card>

                {/* Commercial Pipeline Performance */}
                <Card className="p-4 border-slate-200/80 dark:border-slate-800/80 shadow-xs rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                          🎯
                        </div>
                        <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                          Commercial Conversion Metrics
                        </span>
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                        Win Rate: {effectiveMetrics.winRate}%
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Est. 50% Advance</span>
                        <span className="text-base font-black font-numeric tabular-nums text-emerald-600 dark:text-emerald-400">
                          {formatBDT(effectiveMetrics.expectedAdvance)}
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">Upon Job Order Confirmation</span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Average Deal Margin</span>
                        <span className="text-base font-black font-numeric tabular-nums text-blue-600 dark:text-blue-400">
                          {effectiveMetrics.avgMargin}%
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">Target Minimum: 35%</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Need custom dimensional pricing calculation?
                    </span>
                    <Link href={getTenantNavHref('/pricing?tab=calculator', pathname, slug)}>
                      <Button size="sm" variant="outline" className="h-7 text-xs font-bold gap-1 rounded-lg">
                        <Calculator className="h-3 w-3 text-blue-600" />
                        <span>Open Estimator</span>
                      </Button>
                    </Link>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------------------------
              TAB 2: QUOTATIONS DIRECTORY
             ------------------------------------------------------------------------- */}
          {activeTab === 'quotations' && (
            <div className="space-y-4">
              {/* Sector Streams Filter & Active Pipeline Highlights */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900 text-white dark:bg-slate-950 border border-slate-800 shadow-md">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  <span className="text-[11px] uppercase font-bold text-slate-400 mr-1 hidden md:inline">
                    Sector:
                  </span>
                  {[
                    { id: 'all', labelEn: 'All Sectors', labelBn: 'সকল সেক্টর', count: sectorCounts.all, icon: '🖨️' },
                    { id: 'digital_print', labelEn: 'Digital Flex/Vinyl', labelBn: 'ডিজিটাল ব্যানার', count: sectorCounts.digital_print, icon: '🎨' },
                    { id: 'offset_print', labelEn: 'Offset Press', labelBn: 'অফসেট প্রেস', count: sectorCounts.offset_print, icon: '📑' },
                    { id: 'signage_fabrication', labelEn: '3D Signage', labelBn: '৩ডি সাইনেজ', count: sectorCounts.signage_fabrication, icon: '💡' },
                    { id: 'ready_merchandise', labelEn: 'Merchandise', labelBn: 'মার্চেন্ডাইজ', count: sectorCounts.ready_merchandise, icon: '🎁' },
                  ].map((sec) => {
                    const isSelected = sectorFilter === sec.id
                    return (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => setSectorFilter(sec.id as any)}
                        className={`h-8 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-white/10 text-slate-300 hover:bg-white/20'
                        }`}
                      >
                        <span>{sec.icon}</span>
                        <span>{locale === 'bn' ? sec.labelBn : sec.labelEn}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-400'
                          }`}
                        >
                          {sec.count}
                        </span>
                      </button>
                    )
                  })}
                </div>

                <div className="flex items-center gap-3 shrink-0 text-xs border-t sm:border-t-0 border-white/10 pt-2 sm:pt-0">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                      {locale === 'bn' ? 'চলতি পাইপলাইন' : 'Active Pipeline'}
                    </span>
                    <span className="font-mono font-bold text-cyan-300">
                      {formatBDT(effectiveMetrics.totalPipelineValue)}
                    </span>
                  </div>
                  <div className="h-6 w-px bg-white/10 hidden sm:block" />
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-semibold text-amber-400 block">
                      {locale === 'bn' ? 'প্রত্যাশিত অগ্রিম (৫০%)' : 'Est. Advance (50%)'}
                    </span>
                    <span className="font-mono font-bold text-amber-300">
                      {formatBDT(effectiveMetrics.expectedAdvance)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Search & Status Filter Tabs */}
              <Card className="p-3.5 shadow-xs border-slate-200 dark:border-slate-800 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
                <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search quote #, customer, phone, item..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 text-xs h-9 font-medium rounded-xl"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
                    {directoryFilterTabs.map((tab) => {
                      const isSelected = selectedFilter === tab.id
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setSelectedFilter(tab.id)}
                          className={cn(
                            'h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0',
                            isSelected
                              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                          )}
                        >
                          <span className="bangla-text">{tBilingual(tab.labelEn, tab.labelBn)}</span>
                          {tab.count > 0 && (
                            <span
                              className={cn(
                                'text-[10px] px-1.5 py-0.2 rounded-full',
                                isSelected
                                  ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                                  : tab.badgeColor ||
                                      'bg-slate-200/80 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                              )}
                            >
                              {tab.count}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </Card>

              {/* Quotation Directory Table */}
              <Card className="shadow-xs border-slate-200 dark:border-slate-800 overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
                <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                      Quotation Directory
                    </CardTitle>
                    <Badge variant="outline" className="text-xs font-mono">
                      {filteredQuotations.length} records
                    </Badge>
                  </div>
                  {selectedFilter !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setSelectedFilter('all')}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                    >
                      Clear Filter
                    </button>
                  )}
                </CardHeader>

                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="p-12 text-center space-y-3">
                      <RefreshCw className="h-7 w-7 animate-spin text-blue-600 mx-auto" />
                      <p className="text-xs text-slate-500 font-medium">Loading quotations pipeline...</p>
                    </div>
                  ) : filteredQuotations.length === 0 ? (
                    <div className="p-12 text-center space-y-3">
                      <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                        <FileSpreadsheet className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {search || selectedFilter !== 'all'
                            ? 'No quotations match current filter'
                            : 'No quotations created yet'}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                          {search || selectedFilter !== 'all'
                            ? 'Try clearing the search query or changing active filter tabs.'
                            : 'Generate formal commercial proposals with custom rates and dimensional pricing in under 60 seconds.'}
                        </p>
                      </div>
                      {!search && selectedFilter === 'all' && (
                        <Button
                          size="sm"
                          onClick={() => setIsNewOpen(true)}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold mt-2 rounded-xl"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Create First Quotation
                        </Button>
                      )}
                    </div>
                  ) : (
                    <QuotationTable
                      quotations={filteredQuotations}
                      tenantSlug={slug}
                      companyName={company?.name || 'InkFlow'}
                      onOpenFollowUp={handleOpenFollowUp}
                      onTrash={handleTrashQuotation}
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* -------------------------------------------------------------------------
              TAB 3: ATTENTION HUB (TRIAGE VIEW)
             ------------------------------------------------------------------------- */}
          {activeTab === 'attention' && (
            <div className="space-y-4">
              <NeedsAttentionPanel
                quotations={quotations}
                tenantSlug={slug}
                companyName={company?.name || 'InkFlow'}
                onOpenFollowUp={handleOpenFollowUp}
              />

              {priorityItems.length === 0 && (
                <Card className="p-12 text-center space-y-3 rounded-2xl border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Attention Hub Cleared</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    There are currently no proposals expiring within 3 days or pending urgent follow-ups. All proposals are progressing smoothly.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab('quotations')}
                    className="rounded-xl text-xs font-bold"
                  >
                    View All Quotations
                  </Button>
                </Card>
              )}
            </div>
          )}
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
          message="Are you sure you want to move this quotation to Trash / Recycle Bin? It can be restored from system settings later."
          messageBn="আপনি কি এই কোটেশনটি রিসাইকেল বিনে সরাতে চান? পরবর্তীতে সেটিংস থেকে এটি রিস্টোর করা যাবে।"
          confirmText="Move to Trash"
          confirmTextBn="ট্র্যাশে সরান"
          cancelText="Cancel"
          cancelTextBn="বাতিল"
          isDestructive={true}
          isLoading={isTrashing}
          onConfirm={confirmTrashQuotation}
        />
      </div>
    </FeatureGate>
  )
}
