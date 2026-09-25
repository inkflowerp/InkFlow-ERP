'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useParams, usePathname, useSearchParams } from 'next/navigation'
import {
  FileSpreadsheet,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  SlidersHorizontal,
  Calculator,
  Loader2,
  Trash2,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useSubscription } from '@/hooks/use-subscription'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { FeatureGate } from '@/components/shared/feature-gate'
import {
  QuotationRecord,
  QuotationStatus,
  normalizeQuotationRecord,
  extractQuotationsFromAny,
  deduplicateQuotations,
} from '@/types/quotation.types'
import * as QuotationService from '@/lib/quotations/quotation-utils'
import { getQuotationsAction } from '@/actions/quotation.actions'
import { moveToTrashAction } from '@/actions/trash.actions'
import { QuotationKpiBar } from '@/components/quotations/quotation-kpi-bar'
import { NeedsAttentionPanel } from '@/components/quotations/needs-attention-panel'
import { QuotationTable } from '@/components/quotations/quotation-table'
import { FollowUpModal } from '@/components/quotations/follow-up-modal'
import { NewQuotationModal } from '@/components/quotations/new-quotation-modal'
import { useDataStore } from '@/hooks/use-data-store'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import { formatBDT } from '@/lib/formatters'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { dispatchToast } from '@/components/shared/toast-feedback'

