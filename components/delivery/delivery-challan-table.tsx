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
  Package,
  Sparkles,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DeliveryChallanRecord, DeliveryMethod, DeliveryStatus } from '@/types/logistics.types'
import { formatBDT } from '@/lib/formatters'
import { generateBangladeshiChallanWhatsAppMessage } from '@/lib/communication/challan-whatsapp'
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
  companyName = 'PrintFlow Printing & Signage',
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
          <span className="px-2 py-0.5 rounded text-xs font-bold bg-primary/10 text-primary border border-primary/20">
            {isBn ? 'কোম্পানির গাড়ি/পিকআপ' : 'Company Vehicle'}
          </span>
        )
      case 'courier':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-bold bg-primary/10 text-primary border border-primary/20">
            {isBn ? 'কুরিয়ার সার্ভিস' : 'Courier Service'}
          </span>
        )
      case 'local_transport':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-bold bg-warning-surface text-warning border border-warning-border">
            {isBn ? 'লোকাল ভ্যান/সিএনজি' : 'Local Transport'}
          </span>
        )
      case 'customer_pickup':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-bold bg-muted text-foreground border border-border">
            {isBn ? 'দোকান/কাউন্টার গ্রহণ' : 'Customer Pickup'}
          </span>
        )
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-muted text-foreground border border-border">{method}</span>
    }
  }

  const getDeliveryStatusBadge = (status: DeliveryStatus) => {
    switch (status) {
      case 'delivered':
        return (
          <Badge variant="outline" className="bg-success-surface text-success border border-success-border font-bold gap-1">
            <CheckCircle2 className="h-3 w-3 text-success" />
            <span>{isBn ? 'ডেলিভারি সম্পন্ন' : 'Delivered'}</span>
          </Badge>
        )
      case 'partially_delivered':
        return (
          <Badge variant="outline" className="bg-warning-surface text-warning border border-warning-border font-bold gap-1">
            <Package className="h-3 w-3 text-warning" />
            <span>{isBn ? 'আংশিক ডেলিভারি' : 'Partially Delivered'}</span>
          </Badge>
        )
      case 'out_for_delivery':
        return (
          <Badge variant="outline" className="bg-primary/10 text-primary border border-primary/20 font-bold gap-1 animate-pulse">
            <Truck className="h-3 w-3 text-primary" />
            <span>{isBn ? 'গাড়িতে চলমান' : 'Out for Delivery'}</span>
          </Badge>
        )
      case 'pending_dispatch':
        return (
          <Badge variant="outline" className="bg-success-surface text-success border border-success-border font-bold gap-1">
            <Sparkles className="h-3 w-3 text-success" />
            <span>{isBn ? 'ডেলিভারি প্রস্তুত' : 'Ready to Dispatch'}</span>
          </Badge>
        )
      case 'assigned':
        return (
          <Badge variant="outline" className="bg-warning-surface text-warning border border-warning-border">
            <span>{isBn ? 'গাড়ি বরাদ্দকৃত' : 'Vehicle Assigned'}</span>
          </Badge>
        )
      case 'scheduled':
      default:
        return (
          <Badge variant="outline" className="bg-muted text-foreground border border-border">
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
          <thead className="bg-muted text-xs font-semibold text-muted-foreground border-b border-border">
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
          <tbody className="divide-y divide-border">
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

              const waMessage = generateBangladeshiChallanWhatsAppMessage(ch, companyName)
              const waUrl = cleanPhone ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(waMessage)}` : '#'

              const dueAmt = Number(ch.due_amount) || 0

              return (
                <tr key={ch.id} className="hover:bg-muted transition-colors">
                  {/* Challan & Invoice # */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={getTenantNavHref(`/delivery/${ch.id}`, pathname, tenantSlug)}
                        className="tabular-nums font-bold text-primary hover:underline flex items-center gap-1 group"
                      >
                        <span>{ch.challan_number}</span>
                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1 flex-wrap tabular-nums">
                      <Badge variant="outline" className="text-xs py-0 px-1 font-semibold text-primary bg-primary/10 border-primary/20">
                        {ch.invoice_number || `INV-${ch.challan_number.replace('CHL-', '').replace('CH-', '')}`}
                      </Badge>
                      {ch.order_number && (
                        <span className="text-xs text-muted-foreground">({ch.order_number})</span>
                      )}
                      {dueAmt > 0 ? (
                        <Badge className="text-xs py-0 px-1.5 bg-destructive/10 text-destructive border border-destructive/20 font-bold animate-pulse">
                          {isBn ? `বকেয়া: ${formatBDT(dueAmt)}` : `Due: ${formatBDT(dueAmt)}`}
                        </Badge>
                      ) : ch.grand_total ? (
                        <Badge className="text-xs py-0 px-1.5 bg-success-surface text-success border border-success-border font-bold">
                          {isBn ? 'পরিশোধিত' : 'Paid'}
                        </Badge>
                      ) : null}
                    </div>
                  </td>

                  {/* Customer & Destination */}
                  <td className="py-3.5 px-4 max-w-[240px]">
                    <div className="font-semibold text-foreground text-xs truncate">
                      {ch.customer_name}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                      <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="truncate">{ch.delivery_address || 'Factory Pickup'}</span>
                    </div>

                    {/* Products summary badge chips */}
                    {items.length > 0 && (
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        <span className="text-xs text-muted-foreground font-medium">{items.length} {isBn ? 'আইটেম:' : 'Items:'}</span>
                        {readyCount > 0 && (
                          <Badge className="text-xs py-0 px-1 bg-success-surface text-success border border-success-border">
                            {readyCount} {isBn ? 'প্রস্তুত' : 'Ready'}
                          </Badge>
                        )}
                        {pendingCount > 0 && (
                          <Badge className="text-xs py-0 px-1 bg-warning-surface text-warning border border-warning-border">
                            {pendingCount} {isBn ? 'অপেক্ষমাণ' : 'Pending'}
                          </Badge>
                        )}
                        {deliveredCount > 0 && (
                          <Badge className="text-xs py-0 px-1 bg-muted text-muted-foreground border border-border">
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
                  <td className="py-3.5 px-4 text-xs tabular-nums">
                    <div className="font-medium text-foreground truncate max-w-[160px]">
                      {ch.vehicle_info || 'Company Transit'}
                    </div>
                    {ch.delivery_person_name && (
                      <div className="text-xs text-muted-foreground truncate">
                        {ch.delivery_person_name}
                      </div>
                    )}
                  </td>

                  {/* Scheduled Date */}
                  <td className="py-3.5 px-4 text-xs tabular-nums text-muted-foreground">
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
                          className="inline-flex items-center justify-center h-7 px-2 text-xs font-bold text-success hover:text-success hover:bg-success-surface rounded-lg transition-colors border border-success-border"
                          title="Share Challan on WhatsApp"
                        >
                          <MessageSquare className="h-3.5 w-3.5 mr-1 text-success" />
                          <span>WA</span>
                        </a>
                      ) : null}

                      {ch.customer_phone ? (
                        <a
                          href={`tel:${ch.customer_phone}`}
                          className="inline-flex items-center justify-center h-7 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors border border-border"
                          title="Call Customer"
                        >
                          <Phone className="h-3 w-3" />
                        </a>
                      ) : null}

                      <Link
                        href={getTenantNavHref(`/delivery/${ch.id}`, pathname, tenantSlug)}
                        className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold border border-input text-foreground hover:bg-muted"
                      >
                        <Printer className="h-3 w-3 mr-1" />
                        <span>PDF</span>
                      </Link>

                      <Button
                        size="sm"
                        onClick={() => onOpenDeliveryModal(ch)}
                        className={cn(
                          'h-7 text-xs px-2.5 font-bold shadow-xs cursor-pointer',
                          ch.status === 'delivered'
                            ? 'bg-muted text-foreground hover:bg-muted'
                            : ch.status === 'partially_delivered'
                            ? 'bg-warning hover:bg-warning/90 text-warning-foreground'
                            : readyCount > 0
                            ? 'bg-success hover:bg-success/90 text-success-foreground'
                            : 'bg-primary hover:bg-primary/90 text-primary-foreground'
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
      <div className="md:hidden divide-y divide-border">
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

          const waMessage = generateBangladeshiChallanWhatsAppMessage(ch, companyName)
          const waUrl = cleanPhone ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(waMessage)}` : '#'
          const dueAmt = Number(ch.due_amount) || 0

          return (
            <div key={ch.id} className="p-4 space-y-3 hover:bg-muted transition-colors">
              {/* Header: Challan # & Status */}
              <div className="flex items-center justify-between gap-2">
                <Link
                  href={getTenantNavHref(`/delivery/${ch.id}`, pathname, tenantSlug)}
                  className="tabular-nums font-bold text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <span>{ch.challan_number}</span>
                  <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                </Link>
                {getDeliveryStatusBadge(ch.status)}
              </div>

              {/* Invoice & Due Alert Bar */}
              <div className="flex items-center gap-2 tabular-nums flex-wrap">
                <Badge variant="outline" className="text-xs py-0 px-1 font-semibold text-primary bg-primary/10 border-primary/20">
                  {ch.invoice_number || `INV-${ch.challan_number.replace('CHL-', '').replace('CH-', '')}`}
                </Badge>
                {ch.order_number && (
                  <span className="text-xs text-muted-foreground">({ch.order_number})</span>
                )}
                {dueAmt > 0 ? (
                  <Badge className="text-xs py-0 px-1.5 bg-destructive/10 text-destructive border border-destructive/20 font-bold">
                    {isBn ? `বকেয়া: ${formatBDT(dueAmt)}` : `Due: ${formatBDT(dueAmt)}`}
                  </Badge>
                ) : ch.grand_total ? (
                  <Badge className="text-xs py-0 px-1.5 bg-success-surface text-success border border-success-border font-bold">
                    {isBn ? 'পরিশোধিত' : 'Paid'}
                  </Badge>
                ) : null}
              </div>

              {/* Customer & Address */}
              <div>
                <div className="font-semibold text-sm text-foreground flex items-center justify-between">
                  <span>{ch.customer_name}</span>
                  {ch.customer_phone && (
                    <a href={`tel:${ch.customer_phone}`} className="text-xs tabular-nums text-primary hover:underline">
                      {ch.customer_phone}
                    </a>
                  )}
                </div>
                <div className="text-xs text-muted-foreground flex items-start gap-1 mt-0.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" />
                  <span>{ch.delivery_address || 'Factory Pickup'}</span>
                </div>
                {items.length > 0 && (
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    <span className="text-xs text-muted-foreground font-medium">{items.length} {isBn ? 'আইটেম:' : 'Items:'}</span>
                    {readyCount > 0 && (
                      <Badge className="text-xs py-0 px-1 bg-success-surface text-success border border-success-border">
                        {readyCount} Ready
                      </Badge>
                    )}
                    {pendingCount > 0 && (
                      <Badge className="text-xs py-0 px-1 bg-warning-surface text-warning border border-warning-border">
                        {pendingCount} Pending
                      </Badge>
                    )}
                    {deliveredCount > 0 && (
                      <Badge className="text-xs py-0 px-1 bg-muted text-muted-foreground border border-border">
                        {deliveredCount} Delivered
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-muted text-xs border border-border">
                <div>
                  <span className="text-xs uppercase font-semibold text-muted-foreground block">{isBn ? 'মাধ্যম' : 'Method'}</span>
                  <div className="mt-0.5">{getMethodBadge(ch.delivery_method)}</div>
                </div>
                <div>
                  <span className="text-xs uppercase font-semibold text-muted-foreground block">{isBn ? 'ডেলিভারি তারিখ' : 'Scheduled Date'}</span>
                  <span className="tabular-nums text-foreground">{ch.scheduled_date}</span>
                </div>
                {ch.vehicle_info && (
                  <div className="col-span-2 text-xs text-muted-foreground pt-1 border-t border-border">
                    {isBn ? 'গাড়ি:' : 'Vehicle:'} <strong className="tabular-nums text-foreground">{ch.vehicle_info}</strong>
                    {ch.delivery_person_name && <span> ({ch.delivery_person_name})</span>}
                  </div>
                )}
              </div>

              {/* Actions Grid */}
              <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-border">
                {cleanPhone ? (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1 h-9 rounded-lg text-xs font-bold bg-success-surface text-success hover:bg-success-surface border border-success-border"
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
                  className="inline-flex items-center justify-center h-9 rounded-lg text-xs font-semibold border border-input text-foreground hover:bg-muted"
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
                      ? 'bg-muted text-foreground hover:bg-muted'
                      : ch.status === 'partially_delivered'
                      ? 'bg-warning hover:bg-warning/90 text-warning-foreground'
                      : readyCount > 0
                      ? 'bg-success hover:bg-success/90 text-success-foreground'
                      : 'bg-primary hover:bg-primary/90 text-primary-foreground'
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
