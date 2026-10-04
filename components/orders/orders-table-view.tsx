'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
 Phone,
 Printer,
 MessageSquare,
 ArrowRight,
 ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'
import {
 type UnifiedOrderRecord,
 type OrderStage,
 type OrderLiveStatus,
 type OrderItemSpec,
 ORDER_LIVE_STATUSES,
 formatOrderItemQuantityAndUnit,
 resolveOrderItemSpecs,
} from './types'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'

interface OrdersTableViewProps {
 orders: UnifiedOrderRecord[]
 tenantSlug: string
 onOpenWhatsApp: (order: UnifiedOrderRecord) => void
 onOpenJobTicket: (order: UnifiedOrderRecord) => void
 onPrintJobTicket: (order: UnifiedOrderRecord) => void
 onOpenQuickStatus: (order: UnifiedOrderRecord) => void
 onAdvanceStage: (orderId: string, nextStage: OrderStage) => void
 onUpdateLiveStatus?: (orderId: string, newStatus: OrderLiveStatus) => void
}

export const OrdersTableView = React.memo(function OrdersTableView({
 orders,
 tenantSlug,
 onOpenWhatsApp,
 onOpenJobTicket,
 onPrintJobTicket,
 onOpenQuickStatus,
 onAdvanceStage,
 onUpdateLiveStatus,
}: OrdersTableViewProps) {
 const pathname = usePathname()
 const { tBilingual } = useI18n()

 if (orders.length === 0) {
 return (
      <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
        {tBilingual('No order records found matching the filters.', 'কোনো অর্ডার রেকর্ড পাওয়া যায়নি।')}
      </div>
    )
  }

 return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-foreground">
          <thead className="bg-muted border-b border-border text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">{tBilingual('Order / Invoice', 'অর্ডার / ইনভয়েস')}</th>
              <th className="py-3 px-4">{tBilingual('Customer & Phone', 'কাস্টমার ও মোবাইল')}</th>
              <th className="py-3 px-4">{tBilingual('Works & Specs', 'কাজের বিবরণ ও স্পেক')}</th>
              <th className="py-3 px-4">{tBilingual('Live Status & Stage', 'বর্তমান অবস্থা ও পর্যায়')}</th>
              <th className="py-3 px-4">{tBilingual('Bill & Balance', 'বিল ও বকেয়া')}</th>
              <th className="py-3 px-4 text-right">{tBilingual('Actions', 'অ্যাকশন')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border dark:divide-border">
            {orders.map((order) => {
 const isPaid = order.paymentStatus === 'paid'
 const isPartial = order.paymentStatus === 'partial'

 const currentStatusConfig =
 ORDER_LIVE_STATUSES.find((s) => s.id === order.currentStatus) ||
 ORDER_LIVE_STATUSES.find((s) => s.stage === order.stage) ||
 ORDER_LIVE_STATUSES[0]

 return (
                <tr
 key={order.orderNumber ? `ord-${order.orderNumber}` : order.id}
 className="hover:bg-muted dark:hover:bg-muted/50 transition-colors">
                  {/* Order # */}
                  <td className="py-3 px-4 align-middle">
                    <Link
 href={getTenantNavHref(`/orders/${order.id}`, pathname, tenantSlug)}
 className="tabular-nums font-bold text-primary text-primary hover:underline flex items-center gap-1">
                      <span>#{order.orderNumber}</span>
                      <ExternalLink className="h-3 w-3"/>
                    </Link>
                    {order.invoiceNumber && (
                      <div className="tabular-nums text-xs text-muted-foreground">
 Inv: #{order.invoiceNumber}
                      </div>
                    )}
                    {order.jobNumber && (
                      <div className="tabular-nums text-xs text-primary text-primary">
 Job: #{order.jobNumber}
                      </div>
                    )}
                  </td>

                  {/* Customer */}
                  <td className="py-3 px-4 align-middle">
                    <div className="font-semibold text-foreground">
                      {order.customerName}
                    </div>
                    {order.customerPhone && (
                      <button
 type="button"onClick={() => onOpenWhatsApp(order)}
 className="text-xs text-success text-success tabular-nums hover:underline flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3"/>
                        <span>{order.customerPhone}</span>
                      </button>
                    )}
                  </td>

                  {/* Items Specs */}
                  <td className="py-3 px-4 align-middle">
                    <div className="font-bold text-foreground line-clamp-1 flex items-center gap-1.5">
                      <span>{order.items[0]?.itemName || 'Print Work'}</span>
                      {order.items.length > 1 && (
                        <span className="text-xs text-muted-foreground font-normal">
                          (+{order.items.length - 1} more)
                        </span>
                      )}
                      {order.items.some((it) => it.itemKind === 'ready_product' || it.workflowRouting === 'ready_product') && (
                        <span className="text-xs font-bold bg-success-surface text-success bg-success-surface text-success px-1 py-0.2 rounded border border-success-border border-success-border">
                          {tBilingual('Ready', 'রেডি')}
                        </span>
                      )}
                      {order.items.some((it) => it.itemKind === 'outsource' || it.workflowRouting === 'outsource') && (
                        <span className="text-xs font-bold bg-primary/10 text-primary bg-primary/10 text-primary px-1 py-0.2 rounded border border-primary/20 border-border">
                          {tBilingual('Outsource', 'আউটসোর্স')}
                        </span>
                      )}
                    </div>
                    {(() => {
 const firstItem: OrderItemSpec = order.items[0] || {
 id: `synth-${order.id}`,
 serviceName: order.rawJob?.product_name || order.rawInvoice?.items?.[0]?.item_description || 'Print Work',
 itemName: order.rawJob?.product_name || order.rawInvoice?.items?.[0]?.item_description || 'Print Work',
 quantity: Number(order.rawJob?.quantity || order.rawInvoice?.items?.[0]?.quantity) || 1,
 unit: order.rawInvoice?.items?.[0]?.unit || 'pcs',
 materialSpec: order.rawJob?.material_spec || order.rawInvoice?.items?.[0]?.material_spec,
 dimensions: order.rawJob?.size_spec || order.rawInvoice?.items?.[0]?.dimensions_spec,
                      }
 const specs = resolveOrderItemSpecs(firstItem, order.rawJob, order.rawInvoice, tBilingual)
 return (
                        <div className="text-xs text-muted-foreground tabular-nums space-y-0.5 mt-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-foreground font-semibold"title={specs.material}>
                              📄 {specs.material}
                            </span>
                            <span>•</span>
                            <span className="text-foreground font-semibold"title={specs.size}>
                              📐 {specs.size}
                            </span>
                            <span>•</span>
                            <span className="text-primary text-primary font-bold"title={specs.quantity}>
                              📦 {specs.quantity}
                            </span>
                          </div>
                          {(specs.finishing !== 'None' || specs.addOn !== 'None') && (
                            <div className="flex items-center gap-2 flex-wrap">
                              {specs.finishing !== 'None' && (
                                <span className="text-warning text-warning font-medium">
                                  ✨ {tBilingual('Finishing: ', 'ফিনিশিং: ')}{specs.finishing}
                                </span>
                              )}
                              {specs.addOn !== 'None' && (
                                <span className="text-primary text-primary font-medium">
                                  ➕ {tBilingual('Add-on: ', 'অ্যাড-অন: ')}{specs.addOn}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </td>

                  {/* Live Status & Stage */}
                  <td className="py-3 px-4 align-middle">
                    <div className="flex flex-col gap-1">
                      <select
 value={order.currentStatus || currentStatusConfig.id}
 onChange={(e) => onUpdateLiveStatus?.(order.id, e.target.value as OrderLiveStatus)}
 className={`text-xs font-bold rounded px-1.5 py-0.5 border cursor-pointer ${currentStatusConfig.color}`}
                      >
                        {ORDER_LIVE_STATUSES.map((st) => (
                          <option key={st.id} value={st.id}>
                            {tBilingual(st.labelEn, st.labelBn)}
                          </option>
                        ))}
                      </select>
                      <div className="text-xs text-muted-foreground">
                        {tBilingual('Target: ', 'টার্গেট: ')}{order.deliveryDate || 'N/A'}
                      </div>
                    </div>
                  </td>

                  {/* Financials */}
                  <td className="py-3 px-4 align-middle">
                    <div className="tabular-nums font-bold text-foreground">
                      ৳{order.totalAmount.toLocaleString()}
                    </div>
                    <div className="text-xs tabular-nums">
                      {order.dueAmount > 0 ? (
                        <span className="text-destructive font-bold">
                          {tBilingual('Due: ', 'বাকি: ')}৳{order.dueAmount.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-success font-bold">
                          {tBilingual('PAID', 'পরিশোধিত')}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 align-middle text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
 href={getTenantNavHref(`/orders/${order.id}`, pathname, tenantSlug)}
 className="inline-flex items-center justify-center h-7 px-2 text-xs font-semibold rounded-md border border-primary/20 text-primary hover:bg-primary/10 border-border text-primary gap-1"title={tBilingual('Open Job Flow', 'কাজের ফ্লো দেখুন')}
                      >
                        <span>{tBilingual('Job Flow', 'জব ফ্লো')}</span>
                        <ArrowRight className="h-3 w-3"/>
                      </Link>

                      {/* Direct Print Job Sheet Action */}
                      <Button
 type="button"size="sm"variant="outline"onClick={() => onPrintJobTicket(order)}
 className="h-7 px-2 text-xs border-primary/20 text-primary hover:bg-primary/10 border-border text-primary"title={tBilingual('Print Job Sheet (Press Ticket)', 'প্রোডাকশন জব স্লিপ প্রিন্ট করুন')}
                      >
                        <Printer className="h-3 w-3"/>
                      </Button>

                      <Button
 type="button"size="sm"variant="outline"onClick={() => onOpenWhatsApp(order)}
 className="h-7 px-2 text-xs border-success-border text-success hover:bg-success-surface border-success-border text-success"title={tBilingual('Send WhatsApp Update', 'WhatsApp বার্তা')}
                      >
                        <MessageSquare className="h-3 w-3"/>
                      </Button>

                      <Button
 type="button"size="sm"variant="outline"onClick={() => onOpenQuickStatus(order)}
 className="h-7 px-2 text-xs border-input text-foreground hover:bg-muted"title={tBilingual('Change Workflow Stage', 'স্ট্যাটাস পরিবর্তন')}
                      >
                        <ArrowRight className="h-3 w-3"/>
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
