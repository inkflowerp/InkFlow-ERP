'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
 ExternalLink,
 Phone,
 MessageSquare,
 Clock,
 ArrowRight,
 User,
 Sliders,
 CheckCircle2,
 FileCheck2,
 AlertCircle,
 Trash2,
 MoreVertical,
 Eye,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { QuotationRecord, QuotationStatus } from '@/types/quotation.types'
import * as QuotationService from '@/lib/quotations/quotation-utils'
import { formatBDT } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'

export interface QuotationTableProps {
 quotations: QuotationRecord[]
 tenantSlug: string
 companyName?: string
 onOpenFollowUp: (quote: QuotationRecord) => void
 onTrash?: (quote: QuotationRecord) => void
}

export function QuotationTable({
 quotations = [],
 tenantSlug,
 companyName = 'InkFlow',
 onOpenFollowUp,
 onTrash,
}: QuotationTableProps) {
 const pathname = usePathname()
 const { locale } = useI18n()
 const isBn = locale === 'bn'
 const safeQuotations = Array.isArray(quotations) ? quotations : []

 const [activeMenuQuoteId, setActiveMenuQuoteId] = useState<string | null>(null)

 useEffect(() => {
 const handleDocumentClick = (e: MouseEvent) => {
 const target = e.target as HTMLElement | null
 if (!target?.closest('[data-quote-menu]')) {
 setActiveMenuQuoteId(null)
      }
    }
 const handleKeyDown = (e: KeyboardEvent) => {
 if (e.key === 'Escape') {
 setActiveMenuQuoteId(null)
      }
    }
 document.addEventListener('click', handleDocumentClick)
 document.addEventListener('keydown', handleKeyDown)
 return () => {
 document.removeEventListener('click', handleDocumentClick)
 document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

 const getStatusBadge = (status: QuotationStatus) => {
 switch (status) {
 case 'draft':
 return <Badge variant="outline"className="bg-muted text-foreground border-input">{isBn ? 'খসড়া' : 'Draft'}</Badge>
 case 'sent':
 return <Badge variant="outline"className="bg-primary/10 text-primary border-primary/20 bg-primary/10 text-primary border-border">{isBn ? 'পাঠানো হয়েছে' : 'Sent'}</Badge>
 case 'viewed':
 return <Badge variant="outline"className="bg-info-surface text-primary border-primary/20 bg-primary/10 text-primary border-border">{isBn ? 'দেখা হয়েছে' : 'Viewed'}</Badge>
 case 'negotiation':
 return <Badge variant="outline"className="bg-warning-surface text-warning border-warning-border font-bold bg-warning-surface/60 text-warning border-warning-border">{isBn ? 'আলোচনা চলছে' : 'Negotiation'}</Badge>
 case 'approved':
 return <Badge variant="outline"className="bg-success-surface text-success border-success-border font-bold bg-success-surface/60 text-success border-success-border">{isBn ? 'অনুমোদিত' : 'Approved'}</Badge>
 case 'converted':
 return <Badge variant="outline"className="bg-primary/10 text-primary border-primary/20 font-bold bg-primary/10 text-primary border-border">{isBn ? 'অর্ডারে রূপান্তর' : 'Converted'}</Badge>
 case 'rejected':
 return <Badge variant="outline"className="bg-danger-surface text-destructive border-danger-border bg-danger-surface/60 text-destructive border-danger-border">{isBn ? 'বাতিল' : 'Rejected'}</Badge>
 case 'expired':
 return <Badge variant="outline"className="bg-muted text-muted-foreground">{isBn ? 'মেয়াদোত্তীর্ণ' : 'Expired'}</Badge>
 default:
 return <Badge variant="outline">{status}</Badge>
    }
  }

 const getNextActionBadge = (nextAction: string, status: QuotationStatus) => {
 let colorClasses = 'bg-muted text-foreground '
 if (nextAction.includes('Follow up today') || nextAction.includes('Urgent')) {
 colorClasses = 'bg-warning-surface text-warning border border-warning-border bg-warning-surface/60 text-warning border-warning-border font-bold'
    } else if (nextAction.includes('Approved')) {
 colorClasses = 'bg-success-surface text-success border border-success-border bg-success-surface/60 text-success border-success-border font-bold'
    } else if (nextAction.includes('Converted')) {
 colorClasses = 'bg-primary/10 text-primary border border-primary/20 bg-primary/10 text-primary border-border'
    } else if (nextAction.includes('Negotiating') || nextAction.includes('negotiating')) {
 colorClasses = 'bg-info-surface text-primary border border-primary/20 bg-primary/10 text-primary border-border font-bold'
    } else if (nextAction.includes('Expired')) {
 colorClasses = 'bg-danger-surface text-destructive border border-danger-border bg-danger-surface/60 text-destructive border-danger-border'
    }

 return (
      <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs truncate max-w-[200px]', colorClasses)}>
        {nextAction}
      </span>
    )
  }

 const getExpiryBadge = (validUntil: string) => {
 const exp = QuotationService.calculateExpiryUrgency(validUntil)
 if (exp.urgency === 'expired') {
 return <span className="text-xs text-muted-foreground font-medium">{exp.label}</span>
    }
 if (exp.urgency === 'critical') {
 return <span className="text-xs text-destructive text-destructive font-bold">{exp.label}</span>
    }
 if (exp.urgency === 'warning') {
 return <span className="text-xs text-warning text-warning font-semibold">{exp.label}</span>
    }
 return <span className="text-xs text-muted-foreground">{exp.label}</span>
  }

 return (
    <div>
      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto min-h-[340px] pb-12">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-xs font-semibold text-muted-foreground border-b border-border">
            <tr>
              <th className="py-3 px-4">{isBn ? 'কোটেশন নং' : 'Quote #'}</th>
              <th className="py-3 px-4">{isBn ? 'কাস্টমার' : 'Customer'}</th>
              <th className="py-3 px-4">{isBn ? 'কাজের বিবরণ' : 'Primary Job / Item'}</th>
              <th className="py-3 px-4">{isBn ? 'মোট ও অগ্রিম (৳)' : 'Total & Adv (৳)'}</th>
              <th className="py-3 px-4">{isBn ? 'অবস্থা' : 'Status'}</th>
              <th className="py-3 px-4">{isBn ? 'পরবর্তী করণীয়' : 'Next Action'}</th>
              <th className="py-3 px-4">{isBn ? 'মেয়াদ' : 'Validity'}</th>
              <th className="py-3 px-4">{isBn ? 'প্রতিনিধি' : 'Salesperson'}</th>
              <th className="py-3 px-4 text-center w-[70px] min-w-[70px]">{isBn ? 'অ্যাকশন' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border dark:divide-border">
            {safeQuotations.map((q, index) => {
 const nextAction = QuotationService.calculateNextAction(q)
 const primaryItem = q.items?.[0]
 const sector = QuotationService.getSectorForQuotation(q)
 const cleanPhone = (q.customer_whatsapp || q.customer_phone || '').replace(/\D/g, '')
 const formattedPhone = cleanPhone.startsWith('880')
                ? cleanPhone
                : cleanPhone.startsWith('0')
                ? `88${cleanPhone}`
                : `880${cleanPhone}`

 const waMessage = QuotationService.generateBangladeshiQuotationWhatsAppMessage(q, companyName)
 const waUrl = cleanPhone ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(waMessage)}` : '#'

 const advPct = q.advance_percentage ?? 50
 const advAmt = q.advance_amount ?? Math.round(((Number(q.grand_total) || 0) * advPct) / 100)
 const dueAmt = q.due_on_delivery ?? Math.max(0, (Number(q.grand_total) || 0) - advAmt)

 return (
                <tr key={q.id} className="hover:bg-muted dark:hover:bg-muted/50 transition-colors">
                  {/* Quote Number */}
                  <td className="py-3.5 px-4 tabular-nums font-bold text-primary">
                    <Link
 href={getTenantNavHref(`/quotations/${q.id}`, pathname, tenantSlug)}
 className="hover:underline flex items-center gap-1 group">
                      <span>{q.quotation_number}</span>
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity"/>
                    </Link>
                  </td>

                  {/* Customer */}
                  <td className="py-3.5 px-4 max-w-[200px]">
                    <div className="font-semibold text-foreground truncate">
                      {q.customer_name}
                      {q.customer_company && (
                        <span className="text-muted-foreground font-normal text-xs ml-1">
                          ({q.customer_company})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
                      {q.customer_phone && (
                        <a href={`tel:${q.customer_phone}`} className="hover:text-primary hover:underline">
                          {q.customer_phone}
                        </a>
                      )}
                    </div>
                  </td>

                  {/* Primary Item */}
                  <td className="py-3.5 px-4 text-xs text-foreground max-w-[220px]">
                    <div className="flex items-center gap-1.5 truncate font-medium">
                      <span className="truncate">{primaryItem?.description || 'Custom Print Job'}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {primaryItem && primaryItem.width > 0 && primaryItem.height > 0 ? (
                        <span>
                          {primaryItem.width}×{primaryItem.height} {primaryItem.dimension_unit} ({primaryItem.area_sft} sft)
                        </span>
                      ) : (
                        <span>{primaryItem?.quantity || 1} {primaryItem?.unit || 'pcs'}</span>
                      )}
                      {q.items && q.items.length > 1 && (
                        <span className="text-muted-foreground ml-1.5 font-semibold">
                          (+{q.items.length - 1} more)
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Grand Total */}
                  <td className="py-3.5 px-4">
                    <div className="tabular-nums font-bold text-foreground">
                      <CurrencyDisplay amount={q.grand_total} />
                    </div>
                    <div className="text-xs text-warning text-warning font-medium">
 Adv: ৳{Number(advAmt).toLocaleString()} ({advPct}%)
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    {getStatusBadge(q.status)}
                  </td>

                  {/* Next Action */}
                  <td className="py-3.5 px-4">
                    {getNextActionBadge(nextAction, q.status)}
                  </td>

                  {/* Validity */}
                  <td className="py-3.5 px-4">
                    {getExpiryBadge(q.valid_until)}
                  </td>

                  {/* Salesperson */}
                  <td className="py-3.5 px-4 text-xs text-muted-foreground truncate max-w-[120px]">
                    {q.salesperson_name || 'Staff'}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap w-[70px] min-w-[70px]">
                    <div className="relative inline-block text-left"data-quote-menu>
                      <Button
 size="sm"variant="ghost"onClick={(e) => {
 e.stopPropagation()
 setActiveMenuQuoteId(activeMenuQuoteId === q.id ? null : q.id)
                        }}
 className={cn(
                          'h-8 w-8 p-0 rounded-lg transition-colors cursor-pointer mx-auto flex items-center justify-center',
 activeMenuQuoteId === q.id
                            ? 'bg-muted text-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-muted'
                        )}
 title={isBn ? 'অ্যাকশন' : 'Actions'}
 aria-label="Quotation Actions"aria-expanded={activeMenuQuoteId === q.id}
                      >
                        <MoreVertical className="h-4 w-4"/>
                      </Button>

                      {activeMenuQuoteId === q.id && (
                        <div
 className={cn(
                            'absolute right-0 w-56 bg-card border border-border rounded-xl shadow-xs z-50 py-1.5 text-xs animate-in fade-in-0 zoom-in-95 duration-100',
 index >= safeQuotations.length - 2 && safeQuotations.length >= 3
                              ? 'bottom-full mb-1'
                              : 'top-full mt-1'
                          )}
                        >
                          {/* 1. Open Cockpit */}
                          <Link
 href={getTenantNavHref(`/quotations/${q.id}`, pathname, tenantSlug)}
 onClick={() => setActiveMenuQuoteId(null)}
 className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2.5 text-foreground transition-colors">
                            <Eye className="h-3.5 w-3.5 text-primary shrink-0"/>
                            <span className="font-medium">
                              {isBn ? 'কোটেশন ককপিট খুলুন' : 'Open Quotation Cockpit'}
                            </span>
                          </Link>

                          {/* 2. Record Follow-Up */}
                          <button
 type="button"onClick={() => {
 setActiveMenuQuoteId(null)
 onOpenFollowUp(q)
                            }}
 className="w-full text-left px-3 py-2 hover:bg-primary/10 dark:hover:bg-primary/10 flex items-center gap-2.5 text-foreground hover:text-primary dark:hover:text-primary transition-colors cursor-pointer">
                            <Clock className="h-3.5 w-3.5 text-warning shrink-0"/>
                            <span>{isBn ? 'ফলো-আপ রেকর্ড করুন' : 'Log Follow-Up'}</span>
                          </button>

                          {/* 3. Share WhatsApp Proposal */}
                          {cleanPhone ? (
                            <a
 href={waUrl}
 target="_blank"rel="noopener noreferrer"onClick={() => setActiveMenuQuoteId(null)}
 className="w-full text-left px-3 py-2 hover:bg-success-surface dark:hover:bg-success-surface flex items-center gap-2.5 text-success text-success transition-colors cursor-pointer">
                              <MessageSquare className="h-3.5 w-3.5 text-success shrink-0"/>
                              <span>{isBn ? 'হোয়াটসঅ্যাপে পাঠান' : 'Share on WhatsApp'}</span>
                            </a>
                          ) : null}

                          {/* 4. Call Customer */}
                          {q.customer_phone ? (
                            <a
 href={`tel:${q.customer_phone}`}
 onClick={() => setActiveMenuQuoteId(null)}
 className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2.5 text-foreground transition-colors">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0"/>
                              <div className="flex flex-col text-left">
                                <span>{isBn ? 'কল করুন' : 'Call Customer'}</span>
                                <span className="text-xs text-muted-foreground tabular-nums">{q.customer_phone}</span>
                              </div>
                            </a>
                          ) : null}

                          {/* Divider if onTrash exists */}
                          {onTrash ? (
                            <div className="my-1 border-t border-border"/>
                          ) : null}

                          {/* 5. Move to Trash */}
                          {onTrash ? (
                            <button
 type="button"onClick={() => {
 setActiveMenuQuoteId(null)
 onTrash(q)
                              }}
 className="w-full text-left px-3 py-2 hover:bg-danger-surface dark:hover:bg-danger-surface flex items-center gap-2.5 text-destructive text-destructive transition-colors cursor-pointer">
                              <Trash2 className="h-3.5 w-3.5 text-destructive shrink-0"/>
                              <span>{isBn ? 'ট্র্যাশে পাঠান' : 'Move to Trash'}</span>
                            </button>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile & Tablet Card View */}
      <div className="lg:hidden divide-y divide-border dark:divide-border">
        {safeQuotations.map((q) => {
 const nextAction = QuotationService.calculateNextAction(q)
 const primaryItem = q.items?.[0]
 const sector = QuotationService.getSectorForQuotation(q)
 const cleanPhone = (q.customer_whatsapp || q.customer_phone || '').replace(/\D/g, '')
 const formattedPhone = cleanPhone.startsWith('880')
            ? cleanPhone
            : cleanPhone.startsWith('0')
            ? `88${cleanPhone}`
            : `880${cleanPhone}`

 const waMessage = QuotationService.generateBangladeshiQuotationWhatsAppMessage(q, companyName)
 const waUrl = cleanPhone ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(waMessage)}` : '#'

 const advPct = q.advance_percentage ?? 50
 const advAmt = q.advance_amount ?? Math.round(((Number(q.grand_total) || 0) * advPct) / 100)

 return (
            <div key={q.id} className="p-4 space-y-3 hover:bg-muted dark:hover:bg-muted/50 transition-colors">
              {/* Header: Quote #, Status & Expiry */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Link
 href={getTenantNavHref(`/quotations/${q.id}`, pathname, tenantSlug)}
 className="tabular-nums font-bold text-sm text-primary hover:underline flex items-center gap-1">
                    <span>{q.quotation_number}</span>
                    <ExternalLink className="h-3.5 w-3.5 opacity-70"/>
                  </Link>
                </div>
                <div className="flex items-center gap-1.5">
                  {getStatusBadge(q.status)}
                </div>
              </div>

              {/* Customer & Value */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-sm text-foreground">
                    {q.customer_name} {q.customer_company && `(${q.customer_company})`}
                  </div>
                  {q.customer_phone && (
                    <a href={`tel:${q.customer_phone}`} className="text-xs tabular-nums text-primary hover:underline">
                      {q.customer_phone}
                    </a>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs uppercase font-semibold text-muted-foreground block">Grand Total</span>
                  <span className="text-base font-black text-foreground tabular-nums">
                    {formatBDT(q.grand_total)}
                  </span>
                  <span className="text-xs text-warning block">
 Adv ({advPct}%): ৳{Number(advAmt).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Job Spec Card */}
              <div className="p-2.5 rounded-lg bg-muted text-xs border border-border space-y-1.5">
                <div className="text-foreground font-medium line-clamp-2">
                  {primaryItem?.description || 'Custom Print Job'}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border">
                  <span>
                    {primaryItem && primaryItem.width > 0 && primaryItem.height > 0
                      ? `${primaryItem.width}×{primaryItem.height} ${primaryItem.dimension_unit} (${primaryItem.area_sft} sft)`
                      : `${primaryItem?.quantity || 1} ${primaryItem?.unit || 'pcs'}`}
                  </span>
                  <span>{getExpiryBadge(q.valid_until)}</span>
                </div>
              </div>

              {/* Next Action Prompt */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <span className="text-xs text-muted-foreground font-medium">Next Action:</span>
                {getNextActionBadge(nextAction, q.status)}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-border">
                {cleanPhone ? (
                  <a
 href={waUrl}
 target="_blank"rel="noopener noreferrer"className="inline-flex items-center justify-center gap-1 h-9 rounded-lg text-xs font-bold bg-success-surface text-success hover:bg-success-surface bg-success-surface text-success border border-success-border border-success-border"title="Send Proposal on WhatsApp">
                    <MessageSquare className="h-3.5 w-3.5"/>
                    <span>WA</span>
                  </a>
                ) : (
                  <Button size="sm"variant="outline"disabled className="h-9 text-xs opacity-40">
 WA
                  </Button>
                )}

                <Button
 size="sm"variant="outline"onClick={() => onOpenFollowUp(q)}
 className="h-9 text-xs font-semibold text-foreground">
                  <Clock className="h-3.5 w-3.5 mr-1 text-muted-foreground"/>
 Follow
                </Button>

                <Link
 href={getTenantNavHref(`/quotations/${q.id}`, pathname, tenantSlug)}
 className="inline-flex items-center justify-center h-9 rounded-lg text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground">
 Cockpit
                </Link>

                {onTrash ? (
                  <Button
 size="sm"variant="ghost"onClick={() => onTrash(q)}
 className="h-9 text-xs text-destructive hover:bg-danger-surface dark:hover:bg-danger-surface"title="Move to Trash">
                    <Trash2 className="h-4 w-4"/>
                  </Button>
                ) : (
                  <div />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

