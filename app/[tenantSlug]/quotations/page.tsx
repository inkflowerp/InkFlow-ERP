'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
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
import { QuotationRecord, QuotationStatus } from '@/types/quotation.types'
import { QuotationService } from '@/services/quotation.service'
import { getQuotationsAction } from '@/actions/quotation.actions'
import { QuotationKpiBar } from '@/components/quotations/quotation-kpi-bar'
import { NeedsAttentionPanel } from '@/components/quotations/needs-attention-panel'
import { QuotationTable } from '@/components/quotations/quotation-table'
import { FollowUpModal } from '@/components/quotations/follow-up-modal'
import { NewQuotationModal } from '@/components/quotations/new-quotation-modal'
import { useDataStore } from '@/hooks/use-data-store'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'

export default function QuotationsPage() {
  const params = useParams()
  const { company } = useTenant()
  const { checkCanCreate, openLimitExceededModal } = useSubscription()
  const { tBilingual, locale } = useI18n()
  const slug = (params?.tenantSlug as string) || company?.slug || 'classic-printer'

  // Authoritative server state + local store cache
  const [localQuotations] = useDataStore<QuotationRecord[]>(STORAGE_KEYS.QUOTATIONS, undefined, slug)
  const [serverQuotations, setServerQuotations] = useState<QuotationRecord[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filtering & Search
  const [search, setSearch] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<string>('all')

  // Modals state
  const [isNewOpen, setIsNewOpen] = useState(false)
  const [followUpQuote, setFollowUpQuote] = useState<QuotationRecord | null>(null)
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  const companyId = company?.id

  // Fetch authoritative quotations from server with tenant slug context
  const loadQuotations = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true)
    setIsRefreshing(true)
    setError(null)

    try {
      const res = await getQuotationsAction(companyId, slug)
      if (res.success && res.data) {
        setServerQuotations(res.data)
      } else if (res.error) {
        setError(res.error)
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load quotations.')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [companyId, slug])

  useEffect(() => {
    loadQuotations()
  }, [loadQuotations])

  // Active quotation dataset: Resilient deduplication of Server + Local DataStore
  const quotations = useMemo(() => {
    const map = new Map<string, QuotationRecord>()

    // 1. Deep scan ALL browser localStorage keys for any stored quotations
    if (typeof window !== 'undefined') {
      try {
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i)
          if (!k) continue
          if (k.startsWith('printerp_tenant_quotations') || k.includes('quotation')) {
            const raw = window.localStorage.getItem(k)
            if (raw) {
              const parsed = JSON.parse(raw)
              if (Array.isArray(parsed)) {
                for (const q of parsed) {
                  if (q && (q.id || q.quotation_number)) {
                    const key = q.id || q.quotation_number
                    map.set(key, q)
                    if (q.quotation_number) map.set(q.quotation_number, q)
                    if (q.id) map.set(q.id, q)
                  }
                }
              } else if (parsed && typeof parsed === 'object' && (parsed.id || parsed.quotation_number)) {
                const key = parsed.id || parsed.quotation_number
                map.set(key, parsed)
                if (parsed.quotation_number) map.set(parsed.quotation_number, parsed)
                if (parsed.id) map.set(parsed.id, parsed)
              }
            }
          }
        }
      } catch (err) {
        console.warn('[Quotations] Error reading localStorage:', err)
      }
    }

    // 2. Also incorporate localQuotations from useDataStore hook
    if (localQuotations && Array.isArray(localQuotations)) {
      for (const q of localQuotations) {
        if (!q) continue
        const key = q.id || q.quotation_number
        if (key) {
          map.set(key, q)
          if (q.quotation_number) map.set(q.quotation_number, q)
          if (q.id) map.set(q.id, q)
        }
      }
    }

    // 3. Server quotations (authoritative from Supabase)
    if (serverQuotations && Array.isArray(serverQuotations)) {
      for (const q of serverQuotations) {
        if (!q) continue
        const key = q.id || q.quotation_number
        if (key) {
          map.set(key, q)
          if (q.quotation_number) map.set(q.quotation_number, q)
          if (q.id) map.set(q.id, q)
        }
      }
    }

    // 4. Extract unique list
    const uniqueList = Array.from(new Set(map.values()))

    return uniqueList.sort((a, b) => {
      const timeA = new Date(b.created_at || b.quotation_date || 0).getTime()
      const timeB = new Date(a.created_at || a.quotation_date || 0).getTime()
      return timeA - timeB
    })
  }, [serverQuotations, localQuotations, slug, companyId])


  // KPI Metrics Calculation
  const kpiMetrics = useMemo(() => {
    return QuotationService.getKpiMetrics(quotations)
  }, [quotations])

  // Filtered quotations based on search & action-oriented filters
  const filteredQuotations = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return quotations.filter((q) => {
      // 1. Search filter
      const term = search.toLowerCase().trim()
      const matchSearch =
        !term ||
        q.quotation_number.toLowerCase().includes(term) ||
        q.customer_name.toLowerCase().includes(term) ||
        (q.customer_company && q.customer_company.toLowerCase().includes(term)) ||
        (q.salesperson_name && q.salesperson_name.toLowerCase().includes(term)) ||
        (q.customer_phone && q.customer_phone.includes(term)) ||
        (q.items && q.items.some((it) => it.description.toLowerCase().includes(term)))

      if (!matchSearch) return false

      // 2. Action & Status filters
      if (selectedFilter === 'all') return true
      if (selectedFilter === 'active') {
        return q.status !== 'converted' && q.status !== 'rejected' && q.status !== 'expired'
      }
      if (selectedFilter === 'follow_up_today') {
        if (q.follow_up_date) {
          const d = new Date(q.follow_up_date)
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
  }, [quotations, search, selectedFilter])

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

  const filterTabs = [
    { id: 'all', label: 'All', count: quotations.length },
    { id: 'active', label: 'Active Pipeline', count: kpiMetrics.activeCount },
    { id: 'follow_up_today', label: 'Follow-Up Today', count: kpiMetrics.followUpToday, badgeColor: 'bg-amber-100 text-amber-900 font-bold' },
    { id: 'expiring_soon', label: 'Expiring Soon', count: kpiMetrics.expiringSoon, badgeColor: 'bg-rose-100 text-rose-900 font-bold' },
    { id: 'draft', label: 'Draft', count: quotations.filter((q) => q.status === 'draft').length },
    { id: 'sent', label: 'Sent', count: quotations.filter((q) => q.status === 'sent').length },
    { id: 'negotiation', label: 'Negotiation', count: quotations.filter((q) => q.status === 'negotiation').length },
    { id: 'approved', label: 'Approved', count: quotations.filter((q) => q.status === 'approved').length },
    { id: 'converted', label: 'Converted', count: kpiMetrics.wonCount },
    { id: 'rejected', label: 'Rejected', count: quotations.filter((q) => q.status === 'rejected').length },
    { id: 'expired', label: 'Expired', count: quotations.filter((q) => q.status === 'expired').length },
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

              <Link href={`/${slug}/pricing`}>
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
                    <span>{tab.label}</span>
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
          companyId={company?.id || 'c-01'}
        />

        {/* Follow-up Logging Modal */}
        <FollowUpModal
          open={isFollowUpOpen}
          onOpenChange={setIsFollowUpOpen}
          quotation={followUpQuote}
          onFollowUpRecorded={handleFollowUpSaved}
          companyId={company?.id || 'c-01'}
        />
      </div>
    </FeatureGate>
  )
}
