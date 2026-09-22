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
  FileCheck,
  Truck,
  Layers,
  ArrowRight,
  MessageSquare,
  PackageCheck,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { UnifiedOrderRecord, OrderStage } from './types'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'

interface OrderCardProps {
  order: UnifiedOrderRecord
  tenantSlug: string
  onOpenWhatsApp: (order: UnifiedOrderRecord, tpl?: any) => void
  onOpenJobTicket: (order: UnifiedOrderRecord) => void
  onOpenQuickStatus: (order: UnifiedOrderRecord) => void
  onAdvanceStage: (orderId: string, nextStage: OrderStage) => void
}

export const OrderCard = React.memo(function OrderCard({
  order,
  tenantSlug,
  onOpenWhatsApp,
  onOpenJobTicket,
  onOpenQuickStatus,
  onAdvanceStage,
}: OrderCardProps) {
  const pathname = usePathname()
  const isUrgent = order.priority === 'urgent' || order.priority === 'very_urgent'
  const isDueToday = order.deliveryDate?.includes(new Date().toISOString().split('T')[0])
  const isPaid = order.paymentStatus === 'paid'
  const isPartial = order.paymentStatus === 'partial'

  return (
    <div
      className={`rounded-xl border transition-all duration-200 overflow-hidden bg-white dark:bg-slate-900 ${
        isUrgent
          ? 'border-rose-300 dark:border-rose-900/60 shadow-sm ring-1 ring-rose-400/20'
          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      {/* Top Notification Strip */}
      {(isUrgent || isDueToday || order.isWalkIn) && (
        <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-transparent px-4 py-1 border-b border-amber-200/50 dark:border-amber-900/40 flex items-center justify-between text-[11px] font-bold">
          <div className="flex items-center gap-2">
            {order.isWalkIn && (
              <span className="bg-orange-600 text-white px-2 py-0.5 rounded text-[10px] uppercase tracking-wide">
                🏃 দোকানে বসা কাস্টমার (Walk-in Counter)
              </span>
            )}
            {isDueToday && (
              <span className="bg-rose-600 text-white px-2 py-0.5 rounded text-[10px] uppercase tracking-wide">
                ⏰ আজকের ডেলিভারি (Due Today)
              </span>
            )}
            {isUrgent && !isDueToday && (
              <span className="bg-red-600 text-white px-2 py-0.5 rounded text-[10px] uppercase tracking-wide">
                🚨 অতি জরুরী অর্ডার (Urgent)
              </span>
            )}
          </div>
          <span className="text-slate-500 text-[10px] font-mono">
            {order.deliveryDate ? `ডেলিভারি টার্গেট: ${order.deliveryDate}` : ''}
          </span>
        </div>
      )}

      {/* Main 3-Column Card Layout */}
      <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Customer & Order Metadata (3.5 Cols) */}
        <div className="lg:col-span-4 flex flex-col justify-between space-y-2.5 border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-slate-800 pb-3 lg:pb-0 lg:pr-4">
          <div>
            {/* Order # & Badges */}
            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
              <Link
                href={getTenantNavHref(`/orders/${order.id}`, pathname, tenantSlug)}
                className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 hover:underline flex items-center gap-1"
              >
                <span>#{order.orderNumber}</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
              {order.invoiceNumber && (
                <Link
                  href={getTenantNavHref('/invoices', pathname, tenantSlug)}
                  className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded hover:underline"
                >
                  Inv: #{order.invoiceNumber}
                </Link>
              )}
              <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded uppercase">
                {order.origin.replace('_', ' ')}
              </span>
            </div>

            {/* Customer Details */}
            <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
              {order.customerName}
            </h3>
            {order.customerPhone && (
              <div className="mt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenWhatsApp(order, 'order_confirmed')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  <Phone className="h-3 w-3 text-emerald-600" />
                  <span>{order.customerPhone}</span>
                </button>
              </div>
            )}
            {order.customerAddress && (
              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                📍 {order.customerAddress}
              </p>
            )}
          </div>

          {/* Quick Date Footer */}
          <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60">
            <span>বুকিং: {order.orderDate}</span>
            <span>ডেলিভারি: {order.deliveryDate || 'N/A'}</span>
          </div>
        </div>

        {/* Center Column: Multi-Item Technical Specs Breakdown (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-2 border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-slate-800 pb-3 lg:pb-0 lg:pr-4">
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>কাজের বিবরণ ও স্পেক ({order.items.length} Works):</span>
              <span className="font-mono text-slate-500">মোট আইটেম: {order.itemsCount}</span>
            </div>

            {/* Multi-Item Line items */}
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {order.items.map((it, idx) => (
                <div
                  key={it.id || idx}
                  className="p-2 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-[11px] space-y-0.5"
                >
                  <div className="flex items-start justify-between gap-1">
                    <strong className="text-slate-800 dark:text-slate-200 line-clamp-1 font-semibold">
                      {it.itemName}
                    </strong>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300 shrink-0">
                      {it.quantity} {it.unit}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono flex-wrap">
                    {it.dimensions && <span>📐 {it.dimensions}</span>}
                    {it.materialSpec && <span>• 📄 {it.materialSpec}</span>}
                    {it.finishing && <span>• ✨ {it.finishing}</span>}
                  </div>
                  {/* Workflow routing & item classification tag */}
                  <div className="pt-0.5 flex items-center gap-1.5 flex-wrap">
                    {it.itemKind === 'ready_product' || it.workflowRouting === 'ready_product' ? (
                      <span className="text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                        📦 রেডি প্রোডাক্ট (ইন-স্টক)
                      </span>
                    ) : it.itemKind === 'outsource' || it.workflowRouting === 'outsource' ? (
                      <span className="text-[9px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 px-1.5 py-0.5 rounded border border-purple-300 dark:border-purple-800">
                        🤝 আউটসোর্স পণ্য
                      </span>
                    ) : it.workflowRouting === 'design_required' ? (
                      <span className="text-[9px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                        🎨 কাস্টম প্রিন্ট (ডিজাইন দরকার)
                      </span>
                    ) : it.workflowRouting === 'design_ok' ? (
                      <span className="text-[9px] font-bold bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-200 dark:border-cyan-800">
                        ✓ রেডি ফাইল চেক
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                        🖨️ প্রেসে প্রোডাকশন
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Financial Health Strip & Contextual Actions (3.5 Cols) */}
        <div className="lg:col-span-3 flex flex-col justify-between space-y-3">
          {/* Financial Breakdown */}
          <div className="bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/80 space-y-1 text-xs">
            <div className="flex items-center justify-between text-slate-500 text-[11px]">
              <span>মোট মূল্য (Total):</span>
              <strong className="font-mono text-slate-900 dark:text-white font-bold">
                ৳{order.totalAmount.toLocaleString()}
              </strong>
            </div>
            <div className="flex items-center justify-between text-slate-500 text-[11px]">
              <span>জমা / অগ্রিম (Paid):</span>
              <span className="font-mono text-emerald-600 font-semibold">
                ৳{order.advanceAmount.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-1 font-bold">
              <span className={order.dueAmount > 0 ? 'text-rose-600' : 'text-slate-600'}>
                বকেয়া বাকি (Due):
              </span>
              <span className={`font-mono ${order.dueAmount > 0 ? 'text-rose-600 font-black' : 'text-slate-600'}`}>
                ৳{order.dueAmount.toLocaleString()}
              </span>
            </div>
            <div className="pt-1 flex items-center justify-between text-[10px]">
              <span className="text-slate-400">পেমেন্ট:</span>
              <span
                className={`font-bold uppercase px-1.5 py-0.2 rounded text-[9px] ${
                  isPaid
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : isPartial
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                }`}
              >
                {order.paymentStatus}
              </span>
            </div>
          </div>

          {/* Press Action Buttons */}
          <div className="space-y-1.5">
            {/* Primary Action Button Based on Stage */}
            {order.stage === 'new_orders' && (
              <Button
                type="button"
                size="sm"
                onClick={() => onAdvanceStage(order.id, 'in_design')}
                className="w-full text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-8 shadow-sm"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                <span>ডিজাইনে পাঠান (To Design Studio)</span>
              </Button>
            )}

            {order.stage === 'in_design' && (
              <Button
                type="button"
                size="sm"
                onClick={() => onAdvanceStage(order.id, 'in_production')}
                className="w-full text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold h-8 shadow-sm"
              >
                <Printer className="h-3.5 w-3.5 mr-1.5" />
                <span>প্রেসে পাঠান (To Machine Floor)</span>
              </Button>
            )}

            {order.stage === 'in_production' && (
              <Button
                type="button"
                size="sm"
                onClick={() => onAdvanceStage(order.id, 'ready_delivery')}
                className="w-full text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold h-8 shadow-sm"
              >
                <Truck className="h-3.5 w-3.5 mr-1.5" />
                <span>ডেলিভারি রেডি (Ready for Pickup)</span>
              </Button>
            )}

            {order.stage === 'ready_delivery' && (
              <Button
                type="button"
                size="sm"
                onClick={() => onAdvanceStage(order.id, 'delivered')}
                className="w-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 shadow-sm"
              >
                <PackageCheck className="h-3.5 w-3.5 mr-1.5" />
                <span>ডেলিভারি সম্পন্ন (Mark Delivered)</span>
              </Button>
            )}

            {order.stage === 'delivered' && (
              <div className="text-center text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 p-1.5 rounded border border-emerald-200">
                ✓ ডেলিভারি ও অর্ডার সম্পন্ন
              </div>
            )}

            {/* Secondary Actions: Job Ticket, WhatsApp & Quick Status */}
            <div className="grid grid-cols-3 gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onOpenJobTicket(order)}
                className="text-[11px] h-7 px-1 border-slate-300 text-slate-700 dark:text-slate-300"
                title="প্রিন্ট জব টিকেট (Print Job Slip)"
              >
                <Printer className="h-3 w-3 mr-1" />
                <span>টিকেট</span>
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onOpenWhatsApp(order)}
                className="text-[11px] h-7 px-1 border-emerald-300 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50"
                title="হোয়াটসঅ্যাপ আপডেট (WhatsApp Update)"
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                <span>WhatsApp</span>
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onOpenQuickStatus(order)}
                className="text-[11px] h-7 px-1 border-indigo-300 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50"
                title="স্ট্যাটাস পরিবর্তন (Change Stage)"
              >
                <ArrowRight className="h-3 w-3 mr-1" />
                <span>স্ট্যাটাস</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})
