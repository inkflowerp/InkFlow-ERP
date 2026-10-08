'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams, useRouter, usePathname } from 'next/navigation'
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
 ArrowUpRight,
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
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'
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
import { PdfActionButtons } from '@/components/pdf/pdf-action-buttons'
import { QuotationPdfDocument } from '@/components/pdf/documents/quotation-pdf-document'
import { useDocumentTemplate } from '@/hooks/use-document-template'
import { LiveA4Preview } from '@/components/settings/document-template/print-a4-preview'
import {
 formatBDT,
 toBengaliNumerals,
 numberToWordsBDT,
 numberToWordsBangla,
} from '@/lib/formatters'
import * as QuotationService from '@/lib/quotations/quotation-utils'
import { FollowUpModal } from '@/components/quotations/follow-up-modal'
import { NegotiationModal } from '@/components/quotations/negotiation-modal'
import { useDataStore } from '@/hooks/use-data-store'
import { PrintFlowDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'

function QuotationDetailContent() {
 const params = useParams()
 const searchParams = useSearchParams()
 const router = useRouter()
 const pathname = usePathname()
 const quoteId = (params?.id as string) || ''
 const shouldAutoPrint = searchParams?.get('print') === 'true'

 const { company, currentUser, isLoading: isTenantLoading } = useTenant()
 const { tBilingual } = useI18n()
 const slug = (params?.tenantSlug as string) || company?.slug || 'classic-printer'
 const { template: docTemplate } = useDocumentTemplate(slug, 'quotation')

 const effectiveCompanyName = company?.name || (company?.slug ? company.slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Vision Sign')
 const effectiveAddress = company?.address || 'House 12, Road 5, Sector 7, Uttara, Dhaka-1230'
 const effectivePhone = company?.phone || '+880 1712 345678'
 const effectiveEmail = company?.email || (company?.slug ? `sales@${company.slug}.com` : 'info@printflow.bd')
 const effectiveWebsite = company?.website || (company?.slug ? `www.${company.slug}.printflow.bd` : 'www.printflow.bd')

  // Local datastore fallback
 const [localQuotations] = useDataStore<QuotationRecord[]>(STORAGE_KEYS.QUOTATIONS, [])
 const [localActivities] = useDataStore<QuotationActivityRecord[]>(STORAGE_KEYS.QUOTATION_ACTIVITIES, [])

 const [quote, setQuote] = useState<QuotationRecord | null>(null)
 const [activities, setActivities] = useState<QuotationActivityRecord[]>([])
 const [isLoading, setIsLoading] = useState(true)
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
 const fromStore = (PrintFlowDataStore.get<any[]>(STORAGE_KEYS.QUOTATIONS) || []).find(
          (q) => q && (q.id === quoteId || q.quotation_number === quoteId)
        )
 if (fromStore) return normalizeQuotationRecord(fromStore)

 for (let i = 0; i < window.localStorage.length; i++) {
 const k = window.localStorage.key(i)
 if (!k) continue
 if (
 k.startsWith('printflow_tenant_quotations') ||
 k.startsWith('printflow_quotations') ||
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
        <div className="space-y-6 py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto"/>
          <p className="text-xs text-muted-foreground font-medium">Loading quotation cockpit...</p>
        </div>
      </FeatureGate>
    )
  }

 if (!quote) {
 return (
      <FeatureGate feature="quotation_pdf">
        <div className="space-y-6">
          <Link
 href={getTenantNavHref('/quotations', pathname, slug)}
 className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground dark:hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5"/>
 Back to Quotations Directory
          </Link>
          <Card className="p-12 text-center border-dashed">
            <FileSpreadsheet className="h-10 w-10 text-muted-foreground mx-auto mb-3"/>
            <h2 className="text-base font-bold text-foreground">Quotation Not Found</h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
 The quotation you are trying to view does not exist or has been removed.
            </p>
            <Button asChild className="mt-4"size="sm">
              <Link href={getTenantNavHref('/quotations', pathname, slug)}>Return to Directory</Link>
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
 const res = await convertQuotationToJobOrderAction(
 quote.id,
        { advanceAmount: quote.advance_amount ?? undefined },
 company?.id
      )
 setIsConvertingOrder(false)
 if (res.success && res.data) {
        // Hydrate client DataStore immediately so Commercial Orders & Job Hub has it without refresh
 try {
 PrintFlowDataStore.createSalesOrderWithIntegrations(res.data)
 if (slug && slug !== 'default') {
 PrintFlowDataStore.addItem(STORAGE_KEYS.ORDERS, res.data, slug)
 if (res.data.job_order) {
 PrintFlowDataStore.addItem(STORAGE_KEYS.JOB_ORDERS, res.data.job_order, slug)
            }
 if (res.data.production_job) {
 PrintFlowDataStore.addItem(STORAGE_KEYS.PRODUCTION_JOBS, res.data.production_job, slug)
            }
 PrintFlowDataStore.updateItem<QuotationRecord>(STORAGE_KEYS.QUOTATIONS, quote.id, {
 status: 'converted',
 converted_order_id: res.data.order_number,
            }, slug)
          }
 PrintFlowDataStore.updateItem<QuotationRecord>(STORAGE_KEYS.QUOTATIONS, quote.id, {
 status: 'converted',
 converted_order_id: res.data.order_number,
          })
        } catch (e) {
 console.warn('[QuotationDetail] Client store hydration:', e)
        }

 setQuote((prev) =>
 prev
            ? {
                ...prev,
 status: 'converted',
 converted_order_id: res.data.order_number,
              }
            : prev
        )

        // Dispatch instant multi-window & cross-component sync events
 if (typeof window !== 'undefined') {
 window.dispatchEvent(new CustomEvent('printflow_data_sync'))
 window.dispatchEvent(new CustomEvent('printflow_table_synced:sales_orders'))
 window.dispatchEvent(new CustomEvent('printflow_table_synced:job_orders'))
 window.dispatchEvent(new CustomEvent('printflow_table_synced:quotations'))
 window.dispatchEvent(new CustomEvent('printflow_table_synced:production_jobs'))
 window.dispatchEvent(new CustomEvent('printflow_table_synced'))
        }

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
 try {
 PrintFlowDataStore.addItem(STORAGE_KEYS.INVOICES, res.data)
 if (slug && slug !== 'default') {
 PrintFlowDataStore.addItem(STORAGE_KEYS.INVOICES, res.data, slug)
 PrintFlowDataStore.updateItem<QuotationRecord>(STORAGE_KEYS.QUOTATIONS, quote.id, {
 status: 'converted',
 converted_invoice_id: res.data.id || res.data.invoice_number,
            }, slug)
          }
 PrintFlowDataStore.updateItem<QuotationRecord>(STORAGE_KEYS.QUOTATIONS, quote.id, {
 status: 'converted',
 converted_invoice_id: res.data.id || res.data.invoice_number,
          })
        } catch {}

 const invoiceData = res.data
 setQuote((prev) =>
 prev
            ? {
                ...prev,
 status: 'converted',
 converted_invoice_id: invoiceData.id || invoiceData.invoice_number,
              }
            : prev
        )

 if (typeof window !== 'undefined') {
 window.dispatchEvent(new CustomEvent('printflow_data_sync'))
 window.dispatchEvent(new CustomEvent('printflow_table_synced:invoices'))
 window.dispatchEvent(new CustomEvent('printflow_table_synced:quotations'))
 window.dispatchEvent(new CustomEvent('printflow_table_synced'))
        }

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
 PrintFlowDataStore.addItem<QuotationRecord>(STORAGE_KEYS.QUOTATIONS, duplicated)
 showNotification(`Quotation cloned into new Draft ${dupNumber}.`)
 router.push(getTenantNavHref(`/quotations/${duplicated.id}`, pathname, slug))
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

 const messageText = QuotationService.generateBangladeshiQuotationWhatsAppMessage(
 quote,
 company?.name || 'PrintFlow Printing & Signage Solutions'
    )

 window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`, '_blank')

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

 const advancePct = quote.advance_percentage !== undefined && quote.advance_percentage !== null ? quote.advance_percentage : 50
 const advanceAmt = quote.advance_amount !== undefined && quote.advance_amount !== null ? quote.advance_amount : Math.round((quote.grand_total * advancePct) / 100)
 const dueOnDeliv = quote.due_on_delivery !== undefined && quote.due_on_delivery !== null ? quote.due_on_delivery : Math.max(0, quote.grand_total - advanceAmt)

 return (
    <FeatureGate feature="quotation_pdf">
      <div className="space-y-6 pb-16 print:max-w-none print:w-full print:bg-white print:text-foreground print:m-0 print:p-0">
        {/* =========================================================================
 NON-PRINT CONTROLS: ACTION HIERARCHY HEADER
           ========================================================================= */}
        <div className="print:hidden space-y-3">
          <div className="flex items-center justify-between">
            <Link
 href={getTenantNavHref('/quotations', pathname, slug)}
 className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground dark:hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5"/>
 Back to Quotations Directory
            </Link>

            <Button
 size="sm"variant="ghost"onClick={() => fetchQuotationDetail(false)}
 disabled={isRefreshing}
 className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground dark:hover:text-muted-foreground cursor-pointer"title="Sync / Refresh quotation data">
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Cockpit Command Center Card */}
          <div className="p-4 sm:p-5 rounded-xl bg-surface-inset text-foreground shadow-xs space-y-4">
            {/* Top Row: Identification & Badges */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="tabular-nums font-black text-primary text-xl tracking-tight">
                    {quote.quotation_number}
                  </span>
                  <Badge variant="outline"className="bg-card/10 text-white border-white/20 text-xs font-bold capitalize">
                    {quote.status}
                  </Badge>
                  {quote.converted_order_id && (
                    <Link href={getTenantNavHref(`/orders?search=${quote.converted_order_id}`, pathname, slug)}>
                      <Badge variant="outline"className="bg-primary/80 text-primary border-border/60 text-xs tabular-nums font-bold hover:bg-primary transition-colors cursor-pointer flex items-center gap-1">
                        <span>Job Order #{quote.converted_order_id}</span>
                        <ArrowUpRight className="h-3 w-3"/>
                      </Badge>
                    </Link>
                  )}
                  {quote.converted_invoice_id && (
                    <Badge variant="outline" className="bg-success-surface text-success border-success-border text-xs tabular-nums font-bold">
                      Invoice Converted
                    </Badge>
                  )}
                </div>

                <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>Customer: <strong className="text-white">{quote.customer_name}</strong> {quote.customer_company && `(${quote.customer_company})`}</span>
                  <span>•</span>
                  <span>Sales: <strong className="text-white">{quote.salesperson_name}</strong></span>
                  <span>•</span>
                  <span className="tabular-nums text-primary">Total: {formatBDT(quote.grand_total)}</span>
                </div>
              </div>

              {/* Next Action & Status Dropdown */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right hidden sm:block">
                  <span className="text-xs text-muted-foreground uppercase font-semibold block">Recommended Next Action</span>
                  <span className="text-xs font-bold text-warning">{nextAction}</span>
                </div>

                <select
 value={quote.status}
 onChange={(e) => handleStatusChange(e.target.value as QuotationStatus)}
 className="h-9 px-2.5 rounded-lg bg-card/10 text-white text-xs border border-white/20 font-semibold focus:ring-1 focus:ring-ring">
                  <option value="draft"className="text-foreground">Draft</option>
                  <option value="sent"className="text-foreground">Sent</option>
                  <option value="viewed"className="text-foreground">Viewed</option>
                  <option value="negotiation"className="text-foreground">Negotiation</option>
                  <option value="approved"className="text-foreground">Approved</option>
                  <option value="rejected"className="text-foreground">Rejected</option>
                  <option value="expired"className="text-foreground">Expired</option>
                  <option value="converted"className="text-foreground">Converted</option>
                </select>
              </div>
            </div>

            {/* Commercial Advance Terms HUD Banner */}
            <div className="p-3 rounded-xl bg-card-elevated/80 border border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-xs uppercase font-bold text-muted-foreground block">Total Quoted Value</span>
                <span className="text-sm font-black tabular-nums text-white">{formatBDT(quote.grand_total)}</span>
              </div>
              <div>
                <span className="text-xs uppercase font-bold text-warning block">
 Advance Required ({advancePct}%)
                </span>
                <span className="text-sm font-black tabular-nums text-warning">{formatBDT(advanceAmt)}</span>
              </div>
              <div>
                <span className="text-xs uppercase font-bold text-muted-foreground block">Balance on Delivery</span>
                <span className="text-sm font-black tabular-nums text-foreground">{formatBDT(dueOnDeliv)}</span>
              </div>
              <div>
                <span className="text-xs uppercase font-bold text-muted-foreground block">Internal Margin Floor</span>
                <span className={`text-sm font-black tabular-nums ${quote.margin_percent && quote.margin_percent >= 30 ? 'text-success' : 'text-warning'}`}>
                  {quote.margin_percent || 40}% ({formatBDT(quote.total_cost || Math.round(quote.subtotal * 0.55))})
                </span>
              </div>
            </div>

            {/* Bottom Row: Clear Action Hierarchy */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              {/* PRIMARY & SECONDARY ACTIONS */}
              <div className="flex flex-wrap items-center gap-2">
                {/* 1. PRIMARY ACTION: Follow Up */}
                <Button
 size="sm"onClick={() => setIsFollowUpOpen(true)}
 className="h-9 text-xs bg-warning hover:bg-warning text-foreground font-black px-4 shadow-xs gap-1.5 cursor-pointer">
                  <Clock className="h-4 w-4"/>
 Follow Up
                </Button>

                {/* 2. WhatsApp Direct */}
                <Button
 size="sm"variant="outline"onClick={handleSendWhatsApp}
 className="h-9 text-xs bg-success/20 text-success border-success-border/40 hover:bg-success/30 gap-1.5 cursor-pointer">
                  <MessageSquare className="h-4 w-4 text-success"/>
 Send WhatsApp
                </Button>

                {/* 3. Send Email */}
                {quote.customer_email && (
                  <Button
 size="sm"variant="outline"onClick={handleSendEmail}
 disabled={isSendingEmail}
 className="h-9 text-xs bg-primary/20 text-primary border-border/40 hover:bg-primary/30 gap-1.5 cursor-pointer">
                    <Mail className="h-4 w-4 text-primary"/>
                    {isSendingEmail ? 'Sending...' : 'Email PDF'}
                  </Button>
                )}

                {/* 4. Negotiate Margin */}
                <Button
 size="sm"variant="outline"onClick={() => setIsNegotiationOpen(true)}
 className="h-9 text-xs bg-card/10 text-white border-white/20 hover:bg-card/20 gap-1.5 cursor-pointer">
                  <Sliders className="h-3.5 w-3.5 text-primary"/>
 Negotiate Margin
                </Button>

                {/* 5. Duplicate */}
                <Button
 size="sm"variant="outline"onClick={handleDuplicate}
 className="h-9 text-xs bg-card/10 text-white border-white/20 hover:bg-card/20 gap-1.5 cursor-pointer">
                  <Copy className="h-3.5 w-3.5"/>
 Duplicate
                </Button>
              </div>

              {/* CONVERSION & UTILITY */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Print Direct */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.print()}
                  className="h-9 text-xs font-semibold text-foreground border-input hover:bg-muted cursor-pointer"
                  title="Print quotation document"
                >
                  <Printer className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                  Print
                </Button>

                {/* Print / Vector PDF Engine */}
                <PdfActionButtons
                  document={
                    <QuotationPdfDocument
                      quotation={quote}
                      template={docTemplate}
                      company={{
                        name: effectiveCompanyName,
                        tagline: company?.legal_name || 'Printing & Signage Specialists',
                        address: effectiveAddress,
                        phone: effectivePhone,
                        email: effectiveEmail,
                        website: effectiveWebsite,
                        binNumber: company?.bin_no,
                      }}
                    />
                  }
                  filename={`QUO-${quote.quotation_number}`}
                  title={`Quotation #${quote.quotation_number}`}
                />

                {/* Convert to Job Order */}
                {quote.status !== 'converted' && !quote.converted_order_id ? (
                  <Button
 size="sm"onClick={handleConvertToOrder}
 disabled={isConvertingOrder}
 className="h-9 text-xs bg-primary hover:bg-primary text-white font-bold gap-1.5 shadow-xs cursor-pointer">
                    <FileCheck className="h-4 w-4"/>
                    {isConvertingOrder ? 'Converting...' : 'Convert to Job Order'}
                  </Button>
                ) : quote.converted_order_id ? (
                  <Link href={getTenantNavHref(`/orders?search=${quote.converted_order_id}`, pathname, slug)}>
                    <Button
 size="sm"className="h-9 text-xs bg-primary hover:bg-primary text-white font-bold gap-1.5 shadow-xs cursor-pointer">
                      <ArrowUpRight className="h-4 w-4"/>
 View Job Order #{quote.converted_order_id} →
                    </Button>
                  </Link>
                ) : null}

                {/* Convert to Invoice */}
                {quote.status !== 'converted' && !quote.converted_invoice_id && (
                  <Button
 size="sm"onClick={handleConvertToInvoice}
 disabled={isConvertingInvoice}
 className="h-9 text-xs bg-success hover:bg-success text-white font-bold gap-1.5 shadow-xs cursor-pointer">
                    <Receipt className="h-4 w-4"/>
                    {isConvertingInvoice ? 'Converting...' : 'Convert to Invoice'}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Document Presentation Language Switcher */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted text-xs border border-border">
            <span className="font-semibold text-foreground flex items-center gap-2">
              <span>Document Presentation Language:</span>
              <span className="text-xs text-muted-foreground font-normal">
                (Changes print/view typography between English and বাংলা)
              </span>
            </span>
            <div className="flex items-center gap-1">
              <Button
 size="sm"variant={languageMode === 'en' ? 'default' : 'outline'}
 onClick={() => setLanguageMode('en')}
 className="h-7 text-xs px-3">
 English
              </Button>
              <Button
 size="sm"variant={languageMode === 'bn' ? 'default' : 'outline'}
 onClick={() => setLanguageMode('bn')}
 className="h-7 text-xs px-3 bangla-text">
                বাংলা
              </Button>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {notification && (
          <div className="print:hidden p-3 bg-success-surface text-success rounded-xl text-xs font-semibold flex items-center gap-2 border border-success-border bg-success-surface text-success border-success-border animate-in fade-in-0">
            <CheckCircle2 className="h-4 w-4 text-success shrink-0"/>
            <span>{notification}</span>
          </div>
        )}

        {/* =========================================================================
            PROFESSIONAL PRINT & PDF QUOTATION DOCUMENT
            Synchronized with Settings -> Document Templates
           ========================================================================= */}
        <div id="quotation-print-area" className="w-full flex justify-center">
          <LiveA4Preview
            settings={docTemplate}
            quotationData={quote}
            showControls={false}
            companyName={effectiveCompanyName}
            companyAddress={effectiveAddress}
            companyPhone={effectivePhone}
            companyEmail={effectiveEmail}
            companyWebsite={effectiveWebsite}
            companyLogoUrl={company?.logo_url || undefined}
            onPrintPdf={() => window.print()}
          />
        </div>

        {/* =========================================================================
 NON-PRINT ACTIVITY TIMELINE
           ========================================================================= */}
        <div className="print:hidden">
          <Card>
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <History className="h-4 w-4 text-primary"/>
 Quotation Activity & Negotiation Timeline
              </CardTitle>
              <CardDescription className="text-xs">
 Authoritative history of customer follow-ups, price negotiations, status advances, and order conversions.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              {activities.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
 No recorded activity yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.map((act) => (
                    <div key={act.id} className="flex items-start gap-3 text-xs">
                      <div className="h-2.5 w-2.5 rounded-full bg-primary mt-1 shrink-0"/>
                      <div className="flex-1 border-b border-border pb-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold capitalize text-foreground">
                            {act.action.replace('_', ' ')}
                          </span>
                          <span className="text-muted-foreground tabular-nums text-xs">
                            {new Date(act.created_at).toLocaleString('en-BD')}
                          </span>
                        </div>
                        {act.details && (
                          <p className="text-muted-foreground mt-1 font-normal">
                            {act.details}
                          </p>
                        )}
                        <div className="text-xs text-muted-foreground mt-0.5">By {act.actor_name}</div>
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
    <PanelAccessGuard
 module="quotations"action="view"panelTitle="Quotation Details"panelTitleBn="কোটেশন বিস্তারিত">
      <React.Suspense
 fallback={
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
            <FileSpreadsheet className="h-6 w-6 text-primary animate-pulse"/>
            <p className="text-xs text-muted-foreground">Loading Quotation...</p>
          </div>
        }
      >
        <QuotationDetailContent />
      </React.Suspense>
    </PanelAccessGuard>
  )
}


