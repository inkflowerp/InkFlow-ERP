'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import {
  FileSpreadsheet,
  ArrowLeft,
  Printer,
  Send,
  Copy,
  CheckCircle2,
  AlertCircle,
  Clock,
  Building,
  Phone,
  Mail,
  Receipt,
  FileCheck,
  History,
  Sliders,
  DollarSign,
  MapPin,
  ExternalLink,
  Truck,
  Wrench,
  Tag,
  Loader2,
  Check,
  ShieldCheck,
  RefreshCw,
  MessageSquare,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { FeatureGate } from '@/components/shared/feature-gate'
import {
  DEFAULT_QUOTATION_TERMS,
  DEFAULT_QUOTATION_TERMS_BN,
  QuotationRecord,
  QuotationStatus,
  LanguageMode,
  QuotationActivityRecord,
  normalizeQuotationRecord,
} from '@/types/quotation.types'
import {
  getQuotationDetailAction,
  updateQuotationStatusAction,
  convertQuotationToJobOrderAction,
  convertQuotationToInvoiceAction,
  sendQuotationAction,
} from '@/actions/quotation.actions'
import {
  formatBDT,
  toBengaliNumerals,
  numberToWordsBDT,
  numberToWordsBangla,
} from '@/lib/formatters'
import { QuotationService } from '@/services/quotation.service'
import { FollowUpModal } from '@/components/quotations/follow-up-modal'
import { NegotiationModal } from '@/components/quotations/negotiation-modal'
import { useDataStore } from '@/hooks/use-data-store'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'

function QuotationDetailContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const quoteId = (params?.id as string) || ''
  const shouldAutoPrint = searchParams?.get('print') === 'true'

  const { company, currentUser, isLoading: isTenantLoading } = useTenant()
  const { tBilingual } = useI18n()
  const slug = (params?.tenantSlug as string) || company?.slug || 'classic-printer'

  // Local datastore fallback
  const [localQuotations] = useDataStore<QuotationRecord[]>(STORAGE_KEYS.QUOTATIONS, [])
  const [localActivities] = useDataStore<QuotationActivityRecord[]>(STORAGE_KEYS.QUOTATION_ACTIVITIES, [])

  const [quote, setQuote] = useState<QuotationRecord | null>(() => {
    if (typeof window !== 'undefined' && quoteId) {
      const allLocal = PrintERPDataStore.get<any[]>(STORAGE_KEYS.QUOTATIONS) || []
      const found = allLocal.find((q) => q && (q.id === quoteId || q.quotation_number === quoteId))
      if (found) return normalizeQuotationRecord(found)

      try {
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i)
          if (!k) continue
          if (
            k.startsWith('printerp_tenant_quotations') ||
            k.startsWith('printerp_quotations') ||
            k.includes('quotation') ||
            k.includes('quotes')
          ) {
            const raw = window.localStorage.getItem(k)
            if (raw) {
              const parsed = JSON.parse(raw)
              if (Array.isArray(parsed)) {
                const f = parsed.find(
                  (item: any) =>
                    item &&
                    (item.id === quoteId ||
                      item.quotation_number === quoteId ||
                      String(item.id).toLowerCase() === quoteId.toLowerCase() ||
                      String(item.quotation_number).toLowerCase() === quoteId.toLowerCase())
                )
                if (f) return normalizeQuotationRecord(f)
              } else if (
                parsed &&
                (parsed.id === quoteId ||
                  parsed.quotation_number === quoteId ||
                  String(parsed.id).toLowerCase() === quoteId.toLowerCase() ||
                  String(parsed.quotation_number).toLowerCase() === quoteId.toLowerCase())
              ) {
                return normalizeQuotationRecord(parsed)
              }
            }
          }
        }
      } catch {}
    }
    return null
  })
  const [activities, setActivities] = useState<QuotationActivityRecord[]>([])
  const [isLoading, setIsLoading] = useState(!quote)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Presentation & Workflow State
  const [languageMode, setLanguageMode] = useState<LanguageMode>(quote?.language_mode || 'bn')
  const [notification, setNotification] = useState<string | null>(null)
  const [isConvertingInvoice, setIsConvertingInvoice] = useState(false)
  const [isConvertingOrder, setIsConvertingOrder] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)

  // Modals state
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false)
  const [isNegotiationOpen, setIsNegotiationOpen] = useState(false)

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  const localQuotationsRef = React.useRef(localQuotations)
  const localActivitiesRef = React.useRef(localActivities)

  useEffect(() => {
    localQuotationsRef.current = localQuotations
    localActivitiesRef.current = localActivities
  }, [localQuotations, localActivities])

  // Helper to find quotation across local storage keys
  const findQuoteLocally = useCallback(() => {
    if (!quoteId) return null
    const fromRef = localQuotationsRef.current?.find((q) => q && (q.id === quoteId || q.quotation_number === quoteId))
    if (fromRef) return normalizeQuotationRecord(fromRef)

    if (typeof window !== 'undefined') {
      try {
        const fromStore = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.QUOTATIONS) || []).find(
          (q) => q && (q.id === quoteId || q.quotation_number === quoteId)
        )
        if (fromStore) return normalizeQuotationRecord(fromStore)

        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i)
          if (!k) continue
          if (
            k.startsWith('printerp_tenant_quotations') ||
            k.startsWith('printerp_quotations') ||
            k.includes('quotation') ||
            k.includes('quotes')
          ) {
            const raw = window.localStorage.getItem(k)
            if (raw) {
              const parsed = JSON.parse(raw)
              if (Array.isArray(parsed)) {
                const f = parsed.find(
                  (item: any) =>
                    item &&
                    (item.id === quoteId ||
                      item.quotation_number === quoteId ||
                      String(item.id).toLowerCase() === quoteId.toLowerCase() ||
                      String(item.quotation_number).toLowerCase() === quoteId.toLowerCase())
                )
                if (f) return normalizeQuotationRecord(f)
              }
            }
          }
        }
      } catch {}
    }
    return null
  }, [quoteId])

  // Authoritative server fetch
  const fetchQuotationDetail = useCallback(async (isSilent = false) => {
    if (!quoteId) return
    if (!isSilent && !quote) setIsLoading(true)
    setIsRefreshing(true)

    try {
      const res = await getQuotationDetailAction(quoteId, company?.id, slug)
      if (res.success && res.data) {
        const norm = normalizeQuotationRecord(res.data.quotation)
        setQuote(norm)
        setActivities(res.data.activities || [])
        setError(null)
        if (norm.language_mode) {
          setLanguageMode(norm.language_mode)
        }
      } else {
        // Fallback to local store
        const fallbackQuote = findQuoteLocally()

        if (fallbackQuote) {
          setQuote(fallbackQuote)
          setError(null)
          const fallbackActs =
            localActivitiesRef.current?.filter((a) => a.quotation_id === fallbackQuote.id || a.quotation_id === quoteId) ||
            []
          setActivities(fallbackActs)
        } else if (!isTenantLoading) {
          setError(res.error || 'Quotation not found.')
        }
      }
    } catch (err: any) {
      const fallbackQuote = findQuoteLocally()

      if (fallbackQuote) {
        setQuote(fallbackQuote)
        setError(null)
      } else if (!isTenantLoading) {
        setError(err?.message || 'Failed to load quotation.')
      }
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [quoteId, company, slug, isTenantLoading, quote, findQuoteLocally])

  useEffect(() => {
    fetchQuotationDetail()
  }, [quoteId, company?.id, slug])

  // Sync if localQuotations becomes populated
  useEffect(() => {
    if (!quote && localQuotations && localQuotations.length > 0) {
      const found = localQuotations.find((q) => q.id === quoteId || q.quotation_number === quoteId)
      if (found) {
        setQuote(found)
        setError(null)
      }
    }
  }, [quote, localQuotations, quoteId])

  // Auto-print on load if query param present
  useEffect(() => {
    if (shouldAutoPrint && quote && !isLoading) {
      const timer = setTimeout(() => {
        window.print()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [shouldAutoPrint, quote, isLoading])

  if (isLoading && !quote) {
    return (
      <FeatureGate feature="quotation_pdf">
        <div className="space-y-6 max-w-6xl py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Loading quotation cockpit...</p>
        </div>
      </FeatureGate>
    )
  }

  if (!quote) {
    return (
      <FeatureGate feature="quotation_pdf">
        <div className="space-y-6 max-w-6xl">
          <Link
            href="/quotations"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Quotations Directory
          </Link>
          <Card className="p-12 text-center border-dashed">
            <FileSpreadsheet className="h-10 w-10 text-slate-400 mx-auto mb-3" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Quotation Not Found</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              The quotation you are trying to view does not exist or has been removed.
            </p>
            <Button asChild className="mt-4" size="sm">
              <Link href="/quotations">Return to Directory</Link>
            </Button>
          </Card>
        </div>
      </FeatureGate>
    )
  }

  // Handle status change via Server Action
  const handleStatusChange = async (newStatus: QuotationStatus) => {
    try {
      const res = await updateQuotationStatusAction(quote.id, newStatus, undefined, company?.id)
      if (res.success && res.data) {
        setQuote(res.data)
        showNotification(`Status updated to ${newStatus.toUpperCase()}`)
        fetchQuotationDetail(true)
      } else {
        showNotification(`Failed to update status: ${res.error}`)
      }
    } catch (err: any) {
      showNotification(`Error: ${err?.message}`)
    }
  }

  // Convert to Job Order Action (Server Action)
  const handleConvertToOrder = async () => {
    setIsConvertingOrder(true)
    try {
      const res = await convertQuotationToJobOrderAction(quote.id, {}, company?.id)
      setIsConvertingOrder(false)
      if (res.success && res.data) {
        showNotification(`Successfully converted to Job Order Ticket #${res.data.order_number}!`)
        fetchQuotationDetail(true)
      } else {
        showNotification(`Conversion failed: ${res.error}`)
      }
    } catch (err: any) {
      setIsConvertingOrder(false)
      showNotification(`Conversion error: ${err?.message}`)
    }
  }

  // Convert to Invoice Action (Server Action)
  const handleConvertToInvoice = async () => {
    setIsConvertingInvoice(true)
    try {
      const res = await convertQuotationToInvoiceAction(quote.id, company?.id)
      setIsConvertingInvoice(false)
      if (res.success && res.data) {
        showNotification(`Successfully converted to Invoice #${res.data.invoice_number}! Quoted prices preserved.`)
        fetchQuotationDetail(true)
      } else {
        showNotification(`Conversion failed: ${res.error}`)
      }
    } catch (err: any) {
      setIsConvertingInvoice(false)
      showNotification(`Conversion error: ${err?.message}`)
    }
  }

  // Duplicate Quote Action
  const handleDuplicate = async () => {
    const dupNumber = `QUO-0000${Math.floor(Math.random() * 900) + 100}`
    const duplicated: QuotationRecord = {
      ...quote,
      id: `quo-${Date.now()}`,
      quotation_number: dupNumber,
      status: 'draft',
      converted_order_id: undefined,
      converted_invoice_id: undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem<QuotationRecord>(STORAGE_KEYS.QUOTATIONS, duplicated)
    showNotification(`Quotation cloned into new Draft ${dupNumber}.`)
    router.push(`/quotations/${duplicated.id}`)
  }

  // Send WhatsApp Action
  const handleSendWhatsApp = async () => {
    const rawPhone = quote.customer_whatsapp || quote.customer_phone || ''
    const cleanPhone = rawPhone.replace(/\D/g, '')
    const formattedPhone = cleanPhone.startsWith('880')
      ? cleanPhone
      : cleanPhone.startsWith('0')
      ? `88${cleanPhone}`
      : `880${cleanPhone}`

    const text = encodeURIComponent(
      `Hello ${quote.customer_name},\nHere is your official quotation #${quote.quotation_number} from ${company?.name || 'InkFlow'}.\nGrand Total: ${formatBDT(quote.grand_total)} (Valid until ${quote.valid_until}).\nPlease review and let us know your confirmation.`
    )
    window.open(`https://wa.me/${formattedPhone}?text=${text}`, '_blank')

    await sendQuotationAction(
      {
        quotationId: quote.id,
        channel: 'whatsapp',
        format: 'text',
      },
      company?.id
    )
    fetchQuotationDetail(true)
  }

  // Send Email Action
  const handleSendEmail = async () => {
    if (!quote.customer_email) {
      showNotification('Customer email address is missing on this quotation.')
      return
    }

    setIsSendingEmail(true)
    try {
      const res = await sendQuotationAction(
        {
          quotationId: quote.id,
          channel: 'email',
          format: 'pdf',
        },
        company?.id
      )
      setIsSendingEmail(false)
      if (res.success) {
        showNotification(`Quotation PDF emailed to ${quote.customer_email} successfully.`)
        fetchQuotationDetail(true)
      } else {
        showNotification(`Email failed: ${res.error}`)
      }
    } catch (err: any) {
      setIsSendingEmail(false)
      showNotification(`Email error: ${err?.message}`)
    }
  }

  const nextAction = QuotationService.calculateNextAction(quote)
  const expiryUrgency = QuotationService.calculateExpiryUrgency(quote.valid_until)

  return (
    <FeatureGate feature="quotation_pdf">
      <div className="space-y-6 max-w-6xl pb-16 print:max-w-none print:w-full print:bg-white print:text-slate-900 print:m-0 print:p-0">
        {/* =========================================================================
            NON-PRINT CONTROLS: ACTION HIERARCHY HEADER
           ========================================================================= */}
        <div className="print:hidden space-y-3">
          <div className="flex items-center justify-between">
            <Link
              href="/quotations"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Quotations Directory
            </Link>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => fetchQuotationDetail(false)}
              disabled={isRefreshing}
              className="h-7 text-xs text-slate-500 gap-1"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              Sync
            </Button>
          </div>

          {/* Cockpit Command Center Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 text-white dark:bg-slate-950 shadow-xl space-y-4">
            {/* Top Row: Identification & Badges */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono font-black text-cyan-300 text-xl tracking-tight">
                    {quote.quotation_number}
                  </span>
                  <Badge variant="outline" className="bg-white/10 text-white border-white/20 text-xs font-bold capitalize">
                    {quote.status}
                  </Badge>
                  {quote.converted_order_id && (
                    <Badge variant="outline" className="bg-purple-900/80 text-purple-200 border-purple-400/60 text-xs font-mono font-bold">
                      Job Order #{quote.converted_order_id}
                    </Badge>
                  )}
                  {quote.converted_invoice_id && (
                    <Badge variant="outline" className="bg-emerald-900/80 text-emerald-200 border-emerald-400/60 text-xs font-mono font-bold">
                      Invoice Converted
                    </Badge>
                  )}
                </div>

                <div className="text-xs text-slate-300 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>Customer: <strong className="text-white">{quote.customer_name}</strong> {quote.customer_company && `(${quote.customer_company})`}</span>
                  <span>•</span>
                  <span>Sales: <strong className="text-white">{quote.salesperson_name}</strong></span>
                  <span>•</span>
                  <span className="font-mono text-cyan-200">Total: ৳{formatBDT(quote.grand_total)}</span>
                </div>
              </div>

              {/* Next Action & Status Dropdown */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right hidden sm:block">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Recommended Next Action</span>
                  <span className="text-xs font-bold text-amber-300">{nextAction}</span>
                </div>

                <select
                  value={quote.status}
                  onChange={(e) => handleStatusChange(e.target.value as QuotationStatus)}
                  className="h-9 px-2.5 rounded-lg bg-white/10 text-white text-xs border border-white/20 font-semibold focus:ring-1 focus:ring-cyan-400"
                >
                  <option value="draft" className="text-black">Draft</option>
                  <option value="sent" className="text-black">Sent</option>
                  <option value="viewed" className="text-black">Viewed</option>
                  <option value="negotiation" className="text-black">Negotiation</option>
                  <option value="approved" className="text-black">Approved</option>
                  <option value="rejected" className="text-black">Rejected</option>
                  <option value="expired" className="text-black">Expired</option>
                  <option value="converted" className="text-black">Converted</option>
                </select>
              </div>
            </div>

            {/* Bottom Row: Clear Action Hierarchy */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              {/* PRIMARY & SECONDARY ACTIONS */}
              <div className="flex flex-wrap items-center gap-2">
                {/* 1. PRIMARY ACTION: Follow Up */}
                <Button
                  size="sm"
                  onClick={() => setIsFollowUpOpen(true)}
                  className="h-9 text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-4 shadow-md gap-1.5 cursor-pointer"
                >
                  <Clock className="h-4 w-4" />
                  Follow Up
                </Button>

                {/* 2. WhatsApp Direct */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSendWhatsApp}
                  className="h-9 text-xs bg-emerald-500/20 text-emerald-200 border-emerald-400/40 hover:bg-emerald-500/30 gap-1.5 cursor-pointer"
                >
                  <MessageSquare className="h-4 w-4 text-emerald-400" />
                  Send WhatsApp
                </Button>

                {/* 3. Send Email */}
                {quote.customer_email && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSendEmail}
                    disabled={isSendingEmail}
                    className="h-9 text-xs bg-blue-500/20 text-blue-200 border-blue-400/40 hover:bg-blue-500/30 gap-1.5 cursor-pointer"
                  >
                    <Mail className="h-4 w-4 text-blue-400" />
                    {isSendingEmail ? 'Sending...' : 'Email PDF'}
                  </Button>
                )}

                {/* 4. Negotiate Margin */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsNegotiationOpen(true)}
                  className="h-9 text-xs bg-white/10 text-white border-white/20 hover:bg-white/20 gap-1.5 cursor-pointer"
                >
                  <Sliders className="h-3.5 w-3.5 text-cyan-300" />
                  Negotiate Margin
                </Button>

                {/* 5. Duplicate */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDuplicate}
                  className="h-9 text-xs bg-white/10 text-white border-white/20 hover:bg-white/20 gap-1.5 cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Duplicate
                </Button>
              </div>

              {/* CONVERSION & UTILITY */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Print / Save PDF */}
                <Button
                  size="sm"
                  onClick={() => window.print()}
                  className="h-9 text-xs bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 gap-1.5 cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  Print / Save PDF
                </Button>

                {/* Convert to Job Order */}
                {quote.status !== 'converted' && !quote.converted_order_id && (
                  <Button
                    size="sm"
                    onClick={handleConvertToOrder}
                    disabled={isConvertingOrder}
                    className="h-9 text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold gap-1.5 shadow-md cursor-pointer"
                  >
                    <FileCheck className="h-4 w-4" />
                    {isConvertingOrder ? 'Converting...' : 'Convert to Job Order'}
                  </Button>
                )}

                {/* Convert to Invoice */}
                {quote.status !== 'converted' && !quote.converted_invoice_id && (
                  <Button
                    size="sm"
                    onClick={handleConvertToInvoice}
                    disabled={isConvertingInvoice}
                    className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-md cursor-pointer"
                  >
                    <Receipt className="h-4 w-4" />
                    {isConvertingInvoice ? 'Converting...' : 'Convert to Invoice'}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Document Presentation Language Switcher */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-900 text-xs border border-slate-200 dark:border-slate-800">
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span>Document Presentation Language:</span>
              <span className="text-[11px] text-slate-400 font-normal">
                (Changes print/view typography between English and বাংলা)
              </span>
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant={languageMode === 'en' ? 'default' : 'outline'}
                onClick={() => setLanguageMode('en')}
                className="h-7 text-xs px-3"
              >
                English
              </Button>
              <Button
                size="sm"
                variant={languageMode === 'bn' ? 'default' : 'outline'}
                onClick={() => setLanguageMode('bn')}
                className="h-7 text-xs px-3 bangla-text"
              >
                বাংলা
              </Button>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {notification && (
          <div className="print:hidden p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* =========================================================================
            PROFESSIONAL PRINT & PDF QUOTATION DOCUMENT
            Standard A4 layout with print-optimized styling
           ========================================================================= */}
        <div className="bg-white text-slate-900 dark:bg-slate-950 dark:text-white print:bg-white print:text-slate-900 print:dark:bg-white print:dark:text-slate-900 p-8 sm:p-12 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 print:border-none print:shadow-none print:p-0 print:m-0 print:rounded-none">
          {/* Document Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 dark:border-slate-700 print:border-slate-900 pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="h-11 w-11 rounded-xl bg-blue-700 text-white font-black text-2xl flex items-center justify-center shadow-xs">
                  {(company?.name || 'I').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white print:text-slate-900">
                    {company?.name || 'InkFlow Printing & Signage Solutions'}
                  </h2>
                  {company?.name_bn && (
                    <div className="text-xs text-slate-600 dark:text-slate-400 print:text-slate-600 font-semibold">{company.name_bn}</div>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 print:text-slate-600 pt-1">
                42 Fakirapool Main Road, Motijheel Commercial Area, Dhaka-1000, Bangladesh
              </p>
              <div className="text-xs text-slate-600 dark:text-slate-400 print:text-slate-600 flex flex-wrap gap-3 pt-0.5">
                <span>Phone: +880 1711-000000</span>
                <span>•</span>
                <span>BIN: 004819284-0101</span>
                <span>•</span>
                <span>TIN: 8492049182</span>
              </div>
            </div>

            <div className="text-right space-y-1">
              <div className="text-2xl font-black text-blue-800 dark:text-blue-400 uppercase tracking-wide print:text-blue-800">
                {languageMode === 'bn' ? 'উদ্ধৃতিপত্র / প্রাক্কলন' : 'OFFICIAL QUOTATION'}
              </div>
              <div className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100 print:text-slate-900">
                {quote.quotation_number}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 print:text-slate-500">
                Date: <strong>{quote.quotation_date}</strong>
              </div>
              <div className="text-xs text-red-600 dark:text-red-400 font-semibold print:text-red-600">
                Valid Until: <strong>{quote.valid_until}</strong>
              </div>
              {quote.reference_no && (
                <div className="text-xs text-slate-700 dark:text-slate-300 print:text-slate-700 font-mono">
                  Ref / PO: <strong>{quote.reference_no}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Customer & Project Meta Box */}
          <div className="grid grid-cols-2 gap-6 my-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs print:bg-slate-50 print:border-slate-200">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 print:text-slate-500">
                {languageMode === 'bn' ? 'গ্রাহকের তথ্য (বিল প্রাপক)' : 'Bill To / Client Details'}
              </span>
              <div className="text-sm font-bold text-slate-900 dark:text-white print:text-slate-900">
                {languageMode === 'bn' && quote.customer_name_bn ? quote.customer_name_bn : quote.customer_name}
                {quote.customer_company && (
                  <span className="font-normal text-xs text-slate-600 dark:text-slate-400 print:text-slate-600 ml-1">({quote.customer_company})</span>
                )}
              </div>
              {quote.customer_address && <div className="text-slate-600 dark:text-slate-400 print:text-slate-600">{quote.customer_address}</div>}
              <div className="text-slate-600 dark:text-slate-400 print:text-slate-600 font-mono">Mobile: {quote.customer_phone}</div>
              {quote.customer_email && <div className="text-slate-600 dark:text-slate-400 print:text-slate-600">Email: {quote.customer_email}</div>}
              {quote.customer_type && (
                <div className="text-slate-500 dark:text-slate-400 print:text-slate-500 uppercase text-[10px] font-bold pt-0.5">
                  Category: {quote.customer_type}
                </div>
              )}
            </div>

            <div className="space-y-1 text-right sm:text-left">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 print:text-slate-500">
                {languageMode === 'bn' ? 'প্রকল্প বিবরণ' : 'Quotation Specifics'}
              </span>
              <div className="text-slate-700 dark:text-slate-300 print:text-slate-700">
                Sales Representative: <strong>{quote.salesperson_name}</strong>
              </div>
              {quote.delivery_date && (
                <div className="text-slate-700 dark:text-slate-300 print:text-slate-700">
                  Delivery Date: <strong>{quote.delivery_date}</strong>
                </div>
              )}
              {quote.delivery_method && (
                <div className="text-slate-700 dark:text-slate-300 print:text-slate-700 capitalize">
                  Delivery Method: <strong>{quote.delivery_method.replace('_', ' ')}</strong>
                </div>
              )}
              {quote.delivery_location && (
                <div className="text-slate-700 dark:text-slate-300 print:text-slate-700">
                  Delivery Location: <strong>{quote.delivery_location}</strong>
                </div>
              )}
              {quote.customer_bin && (
                <div className="text-slate-700 dark:text-slate-300 print:text-slate-700 font-mono">
                  Customer BIN: <strong>{quote.customer_bin}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Itemized Table */}
          <div className="my-6">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 dark:bg-slate-800 text-white print:bg-slate-900">
                  <th className="py-2.5 px-3 font-bold w-12 text-center">#</th>
                  <th className="py-2.5 px-3 font-bold">
                    {languageMode === 'bn' ? 'পণ্যের বিবরণ ও স্পেসিফিকেশন' : 'Item Description & Specifications'}
                  </th>
                  <th className="py-2.5 px-3 font-bold text-center">
                    {languageMode === 'bn' ? 'পরিমাপ (W × H)' : 'Dimensions'}
                  </th>
                  <th className="py-2.5 px-3 font-bold text-center">
                    {languageMode === 'bn' ? 'ক্ষেত্রফল (SFT)' : 'Area / Qty'}
                  </th>
                  <th className="py-2.5 px-3 font-bold text-right">
                    {languageMode === 'bn' ? 'একক দর (৳)' : 'Unit Rate (৳)'}
                  </th>
                  <th className="py-2.5 px-3 font-bold text-right">
                    {languageMode === 'bn' ? 'মোট মূল্য (৳)' : 'Total (৳)'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 border-b border-slate-200 dark:border-slate-800 print:divide-slate-200 print:border-slate-200">
                {quote.items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 print:hover:bg-transparent">
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-500 dark:text-slate-400 print:text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 dark:text-white print:text-slate-900">
                        {languageMode === 'bn' && item.description_bn ? item.description_bn : item.description}
                      </div>
                      {item.material_spec && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 print:text-slate-500">{item.material_spec}</div>
                      )}
                      {item.finishing && item.finishing !== 'None' && (
                        <div className="text-[10px] text-blue-600 dark:text-blue-400 print:text-blue-600 font-medium">Finishing: {item.finishing}</div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-mono">
                      {item.width > 0 && item.height > 0 ? `${item.width} × ${item.height} ${item.dimension_unit}` : '-'}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-semibold">
                      {item.area_sft > 0 ? `${item.area_sft} sft` : `${item.quantity} ${item.unit}`}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-medium">
                      {formatBDT(item.unit_rate)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white print:text-slate-900">
                      {formatBDT(item.item_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Summary & Terms */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6 items-start">
            {/* Terms and Notes */}
            <div className="space-y-3 text-xs">
              <div>
                <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] print:text-slate-900">
                  {languageMode === 'bn' ? 'বিল ও ডেলিভারির শর্তাবলী:' : 'Terms & Conditions:'}
                </span>
                <pre className="font-sans whitespace-pre-line text-slate-600 dark:text-slate-400 print:text-slate-600 text-[11px] leading-relaxed mt-1">
                  {quote.terms_and_conditions || (languageMode === 'bn' ? DEFAULT_QUOTATION_TERMS_BN : DEFAULT_QUOTATION_TERMS)}
                </pre>
              </div>
              {quote.notes && (
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 print:bg-slate-50 print:border-slate-200 print:text-slate-700">
                  <strong>Note:</strong> {quote.notes}
                </div>
              )}
            </div>

            {/* Subtotal, Discount, VAT & Grand Total */}
            <div className="space-y-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-900 print:bg-slate-50 print:border-slate-200">
              <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400 print:text-slate-600">
                <span>{languageMode === 'bn' ? 'উপমোট (Subtotal):' : 'Subtotal:'}</span>
                <span className="font-mono font-semibold">{formatBDT(quote.subtotal)}</span>
              </div>

              {quote.discount_amount > 0 && (
                <div className="flex justify-between py-1 text-red-600 dark:text-red-400 font-semibold print:text-red-600">
                  <span>{languageMode === 'bn' ? 'বিশেষ ছাড় (Special Discount):' : 'Negotiated Discount:'}</span>
                  <span className="font-mono">- {formatBDT(quote.discount_amount)}</span>
                </div>
              )}

              <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400 print:text-slate-600">
                <span>{languageMode === 'bn' ? `ভ্যাট / মূসক (${quote.vat_rate}%):` : `NBR VAT (${quote.vat_rate}%):`}</span>
                <span className="font-mono">+ {formatBDT(quote.vat_amount)}</span>
              </div>

              <div className="flex justify-between py-2 border-t-2 border-slate-900 dark:border-slate-700 print:border-slate-900 font-black text-sm text-slate-900 dark:text-white print:text-slate-900">
                <span>{languageMode === 'bn' ? 'সর্বমোট মূল্য (Grand Total):' : 'Grand Total (BDT):'}</span>
                <span className="font-mono text-base text-blue-700 dark:text-blue-400 print:text-blue-700">{formatBDT(quote.grand_total)}</span>
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 print:text-slate-500 pt-1 italic">
                {languageMode === 'bn'
                  ? `কথায়: ${numberToWordsBangla(quote.grand_total)}`
                  : `In Words: ${numberToWordsBDT(quote.grand_total)}`}
              </div>
            </div>
          </div>

          {/* Signature Block */}
          <div className="grid grid-cols-2 gap-12 mt-16 pt-6 border-t border-dashed border-slate-300 dark:border-slate-700 print:border-slate-300 text-xs">
            <div className="text-center space-y-1">
              <div className="font-bold text-slate-900 dark:text-white print:text-slate-900">{quote.salesperson_name}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 print:text-slate-500">
                {languageMode === 'bn' ? 'প্রস্তুতকারক (বিক্রয় বিভাগ)' : 'Prepared By (Sales Dept)'}
              </div>
            </div>

            <div className="text-center space-y-1">
              <div className="font-bold text-slate-900 dark:text-white print:text-slate-900">Authorized Signatory</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 print:text-slate-500">
                {languageMode === 'bn' ? 'অনুমোদনকারী কর্মকর্তা ও সিল' : `For ${company?.name || 'InkFlow Solutions'}`}
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            NON-PRINT ACTIVITY TIMELINE
           ========================================================================= */}
        <div className="print:hidden">
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <History className="h-4 w-4 text-purple-600" />
                Quotation Activity & Negotiation Timeline
              </CardTitle>
              <CardDescription className="text-xs">
                Authoritative history of customer follow-ups, price negotiations, status advances, and order conversions.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              {activities.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No recorded activity yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.map((act) => (
                    <div key={act.id} className="flex items-start gap-3 text-xs">
                      <div className="h-2.5 w-2.5 rounded-full bg-blue-600 mt-1 shrink-0" />
                      <div className="flex-1 border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold capitalize text-slate-900 dark:text-white">
                            {act.action.replace('_', ' ')}
                          </span>
                          <span className="text-slate-400 font-mono text-[11px]">
                            {new Date(act.created_at).toLocaleString('en-BD')}
                          </span>
                        </div>
                        {act.details && (
                          <p className="text-slate-600 dark:text-slate-300 mt-1 font-normal">
                            {act.details}
                          </p>
                        )}
                        <div className="text-[11px] text-slate-400 mt-0.5">By {act.actor_name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Modals */}
        <FollowUpModal
          open={isFollowUpOpen}
          onOpenChange={setIsFollowUpOpen}
          quotation={quote}
          onFollowUpRecorded={(updated) => {
            setQuote(updated)
            showNotification(`Follow-up saved for #${updated.quotation_number}`)
            fetchQuotationDetail(true)
          }}
          companyId={company?.id || 'c-01'}
        />

        <NegotiationModal
          open={isNegotiationOpen}
          onOpenChange={setIsNegotiationOpen}
          quotation={quote}
          onNegotiationApplied={(updated) => {
            setQuote(updated)
            showNotification(`Negotiated total ${formatBDT(updated.grand_total)} applied (Margin: ${updated.margin_percent}%).`)
            fetchQuotationDetail(true)
          }}
          companyId={company?.id || 'c-01'}
        />
      </div>
    </FeatureGate>
  )
}

export default function QuotationDetailPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
          <FileSpreadsheet className="h-6 w-6 text-indigo-500 animate-pulse" />
          <p className="text-xs text-slate-500">Loading Quotation...</p>
        </div>
      }
    >
      <QuotationDetailContent />
    </React.Suspense>
  )
}

