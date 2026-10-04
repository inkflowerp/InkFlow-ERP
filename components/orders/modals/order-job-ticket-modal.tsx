'use client'

import React from 'react'
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer, CheckSquare, Layers, Building, Phone, Calendar, Scissors, Sparkles } from 'lucide-react'
import { useI18n } from '@/i18n/context'
import {
 type UnifiedOrderRecord,
 type OrderItemSpec,
 formatOrderItemQuantityAndUnit,
 resolveOrderItemSpecs,
} from '../types'

interface OrderJobTicketModalProps {
 isOpen: boolean
 onClose: () => void
 order: UnifiedOrderRecord | null
 companyName?: string
 companyAddress?: string
 companyPhone?: string
}

export const OrderJobTicketModal = React.memo(function OrderJobTicketModal({
 isOpen,
 onClose,
 order,
 companyName = 'PrintERP Commercial Press',
 companyAddress = 'Paltan / Fakirapool, Dhaka',
 companyPhone = '01700-000000',
}: OrderJobTicketModalProps) {
 const { tBilingual } = useI18n()

 if (!order) return null

 const handlePrint = () => {
 window.print()
  }

 const isUrgent = order.priority === 'urgent' || order.priority === 'very_urgent'

 return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl bg-card text-foreground p-6 shadow-lg overflow-y-auto max-h-[90vh]">
        <DialogHeader className="border-b border-border pb-3 flex flex-row items-center justify-between gap-4 print:hidden">
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-primary truncate">
              <Printer className="h-5 w-5 shrink-0"/>
              <span>{tBilingual('Production Job Ticket / Press Sheet', 'প্রোডাকশন জব স্লিপ')}</span>
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {tBilingual(
                'Official print ticket for machine operators and finishing department',
                'মেশিন অপারেটর ও ফিনিশিং ডিপার্টমেন্টের জন্য অফিসিয়াল প্রিন্ট টিকেট'
              )}
            </p>
          </div>
          <Button
 type="button"size="sm"onClick={handlePrint}
 className="bg-primary hover:bg-primary text-white font-bold text-xs shrink-0">
            <Printer className="h-3.5 w-3.5 mr-1"/>
            <span>{tBilingual('Print Job Sheet', 'জব স্লিপ প্রিন্ট')}</span>
          </Button>
        </DialogHeader>

        {/* Printable Area */}
        <div id="printable-job-ticket"className="space-y-4 pt-3 text-xs">
          {/* Header Banner */}
          <div className="flex items-start justify-between border-b-2 border-border pb-3">
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight text-foreground">
                {companyName}
              </h2>
              <p className="text-muted-foreground text-xs">{companyAddress} | Ph: {companyPhone}</p>
              <span className="inline-block mt-1 bg-surface-inset text-foreground text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                {tBilingual('JOB ORDER TICKET', 'জব অর্ডার টিকেট')}
              </span>
            </div>
            <div className="text-right tabular-nums">
              <div className="text-lg font-black text-primary">#{order.orderNumber}</div>
              {order.invoiceNumber && (
                <div className="text-xs text-muted-foreground font-semibold">Inv: #{order.invoiceNumber}</div>
              )}
              {order.jobNumber && (
                <div className="text-xs text-primary font-semibold">Job: #{order.jobNumber}</div>
              )}
              <div className="text-xs text-muted-foreground mt-1">
                {tBilingual('Date: ', 'তারিখ: ')}{order.orderDate}
              </div>
              <div className="text-xs font-bold text-destructive">
                {tBilingual('Delivery Target: ', 'ডেলিভারি টার্গেট: ')}{order.deliveryDate || tBilingual('Urgent', 'জরুরী')}
              </div>
            </div>
          </div>

          {/* Customer & Priority Information */}
          <div className="grid grid-cols-2 gap-3 bg-muted p-3 rounded border border-border">
            <div>
              <span className="text-xs uppercase font-bold text-muted-foreground block">
                {tBilingual('Customer:', 'কাস্টমার:')}
              </span>
              <strong className="text-sm text-foreground">{order.customerName}</strong>
              {order.customerPhone && (
                <div className="text-muted-foreground tabular-nums text-xs">
                  {tBilingual('Phone: ', 'মোবাইল: ')}{order.customerPhone}
                </div>
              )}
              {order.customerAddress && (
                <div className="text-muted-foreground text-xs truncate">{order.customerAddress}</div>
              )}
            </div>
            <div className="text-right">
              <span className="text-xs uppercase font-bold text-muted-foreground block">
                {tBilingual('Priority & Status:', 'জরুরিত্ব ও স্ট্যাটাস:')}
              </span>
              <span className="inline-block text-xs font-bold px-2 py-0.5 rounded bg-danger-surface text-destructive border border-danger-border">
                {isUrgent ? tBilingual('Urgent Floor', 'অতি জরুরী') : tBilingual('Standard Flow', 'সাধারণ')}
              </span>
              <div className="text-xs text-muted-foreground mt-1">
                {tBilingual('Payment Status: ', 'পেমেন্ট: ')}
                <strong className="font-bold">
                  {order.paymentStatus === 'paid'
                    ? tBilingual('PAID', 'পরিশোধিত')
                    : order.paymentStatus === 'partial'
                    ? tBilingual('PARTIAL', 'আংশিক')
                    : tBilingual('UNPAID', 'বকেয়া')}
                </strong>{' '}
                ({tBilingual('Paid: ', 'জমা: ')}৳{order.advanceAmount.toLocaleString()} /{' '}
                {tBilingual('Due: ', 'বাকি: ')}৳{order.dueAmount.toLocaleString()})
              </div>
            </div>
          </div>

          {/* Job Items Specs Breakdown Table */}
          <div>
            <h3 className="font-bold text-xs text-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-primary"/>
              <span>{tBilingual('Job Items & Technical Specifications:', 'কাজের বিবরণ ও স্পেসিফিকেশন:')}</span>
            </h3>
            <table className="w-full text-left border-collapse border border-input">
              <thead>
                <tr className="bg-muted text-xs font-bold text-foreground uppercase">
                  <th className="border border-input p-2 w-8 text-center">#</th>
                  <th className="border border-input p-2">{tBilingual('Service & Material', 'সার্ভিস ও মেটেরিয়াল')}</th>
                  <th className="border border-input p-2">{tBilingual('Size', 'সাইজ / মাপ')}</th>
                  <th className="border border-input p-2">{tBilingual('Quantity & Area', 'পরিমাণ ও ক্ষেত্রফল')}</th>
                  <th className="border border-input p-2">{tBilingual('Finishing & Add-on', 'ফিনিশিং ও অ্যাড-অন')}</th>
                  <th className="border border-input p-2">{tBilingual('Floor Routing', 'ফ্লোর রাউটিং')}</th>
                </tr>
              </thead>
              <tbody>
                {(order.items.length === 0 ? [{
 id: `job-item-${order.id}`,
 serviceName: order.rawJob?.product_name || order.rawInvoice?.items?.[0]?.item_description || tBilingual('Custom Printing Work', 'কাস্টম প্রিন্টিং কাজ'),
 itemName: order.rawJob?.product_name || order.rawInvoice?.items?.[0]?.item_description || tBilingual('Custom Printing Work', 'কাস্টম প্রিন্টিং কাজ'),
 quantity: Number(order.rawJob?.quantity || order.rawInvoice?.items?.[0]?.quantity) || 1,
 unit: order.rawInvoice?.items?.[0]?.unit || 'pcs',
 materialSpec: order.rawJob?.material_spec || order.rawInvoice?.items?.[0]?.material_spec || undefined,
 dimensions: order.rawJob?.size_spec || order.rawInvoice?.items?.[0]?.dimensions_spec || undefined,
 finishing: order.rawJob?.production_instructions?.match(/Finishing:\s*([^|;]+)/i)?.[1]?.trim() || (order.rawJob?.production_instructions?.startsWith('Finishing:') ? order.rawJob.production_instructions.replace(/^Finishing:\s*/, '').split('|')[0].trim() : undefined),
 addOn: order.rawJob?.production_instructions?.match(/Add-?on:\s*([^|;]+)/i)?.[1]?.trim() || undefined,
 workflowRouting: 'ready_production',
                } as OrderItemSpec] : order.items).map((it, idx) => {
 const specs = resolveOrderItemSpecs(it, order.rawJob, order.rawInvoice, tBilingual)
 return (
                    <tr key={it.id || idx} className="border border-input text-xs">
                      <td className="border border-input p-2 text-center font-bold">{idx + 1}</td>
                      <td className="border border-input p-2">
                        <strong className="text-foreground block">{specs.serviceName}</strong>
                        <span className="text-xs text-foreground tabular-nums font-medium block">
                          📄 {specs.material}
                        </span>
                      </td>
                      <td className="border border-input p-2 tabular-nums font-bold">
                        📐 {specs.size}
                      </td>
                      <td className="border border-input p-2 tabular-nums font-bold text-primary">
                        📦 {specs.quantity}
                      </td>
                      <td className="border border-input p-2">
                        <div>
                          <span className="text-muted-foreground font-medium">{tBilingual('Finishing: ', 'ফিনিশিং: ')}</span>
                          <span className={specs.finishing !== 'None' ? 'font-semibold text-warning' : 'text-muted-foreground'}>
                            {specs.finishing}
                          </span>
                        </div>
                        {specs.addOn !== 'None' && (
                          <div className="mt-0.5">
                            <span className="text-muted-foreground font-medium">{tBilingual('Add-on: ', 'অ্যাড-অন: ')}</span>
                            <span className="font-semibold text-primary">
                              {specs.addOn}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="border border-input p-2">
                        <span className="bg-muted px-1.5 py-0.5 rounded text-xs font-bold uppercase">
                          {it.workflowRouting === 'design_required'
                            ? tBilingual('Design Needed', 'ডিজাইন দরকার')
                            : it.workflowRouting === 'design_ok'
                            ? tBilingual('Ready File', 'রেডি ফাইল')
                            : it.workflowRouting === 'ready_product'
                            ? tBilingual('Ready Stock', 'রেডি স্টক')
                            : it.workflowRouting === 'outsource'
                            ? tBilingual('Outsource', 'আউটসোর্স')
                            : tBilingual('Production', 'প্রোডাকশন')}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Machine Floor Checkboxes & Sign-offs */}
          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border">
            <div className="border border-border p-2 rounded text-center">
              <span className="text-xs font-bold uppercase text-muted-foreground block">
                {tBilingual('1. Design / Pre-Press', '১. ডিজাইন / প্রি-প্রেস')}
              </span>
              <div className="h-6 flex items-center justify-center">
                <CheckSquare className="h-4 w-4 text-muted-foreground"/>
              </div>
              <span className="text-xs text-muted-foreground block border-t border-border pt-1">
                {tBilingual('Signature', 'স্বাক্ষর')}
              </span>
            </div>
            <div className="border border-border p-2 rounded text-center">
              <span className="text-xs font-bold uppercase text-muted-foreground block">
                {tBilingual('2. Machine Printing', '২. মেশিন প্রিন্টিং')}
              </span>
              <div className="h-6 flex items-center justify-center">
                <CheckSquare className="h-4 w-4 text-muted-foreground"/>
              </div>
              <span className="text-xs text-muted-foreground block border-t border-border pt-1">
                {tBilingual('Operator', 'অপারেটর')}
              </span>
            </div>
            <div className="border border-border p-2 rounded text-center">
              <span className="text-xs font-bold uppercase text-muted-foreground block">
                {tBilingual('3. Finishing & Cutting', '৩. ফিনিশিং ও কাটিং')}
              </span>
              <div className="h-6 flex items-center justify-center">
                <CheckSquare className="h-4 w-4 text-muted-foreground"/>
              </div>
              <span className="text-xs text-muted-foreground block border-t border-border pt-1">
                {tBilingual('In-Charge', 'ইনচার্জ')}
              </span>
            </div>
            <div className="border border-border p-2 rounded text-center">
              <span className="text-xs font-bold uppercase text-muted-foreground block">
                {tBilingual('4. QC & Packaging', '৪. কিউসি ও প্যাকিং')}
              </span>
              <div className="h-6 flex items-center justify-center">
                <CheckSquare className="h-4 w-4 text-muted-foreground"/>
              </div>
              <span className="text-xs text-muted-foreground block border-t border-border pt-1">
                {tBilingual('Counter', 'কাউন্টার')}
              </span>
            </div>
          </div>

          {/* Notes & Special Instructions */}
          {order.notes && (
            <div className="p-2 rounded bg-warning-surface border border-warning-border text-warning text-xs">
              <strong>{tBilingual('Special Instructions: ', 'বিশেষ নির্দেশনা: ')}</strong> {order.notes}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 border-t border-border pt-3 print:hidden">
          <Button type="button"variant="outline"size="sm"onClick={onClose} className="text-xs">
            {tBilingual('Close', 'বন্ধ করুন')}
          </Button>
          <Button type="button"size="sm"onClick={handlePrint} className="bg-surface-inset hover:bg-card-elevated text-foreground text-xs font-bold">
            <Printer className="h-3.5 w-3.5 mr-1"/>
            <span>{tBilingual('Print Ticket', 'প্রিন্ট টিকেট')}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
})
