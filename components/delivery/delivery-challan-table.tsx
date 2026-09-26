'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Truck,
  MapPin,
  ExternalLink,
  Phone,
  MessageSquare,
  Printer,
  CheckCircle2,
  AlertCircle,
  Package,
  Sparkles,
  Clock,
  Wrench,
  Layers,
  FileCheck2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DeliveryChallanRecord, DeliveryMethod, DeliveryStatus } from '@/types/logistics.types'
import { LogisticsService } from '@/services/logistics.service'
import { formatBDT } from '@/lib/formatters'
import { useI18n } from '@/i18n/context'
import { cn } from '@/lib/utils'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'

export interface DeliveryChallanTableProps {
  challans: DeliveryChallanRecord[]
  tenantSlug: string
  companyName?: string
  onOpenDeliveryModal: (challan: DeliveryChallanRecord) => void
  onMarkOutForDelivery?: (challanId: string) => void
  getLiveItemStatus: (item: any, challan?: DeliveryChallanRecord | null) => string
}

export function DeliveryChallanTable({
  challans,
  tenantSlug,
  companyName = 'InkFlow Printing & Signage',
  onOpenDeliveryModal,
  onMarkOutForDelivery,
  getLiveItemStatus,
}: DeliveryChallanTableProps) {
  const pathname = usePathname()
  const { locale, tBilingual } = useI18n()
  const isBn = locale === 'bn'

  const getMethodBadge = (method: DeliveryMethod) => {
    switch (method) {
      case 'company_vehicle':
        return (
          <span className="px-2 py-0.5 rounded text-2xs font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
            {isBn ? 'কোম্পানির গাড়ি/পিকআপ' : 'Company Vehicle'}
          </span>
        )
      case 'courier':
        return (
          <span className="px-2 py-0.5 rounded text-2xs font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
            {isBn ? 'কুরিয়ার সার্ভিস' : 'Courier Service'}
          </span>
        )
      case 'local_transport':
        return (
          <span className="px-2 py-0.5 rounded text-2xs font-bold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
            {isBn ? 'লোকাল ভ্যান/সিএনজি' : 'Local Transport'}
          </span>
        )
      case 'customer_pickup':
        return (
          <span className="px-2 py-0.5 rounded text-2xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {isBn ? 'দোকান/কাউন্টার গ্রহণ' : 'Customer Pickup'}
          </span>
        )
      default:
        return <span className="px-2 py-0.5 rounded text-2xs font-bold bg-slate-100">{method}</span>
    }
  }

  const getDeliveryStatusBadge = (status: DeliveryStatus) => {
    switch (status) {
      case 'delivered':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 font-bold gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            <span>{isBn ? 'ডেলিভারি সম্পন্ন' : 'Delivered'}</span>
          </Badge>
        )
      case 'partially_delivered':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 font-bold gap-1">
            <Package className="h-3 w-3 text-amber-600" />
            <span>{isBn ? 'আংশিক ডেলিভারি' : 'Partially Delivered'}</span>
          </Badge>
        )
      case 'out_for_delivery':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 font-bold gap-1 animate-pulse">
            <Truck className="h-3 w-3 text-blue-600" />
            <span>{isBn ? 'গাড়িতে চলমান' : 'Out for Delivery'}</span>
          </Badge>
        )
      case 'pending_dispatch':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold gap-1">
            <Sparkles className="h-3 w-3 text-emerald-500" />
            <span>{isBn ? 'ডেলিভারি প্রস্তুত' : 'Ready to Dispatch'}</span>
          </Badge>
        )
      case 'assigned':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300">
            <span>{isBn ? 'গাড়ি বরাদ্দকৃত' : 'Vehicle Assigned'}</span>
          </Badge>
        )
      case 'scheduled':
      default:
        return (
          <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300">
            <span>{isBn ? 'শিডিউল করা' : 'Scheduled'}</span>
          </Badge>
        )
    }
  }

  return (
    <div>
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-xs font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-3 px-4">{isBn ? 'চালান ও ইনভয়েস' : 'Challan & Invoice'}</th>
              <th className="py-3 px-4">{isBn ? 'কাস্টমার ও গন্তব্য' : 'Customer & Destination'}</th>
              <th className="py-3 px-4">{isBn ? 'ডেলিভারি মাধ্যম' : 'Delivery Method'}</th>
              <th className="py-3 px-4">{isBn ? 'গাড়ি ও চালক' : 'Vehicle / Transit'}</th>
              <th className="py-3 px-4">{isBn ? 'তারিখ' : 'Scheduled Date'}</th>
              <th className="py-3 px-4">{isBn ? 'অবস্থা' : 'Status'}</th>
              <th className="py-3 px-4 text-right">{isBn ? 'অ্যাকশন' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {challans.map((ch) => {
              const items = ch.items || []
              const readyCount = items.filter(
                (it) => !it.is_delivered && (getLiveItemStatus(it, ch) === 'ready_for_delivery' || it.item_kind === 'ready_product')
              ).length
              const pendingCount = items.filter(
                (it) => !it.is_delivered && getLiveItemStatus(it, ch) !== 'ready_for_delivery'
              ).length
              const deliveredCount = items.filter((it) => it.is_delivered).length

              const rawPhone = ch.customer_phone || ''
              const cleanPhone = rawPhone.replace(/\D/g, '')
              const formattedPhone = cleanPhone.startsWith('880')
                ? cleanPhone
                : cleanPhone.startsWith('0')
                ? `88${cleanPhone}`
                : `880${cleanPhone}`

              const waMessage = LogisticsService.generateBangladeshiChallanWhatsAppMessage(ch, companyName)
              const waUrl = cleanPhone ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(waMessage)}` : '#'

              const dueAmt = Number(ch.due_amount) || 0

              return (
                <tr key={ch.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                  {/* Challan & Invoice # */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={getTenantNavHref(`/delivery/${ch.id}`, pathname, tenantSlug)}
                        className="font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 group"
                      >
                        <span>{ch.challan_number}</span>
                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1 flex-wrap font-mono">
                      <Badge variant="outline" className="text-2xs py-0 px-1 font-semibold text-blue-700 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                        {ch.invoice_number || `INV-${ch.challan_number.replace('CHL-', '').replace('CH-', '')}`}
                      </Badge>
                      {ch.order_number && (
                        <span className="text-2xs text-slate-400">({ch.order_number})</span>
                      )}
                      {dueAmt > 0 ? (
                        <Badge className="text-2xs py-0 px-1.5 bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 font-bold animate-pulse">
                          {isBn ? `বকেয়া: ${formatBDT(dueAmt)}` : `Due: ${formatBDT(dueAmt)}`}
                        </Badge>
                      ) : ch.grand_total ? (
                        <Badge className="text-2xs py-0 px-1.5 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold">
                          {isBn ? 'পরিশোধিত' : 'Paid'}
                        </Badge>
                      ) : null}
                    </div>
                  </td>

                  {/* Customer & Destination */}
                  <td className="py-3.5 px-4 max-w-[240px]">
                    <div className="font-semibold text-slate-900 dark:text-white text-xs truncate">
                      {ch.customer_name}
                    </div>
                    <div className="text-2xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                      <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                      <span className="truncate">{ch.delivery_address || 'Factory Pickup'}</span>
                    </div>

                    {/* Products summary badge chips */}
                    {items.length > 0 && (
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        <span className="text-2xs text-slate-400 font-medium">{items.length} {isBn ? 'আইটেম:' : 'Items:'}</span>
                        {readyCount > 0 && (
                          <Badge className="text-2xs py-0 px-1 bg-emerald-50 text-emerald-700 border-emerald-200">
                            {readyCount} {isBn ? 'প্রস্তুত' : 'Ready'}
                          </Badge>
                        )}
                        {pendingCount > 0 && (
                          <Badge className="text-2xs py-0 px-1 bg-amber-50 text-amber-700 border-amber-200">
                            {pendingCount} {isBn ? 'অপেক্ষমাণ' : 'Pending'}
                          </Badge>
                        )}
                        {deliveredCount > 0 && (
                          <Badge className="text-2xs py-0 px-1 bg-slate-100 text-slate-600 border-slate-200">
                            {deliveredCount} {isBn ? 'ডেলিভার্ড' : 'Delivered'}
                          </Badge>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Delivery Method */}
                  <td className="py-3.5 px-4">
                    {getMethodBadge(ch.delivery_method)}
                  </td>

                  {/* Vehicle & Transit */}
                  <td className="py-3.5 px-4 text-xs font-mono">
                    <div className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[160px]">
                      {ch.vehicle_info || 'Company Transit'}
                    </div>
                    {ch.delivery_person_name && (
                      <div className="text-2xs text-slate-400 truncate">
                        {ch.delivery_person_name}
                      </div>
                    )}
                  </td>

                  {/* Scheduled Date */}
                  <td className="py-3.5 px-4 text-xs font-mono text-slate-600 dark:text-slate-300">
                    {ch.scheduled_date}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    {getDeliveryStatusBadge(ch.status)}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      {cleanPhone ? (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center h-7 px-2 text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors border border-emerald-200 dark:border-emerald-800"
                          title="Share Challan on WhatsApp"
                        >
                          <MessageSquare className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                          <span>WA</span>
                        </a>
                      ) : null}

                      {ch.customer_phone ? (
                        <a
                          href={`tel:${ch.customer_phone}`}
                          className="inline-flex items-center justify-center h-7 px-2 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                          title="Call Customer"
                        >
                          <Phone className="h-3 w-3" />
                        </a>
                      ) : null}

                      <Link
                        href={getTenantNavHref(`/delivery/${ch.id}`, pathname, tenantSlug)}
                        className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                      >
                        <Printer className="h-3 w-3 mr-1" />
                        <span>PDF</span>
                      </Link>

                      <Button
                        size="sm"
                        onClick={() => onOpenDeliveryModal(ch)}
                        className={cn(
                          'h-7 text-2xs px-2.5 font-bold shadow-xs cursor-pointer',
                          ch.status === 'delivered'
                            ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200'
                            : ch.status === 'partially_delivered'
                            ? 'bg-amber-600 hover:bg-amber-700 text-white'
                            : readyCount > 0
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        )}
                      >
                        {ch.status === 'delivered'
                          ? (isBn ? 'স্বাক্ষর দেখুন' : 'View Sign-off')
                          : ch.status === 'partially_delivered'
                          ? (isBn ? 'বাকি চালান' : 'Fulfill Balance')
                          : (isBn ? 'ডেলিভারি / হ্যান্ডওভার' : 'Deliver / Dispatch')}
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View */}
      <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
        {challans.map((ch) => {
          const items = ch.items || []
          const readyCount = items.filter(
            (it) => !it.is_delivered && (getLiveItemStatus(it, ch) === 'ready_for_delivery' || it.item_kind === 'ready_product')
          ).length
          const pendingCount = items.filter(
            (it) => !it.is_delivered && getLiveItemStatus(it, ch) !== 'ready_for_delivery'
          ).length
          const deliveredCount = items.filter((it) => it.is_delivered).length

          const rawPhone = ch.customer_phone || ''
          const cleanPhone = rawPhone.replace(/\D/g, '')
          const formattedPhone = cleanPhone.startsWith('880')
            ? cleanPhone
            : cleanPhone.startsWith('0')
            ? `88${cleanPhone}`
            : `880${cleanPhone}`

          const waMessage = LogisticsService.generateBangladeshiChallanWhatsAppMessage(ch, companyName)
          const waUrl = cleanPhone ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(waMessage)}` : '#'
          const dueAmt = Number(ch.due_amount) || 0

          return (
            <div key={ch.id} className="p-4 space-y-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
              {/* Header: Challan # & Status */}
              <div className="flex items-center justify-between gap-2">
                <Link
                  href={getTenantNavHref(`/delivery/${ch.id}`, pathname, tenantSlug)}
                  className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <span>{ch.challan_number}</span>
                  <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                </Link>
                {getDeliveryStatusBadge(ch.status)}
              </div>

              {/* Invoice & Due Alert Bar */}
              <div className="flex items-center gap-2 font-mono flex-wrap">
                <Badge variant="outline" className="text-2xs py-0 px-1 font-semibold text-blue-700 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                  {ch.invoice_number || `INV-${ch.challan_number.replace('CHL-', '').replace('CH-', '')}`}
                </Badge>
                {ch.order_number && (
                  <span className="text-2xs text-slate-400">({ch.order_number})</span>
                )}
                {dueAmt > 0 ? (
                  <Badge className="text-2xs py-0 px-1.5 bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 font-bold">
                    {isBn ? `বকেয়া: ${formatBDT(dueAmt)}` : `Due: ${formatBDT(dueAmt)}`}
                  </Badge>
                ) : ch.grand_total ? (
                  <Badge className="text-2xs py-0 px-1.5 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold">
                    {isBn ? 'পরিশোধিত' : 'Paid'}
                  </Badge>
                ) : null}
              </div>

              {/* Customer & Address */}
              <div>
                <div className="font-semibold text-sm text-slate-900 dark:text-white flex items-center justify-between">
                  <span>{ch.customer_name}</span>
                  {ch.customer_phone && (
                    <a href={`tel:${ch.customer_phone}`} className="text-xs font-mono text-blue-600 hover:underline">
                      {ch.customer_phone}
                    </a>
                  )}
                </div>
                <div className="text-xs text-slate-500 flex items-start gap-1 mt-0.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" />
                  <span>{ch.delivery_address || 'Factory Pickup'}</span>
                </div>
                {items.length > 0 && (
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    <span className="text-2xs text-slate-400 font-medium">{items.length} {isBn ? 'আইটেম:' : 'Items:'}</span>
                    {readyCount > 0 && (
                      <Badge className="text-2xs py-0 px-1 bg-emerald-50 text-emerald-700 border-emerald-200">
                        {readyCount} Ready
                      </Badge>
                    )}
                    {pendingCount > 0 && (
                      <Badge className="text-2xs py-0 px-1 bg-amber-50 text-amber-700 border-amber-200">
                        {pendingCount} Pending
                      </Badge>
                    )}
                    {deliveredCount > 0 && (
                      <Badge className="text-2xs py-0 px-1 bg-slate-100 text-slate-600 border-slate-200">
                        {deliveredCount} Delivered
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 text-xs border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-2xs uppercase font-semibold text-slate-400 block">{isBn ? 'মাধ্যম' : 'Method'}</span>
                  <div className="mt-0.5">{getMethodBadge(ch.delivery_method)}</div>
                </div>
                <div>
                  <span className="text-2xs uppercase font-semibold text-slate-400 block">{isBn ? 'ডেলিভারি তারিখ' : 'Scheduled Date'}</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{ch.scheduled_date}</span>
                </div>
                {ch.vehicle_info && (
                  <div className="col-span-2 text-2xs text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                    {isBn ? 'গাড়ি:' : 'Vehicle:'} <strong className="font-mono text-slate-800 dark:text-slate-200">{ch.vehicle_info}</strong>
                    {ch.delivery_person_name && <span> ({ch.delivery_person_name})</span>}
                  </div>
                )}
              </div>

              {/* Actions Grid */}
              <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                {cleanPhone ? (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1 h-9 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    title="Send WhatsApp Challan"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>WA</span>
                  </a>
                ) : (
                  <Button size="sm" variant="outline" disabled className="h-9 text-xs opacity-40">
                    WA
                  </Button>
                )}

                <Link
                  href={getTenantNavHref(`/delivery/${ch.id}`, pathname, tenantSlug)}
                  className="inline-flex items-center justify-center h-9 rounded-lg text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  <Printer className="h-3.5 w-3.5 mr-1" />
                  PDF
                </Link>

                <Button
                  size="sm"
                  onClick={() => onOpenDeliveryModal(ch)}
                  className={cn(
                    'h-9 text-xs font-bold shadow-xs',
                    ch.status === 'delivered'
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200'
                      : ch.status === 'partially_delivered'
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : readyCount > 0
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  )}
                >
                  {ch.status === 'delivered'
                    ? (isBn ? 'স্বাক্ষর' : 'Sign-off')
                    : ch.status === 'partially_delivered'
                    ? (isBn ? 'বাকি' : 'Balance')
                    : (isBn ? 'ডেলিভারি' : 'Deliver')}
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
