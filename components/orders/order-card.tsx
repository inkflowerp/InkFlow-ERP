'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Sparkles,
  Phone,
  Clock,
  Printer,
  FileText,
  Truck,
  ArrowRight,
  MessageSquare,
  PackageCheck,
  AlertTriangle,
  UserCheck,
  ExternalLink,
  MapPin,
  Calendar,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'
import {
  type UnifiedOrderRecord,
  type OrderStage,
  type OrderLiveStatus,
  type OrderItemSpec,
  ORDER_LIVE_STATUSES,
  resolveOrderItemSpecs,
} from './types'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'

interface OrderCardProps {
  order: UnifiedOrderRecord
  tenantSlug: string
  onOpenWhatsApp: (order: UnifiedOrderRecord, tpl?: any) => void
  onOpenJobTicket: (order: UnifiedOrderRecord) => void
  onPrintJobTicket: (order: UnifiedOrderRecord) => void
  onOpenQuickStatus: (order: UnifiedOrderRecord) => void
  onAdvanceStage: (orderId: string, nextStage: OrderStage) => void
  onUpdateLiveStatus?: (orderId: string, newStatus: OrderLiveStatus) => void
}

function getDeliveryDaysRemaining(deliveryDateStr?: string): { days: number; textEn: string; textBn: string; isPast: boolean; isToday: boolean } | null {
  if (!deliveryDateStr) return null
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const target = new Date(deliveryDateStr)
    target.setHours(0, 0, 0, 0)
    if (isNaN(target.getTime())) return null
    const diffTime = target.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return { days: 0, textEn: 'Due Today', textBn: 'আজকের ডেলিভারি', isPast: false, isToday: true }
    if (diffDays === 1) return { days: 1, textEn: 'Tomorrow', textBn: 'আগামীকাল', isPast: false, isToday: false }
    if (diffDays > 1) return { days: diffDays, textEn: `In ${diffDays} days`, textBn: `${diffDays} দিন বাকি`, isPast: false, isToday: false }
    const pastDays = Math.abs(diffDays)
    return { days: pastDays, textEn: `${pastDays}d overdue`, textBn: `${pastDays} দিন বিলম্বিত`, isPast: true, isToday: false }
  } catch {
    return null
  }
}

