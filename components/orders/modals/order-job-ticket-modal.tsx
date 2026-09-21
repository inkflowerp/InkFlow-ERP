'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer, Download, CheckSquare, Layers, Building, Phone, Calendar, Scissors, Sparkles } from 'lucide-react'
import type { UnifiedOrderRecord } from '../types'

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
  if (!order) return null

  const handlePrint = () => {
    window.print()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl bg-white text-slate-900 p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader className="border-b border-slate-200 pb-3 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-indigo-700">
              <Printer className="h-5 w-5" />
              <span>Production Job Ticket / Press Sheet (প্রোডাকশন জব স্লিপ)</span>
            </DialogTitle>
            <p className="text-xs text-slate-500">
              মেশিন অপারেটর ও ফিনিশিং ডিপার্টমেন্টের জন্য অফিসিয়াল প্রিন্ট টিকেট
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handlePrint}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
          >
            <Printer className="h-3.5 w-3.5 mr-1" />
            <span>প্রিন্ট করুন (Print Job Sheet)</span>
          </Button>
        </DialogHeader>

        {/* Printable Area */}
        <div id="printable-job-ticket" className="space-y-4 pt-3 text-xs">
          {/* Header Banner */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3">
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">
                {companyName}
              </h2>
              <p className="text-slate-600 text-[11px]">{companyAddress} | Ph: {companyPhone}</p>
              <span className="inline-block mt-1 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                JOB ORDER TICKET (জব কার্ড)
              </span>
            </div>
            <div className="text-right font-mono">
              <div className="text-lg font-black text-indigo-900">#{order.orderNumber}</div>
              {order.invoiceNumber && (
                <div className="text-[11px] text-slate-600 font-semibold">Inv: #{order.invoiceNumber}</div>
              )}
              <div className="text-[10px] text-slate-500 mt-1">তারিখ: {order.orderDate}</div>
              <div className="text-[10px] font-bold text-rose-700">
                ডেলিভারি টার্গেট: {order.deliveryDate || 'জরুরী'}
              </div>
            </div>
          </div>

          {/* Customer & Priority Information */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded border border-slate-200">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">কাস্টমার (Client):</span>
              <strong className="text-sm text-slate-900">{order.customerName}</strong>
              {order.customerPhone && (
                <div className="text-slate-600 font-mono text-[11px]">মোবাইল: {order.customerPhone}</div>
              )}
              {order.customerAddress && (
                <div className="text-slate-500 text-[10px] truncate">{order.customerAddress}</div>
              )}
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">জরুরিত্ব ও স্ট্যাটাস:</span>
              <span className="inline-block text-xs font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                {order.priority === 'urgent' || order.priority === 'very_urgent' ? '🚨 অতি জরুরী (Urgent Floor)' : 'সাধারণ (Standard Flow)'}
              </span>
              <div className="text-[11px] text-slate-600 mt-1">
                পেমেন্ট স্ট্যাটাস: <strong className="uppercase">{order.paymentStatus}</strong> (জমা: ৳{order.advanceAmount.toLocaleString()} / বকেয়া: ৳{order.dueAmount.toLocaleString()})
              </div>
            </div>
          </div>

          {/* Job Items Specs Breakdown Table */}
          <div>
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-indigo-600" />
              <span>কাজের বিবরণ ও স্পেসিফিকেশন (Items & Technical Specs):</span>
            </h3>
            <table className="w-full text-left border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-[10px] font-bold text-slate-700 uppercase">
                  <th className="border border-slate-300 p-2 w-8 text-center">#</th>
                  <th className="border border-slate-300 p-2">কাজের নাম ও মেটেরিয়াল</th>
                  <th className="border border-slate-300 p-2">সাইজ (Size / Dims)</th>
                  <th className="border border-slate-300 p-2">পরিমাণ (Qty)</th>
                  <th className="border border-slate-300 p-2">ফিনিশিং / বাইন্ডিং</th>
                  <th className="border border-slate-300 p-2">ফ্লোর রাউটিং</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((it, idx) => (
                  <tr key={it.id || idx} className="border border-slate-300 text-[11px]">
                    <td className="border border-slate-300 p-2 text-center font-bold">{idx + 1}</td>
                    <td className="border border-slate-300 p-2">
                      <strong className="text-slate-900 block">{it.itemName}</strong>
                      {it.materialSpec && (
                        <span className="text-[10px] text-slate-600 font-mono">{it.materialSpec}</span>
                      )}
                    </td>
                    <td className="border border-slate-300 p-2 font-mono font-bold">
                      {it.dimensions || (it.width && it.height ? `${it.width} × ${it.height} ${it.dimensionUnit || 'ft'}` : 'Standard')}
                    </td>
                    <td className="border border-slate-300 p-2 font-mono font-bold">
                      {it.quantity} {it.unit}
                    </td>
                    <td className="border border-slate-300 p-2">
                      {it.finishing || 'সাধারণ কাটিং'}
                    </td>
                    <td className="border border-slate-300 p-2">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">
                        {it.workflowRouting?.replace('_', ' ') || 'Production'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Machine Floor Checkboxes & Sign-offs */}
          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-200">
            <div className="border border-slate-200 p-2 rounded text-center">
              <span className="text-[9px] font-bold uppercase text-slate-500 block">১. ডিজাইন / প্রি-প্রেস</span>
              <div className="h-6 flex items-center justify-center">
                <CheckSquare className="h-4 w-4 text-slate-300" />
              </div>
              <span className="text-[9px] text-slate-400 block border-t border-slate-100 pt-1">স্বাক্ষর</span>
            </div>
            <div className="border border-slate-200 p-2 rounded text-center">
              <span className="text-[9px] font-bold uppercase text-slate-500 block">২. মেশিন প্রিন্টিং</span>
              <div className="h-6 flex items-center justify-center">
                <CheckSquare className="h-4 w-4 text-slate-300" />
              </div>
              <span className="text-[9px] text-slate-400 block border-t border-slate-100 pt-1">অপারেটর</span>
            </div>
            <div className="border border-slate-200 p-2 rounded text-center">
              <span className="text-[9px] font-bold uppercase text-slate-500 block">৩. ফিনিশিং ও কাটিং</span>
              <div className="h-6 flex items-center justify-center">
                <CheckSquare className="h-4 w-4 text-slate-300" />
              </div>
              <span className="text-[9px] text-slate-400 block border-t border-slate-100 pt-1">ফিনিশিং ইনচার্জ</span>
            </div>
            <div className="border border-slate-200 p-2 rounded text-center">
              <span className="text-[9px] font-bold uppercase text-slate-500 block">৪. কিউসি ও প্যাকিং</span>
              <div className="h-6 flex items-center justify-center">
                <CheckSquare className="h-4 w-4 text-slate-300" />
              </div>
              <span className="text-[9px] text-slate-400 block border-t border-slate-100 pt-1">ডেলিভারি কাউন্টার</span>
            </div>
          </div>

          {/* Notes & Special Instructions */}
          {order.notes && (
            <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
              <strong>বিশেষ নির্দেশনা:</strong> {order.notes}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
            বন্ধ করুন (Close)
          </Button>
          <Button type="button" size="sm" onClick={handlePrint} className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold">
            <Printer className="h-3.5 w-3.5 mr-1" />
            <span>প্রিন্ট টিকেট</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
})