export default function QuotationsPage() {
  const params = useParams()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { company } = useTenant()
  const { checkCanCreate, openLimitExceededModal } = useSubscription()
  const { tBilingual, locale } = useI18n()
  const slug = (params?.tenantSlug as string) || company?.slug || 'classic-printer'

  const [isMounted, setIsMounted] = useState(false)

  // Authoritative server state + local store cache
  const [localQuotations] = useDataStore<QuotationRecord[]>(STORAGE_KEYS.QUOTATIONS, undefined, slug)
  const [serverQuotations, setServerQuotations] = useState<QuotationRecord[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localTick, setLocalTick] = useState(0)

  // Filtering & Search
  const [search, setSearch] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<string>('all')
  const [sectorFilter, setSectorFilter] = useState<'all' | 'digital_print' | 'offset_print' | 'signage_fabrication' | 'ready_merchandise'>('all')

  // Modals state
  const [isNewOpen, setIsNewOpen] = useState(false)
  const [followUpQuote, setFollowUpQuote] = useState<QuotationRecord | null>(null)
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)

  // Auto-open new quotation modal if arrived with ?new=true
  useEffect(() => {
    if (searchParams?.get('new') === 'true') {
      setIsNewOpen(true)
    }
  }, [searchParams])

  // Trash confirm modal state
  const [quoteToTrash, setQuoteToTrash] = useState<QuotationRecord | null>(null)
  const [isTrashConfirmOpen, setIsTrashConfirmOpen] = useState(false)
  const [isTrashing, setIsTrashing] = useState(false)

  const showNotification = (msg: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification(msg)
    dispatchToast({
      type,
      title: type === 'error' ? 'Error' : type === 'info' ? 'Notice' : 'Success',
      titleBn: type === 'error' ? 'ত্রুটি' : type === 'info' ? 'বিজ্ঞপ্তি' : 'সফল হয়েছে',
      message: msg,
    })
    setTimeout(() => setNotification(null), 3500)
  }

  const companyId = company?.id

  // Fetch authoritative quotations from server with tenant slug context
  const loadQuotations = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setIsLoading(true)
    }
    setIsRefreshing(true)
    setError(null)

    try {
      const res = await getQuotationsAction(companyId, slug)
      if (res.success && res.data) {
        setServerQuotations(res.data)
      } else if (res.error) {
        console.warn('[Quotations] Server fetch warning:', res.error)
      }
    } catch (err: any) {
      console.warn('[Quotations] Server fetch exception:', err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [companyId, slug])

  useEffect(() => {
    setIsMounted(true)
    loadQuotations(false)

    // Listen for storage, sync, or offline draft updates
    const handleSync = () => {
      setLocalTick((t) => t + 1)
      loadQuotations(true)
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
  }, [loadQuotations])

  // Active quotation dataset: Resilient extraction and deduplication of Server + Local DataStore + Drafts
  const quotations = useMemo(() => {
    if (!isMounted) return []
    const rawList: any[] = []

    // 1. Deep scan ALL browser localStorage keys
    if (typeof window !== 'undefined') {
      try {
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i)
          if (!k) continue
          const raw = window.localStorage.getItem(k)
          if (!raw) continue

          if (
            k.startsWith('printerp_tenant_quotations') ||
            k.startsWith('printerp_quotations') ||
            k.includes('quotation') ||
            k.includes('quotes') ||
            k.includes('draft') ||
            k.includes('outbox') ||
            k.includes('inkflow')
          ) {
            const extracted = extractQuotationsFromAny(raw)
            if (extracted.length > 0) {
              rawList.push(...extracted)
            }
          }
        }
      } catch (err) {
        console.warn('[Quotations] Error reading localStorage:', err)
      }
    }

    // 2. DataStore direct reads for partitioned & unpartitioned keys
    const dsTenant = PrintERPDataStore.get<any[]>(STORAGE_KEYS.QUOTATIONS, slug) || []
    if (Array.isArray(dsTenant)) rawList.push(...dsTenant)

    const dsGlobal = PrintERPDataStore.get<any[]>(STORAGE_KEYS.QUOTATIONS) || []
    if (Array.isArray(dsGlobal)) rawList.push(...dsGlobal)

    const dsDefault = PrintERPDataStore.get<any[]>(STORAGE_KEYS.QUOTATIONS, 'default') || []
    if (Array.isArray(dsDefault)) rawList.push(...dsDefault)

    // 3. LocalQuotations from useDataStore hook
    if (localQuotations && Array.isArray(localQuotations)) {
      rawList.push(...localQuotations)
    }

    // 4. Server quotations (authoritative from Supabase)
    if (serverQuotations && Array.isArray(serverQuotations)) {
      rawList.push(...serverQuotations)
    }

    // 5. Clean, deduplicate and sort
    return deduplicateQuotations(rawList, companyId, slug)
  }, [serverQuotations, localQuotations, slug, companyId, localTick, isMounted])

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

  // KPI Metrics Calculation
  const kpiMetrics = useMemo(() => {
    return QuotationService.getKpiMetrics(quotations)
  }, [quotations])

  // Commercial Pipeline Summary
  const pipelineSummary = useMemo(() => {
    const active = quotations.filter(
      (q) => q.status !== 'converted' && q.status !== 'rejected' && q.status !== 'expired'
    )
    const totalPipelineValue = active.reduce((sum, q) => sum + (Number(q.grand_total) || 0), 0)
    const expectedAdvance = active.reduce((sum, q) => {
      const pct = q.advance_percentage ?? 50
      const amt = q.advance_amount ?? Math.round(((Number(q.grand_total) || 0) * pct) / 100)
      return sum + amt
    }, 0)
    const avgMargin = active.length > 0
      ? Math.round(active.reduce((sum, q) => sum + (q.margin_percent || 40), 0) / active.length)
      : 40
    return {
      activeCount: active.length,
      totalPipelineValue,
      expectedAdvance,
      avgMargin,
    }
  }, [quotations])

  // Filtered quotations based on search, sector, & status filters
  const filteredQuotations = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return quotations.filter((q) => {
      // 1. Sector filter
      if (sectorFilter !== 'all') {
        const sec = QuotationService.getSectorForQuotation(q)
        if (sec !== sectorFilter) return false
      }

      // 2. Search filter with null-safe defensive checks
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

      // 3. Action & Status filters
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

  const handleOpenFollowUp = (quote: QuotationRecord) => {
    setFollowUpQuote(quote)
    setIsFollowUpOpen(true)
  }

  const handleFollowUpSaved = (updatedQuote: QuotationRecord) => {
    showNotification(`Follow-up logged for #${updatedQuote.quotation_number}.`)
    setServerQuotations((prev) => {
      const list = prev ? [...prev] : []
      const idx = list.findIndex((q) => q.id === updatedQuote.id || q.quotation_number === updatedQuote.quotation_number)
      if (idx >= 0) {
        list[idx] = updatedQuote
      } else {
        list.unshift(updatedQuote)
      }
      return list
    })
    loadQuotations(true)
  }

  const handleQuotationCreated = (quote: QuotationRecord) => {
    showNotification(`Quotation #${quote.quotation_number} created successfully.`)
    setServerQuotations((prev) => {
      const list = prev ? [...prev] : []
      const idx = list.findIndex((q) => q.id === quote.id || q.quotation_number === quote.quotation_number)
      if (idx >= 0) {
        list[idx] = quote
      } else {
        list.unshift(quote)
      }
      return list
    })
    loadQuotations(true)
  }

  const handleTrashQuotation = (quote: QuotationRecord) => {
    setQuoteToTrash(quote)
    setIsTrashConfirmOpen(true)
  }

  const confirmTrashQuotation = async () => {
    if (!quoteToTrash) return
    setIsTrashing(true)
    try {
      const res = await moveToTrashAction('quotations', quoteToTrash, company?.id)
      if (res.success) {
        showNotification(`Quotation #${quoteToTrash.quotation_number} moved to Trash.`, 'success')
        setServerQuotations((prev) =>
          prev ? prev.filter((q) => q.id !== quoteToTrash.id && q.quotation_number !== quoteToTrash.quotation_number) : []
        )
        setIsTrashConfirmOpen(false)
        setQuoteToTrash(null)
        loadQuotations(true)
      } else {
        showNotification(res.error || 'Failed to move quotation to trash.', 'error')
      }
    } catch (err: any) {
      showNotification(err.message || 'Error moving quotation to trash.', 'error')
    } finally {
      setIsTrashing(false)
    }
  }

  const filterTabs = [
    { id: 'all', labelEn: 'All', labelBn: 'সকল কোটেশন', count: quotations.length },
    { id: 'active', labelEn: 'Active Pipeline', labelBn: 'চলতি পাইপলাইন', count: kpiMetrics.activeCount },
    { id: 'follow_up_today', labelEn: 'Follow-Up Today', labelBn: 'আজকের ফলো-আপ', count: kpiMetrics.followUpToday, badgeColor: 'bg-amber-100 text-amber-900 font-bold dark:bg-amber-950 dark:text-amber-200' },
    { id: 'expiring_soon', labelEn: 'Expiring Soon', labelBn: 'মেয়াদ শেষের পথে', count: kpiMetrics.expiringSoon, badgeColor: 'bg-rose-100 text-rose-900 font-bold dark:bg-rose-950 dark:text-rose-200' },
    { id: 'draft', labelEn: 'Draft', labelBn: 'খসড়া', count: quotations.filter((q) => q.status === 'draft').length },
    { id: 'sent', labelEn: 'Sent', labelBn: 'পাঠানো হয়েছে', count: quotations.filter((q) => q.status === 'sent').length },
    { id: 'negotiation', labelEn: 'Negotiation', labelBn: 'দরকষাকষি', count: quotations.filter((q) => q.status === 'negotiation').length },
    { id: 'approved', labelEn: 'Approved', labelBn: 'অনুমোদিত', count: quotations.filter((q) => q.status === 'approved').length },
    { id: 'converted', labelEn: 'Converted', labelBn: 'অর্ডারে রূপান্তর', count: kpiMetrics.wonCount },
    { id: 'rejected', labelEn: 'Rejected', labelBn: 'বাতিল', count: quotations.filter((q) => q.status === 'rejected').length },
    { id: 'expired', labelEn: 'Expired', labelBn: 'মেয়াদোত্তীর্ণ', count: quotations.filter((q) => q.status === 'expired').length },
  ]

  return (
    <FeatureGate feature="quotation_pdf">
      <div className="space-y-5 max-w-7xl pb-10">
        {/* Page Header */}
        <PageHeader
          titleEn="Quotations & Sales Pipeline"
          titleBn="কোটেশন ও সেলস পাইপলাইন"
          descriptionEn="Commercial sales-control center: track active proposals, urgent follow-ups, profit margins, and order conversions."
          descriptionBn="বাণিজ্যিক সেলস কন্ট্রোল সেন্টার: চলতি কোটেশন, দ্রুত ফলো-আপ, প্রফিট মার্জিন ও জব অর্ডার কনভার্সন ট্র্যাক করুন।"
          icon={FileSpreadsheet}
          iconColor="text-blue-600"
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadQuotations(false)}
                disabled={isRefreshing}
                className="text-xs h-9 px-3 gap-1.5"
                title="Refresh Quotations"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>

              <Link href={getTenantNavHref('/trash?tab=quotations', pathname, slug)}>
                <Button variant="outline" size="sm" className="text-xs h-9 gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                  <Trash2 className="h-3.5 w-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Trash Bin</span>
                </Button>
              </Link>

              <Link href={getTenantNavHref('/pricing?tab=calculator', pathname, slug)}>
                <Button variant="outline" size="sm" className="text-xs h-9 gap-1.5 font-medium bangla-text">
                  <Calculator className="h-3.5 w-3.5 text-blue-600" />
                  {tBilingual('Live Estimator', 'লাইভ ক্যালকুলেটর')}
                </Button>
              </Link>

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
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 font-bold px-4 gap-1.5 shadow-sm hover:shadow"
              >
                <Plus className="h-4 w-4" />
                {tBilingual('New Quotation', 'নতুন কোটেশন')}
              </Button>
            </div>
          }
        />

        {/* Notifications */}
        {notification && (
          <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200 rounded-xl border border-red-200 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => loadQuotations(false)} className="h-7 text-xs">
              Retry
            </Button>
          </div>
        )}

        {/* 1. Interactive Business-Owner KPI Bar */}
        <QuotationKpiBar
          metrics={kpiMetrics}
          selectedFilter={selectedFilter}
          onSelectFilter={setSelectedFilter}
        />

        {/* Sector Streams Filter & Executive Pipeline Highlights */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900 text-white dark:bg-slate-950 border border-slate-800 shadow-md">
          {/* Sector Filter Pills */}
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
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-400'}`}>
                    {sec.count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Aggregate Numbers: Active Value & Advance Expected */}
          <div className="flex items-center gap-3 shrink-0 text-xs border-t sm:border-t-0 border-white/10 pt-2 sm:pt-0">
            <div className="text-right">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                {locale === 'bn' ? 'চলতি পাইপলাইন' : 'Active Pipeline'}
              </span>
              <span className="font-mono font-bold text-cyan-300">
                {formatBDT(pipelineSummary.totalPipelineValue)}
              </span>
            </div>
            <div className="h-6 w-px bg-white/10 hidden sm:block" />
            <div className="text-right">
              <span className="text-[10px] uppercase font-semibold text-amber-400 block">
                {locale === 'bn' ? 'প্রত্যাশিত অগ্রিম (৫০%)' : 'Est. Advance (50%)'}
              </span>
              <span className="font-mono font-bold text-amber-300">
                {formatBDT(pipelineSummary.expectedAdvance)}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Needs Attention Triage Section */}
        <NeedsAttentionPanel
          quotations={quotations}
          tenantSlug={slug}
          companyName={company?.name || 'InkFlow'}
          onOpenFollowUp={handleOpenFollowUp}
        />

        {/* 3. Search & Filter Tabs */}
        <Card className="p-3.5 shadow-xs border-slate-200 dark:border-slate-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Search Box */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search quote #, customer, phone, item..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs h-9 font-medium"
              />
            </div>

            {/* Filter Tabs Horizontal Scroll */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
              {filterTabs.map((tab) => {
                const isSelected = selectedFilter === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedFilter(tab.id)}
                    className={`h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span className="bangla-text">{tBilingual(tab.labelEn, tab.labelBn)}</span>
                    {tab.count > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                          isSelected
                            ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                            : tab.badgeColor || 'bg-slate-200/80 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                        }`}
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

        {/* 4. Quotation Directory Table / Card List */}
        <Card className="shadow-xs border-slate-200 dark:border-slate-800 overflow-hidden">
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
                <Loader2 className="h-7 w-7 animate-spin text-blue-600 mx-auto" />
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
                {(!search && selectedFilter === 'all') && (
                  <Button
                    size="sm"
                    onClick={() => setIsNewOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold mt-2"
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

        {/* 5. Modals */}
        {/* Create Quotation Modal */}
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