export const OrderCard = React.memo(function OrderCard({
  order,
  tenantSlug,
  onOpenWhatsApp,
  onOpenJobTicket,
  onPrintJobTicket,
  onOpenQuickStatus,
  onAdvanceStage,
  onUpdateLiveStatus,
}: OrderCardProps) {
  const pathname = usePathname()
  const { tBilingual } = useI18n()
  const isUrgent = order.priority === 'urgent' || order.priority === 'very_urgent'
  const isPaid = order.paymentStatus === 'paid'
  const isPartial = order.paymentStatus === 'partial'

  const deliveryCountdown = getDeliveryDaysRemaining(order.deliveryDate)
  const isDueToday = deliveryCountdown?.isToday || order.deliveryDate?.includes(new Date().toISOString().split('T')[0])
  const isOverdue = deliveryCountdown?.isPast

  // Check if any item in this order requires design work
  const hasDesignRequired = order.items.some(
    (it) => it.designRequired || it.workflowRouting === 'design_required'
  )

  // Current live status config
  const currentStatusConfig =
    ORDER_LIVE_STATUSES.find((s) => s.id === order.currentStatus) ||
    ORDER_LIVE_STATUSES.find((s) => s.stage === order.stage) ||
    ORDER_LIVE_STATUSES[0]

  // Customer initials avatar
  const customerInitials = (order.customerName || 'C')
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div
      className={`rounded-2xl border border-l-4 transition-all duration-200 overflow-hidden bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs ${
        isUrgent || isOverdue
          ? 'border-rose-300 dark:border-rose-900/60 border-l-rose-600 shadow-xs ring-1 ring-rose-400/20'
          : 'border-slate-200/90 dark:border-slate-800/90 border-l-indigo-600 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      {/* Top Notification Strip */}
      {(isUrgent || isDueToday || isOverdue || order.isWalkIn) && (
        <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-transparent px-4 py-1.5 border-b border-amber-200/50 dark:border-amber-900/40 flex items-center justify-between text-2xs font-bold">
          <div className="flex items-center gap-2">
            {order.isWalkIn && (
              <span className="bg-orange-600 text-white px-2 py-0.5 rounded text-2xs uppercase tracking-wide flex items-center gap-1">
                <UserCheck className="h-3 w-3" />
                <span>{tBilingual('Walk-in Counter Customer', 'দোকানে বসা কাস্টমার')}</span>
              </span>
            )}
            {isOverdue && (
              <span className="bg-rose-700 text-white px-2 py-0.5 rounded text-2xs uppercase tracking-wide flex items-center gap-1 animate-pulse">
                <AlertTriangle className="h-3 w-3" />
                <span>{tBilingual(`Overdue (${deliveryCountdown?.textEn})`, `ডেলিভারি বিলম্বিত (${deliveryCountdown?.textBn})`)}</span>
              </span>
            )}
            {isDueToday && !isOverdue && (
              <span className="bg-rose-600 text-white px-2 py-0.5 rounded text-2xs uppercase tracking-wide flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{tBilingual('Due Today', 'আজকের ডেলিভারি')}</span>
              </span>
            )}
            {isUrgent && !isDueToday && !isOverdue && (
              <span className="bg-red-600 text-white px-2 py-0.5 rounded text-2xs uppercase tracking-wide flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                <span>{tBilingual('Urgent Order', 'অতি জরুরী অর্ডার')}</span>
              </span>
            )}
          </div>
          <span className="text-slate-500 text-2xs tabular-nums font-semibold flex items-center gap-1">
            <Calendar className="h-3 w-3 text-slate-400" />
            <span>
              {order.deliveryDate
                ? `${tBilingual('Target: ', 'টার্গেট: ')}${order.deliveryDate}${
                    deliveryCountdown && !deliveryCountdown.isToday && !deliveryCountdown.isPast
                      ? ` (${tBilingual(deliveryCountdown.textEn, deliveryCountdown.textBn)})`
                      : ''
                  }`
                : ''}
            </span>
          </span>
        </div>
      )}

      {/* Main 3-Column Card Layout */}
      <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Customer & Order Metadata (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col justify-between space-y-3 border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-slate-800 pb-3 lg:pb-0 lg:pr-4">
          <div className="space-y-2.5">
            {/* Order # & Badges Row */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link
                href={getTenantNavHref(`/orders/${order.id}`, pathname, tenantSlug)}
                className="tabular-nums text-xs font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors flex items-center gap-1"
                title={tBilingual('View Order Details', 'অর্ডার বিস্তারিত দেখুন')}
              >
                <span>#{order.orderNumber}</span>
                <ExternalLink className="h-3 w-3" />
              </Link>

              {order.invoiceNumber && (
                <Link
                  href={getTenantNavHref('/invoices', pathname, tenantSlug)}
                  className="tabular-nums text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  title={tBilingual('Linked Invoice', 'সংযুক্ত চালান')}
                >
                  Inv: #{order.invoiceNumber}
                </Link>
              )}

              {order.jobNumber && (
                <span className="tabular-nums text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                  Job: #{order.jobNumber}
                </span>
              )}

              <span className="text-2xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded uppercase tracking-wider">
                {order.origin.replace('_', ' ')}
              </span>
            </div>

            {/* Customer Details with Avatar & Phone */}
            <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                {customerInitials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {order.customerName || tBilingual('Walk-in Customer', 'দোকানের কাস্টমার')}
                  </h3>
                  {order.customerType && (
                    <span className="text-2xs font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700 uppercase">
                      {order.customerType}
                    </span>
                  )}
                </div>

                {order.customerPhone && (
                  <div className="mt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenWhatsApp(order, 'order_confirmed')}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                      title={tBilingual('Send WhatsApp message', 'হোয়াটসঅ্যাপ মেসেজ পাঠান')}
                    >
                      <Phone className="h-3 w-3 text-emerald-600 shrink-0" />
                      <span className="tabular-nums">{order.customerPhone}</span>
                    </button>
                  </div>
                )}

                {order.customerAddress && (
                  <p className="text-2xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5 flex items-center gap-1" title={order.customerAddress}>
                    <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                    <span>{order.customerAddress}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Quick Date Footer */}
          <div className="text-2xs text-slate-400 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-slate-400" />
              <span>{tBilingual('Booked: ', 'বুকিং: ')}{order.orderDate}</span>
            </span>
            <span className={`font-semibold tabular-nums ${isDueToday ? 'text-rose-600 font-bold' : isOverdue ? 'text-rose-700 font-bold' : 'text-slate-600 dark:text-slate-400'}`}>
              {tBilingual('Delivery: ', 'ডেলিভারি: ')}{order.deliveryDate || 'N/A'}
            </span>
          </div>
        </div>

        {/* Center Column: Multi-Item Technical Specs Breakdown (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-2 border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-slate-800 pb-3 lg:pb-0 lg:pr-4">
          <div className="space-y-1.5">
            {(() => {
              let totalSft = 0
              let totalPcs = 0
              let hasSft = false

              order.items.forEach((it) => {
                const qty = Number(it.quantity) || 1
                totalPcs += qty

                let w = Number(it.width) || 0
                let h = Number(it.height) || 0
                let dimUnit = (it.dimensionUnit || 'ft').toLowerCase()

                if ((!w || !h) && it.dimensions) {
                  const match = it.dimensions.match(/([\d.]+)\s*(?:×|x|\*)\s*([\d.]+)(?:\s*([a-zA-Z]+))?/i)
                  if (match) {
                    w = parseFloat(match[1]) || 0
                    h = parseFloat(match[2]) || 0
                    if (match[3]) dimUnit = match[3].toLowerCase()
                  }
                }

                if (w > 0 && h > 0) {
                  hasSft = true
                  if (dimUnit === 'inch' || dimUnit === 'in') {
                    totalSft += (w * h * qty) / 144
                  } else {
                    totalSft += w * h * qty
                  }
                } else if ((it.unit || '').toLowerCase() === 'sft' || (it.unit || '').toLowerCase() === 'sqft') {
                  hasSft = true
                  totalSft += qty
                }
              })

              const sftFormatted = Number.isInteger(totalSft) ? totalSft.toLocaleString() : totalSft.toFixed(1)

              return (
                <div className="text-2xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>{tBilingual(`Work Specs (${order.items.length || 1} Works):`, `কাজের বিবরণ ও স্পেক (${order.items.length || 1}টি):`)}</span>
                  <span className="tabular-nums text-slate-500 font-semibold">
                    {hasSft && totalSft > 0
                      ? `${sftFormatted} ${tBilingual('sft total', 'বর্গফুট মোট')} (${totalPcs || order.itemsCount || 1} ${tBilingual('pcs', 'টি')})`
                      : tBilingual(`Total Items: ${order.itemsCount || totalPcs || 1}`, `মোট আইটেম: ${order.itemsCount || totalPcs || 1}`)}
                  </span>
                </div>
              )
            })()}

            {/* Multi-Item Line items */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {order.items.length === 0 ? (() => {
                const synthItem: OrderItemSpec = {
                  id: `synth-${order.id}`,
                  serviceName:
                    order.rawJob?.product_name ||
                    order.rawInvoice?.items?.[0]?.item_description ||
                    (order.notes && order.notes.replace(/^Work Order:\s*/, '').split(';')[0]) ||
                    tBilingual('Custom Printing Work', 'কাস্টম প্রিন্টিং কাজ'),
                  itemName:
                    order.rawJob?.product_name ||
                    order.rawInvoice?.items?.[0]?.item_description ||
                    (order.notes && order.notes.replace(/^Work Order:\s*/, '').split(';')[0]) ||
                    tBilingual('Custom Printing Work', 'কাস্টম প্রিন্টিং কাজ'),
                  quantity: Number(order.rawJob?.quantity || order.rawInvoice?.items?.[0]?.quantity) || 1,
                  unit: order.rawInvoice?.items?.[0]?.unit || 'pcs',
                  materialSpec: order.rawJob?.material_spec || order.rawInvoice?.items?.[0]?.material_spec || undefined,
                  dimensions: order.rawJob?.size_spec || order.rawInvoice?.items?.[0]?.dimensions_spec || undefined,
                }
                const specs = resolveOrderItemSpecs(synthItem, order.rawJob, order.rawInvoice, tBilingual)
                return (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-2xs space-y-2">
                    <div className="flex items-start justify-between gap-1.5">
                      <strong className="text-slate-900 dark:text-slate-100 font-bold text-xs line-clamp-1">
                        {synthItem.serviceName || synthItem.itemName}
                      </strong>
                      <span className="tabular-nums font-bold text-indigo-700 dark:text-indigo-300 shrink-0 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800 text-2xs">
                        {specs.quantity}
                      </span>
                    </div>

                    {/* Structured 6-Field Technical Specs */}
                    <div className="rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 p-2 text-2xs space-y-1.5 tabular-nums">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
                        <div className="flex items-baseline gap-1 min-w-0">
                          <span className="font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                            {tBilingual('Service name:', 'সার্ভিসের নাম:')}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-slate-100 break-words" title={specs.serviceName}>
                            {specs.serviceName}
                          </span>
                        </div>

                        <div className="flex items-baseline gap-1 min-w-0">
                          <span className="font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                            {tBilingual('Material name:', 'মেটেরিয়াল নাম:')}
                          </span>
                          <span className="font-bold text-indigo-700 dark:text-indigo-400 break-words" title={specs.material}>
                            {specs.material}
                          </span>
                        </div>

                        <div className="flex items-baseline gap-1 min-w-0">
                          <span className="font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                            {tBilingual('Size:', 'সাইজ:')}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-slate-100 break-words" title={specs.size}>
                            {specs.size}
                          </span>
                        </div>

                        <div className="flex items-baseline gap-1 min-w-0">
                          <span className="font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                            {tBilingual('Quantity:', 'পরিমাণ:')}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-slate-100 break-words" title={specs.quantity}>
                            {specs.quantity}
                          </span>
                        </div>

                        <div className="flex items-baseline gap-1 min-w-0">
                          <span className="font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                            {tBilingual('Finishing:', 'ফিনিশিং:')}
                          </span>
                          <span className={`break-words ${specs.finishing !== 'None' ? 'text-amber-700 dark:text-amber-300 font-bold' : 'text-slate-400'}`} title={specs.finishing}>
                            {specs.finishing}
                          </span>
                        </div>

                        <div className="flex items-baseline gap-1 min-w-0">
                          <span className="font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                            {tBilingual('Add-on:', 'অ্যাড-অন:')}
                          </span>
                          <span className={`break-words ${specs.addOn !== 'None' ? 'text-indigo-700 dark:text-indigo-300 font-bold' : 'text-slate-400'}`} title={specs.addOn}>
                            {specs.addOn}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span className="text-2xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                        {tBilingual('Machine Floor Production', 'প্রেসে প্রোডাকশন')}
                      </span>
                      {order.invoiceNumber && (
                        <span className="text-2xs text-slate-500 tabular-nums">
                          🧾 Inv: #{order.invoiceNumber}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })() : (
                order.items.map((it, idx) => {
                  const specs = resolveOrderItemSpecs(it, order.rawJob, order.rawInvoice, tBilingual)
                  return (
                    <div
                      key={it.id || idx}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-2xs space-y-2"
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <strong className="text-slate-900 dark:text-slate-100 font-bold text-xs line-clamp-1">
                          {specs.serviceName}
                        </strong>
                        <span className="tabular-nums font-bold text-indigo-700 dark:text-indigo-300 shrink-0 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800 text-2xs">
                          {specs.quantity}
                        </span>
                      </div>

                      {/* Structured 6-Field Technical Specs */}
                      <div className="rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 p-2 text-2xs space-y-1.5 tabular-nums">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
                          <div className="flex items-baseline gap-1 min-w-0">
                            <span className="font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                              {tBilingual('Service name:', 'সার্ভিসের নাম:')}
                            </span>
                            <span className="font-bold text-slate-900 dark:text-slate-100 break-words" title={specs.serviceName}>
                              {specs.serviceName}
                            </span>
                          </div>

                          <div className="flex items-baseline gap-1 min-w-0">
                            <span className="font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                              {tBilingual('Material name:', 'মেটেরিয়াল নাম:')}
                            </span>
                            <span className="font-bold text-indigo-700 dark:text-indigo-400 break-words" title={specs.material}>
                              {specs.material}
                            </span>
                          </div>

                          <div className="flex items-baseline gap-1 min-w-0">
                            <span className="font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                              {tBilingual('Size:', 'সাইজ:')}
                            </span>
                            <span className="font-bold text-slate-900 dark:text-slate-100 break-words" title={specs.size}>
                              {specs.size}
                            </span>
                          </div>

                          <div className="flex items-baseline gap-1 min-w-0">
                            <span className="font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                              {tBilingual('Quantity:', 'পরিমাণ:')}
                            </span>
                            <span className="font-bold text-slate-900 dark:text-slate-100 break-words" title={specs.quantity}>
                              {specs.quantity}
                            </span>
                          </div>

                          <div className="flex items-baseline gap-1 min-w-0">
                            <span className="font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                              {tBilingual('Finishing:', 'ফিনিশিং:')}
                            </span>
                            <span className={`break-words ${specs.finishing !== 'None' ? 'text-amber-700 dark:text-amber-300 font-bold' : 'text-slate-400'}`} title={specs.finishing}>
                              {specs.finishing}
                            </span>
                          </div>

                          <div className="flex items-baseline gap-1 min-w-0">
                            <span className="font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                              {tBilingual('Add-on:', 'অ্যাড-অন:')}
                            </span>
                            <span className={`break-words ${specs.addOn !== 'None' ? 'text-indigo-700 dark:text-indigo-300 font-bold' : 'text-slate-400'}`} title={specs.addOn}>
                              {specs.addOn}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Workflow routing & item classification tag */}
                      <div className="pt-0.5 flex items-center gap-1.5 flex-wrap">
                        {it.itemKind === 'ready_product' || it.workflowRouting === 'ready_product' ? (
                          <span className="text-2xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-800">
                            {tBilingual('Ready Product (In Stock)', 'রেডি প্রোডাক্ট (ইন-স্টক)')}
                          </span>
                        ) : it.itemKind === 'outsource' || it.workflowRouting === 'outsource' ? (
                          <span className="text-2xs font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 px-2 py-0.5 rounded-md border border-purple-300 dark:border-purple-800">
                            {tBilingual('Outsourced Product', 'আউটসোর্স পণ্য')}
                          </span>
                        ) : it.workflowRouting === 'design_required' ? (
                          <span className="text-2xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                            {tBilingual('Custom Print (Design Needed)', 'কাস্টম প্রিন্ট (ডিজাইন দরকার)')}
                          </span>
                        ) : it.workflowRouting === 'design_ok' ? (
                          <span className="text-2xs font-bold bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 px-2 py-0.5 rounded-md border border-cyan-200 dark:border-cyan-800">
                            {tBilingual('Ready File Verified', 'রেডি ফাইল চেক')}
                          </span>
                        ) : (
                          <span className="text-2xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                            {tBilingual('Machine Floor Production', 'প্রেসে প্রোডাকশন')}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Financial Health Strip, Live Status & Actions (3 Cols) */}
        <div className="lg:col-span-3 flex flex-col justify-between space-y-2.5">
          {/* Live Status Selector */}
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5">
            <div className="flex items-center justify-between text-2xs font-bold text-slate-500 uppercase tracking-wider">
              <span>{tBilingual('Live Current Status:', 'বর্তমান অবস্থা:')}</span>
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${currentStatusConfig.dotColor} animate-pulse shadow-xs`} />
            </div>
            <select
              value={order.currentStatus || currentStatusConfig.id}
              onChange={(e) => onUpdateLiveStatus?.(order.id, e.target.value as OrderLiveStatus)}
              className="w-full text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-slate-800 dark:text-slate-100 cursor-pointer focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
            >
              {ORDER_LIVE_STATUSES.map((st) => (
                <option key={st.id} value={st.id}>
                  {tBilingual(st.labelEn, st.labelBn)}
                </option>
              ))}
            </select>
          </div>

          {/* Financial Breakdown */}
          <div className="bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-500 text-2xs">
              <span>{tBilingual('Total Amount:', 'মোট মূল্য:')}</span>
              <strong className="tabular-nums text-slate-900 dark:text-white font-bold">
                ৳{order.totalAmount.toLocaleString()}
              </strong>
            </div>
            <div className="flex items-center justify-between text-slate-500 text-2xs">
              <span>{tBilingual('Paid / Advance:', 'জমা / অগ্রিম:')}</span>
              <span className="tabular-nums text-emerald-600 font-bold">
                ৳{order.advanceAmount.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-1 font-bold">
              <span className={order.dueAmount > 0 ? 'text-rose-600' : 'text-slate-600 dark:text-slate-300'}>
                {tBilingual('Balance Due:', 'বকেয়া বাকি:')}
              </span>
              <span className={`tabular-nums ${order.dueAmount > 0 ? 'text-rose-600 font-black' : 'text-emerald-600 font-bold'}`}>
                ৳{order.dueAmount.toLocaleString()}
              </span>
            </div>
            <div className="pt-1 flex items-center justify-between text-2xs">
              <span className="text-slate-400 font-medium">{tBilingual('Payment:', 'পেমেন্ট:')}</span>
              <span
                className={`font-bold uppercase px-2 py-0.5 rounded-md text-2xs ${
                  isPaid
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : isPartial
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {isPaid
                  ? tBilingual('PAID', 'পরিশোধিত')
                  : isPartial
                  ? tBilingual('PARTIAL', 'আংশিক')
                  : tBilingual('UNPAID', 'বকেয়া')}
              </span>
            </div>
          </div>

          {/* Press Action Buttons */}
          <div className="space-y-1.5">
            {/* Primary Action Button Based on Stage & Readiness */}
            {order.stage === 'new_orders' && (
              hasDesignRequired ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onAdvanceStage(order.id, 'in_design')}
                  className="w-full text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-8 shadow-sm transition-all"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  <span>{tBilingual('Send to Design Studio', 'ডিজাইনে পাঠান')}</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onAdvanceStage(order.id, 'in_production')}
                  className="w-full text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold h-8 shadow-sm transition-all"
                >
                  <Printer className="h-3.5 w-3.5 mr-1.5" />
                  <span>{tBilingual('Send to Machine Floor', 'প্রেসে পাঠান')}</span>
                </Button>
              )
            )}

            {order.stage === 'in_design' && (
              <Button
                type="button"
                size="sm"
                onClick={() => onAdvanceStage(order.id, 'in_production')}
                className="w-full text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold h-8 shadow-sm transition-all"
              >
                <Printer className="h-3.5 w-3.5 mr-1.5" />
                <span>{tBilingual('Send to Machine Floor', 'প্রেসে পাঠান')}</span>
              </Button>
            )}

            {order.stage === 'in_production' && (
              <Button
                type="button"
                size="sm"
                onClick={() => onAdvanceStage(order.id, 'ready_delivery')}
                className="w-full text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold h-8 shadow-sm transition-all"
              >
                <Truck className="h-3.5 w-3.5 mr-1.5" />
                <span>{tBilingual('Mark Delivery Ready', 'ডেলিভারি রেডি')}</span>
              </Button>
            )}

            {order.stage === 'ready_delivery' && (
              <Button
                type="button"
                size="sm"
                onClick={() => onAdvanceStage(order.id, 'delivered')}
                className="w-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 shadow-sm transition-all"
              >
                <PackageCheck className="h-3.5 w-3.5 mr-1.5" />
                <span>{tBilingual('Mark Delivered', 'ডেলিভারি সম্পন্ন')}</span>
              </Button>
            )}

            {order.stage === 'delivered' && (
              <div className="text-center text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800">
                {tBilingual('✓ Order Delivered & Completed', '✓ ডেলিভারি ও অর্ডার সম্পন্ন')}
              </div>
            )}

            {/* Direct Print Job Sheet & Secondary Actions */}
            <div className="grid grid-cols-3 gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onOpenJobTicket(order)}
                className="text-2xs h-7 px-1 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 font-bold flex items-center justify-center gap-1"
                title={tBilingual('View Production Job Ticket / Press Sheet', 'প্রোডাকশন জব স্লিপ দেখুন ও প্রিন্ট')}
              >
                <FileText className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                <span>{tBilingual('Job Sheet', 'জব স্লিপ')}</span>
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onOpenWhatsApp(order)}
                className="text-2xs h-7 px-1 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950 flex items-center justify-center gap-1"
                title={tBilingual('Send WhatsApp Update', 'হোয়াটসঅ্যাপ বার্তা পাঠান')}
              >
                <MessageSquare className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                <span>WhatsApp</span>
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onOpenQuickStatus(order)}
                className="text-2xs h-7 px-1 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1"
                title={tBilingual('Change Workflow Stage', 'কাজের পর্যায় পরিবর্তন')}
              >
                <ArrowRight className="h-3 w-3 text-slate-600 dark:text-slate-400" />
                <span>{tBilingual('Stage', 'পর্যায়')}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})
