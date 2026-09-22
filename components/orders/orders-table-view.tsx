'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Sparkles,
  Phone,
  Printer,
  FileText,
  Truck,
  MessageSquare,
  PackageCheck,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { UnifiedOrderRecord, OrderStage } from './types'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'

interface OrdersTableViewProps {
  orders: UnifiedOrderRecord[]
  tenantSlug: string
  onOpenWhatsApp: (order: UnifiedOrderRecord) => void
  onOpenJobTicket: (order: UnifiedOrderRecord) => void
  onOpenQuickStatus: (order: UnifiedOrderRecord) => void
  onAdvanceStage: (orderId: string, nextStage: OrderStage) => void
}

export const OrdersTableView = React.memo(function OrdersTableView({
  orders,
  tenantSlug,
  onOpenWhatsApp,
  onOpenJobTicket,
  onOpenQuickStatus,
  onAdvanceStage,
}: OrdersTableViewProps) {
  const pathname = usePathname()
  if (orders.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500">
        কোনো অর্ডার রেকর্ড পাওয়া যায়নি।
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">অর্ডার / ইনভয়েস</th>
              <th className="py-3 px-4">কাস্টমার ও মোবাইল</th>
              <th className="py-3 px-4">কাজের বিবরণ ও স্পেক</th>
              <th className="py-3 px-4">পর্যায় / স্ট্যাটাস</th>
              <th className="py-3 px-4">বিল ও বকেয়া</th>
              <th className="py-3 px-4 text-right">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {orders.map((order) => {
              const isPaid = order.paymentStatus === 'paid'
              const isPartial = order.paymentStatus === 'partial'

              return (
                <tr
                  key={order.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                >
                  {/* Order # */}
                  <td className="py-3 px-4 align-middle">
                    <Link
                      href={getTenantNavHref(`/orders/${order.id}`, pathname, tenantSlug)}
                      className="font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <span>#{order.orderNumber}</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                    {order.invoiceNumber && (
                      <div className="font-mono text-[10px] text-slate-500">
                        Inv: #{order.invoiceNumber}
                      </div>
                    )}
                  </td>

                  {/* Customer */}
                  <td className="py-3 px-4 align-middle">
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {order.customerName}
                    </div>
                    {order.customerPhone && (
                      <button
                        type="button"
                        onClick={() => onOpenWhatsApp(order)}
                        className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono hover:underline flex items-center gap-1 mt-0.5"
                      >
                        <Phone className="h-3 w-3" />
                        <span>{order.customerPhone}</span>
                      </button>
                    )}
                  </td>

                  {/* Items Specs */}
                  <td className="py-3 px-4 align-middle">
                    <div className="font-bold text-slate-800 dark:text-slate-200 line-clamp-1 flex items-center gap-1.5">
                      <span>{order.items[0]?.itemName || 'Print Work'}</span>
                      {order.items.length > 1 && (
                        <span className="text-[10px] text-slate-500 font-normal">
                          (+{order.items.length - 1} more)
                        </span>
                      )}
                      {order.items.some((it) => it.itemKind === 'ready_product' || it.workflowRouting === 'ready_product') && (
                        <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1 py-0.2 rounded border border-emerald-300 dark:border-emerald-800">
                          📦 রেডি
                        </span>
                      )}
                      {order.items.some((it) => it.itemKind === 'outsource' || it.workflowRouting === 'outsource') && (
                        <span className="text-[9px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 px-1 py-0.2 rounded border border-purple-300 dark:border-purple-800">
                          🤝 আউটসোর্স
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {order.items[0]?.dimensions || 'Standard'} | {order.itemsCount} Items
                    </div>
                  </td>

                  {/* Stage */}
                  <td className="py-3 px-4 align-middle">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      {order.stage.replace('_', ' ')}
                    </span>
                    <div className="text-[9px] text-slate-400 mt-0.5">
                      টার্গেট: {order.deliveryDate || 'N/A'}
                    </div>
                  </td>

                  {/* Financials */}
                  <td className="py-3 px-4 align-middle">
                    <div className="font-mono font-bold text-slate-900 dark:text-white">
                      ৳{order.totalAmount.toLocaleString()}
                    </div>
                    <div className="text-[10px] font-mono">
                      {order.dueAmount > 0 ? (
                        <span className="text-rose-600 font-bold">বাকি: ৳{order.dueAmount.toLocaleString()}</span>
                      ) : (
                        <span className="text-emerald-600 font-bold">পরিশোধিত</span>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 align-middle text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onOpenJobTicket(order)}
                        className="h-7 px-2 text-xs border-slate-300"
                        title="জব টিকেট প্রিন্ট"
                      >
                        <Printer className="h-3 w-3" />
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onOpenWhatsApp(order)}
                        className="h-7 px-2 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                        title="WhatsApp বার্তা"
                      >
                        <MessageSquare className="h-3 w-3" />
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onOpenQuickStatus(order)}
                        className="h-7 px-2 text-xs border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                        title="স্ট্যাটাস পরিবর্তন"
                      >
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
})
