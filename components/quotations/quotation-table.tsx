'use client'

import React from 'react'
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
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { QuotationRecord, QuotationStatus } from '@/types/quotation.types'
import { QuotationService } from '@/services/quotation.service'
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
  quotations,
  tenantSlug,
  companyName = 'InkFlow',
  onOpenFollowUp,
  onTrash,
}: QuotationTableProps) {
  const pathname = usePathname()
  const { locale } = useI18n()
  const isBn = locale === 'bn'

  const getStatusBadge = (status: QuotationStatus) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300">{isBn ? 'খসড়া' : 'Draft'}</Badge>
      case 'sent':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800">{isBn ? 'পাঠানো হয়েছে' : 'Sent'}</Badge>
      case 'viewed':
        return <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800">{isBn ? 'দেখা হয়েছে' : 'Viewed'}</Badge>
      case 'negotiation':
        return <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-bold dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">{isBn ? 'আলোচনা চলছে' : 'Negotiation'}</Badge>
      case 'approved':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-bold dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">{isBn ? 'অনুমোদিত' : 'Approved'}</Badge>
      case 'converted':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 font-bold dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800">{isBn ? 'অর্ডারে রূপান্তর' : 'Converted'}</Badge>
      case 'rejected':
        return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800">{isBn ? 'বাতিল' : 'Rejected'}</Badge>
      case 'expired':
        return <Badge variant="outline" className="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">{isBn ? 'মেয়াদোত্তীর্ণ' : 'Expired'}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getNextActionBadge = (nextAction: string, status: QuotationStatus) => {
    let colorClasses = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
    if (nextAction.includes('Follow up today') || nextAction.includes('Urgent')) {
      colorClasses = 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 font-bold'
    } else if (nextAction.includes('Approved')) {
      colorClasses = 'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 font-bold'
    } else if (nextAction.includes('Converted')) {
      colorClasses = 'bg-purple-100 text-purple-900 border border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800'
    } else if (nextAction.includes('Negotiating') || nextAction.includes('negotiating')) {
      colorClasses = 'bg-cyan-100 text-cyan-900 border border-cyan-300 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800 font-bold'
    } else if (nextAction.includes('Expired')) {
      colorClasses = 'bg-rose-100 text-rose-900 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
    }

    return (
      <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[10px] truncate max-w-[200px]', colorClasses)}>
        {nextAction}
      </span>
    )
  }

  const getExpiryBadge = (validUntil: string) => {
    const exp = QuotationService.calculateExpiryUrgency(validUntil)
    if (exp.urgency === 'expired') {
      return <span className="text-[11px] text-slate-400 font-medium">{exp.label}</span>
    }
    if (exp.urgency === 'critical') {
      return <span className="text-[11px] text-rose-600 dark:text-rose-400 font-bold">{exp.label}</span>
    }
    if (exp.urgency === 'warning') {
      return <span className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">{exp.label}</span>
    }
    return <span className="text-[11px] text-slate-500 dark:text-slate-400">{exp.label}</span>
  }

  return (
    <div>
      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-xs font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-3 px-4">{isBn ? 'কোটেশন নং' : 'Quote #'}</th>
              <th className="py-3 px-4">{isBn ? 'কাস্টমার' : 'Customer'}</th>
              <th className="py-3 px-4">{isBn ? 'কাজের বিবরণ' : 'Primary Job / Item'}</th>
              <th className="py-3 px-4">{isBn ? 'মোট ও অগ্রিম (৳)' : 'Total & Adv (৳)'}</th>
              <th className="py-3 px-4">{isBn ? 'অবস্থা' : 'Status'}</th>
              <th className="py-3 px-4">{isBn ? 'পরবর্তী করণীয়' : 'Next Action'}</th>
              <th className="py-3 px-4">{isBn ? 'মেয়াদ' : 'Validity'}</th>
              <th className="py-3 px-4">{isBn ? 'প্রতিনিধি' : 'Salesperson'}</th>
              <th className="py-3 px-4 text-right">{isBn ? 'অ্যাকশন' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {quotations.map((q) => {
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
                <tr key={q.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                  {/* Quote Number */}
                  <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                    <Link
                      href={getTenantNavHref(`/quotations/${q.id}`, pathname, tenantSlug)}
                      className="hover:underline flex items-center gap-1 group"
                    >
                      <span>{q.quotation_number}</span>
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </td>

                  {/* Customer */}
                  <td className="py-3.5 px-4 max-w-[200px]">
                    <div className="font-semibold text-slate-900 dark:text-white truncate">
                      {q.customer_name}
                      {q.customer_company && (
                        <span className="text-slate-500 font-normal text-xs ml-1">
                          ({q.customer_company})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
                      {q.customer_phone && (
                        <a href={`tel:${q.customer_phone}`} className="hover:text-blue-600 hover:underline">
                          {q.customer_phone}
                        </a>
                      )}
                    </div>
                  </td>

                  {/* Primary Item */}
                  <td className="py-3.5 px-4 text-xs text-slate-700 dark:text-slate-300 max-w-[220px]">
                    <div className="flex items-center gap-1.5 truncate font-medium">
                      <span className={cn(
                        'text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border shrink-0',
                        sector === 'offset_print'
                          ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300'
                          : sector === 'signage_fabrication'
                          ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300'
                          : sector === 'ready_merchandise'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300'
                      )}>
                        {sector === 'offset_print'
                          ? 'Offset'
                          : sector === 'signage_fabrication'
                          ? 'Signage'
                          : sector === 'ready_merchandise'
                          ? 'Merch'
                          : 'Digital'}
                      </span>
                      <span className="truncate">{primaryItem?.description || 'Custom Print Job'}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {primaryItem && primaryItem.width > 0 && primaryItem.height > 0 ? (
                        <span>
                          {primaryItem.width}×{primaryItem.height} {primaryItem.dimension_unit} ({primaryItem.area_sft} sft)
                        </span>
                      ) : (
                        <span>{primaryItem?.quantity || 1} {primaryItem?.unit || 'pcs'}</span>
                      )}
                      {q.items && q.items.length > 1 && (
                        <span className="text-slate-400 ml-1.5 font-semibold">
                          (+{q.items.length - 1} more)
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Grand Total */}
                  <td className="py-3.5 px-4">
                    <div className="font-mono font-bold text-slate-900 dark:text-white">
                      <CurrencyDisplay amount={q.grand_total} />
                    </div>
                    <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
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
                  <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400 truncate max-w-[120px]">
                    {q.salesperson_name || 'Staff'}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {cleanPhone ? (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center h-7 px-1.5 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded transition-colors"
                          title="Share Proposal on WhatsApp"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </a>
                      ) : null}

                      {q.customer_phone ? (
                        <a
                          href={`tel:${q.customer_phone}`}
                          className="inline-flex items-center justify-center h-7 px-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                          title="Call Customer"
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </a>
                      ) : null}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onOpenFollowUp(q)}
                        className="h-7 px-2 text-xs text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                        title="Record Follow-Up"
                      >
                        Follow
                      </Button>
                      <Link
                        href={getTenantNavHref(`/quotations/${q.id}`, pathname, tenantSlug)}
                        className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        Cockpit →
                      </Link>
                      {onTrash && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onTrash(q)}
                          className="h-7 px-1.5 text-xs text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          title="Move to Trash"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
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
      <div className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
        {quotations.map((q) => {
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
            <div key={q.id} className="p-4 space-y-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
              {/* Header: Quote #, Status & Expiry */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Link
                    href={getTenantNavHref(`/quotations/${q.id}`, pathname, tenantSlug)}
                    className="font-mono font-bold text-sm text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <span>{q.quotation_number}</span>
                    <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                  </Link>
                  <span className={cn(
                    'text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border',
                    sector === 'offset_print'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : sector === 'signage_fabrication'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  )}>
                    {sector === 'offset_print' ? 'Offset' : sector === 'signage_fabrication' ? 'Signage' : 'Digital'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {getStatusBadge(q.status)}
                </div>
              </div>

              {/* Customer & Value */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-sm text-slate-900 dark:text-white">
                    {q.customer_name} {q.customer_company && `(${q.customer_company})`}
                  </div>
                  {q.customer_phone && (
                    <a href={`tel:${q.customer_phone}`} className="text-xs font-mono text-blue-600 hover:underline">
                      {q.customer_phone}
                    </a>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Grand Total</span>
                  <span className="text-base font-black text-slate-900 dark:text-white font-mono">
                    {formatBDT(q.grand_total)}
                  </span>
                  <span className="text-[10px] text-amber-600 block">
                    Adv ({advPct}%): ৳{Number(advAmt).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Job Spec Card */}
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 text-xs border border-slate-100 dark:border-slate-800 space-y-1.5">
                <div className="text-slate-800 dark:text-slate-200 font-medium line-clamp-2">
                  {primaryItem?.description || 'Custom Print Job'}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-800">
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
                <span className="text-[11px] text-slate-500 font-medium">Next Action:</span>
                {getNextActionBadge(nextAction, q.status)}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                {cleanPhone ? (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1 h-9 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    title="Send Proposal on WhatsApp"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>WA</span>
                  </a>
                ) : (
                  <Button size="sm" variant="outline" disabled className="h-9 text-xs opacity-40">
                    WA
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenFollowUp(q)}
                  className="h-9 text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  <Clock className="h-3.5 w-3.5 mr-1 text-slate-500" />
                  Follow
                </Button>

                <Link
                  href={getTenantNavHref(`/quotations/${q.id}`, pathname, tenantSlug)}
                  className="inline-flex items-center justify-center h-9 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Cockpit
                </Link>

                {onTrash ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onTrash(q)}
                    className="h-9 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    title="Move to Trash"
                  >
                    <Trash2 className="h-4 w-4" />
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

